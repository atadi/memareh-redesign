'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArticleEditor } from '@/components/admin/ArticleEditor'
import { CommentModeration } from '@/components/admin/CommentModeration'
import { 
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MessageCircle,
  Star,
  BarChart3,
  Search
} from 'lucide-react'

export default function ArticleAdminPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'comments'>('list')
  const [articles, setArticles] = useState<any[]>([])
  const [editingArticle, setEditingArticle] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalComments: 0,
    averageRating: 0
  })
  const supabase = createClient()

  useEffect(() => {
    loadArticles()
    loadStats()
  }, [])

  const loadArticles = async () => {
    console.log('Loading articles...')
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading articles:', error)
      return
    }

    console.log('Articles loaded:', data)
    if (data) {
      setArticles(data)
    }
  }

  const loadStats = async () => {
    // آمار کلی مقالات
    const { data: articleStats } = await supabase
      .from('articles')
      .select('view_count')
    
    const totalViews = articleStats?.reduce((sum, a) => sum + a.view_count, 0) || 0
    
    setStats({
      totalArticles: articleStats?.length || 0,
      totalViews,
      totalComments: 0, // محاسبه از دیتابیس
      averageRating: 0 // محاسبه از دیتابیس
    })
  }

  const handleDelete = async (articleId: string) => {
    if (confirm('آیا از حذف این مقاله اطمینان دارید؟')) {
      await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)
      
      loadArticles()
    }
  }

  const togglePublishStatus = async (article: any) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published'
    
    await supabase
      .from('articles')
      .update({ 
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null
      })
      .eq('id', article.id)
    
    loadArticles()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">مدیریت مقالات</h1>
          
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              لیست مقالات
            </button>
            <button
              onClick={() => {
                setEditingArticle(null)
                setActiveTab('editor')
              }}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              <Plus className="inline w-4 h-4 ml-2" />
              مقاله جدید
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'comments' ? 'bg-blue-600 text-white' : 'bg-gray-100'
              }`}
            >
              <MessageCircle className="inline w-4 h-4 ml-2" />
              مدیریت نظرات
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-600 text-2xl font-bold">{stats.totalArticles}</div>
            <div className="text-gray-600">تعداد مقالات</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-600 text-2xl font-bold">{stats.totalViews}</div>
            <div className="text-gray-600">کل بازدیدها</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-yellow-600 text-2xl font-bold">{stats.totalComments}</div>
            <div className="text-gray-600">کل نظرات</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-600 text-2xl font-bold">
              <Star className="inline w-5 h-5" />
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="text-gray-600">میانگین امتیاز</div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو در مقالات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Articles Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3">عنوان</th>
                  <th className="text-center py-3">دسته‌بندی</th>
                  <th className="text-center py-3">نویسنده</th>
                  <th className="text-center py-3">وضعیت</th>
                  <th className="text-center py-3">بازدید</th>
                  <th className="text-center py-3">نظرات</th>
                  <th className="text-center py-3">امتیاز</th>
                  <th className="text-center py-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {articles
                  .filter(a => a.title.includes(searchTerm))
                  .map(article => (
                    <tr key={article.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{article.title}</div>
                          <div className="text-sm text-gray-500">{article.slug}</div>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {article.category}
                        </span>
                      </td>
                      <td className="text-center py-3">{article.author_id || '-'}</td>
                      <td className="text-center py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          article.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {article.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
                        </span>
                      </td>
                      <td className="text-center py-3">{article.view_count || 0}</td>
                      <td className="text-center py-3">-</td>
                      <td className="text-center py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          -
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => togglePublishStatus(article)}
                            className="p-2 hover:bg-gray-100 rounded"
                            title={article.status === 'published' ? 'پیش‌نویس' : 'انتشار'}
                          >
                            {article.status === 'published' ? (
                              <EyeOff className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-green-600" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingArticle(article)
                              setActiveTab('editor')
                            }}
                            className="p-2 hover:bg-gray-100 rounded"
                            title="ویرایش"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="p-2 hover:bg-gray-100 rounded"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'editor' && (
        <ArticleEditor
          article={editingArticle}
          onSave={() => {
            loadArticles()
            setActiveTab('list')
          }}
          onCancel={() => setActiveTab('list')}
        />
      )}

      {activeTab === 'comments' && (
        <CommentModeration />
      )}
    </div>
  )
}