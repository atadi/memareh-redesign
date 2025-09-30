'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArticleContent } from '@/components/articles/ArticleContent'
import { ArticleRating } from '@/components/articles/ArticleRating'
import { CommentSection } from '@/components/articles/CommentSection'
import { RelatedArticles } from '@/components/articles/RelatedArticles'
import { 
  Clock, 
  Eye, 
  Calendar, 
  User,
  Share2,
  Bookmark,
  Printer
} from 'lucide-react'
import { format } from 'date-fns-jalali'

// Define the Article type
interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image?: string
  category: string
  tags?: string[]
  view_count: number
  reading_time: number
  published_at: string
  allow_comments: boolean
  author: {
    full_name: string
    avatar_url?: string
    role?: string
  }
  ratings?: Array<{
    rating: number
    user_id: string
  }>
  comments?: Array<{
    id: string
    content: string
    status: string
    created_at: string
    parent_id?: string
    like_count: number
    is_pinned: boolean
    user: {
      full_name: string
      avatar_url?: string
    }
  }>
}

export default function ArticlePage() {
  const params = useParams()
  const [article, setArticle] = useState<Article | null>(null)  // ← Properly typed
  const [loading, setLoading] = useState(true)
  const [userRating, setUserRating] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (params.slug) {
      loadArticle()
    }
  }, [params.slug])

  useEffect(() => {
    // Only track view when article is loaded
    if (article?.id) {
      trackView()
    }
  }, [article])

  const loadArticle = async () => {
    if (!params.slug) return

    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        author:profiles!articles_author_id_fkey(full_name, avatar_url, role),
        ratings:article_ratings(rating, user_id),
        comments:article_comments(
          id,
          content,
          status,
          created_at,
          user:profiles!article_comments_user_id_fkey(full_name, avatar_url),
          parent_id,
          like_count,
          is_pinned
        )
      `)
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (data && !error) {
      setArticle(data as Article)
      
      // Check current user's rating
      const { data: { user } } = await supabase.auth.getUser()
      if (user && data.ratings) {
        const userRatingData = data.ratings.find((r: any) => r.user_id === user.id)
        setUserRating(userRatingData?.rating || 0)
      }
    }
    setLoading(false)
  }

  const trackView = async () => {
    if (!article?.id) return
    
    // Track view - handle error if RPC doesn't exist yet
    try {
      await supabase.rpc('increment_article_view', {
        article_uuid: article.id
      })
    } catch (error) {
      // If the function doesn't exist, just update view count directly
      await supabase
        .from('articles')
        .update({ view_count: article.view_count + 1 })
        .eq('id', article.id)
    }
  }

  const handleShare = async () => {
    if (!article) return
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('لینک مقاله کپی شد!')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">مقاله مورد نظر یافت نشد</p>
          <a href="/articles" className="text-blue-600 hover:underline mt-4 inline-block">
            بازگشت به لیست مقالات
          </a>
        </div>
      </div>
    )
  }

  return (
    <article className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav className="text-sm text-gray-600 mb-4">
              <a href="/" className="hover:text-blue-600">خانه</a>
              <span className="mx-2">/</span>
              <a href="/articles" className="hover:text-blue-600">مقالات</a>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{article.title}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {article.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(article.published_at), 'dd MMMM yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.reading_time} دقیقه مطالعه</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{article.view_count} بازدید</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                اشتراک‌گذاری
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                چاپ
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <Bookmark className="w-4 h-4" />
                ذخیره
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Featured Image */}
            {article.featured_image && (
              <img
                src={article.featured_image}
                alt={article.title}
                className="w-full rounded-lg mb-8"
              />
            )}

            {/* Article Content */}
            <ArticleContent content={article.content} />

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
                <span className="font-bold">برچسب‌ها:</span>
                {article.tags.map((tag, index) => {
                  return (
                    <a
                      key={index}
                      href={`/articles?tag=${tag}`}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-blue-100 transition-colors"
                    >
                      #{tag}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rating Section */}
          <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
            <ArticleRating
              articleId={article.id}
              currentRating={userRating}
              onRate={setUserRating}
            />
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
            <CommentSection
              articleId={article.id}
              comments={article.comments?.filter(c => c.status === 'approved') || []}
              allowComments={article.allow_comments}
            />
          </div>

          {/* Related Articles */}
          <div className="mt-8">
            <RelatedArticles
              currentArticleId={article.id}
              category={article.category}
            />
          </div>
        </div>
      </div>
    </article>
  )
}