import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/login'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
