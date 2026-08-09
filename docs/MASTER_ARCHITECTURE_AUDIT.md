# Master Architecture Audit

Discovery-only system map of the Memareh production application. No changes made.

## Stack
- Next.js 16.1.0 (App Router), React 19.1.0, TypeScript.
- Supabase (Postgres + Auth + Storage), Free plan.
- Hosting: Vercel (zero-config + `vercel.json` ignoreCommand).
- Package manager: pnpm.

## Rendering / routing
- App Router under `src/app/`. Routes:
  - `/` home
  - `/articles` listing (ISR `revalidate=300`, supports `?category=&sort=`)
  - `/articles/[slug]` detail (ISR `revalidate=300`, `generateStaticParams` over published slugs)
  - `/admin/*` (articles, users, login) — gated by `assertIsAdmin`
  - `/api/admin/users`, `/api/admin/users/[id]`, `/api/revalidate`
  - `/auth/callback`, `/login`, `/register`, `/profile`
  - `/booking`, `/booking/success` (booking page currently only `redirect`s)
- Server components for data fetching; `ClientShell`/`ThemeProvider` client wrappers.
- `middleware.ts`: refreshes Supabase auth session cookies (uses `db.schema:'public'` = auth schema — correct).

## Supabase clients (4)
| File | Type | Schema | Auth | Use |
|------|------|--------|------|-----|
| `lib/supabase/client.ts` | browser (`@supabase/ssr`) | memareh | anon session | client components |
| `lib/supabase/server.ts` | server (`@supabase/ssr`) | memareh | anon session + cookies | server components |
| `lib/supabase/server-public.ts` | supabase-js public | memareh | none (no cookies) | ISR/public reads; throws if env missing |
| `lib/supabase/admin.ts` | supabase-js service role | memareh | service role | admin/build-time |

All article data clients target `db.schema:'memareh'` → public.articles is NOT referenced anywhere (confirmed; consistent with archive).

## Auth / admin
- `lib/admin/guard.ts` `assertIsAdmin()` → `supabase.auth.getUser()`, checks `app_metadata.role === 'admin'`.
- Admin API routes call `assertIsAdmin()` then `createSupabaseAdmin()` (service role) for privileged reads.
- `is_admin()` SQL reads `raw_app_meta_data ->> 'role'` (consistent source).

## Build-time coupling (key risk)
- `generateStaticParams` (article detail) and `sitemap.ts` require Supabase access at BUILD time via service-role/admin client. Missing env → build fails (already happened in Preview: `Missing NEXT_PUBLIC_SUPABASE_URL`). See PERF-01, DEPLOY-02.

## Data layer
- Canonical articles: `memareh.articles` (25 published).
- Comments: `memareh.article_comments` (approved filter in UI).
- Ratings/likes/tags: `memareh.article_ratings`, `comment_likes`, `article_tags`, `article_tag_relations`.
- Profiles: `memareh.profiles` (id, display_name, avatar_url).
- Archived: `legacy_articles.articles` (26, soak period; not in app schema).
- **Drift**: `memareh.services` / `memareh.service_requests` declared in types + queried in code but ABSENT in DB (ARCH-01/DB-02).

## External integrations
- Vercel Analytics (`<Analytics/>`) + GA4 `G-EVR583NXGN` (production only).
- `@vercel/analytics` for Web Vitals.
- No Sentry/OTel/error aggregator. No email provider wired in reviewed code.

## Storage
- Article featured images stored in Supabase Storage (referenced by URL in `featured_image`).
- Upload helper: `lib/uploadImage.ts`. Storage byte backup verified in prior phase.

## Notable observations (see findings register)
- Canonical domain inconsistency (www vs non-www) across layout/sitemap/robots/article page (SEO-01).
- `article.content` rendered unsanitized on public page (SEC-01); sanitized in component + at write time.
- No CSP/security headers (SEC-02).
- `graphify-out/` committed (ARCH-02); deprecated `@supabase/auth-helpers-nextjs` dep (ARCH-03).
