# Memareh Redesign

معماره — خدمات ساختمان و مشاوره وپیرو، Next.js 16 + React 19 + TypeScript + Tailwind CSS، با پشت‌پایه Supabase و استقرار روی Vercel.

## Badges

![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)
![Coverage](https://img.shields.io/badge/coverage-unit%20suite-informational)

>badges

- **CI**: GitHub Actions workflow (`ci.yml`): lint, type check, unit tests, production build, no-jsdom check.
- **Testing**: `pnpm test:unit` runs fast dependency-free unit tests anywhere; `pnpm test` runs the full suite (needs a live Supabase, gated by `SUPABASE_RLS_TEST_MODE=1`).

## Getting Started

```bash
cp .env.example .env.local   # fill in real Supabase + site values; never commit secrets
pnpm install
pnpm dev --webpack           # dev server — see below re: websocket vs turbopack
```

Open [http://localhost:3000](http://localhost:3000).

> **Dev server note:** the project's `dev` script runs `next dev --webpack` (not Turbopack) because Turbopack's dev server hits a Windows symlink-privilege panic (`os error 1314`) on this machine. Production builds are unaffected. See `.hermes/plans/2026-08-30_142300-actionable-recommendations.md`, `docs/VERCEL_DEPLOYMENT.md`, and `.agents/skills/next-dev-loop/references/turbopack-windows-symlink-panic.md`.

## Project Structure

- **App**: Next.js App Router (`src/app/`), TypeScript, Tailwind CSS.
- **Pages**: home, articles, profile, admin panel, login/register.
- **Admin**: article/comment/category/content management UI.
- **Core libs**: `src/lib/supabase/` (consolidated Supabase clients via factory), `src/domain/articles/` (article business logic), `src/components/ui/` (design-system primitives: Button, Input, Modal).
- **Tooling**: TypeScript 5.9, ESLint flat config + Prettier, Vitest unit suite.

## Environment Variables

Two scopes exist:

- **Public (`NEXT_PUBLIC_*`)**: Supabase URL + publishable key, site origin. Safe in the browser bundle.
- **Server-only**: Supabase URL + secret key, revalidation token. Never expose to the client.

The full contract and security notes are in `.env.example` and `docs/setup.md`. See `docs/INCIDENT_SUPABASE_KEY_EXPOSURE.md` for the 2026-08 incident.

## Tests

```bash
pnpm test:unit     # fast unit suite — runs anywhere, no Supabase needed
pnpm test         # full suite incl. RLS + API — needs SUPABASE_RLS_TEST_MODE=1 + live Supabase
```

## Type Check / Lint / Build

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm run build
pnpm start
```

## Contributing

See `CONTRIBUTING.md`.

## Documentation

- `docs/setup.md` — local setup, Supabase MCP usage, CI workflow.
- `docs/VERCEL_DEPLOYMENT.md` — deployment triggers, hygiene, environment contract.
- `docs/MASTER_*.md` — architectural audits and remediation notes.
- `docs/SECURITY_*.md` — incident follow-ups and hardening notes.
- `.agents/skills/next-dev-loop/references/turbopack-windows-symlink-panic.md` — Windows Turbopack panic diagnosis.

## License

Internal use only.
