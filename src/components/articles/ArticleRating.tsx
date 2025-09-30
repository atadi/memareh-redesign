'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface ArticleRatingProps {
  articleId: string
  currentRating: number
  onRate: (rating: number) => void
}

export function ArticleRating({ articleId, currentRating, onRate }: ArticleRatingProps) {
  const [hoveredStar, setHoveredStar] = useState(0)
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  })
  const supabase = createClient()

  // بارگذاری آمار امتیازات
  useEffect(() => {
    loadRatingStats()
  }, [articleId])

  const loadRatingStats = async () => {
    const { data } = await supabase.rpc('calculate_article_rating', {
      article_uuid: articleId
    })

    if (data) {
      setStats({
        average: data.average_rating || 0,
        total: data.total_ratings || 0,
        distribution: data.rating_distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      })
    }
  }

  const handleRate = async (rating: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('برای امتیاز دادن باید وارد شوید')
      return
    }

    // ثبت یا بروزرسانی امتیاز
    const { error } = await supabase
      .from('article_ratings')
      .upsert({
        article_id: articleId,
        user_id: user.id,
        rating: rating
      }, {
        onConflict: 'article_id,user_id'
      })

    if (error) {
      toast.error('خطا در ثبت امتیاز')
    } else {
      toast.success('امتیاز شما ثبت شد')
      onRate(rating)
      loadRatingStats()
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">امتیاز مقاله</h3>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Rating Summary */}
        <div className="flex-1">
          <div className="text-center md:text-right">
            <div className="text-4xl font-bold text-yellow-500">
              {stats.average.toFixed(1)}
            </div>
            <div className="flex justify-center md:justify-start gap-1 my-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(stats.average)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600">
              از مجموع {stats.total} رای
            </div>
          </div>

          {/* Distribution Bars */}
          <div className="mt-4 space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const percentage = stats.total > 0 
                ? (stats.distribution[rating as keyof typeof stats.distribution] / stats.total) * 100 
                : 0
              
              return (
                <div key={rating} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm">{rating}</span>
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-left">
                    {stats.distribution[rating as keyof typeof stats.distribution]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* User Rating */}
        <div className="flex-1">
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-3">
              {currentRating > 0 
                ? `امتیاز شما: ${currentRating} ستاره` 
                : 'امتیاز خود را ثبت کنید'}
            </p>
            
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredStar || currentRating)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              با کلیک روی ستاره‌ها امتیاز دهید
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}