# Content / Data Quality Audit

Canonical dataset `memareh.articles` only (NOT `legacy_articles.articles`). Read-only.

## Volume & status
- 25 articles, all `status = 'published'`. 0 drafts, 0 scheduled in DB.
- No indexing-of-drafts/scheduled risk today.

## Slug integrity
- Null/empty slug: **0**
- Duplicate slug: **0**
- All slugs unique and present → `generateStaticParams` + sitemap safe.

## Title / description
- `title` NOT NULL → 0 missing titles.
- `excerpt` (used as meta description) nullable; not counted as missing here, but several articles may lack excerpts → empty descriptions. Recommend populating `meta_description`/excerpt.

## SEO column usage (DATA-02 / SEO-05)
- `meta_title`, `meta_keywords`, `canonical_url`, `og_image` present but unused by `generateMetadata`. Either dead schema or untapped per-article control.

## Authors / tags
- `author_id` → `profiles`; `author_name` denormalized (present). Consistent.
- Tags via `article_tags` + `article_tag_relations`. Tag/category pages do not yet exist (no orphan-tag check possible yet).
- No broken tag relations observed.

## Comments / ratings / likes
- `article_comments` filtered `status='approved'` in UI; ownership via `user_id` (FK to `profiles`) + guest fallback.
- `article_ratings`, `comment_likes` present; ownership enforced via unique (article_id, user_id).

## Anomalies
- None material. Data is clean for the current 25-article corpus.

## Recommendations (no change this phase)
- Populate `excerpt`/`meta_description` where empty.
- Decide on `meta_title`/`meta_keywords`/`canonical_url`/`og_image`: wire them or drop them.
- When tag/category routes ship, audit orphan tags and add internal linking.
