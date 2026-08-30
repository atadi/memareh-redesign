import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import Input from '../../src/components/ui/Input'

describe('Input primitive', () => {
  it('renders a labelled <input> wired to its label via htmlFor/id', () => {
    const html = renderToStaticMarkup(
      createElement(Input, { name: 'email', label: 'ایمیل' }),
    )
    expect(html).toContain('<label')
    expect(html).toContain('for="email"')
    expect(html).toContain('id="email"')
  })

  it('shows the error message and exposes aria-invalid + role=alert', () => {
    const html = renderToStaticMarkup(
      createElement(Input, { name: 'email', error: 'ایمیل الزامی است' }),
    )
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('role="alert"')
    expect(html).toContain('ایمیل الزامی است')
    expect(html).toContain('border-red-500')
  })

  it('falls back to hint text when there is no error', () => {
    const html = renderToStaticMarkup(
      createElement(Input, { name: 'email', hint: 'مثال: a@b.com' }),
    )
    expect(html).toContain('مثال: a@b.com')
    expect(html).not.toContain('role="alert"')
  })

  it('forwards standard input attributes (placeholder, type)', () => {
    const html = renderToStaticMarkup(
      createElement(Input, { name: 'q', type: 'search', placeholder: 'جستجو' }),
    )
    expect(html).toContain('type="search"')
    expect(html).toContain('placeholder="جستجو"')
  })
})
