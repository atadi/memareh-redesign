'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { uploadFeaturedImage, deleteStorageFile } from '@/lib/uploadImage'
import {
  Save,
  X,
  Eye,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Search,
  Sparkles,
  Calendar,
  Tag,
  Clock,
  FileText,
  User,
  ChevronDown,
  Video,
  Star,
  Loader2,
} from 'lucide-react'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import { RichTextEditor } from './RichTextEditor'
import type { ArticleTag } from '@/types/database.types'

const CATEGORIES = [
  { value: 'safety_tips', label: 'نکات ایمنی' },
  { value: 'diy_guide', label: 'آموزش تعمیرات' },
  { value: 'energy_saving', label: 'صرفه‌جویی انرژی' },
  { value: 'new_tech', label: 'تکنولوژی جدید' },
  { value: 'maintenance', label: 'نگهداری' },
  { value: 'troubleshooting', label: 'عیب‌یابی' },
  { value: 'regulations', label: 'قوانین و مقررات' },
  { value: 'case_studies', label: 'مطالعات موردی' },
]

const slugify = (text: string) => {
  const persianToEnglish: Record<string, string> = {
    'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j',
    'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z',
    'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
    'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l',
    'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'i', 'ئ': 'i',
  }

  return text
    .split('')
    .map(char => persianToEnglish[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

interface ArticleEditorProps {
  article?: any
  onSave: () => void
  onCancel: () => void
}

export function ArticleEditor({ article, onSave, onCancel }: ArticleEditorProps) {
  const supabase = createClient()
  const { register, handleSubmit, setValue, watch, trigger } = useForm({
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      category: 'safety_tips',
      allow_comments: true,
      status: 'draft',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      canonical_url: '',
      featured_image_alt: '',
      is_featured: false,
      video_url: '',
      scheduled_at: '',
    }
  })

  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [showHtmlCode, setShowHtmlCode] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'advanced'>('content')

  // Image states
  const [featuredImage, setFeaturedImage] = useState<File | null>(null)
  const [featuredImagePreview, setFeaturedImagePreview] = useState('')
  const [ogImage, setOgImage] = useState<File | null>(null)
  const [ogImagePreview, setOgImagePreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Author & tags
  const [authors, setAuthors] = useState<{ id: string; full_name: string }[]>([])
  const [selectedAuthorId, setSelectedAuthorId] = useState('')
  const [tags, setTags] = useState<ArticleTag[]>([])
  const [selectedTags, setSelectedTags] = useState<ArticleTag[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [slugExists, setSlugExists] = useState(false)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Load data on mount
  useEffect(() => {
    loadAuthors()
    loadTags()
    if (article?.id) {
      loadArticleTags(article.id)
    } else {
      setSelectedTags([])
    }
  }, [article?.id])

  const loadArticleTags = async (articleId: string) => {
    const { data: relations } = await supabase
      .from('article_tag_relations')
      .select('tag_id')
      .eq('article_id', articleId)

    let loadedTags: ArticleTag[] = []
    if (relations && relations.length > 0) {
      const tagIds = relations.map(r => r.tag_id)
      const { data: tagData } = await supabase
        .from('article_tags')
        .select('*')
        .in('id', tagIds)
      if (tagData) loadedTags = tagData
    }

    setSelectedTags(loadedTags)
    resetForm(article)
  }

  const loadAuthors = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['admin', 'technician'])
      .order('full_name')
    if (data) setAuthors(data)
  }

  const loadTags = async () => {
    const { data } = await supabase
      .from('article_tags')
      .select('*')
      .order('name')
    if (data) setTags(data)
  }

  const resetForm = (article: any) => {
    setValue('title', article.title || '')
    setValue('slug', article.slug || '')
    setValue('excerpt', article.excerpt || '')
    setValue('category', article.category || 'safety_tips')
    setValue('allow_comments', article.allow_comments ?? true)
    setValue('status', article.status || 'draft')
    setValue('meta_title', article.meta_title || '')
    setValue('meta_description', article.meta_description || '')
    setValue('meta_keywords', article.meta_keywords?.join(', ') || '')
    setValue('canonical_url', article.canonical_url || '')
    setValue('featured_image_alt', article.featured_image_alt || '')
    setValue('is_featured', article.is_featured || false)
    setValue('video_url', article.video_url || '')
    setValue('scheduled_at', article.scheduled_at || '')
    setContent(article.content || '')
    setFeaturedImagePreview(article.featured_image || '')
    setOgImagePreview(article.og_image || '')
    setSelectedAuthorId(article.author_id || '')
    setEditorKey(prev => prev + 1)
    setPreview(false)
    setShowHtmlCode(false)
    setSaving(false)
    setIsUploading(false)
  }

  const titleValue = watch('title')
  const slugValue = watch('slug')
  const excerptValue = watch('excerpt')
  const metaTitleValue = watch('meta_title')
  const metaDescValue = watch('meta_description')

  // Auto-generate slug
  const lastTitleRef = useRef('')
  const slugifyRef = useRef(slugify)
  useEffect(() => {
    if (article?.id || !titleValue || titleValue === lastTitleRef.current || slugValue) return
    lastTitleRef.current = titleValue

    const generateSlug = async () => {
      const base = slugifyRef.current(titleValue)
      const { data: existing } = await supabase
        .from('articles')
        .select('slug')
        .like('slug', `${base}%`)
        .limit(50)

      let slug = base
      if (existing && existing.length > 0) {
        const usedSlugs = new Set(existing.map(r => r.slug))
        if (usedSlugs.has(slug)) {
          let counter = 1
          while (usedSlugs.has(`${slug}-${counter}`)) counter++
          slug = `${slug}-${counter}`
        }
      }

      setValue('slug', slug)
    }

    generateSlug()
  }, [titleValue, article?.id, slugValue, setValue])

  // Slug uniqueness check
  const checkSlugTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!slugValue || slugValue === article?.slug) {
      setSlugExists(false)
      return
    }
    if (checkSlugTimeout.current) clearTimeout(checkSlugTimeout.current)
    checkSlugTimeout.current = setTimeout(async () => {
      setCheckingSlug(true)
      const { data } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', slugValue)
        .neq('id', article?.id || '')
        .limit(1)
      setSlugExists(data != null && data.length > 0)
      setCheckingSlug(false)
    }, 500)
    return () => { if (checkSlugTimeout.current) clearTimeout(checkSlugTimeout.current) }
  }, [slugValue, article?.id])

  // Word/char count
  const wordCount = content
    ? content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
    : 0
  const charCount = content ? content.replace(/<[^>]*>/g, '').length : 0
  const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 200))

  // Auto-fill meta fields
  const autoFillMeta = () => {
    if (!metaTitleValue && titleValue) {
      setValue('meta_title', titleValue)
    }
    if (!metaDescValue && excerptValue) {
      setValue('meta_description', excerptValue)
    }
    toast.success('فیلدهای متا تکمیل شدند')
  }

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('لطفا یک فایل تصویری انتخاب کنید'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم تصویر نباید بیشتر از 5 مگابایت باشد'); return }
    setFeaturedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setFeaturedImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleOgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('لطفا یک فایل تصویری انتخاب کنید'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم تصویر نباید بیشتر از 5 مگابایت باشد'); return }
    setOgImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setOgImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleTagSelect = (tag: ArticleTag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag])
    }
    setTagSearch('')
    setShowTagDropdown(false)
    tagInputRef.current?.focus()
  }

  const handleTagRemove = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId))
  }

  const filteredTags = tagSearch
    ? tags.filter(
        t =>
          t.name.includes(tagSearch) &&
          !selectedTags.find(st => st.id === t.id)
      )
    : tags.filter(t => !selectedTags.find(st => st.id === t.id))

  const handleSaveWithStatus = async (status: string) => {
    setValue('status', status)
    setTimeout(() => handleSubmit(onSubmitForm)(), 0)
  }

  const onSubmitForm = async (data: any) => {
    if (saving) return
    if (!data.title?.trim()) { toast.error('عنوان مقاله الزامی است'); return }
    if (!data.slug?.trim()) { toast.error('slug مقاله الزامی است'); return }
    if (slugExists) { toast.error('این slug قبلاً استفاده شده است'); return }

    setSaving(true)
    setIsUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const authorName = authors.find(a => a.id === selectedAuthorId)?.full_name
        || user?.user_metadata?.display_name
        || 'کاربر'
      const authorId = selectedAuthorId || user?.id

      if (data.status === 'published' && !authorId) {
        toast.error('برای انتشار مقاله باید وارد شوید')
        setSaving(false)
        setIsUploading(false)
        return
      }

      let featuredImageUrl = data.featured_image || featuredImagePreview
      let ogImageUrl = data.og_image || ogImagePreview

      if (featuredImage) {
        const toastId = toast.loading('در حال آپلود تصویر شاخص...')
        const { url, error } = await uploadFeaturedImage(featuredImage)
        if (error) { toast.error(error, { id: toastId }); setSaving(false); setIsUploading(false); return }
        if (url) {
          featuredImageUrl = url
          toast.success('تصویر شاخص آپلود شد', { id: toastId })
          if (article?.featured_image && article.featured_image !== url) {
            await deleteStorageFile(article.featured_image)
          }
        }
      }

      if (ogImage) {
        const toastId = toast.loading('در حال آپلود تصویر OG...')
        const { url, error } = await uploadFeaturedImage(ogImage)
        if (error) { toast.error(error, { id: toastId }); setSaving(false); setIsUploading(false); return }
        if (url) {
          ogImageUrl = url
          toast.success('تصویر OG آپلود شد', { id: toastId })
          if (article?.og_image && article.og_image !== url) {
            await deleteStorageFile(article.og_image)
          }
        }
      }

      const canonicalUrl = data.canonical_url || `${window.location.origin}/articles/${data.slug}`

      // Sync tags: ensure all selected tags exist, then link them
      const tagIds: string[] = []
      for (const tag of selectedTags) {
        let tagId = tag.id
        if (!tagId) {
          const slug = slugify(tag.name)
          const { data: existing } = await supabase
            .from('article_tags')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()
          if (existing) {
            tagId = existing.id
          } else {
            const { data: created } = await supabase
              .from('article_tags')
              .insert({ name: tag.name, slug })
              .select('id')
              .single()
            if (created) tagId = created.id
          }
        }
        if (tagId) tagIds.push(tagId)
      }

      const articleData = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        category: data.category,
        content: DOMPurify.sanitize(content),
        featured_image: featuredImageUrl,
        featured_image_alt: data.featured_image_alt,
        og_image: ogImageUrl,
        canonical_url: canonicalUrl,
        video_url: data.video_url,
        meta_title: data.meta_title,
        meta_description: data.meta_description,
        meta_keywords: data.meta_keywords
          ? data.meta_keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
          : [],
        allow_comments: data.allow_comments,
        status: data.status,
        is_featured: data.is_featured,
        author_id: authorId,
        author_name: authorName,
        reading_time: estimatedReadingTime,
        scheduled_at: data.status === 'scheduled' && data.scheduled_at
          ? new Date(data.scheduled_at).toISOString()
          : null,
        published_at: data.status === 'published'
          ? (article?.published_at || new Date().toISOString())
          : null,
      }

      let articleId = article?.id

      if (articleId) {
        const { error } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', articleId)
        if (error) { toast.error(`خطا: ${error.message}`); setSaving(false); setIsUploading(false); return }
      } else {
        const { data: inserted, error } = await supabase
          .from('articles')
          .insert(articleData)
          .select('id')
          .single()
        if (error) { toast.error(`خطا: ${error.message}`); setSaving(false); setIsUploading(false); return }
        articleId = inserted.id
      }

      // Sync tag relations
      if (articleId) {
        await supabase.from('article_tag_relations').delete().eq('article_id', articleId)
        if (tagIds.length > 0) {
          await supabase.from('article_tag_relations').insert(
            tagIds.map(tagId => ({ article_id: articleId, tag_id: tagId }))
          )
        }
      }

      toast.success(article?.id ? 'مقاله با موفقیت بروزرسانی شد' : 'مقاله با موفقیت ایجاد شد')
      onSave()
    } catch (err) {
      toast.error('خطای غیرمنتظره')
    } finally {
      setSaving(false)
      setIsUploading(false)
    }
  }

  const seoPreviewUrl = `/articles/${slugValue || 'your-slug'}`
  const seoPreviewTitle = metaTitleValue || titleValue || 'عنوان مقاله'
  const seoPreviewDesc = metaDescValue || excerptValue || ''

  const uploadedImageUploader = (id: string, preview: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onRemove: () => void) => (
    <div>
      <label htmlFor={id} className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
        <div className="flex flex-col items-center">
          <Upload className="w-6 h-6 text-gray-400 mb-1" />
          <span className="text-sm text-gray-600">انتخاب تصویر</span>
          <span className="text-xs text-gray-400 mt-1">حداکثر 5 مگابایت</span>
        </div>
        <input id={id} type="file" accept="image/*" onChange={onChange} className="hidden" disabled={isUploading} />
      </label>
      {preview && (
        <div className="relative mt-3">
          <img src={preview} alt="" className="w-full h-auto rounded-lg border-2 border-gray-200" />
          <button type="button" onClick={onRemove} className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg" title="حذف">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )

  const inputClasses = "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const labelClasses = "block text-sm font-medium mb-2"
  const errorClasses = "text-xs text-red-600 mt-1"

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <h2 className="text-2xl font-bold">{article?.id ? 'ویرایش مقاله' : 'مقاله جدید'}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview(!preview)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {preview ? 'ویرایش' : 'پیش‌نمایش'}
          </button>
          <button type="button" onClick={() => handleSaveWithStatus('draft')} disabled={saving || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
          </button>
          <button type="button" onClick={() => handleSaveWithStatus('published')} disabled={saving || isUploading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Loader2 className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'در حال انتشار...' : 'انتشار'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          { id: 'content', label: 'محتوا', icon: FileText },
          { id: 'seo', label: 'SEO', icon: Search },
          { id: 'advanced', label: 'پیشرفته', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4 inline ml-1.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ================ TAB: CONTENT ================ */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Title */}
            <div>
              <label className={labelClasses}>عنوان مقاله *</label>
              <input type="text" {...register('title', { required: true })}
                className={inputClasses} placeholder="عنوان مقاله را وارد کنید..." />
            </div>

            {/* Slug */}
            <div>
              <label className={labelClasses}>Slug (آدرس اینترنتی)</label>
              <div className="relative">
                <input type="text" {...register('slug', { required: true })}
                  disabled={article?.status === 'published'}
                  className={`${inputClasses} font-mono text-sm ${article?.status === 'published' ? 'bg-gray-100' : ''} ${slugExists ? 'border-red-500' : ''}`}
                  placeholder="article-url-slug" />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {checkingSlug ? (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  ) : slugExists ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : slugValue && !slugExists ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : null}
                </div>
              </div>
              {slugExists && <p className={errorClasses}>این slug قبلاً استفاده شده است</p>}
              <p className="text-xs text-gray-500 mt-1">
                {window.location.origin}/articles/<strong>{slugValue || 'your-slug'}</strong>
              </p>
            </div>

            {/* Author + Category row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>نویسنده</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={selectedAuthorId} onChange={(e) => setSelectedAuthorId(e.target.value)}
                    className={`${inputClasses} pr-10`}>
                    <option value="">نویسنده پیش‌فرض (من)</option>
                    {authors.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClasses}>دسته‌بندی *</label>
                <select {...register('category', { required: true })} className={inputClasses}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={labelClasses}>برچسب‌ها</label>
              <div className="relative">
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[42px] bg-white cursor-text"
                  onClick={() => tagInputRef.current?.focus()}>
                  {selectedTags.map(tag => (
                    <span key={tag.id || tag.name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      <Tag className="w-3 h-3" />
                      {tag.name}
                      <button type="button" onClick={() => handleTagRemove(tag.id)} className="hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagSearch}
                    onChange={(e) => { setTagSearch(e.target.value); setShowTagDropdown(true) }}
                    onFocus={() => setShowTagDropdown(true)}
                    className="flex-1 min-w-[120px] outline-none text-sm border-0 p-0"
                    placeholder={selectedTags.length === 0 ? 'جستجو یا ایجاد برچسب...' : ''}
                  />
                </div>
                {showTagDropdown && (
                  <div className="absolute top-full right-0 left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredTags.length > 0 ? (
                      filteredTags.map(tag => (
                        <button type="button" key={tag.id} onClick={() => handleTagSelect(tag)}
                          className="w-full text-right px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {tag.name}
                        </button>
                      ))
                    ) : tagSearch ? (
                      <button type="button" onClick={() => handleTagSelect({ id: '', name: tagSearch, slug: slugify(tagSearch), created_at: null })}
                        className="w-full text-right px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        ایجاد "{tagSearch}"
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">برچسبی یافت نشد</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={labelClasses}>خلاصه مقاله *</label>
                <span className="text-xs text-gray-400">{excerptValue?.length || 0} / 300</span>
              </div>
              <textarea {...register('excerpt', { required: true })}
                rows={3} maxLength={300}
                className={inputClasses} placeholder="خلاصه‌ای از مقاله..." />
            </div>

            {/* Content */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">محتوای مقاله *</label>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{wordCount} کلمه</span>
                  <span>{charCount} کاراکتر</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{estimatedReadingTime} دقیقه</span>
                  {!preview && !showHtmlCode && (
                    <button type="button" onClick={() => setShowHtmlCode(true)}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700">
                      &lt;/&gt; HTML
                    </button>
                  )}
                </div>
              </div>
              {preview ? (
                <div className="prose prose-lg max-w-none p-4 border rounded-lg min-h-[400px]">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
                </div>
              ) : showHtmlCode ? (
                <div className="relative">
                  <button type="button" onClick={() => setShowHtmlCode(false)}
                    className="absolute top-2 left-2 z-10 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                    بازگشت به ویرایشگر
                  </button>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)}
                    className="w-full px-4 py-2 pt-12 border rounded-lg font-mono text-sm min-h-[400px] bg-gray-50"
                    placeholder="کد HTML محتوای مقاله..." />
                </div>
              ) : (
                <RichTextEditor key={editorKey} content={content} onChange={setContent} />
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Featured Image */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <label className={labelClasses}>تصویر شاخص</label>
              {uploadedImageUploader('featured-image-input', featuredImagePreview, handleFeaturedImageChange, () => {
                setFeaturedImage(null); setFeaturedImagePreview('')
              })}
              <div className="mt-3">
                <input type="url" value={featuredImagePreview} onChange={(e) => setFeaturedImagePreview(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="یا URL تصویر را وارد کنید..."
                  disabled={!!featuredImage} />
              </div>
              <div className="mt-2">
                <input type="text" {...register('featured_image_alt')}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="متن جایگزین (alt) برای تصویر" />
              </div>
            </div>

            {/* Video URL */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <label className={labelClasses}><Video className="w-4 h-4 inline ml-1" />ویدیو</label>
              <input type="url" {...register('video_url')}
                className={inputClasses} placeholder="https://youtube.com/..." />
            </div>

            {/* SEO quick summary */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <label className={labelClasses}>وضعیت SEO</label>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">عنوان متا</span>
                  <span className={metaTitleValue ? 'text-green-600' : 'text-red-500'}>
                    {metaTitleValue ? '✓' : 'خالی'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">توضیحات متا</span>
                  <span className={metaDescValue ? 'text-green-600' : 'text-red-500'}>
                    {metaDescValue ? '✓' : 'خالی'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">تصویر شاخص</span>
                  <span className={featuredImagePreview ? 'text-green-600' : 'text-red-500'}>
                    {featuredImagePreview ? '✓' : 'خالی'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">مدت مطالعه</span>
                  <span>{estimatedReadingTime} دقیقه</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================ TAB: SEO ================ */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-2 gap-8">
          {/* Left: SEO fields */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">تنظیمات SEO</h3>
              <button type="button" onClick={autoFillMeta}
                className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                تکمیل خودکار
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">عنوان متا</label>
                <span className="text-xs text-gray-400">{(metaTitleValue || '').length} / 70</span>
              </div>
              <input type="text" {...register('meta_title')} maxLength={70}
                className={inputClasses} placeholder="عنوان برای موتورهای جستجو..." />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium">توضیحات متا</label>
                <span className="text-xs text-gray-400">{(metaDescValue || '').length} / 160</span>
              </div>
              <textarea {...register('meta_description')} rows={3} maxLength={160}
                className={inputClasses} placeholder="توضیحات برای موتورهای جستجو..." />
            </div>

            <div>
              <label className="text-sm font-medium">کلمات کلیدی (جداسازی با کاما)</label>
              <input type="text" {...register('meta_keywords')}
                className={inputClasses} placeholder="برق, ایمنی, تعمیرات..." />
            </div>

            <div>
              <label className="text-sm font-medium">آدرس کنونیکال</label>
              <input type="url" {...register('canonical_url')}
                className={inputClasses} placeholder="آدرس اصلی این مقاله..." />
              <p className="text-xs text-gray-500 mt-1">اگر خالی بماند، آدرس پیش‌فرض استفاده می‌شود</p>
            </div>

            <div>
              <label className="text-sm font-medium">تصویر Open Graph (OG)</label>
              <p className="text-xs text-gray-500 mb-2">تصویری که در اشتراک‌گذاری شبکه‌های اجتماعی نمایش داده می‌شود</p>
              {uploadedImageUploader('og-image-input', ogImagePreview, handleOgImageChange, () => {
                setOgImage(null); setOgImagePreview('')
              })}
              <div className="mt-3">
                <input type="url" value={ogImagePreview} onChange={(e) => setOgImagePreview(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="یا URL تصویر را وارد کنید..."
                  disabled={!!ogImage} />
              </div>
            </div>
          </div>

          {/* Right: SEO Preview */}
          <div>
            <h3 className="font-bold mb-4">پیش‌نمایش در گوگل</h3>
            <div className="border rounded-lg p-4 bg-white">
              <div className="max-w-[600px]">
                <div className="text-sm text-green-700 truncate">{window.location.origin}{seoPreviewUrl}</div>
                <div className="text-xl text-blue-600 font-medium truncate hover:underline cursor-pointer">
                  {seoPreviewTitle}
                </div>
                {seoPreviewDesc && (
                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {seoPreviewDesc}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>• عنوان متا باید کمتر از 70 کاراکتر باشد</p>
              <p>• توضیحات متا باید بین 120-160 کاراکتر باشد</p>
              <p>• تصویر شاخص باید حداقل 1200x630 پیکسل باشد</p>
            </div>
          </div>
        </div>
      )}

      {/* ================ TAB: ADVANCED ================ */}
      {activeTab === 'advanced' && (
        <div className="max-w-2xl space-y-6">
          <h3 className="font-bold">تنظیمات پیشرفته</h3>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>وضعیت انتشار</label>
              <select {...register('status')} className={inputClasses}>
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشر شده</option>
                <option value="scheduled">زمان‌بندی شده</option>
                <option value="archived">بایگانی شده</option>
              </select>
            </div>

            <div>
              <label className={labelClasses}>زمان انتشار برنامه‌ریزی شده</label>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="datetime-local" {...register('scheduled_at')}
                  className={`${inputClasses} pr-10`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" {...register('allow_comments')} className="w-4 h-4 rounded" />
              <div>
                <span className="font-medium">فعال بودن نظرات</span>
                <p className="text-xs text-gray-500">کاربران می‌توانند نظر بدهند</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" {...register('is_featured')} className="w-4 h-4 rounded" />
              <div>
                <span className="font-medium flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500" />مقاله ویژه</span>
                <p className="text-xs text-gray-500">در بالای لیست مقالات نمایش داده می‌شود</p>
              </div>
            </label>
          </div>

          <div>
            <label className={labelClasses}>مدت زمان مطالعه (دقیقه)</label>
            <input type="number" readOnly value={estimatedReadingTime}
              className={`${inputClasses} bg-gray-50`} />
            <p className="text-xs text-gray-500 mt-1">بر اساس تعداد کلمات به صورت خودکار محاسبه می‌شود</p>
          </div>
        </div>
      )}
    </form>
  )
}

function Settings(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}