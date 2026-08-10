import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    // Authorization/RLS regression suite.
    // By default these tests run against a *live* Supabase project using the
    // real Postgres RLS engine (claims-based impersonation, fully rolled back).
    // Authorization/RLS regression suite. The non-RLS admin-route contract test
    // (tests/api/admin-users-route.test.ts) imports Next.js server-only modules
    // and is exercised by `tsc --noEmit` + `next build` instead (see its header).
    include: ['tests/rls/**/*.test.ts'],
    environment: 'node',
    // These tests hit a *shared* live database. Running files in parallel would
    // let one file's afterAll cleanup delete fixtures another file's tests rely
    // on, so force sequential file execution.
    fileParallelism: false,
    pool: 'forks',
  },
})
