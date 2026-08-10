// Unit tests for the deterministic, AI-free article optimizer.
// The pilot article's ORIGINAL structural problems are used as the golden input
// that the optimizer should be able to repair; its proven optimized output is the
// idempotence target. The production backup is never committed — we reconstruct
// representative markup from the previously documented findings.
import { describe, it, expect } from 'vitest'
import {
  analyzeArticleHtml,
  optimizeArticleHtml,
  assertSafeToApply,
  DEFAULT_OPTIMIZER_OPTIONS,
} from '@/lib/article-optimizer'
import { compareVisibleText } from '@/lib/article-text-integrity'

// A representative article excerpt with the structural problems the pilot fixed:
// body H1, non-www internal links, internal nofollow, inline styles, an
// incomplete table, and a tel link that must survive.
const PROBLEM_HTML = `
<h1><strong>عنوان تست</strong></h1>
<p><a rel="noopener noreferrer nofollow" class="text-blue-600 hover:underline" href="https://memareh.com">خانه</a></p>
<p><a rel="noopener noreferrer nofollow" class="text-blue-600 hover:underline" href="tel:09126769048">تماس</a></p>
<p style="color: rgb(220, 38, 38);"><strong>هشدار</strong></p>
<table class="border-collapse table-auto w-full">
  <tr><th class="border">دسته</th><th class="border">توضیح</th></tr>
  <tr><td>ساده</td><td>توضیح ساده</td></tr>
</table>
<p>متن پایانی بدون تغییر.</p>
`.trim()

describe('analyzeArticleHtml', () => {
  it('detects duplicate body H1', () => {
    const { findings } = analyzeArticleHtml(PROBLEM_HTML)
    expect(findings.some((f) => f.type === 'duplicate-h1' && f.confidence === 'high')).toBe(true)
  })

  it('detects non-www internal links and internal nofollow', () => {
    const { findings } = analyzeArticleHtml(PROBLEM_HTML)
    expect(findings.some((f) => f.type === 'internal-link-non-www')).toBe(true)
    expect(findings.some((f) => f.type === 'internal-link-nofollow')).toBe(true)
  })

  it('detects inline styles and incomplete tables', () => {
    const { findings } = analyzeArticleHtml(PROBLEM_HTML)
    expect(findings.some((f) => f.type === 'inline-style')).toBe(true)
    expect(findings.some((f) => f.type === 'table-incomplete')).toBe(true)
  })

  it('reports the CTA/Booking mismatch without flagging text', () => {
    const { findings } = analyzeArticleHtml(
      '<p>ثبت درخواست در سایت معماره</p>',
    )
    expect(findings.some((f) => f.type === 'cta-mismatch')).toBe(true)
    expect(findings.find((f) => f.type === 'cta-mismatch')?.autoFixable).toBe(false)
  })

  it('analyzes metadata read-only', () => {
    const { metaFindings } = analyzeArticleHtml('<p>بدنه</p>', {
      meta_title: '',
      meta_description: '',
      canonical_url: 'https://memareh.com/x',
      og_image: '',
      featured_image_alt: '',
    })
    expect(metaFindings.some((f) => f.type === 'metadata-meta_title')).toBe(true)
    expect(metaFindings.some((f) => f.type === 'metadata-canonical_url')).toBe(true)
  })
})

describe('optimizeArticleHtml — safe automatic fixes', () => {
  const r = optimizeArticleHtml(PROBLEM_HTML)

  it('removes body H1 (no duplicate)', () => {
    expect(r.sanitizedHtml).not.toMatch(/<h1/gi)
    expect(r.sanitizedHtml).toContain('article-body-title')
  })

  it('canonicalizes internal links to www', () => {
    expect(r.sanitizedHtml).toContain('https://www.memareh.com')
    expect(r.sanitizedHtml).not.toMatch(/https:\/\/memareh\.com(?!www)/)
  })

  it('strips nofollow from internal Memareh links (tel links keep harmless rel)', () => {
    // The memareh.com link must lose nofollow; the tel: link is not a Memareh
    // link and keeps its rel (that is correct behavior).
    const memarehAnchor = r.sanitizedHtml.match(/<a[^>]*href=["']https:\/\/www\.memareh\.com["'][^>]*>/)?.[0] ?? ''
    expect(memarehAnchor).not.toMatch(/nofollow/)
  })

  it('removes inline styles', () => {
    expect(r.sanitizedHtml).not.toMatch(/style=/)
  })

  it('produces a semantic table with thead + scope', () => {
    expect(r.sanitizedHtml).toContain('<thead>')
    expect(r.sanitizedHtml).toContain('scope="col"')
    expect(r.sanitizedHtml).toContain('<tbody>')
  })

  it('preserves the tel link', () => {
    expect(r.sanitizedHtml).toContain('tel:09126769048')
  })

  it('preserves visible text exactly (text-integrity gate)', () => {
    expect(r.textPreserved).toBe(true)
    expect(compareVisibleText(PROBLEM_HTML, r.sanitizedHtml).preserved).toBe(true)
  })

  it('link integrity passes', () => {
    expect(r.linkIntegrity).toBe(true)
  })

  it('does not weaken sanitizer (no scripts/iframes survive)', () => {
    const malicious = '<p>x</p><script>alert(1)</script><iframe src="y"></iframe>'
    const mr = optimizeArticleHtml(malicious)
    expect(mr.sanitizedHtml).not.toMatch(/<script/i)
    expect(mr.sanitizedHtml).not.toMatch(/<iframe/i)
  })

  it('assertSafeToApply does not throw for a clean result', () => {
    expect(() => assertSafeToApply(r)).not.toThrow()
  })
})

describe('optimizer idempotence', () => {
  it('double-apply is stable', () => {
    const once = optimizeArticleHtml(PROBLEM_HTML).optimizedHtml
    const twice = optimizeArticleHtml(once).optimizedHtml
    expect(twice).toBe(once)
  })

  it('already-optimized HTML is unchanged by analyze (no duplicate findings explode)', () => {
    const once = optimizeArticleHtml(PROBLEM_HTML).optimizedHtml
    const a1 = analyzeArticleHtml(PROBLEM_HTML).findings.length
    const a2 = analyzeArticleHtml(once).findings.length
    expect(a2).toBeLessThanOrEqual(a1)
  })
})

describe('text-integrity gate blocks wording change', () => {
  it('a hypothetical text edit would be caught by compareVisibleText', () => {
    const before = '<p>چراغ چشمک می‌زند</p>'
    const after = '<p>چراغ خاموش است</p>'
    expect(compareVisibleText(before, after).preserved).toBe(false)
  })

  it('assertSafeToApply throws the Persian gate message when text changed', () => {
    expect(() =>
      assertSafeToApply({
        findings: [],
        originalHtml: '',
        optimizedHtml: '',
        sanitizedHtml: '',
        textPreserved: false,
        linkIntegrity: true,
        structuralScore: 0,
        meta: { findings: [], score: 0 },
      }),
    ).toThrow(/متن قابل مشاهده مقاله تغییر کرده است/)
  })
})

describe('medium-confidence enhancements are opt-in only', () => {
  it('off by default: no article-faq-question added', () => {
    const r = optimizeArticleHtml('<p>سلام؟ این سوال است</p>', DEFAULT_OPTIMIZER_OPTIONS)
    expect(r.sanitizedHtml).not.toContain('article-faq-question')
  })

  it('when enabled, recognizes the pilot step pattern and a clear FAQ without changing text', () => {
    const input = '<p>۱</p><p>قدم اول انجام شود</p><p>آیا این سوال است؟ پاسخ کوتاه</p>'
    const r = optimizeArticleHtml(input, { ...DEFAULT_OPTIMIZER_OPTIONS, enhanceStructure: true })
    expect(r.sanitizedHtml).toContain('article-step-number')
    expect(r.sanitizedHtml).toContain('article-faq-question')
    expect(r.textPreserved).toBe(true)
  })
})

describe('idempotence is byte-stable including sanitizer whitespace', () => {
  it('a second pass over the sanitized output reproduces it exactly (no leading-newline drift)', () => {
    // The sanitizer can prepend surrounding whitespace on raw input; the
    // optimizer must canonicalize it so bulk/editor re-runs are stable.
    const raw =
      '<h1>عنوان</h1><p><a href="https://memareh.com" rel="nofollow">لینک</a></p>' +
      '<table><tr><th>سرویس</th></tr><tr><td>برق</td></tr></table>'
    const once = optimizeArticleHtml(raw)
    const twice = optimizeArticleHtml(once.sanitizedHtml)
    expect(twice.sanitizedHtml).toBe(once.sanitizedHtml)
    expect(once.sanitizedHtml).not.toMatch(/^\s/)
    expect(once.sanitizedHtml).not.toMatch(/\s$/)
  })
})
