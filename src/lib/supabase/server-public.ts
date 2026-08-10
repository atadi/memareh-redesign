import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/config'

// Public server client — no cookies, no session.
// Use for public pages that only read published data (articles, comments).
// Does NOT use `cookies()`, so it works with ISR / static generation.
//
// Validation is centralized in src/lib/config.ts (fail-fast on missing config).
export function createPublicClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    db: { schema: 'memareh' },
  })
}
