# RLS / Authorization Regression Suite

Claims-based Row-Level-Security regression tests for the `memareh` schema and the
`article-images` storage bucket. The suite proves the vulnerabilities documented
in the security audit cannot return. It runs against a **real RLS engine**, never
a mock.

## What is covered

| File | Coverage | Runs against |
| ---- | -------- | ------------ |
| `tests/rls/articles.test.ts` | articles RLS (read/insert/update/delete/admin) | local/CI stack |
| `tests/rls/comments.test.ts` | article_comments RLS | local/CI stack |
| `tests/rls/tags-likes.test.ts` | tags / tag-relations / comment_likes RLS | local/CI stack |
| `tests/rls/storage.test.ts` | **public read** of `article-images` (SQL-readable) | local/CI stack |
| `tests/rls/storage-api.test.ts` | **owner upload/update/delete + other-user denial + admin scope** via Storage API | local/CI stack only |

## Prerequisites (local/CI)

- **Supabase CLI** (`supabase`) installed.
- **Docker** running (the local Supabase stack is containerized).
- Node 18+ and pnpm.
- The repository's migrations under `supabase/migrations/` must reproduce the full
  schema. ⚠️ **Known gap:** this repo currently contains only the security-baseline
  migration (`20260809000000_security_baseline_rls.sql`). The base application
  schema (tables in `memareh`) is NOT captured as an earlier migration, so
  `supabase db reset` will fail until that history is restored/added. See
  `tests/rls/MIGRATION_GAP.md`.

## Environment variables

Copy `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321      # local Supabase API
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
SUPABASE_URL=http://127.0.0.1:54321                 # local Supabase API (server)
SUPABASE_SECRET_KEY=<local secret key>
# REQUIRED before any fixture/destructive test:
SUPABASE_RLS_TEST_MODE=1
# optional: explicit local override checked by the guard
SUPABASE_TEST_URL=http://127.0.0.1:54321
```

The suite **refuses** to write fixtures unless BOTH:
1. `SUPABASE_RLS_TEST_MODE === "1"`, and
2. the URL is loopback (`127.0.0.1`/`localhost`) or equals `SUPABASE_TEST_URL`.

This prevents accidental fixture creation / cleanup against a production project.
(`tests/rls/helpers.ts` → `assertLocalOrTestMode`.)

## Test-only helpers (NOT in production)

`tests/sql/rls_test_helpers.sql` defines two privileged functions:

- `public.rls_test_eval(text, jsonb, text, boolean)` — impersonates an identity by
  rewriting `request.jwt.claims` + `SET LOCAL ROLE`, enforces RLS, returns a JSON
  payload, and rolls back (no data persisted).
- `public.rls_test_seed(text)` — `SECURITY DEFINER` superuser, bypasses RLS to plant
  fixtures. Pins an explicit search path (`public, auth, memareh`) and expects fully
  schema-qualified SQL.

Install these into the **local/CI** database only, e.g. after `supabase db reset`,
run the file in the SQL editor. They must **not** exist permanently in production.

### Why `rls_test_seed` cannot use an empty `search_path`

A static `SET search_path = ''` is unsafe here because the seeded statements fire
triggers (notably `handle_new_user` on `auth.users` → `memareh.profiles`) that
execute as the function owner and must resolve objects by name. With an empty path
those triggers raise "relation does not exist". The safe compromise is an explicit,
minimal path plus fully-qualified caller SQL — implemented in
`tests/sql/rls_test_helpers.sql`.

## Run the suite

```bash
# Start + reset the local stack, then run everything:
supabase start
supabase db reset
pnpm test:rls

# Storage API cases only (need real auth sessions):
pnpm test:rls:storage

# Convenience: reset + run
pnpm supabase:test:reset
```

`pnpm test` runs the whole Vitest suite (includes SQL RLS + storage-API). The
storage-API file requires `SUPABASE_RLS_TEST_MODE=1` and a loopback URL or it fails
fast without touching any database.

## How test users / objects are created

`storage-api.test.ts` uses the **real Supabase Auth API**:
1. The service-role client `auth.admin.createUser(...)` creates User A, User B, and
   (for S5) an admin user with `email_confirm: true`.
2. Each signs in with `signInWithPassword` to obtain a genuine JWT.
3. Authenticated clients call `storage.from('article-images').upload/update/remove`.
4. `afterAll` removes all objects under `rls-tests/<run-id>/...` and deletes the
   test users, so runs are repeatable.

Objects use the deterministic prefix `rls-tests/<timestamp>/<user>/...` so they can
never collide with application data.

## Storage policy semantics (verified against the migration)

| Command | Policy condition |
| ------- | --------------- |
| SELECT  | `bucket_id = 'article-images'` (public read) |
| INSERT  | `bucket_id = 'article-images' AND auth.uid() IS NOT NULL` |
| UPDATE  | `bucket_id = 'article-images' AND owner = auth.uid()` |
| DELETE  | `bucket_id = 'article-images' AND owner = auth.uid()` |

**There is NO admin override on storage.** An admin user is treated like any other
user and is DENIED from mutating another owner's object (case S5 documents this).
This matches the migration; do not assume `is_admin()` grants storage bypass.

## Production cleanup of test helpers

`supabase/migrations/20260809010000_remove_rls_test_helpers.sql` drops both helper
functions with their exact live signatures. Apply it once the suite no longer needs
the production copies (i.e. after local/CI execution is established). It is
prepared but **not applied** in this phase.

## Important

`public.rls_test_eval` and `public.rls_test_seed` MUST NOT exist permanently in
production. They are test scaffolding only.
