// READ-ONLY structural audit for the bulk SEO dry-run.
//
// This module NEVER mutates an article. It only counts observable structural
// facts (headings, links, inline styles, tables, FAQ/step/callout/CTA patterns)
// so the dry-run report can answer the audit sections without re-implementing
// the optimizer. Uses the environment-native DOMParser exactly like
// article-optimizer.ts (polyfilled in the Node test setup / dry-run script).

export type ArticleAudit = {
  // Headings
  bodyH1: number
  multipleH1: boolean
  h2: number
  h3: number
  headingJumps: number
  headinglessLongArticle: boolean
  // Links
  totalLinks: number
  internalLinks: number
  externalLinks: number
  nonWwwInternal: number
  internalNofollow: number
  telLinks: number
  malformedHref: number
  unsafeHref: number
  // Inline styles
  inlineStyleAttrs: number
  meaningfulInlineStyles: number
  // Tables
  tables: number
  tablesMissingThead: number
  tablesMissingThScope: number
  tablesWithInlineWidth: number
  complexTables: number
  // Patterns
  faqQuestions: number
  hasFaq: boolean
  faqAlreadyStructured: boolean
  numberedSteps: number
  warningCallouts: number
  expertCards: number
  serviceCta: number
  conclusionBlocks: number
  ctaMismatchHref: string | null
}

const INTERNAL_RE = /^https?:\/\/(www\.)?memareh\.com(\/|$)/i
const UNSAFE_RE = /^\s*(javascript|data|vbscript):/i
// Inline styles that can carry real visual meaning (not pure presentation).
const MEANINGFUL_STYLE_RE = /(display\s*:\s*none|visibility\s*:\s*hidden|float|position\s*:\s*(absolute|fixed))/i
const CTA_TEXT = 'ثبت درخواست در سایت معماره'

function parse(html: string): HTMLElement {
  if (typeof DOMParser === 'undefined') throw new Error('DOMParser is not available in this environment.')
  const doc = new DOMParser().parseFromString(`<!DOCTYPE html><body>${html}</body>`, 'text/html')
  return doc.body
}

export function auditArticleStructure(html: string): ArticleAudit {
  const body = parse(html)
  const text = (body.textContent || '').trim()

  const headings = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  const levels = headings.map((h) => Number(h.tagName[1]))
  let headingJumps = 0
  for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) headingJumps++

  const anchors = Array.from(body.querySelectorAll('a'))
  let internalLinks = 0
  let externalLinks = 0
  let nonWwwInternal = 0
  let internalNofollow = 0
  let telLinks = 0
  let malformedHref = 0
  let unsafeHref = 0
  for (const a of anchors) {
    const href = (a.getAttribute('href') || '').trim()
    if (!href) {
      malformedHref++
      continue
    }
    if (UNSAFE_RE.test(href)) {
      unsafeHref++
      continue
    }
    if (/^tel:/i.test(href)) {
      telLinks++
      continue
    }
    if (INTERNAL_RE.test(href)) {
      internalLinks++
      if (!/^https?:\/\/www\.memareh\.com/i.test(href)) nonWwwInternal++
      if (/\bnofollow\b/i.test(a.getAttribute('rel') || '')) internalNofollow++
      continue
    }
    if (/^https?:\/\//i.test(href)) externalLinks++
    else if (href.startsWith('/') || href.startsWith('#')) internalLinks++
    else malformedHref++
  }

  const styled = Array.from(body.querySelectorAll('[style]'))
  const meaningfulInlineStyles = styled.filter((e) => MEANINGFUL_STYLE_RE.test(e.getAttribute('style') || '')).length

  const tables = Array.from(body.querySelectorAll('table'))
  let tablesMissingThead = 0
  let tablesMissingThScope = 0
  let tablesWithInlineWidth = 0
  let complexTables = 0
  for (const t of tables) {
    if (!t.querySelector('thead')) tablesMissingThead++
    const ths = Array.from(t.querySelectorAll('th'))
    if (ths.length > 0 && ths.some((th) => !th.getAttribute('scope'))) tablesMissingThScope++
    const hasWidth =
      /width/i.test(t.getAttribute('style') || '') ||
      t.hasAttribute('width') ||
      Array.from(t.querySelectorAll('[style]')).some((e) => /width/i.test(e.getAttribute('style') || ''))
    if (hasWidth) tablesWithInlineWidth++
    const spanning = t.querySelector('[colspan], [rowspan]')
    const nested = t.querySelector('table')
    if (spanning || nested || t.querySelectorAll('tr').length > 15) complexTables++
  }

  const paras = Array.from(body.querySelectorAll('p'))
  const questionParas = paras.filter((p) => /؟\s*$/.test((p.textContent || '').trim()))
  const faqAlreadyStructured = !!body.querySelector('.article-faq-question, .article-faq')

  let numberedSteps = 0
  for (const p of paras) if (/^[0-9٠-٩۰-۹]{1,2}$/.test((p.textContent || '').trim())) numberedSteps++
  numberedSteps += body.querySelectorAll('.article-step').length

  const warningCallouts = body.querySelectorAll('.article-callout, .article-warning').length +
    paras.filter((p) => /^(هشدار|توجه|نکته ایمنی|احتیاط)\s*[:：]/.test((p.textContent || '').trim())).length
  const expertCards = body.querySelectorAll('.article-expert, .article-expert-card').length
  const serviceCta = body.querySelectorAll('.article-cta').length
  const conclusionBlocks = body.querySelectorAll('.article-conclusion').length +
    headings.filter((h) => /^(جمع‌بندی|نتیجه‌گیری|جمع بندی)/.test((h.textContent || '').trim())).length

  let ctaMismatchHref: string | null = null
  if (text.includes(CTA_TEXT)) {
    const link = anchors.find((a) => (a.textContent || '').includes(CTA_TEXT))
    ctaMismatchHref = link ? (link.getAttribute('href') || '') : ''
  }

  return {
    bodyH1: body.querySelectorAll('h1').length,
    multipleH1: body.querySelectorAll('h1').length > 1,
    h2: body.querySelectorAll('h2').length,
    h3: body.querySelectorAll('h3').length,
    headingJumps,
    headinglessLongArticle: headings.length === 0 && text.length > 1500,
    totalLinks: anchors.length,
    internalLinks,
    externalLinks,
    nonWwwInternal,
    internalNofollow,
    telLinks,
    malformedHref,
    unsafeHref,
    inlineStyleAttrs: styled.length,
    meaningfulInlineStyles,
    tables: tables.length,
    tablesMissingThead,
    tablesMissingThScope,
    tablesWithInlineWidth,
    complexTables,
    faqQuestions: questionParas.length,
    hasFaq: questionParas.length >= 2,
    faqAlreadyStructured,
    numberedSteps,
    warningCallouts,
    expertCards,
    serviceCta,
    conclusionBlocks,
    ctaMismatchHref,
  }
}
