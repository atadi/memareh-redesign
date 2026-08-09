# Security Follow-up Audit

Static / read-only only. No penetration tests, no production mutation.

## XSS / HTML rendering
- **SEC-01 [P2]** `src/app/articles/[slug]/page.tsx:217` renders `article.content` via `dangerouslySetInnerHTML` WITHOUT `DOMPurify`. The `ArticleContent` component and `ArticleEditor` DO sanitize; `ArticleEditor.tsx:499` saves `DOMPurify.sanitize(content)` at write time. Public render therefore trusts stored HTML. Safe only if every write path sanitizes. Defense-in-depth gap — recommend rendering via the already-sanitizing `ArticleContent` component, or adding a render-time sanitize + test.
- Comment content rendered through `CommentSection` — not reviewed for sanitization in this pass; flag for follow-up if comments allow HTML.

## Security headers
- **SEC-02 [P2]** `next.config.ts` defines no `headers()`: no CSP, no `X-Frame-Options`/frameguard, no explicit HSTS. Given `dangerouslySetInnerHTML` usage, a CSP materially reduces XSS blast radius. (Vercel adds HSTS at edge by default, but no app-level policy.)

## API / authorization
- **SEC-03 [INFO/PASS]** `/api/revalidate` requires `Bearer ${REVALIDATION_TOKEN}` (401 otherwise). Good.
- Admin API routes call `assertIsAdmin()` before privileged reads. `assertIsAdmin` checks `app_metadata.role === 'admin'` from `auth.getUser()` (server-verified), not client-supplied. Strong.
- **SEC-04 [INFO]** `is_admin()` (SQL) reads `raw_app_meta_data`; app guards read `app_metadata`. Same source → consistent. Client `updateUser({data})` only touches `user_metadata`, not `raw_app_meta_data`, so self-escalation via anon client is not possible. Low risk.

## Secrets / env
- Service-role key used in `sitemap.ts` at build (see PERF-02) — over-privileged for public data.
- No secrets found committed; `.env*` gitignored. `graphify-out/` committed but contains no secrets (ARCH-02).
- `NEXT_PUBLIC_*` vars are client-exposed by design (URL/anon key) — expected.

## Other
- No `SQL injection` surface observed (all queries use Supabase query builder, parameterized).
- No open redirect / SSRF observed in reviewed routes.
- Upload validation (`lib/uploadImage.ts`) not deeply reviewed — recommend a follow-up on MIME/size/filename safety (out of scope this pass).

## Recommendations (no change this phase)
1. Sanitize at render on the public article page (SEC-01).
2. Add CSP + frameguard + HSTS in `next.config.ts` (SEC-02).
3. Replace service-role in sitemap with public client (PERF-02).
4. Schedule a focused comment-sanitization + upload-validation review.
