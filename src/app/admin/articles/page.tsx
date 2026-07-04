'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  safety_tips: 'نکات ایمنی',
  diy_guide: 'آموزش تعمیرات',
  energy_saving: 'صرفه‌جویی انرژی',
  new_tech: 'تکنولوژی جدید',
  maintenance: 'نگهداری',
  troubleshooting: 'عیب‌یابی',
  regulations: 'قوانین و مقررات',
  case_studies: 'مطالعات موردی',
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  draft: { label: 'پیش‌نویس', class: 'bg-gray-100 text-gray-700' },
  published: { label: 'منتشر شده', class: 'bg-green-100 text-green-700' },
  scheduled: { label: 'زمان‌بندی شده', class: 'bg-yellow-100 text-yellow-700' },
  archived: { label: 'بایگانی شده', class: 'bg-red-100 text-red-700' },
}

const ITEMS_PER_PAGE = 15

export default function ArticleAdminPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'comments'>('list')
  const [articles, setArticles] = useState<any[]>([])
  const [editingArticle, setEditingArticle] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [profiles, setProfiles] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({ totalArticles: 0, publishedCount: 0, draftCount: 0 })
  const supabase = createClient()

  useEffect(() => {
    loadArticles()
    loadStats()
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name')
    if (data) {
      setProfiles(Object.fromEntries(data.map(p => [p.id, p.full_name])))
    }
  }

  const loadArticles = async () => {
    // Auto-publish any past-due scheduled articles
    await supabase.rpc('auto_publish_scheduled')

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return
    if (data) setArticles(data)
  }

  const loadStats = async () => {
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })

    const { count: publishedCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    const { count: draftCount } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')

    setStats({
      totalArticles: totalArticles ?? 0,
      publishedCount: publishedCount ?? 0,
      draftCount: draftCount ?? 0,
    })
  }

  const handleDelete = async (articleId: string) => {
    if (confirm('آیا از حذف این مقاله اطمینان دارید؟')) {
      await supabase.from('articles').delete().eq('id', articleId)
      loadArticles()
      loadStats()
    }
  }

  const togglePublishStatus = async (article: any) => {
    const newStatus = article.status === 'published' ? 'draft' : 'published'
    await supabase
      .from('articles')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', article.id)
    loadArticles()
    loadStats()
  }

  const filteredArticles = useMemo(() => {
    let result = articles

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(a => a.title?.toLowerCase().includes(term) || a.slug?.toLowerCase().includes(term))
    }

    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      result = result.filter(a => a.category === categoryFilter)
    }

    return result
  }, [articles, searchTerm, statusFilter, categoryFilter])

  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE)
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: articles.length }
    articles.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [articles])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">مدیریت مقالات</h1>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              لیست مقالات
            </button>
            <button
              onClick={() => { setEditingArticle(null); setActiveTab('editor') }}
              className={`px-4 py-2 rounded-lg ${activeTab === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
            >
              <Plus className="inline w-4 h-4 ml-2" />
              مقاله جدید
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'comments' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
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
            <div className="text-gray-600">کل مقالات</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-600 text-2xl font-bold">{stats.publishedCount}</div>
            <div className="text-gray-600">منتشر شده</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-gray-600 text-2xl font-bold">{stats.draftCount}</div>
            <div className="text-gray-600">پیش‌نویس</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-yellow-600 text-2xl font-bold">
              <MessageCircle className="inline w-5 h-5" />
              {stats.totalArticles}
            </div>
            <div className="text-gray-600">بازدید کل</div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="جستجو در عنوان یا slug..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full pr-10 pl-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">همه وضعیت‌ها ({statusCounts.all || 0})</option>
              <option value="draft">پیش‌نویس ({statusCounts.draft || 0})</option>
              <option value="published">منتشر شده ({statusCounts.published || 0})</option>
              <option value="scheduled">زمان‌بندی شده ({statusCounts.scheduled || 0})</option>
              <option value="archived">بایگانی شده ({statusCounts.archived || 0})</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
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
                  <th className="text-center py-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.length > 0 ? (
                  paginatedArticles.map(article => (
                    <tr key={article.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{article.title}</div>
                          <div className="text-sm text-gray-500 font-mono">{article.slug}</div>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {CATEGORY_LABELS[article.category] || article.category}
                        </span>
                      </td>
                      <td className="text-center py-3 text-sm">
                        {article.author_name || profiles[article.author_id] || '-'}
                      </td>
                      <td className="text-center py-3">
                        <span className={`px-2 py-1 rounded text-sm ${STATUS_LABELS[article.status]?.class || 'bg-gray-100'}`}>
                          {STATUS_LABELS[article.status]?.label || article.status}
                        </span>
                      </td>
                      <td className="text-center py-3">{article.view_count || 0}</td>
                      <td className="text-center py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => togglePublishStatus(article)}
                            className="p-2 hover:bg-gray-100 rounded"
                            title={article.status === 'published' ? 'برگشت به پیش‌نویس' : 'انتشار'}
                          >
                            {article.status === 'published' ? (
                              <EyeOff className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-green-600" />
                            )}
                          </button>
                          {article.status === 'published' && (
                            <a
                              href={`/articles/${article.slug}`}
                              target="_blank"
                              className="p-2 hover:bg-gray-100 rounded"
                              title="مشاهده مقاله"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                            </a>
                          )}
                          <button
                            onClick={() => { setEditingArticle(article); setActiveTab('editor') }}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      مقاله‌ای یافت نشد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">
                نمایش {((currentPage - 1) * ITEMS_PER_PAGE) + 1} تا {Math.min(currentPage * ITEMS_PER_PAGE, filteredArticles.length)} از {filteredArticles.length} مقاله
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'editor' && (
        <ArticleEditor
          article={editingArticle}
          onSave={() => {
            loadArticles()
            loadStats()
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