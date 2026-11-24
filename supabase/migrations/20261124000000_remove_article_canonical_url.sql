-- Article canonical URLs are derived data: NEXT_PUBLIC_SITE_URL + /articles/ + slug.
-- Remove the second canonical authority and protect public slug integrity.
--
-- Rollback: re-add `canonical_url text` if an old application still needs it.
-- The focused pre-change snapshot under C:\backups\memareh\ holds the prior
-- values. No article rows are rewritten by this migration.

ALTER TABLE memareh.articles
  DROP CONSTRAINT IF EXISTS articles_slug_trimmed_check;

ALTER TABLE memareh.articles
  ADD CONSTRAINT articles_slug_trimmed_check
  CHECK (slug IS NULL OR slug = btrim(slug));

ALTER TABLE memareh.articles
  DROP CONSTRAINT IF EXISTS articles_public_slug_present_check;

ALTER TABLE memareh.articles
  ADD CONSTRAINT articles_public_slug_present_check
  CHECK (
    status NOT IN ('published', 'scheduled')
    OR (slug IS NOT NULL AND btrim(slug) <> '')
  );

-- articles_slug_key UNIQUE (slug) is intentionally preserved.

ALTER TABLE memareh.articles
  DROP COLUMN IF EXISTS canonical_url;
