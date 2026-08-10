// Pilot-specific guarantee: the actual production article body (the
// "چرا چراغ‌های خانه چشمک می‌زنند؟" article) loses no visible Persian text
// when converted to the new `.article-*` markup.
//
// The two fixtures are NOT committed: the original comes from a read-only
// production dump (stored outside the repo) and the transformed output is a
// generated artifact. This test reads them from the working directory if present
// so it stays green in CI (skips gracefully) while still guarding local runs.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compareVisibleText } from '@/lib/article-text-integrity'
import { sanitizeHtml } from '@/lib/html-sanitizer'

const ORIGINAL = join(
  process.cwd(),
  'pilot-orig.tmp.html',
)
const TRANSFORMED = join(process.cwd(), 'pilot-transformed.tmp.html')

const available = existsSync(ORIGINAL) && existsSync(TRANSFORMED)

describe('pilot article visible-text preservation', () => {
  it.skipIf(!available)('preserves every visible character of the pilot article', () => {
    const before = readFileSync(ORIGINAL, 'utf8')
    const after = readFileSync(TRANSFORMED, 'utf8')
    const r = compareVisibleText(before, after)
    if (!r.preserved && r.diff) {
      throw new Error(
        `VISIBLE TEXT CHANGED at ${r.diff.index}\nBEFORE: ${r.diff.before}\nAFTER:  ${r.diff.after}`,
      )
    }
    expect(r.preserved).toBe(true)
  })

  it.skipIf(!available)('transformed HTML survives the sanitizer', () => {
    const after = readFileSync(TRANSFORMED, 'utf8')
    const clean = sanitizeHtml(after)

    // No inline styles, no nofollow, exactly one (or zero) body H1.
    expect(clean).not.toMatch(/style="/)
    expect(clean).not.toMatch(/nofollow/)
    expect((clean.match(/<h1/gi) ?? []).length).toBe(0)

    // Key design-system classes survive sanitization.
    for (const cls of ['article-breadcrumb', 'article-body-title', 'article-callout', 'article-table', 'article-step', 'article-expert', 'article-danger-list', 'article-service-cta', 'article-faq-question', 'article-conclusion']) {
      expect(clean).toContain(cls)
    }

    // Table semantics survive.
    expect(clean).toContain('<thead>')
    expect(clean).toContain('scope="col"')

    // tel + www links survive and are canonical.
    expect(clean).toContain('tel:09126769048')
    expect((clean.match(/https:\/\/www\.memareh\.com/g) ?? []).length).toBeGreaterThan(0)
    expect(clean).not.toMatch(/https:\/\/memareh\.com(?!www)/)

    // No script/event handlers leaked through.
    expect(clean).not.toMatch(/on\w+\s*=/i)
    expect(clean).not.toMatch(/javascript:/i)
  })
})
