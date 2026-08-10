// Feature B — Local Article CSS security + isolation.
//
// The threat model: an admin-authored (or compromised-admin-authored) stylesheet
// must not be able to affect anything outside its own article. Two independent
// guarantees are tested here — rejection of dangerous constructs, and scoping of
// everything that survives.

import { describe, it, expect } from 'vitest'
import {
  sanitizeArticleCss,
  scopeArticleCss,
  articleScopeSelector,
  MAX_ARTICLE_CSS_LENGTH,
} from '@/lib/article-css'

const ID_A = '11111111-1111-1111-1111-111111111111'
const ID_B = '22222222-2222-2222-2222-222222222222'
const SCOPE_A = `.article-content[data-article-id="${ID_A}"]`

describe('sanitizeArticleCss: allowed CSS', () => {
  it('accepts empty / null input', () => {
    for (const v of [null, undefined, '', '   ']) {
      const r = sanitizeArticleCss(v, ID_A)
      expect(r.ok).toBe(true)
      expect(r.css).toBe('')
    }
  })

  it('accepts and scopes article design-system selectors', () => {
    const r = sanitizeArticleCss(
      '.article-heading { color: #059669; }\n.article-callout { border-radius: 4px; }',
      ID_A,
    )
    expect(r.issues).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.css).toContain(`${SCOPE_A} .article-heading`)
    expect(r.css).toContain(`${SCOPE_A} .article-callout`)
  })

  it('scopes every part of a selector list', () => {
    const r = sanitizeArticleCss('.a, .b, .c { color: red; }', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css.match(/\.article-content\[data-article-id/g)?.length).toBe(3)
  })

  it('maps `&` to the article wrapper itself', () => {
    const r = sanitizeArticleCss('& { background: #eee; }', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css).toContain(`${SCOPE_A} {`)
  })

  it('allows @media and scopes the rules inside it', () => {
    const r = sanitizeArticleCss(
      '@media (max-width: 600px) { .article-step { display: block; } }',
      ID_A,
    )
    expect(r.ok).toBe(true)
    expect(r.css).toContain('@media (max-width: 600px)')
    expect(r.css).toContain(`${SCOPE_A} .article-step`)
  })

  it('strips comments without corrupting the rules', () => {
    const r = sanitizeArticleCss('/* note */ .article-note { color: red; } /* end */', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css).toContain(`${SCOPE_A} .article-note`)
    expect(r.css).not.toContain('note */')
  })

  it('allows a moderate z-index', () => {
    expect(sanitizeArticleCss('.x { z-index: 3; }', ID_A).ok).toBe(true)
  })
})

describe('sanitizeArticleCss: prohibited constructs are rejected', () => {
  const rejected: [string, string][] = [
    ['body selector', 'body { display: none; }'],
    ['html selector', 'html { background: red; }'],
    [':root selector', ':root { --color-background: red; }'],
    ['descendant body', '.x body { color: red; }'],
    ['nav selector', 'nav { display: none; }'],
    ['footer selector', 'footer a { color: red; }'],
    ['@import', '@import url("https://evil.example/x.css");'],
    ['bare @import', '@import "evil.css";'],
    ['url() background', '.x { background-image: url(https://evil.example/track.png); }'],
    ['url() font', '.x { background: url("/a.png"); }'],
    ['expression()', '.x { width: expression(alert(1)); }'],
    ['javascript: value', '.x { background: javascript:alert(1); }'],
    ['-moz-binding', '.x { -moz-binding: url(evil.xml); }'],
    ['behavior', '.x { behavior: url(evil.htc); }'],
    ['position fixed', '.x { position: fixed; inset: 0; }'],
    ['position sticky', '.x { position: sticky; }'],
    ['extreme z-index', '.x { z-index: 999999; }'],
    ['style tag breakout', '.x { color: red; } </style><script>alert(1)</script>'],
    ['@font-face', '@font-face { font-family: x; }'],
    ['@charset', '@charset "utf-8";'],
    ['leading combinator', '> .x { color: red; }'],
  ]

  it.each(rejected)('rejects %s', (_label, input) => {
    const r = sanitizeArticleCss(input, ID_A)
    expect(r.ok).toBe(false)
    expect(r.css).toBe('')
    expect(r.issues.length).toBeGreaterThan(0)
  })

  it('reports Persian, non-technical messages', () => {
    const r = sanitizeArticleCss('body { color: red; }', ID_A)
    expect(r.ok).toBe(false)
    const msg = r.issues[0].message
    expect(msg).not.toMatch(/at |Error|undefined|TypeError|stack/)
    expect(/[\u0600-\u06FF]/.test(msg)).toBe(true)
  })

  it('reports a line number', () => {
    const r = sanitizeArticleCss('.ok { color: red; }\n\nbody { color: red; }', ID_A)
    expect(r.ok).toBe(false)
    expect(r.issues[0].line).toBeGreaterThan(1)
  })

  it('rejects oversized input', () => {
    const huge = '.x { color: red; }'.repeat(MAX_ARTICLE_CSS_LENGTH)
    const r = sanitizeArticleCss(huge, ID_A)
    expect(r.ok).toBe(false)
  })
})

describe('sanitizeArticleCss: malformed CSS', () => {
  const malformed = [
    '.x { color: red;',            // unclosed block
    '.x color: red; }',            // stray closing brace
    '}',                           // lone brace
    '.x {{ color: red; }',         // unbalanced nesting
    'not css at all',              // no block
  ]

  it.each(malformed)('rejects malformed input: %s', (input) => {
    const r = sanitizeArticleCss(input, ID_A)
    expect(r.ok).toBe(false)
    expect(r.css).toBe('')
  })

  it('is not fooled by a brace inside a string', () => {
    const r = sanitizeArticleCss('.x::after { content: "}"; color: red; }', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css).toContain(`${SCOPE_A} .x::after`)
  })

  it('is not fooled by a selector hidden in a comment', () => {
    const r = sanitizeArticleCss('/* body { */ .x { color: red; }', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css).not.toContain('body')
  })
})

describe('article isolation', () => {
  it('article A CSS cannot match article B', () => {
    const r = sanitizeArticleCss('.article-callout { color: red; }', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css).toContain(ID_A)
    expect(r.css).not.toContain(ID_B)
  })

  it('every emitted selector begins with the article scope', () => {
    const r = sanitizeArticleCss(
      '.a { color: red; }\n.b .c { color: red; }\n@media screen { .d { color: red; } }',
      ID_A,
    )
    expect(r.ok).toBe(true)
    for (const line of r.css.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('@') || trimmed === '}') continue
      for (const part of trimmed.slice(0, trimmed.indexOf('{')).split(',')) {
        if (!part.trim()) continue
        expect(part.trim().startsWith('.article-content[data-article-id=')).toBe(true)
      }
    }
  })

  it('cannot reach navigation, admin layout, or the footer', () => {
    for (const attempt of [
      'nav a { display: none; }',
      'body .admin-panel { display: none; }',
      'footer { display: none; }',
      'html .site-header { display: none; }',
    ]) {
      expect(sanitizeArticleCss(attempt, ID_A).ok).toBe(false)
    }
  })

  it('a generic class name is still confined to the article', () => {
    // `.container` exists elsewhere in the app; scoping must neutralize it.
    const r = sanitizeArticleCss('.container { display: none; }', ID_A)
    expect(r.ok).toBe(true)
    expect(r.css.trim().startsWith(SCOPE_A)).toBe(true)
  })

  it('escapes a crafted article id so it cannot break out of the attribute selector', () => {
    const evil = 'x"] , body ['
    const scope = articleScopeSelector(evil)
    expect(scope).toContain('\\"')
    const r = sanitizeArticleCss('.a { color: red; }', evil)
    expect(r.ok).toBe(true)
    // The injected `body` is inert because the quote was escaped.
    expect(r.css).toContain('\\"]')
  })
})

describe('scopeArticleCss (render path)', () => {
  it('returns scoped CSS for valid input', () => {
    expect(scopeArticleCss('.a { color: red; }', ID_A)).toContain(SCOPE_A)
  })

  it('fails closed: invalid stored CSS renders as nothing, never raw', () => {
    expect(scopeArticleCss('body { display: none; }', ID_A)).toBe('')
    expect(scopeArticleCss('@import "evil.css";', ID_A)).toBe('')
    expect(scopeArticleCss('.x { color: red;', ID_A)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(scopeArticleCss(null, ID_A)).toBe('')
    expect(scopeArticleCss('', ID_A)).toBe('')
  })
})
