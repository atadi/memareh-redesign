import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // 👈 THIS IS THE FIX

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

console.log("SUPABASE_URL loaded:", Boolean(supabaseUrl));
console.log("SECRET_KEY loaded:", Boolean(secretKey));

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY");

const supabaseAdmin = createClient(supabaseUrl, secretKey);

const userId = "3bd2aeb1-4973-43dc-b18e-aae9e00e95f6";

const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { role: "admin" },
});

if (error) {
  console.error("Failed:", error);
  process.exit(1);
}

console.log("SUCCESS:", {
  id: data.user.id,
  email: data.user.email,
  app_metadata: data.user.app_metadata,
});
