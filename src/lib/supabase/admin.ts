import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/factory.server'

// Privileged admin client (service role). Server-only.
// Re-exported for backward compatibility with API route importers.
export function createSupabaseAdmin() {
  return createAdminSupabase()
}
