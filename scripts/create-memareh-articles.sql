-- =============================================================================
-- Comprehensive migration: memareh.articles + article_tags
-- Run this in Supabase SQL editor or via psql connected to your project's database
-- =============================================================================

-- 1) Schema & extensions
CREATE SCHEMA IF NOT EXISTS memareh;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Articles table (idempotent creation)
CREATE TABLE IF NOT EXISTS memareh.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  excerpt text,
  content text,
  featured_image text,
  featured_image_alt text,
  category text,
  author_id uuid,
  author_name text,
  allow_comments boolean DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived','scheduled')),
  meta_title text,
  meta_description text,
  meta_keywords text[] DEFAULT array[]::text[],
  canonical_url text,
  og_image text,
  reading_time integer,
  view_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  video_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Add columns that may be missing on existing tables (safe re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='featured_image_alt') THEN
    ALTER TABLE memareh.articles ADD COLUMN featured_image_alt text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='category') THEN
    ALTER TABLE memareh.articles ADD COLUMN category text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='author_name') THEN
    ALTER TABLE memareh.articles ADD COLUMN author_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='canonical_url') THEN
    ALTER TABLE memareh.articles ADD COLUMN canonical_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='og_image') THEN
    ALTER TABLE memareh.articles ADD COLUMN og_image text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='view_count') THEN
    ALTER TABLE memareh.articles ADD COLUMN view_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='is_featured') THEN
    ALTER TABLE memareh.articles ADD COLUMN is_featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='video_url') THEN
    ALTER TABLE memareh.articles ADD COLUMN video_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='scheduled_at') THEN
    ALTER TABLE memareh.articles ADD COLUMN scheduled_at timestamptz;
  END IF;
  -- Widen status CHECK constraint to include 'scheduled'
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='memareh' AND table_name='articles' AND column_name='status') THEN
    ALTER TABLE memareh.articles DROP CONSTRAINT IF EXISTS articles_status_check;
    ALTER TABLE memareh.articles ADD CONSTRAINT articles_status_check CHECK (status IN ('draft','published','archived','scheduled'));
  END IF;
END $$;

-- 4) article_tags table
CREATE TABLE IF NOT EXISTS memareh.article_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_tags_slug ON memareh.article_tags (slug);
CREATE INDEX IF NOT EXISTS idx_article_tags_name ON memareh.article_tags (name);

-- 5) article_tag_relations junction table
CREATE TABLE IF NOT EXISTS memareh.article_tag_relations (
  article_id uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES memareh.article_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_article_tag_relations_article ON memareh.article_tag_relations (article_id);
CREATE INDEX IF NOT EXISTS idx_article_tag_relations_tag ON memareh.article_tag_relations (tag_id);

-- 6) View for article tags (convenience)
CREATE OR REPLACE VIEW memareh.article_tags_view
WITH (security_invoker = true) AS
SELECT
  a.id AS article_id,
  COALESCE(
    jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
      FILTER (WHERE t.id IS NOT NULL),
    '[]'::jsonb
  ) AS tags
FROM memareh.articles a
LEFT JOIN memareh.article_tag_relations atr ON atr.article_id = a.id
LEFT JOIN memareh.article_tags t ON t.id = atr.tag_id
GROUP BY a.id;

-- 7) Search vector column (handles content changes)
ALTER TABLE memareh.articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title,'') || ' ' ||
      coalesce(excerpt,'') || ' ' ||
      coalesce(content,'') || ' ' ||
      coalesce(category,'')
    )
  ) STORED;

-- 8) Indexes
CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON memareh.articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON memareh.articles (published_at);
CREATE INDEX IF NOT EXISTS idx_articles_category ON memareh.articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_status ON memareh.articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_is_featured ON memareh.articles (is_featured);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at ON memareh.articles (scheduled_at);

-- 9) Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION memareh.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_articles_updated_at ON memareh.articles;
CREATE TRIGGER trg_update_articles_updated_at
BEFORE UPDATE ON memareh.articles
FOR EACH ROW
EXECUTE FUNCTION memareh.update_updated_at_column();

-- 10) Trigger: set published_at when status becomes 'published'
CREATE OR REPLACE FUNCTION memareh.set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_published_at ON memareh.articles;
CREATE TRIGGER trg_set_published_at
BEFORE UPDATE ON memareh.articles
FOR EACH ROW
EXECUTE FUNCTION memareh.set_published_at();

-- 11) Row Level Security
ALTER TABLE memareh.articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Public read published articles" ON memareh.articles;
DROP POLICY IF EXISTS "Allow authenticated insert" ON memareh.articles;
DROP POLICY IF EXISTS "Allow author update" ON memareh.articles;
DROP POLICY IF EXISTS "Allow author delete" ON memareh.articles;
DROP POLICY IF EXISTS "Admin full access" ON memareh.articles;

-- Public can read published (or scheduled with past scheduled_at)
CREATE POLICY "Public read published articles"
ON memareh.articles
FOR SELECT
USING (
  status = 'published'
  OR (status = 'scheduled' AND scheduled_at <= now())
);

-- Authenticated users can insert (must set author_id = their uid)
CREATE POLICY "Allow authenticated insert"
ON memareh.articles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Authors can update their own articles
CREATE POLICY "Allow author update"
ON memareh.articles
FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Authors can delete their own articles
CREATE POLICY "Allow author delete"
ON memareh.articles
FOR DELETE
USING (author_id = auth.uid());

-- Admins can do everything (handled via application-level check; optional DB-level policy below)
-- CREATE POLICY "Admin full access"
-- ON memareh.articles
-- FOR ALL
-- USING (auth.uid() IN (SELECT id FROM memareh.profiles WHERE role = 'admin'))
-- WITH CHECK (auth.uid() IN (SELECT id FROM memareh.profiles WHERE role = 'admin'));

-- 12) RLS for article_tags and article_tag_relations
ALTER TABLE memareh.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_tag_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tags" ON memareh.article_tags;
CREATE POLICY "Public read tags"
ON memareh.article_tags
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated manage tags" ON memareh.article_tags;
CREATE POLICY "Authenticated manage tags"
ON memareh.article_tags
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public read tag relations" ON memareh.article_tag_relations;
CREATE POLICY "Public read tag relations"
ON memareh.article_tag_relations
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated manage tag relations" ON memareh.article_tag_relations;
CREATE POLICY "Authenticated manage tag relations"
ON memareh.article_tag_relations
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 13) Function: increment article view count (used by the app)
CREATE OR REPLACE FUNCTION memareh.increment_article_view(article_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE memareh.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_uuid;
END;
$$;

-- 14) Function: search articles by text (includes past-due scheduled)
CREATE OR REPLACE FUNCTION memareh.search_articles(search_query text)
RETURNS SETOF memareh.articles
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM memareh.articles
  WHERE (status = 'published' OR (status = 'scheduled' AND scheduled_at <= now()))
    AND search_vector @@ plainto_tsquery('simple', search_query)
  ORDER BY ts_rank(search_vector, plainto_tsquery('simple', search_query)) DESC
  LIMIT 20;
$$;

-- 15) Auto-publish scheduled articles whose time has come
CREATE OR REPLACE FUNCTION memareh.auto_publish_scheduled()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE memareh.articles
  SET status = 'published',
      published_at = COALESCE(published_at, now())
  WHERE status = 'scheduled'
    AND scheduled_at <= now()
    AND scheduled_at IS NOT NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 16) Helper to migrate comma-separated tags to tag relations (run once after migration)
-- Example usage: SELECT memareh.migrate_tags_to_relations();
CREATE OR REPLACE FUNCTION memareh.migrate_tags_to_relations()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  article_rec RECORD;
  tag_name text;
  tag_id uuid;
  migrated_count integer := 0;
BEGIN
  -- Ensure old tags column exists (it was text[])
  FOR article_rec IN SELECT id, tags FROM memareh.articles WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  LOOP
    FOREACH tag_name IN ARRAY article_rec.tags
    LOOP
      tag_name := trim(tag_name);
      IF tag_name = '' THEN CONTINUE; END IF;

      -- Insert tag if it doesn't exist
      INSERT INTO memareh.article_tags (name, slug)
      VALUES (
        tag_name,
        regexp_replace(lower(trim(tag_name)), '[^a-z0-9\u0600-\u06FF\-]', '-', 'g')
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO tag_id;

      -- Link tag to article (ignore if already linked)
      INSERT INTO memareh.article_tag_relations (article_id, tag_id)
      VALUES (article_rec.id, tag_id)
      ON CONFLICT DO NOTHING;

      migrated_count := migrated_count + 1;
    END LOOP;
  END LOOP;

  RETURN format('Migrated %s tag relations', migrated_count);
END;
$$;

-- End of comprehensive migration script

-- =============================================================================
-- Comment system (article_comments + comment_likes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS memareh.article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES memareh.article_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memareh.comment_likes (
  comment_id uuid NOT NULL REFERENCES memareh.article_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article ON memareh.article_comments (article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_status ON memareh.article_comments (status);
CREATE INDEX IF NOT EXISTS idx_article_comments_user ON memareh.article_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON memareh.article_comments (parent_id);

ALTER TABLE memareh.article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Auth users insert comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Users read own comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Admin manage comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Auth manage likes" ON memareh.comment_likes;

CREATE POLICY "Public read approved comments"
ON memareh.article_comments
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Users read own comments"
ON memareh.article_comments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Auth users insert comments"
ON memareh.article_comments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admin manage comments"
ON memareh.article_comments
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Auth manage likes"
ON memareh.comment_likes
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION memareh.update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_article_comments_updated_at ON memareh.article_comments;
CREATE TRIGGER trg_update_article_comments_updated_at
BEFORE UPDATE ON memareh.article_comments
FOR EACH ROW
EXECUTE FUNCTION memareh.update_comment_updated_at();

-- Schema permissions for Supabase roles
GRANT USAGE ON SCHEMA memareh TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA memareh TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA memareh TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA memareh TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA memareh GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA memareh GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA memareh GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
