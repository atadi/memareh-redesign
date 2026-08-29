import { getSiteUrl } from '@/lib/config'
import { buildSiteStructuredData } from '@/lib/seo'

export function SiteStructuredData() {
  const data = buildSiteStructuredData(getSiteUrl())

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
