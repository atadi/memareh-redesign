import { createBrowserSupabase } from '@/lib/supabase/factory'

// Re-exported for backward compatibility with the 11 client components that
// import `createClient` from here. The implementation now lives in factory.ts.
// NOTE: this module is intentionally NOT server-only — it is imported by
// client components (Menu, CommentSection, etc.).
export function createClient() {
  return createBrowserSupabase()
}
