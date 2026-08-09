// Derive the admin authorization role for UI purposes from a Supabase user.
//
// IMPORTANT: This is UI-convenience only. The authoritative check is the server
// guard `assertIsAdmin` (src/lib/admin/guard.ts), which also reads
// `app_metadata.role`. Both read the SAME source so the UI never disagrees with
// the server, but server enforcement is never bypassed by this helper.
//
// No `server-only` import — this module is safe in client components because it
// only inspects an already-resolved user object; it never reads secrets or calls
// privileged APIs.

type UserLike = {
  // Allow both our narrow shape and Supabase's User (whose app_metadata is a
  // loosely-typed record). We only ever read `app_metadata.role`.
  app_metadata?: { role?: unknown } | Record<string, unknown> | null
} | null | undefined

/**
 * Return true when the resolved user is an admin.
 * Mirrors `assertIsAdmin`'s `app_metadata.role === 'admin'` check.
 */
export function isAdminUser(user: UserLike): boolean {
  const role = user?.app_metadata?.role
  return role === 'admin'
}
