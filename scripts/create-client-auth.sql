-- =============================================================================
-- Client auth: profiles table + auto-create trigger
-- Run this in Supabase SQL editor after create-memareh-articles-first-time.sql
-- =============================================================================

-- 1) Profiles table for client users
CREATE TABLE IF NOT EXISTS memareh.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- 2) Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION memareh.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO memareh.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION memareh.handle_new_user();

-- 3) RLS
ALTER TABLE memareh.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON memareh.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON memareh.profiles;

CREATE POLICY "Users read own profile"
  ON memareh.profiles FOR SELECT
  USING (auth.uid() = id);

-- Public read for comment display (display_name is not sensitive)
CREATE POLICY "Anyone can read profiles"
  ON memareh.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users update own profile"
  ON memareh.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) Grants
GRANT USAGE ON SCHEMA memareh TO anon, authenticated;
GRANT SELECT ON memareh.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON memareh.profiles TO authenticated;
