// Contract tests for article public-cache invalidation.
//
// These are PURE unit tests (no Next build, no DB). They mock `next/cache` and the
// canonical admin guard so we can assert the invalidation LOGIC — which paths are
// purged for each mutation type, and that an auth failure is surfaced (never swallowed)
// rather than the route left stale.
//
// We deliberately assert the *computed path set*, not merely "revalidatePath was called",
// so the test verifies real behavior instead of its own mock setup.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Next.js cache API and the server-only admin guard BEFORE importing the action.
// Use inline vi.fn() inside the factories (they are hoisted above top-level consts).
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin/guard', () => ({ assertIsAdmin: vi.fn() }))

import {
  invalidateArticlePaths,
  revalidateArticle,
  revalidateAllArticles,
} from '@/actions/revalidate'
import { revalidatePath } from 'next/cache'
import { assertIsAdmin } from '@/lib/admin/guard'

// Typed handles to the vitest mocks (vi.mock replaces these at runtime).
const mockedRevalidatePath = vi.mocked(revalidatePath)
const mockedAssertIsAdmin = vi.mocked(assertIsAdmin)

beforeEach(() => {
  mockedRevalidatePath.mockClear()
  mockedAssertIsAdmin.mockReset()
  mockedAssertIsAdmin.mockResolvedValue({ id: 'admin-1' } as any)
})

function calledPaths() {
  return mockedRevalidatePath.mock.calls.map((c: any[]) => c[0] as string)
}

describe('invalidateArticlePaths — path computation', () => {
  it('update of an existing article purges detail + list + home', async () => {
    const res = await invalidateArticlePaths({ slug: 'foo-bar' })
    expect(res.ok).toBe(true)
    expect(calledPaths()).toEqual([
      '/articles/foo-bar',
      '/articles',
      '/',
    ])
  })

  it('slug change purges BOTH old and new detail routes (no stale old URL)', async () => {
    const res = await invalidateArticlePaths({ slug: 'new-slug', oldSlug: 'old-slug' })
    expect(res.ok).toBe(true)
    expect(calledPaths()).toEqual([
      '/articles/old-slug',
      '/articles/new-slug',
      '/articles',
      '/',
    ])
  })

  it('slug unchanged (oldSlug === slug) does NOT double-purge the detail route', async () => {
    const res = await invalidateArticlePaths({ slug: 'same', oldSlug: 'same' })
    expect(res.ok).toBe(true)
    expect(calledPaths()).toEqual(['/articles/same', '/articles', '/'])
  })

  it('publish toggle (via revalidateArticle wrapper) purges detail + list + home', async () => {
    const res = await revalidateArticle('pub-slug')
    expect(res.ok).toBe(true)
    expect(calledPaths()).toEqual(['/articles/pub-slug', '/articles', '/'])
  })

  it('revalidateAllArticles purges list (layout) + home', async () => {
    const res = await revalidateAllArticles()
    expect(res.ok).toBe(true)
    expect(calledPaths()).toEqual(['/articles', '/'])
    // layout variant used for the list route
    expect(mockedRevalidatePath.mock.calls[0][1]).toBe('layout')
  })
})

describe('invalidateArticlePaths — authorization + failure surfacing', () => {
  it('non-admin is denied and NO route is purged (stale cache avoided, failure surfaced)', async () => {
    mockedAssertIsAdmin.mockRejectedValue(new Error('Forbidden'))
    const res = await invalidateArticlePaths({ slug: 'secret' })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Forbidden')
    expect(res.invalidated).toEqual([])
    expect(mockedRevalidatePath).not.toHaveBeenCalled()
  })

  it('unexpected admin-guard error is surfaced, not swallowed', async () => {
    mockedAssertIsAdmin.mockRejectedValue(new Error('boom'))
    const res = await invalidateArticlePaths({ slug: 'x' })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('boom')
    expect(mockedRevalidatePath).not.toHaveBeenCalled()
  })
})

describe('mutation-to-invalidation contract (no duplicate DB mutation on revalidation failure)', () => {
  it('invalidation failure returns a structured result without re-running any DB write', async () => {
    // The action only calls revalidatePath; it never mutates the DB itself.
    // A failure therefore cannot cause a duplicate article write.
    mockedAssertIsAdmin.mockRejectedValue(new Error('Unauthorized'))
    const res = await invalidateArticlePaths({ slug: 'y', oldSlug: 'z' })
    expect(res.ok).toBe(false)
    // exactly the auth check ran; no path purged
    expect(mockedAssertIsAdmin).toHaveBeenCalledTimes(1)
    expect(mockedRevalidatePath).not.toHaveBeenCalled()
  })
})
