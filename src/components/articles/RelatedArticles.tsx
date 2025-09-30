'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  Clock, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react'

interface RelatedArticlesProps {
  currentArticleId: string
  category: string
}

export function RelatedArticles({ currentArticleId, category }: RelatedArticlesProps) {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const supabase = createClient()
  const articlesPerPage = 3

  useEffect(() => {
    loadRelatedArticles()
  }, [currentArticleId, category])

  const loadRelatedArticles = async () => {
    // First, try to get articles from the same category
    let { data: relatedArticles } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        featured_image,
        view_count,
        reading_time,
        published_at,
        author:profiles(full_name),
        ratings:article_ratings(rating)
      `)
      .eq('status', 'published')
      .eq('category', category)
      .neq('id', currentArticleId)
      .order('published_at', { ascending: false })
      .limit(6)

    // If not enough articles in the same category, get more from other categories
    if (!relatedArticles || relatedArticles.length < 3) {
      const { data: moreArticles } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image,
          view_count,
          reading_time,
          published_at,
          author:profiles(full_name),
          ratings:article_ratings(rating)
        `)
        .eq('status', 'published')
        .neq('id', currentArticleId)
        .order('view_count', { ascending: false })
        .limit(6)
      
      relatedArticles = [...(relatedArticles || []), ...(moreArticles || [])]
        .slice(0, 6)
    }

    // Calculate average rating for each article
    const articlesWithRating = relatedArticles?.map(article => {
      const ratings = article.ratings || []
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0
      return {
        ...article,
        averageRating,
        ratingCount: ratings.length
      }
    }) || []

    setArticles(articlesWithRating)
    setLoading(false)
  }

  const totalPages = Math.ceil(articles.length / articlesPerPage)
  const displayedArticles = articles.slice(
    currentPage * articlesPerPage,
    (currentPage + 1) * articlesPerPage
  )

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-6">مقالات مرتبط</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (articles.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 rounded-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          مقالات مرتبط
        </h3>
        
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {displayedArticles.map(article => (
          <Link
            key={article.id}
            href={`/articles/${article.slug}`}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group"
          >
            {/* Article Image */}
            {article.featured_image ? (
              <div className="aspect-video relative overflow-hidden">
                <Image
                  src={article.featured_image}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-blue-300" />
              </div>
            )}

            {/* Article Content */}
            <div className="p-4">
              <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {article.title}
              </h4>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {article.excerpt}
              </p>
              
              {/* Article Meta */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  {article.reading_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.reading_time} دقیقه
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.view_count}
                  </span>
                </div>
                
                {article.averageRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{article.averageRating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Author */}
              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                نویسنده: {article.author?.full_name}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Articles Link */}
      <div className="text-center mt-8">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          مشاهده همه مقالات
          <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}