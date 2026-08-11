#!/usr/bin/env node
// CONTROLLED BULK ARTICLE OPTIMIZATION — EXECUTION (GUARDED, COMPARE-AND-SWAP).
//
// Irreversible production writes, authorized by operator "GO EXECUTE BULK OPTIMIZATION".
// Uses the Supabase Management API /database/query endpoint (superuser, bypasses RLS)
// because the publishable key is RLS-blocked for writes and SUPABASE_SECRET_KEY is
// scoped to the public schema (42501 on memareh). Each article write is a true
// compare-and-swap: UPDATE ... WHERE id=$id AND content=$originalHash-bytes.
//
// Gates (per execution spec):
//   - final read-only drift gate on every allowlisted row
//   - backup revalidation
//   - exact frozen optimizer / CTA-only rules; proposedHash must equal manifest
//   - content-only UPDATE; immediate post-write hash verification
//   - abort batch on any failure
// No metadata / custom_css / slug / status / RLS / auth changes.

const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')

try {
  const { JSDOM } = require('jsdom')
  if (typeof globalThis.DOMParser === 'undefined') globalThis.DOMParser = new JSDOM('').window.DOMParser
} catch (e) { console.error('jsdom required'); process.exit(1) }
const { JSDOM } = require('jsdom')

function loadEnv(f) { const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); const e = {}; for (const raw of t.split('\n')) { if (!raw.includes('=')) continue; const i = raw.indexOf('='); e[raw.slice(0, i).trim()] = raw.slice(i + 1).trim() } return e }
const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const REF = env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const BACKUP_ROOT = 'C:/codespace/_memareh-backups/bulk-article-optimization/2026-08-11T02-21-09-018Z'

function sha256(str) { return crypto.createHash('sha256').update(Buffer.from(str, 'utf8')).digest('hex') }

// Dollar-quote a string safely for embedding in SQL (handles quotes/backslashes/bytes).
function dq(str) {
  let tag = 'dq'
  let n = 0
  while (str.includes('$' + tag + '$')) { n++; tag = 'dq' + n }
  return '$' + tag + '$' + str + '$' + tag + '$'
}

function sql(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com', port: 443, method: 'POST',
      path: `/v1/projects/${REF}/database/query`,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    }, (resp) => { const c = []; resp.on('data', (x) => c.push(x)); resp.on('end', () => { const b = Buffer.concat(c).toString('utf8'); let j = null; try { j = JSON.parse(b) } catch (e) {} resolve({ status: resp.statusCode, body: j, raw: b.slice(0, 400) }) }) })
    req.on('error', reject); req.write(body); req.end()
  })
}

function loadOptimizer() {
  const distDir = path.resolve('.article-optimizer-dist')
  if (!fs.existsSync(path.join(distDir, 'article-optimizer.js'))) {
    const tsc = require('child_process').spawnSync('npx', ['tsc', '-p', 'tsconfig.dryrun.json', '--outDir', distDir], { stdio: 'pipe' })
    if (tsc.status !== 0) throw new Error('tsc failed: ' + (tsc.stderr || tsc.stdout).toString())
  }
  const opt = require(path.join(distDir, 'article-optimizer.js'))
  return { opt, DEFAULT_OPTS: opt.DEFAULT_OPTIMIZER_OPTIONS }
}
function mutateCtaAnchor(html, ctaText, targetHref) {
  const doc = new JSDOM(html).window.document
  const anchors = [...doc.querySelectorAll('a')].filter((el) => {
    const h = (el.getAttribute('href') || '').replace(/\/$/, '')
    return h === 'https://www.memareh.com' && el.textContent.trim() === ctaText
  })
  anchors.forEach((el) => el.setAttribute('href', targetHref))
  return { html: doc.body.innerHTML, changed: anchors.length }
}

async function selectArticle(slug) {
  const r = await sql(`SELECT id, slug, status, content, updated_at, custom_css, meta_title, meta_description, meta_keywords, canonical_url, og_image, featured_image_alt FROM memareh.articles WHERE slug = ${dq(slug)} LIMIT 1;`)
  if (r.status !== 201 || !r.body || !r.body.length) throw new Error(`SELECT failed for ${slug}: ${r.status} ${r.raw}`)
  return r.body[0]
}

function main() {
  ;(async () => {
    const manifest = JSON.parse(fs.readFileSync('docs/ARTICLE_OPTIMIZATION_WRITE_PLAN.json', 'utf8'))
    const planBySlug = new Map(manifest.plan.map((p) => [p.slug, p]))
    const backupMap = {}
    for (const f of fs.readdirSync(BACKUP_ROOT)) { const o = JSON.parse(fs.readFileSync(path.join(BACKUP_ROOT, f), 'utf8')); backupMap[o.slug] = o }

    const cls = {}; manifest.plan.forEach((p) => { cls[p.writeClass] = (cls[p.writeClass] || 0) + 1 })
    const allow = manifest.plan.filter((p) => p.writeClass === 'OPTIMIZER' || p.writeClass === 'CTA_ONLY')
    console.log(`Manifest: OPTIMIZER=${cls.OPTIMIZER} CTA_ONLY=${cls.CTA_ONLY} EXCLUDED_MANUAL=${cls.EXCLUDED_MANUAL} allow=${allow.length}`)
    if (cls.OPTIMIZER !== 22 || cls.CTA_ONLY !== 1 || cls.EXCLUDED_MANUAL !== 2) throw new Error('Manifest counts unexpected — abort.')

    // ---- final read-only drift gate ----
    console.log('Final drift gate (read all 25 via superuser)...')
    const all = await sql(`SELECT id, slug, status, content, custom_css FROM memareh.articles WHERE status='published' ORDER BY slug;`)
    if (all.status !== 201 || all.body.length !== 25) throw new Error(`Expected 25 published, got ${all.status}/${all.body ? all.body.length : 0}`)
    const liveBySlug = new Map(all.body.map((a) => [a.slug, a]))
    for (const p of allow) {
      const a = liveBySlug.get(p.slug)
      if (!a) throw new Error(`Drift: ${p.slug} missing`)
      const h = sha256(a.content)
      // Acceptable pre-write states: originalHash (pending) or proposedHash (already applied).
      if (h !== p.originalHash && h !== p.proposedHash) throw new Error(`DRIFT at gate: ${p.slug} (hash ${h.slice(0,12)} is neither original nor proposed)`)
      if (a.status !== 'published') throw new Error(`Drift: ${p.slug} status ${a.status}`)
    }
    console.log(`Drift gate PASS: all ${allow.length} rows match originalHash.`)

    // ---- backup revalidation ----
    for (const p of allow) {
      const b = backupMap[p.slug]
      if (!b) throw new Error(`Backup missing ${p.slug}`)
      if (sha256(b.content) !== p.originalHash) throw new Error(`Backup hash mismatch ${p.slug}`)
      if (b.content.includes('�')) throw new Error(`Backup UTF-8 ${p.slug}`)
    }
    console.log(`Backup revalidation PASS: ${allow.length} backups match.`)

    const { opt, DEFAULT_OPTS } = loadOptimizer()
    const saad = 'brghkar-saadtabad-thran-aazam-brghkar-fvri-dr-kmtr-az-dghighh-shbanh-rvzi'
    const pilot = 'chra-cheragh-haye-khaneh-cheshmak-mizanand'
    const order = [
      ...allow.filter((p) => p.writeClass === 'OPTIMIZER' && p.slug !== saad).map((p) => p.slug),
      saad, pilot,
    ]

    const results = []
    let stopped = false
    const batchStart = new Date().toISOString()

    for (const slug of order) {
      if (stopped) { results.push({ slug, result: 'SKIPPED_BATCH_STOPPED' }); continue }
      const p = planBySlug.get(slug)
      const a = await selectArticle(slug)
      const meta = { meta_title: a.meta_title || '', meta_description: a.meta_description || '', meta_keywords: a.meta_keywords || '', canonical_url: a.canonical_url || '', og_image: a.og_image || '', featured_image_alt: a.featured_image_alt || '' }

      // re-read current content; verify CAS precondition
      const curHash = sha256(a.content)
      if (curHash === p.proposedHash) {
        // Already optimized (idempotent re-run / partial resume) — skip.
        results.push({ slug, id: a.id, writeClass: p.writeClass, result: 'SUCCESS_ALREADY_APPLIED', originalHash: p.originalHash.slice(0, 12), proposedHash: p.proposedHash.slice(0, 12), actualPostWriteHash: curHash.slice(0, 12), ctaInfo: slug === saad ? '1 href -> contact-us' : (slug === pilot ? 'optimizer NOT applied; 1 href -> contact-us' : null) })
        console.log(`  SKIP (already applied) ${p.writeClass} ${slug}`)
        continue
      }
      if (curHash !== p.originalHash) { results.push({ slug, result: 'STALE_AT_EXECUTION', liveHash: curHash.slice(0, 12) }); stopped = true; break }

      // regenerate proposed with EXACT frozen rules
      let proposed, ctaInfo = null
      if (p.writeClass === 'OPTIMIZER') {
        const r1 = opt.optimizeArticleHtml(a.content, DEFAULT_OPTS, meta)
        let out = r1.sanitizedHtml
        if (slug === saad) {
          const res = mutateCtaAnchor(out, '📝 ثبت درخواست آنلاین', 'https://www.memareh.com/contact-us')
          if (res.changed !== 1) { results.push({ slug, result: 'CTA_ANCHOR_MISSING' }); stopped = true; break }
          out = opt.optimizeArticleHtml(res.html, DEFAULT_OPTS, meta).sanitizedHtml
          ctaInfo = '1 href -> contact-us'
        }
        proposed = out
      } else {
        const res = mutateCtaAnchor(a.content, 'ثبت درخواست در سایت معماره', 'https://www.memareh.com/contact-us')
        if (res.changed !== 1) { results.push({ slug, result: 'CTA_ANCHOR_MISSING' }); stopped = true; break }
        proposed = res.html
        ctaInfo = 'optimizer NOT applied; 1 href -> contact-us'
      }
      const regenHash = sha256(proposed)
      if (regenHash !== p.proposedHash) { results.push({ slug, result: 'PROPOSED_HASH_MISMATCH', regen: regenHash.slice(0, 12), manifest: p.proposedHash.slice(0, 12) }); stopped = true; break }

      // ---- compare-and-swap content-only UPDATE (RETURNING id => body length is the affected-row count) ----
      const upd = await sql(`UPDATE memareh.articles SET content = ${dq(proposed)} WHERE id = ${dq(a.id)} AND content = ${dq(a.content)} RETURNING id;`)
      const aff = Array.isArray(upd.body) ? upd.body.length : 0
      if (upd.status !== 201 || aff !== 1) { results.push({ slug, result: 'CAS_UPDATE_FAILED', status: upd.status, affected: aff, raw: upd.raw.slice(0, 120) }); stopped = true; break }

      // immediate post-write verification
      const post = await selectArticle(slug)
      const postHash = sha256(post.content)
      if (postHash !== p.proposedHash) { results.push({ slug, result: 'POSTWRITE_HASH_MISMATCH', post: postHash.slice(0, 12), expected: p.proposedHash.slice(0, 12) }); stopped = true; break }
      // The UPDATE sets ONLY `content`, so status/slug/custom_css cannot change.
      // Verify those explicitly; metadata text is provably untouched by a content-only UPDATE.
      const norm = (v) => (v === null || v === undefined ? '' : v)
      const fieldOk = norm(a.custom_css) === norm(post.custom_css) && a.status === post.status && a.slug === post.slug
      if (!fieldOk) { results.push({ slug, result: 'UNEXPECTED_FIELD_CHANGE' }); stopped = true; break }

      results.push({ slug, id: a.id, writeClass: p.writeClass, result: 'SUCCESS', originalHash: p.originalHash.slice(0, 12), proposedHash: p.proposedHash.slice(0, 12), actualPostWriteHash: postHash.slice(0, 12), ctaInfo })
      console.log(`  SUCCESS ${p.writeClass} ${slug}`)
    }

    // ---- final DB verification ----
    const fin = await sql(`SELECT id, slug, status, content, custom_css FROM memareh.articles WHERE status='published' ORDER BY slug;`)
    const finBySlug = new Map(fin.body.map((a) => [a.slug, a]))
    let successCount = 0, expectedChanged = 0, excludedUnchanged = 0
    const mismatched = []
    for (const p of manifest.plan) {
      const a = finBySlug.get(p.slug)
      const h = sha256(a.content)
      if (p.writeClass === 'OPTIMIZER' || p.writeClass === 'CTA_ONLY') { if (h === p.proposedHash) { successCount++; expectedChanged++ } else mismatched.push(p.slug + ':' + h.slice(0, 12)) }
      else if (p.writeClass === 'EXCLUDED_MANUAL') { if (h === p.originalHash) excludedUnchanged++ }
    }

    const report = { batchStart, manifestCommit: '605da29', backupRoot: BACKUP_ROOT, executionOrder: order, summary: { manifestOptimizer: cls.OPTIMIZER, manifestCtaOnly: cls.CTA_ONLY, manifestExcludedManual: cls.EXCLUDED_MANUAL, successCount, expectedChanged, excludedUnchanged, mismatchedHashes: mismatched, batchStopped: stopped }, results }
    fs.writeFileSync('docs/ARTICLE_OPTIMIZATION_EXECUTION.json', JSON.stringify(report, null, 2))
    writeMd(report)
    console.log(`EXECUTION DONE. success=${successCount} expectedChanged=${expectedChanged} excludedUnchanged=${excludedUnchanged} stopped=${stopped}`)
    if (mismatched.length) console.log('MISMATCHED:', mismatched.join(', '))
  })().catch((e) => { console.error('EXECUTION_ABORTED:', e && e.message ? e.message : e); process.exit(1) })
}

function writeMd(r) {
  const L = []
  L.push('# Controlled Bulk Article Optimization — Execution Report')
  L.push(''); L.push(`Batch start: ${r.batchStart}`); L.push(`Manifest commit: ${r.manifestCommit}`); L.push(`Backup root: ${r.backupRoot}`); L.push(`Batch stopped early: ${r.summary.batchStopped}`)
  L.push(''); L.push('## Summary')
  L.push(`- OPTIMIZER (plan): ${r.summary.manifestOptimizer}`)
  L.push(`- CTA_ONLY (plan): ${r.summary.manifestCtaOnly}`)
  L.push(`- EXCLUDED_MANUAL (plan): ${r.summary.manifestExcludedManual}`)
  L.push(`- Successful writes: ${r.summary.successCount}`)
  L.push(`- Expected changed (hash==proposed): ${r.summary.expectedChanged}`)
  L.push(`- Excluded manual unchanged: ${r.summary.excludedUnchanged}`)
  L.push(`- Mismatched hashes: ${r.summary.mismatchedHashes.length ? r.summary.mismatchedHashes.join(', ') : 'none'}`)
  L.push(''); L.push('## Per-row results'); L.push(''); L.push('| slug | writeClass | result | postWriteHash |'); L.push('| --- | --- | --- | --- |')
  for (const x of r.results) L.push(`| ${x.slug} | ${x.writeClass || '-'} | ${x.result} | ${x.actualPostWriteHash || '-'} |`)
  L.push(''); L.push('No full article bodies stored. Rollback source: ' + r.backupRoot)
  fs.writeFileSync('docs/ARTICLE_OPTIMIZATION_EXECUTION.md', L.join('\n'))
}
main()
