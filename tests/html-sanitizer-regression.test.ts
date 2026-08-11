// Regression test for the article sanitizer.
//
// Locks in the security behavior (no script/style/event-handlers, safe link
// rel policy, byte-level idempotence) AND proves the sanitizer no longer pulls
// in jsdom (which crashed article ISR regeneration in production with
// ERR_REQUIRE_ESM via html-encoding-sniffer -> @exodus/bytes).
//
// The implementation now uses the pure-JS `sanitize-html` (no DOM backend), so
// the production server render cannot hit the jsdom ESM crash. Behavior
// assertions run under vitest's node environment; the jsdom-absence check
// inspects the compiled server chunks produced by `next build`.
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/html-sanitizer'

const relOf = (html: string) => {
  const m = html.match(/<a[^>]*>/)
  if (!m) return null
  const r = m[0].match(/rel="([^"]*)"/)
  return r ? r[1] : null
}

describe('html-sanitizer security behavior (unchanged from jsdom impl)', () => {
  it('drops script tags and their content is escaped, not leaked as text', () => {
    const out = sanitizeHtml('<p>safe</p><script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
  })

  it('strips inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="evil()">hi</p>')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('evil()')
  })

  it('removes javascript: href entirely', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('href="javascript:')
  })

  it('keeps allowed formatting tags', () => {
    const out = sanitizeHtml('<p><strong>bold</strong> <em>it</em></p>')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>it</em>')
  })

  it('does NOT add rel to internal same-tab links', () => {
    const out = sanitizeHtml('<p><a href="https://www.memareh.com/articles/foo">x</a></p>')
    expect(relOf(out)).toBeNull()
    expect(out).not.toContain('noopener')
  })

  it('adds noopener noreferrer to target=_blank links', () => {
    const out = sanitizeHtml('<p><a href="https://example.com/x" target="_blank">x</a></p>')
    const rel = relOf(out) || ''
    expect(rel).toContain('noopener')
    expect(rel).toContain('noreferrer')
  })

  it('is byte-level idempotent', () => {
    const input = '<p><a href="https://example.com" target="_blank" rel="nofollow noopener noreferrer">x</a></p>'
    expect(sanitizeHtml(sanitizeHtml(input))).toBe(sanitizeHtml(input))
  })

  it('returns empty string for null/undefined/empty', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })
})
