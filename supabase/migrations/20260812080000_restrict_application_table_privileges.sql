-- =============================================================================
-- Migration: 20260812080000_restrict_application_table_privileges
-- Purpose:    Least-privilege hardening of PostgreSQL BASE TABLE privileges for
--             the seven application tables in the `memareh` schema.
--
-- Scope (intentionally limited):
--   * REVOKE-only. No DDL, no RLS changes, no function/trigger changes,
--     no default-privilege changes, no service_role / postgres changes.
--   * RLS remains the row-level authorization mechanism. This migration only
--     removes base-table operations that repository-usage audit proved are
--     unnecessary for each role.
--
-- Privilege model verified against repository callers (src/, tests/):
--   anon paths that WRITE:
--     * article_comments  -> guest comment INSERT (CommentSection.tsx, no session)
--     * (comment_likes anon INSERT preserved: expected model requires it; the
--        only app path is authenticated-gated, but we keep anon INSERT per the
--        model and it is blocked by RLS WITH CHECK anyway.)
--   anon paths that do NOT write:
--     * articles, article_ratings, article_tag_relations, article_tags, profiles
--       -> anon only ever SELECTs (public pages / createPublicClient).
--   authenticated paths that write (kept):
--     * articles  CRUD (author/admin)            -> ArticleEditor/ArticleModeration
--     * article_comments INSERT (auth users)     -> CommentSection
--     * article_ratings upsert/delete            -> ArticleRating (user.id gated)
--     * article_tag_relations CRUD (author/admin)-> ArticleEditor
--     * article_tags INSERT/UPDATE/DELETE        -> ArticleEditor (admin)
--     * comment_likes INSERT/DELETE              -> CommentSection (user.id gated)
--     * profiles INSERT/UPDATE (upsert)          -> profile/page.tsx (user.id)
--       (profile row creation on signup is via SECURITY DEFINER trigger
--        handle_new_user(), NOT anon/authenticated base INSERT.)
--
-- PostgreSQL rule honored: base privilege is checked BEFORE RLS. A valid RLS
-- INSERT/UPDATE/DELETE policy is useless if the role lacks the base privilege.
-- Therefore we PRESERVE every base privilege that any committed RLS policy or
-- app flow requires:
--   * article_comments anon INSERT  -> kept (policy "Anonymous users insert comments")
--   * comment_likes   anon INSERT  -> kept (per expected model)
--   * all authenticated CRUD        -> kept on every table
--   * profiles authenticated DELETE -> revoked (no app flow / RLS policy uses it)
--
-- service_role, postgres, revalidation_secrets, sequences, functions, schema
-- USAGE and default privileges are intentionally untouched.
-- =============================================================================

-- memareh.articles -----------------------------------------------------------
-- anon: SELECT only (public reads). No anon writes in repo.
REVOKE INSERT, UPDATE, DELETE
ON TABLE memareh.articles
FROM anon;

-- memareh.article_comments ---------------------------------------------------
-- anon: SELECT + INSERT (guest comments allowed by RLS policy). No anon UPDATE/DELETE.
REVOKE UPDATE, DELETE
ON TABLE memareh.article_comments
FROM anon;

-- memareh.article_ratings ----------------------------------------------------
-- anon: SELECT only. Writes are authenticated-gated (ArticleRating.tsx).
REVOKE INSERT, UPDATE, DELETE
ON TABLE memareh.article_ratings
FROM anon;

-- memareh.article_tag_relations ----------------------------------------------
-- anon: SELECT only. Management is author/admin (authenticated).
REVOKE INSERT, UPDATE, DELETE
ON TABLE memareh.article_tag_relations
FROM anon;

-- memareh.article_tags -------------------------------------------------------
-- anon: SELECT only. Insert authenticated; UPDATE/DELETE admin.
REVOKE INSERT, UPDATE, DELETE
ON TABLE memareh.article_tags
FROM anon;

-- memareh.comment_likes ------------------------------------------------------
-- anon: SELECT + INSERT (preserved per expected model). No anon UPDATE/DELETE.
REVOKE UPDATE, DELETE
ON TABLE memareh.comment_likes
FROM anon;

-- memareh.profiles -----------------------------------------------------------
-- anon: SELECT only. Creation via SECURITY DEFINER trigger; update is
--      authenticated upsert. No anon writes.
REVOKE INSERT, UPDATE, DELETE
ON TABLE memareh.profiles
FROM anon;

-- authenticated: keep SELECT/INSERT/UPDATE; revoke DELETE (no app flow / policy).
REVOKE DELETE
ON TABLE memareh.profiles
FROM authenticated;
