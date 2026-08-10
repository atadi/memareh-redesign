# public.articles — Author / Tag Mapping

## Authors
- Distinct author identities: **1** (all 26 rows share ONE author).
- Author UUID is omitted from this document (production identifier; see gitignored snapshot JSON).
  - name=مدیر سیستم → 26 rows
- Implication: no per-author attribution diversity; `author_id` is non-FK and uniform, so author mapping adds no consolidation complexity.

## Tags
- Distinct tags across 26 rows: **170** (heavy tag sprawl — avg 6.5 distinct tags per row).
- Native `text[]` storage (no normalization, no `article_tags` table for this copy).
- Top 15 tags by frequency:
  - برقکار: 13
  - خرابی تلفن: 12
  - رفع اتصالی برق: 8
  - شبانه روزی: 7
  - عیب یابی: 7
  - برقکاری: 6
  - تهران: 6
  - فوری: 6
  - اعزام برقکار فوری: 5
  - نصب تجهیزات برقی: 5
  - اعزام فوری برقکار: 4
  - نصبیات: 4
  - اعزام سریع برقکار تهران: 3
  - خدمات برقکاری شبانه‌روزی: 3
  - پریدن فیوز برق: 3

- Rows with 0 tags: 1 (`alt-pridn-fivz-brgh` draft).
- Consolidation note: migrating to `memareh.article_tags`/`article_tag_relations` would require collapsing 170 free-text tags into normalized entries (many near-duplicates, e.g. "اعزام برقکار فوری" vs "اعزام فوری برقکار").
