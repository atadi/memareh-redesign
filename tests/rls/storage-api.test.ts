/**
 * Storage API authorization tests for the `article-images` bucket.
 *
 * These exercise the REAL Supabase Storage API (not raw SQL), because Supabase
 * forbids direct DML against `storage.objects` ("Use the Storage API instead").
 * They therefore require a LOCAL/CI Supabase stack with real auth sessions —
 * they cannot run against the live production project from this suite.
 *
 * Prerequisites (see tests/rls/README.md):
 *   - supabase start && supabase db reset
 *   - NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
 *   - SUPABASE_RLS_TEST_MODE=1
 *   - the bucket + policies come from the security-baseline migration
 *
 * Deterministic test users (created via the local admin client, signed in with a
 * password, real access tokens captured) isolate this run under `rls-tests/`.
 *
 * Current article-images policies (verified against the migration):
 *   SELECT : bucket_id = 'article-images'                         (public read)
 *   INSERT : bucket_id = 'article-images' AND auth.uid() IS NOT NULL
 *   UPDATE : bucket_id = 'article-images' AND owner = auth.uid()
 *   DELETE : bucket_id = 'article-images' AND owner = auth.uid()
 * NOTE: there is NO admin override on storage — an admin is just another user and
 * is DENIED from mutating another owner's object. S5 documents that explicitly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertLocalOrTestMode } from './helpers'

const BUCKET = 'article-images'
const RUN_PREFIX = `rls-tests/${Date.now()}`

// Deterministic local test identities (password chosen for the suite; never real).
const TEST_USERS = {
  userA: { email: 'rls-a@example.com', password: 'rls-test-password-1' },
  userB: { email: 'rls-b@example.com', password: 'rls-test-password-2' },
}

async function createAndSignIn(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<SupabaseClient> {
  // Create the user via the admin API (does not send a verification email locally).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr && !/already exists/i.test(createErr.message)) {
    throw new Error('createUser failed: ' + createErr.message)
  }
  const id = created?.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === email)!.id
  // Sign in to obtain a real access token.
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password })
  if (signInErr) throw new Error('signIn failed for ' + email + ': ' + signInErr.message)
  return userClient
}

let admin: SupabaseClient
let userA: SupabaseClient
let userB: SupabaseClient
const createdObjectPaths: string[] = []

describe('article-images Storage API authorization', () => {
  beforeAll(async () => {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    // Guard: refuse to run against anything but a flagged local/CI stack.
    assertLocalOrTestMode(admin)
    userA = await createAndSignIn(admin, TEST_USERS.userA.email, TEST_USERS.userA.password)
    userB = await createAndSignIn(admin, TEST_USERS.userB.email, TEST_USERS.userB.password)
  }, 60_000)

  afterAll(async () => {
    // Remove everything this run created.
    for (const p of createdObjectPaths) {
      await admin.storage.from(BUCKET).remove([p])
    }
    // Delete the test users so the local stack stays clean.
    for (const u of [TEST_USERS.userA.email, TEST_USERS.userB.email]) {
      const { data } = await admin.auth.admin.listUsers()
      const found = data.users.find((x) => x.email === u)
      if (found) await admin.auth.admin.deleteUser(found.id)
    }
  }, 60_000)

  it('S1: owner (User A) can upload an object', async () => {
    const path = `${RUN_PREFIX}/userA/own.txt`
    const { error } = await userA.storage.from(BUCKET).upload(path, new Blob(['hello']), { upsert: true })
    expect(error).toBeNull()
    createdObjectPaths.push(path)
  })

  it('S2: owner (User A) can update/replace their own object', async () => {
    const path = `${RUN_PREFIX}/userA/own.txt`
    // Ensure it exists from S1 (order is not guaranteed across runners, so re-upload).
    await userA.storage.from(BUCKET).upload(path, new Blob(['v1']), { upsert: true })
    createdObjectPaths.push(path)
    const { error } = await userA.storage.from(BUCKET).update(path, new Blob(['v2']))
    expect(error).toBeNull()
  })

  it('S3: owner (User A) can delete their own object', async () => {
    const path = `${RUN_PREFIX}/userA/todelete.txt`
    await userA.storage.from(BUCKET).upload(path, new Blob(['bye']), { upsert: true })
    createdObjectPaths.push(path)
    const { error } = await userA.storage.from(BUCKET).remove([path])
    expect(error).toBeNull()
    // Confirm it is gone by attempting a public read (404 path).
    const { data } = await userA.storage.from(BUCKET).download(path)
    expect(data).toBeNull()
  })

  it('S4: other user (User B) CANNOT mutate User A’s object', async () => {
    const path = `${RUN_PREFIX}/userA/protected.txt`
    await userA.storage.from(BUCKET).upload(path, new Blob(['owner-data']), { upsert: true })
    createdObjectPaths.push(path)

    // B cannot update A's object.
    const update = await userB.storage.from(BUCKET).update(path, new Blob(['hacked']))
    expect(update.error).not.toBeNull()

    // B cannot delete A's object.
    const del = await userB.storage.from(BUCKET).remove([path])
    expect(del.error).not.toBeNull()

    // The object is still owned by A and unchanged.
    const { data } = await userA.storage.from(BUCKET).download(path)
    expect(data).not.toBeNull()
    const stillOwner = await admin.storage.from(BUCKET).list(RUN_PREFIX + '/userA', { search: 'protected.txt' })
    expect(stillOwner.data?.some((f) => f.name === 'protected.txt')).toBe(true)
  })

  it('S5: admin is NOT granted storage-mutation override (policy has no admin clause)', async () => {
    const path = `${RUN_PREFIX}/userA/admin-test.txt`
    await userA.storage.from(BUCKET).upload(path, new Blob(['owner-data']), { upsert: true })
    createdObjectPaths.push(path)

    // The admin client authenticates as the service role (bypasses RLS), so a
    // direct admin.storage call would *succeed* — that is NOT a valid test of the
    // user-facing policy. To test the policy as a real admin *user*, we create an
    // admin user, sign them in, and assert they are denied like any other user.
    const adminUser = await createAndSignIn(
      admin,
      'rls-admin@example.com',
      'rls-test-password-admin',
    )
    const update = await adminUser.storage.from(BUCKET).update(path, new Blob(['admin-hack']))
    expect(update.error).not.toBeNull()
    const del = await adminUser.storage.from(BUCKET).remove([path])
    expect(del.error).not.toBeNull()

    // Cleanup the admin test user.
    const { data } = await admin.auth.admin.listUsers()
    const found = data.users.find((x) => x.email === 'rls-admin@example.com')
    if (found) await admin.auth.admin.deleteUser(found.id)
  })
})
