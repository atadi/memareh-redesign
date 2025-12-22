"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArticleCard } from '@/components/articles/ArticleCard'

export function LatestArticles() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3)

        if (error) {
          console.error('Error loading articles:', error)
          return
        }

        console.log('Latest Articles loaded:', data)

        if (data) {
          // Filter out articles without valid slugs
          const validArticles = data.filter(article => article.slug && article.slug !== 'null')
          setArticles(validArticles)
        }
      } catch (e) {
        console.error('failed to load latest articles', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">آخرین مقالات</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

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
