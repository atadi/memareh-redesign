# Local Setup

This document covers how to run the project locally, configure Supabase via the MCP server, and run the CI workflow.

## Prerequisites

- **Node.js** 22 or later (matches the CI `node-version`).
- **pnpm** 10 (the package manager used throughout; `npm exec pnpm` or install globally).
- **Git** with the repository cloned.
- **Supabase** project access. The project's Supabase credentials reach the database through environment variables — see [Configuration](#configuration) below and `docs/VERCEL_DEPLOYMENT.md` for the deployed contract.

## Clone & install

```bash
git clone <repository-url> memareh-redesign
cd memareh-redesign
pnpm install
```

## Configuration

Copy the environment template and fill in real values. **Never commit real secrets.**

```bash
cp .env.example .env.local
```

Minimum required variables (see `.env.example` for the canonical contract and comments):

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL (public). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Supabase anon/publishable key. Safe in the browser bundle. |
| `NEXT_PUBLIC_SITE_URL` | Build + runtime | Canonical production origin, e.g. `https://www.memareh.com`. Preview deployments should set this to the production origin so previews never publish a preview URL as canonical SEO. |
| `SUPABASE_URL` | Server only | Privileged Supabase URL used by server-side/admin operations. |
| `SUPABASE_SECRET_KEY` | Server only | Privileged secret key. **Never** expose to the browser or commit. |
| `REVALIDATION_TOKEN` | Server only (optional) | Authorizes on-demand ISR revalidation via `/api/revalidate`. |

> **Security note:** The app has two classes of Supabase variables — public (`NEXT_PUBLIC_*`) and privileged (server-only). Privileged keys must never be placed in `NEXT_PUBLIC_*` variables. The 2026-08 incident originated from exactly this mistake; see `docs/INCIDENT_SUPABASE_KEY_EXPOSURE.md`.

For local development only, you may leave `NEXT_PUBLIC_SITE_URL` empty — the app falls back to `http://localhost:3000` in non-production. In production it is required and the app fails fast if absent.

## Running locally

### Development server (webpack)

```bash
pnpm dev --webpack
```

The project ships a `--webpack` default because the Turbopack dev server requires Windows symlink privileges (`SeCreateSymbolicLinkPrivilege`) that the operator account lacks. See `docs/VERCEL_DEPLOYMENT.md` and `.agents/skills/next-dev-loop/references/turbopack-windows-symlink-panic.md` for the full diagnosis. Production builds (`pnpm build`) are unaffected and do not use symlinks.

Open [http://localhost:3000](http://localhost:3000).

> **Windows stale-lock tip:** if `next dev` fails with `Unable to acquire lock at .next/dev/lock`, a detached `node.exe` from a previous run is still holding the lock. Fix: `taskkill /IM node.exe /F`, then `Remove-Item .next/dev/lock -Force`, then restart `pnpm dev --webpack`.

### Type checking

```bash
pnpm exec tsc --noEmit
```

### Linting + formatting

```bash
pnpm lint
pnpm format
```

### Unit tests (fast, dependency-free, runs anywhere)

```bash
pnpm test:unit
```

The unit suite runs in a pure Node environment, excludes the live-Supabase RLS suite (`tests/rls/**`) and the API tests (`tests/api/**`), and is intended to run on a developer machine with no local Supabase stack and in CI. When it runs, it reports a conventional pass/fail summary.

### Full default test runner (includes RLS + API suites)

```bash
pnpm test
```

This runs **all** `tests/**` including the live-Supabase RLS suite (`tests/rls/**`) and the API tests (`tests/api/**`). Those suites require a live Supabase connection and are environment-gated: set `SUPABASE_RLS_TEST_MODE=1` (and the appropriate Supabase credentials) before running them. They will refuse to run — and may emit a "Jest worker" style message — when the environment isn't configured. For everyday development and CI use `pnpm test:unit` instead.

### Production build

```bash
pnpm run build
pnpm start
```

## Supabase via MCP

The project is configured to talk to Supabase through the repository's Supabase MCP integration. For day-to-day development you do **not** need to start a local Supabase stack — the app reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from `.env.local` and the server-side privileged operations read `SUPABASE_URL` / `SUPABASE_SECRET_KEY`.

The MCP server is primarily used for verified, audited database operations (migrations, type generation, storage config, project inspection) by operators. To use it:

1. Ensure the local environment variables in `.env.local` point at the intended Supabase project.
2. In the Hermes desktop agent, use the Supabase MCP tools (e.g. `mcp__supabase__list_tables`, `mcp__supabase__execute_sql`, `mcp__supabase__generate_typescript_types`, `mcp__supabase__apply_migration`, `mcp__supabase__deploy_edge_function`, etc.) when you need to inspect or mutate the remote project.
3. As an operator safety rule: do **not** run MCP operations against the production project unless you have explicit confirmation. Prefer preview deployments for changes.

## CI workflow

The repository ships a GitHub Actions CI workflow at `.github/workflows/ci.yml` that runs on every push and pull request:

1. Checkout the code.
2. Set up Node 22 with pnpm caching.
3. Install dependencies with `pnpm install --frozen-lockfile`.
4. Lint (`pnpm lint`).
5. Type check (`pnpm exec tsc --noEmit`).
6. Unit tests (`pnpm test:unit`).
7. Production build (`pnpm run build`).
8. No-jsdom check (`node scripts/check-no-jsdom.cjs`).

The workflow blocks any push that fails lint, type check, unit tests, or the no-jsdom check. To run the same checks locally before pushing:

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm test:unit && pnpm run build && node scripts/check-no-jsdom.cjs
```

## Troubleshooting

- **`Unable to acquire lock at .next/dev/lock`** — a detached `node.exe` is holding the lock. Run `taskkill /IM node.exe /F` (PowerShell) or `taskkill /IM node.exe /F` (git-bash/MSYS), then `Remove-Item .next/dev/lock -Force` (PowerShell) or `rm -f .next/dev/lock` (git-bash), then restart `pnpm dev --webpack`.
- **`Jest worker encountered N child process exceptions`** — in the dev server this is a stale Vitest overlay from a crashed `pnpm test` run in another terminal, not a Next.js runtime error. The article routes serve HTTP 200 with valid content. Use `pnpm test:unit` instead of `pnpm test` for everyday testing.
- **Turbopack dev panic (os error 1314)** — on Windows, `next dev --turbopack` can crash trying to create a symlink into the pnpm store because the operator account lacks `SeCreateSymbolicLinkPrivilege`. Use `pnpm dev --webpack` instead. See `.agents/skills/next-dev-loop/references/turbopack-windows-symlink-panic.md`.
- **CSP `EvalError` in dev** — the project gates the Content Security Policy by environment: strict in production, relaxed in dev (adds `'unsafe-eval'` scoped to localhost so webpack HMR works). If you see `EvalError: 'unsafe-eval' is not an allowed source` in dev, confirm the dev server is using the `devSecurityHeaders` from `src/lib/security-headers.ts` (selected when `NODE_ENV !== 'production'`).
- **Feature flags** — the project exposes a small `isEnabled(flag)` helper in `src/lib/flags.ts`. Enable a flag at runtime by setting `NEXT_PUBLIC_FEATURE_<FLAG>=true` in `.env.local`. Only the exact string `"true"` enables a flag; everything else (including `"1"`, `"yes"`, `"on"`, `"TRUE"`) is treated as disabled. See `src/lib/flags.ts` for the full contract and `tests/flags.test.ts` for the test suite.
