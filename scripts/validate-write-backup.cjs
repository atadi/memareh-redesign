// Independent backup validation (read-only). Confirms each backup file:
//  - parses back, id present, slug matches a live slug
//  - content SHA-256 matches the LIVE production content
//  - UTF-8 valid (no U+FFFD)
// Run after build-write-plan.cjs.
const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')

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
const BASE = env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https:\/\//, '')
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

function getArticles() {
  return new Promise((resolve, reject) => {
    const cols = 'id,slug,content'
    const p = `/rest/v1/articles?select=${encodeURIComponent(cols)}&status=eq.published&order=slug.asc`
    const req = https.get(`https://${BASE}${p}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Accept-Profile': 'memareh' } }, (res) => {
      const d = []
      res.on('data', (c) => d.push(c))
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode))
        try { resolve(JSON.parse(Buffer.concat(d).toString('utf8'))) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject); req.end()
  })
}

;(async () => {
  const plan = JSON.parse(fs.readFileSync('docs/ARTICLE_OPTIMIZATION_WRITE_PLAN.json', 'utf8'))
  const live = await getArticles()
  const liveBySlug = new Map(live.map((a) => [a.slug, a]))
  const liveById = new Map(live.map((a) => [a.id, a]))
  const backupRoot = plan.backupRoot

  let checked = 0, idMismatch = 0, slugMismatch = 0, hashMismatch = 0, utf8Bad = 0, truncated = 0
  const ids = new Set()
  for (const m of plan.plan) {
    const bf = path.join(backupRoot, `${m.slug}.json`)
    if (!fs.existsSync(bf)) { console.log('MISSING BACKUP', m.slug); continue }
    const obj = JSON.parse(fs.readFileSync(bf, 'utf8'))
    checked++
    if (ids.has(obj.id)) console.log('DUPLICATE ID', obj.id); ids.add(obj.id)
    if (obj.id !== m.id) idMismatch++
    const liveA = liveById.get(obj.id)
    if (!liveA) { slugMismatch++; console.log('NO LIVE ROW', obj.slug); continue }
    if (liveA.slug !== obj.slug) slugMismatch++
    const liveHash = crypto.createHash('sha256').update(liveA.content, 'utf8').digest('hex')
    const backupHash = crypto.createHash('sha256').update(obj.content, 'utf8').digest('hex')
    if (liveHash !== backupHash) { hashMismatch++; console.log('HASH MISMATCH', obj.slug) }
    if (obj.content.includes('�')) utf8Bad++
    if (obj.content.length === 0) truncated++
  }
  console.log(`VALIDATED ${checked}/${plan.backupCount} backups`)
  console.log(`idMismatch=${idMismatch} slugMismatch=${slugMismatch} hashMismatch=${hashMismatch} utf8Bad=${utf8Bad} truncated=${truncated}`)
  console.log('unique ids:', ids.size)
  const ok = idMismatch === 0 && slugMismatch === 0 && hashMismatch === 0 && utf8Bad === 0 && truncated === 0 && checked === plan.backupCount && ids.size === plan.backupCount
  console.log(ok ? 'BACKUP_VALIDATION_PASS' : 'BACKUP_VALIDATION_FAIL')
  process.exit(ok ? 0 : 1)
})().catch((e) => { console.error('VALIDATE_FAILED', e && e.message ? e.message : e); process.exit(1) })
