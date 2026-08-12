import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

// Authoritative source contract for outside-band (database webhook) invalidation.
// The Supabase trigger on memareh.articles sends this shape (see
// memareh.notify_article_revalidation):
//   { type: 'INSERT'|'UPDATE'|'DELETE', table, schema, record, old_record }
// We only act on the memareh.articles source; arbitrary webhook payloads are
// rejected so a caller cannot trigger arbitrary path invalidations.
const DB_WEBHOOK_SCHEMA = 'memareh'
const DB_WEBHOOK_TABLE = 'articles'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.REVALIDATION_TOKEN

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    // Collect every path that must be invalidated into a Set so duplicate slugs
    // (e.g. an UPDATE that does not rename the slug) are not revalidated twice.
    const paths = new Set<string>()
    paths.add('/articles')
    paths.add('/')

    const addDetail = (slug: unknown) => {
      if (typeof slug === 'string' && slug.length > 0) {
        paths.add(`/articles/${slug}`)
      }
    }

    // Manual/admin contract (kept for backward compatibility):
    //   { type: 'article', slug }
    if (body.type === 'article' && typeof body.slug === 'string') {
      addDetail(body.slug)
    }

    // Supabase database-webhook contract.
    if (
      typeof body.schema === 'string' &&
      typeof body.table === 'string' &&
      typeof body.type === 'string'
    ) {
      // Reject payloads that do not originate from the article source.
      if (body.schema !== DB_WEBHOOK_SCHEMA || body.table !== DB_WEBHOOK_TABLE) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const record = body.record as Record<string, unknown> | null
      const oldRecord = body.old_record as Record<string, unknown> | null
      const newSlug = record?.slug
      const oldSlug = oldRecord?.slug

      switch (body.type) {
        case 'INSERT':
          addDetail(newSlug)
          break
        case 'UPDATE':
          // Invalidate both when a slug rename occurs.
          addDetail(oldSlug)
          addDetail(newSlug)
          break
        case 'DELETE':
          addDetail(oldSlug)
          break
        default:
          // Unknown operation: still purge the list/home, but do not guess a slug.
          break
      }
    }

    for (const path of paths) {
      revalidatePath(path)
    }

    return NextResponse.json({ revalidated: true, paths: [...paths] })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
