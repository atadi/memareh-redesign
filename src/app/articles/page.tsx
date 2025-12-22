'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { ArticleFilters } from '@/components/articles/ArticleFilters'
import {
  BookOpen,
  TrendingUp,
  Clock,
  Eye,
  Star,
  Filter,
  Shield,
  Wrench,
  Lightbulb,
  Cpu,
  Settings,
  Search,
  ArrowRight
} from 'lucide-react'

// Define the Article type
interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image?: string
  category: string
  tags?: string[]
  view_count: number
  reading_time?: number
  published_at: string
  created_at: string
  author?: {
    full_name: string
    avatar_url?: string
  }
  ratings?: Array<{
    rating: number
    user_id?: string
  }>
  comments?: any[]
  _count?: {
    comments: number
  }
  averageRating?: number
  ratingCount?: number
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('newest')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadArticles()
  }, [selectedCategory, sortBy])

  const loadArticles = async () => {
    try {
      // ✅ Create client inside the function
      const supabase = createClient()
      
      // Debug logging
      console.log('🔍 Fetching articles with:', {
        category: selectedCategory,
        sortBy,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      })

      let query = supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      if (sortBy === 'newest') {
        query = query.order('published_at', { ascending: false })
      } else if (sortBy === 'popular') {
        query = query.order('view_count', { ascending: false })
      } else if (sortBy === 'rating') {
        query = query.order('published_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.error('❌ Error loading articles:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      console.log('✅ Articles loaded:', data?.length)
      if (data) {
        setArticles(data as Article[])
      }
      setError(null)
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      setError('Failed to load articles')
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { value: 'all', label: 'همه مقالات', icon: BookOpen },
    { value: 'safety_tips', label: 'نکات ایمنی', icon: Shield },
    { value: 'diy_guide', label: 'آموزش تعمیرات', icon: Wrench },
    { value: 'energy_saving', label: 'صرفه‌جویی انرژی', icon: Lightbulb },
    { value: 'new_tech', label: 'تکنولوژی جدید', icon: Cpu },
    { value: 'maintenance', label: 'نگهداری', icon: Settings },
    { value: 'troubleshooting', label: 'عیب‌یابی', icon: Search },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی</span>
          </a>

          <h1 className="text-4xl font-bold mb-4">مقالات و آموزش‌های برق</h1>
          <p className="text-xl opacity-90">
            آموزش‌های کاربردی، نکات ایمنی و راهنمای عیب‌یابی
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Show error if any */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>خطا:</strong> {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Categories */}
          <aside className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                دسته‌بندی‌ها
              </h2>
              
              <div className="space-y-2">
                {categories.map(cat => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`w-full text-right px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                        selectedCategory === cat.value
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-bold mb-3">مرتب‌سازی</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="newest">جدیدترین</option>
                  <option value="popular">پربازدیدترین</option>
                  <option value="rating">بالاترین امتیاز</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:w-3/4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">در حال بارگذاری مقالات...</p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {articles.map(article => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>

                {articles.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">مقاله‌ای یافت نشد</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}