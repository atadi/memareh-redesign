import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // 👈 THIS IS THE FIX

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL loaded:", Boolean(supabaseUrl));
console.log("SERVICE_ROLE loaded:", Boolean(serviceKey));

if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

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
