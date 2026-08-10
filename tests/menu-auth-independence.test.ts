import { describe, it, expect } from 'vitest'
import { deriveAuthState } from '../src/components/ui/Menu'

// Regression coverage for the production "admin button missing" defect.
// The defect was NOT in isAdminUser logic (that always passed). The real risk is
// that auth identity (and thus the admin branch) could be coupled to the optional
// profile display-name fetch. These tests prove the admin/authenticated decision
// depends ONLY on the resolved Supabase user's app_metadata, never on the
// profile/display-name value, and that an admin user is recognized even when no
// display name is available (the realistic hardened path).

type UserInput = { app_metadata?: { role?: unknown } | null } | null

describe('auth state is independent of profile/display-name lookup', () => {
  it('admin recognized with empty display name (profile fetch not required)', () => {
    const admin: UserInput = { app_metadata: { role: 'admin' } }
    const s = deriveAuthState(admin, '')
    expect(s.isAdmin).toBe(true)
    expect(s.displayName).toBe('کاربر') // fallback, not a blocker
  })

  it('admin recognized with a real Persian display name', () => {
    const admin: UserInput = { app_metadata: { role: 'admin' } }
    const s = deriveAuthState(admin, 'مدیر سایت')
    expect(s.isAdmin).toBe(true)
    expect(s.displayName).toBe('مدیر سایت')
  })

  it('non-admin with display name is never admin', () => {
    const user: UserInput = { app_metadata: { role: 'user' } }
    expect(deriveAuthState(user, 'علی').isAdmin).toBe(false)
  })

  it('anonymous (null user) shows no admin regardless of display name', () => {
    expect(deriveAuthState(null, 'کاربر').isAdmin).toBe(false)
  })

  it('mirrors the shared isAdminUser authority exactly', () => {
    // Menu must derive admin from app_metadata.role — same source as the server
    // assertIsAdmin guard. Any other source would desync UI from server authz.
    const cases: { role: unknown; expected: boolean }[] = [
      { role: 'admin', expected: true },
      { role: 'user', expected: false },
      { role: undefined, expected: false },
      { role: null, expected: false },
    ]
    for (const c of cases) {
      const u: UserInput = { app_metadata: { role: c.role } }
      expect(deriveAuthState(u, '').isAdmin).toBe(c.expected)
    }
  })
})
