// Read-only audit probe: fetch live public.articles and emit a compact summary.
// SELECT * only (read-only). Writes JSON to scripts/audit-public-articles.out.json
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv(path.join(__dirname, '..', '.env.local'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('MISSING_ENV'); process.exit(2); }

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const slugifyCheck = (s) => /^[a-z0-9\u0600-\u06FF\-]+$/.test(s);

(async () => {
  const { data, error, count } = await supabase.from('articles').select('*', { count: 'exact' });
  if (error) { console.error('SELECT_ERROR', JSON.stringify(error)); process.exit(3); }

  const rows = (data || []).map((r) => {
    const tags = Array.isArray(r.tags) ? r.tags : (r.tags ? [r.tags] : []);
    const metaKeywords = Array.isArray(r.meta_keywords) ? r.meta_keywords : (r.meta_keywords ? [r.meta_keywords] : []);
    return {
      id: r.id,
      title: r.title,
      titleLen: (r.title || '').length,
      slug: r.slug,
      slugLen: (r.slug || '').length,
      slugLooksHashed: !slugifyCheck(r.slug || ''),
      status: r.status,
      excerptLen: (r.excerpt || '').length,
      contentLen: (r.content || '').length,
      hasFeaturedImageCol: r.featured_image != null,
      hasFeaturedImageUrlCol: r.featured_image_url != null,
      featuredImageUrl: r.featured_image_url,
      featuredImage: r.featured_image,
      authorId: r.author_id,
      authorName: r.author_name,
      tags,
      tagCount: tags.length,
      allowComments: r.allow_comments,
      metaTitle: r.meta_title,
      metaTitleLen: (r.meta_title || '').length,
      metaDescription: r.meta_description,
      metaDescLen: (r.meta_description || '').length,
      metaKeywords,
      metaKeywordCount: metaKeywords.length,
      readingTime: r.reading_time,
      hasSearchVector: r.search_vector != null,
      category: r.category,
      publishedAt: r.published_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  const out = {
    rowCount: count ?? rows.length,
    columns: data && data[0] ? Object.keys(data[0]) : [],
    generatedAt: new Date().toISOString(),
    rows,
  };
  const outPath = path.join(__dirname, 'audit-public-articles.out.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('WROTE', outPath);
  console.log('ROW_COUNT', out.rowCount);
  console.log('COLUMNS', out.columns.length);
})();
