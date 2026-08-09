// Site-level structured data (Organization + WebSite), emitted once in the root
// layout so it is not duplicated per page. Article/Breadcrumb JSON-LD live on the
// article page. No social URLs, phone, address, or founding date are invented —
// only fields we can source confidently from the repo/config are included.

import { getSiteUrl } from '@/lib/config'
import { organizationId } from '@/lib/seo'

const SITE_NAME = 'معماره'

export function SiteStructuredData() {
  const siteUrl = getSiteUrl()
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId(siteUrl),
        name: SITE_NAME,
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/assets/logo/logo-square.svg`,
        },
      },
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: siteUrl,
        inLanguage: 'fa-IR',
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
