-- =============================================================================
-- Sync auth.users.user_metadata.display_name -> memareh.profiles.display_name
-- This keeps the public profile table in sync when auth metadata is updated
-- (e.g. from the admin user-management UI or Supabase Dashboard).
-- Run this after create-client-auth.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION memareh.sync_display_name_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'display_name' THEN
    INSERT INTO memareh.profiles (id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION memareh.sync_display_name_from_auth();

GRANT EXECUTE ON FUNCTION memareh.sync_display_name_from_auth() TO postgres;
