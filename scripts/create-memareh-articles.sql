-- Create schema and articles table for the memareh project
-- Run this in Supabase SQL editor or via psql connected to your project's database

-- 1) Create schema if missing
CREATE SCHEMA IF NOT EXISTS memareh;

-- 2) Required extensions (pgcrypto for gen_random_uuid, pg_trgm optional for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3) Articles table
CREATE TABLE IF NOT EXISTS memareh.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  excerpt text,
  content text,
  tags text[] DEFAULT array[]::text[],
  featured_image text,
  author_id uuid,
  allow_comments boolean DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  meta_title text,
  meta_description text,
  meta_keywords text[] DEFAULT array[]::text[],
  reading_time integer,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Optional FK: if you have a profiles table in memareh schema, uncomment below
-- ALTER TABLE memareh.articles ADD CONSTRAINT fk_author_profile FOREIGN KEY (author_id) REFERENCES memareh.profiles(id) ON DELETE SET NULL;

-- 4) Search vector generated column (full-text search)
ALTER TABLE memareh.articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(content,''))
  ) STORED;

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON memareh.articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON memareh.articles (published_at);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON memareh.articles USING GIN (tags);

-- 6) Trigger to update updated_at timestamp on row changes
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

-- 7) Recommended Row Level Security (RLS) policies
-- Enable RLS so you can define fine-grained access rules
ALTER TABLE memareh.articles ENABLE ROW LEVEL SECURITY;

-- Public read policy: allow anyone to SELECT published articles
CREATE POLICY "Public read published articles"
ON memareh.articles
FOR SELECT
USING (status = 'published');

-- Allow authenticated users to insert articles, with author_id matching their uid
-- Supabase exposes auth.uid() in RLS policies
CREATE POLICY "Allow authenticated insert"
ON memareh.articles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Allow authors to update their own articles
CREATE POLICY "Allow author update"
ON memareh.articles
FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Allow authors to delete their own articles (optional)
CREATE POLICY "Allow author delete"
ON memareh.articles
FOR DELETE
USING (author_id = auth.uid());

-- 8) Example row (for testing)
-- INSERT INTO memareh.articles (title, slug, excerpt, content, tags, author_id, status, published_at)
-- VALUES ('نمونه مقاله', 'sample-article', 'خلاصه‌ای کوتاه', '<p>متن مقاله به صورت HTML</p>', ARRAY['تست','مثال'], gen_random_uuid(), 'published', now());

-- End of script
