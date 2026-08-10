// Central application configuration / environment validation.
//
// This module is SAFE TO IMPORT FROM CLIENT COMPONENTS: it only reads
// NEXT_PUBLIC_* variables (inlined into the browser bundle by Next.js) and
// never touches server-only secrets (service-role key, etc.).
//
// Design rules (Phase A):
// - One authority for the canonical site origin: getSiteUrl().
// - Public Supabase config (URL + anon key) is required for build + runtime.
// - Each getter fails FAST with a clear message when its REQUIRED variable is
//   missing. Temporary upstream/data failures are handled at the call site,
//   not here, so genuine configuration defects are never hidden.

/** Strip a trailing slash so callers never manage it inconsistently. */
function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Canonical site origin (e.g. https://www.memareh.com).
 *
 * - Production builds MUST declare NEXT_PUBLIC_SITE_URL (fail-fast if absent).
 * - Preview deployments should also set NEXT_PUBLIC_SITE_URL to the production
 *   canonical origin so Preview never publishes a Preview URL as canonical SEO.
 * - Local development falls back to http://localhost:3000.
 *
 * We deliberately do NOT use VERCEL_URL as the canonical SEO origin.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL
  if (raw && raw.trim().length > 0) {
    return stripTrailingSlash(raw.trim())
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[config] Missing required environment variable NEXT_PUBLIC_SITE_URL ' +
        '(production canonical site origin)',
    )
  }
  return 'http://localhost:3000'
}

/** Supabase project URL. Required for any Supabase client (build + runtime). */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      '[config] Missing required environment variable NEXT_PUBLIC_SUPABASE_URL',
    )
  }
  return stripTrailingSlash(raw.trim())
}

/** Supabase publishable/anon key. Safe to expose in the browser bundle. */
export function getSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      '[config] Missing required environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }
  return raw.trim()
}
