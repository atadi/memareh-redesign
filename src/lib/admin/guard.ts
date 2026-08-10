// Roll back changes to use public schema instead of memareh
// for admin and auth-related functions

import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabasePublishableKey } from "@/lib/config";

export async function assertIsAdmin() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new Error("Unauthorized");
  }

  const role = (data.user.app_metadata as any)?.role;

  if (role !== "admin") {
    throw new Error("Forbidden");
  }

  return data.user;
}
