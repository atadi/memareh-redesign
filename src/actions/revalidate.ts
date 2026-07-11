'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function revalidateArticle(slug?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  revalidatePath('/')
  revalidatePath('/articles')
  if (slug) revalidatePath(`/articles/${slug}`)
}
