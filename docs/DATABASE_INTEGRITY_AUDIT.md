# Database / Schema Integrity Audit

Read-only comparison of production DB ↔ `database.types.ts` ↔ application queries ↔ prior baseline.

## Tables in `memareh` (live, 8)
`article_comments`, `article_ratings`, `article_tag_relations`, `article_tags`, `article_tags_view`, `articles`, `comment_likes`, `profiles`.

## Drift findings
### DB-02 / ARCH-01 [P1] — `services` / `service_requests` missing
- `database.types.ts:140,196` declares `memareh.services` and `memareh.service_requests`.
- `src/lib/api/services.ts` queries `.from('services')`.
- Live catalog: these tables DO NOT EXIST in any schema.
- Classification: DB STALE / CODE STALE / INTENT UNCLEAR. Requires a decision + (if kept) a production migration.

### DB-01 [P2] — `articles.slug` nullable but route-critical
- Catalog: `articles.slug` is_nullable = YES; `articles_slug_key` unique index present.
- Live data: 0 null/empty, 0 duplicate (currently safe).
- Risk: a NULL/empty slug would break `generateStaticParams`, sitemap, and routing. Recommend NOT NULL + default/sanitize.

## RLS
- All 7 memareh tables have `relrowsecurity = YES` (DB-03, PASS). Consistent with prior RLS baseline; this phase did not re-derive the full policy matrix.
- `is_admin()` reads `raw_app_meta_data ->> 'role'`; app guards read `app_metadata.role` → same source, no drift (DB-04, INFO).

## Type ↔ query alignment (non-drift)
- Article detail `select("*")` + comment/profile/rating columns match live schema.
- `profiles` columns (id, display_name, avatar_url) match live.
- No application query against a non-existent table other than the `services` case above.

## Recommended next step
Resolve ARCH-01/DB-02 with an explicit decision (create tables+migration, or remove dead types/code). That is the highest-integrity item in this audit.
