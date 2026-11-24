import { describe, it, expect } from 'vitest'
import { articlePublicUrl, isValidArticleSlug } from '../src/lib/article-urls'

const PROD = 'https://www.memareh.com'

describe('articlePublicUrl', () => {
  it('builds the canonical public URL from the site origin and slug', () => {
    expect(articlePublicUrl(PROD, 'foo-bar')).toBe(
      'https://www.memareh.com/articles/foo-bar',
    )
  })

  it('handles a trailing slash on the site URL consistently', () => {
    expect(articlePublicUrl('https://www.memareh.com/', 'foo-bar')).toBe(
      'https://www.memareh.com/articles/foo-bar',
    )
    expect(articlePublicUrl('https://www.memareh.com///', 'foo-bar')).toBe(
      'https://www.memareh.com/articles/foo-bar',
    )
  })

  it('rejects slugs with leading/trailing whitespace', () => {
    expect(isValidArticleSlug(' foo')).toBe(false)
    expect(isValidArticleSlug('foo ')).toBe(false)
    expect(() => articlePublicUrl(PROD, 'foo ')).toThrow(/invalid article slug/)
  })

  it('rejects empty slugs, internal whitespace and path separators', () => {
    for (const slug of ['', '   ', 'foo bar', 'foo/bar']) {
      expect(isValidArticleSlug(slug)).toBe(false)
      expect(() => articlePublicUrl(PROD, slug)).toThrow(/invalid article slug/)
    }
  })

  it('never derives the origin from a browser or request host', () => {
    expect(articlePublicUrl(PROD, 'foo')).not.toContain('localhost')
    expect(articlePublicUrl(PROD, 'foo')).not.toContain('vercel.app')
  })
})
