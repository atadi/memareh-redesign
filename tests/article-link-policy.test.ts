// Link-rel policy, empty-attribute cleanup, trailing-slash canonicalization and
// byte-level idempotence. These lock in the decisions made during the manual
// review of the 8 REVIEW_REQUIRED articles.
//
// Motivation: the sanitizer previously stamped rel="noopener noreferrer" onto
// EVERY anchor (including internal same-tab links), the optimizer appended a
// trailing slash to bare-origin internal links, sorted class tokens
// alphabetically, and re-emitted empty class="" attributes. Together these made
// an already-optimized article look changed on every pass.
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/html-sanitizer'
import { optimizeArticleHtml } from '@/lib/article-optimizer'

const relOf = (html: string) => {
  const m = html.match(/<a[^>]*>/)
  if (!m) return null
  const r = m[0].match(/rel="([^"]*)"/)
  return r ? r[1] : null
}

describe('link rel policy', () => {
  it('does NOT add rel to internal same-tab links', () => {
    const out = sanitizeHtml('<p><a href="https://www.memareh.com/articles/foo">خانه</a></p>')
    expect(relOf(out)).toBeNull()
    expect(out).not.toContain('noopener')
  })

  it('does NOT add rel to external same-tab links', () => {
    const out = sanitizeHtml('<p><a href="https://example.com/x">x</a></p>')
    expect(relOf(out)).toBeNull()
  })

  it('adds noopener noreferrer to target=_blank links', () => {
    const out = sanitizeHtml('<p><a href="https://example.com/x" target="_blank">x</a></p>')
    const rel = relOf(out) || ''
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })

  it('preserves an existing meaningful rel on a _blank link without duplicating', () => {
    const out = sanitizeHtml('<p><a href="https://example.com" target="_blank" rel="nofollow noopener noreferrer">x</a></p>')
    const rel = (relOf(out) || '').split(/\s+/)
    expect(rel).toContain('nofollow')
    expect(rel.filter((t) => t === 'noopener')).toHaveLength(1)
    expect(rel.filter((t) => t === 'noreferrer')).toHaveLength(1)
  })

  it('leaves tel: links completely unchanged', () => {
    const out = sanitizeHtml('<p><a href="tel:09126769048">تماس</a></p>')
    expect(relOf(out)).toBeNull()
    expect(out).toContain('tel:09126769048')
  })

  it('drops an empty rel="" rather than re-emitting it', () => {
    const out = sanitizeHtml('<p><a href="/x" rel="">x</a></p>')
    expect(out).not.toContain('rel=""')
  })

  it('still blocks javascript: and data: hrefs', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
    expect(sanitizeHtml('<a href="data:text/html,x">x</a>')).not.toContain('data:text/html')
  })

  it('removes nofollow from internal links via the optimizer', () => {
    const html = '<p><a href="https://www.memareh.com/articles/a" rel="noopener noreferrer nofollow">a</a></p>'
    const out = optimizeArticleHtml(html).sanitizedHtml
    expect(out).not.toContain('nofollow')
  })
})

describe('internal URL canonicalization', () => {
  it('upgrades non-www and http internal links to https://www', () => {
    const html = '<p><a href="http://memareh.com/articles/a">a</a><a href="https://memareh.com/articles/b">b</a></p>'
    const out = optimizeArticleHtml(html).sanitizedHtml
    expect(out).toContain('https://www.memareh.com/articles/a')
    expect(out).toContain('https://www.memareh.com/articles/b')
    expect(out).not.toMatch(/href="https?:\/\/memareh\.com/)
  })

  it('does NOT add or remove a trailing slash (path preserved byte-for-byte)', () => {
    const bare = optimizeArticleHtml('<p><a href="https://www.memareh.com">خانه</a></p>').sanitizedHtml
    expect(bare).toContain('href="https://www.memareh.com"')
    const slashed = optimizeArticleHtml('<p><a href="https://www.memareh.com/">خانه</a></p>').sanitizedHtml
    expect(slashed).toContain('href="https://www.memareh.com/"')
  })

  it('leaves genuine external domains alone', () => {
    const out = optimizeArticleHtml('<p><a href="https://example.com/memareh">x</a></p>').sanitizedHtml
    expect(out).toContain('https://example.com/memareh')
  })
})

describe('empty attribute cleanup and byte stability', () => {
  it('never emits an empty class=""', () => {
    const out = optimizeArticleHtml('<p class="">متن</p><span class="">x</span>').sanitizedHtml
    expect(out).not.toContain('class=""')
  })

  it('preserves authored class token order (no alphabetical churn)', () => {
    const html = '<ul class="article-service-list article-feature-list"><li>یک</li></ul>'
    const out = optimizeArticleHtml(html).sanitizedHtml
    expect(out).toContain('class="article-service-list article-feature-list"')
  })

  it('dedupes repeated class tokens', () => {
    const out = optimizeArticleHtml('<p class="a b a">متن</p>').sanitizedHtml
    expect(out).toContain('class="a b"')
  })

  it('an already-clean article is byte-identical after optimization', () => {
    const clean = '<h2>عنوان</h2>\n<p>متن <a href="https://www.memareh.com/articles/x">پیوند</a> ادامه.</p>\n<ul class="article-feature-list">\n<li>یک</li>\n</ul>'
    const first = optimizeArticleHtml(clean).sanitizedHtml
    expect(first).toBe(clean)
  })

  it('is byte-stable across a second optimization pass', () => {
    const messy = '<p style="color:red" class="">سلام <a href="http://memareh.com/a" rel="nofollow">لینک</a></p><table><tr><th>ه</th></tr><tr><td>د</td></tr></table>'
    const once = optimizeArticleHtml(messy).sanitizedHtml
    const twice = optimizeArticleHtml(once).sanitizedHtml
    expect(twice).toBe(once)
  })

  it('preserves visible text through the rel/class changes', () => {
    const html = '<p class=""><a href="http://memareh.com/a" rel="nofollow">متن پیوند</a> و ادامه متن</p>'
    const r = optimizeArticleHtml(html)
    expect(r.textPreserved).toBe(true)
    expect(r.linkIntegrity).toBe(true)
  })
})
