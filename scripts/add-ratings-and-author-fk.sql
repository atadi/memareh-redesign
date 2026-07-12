-- =============================================================================
-- Add article ratings and author -> profile foreign key
-- Run this after create-client-auth.sql (so profiles table exists)
-- =============================================================================

-- 1) Backfill missing profile rows for existing article authors so we can add FK
INSERT INTO memareh.profiles (id, display_name)
SELECT DISTINCT a.author_id, COALESCE(a.author_name, 'نویسنده')
FROM memareh.articles a
JOIN auth.users u ON u.id = a.author_id
WHERE a.author_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM memareh.profiles p WHERE p.id = a.author_id)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- 2) Add FK so articles.author_id can be embedded as author:profiles
ALTER TABLE memareh.articles
  DROP CONSTRAINT IF EXISTS articles_author_id_fkey;

ALTER TABLE memareh.articles
  ADD CONSTRAINT articles_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES memareh.profiles(id)
  ON DELETE SET NULL;

-- 3) Article ratings table
CREATE TABLE IF NOT EXISTS memareh.article_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE (article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_ratings_article_id ON memareh.article_ratings (article_id);
CREATE INDEX IF NOT EXISTS idx_article_ratings_user_id ON memareh.article_ratings (user_id);

ALTER TABLE memareh.article_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read article ratings" ON memareh.article_ratings;
CREATE POLICY "Public read article ratings"
  ON memareh.article_ratings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth users upsert own ratings" ON memareh.article_ratings;
CREATE POLICY "Auth users upsert own ratings"
  ON memareh.article_ratings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON memareh.article_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON memareh.article_ratings TO authenticated;

-- 4) Function to calculate rating stats for an article
CREATE OR REPLACE FUNCTION memareh.calculate_article_rating(article_uuid uuid)
RETURNS TABLE(
  average_rating numeric,
  total_ratings bigint,
  rating_distribution jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH counts AS (
    SELECT r.rating, COUNT(*)::int AS cnt
    FROM memareh.article_ratings r
    WHERE r.article_id = article_uuid
    GROUP BY r.rating
  )
  SELECT
    COALESCE((SELECT AVG(r.rating) FROM memareh.article_ratings r WHERE r.article_id = article_uuid), 0)::numeric AS average_rating,
    (SELECT COUNT(*)::bigint FROM memareh.article_ratings r WHERE r.article_id = article_uuid) AS total_ratings,
    COALESCE(
      (SELECT jsonb_object_agg(rating, COALESCE(cnt, 0) ORDER BY rating)
       FROM generate_series(1, 5) AS rating
       LEFT JOIN counts USING (rating)),
      '{}'::jsonb
    ) AS rating_distribution;
$$;

GRANT EXECUTE ON FUNCTION memareh.calculate_article_rating(uuid) TO anon, authenticated;
