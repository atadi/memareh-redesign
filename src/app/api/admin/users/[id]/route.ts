export const runtime = "nodejs";

import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ THIS IS THE FIX
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const display_name = String(body?.display_name ?? "").trim();

    if (display_name.length < 2 || display_name.length > 80) {
      return NextResponse.json(
        { error: "Display name must be 2–80 characters" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { data, error } =
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { display_name },
      });

    if (error) {
      console.error("Supabase admin error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.user.id,
      display_name:
        (data.user.user_metadata as any)?.display_name ?? "",
    });
  } catch (err) {
    console.error("PATCH crashed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
