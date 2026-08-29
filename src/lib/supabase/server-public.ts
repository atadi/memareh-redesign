import 'server-only'
import { createPublicSupabase } from '@/lib/supabase/factory'

// Public server client — no cookies, no session.
// Use for public pages that only read published data (articles, comments).
// Does NOT use `cookies()`, so it works with ISR / static generation.
// Re-exported for backward compatibility with importers (src/lib/articles.ts,
// src/app/page.tsx, src/app/articles/page.tsx).
export function createPublicClient() {
  return createPublicSupabase()
}
