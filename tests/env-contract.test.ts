import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  getSupabaseUrl,
  getSupabasePublishableKey,
  getSupabaseServerUrl,
  getSupabaseSecretKey,
} from '../src/lib/config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('env contract: modern integration-native names', () => {
  it('browser config requires NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    expect(() => getSupabasePublishableKey()).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    )
  })

  it('browser config does NOT require SUPABASE_SECRET_KEY', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key')
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    expect(getSupabasePublishableKey()).toBe('pub-key')
  })

  it('admin/server config requires SUPABASE_SECRET_KEY', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    expect(() => getSupabaseSecretKey()).toThrow(/SUPABASE_SECRET_KEY/)
  })

  it('server URL prefers SUPABASE_URL, falls back to public URL', () => {
    vi.stubEnv('SUPABASE_URL', 'https://svc.supabase.co')
    expect(getSupabaseServerUrl()).toBe('https://svc.supabase.co')
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://pub.supabase.co')
    expect(getSupabaseServerUrl()).toBe('https://pub.supabase.co')
  })

  it('legacy names alone do NOT satisfy the contract', () => {
    // Only legacy/incorrect names are present; modern names absent -> fail-fast.
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'legacy-anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy-svc')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    expect(() => getSupabasePublishableKey()).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    )
    expect(() => getSupabaseSecretKey()).toThrow(/SUPABASE_SECRET_KEY/)
  })

  it('public build succeeds without the privileged secret', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key')
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    expect(getSupabaseUrl()).toBe('https://xyz.supabase.co')
    expect(getSupabasePublishableKey()).toBe('pub-key')
  })
})
