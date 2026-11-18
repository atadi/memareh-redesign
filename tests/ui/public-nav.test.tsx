import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement, Fragment } from 'react'
import type { ReactNode } from 'react'

let mockPathname = '/'
const mockSetTheme = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: mockSetTheme }),
}))

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() })
  return { default: toast, Toaster: () => null }
})

vi.mock('@/components/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children),
}))

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}))

vi.mock('next/script', () => ({
  default: () => null,
}))

import Menu from '@/components/ui/Menu'
import { ArticleStickyCTA } from '@/components/articles/ArticleStickyCTA'
import GlobalClient from '@/components/GlobalClient'

describe('public header', () => {
  it('does not expose auth or admin entry points', () => {
    const html = renderToStaticMarkup(createElement(Menu))

    expect(html).not.toContain('ورود')
    expect(html).not.toContain('ثبت‌نام')
    expect(html).not.toContain('پنل مدیریت')
    expect(html).not.toContain('پروفایل')
    expect(html).not.toContain('خروج')

    expect(html).not.toContain('href="/login"')
    expect(html).not.toContain('href="/register"')
    expect(html).not.toContain('href="/admin"')
    expect(html).not.toContain('href="/profile"')
  })

  it('keeps the public navigation affordances', () => {
    const html = renderToStaticMarkup(createElement(Menu))

    expect(html).toContain('aria-label="منوی اصلی"')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/articles"')
    expect(html).toContain('خانه')
    expect(html).toContain('مقالات')
  })
})

describe('ArticleStickyCTA', () => {
  it('provides crawlable links back to home and articles', () => {
    const html = renderToStaticMarkup(createElement(ArticleStickyCTA))

    expect(html).toContain('aria-label="ناوبری مقاله"')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/articles"')
    expect(html).toContain('tel:+989126769048')
  })
})

describe('global navigation routing', () => {
  function renderAt(pathname: string) {
    mockPathname = pathname
    return renderToStaticMarkup(
      createElement(GlobalClient, null, createElement('div', null, 'page content')),
    )
  }

  beforeEach(() => {
    mockPathname = '/'
  })

  it('keeps the global Menu on normal pages', () => {
    expect(renderAt('/')).toContain('aria-label="منوی اصلی"')
  })

  it('keeps the global Menu on the articles index', () => {
    expect(renderAt('/articles')).toContain('aria-label="منوی اصلی"')
  })

  it('swaps in the article CTA on an article detail page', () => {
    const html = renderAt('/articles/example-slug')

    expect(html).toContain('aria-label="ناوبری مقاله"')
    expect(html).not.toContain('aria-label="منوی اصلی"')
  })
})