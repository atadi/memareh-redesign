import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

// Authoritative source contract for outside-band (database webhook) invalidation.
// The Supabase AFTER trigger (memareh.trg_revalidate_articles ->
// memareh.notify_article_revalidation) posts the rich change payload below.
// We only act on webhooks from the canonical article source to avoid letting
// arbitrary webhook payloads drive arbitrary path invalidation.
const SOURCE_SCHEMA = 'memareh'
const SOURCE_TABLE = 'articles'

type ChangeOp = 'INSERT' | 'UPDATE' | 'DELETE'

interface DbWebhookPayload {
  type?: string
  table?: string
  schema?: string
  record?: { slug?: string } | null
  old_record?: { slug?: string } | null
}

interface ManualPayload {
  type?: string
  slug?: string
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.REVALIDATION_TOKEN

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      // TEMP diagnostic: expose only token LENGTHS (never the secret) to pinpoint
      // the revalidation auth mismatch. Remove after root-cause confirmed.
      const recv =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : ''
      return NextResponse.json(
        { error: 'Unauthorized', recvLen: recv.length, expLen: (expectedToken || '').length },
        { status: 401 },
      )
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    // Normalize paths, deduplicating identical detail slugs so a slug rename
    // (old + new) is purged exactly once each. List + home are always purged.
    const paths = new Set<string>()
    paths.add('/articles')
    paths.add('/')

    // Manual contract: { type: "article", slug }
    const manual = body as ManualPayload
    if (manual.type === 'article' && manual.slug) {
      paths.add(`/articles/${manual.slug}`)
    }

    // Supabase trigger contract: { type: "INSERT"|"UPDATE"|"DELETE", schema, table, record, old_record }
    const db = body as DbWebhookPayload
    const op = (db.type ?? '').toUpperCase()
    const slug = (db.record?.slug ?? '').trim()
    const oldSlug = (db.old_record?.slug ?? '').trim()

    // Only trust webhooks that originate from the canonical article source.
    if (db.schema === SOURCE_SCHEMA && db.table === SOURCE_TABLE && (op === 'INSERT' || op === 'UPDATE' || op === 'DELETE')) {
      if (op === 'DELETE') {
        if (oldSlug) paths.add(`/articles/${oldSlug}`)
      } else {
        if (slug) paths.add(`/articles/${slug}`)
        // UPDATE where the slug changed: invalidate BOTH old and new detail paths.
        if (op === 'UPDATE' && oldSlug && oldSlug !== slug) {
          paths.add(`/articles/${oldSlug}`)
        }
      }
    }

    for (const p of paths) {
      revalidatePath(p)
    }

    return NextResponse.json({ revalidated: true, paths: [...paths] })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
