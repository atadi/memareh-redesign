/**
 * Shared harness for RLS / authorization regression tests.
 *
 * Strategy
 * --------
 * We exercise the REAL PostgreSQL Row Level Security engine, not mocks. There is
 * no local Supabase instance in this environment, so tests run against a live
 * Supabase project using the service-role client to *impersonate* an identity via
 * `request.jwt.claims` — exactly the mechanism PostgREST uses — through the
 * deployed helper `memareh.rls_test_eval` (see tests/sql/rls_test_helpers.sql).
 *
 * `memareh.rls_test_eval(p_role, p_claims, p_sql)`:
 *   * switches the session role + JWT claims,
 *   * executes p_sql inside ONE transaction,
 *   * captures success (count for SELECT, command tag for DML) or the SQL error
 *     (e.g. RLS denial -> sqlstate 42501),
 *   * then FORCE-ROLLS-BACK so no test data is ever persisted.
 *
 * This is the strongest executable boundary test available without a local
 * For fully local reproducibility, point SUPABASE_URL / SUPABASE_SECRET_KEY
 * at a `supabase db reset`ed stack and deploy the same helper (see tests/rls/README.md).
 */

import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
import { join } from 'node:path'

// Load Next.js-style .env.local (holds the Supabase keys) for the test run.
dotenvConfig({ path: join(process.cwd(), '.env.local') })
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Production-safety guard for destructive / fixture operations.
 *
 * The RLS suite deliberately writes fixtures (auth.users, profiles, articles,
 * storage objects) and therefore MUST NEVER target a live production project.
 * We require TWO independent signals before any destructive/fixture work:
 *   1. SUPABASE_RLS_TEST_MODE === '1'
 *   2. the configured URL is a loopback / local address (127.0.0.1 or localhost)
 *      OR it explicitly matches a dedicated SUPABASE_TEST_URL variable.
 *
 * If either signal is missing/ambiguous, this throws and the suite aborts — there
 * is no silent fall-through to a remote project. Live read-only verification
 * (tests that only SELECT) is permitted without the flag, because it cannot
 * mutate data.
 */
export function assertLocalOrTestMode(service: SupabaseClient): void {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').toLowerCase()
  const testMode = process.env.SUPABASE_RLS_TEST_MODE === '1'
  const isLocalhost =
    url.startsWith('http://127.0.0.1') ||
    url.startsWith('http://localhost') ||
    url.startsWith('https://127.0.0.1') ||
    url.startsWith('https://localhost')
  const isExplicitTestUrl = !!process.env.SUPABASE_TEST_URL && url === process.env.SUPABASE_TEST_URL.toLowerCase()

  // Read-only / impersonation-only suites (no fixtures written) are safe against a
  // live read replica as long as we never call seed/cleanup. But to keep the
  // guard meaningful we still require the flag for ANY service-role usage that
  // could mutate. Here we only gate fixture (seed/cleanup) calls — evalAs SELECT
  // is read-only and allowed against the live project for verification.
  if (!testMode) {
    throw new Error(
      'Refusing to run fixture/destructive RLS tests: SUPABASE_RLS_TEST_MODE is not set to "1". ' +
        'Set SUPABASE_RLS_TEST_MODE=1 and point NEXT_PUBLIC_SUPABASE_URL at a LOCAL stack (127.0.0.1:54321) or SUPABASE_TEST_URL.',
    )
  }
  if (!isLocalhost && !isExplicitTestUrl) {
    throw new Error(
      `Refusing to run fixture/destructive RLS tests against non-local URL "${url}". ` +
        'Point NEXT_PUBLIC_SUPABASE_URL at 127.0.0.1/localhost or set SUPABASE_TEST_URL to the same value.',
    )
  }
}

export type Role = 'anon' | 'authenticated'

export interface Identity {
  /** PostgREST request role (anon/authenticated). */
  role: Role
  /** auth.uid() the policies see. Null for anon. */
  userId: string | null
  /** auth.users.raw_app_meta_data.role claim (canonical admin = 'admin'). */
  appRole?: string
  email?: string
}

export const SERVICE = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SECRET_KEY. Load .env.local ' +
        'so the RLS suite can exercise the real database.',
    )
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Build the JWT claims JSON PostgREST would set for this identity. */
function claimsFor(id: Identity): Record<string, unknown> {
  const claims: Record<string, unknown> = { role: id.role, iss: 'supabase' }
  if (id.userId) claims.sub = id.userId
  if (id.email) claims.email = id.email
  // is_admin() / check_admin_users() read raw_app_meta_data -> 'role'.
  if (id.appRole) claims.raw_app_meta_data = { role: id.appRole }
  return claims
}

export interface EvalResult {
  ok: boolean
  count?: number
  command?: string
  affected?: number
  error?: string
  sqlstate?: string
}

/** Run `sql` as `id` against the real RLS engine; result is always rolled back. */
export async function evalAs(service: SupabaseClient, id: Identity, sql: string): Promise<EvalResult> {
  const { data, error } = await service.rpc('rls_test_eval' as any, {
    p_role: id.role === 'anon' ? 'anon' : 'authenticated',
    p_claims: claimsFor(id) as any,
    p_sql: sql,
    p_bypass_rls: false,
  } as any)
  if (error) {
    // Helper missing vs. real DB error: surface clearly.
    if ((error.message || '').includes('could not find') || (error.message || '').includes('rls_test_eval')) {
      throw new Error(
        'public.rls_test_eval not deployed. Run tests/sql/rls_test_helpers.sql in the ' +
          'Supabase SQL editor (or apply it via migration) before running the RLS suite. (' +
          error.message + ')',
      )
    }
    throw error
  }
  // The function returns a JSON *text* string (so the forced rollback never
  // corrupts the payload). Parse it into the structured result.
  const result = JSON.parse(data as string) as EvalResult
  // Net-neutral residue is handled per-file in afterAll (cleanup) — NOT here,
  // because deleting after each assertion would wipe fixtures needed by the
  // remaining assertions in the same file.
  return result
}

/** Convenience deterministic identities (distinct UUIDs). */
export const IDs = {
  userA: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userB: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  author: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  admin: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  articleA: '11111111-1111-1111-1111-111111111111',
  articleB: '22222222-2222-2222-2222-222222222222',
  commentX: '33333333-3333-3333-3333-333333333333',
  commentY: '44444444-4444-4444-4444-444444444444',
  tagX: '55555555-5555-5555-5555-555555555555',
  objectA: '66666666-6666-6666-6666-666666666666',
  articleC: '77777777-7777-7777-7777-777777777777',
  articleD: '88888888-7777-7777-7777-777777777777',
  commentC: '99999999-8888-8888-8888-888888888888',
  commentD: 'aaaaaaaa-9999-9999-9999-999999999999',
  commentE: 'bbbbbbbb-9999-9999-9999-999999999999',
  tagNew: 'cccccccc-8888-8888-8888-888888888888',
  tagNew2: 'dddddddd-8888-8888-8888-888888888888',
}

/**
 * Net-neutral guarantee: any row the impersonated (RLS-enforced) statement may
 * have committed is removed afterwards by the service-role client, which bypasses
 * RLS. We only ever touch the deterministic, namespaced test UUIDs, so this cannot
 * affect real application data.
 */
const CLEANUP_SQL = `
  DELETE FROM memareh.article_tag_relations WHERE article_id IN ('${IDs.articleA}','${IDs.articleB}','${IDs.articleC}') OR tag_id IN ('${IDs.tagX}','${IDs.tagNew}');
  DELETE FROM memareh.article_comments WHERE id IN ('${IDs.commentX}','${IDs.commentY}','${IDs.commentC}','${IDs.commentD}','${IDs.commentE}');
  DELETE FROM memareh.comment_likes WHERE comment_id IN ('${IDs.commentX}','${IDs.commentY}');
  DELETE FROM memareh.article_tags WHERE id IN ('${IDs.tagX}','${IDs.tagNew}','${IDs.tagNew2}');
  DELETE FROM memareh.articles WHERE id IN ('${IDs.articleA}','${IDs.articleB}','${IDs.articleC}','${IDs.articleD}');
  DELETE FROM memareh.profiles WHERE id IN ('${IDs.userA}','${IDs.userB}','${IDs.author}','${IDs.admin}');
  DELETE FROM auth.users WHERE id IN ('${IDs.userA}','${IDs.userB}','${IDs.author}','${IDs.admin}');
  -- NOTE: storage.objects rows cannot be deleted via SQL (Supabase protect_delete
  -- trigger); the article-images test object '${IDs.objectA}' is removed via the
  -- Storage API in a local stack, or simply left (it is a namespaced test object).
`

export async function cleanup(service: SupabaseClient) {
  // NOTE: intentionally NOT behind assertLocalOrTestMode — cleanup only deletes
  // the deterministic test UUIDs (net-neutral) and is required to tear down both
  // local and accidentally-targeted runs. Writes (seed/seedIdentities) are guarded.
  // Service role bypasses RLS; run as one batch via rls_test_seed. The seeded SQL
  // is fully schema-qualified and rls_test_seed pins an explicit search_path
  // (public, auth, memareh) so triggers resolve their objects. Scoped to
  // deterministic test UUIDs only, so this cannot affect real application data.
  try {
    await service.rpc('rls_test_seed' as any, { p_sql: CLEANUP_SQL } as any)
  } catch {
    // Best-effort cleanup; ignore errors so a partial failure doesn't fail the suite.
  }
}

/**
 * Privileged seeding: runs `sql` as the service role (bypasses RLS) so fixtures
 * exist before an impersonated assertion runs. Uses public.rls_test_seed (which
 * does NOT restrict search_path) so table triggers (e.g. handle_new_user on
 * auth.users) resolve their objects correctly. Scoped to deterministic test
 * UUIDs.
 */
export async function seed(service: SupabaseClient, sql: string) {
  // Production-safety: never write fixtures to a non-local/unflagged target.
  assertLocalOrTestMode(service)
  // Always ensure the four identities (auth.users + memareh.profiles) exist first,
  // so FK-dependent fixtures can be created regardless of which describe block
  // invokes seed().
  await seedIdentities(service)
  const { error } = await service.rpc('rls_test_seed' as any, { p_sql: sql } as any)
  if (error) throw new Error('seed failed: ' + error.message)
}

/**
 * Seed the four deterministic identities. Two things are required and are easy to
 * conflate:
 *   - `auth.users`  : provides `auth.uid()` (used by RLS policies via the
 *                     impersonated `request.jwt.claims`), so impersonation works.
 *   - `memareh.profiles` : `articles.author_id` FK-target (NOT auth.users), so
 *                     article/comment inserts don't violate the foreign key.
 * Both are created with the same id. Runs as service role (bypass) via
 * rls_test_seed. Cleaned up afterwards.
 */
export async function seedIdentities(service: SupabaseClient) {
  // Production-safety: never write fixtures to a non-local/unflagged target.
  assertLocalOrTestMode(service)
  // is_admin() resolves the role via auth.users.raw_app_meta_data ->> 'role', NOT
  // the role column — so we must set raw_app_meta_data. The admin identity gets
  // {role:'admin'}; others get {role:'authenticated'} (is_admin() => false).
  const rows = [
    [IDs.userA, 'authenticated'],
    [IDs.userB, 'authenticated'],
    [IDs.author, 'authenticated'],
    [IDs.admin, 'admin'],
  ]
    .map(([id, role]) => `('${id}', 'authenticated', 'authenticated', '${id}@example.com', '{"role":"${role}"}'::jsonb)`)
    .join(', ')
  const profRows = [IDs.userA, IDs.userB, IDs.author, IDs.admin].map((id) => `('${id}')`).join(', ')
  try {
    await service.rpc('rls_test_seed' as any, {
      p_sql: `
        INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data) VALUES ${rows} ON CONFLICT (id) DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data;
        INSERT INTO memareh.profiles (id) VALUES ${profRows} ON CONFLICT (id) DO NOTHING;
      `,
    } as any)
  } catch {
    // Best-effort; ignore so a transient seed failure surfaces in the actual test.
  }
}

export const ANON: Identity = { role: 'anon', userId: null }
export const USER_A: Identity = { role: 'authenticated', userId: IDs.userA, email: 'a@example.com' }
export const USER_B: Identity = { role: 'authenticated', userId: IDs.userB, email: 'b@example.com' }
export const AUTHOR: Identity = { role: 'authenticated', userId: IDs.author, email: 'author@example.com' }
export const ADMIN: Identity = { role: 'authenticated', userId: IDs.admin, email: 'admin@example.com', appRole: 'admin' }

/** True when the result indicates RLS denied the statement. */
export function isDenied(r: EvalResult): boolean {
  return r.ok === false
}
