import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/config'
import { getPublishedArticlesForSitemap } from '@/lib/articles'
import { buildPublicSitemap } from '@/lib/seo'

// CMS-backed: reflect published/removed/slug-changed articles within ~5 minutes
// without requiring a new application deployment.
export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticlesForSitemap()
  return buildPublicSitemap(getSiteUrl(), articles)
}
