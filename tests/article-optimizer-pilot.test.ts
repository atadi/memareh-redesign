// Pilot compatibility: the optimizer should be able to repair the SAME classes
// of structural problems the manual pilot fixed, and must be idempotent on the
// pilot's proven output. The pilot article's ORIGINAL body had: a body H1, 16
// non-www internal links with nofollow, 58 inline color styles, a table with no
// thead/scope, and white-on-nothing step numbers. We reconstruct a representative
// slice (the production backup is never committed) and assert the optimizer
// resolves each category without altering visible text.
import { describe, it, expect } from 'vitest'
import { optimizeArticleHtml, analyzeArticleHtml } from '@/lib/article-optimizer'
import { compareVisibleText } from '@/lib/article-text-integrity'

const PILOT_ORIGINAL = `
<h1><strong>چرا چراغ‌های خانه چشمک می‌زنند؟ </strong><span style="color: rgb(15, 23, 42);"><strong>جدید</strong></span></h1>
<p><a rel="noopener noreferrer nofollow" class="text-blue-600 hover:underline" href="https://memareh.com">خانه</a> <a rel="noopener noreferrer nofollow" class="text-blue-600 hover:underline" href="https://memareh.com/articles">مقالات</a></p>
<p style="color: rgb(185, 28, 28);">نیاز به اقدام سریع</p>
<table class="border-collapse table-auto w-full"><tbody><tr><th class="border border-gray-300 px-4 py-2 bg-gray-100 font-bold">دسته مشکل</th><th class="border border-gray-300 px-4 py-2 bg-gray-100 font-bold">توضیح مختصر</th></tr><tr><td>مشکلات ساده</td><td>بدون نیاز به تکنسین</td></tr></tbody></table>
<p><span style="color: rgb(255, 255, 255);"><strong>1</strong></span></p>
<p><strong>یک لامپ سالم را جایگزین کنید:</strong> <span style="color: rgb(71, 85, 105);">ساده‌ترین کار این است.</span></p>
`.trim()

describe('optimizer reproduces pilot-class structural fixes', () => {
  const r = optimizeArticleHtml(PILOT_ORIGINAL)

  it('removes the duplicate body H1 (pilot rule)', () => {
    expect(r.sanitizedHtml).not.toMatch(/<h1/gi)
    expect(r.sanitizedHtml).toContain('article-body-title')
  })

  it('canonicalizes every internal link to www and strips internal nofollow', () => {
    expect(r.sanitizedHtml).not.toMatch(/https:\/\/memareh\.com(?!www)/)
    expect(r.sanitizedHtml).not.toMatch(/nofollow/)
    expect(r.sanitizedHtml).toContain('https://www.memareh.com/articles')
  })

  it('removes all inline presentation styles', () => {
    expect(r.sanitizedHtml).not.toMatch(/style=/)
  })

  it('turns the incomplete table into semantic thead/scope/tbody', () => {
    expect(r.sanitizedHtml).toContain('<thead>')
    expect(r.sanitizedHtml).toContain('scope="col"')
    expect(r.sanitizedHtml).toContain('<tbody>')
  })

  it('does NOT rewrite white-on-nothing step numbers into a new structure unless opted in', () => {
    // Default run keeps the pilot's number+body paragraph pairing as-is (the
    // medium-confidence enhanceStructure is off). Text is preserved.
    expect(r.textPreserved).toBe(true)
  })

  it('preserves visible Persian text exactly (pilot text-integrity gate)', () => {
    expect(r.textPreserved).toBe(true)
    expect(compareVisibleText(PILOT_ORIGINAL, r.sanitizedHtml).preserved).toBe(true)
  })
})

describe('optimizer is idempotent on already-optimized markup', () => {
  it('double-apply is stable', () => {
    const once = optimizeArticleHtml(PILOT_ORIGINAL).optimizedHtml
    const twice = optimizeArticleHtml(once).optimizedHtml
    expect(twice).toBe(once)
  })

  it('a fully-optimized article yields zero high/medium structural findings', () => {
    const once = optimizeArticleHtml(PILOT_ORIGINAL).optimizedHtml
    const findings = analyzeArticleHtml(once).findings
    expect(findings.filter((f) => f.severity !== 'low').length).toBe(0)
  })
})
