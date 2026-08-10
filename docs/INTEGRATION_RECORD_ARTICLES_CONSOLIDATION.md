# Production Integration Record — articles schema consolidation

Date (UTC): 2026-08-10

## Integration

- Source branch: `refactor/articles-schema-consolidation`
- Source HEAD: `85a869e`
- Target: `master` (was `23ab3ac`, merge base = `23ab3ac`, master unchanged since branch start)
- Merge strategy: `git merge --no-ff origin/refactor/articles-schema-consolidation`
- Conflicts: none
- Merge HEAD: `9a3d06e`
- Pushed: `git push origin master` → `23ab3ac..9a3d06e` (no force)
- Feature branch: retained (local + remote)

## Diff scope

91 files changed, +7549 / -490. Categories: audit/runbook docs, Supabase migration
capture files, ops scripts (soak/backup/vercel-ignore), Next.js runtime source
(config/seo/sanitizer/security-headers/auth-role/articles), tests, `vercel.json`,
`vitest.config.ts`, `.env.example`. No dumps, credentials, or scratch artifacts.

## Migration auto-apply risk

**Does pushing master automatically apply Supabase migrations? NO.**

- No `.github/workflows/`.
- No `postinstall`/`prebuild`/`predeploy` script in `package.json`.
- Vercel build command is plain `next build`; `vercel.json` only sets
  `ignoreCommand: node scripts/vercel-ignore-build.cjs` (build gating only).
- Only Supabase CLI invocation in repo is `supabase:test:reset`, a manual
  local-only script.
- `supabase/migrations/20260809030000_remove_legacy_public_articles.sql`
  (destructive) is present in Git but NOT executed. Archive soak remains active.

## Verification (source branch and merged master)

- `npx tsc --noEmit`: clean
- Unit suites (config, articles, seo, html-sanitizer, security-headers, auth-role,
  menu-auth-state, menu-auth-independence, nav-admin-regression, booking-removal,
  vercel-ignore-build): 106/106 passing
  - `tests/api/admin-users-route.test.ts` is intentionally excluded by
    `vitest.config.ts` (imports `server-only`; covered by tsc + build)
  - RLS suites not run (live-DB, environment-gated)
- `pnpm run build`: success, 17 routes; no `/booking`, no `/search`
- `pnpm check:articles-soak`: `SOAK_CONSISTENT` — legacy_articles=26,
  memareh_articles=25, archive hash `54a808c284a6079c`, public.articles absent

## Open item (operator, not merge-blocking)

Anon REST with `Accept-Profile: memareh` still returns 42501
`permission denied for schema memareh` from the developer machine, and the local
production build logs the same for slug/sitemap queries. Live site endpoints
return 200. This is Supabase Data-API exposure/grant configuration, not code.

## Vercel

OPERATOR CONFIRMATION REQUIRED — verify Production → `master` → `9a3d06e` → Ready,
domain `www.memareh.com`.
