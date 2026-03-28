import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── GET ── List all conversion records
    if (req.method === "GET") {
      const url = new URL(req.url);
      const kolId = url.searchParams.get("kol_id");

      let query = supabase.from("kol_conversions").select("*");
      if (kolId) query = query.eq("kol_id", kolId);

      const { data, error: err } = await query;
      if (err) return error(err.message, 500);
      return json(data);
    }

    // ── POST ── Upsert (create or update) conversion data
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return error("Invalid JSON body");

      const items = Array.isArray(body) ? body : [body];
      const upserts = [];

      for (const item of items) {
        const { kol_id, triggered_users, signups, paid_users } = item;
        if (!kol_id) return error("Missing required field: kol_id");

        upserts.push({
          kol_id,
          triggered_users: triggered_users ?? 0,
          signups: signups ?? 0,
          paid_users: paid_users ?? 0,
          updated_at: new Date().toISOString(),
        });
      }

      const { data: result, error: err } = await supabase
        .from("kol_conversions")
        .upsert(upserts, { onConflict: "kol_id" })
        .select();

      if (err) return error(err.message, 500);
      return json(result, 201);
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error("manage-kol-conversions error:", e);
    return error("Internal server error", 500);
  }
});
