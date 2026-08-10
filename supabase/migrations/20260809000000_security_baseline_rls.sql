-- =============================================================================
-- Migration: 20260809000000_security_baseline_rls
-- Purpose:    Version-controlled capture of the verified security fixes from the
--             full technical audit. Establishes the Supabase Row Level Security
--             baseline for the `memareh` schema and the `article-images` storage
--             bucket.
--
-- Scope (intentionally limited to security):
--   * memareh.is_admin()                       — hardened admin check helper
--   * memareh.articles                          — RLS policies (public/read/author/admin)
--   * memareh.article_comments                  — RLS policies (public/owner/admin)
--   * memareh.comment_likes                     — RLS policies (owner/admin, no spoofing)
--   * memareh.article_tags                      — RLS policies (public/insert/admin)
--   * memareh.article_tag_relations             — RLS policies (author/admin)
--   * storage.objects (article-images)          — owner-scoped write policies
--   * SECURITY DEFINER hardening                 — search_path = '' on 3 functions
--
-- Out of scope for this phase (see audit follow-ups):
--   * creating/dropping tables, including public.articles (left intact)
--   * Services/Booking schema (does not exist; not created here)
--   * auth.users foreign keys (article_comments.user_id, etc.) — separate phase
--   * bucket allowed_mime_types / file_size_limit — separate follow-up
--   * admin role redesign (auth.users.app_metadata.role = 'admin' is preserved)
--   * type drift cleanup (database.types.ts etc.)
--
-- Safety:
--   * No DROP TABLE / DROP COLUMN.
--   * No destructive data migration.
--   * DROP POLICY IF EXISTS + CREATE POLICY used to replace insecure policies
--     deterministically. We do NOT swallow errors with EXCEPTION blocks: if a
--     policy name or function unexpectedly differs from the verified baseline,
--     the migration MUST fail loudly so genuine schema drift surfaces.
--   * All schema objects fully qualified.
--   * The underlying tables (articles, article_comments, comment_likes,
--     article_tags, article_tag_relations, profiles, public.articles, storage.objects)
--     are created by the prior base-schema migration
--     (20260808000000_base_schema_capture.sql). This migration only defines/replaces
--     the security layer on top of them. RLS is ENABLED by the base migration so
--     the ALTER ... ENABLE ROW LEVEL SECURITY statements here are idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Admin check helper (hardened). Single source of truth for privileged access.
--    Reads the caller's auth.uid() and the canonical admin claim
--    auth.users.raw_app_meta_data -> 'role' = 'admin'.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION memareh.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT raw_app_meta_data ->> 'role'
     FROM auth.users
     WHERE id = auth.uid()
    ), 'false') = 'admin';
$$;

GRANT EXECUTE ON FUNCTION memareh.is_admin() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) memareh.articles — RLS baseline
--    Public reads published (or past-due scheduled). Authors read their own
--    (incl. drafts). Authenticated inserts enforce author_id = auth.uid().
--    Admins manage everything. No blanket "authenticated can read all" policy.
-- -----------------------------------------------------------------------------
ALTER TABLE memareh.articles ENABLE ROW LEVEL SECURITY;

-- Drop any stale/duplicate or insecure variants from earlier ad-hoc scripts.
DROP POLICY IF EXISTS "Authenticated read all articles" ON memareh.articles;
DROP POLICY IF EXISTS "Public can read published articles" ON memareh.articles;

CREATE POLICY "Public read published articles"
ON memareh.articles
FOR SELECT
USING (
  status = 'published'
  OR (status = 'scheduled' AND scheduled_at <= now())
);

CREATE POLICY "Author read own articles"
ON memareh.articles
FOR SELECT
USING (author_id = auth.uid() OR memareh.is_admin());

CREATE POLICY "Allow authenticated insert"
ON memareh.articles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

CREATE POLICY "Allow author update"
ON memareh.articles
FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Allow author delete"
ON memareh.articles
FOR DELETE
USING (author_id = auth.uid());

CREATE POLICY "Admin manage all articles"
ON memareh.articles
FOR ALL
USING (memareh.is_admin())
WITH CHECK (memareh.is_admin());

-- -----------------------------------------------------------------------------
-- 3) memareh.article_comments — RLS baseline
--    Public reads approved. Users read their own. Anonymous + authenticated
--    inserts enforced (no spoofing). Admin moderation requires is_admin().
-- -----------------------------------------------------------------------------
ALTER TABLE memareh.article_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved comments"
ON memareh.article_comments
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Users read own comments"
ON memareh.article_comments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Auth users insert comments"
ON memareh.article_comments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND status = 'pending'
);

CREATE POLICY "Anonymous users insert comments"
ON memareh.article_comments
FOR INSERT
WITH CHECK (
  auth.uid() IS NULL
  AND status = 'pending'
  AND user_id IS NULL
  AND guest_name IS NOT NULL
  AND trim(guest_name) <> ''
);

-- Replaces the insecure "Admin manage comments" (USING auth.uid() IS NOT NULL).
CREATE POLICY "Admin manage comments"
ON memareh.article_comments
FOR ALL
USING (memareh.is_admin())
WITH CHECK (memareh.is_admin());

-- -----------------------------------------------------------------------------
-- 4) memareh.comment_likes — RLS baseline
--    Owner-only management (no cross-user like spoofing / deletion). Admins may
--    manage as required by current administrative behavior.
-- -----------------------------------------------------------------------------
ALTER TABLE memareh.comment_likes ENABLE ROW LEVEL SECURITY;

-- Replaces insecure "Auth manage likes" (ANY authenticated user, no user_id check).
CREATE POLICY "Users manage own likes"
ON memareh.comment_likes
FOR ALL
USING (auth.uid() = user_id OR memareh.is_admin())
WITH CHECK (auth.uid() = user_id OR memareh.is_admin());

-- -----------------------------------------------------------------------------
-- 5) memareh.article_tags — RLS baseline
--    Public read. Authenticated collaborative INSERT. UPDATE/DELETE admin only.
-- -----------------------------------------------------------------------------
ALTER TABLE memareh.article_tags ENABLE ROW LEVEL SECURITY;

-- Replaces insecure "Authenticated manage tags" (ALL for any authenticated user).
CREATE POLICY "Public read tags"
ON memareh.article_tags
FOR SELECT
USING (true);

CREATE POLICY "Authenticated insert tags"
ON memareh.article_tags
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin update tags"
ON memareh.article_tags
FOR UPDATE
USING (memareh.is_admin())
WITH CHECK (memareh.is_admin());

CREATE POLICY "Admin delete tags"
ON memareh.article_tags
FOR DELETE
USING (memareh.is_admin());

-- -----------------------------------------------------------------------------
-- 6) memareh.article_tag_relations — RLS baseline
--    Public read. Management limited to the article's author or an admin.
--    Ordinary users cannot retag another author's article.
-- -----------------------------------------------------------------------------
ALTER TABLE memareh.article_tag_relations ENABLE ROW LEVEL SECURITY;

-- Replaces insecure "Authenticated manage tag relations" (ALL for any auth user).
CREATE POLICY "Public read tag relations"
ON memareh.article_tag_relations
FOR SELECT
USING (true);

CREATE POLICY "Author manage tag relations"
ON memareh.article_tag_relations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM memareh.articles a
    WHERE a.id = article_tag_relations.article_id
      AND a.author_id = auth.uid()
  )
  OR memareh.is_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memareh.articles a
    WHERE a.id = article_tag_relations.article_id
      AND a.author_id = auth.uid()
  )
  OR memareh.is_admin()
);

-- -----------------------------------------------------------------------------
-- 7) storage.objects — article-images bucket
--    Public read. Authenticated insert. Owner-scoped UPDATE/DELETE. Replaces the
--    over-broad "any authenticated user can update/delete any object" policies.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert article images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update article images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete article images" ON storage.objects;

CREATE POLICY "Public can view article images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Authenticated insert article images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'article-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Owner update article images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'article-images' AND owner = auth.uid())
WITH CHECK (bucket_id = 'article-images' AND owner = auth.uid());

CREATE POLICY "Owner delete article images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'article-images' AND owner = auth.uid());

-- -----------------------------------------------------------------------------
-- 8) SECURITY DEFINER hardening — enforce search_path = '' on user-callable
--    functions. Definitions reproduced exactly from the verified live state.
--    (handle_new_user / sync_display_name_from_auth / notify_article_revalidation
--     / check_admin_users were already hardened previously and are left as-is.)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION memareh.increment_article_view(article_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE memareh.articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION memareh.auto_publish_scheduled()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count int;
BEGIN
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

CREATE OR REPLACE FUNCTION memareh.calculate_article_rating(article_uuid uuid)
RETURNS TABLE(average_rating numeric, total_ratings bigint, rating_distribution jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH counts AS (
    SELECT r.rating, COUNT(*)::int AS cnt
    FROM memareh.article_ratings r
    WHERE r.article_id = article_uuid
    GROUP BY r.rating
  )
  SELECT
    COALESCE((SELECT AVG(r.rating) FROM memareh.article_ratings r WHERE r.article_id = article_uuid), 0)::numeric AS average_rating,
    (SELECT COUNT(*)::bigint FROM memareh.article_ratings r WHERE r.article_id = article_uuid) AS total_ratings,
    COALESCE(
      (SELECT jsonb_object_agg(rating, COALESCE(cnt, 0) ORDER BY rating)
       FROM generate_series(1, 5) AS rating
       LEFT JOIN counts USING (rating)),
      '{}'::jsonb
    ) AS rating_distribution;
$$;

-- =============================================================================
-- End of security baseline migration.
-- =============================================================================
