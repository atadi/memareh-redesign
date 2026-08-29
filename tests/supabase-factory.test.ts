import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  createBrowserSupabase,
  createPublicSupabase,
} from '../src/lib/supabase/factory'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('supabase factory (client-safe)', () => {
  it('createPublicSupabase builds an anonymous client at the configured URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co/')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-anon-key-value')

    const client = createPublicSupabase()
    expect(
      (client as unknown as { supabaseUrl: string }).supabaseUrl,
    ).toBe('https://xyz.supabase.co')
  })

  it('createBrowserSupabase builds a browser client at the configured URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co/')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-anon-key-value')

    const client = createBrowserSupabase()
    expect(
      (client as unknown as { supabaseUrl: string }).supabaseUrl,
    ).toBe('https://xyz.supabase.co')
  })

  it('fails fast when the publishable key is missing (centralised config)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz.supabase.co/')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    expect(() => createBrowserSupabase()).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    )
  })
})
