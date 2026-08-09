# Deployment Reliability Audit

Repository-controlled deployment behavior only. Vercel dashboard/env state is NOT
accessible from this environment → external items are marked REQUIRES OPERATOR VERIFICATION.

## Repository-verified (REPO VERIFIED)
- `vercel.json` exists with `ignoreCommand: "node scripts/vercel-ignore-build.cjs"`.
  - Classifier: docs-only (`supabase/*.md`, `docs/**`, README) → exit 0 SKIP; runtime/config/migration/package/lockfile/unknown → exit 1 BUILD; any Git/detection error → exit 1 BUILD (fail-safe). Verified via unit tests + scenario simulation in the Vercel hygiene phase.
- `next.config.ts`: no custom `buildCommand`/`outputDirectory` → Vercel zero-config Next.js detection applies.
- `package.json`: scripts use `next build`; no Vercel-specific build script overriding defaults.
- `middleware.ts` present (auth session refresh) — runs on edge; no build impact.

## Build-time environment coupling (key risk)
- **DEPLOY-02 [P1]** `generateStaticParams` (article detail) + `sitemap.ts` require Supabase access at BUILD via service-role/admin client. The prior Preview build failed with `Missing NEXT_PUBLIC_SUPABASE_URL`. If `SUPABASE_SERVICE_ROLE_KEY` is also missing or not "exposed for build" in any Vercel environment, the build fails entirely.
- **VERCEL EXTERNAL CONFIGURATION REQUIRES OPERATOR VERIFICATION**: confirm BOTH `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Preview AND Production Vercel env, and that the service-role key is marked "Expose for build". This is the single most likely cause of a future failed deploy.

## Preview vs Production expectations
- Preview env vars were corrected manually (per prior phase) so real builds succeed. The fix is operator-side; not reproducible/verifiable from repo alone.
- `REVALIDATION_TOKEN` (used by `/api/revalidate`) must be set in Vercel env (operator verification).

## Node / pnpm assumptions
- `package.json` does not pin `engines.node` or a pnpm version. Vercel uses its default Node for the project. Recommend pinning `engines.node` to match local to avoid drift.

## Sharp warning
- `Ignored build scripts: sharp@0.34.5` — informational (DEPLOY-03). Not the cause of the prior failure; Next image optimization uses its own pipeline.

## Recommendations (no change this phase)
1. Operator: verify Vercel env completeness (URL + service-role, exposed for build) in Preview AND Prod.
2. Add `engines.node` pin + document pnpm version.
3. Add a build-time env guard that fails fast with a clear message (PERF-01).
4. Decouple sitemap/static-params from service role (PERF-02) to shrink the required build-secret surface.
