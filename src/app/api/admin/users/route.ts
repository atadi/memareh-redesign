import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { assertIsAdmin } from "@/lib/admin/guard";

export async function GET() {
  await assertIsAdmin();

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = data.users.map((u) => u.id);

  // Fetch public profiles (source of truth for display names)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.display_name]),
  );

  return NextResponse.json({
    users: data.users.map((u) => ({
      id: u.id,
      email: u.email,
      display_name:
        profileMap[u.id] ?? (u.user_metadata as any)?.display_name ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
  });
}
