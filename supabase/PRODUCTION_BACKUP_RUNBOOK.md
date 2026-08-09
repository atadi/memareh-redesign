# Production Backup Runbook — memareh Supabase Project

> Status: **BACKUP CREATED AND RESTORE VERIFIED** (2026-08-09).
> Method: Supabase CLI `db dump` (linked project, access-token auth, no DB password needed).
> Restore verified into a local Docker Postgres 17 (non-production, localhost:5434).
> Scope: full logical database backup (schema + data) including auth + storage metadata.
> This document is the authoritative recovery plan. Retirement of `public.articles` may
> now proceed to the archive phase (see `PUBLIC_ARTICLES_RETIREMENT.md`).
>
> ## Backup evidence (non-secret)
> - Created (UTC): 2026-08-09T10:04–10:16Z
> - Tool: `supabase` CLI v2.113.0 (`npx supabase db dump --linked`)
> - Project ref: `uakvurskrcyvksxfvhho` (public identifier)
> - Artifacts stored at: `C:/backups/memareh-prod/` (OUTSIDE repo AND outside live Supabase)
> - NOT committed to Git.
> - Artifact inventory (sha256):
>   - `memareh_full_combined_20260809T103253Z.sql` (1,450,418 B) 472deef5…f6fc — **TRUE full dump (schema+data, plaintext SQL)**; resolves the prior duplicate-hash anomaly (see note below).
>   - `memareh_schema_20260809T100437Z.sql` (49,545 B) 6232f4a5…a2ae2f — schema-only SQL (auxiliary).
>   - `memareh_data_20260809T100437Z.sql` (1,400,798 B) 90fcef9e…a3622c — data-only SQL (incl. auth.*, memareh.*, public.articles, storage.*).
>   - `public_articles_data_2026-08-09T10-16-00-628Z.csv` (736,238 B) e7b165c4…c45570 — targeted 26-row CSV.
>   - `public_articles_targeted_2026-08-09T10-16-00-628Z.sql` (760,054 B) 25d9353c…c28ef2 — targeted 26-row self-contained SQL.
>   - `storage/article-images/` — 38 objects, 50,487,955 B; `manifest.json` (19c9c0ab…e4c7) records per-object sha256 + remoteSize; verified byte-exact + deterministic.
> - **Anomaly resolved (prior "full custom dump" = schema-only duplicate):** the file named `*.dump` was plaintext (no `PGDMP` magic) and byte-identical (same 49,545 B, same SHA-256) to the schema-only `.sql` — it was a mislabeled schema-only dump, NOT a full dump. No `pg_dump` binary is installed, so a true `-Fc` custom dump is not producible; the CLI emits plaintext SQL only. The genuine full backup is `memareh_full_combined_*.sql` (schema+data concatenated). The mislabeled `.dump` was deleted.
> - Storage byte backup: COMPLETE (see "Storage backup status" below).
> - Combined-dump restore re-verified 2026-08-09T14:02Z into fresh Docker Postgres: all app table counts matched production exactly.
> - Restore target: Docker `postgres:17` container `memareh-restore-test` on localhost:5434, trust auth (non-prod).
> - Restore result: schema + data loaded (exit 0). Application tables restored with EXACT row-count match to production.
> - Restore warnings (EXPECTED, non-fatal — plain Postgres lacks Supabase-managed objects):
>   `pg_net`, `supabase_vault`, `extensions` schema, `auth.users`/`auth.*`, `storage.buckets`/`storage.objects` failed to create/load. These are platform-managed and would be re-provided by a fresh Supabase project; they do not affect application-data recovery.
> - Row-count verification (production == restored):
>   memareh.profiles 5, memareh.articles 25, memareh.article_tags 187, memareh.article_comments 7,
>   memareh.article_ratings 0, memareh.article_tag_relations 301, memareh.comment_likes 1,
>   public.articles 26, memareh.article_tags_view 25. ALL MATCH.
> - Content integrity: per-row (slug → content-length/status) diff between production and restored
>   `public.articles` = 0 differences (26/26 identical).
> - Targeted backup independently re-restored into a separate schema: 26 rows, `tags` array column correct.
>
> ## Storage backup status: COMPLETE (2026-08-09T14:07Z)
> - Bucket `article-images` EXISTS; recursively listed and all objects downloaded (read-only GET, no remote mutation).
> - Destination: `C:/backups/memareh-prod/storage/article-images/` (outside repo + outside live Supabase; not Git-tracked).
> - Result: 38 objects, 50,487,955 bytes (~48 MB).
> - Verification: per-object `sha256` recorded in `manifest.json`; re-download confirmed byte-identical (deterministic); all files non-zero; magic bytes valid (PNG/JPEG). Catalog `remoteSize` == local bytes for every object (the earlier size discrepancy was a string-vs-binary encoding bug in the first download attempt, now fixed).
> - First attempt had a binary-corruption bug (response collected as UTF-8 string); corrected to Buffer-based download and re-run; the corrupted copy was discarded.
> - Residual note: `article-images` objects use `.jpg` extension but are stored as PNG; this is source data shape, not a backup defect.
> - No off-machine second copy yet (see §12).

## 1. Current production backup status

- **Operator-controlled full logical backup: CREATED and RESTORE-VERIFIED (2026-08-09).**
- This satisfies the recovery-point prerequisite for `public.articles` retirement.
- Storage object bytes: see "Storage backup status" above (PENDING).

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
