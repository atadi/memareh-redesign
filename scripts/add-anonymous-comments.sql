-- =============================================================================
-- Anonymous comments migration
-- Run this in Supabase SQL editor after create-client-auth.sql
-- =============================================================================

-- 1) Allow comments from non-authenticated users
ALTER TABLE memareh.article_comments
  ALTER COLUMN user_id DROP NOT NULL;

-- 2) Add guest metadata columns
ALTER TABLE memareh.article_comments
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_token uuid;

-- 3) Ensure a guest name is provided when user_id is null
ALTER TABLE memareh.article_comments
  DROP CONSTRAINT IF EXISTS article_comments_guest_name_required;

ALTER TABLE memareh.article_comments
  ADD CONSTRAINT article_comments_guest_name_required
  CHECK (
    (user_id IS NOT NULL)
    OR
    (user_id IS NULL AND guest_name IS NOT NULL AND trim(guest_name) <> '')
  );

-- 4) Update RLS policies for anonymous inserts
DROP POLICY IF EXISTS "Anonymous users insert comments" ON memareh.article_comments;

CREATE POLICY "Anonymous users insert comments"
  ON memareh.article_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL
    AND status = 'pending'
    AND user_id IS NULL
    AND guest_name IS NOT NULL
    AND trim(guest_name) <> ''
  );

-- 5) Tighten authenticated insert policy so auth users cannot spoof other user_ids
DROP POLICY IF EXISTS "Auth users insert comments" ON memareh.article_comments;

CREATE POLICY "Auth users insert comments"
  ON memareh.article_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND status = 'pending'
  );

-- 6) Admin policy remains; no changes needed

-- 7) Grant anon insert on the table (needed because RLS WITH CHECK still requires table privileges)
--    Anon already has USAGE on the schema from earlier scripts; add INSERT on this table.
GRANT INSERT ON memareh.article_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON memareh.article_comments TO authenticated;

-- 8) Update sequence/default if any (none currently)

-- 9) Reload API cache note: run this in Supabase Dashboard → Settings → API → Reload API cache
--    if new columns still return 42P01 / PGRST202.
