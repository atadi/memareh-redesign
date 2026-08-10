import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SERVICE, evalAs, seed, seedIdentities, cleanup, IDs, ANON, USER_A, USER_B, AUTHOR, ADMIN } from './helpers'

const service = SERVICE()
const ART_PUB = IDs.articleA
const ART_DRAFT = IDs.articleB

// Fixtures are created with the service role (bypass) so they exist before the
// impersonated assertions run. cleanup() removes them afterwards.
const SEED = `
  INSERT INTO memareh.articles (id, title, slug, status, author_id)
    VALUES ('${ART_PUB}', 'pub', 'pub-${ART_PUB}', 'published', '${IDs.author}')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.articles (id, title, slug, status, author_id)
    VALUES ('${ART_DRAFT}', 'draft', 'draft-${ART_DRAFT}', 'draft', '${IDs.author}')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO memareh.articles (id, title, slug, status, author_id)
    VALUES ('${IDs.articleC}', 'adm', 'adm-${IDs.articleC}', 'draft', '${IDs.author}')
    ON CONFLICT (id) DO NOTHING;
`

describe('memareh.articles RLS', () => {
  beforeAll(async () => { await seedIdentities(service); await seed(service, SEED) })
  afterAll(async () => { await cleanup(service) })

  it('negative: ordinary authenticated user cannot read another author’s draft', async () => {
    const r = await evalAs(service, USER_B, `SELECT count(*) FROM memareh.articles WHERE id = '${ART_DRAFT}';`)
    expect(r.count).toBe(0)
  })

  it('positive: public can read a published article', async () => {
    const r = await evalAs(service, ANON, `SELECT count(*) FROM memareh.articles WHERE id = '${ART_PUB}' AND status = 'published';`)
    expect(r.count).toBe(1)
  })

  it('positive: author can read their own draft', async () => {
    const r = await evalAs(service, AUTHOR, `SELECT count(*) FROM memareh.articles WHERE id = '${ART_DRAFT}';`)
    expect(r.count).toBe(1)
  })

  it('positive: admin can read another author’s draft', async () => {
    const r = await evalAs(service, ADMIN, `SELECT count(*) FROM memareh.articles WHERE id = '${ART_DRAFT}';`)
    expect(r.count).toBe(1)
  })

  it('negative: ordinary user cannot insert an article owned by another user', async () => {
    const r = await evalAs(service, USER_A, `INSERT INTO memareh.articles (id, title, slug, status, author_id) VALUES ('${IDs.articleD}', 'hijack', 'hijack', 'published', '${IDs.author}');`)
    expect(r.ok).toBe(false)
    expect(String(r.sqlstate)).toBe('42501')
  })

  it('positive: author can insert their own article', async () => {
    const r = await evalAs(service, AUTHOR, `INSERT INTO memareh.articles (id, title, slug, status, author_id) VALUES ('${IDs.articleD}', 'own', 'own', 'draft', '${IDs.author}');`)
    expect(r.ok).toBe(true)
  })

  it('positive: admin can manage (update) any article', async () => {
    const r = await evalAs(service, ADMIN, `UPDATE memareh.articles SET status = 'published' WHERE id = '${IDs.articleC}';`)
    expect(r.ok).toBe(true)
  })

  it('negative: ordinary user cannot delete another author’s article', async () => {
    // RLS silently filters DELETE/UPDATE (no rows affected) rather than raising.
    const r = await evalAs(service, USER_B, `DELETE FROM memareh.articles WHERE id = '${ART_DRAFT}';`)
    expect(r.ok).toBe(true)
    expect(r.affected).toBe(0)
  })
})
