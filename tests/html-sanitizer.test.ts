import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../src/lib/html-sanitizer'

describe('sanitizeHtml — dangerous content removed', () => {
  it('strips <script> tags', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).toContain('<p>hi</p>')
  })

  it('neutralizes inline event handlers', () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)">')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('alert(1)')
  })

  it('blocks javascript: links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
    expect(out).not.toContain('javascript:')
  })

  it('blocks data: links via the hook', () => {
    const out = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    expect(out).not.toContain('data:text/html')
  })

  it('removes iframe / object / embed', () => {
    const out = sanitizeHtml(
      '<iframe src="https://evil.com"></iframe><object data="x"></object><embed src="x">',
    )
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('<object')
    expect(out).not.toContain('<embed')
  })

  it('removes style tags and style attributes', () => {
    const out = sanitizeHtml(
      '<style>body{display:none}</style><p style="background:url(javascript:alert(1))">x</p>',
    )
    expect(out).not.toContain('<style')
    expect(out).not.toContain('style=')
  })

  it('removes forms', () => {
    const out = sanitizeHtml('<form action="https://evil.com"><input name="x"></form>')
    expect(out).not.toContain('<form')
    expect(out).not.toContain('<input')
  })
})

describe('sanitizeHtml — legitimate article content preserved', () => {
  it('keeps headings, lists, emphasis, blockquote', () => {
    const html =
      '<h1>عنوان</h1><h2>زیرعنوان</h2><p>متن <strong>مهم</strong> و <em>تاکید</em></p><ul><li>یک</li><li>دو</li></ul><blockquote>نقل‌قول</blockquote>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<h1>عنوان</h1>')
    expect(out).toContain('<strong>مهم</strong>')
    expect(out).toContain('<ul><li>یک</li><li>دو</li></ul>')
    expect(out).toContain('<blockquote>')
  })

  it('keeps tables produced by the Tiptap editor', () => {
    const html =
      '<table><thead><tr><th scope="col">سرویس</th></tr></thead><tbody><tr><td>برقکاری</td></tr></tbody></table>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<table>')
    expect(out).toContain('<th scope="col">سرویس</th>')
    expect(out).toContain('<thead>')
  })

  it('keeps article design-system wrappers (div) and col scopes', () => {
    // The `.article-*` design system uses <div> as the block wrapper and
    // `scope="col"` for semantic table headers. Both must survive — this is the
    // allowlist support added for the single-article pilot.
    const html =
      '<div class="article-callout"><p>هشدار</p></div>' +
      '<table><thead><tr><th scope="col">دسته</th></tr></thead><tbody><tr><td>مقدار</td></tr></tbody></table>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<div class="article-callout">')
    expect(out).toContain('<th scope="col">دسته</th>')
  })

  it('keeps code/pre blocks', () => {
    const out = sanitizeHtml('<pre><code>const x = 1;</code></pre>')
    expect(out).toContain('<pre>')
    expect(out).toContain('<code>')
  })

  it('preserves Persian Unicode, RTL punctuation and Persian numerals', () => {
    const out = sanitizeHtml('<p>۱۲۳ تست امنیتی — «نقل‌قول» ۴۵٪</p>')
    expect(out).toContain('۱۲۳')
    expect(out).toContain('نقل‌قول')
    expect(out).toContain('۴۵٪')
  })

  // Policy (reviewed): rel="noopener noreferrer" is only required when a link
  // opens a new browsing context. Stamping it on ordinary same-tab links added
  // no security value, stripped the referrer from internal navigation, and
  // rewrote clean markup on every sanitize pass. See tests/article-link-policy.
  it('keeps safe https links and does not add rel to same-tab links', () => {
    const out = sanitizeHtml('<a href="https://memareh.com">سایت</a>')
    expect(out).toContain('href="https://memareh.com"')
    expect(out).not.toContain('rel=')
  })

  it('adds rel=noopener noreferrer to links opening a new tab', () => {
    const out = sanitizeHtml('<a href="https://memareh.com" target="_blank">سایت</a>')
    expect(out).toContain('noopener')
    expect(out).toContain('noreferrer')
  })

  it('keeps legitimate images (Supabase Storage URLs)', () => {
    const url =
      'https://uakvurskrcyvksxfvhho.supabase.co/storage/v1/object/public/articles/foo.png'
    const out = sanitizeHtml(`<img src="${url}" alt="عکس">`)
    expect(out).toContain(`src="${url}"`)
    expect(out).toContain('alt="عکس"')
  })
})

describe('sanitizeHtml — edge cases', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })

  it('handles malformed nested HTML without throwing', () => {
    const out = sanitizeHtml('<p><strong>ناقص</div><script>alert(1)</p>')
    expect(out).not.toContain('<script')
    expect(out).toContain('ناقص')
  })
})
