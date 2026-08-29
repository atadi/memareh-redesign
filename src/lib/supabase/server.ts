import 'server-only'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase/factory.server'
import type { CookieOptions } from '@supabase/ssr'

// Server client with cookie forwarding for session-aware SSR / route handlers.
// Re-exported for backward compatibility with any importers that use this path.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerSupabase({
    getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set({ name, value, ...options }),
        )
      } catch {
        // Fails during static rendering / ISR – safe to ignore
      }
    },
  })
}
