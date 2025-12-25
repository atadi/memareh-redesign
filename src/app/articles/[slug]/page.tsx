import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArticleInteractions from './ArticleInteractions'

export const revalidate = 300 // ISR – 5 minutes

// -----------------------------
// Metadata (SEO)
// -----------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('articles')
    .select('title, excerpt, featured_image')
    .eq('slug', slug)
    .limit(1)

  const article = data?.[0]
  if (!article) return {}

  return {
    title: article.title,
    description: article.excerpt,
    metadataBase: new URL('http://localhost:3000'), // change in prod
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      images: article.featured_image ? [article.featured_image] : [],
    },
  }
}

// -----------------------------
// Page
// -----------------------------
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .limit(1)

  const article = data?.[0]
  if (error || !article) notFound()

  return (
    <article className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold mb-2">{article.title}</h1>

          {/* Client-side interactions */}
          <ArticleInteractions articleId={article.id} />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 bg-white">
        {article.featured_image && (
          <img
            src={article.featured_image}
            alt={article.title}
            className="w-full rounded-xl mb-8"
          />
        )}

      <div
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      </main>
    </article>
  )
}
