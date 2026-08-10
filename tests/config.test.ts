import { describe, it, expect, afterEach, vi } from 'vitest'
import { getSiteUrl, getSupabaseUrl, getSupabasePublishableKey } from '../src/lib/config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('config: site URL', () => {
  it('returns the configured production URL, normalized (no trailing slash)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.memareh.com/')
    expect(getSiteUrl()).toBe('https://www.memareh.com')
  })

  it('falls back to localhost in non-production when unset', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('NODE_ENV', 'development')
    expect(getSiteUrl()).toBe('http://localhost:3000')
  })

  it('fails fast in production when NEXT_PUBLIC_SITE_URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL/)
  })
})

describe('config: public Supabase', () => {
  it('returns normalized URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co/')
    expect(getSupabaseUrl()).toBe('https://xyz.supabase.co')
  })

  it('fails fast when URL missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    expect(() => getSupabaseUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('fails fast when publishable key missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    expect(() => getSupabasePublishableKey()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('does NOT require the secret key for public config', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-publishable-key')
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    expect(getSupabaseUrl()).toBe('https://xyz.supabase.co')
    expect(getSupabasePublishableKey()).toBe('public-publishable-key')
  })
})
