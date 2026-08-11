// Built-runtime jsdom-absence check (run AFTER `pnpm run build`).
//
// Verifies the production server bundle does NOT require jsdom (the dependency
// that crashed article ISR regeneration with ERR_REQUIRE_ESM via
// html-encoding-sniffer -> @exodus/bytes). The sanitizer now uses the pure-JS
// `sanitize-html`, so a clean build must contain no jsdom / isomorphic-dompurify
// reference in the compiled server output.
const fs = require('fs')
const path = require('path')

const serverDir = path.join(process.cwd(), '.next', 'server')
if (!fs.existsSync(serverDir)) {
  console.error('[jsdom-check] .next/server not found — run `pnpm run build` first')
  process.exit(2)
}

const forbidden = [
  /[\\/]node_modules[\\/]jsdom[\\/]/,
  /[\\/]node_modules[\\/]isomorphic-dompurify[\\/]/,
  /[\\/]node_modules[\\/]html-encoding-sniffer[\\/]/,
  /from ['"]jsdom['"]/,
  /require\(['"]jsdom['"]\)/,
  /isomorphic-dompurify/,
]

let hits = 0
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(p)
      continue
    }
    if (!/\.(js|mjs|cjs)$/.test(ent.name)) continue
    const src = fs.readFileSync(p, 'utf-8')
    for (const re of forbidden) {
      if (re.test(src)) {
        hits++
        if (hits <= 8) console.error('[jsdom-check] forbidden reference in', path.relative(process.cwd(), p), '->', re)
        break
      }
    }
  }
}
walk(serverDir)

if (hits > 0) {
  console.error(`[jsdom-check] FAIL: ${hits} jsdom/isomorphic-dompurify references found in built server output`)
  process.exit(1)
}
console.log('[jsdom-check] PASS: no jsdom / isomorphic-dompurify references in built server output')
process.exit(0)
