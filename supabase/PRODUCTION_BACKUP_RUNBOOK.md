# Production Backup Runbook — memareh Supabase Project

> Status: **NO VERIFIED BACKUP YET.**
> Scope: full logical database + storage objects + auth-state considerations for the
> LIVE production Supabase project backing `memareh-redesign`.
> This document is the authoritative recovery plan. It MUST be executed (and a backup
> artifact produced + restore-verified) BEFORE any retirement migration on `public.articles`.

## 1. Current production backup status

- **No automated/managed backup has been confirmed.** The Supabase platform does take
  daily managed backups for paid projects, but "managed existence" is NOT the same as
  "operator-verified recovery point." We require a locally-held, hash-recorded,
  restore-tested backup artifact before any destructive change.
- Treat the production DB as **not safely recoverable** until step 4 (full backup) and
  step 6 (restore verification) are both completed.

## 2. Backup method options (choose one; CLI preferred)

### Option A — Supabase CLI `db dump` (preferred, scriptable)
Requires: project ref, `SUPABASE_ACCESS_TOKEN` (present in local env), and the **database
password** (NOT currently present in local env — must be supplied by operator).

```bash
# Full logical dump (schema + data), excludes Supabase-managed internals by default
npx supabase db dump --project-ref <PROJECT_REF> --db-url "postgresql://postgres:<DB_PASSWORD>@<HOST>:6543/postgres" --data-only --file=memareh_full_data_$(date +%Y%m%dT%H%M%SZ).sql
npx supabase db dump --project-ref <PROJECT_REF> --db-url "postgresql://postgres:<DB_PASSWORD>@<HOST>:6543/postgres" --schema-only --file=memareh_full_schema_$(date +%Y%m%dT%H%M%SZ).sql
```

### Option B — `pg_dump` directly (if installed)
`pg_dump` is NOT present on this machine. Install PostgreSQL client tools, then:
```bash
pg_dump "postgresql://postgres:<DB_PASSWORD>@<HOST>:6543/postgres" --format=custom --file=memareh_full_$(date +%uT%H%M%SZ).dump
```

### Option C — Supabase Dashboard (no CLI needed)
Project dashboard → **Database → Backups → Download backup** (protected/paid tiers) or
**Database → Extensions / SQL Editor → export** for schema. Store the downloaded file.

> **Blocker note:** This environment currently lacks (a) the Supabase CLI linked to the
> project, (b) `pg_dump`, and (c) the database password. The operator must supply these
> before Option A/B can run. Option C works from any browser with dashboard access.

## 3. What the backup must cover

| Layer | Included | Notes |
|-------|----------|-------|
| Schema | tables, views, functions, triggers, policies, grants, extensions | Captured by `SUPABASE_BACKUP_RUNBOOK` schema-only dump. Also mirrored in `supabase/migrations/*`. |
| Data | `memareh.*` (articles, comments, ratings, tags, relations, profiles, comment_likes) | primary payload |
| Data | `public.articles` (26 orphaned rows) | MUST also be captured by the targeted export (Section 5) |
| Auth | `auth.users`, `auth.*` | Partially included by Supabase managed backups; CLI/`pg_dump` against `postgres` schema does NOT include `auth` unless explicitly granted. Documented separately. |
| Storage | `article-images` bucket objects | **NOT** included by database dump. Requires separate export (Section 4). |
| Vault | `vault.decrypted_secrets` (revalidation_url/token) | Secrets not exported unnecessarily; re-create via dashboard if lost. |

## 4. Storage object backup (separate from DB)

Database dumps do NOT contain Storage file contents. Back up `article-images` independently:
- Dashboard → **Storage → article-images → select all → Download**, or
- `supabase` Storage API list + download loop (scriptable with service-role key).
Store objects in the same secure backup location as the DB dump. Record object count.

## 5. Targeted `public.articles` backup (defense-in-depth)

Independent of the full backup, capture the 26-row legacy table so it can be recreated
without relying on the full dump.

```bash
# table-specific dump (after DB password is available)
pg_dump "postgresql://postgres:<DB_PASSWORD>@<HOST>:6543/postgres" \
  --table=public.articles --format=custom \
  --file=public_articles_legacy_$(date +%Y%m%dT%H%M%SZ).dump
# or schema + CSV data:
pg_dump "..." --table=public.articles --schema-only --file=public_articles_schema.sql
psql "..." -c "\copy public.articles TO 'public_articles_data.csv' WITH CSV HEADER"
```

The table definition, trigger `trg_set_author_name`, function `public.set_author_name()`,
and 6 policies should be captured alongside (the schema-only full dump covers these).

## 6. Restore verification (MANDATORY — not optional)

A backup is only acceptable if it has been restored and validated. Procedure:

1. Stand up a LOCAL Postgres (or `docker run supabase/db` / local Supabase stack via Docker —
   Docker IS available on this machine).
2. Restore the dump: `pg_restore --clean --if-exists -d <local_db> memareh_full_*.dump`
3. Verify:
   - schemas `memareh` and `public` exist;
   - `public.articles` row count = **26**;
   - `memareh.articles` row count matches production (record expected N);
   - critical functions present: `is_admin`, `increment_article_view`, `auto_publish_scheduled`,
     `calculate_article_rating`, `search_articles`, `migrate_tags_to_relations`, `notify_article_revalidation`;
   - triggers present: `trg_revalidate_articles`, `trg_set_published_at`, `trg_set_author_name`;
   - RLS enabled on all 7 memareh tables + `public.articles`.
4. Smoke-run the article application queries (`.from('articles').eq('status','published')`)
   against the restored local DB to confirm queries resolve to `memareh.articles`.

> If restore testing is technically impossible in the environment, the gate may be passed
> ONLY with explicit operator acceptance of the risk (gate #6 in retirement doc). The full
> backup artifact must still exist and be hash-recorded.

## 7. Checksum / integrity

After creating each artifact:
```bash
sha256sum memareh_full_*.sql public_articles_legacy_*.dump > backup_manifest.sha256
```
Record the manifest + timestamp in this runbook (or a side manifest file stored with the
backup). Restore verification recomputes and compares.

## 8. Artifact storage location

- Store backups **OUTSIDE** the live Supabase project and outside this Git repo.
- Recommended: encrypted volume / cloud object storage with access controls.
- Do NOT commit raw production data or dumps to the repository.

## 9. Security considerations

- DB password and service-role key are secrets — never store in repo or runbook.
- Encrypt backup at rest.
- Access to backups restricted to the project owner/operators.

## 10. Retirement preflight checklist (gates)

All must be PASS before any retirement migration is applied:
1. Full production backup exists.
2. Backup timestamp recorded.
3. Backup stored outside production.
4. Backup checksum/hash recorded.
5. Restore procedure documented (this file).
6. Restore tested in local/staging OR operator accepts risk in writing.
7. Targeted `public.articles` backup exists.
8. Latest dependency recheck shows no consumer.
9. Latest row-count/content sanity check passes (26 rows, expected content).
10. Rollback path documented.
11. Maintenance window selected.
12. Operator knows how to abort.

## 11. Rollback / abort

- Archive migration (NOT applied) moves `public.articles` → `legacy_public_articles`
  (reversible by renaming back). No data loss.
- Final delete migration (NOT applied) drops the legacy table — only after soak period.
- If validation differs at any step, STOP, do not proceed, and restore from the verified backup.

## 12. Maintenance-window steps (low-traffic)

1. Choose lowest-traffic window (small active-user population → short freeze viable).
2. Optionally enable a brief maintenance notice.
3. Create a FRESH final backup immediately before migration.
4. Re-verify row/dependency expectations.
5. Apply archive migration.
6. Smoke test (homepage, article list/detail, sitemap, admin).
7. Monitor Supabase/Postgres logs for missing-relation errors.
8. Rollback if needed.
9. Reopen normal traffic.

---

*Do NOT execute any backup command against production if it risks writes. `db dump` /
`pg_dump` are read-only. Never run `supabase db reset` or `DROP` on production.*
