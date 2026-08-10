import { describe, it, expect } from 'vitest'
import { deriveAuthState } from '../src/components/ui/Menu'

type UserInput = { app_metadata?: { role?: unknown } | null } | null

const adminUser: UserInput = { app_metadata: { role: 'admin' } }
const normalUser: UserInput = { app_metadata: { role: 'user' } }
const noRoleUser: UserInput = { app_metadata: {} }
const nullMetaUser: UserInput = {}
const legacyUser: UserInput = { app_metadata: null }

describe('deriveAuthState — admin detection (DEFECT 3)', () => {
  it('admin role => isAdmin true', () => {
    expect(deriveAuthState(adminUser, '').isAdmin).toBe(true)
  })
  it('non-admin roles / missing role => isAdmin false', () => {
    expect(deriveAuthState(normalUser, '').isAdmin).toBe(false)
    expect(deriveAuthState(noRoleUser, '').isAdmin).toBe(false)
    expect(deriveAuthState(nullMetaUser, '').isAdmin).toBe(false)
    expect(deriveAuthState(legacyUser, '').isAdmin).toBe(false)
  })
  it('null user (anonymous) => isAdmin false', () => {
    expect(deriveAuthState(null, '').isAdmin).toBe(false)
  })
})

describe('deriveAuthState — display name (DEFECT 2)', () => {
  it('uses provided display name when present', () => {
    expect(deriveAuthState(normalUser, 'علی').displayName).toBe('علی')
  })
  it('falls back to Persian default when empty', () => {
    expect(deriveAuthState(normalUser, '').displayName).toBe('کاربر')
  })
  it('anonymous still gets a neutral default (never points at /login via this state)', () => {
    expect(deriveAuthState(null, '').displayName).toBe('کاربر')
  })
})

describe('Menu auth-state architecture contract', () => {
  it('only the admin sees پنل مدیریت (isAdmin drives the control)', () => {
    const admin = deriveAuthState(adminUser, 'ادمین')
    const user = deriveAuthState(normalUser, 'کاربر')
    expect(admin.isAdmin).toBe(true)
    expect(user.isAdmin).toBe(false)
  })
})
