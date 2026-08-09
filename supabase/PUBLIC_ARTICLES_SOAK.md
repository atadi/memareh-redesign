# Public Articles Archive — Soak Monitoring & Final-Deletion Readiness

> Status: **SOAK IN PROGRESS** (archive activated 2026-08-09T11:06Z).
> This document records archive-state evidence and the strict GO/NO-GO gate for the
> eventual destructive removal migration (`20260809030000_remove_legacy_public_articles.sql`).
> The final deletion is NOT authorized in this slice and MUST NOT run until all 15 criteria PASS.

## Archive activation

- Migration applied: `20260809020000_archive_public_articles.sql` (reversible archive step only).
- Activation UTC: `2026-08-09T11:06Z`.
- Effect: `public.articles` moved to `legacy_articles.articles`; 26/26 rows preserved; RLS deny-by-default; schema not PostgREST-exposed.
- Destructive migration `20260809030000_...` status: **NOT APPLIED** (pending soak).

## Soak timeline

- Archive start: `2026-08-09T11:06Z`
- Minimum 7-day window: earliest decision point `2026-08-16T11:06Z`
- Preferred 14-day window: `2026-08-23T11:06Z`
- Current recommendation: **favor 14 days** — site traffic is low, so rare consumers need time to surface.

## Observation log

Each entry is a read-only checkpoint (use `pnpm check:articles-soak` or manual checks).

### 2026-08-09T11:39Z (post-archive verification)
- `public.articles` exists: NO (null) ✓
- `legacy_articles.articles` rows: 26 ✓
- `memareh.articles` rows: 25 ✓
- Archive content aggHash: `54a808c2…` — matches pre-archive preflight exactly (26/26 parity) ✓
- Repo runtime consumers of `public.articles`: 0 (grep of `src/`) ✓
- Live DB catalog: 0 functions/views/FKs/triggers reference `public.articles` or `set_author_name` outside archive ✓
- Live site: homepage 200, article listing 200 (renders memareh.articles), sitemap 200, article detail 200 ✓
- API isolation: anon PostgREST to `public.articles` → 404; to `legacy_articles` → 404 ✓
- Postgres logs since activation: 0 hits on `public.articles` / missing-relation errors ✓

### 2026-08-09T11:42Z (automated checker `check:articles-soak`)
- Verdict: `SOAK_CONSISTENT` (exit 0)
- All checks PASS: public.articles=null, legacy=26, memareh=25, hash=54a808c2…, anon 404/404, site 200/200/200.

### 2026-08-09T12:14Z (soak checkpoint slice)
- Elapsed soak: ~0.047 d (≈1h8m since 2026-08-09T11:06Z). Both 7d (2026-08-16) and 14d (2026-08-23) thresholds NOT reached → `SOAK IN PROGRESS`.
- Automated checker `check:articles-soak`: `SOAK_CONSISTENT` (exit 0).
- DB state (read-only): public.articles=null, legacy_articles.articles=26 (hash 54a808c2… = preflight), memareh.articles=25.
- Repo dep recheck (`src/`): 0 runtime references to `public.articles`/`set_author_name`/`trg_set_author_name`.
- Archive security: 0 permissive policies, 0 anon/authenticated grants, schema not PostgREST-exposed (anon GET 404).
- Live site: homepage 200, article listing 200, sitemap 200, article detail 200.
- Postgres logs since archive: 0 hits on `public.articles`/`legacy_articles`/missing-relation.
- Backup integrity: DB artifacts present (full combined 1,450,418 B; targeted pre-archive 26-row backup); Storage manifest 38 objects / 50,487,955 B, sampled checksums match. All valid.
- Classification: **NO OBSERVED EXTERNAL CONSUMER** (observational).
- Decision: `SOAK IN PROGRESS` — final deletion NOT authorized.

## Vercel log review

- Vercel CLI credentials are not available in this environment; cannot pull Vercel function logs programmatically.
- Operator dashboard query (recommended): in Vercel → project `memareh-redesign` → Logs / Observability, filter since `2026-08-09T11:06Z` for:
  `public.articles`, `relation "articles" does not exist`, `legacy_articles`, `500`, unhandled exceptions in `/articles`, `/sitemap.xml`.
- No application errors observed via live smoke tests (all 200). Raw logs not stored in Git.

## External-consumer assessment

- No observed external consumer of `public.articles` to date (repo grep clean + DB catalog clean + live logs clean).
- Classification: **NO OBSERVED EXTERNAL CONSUMER** — this is observational, not a mathematical proof. Continue monitoring through the full soak window.

## Sitemap / SEO

- `/sitemap.xml` returns 200 and is generated from `memareh.articles` (confirmed in prior phases; application clients use `db.schema='memareh'`). No archived legacy rows should reappear. Monitor for 404s / duplicate URLs / loss of canonical articles through soak.

## Archive isolation (recheck)

- `legacy_articles` is not in the PostgREST-exposed schemas. anon/authenticated roles have 0 grants and RLS is deny-by-default. Confirmed 404 on direct GET. Will be re-checked at each observation point.

## Backup integrity

- DB full dump (`memareh_full_combined_*.sql`) + schema/data/targeted artifacts at `C:/backups/memareh-prod/` — checksums recorded in `PRODUCTION_BACKUP_RUNBOOK.md`.
- Storage byte backup of `article-images`: 38 objects, 50,487,955 B, per-object sha256 manifest; verified byte-exact.
- Backups not re-restored daily; checksums remain valid as of this slice. Re-verify manifests before final deletion.

## Deletion readiness criteria (ALL must PASS before `20260809030000_...` runs)

| # | Criterion | State |
|---|-----------|-------|
| 1 | Minimum soak period elapsed (≥7d; prefer 14d) | PENDING (elapsed 0.047d; 7d@2026-08-16, 14d@2026-08-23) |
| 2 | `legacy_articles.articles = 26` | PASS (26, confirmed 2026-08-09T12:14Z) |
| 3 | Archive data hashes still match pre-archive evidence | PASS (54a808c2…, confirmed 2026-08-09T12:14Z) |
| 4 | `memareh.articles` healthy | PASS (25, confirmed 2026-08-09T12:14Z) |
| 5 | Repo runtime consumers of `public.articles = 0` | PASS (0, confirmed 2026-08-09T12:14Z) |
| 6 | No observed Vercel runtime request/error requiring `public.articles` | PENDING (continue through window) |
| 7 | No observed Supabase/Postgres runtime request/error requiring it | PASS (0 hits so far, confirmed 2026-08-09T12:14Z) |
| 8 | Sitemap healthy | PASS (200, confirmed 2026-08-09T12:14Z) |
| 9 | Representative article routes healthy | PASS (200, confirmed 2026-08-09T12:14Z) |
| 10 | Admin/read flows healthy | PENDING (manual check per window) |
| 11 | No external consumer discovered | PENDING (observational; NO OBSERVED so far) |
| 12 | Backup checksums still valid | PASS (DB + Storage verified 2026-08-09T12:14Z) |
| 13 | Fresh targeted backup created immediately before final deletion | PENDING (do at deletion time) |
| 14 | Destructive migration reviewed again | PASS (static review 2026-08-09) |
| 15 | Rollback/recovery artifact still available | PASS (full backup + archive reversible) |

## Destructive migration static review (this slice, NOT executed)

- `20260809030000_remove_legacy_public_articles.sql`: guarded by `legacy_articles.articles` existence; drops only `legacy_articles.articles`, the archive trigger, `public.set_author_name()`, obsolete indexes/policies, and the `legacy_articles` schema. Does NOT reference `memareh.articles` or other schemas.
- `set_author_name()` dependency: only the archive-internal trigger depends on it (pg_depend). Safe to drop with the archive. No external consumer.
- Executed this slice: **NO**.

## Repeatable checker

- `pnpm check:articles-soak` → `scripts/check-public-articles-soak.cjs` (read-only; exit 0 = consistent, 2 = anomaly, 3 = error).
- Must be run with `SUPABASE_ACCESS_TOKEN` and `.env.local` present. Never sets `SUPABASE_RLS_TEST_MODE`.
