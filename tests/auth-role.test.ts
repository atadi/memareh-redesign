import { describe, it, expect } from 'vitest'
import { isAdminUser } from '../src/lib/auth-role'

describe('isAdminUser (UI role helper, mirrors assertIsAdmin)', () => {
  it('returns true when app_metadata.role === "admin"', () => {
    expect(isAdminUser({ app_metadata: { role: 'admin' } })).toBe(true)
  })

  it('returns false for non-admin roles', () => {
    expect(isAdminUser({ app_metadata: { role: 'customer' } })).toBe(false)
    expect(isAdminUser({ app_metadata: { role: 'technician' } })).toBe(false)
  })

  it('returns false when role missing/null', () => {
    expect(isAdminUser({ app_metadata: { role: null } })).toBe(false)
    expect(isAdminUser({ app_metadata: {} })).toBe(false)
  })

  it('returns false for null/undefined user', () => {
    expect(isAdminUser(null)).toBe(false)
    expect(isAdminUser(undefined)).toBe(false)
  })
})
