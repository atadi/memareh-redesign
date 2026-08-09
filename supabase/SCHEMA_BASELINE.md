# Schema Baseline (Live Capture)

Authoritative inventory of the live Supabase application schema, captured
read-only from the production project on 2026-08-09. Source of truth = live
database. This document is **documentation only**; the executable capture lives
in `supabase/migrations/20260808000000_base_schema_capture.sql`.

## Migration ordering

| Order | File | Purpose |
| ----- | ---- | ------- |
| 1 | `20260808000000_base_schema_capture.sql` | schema, tables, FKs, indexes, view, 14 functions, triggers, grants, RLS ENABLE, bucket, `public.articles` |
| 2 | `20260809000000_security_baseline_rls.sql` | RLS policies, `is_admin`, SECURITY DEFINER hardening, storage policies |
| 3 | `20260809010000_remove_rls_test_helpers.sql` | drops `public.rls_test_eval`/`public.rls_test_seed` (PREPARED only) |

## memareh schema

### Tables (7)
| Table | PK | Notable columns | FKs | RLS |
| ----- | -- | --------------- | --- | --- |
| `profiles` | `id` | display_name, avatar_url, created_at | `id → auth.users` (CASCADE) | enabled |
| `articles` | `id` | slug (uniq), status (chk), search_vector (gen tsvector), author_id, author_name, scheduled_at, published_at, view_count, is_featured, video_url, meta_* | `author_id → profiles(id)` (SET NULL) | enabled |
| `article_tags` | `id` | name, slug (uniq) | — | enabled |
| `article_comments` | `id` | article_id, user_id (nullable), parent_id (nullable), status (chk pending/approved/rejected), approved_by, guest_name/email/token | `article_id → articles` (CASCADE), `parent_id → article_comments` (CASCADE) | enabled |
| `article_ratings` | `id` | article_id, user_id, rating (chk 1..5) | `article_id → articles` (CASCADE) | enabled |
| `article_tag_relations` | (`article_id`,`tag_id`) | created_at | `article_id → articles` (CASCADE), `tag_id → article_tags` (CASCADE) | enabled |
| `comment_likes` | (`comment_id`,`user_id`) | created_at | `comment_id → article_comments` (CASCADE) | enabled |

### Views (1)
- `article_tags_view` — per-article aggregated tag JSONB (LEFT JOIN relations→tags, grouped).

### Functions (14)
| Function | Returns | Volatile | SECURITY DEFINER | search_path |
| -------- | ------- | -------- | ---------------- | ----------- |
| `is_admin()` | boolean | STABLE | yes | '' |
| `increment_article_view(uuid)` | void | VOLATILE | yes | '' |
| `auto_publish_scheduled()` | integer | VOLATILE | yes | '' |
| `calculate_article_rating(uuid)` | TABLE | STABLE | yes | '' |
| `check_admin_users(uuid[])` | TABLE | STABLE | yes | (none) |
| `handle_new_user()` | trigger | VOLATILE | yes | '' |
| `sync_display_name_from_auth()` | trigger | VOLATILE | yes | '' |
| `notify_article_revalidation()` | trigger | VOLATILE | yes | '' (uses `vault`+`net`) |
| `set_published_at()` | trigger | VOLATILE | no | (none) |
| `update_updated_at_column()` | trigger | VOLATILE | no | (none) |
| `update_comment_updated_at()` | trigger | VOLATILE | no | (none) |
| `search_articles(text)` | SETOF articles | STABLE | no | (none) |
| `migrate_tags_to_relations()` | text | VOLATILE | no | (none) |

### Triggers (4)
- `trg_update_articles_updated_at` (articles, BEFORE UPDATE) → `update_updated_at_column`
- `trg_set_published_at` (articles, BEFORE UPDATE) → `set_published_at`
- `trg_revalidate_articles` (articles, AFTER INSERT/UPDATE/DELETE) → `notify_article_revalidation`
- `trg_update_article_comments_updated_at` (article_comments, BEFORE UPDATE) → `update_comment_updated_at`

### Extensions
- `pgcrypto`, `uuid-ossp`, `pg_trgm` (created by base migration). `vault` + `pg_net`
  are Supabase-managed and NOT created by the migration (referenced by
  `notify_article_revalidation`).

### Grants
- `GRANT USAGE ON SCHEMA memareh TO anon, authenticated, service_role`.
- Function EXECUTE grants to `authenticated`/`anon` for app-callable functions
  (`increment_article_view`, `auto_publish_scheduled`, `calculate_article_rating`,
  `check_admin_users`, `search_articles`, `is_admin`). Table access is via RLS, not
  direct table grants.

## public.articles (LEGITIMATE duplicate)

- **Row count (live):** 26
- **Used by:** `src/app/sitemap.ts` (queries `from('articles')` with `db.schema='memareh'` → resolves to `public.articles`).
- **Structure vs `memareh.articles`:** same domain but distinct column set. Public copy
  has `tags text[]`, `featured_image_url`, and lacks `featured_image_alt`,
  `canonical_url`, `og_image`, `video_url`, `scheduled_at`, `meta_keywords` default
  nuance. Both share `status` + `slug` unique. Public copy's `status` CHECK omits
  `'scheduled'` (so scheduled articles are not readable).
- **Differences from memareh.articles:** no `author_id → profiles` FK; `slug` is NOT
  NULL (memareh allows NULL); has `tags text[]` + GIN index `idx_articles_tags`;
  has `trg_set_author_name` trigger calling `public.set_author_name()` (fills
  `author_name` from `auth.users`).
- **Live indexes:** `articles_pkey`, `articles_slug_key`, `articles_slug_unique`
  (DUPLICATE of slug_key — dead weight, NOT reproduced), `idx_articles_published_at`,
  `idx_articles_search_vector` (GIN), `idx_articles_tags` (GIN).
- **Live policies (6):** 2× public SELECT published, 2× authenticated INSERT
  (author_id=auth.uid()), 2× author UPDATE. Reproduced in base migration.
- **Retire?** NO — actively used by sitemap.ts and contains 26 real rows. Consolidation
  is a separate phase (`public.articles Dependency Audit`).

## Storage bucket
- `article-images`: `public=true`, `file_size_limit=NULL`, `allowed_mime_types=NULL`.
  Created idempotently by base migration. Policies live in the security migration.

## Intentionally EXCLUDED
- `memareh.services` / `memareh.service_requests` — referenced by `src/types/database.types.ts`
  and `src/lib/api/services.ts` / `src/hooks/useServices.ts` but **DO NOT exist** in the
  live database. Not invented. Documented as code-references-nonexistent-DB-objects.
- `public.rls_test_eval` / `public.rls_test_seed` — test-only; removed by the prepared
  cleanup migration; never part of the app schema.
- Supabase-managed: `auth.users`, `storage.*` tables, `pg_catalog`, `pg_trgm` C functions,
  `vault`, `pg_net`.

## RLS ownership split
- **Base migration:** `ENABLE ROW LEVEL SECURITY` on all 7 memareh tables + `public.articles`.
  For `public.articles` it also creates the live (security-neutral) policies so the
  table is usable after reset.
- **Security migration:** creates all `memareh.*` policies (articles/comments/ratings/
  tags/relations/likes), `is_admin()`, storage policies, and re-asserts the hardened
  SECURITY DEFINER function bodies. No `memareh` policy is duplicated in the base file.

## Known drift (DB ↔ TypeScript) — not fixed this phase
- `database.types.ts` defines `memareh.services` and `memareh.service_requests` (Tables)
  that do not exist in the database. `src/lib/api/services.ts` and `src/hooks/useServices.ts`
  query a non-existent table.
- `ArticleRow.slug` is `string | null` but `public.articles.slug` is NOT NULL and
  `memareh.articles.slug` allows NULL — inconsistent across the two copies.
- `database.types.ts` `profiles.Row` likely omits real columns if it was generated from a
  different state; the live `profiles` has `id, display_name, avatar_url, created_at`.

## Base + Security coverage
BASE + SECURITY represents the current required **application** structure for
`memareh` and `public.articles` (YES for those schemas). The only intentionally
absent DB objects are the two non-existent `services`/`service_requests` tables,
which are code-only and out of scope. See the phase closeout report for the
explicit YES/PARTIAL/NO answer.
