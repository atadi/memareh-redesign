# Analytics Audit

Classification: **PARTIAL** — GA4 + Vercel Web Analytics present; no behavioral/conversion/search instrumentation.

## What exists today
- `@vercel/analytics/next` `<Analytics />` in `layout.tsx:119` → Vercel Web Analytics (page views + Web Vitals aggregate).
- GA4 `G-EVR583NXGN` loaded via gtag in `layout.tsx:91-105`, production only.
- No other analytics SDK in `package.json` or source.

## What the app currently CAN answer
- Approximate page views (Vercel + GA4).
- Top pages (GA4).
- Web Vitals summary (Vercel).

## What it CANNOT answer (gaps)
- Which **articles** get traffic by slug (no article-level event; only URL paths).
- **Conversions**: booking submission, contact, article read-depth, call/CTA clicks.
- **Campaign/UTM** effectiveness (GA4 captures by default, but no defined conversion goals).
- **Search queries** users perform (no site search tracking; no search UI observed).
- **Engagement**: scroll/depth, comment submissions, share.
- **Errors by route** (no Sentry/error telemetry).
- **Bot vs human**, **admin traffic exclusion** (no filter defined).
- **view_count** column exists and "popular" sort uses it, but increment path unverified (AN-02).

## Privacy implications
- GA4 + Vercel Analytics are third-party processors; for Iranian/Persian audience consider data-residency and consent. No consent banner observed — confirm GDPR/local compliance needs before expanding tracking.
- Vercel Analytics is privacy-friendly (no cookies); GA4 should have IP anonymization / consent where required.

## Recommendation (no install this phase)
Define a measurement plan: (1) conversion events for booking/contact, (2) article view event, (3) GA4 goals + UTM convention, (4) admin/bot traffic filter. Decide on consent tooling before broadening collection.
