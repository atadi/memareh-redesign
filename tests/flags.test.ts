/* eslint-disable @typescript-eslint/no-unused-expressions */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { isEnabled } from '../src/lib/flags';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('flags: isEnabled', () => {
  it('returns false for a missing / unset flag', () => {
    // Ensure no env var for this flag exists.
    delete process.env.NEXT_PUBLIC_FEATURE_MYDEMOMODAL;
    // @ts-expect-error passing a deliberately invalid (undefined) argument
    expect(isEnabled(void 0)).toBe(false);
    expect(isEnabled(null)).toBe(false);
    expect(isEnabled('')).toBe(false);
    expect(isEnabled('  ')).toBe(false);
  });

  it('returns true only when the env value is exactly "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'true');
    expect(isEnabled('myDemoModal')).toBe(true);
  });

  it('returns false for truthy-like values ("1", "yes", "on", "TRUE")', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', '1');
    expect(isEnabled('myDemoModal')).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'yes');
    expect(isEnabled('myDemoModal')).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'on');
    expect(isEnabled('myDemoModal')).toBe(false);

    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'TRUE');
    expect(isEnabled('myDemoModal')).toBe(false);
  });

  it('return false for any value other than exactly "true"', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'TRUE');
    expect(isEnabled('myDemoModal')).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'false');
    expect(isEnabled('myDemoModal')).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'no');
    expect(isEnabled('myDemoModal')).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'off');
    expect(isEnabled('myDemoModal')).toBe(false);
  });

  it('uppercases the feature name for env lookup (case-insensitive)', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'true');
    expect(isEnabled('mydemomodal')).toBe(true);
    expect(isEnabled('MyDemoModal')).toBe(true);
    expect(isEnabled('MYDEMOMODAL')).toBe(true);
  });

  it('isolates flags via prefix (different names are independent)', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_A', 'true');
    vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_B', 'false');
    expect(isEnabled('flag_a')).toBe(true);
    expect(isEnabled('flag_b')).toBe(false);
  });

  it('trims whitespace from the feature name before lookup', () => {
    vi.stubEnv('NEXT_PUBLIC_FEATURE_MYDEMOMODAL', 'true');
    expect(isEnabled('  myDemoModal  ')).toBe(true);
  });

  it('returns false for undefined / null feature argument', () => {
    // @ts-expect-error testing undefined
    expect(isEnabled(void 0)).toBe(false);
    // @ts-expect-error testing null
    expect(isEnabled(null)).toBe(false);
  });
});
