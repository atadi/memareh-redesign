# Diagnosis: Publish-to-Public Article Delay / Stale Cache

Phase: Diagnose Publish-to-Public Article Delay. Read-only diagnosis, no cache/revalidation changes.

## A. Starting HEAD
3516657 (master, origin/master) — clean working tree.

## B. Admin save/publish code path
- `src/app/admin/articles/page.tsx` -> `<ArticleModeration/>`
- `src/components/admin/ArticleModeration.tsx`
  - `onSave={() => { loadArticles(); loadStats(); setActiveTab("list") }}`  (lines 476-480)
  - quick publish toggle `togglePublishStatus` (lines 123-135) — does NOT call revalidation
- `src/components/admin/ArticleEditor.tsx`
  - `onSubmitForm` writes via browser supabase client `createClient()` (line 82, `@/lib/supabase/client`)
  - DB write: `supabase.from("articles").update(articleData)` (line 557) / `.insert` (line 563)
  - After write: `onSave()` then `revalidateArticle(data.slug).catch(() => {})` (lines 602-603)

## C. Public article read path
- `src/app/articles/[slug]/page.tsx` — server component, `createPublicClient()` (anon), `.from("articles").select("*")` (lines 67-72), rendered by `<ArticleContent>`.
- `src/app/articles/page.tsx` — list, `revalidate = 300`.
- `src/app/page.tsx` — homepage `LatestArticles`, `revalidate = 300`.
- `src/app/sitemap.ts` — dynamic, reads live `getPublishedArticlesForSitemap()` (no revalidate export).
- `src/lib/articles.ts` — `getPublishedArticleSlugs` (generateStaticParams), `getPublishedArticlesForSitemap` (sitemap).

## D. Current rendering/cache mode
- Article detail `/articles/[slug]`: **ISR** (`export const revalidate = 300` at line 14) + `generateStaticParams` (build-time prerender of all 25 slugs) + `dynamicParams` default true.
- `/articles` list: **ISR** (`revalidate = 300`, line 6).
- `/` homepage: **ISR** (`revalidate = 300`, line 9).
- `sitemap.ts`: dynamic, no static revalidate; regenerated per request.
- No `unstable_cache`, no `cache()`, no `fetch(next:{revalidate})` overrides; route-level `revalidate` governs all fetches.

## E. Exact configured revalidation interval
300 seconds (5 minutes) on article detail, list, and homepage.

## F. Expected publish-to-public delay
- DESIGN INTENT: near-immediate via on-demand `revalidatePath` on publish.
- ACTUAL MAXIMUM WITHOUT SUCCESSFUL REVALIDATION: **up to 300 seconds (5 minutes)**, until the next ISR regeneration, OR until the next Vercel deploy (which rebuilds and regenerates all static params).
- Per surface:
  - article detail: up to 300s if revalidation fails; seconds if revalidation succeeds.
  - articles list: up to 300s (same ISR).
  - homepage: up to 300s (same ISR).
  - sitemap: regenerated per request (not stale).
  - metadata/canonical: part of the route; follows the same ISR window as the page.

## G. Why admin sees new content immediately
`ArticleEditor` reads/writes via the **browser** supabase client (`@/lib/supabase/client`), directly from Supabase, client-side. It never goes through the Next.js route cache / Full Route Cache. After save, `loadArticles()` re-fetches live. So admin reflects the DB write instantly. Public pages are served by the Next.js Full Route Cache (ISR), which is a separate, cached layer.

## H. DB vs public HTML comparison (read-only)
Live response headers observed:
- Article detail: `Cache-Control: public, max-age=0, must-revalidate`, `X-Vercel-Cache: REVALIDATED`, `Age: 2`.
  - The `REVALIDATED` state reflects the most recent Vercel deploy (which regenerated static params after the bulk optimization write), NOT a publish-triggered revalidation. With `max-age=0, must-revalidate` the CDN revalidates each request once the route cache entry is purged.
- `/articles`: `Cache-Control: private, no-cache, no-store, max-age=0`, `X-Vercel-Cache: MISS` — effectively not cached at CDN; fresh per request.
Conclusion: the serving layer for detail pages is ISR; the only freshness trigger observed is the deploy. A controlled publish test (see Q) would isolate the publish-time revalidation gap.

## I. Production response/cache headers
See H. No `stale-while-revalidate` token; detail uses `must-revalidate`. CDN `X-Vercel-Cache: REVALIDATED` = cache entry purged and regenerated on last request. `Age` = seconds since that regeneration.

## J. Relevant Next/Vercel cache layers (for this problem)
- Request memoization: NOT RELEVANT (only within a single render).
- Data Cache (fetch): POSSIBLY RELEVANT — supabase fetches have no per-fetch revalidate, so they inherit the route `revalidate=300`. `revalidatePath` purges it.
- Full Route Cache (ISR): RELEVANT — this is the layer that serves stale content for up to 300s.
- Router Cache (client): POSSIBLY RELEVANT for the admin/back-button, but public staleness is server Full Route Cache.
- Vercel CDN/edge cache: RELEVANT — `X-Vercel-Cache` shows it; `max-age=0, must-revalidate` means CDN revalidates against origin after the route entry is purged.
- Browser cache: NOT RELEVANT (operator uses Incognito / fresh request).

## K. Whether on-demand invalidation currently exists
YES — it exists but is unreliable:
- `src/actions/revalidate.ts` `revalidateArticle(slug)`: calls `revalidatePath("/")`, `revalidatePath("/articles")`, `revalidatePath("/articles/"+slug)` (lines 14-16). Also `revalidateAllArticles()`.
- `src/app/api/revalidate/route.ts`: POST endpoint (Bearer `REVALIDATION_TOKEN`) that purges `/articles/${slug}`, `/articles`, `/`. Not currently called by the admin save path.
- Invocation: `ArticleEditor.tsx:603` `revalidateArticle(data.slug).catch(() => {})`.

## L. Exact root cause
1. ORDERING / UNMOUNT RACE: In `ArticleEditor.onSubmitForm`, `revalidateArticle(slug)` is called on line 603 — AFTER `onSave()` on line 602. `onSave` (ArticleModeration.tsx:476-480) calls `setActiveTab("list")`, which **unmounts `<ArticleEditor>`**. The server action `revalidateArticle` is initiated from a component that is being torn down; the in-flight Server Action request can be cancelled/aborted by React/Next when the caller unmounts. If it is cancelled, the cache is never purged.
2. SILENT FAILURE: `.catch(() => {})` on line 603 swallows ANY error — auth/role check failure, network error, cancellation, or unexpected exception. A failed invalidation is invisible; the operator only sees the stale page.
3. FALLBACK TO ISR WINDOW: when revalidation does not complete, the article detail/list/homepage pages serve their cached Full Route Cache entry for up to `revalidate = 300` seconds, then auto-regenerate (or regenerate on next deploy). This is exactly the observed "shows previous content for some period."
4. SECONDARY GAP: `togglePublishStatus` (quick publish/draft toggle in the list) does NOT call `revalidateArticle` at all — it relies purely on the 300s ISR window.

The role/auth check itself is NOT the defect: the app consistently uses `app_metadata.role === 'admin'` (auth-role.ts, login, register, admin layout, revalidate.ts), so a genuine admin passes.

## M. Recommended minimal fix (NOT yet implemented)
Make revalidation reliable and observable, while keeping ISR performance:
1. Reorder: call `await revalidateArticle(slug)` and AWAIT it BEFORE `onSave()` (which unmounts the editor), so the Server Action completes while the component is mounted.
2. Stop swallowing errors: replace `.catch(() => {})` with a visible failure (e.g. `revalidateArticle(slug).catch((e) => console.error("revalidate failed", e))`) so a real failure is diagnosable.
3. Cover the toggle: have `togglePublishStatus` (and delete) also call `revalidateArticle(article.slug)` (or `revalidateAllArticles()`) on success.
4. (Optional, more robust) Trigger revalidation server-side in the data-mutation path instead of from the client component lifecycle, e.g. a Server Action that does the DB update + `revalidatePath` together, so unmount cannot cancel it.
No change to `revalidate = 300`, no `force-dynamic`, no `no-store` — ISR performance is preserved; we only fix the on-demand purge trigger.

Affected paths/tags: `/articles/[slug]`, `/articles`, `/` (and `/sitemap.xml` only if publish status/slug changes — currently sitemap is dynamic so not required).

## N. Was code changed?
No. Diagnosis only. No production DB writes for testing (count = 0).

## O. Tests/build
Not applicable (no code change). If implemented: add tests for article detail invalidation, list invalidation, homepage invalidation; run `npx tsc --noEmit`, `pnpm test:unit`, `pnpm run build`, `pnpm check:articles-soak`.

## P. Production DB writes made for testing
0 (read-only diagnosis; no edit performed).

## Q. Operator verification steps (to confirm empirically)
1. Pick a harmless article; note a word in its content.
2. In admin, edit that word and Publish. Note timestamp T0.
3. Confirm admin shows the new word (instant) and DB `updated_at` advanced.
4. Open the public article in Incognito. Record first time the new word appears = T1.
5. Compute propagation = T1 - T0.
6. Inspect headers (`curl -I https://www.memareh.com/articles/<slug>`): look for `X-Vercel-Cache: REVALIDATED` (good) vs `HIT` with `Age` near 300 (stale).
7. Confirm no Vercel deploy occurred between T0 and T1.
Expected after fix: REVALIDATED within seconds, propagation < ~10s. Before fix: up to 300s or until next deploy.

## R. Final answer (one line)
"Current publish propagation should take approximately up to 300 seconds (5 minutes) because the public article/list/home pages are ISR-cached with revalidate = 300, and on-demand revalidatePath on publish is unreliable (called after the editor unmounts and its failure is silently swallowed), so the stale Full Route Cache only refreshes on the next ISR cycle or next deploy."

---

# FIX: Reliable On-Demand Invalidation After Admin Mutations

Fix commit: `fix(articles): invalidate public cache after admin mutations`.
Starting HEAD before fix: 3516657.

## Fix architecture (corrected per operator guidance)
The PROVEN defect was: DB mutation and cache invalidation are separate; invalidation failure was
swallowed (`.catch(() => {})`); several mutation paths (publish/unpublish toggle, delete) never
invalidated at all. The "editor unmount cancels the Server Action" was treated as a plausible race,
NOT a framework guarantee — so the fix does not depend on that assumption.

Chosen boundary (pragmatic, low-risk):
- The article DB write stays client-side in `ArticleEditor` because it also uploads images to
  storage and syncs tags; moving the whole upsert server-side would duplicate/risk that logic.
- The cache-invalidation half is centralized in a single Server Action
  `src/actions/revalidate.ts → invalidateArticlePaths({ slug, oldSlug })`.
- Every mutation workflow AWAITS this action immediately after the DB write succeeds and BEFORE
  `onSave()` (which unmounts the editor). Invalidating-before-unmount removes reliance on any
  unmount-ordering behavior.
- Authorization is enforced SERVER-SIDE via the canonical `assertIsAdmin()` (src/lib/admin/guard.ts,
  `server-only`) — never client state. No service-role/privileged key is used or exposed; the
  publishable (anon) key + admin session cookie is sufficient (RLS permits the admin update).

## Server Function vs Route Handler (Next.js semantics)
`invalidateArticlePaths` is a Server Action (`'use server'`). `revalidatePath` called from a Server
Action invalidates the Full Route Cache / Data Cache for the given path, which is exactly what we
need. (A Route Handler POST would also work, but the Server Action is the correct boundary here
because it runs within the authenticated admin request and reuses `assertIsAdmin`.) This distinction
matters: `revalidatePath` is a build/runtime cache primitive regardless of caller, but it must run in
a server context that has the route's render scope — both Server Actions and Route Handlers qualify;
calling it from a bare client component (without the server boundary) is what was broken before.

## Paths invalidated per mutation
- save existing article: `/articles/${slug}`, `/articles`, `/`
- create published article: `/articles/${slug}`, `/articles`, `/` (slug already final)
- slug change: `/articles/${oldSlug}` (purged), `/articles/${slug}` (new), `/articles`, `/`
- publish/unpublish toggle: `/articles/${slug}`, `/articles`, `/`
- delete: `/articles/${slug}`, `/articles`, `/`
- sitemap: NOT invalidated (dynamic/live; regenerated per request)

## Failure semantics
`invalidateArticlePaths` returns `{ ok, error?, invalidated[] }`. The caller surfaces
`ok === false` to the admin via an explicit toast ("article saved, but public cache refresh
failed") + console.error. The DB write is NEVER retried on invalidation failure (no duplicate
mutation). I.e. the editor can report mutationSucceeded=true / revalidationSucceeded=false.

## Files changed
- `src/actions/revalidate.ts` — robust `invalidateArticlePaths` (+ back-compat `revalidateArticle`,
  `revalidateAllArticles` wrappers, none swallow errors).
- `src/components/admin/ArticleEditor.tsx` — await invalidation before onSave; surface failure.
- `src/components/admin/ArticleModeration.tsx` — `togglePublishStatus` and `handleDelete` now await
  invalidation and surface failure; `handleDelete` takes the article object (needs slug).
- `tests/article-invalidation.test.ts` — 8 contract tests (path sets + auth gating + failure surfaced).

## ISR retained
`export const revalidate = 300` is UNCHANGED on /articles/[slug], /articles, /. The 5-minute ISR
window remains a resilience fallback; on-demand invalidation now provides normal near-immediate
publishing. No force-dynamic / no-store / revalidate=0.

## Expected propagation after fix
Normally on the next public request / within seconds of a successful admin save (once the awaited
`revalidatePath` purges the route), without waiting for the 300s ISR fallback and without a redeploy.

