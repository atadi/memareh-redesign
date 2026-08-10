// Single, authoritative HTML sanitization boundary for article content.
//
// Why isomorphic-dompurify: `dompurify` requires a DOM and cannot run during
// Next.js SSG/SSR (Node) without one. The article page is statically generated,
// so render-time sanitization MUST run on the server to protect against rows that
// predate write-time sanitization or any write path that bypasses it.
// `isomorphic-dompurify` binds DOMPurify to jsdom on the server and uses the
// native DOM in the browser, giving one consistent implementation everywhere.
//
// This is the ONLY place article HTML is sanitized. The render component
// (`ArticleContent`) and the editor write-time path both call `sanitizeHtml`.

import DOMPurify from 'isomorphic-dompurify'

// Tags the Tiptap-based editor (RichTextEditor) is known to emit. Anything else
// (script, iframe, object, embed, form, style, meta, base, etc.) is dropped by
// omission from this list — DOMPurify also strips event-handler attributes and
// javascript:/data: URL schemes by default.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'blockquote', 'pre', 'code',
  'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption', 'span',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
] as const

// Attributes permitted on the allowed tags. `style` is intentionally excluded to
// avoid CSS-injection (expression()/url(javascript:)). `target`/`rel` are handled
// by the hook below.
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'scope',
  'width', 'height', 'loading', 'target', 'rel',
] as const

// Force safe link behavior WITHOUT adding noise to ordinary same-tab links.
//
// Reverse-tabnabbing is only reachable when a link opens a new browsing context,
// so `rel="noopener noreferrer"` is required for `target="_blank"` and pointless
// everywhere else. The previous rule added it to EVERY anchor, which polluted
// internal same-tab links (the site's own articles), stripped the referrer from
// legitimate internal navigation, and rewrote already-clean markup on every
// sanitize pass — defeating byte-level idempotence for the optimizer.
//
// tel:/mailto: links are left untouched.
const OPENS_NEW_CONTEXT = /^_blank$/i

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A' || !node.hasAttribute('href')) return
  const href = node.getAttribute('href') ?? ''
  // Block script/data: navigation regardless of what the editor stored.
  if (/^(javascript:|data:|vbscript:)/i.test(href)) {
    node.removeAttribute('href')
    return
  }
  const target = node.getAttribute('target') ?? ''
  if (!OPENS_NEW_CONTEXT.test(target)) {
    // Same-tab link: never inject rel. Drop an empty rel left by the editor so
    // repeated sanitization is byte-stable.
    if (node.hasAttribute('rel') && (node.getAttribute('rel') ?? '').trim() === '') {
      node.removeAttribute('rel')
    }
    return
  }
  const rel = (node.getAttribute('rel') ?? '').trim()
  const tokens = rel ? rel.split(/\s+/) : []
  for (const required of ['noopener', 'noreferrer']) {
    if (!tokens.some((t) => t.toLowerCase() === required)) tokens.push(required)
  }
  node.setAttribute('rel', tokens.join(' '))
})

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    // Drop disallowed tags entirely rather than keeping their text content
    // escaped (we want formatting removed, not leaked as literal text).
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'meta', 'base', 'link'],
    USE_PROFILES: false,
  })
}
