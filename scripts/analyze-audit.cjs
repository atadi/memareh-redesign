// Analyze the compact audit output and print aggregated findings (read-only).
const fs = require('fs');
const path = require('path');
const out = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit-public-articles.out.json'), 'utf8'));
const rows = out.rows;

// Status distribution
const statusDist = {};
rows.forEach(r => { statusDist[r.status] = (statusDist[r.status]||0)+1; });

// Slug quality
const hashedSlugs = rows.filter(r => r.slugLooksHashed);
const dupSlugs = {};
rows.forEach(r => { if (r.slug) dupSlugs[r.slug] = (dupSlugs[r.slug]||0)+1; });
const dupSlugKeys = Object.keys(dupSlugs).filter(k => dupSlugs[k] > 1);

// author mapping
const authors = {};
rows.forEach(r => {
  const key = r.authorId || ('NO_AUTHOR_ID:' + (r.authorName||'NULL'));
  if (!authors[key]) authors[key] = { authorId: r.authorId, authorName: r.authorName, count: 0, slugs: [] };
  authors[key].count++;
  authors[key].slugs.push(r.slug);
});

// tag frequency
const tagFreq = {};
rows.forEach(r => r.tags.forEach(t => { tagFreq[t] = (tagFreq[t]||0)+1; }));

// meta completeness
const metaTitleMissing = rows.filter(r => !r.metaTitle);
const metaDescMissing = rows.filter(r => !r.metaDescription);
const metaKeywordMissing = rows.filter(r => r.metaKeywordCount === 0);
const featuredImageMissing = rows.filter(r => !r.hasFeaturedImageCol && !r.hasFeaturedImageUrlCol);

// content / excerpt lengths
const lens = rows.map(r => r.contentLen).sort((a,b)=>a-b);
const avg = (arr) => Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);

// SEO issues
const longSlugs = rows.filter(r => r.slugLen > 100);
const titleIssues = rows.filter(r => r.titleLen < 10 || r.titleLen > 70);
const metaTitleTooLong = rows.filter(r => r.metaTitleLen > 60);
const metaDescTooLong = rows.filter(r => r.metaDescLen > 160);

console.log('=== STATUS DISTRIBUTION ===');
console.log(JSON.stringify(statusDist, null, 2));
console.log('\n=== SLUG QUALITY ===');
console.log('total rows:', rows.length);
console.log('hashed/non-readable slugs:', hashedSlugs.length);
console.log('duplicate slugs:', JSON.stringify(dupSlugKeys));
console.log('slugs longer than 100 chars:', longSlugs.map(r=>r.slugLen));
console.log('\n=== AUTHOR / TAG MAPPING ===');
console.log('distinct author keys:', Object.keys(authors).length);
Object.values(authors).forEach(a => console.log(`  id=${a.authorId||'NULL'} name=${a.authorName||'NULL'} count=${a.count}`));
console.log('distinct tags:', Object.keys(tagFreq).length);
const topTags = Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,15);
console.log('top tags:', JSON.stringify(topTags));

console.log('\n=== META / SEO COMPLETENESS ===');
console.log('meta_title missing:', metaTitleMissing.length, metaTitleMissing.map(r=>r.slug));
console.log('meta_description missing:', metaDescMissing.length, metaDescMissing.map(r=>r.slug));
console.log('meta_keywords missing:', metaKeywordMissing.length, metaKeywordMissing.map(r=>r.slug));
console.log('featured image col missing (both):', featuredImageMissing.length);

console.log('\n=== LENGTHS ===');
console.log('contentLen min/median/avg/max:', lens[0], lens[Math.floor(lens.length/2)], avg(lens), lens[lens.length-1]);
console.log('title length issues (not 10-70):', titleIssues.map(r=>({s:r.slug,l:r.titleLen})));
console.log('meta_title > 60 chars:', metaTitleTooLong.length);
console.log('meta_description > 160 chars:', metaDescTooLong.length);
console.log('rows with search_vector populated:', rows.filter(r=>r.hasSearchVector).length);
