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

  return NextResponse.json({
    users: data.users.map((u) => ({
      id: u.id,
      email: u.email,
      display_name: (u.user_metadata as any)?.display_name ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
  });
}
