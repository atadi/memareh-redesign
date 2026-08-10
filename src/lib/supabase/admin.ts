import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerUrl, getSupabaseSecretKey } from '@/lib/config'

export function createSupabaseAdmin() {
  const url = getSupabaseServerUrl()
  const secretKey = getSupabaseSecretKey()

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'memareh',
    },
  })
}
