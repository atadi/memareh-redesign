// Vercel ignored-build decision script (repo-level deployment hygiene).
//
// Vercel semantics:
//   exit 0 => SKIP the build/deployment
//   exit 1 => PROCEED with the build/deployment
//
// SAFETY FIRST:
//   Default is BUILD. We only SKIP when we can PROVE EVERY changed file is a
//   non-runtime, documentation/audit-only artifact that cannot affect the Next.js
//   build or runtime. Any uncertainty, Git error, or unknown path => BUILD.
//
// Changed-file detection (production):
//   Prefer Vercel's VERCEL_GIT_PREVIOUS_SHA (covers multi-commit pushes),
//   otherwise fall back to HEAD^..HEAD. If detection fails or the diff is
//   empty/ambiguous, we BUILD (fail-safe).
//
// Test override (NOT used in production):
//   Set VERCEL_IGNORE_TEST_FILES="a b c" (space/newline/comma separated) or pass
//   --files="a b c". This injects an explicit file list so the classifier can be
//   tested deterministically without manufacturing Git commits. Production always
//   discovers files from Git; the override is ignored unless explicitly provided.

const { execSync } = require('child_process');
const path = require('path');

// Normalize to forward slashes for stable matching on Windows + Linux.
function norm(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

// Explicit ALWAYS-BUILD prefixes (force BUILD regardless of other rules).
// Anything not matched here AND not in the SKIP allowlist also forces BUILD.
const ALWAYS_BUILD_PREFIXES = [
  'src/',
  'app/',
  'pages/',
  'public/',
  'components/',
  'lib/',
  'tests/',
  'supabase/migrations/',
  'scripts/vercel-ignore-build.cjs', // changing the skip logic itself must build
  'vercel.json',
  'vercel.ts',
  'next.config.ts',
  'next.config.js',
  'next.config.mjs',
  'middleware.ts',
  'middleware.js',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'tsconfig.json',
  'tsconfig.*.json',
  '.env.example',
  '.env.local',
  '.npmrc',
  'postcss.config.',
  'tailwind.config.',
  'vitest.config.',
  'next-env.d.ts',
  'env.d.ts',
];

// Explicit SKIP allowlist (narrow). A changed file is eligible to skip ONLY if it
// matches one of these exact paths / prefixes. Anything else => BUILD.
const SKIP_ALLOW = [
  // Operational / audit documentation
  'supabase/PRODUCTION_BACKUP_RUNBOOK.md',
  'supabase/PUBLIC_ARTICLES_AUDIT.md',
  'supabase/PUBLIC_ARTICLES_AUTHOR_TAGS.md',
  'supabase/PUBLIC_ARTICLES_DEPENDENCY.md',
  'supabase/PUBLIC_ARTICLES_RETIREMENT.md',
  'supabase/PUBLIC_ARTICLES_ROWS.md',
  'supabase/PUBLIC_ARTICLES_SCHEMA_MAP.md',
  'supabase/PUBLIC_ARTICLES_SLUG_SEO.md',
  'supabase/PUBLIC_ARTICLES_SOAK.md',
  'supabase/SCHEMA_BASELINE.md',
  // General docs
  'README.md',
  'docs/',
  // Read-only operational/audit scripts (verified NOT imported by Next build)
  'scripts/check-public-articles-soak.cjs',
  'scripts/audit-public-articles.cjs',
  'scripts/analyze-audit.cjs',
  'scripts/gen-audit-artifacts.cjs',
];

function matchesAny(file, list) {
  return list.some((entry) => {
    if (entry.endsWith('/')) return file.startsWith(entry);
    return file === entry;
  });
}

// Pure classifier. Returns { skip, reason }.
function classify(files) {
  if (!files || files.length === 0) {
    // No changed files detected. In production this means we couldn't identify the
    // delta, so we must BUILD (fail-safe).
    return { skip: false, reason: 'no changed files detected (ambiguous) -> BUILD' };
  }
  for (const raw of files) {
    const file = norm(raw).trim();
    if (!file) continue;
    // 1) Always-build category?
    if (matchesAny(file, ALWAYS_BUILD_PREFIXES)) {
      return { skip: false, reason: `runtime/config/migration file changed: ${file}` };
    }
    // 2) Explicit skip allowlist?
    if (!matchesAny(file, SKIP_ALLOW)) {
      // Unknown / not explicitly allowlisted => must BUILD.
      return { skip: false, reason: `unknown or non-allowlisted file changed: ${file}` };
    }
  }
  return { skip: true, reason: 'documentation/audit-only changes (all files allowlisted)' };
}

function getChangedFiles() {
  // Test override (deterministic local testing only).
  if (process.env.VERCEL_IGNORE_TEST_FILES != null) {
    return process.env.VERCEL_IGNORE_TEST_FILES.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }
  const arg = process.argv.find((a) => a.startsWith('--files='));
  if (arg) {
    return arg.slice('--files='.length).split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }

  // Production: discover from Git.
  let base = process.env.VERCEL_GIT_PREVIOUS_SHA || null;
  let range;
  if (base) {
    range = `${base} HEAD`;
  } else {
    // Single-commit fallback. If shallow clone lacks HEAD^, execSync throws and we BUILD.
    range = 'HEAD^ HEAD';
  }
  let out;
  try {
    out = execSync(`git diff --name-only ${range}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    // Git error => fail-safe BUILD.
    throw new Error('git diff failed');
  }
  const lines = out.split('\n').map((s) => s.trim()).filter(Boolean);
  return lines;
}

function main() {
  let files;
  try {
    files = getChangedFiles();
  } catch (e) {
    console.log('Vercel build required: git comparison failed (fail-safe) -> BUILD');
    process.exit(1);
  }
  const { skip, reason } = classify(files);
  if (skip) {
    console.log(`Vercel build skipped: ${reason}`);
    process.exit(0);
  }
  console.log(`Vercel build required: ${reason}`);
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { classify, norm, matchesAny };
