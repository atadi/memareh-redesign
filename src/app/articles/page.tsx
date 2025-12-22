'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
// ... other imports

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating'>('newest')
  const [error, setError] = useState<string | null>(null)

  // 🔍 ADD THIS DEBUG USEEFFECT
  useEffect(() => {
    console.log('🔍 Environment Variables Check:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
      anonKeyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20),
      nodeEnv: process.env.NODE_ENV
    })
  }, [])

  useEffect(() => {
    loadArticles()
  }, [selectedCategory, sortBy])

  const loadArticles = async () => {
    try {
      const supabase = createClient()
      
      console.log('🔍 About to fetch articles...')

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

      console.log('🔍 Executing query...')
      const { data, error } = await query

      console.log('📊 Query result:', {
        dataCount: data?.length,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null
      })

      if (error) {
        console.error('❌ Supabase Error:', error)
        setError(`${error.message} (Code: ${error.code})`)
        setLoading(false)
        return
      }

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

  // ... rest of your component
}