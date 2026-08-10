-- Phase: Article Global CSS + Per-Article Local CSS (Feature B storage)
--
-- ADDITIVE ONLY.
--   * adds one nullable text column to memareh.articles
--   * mutates no existing rows
--   * does not touch article content, slugs, or SEO fields
--   * does not create, alter, or drop any RLS policy
--   * does not touch legacy_articles, services, auth, or storage
--
-- Existing RLS on memareh.articles already governs who may SELECT/UPDATE the
-- row; `custom_css` is just another column on that row and therefore inherits
-- the exact same authorization. No policy change is needed or wanted.
--
-- Security note: this column stores RAW admin-authored CSS. It is never sent to
-- the browser unvalidated — `sanitizeArticleCss()` (src/lib/article-css.ts)
-- rejects prohibited constructs and rewrites every selector so it can only
-- match inside `.article-content[data-article-id="<id>"]`.
--
-- Reversal:
--   ALTER TABLE memareh.articles DROP COLUMN IF EXISTS custom_css;

ALTER TABLE memareh.articles
  ADD COLUMN IF NOT EXISTS custom_css text;

COMMENT ON COLUMN memareh.articles.custom_css IS
  'Optional per-article CSS (admin-authored). Validated and scoped to '
  '.article-content[data-article-id="<id>"] at render time; never emitted raw.';
