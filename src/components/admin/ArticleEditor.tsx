'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { uploadFeaturedImage, deleteFeaturedImage } from '@/lib/uploadImage'
import {
  Save,
  X,
  Eye,
  Upload,
  Trash2
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
  const [editorKey, setEditorKey] = useState(0) // Add this to force remount
  const supabase = useMemo(() => createClient(), [])
  
  // Image upload states
  const [featuredImage, setFeaturedImage] = useState<File | null>(null)
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>(article?.featured_image || '')
  const [isUploading, setIsUploading] = useState(false)
  
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
    const persianToEnglish: { [key: string]: string } = {
      'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j',
      'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z',
      'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
      'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l',
      'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'i', 'ئ': 'i', 'ء': ''
    }

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

  // Auto-generate slug from title
  useEffect(() => {
    if (!article?.id && titleValue && !slugValue) {
      setValue('slug', slugify(titleValue))
    }
  }, [titleValue, article?.id, slugValue, setValue])

  // Reset form when switching between articles
  useEffect(() => {
    console.log('🔄 Article changed, resetting form. Article ID:', article?.id)
    
    if (article?.id) {
      // Editing existing article
      setValue('title', article.title || '')
      setValue('slug', article.slug || '')
      setValue('excerpt', article.excerpt || '')
      setValue('category', article.category || 'safety_tips')
      setValue('tags', article.tags?.join(', ') || '')
      setValue('featured_image', article.featured_image || '')
      setValue('allow_comments', article.allow_comments ?? true)
      setValue('status', article.status || 'draft')
      setValue('meta_title', article.meta_title || '')
      setValue('meta_description', article.meta_description || '')
      setValue('meta_keywords', article.meta_keywords?.join(', ') || '')
      setContent(article.content || '')
      setFeaturedImagePreview(article.featured_image || '')
      setFeaturedImage(null)
    } else {
      // Creating new article - reset everything
      console.log('✨ Creating new article, clearing all fields')
      setValue('title', '')
      setValue('slug', '')
      setValue('excerpt', '')
      setValue('category', 'safety_tips')
      setValue('tags', '')
      setValue('featured_image', '')
      setValue('allow_comments', true)
      setValue('status', 'draft')
      setValue('meta_title', '')
      setValue('meta_description', '')
      setValue('meta_keywords', '')
      setContent('')
      setFeaturedImagePreview('')
      setFeaturedImage(null)
    }
    
    // Force editor remount by changing key
    setEditorKey(prev => prev + 1)
    
    // Reset other states
    setPreview(false)
    setShowHtmlCode(false)
    setSaving(false)
    setIsUploading(false)
  }, [article?.id, article, setValue])

  const [saving, setSaving] = useState(false)
  const isPublished = article?.status === 'published'

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 File input triggered!', e.target.files)
    
    const file = e.target.files?.[0]
    if (!file) {
      console.log('❌ No file selected')
      return
    }

    console.log('📁 File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    })

    if (!file.type.startsWith('image/')) {
      console.log('❌ Not an image file:', file.type)
      toast.error('لطفا یک فایل تصویری انتخاب کنید')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', (file.size / 1024 / 1024).toFixed(2) + 'MB')
      toast.error('حجم تصویر نباید بیشتر از 5 مگابایت باشد')
      return
    }

    console.log('✅ File validation passed, creating preview...')
    setFeaturedImage(file)
    
    const reader = new FileReader()
    reader.onloadstart = () => {
      console.log('📖 Starting to read file...')
    }
    reader.onloadend = () => {
      console.log('✅ Preview created successfully')
      setFeaturedImagePreview(reader.result as string)
    }
    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error)
      toast.error('خطا در خواندن فایل')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    console.log('🗑️ Removing image')
    setFeaturedImage(null)
    setFeaturedImagePreview('')
    setValue('featured_image', '')
  }

  const handleSaveWithStatus = async (status: 'draft' | 'published') => {
    setValue('status', status)
    setTimeout(() => {
      handleSubmit(onSubmitForm)()
    }, 0)
  }

  const onSubmitForm = async (data: any) => {
    try {
      console.debug('ArticleEditor.onSubmitForm invoked', { data })

      if (saving) {
        console.debug('Already saving, ignoring duplicate submission')
        return
      }

      setSaving(true)
      setIsUploading(true)

      console.debug('Getting user...')
      const { data: { user } } = await supabase.auth.getUser()
      console.debug('User:', user)

      if (data.status === 'published' && !user?.id) {
        toast.error('برای انتشار مقاله باید وارد شوید')
        setSaving(false)
        setIsUploading(false)
        return
      }

      let imageUrl = data.featured_image || featuredImagePreview

      if (featuredImage) {
        console.log('🚀 Starting image upload...', {
          fileName: featuredImage.name,
          fileSize: featuredImage.size,
          fileType: featuredImage.type
        })
        
        toast.loading('در حال آپلود تصویر...')
        const { url, error: uploadError } = await uploadFeaturedImage(featuredImage)
        
        console.log('📤 Upload result:', { url, error: uploadError })
        
        if (uploadError) {
          console.error('❌ Upload failed:', uploadError)
          toast.dismiss()
          toast.error(uploadError)
          setSaving(false)
          setIsUploading(false)
          return
        }
        
        if (url) {
          console.log('✅ Image uploaded successfully:', url)
          imageUrl = url
          toast.dismiss()
          toast.success('تصویر با موفقیت آپلود شد')
          
          if (article?.featured_image && article.featured_image !== imageUrl) {
            console.log('🗑️ Deleting old image:', article.featured_image)
            await deleteFeaturedImage(article.featured_image)
          }
        }
      }

      const articleData = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        category: data.category,
        content: DOMPurify.sanitize(content),
        featured_image: imageUrl,
        tags: data.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        meta_keywords: data.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
        allow_comments: data.allow_comments,
        status: data.status,
        author_id: article?.author_id || user?.id,
        reading_time: Math.ceil(content.split(' ').length / 200),
        published_at: data.status === 'published' ? new Date().toISOString() : null
      }

      console.debug('Article data prepared:', articleData)

      let result
      if (article?.id) {
        console.debug('Updating existing article:', article.id)
        result = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', article.id)
      } else {
        console.debug('Inserting new article')
        result = await supabase
          .from('articles')
          .insert(articleData)
      }

      const { error } = result

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
      setIsUploading(false)
      console.debug('Save process finished')
    } catch (err) {
      console.error('Unexpected error in onSubmitForm:', err)
      toast.error('خطای غیرمنتظره: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
      setIsUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <h2 className="text-2xl font-bold">
          {article?.id ? 'ویرایش مقاله' : 'مقاله جدید'}
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
            type="button"
            onClick={() => handleSaveWithStatus('draft')}
            disabled={saving || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
          </button>
          <button
            type="button"
            onClick={() => handleSaveWithStatus('published')}
            disabled={saving || isUploading}
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">عنوان مقاله *</label>
            <input
              type="text"
              {...register('title', { required: true })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="عنوان مقاله را وارد کنید..."
            />
          </div>
          
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

          <div>
            <label className="block text-sm font-medium mb-2">خلاصه *</label>
            <textarea
              {...register('excerpt', { required: true })}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="خلاصه‌ای از مقاله که در لیست نمایش داده می‌شود..."
            />
          </div>

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
                key={editorKey} // ⭐ Use the incrementing key
                content={content}
                onChange={setContent}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium mb-3">تصویر شاخص</label>
            
            <div className="mb-3">
              <label 
                htmlFor="featured-image-input"
                className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-600">انتخاب تصویر</span>
                  <span className="text-xs text-gray-400 mt-1">حداکثر 5 مگابایت</span>
                </div>
                <input
                  id="featured-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {featuredImagePreview && (
              <div className="relative mb-3">
                <img
                  src={featuredImagePreview}
                  alt="پیش‌نمایش تصویر شاخص"
                  className="w-full h-auto rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transition-colors"
                  title="حذف تصویر"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-3">
              <input
                type="url"
                {...register('featured_image')}
                value={featuredImagePreview}
                onChange={(e) => setFeaturedImagePreview(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="یا URL تصویر را وارد کنید..."
                disabled={!!featuredImage}
              />
            </div>
          </div>

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

          <div>
            <label className="block text-sm font-medium mb-2">برچسب‌ها</label>
            <input
              type="text"
              {...register('tags')}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="برچسب‌ها را با کاما جدا کنید..."
            />
          </div>

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