import { createClient } from './supabase/client'

const supabase = createClient()

async function uploadImage(
  file: File,
  pathPrefix: string,
  maxSizeMB: number = 5,
  acceptVideo: boolean = false
): Promise<{ url: string | null; error: string | null }> {
  try {
    if (!acceptVideo && !file.type.startsWith('image/')) {
      return { url: null, error: 'فایل باید از نوع تصویر باشد' }
    }

    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return { url: null, error: `حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد` }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${pathPrefix}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return { url: null, error: `خطا در آپلود: ${uploadError.message}` }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('article-images')
      .getPublicUrl(filePath)

    return { url: publicUrl, error: null }
  } catch (error) {
    return { url: null, error: 'خطای غیرمنتظره در آپلود' }
  }
}

export async function uploadFeaturedImage(file: File): Promise<{ url: string | null; error: string | null }> {
  return uploadImage(file, 'featured')
}

export async function uploadContentImage(file: File): Promise<{ url: string | null; error: string | null }> {
  return uploadImage(file, 'content', 10)
}

export async function uploadVideoFile(file: File): Promise<{ url: string | null; error: string | null }> {
  return uploadImage(file, 'videos', 50, true)
}

export async function deleteStorageFile(url: string): Promise<boolean> {
  try {
    const urlParts = url.split('/article-images/')
    if (urlParts.length < 2) return false

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('article-images')
      .remove([filePath])

    if (error) return false
    return true
  } catch {
    return false
  }
}