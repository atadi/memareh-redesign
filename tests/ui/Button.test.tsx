import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import Button from '../../src/components/ui/Button'

describe('Button primitive', () => {
  it('renders a <button> with the primary variant by default', () => {
    const html = renderToStaticMarkup(
      createElement(Button, { variant: 'primary' }, 'ثبت‌نام'),
    )
    expect(html).toContain('<button')
    expect(html).toContain('bg-blue-600')
    expect(html).toContain('ثبت‌نام')
  })

  it('applies danger and ghost variant classes', () => {
    const danger = renderToStaticMarkup(createElement(Button, { variant: 'danger' }, 'حذف'))
    expect(danger).toContain('bg-red-600')

    const ghost = renderToStaticMarkup(
      createElement(Button, { variant: 'ghost', 'aria-label': 'تم' }, '☀'),
    )
    expect(ghost).toContain('hover:bg-gray-100')
    expect(ghost).toContain('aria-label="تم"')
  })

  it('defaults type to "button" to avoid accidental form submits', () => {
    const html = renderToStaticMarkup(createElement(Button, null, 'اکشن'))
    expect(html).toContain('type="button"')
  })

  it('forwards disabled and custom className', () => {
    const html = renderToStaticMarkup(
      createElement(Button, { disabled: true, className: 'w-full' }, 'غیرفعال'),
    )
    expect(html).toContain('disabled')
    expect(html).toContain('w-full')
  })

  it('merges caller className over variant base via cn()', () => {
    const html = renderToStaticMarkup(
      createElement(Button, { variant: 'primary', className: 'rounded-none' }, 'x'),
    )
    // tailwind-merge should drop the base rounded-lg in favour of rounded-none
    expect(html).toContain('rounded-none')
    expect(html).not.toContain('rounded-lg')
  })
})
