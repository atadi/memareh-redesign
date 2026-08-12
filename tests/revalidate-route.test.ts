// Focused contract tests for the article revalidation webhook (POST /api/revalidate).
//
// Pure unit tests: next/cache is mocked so we assert the actual computed path set
// and auth behavior without a Next build. Covers both payload contracts:
//   - manual:     { type: "article", slug }
//   - Supabase DB trigger: { type, schema, table, record, old_record }
//
// Auth stays mandatory; an out-of-band webhook from a non-canonical source must
// NOT drive arbitrary invalidation; secrets are never echoed in responses.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type NextRequest } from 'next/server'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { POST } from '@/app/api/revalidate/route'
import { revalidatePath } from 'next/cache'

const mockedRevalidatePath = vi.mocked(revalidatePath)

// Fixed test token; never a real secret. The handler reads process.env.REVALIDATION_TOKEN.
const TOKEN = 'test-revalidation-token-00000000000000000000000000000000'

function jsonRequest(payload: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token !== undefined) headers['authorization'] = `Bearer ${token}`
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  }) as unknown as NextRequest
}

async function call(payload: unknown, token?: string) {
  const res = await POST(jsonRequest(payload, token))
  const data = (await res.json().catch(() => ({}))) as any
  return { status: res.status, data }
}

beforeEach(() => {
  process.env.REVALIDATION_TOKEN = TOKEN
  mockedRevalidatePath.mockClear()
})

// The route collects paths into a Set (insertion order: /articles, /, then
// detail slugs), so assert membership order-insensitively.
function calledPaths() {
  return mockedRevalidatePath.mock.calls.map((c: any[]) => c[0] as string).sort()
}

function sortedPaths(list: string[]) {
  return [...list].sort()
}

describe('authentication', () => {
  it('missing token -> 401', async () => {
    const { status } = await call({ type: 'article', slug: 'x' })
    expect(status).toBe(401)
    expect(mockedRevalidatePath).not.toHaveBeenCalled()
  })

  it('wrong token -> 401', async () => {
    const { status } = await call({ type: 'article', slug: 'x' }, 'wrong')
    expect(status).toBe(401)
    expect(mockedRevalidatePath).not.toHaveBeenCalled()
  })

  it('does NOT echo the token or any secret in the 401 body', async () => {
    const { status, data } = await call({ type: 'article', slug: 'x' }, 'wrong')
    expect(status).toBe(401)
    expect(JSON.stringify(data)).not.toContain(TOKEN)
    expect(JSON.stringify(data)).not.toMatch(/secret|token/i)
  })
})

describe('manual contract', () => {
  it('{ type: "article", slug } invalidates detail + list + home', async () => {
    const { status, data } = await call({ type: 'article', slug: 'foo-bar' }, TOKEN)
    expect(status).toBe(200)
    expect(calledPaths()).toEqual(sortedPaths(['/articles/foo-bar', '/articles', '/']))
    expect(data.revalidated).toBe(true)
  })
})

describe('Supabase DB-trigger contract', () => {
  const base = { schema: 'memareh', table: 'articles' }

  it('INSERT invalidates new slug detail + list + home', async () => {
    const { status } = await call(
      { ...base, type: 'INSERT', record: { slug: 'new-slug' }, old_record: null },
      TOKEN,
    )
    expect(status).toBe(200)
    expect(calledPaths()).toEqual(sortedPaths(['/articles/new-slug', '/articles', '/']))
  })

  it('UPDATE (same slug) invalidates detail + list + home (no double purge)', async () => {
    const { status } = await call(
      { ...base, type: 'UPDATE', record: { slug: 'same' }, old_record: { slug: 'same' } },
      TOKEN,
    )
    expect(status).toBe(200)
    expect(calledPaths()).toEqual(sortedPaths(['/articles/same', '/articles', '/']))
  })

  it('UPDATE with slug rename invalidates BOTH old and new detail paths', async () => {
    const { status } = await call(
      { ...base, type: 'UPDATE', record: { slug: 'new-slug' }, old_record: { slug: 'old-slug' } },
      TOKEN,
    )
    expect(status).toBe(200)
    expect(calledPaths()).toEqual(
      sortedPaths(['/articles/old-slug', '/articles/new-slug', '/articles', '/']),
    )
  })

  it('DELETE invalidates old slug detail + list + home', async () => {
    const { status } = await call(
      { ...base, type: 'DELETE', record: null, old_record: { slug: 'gone-slug' } },
      TOKEN,
    )
    expect(status).toBe(200)
    expect(calledPaths()).toEqual(sortedPaths(['/articles/gone-slug', '/articles', '/']))
  })

  it('unsupported schema/table is rejected (no arbitrary invalidation)', async () => {
    const { status } = await call(
      {
        schema: 'other',
        table: 'things',
        type: 'UPDATE',
        record: { slug: 'hack' },
        old_record: { slug: 'hack' },
      },
      TOKEN,
    )
    // Mismatched source must be rejected, so no paths are invalidated.
    expect(status).toBe(401)
    expect(mockedRevalidatePath).not.toHaveBeenCalled()
  })

  it('malformed JSON body does not crash or purge arbitrary slugs', async () => {
    const req = new Request('http://localhost/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: '{not-json',
    }) as unknown as NextRequest
    const res = await POST(req)
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(calledPaths().filter((p) => p.startsWith('/articles/'))).toHaveLength(0)
    }
  })
})
