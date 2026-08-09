# Master Audit Findings Register

Production application health, SEO, analytics, architecture, DB integrity, performance,
security, content quality, deployment reliability, observability — DISCOVERY/AUDIT ONLY.

All findings are evidence-backed. No remediation was performed in this phase.
Production was queried read-only (catalog/SELECT only). No migrations, no writes.

Snapshot taken: 2026-08-09 (archive soak in progress; public.articles archived to
legacy_articles.articles = 26 rows; canonical memareh.articles = 25 published).

Severity scale: P0 Critical · P1 High · P2 Medium · P3 Low · INFO.

---

## Counts

> Normalized during Phase A (prior summary undercounted P2/P3/INFO). Source of
> truth is the finding ID list below. Total findings: 29.

| Severity | Count | Note |
|----------|-------|------|
| P0       | 0     | |
| P1       | 3     | ARCH-01, DB-02, DEPLOY-02 |
| P2       | 12    | SEO-01, SEO-04, SEO-05, AN-01, PERF-01, PERF-02, SEC-01, SEC-02, DB-01, OBS-01, OPS-01, ARCH-03 |
| P3       | 7     | SEO-02, SEO-03, AN-02 (dual P3/INFO), PERF-03, DATA-02, ARCH-02, ARCH-04 |
| INFO     | 7     | SEC-03, SEC-04, DB-03, DB-04, DATA-01, DEPLOY-01, DEPLOY-03 |

AN-02 carries a dual `P3 / INFO` tag; counted under P3 above.

---

## Findings

### ARCH-01a — Booking / `service_requests` code+types absent in DB, feature removed  [P1]
- Category: ARCH / DB
- Confidence: HIGH
- Evidence:
  - `src/types/database.types.ts` declared `memareh.service_requests`; `src/types/database.ts` declared `ServiceRequest` + `BookingFormData` interfaces.
  - Live catalog introspection: `information_schema.tables` for `service_requests` across ALL schemas returns `[]`.
  - Booking routes `src/app/booking/page.tsx` + `src/app/booking/success/page.tsx` were hard `redirect('/articles')` stubs; `src/components/booking/` never existed.
- Affected: `database.types.ts`, `database.ts`, `docs/BOOKING_INTEGRATION.md`, booking feature.
- Impact (pre-removal): Booking was non-functional (no `service_requests` table); type/schema disagreement undermined data-layer trust.
- Remediation: product decision — **Booking is not needed** (Phase: remove booking completely). Remove booking routes, booking-only types, and booking doc. Services domain left untouched.
- Code change: YES (removal only). DB schema change: NO. Production data mutation: NO. External/operator action: NO.
- Classification: RESOLVED BY REMOVAL.
- **Status (Phase: Remove Booking): RESOLVED BY REMOVAL.** `src/app/booking/` + `src/app/booking/success/` deleted; `ServiceRequest` + `BookingFormData` removed from `src/types/database.ts`; `service_requests` table removed from `src/types/database.types.ts`; `docs/BOOKING_INTEGRATION.md` deleted. Verified by `tests/booking-removal.test.ts` (booking artifacts gone, Services helpers/types intact). No DB change, no Services change.

### ARCH-01b / DB-02 — `services` table queried in code but absent in DB (drift REMAINS)  [P1]
- Category: ARCH / DB
- Confidence: HIGH
- Evidence:
  - `src/types/database.types.ts:140` declares `memareh.services`; `src/lib/api/services.ts` calls `supabase.from('services').select('*')` (getServices/getServiceById/getServicesByCategory/getEmergencyServices).
  - `src/hooks/useServices.ts` consumes those helpers.
  - Live catalog introspection: `information_schema.tables` for `services` across ALL schemas returns `[]`.
- Affected: `lib/api/services.ts`, `hooks/useServices.ts`, `database.types.ts`, `database.ts` (`Service`/`ServiceWithIcon`).
- Impact: Any path activating Services throws `relation "services" does not exist`. Services is a SEPARATE, still-unresolved concern from Booking.
- Remediation: Decide intent — either (a) author + apply a migration creating `services` with RLS, or (b) remove the dead Services types/code. Requires a production migration + fresh backup + product-owner decision. Must NOT be addressed merely because Booking was removed.
- Code change: NO this phase. DB schema change: NO this phase. Production data mutation: NO. External/operator action: PENDING product decision.
- Classification: DB STALE / CODE STALE / INTENT UNCLEAR — RE-SCOPED (Booking removed; Services drift remains its own deferred issue).
- **Status (Phase: Remove Booking): RE-SCOPED / REMAINS OPEN.** Booking removal did NOT touch Services (per explicit product-owner constraint). `Service`, `ServiceWithIcon`, `lib/api/services.ts`, and `hooks/useServices.ts` are all retained intact (verified by `tests/booking-removal.test.ts`). The `services` table drift is a distinct deferred issue awaiting product-owner decision; tracked here so it is not lost.

### DEPLOY-02 — Build requires Supabase service-role + URL at build time; Vercel env completeness unverified  [P1]
- Category: DEPLOY
- Confidence: HIGH
- Evidence:
  - `src/app/articles/[slug]/page.tsx:9` `generateStaticParams` calls `createSupabaseAdmin()` (service role).
  - `src/app/sitemap.ts:5` builds a client with `SUPABASE_SERVICE_ROLE_KEY` directly.
  - Prior Vercel build failure was exactly `Missing NEXT_PUBLIC_SUPABASE_URL` in Preview env (resolved by operator manually). The same class of failure recurs if `SUPABASE_SERVICE_ROLE_KEY` is missing or not "exposed for build" in any Vercel environment.
- Impact: a missing/incomplete Vercel build env var fails the ENTIRE Next.js build (no graceful degradation). Already happened once in Preview.
- Remediation: verify both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present and "exposed for build" in Preview AND Production Vercel env; add a build-time guard that fails fast with a clear message; or decouple sitemap/static-params from service-role (see PERF-02). Operator action required for env verification.
- Code change: YES (small guard/centralization). DB schema change: NO. Production data mutation: NO. External/operator action: YES (Vercel env confirmation).
- Classification: REPOSITORY VERIFIED for code path; VERCEL EXTERNAL CONFIGURATION REQUIRES OPERATOR VERIFICATION.
- **Status (Phase A): PARTIALLY RESOLVED.** Repository-side hardening done: `src/lib/config.ts` centralizes + fails-fast on missing `NEXT_PUBLIC_SUPABASE_URL`/anon key; `generateStaticParams` + sitemap now use the PUBLIC/anon client (no service role at build). Verified: build succeeds WITHOUT `SUPABASE_SERVICE_ROLE_KEY`. Remaining: Vercel dashboard env completeness (operator confirmation) — `NEXT_PUBLIC_SUPABASE_URL`, anon key, `NEXT_PUBLIC_SITE_URL` must be set in Preview+Prod; `SUPABASE_SERVICE_ROLE_KEY` still needed at RUNTIME only (admin API).

---

### SEO-01 — Canonical domain inconsistency (www vs non-www)  [P2]
- Category: SEO
- Confidence: HIGH
- Evidence:
  - `src/app/layout.tsx:21` `metadataBase: new URL("https://memareh.com")` (no www).
  - `src/app/articles/[slug]/page.tsx:18` `const siteUrl = "https://www.memareh.com"` (WITH www) — used for canonical + OG/Twitter + JSON-LD URLs.
  - `src/app/sitemap.ts:18` and `src/app/robots.ts:10` use `https://memareh.com` (no www).
- Impact: article pages advertise `www.` canonical while home/sitemap/robots use non-www. Search engines may treat them as duplicate hosts → split link equity, inconsistent indexing.
- Remediation: centralize a single `SITE_URL` constant (no www) and use it everywhere; add a redirect/normalize rule if www is unwanted, or vice versa. No DB change.
- Code change: YES. DB schema: NO. Data mutation: NO. External: NO.
- **Status (Phase A): RESOLVED (canonical authority empirically confirmed www).** Live `https://memareh.com/` 301-redirects to `https://www.memareh.com/`, so `www` is the authoritative canonical host. All generated origins now flow from `getSiteUrl()` (backed by `NEXT_PUBLIC_SITE_URL`, set to `https://www.memareh.com`): `layout.tsx` metadataBase + OG url, article canonical/OG/Twitter/JSON-LD, sitemap URLs, robots sitemap URL. Non-www literals removed from `src/`.

### SEO-02 — robots.txt disallows /login but app links use /login  [P3]
- Category: SEO
- Confidence: HIGH
- Evidence: `src/app/robots.ts:8` `disallow: ['/admin','/api','/login']`.
- Impact: minor; /login is an auth page, disallowing is fine, but ensure no public content sits under /login. Low.
- Remediation: keep; confirm no indexable content under disallowed paths.

### SEO-03 — Sitemap coverage OK but minimal  [P3]
- Category: SEO
- Confidence: HIGH
- Evidence: sitemap emits home + 25 `/articles/<slug>` for `status='published'`; DB has exactly 25 published, 0 drafts/scheduled → full coverage, no stale/orphan entries. No tag/category pages, no pagination pages, root `lastModified: new Date()` (no stable value).
- Impact: acceptable today; will need tag/category URLs when those pages exist.
- Remediation: add tag/category sitemap entries when those routes ship; consider stable lastmod.

### SEO-04 — Structured data limited to Article schema  [P2]
- Category: SEO
- Confidence: HIGH
- Evidence: only `Article` JSON-LD on detail pages (`page.tsx:167`). No `Organization`, `WebSite`/`SearchAction`, `BreadcrumbList` on any route. Root layout has no JSON-LD.
- Impact: missed rich-result opportunities (breadcrumbs, sitelinks search box, brand panel).
- Remediation: add Organization + WebSite + BreadcrumbList JSON-LD; enhance Article with `articleSection`/author profile.
- Code change: YES. DB: NO.
- **Status (Phase C): RESOLVED.** Added site-level JSON-LD (`Organization` + `WebSite`) once in `layout.tsx` via `src/components/SiteStructuredData.tsx`. Article pages now emit `Article` + `BreadcrumbList` JSON-LD (`src/lib/seo.ts` builders, consumed by `articles/[slug]/page.tsx`). Article author/publisher reference the shared Organization `@id`. Breadcrumb is Home → Article (no `/articles` index route exists, so a middle "مقالات" crumb is intentionally omitted to avoid a 404). Article JSON-LD unchanged in required fields (headline/image/url/mainEntityOfPage/datePublished/dateModified/inLanguage). No Social/SearchAction invented.

### SEO-05 — Declared SEO columns unused by generateMetadata  [P2]
- Category: SEO / DATA
- Confidence: HIGH
- Evidence: `memareh.articles` has `meta_title`, `meta_description`, `meta_keywords`, `canonical_url`, `og_image` columns, but `generateMetadata` only reads `title`, `excerpt`, `featured_image`. The dedicated SEO columns are never rendered.
- Impact: either dead schema (confusion) or a missed per-article SEO control. Currently all articles use title/excerpt as title/description.
- Remediation: wire `meta_title`/`meta_description`/`meta_keywords`/`canonical_url`/`og_image` into generateMetadata with fallback to title/excerpt; or drop the columns if undesired. Decide with user.
- Code change: YES. DB: NO (columns exist). Data mutation: NO.
- **Status (Phase C): RESOLVED.** `generateMetadata` now reads the dedicated SEO columns with deterministic fallbacks (via `buildArticleMetadata` in `src/lib/seo.ts`): `meta_title`→`title`→site suffix; `meta_description`→`excerpt`→site fallback; `meta_keywords[]` wired when non-empty; `canonical_url` used only if a valid absolute http(s) URL (else generated `<site>/articles/<slug>`); `og_image`→`featured_image`(absolute storage)→site default; `featured_image_alt`→title. Empty-string values are treated as absent (DB stores '' for og_image/alt). Live audit confirmed all 25 published articles have these columns populated, so author-supplied SEO now renders instead of only title/excerpt. No DB content changed.

### AN-01 — Analytics is PARTIAL; no event/conversion/search/Web-Vitals instrumentation  [P2]
- Category: AN
- Confidence: HIGH
- Evidence:
  - `src/app/layout.tsx:7` `@vercel/analytics/next` `<Analytics />` present.
  - `layout.tsx:91-105` GA4 `G-EVR583NXGN` via gtag (production only).
  - No event tracking, no conversion events, no search analytics, no article-view events, no bot/admin-traffic exclusion, no Sentry/error telemetry.
- Classification: PARTIAL (GA4 + Vercel Web Analytics present; no behavioral/conversion instrumentation).
- Impact: can answer "how many / which pages" roughly, but not "which content converts", "which campaigns work", "where users drop", "search queries", or "errors by route".
- Remediation: define a measurement plan (conversions = booking submit, contact, article read); add GA4 events; exclude admin/bot traffic via filters. No code that changes behavior beyond analytics calls.
- Code change: YES. DB: NO. External: GA4 dashboard config (operator).

### AN-02 — `view_count` column exists but increment path unverified  [P3 / INFO]
- Category: AN / DATA
- Confidence: MEDIUM
- Evidence: `articles.view_count` column present; `src/app/articles/page.tsx:26` "popular" sort orders by `view_count`. No increment logic observed in reviewed read paths. Likely incremented via client/article view effect (not in server components reviewed) OR not at all.
- Impact: if never incremented, "popular" sort is static/meaningless.
- Remediation: verify/implement a view-count increment (respecting privacy; server-side or trusted client). REQUIRES CONTROLLED TEST ENVIRONMENT if mutation needed to prove.

### PERF-01 — Build-time Supabase coupling fails whole build on missing env  [P2]
- Category: PERF / DEPLOY
- Confidence: HIGH
- Evidence: generateStaticParams + sitemap require build-time Supabase access; the prior Preview build failed with `Missing NEXT_PUBLIC_SUPABASE_URL`. No try/catch or fallback; an exception aborts the build.
- Impact: deployment reliability; any missing var → no deploy.
- Remediation: centralize env access; fail fast with explicit message; or make static generation resilient (skip/empty when data unavailable in non-prod). See DEPLOY-02.
- Code change: YES. DB: NO.
- **Status (Phase A): RESOLVED.** `src/lib/config.ts` centralizes env + fails fast; `generateStaticParams`/`sitemap` use the public client. Config-error (missing URL) still fails the build with a clear message; temporary upstream failure fails soft (returns [], ISR serves at runtime). Verified by build matrix.

### PERF-02 — Sitemap uses over-privileged service-role key  [P2]
- Category: PERF / SEC
- Confidence: HIGH
- Evidence: `src/app/sitemap.ts:5-11` builds a client with `SUPABASE_SERVICE_ROLE_KEY` to read published articles (public data). Service role bypasses RLS — unnecessary privilege in a generated route.
- Impact: violates least-privilege; widens blast radius if sitemap code or deps are compromised. Also contributes to build-env coupling (DEPLOY-02).
- Remediation: use the public/anon client (`createPublicClient`) for published articles in sitemap; reserve service role for admin-only paths.
- Code change: YES. DB: NO.
- **Status (Phase A): RESOLVED.** `src/app/sitemap.ts` now uses `createPublicClient()` (anon key) + `getPublishedArticlesForSitemap()`; no `SUPABASE_SERVICE_ROLE_KEY` read. Public "read published articles" RLS already permits this (no policy change). Build matrix confirms build succeeds without the service role.

### PERF-03 — Article detail issues 4 sequential queries; admin RPC even with zero comments  [P3]
- Category: PERF
- Confidence: MEDIUM
- Evidence: `page.tsx` runs article → comments → profiles → `check_admin_users` RPC. The RPC is invoked for all comment user_ids even when there are no comments (empty array → harmless but unnecessary round-trip).
- Impact: minor latency; not user-visible at this scale.
- Remediation: skip admin-RPC when comment list empty; consider parallel queries.

### SEC-01 — `article.content` rendered via dangerouslySetInnerHTML without sanitization on public page  [P2]
- Category: SEC
- Confidence: MEDIUM
- Evidence:
  - `src/app/articles/[slug]/page.tsx:217` `<div dangerouslySetInnerHTML={{ __html: article.content }} />` — NO DOMPurify.
  - `src/components/articles/ArticleContent.tsx:12` and `ArticleEditor.tsx:974` DO sanitize with `DOMPurify.sanitize`.
  - `ArticleEditor.tsx:499` saves `DOMPurify.sanitize(content)` (write-time sanitization).
- Impact: public render trusts stored HTML. Safe ONLY if every write path sanitizes (editor does). Risk if any legacy/imported/API-inserted content bypassed sanitization, or if DOMPurify config at write time is weak. Defense-in-depth gap.
- Remediation: sanitize at render too (use ArticleContent component on the public page) OR assert a guaranteed write-time contract + test. Prefer rendering via the already-sanitizing `ArticleContent` component.
- Code change: YES. DB: NO.

### SEC-02 — No CSP / security headers configured  [P2]
- Category: SEC
- Confidence: HIGH
- Evidence: `next.config.ts` has no `headers()` for CSP/X-Frame-Options/HSTS; middleware sets no security headers. (Vercel may add HSTS at edge by default, but no explicit app policy.)
- Impact: given `dangerouslySetInnerHTML` usage, a Content-Security-Policy would materially reduce XSS blast radius.
- Remediation: add a CSP (at least `script-src`, `img-src` for Supabase Storage + self) + `X-Frame-Options`/frameguard + HSTS in `next.config.ts` headers().
- Code change: YES. DB: NO.

### SEC-03 — `/api/revalidate` is token-protected  [INFO / PASS]
- Category: SEC
- Confidence: HIGH
- Evidence: `src/app/api/revalidate/route.ts` requires `Bearer ${REVALIDATION_TOKEN}`; returns 401 otherwise. Good practice.
- Impact: positive; no change required. Verify `REVALIDATION_TOKEN` is actually set in Vercel env (operator).

### SEC-04 — Admin authorization uses session `app_metadata.role`  [INFO]
- Category: SEC
- Confidence: MEDIUM
- Evidence: `src/lib/admin/guard.ts:29` and `src/actions/revalidate.ts:10` read `user.app_metadata?.role === 'admin'`. `is_admin()` SQL reads `raw_app_meta_data ->> 'role'`. In Supabase these reflect the same source (session app_metadata derives from raw_app_meta_data). Consistent — no drift.
- Impact: acceptable. Caveat: client-side `updateUser({data})` changes only `user_metadata`, not `raw_app_meta_data`, so admin claims can't be self-escalated via the anon client. Low risk.
- Remediation: none required; document the contract.

### DB-01 — `articles.slug` is NULLABLE but used as route key  [P2]
- Category: DB
- Confidence: HIGH
- Evidence: `information_schema.columns` → `articles.slug` is_nullable = YES, but `articles_slug_key` unique index exists and `generateStaticParams`/sitemap rely on it. Live data: 0 null/empty, 0 duplicates among 25 rows.
- Impact: latent bug — a NULL/empty slug would break generateStaticParams, sitemap, and produce 404/duplicate routes. Currently safe only because data is clean.
- Remediation: make `slug` NOT NULL + add a generation/default trigger, or enforce at app layer. Requires migration + backup.
- Code change: YES. DB schema: YES. Data mutation: NO.

### DB-03 — RLS enabled on all memareh tables  [INFO / PASS]
- Category: DB
- Confidence: HIGH
- Evidence: catalog introspection: all 7 memareh tables `relrowsecurity = YES`. Consistent with prior RLS baseline.
- Impact: positive.

### DB-04 — is_admin() vs app_metadata consistent  [INFO]
- Category: DB / SEC
- Confidence: HIGH
- Evidence: `is_admin()` reads `raw_app_meta_data ->> 'role'`; app guards read `app_metadata.role`. Same source. No inconsistency.
- Impact: positive.

### DATA-01 — Canonical article content is clean  [INFO / PASS]
- Category: DATA
- Confidence: HIGH
- Evidence: 25 articles, all `published`; 0 null/empty slugs; 0 duplicate slugs; no drafts/scheduled in DB. No indexing-of-drafts risk today.
- Impact: healthy.

### DATA-02 — Dead SEO columns  [P3]
- Category: DATA
- Confidence: HIGH
- Evidence: see SEO-05.
- Remediation: wire or drop.

### DEPLOY-01 — vercel.json ignoreCommand added (docs-only skip)  [INFO / REPO VERIFIED]
- Category: DEPLOY
- Confidence: HIGH
- Evidence: `vercel.json` `ignoreCommand -> node scripts/vercel-ignore-build.cjs`. Classifier: docs-only → exit 0 (SKIP), runtime/config/migration → exit 1 (BUILD). Default BUILD on uncertainty.
- Impact: positive; reduces unnecessary Preview builds.

### DEPLOY-03 — Sharp ignored build script warning (known)  [INFO]
- Category: DEPLOY
- Confidence: HIGH
- Evidence: pnpm reports `Ignored build scripts: sharp@0.34.5`. Not the cause of the prior failure; Next image optimization uses its own pipeline.
- Impact: informational.

### OBS-01 — No error/uptime/alerting strategy  [P2]
- Category: OBS
- Confidence: HIGH
- Evidence: no Sentry/OTel; Supabase logs only via Mgmt API (operator); no uptime monitor; Vercel/GA provide aggregate only. No alerting on 5xx or DB errors.
- Impact: failures are discovered by users, not operators.
- Remediation: add minimal error tracking (Vercel error feedback / optional Sentry) + Supabase log alerting + uptime check.
- Code change: YES (integration). External: dashboard config.

### OPS-01 — Recurring backup automation not implemented  [P2]
- Category: OPS
- Confidence: HIGH
- Evidence: manual operator DB + Storage backups proven & restore-verified (prior phases). No scheduled/automated job. Supabase Free plan provides limited PITR/backup guarantees.
- Impact: operational risk if operator forgets; no off-site automation, no retention policy, no periodic restore test.
- Remediation: implement scheduled backup to off-site (operator-controlled host), encryption, checksum verify, retention, periodic restore drill. No code in this repo necessarily; may live in a separate cron/CI.
- External/operator action: YES.

### ARCH-02 — `graphify-out/` committed (generated tooling output)  [P3]
- Category: ARCH / OPS
- Confidence: HIGH
- Evidence: `git ls-files graphify-out` → 3 tracked files (`.graphify_labels.json`, `.graphify_python`, `.graphify_root`). Not in `.gitignore`.
- Impact: repo pollution; tooling artifact should be gitignored/removed. Low risk (contains source analysis labels, not secrets).
- Remediation: add `graphify-out/` to `.gitignore`; remove from tracking (`git rm --cached`); keep local.
- Code change: NO (config). Git: YES (gitignore + untrack).

### ARCH-03 — Deprecated/unused `@supabase/auth-helpers-nextjs` dependency  [P2]
- Category: DEP / ARCH
- Confidence: HIGH
- Evidence: `package.json:20` `@supabase/auth-helpers-nextjs: ^0.10.0` present; all clients use `@supabase/ssr`. The auth-helpers package is deprecated by Supabase.
- Impact: confusion + future install/security risk; unused dependency.
- Remediation: confirm no import; remove from package.json + lockfile. No lockfile mutation beyond removal.
- Code change: NO. Dep: YES (removal).

### ARCH-04 — Dead `getServices`/`getServiceById` code  [P3]
- Category: ARCH
- Confidence: HIGH
- Evidence: `grep` for `getServices`/`getServiceById` in src returns only the definition in `lib/api/services.ts`; no callers.
- Impact: dead code; tied to missing tables (ARCH-01). Remove if feature deferred (with ARCH-01 option b).
- Remediation: remove with ARCH-01 decision.

---

## Confidence notes
- All production DB claims come from read-only `information_schema` / catalog queries via the Supabase Management API (SELECT-only).
- Build/env claims come from static source review + the documented prior Preview failure.
- Vercel dashboard/env state is NOT verifiable from this environment → marked REQUIRES OPERATOR VERIFICATION where relevant.
