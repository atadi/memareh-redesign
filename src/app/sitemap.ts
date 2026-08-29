import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/config'
import { getPublishedArticlesForSitemap } from '@/lib/articles'
import { buildPublicSitemap } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticlesForSitemap()
  return buildPublicSitemap(getSiteUrl(), articles)
}
