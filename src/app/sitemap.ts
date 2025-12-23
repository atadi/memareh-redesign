import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // or anon if public
  )

  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_at')
    .eq('published', true)

  const baseUrl = 'https://memareh.com'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    ...(articles ?? []).map((article) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: article.updated_at
        ? new Date(article.updated_at)
        : new Date(),
    })),
  ]
}
