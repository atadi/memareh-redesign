-- =============================================================================
-- Test-only helpers: public.rls_test_eval + public.rls_test_seed
-- =============================================================================
--
-- IMPORTANT: These functions are TEST SCAFFOLDING. They are NOT part of the
-- application security baseline (supabase/migrations/20260809000000_*). They must
-- be installed ONLY into a local / CI test database (via `supabase db reset` +
-- applying this file, or the SQL editor) and MUST be removed from production.
-- See supabase/migrations/ with RemoveRlsTestHelpers naming for the cleanup DDL.
--
-- Why they can't be folded into production migrations:
--   * rls_test_eval impersonates an arbitrary auth.uid()/role by rewriting
--     request.jwt.claims — a privilege-escalation primitive if left in prod.
--   * rls_test_seed is SECURITY DEFINER (superuser) and bypasses RLS to plant
--     fixtures — also unsafe in production.
--
-- Both functions are installed under `public` so the service-role client can
-- reach them regardless of the `memareh` schema USAGE gap.
-- =============================================================================

-- rls_test_eval: impersonates an identity and enforces RLS for the statement.
-- Plain (non-SECURITY DEFINER) so SET LOCAL ROLE is permitted; the impersonated
-- role is constrained by its own RLS. Returns a JSON *text* payload (not jsonb,
-- because an exception in a jsonb-returning function can corrupt the payload).
CREATE OR REPLACE FUNCTION public.rls_test_eval(
  p_role text,
  p_claims jsonb,
  p_sql text,
  p_bypass_rls boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_res text := '{}';
  v_affected int;
  v_count bigint;
  v_stmts text[];
  v_stmt text;
  v_idx int;
  v_is_query boolean;
  v_last int;
BEGIN
  IF NOT p_bypass_rls THEN
    -- Lock the search path for the remainder of the session so the impersonated
    -- role cannot escape via an unqualified object reference.
    PERFORM set_config('search_path', '', false);
    EXECUTE 'SET LOCAL ROLE ' || quote_ident(p_role);
    PERFORM set_config('request.jwt.claims', p_claims::text, true);
  END IF;

  v_stmts := string_to_array(p_sql, ';');
  v_last := 0;
  FOR v_idx IN 1 .. array_length(v_stmts, 1) LOOP
    IF btrim(v_stmts[v_idx]) <> '' THEN v_last := v_idx; END IF;
  END LOOP;

  FOR v_idx IN 1 .. array_length(v_stmts, 1) LOOP
    v_stmt := btrim(v_stmts[v_idx]);
    IF v_stmt = '' THEN CONTINUE; END IF;
    -- Rewrite a leading SELECT count(*) so row counts reflect RLS. A plain
    -- SELECT count(*) always returns exactly one row regardless of filtering.
    IF v_stmt ~* '^\s*select\s+count\s*\(\s*\*\s*\)' THEN
      v_stmt := regexp_replace(v_stmt, '^\s*select\s+count\s*\(\s*\*\s*\)', 'SELECT 1', 'i');
    END IF;
    v_is_query := v_stmt ~* '^\s*(select|with|table|values)\M';
    BEGIN
      IF v_idx = v_last AND v_is_query THEN
        EXECUTE 'SELECT count(*) FROM (' || v_stmt || ') _rls_sub' INTO v_count;
        v_res := json_build_object('ok', true, 'count', v_count)::text;
      ELSE
        EXECUTE v_stmt;
        IF v_idx = v_last THEN
          GET DIAGNOSTICS v_affected = ROW_COUNT;
          v_res := json_build_object('ok', true, 'command', 'DML', 'affected', v_affected)::text;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF v_idx = v_last THEN
        v_res := json_build_object('ok', false, 'error', SQLERRM, 'sqlstate', SQLSTATE)::text;
      END IF;
    END;
  END LOOP;
  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rls_test_eval(text, jsonb, text, boolean) TO service_role;

-- rls_test_seed: seeds fixture rows. SECURITY DEFINER so it runs as the
-- (superuser) owner, which has USAGE on the memareh schema and bypasses RLS —
-- necessary because the test service-role client lacks USAGE on memareh.
--
-- search_path handling: we CANNOT use a static `SET search_path = ''` here,
-- because table triggers fired by these inserts (notably `handle_new_user` on
-- auth.users) execute as the function owner and must resolve `memareh.profiles`
-- and other objects. With an empty search_path those triggers raise
-- "relation does not exist". The safe compromise is to set an EXPLICIT,
-- minimal search path covering exactly the schemas these fixtures touch, and to
-- fully-qualify every identifier in the seeded SQL. We pin the path with
-- set_config (non-local, session-scoped) so triggers inherit it.
CREATE OR REPLACE FUNCTION public.rls_test_seed(p_sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res text := '{}';
  v_affected int;
  v_count bigint;
  v_stmts text[];
  v_stmt text;
  v_idx int;
  v_is_query boolean;
  v_last int;
BEGIN
  -- Explicit, minimal, safe search path. All caller SQL must be fully qualified.
  PERFORM set_config('search_path', 'public, auth, memareh', false);

  v_stmts := string_to_array(p_sql, ';');
  v_last := 0;
  FOR v_idx IN 1 .. array_length(v_stmts, 1) LOOP
    IF btrim(v_stmts[v_idx]) <> '' THEN v_last := v_idx; END IF;
  END LOOP;
  FOR v_idx IN 1 .. array_length(v_stmts, 1) LOOP
    v_stmt := btrim(v_stmts[v_idx]);
    IF v_stmt = '' THEN CONTINUE; END IF;
    v_is_query := v_stmt ~* '^\s*(select|with|table|values)\M';
    BEGIN
      IF v_idx = v_last AND v_is_query THEN
        EXECUTE 'SELECT count(*) FROM (' || v_stmt || ') _s' INTO v_affected;
        v_res := json_build_object('ok', true, 'count', v_affected)::text;
      ELSE
        EXECUTE v_stmt;
        IF v_idx = v_last THEN
          GET DIAGNOSTICS v_affected = ROW_COUNT;
          v_res := json_build_object('ok', true, 'affected', v_affected)::text;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('ok', false, 'error', SQLERRM, 'sqlstate', SQLSTATE)::text;
    END;
  END LOOP;
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.rls_test_seed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_test_seed(text) TO service_role;
