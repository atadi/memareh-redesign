// Tests for the article visible-text integrity contract. These guard the core
// promise of any markup-only article transformation: a reader must see exactly
// the same characters in the same order.
import { describe, it, expect } from 'vitest'
import { extractVisibleText, compareVisibleText } from '@/lib/article-text-integrity'

describe('extractVisibleText', () => {
  it('collapses whitespace but preserves visible words and order', () => {
    const html = `<p>بررسی   کامل</p>\n  <p>علت</p>`
    expect(extractVisibleText(html)).toBe('بررسی کامل علت')
  })

  it('decodes HTML entities', () => {
    expect(extractVisibleText('a&amp;b &lt;c&gt; &quot;d&quot; &nbsp;e')).toBe('a&b <c> "d" e')
  })

  it('joins adjacent inline tags without inventing a space', () => {
    // <strong>گروه</strong>معماری has no space in the source, so it must stay
    // one word. Inserting a space here would be a false "difference".
    const html = '<p><strong>گروه</strong>معماری</p>'
    expect(extractVisibleText(html)).toBe('گروهمعماری')
  })

  it('keeps a real space between separate text nodes', () => {
    const html = '<p><strong>گروه</strong> معماری</p>'
    expect(extractVisibleText(html)).toBe('گروه معماری')
  })

  it('drops script/style contents', () => {
    const html = '<p>ok</p><script>alert(1)</script><style>x{}</style>'
    expect(extractVisibleText(html)).toBe('ok')
  })

  it('handles empty / null input', () => {
    expect(extractVisibleText('')).toBe('')
    expect(extractVisibleText(null)).toBe('')
    expect(extractVisibleText(undefined)).toBe('')
  })
})

describe('compareVisibleText', () => {
  it('reports preserved when only markup changed', () => {
    const before = '<p>چرا <strong>چراغ</strong> چشمک می‌زند؟</p>'
    const after = '<p class="x">چرا <em>چراغ</em> چشمک می‌زند؟</p>'
    const r = compareVisibleText(before, after)
    expect(r.preserved).toBe(true)
    expect(r.diff).toBeNull()
  })

  it('detects a changed word', () => {
    const before = '<p>چراغ چشمک می‌زند</p>'
    const after = '<p>چراغ خاموش می‌شود</p>'
    const r = compareVisibleText(before, after)
    expect(r.preserved).toBe(false)
    expect(r.diff?.after).toContain('خاموش')
  })

  it('detects a removed sentence', () => {
    const before = '<p>یک دو سه</p>'
    const after = '<p>یک دو</p>'
    const r = compareVisibleText(before, after)
    expect(r.preserved).toBe(false)
  })

  it('detects an inserted word', () => {
    const before = '<p>سلام دنیا</p>'
    const after = '<p>سلام بزرگ دنیا</p>'
    const r = compareVisibleText(before, after)
    expect(r.preserved).toBe(false)
  })
})
