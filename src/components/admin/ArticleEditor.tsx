'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { 
  Bold, 
  Italic, 
  List, 
  Image, 
  Link, 
  Code,
  Quote,
  Heading,
  Save,
  X,
  Upload,
  Eye
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

interface ArticleEditorProps {
  article?: any
  onSave: () => void
  onCancel: () => void
}

export function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
  const [content, setContent] = useState(article?.content || '')
  const [preview, setPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()
  
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      title: article?.title || '',
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

  // درج تگ‌های Markdown
  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    
    const newText = 
      content.substring(0, start) + 
      before + selectedText + after +
      content.substring(end)
    
    setContent(newText)
    
    // بازگرداندن فوکوس و انتخاب
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      )
    }, 0)
  }

  // آپلود تصویر
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `articles/${fileName}`

    const { error: uploadError, data } = await supabase.storage
      .from('public')
      .upload(filePath, file)

    if (uploadError) {
      toast.error('خطا در آپلود تصویر')
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)
      
      insertMarkdown(`![تصویر](${publicUrl})`, '')
      toast.success('تصویر با موفقیت آپلود شد')
    }
    
    setUploading(false)
  }

  // ذخیره مقاله
  const onSubmitForm = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    const articleData = {
      ...data,
      content,
      tags: data.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
      meta_keywords: data.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
      author_id: article?.author_id || user?.id,
      reading_time: Math.ceil(content.split(' ').length / 200), // تخمین زمان مطالعه
      published_at: data.status === 'published' ? new Date().toISOString() : null
    }

    let error
    if (article?.id) {
      const result = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', article.id)
      error = result.error
    } else {
      const result = await supabase
        .from('articles')
        .insert(articleData)
      error = result.error
    }

    if (error) {
      toast.error('خطا در ذخیره مقاله')
    } else {
      toast.success('مقاله با موفقیت ذخیره شد')
      onSave()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {article ? 'ویرایش مقاله' : 'مقاله جدید'}
        </h2>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {preview ? 'ویرایش' : 'پیش‌نمایش'}
          </button>
          <button
            type="submit"
            name="status"
            value="draft"
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            ذخیره پیش‌نویس
          </button>
          <button
            type="submit"
            name="status"
            value="published"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            انتشار مقاله
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
            <label className="block text-sm font-medium mb-2">محتوای مقاله *</label>
            
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-b-0 rounded-t-lg">
              <button
                type="button"
                onClick={() => insertMarkdown('# ', '')}
                className="p-2 hover:bg-gray-200 rounded"
                title="تیتر H1"
              >
                <Heading className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('**', '**')}
                className="p-2 hover:bg-gray-200 rounded"
                title="ضخیم"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('*', '*')}
                className="p-2 hover:bg-gray-200 rounded"
                title="کج"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('\n- ', '')}
                className="p-2 hover:bg-gray-200 rounded"
                title="لیست"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('> ', '')}
                className="p-2 hover:bg-gray-200 rounded"
                title="نقل قول"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('`', '`')}
                className="p-2 hover:bg-gray-200 rounded"
                title="کد"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('[', '](url)')}
                className="p-2 hover:bg-gray-200 rounded"
                title="لینک"
              >
                <Link className="w-4 h-4" />
              </button>
              
              <label className="p-2 hover:bg-gray-200 rounded cursor-pointer">
                <Image className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Editor/Preview */}
            {preview ? (
              <div className="prose prose-lg max-w-none p-4 border rounded-b-lg min-h-[400px]">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 border rounded-b-lg font-mono text-sm"
                rows={20}
                placeholder="محتوای مقاله را با فرمت Markdown وارد کنید..."
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