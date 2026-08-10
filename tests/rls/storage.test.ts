import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SERVICE, evalAs, seed, cleanup, IDs } from './helpers'

const service = SERVICE()
const OBJ = IDs.objectA

const SEED = `
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('article-images', '${OBJ}', '${IDs.userA}') ON CONFLICT DO NOTHING;
`

// NOTE on storage write coverage
// ------------------------------
// Supabase forbids direct DML against `storage.objects` ("Direct deletion from
// storage tables is not allowed. Use the Storage API instead."). RLS on the
// bucket can therefore ONLY be exercised through the Supabase Storage API
// (service.storage.from('article-images')) authenticated as the relevant user.
// Minting a real auth session for USER_A/USER_B/ADMIN is not possible against a
// live project from this suite, so the owner-scoped UPDATE/DELETE and admin
// management cases are NOT executable via raw SQL here.
//
// They ARE executable in a local Supabase stack (see tests/rls/README.md): sign
// the test users in, call service.storage.upload/update/remove, and assert. The
// public-read case below is exercised directly via SQL (PostgREST exposes
// storage.objects for SELECT), so at least that boundary is verified here.

describe('storage.objects (article-images) RLS', () => {
  beforeAll(async () => { await seed(service, SEED) })
  afterAll(async () => { await cleanup(service) })

  it('positive: public can read objects in article-images', async () => {
    const r = await evalAs(service, { role: 'anon', userId: null }, `SELECT count(*) FROM storage.objects WHERE bucket_id = 'article-images' AND name = '${OBJ}';`)
    expect(r.count).toBe(1)
  })
})

// The five owner-scoped UPDATE/DELETE/admin storage cases are NOT executable via
// raw SQL (Supabase blocks DML on storage.objects). They are covered by the real
// Storage API in tests/rls/storage-api.test.ts, which requires a LOCAL/CI stack
// (SUPABASE_RLS_TEST_MODE=1 + 127.0.0.1) with real auth sessions.

