// Feature A — Global Article CSS.
//
// These assertions guard the *scoping contract* of the article design system,
// not its visual details. The stylesheet is registered globally, so a single
// unscoped rule would leak into navigation, the admin panel, and the footer.
// Targeted assertions are used deliberately instead of a full CSS snapshot,
// which would break on every cosmetic tweak.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cssPath = resolve(process.cwd(), 'src/styles/article-content.css')
const css = readFileSync(cssPath, 'utf8')

/** CSS with comments removed, so prose in comments never satisfies an assertion. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Split a selector list on top-level commas only (commas inside `:is(...)` are not separators). */
function splitSelectorList(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of list) {
    if (ch === '(') depth += 1
    else if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** Every selector list in the file (the text preceding each `{`). */
function selectorLists(source: string): string[] {
  const out: string[] = []
  // Walk blocks so nested at-rule bodies are covered too.
  const re = /([^{}]+)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    const prelude = m[1].trim()
    if (!prelude || prelude.startsWith('@')) continue
    out.push(prelude)
  }
  return out
}

describe('article-content.css: scoping', () => {
  const selectors = selectorLists(code)

  it('has rules', () => {
    expect(selectors.length).toBeGreaterThan(30)
  })

  it('every selector part is scoped under .article-content', () => {
    const offenders: string[] = []
    for (const list of selectors) {
      for (const s of splitSelectorList(list)) {
        if (!s.includes('.article-content')) offenders.push(s)
      }
    }
    expect(offenders).toEqual([])
  })

  it('never styles html, body, or :root globally', () => {
    for (const list of selectors) {
      for (const part of list.split(',')) {
        const s = part.trim()
        if (!s) continue
        // `.dark .article-content` is fine; a bare `html`/`body`/`:root` is not.
        expect(/^\s*(html|body)\b/.test(s)).toBe(false)
        expect(s.includes(':root')).toBe(false)
      }
    }
  })

  it('does not emit bare element selectors that would hit the whole site', () => {
    for (const list of selectors) {
      for (const s of splitSelectorList(list)) {
        expect(/^(h[1-6]|p|a|table|ul|ol|li|img|div|nav|footer|header|main)\b/.test(s)).toBe(false)
      }
    }
  })

  it('does not use position: fixed anywhere', () => {
    expect(/position\s*:\s*fixed/.test(code)).toBe(false)
  })
})

describe('article-content.css: design classes', () => {
  const required = [
    'article-breadcrumb',
    'article-body-title',
    'article-badge',
    'article-lead',
    'article-actions',
    'article-action',
    'article-callout',
    'article-heading',
    'article-subheading',
    'article-feature-list',
    'article-note',
    'article-table',
    'article-step',
    'article-expert',
    'article-danger-list',
    'article-service-cta',
    'article-faq-question',
    'article-faq-answer',
    'article-conclusion',
  ]

  it.each(required)('defines .%s', (name) => {
    expect(code).toContain(`.${name}`)
  })
})

describe('article-content.css: RTL + Persian', () => {
  it('sets rtl direction on the article wrapper', () => {
    expect(/\.article-content\s*\{[\s\S]*?direction:\s*rtl/.test(code)).toBe(true)
  })

  it('prefers logical properties over hardcoded left/right spacing', () => {
    expect(code).toContain('padding-inline-start')
    expect(code).toContain('border-inline-start')
    expect(code).toContain('inset-inline-start')
    expect(code).toContain('margin-inline')
  })

  it('does not use physical margin-left/right or padding-left/right', () => {
    expect(/\bmargin-(left|right)\s*:/.test(code)).toBe(false)
    expect(/\bpadding-(left|right)\s*:/.test(code)).toBe(false)
  })

  it('uses a Persian-appropriate body line-height', () => {
    const m = code.match(/\.article-content\s*\{[\s\S]*?line-height:\s*([\d.]+)/)
    expect(m).not.toBeNull()
    expect(Number(m![1])).toBeGreaterThanOrEqual(1.8)
  })
})

describe('article-content.css: dark mode', () => {
  it('re-declares the colour tokens under .dark', () => {
    expect(code).toContain('.dark .article-content')
  })

  it('drives colours through custom properties rather than hardcoded literals', () => {
    expect(code).toContain('--article-text')
    expect(code).toContain('--article-surface')
    expect(code).toContain('var(--article-text)')
  })

  it('step number uses a paired contrast token, not a bare white', () => {
    const block = code.match(/\.article-step-number\s*\{[\s\S]*?\}/)
    expect(block).not.toBeNull()
    expect(block![0]).toContain('var(--article-accent-contrast)')
    expect(/color:\s*(#fff|#ffffff|white|rgb\(255,\s*255,\s*255\))/i.test(block![0])).toBe(false)
  })
})

describe('article-content.css: responsive tables', () => {
  it('makes the table wrapper horizontally scrollable', () => {
    const block = code.match(/\.article-content\s+\.article-table\s*\{[\s\S]*?\}/)
    expect(block).not.toBeNull()
    expect(block![0]).toContain('overflow-x: auto')
  })

  it('keeps an unwrapped table from overflowing the viewport', () => {
    expect(code).toContain('max-width: 100%')
    expect(/\.article-content\s*>\s*table[\s\S]*?overflow-x:\s*auto/.test(code)).toBe(true)
  })

  it('has a mobile breakpoint', () => {
    expect(code).toContain('@media (max-width: 640px)')
  })
})
