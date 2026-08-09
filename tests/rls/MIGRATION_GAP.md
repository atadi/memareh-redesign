# Migration-history gap (blocker for local `supabase db reset`)

The local-stack reproducibility target assumes `supabase db reset` can build the full
schema from `supabase/migrations/`. **This is currently NOT possible** because:

- `supabase/migrations/` contains only the security-baseline migration
  (`20260809000000_security_baseline_rls.sql`).
- There is **no earlier base-schema migration** that creates the `memareh` tables
  (`articles`, `article_comments`, `article_tags`, `article_tag_relations`,
  `comment_likes`, `profiles`, `article_ratings`, `article_tags_view`) or the
  `article-images` storage bucket + its RLS policies.

## Confirmed live objects (read-only inventory)

The live project has these `memareh` tables: `article_comments`, `article_ratings`,
`article_tag_relations`, `article_tags`, `article_tags_view`, `articles`,
`comment_likes`, `profiles`. The `article-images` bucket is `public` with four
storage policies (public SELECT; auth INSERT; owner UPDATE/DELETE).

## Why this matters for the RLS suite

The SQL/Storage regression tests need the application schema to exist locally.
Without a base migration, `supabase start && supabase db reset` cannot reproduce it,
so this phase cannot execute the suite locally in this environment.

## Minimum safe remediation (deferred — out of this phase's scope)

1. Capture the current live DDL as a new base migration
   (`supabase/migrations/00000000000000_base_schema.sql`) using `pg_dump` of the
   `memareh` schema + `storage.buckets`/`storage.objects` definitions (NOT data).
2. Order it BEFORE the security-baseline migration so `db reset` applies
   schema → security policies → test helpers.
3. Add bucket creation to a seed or migration (currently outside migrations).
4. Do NOT fabricate tables from TypeScript types; use real DDL only.

Until that migration exists, the suite is runnable only against a database that
already has the schema (e.g. the live project, gated read-only by
`assertLocalOrTestMode`, or a restored dump). The SQL/Storage *test code* in this
phase is complete and correct; only the base schema history is missing.
