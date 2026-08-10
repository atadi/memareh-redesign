# Security Incident — Privileged Key in `NEXT_PUBLIC_*` Variable

Status: **REMEDIATED (local) — rotation pending operator action**
Date discovered: 2026-08-11 (manual-review dry-run follow-up)
Severity: High (local/dev credential exposure; live browser exposure not confirmed)
No article content was modified. `PRODUCTION ARTICLE WRITES: ZERO`.

---

## What was wrong

`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the local `.env.local` contained a JWT whose
`role` claim was `service_role` (a **privileged** key that bypasses Row Level
Security). The same privileged value was also present in `SUPABASE_SERVICE_ROLE_KEY`
locally (the two variables were identical), confirming a privileged key had been
placed in a `NEXT_PUBLIC_*` variable consumed by browser code
(`src/lib/supabase/client.ts`, `server.ts`, `src/lib/config.ts`, `middleware.ts`).

## Actual exposure

- **Local / dev**: the privileged key was present in plaintext in `.env.local`.
  Anyone with read access to that file had an RLS-bypass credential.
- **Live production site** (`https://www.memareh.com`): the shipped client bundle
  was scanned (homepage HTML + 13 referenced client chunks). It contains an
  **anon**-role key only; no `sb_secret_` literal and no `service_role` JWT were
  found. So the live public bundle does **not** appear to leak a privileged key.
  Confirmation of the Vercel project's public variable value is an operator
  action (see below), because Vercel's current value cannot be read from here.

## Remediation applied (local)

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← project **publishable** key (`sb_publishable_…`).
- `SUPABASE_SERVICE_ROLE_KEY` ← project **secret** key (`sb_secret_…`).
- Verified the project emits both modern keys and that the publishable key reads
  `memareh` published articles (HTTP 200) while the legacy service_role key gave
  the earlier `42501` — i.e. switching to the publishable key also closed the
  long-standing PostgREST `42501` carry-over.
- Ran a fresh production-style build and scanned `.next/static`: only
  `sb_publishable_…` present, **zero** `sb_secret_` or privileged JWT material in
  the client bundle. `PRIVILEGED KEY IN CLIENT BUNDLE = NO`.

## Verification (all passed)

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | clean |
| `pnpm test:unit` | 274 passed, 2 skipped |
| `pnpm run build` | success; **25** static article pages + sitemap generated (was 0) |
| `pnpm check:articles-soak` | `SOAK_CONSISTENT` (memareh 25, legacy 26, hash unchanged) |
| RLS — anon published read | allowed (HTTP 200) |
| RLS — anon draft read | denied (empty) |
| RLS — anon INSERT/UPDATE/DELETE | denied (42501 / 0 rows affected) |
| RLS — secret key admin ops | allowed (auth.admin, public schema) |
| Browser bundle scan | no privileged material |

Build-time SEO was directly unblocked: the "permission denied for schema memareh"
build error is gone and the sitemap contains article URLs.

## Rotation / revocation — OPERATOR ACTION REQUIRED (pending)

The exposed legacy `service_role` JWT must be treated as compromised and
revoked/deactivated in the Supabase dashboard **after** the replacement keys are
live in Vercel and verified:

1. In Vercel (Production **and** Preview), set:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the **publishable** key (`sb_publishable_…`)
   - `SUPABASE_SERVICE_ROLE_KEY` = the **secret** key (`sb_secret_…`)
2. Redeploy and confirm: article list/detail, sitemap.xml, login, admin API, and
   that no privileged key is observable in client code (Console/Network).
3. Verify the admin API still works server-side (it now uses the secret key).
4. **Then** revoke/deactivate the legacy `service_role` JWT in
   Supabase Dashboard → Settings → API Keys. Do not revoke before step 2–3, or
   the server admin paths would lose their privileged key.

No JWT signing secret was rotated, so existing auth sessions are unaffected. The
modern publishable/secret keys are decoupled from the legacy JWT secret.

## Repository migration to integration-native variable names (2026-08-11)

The repository now consumes only the Vercel/Supabase integration's modern
variable names directly. The legacy manual names are deprecated and no longer
referenced by runtime code.

Canonical contract:

- **Browser / public**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **Privileged server**: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`

What changed:

- `src/lib/config.ts`: removed `getSupabaseAnonKey()`; added
  `getSupabasePublishableKey()`, `getSupabaseServerUrl()`, `getSupabaseSecretKey()`.
  All getters fail fast on the modern names; no silent legacy fallback.
- `client.ts`, `server.ts`, `server-public.ts`, `middleware.ts`, `auth/callback`,
  `admin/guard.ts`: use the publishable key for public/auth (RLS-scoped) access.
- `admin.ts` (server-only): uses `SUPABASE_SECRET_KEY` via `SUPABASE_URL`.
- Scripts (`make-admin.mjs`, `audit-public-articles.cjs`, `recheck-*.cjs`,
  `prod-backup/storage-backup.cjs`, `test-supabase.ps1`, `check-public-articles-soak.cjs`):
  privileged ops now read `SUPABASE_SECRET_KEY` / `SUPABASE_URL`; the soak/read-only
  scripts use the publishable key.
- Tests + `.env.example` + `tests/rls/README.md`: updated to modern names.
- A new test (`tests/env-contract.test.ts`) locks the contract: public config
  requires `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, admin requires `SUPABASE_SECRET_KEY`,
  legacy-only names alone fail, and the public build succeeds without the secret.

Integration authority: the Vercel Supabase integration provides these variables
for Production. Preview must also receive them via the integration or explicit
Preview env (operator action). The legacy manual Vercel variables
(`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are left in place
until the new deployment is verified, then removed by the operator. The legacy
`service_role` JWT stays active until then (deactivation pending operator).

## Other dependent callers reviewed

- `src/lib/supabase/admin.ts` (server-only) → uses `SUPABASE_SERVICE_ROLE_KEY`;
  now points at the modern secret key; works for `auth.admin` + public schema.
- `scripts/make-admin.mjs`, `scripts/prod-backup/*`, `scripts/recheck-*.cjs` →
  read `SUPABASE_SERVICE_ROLE_KEY` from env; pick up the secret key locally.
- `scripts/article-optimize-dry-run.cjs` → uses `SUPABASE_ACCESS_TOKEN`
  (Management API, operator-scoped), not the exposed key.

## Files touched

- `.env.local` (gitignored) — corrected in place. A backup copy created during
  this work was removed after the corrected values were confirmed, because it
  held the exposed legacy key.
- This document (`docs/INCIDENT_SUPABASE_KEY_EXPOSURE.md`) — added.
- No application code required changes: the code already reads the env vars
  correctly; only the local secret **values** were wrong.

## Definition of done

Closed when: (1) Vercel Production + Preview use publishable + secret keys,
(2) a fresh deploy is verified end-to-end, (3) the legacy `service_role` JWT is
revoked, (4) the browser bundle re-scan shows no privileged key, (5) RLS still
protects drafts/writes, (6) sitemap/article generation still works.
