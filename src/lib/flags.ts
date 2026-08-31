/**
 * Feature flags — opt-in runtime feature toggles read from
 * `NEXT_PUBLIC_FEATURE_<FLAG>` environment variables.
 *
 * This module is SAFE TO IMPORT FROM CLIENT COMPONENTS: it only reads
 * `NEXT_PUBLIC_*` variables (inlined into the browser bundle by Next.js)
 * and never touches server-only secrets.
 *
 * Convention:
 *   - Enable feature `foo` by setting `NEXT_PUBLIC_FEATURE_FOO=true`.
 *   - The only recognized enabled value is the exact string `"true"`.
 *     Any other value (including `"1"`, `"yes"`, `"on"`, `"TRUE"`) is
 *     treated as disabled to avoid truthy-string ambiguity.
 *   - A feature name is uppercased and prefixed, so flags are isolated
 *     from one another (no accidental collisions).
 *   - A missing / unset variable means the feature is OFF by default.
 *
 * Rationale: a single small helper keeps experimental UI (e.g. the Modal
 * component from Slice 7) behind a runtime gate without adding a flag
 * library dependency.
 */
export function isEnabled(feature: string): boolean {
  if (!feature || feature.trim().length === 0) {
    return false
  }
  const key = `NEXT_PUBLIC_FEATURE_${feature.trim().toUpperCase()}`
  return process.env[key] === 'true'
}
