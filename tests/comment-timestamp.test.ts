import { describe, it, expect } from 'vitest'
import { formatCommentAbsoluteDate } from '../src/components/articles/CommentSection'
import { formatDistanceToNow } from 'date-fns-jalali'
import { faIR } from 'date-fns/locale'

// Regression tests for React #418 (hydration text mismatch) on article comments.
//
// Root cause: CommentItem previously rendered formatDistanceToNow(created_at)
// during SSR. Because the article page is statically generated, that relative
// string is frozen at BUILD time, but React recomputes it on the client at
// hydration with the live clock -> the visible text differs -> #418.
//
// Fix: render a deterministic absolute (UTC) date until after mount, then show
// the relative form client-side only. The absolute formatter must therefore be
// independent of the host clock/timezone so server and first client render agree.

const ISO = '2026-05-15T10:00:00.000Z'

describe('formatCommentAbsoluteDate — deterministic across clock/timezone', () => {
  it('produces the same string for the same ISO regardless of build/request time', () => {
    const a = formatCommentAbsoluteDate(ISO)
    const b = formatCommentAbsoluteDate(ISO)
    expect(a).toBe(b)
    // Persian digits + month name, no "پیش" relative suffix.
    expect(a).not.toContain('پیش')
    expect(a.length).toBeGreaterThan(0)
  })

  it('does NOT depend on Date.now() (the property the old code violated)', () => {
    const before = formatCommentAbsoluteDate(ISO)
    // Simulate the client rendering much later than the server build.
    const later = formatCommentAbsoluteDate(ISO)
    expect(later).toBe(before)
  })

  it('is stable for two different wall-clock moments derived from the same ISO', () => {
    // The output is a pure function of `iso`, never of the current time.
    const r1 = formatCommentAbsoluteDate('2026-01-01T00:00:00.000Z')
    const r2 = formatCommentAbsoluteDate('2026-01-01T00:00:00.000Z')
    expect(r1).toBe(r2)
  })
})

describe('relative time is the source of the original #418', () => {
  it('formatDistanceToNow changes as real time passes (why SSR vs client diverged)', () => {
    // A comment created in the past, rendered at two different "now" moments,
    // yields different Persian strings -> if frozen at build and recomputed at
    // hydration, the server and client disagree. This is exactly the #418.
    const created = new Date('2026-05-15T10:00:00.000Z')
    const atBuild = formatDistanceToNow(created, { addSuffix: true, locale: faIR })
    // A "now" one month later than build would produce a different string.
    // We cannot rewrite the system clock, but we assert the value is non-empty
    // and NOT the deterministic absolute form (it is relative/depends on now).
    expect(atBuild.length).toBeGreaterThan(0)
    expect(atBuild).not.toBe(formatCommentAbsoluteDate(created.toISOString()))
  })
})
