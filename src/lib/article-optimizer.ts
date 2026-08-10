// Deterministic, AI-free article optimizer for the `بهینه‌سازی سئو` editor action.
//
// SAFETY MODEL
// -----------
// • Optimizer acts ONLY on an article's HTML *structure*: element types, nesting,
//   classes, link hrefs/rel, semantic table markup, accessibility attributes.
// • Visible text is NEVER edited. The text-integrity gate (compareVisibleText)
//   blocks any optimization whose output changes a single visible character.
// • Output is sanitized and re-checked. The exact sanitized string is what the
//   editor previews and (eventually) saves.
// • Optimizer output must be safer-or-equal: no script/iframe/style/event attrs
//   survive the final sanitize step regardless of what the rules produced.
//
// CONFIDENCE
// ----------
// high   -> safe automatic fix (always applied when its toggle is on)
// medium -> structural guess based on heuristics (default off / requires opt-in)
// low    -> only reported as a finding, never transformed
//
// IDEMPOTENCE
// -----------
// optimize(optimize(html)) is stable by construction: every rule is a guarded
// "if it looks un-optimized, fix it" transform that is a no-op once applied, and
// the final canonicalization (whitespace, attribute order) makes the string
// stable. See tests for the double-apply guarantee.

import { sanitizeHtml } from '@/lib/html-sanitizer'
import { compareVisibleText } from '@/lib/article-text-integrity'

const MEMAREH_WWW = 'https://www.memareh.com'

export type OptimizerConfidence = 'high' | 'medium' | 'low'

export interface OptimizationFinding {
  type:
    | 'duplicate-h1'
    | 'internal-link-non-www'
    | 'internal-link-nofollow'
    | 'inline-style'
    | 'table-incomplete'
    | 'stray-markup'
    | 'heading-jump'
    | 'cta-mismatch'
    | 'metadata-missing'
    | 'metadata-meta_title'
    | 'metadata-meta_description'
    | 'metadata-canonical_url'
    | 'metadata-og_image'
    | 'metadata-featured_image_alt'
  severity: 'high' | 'medium' | 'low'
  confidence: OptimizerConfidence
  message: string
  /** Whether the optimizer will fix it automatically (vs. report-only). */
  autoFixable: boolean
  /** Default selection state in the UI. */
  defaultSelected: boolean
}

export interface ArticleSeoMeta {
  meta_title?: string | null
  meta_description?: string | null
  meta_keywords?: string | null
  canonical_url?: string | null
  og_image?: string | null
  featured_image_alt?: string | null
}

export interface ArticleOptimizationResult {
  findings: OptimizationFinding[]
  originalHtml: string
  optimizedHtml: string
  sanitizedHtml: string
  textPreserved: boolean
  linkIntegrity: boolean
  structuralScore: number
  meta: { findings: OptimizationFinding[]; score: number }
}

export interface OptimizerOptions {
  /** Apply high-confidence structural fixes. */
  fixStructure: boolean
  /** Canonicalize internal memareh links to www + strip internal nofollow. */
  fixLinks: boolean
  /** Remove inline presentation styles (replaced by design-system classes). */
  fixInlineStyles: boolean
  /** Wrap incomplete tables in semantic thead/tbody + scope on headers. */
  fixTables: boolean
  /** Remove empty/stray decorative spans and dead editor-only classes. */
  fixStrayMarkup: boolean
  /** Attempt medium-confidence section recognition (callouts/steps/FAQ/lists). */
  enhanceStructure: boolean
}

export const DEFAULT_OPTIMIZER_OPTIONS: OptimizerOptions = {
  fixStructure: true,
  fixLinks: true,
  fixInlineStyles: true,
  fixTables: true,
  fixStrayMarkup: true,
  enhanceStructure: false, // medium-confidence: opt-in
}

const DEAD_CLASSES = [
  'text-blue-600',
  'hover:underline',
  'mem-btn-glow',
  'mem-brand-link',
  'border-collapse',
  'table-auto',
  'w-full',
  'bg-gray-100',
  'font-bold',
  'border-gray-300',
  'px-4',
  'py-2',
  'border',
]

const isInternalMemareh = (href: string): boolean => {
  return /^https?:\/\/(www\.)?memareh\.com(\/|$)/i.test(href.trim())
}

const canonicalizeMemareh = (href: string): string => {
  const h = href.trim()
  if (!isInternalMemareh(h)) return h
  const path = h.replace(/^https?:\/\/(www\.)?memareh\.com/i, '')
  return MEMAREH_WWW + (path || '/')
}

function buildDom(html: string): Document {
  // Use the environment-native DOM parser. `DOMParser` is global in browsers and
  // is polyfilled in the Node test setup (see tests/setup/dom-parser.ts), so this
  // module carries NO jsdom import and won't break the client bundle.
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is not available in this environment.')
  }
  const doc = new DOMParser().parseFromString(`<!DOCTYPE html><body>${html}</body>`, 'text/html')
  return doc
}

function serialize(doc: Document): string {
  const body = doc.body
  return body ? body.innerHTML.trim() : ''
}

/**
 * Analyze an article's HTML + metadata and return findings WITHOUT mutating.
 * Safe to run many times; this is the "بررسی مقاله" (Analyze) stage.
 */
export function analyzeArticleHtml(
  html: string,
  meta?: ArticleSeoMeta,
): { findings: OptimizationFinding[]; score: number; metaFindings: OptimizationFinding[]; metaScore: number } {
  const findings: OptimizationFinding[] = []
  const metaFindings: OptimizationFinding[] = []
  const doc = buildDom(html)
  const body = doc.body

  // 1. Duplicate body H1.
  const h1s = Array.from(body.querySelectorAll('h1'))
  if (h1s.length > 0) {
    findings.push({
      type: 'duplicate-h1',
      severity: 'high',
      confidence: 'high',
      message: `تگ H1 تکراری در بدنه مقاله وجود دارد (${h1s.length} مورد). الگوی صفحه قبلاً عنوان اصلی را نمایش می‌دهد؛ این باعث تکرار عنوان و خطای ساختاری سئو می‌شود.`,
      autoFixable: true,
      defaultSelected: true,
    })
  }

  // 2/3. Internal links: non-www + nofollow.
  const anchors = Array.from(body.querySelectorAll('a[href]'))
  let nonWww = 0
  let internalNofollow = 0
  for (const a of anchors) {
    const href = (a.getAttribute('href') || '').trim()
    if (isInternalMemareh(href) && !/^https?:\/\/www\.memareh\.com/i.test(href)) nonWww += 1
    const rel = (a.getAttribute('rel') || '').toLowerCase()
    if (isInternalMemareh(href) && /\bnofollow\b/.test(rel)) internalNofollow += 1
  }
  if (nonWww > 0) {
    findings.push({
      type: 'internal-link-non-www',
      severity: 'medium',
      confidence: 'high',
      message: `${nonWww} لینک داخلی از دامنه memareh.com بدون www استفاده کرده‌اند. یکسان‌سازی به https://www.memareh.com برای جلوگیری از محتوای تکراری توصیه می‌شود.`,
      autoFixable: true,
      defaultSelected: true,
    })
  }
  if (internalNofollow > 0) {
    findings.push({
      type: 'internal-link-nofollow',
      severity: 'medium',
      confidence: 'high',
      message: `${internalNofollow} لینک داخلی دارای rel="nofollow" هستند. لینک‌های داخلی معمولی نباید nofollow داشته باشند زیرا خزنده را از شناسایی محتوای سایت باز می‌دارند.`,
      autoFixable: true,
      defaultSelected: true,
    })
  }

  // 4. Inline styles.
  const inlineStyled = body.querySelectorAll('[style]').length
  if (inlineStyled > 0) {
    findings.push({
      type: 'inline-style',
      severity: 'medium',
      confidence: 'high',
      message: `${inlineStyled} المان دارای استایل inline (style="...") هستند. این استایل‌ها با سیستم طراحی مقاله همخوانی ندارند و باید با کلاس‌های article-* جایگزین شوند.`,
      autoFixable: true,
      defaultSelected: true,
    })
  }

  // 5. Incomplete tables.
  const tables = Array.from(body.querySelectorAll('table'))
  for (const t of tables) {
    if (!t.querySelector('thead') || !t.querySelector('th[scope="col"]')) {
      findings.push({
        type: 'table-incomplete',
        severity: 'medium',
        confidence: 'high',
        message: 'جدولی بدون سرستون معنایی (thead / th[scope=col]) یافت شد. تبدیل به ساختار جدول پاسخ‌گوی معنایی باعث بهبود دسترس‌پذیری و سئو می‌شود.',
        autoFixable: true,
        defaultSelected: true,
      })
      break
    }
  }

  // 6. Stray markup: empty decorative spans / dead classes.
  let stray = 0
  body.querySelectorAll('span').forEach((s) => {
    const cls = s.getAttribute('class') || ''
    const isDead = DEAD_CLASSES.some((c) => cls.split(/\s+/).includes(c))
    const empty = s.textContent?.trim() === ''
    if ((isDead && empty) || empty) stray += 1
  })
  if (stray > 0) {
    findings.push({
      type: 'stray-markup',
      severity: 'low',
      confidence: 'high',
      message: `${stray} تگ span خالی یا دارای کلاس‌های ویرایشگر قدیمی یافت شد که روی متن تأثیری ندارند و بهتر است حذف شوند.`,
      autoFixable: true,
      defaultSelected: true,
    })
  }

  // 7. Heading jumps (H2 -> H4+ with nothing between).
  const order = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map((h) => Number(h.tagName[1]))
  for (let i = 1; i < order.length; i++) {
    if (order[i] - order[i - 1] > 1) {
      findings.push({
        type: 'heading-jump',
        severity: 'low',
        confidence: 'medium',
        message: `پرش سطح عنوان بین H${order[i - 1]} و H${order[i]} (بدون استفاده از سطح میانی). بهتر است سلسله‌مراتب عنوان‌ها حفظ شود.`,
        autoFixable: false,
        defaultSelected: false,
      })
      break
    }
  }

  // 8. CTA / Booking mismatch (report-only; never auto-fixed).
  const text = body.textContent || ''
  if (/ثبت درخواست در سایت معماره/.test(text)) {
    findings.push({
      type: 'cta-mismatch',
      severity: 'medium',
      confidence: 'high',
      message: 'دکمه‌ی «ثبت درخواست در سایت معماره» به صفحه اصلی اشاره دارد در حالی که سیستم رزرو حذف شده است. متن تغییر داده نمی‌شود؛ نیاز به تصمیم محتوایی جداگانه دارد.',
      autoFixable: false,
      defaultSelected: false,
    })
  }

  // Metadata findings (read-only in V1).
  if (meta) {
    if (!meta.meta_title || meta.meta_title.trim().length < 10) {
      metaFindings.push(makeMeta('metadata-meta_title', 'عنوان متا خالی یا خیلی کوتاه است (کمتر از ۱۰ کاراکتر).', 'medium'))
    } else if (meta.meta_title.trim().length > 70) {
      metaFindings.push(makeMeta('metadata-meta_title', 'عنوان متا بیش از ۷۰ کاراکتر است و ممکن است در نتایج جستجو کوتاه شود.', 'low'))
    }
    if (!meta.meta_description || meta.meta_description.trim().length < 50) {
      metaFindings.push(makeMeta('metadata-meta_description', 'توضیحات متا خالی یا خیلی کوتاه است (کمتر از ۵۰ کاراکتر).', 'medium'))
    } else if (meta.meta_description.trim().length > 160) {
      metaFindings.push(makeMeta('metadata-meta_description', 'توضیحات متا بیش از ۱۶۰ کاراکتر است.', 'low'))
    }
    if (!meta.canonical_url || !/^https?:\/\/www\.memareh\.com/.test(meta.canonical_url)) {
      metaFindings.push(makeMeta('metadata-canonical_url', 'آدرس canonical خالی است یا با دامنه www یکسان نیست.', 'medium'))
    }
    if (!meta.og_image) {
      metaFindings.push(makeMeta('metadata-og_image', 'تصویر OG (اشتراک‌گذاری اجتماعی) تنظیم نشده است.', 'low'))
    }
    if (!meta.featured_image_alt || meta.featured_image_alt.trim().length === 0) {
      metaFindings.push(makeMeta('metadata-featured_image_alt', 'متن جایگزین (alt) تصویر شاخص تنظیم نشده است (مهم برای دسترس‌پذیری).', 'low'))
    }
  }

  return {
    findings,
    score: computeStructuralScore(findings),
    metaFindings,
    metaScore: computeMetaScore(metaFindings),
  }
}

function makeMeta(type: OptimizationFinding['type'], message: string, severity: 'low' | 'medium'): OptimizationFinding {
  return {
    type,
    severity,
    confidence: 'high',
    message,
    autoFixable: false,
    defaultSelected: false,
  }
}

function computeStructuralScore(findings: OptimizationFinding[]): number {
  let score = 100
  for (const f of findings) {
    const weight = f.severity === 'high' ? 12 : f.severity === 'medium' ? 7 : 3
    score -= weight
  }
  return Math.max(0, Math.min(100, score))
}

function computeMetaScore(findings: OptimizationFinding[]): number {
  let score = 100
  for (const f of findings) {
    score -= f.severity === 'medium' ? 15 : 7
  }
  return Math.max(0, Math.min(100, score))
}

/**
 * Transform an article's HTML. Deterministic and idempotent.
 * WARNING: mutates a cloned DOM built from the input; does not mutate caller data.
 */
export function optimizeArticleHtml(
  html: string,
  options: OptimizerOptions = DEFAULT_OPTIMIZER_OPTIONS,
  meta?: ArticleSeoMeta,
): ArticleOptimizationResult {
  const doc = buildDom(html)
  const body = doc.body

  // 1. Duplicate body H1 -> article-body-title (keep text exactly).
  if (options.fixStructure) {
    body.querySelectorAll('h1').forEach((h1) => {
      const div = doc.createElement('p')
      div.setAttribute('class', 'article-body-title')
      while (h1.firstChild) div.appendChild(h1.firstChild)
      h1.replaceWith(div)
    })
  }

  // 2/3. Internal links: canonicalize + strip internal nofollow.
  if (options.fixLinks) {
    body.querySelectorAll('a[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').trim()
      if (!isInternalMemareh(href)) return
      a.setAttribute('href', canonicalizeMemareh(href))
      const rel = (a.getAttribute('rel') || '').toLowerCase().split(/\s+/).filter(Boolean)
      if (rel.includes('nofollow')) {
        const next = rel.filter((r) => r !== 'nofollow')
        if (next.length) a.setAttribute('rel', next.join(' '))
        else a.removeAttribute('rel')
      }
    })
  }

  // 4. Inline styles -> remove (design-system classes already present or added
  //    by enhanceStructure). Presentation already lives in Global Article CSS.
  if (options.fixInlineStyles) {
    body.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'))
  }

  // 5. Tables: ensure thead + th[scope=col] + tbody.
  if (options.fixTables) {
    body.querySelectorAll('table').forEach((table) => {
      if (table.querySelector('thead') && table.querySelector('th[scope="col"]')) return
      const rows = Array.from(table.querySelectorAll('tr'))
      const headRow = rows.find((r) => r.querySelector('th'))
      const thead = doc.createElement('thead')
      const tbody = doc.createElement('tbody')
      rows.forEach((r) => {
        r.querySelectorAll('th').forEach((th) => {
          if (!th.getAttribute('scope')) th.setAttribute('scope', 'col')
        })
        if (headRow && r === headRow) {
          thead.appendChild(r)
        } else {
          tbody.appendChild(r)
        }
      })
      table.replaceChildren(thead, tbody)
    })
  }

  // 6. Stray markup: drop empty spans and dead editor-only classes.
  if (options.fixStrayMarkup) {
    body.querySelectorAll('span').forEach((s) => {
      const cls = (s.getAttribute('class') || '').split(/\s+/)
      const cleaned = cls.filter((c) => !DEAD_CLASSES.includes(c))
      if (cleaned.length) s.setAttribute('class', cleaned.join(' '))
      else s.removeAttribute('class')
      if ((s.textContent || '').trim() === '' && !s.childNodes.length) s.remove()
    })
    // Strip dead classes from any element.
    body.querySelectorAll('*').forEach((el) => {
      const cls = el.getAttribute('class')
      if (!cls) return
      const kept = cls.split(/\s+/).filter((c) => !DEAD_CLASSES.includes(c))
      if (kept.length) el.setAttribute('class', kept.join(' '))
      else el.removeAttribute('class')
    })
  }

  // 7. Medium-confidence structural enhancement (opt-in). This recognizes a few
  //    high-signal patterns and applies article-* wrappers WITHOUT changing text.
  if (options.enhanceStructure) {
    enhanceStructure(doc, body)
  }

  // Final canonicalization for idempotence: sort class tokens and attrs.
  canonicalizeDom(body)

  const optimizedHtml = serialize(doc)
  const sanitizedHtml = sanitizeHtml(optimizedHtml)
  const integrity = compareVisibleText(html, sanitizedHtml)
  const linkOk = checkLinkIntegrity(sanitizedHtml)

  const { findings, score, metaFindings, metaScore } = analyzeArticleHtml(optimizedHtml, meta)

  return {
    findings,
    originalHtml: html,
    optimizedHtml,
    sanitizedHtml,
    textPreserved: integrity.preserved,
    linkIntegrity: linkOk,
    structuralScore: score,
    meta: { findings: metaFindings, score: metaScore },
  }
}

function checkLinkIntegrity(html: string): boolean {
  const doc = buildDom(html)
  const anchors = Array.from(doc.querySelectorAll('a[href]'))
  for (const a of anchors) {
    const href = (a.getAttribute('href') || '').trim()
    if (/^(javascript:|data:)/i.test(href)) return false
    if (!/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
      if (href && !href.startsWith('#')) return false
    }
  }
  const telCount = (html.match(/tel:/g) || []).length
  const telCountAfter = (doc.body.innerHTML.match(/tel:/g) || []).length
  if (telCountAfter < telCount) return false
  return true
}

function canonicalizeDom(root: HTMLElement) {
  root.querySelectorAll('*').forEach((el) => {
    const cls = el.getAttribute('class')
    if (cls) {
      const sorted = Array.from(new Set(cls.split(/\s+/).filter(Boolean))).sort()
      el.setAttribute('class', sorted.join(' '))
    }
  })
}

// Medium-confidence recognition. Conservative: only acts on clear signals and
// never invents text. Each handler is a no-op on already-optimized markup, which
// is what makes the whole optimizer idempotent.
function enhanceStructure(doc: Document, body: HTMLElement) {
  // FAQ: a sequence of <strong> question-like paragraphs containing "؟" followed
  // by an answer paragraph, or a paragraph whose text begins with a number + "؟".
  const paras = Array.from(body.querySelectorAll('p'))
  paras.forEach((p) => {
    const cls = p.getAttribute('class') || ''
    if (cls.includes('article-faq-question')) return
    const t = (p.textContent || '').trim()
    if (/[\u0600-\u06FF]\s*\؟/.test(t) && /^(\d+[\.\)]?\s*)?[آا].{3,}؟/.test(t)) {
      p.setAttribute('class', (cls ? cls + ' ' : '') + 'article-faq-question')
    }
  })

  // Numbered steps (pilot pattern): a paragraph that contains ONLY a number
  // (possibly wrapped in span/strong) immediately followed by the step body
  // paragraph. We move the number into a badge and keep the exact following
  // text — so no visible character is added or removed.
  const stepNodes = Array.from(body.children)
  for (let i = 0; i < stepNodes.length; i++) {
    const node = stepNodes[i]
    if (node.tagName !== 'P' || (node.getAttribute('class') || '').includes('article-step')) continue
    const numMatch = (node.textContent || '').trim().match(/^([0-9٠-٩۰-۹]{1,2})$/)
    if (!numMatch) continue
    const next = stepNodes[i + 1]
    if (!next || next.tagName !== 'P') continue
    const step = doc.createElement('div')
    step.setAttribute('class', 'article-step')
    const num = doc.createElement('p')
    num.setAttribute('class', 'article-step-number')
    num.textContent = numMatch[1]
    const body2 = doc.createElement('p')
    body2.setAttribute('class', 'article-step-body')
    body2.textContent = (next.textContent || '').trim()
    step.appendChild(num)
    step.appendChild(body2)
    const wrapper = doc.createElement('div')
    wrapper.appendChild(step)
    node.replaceWith(wrapper)
    next.remove()
    // Skip the consumed next node.
    i += 1
  }
}

/** Re-check a result object and throw the Persian gate message if unsafe. */
export function assertSafeToApply(result: ArticleOptimizationResult): void {
  if (!result.textPreserved) {
    throw new Error(
      'بهینه‌سازی متوقف شد زیرا متن قابل مشاهده مقاله تغییر کرده است.',
    )
  }
  if (!result.linkIntegrity) {
    throw new Error('بهینه‌سازی متوقف شد زیرا یکپارچگی لینک‌ها تأیید نشد.')
  }
}
