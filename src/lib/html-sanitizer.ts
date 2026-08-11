// Single, authoritative HTML sanitization boundary for article content.
//
// WHY sanitize-html (NOT isomorphic-dompurify / jsdom):
// The article page is statically generated / ISR-rendered, so render-time
// sanitization MUST run on the server to protect against rows that predate
// write-time sanitization or any write path that bypasses it.
//
// `isomorphic-dompurify` binds DOMPurify to `jsdom` on the server. jsdom@30 pulls
// `html-encoding-sniffer@6` -> `@exodus/bytes@1.15.1` (an ES Module). Under
// Next.js 16 (Turbopack) server externalization the server bundle `require()`s
// that ESM dependency and crashes with `ERR_REQUIRE_ESM`, which aborts every
// article ISR regeneration and leaves Vercel serving the stale entry forever
// (the production incident this fix resolves).
//
// `sanitize-html` is a pure-JS sanitizer (built on htmlparser2) that needs NO DOM
// implementation, so it has no jsdom / linkedom / happy-dom transitive chain and
// cannot trigger ERR_REQUIRE_ESM. Its behavior is deterministic and equivalent to
// the previous DOMPurify policy (same allowed tags/attributes, same link-rel
// rule). The browser never needs this module for output safety because the same
// `sanitizeHtml` runs at write time; at render time it protects legacy/unsafe rows.
//
// This is the ONLY place article HTML is sanitized. The render component
// (`ArticleContent`) and the editor write-time path both call `sanitizeHtml`.

import sanitizeHtmlLib from 'sanitize-html'

// Tags the Tiptap-based editor (RichTextEditor) is known to emit. Anything else
// (script, iframe, object, embed, form, style, meta, base, etc.) is dropped by
// omission from this list. sanitize-html also strips event-handler attributes and
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
// by the transform below.
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'scope', 'width', 'height', 'loading', 'target', 'rel'] as const

// Force safe link behavior WITHOUT adding noise to ordinary same-tab links.
//
// Reverse-tabnabbing is only reachable when a link opens a new browsing context,
// so `rel="noopener noreferrer"` is required for `target="_blank"` and pointless
// everywhere else. Adding it to EVERY anchor pollutes internal same-tab links
// (the site's own articles), strips the referrer from legitimate internal
// navigation, and rewrites already-clean markup on every sanitize pass —
// defeating byte-level idempotence for the optimizer.
//
// tel:/mailto: links are left untouched.
const OPENS_NEW_CONTEXT = /^_blank$/i

const options: sanitizeHtmlLib.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  // `class`/`scope` allowed on every tag; the rest scoped to the tags that use them.
  allowedAttributes: {
    '*': ['class', 'scope'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    td: ['scope'],
    th: ['scope'],
  },
  // Drop disallowed tags entirely rather than keeping their text content
  // escaped (we want formatting removed, not leaked as literal text).
  disallowedTagsMode: 'discard',
  // Non-tag disallowed elements are covered by not being in allowedTags.
  transformTags: {
    a: (tagName: string, attribs: sanitizeHtmlLib.Attributes) => {
      const href = attribs.href || ''
      // Block script/data: navigation regardless of what the editor stored.
      if (/^(javascript:|data:|vbscript:)/i.test(href)) {
        delete attribs.href
      }
      const target = attribs.target || ''
      if (!OPENS_NEW_CONTEXT.test(target)) {
        // Same-tab link: never inject rel. Drop an empty rel left by the editor so
        // repeated sanitization is byte-stable.
        if (attribs.rel && (attribs.rel ?? '').trim() === '') {
          delete attribs.rel
        }
        return { tagName, attribs }
      }
      const relTokens = (attribs.rel ?? '').trim().split(/\s+/).filter(Boolean)
      for (const required of ['noopener', 'noreferrer']) {
        if (!relTokens.some((t: string) => t.toLowerCase() === required)) relTokens.push(required)
      }
      attribs.rel = relTokens.join(' ')
      return { tagName, attribs }
    },
  },
}

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return sanitizeHtmlLib(dirty, options)
}
