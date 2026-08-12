-- Migration: remove direct role access to the revalidation secret table.
--
-- Context / problem
-- -----------------
-- memareh.revalidation_secrets holds the runtime revalidation token (a working
-- mirror of the Vault secret revalidation_token). It was created outside the
-- committed migrations during the revalidation repair and, due to the broad
-- `GRANT SELECT ON ALL TABLES IN SCHEMA memareh TO anon` / ALTER DEFAULT
-- PRIVILEGES pattern, ended up directly readable by anon and authenticated.
-- That exposes the token through PostgREST (and any client) — a real secret
-- disclosure risk.
--
-- Fix
-- ---
-- Revoke all direct DML privileges on the table from anon, authenticated, and
-- PUBLIC. The trigger function memareh.notify_article_revalidation() is
-- SECURITY DEFINER with owner = postgres, so it reads the table as the owner
-- regardless of client grants. Removing client access therefore does NOT affect
-- the trigger -> pg_net -> /api/revalidate flow, which is already proven working.
--
-- A trigger function is invoked by the system (not directly by clients), so it
-- does not need EXECUTE granted to anon/authenticated/PUBLIC. We revoke those
-- too, narrowing the call surface. The trigger itself still fires it.
--
-- This migration:
--   * contains NO secret values, tokens, or URLs;
--   * preserves all rows (no DROP / DELETE / TRUNCATE);
--   * preserves the trigger and the function (no DDL on them);
--   * preserves working pg_net behavior;
--   * is idempotent (guarded by to_regclass so it is safe on a fresh reset
--     where the table does not yet exist).
--
-- Broader default-privilege exposure (separate future issue)
-- ----------------------------------------------------------
-- The underlying cause is `ALTER DEFAULT PRIVILEGES IN SCHEMA memareh
-- GRANT SELECT ON TABLES TO anon`, which would grant anon SELECT to ANY future
-- sensitive table created in this schema. Correcting that globally is deferred:
-- it must not silently change access to legitimate public tables (articles,
-- comments, etc.), so it is tracked as a follow-up rather than folded into this
-- targeted, minimal revoke. This migration only overrides privileges for the
-- one sensitive table.

DO $$
DECLARE
  v_tbl regclass;
BEGIN
  SELECT to_regclass('memareh.revalidation_secrets') INTO v_tbl;

  IF v_tbl IS NOT NULL THEN
    -- 1) Remove direct DML access from every external role.
    EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON memareh.revalidation_secrets '
         || 'FROM anon, authenticated, PUBLIC';

    -- 2) Trigger function must not be directly callable by external clients.
    --    The trigger fires it automatically (SECURITY DEFINER, owner = postgres);
    --    direct EXECUTE by anon/authenticated/PUBLIC is unnecessary surface.
    EXECUTE 'REVOKE EXECUTE ON FUNCTION memareh.notify_article_revalidation() '
         || 'FROM anon, authenticated, PUBLIC';

    -- 3) Defensive: ensure the table is not exposed through Supabase Realtime.
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables pt
      JOIN pg_publication p ON p.pubname = pt.pubname
      WHERE p.pubname = 'supabase_realtime'
        AND pt.schemaname = 'memareh'
        AND pt.tablename = 'revalidation_secrets'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE memareh.revalidation_secrets';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- READ-ONLY VERIFICATION (run separately in Supabase SQL Editor; not part of
-- the migration execution). Confirms the secret table is no longer readable by
-- external roles, the trigger is enabled, and the function stays SECURITY
-- DEFINER. Never selects secret row contents.
-- ============================================================================
--
-- SELECT
--   r.rolname AS role,
--   has_table_privilege(r.rolname, 'memareh.revalidation_secrets', 'SELECT') AS sel,
--   has_table_privilege(r.rolname, 'memareh.revalidation_secrets', 'INSERT') AS ins,
--   has_table_privilege(r.rolname, 'memareh.revalidation_secrets', 'UPDATE') AS upd,
--   has_table_privilege(r.rolname, 'memareh.revalidation_secrets', 'DELETE') AS del
-- FROM (VALUES ('anon'),('authenticated'),('service_role'),('postgres')) AS r(rolname)
-- ORDER BY r.rolname;
--
-- -- PUBLIC group (default privileges):
-- SELECT
--   COALESCE(g.rolname, 'PUBLIC') AS grantee_role,
--   a.privilege_type,
--   a.is_grantable
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- LEFT JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a ON true
-- LEFT JOIN pg_roles g ON g.oid = a.grantee
-- WHERE n.nspname = 'memareh' AND c.relname = 'revalidation_secrets';
--
-- -- Trigger still present/enabled:
-- SELECT t.tgname, c.relname, t.tgenabled, pg_get_triggerdef(t.oid)
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'memareh' AND t.tgname = 'trg_revalidate_articles' AND NOT t.tgisinternal;
--
-- -- Function still SECURITY DEFINER (owner = postgres):
-- SELECT p.proname, p.prosecdef, p.proowner::regrole
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'memareh' AND p.proname = 'notify_article_revalidation';
