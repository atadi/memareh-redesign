-- Migration: enforce database-side admin authorization on auto_publish_scheduled().
--
-- Context / problem
-- -----------------
-- `memareh.auto_publish_scheduled()` is SECURITY DEFINER (owner postgres) and mass-
-- publishes every due scheduled article:
--
--     UPDATE memareh.articles
--     SET status = 'published', published_at = COALESCE(published_at, now())
--     WHERE status = 'scheduled'
--       AND scheduled_at <= now()
--       AND scheduled_at IS NOT NULL;
--
-- Proven live facts:
--   * SECURITY DEFINER = true, owner = postgres, search_path = '' (correctly hardened).
--   * PUBLIC (built-in default), anon, authenticated, and service_role all hold EXECUTE.
--   * The function body contains NO admin check.
--   * The only repository caller is a client-side admin UI RPC
--     (src/components/admin/ArticleModeration.tsx:78  ->  supabase.rpc("auto_publish_scheduled")).
--     The /admin surface is gated only by a client-side isAdminUser() redirect
--     (src/app/admin/layout.tsx), which is presentation logic, NOT database authorization.
--     A caller can invoke the RPC directly over PostgREST and mass-publish articles
--     regardless of admin status. (No pg_cron job or trigger references the function.)
--
-- Fix
-- ---
-- Keep the function name / signature / return type / SECURITY DEFINER / search_path,
-- and add the admin authorization check INSIDE the function (server/database-side),
-- before the UPDATE. Then revoke direct EXECUTE from PUBLIC and anon so anonymous
-- callers cannot invoke it at all. authenticated (legitimate admin UI) and service_role
-- (future server-side scheduling) keep EXECUTE; the function itself now distinguishes
-- admin from ordinary authenticated users via memareh.is_admin().
--
-- Scope guardrails (deliberately does NOT):
--   * NOT move the RPC to a Server Action (separate task).
--   * NOT change the React caller (it already ignores the RPC result/error; an
--     unauthorized 42501 error is safely swallowed — no client change required).
--   * NOT redesign scheduling.
--   * NOT touch any other function, table, policy, or grant.
--   * NOT include any secret literal.
--   * NOT mutate article rows during execution (the UPDATE only runs for authorized admins);
--     the deployment-time run finds 0 due scheduled articles, so no rows change.
--
-- Idempotency:
--   CREATE OR REPLACE FUNCTION preserves the existing ACL; REVOKE of an absent privilege
--   is a no-op; GRANT is idempotent. Safe to re-run and on a fresh DB reset.

CREATE OR REPLACE FUNCTION memareh.auto_publish_scheduled()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  updated_count int;
BEGIN
  -- Server-side admin authorization. memareh.is_admin() reads the caller's
  -- auth.uid() and the canonical admin claim (auth.users.raw_app_meta_data.role).
  -- Under SECURITY DEFINER with search_path = '' this is resolved via the fully
  -- qualified call memareh.is_admin(), exactly as the RLS policies do.
  IF NOT memareh.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '42501';
  END IF;

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

-- Remove anonymous / public access. The built-in PUBLIC EXECUTE default and the
-- ad-hoc anon grant (from GRANT EXECUTE ON ALL FUNCTIONS TO anon) are revoked.
REVOKE EXECUTE ON FUNCTION memareh.auto_publish_scheduled() FROM PUBLIC, anon;

-- Re-assert the legitimate callers. authenticated = admin UI; service_role = future
-- server-side scheduling. postgres (owner) always retains EXECUTE implicitly.
GRANT EXECUTE ON FUNCTION memareh.auto_publish_scheduled() TO authenticated, service_role;

-- ============================================================================
-- READ-ONLY VERIFICATION (run separately in Supabase SQL Editor; NOT executed by
-- this migration). Confirms the ACL is reduced and the function is SECURITY DEFINER.
-- ============================================================================
--
-- SELECT
--     p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature,
--     p.prosecdef                                                   AS security_definer,
--     (SELECT rolname FROM pg_roles WHERE oid = p.proowner)         AS owner,
--     p.proacl::text                                                AS acl,
--     has_function_privilege('anon',          p.oid, 'EXECUTE')     AS anon_execute,
--     has_function_privilege('authenticated', p.oid, 'EXECUTE')     AS authenticated_execute,
--     has_function_privilege('service_role',  p.oid, 'EXECUTE')     AS service_role_execute,
--     has_function_privilege('public',        p.oid, 'EXECUTE')     AS public_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'memareh' AND p.proname = 'auto_publish_scheduled';
