import { createClient } from './supabase/client';

// Create a client instance
const supabase = createClient();

export async function uploadFeaturedImage(file: File): Promise<{
  url: string | null;
  error: string | null;
}> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: 'فایل باید از نوع تصویر باشد' };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: 'حجم تصویر نباید بیشتر از 5 مگابایت باشد' };
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `featured/${fileName}`;

    console.log('Uploading to Supabase Storage:', filePath);

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('article-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, error: `خطا در آپلود: ${uploadError.message}` };
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('article-images')
      .getPublicUrl(filePath);

    console.log('Public URL:', publicUrl);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { url: null, error: 'خطای غیرمنتظره در آپلود تصویر' };
  }
}

export async function deleteFeaturedImage(url: string): Promise<boolean> {
  try {
    const urlParts = url.split('/article-images/');
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('article-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}