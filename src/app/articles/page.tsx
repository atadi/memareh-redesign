import { createClient } from '@/lib/supabase/server'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { ArticlesSidebar } from '@/components/articles/ArticlesSidebar'
import { BookOpen } from 'lucide-react'

export const revalidate = 300

interface PageProps {
  searchParams: Promise<{ category?: string; sort?: string }>
}

export default async function ArticlesPage({ searchParams }: PageProps) {
  const { category, sort } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  if (sort === 'popular') {
    query = query.order('view_count', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  const { data: articles, error } = await query

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>خطا:</strong> {error.message}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <ArticlesSidebar />

          <main className="lg:w-3/4">
            {articles && articles.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">مقاله‌ای یافت نشد</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
