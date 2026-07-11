import { createClient } from '@supabase/supabase-js'

// Public server client — no cookies, no session.
// Use for public pages that only read published data (articles, comments).
// Does NOT use `cookies()`, so it works with ISR / static generation.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, anonKey, {
    db: { schema: 'memareh' },
  })
}
