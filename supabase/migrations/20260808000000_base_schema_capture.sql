-- =============================================================================
-- Migration: 20260808000000_base_schema_capture
-- Purpose:    Authoritative, version-controlled capture of the EXISTING live
--             application schema (memareh + public.articles) BEFORE the security
--             baseline migration. This recovers migration history so that
--             `supabase db reset` (local/CI/DR) can reconstruct the real database
--             from source control, not from ad-hoc setup scripts.
--
-- Source of truth: live database introspection (2026-08-09). No column/table was
-- invented. This is a capture, not a redesign.
--
-- Ordering (must sort before the security baseline):
--   1. this file               (base schema)
--   2. 20260809000000_security_baseline_rls.sql  (RLS policies + is_admin + SD hardening)
--   3. 20260809010000_remove_rls_test_helpers.sql (test-helper cleanup, PREPARED only)
--
-- Scope decisions (per phase spec):
--   * memareh schema: tables, constraints, FKs, indexes, view, 14 functions,
--     triggers, required grants, RLS ENABLE, storage bucket.
--   * public.articles: captured as a LEGITIMATE application-owned duplicate used by
--     sitemap.ts. NOT dropped, NOT merged.
--   * public.set_author_name(): captured (owned by public.articles trigger).
--   * EXCLUDED (documented in SCHEMA_BASELINE.md):
--       - memareh.services / memareh.service_requests (referenced by TypeScript but
--         DO NOT exist in the live database — not invented here).
--       - public.rls_test_eval / public.rls_test_seed (test-only; removed by the
--         prepared cleanup migration, never part of the app schema).
--       - Supabase-managed internals: auth.users, storage tables, pg_catalog,
--         extension C functions (pg_trgm), vault/net (Supabase provides these).
--   * RLS POLICIES are intentionally NOT recreated here — they live (authoritatively)
--     in the security baseline migration. This file only ENABLEs RLS so the security
--     migration's ALTER ... ENABLE ROW LEVEL SECURITY is idempotent and so a neutral
--     base state exists. No insecure policy is reproduced.
--   * SECURITY DEFINER functions keep search_path = '' exactly as live (already
--     hardened). The security migration re-asserts is_admin + 3 of them identically.
--
-- Safety: no DROP TABLE/COLUMN, no data mutation, no test-helper creation.
-- Bootstrap idempotency uses CREATE SCHEMA IF NOT EXISTS and CREATE ... IF NOT EXISTS
-- plus DROP POLICY IF EXISTS guard in the security migration; this file does NOT
-- swallow errors via EXCEPTION so genuine divergence surfaces on reset.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Extensions required by the application (Supabase-managed, ensure present)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4() (used historically)
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram GIN indexes (search_vector/tags)
-- NOTE: vault + pg_net are Supabase-managed; memareh.notify_article_revalidation()
-- references vault.decrypted_secrets and net.http_post. They are provided by the
-- Supabase platform and must NOT be created here. Supabase provides `vault`.

-- -----------------------------------------------------------------------------
-- 1) Schema
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS memareh;

-- Schema usage grants so anon/authenticated can see memareh objects (Supabase default).
GRANT USAGE ON SCHEMA memareh TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2) Tables (dependency order: profiles & tags before referencing tables)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS memareh.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT ''::text,
  avatar_url   text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memareh.article_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT article_tags_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS memareh.articles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  slug               text,
  excerpt            text,
  content            text,
  featured_image     text,
  featured_image_alt text,
  category           text,
  author_id          uuid REFERENCES memareh.profiles(id) ON DELETE SET NULL,
  author_name        text,
  allow_comments     boolean DEFAULT true,
  status             text NOT NULL DEFAULT 'draft'::text,
  meta_title         text,
  meta_description   text,
  meta_keywords      text[] DEFAULT ARRAY[]::text[],
  canonical_url      text,
  og_image           text,
  reading_time       integer,
  view_count         integer DEFAULT 0,
  is_featured        boolean DEFAULT false,
  video_url          text,
  scheduled_at       timestamptz,
  published_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  search_vector      tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      ((((COALESCE(title, ''::text) || ' '::text) ||
         COALESCE(excerpt, ''::text)) || ' '::text) ||
       COALESCE(content, ''::text)) || ' '::text ||
      COALESCE(category, ''::text))
  ) STORED,
  CONSTRAINT articles_slug_key UNIQUE (slug),
  CONSTRAINT articles_status_check CHECK (
    (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'scheduled'::text]))
  )
);

CREATE TABLE IF NOT EXISTS memareh.article_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id        uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  user_id           uuid,
  parent_id         uuid REFERENCES memareh.article_comments(id) ON DELETE CASCADE,
  content           text NOT NULL,
  status            text NOT NULL DEFAULT 'pending'::text,
  rejection_reason  text,
  approved_by       uuid,
  approved_at       timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  guest_name        text,
  guest_email       text,
  guest_token       uuid,
  CONSTRAINT article_comments_status_check CHECK (
    (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
  ),
  CONSTRAINT article_comments_guest_name_required CHECK (
    ((user_id IS NOT NULL) OR ((user_id IS NULL) AND (guest_name IS NOT NULL) AND (btrim(guest_name) <> ''::text)))
  )
);

CREATE TABLE IF NOT EXISTS memareh.article_ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  rating     integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT article_ratings_article_id_user_id_key UNIQUE (article_id, user_id),
  CONSTRAINT article_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE IF NOT EXISTS memareh.article_tag_relations (
  article_id uuid NOT NULL REFERENCES memareh.articles(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES memareh.article_tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT article_tag_relations_pkey PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS memareh.comment_likes (
  comment_id uuid NOT NULL REFERENCES memareh.article_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (comment_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 3) Indexes (explicit; some overlap with PK/UNIQUE but match live system indexes)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_articles_category        ON memareh.articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_is_featured     ON memareh.articles (is_featured);
CREATE INDEX IF NOT EXISTS idx_articles_published_at    ON memareh.articles (published_at);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled_at    ON memareh.articles (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_articles_status          ON memareh.articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_search_vector   ON memareh.articles USING gin (search_vector);

CREATE INDEX IF NOT EXISTS idx_article_comments_article ON memareh.article_comments (article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent  ON memareh.article_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_status  ON memareh.article_comments (status);
CREATE INDEX IF NOT EXISTS idx_article_comments_user    ON memareh.article_comments (user_id);

CREATE INDEX IF NOT EXISTS idx_article_ratings_article_id ON memareh.article_ratings (article_id);
CREATE INDEX IF NOT EXISTS idx_article_ratings_user_id   ON memareh.article_ratings (user_id);

CREATE INDEX IF NOT EXISTS idx_article_tag_relations_article ON memareh.article_tag_relations (article_id);
CREATE INDEX IF NOT EXISTS idx_article_tag_relations_tag    ON memareh.article_tag_relations (tag_id);

CREATE INDEX IF NOT EXISTS idx_article_tags_name ON memareh.article_tags (name);
CREATE INDEX IF NOT EXISTS idx_article_tags_slug ON memareh.article_tags (slug);

-- -----------------------------------------------------------------------------
-- 4) View
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW memareh.article_tags_view AS
  SELECT a.id AS article_id,
         COALESCE(
           jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
             FILTER (WHERE t.id IS NOT NULL),
           '[]'::jsonb
         ) AS tags
  FROM memareh.articles a
  LEFT JOIN memareh.article_tag_relations atr ON atr.article_id = a.id
  LEFT JOIN memareh.article_tags t ON t.id = atr.tag_id
  GROUP BY a.id;

-- -----------------------------------------------------------------------------
-- 5) Functions (14 application functions, reproduced from live DDL)
--    SECURITY DEFINER + search_path = '' preserved exactly where live has it.
-- -----------------------------------------------------------------------------

-- Trigger: create a profile row when a new auth user is created.
CREATE OR REPLACE FUNCTION memareh.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO memareh.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''));
  RETURN NEW;
END;
$$;

-- Trigger: sync display_name into profile when auth meta changes.
CREATE OR REPLACE FUNCTION memareh.sync_display_name_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'display_name' THEN
    INSERT INTO memareh.profiles (id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: maintain updated_at on articles.
CREATE OR REPLACE FUNCTION memareh.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger: maintain updated_at on comments.
CREATE OR REPLACE FUNCTION memareh.update_comment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger: set published_at when an article transitions to published.
CREATE OR REPLACE FUNCTION memareh.set_published_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: notify revalidation webhook via pg_net + vault (Supabase-managed).
CREATE OR REPLACE FUNCTION memareh.notify_article_revalidation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
  webhook_url text;
  webhook_token text;
  payload jsonb;
begin
  select decrypted_secret into webhook_url
  from vault.decrypted_secrets where name = 'revalidation_url' limit 1;

  select decrypted_secret into webhook_token
  from vault.decrypted_secrets where name = 'revalidation_token' limit 1;

  if webhook_url is null then
    raise warning 'Revalidation URL not found in Vault';
    return coalesce(new, old);
  end if;

  if webhook_token is null then
    raise warning 'Revalidation token not found in Vault';
    return coalesce(new, old);
  end if;

  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    'old_record', case when tg_op = 'INSERT' then null else to_jsonb(old) end
  );

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_token
    ),
    body := payload,
    timeout_milliseconds := 5000
  );

  return coalesce(new, old);
end;
$$;

-- SECURITY DEFINER helpers (already hardened live). Re-asserted by security migration.
CREATE OR REPLACE FUNCTION memareh.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (SELECT raw_app_meta_data ->> 'role'
     FROM auth.users
     WHERE id = auth.uid()
    ), 'false') = 'admin';
$$;

CREATE OR REPLACE FUNCTION memareh.increment_article_view(article_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
SET search_path TO ''
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
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION memareh.check_admin_users(user_ids uuid[])
RETURNS TABLE(user_id uuid, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id AS user_id,
    COALESCE((raw_app_meta_data ->> 'role') = 'admin', false) AS is_admin
  FROM auth.users
  WHERE id = ANY(user_ids);
$$;

-- Non-SECURITY-DEFINER application functions.
CREATE OR REPLACE FUNCTION memareh.search_articles(search_query text)
RETURNS SETOF memareh.articles
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM memareh.articles
  WHERE (status = 'published' OR (status = 'scheduled' AND scheduled_at <= now()))
    AND search_vector @@ plainto_tsquery('simple', search_query)
  ORDER BY ts_rank(search_vector, plainto_tsquery('simple', search_query)) DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION memareh.migrate_tags_to_relations()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  article_rec RECORD;
  tag_name text;
  tag_id uuid;
  migrated_count integer := 0;
BEGIN
  FOR article_rec IN SELECT id, tags FROM memareh.articles WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
  LOOP
    FOREACH tag_name IN ARRAY article_rec.tags
    LOOP
      tag_name := trim(tag_name);
      IF tag_name = '' THEN CONTINUE; END IF;
      INSERT INTO memareh.article_tags (name, slug)
      VALUES (
        tag_name,
        regexp_replace(lower(trim(tag_name)), '[^a-z0-9\u0600-\u06FF\-]', '-', 'g')
      )
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO tag_id;
      INSERT INTO memareh.article_tag_relations (article_id, tag_id)
      VALUES (article_rec.id, tag_id)
      ON CONFLICT DO NOTHING;
      migrated_count := migrated_count + 1;
    END LOOP;
  END LOOP;
  RETURN format('Migrated %s tag relations', migrated_count);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_update_articles_updated_at ON memareh.articles;
CREATE TRIGGER trg_update_articles_updated_at
  BEFORE UPDATE ON memareh.articles
  FOR EACH ROW EXECUTE FUNCTION memareh.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_set_published_at ON memareh.articles;
CREATE TRIGGER trg_set_published_at
  BEFORE UPDATE ON memareh.articles
  FOR EACH ROW EXECUTE FUNCTION memareh.set_published_at();

DROP TRIGGER IF EXISTS trg_revalidate_articles ON memareh.articles;
CREATE TRIGGER trg_revalidate_articles
  AFTER INSERT OR DELETE OR UPDATE ON memareh.articles
  FOR EACH ROW EXECUTE FUNCTION memareh.notify_article_revalidation();

DROP TRIGGER IF EXISTS trg_update_article_comments_updated_at ON memareh.article_comments;
CREATE TRIGGER trg_update_article_comments_updated_at
  BEFORE UPDATE ON memareh.article_comments
  FOR EACH ROW EXECUTE FUNCTION memareh.update_comment_updated_at();

-- -----------------------------------------------------------------------------
-- 7) Required grants on application functions
--    is_admin is granted to anon/authenticated by the security migration.
--    App-callable functions (authenticated sessions) need EXECUTE grants so the
--    API can call them. The two read-only stable functions are also anon-usable
--    for public search. SECURITY DEFINER functions are owner-only by default.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION memareh.increment_article_view(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION memareh.auto_publish_scheduled() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION memareh.calculate_article_rating(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION memareh.check_admin_users(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION memareh.search_articles(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION memareh.is_admin() TO authenticated, anon, service_role;

-- -----------------------------------------------------------------------------
-- 8) Enable RLS on application tables (policies added by security migration).
--    Enabling here establishes a neutral base state; no insecure policy is
--    reproduced. The security migration's ALTER ... ENABLE is idempotent.
-- -----------------------------------------------------------------------------
ALTER TABLE memareh.articles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.article_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.comment_likes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE memareh.profiles              ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9) public.articles (LEGITIMATE application-owned duplicate; used by sitemap.ts)
--    Captured faithfully. NOT dropped / NOT merged.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.articles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  slug               text NOT NULL,
  excerpt            text,
  content            text,
  tags               text[] DEFAULT ARRAY[]::text[],
  featured_image     text,
  author_id          uuid,
  allow_comments     boolean DEFAULT true,
  status             text NOT NULL DEFAULT 'draft'::text,
  meta_title         text,
  meta_description   text,
  meta_keywords      text[] DEFAULT ARRAY[]::text[],
  reading_time       integer,
  published_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  search_vector      tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      (((COALESCE(title, ''::text) || ' '::text) || COALESCE(excerpt, ''::text)) || ' '::text) || COALESCE(content, ''::text))
  ) STORED,
  category           text,
  featured_image_url text,
  author_name        text,
  CONSTRAINT articles_slug_key UNIQUE (slug),
  CONSTRAINT articles_status_check CHECK (
    (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))
  )
);

-- NOTE: public.articles also has a duplicate unique index articles_slug_unique
-- (identical to articles_slug_key) and GIN indexes idx_articles_published_at,
-- idx_articles_search_vector, idx_articles_tags in the live DB. The duplicate
-- unique index is dead weight and is intentionally NOT reproduced in this base
-- capture (it adds no constraint). The functional GIN indexes are reproduced:
CREATE INDEX IF NOT EXISTS idx_articles_published_at  ON public.articles (published_at);
CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON public.articles USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_tags          ON public.articles USING gin (tags);

-- Helper function used by the public.articles trigger (owned by this table).
CREATE OR REPLACE FUNCTION public.set_author_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.author_name IS NULL OR NEW.author_name = '' THEN
    SELECT COALESCE(u.raw_user_meta_data->>'display_name', 'کاربر')
    INTO NEW.author_name
    FROM auth.users u
    WHERE u.id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_author_name ON public.articles;
CREATE TRIGGER trg_set_author_name
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_author_name();

-- Enable RLS on public.articles (policies reproduced below so the table is usable
-- on a fresh reset without depending solely on the security migration's scope).
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Public read of published; authenticated author-scoped insert/update. These match
-- the live pg_policies on public.articles and are REQUIRED for sitemap.ts (service
-- role) to read published rows after a reset. They are security-neutral (public
-- read of published only). NOTE the live status check omits 'scheduled', so
-- scheduled articles are not readable — preserved as-is (no 'scheduled' leak).
DROP POLICY IF EXISTS "Allow anyone to read published articles" ON public.articles;
CREATE POLICY "Allow anyone to read published articles"
  ON public.articles FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Public read published articles" ON public.articles;
CREATE POLICY "Public read published articles"
  ON public.articles FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.articles;
CREATE POLICY "Allow authenticated insert"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated can insert own articles" ON public.articles;
CREATE POLICY "Authenticated can insert own articles"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow author update" ON public.articles;
CREATE POLICY "Allow author update"
  ON public.articles FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update own articles" ON public.articles;
CREATE POLICY "Authors can update own articles"
  ON public.articles FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- -----------------------------------------------------------------------------
-- 10) Storage bucket (capture current live config; no new restrictions)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('article-images', 'article-images', true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- End of base schema capture migration.
-- =============================================================================
