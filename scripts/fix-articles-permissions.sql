-- Fix permissions for articles after moving to public schema
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor) as a DB superuser

-- 1) Ensure the public schema is usable by anon/authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) OPTIONAL: allow read access to public tables for anon (useful if you don't want RLS)
-- GRANT SELECT ON public.articles TO anon;

-- 3) Enable Row Level Security and create policies for safer access
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to SELECT only published articles
CREATE POLICY "Public can select published articles"
  ON public.articles
  FOR SELECT
  USING (status = 'published');

-- Allow authenticated users to INSERT their own articles (author_id must match auth.uid())
CREATE POLICY "Authenticated can insert own articles"
  ON public.articles
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Allow authors to UPDATE their own articles
CREATE POLICY "Authors can update own articles"
  ON public.articles
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- If you want to allow DELETE for authors as well, uncomment below
-- CREATE POLICY "Authors can delete own articles"
--   ON public.articles
--   FOR DELETE
--   USING (auth.uid() = author_id);

-- 4) Apply grants for convenience (does not override RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT SELECT ON public.articles TO anon;

-- 5) Ensure sequences (if id uses serial) are accessible (if any)
-- GRANT USAGE ON SEQUENCE public.articles_id_seq TO anon, authenticated;

-- Done. Re-run the REST test after executing this SQL.
