import { describe, it, expect } from 'vitest'
import { csp, securityHeaders } from '../src/lib/security-headers'

const headerMap = Object.fromEntries(securityHeaders.map((h) => [h.key, h.value]))

describe('security headers — baseline present', () => {
  it('emits Content-Security-Policy', () => {
    expect(headerMap['Content-Security-Policy']).toBeTypeOf('string')
  })
  it('HSTS present (no preload/includeSubDomains — conservative)', () => {
    expect(headerMap['Strict-Transport-Security']).toBe('max-age=63072000')
  })
  it('nosniff present', () => {
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff')
  })
  it('Referrer-Policy is safe', () => {
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
  })
  it('Permissions-Policy disables unused capabilities', () => {
    expect(headerMap['Permissions-Policy']).toContain('camera=()')
    expect(headerMap['Permissions-Policy']).toContain('microphone=()')
    expect(headerMap['Permissions-Policy']).toContain('geolocation=()')
    expect(headerMap['Permissions-Policy']).toContain('payment=()')
  })
  it('frame protection present', () => {
    expect(headerMap['X-Frame-Options']).toBe('DENY')
  })
})

describe('CSP — source matrix is evidence-based', () => {
  it('locks down high-risk directives', () => {
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("object-src 'none'")
  })

  it('allows required Supabase origins', () => {
    expect(csp).toContain('uakvurskrcyvksxfvhho.supabase.co')
  })

  it('allows GA4 + Vercel Analytics origins', () => {
    expect(csp).toContain('https://www.googletagmanager.com')
    expect(csp).toContain('https://va.vercel-scripts.com')
    expect(csp).toContain('https://www.google-analytics.com')
    expect(csp).toContain('https://region1.google-analytics.com')
  })

  it('allows dicebear avatars + data: images', () => {
    expect(csp).toContain('https://api.dicebear.com')
    expect(csp).toContain('data:')
  })

  it('documents unsafe-inline necessity (maturity PARTIAL)', () => {
    // Next.js inline hydration + inline GA4 <Script> require unsafe-inline.
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('does NOT allow unsafe-eval', () => {
    expect(csp).not.toContain('unsafe-eval')
  })
})
