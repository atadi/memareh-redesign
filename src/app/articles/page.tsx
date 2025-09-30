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
  Search
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
  // Additional computed properties
  averageRating?: number
  ratingCount?: number
}

export default function ArticlesPage() {
  // Properly type the state
  const [articles, setArticles] = useState<Article[]>([])  // ✅ Fixed: explicitly typed
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('newest')
  const supabase = createClient()

  useEffect(() => {
    loadArticles()
  }, [selectedCategory, sortBy])

  const loadArticles = async () => {
    let query = supabase
      .from('articles')
      .select(`
        *,
        author:profiles(full_name, avatar_url),
        ratings:article_ratings(rating),
        comments:article_comments(count)
      `)
      .eq('status', 'published')

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory)
    }

    if (sortBy === 'newest') {
      query = query.order('published_at', { ascending: false })
    } else if (sortBy === 'popular') {
      query = query.order('view_count', { ascending: false })
    } else if (sortBy === 'rating') {
      // Sort by rating would need to be done client-side after fetching
      query = query.order('published_at', { ascending: false })
    }

    const { data, error } = await query

    if (data && !error) {
      // Transform the data with proper typing
      const articlesWithRating: Article[] = data.map((article: any) => {
        const ratings = article.ratings || []
        const averageRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / ratings.length
          : 0
        
        return {
          ...article,
          averageRating,
          ratingCount: ratings.length
        } as Article  // Cast to Article type
      })

      // If sorting by rating, sort the array
      if (sortBy === 'rating') {
        articlesWithRating.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      }

      setArticles(articlesWithRating)  // ✅ Now this works!
    }
    setLoading(false)
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
          <h1 className="text-4xl font-bold mb-4">مقالات و آموزش‌های برق</h1>
          <p className="text-xl opacity-90">
            آموزش‌های کاربردی، نکات ایمنی و راهنمای عیب‌یابی
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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

              {/* Sort Options */}
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

          {/* Main Content - Articles Grid */}
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