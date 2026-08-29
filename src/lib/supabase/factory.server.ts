import 'server-only'
import {
  createServerClient,
  type CookieMethodsServer,
} from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  getSupabaseUrl,
  getSupabasePublishableKey,
  getSupabaseServerUrl,
  getSupabaseSecretKey,
} from '@/lib/config'

/**
 * Server-only Supabase factories (privileged / cookie-aware).
 *
 * Single source of truth for the session-aware server client and the
 * service-role admin client. This module is `server-only` and must never be
 * imported from a client component.
 */
const DB_SCHEMA = 'memareh'

/** Server client with cookie forwarding (session-aware SSR / route handlers). */
export function createServerSupabase(cookies: CookieMethodsServer) {
  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    db: { schema: DB_SCHEMA },
    cookies,
  })
}

/** Privileged admin client (service role). Server-only. */
export function createAdminSupabase() {
  return createClient(getSupabaseServerUrl(), getSupabaseSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: { schema: DB_SCHEMA },
  })
}
