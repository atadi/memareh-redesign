// Tests for the READ-ONLY structural audit + dry-run additions.
// Covers: UTF-8 chunk decoding (hash stability), audit counters, audit rollup,
// and the guarantee that no write path is exposed.
import { describe, it, expect } from 'vitest'
import { auditArticleStructure } from '@/lib/article-audit'
import * as auditModule from '@/lib/article-audit'
import * as reportModule from '@/lib/article-optimize-report'
import { buildAuditTotals, buildAggregate, decodeUtf8Chunks, hashContentSync } from '@/lib/article-optimize-report'

describe('decodeUtf8Chunks (drift/hash stability)', () => {
  it('decodes multi-byte Persian text split across chunk boundaries', () => {
    const text = 'گروه معماره با سال‌ها تجربه در ارائه خدمات برقکاری'
    const buf = Buffer.from(text, 'utf8')
    // Split at a byte offset that lands INSIDE a multi-byte character.
    const chunks = [buf.subarray(0, 7), buf.subarray(7, 23), buf.subarray(23)]
    expect(decodeUtf8Chunks(chunks)).toBe(text)
  })

  it('produces a stable hash regardless of how bytes are chunked', () => {
    const text = 'خدمات تخصصی برق ساختمان و تلفن'
    const buf = Buffer.from(text, 'utf8')
    const a = decodeUtf8Chunks([buf])
    const b = decodeUtf8Chunks([buf.subarray(0, 5), buf.subarray(5, 11), buf.subarray(11)])
    expect(hashContentSync(a)).toBe(hashContentSync(b))
  })

  it('naive string concatenation is what this replaces (regression guard)', () => {
    const buf = Buffer.from('معماره', 'utf8')
    const naive = String(buf.subarray(0, 3)) + String(buf.subarray(3))
    expect(naive).not.toBe('معماره')
    expect(decodeUtf8Chunks([buf.subarray(0, 3), buf.subarray(3)])).toBe('معماره')
  })
})

describe('auditArticleStructure', () => {
  it('counts headings, jumps and body H1', () => {
    const a = auditArticleStructure('<h1>t</h1><h2>a</h2><h4>b</h4><h3>c</h3>')
    expect(a.bodyH1).toBe(1)
    expect(a.multipleH1).toBe(false)
    expect(a.h2).toBe(1)
    expect(a.headingJumps).toBe(1)
  })

  it('classifies links: internal non-www, nofollow, tel, external, unsafe, malformed', () => {
    const a = auditArticleStructure(
      '<a href="http://memareh.com/x">a</a>' +
      '<a href="https://www.memareh.com/y" rel="nofollow">b</a>' +
      '<a href="tel:+982112345678">c</a>' +
      '<a href="https://example.com">d</a>' +
      '<a href="javascript:alert(1)">e</a>' +
      '<a>f</a>',
    )
    expect(a.nonWwwInternal).toBe(1)
    expect(a.internalNofollow).toBe(1)
    expect(a.telLinks).toBe(1)
    expect(a.externalLinks).toBe(1)
    expect(a.unsafeHref).toBe(1)
    expect(a.malformedHref).toBe(1)
  })

  it('separates presentational from possibly-meaningful inline styles', () => {
    const a = auditArticleStructure('<p style="color:red">x</p><p style="display:none">y</p>')
    expect(a.inlineStyleAttrs).toBe(2)
    expect(a.meaningfulInlineStyles).toBe(1)
  })

  it('flags tables missing thead/scope and complex tables', () => {
    const a = auditArticleStructure('<table><tr><th>h</th></tr><tr><td colspan="2">v</td></tr></table>')
    expect(a.tables).toBe(1)
    expect(a.tablesMissingThead).toBe(1)
    expect(a.tablesMissingThScope).toBe(1)
    expect(a.complexTables).toBe(1)
  })

  it('detects FAQ questions and numbered steps without mutating', () => {
    const html = '<p>چرا برق قطع می‌شود؟</p><p>پاسخ</p><p>چگونه تعمیر کنیم؟</p><p>پاسخ</p><p>1</p><p>مرحله</p>'
    const a = auditArticleStructure(html)
    expect(a.faqQuestions).toBe(2)
    expect(a.hasFaq).toBe(true)
    expect(a.numberedSteps).toBe(1)
  })

  it('reports the CTA href without rewriting it', () => {
    const a = auditArticleStructure('<a href="https://www.memareh.com/">ثبت درخواست در سایت معماره</a>')
    expect(a.ctaMismatchHref).toBe('https://www.memareh.com/')
  })

  it('returns null CTA href when the CTA text is absent', () => {
    expect(auditArticleStructure('<p>متن</p>').ctaMismatchHref).toBeNull()
  })
})

describe('buildAuditTotals', () => {
  const base = {
    scoreBefore: 70, scoreAfter: 100, textPreserved: true, sanitizerOk: true,
    linkIntegrity: true, idempotent: true, classification: 'SAFE_TO_OPTIMIZE' as const,
    ctaMismatch: false, findings: [],
  }
  const articles = [
    { ...base, slug: 'a', suggestedFindingsCount: 2, audit: auditArticleStructure('<h1>x</h1><a href="http://memareh.com/p">l</a><p style="color:red">s</p>') },
    { ...base, slug: 'b', suggestedFindingsCount: 1, audit: auditArticleStructure('<table><tr><th>h</th></tr></table><p>سؤال؟</p><p>سؤال دوم؟</p>') },
  ]

  it('rolls up per-article audits into corpus totals', () => {
    const t = buildAuditTotals(articles)
    expect(t.headings.bodyH1).toBe(1)
    expect(t.links.nonWwwInternal).toBe(1)
    expect(t.inlineStyles.totalInlineStyleAttrs).toBe(1)
    expect(t.inlineStyles.safelyRemovable).toBe(1)
    expect(t.tables.missingThead).toBe(1)
    expect(t.faq.articlesWithFaq).toBe(1)
    expect(t.suggestedModeFindings).toBe(3)
  })

  it('buildAggregate prefers audit-derived structural counters over finding types', () => {
    const agg = buildAggregate(articles)
    expect(agg.bodyH1).toBe(1)
    expect(agg.nonWwwLinks).toBe(1)
    expect(agg.totalInlineStyles).toBe(1)
    expect(agg.faqCandidates).toBe(1)
  })

  it('falls back to zero-safe totals for an empty corpus', () => {
    const t = buildAuditTotals([])
    expect(t.links.total).toBe(0)
    expect(t.faq.articlesWithFaq).toBe(0)
  })
})

describe('no write capability', () => {
  it('the report/audit modules expose no mutating API', () => {
    const names = [...Object.keys(reportModule), ...Object.keys(auditModule)].join(' ').toLowerCase()
    for (const forbidden of ['update', 'insert', 'delete', 'upsert', 'apply', 'save']) {
      expect(names).not.toContain(forbidden)
    }
  })

  it('the dry-run script contains no apply/write switch', async () => {
    const fs = await import('node:fs')
    const src = fs.readFileSync('scripts/article-optimize-dry-run.cjs', 'utf8')
    expect(src).not.toMatch(/--apply|--write/)
    expect(src).not.toMatch(/\.(update|insert|upsert|delete)\s*\(/)
    // Only SELECT statements may reach the database.
    const sqlCalls = src.match(/mgmtQuery\(`?[^`)]*/g) || []
    for (const c of sqlCalls) {
      if (/SELECT/i.test(c)) continue
      expect(c).not.toMatch(/UPDATE|INSERT|DELETE|DROP|ALTER/i)
    }
  })
})
