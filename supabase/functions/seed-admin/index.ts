import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin@123";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check if account exists
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);

    let userId: string;
    let created = false;
    if (existing) {
      userId = existing.id;
      // Ensure password matches and email is confirmed
      await admin.auth.admin.updateUserById(userId, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: "Admin" },
      });
      if (createErr) throw createErr;
      userId = createRes.user!.id;
      created = true;
    }

    // Ensure admin role exists (handle_new_user trigger should already do this, but be defensive)
    const { data: roles } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) {
      await admin.from("user_roles").insert({ user_id: userId, role: "admin" });
    }

    return new Response(
      JSON.stringify({ ok: true, created, email: ADMIN_EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("seed-admin error", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});