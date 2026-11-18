'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  BookOpen,
  Clock,
  Eye,
  ChevronLeft,
  Star,
} from 'lucide-react'

interface RelatedArticlesProps {
  currentArticleId: string
}

interface RelatedArticle {
  id: string
  title: string
  slug: string | null
  excerpt: string | null
  featured_image: string | null
  view_count: number | null
  reading_time: number | null
  author: { display_name: string | null } | null
  ratings: { rating: number }[]
}

export function RelatedArticles({ currentArticleId }: RelatedArticlesProps) {
  const [articles, setArticles] = useState<RelatedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let active = true

    const loadRelatedArticles = async () => {
      const { data, error } = await supabase
        .from('article_related_articles')
        .select(`
          position,
          related_article:articles!article_related_articles_related_article_id_fkey(
            id,
            title,
            slug,
            excerpt,
            featured_image,
            view_count,
            reading_time,
            author:profiles(display_name),
            ratings:article_ratings(rating)
          )
        `)
        .eq('article_id', currentArticleId)
        .order('position', { ascending: true })

      if (!active) return

      const visibleArticles = (data ?? [])
        .map((relation) => {
          const related = Array.isArray(relation.related_article)
            ? relation.related_article[0]
            : relation.related_article
          return related as unknown as RelatedArticle | null
        })
        .filter((article): article is RelatedArticle => Boolean(article))

      if (error) {
        console.error('[related-articles] failed to load:', error)
      }
      setArticles(visibleArticles)
      setLoading(false)
    }

    void loadRelatedArticles()
    return () => {
      active = false
    }
  }, [currentArticleId, supabase])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-6">مقالات مرتبط</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-4" />
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-2" />
              <div className="bg-gray-200 h-4 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (articles.length === 0) return null

  return (
    <div className="bg-gray-50 rounded-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          مقالات مرتبط
        </h3>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {articles.slice(0, 3).map(article => {
          const ratings = article.ratings || []
          const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
            : 0

          return (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              {article.featured_image ? (
                <ArticleImage src={article.featured_image} alt={article.title} />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-blue-300" />
                </div>
              )}

              <div className="p-4">
                <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h4>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
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
                  {averageRating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{averageRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                  نویسنده: {article.author?.display_name}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

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

function ArticleImage({ src, alt }: { src: string; alt: string }) {
  const [imgError, setImgError] = useState(false)

  if (imgError || !src.startsWith('http')) {
    return (
      <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
        <BookOpen className="w-16 h-16 text-blue-300" />
      </div>
    )
  }

  return (
    <div className="aspect-video relative overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        onError={() => setImgError(true)}
        className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
