import { describe, it, expect } from 'vitest';
import { classify, norm } from '../scripts/vercel-ignore-build.cjs';

describe('vercel-ignore-build classifier', () => {
  it('normalizes paths (backslashes -> forward slashes)', () => {
    expect(norm('supabase\\PUBLIC_ARTICLES_SOAK.md')).toBe('supabase/PUBLIC_ARTICLES_SOAK.md');
    expect(norm('./docs/foo.md')).toBe('docs/foo.md');
  });

  it('Case A — docs-only => SKIP (exit 0)', () => {
    const r = classify(['supabase/PUBLIC_ARTICLES_SOAK.md']);
    expect(r.skip).toBe(true);
  });

  it('Case B — audit docs + README => SKIP', () => {
    const r = classify(['supabase/PUBLIC_ARTICLES_AUDIT.md', 'README.md']);
    expect(r.skip).toBe(true);
  });

  it('Case C — runtime code => BUILD', () => {
    const r = classify(['src/app/articles/page.tsx']);
    expect(r.skip).toBe(false);
  });

  it('Case D — package.json => BUILD', () => {
    const r = classify(['package.json']);
    expect(r.skip).toBe(false);
  });

  it('Case E — lockfile => BUILD', () => {
    const r = classify(['pnpm-lock.yaml']);
    expect(r.skip).toBe(false);
  });

  it('Case F — supabase migration => BUILD', () => {
    const r = classify(['supabase/migrations/20260809030000_remove_legacy_public_articles.sql']);
    expect(r.skip).toBe(false);
  });

  it('Case G — mixed docs + runtime => BUILD', () => {
    const r = classify(['supabase/PUBLIC_ARTICLES_SOAK.md', 'src/app/sitemap.ts']);
    expect(r.skip).toBe(false);
  });

  it('Case H — unknown file => BUILD', () => {
    const r = classify(['something-new.xyz']);
    expect(r.skip).toBe(false);
  });

  it('Case I — empty/ambiguous => BUILD (fail-safe)', () => {
    const r = classify([]);
    expect(r.skip).toBe(false);
  });

  it('extension-only markdown outside allowlist => BUILD (defense in depth)', () => {
    // A hypothetical markdown not explicitly listed must not skip.
    const r = classify(['src/content/foo.md']);
    expect(r.skip).toBe(false);
  });

  it('docs/ directory is allowlisted => SKIP', () => {
    const r = classify(['docs/BOOKING_INTEGRATION.md']);
    expect(r.skip).toBe(true);
  });

  it('the ignore script itself changing => BUILD', () => {
    const r = classify(['scripts/vercel-ignore-build.cjs']);
    expect(r.skip).toBe(false);
  });

  it('vercel.json changing => BUILD', () => {
    const r = classify(['vercel.json']);
    expect(r.skip).toBe(false);
  });
});
