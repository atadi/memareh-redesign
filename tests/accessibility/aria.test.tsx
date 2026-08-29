import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

// ---------------------------------------------------------------------------
// Accessibility (ARIA) contract tests for key interactive components.
//
// We render the components to static markup with the Supabase client and
// next-themes stubbed, then assert the ARIA attributes required for WCAG 2.1 AA
// are present. Rendering (not jest-axe) is used because these client components
// instantiate a Supabase client on mount, which cannot run in the node unit
// environment without a live session. Static-markup assertions cover the same
// structural contract (roles, labels, live regions) the axe rule would check.
// ---------------------------------------------------------------------------

const fakeSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe() {} } } }),
    signOut: vi.fn().mockResolvedValue({}),
  },
  from: vi.fn().mockReturnValue({
    select: () => ({ single: () => ({ data: null }) }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: null }),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => fakeSupabase,
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

describe('ArticleRating — ARIA', () => {
  it('exposes an aria-live status region with a descriptive label', async () => {
    const { ArticleRating } = await import('../../src/components/articles/ArticleRating.js')
    const html = renderToStaticMarkup(
      createElement(ArticleRating, {
        articleId: 'abc',
        currentRating: 0,
        onRate: () => {},
      }) as any,
    )
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('role="status"')
    // Average stars are labelled images, not empty decorative icons.
    expect(html).toContain('role="img"')
    // Each rating button announces its value to screen readers.
    expect(html).toContain('aria-label="امتیاز 1 از ۵"')
    expect(html).toContain('aria-label="امتیاز 5 از ۵"')
    expect(html).toContain('aria-pressed')
  })
})

describe('Menu — ARIA', () => {
  it('labels the primary navigation landmark', async () => {
    const Menu = (await import('../../src/components/ui/Menu.js')).default as any
    const html = renderToStaticMarkup(createElement(Menu) as any)
    // The desktop nav is a labelled navigation landmark.
    expect(html).toContain('aria-label="منوی اصلی"')
    // Theme toggle button carries a stable (server-safe) label.
    expect(html).toContain('aria-label="تاریک کردن تم"')
  })
})
