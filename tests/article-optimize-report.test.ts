// Tests for the bulk dry-run report logic. Pure, no DB, no DOM.
import { describe, it, expect } from 'vitest'
import {
  classifyArticle,
  buildAggregate,
  hashContentSync,
  detectCtaMismatch,
  CTA_TEXT,
} from '@/lib/article-optimize-report'

function mkResult(over = {}) {
  return {
    findings: [],
    originalHtml: '<h1>x</h1>',
    optimizedHtml: '<div class="article-h1">x</div>',
    sanitizedHtml: '<div class="article-h1">x</div>',
    textPreserved: true,
    linkIntegrity: true,
    structuralScore: 100,
    meta: { findings: [], score: 0 },
    ...over,
  }
}

const safeOpts = {
  idempotent: true,
  sanitizerOk: true,
  textPreserved: true,
  linkIntegrity: true,
  wouldContentChange: true,
  wouldMetadataChange: false,
  ctaMismatch: false,
  scoreBefore: 70,
}

describe('classifyArticle', () => {
  it('SAFE_TO_OPTIMIZE when all hard gates pass and only high-confidence findings', () => {
    const r = mkResult({ findings: [{ type: 'duplicate-h1', confidence: 'high' }] })
    const { classification, reasons } = classifyArticle('<h1>x</h1><h1>y</h1>', r, safeOpts)
    expect(classification).toBe('SAFE_TO_OPTIMIZE')
    expect(reasons).not.toContain('cta-mismatch')
  })

  it('REVIEW_REQUIRED when a medium-confidence finding is present', () => {
    const r = mkResult({ findings: [{ type: 'enhance-faq', confidence: 'medium' }] })
    const { classification, reasons } = classifyArticle('<p>q?</p>', r, safeOpts)
    expect(classification).toBe('REVIEW_REQUIRED')
    expect(reasons).toContain('medium-confidence-finding')
  })

  it('BLOCKED when text is not preserved', () => {
    const r = mkResult({ textPreserved: false })
    const { classification, reasons } = classifyArticle('<h1>x</h1>', r, { ...safeOpts, textPreserved: false })
    expect(classification).toBe('BLOCKED')
    expect(reasons).toContain('text-changed')
  })

  it('BLOCKED when not idempotent', () => {
    const r = mkResult({})
    const { classification } = classifyArticle('<h1>x</h1>', r, { ...safeOpts, idempotent: false })
    expect(classification).toBe('BLOCKED')
  })

  it('BLOCKED when link integrity fails', () => {
    const r = mkResult({ linkIntegrity: false })
    const { classification } = classifyArticle('<h1>x</h1>', r, { ...safeOpts, linkIntegrity: false })
    expect(classification).toBe('BLOCKED')
  })

  it('BLOCKED when optimizer threw', () => {
    const r = mkResult({})
    const { classification, reasons } = classifyArticle('<h1>x</h1>', r, { ...safeOpts, error: 'boom' })
    expect(classification).toBe('BLOCKED')
    expect(reasons).toContain('optimizer-threw')
  })

  it('REVIEW_REQUIRED (not BLOCKED) when only a CTA mismatch exists', () => {
    const r = mkResult({ findings: [] })
    const { classification, reasons } = classifyArticle(CTA_TEXT, r, { ...safeOpts, ctaMismatch: true })
    expect(classification).toBe('REVIEW_REQUIRED')
    expect(reasons).toContain('cta-mismatch')
  })
})

describe('detectCtaMismatch', () => {
  it('true when the booking CTA text is present', () => {
    expect(detectCtaMismatch('لورم ' + CTA_TEXT + ' لورم')).toBe(true)
  })
  it('false when absent', () => {
    expect(detectCtaMismatch('لورم ایپسوم')).toBe(false)
  })
})

describe('hashContentSync', () => {
  it('is deterministic SHA-256 of 64 hex chars', () => {
    const a = hashContentSync('<h1>عنوان</h1>')
    const b = hashContentSync('<h1>عنوان</h1>')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
  it('differs for different content (drift detection)', () => {
    expect(hashContentSync('a')).not.toBe(hashContentSync('b'))
  })
})

describe('buildAggregate', () => {
  const articles = [
    { slug: 's1', scoreBefore: 50, scoreAfter: 100, textPreserved: true, sanitizerOk: true, linkIntegrity: true, idempotent: true, classification: 'SAFE_TO_OPTIMIZE' as const, ctaMismatch: false, findings: [{ type: 'duplicate-h1', confidence: 'high' as const }, { type: 'internal-link-non-www', confidence: 'high' as const }] },
    { slug: 's2', scoreBefore: 60, scoreAfter: 60, textPreserved: true, sanitizerOk: true, linkIntegrity: true, idempotent: true, classification: 'REVIEW_REQUIRED' as const, ctaMismatch: true, findings: [{ type: 'enhance-faq', confidence: 'medium' as const }, { type: 'metadata-meta_title', confidence: 'high' as const }] },
    { slug: 's3', scoreBefore: 40, scoreAfter: 90, textPreserved: false, sanitizerOk: false, linkIntegrity: false, idempotent: false, classification: 'BLOCKED' as const, ctaMismatch: false, findings: [{ type: 'inline-style', confidence: 'high' as const }, { type: 'table-incomplete', confidence: 'high' as const }] },
  ]

  it('counts classifications and failures', () => {
    const agg = buildAggregate(articles)
    expect(agg.total).toBe(3)
    expect(agg.safe).toBe(1)
    expect(agg.review).toBe(1)
    expect(agg.blocked).toBe(1)
    expect(agg.textIntegrityFailures).toEqual(['s3'])
    expect(agg.sanitizerFailures).toEqual(['s3'])
    expect(agg.linkIntegrityFailures).toEqual(['s3'])
    expect(agg.idempotenceFailures).toEqual(['s3'])
  })

  it('computes score stats and pattern counts', () => {
    const agg = buildAggregate(articles)
    expect(agg.avgScoreBefore).toBe(Math.round((50 + 60 + 40) / 3))
    expect(agg.avgScoreAfter).toBe(Math.round((100 + 60 + 90) / 3))
    expect(agg.scoreMin).toBe(40)
    expect(agg.scoreMax).toBe(60)
    expect(agg.improving).toBe(2)
    expect(agg.unchanged).toBe(1)
    expect(agg.bodyH1).toBe(1)
    expect(agg.nonWwwLinks).toBe(1)
    expect(agg.totalInlineStyles).toBe(1)
    expect(agg.tablesNeedingConversion).toBe(1)
    expect(agg.metadataFindings).toBe(1)
  })

  it('captures CTA mismatches with the booking note', () => {
    const agg = buildAggregate(articles)
    expect(agg.ctaMismatches).toEqual([{ slug: 's2', text: CTA_TEXT, note: 'booking-removed product mismatch' }])
  })
})
