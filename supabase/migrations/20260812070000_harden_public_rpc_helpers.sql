-- Migration: Batch 2 — harden legitimate public RPC helpers.
--
-- Scope (TASK 69/TASK 72 consolidated hardening):
--   1. memareh.check_admin_users(uuid[])    — pin search_path; preserve grants (incl. anon/public).
--   2. memareh.increment_article_view(uuid) — pin search_path; add public-visibility guard to the UPDATE.
--
-- Why only these two:
--   * check_admin_users() has a PUBLIC/anonymous caller (the public article server page
--     renders via createPublicClient()) and an authenticated admin caller, so anon/public
--     EXECUTE MUST remain. Its only gap was an unpinned search_path (null). We pin it to ''
--     and keep the exact result semantics and grants.
--   * increment_article_view() is a legitimate anonymous browser RPC used to count views on
--     the public article page. Because SECURITY DEFINER bypasses RLS, the original body would
--     increment view_count for ANY article id (including draft/future/non-public) if its UUID
--     were known. We restrict the UPDATE to currently-public articles (published, or scheduled
--     and due) so private articles cannot be incremented, while preserving the void contract
--     (a private UUID simply updates zero rows, no error, no disclosure).
--
-- Deliberately does NOT (guardrails):
--   * NOT change is_admin(), calculate_article_rating(), or any previously hardened function.
--   * NOT change signatures, return types, or grants (all roles keep EXECUTE).
--   * NOT add rate limiting/throttling (explicitly out of scope).
--   * NOT change RLS, table grants, or default privileges.
--   * NOT include any secret literal.
--
-- Idempotency: CREATE OR REPLACE is re-runnable; explicit GRANTs re-assert the intended
-- (unchanged) privilege matrix.

-- ---------------------------------------------------------------------------
-- A) check_admin_users: pin search_path TO '', preserve behavior + grants
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION memareh.check_admin_users(user_ids uuid[])
RETURNS TABLE(user_id uuid, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    id AS user_id,
    COALESCE((raw_app_meta_data ->> 'role') = 'admin', false) AS is_admin
  FROM auth.users
  WHERE id = ANY(user_ids);
$function$;

-- Preserve the existing EXECUTE contract (PUBLIC/anon/authenticated/service_role/postgres).
GRANT EXECUTE ON FUNCTION memareh.check_admin_users(uuid[]) TO PUBLIC, anon, authenticated, service_role, postgres;

-- ---------------------------------------------------------------------------
-- B) increment_article_view: pin search_path TO '', restrict to public articles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION memareh.increment_article_view(article_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE memareh.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_uuid
    AND (
      status = 'published'
      OR (
        status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= now()
      )
    );
END;
$function$;

-- Preserve the existing EXECUTE contract (PUBLIC/anon/authenticated/service_role/postgres).
GRANT EXECUTE ON FUNCTION memareh.increment_article_view(uuid) TO PUBLIC, anon, authenticated, service_role, postgres;

-- ============================================================================
-- READ-ONLY VERIFICATION (run separately in Supabase SQL Editor; NOT executed by
-- this migration). Confirms search_path pinning, guard behavior, and grants.
-- ============================================================================
--
-- SELECT p.proname, p.prosecdef AS secdef, p.provolatile AS vol, p.proconfig::text AS search_path,
--        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_x,
--        has_function_privilege('public',p.oid,'EXECUTE') AS public_x
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='memareh' AND p.proname IN ('check_admin_users','increment_article_view');
--
-- -- increment_article_view guard: private UUID updates 0 rows, public increments.
-- -- (Behavior verified via disposable Postgres 16 in the local verification step.)
