import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  getSupabaseUrl,
  getSupabasePublishableKey,
} from '@/lib/config'

/**
 * Client-safe Supabase factories (no server-only imports).
 *
 * These build anonymous clients using the publishable key, which is safe to
 * inline into the browser bundle. This module is intentionally NOT marked
 * `server-only`: it is imported by client components via client.ts.
 *
 * Single source of truth for the Supabase URL, publishable key, and db schema.
 */
const DB_SCHEMA = 'memareh'

/** Browser client (client components). */
export function createBrowserSupabase() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    db: { schema: DB_SCHEMA },
  })
}

/** Public server client — no cookies, no session (ISR / static safe). */
export function createPublicSupabase() {
  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    db: { schema: DB_SCHEMA },
  })
}
