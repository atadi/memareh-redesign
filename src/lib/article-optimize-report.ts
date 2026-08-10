// Pure, testable logic for the bulk SEO-optimization DRY-RUN.
//
// Contains NO database access and NO DOM usage. It only classifies the result
// of the (already-run) editor optimizer, hashes content for drift detection,
// and rolls up per-article results into an aggregate. Dependency-free so it is
// unit-testable in vitest and reusable by the CJS dry-run script.
//
// This module is READ-ONLY analysis. It never mutates anything.

export type OptimizerFinding = {
  type: string
  description?: string
  confidence: 'high' | 'medium' | 'low'
  severity?: 'info' | 'warning' | 'error'
  before?: string
  after?: string
}

export type OptimizerResult = {
  findings: OptimizerFinding[]
  originalHtml: string
  optimizedHtml: string
  sanitizedHtml: string
  textPreserved: boolean
  linkIntegrity: boolean
  structuralScore: number
  meta: { findings: OptimizerFinding[]; score: number }
}

export type PerArticleResult = {
  id: string
  slug: string
  title: string
  scoreBefore: number
  scoreAfter: number
  findings: OptimizerFinding[]
  findingsCount: number
  highConfidenceCount: number
  mediumConfidenceCount: number
  reportOnlyCount: number
  originalHtmlLength: number
  optimizedHtmlLength: number
  textPreserved: boolean
  linkIntegrity: boolean
  sanitizerOk: boolean
  idempotent: boolean
  wouldContentChange: boolean
  wouldMetadataChange: boolean
  customCssPresent: boolean
  ctaMismatch: boolean
  eligible: boolean
  classification: 'SAFE_TO_OPTIMIZE' | 'REVIEW_REQUIRED' | 'BLOCKED'
  originalHash: string
  optimizedHash: string
  updatedAt: string
  error?: string
}

export const CTA_TEXT = 'ثبت درخواست در سایت معماره'

import { createHash } from 'node:crypto'

export function hashContentSync(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

export function detectCtaMismatch(content: string): boolean {
  return content.includes(CTA_TEXT)
}

export function classifyArticle(
  raw: string,
  result: OptimizerResult,
  opts: {
    idempotent: boolean
    sanitizerOk: boolean
    textPreserved: boolean
    linkIntegrity: boolean
    wouldContentChange: boolean
    wouldMetadataChange: boolean
    ctaMismatch: boolean
    scoreBefore: number
    error?: string
  }
): { classification: PerArticleResult['classification']; reasons: string[] } {
  const reasons: string[] = []
  if (opts.error) {
    reasons.push('optimizer-threw')
    return { classification: 'BLOCKED', reasons }
  }
  if (!opts.textPreserved) {
    reasons.push('text-changed')
    return { classification: 'BLOCKED', reasons }
  }
  if (!opts.sanitizerOk) {
    reasons.push('sanitizer-changed-visible-text')
    return { classification: 'BLOCKED', reasons }
  }
  if (!opts.linkIntegrity) {
    reasons.push('link-integrity-failed')
    return { classification: 'BLOCKED', reasons }
  }
  if (!opts.idempotent) {
    reasons.push('not-idempotent')
    return { classification: 'BLOCKED', reasons }
  }
  const hasMedium = result.findings.some((f) => f.confidence === 'medium')
  const hasLow = result.findings.some((f) => f.confidence === 'low')
  if (opts.ctaMismatch) reasons.push('cta-mismatch')
  if (hasMedium) reasons.push('medium-confidence-finding')
  if (hasLow) reasons.push('low-confidence-finding')

  const safe =
    !opts.ctaMismatch &&
    !hasMedium &&
    !hasLow &&
    opts.textPreserved &&
    opts.sanitizerOk &&
    opts.linkIntegrity &&
    opts.idempotent
  return { classification: safe ? 'SAFE_TO_OPTIMIZE' : 'REVIEW_REQUIRED', reasons }
}

export type Aggregate = {
  total: number
  published: number
  excludedByStatus: number
  safe: number
  review: number
  blocked: number
  textIntegrityFailures: string[]
  sanitizerFailures: string[]
  linkIntegrityFailures: string[]
  idempotenceFailures: string[]
  avgScoreBefore: number
  avgScoreAfter: number
  scoreMin: number
  scoreMax: number
  improving: number
  unchanged: number
  bodyH1: number
  nonWwwLinks: number
  internalNofollow: number
  articlesWithInlineStyle: number
  totalInlineStyles: number
  tablesNeedingConversion: number
  faqCandidates: number
  ctaMismatches: { slug: string; text: string; note: string }[]
  metadataFindings: number
}

// The subset of PerArticleResult fields that buildAggregate actually reads,
// so callers (and tests) can pass lightweight fixtures.
export type AggregateInput = Pick<
  PerArticleResult,
  'slug' | 'scoreBefore' | 'scoreAfter' | 'textPreserved' | 'sanitizerOk' | 'linkIntegrity' | 'idempotent' | 'classification' | 'ctaMismatch' | 'findings'
>

export function buildAggregate(articles: AggregateInput[]): Aggregate {
  const n = articles.length || 1
  const beforeSum = articles.reduce((s, a) => s + a.scoreBefore, 0)
  const afterSum = articles.reduce((s, a) => s + a.scoreAfter, 0)
  const scores = articles.map((a) => a.scoreBefore)
  const agg: Aggregate = {
    total: articles.length,
    published: articles.length,
    excludedByStatus: 0,
    safe: 0,
    review: 0,
    blocked: 0,
    textIntegrityFailures: [],
    sanitizerFailures: [],
    linkIntegrityFailures: [],
    idempotenceFailures: [],
    avgScoreBefore: Math.round(beforeSum / n),
    avgScoreAfter: Math.round(afterSum / n),
    scoreMin: scores.length ? Math.min(...scores) : 0,
    scoreMax: scores.length ? Math.max(...scores) : 0,
    improving: 0,
    unchanged: 0,
    bodyH1: 0,
    nonWwwLinks: 0,
    internalNofollow: 0,
    articlesWithInlineStyle: 0,
    totalInlineStyles: 0,
    tablesNeedingConversion: 0,
    faqCandidates: 0,
    ctaMismatches: [],
    metadataFindings: 0,
  }
  for (const a of articles) {
    if (a.classification === 'SAFE_TO_OPTIMIZE') agg.safe++
    else if (a.classification === 'REVIEW_REQUIRED') agg.review++
    else agg.blocked++
    if (!a.textPreserved) agg.textIntegrityFailures.push(a.slug)
    if (!a.sanitizerOk) agg.sanitizerFailures.push(a.slug)
    if (!a.linkIntegrity) agg.linkIntegrityFailures.push(a.slug)
    if (!a.idempotent) agg.idempotenceFailures.push(a.slug)
    if (a.scoreAfter > a.scoreBefore) agg.improving++
    else if (a.scoreAfter === a.scoreBefore) agg.unchanged++
    for (const f of a.findings) {
      if (f.type === 'duplicate-h1') agg.bodyH1++
      else if (f.type === 'internal-link-non-www') agg.nonWwwLinks++
      else if (f.type === 'internal-link-nofollow') agg.internalNofollow++
      else if (f.type === 'inline-style') agg.totalInlineStyles++
      else if (f.type === 'table-incomplete') agg.tablesNeedingConversion++
      else if (f.type === 'enhance-faq') agg.faqCandidates++
      else if (f.type && f.type.startsWith('metadata-')) agg.metadataFindings++
    }
    if (a.findings.some((f) => f.type === 'inline-style')) agg.articlesWithInlineStyle++
    if (a.ctaMismatch) agg.ctaMismatches.push({ slug: a.slug, text: CTA_TEXT, note: 'booking-removed product mismatch' })
  }
  return agg
}
