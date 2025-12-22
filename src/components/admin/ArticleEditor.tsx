'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import {
  Save,
  X,
  Eye
} from 'lucide-react'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import { RichTextEditor } from './RichTextEditor'

interface ArticleEditorProps {
  article?: any
  onSave: () => void
  onCancel: () => void
}

export function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
  const [content, setContent] = useState(article?.content || '')
  const [preview, setPreview] = useState(false)
  const [showHtmlCode, setShowHtmlCode] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  
const { register, handleSubmit, setValue, watch } = useForm({
  defaultValues: {
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    category: article?.category || 'safety_tips',
    tags: article?.tags?.join(', ') || '',
    featured_image: article?.featured_image || '',
    allow_comments: article?.allow_comments ?? true,
    status: article?.status || 'draft',
    meta_title: article?.meta_title || '',
    meta_description: article?.meta_description || '',
    meta_keywords: article?.meta_keywords?.join(', ') || ''
  }
})

  const slugify = (text: string) => {
    // Persian to English transliteration map
    const persianToEnglish: { [key: string]: string } = {
      'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j',
      'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z',
      'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
      'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l',
      'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'i', 'ئ': 'i', 'ء': ''
    }

    // Transliterate Persian to English
    let transliterated = text
      .split('')
      .map(char => persianToEnglish[char] || char)
      .join('')

    return transliterated
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const titleValue = watch('title')
  const slugValue = watch('slug')

  useEffect(() => {
    if (!article?.id && titleValue && !slugValue) {
      setValue('slug', slugify(titleValue))
    }
  }, [titleValue])

  const [saving, setSaving] = useState(false)
  const isPublished = article?.status === 'published'

  // Handle save with specific status
  const handleSaveWithStatus = async (status: 'draft' | 'published') => {
    setValue('status', status)
    // Wait a tick for the value to be set, then submit
    setTimeout(() => {
      handleSubmit(onSubmitForm)()
    }, 0)
  }

  // ذخیره مقاله
  const onSubmitForm = async (data: any) => {
    try {
      // debug: log that submit was invoked
      // eslint-disable-next-line no-console
      console.debug('ArticleEditor.onSubmitForm invoked', { data })

      // Prevent multiple submissions
      if (saving) {
        console.debug('Already saving, ignoring duplicate submission')
        return
      }

      setSaving(true)
      console.debug('Getting user...')
      const { data: { user } } = await supabase.auth.getUser()
      console.debug('User:', user)

      // If trying to publish, require an authenticated user (RLS expects author_id = auth.uid())
      if (data.status === 'published' && !user?.id) {
        toast.error('برای انتشار مقاله باید وارد شوید')
        setSaving(false)
        return
      }

      const articleData = {
        ...data,
        // content now contains raw HTML; sanitize before saving
        content: DOMPurify.sanitize(content),
        tags: data.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        meta_keywords: data.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        author_id: article?.author_id || user?.id,
        reading_time: Math.ceil(content.split(' ').length / 200), // تخمین زمان مطالعه
        published_at: data.status === 'published' ? new Date().toISOString() : null
      }

      console.debug('Article data prepared:', articleData)

      let error
      if (article?.id) {
        console.debug('Updating existing article:', article.id)
        const result = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', article.id)
        error = result.error
        // If update was forbidden by RLS/permissions, fall back to direct REST attempt
        if (error && /permission|forbidden|403/i.test(error.message || '')) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            let url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`
            const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`
            } else {
              // fallback to using anon apikey header (safer than only query param)
              headers['apikey'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            }
            const resp = await fetch(url, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(articleData)
            })
            if (!resp.ok) {
              error = { message: `REST fallback failed: ${resp.status} ${resp.statusText}` }
            } else {
              error = null
            }
          } catch (e: any) {
            error = { message: e.message }
          }
        }
      } else {
        console.debug('Inserting new article')
        const result = await supabase
          .from('articles')
          .insert(articleData)
        error = result.error
        // If insert was forbidden by RLS/permissions, fall back to direct REST attempt
        if (error && /permission|forbidden|403/i.test(error.message || '')) {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            let url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/articles`
            const headers: any = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Prefer': 'return=representation' }
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`
            } else {
              // fallback to using anon apikey header (safer than only query param)
              headers['apikey'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            }
            const resp = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(articleData)
            })
            if (!resp.ok) {
              error = { message: `REST fallback failed: ${resp.status} ${resp.statusText}` }
            } else {
              error = null
            }
          } catch (e: any) {
            error = { message: e.message }
          }
        }
      }

      console.debug('Save completed, error:', error)

      if (error) {
        const msg = error.message || JSON.stringify(error)
        console.error('Article save error:', error)
        toast.error(msg.length > 200 ? 'خطا در ذخیره مقاله (جزئیات در کنسول)' : `خطا: ${msg}`)
      } else {
        console.debug('Article saved successfully')
        toast.success('مقاله با موفقیت ذخیره شد')
        onSave()
      }
      setSaving(false)
      console.debug('Save process finished')
    } catch (err) {
      console.error('Unexpected error in onSubmitForm:', err)
      toast.error('خطای غیرمنتظره: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmitForm, (errors) => {
        // eslint-disable-next-line no-console
        console.debug('ArticleEditor validation errors', errors)
        toast.error('لطفا فیلدهای لازم را پر کنید')
      })}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {article ? 'ویرایش مقاله' : 'مقاله جدید'}
        </h2>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSaveWithStatus('draft')}
            disabled={saving}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
          </button>
          <button
            type="button"
            onClick={() => handleSaveWithStatus('published')}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'در حال انتشار...' : 'انتشار مقاله'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="col-span-2 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">عنوان مقاله *</label>
            <input
              type="text"
              {...register('title', { required: true })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="عنوان مقاله را وارد کنید..."
            />
          </div>
          
          {/* Slug */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Slug (URL)
            </label>
            <input
              type="text"
              {...register('slug', { required: true })}
              disabled={isPublished}
              className="w-full px-4 py-2 border rounded-lg font-mono text-sm disabled:bg-gray-100"
              placeholder="article-url-slug"
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: https://yoursite.com/articles/<strong>{watch('slug') || 'your-slug'}</strong>
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium mb-2">خلاصه *</label>
            <textarea
              {...register('excerpt', { required: true })}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="خلاصه‌ای از مقاله که در لیست نمایش داده می‌شود..."
            />
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">محتوای مقاله *</label>
              {!preview && !showHtmlCode && (
                <button
                  type="button"
                  onClick={() => setShowHtmlCode(true)}
                  className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                >
                  &lt;/&gt; مشاهده کد HTML
                </button>
              )}
            </div>

            {/* Rich Text Editor */}
            {preview ? (
              <div className="prose prose-lg max-w-none p-4 border rounded-lg min-h-[400px]">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
              </div>
            ) : showHtmlCode ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHtmlCode(false)}
                  className="absolute top-2 left-2 z-10 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                >
                  بازگشت به ویرایشگر
                </button>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-2 pt-12 border rounded-lg font-mono text-sm min-h-[400px] bg-gray-50"
                  placeholder="کد HTML محتوای مقاله..."
                />
              </div>
            ) : (
              <RichTextEditor
                content={content}
                onChange={setContent}
              />
            )}
          </div>
        </div>

        {/* Settings Column */}
        <div className="space-y-4">
          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium mb-2">تصویر شاخص</label>
            <input
              type="url"
              {...register('featured_image')}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="URL تصویر شاخص..."
            />
            {watch('featured_image') && (
              <img
                src={watch('featured_image')}
                alt="تصویر شاخص"
                className="mt-2 w-full rounded-lg"
              />
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">دسته‌بندی *</label>
            <select
              {...register('category', { required: true })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="safety_tips">نکات ایمنی</option>
              <option value="diy_guide">آموزش تعمیرات</option>
              <option value="energy_saving">صرفه‌جویی انرژی</option>
              <option value="new_tech">تکنولوژی جدید</option>
              <option value="maintenance">نگهداری</option>
              <option value="troubleshooting">عیب‌یابی</option>
              <option value="regulations">قوانین و مقررات</option>
              <option value="case_studies">مطالعات موردی</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">برچسب‌ها</label>
            <input
              type="text"
              {...register('tags')}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="برچسب‌ها را با کاما جدا کنید..."
            />
          </div>

          {/* Comments */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('allow_comments')}
                className="rounded"
              />
              <span className="text-sm">امکان ارسال نظر</span>
            </label>
          </div>

          {/* SEO Section */}
          <div className="pt-4 border-t">
            <h3 className="font-bold mb-3">تنظیمات SEO</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">عنوان متا</label>
                <input
                  type="text"
                  {...register('meta_title')}
                  className="w-full px-3 py-1 border rounded text-sm"
                  placeholder="عنوان برای موتورهای جستجو..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1">توضیحات متا</label>
                <textarea
                  {...register('meta_description')}
                  rows={2}
                  className="w-full px-3 py-1 border rounded text-sm"
                  placeholder="توضیحات برای موتورهای جستجو..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1">کلمات کلیدی</label>
                <input
                  type="text"
                  {...register('meta_keywords')}
                  className="w-full px-3 py-1 border rounded text-sm"
                  placeholder="کلمات کلیدی با کاما..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}