-- =============================================================================
-- Migration: 20261118000000_add_article_related_articles
-- Purpose:   Add ordered, directional editorial relationships between articles.
--
-- This migration is strictly additive. It does not insert, update, delete, or
-- alter any existing application rows or objects.
-- =============================================================================

CREATE TABLE memareh.article_related_articles (
  article_id uuid NOT NULL
    REFERENCES memareh.articles(id)
    ON DELETE CASCADE,
  related_article_id uuid NOT NULL
    REFERENCES memareh.articles(id)
    ON DELETE CASCADE,
  position smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, related_article_id),
  CONSTRAINT article_related_articles_source_position_key
    UNIQUE (article_id, position),
  CONSTRAINT article_related_articles_no_self_reference
    CHECK (article_id <> related_article_id),
  CONSTRAINT article_related_articles_position_range
    CHECK (position BETWEEN 1 AND 3)
);

CREATE INDEX article_related_articles_related_article_id_idx
  ON memareh.article_related_articles (related_article_id);

ALTER TABLE memareh.article_related_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published article relationships"
ON memareh.article_related_articles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM memareh.articles source_article
    WHERE source_article.id = article_related_articles.article_id
      AND source_article.status = 'published'
  )
  AND EXISTS (
    SELECT 1
    FROM memareh.articles related_article
    WHERE related_article.id = article_related_articles.related_article_id
      AND related_article.status = 'published'
  )
);

CREATE POLICY "Authors and admins read article relationships"
ON memareh.article_related_articles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM memareh.articles source_article
    WHERE source_article.id = article_related_articles.article_id
      AND source_article.author_id = auth.uid()
  )
  OR memareh.is_admin()
);

CREATE POLICY "Authors and admins insert article relationships"
ON memareh.article_related_articles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM memareh.articles source_article
    WHERE source_article.id = article_related_articles.article_id
      AND source_article.author_id = auth.uid()
  )
  OR memareh.is_admin()
);

CREATE POLICY "Authors and admins update article relationships"
ON memareh.article_related_articles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM memareh.articles source_article
    WHERE source_article.id = article_related_articles.article_id
      AND source_article.author_id = auth.uid()
  )
  OR memareh.is_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM memareh.articles source_article
    WHERE source_article.id = article_related_articles.article_id
      AND source_article.author_id = auth.uid()
  )
  OR memareh.is_admin()
);

CREATE POLICY "Authors and admins delete article relationships"
ON memareh.article_related_articles
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM memareh.articles source_article
    WHERE source_article.id = article_related_articles.article_id
      AND source_article.author_id = auth.uid()
  )
  OR memareh.is_admin()
);

GRANT SELECT
ON TABLE memareh.article_related_articles
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_related_articles
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_related_articles
TO service_role;
