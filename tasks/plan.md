# Plan: SEO hardening (approved from audit)

## Spec summary
Close crawl/index gaps: article H1, unique metadata, noindex on private routes, canonicals from `getSiteUrl()`, contact URL, NAP consistency, sitemap/JSON-LD.

## Order
1. Pure SEO builders + tests (`src/lib/seo.ts`, `src/lib/site.ts`)
2. Wire pages/layouts (article H1, /articles, auth, admin, contact, home, sitemap, robots)
3. NAP + contact page + HowItWorks copy
4. Editor canonical + image alts + homepage services section
5. Verify with `pnpm test:unit` / `pnpm test`

## Out of scope
- Google Search Console verification code (needs operator token)
- New per-service landing URLs (ServiceCategories on home only)
