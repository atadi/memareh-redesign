'use client'

import Link from 'next/link'
import { 
  Clock, 
  Eye, 
  MessageCircle, 
  Star,
  Calendar,
  User,
  ArrowLeft
} from 'lucide-react'

interface ArticleCardProps {
  article: {
    id: string
    title: string
    slug: string
    excerpt: string
    featured_image?: string
    category: string
    view_count: number
    reading_time?: number
    published_at: string
    author?: {
      full_name: string
      avatar_url?: string
    }
    averageRating?: number
    ratingCount?: number
    _count?: {
      comments: number
    }
  }
}

export function ArticleCard({ article }: ArticleCardProps) {
  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      safety_tips: 'نکات ایمنی',
      diy_guide: 'آموزش تعمیرات',
      energy_saving: 'صرفه‌جویی انرژی',
      new_tech: 'تکنولوژی جدید',
      maintenance: 'نگهداری',
      troubleshooting: 'عیب‌یابی',
      regulations: 'قوانین و مقررات',
      case_studies: 'مطالعات موردی'
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      safety_tips: 'bg-red-100 text-red-700',
      diy_guide: 'bg-blue-100 text-blue-700',
      energy_saving: 'bg-green-100 text-green-700',
      new_tech: 'bg-purple-100 text-purple-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      troubleshooting: 'bg-orange-100 text-orange-700',
      regulations: 'bg-gray-100 text-gray-700',
      case_studies: 'bg-indigo-100 text-indigo-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = [
      'فروردین', 'اردیبهشت', 'خرداد',
      'تیر', 'مرداد', 'شهریور', 
      'مهر', 'آبان', 'آذر',
      'دی', 'بهمن', 'اسفند'
    ]
    
    // Simple Persian date representation (you might want to use a proper library)
    const month = months[date.getMonth()] || months[0]
    const day = date.getDate()
    
    return `${day} ${month}`
  }

  return (
    <article className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <Link href={`/articles/${article.slug}`}>
        {/* Image Section */}
        <div className="aspect-video relative overflow-hidden bg-gray-100">
          {article.featured_image ? (
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
              <svg
                className="w-20 h-20 text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          )}
          
          {/* Category Badge */}
          <div className="absolute top-3 right-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(article.category)}`}>
              {getCategoryLabel(article.category)}
            </span>
          </div>

          {/* Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content Section */}
        <div className="p-5">
          <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {article.title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {article.excerpt}
          </p>
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{article.view_count}</span>
            </div>
            
            {article.reading_time && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.reading_time} دقیقه</span>
              </div>
            )}
            
            {article._count?.comments !== undefined && (
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{article._count.comments}</span>
              </div>
            )}
            
            {article.averageRating && article.averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span>{article.averageRating.toFixed(1)}</span>
                {article.ratingCount && (
                  <span className="text-gray-400">({article.ratingCount})</span>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              {article.author?.avatar_url ? (
                <img
                  src={article.author.avatar_url}
                  alt={article.author.full_name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-3 h-3 text-gray-500" />
                </div>
              )}
              <span className="text-xs text-gray-600">
                {article.author?.full_name || 'ناشناس'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-gray-400" />
              <time className="text-xs text-gray-500">
                {formatDate(article.published_at)}
              </time>
            </div>
          </div>

          {/* Read More Link */}
          <div className="mt-3 text-blue-600 text-sm font-medium group-hover:gap-2 flex items-center transition-all">
            مطالعه بیشتر
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:mr-2 transition-all" />
          </div>
        </div>
      </Link>
    </article>
  )
}