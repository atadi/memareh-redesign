# public.articles Consolidation — Dependency Audit

> Branch: `refactor/articles-schema-consolidation`
> Source of truth: **live `public.articles`** (read-only `SELECT *`, service-role, 26 rows) captured 2026-08-09.
> Companion artifacts (all under `supabase/`):
> - `PUBLIC_ARTICLES_ROWS.md` — 26-row classification table
> - `PUBLIC_ARTICLES_SCHEMA_MAP.md` — column mapping vs `memareh.articles`
> - `PUBLIC_ARTICLES_DEPENDENCY.md` — code + DB dependency matrix
> - `PUBLIC_ARTICLES_SLUG_SEO.md` — slug/SEO analysis
> - `PUBLIC_ARTICLES_AUTHOR_TAGS.md` — author/tag mapping

## TL;DR
`public.articles` is an **orphaned duplicate** of `memareh.articles`. **Zero** application
code paths reference it — every Supabase client in `src/` is built with `db.schema='memareh'`,
so all `.from('articles')` calls resolve to `memareh.articles`. The prior baseline doc
(`SCHEMA_BASELINE.md:70`) incorrectly claims `sitemap.ts` uses `public.articles`. It does not.

## Headline findings
1. **No live code dependency.** All 5 call sites (sitemap, articles list, article page, home,
   admin) + editor resolve to `memareh.articles`. `database.types.ts` only declares
   `memareh.articles` (no `public.articles` type exists). → `public.articles` is dead weight.
2. **Baseline doc contradiction.** `SCHEMA_BASELINE.md:70` is wrong; must be corrected.
3. **Schema drift (7 columns).** `public.articles` lacks `featured_image_alt`, `canonical_url`,
   `og_image`, `view_count`, `is_featured`, `video_url`, `scheduled_at`; and carries `tags text[]`
   + `featured_image_url` that `memareh.articles` does not. Its `status` CHECK omits `'scheduled'`,
   and its `slug` is `NOT NULL` while memareh allows NULL. `author_id` has no FK in public.
4. **SEO defects exist but are inert** (orphaned table): 1 hashed slug, 2 slugs >100 chars,
   9 titles >70 chars, 13 meta_titles >60, 16 meta_descriptions >160, 1 row with no keywords.
5. **Author/tag sprawl:** 26 rows, 1 author identity, 170 distinct free-text tags.

## Consolidation options (evaluated)
- **Option A — Retire `public.articles`** (RECOMMENDED). Delete table + its trigger
  `trg_set_author_name` + function `public.set_author_name()` + 6 policies + 5 indexes.
  Zero code breakage. Removes drift & the incorrect baseline claim.
- **Option B — Merge into `memareh.articles`.** Requires back-filling `tags[]`→`article_tag_relations`
  (use `memareh.migrate_tags_to_relations()` pattern), mapping `featured_image_url`→`featured_image`,
  and reconciling the 7 missing columns. Higher risk; only justified if the 26 rows carry data
  memareh lacks (they do not — same author, overlapping content domain).
- **Option C — Keep as-is.** Not advised: maintains a duplicate with silent drift and a false
  baseline reference.

## Verification performed
- Live `SELECT *` on `public.articles` (26 rows) — real data, not inferred.
- Grep of `src/**` + `supabase/**` for every `.from('articles')` + client `schema:` default.
- Column diff against migration DDL for `memareh.articles` and `public.articles`.

## Recommended next step
Adopt **Option A** in a follow-up phase (this audit is read-only / non-destructive). Update
`SCHEMA_BASELINE.md:67-86` to mark `public.articles` as orphaned + remove the `sitemap.ts` claim.
