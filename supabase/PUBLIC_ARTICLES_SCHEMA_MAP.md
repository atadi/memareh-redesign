# public.articles ↔ memareh.articles — Column Mapping

## Shared columns (19)
- `id`
- `title`
- `slug`
- `excerpt`
- `content`
- `featured_image`
- `category`
- `author_id`
- `author_name`
- `allow_comments`
- `status`
- `meta_title`
- `meta_description`
- `meta_keywords`
- `reading_time`
- `published_at`
- `created_at`
- `updated_at`
- `search_vector`

## Only in public.articles (no memareh equivalent)
- `tags`
- `featured_image_url`

## Only in memareh.articles (absent from public)
- `featured_image_alt`
- `canonical_url`
- `og_image`
- `view_count`
- `is_featured`
- `video_url`
- `scheduled_at`

## Type/constraint differences (from migration DDL)
- `slug`: public = `NOT NULL` + UNIQUE; memareh = nullable + UNIQUE. Public rejects NULL slugs.
- `status` CHECK: public allows `(draft,published,archived)` — **omits `scheduled`**; memareh allows `(draft,published,archived,scheduled)`.
- `author_id`: public has NO FK to `profiles`; memareh has `FK → memareh.profiles(id) ON DELETE SET NULL`.
- `tags`: public stores as `text[]` (native array) + GIN `idx_articles_tags`; memareh uses normalized `article_tags`/`article_tag_relations` + `article_tags_view` (JSONB).
- `featured_image_url` (public) vs `featured_image` (memareh): separate image columns (public has BOTH).
- public is missing SEO/engagement columns memareh carries: `featured_image_alt`, `canonical_url`, `og_image`, `view_count`, `is_featured`, `video_url`, `scheduled_at`.

## Consolidation impact
- A merge of `public.articles` INTO `memareh.articles` would require back-filling `tags`→relations (via existing `memareh.migrate_tags_to_relations()` pattern) and mapping `featured_image_url`→`featured_image`.
- Reverse (memareh→public) would lose `scheduled` status support, `author_id` FK integrity, and 7 SEO/engagement columns — NOT recommended.
