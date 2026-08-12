-- Migration: prevent FUTURE memareh tables from auto-granting SELECT to anon/authenticated.
--
-- Context / problem
-- -----------------
-- The live Production `pg_default_acl` proves that default privileges for objects
-- CREATED BY ROLE `postgres` in schema `memareh` currently contain:
--
--     TABLE  ->  anon          SELECT
--     TABLE  ->  authenticated SELECT
--
-- (No FUNCTION default ACL exists, so this migration does NOT touch function defaults.)
--
-- These default privileges were originally applied by the ad-hoc setup scripts
-- (scripts/create-memareh-articles-first-time.sql, scripts/create-memareh-articles.sql)
-- and are NOT part of any committed migration — they are out of source control.
--
-- This pattern is what caused the sensitive table `memareh.revalidation_secrets`
-- (created outside the committed migrations during the revalidation repair) to
-- inherit client-readable SELECT access for `anon` and `authenticated`, before it was
-- individually hardened by 20260812000000_revoke_revalidation_secrets_access.sql.
--
-- Fix
-- ---
-- Override the FUTURE-TABLE default privileges owned by `postgres` so that any new
-- table created in `memareh` by `postgres` no longer grants SELECT to `anon` or
-- `authenticated` automatically. This is a DEFAULT-PRIVILEGE-only change.
--
-- Scope guardrails (this migration deliberately does NOT):
--   * NOT revoke from any existing table (no REVOKE ... ON memareh.<table>);
--   * NOT use `REVOKE ... ON ALL TABLES` (that would hit existing tables);
--   * NOT change RLS policies;
--   * NOT add any new grants;
--   * NOT alter function default privileges (none exist live);
--   * NOT alter `memareh.revalidation_secrets` or any function;
--   * NOT include any secret literal.
--
-- Why `FOR ROLE postgres`:
--   The live `pg_default_acl.defaclrole` for these entries is `postgres`, so the
--   override must target the same owning role to actually cancel the inherited grant
--   for objects `postgres` will create in the future.
--
-- Idempotency:
--   REVOKE of a privilege that is absent is a no-op, so this migration is safe to
--   re-run and is safe on a fresh database reset where the default ACL may differ.

ALTER DEFAULT PRIVILEGES
  FOR ROLE postgres
  IN SCHEMA memareh
  REVOKE SELECT ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES
  FOR ROLE postgres
  IN SCHEMA memareh
  REVOKE SELECT ON TABLES FROM authenticated;

-- ============================================================================
-- READ-ONLY VERIFICATION 1 (run separately in Supabase SQL Editor; NOT executed
-- by this migration). After applying, this SHOULD RETURN NO ROWS — proving no
-- anon/authenticated SELECT default privilege remains for tables owned by postgres.
-- ============================================================================
--
-- SELECT
--     n.nspname AS schema,
--     r.rolname AS default_owner,
--     CASE d.defaclobjtype
--         WHEN 'r' THEN 'TABLE'
--         ELSE d.defaclobjtype::text
--     END AS object_type,
--     CASE
--         WHEN a.grantee = 0 THEN 'PUBLIC'
--         ELSE a.grantee::regrole::text
--     END AS grantee,
--     a.privilege_type
-- FROM pg_default_acl d
-- JOIN pg_namespace n ON n.oid = d.defaclnamespace
-- JOIN pg_roles r ON r.oid = d.defaclrole
-- CROSS JOIN LATERAL aclexplode(d.defaclacl) a
-- WHERE
--     n.nspname = 'memareh'
--     AND r.rolname = 'postgres'
--     AND d.defaclobjtype = 'r'
--     AND (
--         (a.grantee::regrole::text = 'anon')
--         OR
--         (a.grantee::regrole::text = 'authenticated')
--     );

-- ============================================================================
-- READ-ONLY VERIFICATION 2 (separate; NOT executed by this migration). Proves
-- existing application tables were NOT altered by this default-privilege change.
-- Their current grants should match the pre-migration baseline (RLS-gated access).
-- Capture BEFORE and AFTER applying and diff the two outputs.
-- ============================================================================
--
-- SELECT
--     c.relname AS table_name,
--     (SELECT rolname FROM pg_roles WHERE oid = c.relowner) AS owner,
--     has_table_privilege('anon', c.oid, 'SELECT')           AS anon_select,
--     has_table_privilege('anon', c.oid, 'INSERT')           AS anon_insert,
--     has_table_privilege('anon', c.oid, 'UPDATE')           AS anon_update,
--     has_table_privilege('anon', c.oid, 'DELETE')           AS anon_delete,
--     has_table_privilege('authenticated', c.oid, 'SELECT')  AS authed_select,
--     has_table_privilege('authenticated', c.oid, 'INSERT')  AS authed_insert,
--     has_table_privilege('authenticated', c.oid, 'UPDATE')  AS authed_update,
--     has_table_privilege('authenticated', c.oid, 'DELETE')  AS authed_delete
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'memareh' AND c.relkind = 'r'
-- ORDER BY c.relname;
