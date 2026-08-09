-- =============================================================================
-- Migration: <timestamp>_remove_rls_test_helpers
-- Purpose:    Remove the test-only helper functions from PRODUCTION.
--
-- These functions were deployed to enable claims-based RLS regression tests when
-- no local Supabase instance was available:
--   * public.rls_test_eval  — impersonates an arbitrary auth.uid()/role by
--                             rewriting request.jwt.claims (privilege escalation
--                             primitive if left in prod).
--   * public.rls_test_seed  — SECURITY DEFINER superuser that bypasses RLS to
--                             plant fixtures (unsafe in prod).
--
-- They are NOT part of the application security baseline. They MUST be installed
-- only into local/CI databases (see tests/sql/rls_test_helpers.sql). After the
-- RLS suite runs green against a local stack and no longer depends on the prod
-- copies, apply this migration to remove them from production.
--
-- Signatures below match exactly what is currently deployed (verified live):
--   rls_test_eval(text, jsonb, text, boolean DEFAULT false)  [NOT security definer]
--   rls_test_seed(text)                                     [SECURITY DEFINER]
-- =============================================================================

DROP FUNCTION IF EXISTS public.rls_test_eval(text, jsonb, text, boolean);
DROP FUNCTION IF EXISTS public.rls_test_seed(text);
