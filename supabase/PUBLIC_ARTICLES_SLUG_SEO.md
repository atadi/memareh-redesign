# public.articles — Slug / SEO Analysis

## Slug quality
- Total rows: 26
- Hashed / non-readable slugs: **1** → ` alt-pridn-fivz-brgh`
- Slugs > 100 chars: **2** (max=104 chars)
- Duplicate slugs: 0 (all 26 unique)
- Slugs are transliterated Persian (phonetic), NOT localized — SEO-relevant for Persian query matching but human-unreadable.

## Title / Meta
- Titles > 70 chars: 9 (Google truncates ~70; these will be clipped in SERPs)
- `meta_title` > 60 chars: 13 (recommended ≤ 60)
- `meta_description` > 160 chars: 16 (recommended ≤ 160)
- Rows missing `meta_keywords`: 1
- Rows with `content` < 5k chars: 1 (thin content risk)

## Content depth
- content.len: min=4102, max=50676, median≈9502.
- One outlier row (`j`) has 50,676 chars — a long-form pillar article.

## Recommendation
- Before any consolidation, regenerate slugs as readable Latinized or Persian slugs (the 1 hashed slug ` alt-pridn-fivz-brgh` is an SEO dead-end).
- Trim 13 over-long meta_titles and 16 over-long meta_descriptions to SERP-safe lengths.
- Note: the public site renders `memareh.articles` rows now, so these `public.articles` SEO issues currently have **no live impact** (orphaned table).
