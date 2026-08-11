'use server'

// Server-side public-cache invalidation for article mutations.
//
// DESIGN (Fix Article Publish-to-Public Cache Invalidation):
// - Every public article mutation (create / edit / publish / unpublish / delete / slug
//   change) must purge the affected Full Route Cache entries so the new content appears
//   on the next public request, without waiting for the 300s ISR window or a redeploy.
// - Authorization is enforced SERVER-SIDE via the canonical admin guard (assertIsAdmin),
//   never trusting client UI state. No privileged credential (service role) is used or
//   exposed; the publishable (anon) key + session cookie is sufficient because RLS
//   permits the authenticated admin to mutate articles.
// - Failure is NEVER swallowed. The action returns a structured result so the caller can
//   tell the admin "saved, but cache refresh failed" instead of pretending everything worked.
// - The DB mutation itself stays client-side (the editor also uploads images to storage and
//   syncs tags); this module owns ONLY the cache-invalidation half of the contract, which is
//   awaited by the caller immediately after the DB write succeeds and BEFORE the editor unmounts.
//
// revalidatePath is called from a Server Action (Server Function). Per Next.js, revalidatePath
// inside a Server Action invalidates the Full Route Cache / Data Cache for the given path,
// which is exactly what we need. (A Route Handler would also work, but the Server Action is
// the correct boundary here because it runs within the authenticated admin request.)

import { revalidatePath } from 'next/cache'
import { assertIsAdmin } from '@/lib/admin/guard'

export interface InvalidationResult {
  /** false => admin auth failed OR an unexpected error occurred; cache NOT purged. */
  ok: boolean
  /** human-readable reason when ok=false */
  error?: string
  /** paths actually passed to revalidatePath (empty when !ok) */
  invalidated: string[]
}

/**
 * Invalidate the public routes affected by an article mutation.
 *
 * @param slug     the (new) article slug after the mutation
 * @param oldSlug  the previous slug when a slug change occurred (so the stale old route is purged too)
 */
export async function invalidateArticlePaths(opts: {
  slug?: string | null
  oldSlug?: string | null
}): Promise<InvalidationResult> {
  try {
    // Server-side authorization — canonical guard, same source the rest of the app uses.
    await assertIsAdmin()

    const invalidated: string[] = []
    const slug = opts.slug || undefined
    const oldSlug = opts.oldSlug || undefined

    // Slug change: purge the OLD route too, otherwise it stays cached.
    if (oldSlug && oldSlug !== slug) {
      revalidatePath(`/articles/${oldSlug}`)
      invalidated.push(`/articles/${oldSlug}`)
    }

    if (slug) {
      revalidatePath(`/articles/${slug}`)
      invalidated.push(`/articles/${slug}`)
    }

    // List + homepage always reflect an article change.
    revalidatePath('/articles')
    revalidatePath('/')
    invalidated.push('/articles', '/')

    return { ok: true, invalidated }
  } catch (e) {
    // Auth failure or unexpected error: do NOT pretend success. Surface it.
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'invalidation failed',
      invalidated: [],
    }
  }
}

/**
 * Back-compat thin wrapper (used by comment moderation). Returns the structured result
 * instead of swallowing errors. Callers that need the result should await it.
 */
export async function revalidateArticle(slug?: string): Promise<InvalidationResult> {
  return invalidateArticlePaths({ slug })
}

/** Invalidate the article list + homepage (used by profile page, bulk-ish refreshes). */
export async function revalidateAllArticles(): Promise<InvalidationResult> {
  try {
    await assertIsAdmin()
    revalidatePath('/articles', 'layout')
    revalidatePath('/')
    return { ok: true, invalidated: ['/articles', '/'] }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'invalidation failed',
      invalidated: [],
    }
  }
}
