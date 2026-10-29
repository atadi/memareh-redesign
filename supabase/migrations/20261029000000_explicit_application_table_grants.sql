-- =============================================================================
-- Migration: 20261029000000_explicit_application_table_grants
-- Purpose:    Establish the application table privileges explicitly for fresh
--             Supabase databases. These grants do not rely on platform defaults.
--
-- Scope:
--   * Table and schema grants only.
--   * No RLS, function, trigger, secret-table, or default-privilege changes.
--   * Specific grants only; no blanket ALL TABLES grant.
-- =============================================================================

-- Schema access required for Data API roles.
GRANT USAGE ON SCHEMA memareh
TO anon, authenticated, service_role;

-- ============================================================================
-- anon
-- ============================================================================

GRANT SELECT
ON TABLE memareh.articles
TO anon;

GRANT SELECT, INSERT
ON TABLE memareh.article_comments
TO anon;

GRANT SELECT
ON TABLE memareh.article_ratings
TO anon;

GRANT SELECT
ON TABLE memareh.article_tag_relations
TO anon;

GRANT SELECT
ON TABLE memareh.article_tags
TO anon;

GRANT SELECT, INSERT
ON TABLE memareh.comment_likes
TO anon;

GRANT SELECT
ON TABLE memareh.profiles
TO anon;

-- ============================================================================
-- authenticated
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.articles
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_comments
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_ratings
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_tag_relations
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_tags
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.comment_likes
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON TABLE memareh.profiles
TO authenticated;

-- ============================================================================
-- service_role
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.articles
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_comments
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_ratings
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_tag_relations
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.article_tags
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.comment_likes
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE memareh.profiles
TO service_role;
