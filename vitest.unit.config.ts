import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Unit / contract suite (pure Node, no database).
 *
 * The default `vitest.config.ts` is dedicated to the live-Supabase RLS suite,
 * which is environment-gated and refuses to run without
 * SUPABASE_RLS_TEST_MODE=1. These fast, dependency-free tests are kept in a
 * separate project so `pnpm test:unit` can run them anywhere, including CI and
 * a developer machine with no local Supabase stack.
 *
 * tests/api/admin-users-route.test.ts is excluded on purpose: it imports
 * Next.js `server-only` modules that cannot resolve outside a Next build. It is
 * covered by `tsc --noEmit` + `next build` instead (see its header).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    include: ['tests/*.test.ts'],
    exclude: ['tests/rls/**', 'tests/api/**'],
    environment: 'node',
    setupFiles: ['tests/setup/dom-parser.ts'],
  },
})
