// Per-article CSS (Feature B — Local Article CSS): validation + scoping.
//
// SECURITY MODEL
// --------------
// Local CSS is authored by admins and stored per article, then emitted inside a
// <style> element on the published page. It must therefore be impossible for a
// single article's CSS to affect anything outside that article's wrapper.
//
// Two independent guarantees:
//   1. VALIDATION — dangerous constructs are rejected outright and the CSS is
//      not saved / not emitted (@import, url(), expression(), behavior,
//      -moz-binding, position:fixed, global selectors like html/body/:root ...).
//   2. SCOPING — every surviving selector is rewritten so it can only ever
//      match inside `.article-content[data-article-id="<id>"]`. Even a selector
//      the validator did not anticipate is confined by the prefix.
//
// WHY A TOKENIZER AND NOT A REGEX
// -------------------------------
// A single regex cannot correctly track strings, comments, and nested blocks,
// which is exactly where CSS sanitizers get bypassed (e.g. `/*}*/`, or a `}`
// inside a quoted string prematurely ending a rule). The parser below walks the
// input character by character with explicit string/comment/block states, so
// block boundaries are always correct. No new dependency is needed: this is a
// deliberately small, auditable subset parser — it understands rule sets and
// conditional at-rules, and treats everything it does not understand as an
// error rather than passing it through.

export const MAX_ARTICLE_CSS_LENGTH = 64_000

/** At-rules that may wrap scoped rules. Anything else is rejected. */
const ALLOWED_CONDITIONAL_AT_RULES = new Set(['media', 'supports', 'container', 'layer'])

/**
 * Keyframes need dedicated handling: their bodies contain frame selectors, not
 * normal rules, so they are never passed through `scopeSelectorList`.
 */
const KEYFRAME_AT_RULES = new Set(['keyframes', '-webkit-keyframes'])
const KEYFRAME_PRELUDE = /^@(-webkit-)?keyframes\s+([A-Za-z_][A-Za-z0-9_-]*)\s*$/i
const Z_INDEX_KEYWORD = /^(?:auto|inherit|initial|unset|revert|revert-layer)$/i

/**
 * Selectors that would escape the article. Matched against the *lowercased*
 * selector text of each compound part.
 */
const FORBIDDEN_SELECTOR_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /(^|[\s>+~,(])html\b/, reason: 'انتخابگر html مجاز نیست' },
  { pattern: /(^|[\s>+~,(])body\b/, reason: 'انتخابگر body مجاز نیست' },
  { pattern: /:root\b/, reason: 'انتخابگر :root مجاز نیست' },
  { pattern: /::?(backdrop|part|slotted)\b/, reason: 'شبه‌المان غیرمجاز است' },
  { pattern: /(^|[\s>+~,(])(nav|header|footer|main|aside)\b/, reason: 'انتخابگر بخش‌های اصلی سایت مجاز نیست' },
  { pattern: /:has\(\s*:root/, reason: 'انتخابگر :root مجاز نیست' },
]

/** Declaration values that must never appear. */
const FORBIDDEN_VALUE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /url\s*\(/, reason: 'استفاده از url() مجاز نیست' },
  { pattern: /@import/, reason: 'دستور @import مجاز نیست' },
  { pattern: /expression\s*\(/, reason: 'expression() مجاز نیست' },
  { pattern: /javascript\s*:/, reason: 'javascript: مجاز نیست' },
  { pattern: /vbscript\s*:/, reason: 'vbscript: مجاز نیست' },
  { pattern: /-moz-binding/, reason: '-moz-binding مجاز نیست' },
  { pattern: /\bbehavior\b/, reason: 'behavior مجاز نیست' },
  { pattern: /\bimage-set\s*\(/, reason: 'image-set() مجاز نیست' },
  { pattern: /\belement\s*\(/, reason: 'element() مجاز نیست' },
]

/** Properties that would let an article take over the page. */
const FORBIDDEN_PROPERTIES = new Set(['behavior', '-moz-binding', 'filter-src'])

const MAX_Z_INDEX = 999

export interface ArticleCssIssue {
  /** 1-based line number in the *input* CSS, when determinable. */
  line: number
  message: string
}

export interface ArticleCssResult {
  /** True when the CSS is safe and was scoped successfully. */
  ok: boolean
  /** Scoped CSS, ready to emit. Empty string when `ok` is false. */
  css: string
  /** Persian, user-facing problems. Never contains parser internals. */
  issues: ArticleCssIssue[]
}

/**
 * Scope prefix for one article. Local CSS can only ever match inside this.
 * The id is escaped so a crafted id cannot break out of the attribute selector.
 */
export function articleScopeSelector(articleId: string): string {
  const escaped = String(articleId).replace(/["\\]/g, '\\$&')
  return `.article-content[data-article-id="${escaped}"]`
}

/**
 * Deterministic CSS identifier for one article's local animations.
 *
 * Keyframe names are document-global, so they must be namespaced per article.
 * We hash the id instead of embedding it: a raw id (or a crafted one) must
 * never be able to inject CSS syntax through an identifier position.
 */
export function articleCssScopeName(articleId: string): string {
  const id = String(articleId)
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < id.length; i += 1) {
    const code = id.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0
    h2 = Math.imul(h2 ^ code, 0x85ebca6b) >>> 0
    h2 = ((h2 << 13) | (h2 >>> 19)) >>> 0
  }
  return `article-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`
}

/** Group repeated problem types while preserving their original line numbers. */
export function groupArticleCssIssues(
  issues: ArticleCssIssue[],
): { message: string; lines: number[] }[] {
  const grouped = new Map<string, number[]>()
  for (const issue of issues) {
    const lines = grouped.get(issue.message) ?? []
    if (!lines.includes(issue.line)) lines.push(issue.line)
    grouped.set(issue.message, lines)
  }
  return Array.from(grouped, ([message, lines]) => ({ message, lines }))
}

/** Persian, human-readable line list for the grouped editor summary. */
export function formatArticleCssIssueLines(lines: number[]): string {
  if (lines.length === 0) return ''
  if (lines.length === 1) return `خط ${lines[0]}`
  if (lines.length === 2) return `خطوط ${lines[0]} و ${lines[1]}`
  return `خطوط ${lines.slice(0, -1).join('، ')} و ${lines[lines.length - 1]}`
}

/** Strip comments while preserving newlines so line numbers stay accurate. */
function stripComments(input: string): string {
  let out = ''
  let i = 0
  let quote: string | null = null

  while (i < input.length) {
    const ch = input[i]

    if (quote) {
      out += ch
      if (ch === '\\' && i + 1 < input.length) {
        out += input[i + 1]
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }

    if (ch === '"' || ch === "'") {
      quote = ch
      out += ch
      i += 1
      continue
    }

    if (ch === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2)
      const chunk = end === -1 ? input.slice(i) : input.slice(i, end + 2)
      // Keep newlines so reported line numbers still line up with the input.
      out += chunk.replace(/[^\n]/g, '')
      i = end === -1 ? input.length : end + 2
      continue
    }

    out += ch
    i += 1
  }

  return out
}

interface RawBlock {
  prelude: string
  body: string
  line: number
}

/**
 * Split CSS into top-level blocks (`prelude { body }`), tracking strings and
 * nesting depth so a `}` inside a string or nested block never ends a rule
 * early. Returns null on unbalanced input.
 */
function splitBlocks(input: string, startLine = 1): RawBlock[] | null {
  const blocks: RawBlock[] = []
  let prelude = ''
  let line = startLine
  let preludeLine = startLine
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (ch === '\n') {
      line += 1
      if (prelude.trim() === '') preludeLine = line
      prelude += ch
      i += 1
      continue
    }

    if (ch === '"' || ch === "'") {
      const quote = ch
      let j = i + 1
      prelude += ch
      while (j < input.length) {
        if (input[j] === '\\') {
          prelude += input[j] + (input[j + 1] ?? '')
          j += 2
          continue
        }
        prelude += input[j]
        if (input[j] === '\n') line += 1
        if (input[j] === quote) { j += 1; break }
        j += 1
      }
      i = j
      continue
    }

    // An at-rule that ends with `;` instead of a block (e.g. `@import "x";`).
    if (ch === ';' && prelude.trim().startsWith('@')) {
      blocks.push({ prelude: prelude.trim(), body: '', line: preludeLine })
      prelude = ''
      preludeLine = line
      i += 1
      continue
    }

    if (ch === '{') {
      let depth = 1
      let body = ''
      let j = i + 1
      const bodyLine = line
      while (j < input.length && depth > 0) {
        const c = input[j]
        if (c === '"' || c === "'") {
          const quote = c
          body += c
          j += 1
          while (j < input.length) {
            if (input[j] === '\\') {
              body += input[j] + (input[j + 1] ?? '')
              j += 2
              continue
            }
            body += input[j]
            if (input[j] === '\n') line += 1
            if (input[j] === quote) { j += 1; break }
            j += 1
          }
          continue
        }
        if (c === '\n') line += 1
        if (c === '{') depth += 1
        if (c === '}') {
          depth -= 1
          if (depth === 0) { j += 1; break }
        }
        body += c
        j += 1
      }
      if (depth !== 0) return null // unbalanced braces -> malformed CSS
      blocks.push({ prelude: prelude.trim(), body, line: bodyLine })
      prelude = ''
      preludeLine = line
      i = j
      continue
    }

    if (ch === '}') return null // stray closing brace -> malformed CSS

    prelude += ch
    i += 1
  }

  if (prelude.trim() !== '') return null // trailing junk outside any block
  return blocks
}

function checkDeclarations(body: string, line: number, issues: ArticleCssIssue[]): void {
  const lowered = body.toLowerCase()

  for (const { pattern, reason } of FORBIDDEN_VALUE_PATTERNS) {
    if (pattern.test(lowered)) issues.push({ line, message: reason })
  }

  for (const rawDecl of body.split(';')) {
    const decl = rawDecl.trim()
    if (!decl) continue
    const colon = decl.indexOf(':')
    if (colon === -1) continue

    const prop = decl.slice(0, colon).trim().toLowerCase()
    const value = decl.slice(colon + 1).trim().toLowerCase()

    if (FORBIDDEN_PROPERTIES.has(prop)) {
      issues.push({ line, message: `ویژگی «${prop}» مجاز نیست` })
      continue
    }

    if (prop === 'position' && value.startsWith('fixed')) {
      issues.push({ line, message: 'position: fixed در CSS اختصاصی مجاز نیست' })
    }

    if (prop === 'z-index') {
      const trimmed = value.trim()
      if (/^-?\d+$/.test(trimmed)) {
        if (Number(trimmed) > MAX_Z_INDEX) {
          issues.push({ line, message: `z-index نباید بیشتر از ${MAX_Z_INDEX} باشد` })
        }
      } else if (!Z_INDEX_KEYWORD.test(trimmed)) {
        // calc()/var()/unit values must not evade the numeric cap.
        issues.push({ line, message: 'z-index باید عدد یا یکی از کلمات مجاز باشد' })
      }
    }
  }
}

/** Rewrite one selector list so every part is confined to the article scope. */
function scopeSelectorList(
  selectorList: string,
  scope: string,
  line: number,
  issues: ArticleCssIssue[],
): string | null {
  const parts = selectorList.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) {
    issues.push({ line, message: 'انتخابگر خالی است' })
    return null
  }

  const scoped: string[] = []

  for (const part of parts) {
    const lowered = part.toLowerCase()

    for (const { pattern, reason } of FORBIDDEN_SELECTOR_PATTERNS) {
      if (pattern.test(lowered)) {
        issues.push({ line, message: reason })
        return null
      }
    }

    if (/^\s*[>+~]/.test(part)) {
      issues.push({ line, message: 'انتخابگر نمی‌تواند با ترکیب‌کننده شروع شود' })
      return null
    }

    // `&` refers to the article scope itself.
    scoped.push(part.includes('&') ? part.replace(/&/g, scope) : `${scope} ${part}`)
  }

  return scoped.join(', ')
}

/** Split on a delimiter outside strings and parentheses. */
function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = []
  let current = ''
  let quote: string | null = null
  let depth = 0
  let i = 0

  while (i < input.length) {
    const ch = input[i]
    if (quote) {
      current += ch
      if (ch === '\\' && i + 1 < input.length) {
        current += input[i + 1]
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
      i += 1
      continue
    }
    if (ch === '(') depth += 1
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === delimiter && depth === 0) {
      parts.push(current)
      current = ''
      i += 1
      continue
    }
    current += ch
    i += 1
  }
  parts.push(current)
  return parts
}

/**
 * Rewrite keyframe identifiers in animation declarations.
 *
 * Only exact matches to keyframes declared by this article are changed.
 * Strings, function arguments and unrelated tokens are left untouched, so
 * `content: "fadeIn"` and `steps(2, fadeIn)` survive intact.
 */
function rewriteAnimationReferences(value: string, names: Map<string, string>): string {
  let out = ''
  let i = 0
  let quote: string | null = null
  let parenDepth = 0

  while (i < value.length) {
    const ch = value[i]
    if (quote) {
      out += ch
      if (ch === '\\' && i + 1 < value.length) {
        out += value[i + 1]
        i += 2
        continue
      }
      if (ch === quote) quote = null
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      out += ch
      i += 1
      continue
    }
    if (ch === '(') {
      parenDepth += 1
      out += ch
      i += 1
      continue
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
      out += ch
      i += 1
      continue
    }
    if (parenDepth === 0 && /[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(value.slice(i))
      if (match) {
        const token = match[0]
        const namespaced = names.get(token)
        // A function name (`foo(`) is never an animation reference.
        out += namespaced && value[i + token.length] !== '(' ? namespaced : token
        i += token.length
        continue
      }
    }
    out += ch
    i += 1
  }
  return out
}

/** Rewrite only `animation` / `animation-name` declarations in a rule body. */
function rewriteAnimationDeclarations(body: string, names: Map<string, string>): string {
  if (names.size === 0) return body
  return splitTopLevel(body, ';')
    .map((segment) => {
      const parts = splitTopLevel(segment, ':')
      if (parts.length < 2) return segment
      const prop = parts[0].trim().toLowerCase()
      if (prop !== 'animation' && prop !== 'animation-name') return segment
      return `${parts[0]}:${rewriteAnimationReferences(parts.slice(1).join(':'), names)}`
    })
    .join(';')
}

function isValidFrameSelector(selector: string): boolean {
  if (/^(from|to)$/i.test(selector)) return true
  const match = /^(\d+(?:\.\d+)?)%$/.exec(selector)
  return match ? Number(match[1]) >= 0 && Number(match[1]) <= 100 : false
}

/**
 * Collect every keyframe declared by this article before processing rules, so
 * a rule may reference a keyframe declared later in the stylesheet.
 */
function collectKeyframeNames(blocks: RawBlock[], scopePrefix: string): Map<string, string> {
  const names = new Map<string, string>()
  for (const block of blocks) {
    if (!block.prelude.startsWith('@')) continue
    const atName = (block.prelude.slice(1).match(/^[a-z-]+/i)?.[0] ?? '').toLowerCase()
    if (!KEYFRAME_AT_RULES.has(atName)) continue
    const match = KEYFRAME_PRELUDE.exec(block.prelude)
    if (match) names.set(match[2], `${scopePrefix}-${match[2]}`)
  }
  return names
}

/**
 * Validate and scope one article's local CSS.
 *
 * On any prohibited construct the whole stylesheet is rejected (`ok: false`,
 * `css: ''`) — we never silently emit a partially dangerous stylesheet.
 */
export function sanitizeArticleCss(
  input: string | null | undefined,
  articleId: string,
): ArticleCssResult {
  const issues: ArticleCssIssue[] = []

  if (!input || input.trim() === '') {
    return { ok: true, css: '', issues }
  }

  if (input.length > MAX_ARTICLE_CSS_LENGTH) {
    return {
      ok: false,
      css: '',
      issues: [{ line: 1, message: `حجم CSS بیش از حد مجاز است (حداکثر ${MAX_ARTICLE_CSS_LENGTH} کاراکتر)` }],
    }
  }

  // `</style>` inside CSS would break out of the <style> element in HTML.
  if (/<\s*\/?\s*(style|script)/i.test(input)) {
    return { ok: false, css: '', issues: [{ line: 1, message: 'استفاده از تگ HTML در CSS مجاز نیست' }] }
  }

  const scope = articleScopeSelector(articleId)
  const source = stripComments(input)
  const blocks = splitBlocks(source)

  if (blocks === null) {
    return { ok: false, css: '', issues: [{ line: 1, message: 'ساختار CSS نامعتبر است (آکولادها متوازن نیستند)' }] }
  }

  const out: string[] = []
  const scopePrefix = articleCssScopeName(articleId)
  const keyframes = collectKeyframeNames(blocks, scopePrefix)

  for (const block of blocks) {
    const { prelude, body, line } = block

    if (prelude.startsWith('@')) {
      const name = (prelude.slice(1).match(/^[a-z-]+/i)?.[0] ?? '').toLowerCase()

      if (KEYFRAME_AT_RULES.has(name)) {
        const match = KEYFRAME_PRELUDE.exec(prelude)
        if (!match) {
          issues.push({ line, message: 'دستور @keyframes نامعتبر است' })
          continue
        }

        const frames = splitBlocks(body, line)
        if (frames === null || frames.length === 0) {
          issues.push({ line, message: 'ساختار @keyframes نامعتبر است' })
          continue
        }

        const frameOut: string[] = []
        for (const frame of frames) {
          const selectors = frame.prelude.split(',').map((selector) => selector.trim())
          if (selectors.some((selector) => !isValidFrameSelector(selector))) {
            issues.push({ line: frame.line, message: 'انتخابگر فریم انیمیشن نامعتبر است' })
            continue
          }
          checkDeclarations(frame.body, frame.line, issues)
          frameOut.push(`${frame.prelude} {${rewriteAnimationDeclarations(frame.body, keyframes)}}`)
        }

        const namespaced = keyframes.get(match[2]) ?? `${scopePrefix}-${match[2]}`
        const atRule = match[1] ? '-webkit-keyframes' : 'keyframes'
        if (frameOut.length > 0) out.push(`@${atRule} ${namespaced} {\n${frameOut.join('\n')}\n}`)
        continue
      }

      if (!ALLOWED_CONDITIONAL_AT_RULES.has(name)) {
        issues.push({ line, message: `دستور @${name || '?'} مجاز نیست` })
        continue
      }

      const inner = splitBlocks(body, line)
      if (inner === null) {
        issues.push({ line, message: 'ساختار CSS داخل @' + name + ' نامعتبر است' })
        continue
      }

      const innerOut: string[] = []
      for (const rule of inner) {
        if (rule.prelude.startsWith('@')) {
          issues.push({ line: rule.line, message: 'at-rule تودرتو مجاز نیست' })
          continue
        }
        checkDeclarations(rule.body, rule.line, issues)
        const sel = scopeSelectorList(rule.prelude, scope, rule.line, issues)
        if (sel) innerOut.push(`${sel} {${rewriteAnimationDeclarations(rule.body, keyframes)}}`)
      }

      if (innerOut.length > 0) out.push(`${prelude} {\n${innerOut.join('\n')}\n}`)
      continue
    }

    checkDeclarations(body, line, issues)
    const sel = scopeSelectorList(prelude, scope, line, issues)
    if (sel) out.push(`${sel} {${rewriteAnimationDeclarations(body, keyframes)}}`)
  }

  if (issues.length > 0) {
    return { ok: false, css: '', issues }
  }

  return { ok: true, css: out.join('\n'), issues }
}

/**
 * Convenience for the render path: returns scoped CSS, or '' when the stored
 * CSS is invalid. Rendering must never fail because of bad local CSS.
 */
export function scopeArticleCss(
  input: string | null | undefined,
  articleId: string,
): string {
  const result = sanitizeArticleCss(input, articleId)
  return result.ok ? result.css : ''
}
