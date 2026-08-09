import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SERVICE, evalAs, seed, seedIdentities, cleanup, IDs, ANON, USER_A, USER_B, ADMIN } from './helpers'

const service = SERVICE()
const ART = IDs.articleA
const CMT_A = IDs.commentX
const CMT_B = IDs.commentY

const SEED = `
  INSERT INTO memareh.articles (id, title, slug, status, author_id)
    VALUES ('${ART}', 'a', 'a', 'published', '${IDs.author}') ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.article_comments (id, article_id, user_id, content, status)
    VALUES ('${CMT_A}', '${ART}', '${IDs.userA}', 'a', 'pending') ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.article_comments (id, article_id, user_id, content, status)
    VALUES ('${CMT_B}', '${ART}', '${IDs.userB}', 'b', 'pending') ON CONFLICT (id) DO NOTHING;
`

describe('memareh.article_comments RLS', () => {
  beforeAll(async () => { await seedIdentities(service); await seed(service, SEED) })
  afterAll(async () => { await cleanup(service) })

  it('negative: ordinary user cannot approve another user’s pending comment', async () => {
    // UPDATE is silently filtered by RLS (no rows affected) rather than raising.
    const r = await evalAs(service, USER_B, `UPDATE memareh.article_comments SET status = 'approved', approved_by = '${IDs.userB}' WHERE id = '${CMT_A}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('negative: ordinary user cannot reject another user’s comment', async () => {
    const r = await evalAs(service, USER_B, `UPDATE memareh.article_comments SET status = 'rejected' WHERE id = '${CMT_A}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('negative: ordinary user cannot delete another user’s comment', async () => {
    const r = await evalAs(service, USER_B, `DELETE FROM memareh.article_comments WHERE id = '${CMT_A}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('positive: admin can moderate (approve) a pending comment', async () => {
    const r = await evalAs(service, ADMIN, `UPDATE memareh.article_comments SET status = 'approved', approved_by = '${IDs.admin}' WHERE id = '${CMT_B}';`)
    expect(r.ok).toBe(true)
  })

  it('negative: an authenticated user cannot read another user’s pending (moderation-only) comment merely by being logged in', async () => {
    const r = await evalAs(service, USER_A, `SELECT count(*) FROM memareh.article_comments WHERE id = '${CMT_B}' AND status = 'pending';`)
    expect(r.count).toBe(0)
  })

  it('positive: authenticated user can insert their own (pending) comment (no spoofing)', async () => {
    const r = await evalAs(service, USER_A, `INSERT INTO memareh.article_comments (id, article_id, user_id, content, status) VALUES ('${IDs.commentC}', '${ART}', '${IDs.userA}', 'c', 'pending');`)
    expect(r.ok).toBe(true)
  })

  it('negative: authenticated user cannot insert a comment spoofing another user_id', async () => {
    const r = await evalAs(service, USER_A, `INSERT INTO memareh.article_comments (id, article_id, user_id, content, status) VALUES ('${IDs.commentD}', '${ART}', '${IDs.userB}', 'c', 'pending');`)
    expect(r.ok).toBe(false)
    expect(String(r.sqlstate)).toBe('42501')
  })

  it('positive: anonymous user can insert a guest comment (pending, no user_id)', async () => {
    const r = await evalAs(service, ANON, `INSERT INTO memareh.article_comments (id, article_id, user_id, content, status, guest_name) VALUES ('${IDs.commentE}', '${ART}', NULL, 'c', 'pending', 'Guest');`)
    expect(r.ok).toBe(true)
  })
})
