# SEO Audit

Canonical dataset: `memareh.articles` (25 published, 0 drafts/scheduled — verified read-only).
Overall classification: **PARTIAL** (solid per-article fundamentals; cross-cutting gaps).

## What is healthy
- All 25 articles `published`; 0 null/empty slugs; 0 duplicate slugs.
- Article detail pages emit `title`, `description` (excerpt), canonical, OpenGraph (article), Twitter card, and Article JSON-LD.
- `lang="fa"`, `dir="rtl"` correct for Persian; `locale: "fa_IR"` in OG.
- `robots.ts` disallows `/admin`,`/api`,`/login`; references sitemap.
- Sitemap covers all 25 published articles + home (no orphan/stale entries; DB=25, sitemap=25).
- No hreflang needed (single language).

## Findings (detail in MASTER_AUDIT_FINDINGS.md)
- **SEO-01 [P2]** Canonical domain inconsistency: `layout.tsx` metadataBase = `https://memareh.com`; article page `siteUrl` = `https://www.memareh.com`; sitemap/robots = `https://memareh.com`. Article canonical/OG/JSON-LD use www, others do not → potential duplicate-host split.
- **SEO-02 [P3]** robots disallows `/login`; app links use `/login`. Confirm no indexable content there (low risk).
- **SEO-03 [P3]** Sitemap minimal: no tag/category/pagination URLs; root `lastModified: new Date()` (non-stable). Acceptable until those routes exist.
- **SEO-04 [P2]** Structured data only `Article`. Missing `Organization`, `WebSite`/`SearchAction`, `BreadcrumbList` across the site.
- **SEO-05 [P2]** Columns `meta_title`, `meta_description`, `meta_keywords`, `canonical_url`, `og_image` exist but `generateMetadata` never reads them — either dead schema or unused per-article SEO control.

## Data-quality scan (canonical articles, read-only)
- Null/empty slug: 0
- Duplicate slug: 0
- Missing title: 0 (title NOT NULL)
- Scheduled/draft indexed: none in DB
- Missing featured_image: not counted (fallback cover used)
- Tag/category pages: pages do NOT yet exist, so no sitemap/tag-SEO coverage yet.

## Recommendations (no code change this phase)
1. Centralize one `SITE_URL` (decide www-vs-non-www) and use everywhere (SEO-01).
2. Wire `meta_title`/`meta_description`/`meta_keywords`/`canonical_url`/`og_image` with fallback (SEO-05).
3. Add Organization + WebSite + BreadcrumbList JSON-LD (SEO-04).
4. When tag/category routes ship, add them to sitemap + metadata (SEO-03).
