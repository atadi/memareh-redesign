import { ArticleCard } from '@/components/articles/ArticleCard'

interface LatestArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image?: string
  category: string
  view_count: number
  reading_time?: number
  published_at: string
  author_name?: string
  averageRating?: number
  ratingCount?: number
  _count?: { comments: number }
}

export function LatestArticles({ articles }: { articles: LatestArticle[] }) {
  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">آخرین مقالات</h3>
        <p className="text-gray-600 text-center py-8">هیچ مقاله‌ای منتشر نشده است</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">آخرین مقالات</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {articles.map(article => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  )
}
