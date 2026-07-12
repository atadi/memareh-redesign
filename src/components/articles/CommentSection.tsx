'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  MessageCircle, 
  Send, 
  ThumbsUp, 
  Reply,
  Pin,
  User,
  Clock
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns-jalali'
import { faIR } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    full_name: string
    avatar_url?: string
  }
  parent_id?: string
  like_count: number
  is_pinned: boolean
  replies?: Comment[]
}

interface CommentSectionProps {
  articleId: string
  comments: Comment[]
  allowComments: boolean
}

export function CommentSection({ articleId, comments: initialComments, allowComments }: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [supabase])

  // سازماندهی نظرات به صورت درختی
  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map()
    const roots: Comment[] = []

    // ابتدا همه نظرات را در Map قرار می‌دهیم
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // سپس پاسخ‌ها را به والدین متصل می‌کنیم
    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies.push(commentMap.get(comment.id))
        }
      } else {
        roots.push(commentMap.get(comment.id))
      }
    })

    // نظرات پین شده را در ابتدا قرار می‌دهیم
    return roots.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      toast.error('لطفا نظر خود را وارد کنید')
      return
    }

    if (!user && !guestName.trim()) {
      toast.error('لطفا نام خود را وارد کنید')
      return
    }

    setSubmitting(true)

    const insertData: any = {
      article_id: articleId,
      content: newComment,
      status: 'pending'
    }

    if (user) {
      insertData.user_id = user.id
    } else {
      insertData.guest_name = guestName.trim()
      if (guestEmail.trim()) insertData.guest_email = guestEmail.trim()

      let token = localStorage.getItem('guest_token')
      if (!token) {
        token = crypto.randomUUID()
        localStorage.setItem('guest_token', token)
      }
      insertData.guest_token = token
    }

    if (!user) {
      // Clear any stale/expired auth token so anonymous requests don't 401
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // ignore
      }
    }

    const { error } = await supabase
      .from('article_comments')
      .insert(insertData)

    if (error) {
      toast.error('خطا در ارسال نظر')
    } else {
      toast.success('نظر شما پس از تایید مدیر سایت نمایش داده خواهد شد')
      setNewComment('')
      if (!user) {
        setGuestName('')
        setGuestEmail('')
      }
    }

    setSubmitting(false)
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) {
      toast.error('لطفا پاسخ خود را وارد کنید')
      return
    }

    if (!user && !guestName.trim()) {
      toast.error('لطفا نام خود را وارد کنید')
      return
    }

    setSubmitting(true)

    const insertData: any = {
      article_id: articleId,
      content: replyContent,
      parent_id: parentId,
      status: 'pending'
    }

    if (user) {
      insertData.user_id = user.id
    } else {
      insertData.guest_name = guestName.trim()
      if (guestEmail.trim()) insertData.guest_email = guestEmail.trim()

      let token = localStorage.getItem('guest_token')
      if (!token) {
        token = crypto.randomUUID()
        localStorage.setItem('guest_token', token)
      }
      insertData.guest_token = token
    }

    if (!user) {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // ignore
      }
    }

    const { error } = await supabase
      .from('article_comments')
      .insert(insertData)

    if (error) {
      toast.error('خطا در ارسال پاسخ')
    } else {
      toast.success('پاسخ شما پس از تایید نمایش داده خواهد شد')
      setReplyContent('')
      setReplyTo(null)
      if (!user) {
        setGuestName('')
        setGuestEmail('')
      }
    }

    setSubmitting(false)
  }

  const handleLikeComment = async (commentId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('برای پسندیدن نظر باید وارد شوید')
      return
    }

    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: user.id
      })

    if (error?.code === '23505') {
      // حذف لایک
      await supabase
        .from('comment_likes')
        .delete()
        .match({ comment_id: commentId, user_id: user.id })
      
      // بروزرسانی تعداد لایک در state
      setComments(prev => 
        prev.map(c => 
          c.id === commentId 
            ? { ...c, like_count: c.like_count - 1 }
            : c
        )
      )
    } else if (!error) {
      // بروزرسانی تعداد لایک در state
      setComments(prev => 
        prev.map(c => 
          c.id === commentId 
            ? { ...c, like_count: c.like_count + 1 }
            : c
        )
      )
    }
  }

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => (
    <div className={`${depth > 0 ? 'mr-8 border-r-2 border-gray-200 pr-4' : ''}`}>
      <div className="flex gap-3 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user.avatar_url ? (
            <img 
              src={comment.user.avatar_url} 
              alt={comment.user.full_name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        {/* Comment Body */}
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium">{comment.user.full_name}</span>
                {comment.is_pinned && (
                  <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    <Pin className="inline w-3 h-3 ml-1" />
                    پین شده
                  </span>
                )}
                <span className="text-sm text-gray-500 mr-2">
                  {formatDistanceToNow(new Date(comment.created_at), { 
                    addSuffix: true,
                    locale: faIR 
                  })}
                </span>
              </div>
            </div>

            {/* Content */}
            <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>

            {/* Actions */}
            <div className="flex gap-4 mt-3 text-sm">
              <button
                onClick={() => handleLikeComment(comment.id)}
                className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>{comment.like_count || 0}</span>
              </button>
              
              {allowComments && depth < 2 && (
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                >
                  <Reply className="w-4 h-4" />
                  پاسخ
                </button>
              )}
            </div>
          </div>

          {/* Reply Form */}
          {replyTo === comment.id && (
            <div className="mt-3 mr-12">
              {!user && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="نام شما *"
                    className="px-4 py-2 border rounded-lg"
                    disabled={submitting}
                  />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="ایمیل (اختیاری)"
                    className="px-4 py-2 border rounded-lg"
                    disabled={submitting}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="پاسخ خود را بنویسید..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                  disabled={submitting}
                />
                <button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setReplyTo(null)
                    setReplyContent('')
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  انصراف
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const organizedComments = organizeComments(comments)

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <MessageCircle className="w-6 h-6" />
        نظرات ({comments.length})
      </h3>

      {/* New Comment Form */}
      {allowComments ? (
        <div className="bg-gray-50 p-4 rounded-lg">
          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="نام شما *"
                className="px-4 py-2 border rounded-lg"
                disabled={submitting}
              />
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="ایمیل (اختیاری)"
                className="px-4 py-2 border rounded-lg"
                disabled={submitting}
              />
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="نظر خود را بنویسید..."
            rows={4}
            className="w-full px-4 py-2 border rounded-lg resize-none"
            disabled={submitting}
          />
          <div className="flex justify-between items-center mt-3">
            <p className="text-sm text-gray-500">
              نظر شما پس از تایید مدیر سایت نمایش داده خواهد شد
            </p>
            <button
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              ارسال نظر
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700">
          امکان ارسال نظر برای این مقاله غیرفعال است
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {organizedComments.length > 0 ? (
          organizedComments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>هنوز نظری ثبت نشده است</p>
            <p className="text-sm">اولین نفری باشید که نظر می‌دهد!</p>
          </div>
        )}
      </div>
    </div>
  )
}