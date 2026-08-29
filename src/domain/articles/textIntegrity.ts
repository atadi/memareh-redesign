// Deterministic visible-text extraction, used to prove that a markup-only
// transformation of an article changed *structure* and nothing a reader sees.
//
// The rule this enforces: you may change element types, nesting, classes, and
// safe attributes freely, but every visible character must survive in the same
// order. Anything else is a content edit and must be reviewed as one.

/** Tags whose contents are never rendered as article text. */
const NON_VISIBLE_TAGS = ['script', 'style', 'template', 'noscript']

/**
 * Extract visible text from an HTML string in document order.
 *
 * Normalization is limited to what HTML itself treats as insignificant:
 * tags are removed, entities are decoded, and runs of whitespace collapse to a
 * single space. Word order, punctuation, digits, and symbols are untouched.
 */
export function extractVisibleText(html: string | null | undefined): string {
  if (!html) return ''

  let out = html

  for (const tag of NON_VISIBLE_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi'), ' ')
  }

  out = out.replace(/<!--[\s\S]*?-->/g, ' ')

  // Block-level boundaries imply a word break; inline tags must not create one
  // (`<strong>گروه</strong>معماره` is one word, and inserting a space there
  // would be a false difference).
  out = out.replace(
    /<\/?(p|div|section|article|nav|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|h[1-6]|blockquote|figure|figcaption|pre|br|hr)\b[^>]*>/gi,
    '\n',
  )

  out = out.replace(/<[^>]+>/g, '')

  out = out
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&zwnj;/gi, '\u200c')

  // Collapse all whitespace (including the newlines injected above) to single
  // spaces so pretty-printing differences never register as a text change.
  return out.replace(/\s+/g, ' ').trim()
}

export interface TextDiff {
  index: number
  before: string
  after: string
}

export interface TextIntegrityResult {
  preserved: boolean
  beforeLength: number
  afterLength: number
  /** First divergence with surrounding context; null when preserved. */
  diff: TextDiff | null
}

/**
 * Compare the visible text of two HTML documents.
 *
 * `preserved: true` means a reader sees exactly the same characters in the
 * same order, regardless of how the markup was restructured.
 */
export function compareVisibleText(
  beforeHtml: string,
  afterHtml: string,
): TextIntegrityResult {
  const before = extractVisibleText(beforeHtml)
  const after = extractVisibleText(afterHtml)

  if (before === after) {
    return { preserved: true, beforeLength: before.length, afterLength: after.length, diff: null }
  }

  let i = 0
  while (i < before.length && i < after.length && before[i] === after[i]) i += 1

  return {
    preserved: false,
    beforeLength: before.length,
    afterLength: after.length,
    diff: {
      index: i,
      before: before.slice(Math.max(0, i - 60), i + 60),
      after: after.slice(Math.max(0, i - 60), i + 60),
    },
  }
}
