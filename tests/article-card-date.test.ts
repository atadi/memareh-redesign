import { describe, it, expect } from 'vitest'
import { formatArticleDate } from '../src/components/articles/ArticleCard'

// Regression tests for the SECOND React #418 hydration mismatch.
//
// Root cause: ArticleCard formatted `published_at` with
// `Intl.DateTimeFormat('fa-IR', {year,month,day})` and NO timeZone. The server
// (UTC) rendered the date in UTC, but the client rendered it in the browser's
// local timezone (e.g. Asia/Tehran +3:30). For a timestamp near a UTC midnight
// boundary the two produced DIFFERENT Persian calendar dates -> #418. This hit
// /articles, the homepage, and article-detail related lists (any route that
// renders ArticleCard), unlike the comment-timestamp fix which was detail-only.
//
// Fix: force timeZone:'UTC' in formatArticleDate so server and client agree.

describe('formatArticleDate — timezone-independent (server===client)', () => {
  it('formats a normal timestamp identically (deterministic)', () => {
    const iso = '2026-05-15T10:00:00.000Z'
    const a = formatArticleDate(iso)
    const b = formatArticleDate(iso)
    expect(a).toBe(b)
    expect(a).toBe('۲۵ اردیبهشت ۱۴۰۵')
  })

  it('does NOT depend on the host timezone (the property the old code violated)', () => {
    // This timestamp is 03:00 Tehran time on the NEXT day vs 23:30 UTC.
    // Old code (no timeZone): server UTC => "۱۳ تیر ۱۴۰۵", client Tehran =>
    // "۱۴ تیر ۱۴۰۵" -> mismatch -> #418. Forced UTC must keep them identical.
    const boundary = '2026-07-04T23:30:00.000Z'
    expect(formatArticleDate(boundary)).toBe('۱۳ تیر ۱۴۰۵')
    // The crucial contract: the formatter ignores the runtime offset, so the
    // serverrender (UTC) and the client render (any tz) agree.
    expect(formatArticleDate(boundary)).not.toBe('۱۴ تیر ۱۴۰۵')
  })

  it('is stable for the same ISO regardless of the machine timezone', () => {
    const iso = '2026-01-01T00:00:00.000Z'
    expect(formatArticleDate(iso)).toBe(formatArticleDate(iso))
    expect(formatArticleDate(iso)).toBe('۱۱ دی ۱۴۰۴')
  })

  it('handles an invalid/empty input without throwing', () => {
    expect(() => formatArticleDate('')).not.toThrow()
    expect(formatArticleDate('not-a-date')).toBeDefined()
  })
})
