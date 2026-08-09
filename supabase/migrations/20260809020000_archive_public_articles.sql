-- =============================================================================
-- Migration: 20260809020000_archive_public_articles
-- Purpose:    Remove the orphaned `public.articles` table from ACTIVE use while
--             preserving all 26 rows, its trigger, and function. This is the FIRST,
--             REVERSIBLE step of retiring `public.articles`. It does NOT drop anything.
--
-- Strategy:   Move the table into a non-exposed archive schema `legacy_articles`,
--             disable the write trigger (no writes expected post-archive), revoke
--             anon/authenticated API access, and enable RLS with NO permissive
--             policy (deny-by-default). The owner/service_role retains a recovery path.
--
-- !! DO NOT APPLY UNTIL A VERIFIED PRODUCTION BACKUP EXISTS. Read-only inspection
--    only is permitted before that. This migration was PREPARED but NOT APPLIED
--    in the audit/backup-readiness phase.
--
-- Reversibility: rename back to public.articles (see COMMENT at bottom).
-- =============================================================================

DO $$
DECLARE
  v_count integer;
  v_expected integer := 26;
BEGIN
  -- Guard 1: source table must exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'articles'
  ) THEN
    RAISE EXCEPTION 'ARCHIVE ABORTED: public.articles does not exist.';
  END IF;

  -- Guard 2: expected row count (production remains active; recheck before apply)
  SELECT count(*) INTO v_count FROM public.articles;
  IF v_count <> v_expected THEN
    RAISE EXCEPTION 'ARCHIVE ABORTED: public.articles row count = %, expected %. Re-run preflight.', v_count, v_expected;
  END IF;

  -- Guard 3: no application code consumer (documented; this is a final safety net)
  -- (Repo grep must show 0 references to public.articles before applying.)

  -- Create archive schema (non-exposed by default: Supabase only auto-exposes
  -- the `public` schema and schemas listed in `exposed_schemas`/API settings).
  CREATE SCHEMA IF NOT EXISTS legacy_articles;

  -- Move the table into the archive schema (metadata-only; preserves all 26 rows).
  ALTER TABLE public.articles SET SCHEMA legacy_articles;

  -- The trigger trg_set_author_name is table-bound and moves with the table.
  -- Disable it: archived data is read-only and author_name is already populated.
  ALTER TABLE legacy_articles.articles DISABLE TRIGGER trg_set_author_name;

  -- Revoke ordinary API access.
  REVOKE ALL ON legacy_articles.articles FROM anon, authenticated;
  REVOKE ALL ON SCHEMA legacy_articles FROM anon, authenticated;

  -- Deny-by-default: enable RLS, create NO permissive policy.
  ALTER TABLE legacy_articles.articles ENABLE ROW LEVEL SECURITY;

  -- Drop the now-orphaned public policies that referenced public.articles
  -- (they are meaningless once the table leaves the public schema).
  DROP POLICY IF EXISTS "Allow anyone to read published articles" ON legacy_articles.articles;
  DROP POLICY IF EXISTS "Public read published articles"          ON legacy_articles.articles;
  DROP POLICY IF EXISTS "Allow authenticated insert"              ON legacy_articles.articles;
  DROP POLICY IF EXISTS "Authenticated can insert own articles"   ON legacy_articles.articles;
  DROP POLICY IF EXISTS "Allow author update"                    ON legacy_articles.articles;
  DROP POLICY IF EXISTS "Authors can update own articles"         ON legacy_articles.articles;

  RAISE NOTICE 'ARCHIVE OK: public.articles -> legacy_articles.articles (% rows preserved).', v_count;
END $$;

-- -----------------------------------------------------------------------------
-- ROLLBACK (if needed, before final delete):
--   ALTER TABLE legacy_articles.articles SET SCHEMA public;
--   ALTER TABLE public.articles ENABLE TRIGGER trg_set_author_name;
--   GRANT SELECT ON public.articles TO anon, authenticated;  -- restore prior policies
--   (Recreate the 6 public policies from 20260808000000_base_schema_capture.sql.)
-- No data was dropped; rollback is metadata-only with zero data loss.
-- -----------------------------------------------------------------------------
