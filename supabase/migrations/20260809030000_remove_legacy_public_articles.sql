-- =============================================================================
-- Migration: 20260809030000_remove_legacy_public_articles
-- Purpose:    DESTRUCTIVELY remove the orphaned legacy table and its obsolete
--             objects AFTER the archive step (20260809020000) has run successfully
--             and the application has operated normally through an agreed soak period.
--
-- !! DO NOT APPLY UNTIL ALL OF THE FOLLOWING ARE TRUE:
--    * Backup + RESTORE VERIFICATION complete (see PRODUCTION_BACKUP_RUNBOOK.md)
--    * Archive migration applied and soak period passed with no consumer errors
--    * Targeted public.articles backup exists
--    * Rollback no longer required (data preserved in full backup)
--
-- This migration is INTENTIONALLY destructive and was PREPARED but NOT APPLIED
-- in the audit/backup-readiness phase.
-- =============================================================================

-- Guard: only proceed if the table is in the archive schema (i.e. archive ran first).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'legacy_articles' AND tablename = 'articles'
  ) THEN
    RAISE EXCEPTION 'REMOVE ABORTED: legacy_articles.articles not found. Run archive migration first.';
  END IF;
END $$;

-- Drop the archived table (all 26 rows are gone from live DB; preserved in backups).
DROP TABLE IF EXISTS legacy_articles.articles;

-- Drop the trigger if it still exists in public (it moved with the table; this is a safety no-op).
DROP TRIGGER IF EXISTS trg_set_author_name ON legacy_articles.articles;
DROP TRIGGER IF EXISTS trg_set_author_name ON public.articles;

-- Drop the obsolete function only if nothing else references it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_depend d
    JOIN pg_proc p ON p.oid = d.refobjid
    WHERE p.proname = 'set_author_name'
      AND d.deptype = 'n'   -- normal dependency from another object
  ) THEN
    DROP FUNCTION IF EXISTS public.set_author_name() CASCADE;
    RAISE NOTICE 'Removed public.set_author_name().';
  ELSE
    RAISE NOTICE 'public.set_author_name() still referenced; left in place.';
  END IF;
END $$;

-- Drop leftover obsolete indexes (they moved with the table into legacy_articles).
DROP INDEX IF EXISTS legacy_articles.articles_slug_key;
DROP INDEX IF EXISTS legacy_articles.idx_articles_published_at;
DROP INDEX IF EXISTS legacy_articles.idx_articles_search_vector;
DROP INDEX IF EXISTS legacy_articles.idx_articles_tags;
DROP INDEX IF EXISTS legacy_articles.articles_pkey;

-- Drop the archive schema if now empty.
DROP SCHEMA IF EXISTS legacy_articles;

-- Note: the duplicate unique index `articles_slug_unique` was never reproduced in
-- migrations (dead weight) and is dropped with the table automatically.
