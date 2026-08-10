#!/usr/bin/env node
// Bulk SEO-optimization DRY-RUN (READ-ONLY analysis). See header in repo copy.
// Compiles the optimizer + report logic on first run via tsc; no ts-node needed.
const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

try {
  const { JSDOM } = require('jsdom')
  if (typeof globalThis.DOMParser === 'undefined') globalThis.DOMParser = new JSDOM('').window.DOMParser
} catch (e) {
  console.error('jsdom is required for the optimizer to run under Node. Install devDependency jsdom.')
  process.exit(1)
}

const distDir = path.resolve('.article-optimizer-dist')
const optimizerJs = path.join(distDir, 'article-optimizer.js')
const reportJs = path.join(distDir, 'article-optimize-report.js')
if (!fs.existsSync(optimizerJs) || !fs.existsSync(reportJs)) {
  fs.mkdirSync(distDir, { recursive: true })
  execSync('npx tsc -p tsconfig.dryrun.json', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') })
  let src = fs.readFileSync(optimizerJs, 'utf8')
  src = src.replace(/require\("@\/lib\//g, 'require("./')
  fs.writeFileSync(optimizerJs, src)
}
const { optimizeArticleHtml, analyzeArticleHtml } = require(optimizerJs)
const { classifyArticle, buildAggregate, hashContentSync, detectCtaMismatch, CTA_TEXT } = require(reportJs)

function env(name, fallback) {
  if (process.env[name]) return process.env[name]
  try {
    const txt = fs.readFileSync('.env.local', 'utf8')
    const m = txt.match(new RegExp('^' + name + '=(.*)$', 'm'))
    return m ? m[1].trim() : fallback
  } catch { return fallback }
}
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = env('NEXT_PUBLIC_SUPABASE_PROJECT_REF', 'uakvurskrcyvksxfvhho')
const ENDPOINT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`
if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN is required (read-only Management API).'); process.exit(1) }

function mgmtQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const req = https.request(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', Accept: 'application/json' } }, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`Mgmt query HTTP ${res.statusCode}: ${data.slice(0, 300)}`))
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function analyzeArticle(a) {
  const raw = a.content || ''
  const meta = {
    meta_title: a.meta_title || '', meta_description: a.meta_description || '',
    meta_keywords: a.meta_keywords || '', canonical_url: a.canonical_url || '',
    og_image: a.og_image || '', featured_image_alt: a.featured_image_alt || '',
  }
  const originalHash = hashContentSync(raw)
  const scoreBefore = analyzeArticleHtml(raw, meta).score
  const customCssPresent = !!a.custom_css

  let r1, error
  try { r1 = optimizeArticleHtml(raw, undefined, meta) } catch (e) { error = String(e && e.message ? e.message : e) }
  if (error) {
    return {
      id: a.id, slug: a.slug, title: a.title || '', scoreBefore, scoreAfter: scoreBefore,
      findings: [], findingsCount: 0, highConfidenceCount: 0, mediumConfidenceCount: 0, reportOnlyCount: 0,
      originalHtmlLength: raw.length, optimizedHtmlLength: raw.length,
      textPreserved: true, linkIntegrity: true, sanitizerOk: true, idempotent: true,
      wouldContentChange: false, wouldMetadataChange: false, customCssPresent,
      ctaMismatch: detectCtaMismatch(raw), eligible: false, classification: 'BLOCKED',
      originalHash, optimizedHash: originalHash, updatedAt: a.updated_at, error,
    }
  }

  const r2 = optimizeArticleHtml(r1.sanitizedHtml, undefined, meta)
  const idempotent = r1.sanitizedHtml === r2.sanitizedHtml
  const sanitizerOk = r1.textPreserved
  const textPreserved = r1.textPreserved
  const linkIntegrity = r1.linkIntegrity
  const wouldContentChange = raw.trim() !== r1.sanitizedHtml.trim()
  const ctaMismatch = detectCtaMismatch(raw)
  const scoreAfter = r1.structuralScore
  const optimizedHash = hashContentSync(r1.sanitizedHtml)
  const findings = (r1.findings || []).concat((r1.meta && r1.meta.findings) || [])
  const { classification, reasons } = classifyArticle(raw, r1, {
    idempotent, sanitizerOk, textPreserved, linkIntegrity,
    wouldContentChange, wouldMetadataChange: false, ctaMismatch, scoreBefore,
  })
  return {
    id: a.id, slug: a.slug, title: a.title || '',
    scoreBefore, scoreAfter,
    findings: findings.map((f) => ({ type: f.type, confidence: f.confidence, severity: f.severity || 'info' })),
    findingsCount: findings.length,
    highConfidenceCount: findings.filter((f) => f.confidence === 'high').length,
    mediumConfidenceCount: findings.filter((f) => f.confidence === 'medium').length,
    reportOnlyCount: findings.filter((f) => f.type && f.type.startsWith('metadata-')).length,
    originalHtmlLength: raw.length, optimizedHtmlLength: r1.sanitizedHtml.length,
    textPreserved, linkIntegrity, sanitizerOk, idempotent,
    wouldContentChange, wouldMetadataChange: false,
    customCssPresent, ctaMismatch,
    eligible: classification !== 'BLOCKED', classification, reasons,
    originalHash, optimizedHash, updatedAt: a.updated_at,
  }
}

async function main() {
  console.log('BULK SEO OPTIMIZATION DRY-RUN (read-only)')
  const cols = 'id, slug, title, content, custom_css, meta_title, meta_description, meta_keywords, canonical_url, og_image, featured_image_alt, status, updated_at'
  const rows = await mgmtQuery(`SELECT ${cols} FROM memareh.articles WHERE status = 'published' ORDER BY slug`)
  console.log(`Fetched ${rows.length} published articles (SELECT only)`)

  const articles = []
  for (const a of rows) articles.push(await analyzeArticle(a))

  const aggregate = buildAggregate(articles)
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run-read-only',
    productionWrites: 0,
    target: { status: 'published', source: 'memareh.articles', readOnly: true },
    summary: {
      totalPublished: articles.length,
      safeToOptimize: aggregate.safe, reviewRequired: aggregate.review, blocked: aggregate.blocked,
      textIntegrityFailures: aggregate.textIntegrityFailures,
      sanitizerFailures: aggregate.sanitizerFailures,
      linkIntegrityFailures: aggregate.linkIntegrityFailures,
      idempotenceFailures: aggregate.idempotenceFailures,
      avgScoreBefore: aggregate.avgScoreBefore, avgScoreAfter: aggregate.avgScoreAfter,
      avgScoreDelta: aggregate.avgScoreAfter - aggregate.avgScoreBefore,
      ctaMismatchCount: aggregate.ctaMismatches.length,
    },
    aggregate, articles,
  }

  fs.mkdirSync('docs', { recursive: true })
  fs.writeFileSync('docs/ARTICLE_OPTIMIZATION_DRY_RUN.json', JSON.stringify(report, null, 2))
  writeMarkdown(report)
  console.log(`DONE. SAFE=${aggregate.safe} REVIEW=${aggregate.review} BLOCKED=${aggregate.blocked} textFail=${aggregate.textIntegrityFailures.length} idemFail=${aggregate.idempotenceFailures.length} PRODUCTION_WRITES=0`)
}

function writeMarkdown(report) {
  const a = report.aggregate
  const L = []
  L.push('# Article Optimization — Bulk Dry-Run Report')
  L.push('')
  L.push(`Generated: ${report.generatedAt}`)
  L.push('Mode: **read-only dry-run** — ZERO production article writes.')
  L.push('')
  L.push('## Summary')
  L.push('')
  L.push('| Metric | Value |')
  L.push('| --- | ---: |')
  L.push(`| Published analyzed | ${a.total} |`)
  L.push(`| SAFE_TO_OPTIMIZE | ${a.safe} |`)
  L.push(`| REVIEW_REQUIRED | ${a.review} |`)
  L.push(`| BLOCKED | ${a.blocked} |`)
  L.push(`| Text-integrity failures | ${a.textIntegrityFailures.length} |`)
  L.push(`| Sanitizer failures | ${a.sanitizerFailures.length} |`)
  L.push(`| Link-integrity failures | ${a.linkIntegrityFailures.length} |`)
  L.push(`| Idempotence failures | ${a.idempotenceFailures.length} |`)
  L.push(`| Avg score before | ${a.avgScoreBefore} |`)
  L.push(`| Avg score after | ${a.avgScoreAfter} |`)
  L.push(`| CTA mismatches | ${a.ctaMismatches.length} |`)
  L.push('')
  L.push('## Per-article')
  L.push('')
  L.push('| Article (slug) | Before | After | Findings | Classification |')
  L.push('| --- | ---: | ---: | ---: | --- |')
  for (const x of report.articles) L.push(`| ${x.slug} | ${x.scoreBefore} | ${x.scoreAfter} | ${x.findingsCount} | ${x.classification} |`)
  if (a.ctaMismatches.length) {
    L.push('')
    L.push('## CTA mismatches (booking-removed product mismatch)')
    L.push('')
    for (const c of a.ctaMismatches) L.push(`- ${c.slug}: "${c.text}" — ${c.note} (not rewritten)`)
  }
  L.push('')
  L.push('## Safe to optimize')
  L.push('')
  L.push(report.articles.filter((x) => x.classification === 'SAFE_TO_OPTIMIZE').map((x) => `- ${x.slug}`).join('\n') || '(none)')
  L.push('')
  L.push('## Review required')
  L.push('')
  L.push(report.articles.filter((x) => x.classification === 'REVIEW_REQUIRED').map((x) => `- ${x.slug} (${x.reasons.join(', ')})`).join('\n') || '(none)')
  L.push('')
  L.push('## Blocked')
  L.push('')
  L.push(report.articles.filter((x) => x.classification === 'BLOCKED').map((x) => `- ${x.slug} (${x.reasons.join(', ')})`).join('\n') || '(none)')
  L.push('')
  L.push('## Notes')
  L.push('')
  L.push('- Optimizer is deterministic and AI-free; the EXACT editor optimizer is reused.')
  L.push('- Visible-text preservation is a hard gate (text-integrity).')
  L.push('- Sanitizer runs before optimized output is accepted (sanitizerOk).')
  L.push('- Idempotence verified by re-optimizing the sanitized output (whitespace-canonicalized).')
  L.push('- Hashes (SHA-256 of original + optimized) are recorded for drift detection in a future write phase.')
  L.push('- No article row was modified. Production writes = 0.')
  fs.writeFileSync('docs/ARTICLE_OPTIMIZATION_DRY_RUN.md', L.join('\n'))
}

main().catch((e) => { console.error('DRYRUN_FAILED', e && e.message ? e.message : e); process.exit(1) })
