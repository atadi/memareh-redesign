# Contributing to Memareh Redesign

## Getting started

1. Clone the repo and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase + site values. **Never commit real secrets.**
3. Run the dev server:
   ```bash
   pnpm dev --webpack
   ```

See `docs/setup.md` for full local setup, Supabase MCP usage, and CI workflow.

## Prerequisites

- Node.js 22+, pnpm 10.
- Git.
- A Supabase project with the credentials configured in `.env.local`.

## Development workflow

1. Create a feature branch from `master`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes. Keep commits small and descriptive. The project uses
   conventional commit-style messages (e.g. `fix:`, `refactor:`, `feat:`, `chore:`, `perf:`, `ui:`, `accessibility:`, `ci:`).
3. Run the checks locally before pushing:
   ```bash
   pnpm lint && pnpm exec tsc --noEmit && pnpm test:unit && pnpm run build && node scripts/check-no-jsdom.cjs
   ```
4. Push and open a pull request. CI runs on every push and PR:
   - lint
   - type check
   - unit tests
   - production build
   - no-jsdom check

## Code style

- TypeScript strict mode. Prefer explicit types for public APIs.
- Tailwind utility-first CSS for new UI; no CSS-in-JS unless a specific need arises.
- Keep server-only code (e.g. privileged Supabase operations) out of client components. Two Supabase variable classes exist: public (`NEXT_PUBLIC_*`) and server-only. Never put a privileged key in a `NEXT_PUBLIC_*` variable.
- Use the consolidated Supabase factory (`src/lib/supabase/factory.ts`) instead of ad-hoc client creation.
- Prefer `src/lib/flags.ts` (`isEnabled(flag)`) for runtime opt-in feature flags; set them via `NEXT_PUBLIC_FEATURE_<FLAG>=true` in `.env.local`.

## Testing

- Add unit tests for new/modified logic under `tests/` (or the appropriate subfolder).
- The unit suite (`pnpm test:unit`) is fast, dependency-free, and runs in a pure Node environment. It excludes the live-Supabase RLS suite and the API suite.
- The live RLS + API suites live under `tests/rls/` and `tests/api/`. They require a live Supabase connection and are gated by `SUPABASE_RLS_TEST_MODE=1`. Use them only when you have a configured environment.
- Do not introduce `jsdom` into the unit suite — the project enforces a no-jsdom guarantee via `scripts/check-no-jsdom.cjs`.

## Commit messages

Use descriptive, scoped messages. Examples:

- `fix: describe what broke and what you fixed`
- `refactor: describe what changed structurally`
- `feat: describe the new capability`
- `chore: describe maintenance/tooling/doc changes`
- `perf: describe the performance improvement`
- `accessibility: describe the a11y improvement`
- `ui: describe the UI change`

## Pull requests

- Keep PRs focused: one logical change per PR where practical.
- Reference the relevant issue or audit finding where applicable.
- Make sure CI is green before requesting review.
- For changes touching authentication, authorization, Supabase keys, CSP, or observability, flag them for an extra security review.

## Documentation

- Update `docs/` and `README.md` when behavior, configuration, deployment, or architecture changes.
- For new environment variables or changed contracts, update `.env.example`, `docs/setup.md`, and `docs/VERCEL_DEPLOYMENT.md`.
- Keep the implementation plan under `.hermes/plans/` in sync with major changes.

## Security

- Never commit secrets, tokens, passwords, or connection strings. Replace with `[REDACTED]` in examples.
- Treat all user-controlled input and external responses as untrusted.
- Supabase RLS and policies are part of the authorization model; application-level checks supplement them, not replace them.
- Report security issues privately per the project's internal process. Do not open public issues for suspected security bugs.

## Questions

For setup or environment questions, see `docs/setup.md` and `docs/VERCEL_DEPLOYMENT.md`. For architectural questions, see `docs/MASTER_ARCHITECTURE_AUDIT.md` and the implementation plan under `.hermes/plans/`.
