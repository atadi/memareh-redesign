-- Migration: revoke direct/client EXECUTE from internal trigger helpers and the
--            dead/legacy search_articles() RPC, leaving only postgres (owner) able to
--            run them directly.
--
-- Scope (Batch 1 of the consolidated function hardening, TASK 67/TASK 69):
--   1. memareh.set_published_at()              -- trigger-only (trg_set_published_at)
--   2. memareh.update_comment_updated_at()     -- trigger-only (trg_update_article_comments_updated_at)
--   3. memareh.update_updated_at_column()      -- trigger-only (trg_update_articles_updated_at)
--   4. memareh.search_articles(text)           -- dead/legacy RPC (no repository caller found)
--
-- Why this is safe (proven in prior trigger-function tasks and in this migration's
-- disposable-Postgres verification):
--   * PostgreSQL does NOT require the session role to hold EXECUTE on a trigger
--     function for an already-installed trigger to fire. The trigger runs under the
--     function's owner (postgres) context. Removing PUBLIC/anon/authenticated/
--     service_role EXECUTE therefore does NOT stop the three triggers from firing on
--     ordinary table UPDATEs.
--   * search_articles(text) has no browser/server/API/script caller anywhere in the
--     repo (only docs + generated database.types.ts + ad-hoc scripts). Revoking its
--     runtime EXECUTE only removes unused attack surface.
--
-- Deliberately does NOT (guardrails):
--   * NOT modify any function body / signature.
--   * NOT CREATE OR REPLACE / DROP / ALTER any trigger.
--   * NOT drop/recreate any function.
--   * NOT alter table privileges, RLS, or default privileges.
--   * NOT touch already-hardened functions (auto_publish_scheduled,
--     handle_new_user, sync_display_name_from_auth, migrate_tags_to_relations,
--     notify_article_revalidation) or is_admin()/increment_article_view()/
--     calculate_article_rating()/check_admin_users() (handled in later batches).
--   * NOT include any secret literal.
--
-- Idempotency: each REVOKE of an already-absent privilege is a no-op; safe to re-run.

REVOKE EXECUTE
ON FUNCTION memareh.set_published_at()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE
ON FUNCTION memareh.update_comment_updated_at()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE
ON FUNCTION memareh.update_updated_at_column()
FROM PUBLIC, anon, authenticated, service_role;

REVOKE EXECUTE
ON FUNCTION memareh.search_articles(text)
FROM PUBLIC, anon, authenticated, service_role;

-- ============================================================================
-- READ-ONLY VERIFICATION (run separately in Supabase SQL Editor; NOT executed by
-- this migration). Confirms the ACL is reduced and the triggers still fire.
-- ============================================================================
--
-- SELECT
--     p.proname,
--     has_function_privilege('public',       p.oid,'EXECUTE') AS public_x,
--     has_function_privilege('anon',         p.oid,'EXECUTE') AS anon_x,
--     has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_x,
--     has_function_privilege('service_role', p.oid,'EXECUTE') AS svc_x,
--     has_function_privilege('postgres',     p.oid,'EXECUTE') AS postgres_x
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'memareh'
--   AND p.proname IN ('set_published_at','update_comment_updated_at',
--                     'update_updated_at_column','search_articles');
--
-- -- Triggers intact:
-- SELECT tgname, pg_get_triggerdef(oid) AS def FROM pg_trigger
-- WHERE tgname IN ('trg_set_published_at','trg_update_article_comments_updated_at','trg_update_articles_updated_at')
--   AND NOT tgisinternal;
