import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SERVICE, evalAs, seed, seedIdentities, cleanup, IDs, USER_A, USER_B, AUTHOR, ADMIN } from './helpers'

const service = SERVICE()
const ART = IDs.articleA
const TAG = IDs.tagX

const SEED = `
  INSERT INTO memareh.articles (id, title, slug, status, author_id)
    VALUES ('${ART}', 'a', 'a-${ART}', 'published', '${IDs.author}') ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.article_tags (id, name, slug) VALUES ('${TAG}', 'T', 't') ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.article_tags (id, name, slug) VALUES ('${IDs.tagNew2}', 'T2', 't2') ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.article_tag_relations (article_id, tag_id) VALUES ('${ART}', '${TAG}') ON CONFLICT DO NOTHING;
  INSERT INTO memareh.article_comments (id, article_id, user_id, content, status)
    VALUES ('${IDs.commentX}', '${ART}', '${IDs.userA}', 'c', 'approved') ON CONFLICT (id) DO NOTHING;
`

describe('memareh.comment_likes RLS', () => {
  beforeAll(async () => { await seedIdentities(service); await seed(service, SEED) })
  afterAll(async () => { await cleanup(service) })

  it('negative: one user cannot insert a like using another user’s UUID', async () => {
    const r = await evalAs(service, USER_A, `INSERT INTO memareh.comment_likes (comment_id, user_id) VALUES ('${IDs.commentX}', '${IDs.userB}');`)
    expect(r.ok).toBe(false)
    expect(String(r.sqlstate)).toBe('42501')
  })

  it('positive: user can like (insert own) a comment', async () => {
    const r = await evalAs(service, USER_A, `INSERT INTO memareh.comment_likes (comment_id, user_id) VALUES ('${IDs.commentX}', '${IDs.userA}');`)
    expect(r.ok).toBe(true)
  })

  it('negative: one user cannot delete another user’s like', async () => {
    const r = await evalAs(service, USER_B, `DELETE FROM memareh.comment_likes WHERE comment_id = '${IDs.commentX}' AND user_id = '${IDs.userA}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('positive: admin can manage any like', async () => {
    const r = await evalAs(service, ADMIN, `INSERT INTO memareh.comment_likes (comment_id, user_id) VALUES ('${IDs.commentX}', '${IDs.admin}');`)
    expect(r.ok).toBe(true)
  })
})

describe('memareh.article_tags RLS', () => {
  beforeAll(async () => { await seed(service, SEED) })
  afterAll(async () => { await cleanup(service) })

  it('positive: public can read tags', async () => {
    const r = await evalAs(service, { role: 'anon', userId: null }, `SELECT count(*) FROM memareh.article_tags WHERE id = '${TAG}';`)
    expect(r.count).toBe(1)
  })

  it('positive: authenticated user can insert a tag (collaborative)', async () => {
    const r = await evalAs(service, USER_A, `INSERT INTO memareh.article_tags (id, name, slug) VALUES ('${IDs.tagNew}', 'New', 'new-collab');`)
    expect(r.ok).toBe(true)
  })

  it('negative: ordinary user cannot rename (UPDATE) an arbitrary tag', async () => {
    const r = await evalAs(service, USER_B, `UPDATE memareh.article_tags SET name = 'hijacked' WHERE id = '${TAG}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('negative: ordinary user cannot delete an arbitrary tag', async () => {
    const r = await evalAs(service, USER_B, `DELETE FROM memareh.article_tags WHERE id = '${TAG}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('positive: admin can update/delete a tag', async () => {
    const u = await evalAs(service, ADMIN, `UPDATE memareh.article_tags SET name = 'adm' WHERE id = '${IDs.tagNew}';`)
    const d = await evalAs(service, ADMIN, `DELETE FROM memareh.article_tags WHERE id = '${IDs.tagNew}';`)
    expect(u.ok).toBe(true)
    expect(d.ok).toBe(true)
  })
})

describe('memareh.article_tag_relations RLS', () => {
  beforeAll(async () => { await seed(service, SEED) })
  afterAll(async () => { await cleanup(service) })

  it('positive: article author can manage their own article’s tag relations', async () => {
    const r = await evalAs(service, AUTHOR, `INSERT INTO memareh.article_tag_relations (article_id, tag_id) VALUES ('${ART}', '${IDs.tagNew2}');`)
    expect(r.ok).toBe(true)
  })

  it('negative: ordinary user cannot retag another author’s article', async () => {
    const r = await evalAs(service, USER_B, `INSERT INTO memareh.article_tag_relations (article_id, tag_id) VALUES ('${ART}', '${TAG}');`)
    expect(r.ok).toBe(false)
    expect(String(r.sqlstate)).toBe('42501')
  })

  it('negative: ordinary user cannot delete another author’s tag relation', async () => {
    const r = await evalAs(service, USER_B, `DELETE FROM memareh.article_tag_relations WHERE article_id = '${ART}' AND tag_id = '${TAG}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })

  it('positive: admin can manage any tag relation', async () => {
    const r = await evalAs(service, ADMIN, `DELETE FROM memareh.article_tag_relations WHERE article_id = '${ART}' AND tag_id = '${TAG}';`)
    expect(r.ok).toBe(true)
  })
})
