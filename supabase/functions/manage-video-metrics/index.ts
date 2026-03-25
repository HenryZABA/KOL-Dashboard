import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

const VALID_PLATFORMS = ["youtube", "tiktok", "instagram", "x", "facebook"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── GET ──
    if (req.method === "GET") {
      const url = new URL(req.url);
      const kolId = url.searchParams.get("kol_id");
      const latest = url.searchParams.get("latest");

      if (latest === "true") {
        // Get latest metric per kol+platform using distinct on
        const { data, error: err } = await supabase
          .rpc("get_latest_metrics")
          .select("*");

        if (err) {
          // Fallback: just get all ordered by recorded_at desc
          let query = supabase
            .from("video_metrics")
            .select("*")
            .order("recorded_at", { ascending: false });
          if (kolId) query = query.eq("kol_id", kolId);
          const { data: fallback, error: err2 } = await query;
          if (err2) return error(err2.message, 500);
          return json(fallback);
        }
        return json(data);
      }

      let query = supabase
        .from("video_metrics")
        .select("*")
        .order("recorded_at", { ascending: true });
      if (kolId) query = query.eq("kol_id", kolId);
      const { data, error: err } = await query;
      if (err) return error(err.message, 500);
      return json(data);
    }

    const body = await req.json().catch(() => null);
    if (!body) return error("Invalid JSON body");

    // ── POST (Create) ──
    if (req.method === "POST") {
      // Support single or batch insert
      const items = Array.isArray(body) ? body : [body];
      const inserts = [];

      for (const item of items) {
        const { kol_id, platform, views, likes, comments, shares, recorded_at } = item;
        if (!kol_id || !platform) {
          return error("Missing required fields: kol_id, platform");
        }
        if (!VALID_PLATFORMS.includes(platform)) {
          return error(`Invalid platform. Valid: ${VALID_PLATFORMS.join(", ")}`);
        }
        inserts.push({
          kol_id,
          platform,
          views: views || 0,
          likes: likes || 0,
          comments: comments || 0,
          shares: shares || 0,
          recorded_at: recorded_at || new Date().toISOString(),
        });
      }

      const { data: inserted, error: err } = await supabase
        .from("video_metrics")
        .insert(inserts)
        .select();
      if (err) return error(err.message, 500);
      return json(inserted, 201);
    }

    // ── DELETE ──
    if (req.method === "DELETE") {
      const { id, kol_id } = body;
      if (id) {
        const { error: err } = await supabase.from("video_metrics").delete().eq("id", id);
        if (err) return error(err.message, 500);
        return json({ success: true, deleted_id: id });
      }
      if (kol_id) {
        const { error: err } = await supabase.from("video_metrics").delete().eq("kol_id", kol_id);
        if (err) return error(err.message, 500);
        return json({ success: true, deleted_kol_id: kol_id });
      }
      return error("Missing required field: id or kol_id");
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error("manage-video-metrics error:", e);
    return error("Internal server error", 500);
  }
});
