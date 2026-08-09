# Performance Audit

Read-only review of rendering strategy, build-time data access, and query patterns.

## Rendering strategy
- Home, `/articles`, `/articles/[slug]` use ISR (`revalidate = 300`). Healthy for low-traffic content site.
- `generateStaticParams` pre-renders published article slugs at build.
- `next/image` not observed in article detail (uses raw `<img>`); `ArticleCard` image handling not reviewed in depth.

## Key risk: build-time Supabase coupling
- `src/app/articles/[slug]/page.tsx:9` `generateStaticParams` → `createSupabaseAdmin()` (service role) at build.
- `src/app/sitemap.ts:5` builds client with `SUPABASE_SERVICE_ROLE_KEY` at build.
- Prior Preview build failed with `Missing NEXT_PUBLIC_SUPABASE_URL`. Any missing/incomplete Vercel build env → whole build aborts (no graceful fallback). See PERF-01, DEPLOY-02.
- Fragility is the main perf/reliability concern, not runtime speed (traffic is low).

## Query patterns
- Article detail: 4 sequential queries — article, comments (approved), profiles (display names), `check_admin_users` RPC. The admin RPC runs even with zero comments (PERF-03, minor).
- `/articles` list: single query with optional category/sort; orders by `view_count` or `published_at`.
- Indexes present for common filters: `idx_articles_status`, `idx_articles_published_at`, `idx_articles_scheduled_at`, `idx_articles_category`, `idx_articles_is_featured`, `idx_articles_search_vector`, FK indexes on comments/ratings/tags. No missing critical index observed.

## Image / font
- Geist fonts via `next/font/google` (self-hosted, no layout shift). Good.
- Featured images use raw `<img>` (no `next/image` optimization / responsive sizing). Minor perf/SEO-image opportunity.
- Sharp "ignored build script" warning is informational (DEPLOY-03); Next uses its own image pipeline.

## Recommendations (no change this phase)
1. Decouple sitemap/static-params from service role; use public client (PERF-02).
2. Add build-time env guard / resilient fallback (PERF-01).
3. Skip admin RPC when no comments (PERF-03).
4. Consider `next/image` for featured images.
