'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Check, 
  X, 
  Trash2,
  MessageCircle,
  AlertCircle,
  Clock,
  User
} from 'lucide-react'
import { format } from 'date-fns-jalali'
import toast from 'react-hot-toast'

interface Comment {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  content: string
  created_at: string
  rejection_reason?: string
  article: {
    title: string
    slug: string
  }
  user: {
    full_name: string
    avatar_url?: string
  }
  parent?: {
    content: string
    user: {
      full_name: string
    }
  }
}

export function CommentModeration() {
  const [comments, setComments] = useState<Comment[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadComments()
  }, [filter])

  const loadComments = async () => {
    setLoading(true)
    
    const { data } = await supabase
      .from('article_comments')
      .select(`
        *,
        article:articles(title, slug),
        user:profiles(full_name, avatar_url),
        parent:article_comments(content, user:profiles(full_name))
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false })

    if (data) {
      setComments(data)
    }
    setLoading(false)
  }

  const handleApprove = async (commentId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('article_comments')
      .update({
        status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (!error) {
      toast.success('نظر تایید شد')
      setComments(comments.filter(c => c.id !== commentId))
    }
  }

  const handleReject = async (commentId: string, reason?: string) => {
    const { error } = await supabase
      .from('article_comments')
      .update({
        status: 'rejected',
        rejection_reason: reason
      })
      .eq('id', commentId)

    if (!error) {
      toast.success('نظر رد شد')
      setComments(comments.filter(c => c.id !== commentId))
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return
    
    const { error } = await supabase
      .from('article_comments')
      .delete()
      .eq('id', commentId)

    if (!error) {
      toast.success('نظر حذف شد')
      setComments(comments.filter(c => c.id !== commentId))
    }
  }

  const stats = {
    pending: comments.filter(c => c.status === 'pending').length,
    approved: comments.filter(c => c.status === 'approved').length,
    rejected: comments.filter(c => c.status === 'rejected').length
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          مدیریت نظرات مقالات
        </h2>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === 'pending' 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            در انتظار ({stats.pending})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === 'approved' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Check className="w-4 h-4" />
            تایید شده
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === 'rejected' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <X className="w-4 h-4" />
            رد شده
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>نظری برای نمایش وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Comment Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{comment.user.full_name}</span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(comment.created_at), 'dd MMMM yyyy - HH:mm')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    مقاله: 
                    <a 
                      href={`/articles/${comment.article.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:underline mr-1"
                    >
                      {comment.article.title}
                    </a>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2 py-1 rounded-full text-xs ${
                  comment.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-700'
                    : comment.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {comment.status === 'pending' && 'در انتظار'}
                  {comment.status === 'approved' && 'تایید شده'}
                  {comment.status === 'rejected' && 'رد شده'}
                </span>
              </div>

              {/* Parent Comment (if reply) */}
              {comment.parent && (
                <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
                  <span className="text-gray-600">در پاسخ به: </span>
                  <span className="font-medium">{comment.parent.user.full_name}</span>
                  <p className="mt-1 text-gray-700">{comment.parent.content}</p>
                </div>
              )}

              {/* Comment Content */}
              <div className="bg-gray-50 p-4 rounded-lg mb-3">
                <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {comment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(comment.id)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      تایید
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('دلیل رد نظر (اختیاری):')
                        handleReject(comment.id, reason === null ? undefined : reason)
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      رد
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>

              {/* Rejection Reason (if rejected) */}
              {comment.status === 'rejected' && comment.rejection_reason && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                  <span className="text-red-700 font-medium">دلیل رد: </span>
                  <span className="text-red-600">{comment.rejection_reason}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}