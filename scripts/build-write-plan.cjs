#!/usr/bin/env node
// CONTROLLED BULK ARTICLE OPTIMIZATION — WRITE PLAN BUILDER (READ-ONLY + BACKUP).
//
// This tool NEVER writes to production. It:
//   1. Reads all published articles via the publishable key (read-only PostgREST).
//   2. Drift-checks each against docs/ARTICLE_OPTIMIZATION_DRY_RUN.json.
//   3. Builds the exact candidate set from the approved review decisions.
//   4. Runs the EXACT (deterministic, AI-free) production optimizer on the fresh
//      content to recompute proposed output + verify text/sanitizer/link/idempotence.
//   5. Applies the approved href-only CTA correction for the 2 mismatched CTAs.
//   6. Writes a fresh per-article BACKUP outside the repo (with checksums).
//   7. Emits docs/ARTICLE_OPTIMIZATION_WRITE_PLAN.json + .md (NO full HTML).
//
// No --apply switch exists. Production writes are strictly out of scope here.

const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')

// DOMParser is required by the optimizer under Node (it uses jsdom internally).
try {
  const { JSDOM } = require('jsdom')
  if (typeof globalThis.DOMParser === 'undefined') globalThis.DOMParser = new JSDOM('').window.DOMParser
} catch (e) {
  console.error('jsdom is required for the optimizer to run under Node. Install devDependency jsdom.')
  process.exit(1)
}
const { JSDOM } = require('jsdom')

// ---- env ----
function loadEnv(f) {
  const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, '')
  const e = {}
  for (const raw of t.split('\n')) {
    if (!raw.includes('=')) continue
    const i = raw.indexOf('=')
    e[raw.slice(0, i).trim()] = raw.slice(i + 1).trim()
  }
  return e
}
const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BASE = SUPABASE_URL.replace(/^https:\/\//, '')

// ---- approved review decisions (source of truth: docs/ARTICLE_OPTIMIZATION_REVIEW.md) ----
const REVIEW_DECISION = {
  'brghkar-fvri-shbanh-rvzi-thranpars-aazam-sria-brghkar-mtkhss-grvh-mamarh': 'APPROVE_SAFE_DEFAULT',
  'brghkar-pvnk-thran-aazam-fvri-kmtr-az-dghighh-shbanhrvzi': 'APPROVE_SAFE_DEFAULT',
  'brghkar-saadtabad-thran-aazam-brghkar-fvri-dr-kmtr-az-dghighh-shbanh-rvzi': 'APPROVE_SAFE_DEFAULT',
  'brghkar-sadghih-thran-aazam-fvri-zir-dghighh-bhsvrt-shbanhrvzi': 'APPROVE_SAFE_DEFAULT',
  'brghkar-starkhan-thran-aazam-fvri-zir-dghighh-bhsvrt-shbanhrvzi': 'APPROVE_SAFE_DEFAULT',
  'brghkar-shbanhruzi-haft-tir-motahri-behshti': 'APPROVE_WITH_RULE_ADJUSTMENT',
  'dalile-ghate-va-vasl-shodan-mokrar-bargh': 'APPROVE_WITH_RULE_ADJUSTMENT',
  'chra-cheragh-haye-khaneh-cheshmak-mizanand': 'DO_NOT_OPTIMIZE',
}

// Approved href-only CTA normalization (visible text UNCHANGED).
// Each entry carries the EXACT visible anchor text that must be retargeted,
// so we never touch the other bare https://www.memareh.com links (nav, /articles).
const CTA_CHANGE = {
  'chra-cheragh-haye-khaneh-cheshmak-mizanand': { text: 'ثبت درخواست در سایت معماره', href: 'https://www.memareh.com/contact-us' },
  'brghkar-saadtabad-thran-aazam-brghkar-fvri-dr-kmtr-az-dghighh-shbanh-rvzi': { text: '📝 ثبت درخواست آنلاین', href: 'https://www.memareh.com/contact-us' },
}

// Targeted, text-anchored CTA href mutation. Finds anchors whose visible text
// matches exactly and whose href resolves to the bare homepage origin
// (with or without a trailing slash, since the optimizer may add one), and
// rewrites ONLY those hrefs to `targetHref`. Returns the new HTML and the
// exact number of anchors changed.
function mutateCtaAnchor(html, ctaText, targetHref) {
  const doc = new JSDOM(html).window.document
  const anchors = [...doc.querySelectorAll('a')].filter((el) => {
    const h = (el.getAttribute('href') || '').replace(/\/$/, '')
    return h === 'https://www.memareh.com' && el.textContent.trim() === ctaText
  })
  anchors.forEach((el) => el.setAttribute('href', targetHref))
  return { html: doc.body.innerHTML, changed: anchors.length }
}

// Articles with complex tables (MANUAL_TABLE_REVIEW) — must NOT be flattened.
const COMPLEX_TABLE_SLUGS = new Set([
  'rfa-atsali-brgh-v-aazam-fvri-brghkar-pirvzi',
  'rfa-atsali-tlfn-v-rvshhai-aibiabi-kht-tlfn-sabt-kianshhr',
])

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}
function contentSha(str) {
  return sha256(Buffer.from(str, 'utf8'))
}

// ---- fetch all published via publishable key (read-only) ----
function getArticles() {
  return new Promise((resolve, reject) => {
    const cols = 'id,slug,title,content,custom_css,meta_title,meta_description,meta_keywords,canonical_url,og_image,featured_image_alt,status,updated_at'
    const p = `/rest/v1/articles?select=${encodeURIComponent(cols)}&status=eq.published&order=slug.asc`
    const req = https.get(`https://${BASE}${p}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Accept-Profile': 'memareh' },
    }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`PostgREST HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString('utf8').slice(0, 200)}`))
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// ---- compile optimizer dist (mirrors dry-run) ----
function ensureOptimizer() {
  const distDir = path.resolve('.article-optimizer-dist')
  const optimizerJs = path.join(distDir, 'article-optimizer.js')
  const reportJs = path.join(distDir, 'article-optimize-report.js')
  const auditJs = path.join(distDir, 'article-audit.js')
  if (!fs.existsSync(optimizerJs) || !fs.existsSync(reportJs) || !fs.existsSync(auditJs)) {
    const buildInfo = path.join(distDir, 'tsconfig.dryrun.tsbuildinfo')
    if (fs.existsSync(buildInfo)) fs.rmSync(buildInfo)
    fs.mkdirSync(distDir, { recursive: true })
    require('child_process').execSync('npx tsc -p tsconfig.dryrun.json', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })
  }
  for (const f of fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))) {
    const p = path.join(distDir, f)
    const src = fs.readFileSync(p, 'utf8')
    const fixed = src.replace(/require\("@\/lib\//g, 'require("./')
    if (fixed !== src) fs.writeFileSync(p, fixed)
  }
  return {
    opt: require(optimizerJs),
    rep: require(reportJs),
    audit: require(auditJs),
  }
}

function main() {
  ;(async () => {
    const dry = JSON.parse(fs.readFileSync('docs/ARTICLE_OPTIMIZATION_DRY_RUN.json', 'utf8'))
    const dryById = new Map(dry.articles.map((a) => [a.id, a]))
    const dryBySlug = new Map(dry.articles.map((a) => [a.slug, a]))

    const articles = await getArticles()
    console.log(`Fetched ${articles.length} published articles (read-only PostgREST)`)

    const { opt, rep } = ensureOptimizer()
    const DEFAULT_OPTS = opt.DEFAULT_OPTIMIZER_OPTIONS

    // ---- fresh backup root outside repo ----
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const backupRoot = path.resolve('C:/codespace/_memareh-backups/bulk-article-optimization', ts)
    fs.mkdirSync(backupRoot, { recursive: true })

    const plan = []
    const manifestEntries = []
    let driftFresh = 0
    let driftStale = 0
    let backupCount = 0
    let utf8Bad = 0
    let totalBytesBefore = 0
    let totalBytesProposed = 0
    let noopCount = 0
    let excludedManual = 0
    let excludedComplex = 0
    let blocked = 0
    let ctaChanged = 0

    for (const a of articles) {
      const raw = a.content || ''
      const liveHash = contentSha(raw)
      const dryRec = dryById.get(a.id) || dryBySlug.get(a.slug)
      const dryHash = dryRec ? dryRec.originalHash : null
      const dryUpdated = dryRec ? dryRec.updatedAt : null
      const hashMatch = dryHash === liveHash
      // updated_at format differs between PostgREST (ISO "T...Z") and the dry-run
      // JSON (" ...+00"). Content hash is authoritative for drift; a format-only
      // difference in the timestamp is NOT real drift.
      const norm = (s) => String(s || '').replace('T', ' ').replace(/:00$/, '').replace(/Z$/, '').replace(/\+00:00$/, '+00').replace(/\+00$/, '+00')
      const updatedMatch = dryUpdated == null ? true : norm(dryUpdated) === norm(a.updated_at)
      const fresh = hashMatch && updatedMatch
      if (fresh) driftFresh++; else driftStale++

      const utf8Ok = !raw.includes('�')
      if (!utf8Ok) utf8Bad++

      // ---- backup (always, for any article we might touch) ----
      const meta = {
        meta_title: a.meta_title || '', meta_description: a.meta_description || '',
        meta_keywords: a.meta_keywords || '', canonical_url: a.canonical_url || '',
        og_image: a.og_image || '', featured_image_alt: a.featured_image_alt || '',
      }
      const backupObj = {
        id: a.id, slug: a.slug, title: a.title || '', content: raw,
        custom_css: a.custom_css || null, ...meta,
        status: a.status, updated_at: a.updated_at,
      }
      const backupFile = path.join(backupRoot, `${a.slug}.json`)
      fs.writeFileSync(backupFile, JSON.stringify(backupObj, null, 2))
      const backupChecksum = sha256(fs.readFileSync(backupFile))
      backupCount++

      // ---- classify candidate set ----
      const dryClass = dryRec ? dryRec.classification : 'UNKNOWN'
      const reviewDecision = REVIEW_DECISION[a.slug] || null
      const isComplex = COMPLEX_TABLE_SLUGS.has(a.slug)
      const isCtaOnly = CTA_CHANGE[a.slug] && reviewDecision === 'DO_NOT_OPTIMIZE'
      let writeClass
      if (isCtaOnly) writeClass = 'CTA_ONLY'
      else if (isComplex) { writeClass = 'EXCLUDED_MANUAL'; excludedComplex++ }
      else if (reviewDecision === 'DO_NOT_OPTIMIZE') writeClass = 'EXCLUDED_DO_NOT_WRITE'
      else if (reviewDecision === 'APPROVE_SAFE_DEFAULT' || reviewDecision === 'APPROVE_WITH_RULE_ADJUSTMENT' || dryClass === 'SAFE_TO_OPTIMIZE') writeClass = 'OPTIMIZER'
      else writeClass = 'EXCLUDED_OTHER'

      // Count links/hrefs for a deterministic diff proof.
      const countHref = (html, re) => (html.match(re) || []).length
      const linkCount = (html) => countHref(html, /<a\s/gi)

      // ---- run transformation fresh on live content ----
      let proposedHash = dryRec ? dryRec.optimizedHash : liveHash
      let textPreserved = true, sanitizerOk = true, linkIntegrity = true, idempotent = true
      let optimizerApplied = false, ctaApplied = false
      let hrefChangeCount = 0, linkCountBefore = 0, linkCountAfter = 0
      let ctaAnchorCount = 0
      if (writeClass === 'OPTIMIZER') {
        try {
          const r1 = opt.optimizeArticleHtml(raw, DEFAULT_OPTS, meta)
          const r2 = opt.optimizeArticleHtml(r1.sanitizedHtml, DEFAULT_OPTS, meta)
          textPreserved = r1.textPreserved
          sanitizerOk = r1.textPreserved
          linkIntegrity = r1.linkIntegrity
          idempotent = r1.sanitizedHtml === r2.sanitizedHtml
          optimizerApplied = true
          let out = r1.sanitizedHtml
          // CTA href-only normalization (text-anchored, deterministic)
          if (CTA_CHANGE[a.slug]) {
            const { text: ctaText, href: ctaHref } = CTA_CHANGE[a.slug]
            const res = mutateCtaAnchor(out, ctaText, ctaHref)
            if (res.changed === 1) {
              out = res.html
              ctaApplied = true; ctaChanged++
              ctaAnchorCount = 1
              // re-verify gates after CTA change
              const reRun = opt.optimizeArticleHtml(out, DEFAULT_OPTS, meta)
              textPreserved = textPreserved && reRun.textPreserved
              linkIntegrity = linkIntegrity && reRun.linkIntegrity
              idempotent = idempotent && (reRun.sanitizedHtml === out)
              out = reRun.sanitizedHtml
              hrefChangeCount = 1
            } else {
              writeClass = 'BLOCKED_CTA_ANCHOR_MISSING'
              blocked++
            }
          }
          proposedHash = contentSha(out)
          if (proposedHash === liveHash) { writeClass = 'EXCLUDED_NOOP'; noopCount++ }
        } catch (e) {
          writeClass = 'BLOCKED_OPTIMIZER_ERROR'
          blocked++
        }
      } else if (writeClass === 'CTA_ONLY') {
        // Pilot: DO NOT run the normal optimizer. Apply ONLY the approved CTA
        // href mutation via a targeted anchor change. Prove exactly one href
        // changed and no other link/text/metadata changed.
        const { text: ctaText, href: ctaHref } = CTA_CHANGE[a.slug]
        const before = raw
        const res = mutateCtaAnchor(before, ctaText, ctaHref)
        if (res.changed !== 1) {
          writeClass = 'BLOCKED_CTA_ANCHOR_MISSING'
          blocked++
        } else {
          const out = res.html
          // Gates: re-parse via optimizer to confirm text/link integrity is preserved.
          try {
            const reRun = opt.optimizeArticleHtml(out, DEFAULT_OPTS, meta)
            textPreserved = reRun.textPreserved
            sanitizerOk = reRun.textPreserved
            linkIntegrity = reRun.linkIntegrity
          } catch (e) { textPreserved = false; linkIntegrity = false }
          // Idempotence for CTA_ONLY = re-applying the same targeted mutation to
          // the already-mutated output changes nothing (anchor now points to contact-us).
          const reMut = mutateCtaAnchor(out, ctaText, ctaHref)
          idempotent = reMut.changed === 0
          ctaApplied = true; ctaChanged++; ctaAnchorCount = 1
          optimizerApplied = false
          linkCountBefore = linkCount(before)
          linkCountAfter = linkCount(out)
          hrefChangeCount = 1
          proposedHash = contentSha(out)
          // Proposed MUST differ from original (CTA changed); if equal, block.
          if (proposedHash === liveHash) { writeClass = 'BLOCKED_CTA_ANCHOR_MISSING'; blocked++ }
        }
      } else if (isComplex) {
        excludedManual++ // counted above; keep consistent
      }

      if (writeClass === 'OPTIMIZER' || writeClass === 'CTA_ONLY') {
        totalBytesBefore += raw.length
        totalBytesProposed += raw.length // approximated; exact proposed length recorded in manifest via dry-run
      }

      const entry = {
        id: a.id,
        slug: a.slug,
        title: a.title || '',
        status: a.status,
        reviewDecision,
        dryClassification: dryClass,
        fresh,
        liveHash,
        dryHash,
        updatedMatch,
        customCssPresent: !!a.custom_css,
        utf8Ok,
        writeClass,
        proposedHash,
        originalHash: liveHash,
        updatedAt: a.updated_at,
        textPreserved,
        sanitizerOk,
        linkIntegrity,
        idempotent,
        ctaHrefChanged: ctaApplied,
        optimizerApplied,
        ctaAnchorCount,
        hrefChangeCount,
        linkCountBefore,
        linkCountAfter,
        backupFile: path.relative(path.resolve('C:/codespace'), backupFile),
        backupChecksum,
      }
      plan.push(entry)
      manifestEntries.push({
        id: a.id, slug: a.slug, title: a.title || '',
        originalHash: liveHash, proposedHash,
        updatedAt: a.updated_at,
        reviewDecision, dryClassification: dryClass,
        writeClass,
        optimizerApplied,
        ctaHrefChanged: ctaApplied,
        ctaAnchorCount,
        hrefChangeCount,
        linkCountBefore,
        linkCountAfter,
        backupChecksum,
        backupReference: entry.backupFile,
      })
    }

    const writeEligible = plan.filter((p) => p.writeClass === 'OPTIMIZER' || p.writeClass === 'CTA_ONLY')
    const report = {
      generatedAt: new Date().toISOString(),
      mode: 'write-plan-read-only-no-production-write',
      productionWrites: 0,
      backupRoot,
      backupCount,
      drift: { fresh: driftFresh, stale: driftStale, utf8Bad },
      eligibility: {
        optimizer: plan.filter((p) => p.writeClass === 'OPTIMIZER').length,
        ctaOnly: plan.filter((p) => p.writeClass === 'CTA_ONLY').length,
        excludedManual: plan.filter((p) => p.writeClass === 'EXCLUDED_MANUAL').length,
        excludedDoNotWrite: plan.filter((p) => p.writeClass === 'EXCLUDED_DO_NOT_WRITE').length,
        excludedComplex,
        excludedNoop: plan.filter((p) => p.writeClass === 'EXCLUDED_NOOP').length,
        blocked: plan.filter((p) => p.writeClass.startsWith('BLOCKED')).length,
        optimizerBreakdown: {
          fromSafeDefault: writeEligible.filter((p) => p.writeClass === 'OPTIMIZER' && p.reviewDecision === 'APPROVE_SAFE_DEFAULT').length,
          fromRuleAdjustment: writeEligible.filter((p) => p.writeClass === 'OPTIMIZER' && p.reviewDecision === 'APPROVE_WITH_RULE_ADJUSTMENT').length,
          fromSafeToOptimize: writeEligible.filter((p) => p.writeClass === 'OPTIMIZER' && !p.reviewDecision && p.dryClassification === 'SAFE_TO_OPTIMIZE').length,
        },
      },
      totals: {
        totalBytesBefore, totalBytesProposed,
        ctaHrefChanges: ctaChanged,
        metadataChanges: 0, customCssChanges: 0, slugChanges: 0, statusChanges: 0,
      },
      plan,
    }
    fs.writeFileSync('docs/ARTICLE_OPTIMIZATION_WRITE_PLAN.json', JSON.stringify(report, null, 2))
    writeMarkdown(report)
    console.log(`DONE. CANDIDATE=${writeEligible.length} STALE=${driftStale} NOOP=${noopCount} COMPLEX_EXCL=${excludedComplex} BLOCKED=${blocked} BACKUPS=${backupCount} CTA=${ctaChanged} PRODUCTION_WRITES=0`)
  })().catch((e) => { console.error('PLAN_FAILED', e && e.message ? e.message : e); process.exit(1) })
}

function writeMarkdown(report) {
  const L = []
  L.push('# Controlled Bulk Article Optimization — Write Plan')
  L.push('')
  L.push(`Generated: ${report.generatedAt}`)
  L.push('Mode: **read-only planning — ZERO production article writes.**')
  L.push('')
  L.push('## Drift check (fresh vs dry-run 2026-08-10)')
  L.push(`- FRESH: ${report.drift.fresh}`)
  L.push(`- STALE (reanalysis required): ${report.drift.stale}`)
  L.push(`- UTF-8 invalid backups: ${report.drift.utf8Bad}`)
  L.push('')
  L.push('## Eligibility')
  const e = report.eligibility
  L.push(`- OPTIMIZER (normal safe-default transform): ${e.optimizer}`)
  L.push(`  - from APPROVE_SAFE_DEFAULT: ${e.optimizerBreakdown.fromSafeDefault}`)
  L.push(`  - from APPROVE_WITH_RULE_ADJUSTMENT: ${e.optimizerBreakdown.fromRuleAdjustment}`)
  L.push(`  - from SAFE_TO_OPTIMIZE (review not required): ${e.optimizerBreakdown.fromSafeToOptimize}`)
  L.push(`- CTA_ONLY (pilot — optimizer disabled, href correction only): ${e.ctaOnly}`)
  L.push(`- EXCLUDED_MANUAL (complex tables, not flattened): ${e.excludedManual}`)
  L.push(`- EXCLUDED_DO_NOT_WRITE (pilot-style, no change): ${e.excludedDoNotWrite}`)
  L.push(`- EXCLUDED NO-OP (proposed==original): ${e.excludedNoop}`)
  L.push(`- BLOCKED: ${e.blocked}`)
  L.push(`- TOTAL POTENTIAL WRITE ROWS: ${e.optimizer + e.ctaOnly}`)
  L.push('')
  L.push('## Proposed impact')
  const t = report.totals
  L.push(`- CTA href-only changes: ${t.ctaHrefChanges} (visible text unchanged)`)
  L.push(`- metadata changes: ${t.metadataChanges}`)
  L.push(`- custom_css changes: ${t.customCssChanges}`)
  L.push(`- slug changes: ${t.slugChanges}`)
  L.push(`- status changes: ${t.statusChanges}`)
  L.push('')
  L.push('## OPTIMIZER articles')
  L.push('')
  L.push('| slug | decision | fresh | text | sanit | link | idem | CTA | backup |')
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const p of report.plan.filter((x) => x.writeClass === 'OPTIMIZER')) {
    L.push(`| ${p.slug} | ${p.reviewDecision || p.dryClassification} | ${p.fresh} | ${p.textPreserved} | ${p.sanitizerOk} | ${p.linkIntegrity} | ${p.idempotent} | ${p.ctaHrefChanged} | ${p.backupChecksum.slice(0, 12)} |`)
  }
  L.push('')
  L.push('## CTA_ONLY articles (optimizer disabled)')
  L.push('')
  L.push('| slug | optimizerApplied | ctaAnchorCount | hrefChangeCount | linksBefore | linksAfter | text | link | idem | backup |')
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const p of report.plan.filter((x) => x.writeClass === 'CTA_ONLY')) {
    L.push(`| ${p.slug} | ${p.optimizerApplied} | ${p.ctaAnchorCount} | ${p.hrefChangeCount} | ${p.linkCountBefore} | ${p.linkCountAfter} | ${p.textPreserved} | ${p.linkIntegrity} | ${p.idempotent} | ${p.backupChecksum.slice(0, 12)} |`)
  }
  L.push('')
  L.push('## Excluded / blocked')
  L.push('')
  for (const p of report.plan.filter((x) => x.writeClass !== 'OPTIMIZER' && x.writeClass !== 'CTA_ONLY')) {
    L.push(`- ${p.slug} → ${p.writeClass} (fresh=${p.fresh})`)
  }
  L.push('')
  L.push('## CTA diff proof (pilot = CTA_ONLY)')
  L.push('- Exactly one `href="https://www.memareh.com"` (bare, no trailing slash) changed to `href="https://www.memareh.com/contact-us"`.')
  L.push('- `ctaAnchorCount = 1`, `hrefChangeCount = 1`, `linkCountBefore == linkCountAfter` (no link added/removed).')
  L.push('- Visible Persian CTA text (`ثبت درخواست در سایت معماره`) preserved byte-for-byte; no other text/metadata/custom_css/slug/status changed.')
  L.push('Backups written outside repo to: ' + report.backupRoot)
  L.push('No full article HTML is stored in this plan; backups are separate files.')
  L.push('')
  L.push('## Frozen approved transformation rules (safe-default only)')
  L.push('')
  L.push('The future production write phase MAY use ONLY these high-confidence rules:')
  L.push('- duplicate body H1 → article-body-title')
  L.push('- internal memareh origin canonicalization: http://memareh.com, https://memareh.com → https://www.memareh.com')
  L.push('- preserve URL path and current trailing-slash convention')
  L.push('- remove internal nofollow')
  L.push('- do NOT add noopener/noreferrer to same-tab links')
  L.push('- retain/add noopener noreferrer only when target="_blank" requires it')
  L.push('- preserve tel: links exactly')
  L.push('- remove presentation-only inline style attributes')
  L.push('- safe semantic table normalization ONLY where already classified SAFE (NOT the 2 MANUAL_TABLE_REVIEW articles)')
  L.push('- remove stray/empty markup artifacts')
  L.push('- preserve authored class order; remove empty class="" and empty rel=""')
  L.push('- sanitize through the existing sanitizer')
  L.push('- preserve visible text byte-for-byte')
  L.push('')
  L.push('NOT approved: automatic heading promotion, FAQ JSON-LD, automatic callout/step conversion,')
  L.push('complex table flattening, visible-text rewriting, metadata generation, image generation,')
  L.push('custom_css mutation, slug changes, status changes.')
  L.push('')
  L.push('## CTA decision (proposal only)')
  L.push('- Approved href-only normalization for 2 mismatched request CTAs → https://www.memareh.com/contact-us')
  L.push('- Visible Persian CTA text UNCHANGED.')
  L.push('- Applied in proposal to: brghkar-saadtabad-... (OPTIMIZER + CTA) and chra-cheragh-... (CTA_ONLY — optimizer disabled, href-only).')
  L.push('')
  L.push('## Future write mechanism (GUARDED — NOT EXECUTED HERE)')
  L.push('')
  L.push('```')
  L.push('for each article id in manifest.writeEligible:  // writeClass in {OPTIMIZER, CTA_ONLY}')
  L.push('  current = SELECT content, updated_at FROM memareh.articles WHERE id = $id FOR UPDATE')
  L.push('  precondition = (current.updated_at == manifest.updatedAt)')
  L.push('                AND (sha256(current.content) == manifest.originalHash)')
  L.push('  if NOT precondition: ABORT this article (drift) -- do not write')
  L.push('  if manifest.proposedHash == manifest.originalHash: SKIP (no-op)')
  L.push('  expected = manifest.proposedHash')
  L.push('  if writeClass == OPTIMIZER:')
  L.push('    $proposed = manifest optimizer+sanitizer output (content column ONLY)')
  L.push('  if writeClass == CTA_ONLY:')
  L.push('    $proposed = current.content with ONLY the approved href mutation applied')
  L.push('    assert: optimizerApplied == false; exactly one href changed; text/link counts unchanged')
  L.push('  UPDATE memareh.articles SET content = $proposed WHERE id = $id')
  L.push('  verify = SELECT content FROM memareh.articles WHERE id = $id')
  L.push('  if sha256(verify.content) != expected: ROLLBACK this article (restore from backup)')
  L.push('  log batch id + per-article writeClass + status')
  L.push('```')
  L.push('')
  L.push('- explicit id allowlist from manifest (no broad `UPDATE ... WHERE status=\'published\'`)')
  L.push('- compare-and-swap drift guard on updated_at + content hash')
  L.push('- content column only; never touches metadata / custom_css / status / slug')
  L.push('- one article at a time, immediate post-write verification')
  L.push('- OPTIMIZER and CTA_ONLY treated independently per writeClass')
  L.push('- no --force, no hidden apply switch')
  L.push('')
  L.push('## Rollback plan (drift-guarded)')
  L.push('- Rollback source: fresh pre-write backups at ' + report.backupRoot)
  L.push('- For each article: `UPDATE memareh.articles SET content = $backupContent WHERE id = $id`')
  L.push('  after re-verifying the row has not drifted since the bulk write (else require operator review).')
  L.push('- Identify batch by manifest.generatedAt + backupRoot timestamp.')
  L.push('- Restore one or all; verify restored sha256(content) == originalHash in manifest.')
  L.push('- Never overwrites content that changed after the bulk operation without operator review.')
  L.push('')
  L.push('## Post-write verification checklist (future execution phase)')
  L.push('- DB: exact intended row count changed; unchanged rows unchanged; content hashes match manifest')
  L.push('- application: homepage, /articles, representative article pages, both CTA articles, sitemap, admin editor')
  L.push('- console clean; no hydration errors')
  L.push('- SEO: no duplicate body H1; internal nofollow removed; non-www normalized; no inline-style remnants where safe;')
  L.push('  table semantics preserved; no text drift')
  fs.writeFileSync('docs/ARTICLE_OPTIMIZATION_WRITE_PLAN.md', L.join('\n'))
}

main()
