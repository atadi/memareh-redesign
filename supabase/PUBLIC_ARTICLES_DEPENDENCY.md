# public.articles — Dependency Matrix

## Code reference scan (src/**, *.sql, *.ts/tsx)

Every Supabase client in the codebase is constructed with `db: { schema: 'memareh' }`:
- `src/lib/supabase/server-public.ts` → `schema: 'memareh'`
- `src/lib/supabase/server.ts` → `schema: 'memareh'`
- `src/lib/supabase/client.ts` → `schema: 'memareh'`
- `src/lib/supabase/admin.ts` → `schema: 'memareh'`
- `src/app/sitemap.ts` → `createClient(..., { db: { schema: 'memareh' } })`

All `.from('articles')` call sites therefore resolve to **`memareh.articles`**, NOT `public.articles`.

| Call site | Client | Resolves to |
|---|---|---|
| `src/app/sitemap.ts` (generateStaticParams/SEO) | raw supabase-js, schema=memareh | memareh.articles |
| `src/app/articles/page.tsx` | createPublicClient | memareh.articles |
| `src/app/articles/[slug]/page.tsx` | createPublicClient + createSupabaseAdmin | memareh.articles |
| `src/app/page.tsx` | createPublicClient | memareh.articles |
| `src/app/admin/page.tsx` | createClient (anon) | memareh.articles |
| `src/components/admin/ArticleEditor.tsx` | createClient (anon) | memareh.articles |
| `src/app/api/admin/users/*` | createSupabaseAdmin | memareh.articles (no, users) |
| `src/types/database.types.ts` | — | declares `memareh.articles` only (NO `public.articles` type) |

## CONTRADICTION WITH SCHEMA_BASELINE.md
`supabase/SCHEMA_BASELINE.md:70` states: *"Used by: `src/app/sitemap.ts` (queries `from('articles')` with `db.schema='memareh'` → resolves to `public.articles`)."*

**This is factually incorrect.** `schema: 'memareh'` resolves `.from('articles')` to `memareh.articles`. `public.articles` is NOT referenced by any code path. Recommend correcting the baseline doc: `public.articles` has **zero** live code dependents (orphaned table).

## DB-internal dependents (live)
- `public.set_author_name()` trigger (`trg_set_author_name`) is bound ONLY to `public.articles`.
- `public.articles` owns 5 indexes (`articles_pkey`, `articles_slug_key`, `idx_articles_published_at`, `idx_articles_search_vector`, `idx_articles_tags`) and 6 RLS policies — all orphaned if the table is retired.
- No other table FKs to `public.articles` (confirmed: no `REFERENCES public.articles`).
