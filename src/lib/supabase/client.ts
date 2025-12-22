import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Debug: print runtime URL in development to help detect env mismatches
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('Supabase client URL (runtime):', process.env.NEXT_PUBLIC_SUPABASE_URL)
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public'
      }
    }
  )
}