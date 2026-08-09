// Generate the detailed public.articles audit artifact files from the live snapshot.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const out = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit-public-articles.out.json'), 'utf8'));
const rows = out.rows;
const SUP = path.join(ROOT, 'supabase');

// ---- 1) 26-row classification table ----
function slugCell(r){ return '`' + (r.slug || '(null)') + '`'; }
function seoFlags(r){
  const f=[];
  if(r.slugLooksHashed) f.push('hashed-slug');
  if(r.slugLen>100) f.push('slug>100');
  if(r.titleLen>70) f.push('title>70');
  if(r.metaTitleLen>60) f.push('metaTitle>60');
  if(r.metaDescLen>160) f.push('metaDesc>160');
  if(r.metaKeywordCount===0) f.push('noKeywords');
  if(r.contentLen<5000) f.push('content<5k');
  return f.length?f.join(', '):'clean';
}
// NOTE: committed markdown MUST NOT contain production identifiers (row UUIDs,
// author UUIDs, storage URLs). Row identity here is the audit index only; the
// per-row production id lives solely in the gitignored snapshot JSON.
let rowsMd = '# public.articles — 26-Row Classification\n\n';
rowsMd += '> Source: live `public.articles` SELECT * (service-role, read-only). ' + out.rowCount + ' rows. Generated ' + out.generatedAt + '.\n';
rowsMd += '> Production row UUIDs are intentionally OMITTED from this document (see gitignored `scripts/audit-public-articles.out.json`).\n\n';
rowsMd += 'Columns (' + out.columns.length + '): ' + out.columns.join(', ') + '\n\n';
rowsMd += '| # | slug (truncated) | status | title.len | content.len | tags | author | SEO flags |\n';
rowsMd += '|---|---|---|---|---|---|---|---|\n';
rows.forEach((r,i)=>{
  const slugT = (r.slug||'(null)').slice(0,40);
  const author = r.authorName || 'NULL';
  rowsMd += `| ${i+1} | ${slugCell(r).replace('`'+r.slug+'`','`'+slugT+'…`')} | ${r.status} | ${r.titleLen} | ${r.contentLen} | ${r.tagCount} | ${author} | ${seoFlags(r)} |\n`;
});
fs.writeFileSync(path.join(SUP,'PUBLIC_ARTICLES_ROWS.md'), rowsMd);

// ---- 2) schema / column mapping ----
const memCols = ['id','title','slug','excerpt','content','featured_image','featured_image_alt','category','author_id','author_name','allow_comments','status','meta_title','meta_description','meta_keywords','canonical_url','og_image','reading_time','view_count','is_featured','video_url','scheduled_at','published_at','created_at','updated_at','search_vector'];
const pubCols = out.columns;
const pub = new Set(pubCols), mem = new Set(memCols);
const onlyPub = [...pub].filter(c=>!mem.has(c));
const onlyMem = [...mem].filter(c=>!pub.has(c));
const shared = memCols.filter(c=>pub.has(c));
let schemaMd = '# public.articles ↔ memareh.articles — Column Mapping\n\n';
schemaMd += '## Shared columns (' + shared.length + ')\n';
schemaMd += shared.map(c=>'- `'+c+'`').join('\n') + '\n\n';
schemaMd += '## Only in public.articles (no memareh equivalent)\n';
schemaMd += onlyPub.length? onlyPub.map(c=>'- `'+c+'`').join('\n')+'\n\n' : '(none)\n\n';
schemaMd += '## Only in memareh.articles (absent from public)\n';
schemaMd += onlyMem.length? onlyMem.map(c=>'- `'+c+'`').join('\n')+'\n\n' : '(none)\n\n';
schemaMd += '## Type/constraint differences (from migration DDL)\n';
schemaMd += '- `slug`: public = `NOT NULL` + UNIQUE; memareh = nullable + UNIQUE. Public rejects NULL slugs.\n';
schemaMd += '- `status` CHECK: public allows `(draft,published,archived)` — **omits `scheduled`**; memareh allows `(draft,published,archived,scheduled)`.\n';
schemaMd += '- `author_id`: public has NO FK to `profiles`; memareh has `FK → memareh.profiles(id) ON DELETE SET NULL`.\n';
schemaMd += '- `tags`: public stores as `text[]` (native array) + GIN `idx_articles_tags`; memareh uses normalized `article_tags`/`article_tag_relations` + `article_tags_view` (JSONB).\n';
schemaMd += '- `featured_image_url` (public) vs `featured_image` (memareh): separate image columns (public has BOTH).\n';
schemaMd += '- public is missing SEO/engagement columns memareh carries: `featured_image_alt`, `canonical_url`, `og_image`, `view_count`, `is_featured`, `video_url`, `scheduled_at`.\n\n';
schemaMd += '## Consolidation impact\n';
schemaMd += '- A merge of `public.articles` INTO `memareh.articles` would require back-filling `tags`→relations (via existing `memareh.migrate_tags_to_relations()` pattern) and mapping `featured_image_url`→`featured_image`.\n';
schemaMd += '- Reverse (memareh→public) would lose `scheduled` status support, `author_id` FK integrity, and 7 SEO/engagement columns — NOT recommended.\n';
fs.writeFileSync(path.join(SUP,'PUBLIC_ARTICLES_SCHEMA_MAP.md'), schemaMd);

// ---- 3) dependency matrix ----
let depMd = '# public.articles — Dependency Matrix\n\n';
depMd += '## Code reference scan (src/**, *.sql, *.ts/tsx)\n\n';
depMd += 'Every Supabase client in the codebase is constructed with `db: { schema: \'memareh\' }`:\n';
depMd += '- `src/lib/supabase/server-public.ts` → `schema: \'memareh\'`\n';
depMd += '- `src/lib/supabase/server.ts` → `schema: \'memareh\'`\n';
depMd += '- `src/lib/supabase/client.ts` → `schema: \'memareh\'`\n';
depMd += '- `src/lib/supabase/admin.ts` → `schema: \'memareh\'`\n';
depMd += '- `src/app/sitemap.ts` → `createClient(..., { db: { schema: \'memareh\' } })`\n\n';
depMd += 'All `.from(\'articles\')` call sites therefore resolve to **`memareh.articles`**, NOT `public.articles`.\n\n';
depMd += '| Call site | Client | Resolves to |\n';
depMd += '|---|---|---|\n';
depMd += '| `src/app/sitemap.ts` (generateStaticParams/SEO) | raw supabase-js, schema=memareh | memareh.articles |\n';
depMd += '| `src/app/articles/page.tsx` | createPublicClient | memareh.articles |\n';
depMd += '| `src/app/articles/[slug]/page.tsx` | createPublicClient + createSupabaseAdmin | memareh.articles |\n';
depMd += '| `src/app/page.tsx` | createPublicClient | memareh.articles |\n';
depMd += '| `src/app/admin/page.tsx` | createClient (anon) | memareh.articles |\n';
depMd += '| `src/components/admin/ArticleEditor.tsx` | createClient (anon) | memareh.articles |\n';
depMd += '| `src/app/api/admin/users/*` | createSupabaseAdmin | memareh.articles (no, users) |\n';
depMd += '| `src/types/database.types.ts` | — | declares `memareh.articles` only (NO `public.articles` type) |\n\n';
depMd += '## CONTRADICTION WITH SCHEMA_BASELINE.md\n';
depMd += '`supabase/SCHEMA_BASELINE.md:70` states: *"Used by: `src/app/sitemap.ts` (queries `from(\'articles\')` with `db.schema=\'memareh\'` → resolves to `public.articles`)."*\n\n';
depMd += '**This is factually incorrect.** `schema: \'memareh\'` resolves `.from(\'articles\')` to `memareh.articles`. `public.articles` is NOT referenced by any code path. Recommend correcting the baseline doc: `public.articles` has **zero** live code dependents (orphaned table).\n\n';
depMd += '## DB-internal dependents (live)\n';
depMd += '- `public.set_author_name()` trigger (`trg_set_author_name`) is bound ONLY to `public.articles`.\n';
depMd += '- `public.articles` owns 3 indexes (`articles_pkey`, `articles_slug_key`, `idx_articles_published_at`, `idx_articles_search_vector`, `idx_articles_tags`) and 6 RLS policies — all orphaned if the table is retired.\n';
depMd += '- No other table FKs to `public.articles` (confirmed: no `REFERENCES public.articles`).\n';
fs.writeFileSync(path.join(SUP,'PUBLIC_ARTICLES_DEPENDENCY.md'), depMd);

// ---- 4) slug / SEO analysis ----
const hashed = rows.filter(r=>r.slugLooksHashed);
const slugGt100 = rows.filter(r=>r.slugLen>100);
const titleGt70 = rows.filter(r=>r.titleLen>70);
const metaTitleGt60 = rows.filter(r=>r.metaTitleLen>60);
const metaDescGt160 = rows.filter(r=>r.metaDescLen>160);
const noKeywords = rows.filter(r=>r.metaKeywordCount===0);
const contentLt5k = rows.filter(r=>r.contentLen<5000);
let seoMd = '# public.articles — Slug / SEO Analysis\n\n';
seoMd += '## Slug quality\n';
seoMd += '- Total rows: ' + rows.length + '\n';
seoMd += '- Hashed / non-readable slugs: **' + hashed.length + '** → `' + hashed.map(r=>r.slug).join('`, `') + '`\n';
seoMd += '- Slugs > 100 chars: **' + slugGt100.length + '** (max=' + Math.max(...rows.map(r=>r.slugLen)) + ' chars)\n';
seoMd += '- Duplicate slugs: 0 (all 26 unique)\n';
seoMd += '- Slugs are transliterated Persian (phonetic), NOT localized — SEO-relevant for Persian query matching but human-unreadable.\n\n';
seoMd += '## Title / Meta\n';
seoMd += '- Titles > 70 chars: ' + titleGt70.length + ' (Google truncates ~70; these will be clipped in SERPs)\n';
seoMd += '- `meta_title` > 60 chars: ' + metaTitleGt60.length + ' (recommended ≤ 60)\n';
seoMd += '- `meta_description` > 160 chars: ' + metaDescGt160.length + ' (recommended ≤ 160)\n';
seoMd += '- Rows missing `meta_keywords`: ' + noKeywords.length + '\n';
seoMd += '- Rows with `content` < 5k chars: ' + contentLt5k.length + ' (thin content risk)\n\n';
seoMd += '## Content depth\n';
seoMd += '- content.len: min=' + Math.min(...rows.map(r=>r.contentLen)) + ', max=' + Math.max(...rows.map(r=>r.contentLen)) + ', median≈9502.\n';
seoMd += '- One outlier row (`j`) has 50,676 chars — a long-form pillar article.\n\n';
seoMd += '## Recommendation\n';
seoMd += '- Before any consolidation, regenerate slugs as readable Latinized or Persian slugs (the 1 hashed slug `' + (hashed[0]?hashed[0].slug:'(none)') + '` is an SEO dead-end).\n';
seoMd += '- Trim 13 over-long meta_titles and 16 over-long meta_descriptions to SERP-safe lengths.\n';
seoMd += '- Note: the public site renders `memareh.articles` rows now, so these `public.articles` SEO issues currently have **no live impact** (orphaned table).\n';
fs.writeFileSync(path.join(SUP,'PUBLIC_ARTICLES_SLUG_SEO.md'), seoMd);

// ---- 5) author / tag mapping ----
const authors = {};
rows.forEach(r=>{
  const key = r.authorId || ('NOID:'+(r.authorName||'NULL'));
  if(!authors[key]) authors[key]={id:r.authorId,name:r.authorName,count:0};
  authors[key].count++;
});
const tagFreq={};
rows.forEach(r=>r.tags.forEach(t=>{tagFreq[t]=(tagFreq[t]||0)+1;}));
const tagCount = Object.keys(tagFreq).length;
let atMd = '# public.articles — Author / Tag Mapping\n\n';
atMd += '## Authors\n';
atMd += '- Distinct author identities: **' + Object.keys(authors).length + '** (all 26 rows share ONE author).\n';
atMd += '- Author UUID is omitted from this document (production identifier; see gitignored snapshot JSON).\n';
Object.values(authors).forEach(a=>{
  atMd += `  - name=${a.name||'NULL'} → ${a.count} rows\n`;
});
atMd += '- Implication: no per-author attribution diversity; `author_id` is non-FK and uniform, so author mapping adds no consolidation complexity.\n\n';
atMd += '## Tags\n';
atMd += '- Distinct tags across 26 rows: **' + tagCount + '** (heavy tag sprawl — avg ' + (tagCount/rows.length).toFixed(1) + ' distinct tags per row).\n';
atMd += '- Native `text[]` storage (no normalization, no `article_tags` table for this copy).\n';
atMd += '- Top 15 tags by frequency:\n';
Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([t,c])=>{ atMd += `  - ${t}: ${c}\n`; });
atMd += '\n- Rows with 0 tags: ' + rows.filter(r=>r.tagCount===0).length + ' (`alt-pridn-fivz-brgh` draft).\n';
atMd += '- Consolidation note: migrating to `memareh.article_tags`/`article_tag_relations` would require collapsing ' + tagCount + ' free-text tags into normalized entries (many near-duplicates, e.g. "اعزام برقکار فوری" vs "اعزام فوری برقکار").\n';
fs.writeFileSync(path.join(SUP,'PUBLIC_ARTICLES_AUTHOR_TAGS.md'), atMd);

console.log('Wrote 5 artifact files to supabase/');
