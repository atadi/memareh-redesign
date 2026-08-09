# Vercel Deployment Hygiene

## How deploys are triggered

- Git pushes to this repository trigger **Vercel Preview deployments** (and Production on the configured branch).
- Vercel uses zero-config Next.js detection; no `buildCommand`/`outputDirectory` overrides are set.

## Skip logic (repo-level)

`vercel.json` sets:

```json
{ "ignoreCommand": "node scripts/vercel-ignore-build.cjs" }
```

The script decides whether the current commit needs a build:

- **exit 0 → Vercel SKIPS the build/deployment**
- **exit 1 → Vercel PROCEEDS with the build** (default)

### Safety rules

- **Default is BUILD.** We only skip when we can prove *every* changed file is a
  non-runtime, documentation/audit-only artifact.
- Any Git error, empty/ambiguous diff, or unknown file → **BUILD** (fail-safe).
- No false positives: an unnecessary build is acceptable; a skipped required build is not.

### Changed-file detection

- Production: prefers `VERCEL_GIT_PREVIOUS_SHA` (covers multi-commit pushes),
  falls back to `HEAD^..HEAD`. `git diff --name-only` yields the file list.
- If detection fails → BUILD.

### Skip allowlist (narrow)

- `supabase/PRODUCTION_BACKUP_RUNBOOK.md`
- `supabase/PUBLIC_ARTICLES_AUDIT.md`
- `supabase/PUBLIC_ARTICLES_AUTHOR_TAGS.md`
- `supabase/PUBLIC_ARTICLES_DEPENDENCY.md`
- `supabase/PUBLIC_ARTICLES_RETIREMENT.md`
- `supabase/PUBLIC_ARTICLES_ROWS.md`
- `supabase/PUBLIC_ARTICLES_SCHEMA_MAP.md`
- `supabase/PUBLIC_ARTICLES_SLUG_SEO.md`
- `supabase/PUBLIC_ARTICLES_SOAK.md`
- `supabase/SCHEMA_BASELINE.md`
- `README.md`
- `docs/**`
- Read-only operational/audit scripts (verified NOT imported by the Next build):
  `scripts/check-public-articles-soak.cjs`, `scripts/audit-public-articles.cjs`,
  `scripts/analyze-audit.cjs`, `scripts/gen-audit-artifacts.cjs`

### Always-BUILD (even if listed elsewhere)

- `src/**`, `app/**`, `pages/**`, `public/**`, `components/**`, `lib/**`, `tests/**`
- `supabase/migrations/**` (operationally significant → always build)
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.*`, `middleware.*`,
  `vercel.json`, `.env.example`, build/postcss/tailwind/vitest configs, `*.d.ts`
- `scripts/vercel-ignore-build.cjs` itself (changing the logic must build)
- Any file not in the skip allowlist

## Local testing

Classify a hypothetical change without manufacturing Git commits:

```bash
# SKIP case
VERCEL_IGNORE_TEST_FILES="supabase/PUBLIC_ARTICLES_SOAK.md" node scripts/vercel-ignore-build.cjs
# BUILD case
VERCEL_IGNORE_TEST_FILES="src/app/articles/page.tsx" node scripts/vercel-ignore-build.cjs
echo $?   # 0 = skip, 1 = build
```

Unit tests (pure classifier): `tests/vercel-ignore-build.test.ts` (run with Vitest).

## Force a deployment anyway

If a docs-only commit must still deploy (e.g. to re-run a Preview):

- **Preferred:** use the Vercel Dashboard **Redeploy** button on the deployment, or
  push any commit that touches an always-build path (e.g. `package.json` or `src/**`).
- No runtime behavior is altered by skipping; skipping only avoids a redundant build.

## Notes

- This phase does **not** manage Vercel environment variables or secrets.
- The `sharp` build-script warning from pnpm is unrelated and intentionally untouched.
- Production Supabase is never modified by this deployment hygiene.

## Operator environment-variable checklist (REQUIRES OPERATOR VERIFICATION)

After Phase A, the **build** path (sitemap + `generateStaticParams`) uses only the
public/anon Supabase client and the central site URL. The service-role key is no
longer required at **build** time — it remains required at **runtime** only for the
admin API (`/api/admin/*` → `auth.admin.listUsers`).

Verify in the Vercel dashboard for **both Production and Preview**:

### Build-time required
- `NEXT_PUBLIC_SUPABASE_URL` — set; exposed to build.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — set; exposed to build.
- `NEXT_PUBLIC_SITE_URL` — set to the **production canonical origin**, e.g.
  `https://www.memareh.com` (no trailing slash). Preview must also use this value
  so Preview never publishes a Preview URL as the canonical SEO origin. Exposed to build.

### Runtime required (server-only — NEVER expose to browser)
- `SUPABASE_SERVICE_ROLE_KEY` — only needed for admin server operations. NOT required
  for build after Phase A. Keep server-only.
- `REVALIDATION_TOKEN` — only needed for `/api/revalidate`.

### Canonical host
- Live `https://memareh.com/` 301-redirects to `https://www.memareh.com/`, so `www`
  is the authoritative canonical. Ensure Vercel/DNS redirect (non-www → www) is in
  place; the app now emits `www` URLs everywhere via `getSiteUrl()`.

### Verification commands (operator, after a deploy)
- Preview build starts and succeeds.
- `https://<preview>/sitemap.xml` lists `https://www.memareh.com/articles/<slug>`.
- Article pages render; canonical `<link rel="canonical">` uses `www.memareh.com`.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is absent from any client-side bundle.
