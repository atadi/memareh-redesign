# public.articles Retirement Runbook

> Status: **PREPARATION ONLY — NO PRODUCTION MIGRATION APPLIED.**
> Prerequisite: a verified production backup (see `PRODUCTION_BACKUP_RUNBOOK.md`).
> Branch: `refactor/articles-schema-consolidation`.

## Evidence: table is orphaned

| Check | Result |
|-------|--------|
| Live row count (`public.articles`) | 26 (25 published, 1 draft) |
| Application client `db.schema` default | `memareh` (all 4 clients) |
| `.from('articles')` resolution | `memareh.articles` |
| `sitemap.ts` usage | `schema:'memareh'` → `memareh.articles` |
| Code consumers of `public.articles` | **none** (grep of `src/**` = 0) |
| `database.types.ts` declares `public.articles`? | no (only `memareh.articles`) |
| Columns | 21 (drift vs `memareh.articles`: missing 7 SEO/engagement cols; extra `tags text[]`, `featured_image_url`) |

Conclusion: `public.articles` is a duplicate with no live consumer. Its 26 rows are NOT
canonical application data and must be **archived**, never merged into `memareh.articles`.

## Strategy (append-only, reversible)

1. **Archive phase** (`20260809020000_archive_public_articles.sql`, NOT applied):
   move `public.articles` → `legacy_public_articles` in an archive schema, revoke API access.
2. **Soak period**: let the application run normally; confirm no errors reference the old table.
3. **Final delete phase** (`20260809030000_remove_legacy_public_articles.sql`, NOT applied):
   drop legacy table, its trigger, `public.set_author_name()`, and obsolete policies/indexes —
   only after soak + backups remain available.

## Dependency precheck (final, read-only, before any rollout)

- [ ] Repo grep: 0 references to `public.articles`.
- [ ] Live catalog: no view/function/FK/trigger elsewhere references `public.articles`.
- [ ] Only internal dependents: 6 policies, 5 indexes, trigger `trg_set_author_name`,
      function `public.set_author_name()`.

## Data precheck (before rollout)

- [ ] Row count = 26.
- [ ] `max(updated_at)` matches expectation (no silent writes since audit).
- [ ] (Optional) content hash of rows recorded for rollback comparison.

## Archive migration behavior (`20260809020000_archive_public_articles.sql`)

- Validates source table exists and has exactly the expected 26 rows (fails loudly otherwise).
- Creates archive schema `legacy_articles` (NOT exposed through PostgREST API by default
  because it is a non-`public` schema; Supabase only auto-exposes `public` and configured
  schemas). Confirms `legacy_articles` is not in `exposed_schema` config.
- Renames `public.articles` → `legacy_articles.public_articles`.
- Moves trigger + function into the archive schema context (or disables the trigger since
  writes are no longer expected).
- Revokes all grants to `anon` / `authenticated` on the archive copy.
- Enables RLS on the archive copy with NO permissive policies (deny-by-default).
- Leaves owner/service-role administrative recovery path intact (owner can still read/restore).
- **Does NOT drop** anything. Fully reversible by renaming back.

## Rollback (archive phase)

```sql
ALTER TABLE legacy_articles.public_articles SET SCHEMA public;       -- restore name
ALTER TABLE public.public_articles RENAME TO articles;               -- if needed
-- re-grant anon/authenticated SELECT published, recreate trigger if required
```
Because no data was deleted, rollback is a metadata operation with zero data loss.

## Soak / observation period

- Minimum agreed period (e.g. 7–14 days) of normal operation.
- Watch Supabase/Postgres logs for `relation "public.articles" does not exist` errors.
- If any consumer appears, STOP final delete and investigate.

## Final delete migration (`20260809030000_remove_legacy_public_articles.sql`)

- **DO NOT APPLY UNTIL**: backup + restore verification + archival soak complete.
- Drops `legacy_articles.public_articles`.
- Drops trigger `trg_set_author_name` and function `public.set_author_name()` if unreferenced.
- Drops the 6 obsolete policies and 5 obsolete indexes.
- Comments at top state the prerequisite gate explicitly.

## Production change gates (ALL must be true before apply)

| # | Gate | State |
|---|------|-------|
| 1 | Full production backup exists | PENDING (no verified backup) |
| 2 | Backup timestamp recorded | PENDING |
| 3 | Backup stored outside production | PENDING |
| 4 | Backup checksum/hash recorded | PENDING |
| 5 | Restore procedure documented | PASS (runbook written) |
| 6 | Restore tested OR operator accepts risk | PENDING |
| 7 | Targeted `public.articles` backup exists | PENDING |
| 8 | Latest dependency recheck: no consumer | PASS (verified this phase) |
| 9 | Latest row/content sanity check passes | PASS (26 rows) |
| 10 | Rollback path documented | PASS (this file) |
| 11 | Maintenance window selected | PENDING |
| 12 | Operator knows how to abort | PASS (documented) |

**Current gate verdict: BLOCKED** — gates 1–4, 6, 7, 11 are PENDING; retirement cannot proceed.

## Smoke tests (post-rollout, eventual)

- [ ] Homepage loads.
- [ ] Article listing loads.
- [ ] Article detail pages load.
- [ ] `sitemap.xml` generates; contains canonical `memareh` articles.
- [ ] Admin article list/editor works.
- [ ] Comments work.
- [ ] Ratings work.
- [ ] Article tags work.
- [ ] No errors referencing `public.articles`.
- [ ] Supabase/Postgres logs: no missing-relation errors.

## Abort conditions

- Backup missing/unverified at apply time.
- Dependency recheck finds a new consumer.
- Row count ≠ 26 at preflight.
- Any smoke test fails post-apply → rollback via archive rename.

---

*Historical migrations remain untouched (append-only). Do not edit the base/security
migrations to remove `public.articles`.*
