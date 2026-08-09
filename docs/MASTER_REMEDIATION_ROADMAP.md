# Master Remediation Roadmap

Discovery-only. No phase below was executed. Phases are intentionally SMALL and ordered by
production-safety → security → integrity → reliability → observability → SEO → analytics → perf → cleanup → ops.

Each phase lists: findings addressed, objective, expected files/components, production risk,
backup required?, migration required?, verification, rollback.

---

## Phase A — Harden build-time Supabase env coupling & centralize site URL  [P1/P2]
Addresses: DEPLOY-02, PERF-01, SEO-01 (domain), PERF-02 (service-role in sitemap).
Objective: eliminate the class of build failure seen in Preview (`Missing NEXT_PUBLIC_SUPABASE_URL`); centralize one SITE_URL; stop using service-role in sitemap.
Expected files: `lib/site-config.ts` (new SITE_URL constant), `next.config.ts` (optional build-env guard), `src/app/sitemap.ts`, `src/app/articles/[slug]/page.tsx` (use centralized URL).
Production risk: LOW. Backup required: NO. Migration required: NO.
Verification: `pnpm run build` with env absent → clear error; with env → success; `pnpm check:articles-soak` still consistent; `node scripts/vercel-ignore-build.cjs --files=...` unchanged.
Rollback: revert commit.
- **Status: COMPLETE (Phase A implemented).** Files: `src/lib/config.ts` (new central authority + fail-fast), `src/lib/articles.ts` (new public-client queries, fail-soft), `src/lib/supabase/server-public.ts` (uses config), `src/lib/supabase/admin.ts` (`server-only` guard), `src/app/sitemap.ts` (anon client), `src/app/robots.ts` (getSiteUrl), `src/app/layout.tsx` (getSiteUrl), `src/app/articles/[slug]/page.tsx` (getSiteUrl + public slugs), `.env.example` (new). Tests: `tests/config.test.ts`, `tests/articles.test.ts`. Verified: `tsc` clean, 14 unit tests pass, `pnpm run build` passes, build passes WITHOUT `SUPABASE_SERVICE_ROLE_KEY`, build fails fast on missing `NEXT_PUBLIC_SUPABASE_URL`. DEPLOY-02 repo-side RESOLVED; Vercel env completeness still operator-verified.

## Phase B — Resolve `services`/`service_requests` drift  [P1]
Addresses: ARCH-01, DB-02, ARCH-04 (dead getServices if feature deferred).
Objective: decide booking feature intent and make types/DB/code agree.
Two options (user decision):
  (b1) Create missing tables + RLS via a reviewed migration; wire booking UI.
  (b2) Remove dead types + `lib/api/services.ts` + booking stub if deferred.
Expected files: `supabase/migrations/*.sql` (if b1), `database.types.ts`, `lib/api/services.ts`, `docs/BOOKING_INTEGRATION.md`.
Production risk: MEDIUM (migration). Backup required: YES (fresh pre-change backup). Migration required: YES (if b1).
Verification: build; runtime booking smoke; RLS tests (env-gated).
Rollback: down migration / revert removal.
- **Status: BOOKING REMOVED; SERVICES DRIFT REMAINS OPEN.** Product-owner decision: **Booking is not needed → remove Booking completely; Services must remain untouched.** Implemented: deleted `src/app/booking/` + `src/app/booking/success/`, removed `ServiceRequest`/`BookingFormData` from `database.ts`, removed `service_requests` table from `database.types.ts`, deleted `docs/BOOKING_INTEGRATION.md`. Services (`lib/api/services.ts`, `hooks/useServices.ts`, `Service`/`ServiceWithIcon`, `memareh.services` declaration) left fully intact (verified by `tests/booking-removal.test.ts`; build passes). The `services` table drift is re-scoped into **ARCH-01b/DB-02** as a separate deferred issue awaiting a product-owner decision on Services intent (NOT to be addressed merely because Booking was removed).

## Phase C — SEO metadata correctness  [P2]
Addresses: SEO-01, SEO-04, SEO-05.
Objective: single canonical domain; wire `meta_title`/`meta_keywords`/`canonical_url`/`og_image`; add Organization/WebSite/BreadcrumbList JSON-LD.
Expected files: `lib/site-config.ts`, `layout.tsx`, `articles/[slug]/page.tsx`, `sitemap.ts`, `robots.ts`.
Production risk: LOW. Backup: NO. Migration: NO.
Verification: build; fetch `/articles/<slug>` and inspect `<head>` (canonical, OG, JSON-LD) via read-only GET; sitemap/robots domain consistency.
- **Status: COMPLETE (Phase C implemented).** Files: `src/lib/seo.ts` (deterministic metadata + JSON-LD builders), `src/components/SiteStructuredData.tsx` (Organization + WebSite once in layout), `src/app/layout.tsx` (emits site JSON-LD), `src/app/articles/[slug]/page.tsx` (generateMetadata via builder + Article/BreadcrumbList JSON-LD). Tests: `tests/seo.test.ts` (21 tests). Verified: tsc clean, build exit 0, 21 SEO tests pass, soak `SOAK_CONSISTENT`. SEO-01/SEO-04/SEO-05 marked RESOLVED in findings register. No DB/schema/content changes. Canonical `www` authority preserved. Note: SEO-01's www/non-www split was already resolved in Phase A.

## Phase D — Security headers & render-time sanitization  [P2]
Addresses: SEC-01, SEC-02, PERF-02 (service-role removal overlaps Phase A).
Objective: add CSP + frameguard + HSTS; render article content via sanitizing component.
Expected files: `next.config.ts` (headers), `articles/[slug]/page.tsx` (use ArticleContent), optional comment-sanitization review.
Production risk: LOW–MEDIUM (CSP can break inline scripts if mis-scoped). Backup: NO. Migration: NO.
Verification: build; GET article page; confirm headers via `curl -I`; confirm content renders; no console CSP violations in browser.
- **Status: COMPLETE (SEC-01 RESOLVED; SEC-02 PARTIAL).**
  - SEC-01: `articles/[slug]/page.tsx` now renders via `ArticleContent` (single sanitization boundary); `sanitizeHtml` (src/lib/html-sanitizer.ts, isomorphic-dompurify, SSR-safe) is the one sanitizer reused by render + editor write/preview; XSS vectors stripped, Persian/tables/code preserved (tests/html-sanitizer.test.ts).
  - SEC-02: `next.config.ts` headers() emits CSP + HSTS + nosniff + Referrer-Policy + Permissions-Policy + X-Frame-Options + COOP/COCP. CSP is ENFORCED but `script-src`/`style-src` keep `'unsafe-inline'` (Next.js inline hydration + inline GA4) → PARTIAL until a nonce-based architecture is adopted (out of scope). Verified by tests/security-headers.test.ts + local `curl -I`.
  - New dep: `isomorphic-dompurify` (justified: SSR-safe + testable DOMPurify for render-time sanitization).

## Phase E — Observability foundation  [P2]
Addresses: OBS-01, AN-01 (telemetry half).
Objective: minimal error tracking + Supabase log alerting + uptime check.
Expected files: `layout.tsx` (error reporter) or a tiny `/api/error` route; Vercel/GA4 alert config; optional Sentry.
Production risk: LOW. Backup: NO. Migration: NO. External: dashboard config (operator).
Verification: trigger a test error in Preview; confirm it appears in dashboard.

## Phase F — Analytics instrumentation  [P2]
Addresses: AN-01, AN-02.
Objective: define measurement plan; conversion events (booking/contact); article view increment; GA4 goals + UTM convention; admin/bot filter.
Expected files: `lib/analytics.ts` (event helpers), booking/contact forms, article view effect.
Production risk: LOW. Backup: NO. Migration: NO (view_count increment may need a secured RPC — REQUIRES CONTROLLED TEST ENV if mutation proven).
Verification: Preview events appear in GA4 DebugView; `view_count` increments for a test article in a test env.

## Phase G — Structural cleanup  [P3]
Addresses: ARCH-02, ARCH-03, ARCH-04 (if deferred), DB-01 (nullable slug — needs migration).
Objective: gitignore + untrack `graphify-out/`; remove deprecated `@supabase/auth-helpers-nextjs`; remove dead services code (with Phase B decision); tighten `slug` NOT NULL (migration + backup).
Expected files: `.gitignore`, `package.json` (dep removal), `lib/api/services.ts`, migration for slug.
Production risk: LOW–MEDIUM (slug NOT NULL migration). Backup: YES for slug change. Migration: YES (slug).
Verification: build; `git status` clean of graphify-out; tsc; soak checker consistent.

## Phase H — Backup automation  [OPS]
Addresses: OPS-01.
Objective: scheduled, off-site, encrypted backups with checksum verify + retention + periodic restore drill.
Expected: separate automation host/cron (may live outside this repo). No app code change required.
Production risk: LOW. External/operator action: YES.

---

## Ordering rationale
- Phase A first: it prevents recurrence of a REAL prior production build failure, needs no DB migration, and is low-risk. It also retires the service-role-in-sitemap over-privilege (security) and the www/non-www split (SEO) in one small change.
- Phase B next: the only P1 data-integrity defect; needs a user decision + migration, so it is sequenced after the no-migration hardening.
- Then SEO/security/observability/analytics/cleanup — all low-risk, no-migration (except slug tightening in G).
