// Public, read-only article data access used at BUILD TIME (generateStaticParams,
// sitemap) and at runtime. Uses the PUBLIC/anonymous Supabase client only.
//
// No service-role access here. Published articles are readable by the anon key
// under the existing "Public read published articles" RLS policy, so build-time
// article enumeration does NOT require privileged credentials (Phase A / PERF-02).
//
// Failure model (Phase A §11):
// - Missing REQUIRED config (NEXT_PUBLIC_SUPABASE_URL) -> getSupabaseUrl() throws
//   and the build FAILS FAST with a clear message.
// - Temporary upstream/data failure during the query -> we FAIL SOFT and return
//   an empty result, so `next build` still succeeds and ISR serves articles at
//   request time (the article page fetches its own data).

import { createPublicClient } from '@/lib/supabase/server-public'
import { getSupabaseUrl } from '@/lib/config'

export interface ArticleSlug {
  slug: string
}

export interface SitemapArticle {
  slug: string
  updated_at: string | null
}

/**
 * Slugs of all published articles (non-null slug) for static generation.
 * Returns [] on upstream failure (fail-soft); throws on missing config.
 */
export async function getPublishedArticleSlugs(): Promise<ArticleSlug[]> {
  getSupabaseUrl() // fail-fast on missing required config
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('articles')
      .select('slug')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .limit(1000)

    if (error) {
      console.error('[articles] failed to load published slugs:', error.message)
      return []
    }
    return (data ?? []).filter(
      (a): a is ArticleSlug => typeof a.slug === 'string' && a.slug.length > 0,
    )
  } catch (err) {
    console.error(
      '[articles] failed to load published slugs:',
      err instanceof Error ? err.message : String(err),
    )
    return []
  }
}

/**
 * Published articles for the sitemap (slug + last modified only).
 * Returns [] on upstream failure (fail-soft); throws on missing config.
 */
export async function getPublishedArticlesForSitemap(): Promise<SitemapArticle[]> {
  getSupabaseUrl() // fail-fast on missing required config
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .limit(1000)

    if (error) {
      console.error('[articles] sitemap query failed:', error.message)
      return []
    }
    return (data ?? []).filter(
      (a): a is SitemapArticle => typeof a.slug === 'string' && a.slug.length > 0,
    )
  } catch (err) {
    console.error(
      '[articles] sitemap query failed:',
      err instanceof Error ? err.message : String(err),
    )
    return []
  }
}
