// Relaxed per-article CSS policy: focused regression coverage.
// The security boundary (validation + scoping) is unchanged; only safe
// constructs are relaxed. These tests are the proof of that boundary.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ArticleContent } from '@/components/articles/ArticleContent'
import {
  sanitizeArticleCss,
  scopeArticleCss,
  articleCssScopeName,
  MAX_ARTICLE_CSS_LENGTH,
  groupArticleCssIssues,
  formatArticleCssIssueLines,
} from '@/lib/article-css'

const ID_A = '11111111-1111-1111-1111-111111111111'
const ID_B = '22222222-2222-2222-2222-222222222222'
const SCOPE_A = `.article-content[data-article-id="${ID_A}"]`

/** Build CSS of an exact length using an inert comment (length is checked before stripping). */
function cssOfLength(target: number): string {
  const base = '.x { color: red; }'
  const padding = target - base.length - 4 // '/*' + '*/'
  return `${base}/*${'x'.repeat(padding)}*/`
}

describe('article CSS: size limit', () => {
  it('uses a bounded 64,000 character limit', () => {
    expect(MAX_ARTICLE_CSS_LENGTH).toBe(64_000)
  })

  it('accepts CSS at the 64,000 character boundary', () => {
    const result = sanitizeArticleCss(cssOfLength(64_000), ID_A)
    expect(result.ok).toBe(true)
    expect(result.css).toContain(`${SCOPE_A} .x`)
  })

  it('rejects CSS over 64,000 characters with a clear Persian message', () => {
    const result = sanitizeArticleCss(cssOfLength(64_001), ID_A)
    expect(result.ok).toBe(false)
    expect(result.css).toBe('')
    expect(result.issues[0].message).toMatch(/[\u0600-\u06FF]/)
  })

  it('no longer rejects the old 20 KB boundary', () => {
    const result = sanitizeArticleCss(cssOfLength(30_000), ID_A)
    expect(result.ok).toBe(true)
  })
})

describe('article CSS: position', () => {
  it('allows position: sticky', () => {
    const result = sanitizeArticleCss('.x { position: sticky; top: 8px; }', ID_A)
    expect(result.ok).toBe(true)
    expect(result.css).toContain('position: sticky')
  })

  it('still blocks position: fixed', () => {
    const result = sanitizeArticleCss('.x { position: fixed; inset: 0; }', ID_A)
    expect(result.ok).toBe(false)
    expect(result.css).toBe('')
    expect(result.issues.some((i) => i.message.includes('fixed'))).toBe(true)
  })
})

describe('article CSS: z-index', () => {
  it.each([50, 100, 500, 999])('accepts z-index %i', (value) => {
    expect(sanitizeArticleCss(`.x { z-index: ${value}; }`, ID_A).ok).toBe(true)
  })

  it('rejects z-index above 999', () => {
    const result = sanitizeArticleCss('.x { z-index: 1000; }', ID_A)
    expect(result.ok).toBe(false)
    expect(result.issues[0].message).toContain('999')
  })

  it('does not allow non-numeric bypasses', () => {
    for (const value of ['calc(1000)', '1000px', 'var(--z)']) {
      expect(sanitizeArticleCss(`.x { z-index: ${value}; }`, ID_A).ok).toBe(false)
    }
  })
})

describe('article CSS: keyframes', () => {
  const scopedKeyframeA = (name: string) => `${articleCssScopeName(ID_A)}-${name}`

  it('accepts @keyframes, namespaces its name, and rewrites the animation reference', () => {
    const result = sanitizeArticleCss(
      `@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(10px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n.card { animation: fadeIn 0.3s ease; }`,
      ID_A,
    )
    expect(result.issues).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.css).toContain(`@keyframes ${scopedKeyframeA('fadeIn')}`)
    expect(result.css).toContain(`animation: ${scopedKeyframeA('fadeIn')} 0.3s ease`)
    expect(result.css).toContain(`${SCOPE_A} .card`)
    // Frame selectors are never scoped under the article wrapper.
    expect(result.css).toContain('from {')
    expect(result.css).toContain('to {')
    expect(result.css).not.toContain(`${SCOPE_A} from`)
  })

  it('supports percentage frames and comma-separated frame selectors', () => {
    const result = sanitizeArticleCss(
      '@keyframes pulse { 0%, 50% { opacity: 0.5; } 100% { opacity: 1; } }',
      ID_A,
    )
    expect(result.ok).toBe(true)
    expect(result.css).toContain('0%, 50%')
    expect(result.css).toContain('100%')
  })

  it('supports @-webkit-keyframes', () => {
    const result = sanitizeArticleCss(
      '@-webkit-keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
      ID_A,
    )
    expect(result.ok).toBe(true)
    expect(result.css).toContain(`@-webkit-keyframes ${scopedKeyframeA('fadeIn')}`)
  })

  it('rewrites animation-name and multiple comma-separated animations', () => {
    const result = sanitizeArticleCss(
      `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
       @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.1); } }
       .a { animation-name: fadeIn, pulse; }
       .b { animation: fadeIn 1s ease, pulse 2s infinite; }`,
      ID_A,
    )
    expect(result.issues).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.css).toContain(`animation-name: ${scopedKeyframeA('fadeIn')}, ${scopedKeyframeA('pulse')}`)
    expect(result.css).toContain(`animation: ${scopedKeyframeA('fadeIn')} 1s ease, ${scopedKeyframeA('pulse')} 2s infinite`)
  })

  it('keeps keyframes from different articles isolated', () => {
    const css = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }'
    const a = sanitizeArticleCss(css, ID_A)
    const b = sanitizeArticleCss(css, ID_B)
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(articleCssScopeName(ID_A)).not.toBe(articleCssScopeName(ID_B))
    expect(a.css).not.toContain(articleCssScopeName(ID_B))
    expect(b.css).not.toContain(articleCssScopeName(ID_A))
  })

  it('does not corrupt quoted strings or function arguments', () => {
    const result = sanitizeArticleCss(
      `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
       .card::after { content: "fadeIn"; animation: fadeIn 1s steps(2, fadeIn); }`,
      ID_A,
    )
    expect(result.ok).toBe(true)
    expect(result.css).toContain('content: "fadeIn"')
    expect(result.css).toContain(`animation: ${scopedKeyframeA('fadeIn')} 1s steps(2, fadeIn)`)
  })

  it('rejects invalid keyframe names and frame selectors', () => {
    for (const css of [
      '@keyframes "fadeIn" { from { opacity: 0; } }',
      '@keyframes fadeIn { body { opacity: 0; } }',
      '@keyframes fadeIn { 120% { opacity: 0; } }',
    ]) {
      expect(sanitizeArticleCss(css, ID_A).ok).toBe(false)
    }
  })

  it('still validates declarations inside keyframes', () => {
    for (const css of [
      '@keyframes x { from { background-image: url(https://evil.example/x.png); } }',
      '@keyframes x { from { behavior: url(x.htc); } }',
      '@keyframes x { from { -moz-binding: url(x.xml); } }',
    ]) {
      const r = sanitizeArticleCss(css, ID_A)
      expect(r.ok).toBe(false)
      expect(r.css).toBe('')
    }
  })

  it('produces a deterministic, CSS-safe scope name', () => {
    expect(articleCssScopeName(ID_A)).toBe(articleCssScopeName(ID_A))
    expect(articleCssScopeName(ID_A)).toMatch(/^article-[a-f0-9]{16}$/)
    expect(articleCssScopeName('x"] , body [')).toMatch(/^article-[a-f0-9]{16}$/)
  })
})

describe('article CSS: unchanged security blocks', () => {
  it.each([
    ['@import', '@import "evil.css";'],
    ['url()', '.x { background: url("/a.png"); }'],
    ['position: fixed', '.x { position: fixed; }'],
    ['html', 'html { color: red; }'],
    ['body', 'body { color: red; }'],
    [':root', ':root { --x: red; }'],
    ['header', 'header { display: none; }'],
    ['footer', 'footer { display: none; }'],
    ['nav', 'nav { display: none; }'],
    ['main', 'main { display: none; }'],
    ['aside', 'aside { display: none; }'],
    ['::backdrop', '.x::backdrop { color: red; }'],
    ['::part', '.x::part(y) { color: red; }'],
    ['::slotted', '.x::slotted(*) { color: red; }'],
    ['expression()', '.x { width: expression(alert(1)); }'],
    ['javascript:', '.x { background: javascript:alert(1); }'],
    ['vbscript:', '.x { background: vbscript:msgbox(1); }'],
    ['-moz-binding', '.x { -moz-binding: url(x.xml); }'],
    ['behavior', '.x { behavior: url(x.htc); }'],
    ['image-set()', '.x { background: image-set(url(a) 1x); }'],
    ['element()', '.x { background: element(#id); }'],
    ['style breakout', '.x { color: red; } </style><script>alert(1)</script>'],
  ])('still rejects %s', (_label, css) => {
    expect(sanitizeArticleCss(css, ID_A).ok).toBe(false)
  })

  it('keeps conditional at-rules with scoped inner rules', () => {
    const result = sanitizeArticleCss(
      '@media (max-width: 600px) { .x { color: red; } }\n' +
        '@supports (display: grid) { .y { display: grid; } }\n' +
        '@container (min-width: 400px) { .z { color: blue; } }\n' +
        '@layer base { .w { color: green; } }',
      ID_A,
    )
    expect(result.ok).toBe(true)
    for (const atRule of ['@media', '@supports', '@container', '@layer']) {
      expect(result.css).toContain(atRule)
    }
    expect(result.css.match(/\.article-content\[data-article-id/g)?.length).toBe(4)
  })

  it('fails closed on the render path for invalid CSS', () => {
    expect(scopeArticleCss('body { color: red; }', ID_A)).toBe('')
    expect(scopeArticleCss('@import "evil.css";', ID_A)).toBe('')
    expect(scopeArticleCss('.x { position: fixed; }', ID_A)).toBe('')
  })
})

describe('article CSS: stacking isolation', () => {
  it('isolates article stacking via the global design stylesheet', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/article-content.css'), 'utf8')
    const block = /\.article-content\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? ''
    expect(block).toMatch(/isolation\s*:\s*isolate/)
  })
})

describe('ArticleContent render boundary', () => {
  function findNode(node: any, predicate: (n: any) => boolean): any | undefined {
    if (!node || typeof node !== 'object') return undefined
    if (predicate(node)) return node
    const children = Array.isArray(node.props?.children)
      ? node.props.children
      : [node.props?.children]
    for (const child of children) {
      const found = findNode(child, predicate)
      if (found) return found
    }
    return undefined
  }

  it('sanitizes HTML and emits only scoped CSS for valid local CSS', () => {
    const element = ArticleContent({
      content: '<p>safe</p><script>alert(1)</script>',
      articleId: ID_A,
      customCss:
        '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n' +
        '.x { position: sticky; top: 0; animation: fadeIn 0.3s ease; }',
    })

    const style = findNode(element, (node) => node.type === 'style')
    expect(style).toBeDefined()
    const emittedCss = style.props.dangerouslySetInnerHTML.__html
    expect(emittedCss).toContain(`${SCOPE_A} .x`)
    expect(emittedCss).toContain('@keyframes article-')
    expect(emittedCss).not.toContain('position: fixed')

    const body = findNode(
      element,
      (node) => node.type === 'div' && Boolean(node.props?.dangerouslySetInnerHTML),
    )
    expect(body.props.dangerouslySetInnerHTML.__html).not.toContain('<script')
  })

  it('emits no style block when stored CSS is invalid', () => {
    const element = ArticleContent({
      content: '<p>safe</p>',
      articleId: ID_A,
      customCss: '.x { position: fixed; }',
    })
    expect(findNode(element, (node) => node.type === 'style')).toBeUndefined()
  })
})

describe('article CSS: grouped validation messages', () => {
  it('groups identical issues while preserving line numbers', () => {
    const issues = [
      { line: 85, message: 'position: fixed مجاز نیست' },
      { line: 96, message: 'position: fixed مجاز نیست' },
      { line: 154, message: 'z-index مجاز نیست' },
      { line: 85, message: 'position: fixed مجاز نیست' },
    ]
    const grouped = groupArticleCssIssues(issues)
    expect(grouped).toEqual([
      { message: 'position: fixed مجاز نیست', lines: [85, 96] },
      { message: 'z-index مجاز نیست', lines: [154] },
    ])
    expect(formatArticleCssIssueLines([85, 96])).toBe('خطوط 85 و 96')
    expect(formatArticleCssIssueLines([154])).toBe('خط 154')
  })
})
