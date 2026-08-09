import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/config'
import { getPublishedArticlesForSitemap } from '@/lib/articles'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()

  const articles = await getPublishedArticlesForSitemap()

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    ...articles.map((article) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
    })),
  ]
}
