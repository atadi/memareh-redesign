import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createClientMock = vi.fn()
let queryChain: any

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => createClientMock(...args),
}))

// Import AFTER mocking supabase-js
import { getPublishedArticleSlugs, getPublishedArticlesForSitemap } from '../src/lib/articles'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  createClientMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function makeChain(result: { data: any; error: any }) {
  queryChain = {
    select: vi.fn(() => queryChain),
    eq: vi.fn(() => queryChain),
    not: vi.fn(() => queryChain),
    limit: vi.fn(() => Promise.resolve(result)),
  }
  createClientMock.mockReturnValue({ from: vi.fn(() => queryChain) })
}

describe('articles: build-time public access (no service role)', () => {
  it('uses the public/anon client, not the service-role key', async () => {
    makeChain({ data: [{ slug: 'a' }, { slug: 'b' }], error: null })
    const slugs = await getPublishedArticleSlugs()
    expect(slugs).toEqual([{ slug: 'a' }, { slug: 'b' }])
    // The client was created with the anon key, never the service role.
    expect(createClientMock).toHaveBeenCalledWith(
      'https://xyz.supabase.co',
      'public-anon-key',
      expect.any(Object),
    )
    expect(createClientMock).not.toHaveBeenCalledWith(
      expect.any(String),
      'service-role-secret',
      expect.any(Object),
    )
  })

  it('queries only published, non-null slugs', async () => {
    makeChain({ data: [], error: null })
    await getPublishedArticleSlugs()
    expect(queryChain.eq).toHaveBeenCalledWith('status', 'published')
    expect(queryChain.not).toHaveBeenCalledWith('slug', 'is', null)
  })

  it('filters out rows with empty/undefined slug', async () => {
    makeChain({
      data: [{ slug: 'a' }, { slug: '' }, { slug: null as any }, { slug: 'b' }],
      error: null,
    })
    const slugs = await getPublishedArticleSlugs()
    expect(slugs).toEqual([{ slug: 'a' }, { slug: 'b' }])
  })

  it('fail-soft: returns [] when the query errors (temporary upstream failure)', async () => {
    makeChain({ data: null, error: { message: 'connection reset' } })
    const slugs = await getPublishedArticleSlugs()
    expect(slugs).toEqual([])
  })

  it('fail-soft: returns [] when the request throws', async () => {
    createClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ not: () => ({ limit: () => Promise.reject(new Error('boom')) }) }),
        }),
      }),
    })
    const slugs = await getPublishedArticleSlugs()
    expect(slugs).toEqual([])
  })

  it('sitemap returns slug + updated_at shape', async () => {
    makeChain({
      data: [{ slug: 'a', updated_at: '2026-01-01T00:00:00Z' }],
      error: null,
    })
    const articles = await getPublishedArticlesForSitemap()
    expect(articles).toEqual([{ slug: 'a', updated_at: '2026-01-01T00:00:00Z' }])
  })
})

describe('articles: fail-fast on missing config', () => {
  it('throws (does not hide) when NEXT_PUBLIC_SUPABASE_URL is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    await expect(getPublishedArticleSlugs()).rejects.toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    )
  })
})
