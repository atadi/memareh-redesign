DROP SCHEMA IF EXISTS memareh CASCADE;

-- =============================================================================
-- First-time migration: memareh.articles + article_tags
-- Run this in Supabase SQL editor or via psql connected to your project's database
-- =============================================================================

-- 1) Schema & extensions
CREATE SCHEMA memareh;

-- PostGIS for location support
CREATE EXTENSION IF NOT EXISTS postgis;

-- pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Articles table
CREATE TABLE memareh.articles (
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
  meta_keywords text[] DEFAULT '{}'::text[],
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

-- 3) article_tags table
CREATE TABLE memareh.article_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 4) article_tag_relations junction table
CREATE TABLE memareh.article_tag_relations (
  article_id uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES memareh.article_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (article_id, tag_id)
);

-- 5) View for article tags
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

-- 6) Search vector column
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

-- 7) Indexes
CREATE INDEX idx_articles_search_vector ON memareh.articles USING GIN (search_vector);
CREATE INDEX idx_articles_published_at ON memareh.articles (published_at);
CREATE INDEX idx_articles_category ON memareh.articles (category);
CREATE INDEX idx_articles_status ON memareh.articles (status);
CREATE INDEX idx_articles_is_featured ON memareh.articles (is_featured);
CREATE INDEX idx_articles_scheduled_at ON memareh.articles (scheduled_at);

CREATE INDEX idx_article_tags_slug ON memareh.article_tags (slug);
CREATE INDEX idx_article_tags_name ON memareh.article_tags (name);

CREATE INDEX idx_article_tag_relations_article ON memareh.article_tag_relations (article_id);
CREATE INDEX idx_article_tag_relations_tag ON memareh.article_tag_relations (tag_id);

-- 8) Trigger: auto-update updated_at
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

-- 9) Trigger: set published_at when status becomes 'published'
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

-- 10) Row Level Security
ALTER TABLE memareh.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_tag_relations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Public read published articles" ON memareh.articles;
DROP POLICY IF EXISTS "Allow authenticated insert" ON memareh.articles;
DROP POLICY IF EXISTS "Allow author update" ON memareh.articles;
DROP POLICY IF EXISTS "Allow author delete" ON memareh.articles;
DROP POLICY IF EXISTS "Authenticated read all articles" ON memareh.articles;
DROP POLICY IF EXISTS "Public read tags" ON memareh.article_tags;
DROP POLICY IF EXISTS "Public read tag relations" ON memareh.article_tag_relations;

-- Public can read published (or scheduled with past scheduled_at)
CREATE POLICY "Public read published articles"
ON memareh.articles
FOR SELECT
USING (
  status = 'published'
  OR (status = 'scheduled' AND scheduled_at <= now())
);

-- Authenticated users can read all articles (admin access)
CREATE POLICY "Authenticated read all articles"
ON memareh.articles
FOR SELECT
USING (auth.uid() IS NOT NULL);

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

CREATE POLICY "Public read tags"
ON memareh.article_tags
FOR SELECT
USING (true);

CREATE POLICY "Public read tag relations"
ON memareh.article_tag_relations
FOR SELECT
USING (true);

-- 11) Function: increment article view count
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

-- 12) Function: auto-publish scheduled articles whose time has come
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

-- 13) Function: search articles by text (includes past-due scheduled)
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

-- End of migration script

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_article_comments_article ON memareh.article_comments (article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_status ON memareh.article_comments (status);
CREATE INDEX IF NOT EXISTS idx_article_comments_user ON memareh.article_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON memareh.article_comments (parent_id);

-- RLS
ALTER TABLE memareh.article_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Auth users insert comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Users read own comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Admin manage comments" ON memareh.article_comments;
DROP POLICY IF EXISTS "Auth manage likes" ON memareh.comment_likes;

-- Public: read only approved comments
CREATE POLICY "Public read approved comments"
ON memareh.article_comments
FOR SELECT
USING (status = 'approved');

-- Users can see their own comments regardless of status
CREATE POLICY "Users read own comments"
ON memareh.article_comments
FOR SELECT
USING (auth.uid() = user_id);

-- Authenticated users can insert comments (always as pending)
CREATE POLICY "Auth users insert comments"
ON memareh.article_comments
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id AND status = 'pending');

-- Only admins (via service role) can update/delete comments
CREATE POLICY "Admin manage comments"
ON memareh.article_comments
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can toggle likes
CREATE POLICY "Auth manage likes"
ON memareh.comment_likes
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger: auto-update updated_at on comments
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