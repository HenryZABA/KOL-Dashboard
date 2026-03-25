import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
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

const VALID_STAGES = [
  "writing_idea",
  "writing_script",
  "creating_project",
  "video_production",
  "pre_publish",
  "published",
];

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
      const id = url.searchParams.get("id");
      const agencyId = url.searchParams.get("agency_id");

      if (id) {
        const { data, error: err } = await supabase
          .from("kols")
          .select("*, change_log(*)")
          .eq("id", id)
          .maybeSingle();
        if (err) return error(err.message, 500);
        if (!data) return error("KOL not found", 404);
        return json(data);
      }

      let query = supabase
        .from("kols")
        .select("*, change_log(*)")
        .order("created_at");
      if (agencyId) query = query.eq("agency_id", agencyId);
      const { data, error: err } = await query;
      if (err) return error(err.message, 500);
      return json(data);
    }

    // Parse body for POST / PATCH / DELETE
    const body = await req.json().catch(() => null);
    if (!body) return error("Invalid JSON body");

    // ── POST (Create) ──
    if (req.method === "POST") {
      const { name, platforms, agency_id } = body;
      if (!name || !platforms || !agency_id) {
        return error("Missing required fields: name, platforms, agency_id");
      }
      if (!Array.isArray(platforms) || !platforms.every((p: string) => VALID_PLATFORMS.includes(p))) {
        return error(`Invalid platforms. Valid: ${VALID_PLATFORMS.join(", ")}`);
      }

      const stage = body.current_stage || "writing_idea";
      if (!VALID_STAGES.includes(stage)) {
        return error(`Invalid stage. Valid: ${VALID_STAGES.join(", ")}`);
      }

      const insertData: Record<string, unknown> = {
        name,
        platforms,
        agency_id,
        current_stage: stage,
      };
      if (body.profile_url !== undefined) insertData.profile_url = body.profile_url;
      if (body.content_direction !== undefined) insertData.content_direction = body.content_direction;
      if (body.notes !== undefined) insertData.notes = body.notes;
      if (body.feishu_url !== undefined) insertData.feishu_url = body.feishu_url;
      if (body.is_todays_focus !== undefined) insertData.is_todays_focus = body.is_todays_focus;
      if (body.stage_links !== undefined) insertData.stage_links = body.stage_links;

      // Auto-flag pre_publish
      if (stage === "pre_publish") insertData.is_todays_focus = true;
      if (stage === "published") insertData.published_at = new Date().toISOString();

      const { data: inserted, error: err } = await supabase
        .from("kols")
        .insert(insertData)
        .select()
        .single();
      if (err) return error(err.message, 500);

      // Insert initial change_log
      await supabase.from("change_log").insert({
        kol_id: inserted.id,
        from_stage: null,
        to_stage: stage,
      });

      return json(inserted, 201);
    }

    // ── PATCH (Update) ──
    if (req.method === "PATCH") {
      const { id, ...fields } = body;
      if (!id) return error("Missing required field: id");

      // Get current KOL for stage change detection
      const { data: current, error: fetchErr } = await supabase
        .from("kols")
        .select("current_stage")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) return error(fetchErr.message, 500);
      if (!current) return error("KOL not found", 404);

      const dbUpdates: Record<string, unknown> = {};

      // Map allowed fields
      const fieldMap: Record<string, string> = {
        name: "name",
        platforms: "platforms",
        profile_url: "profile_url",
        content_direction: "content_direction",
        notes: "notes",
        current_stage: "current_stage",
        script_version: "script_version",
        script_complete: "script_complete",
        project_complete: "project_complete",
        video_version: "video_version",
        feishu_url: "feishu_url",
        is_todays_focus: "is_todays_focus",
        stage_links: "stage_links",
        agency_id: "agency_id",
      };

      for (const [key, dbCol] of Object.entries(fieldMap)) {
        if (fields[key] !== undefined) {
          dbUpdates[dbCol] = fields[key];
        }
      }

      // Validate stage
      if (dbUpdates.current_stage && !VALID_STAGES.includes(dbUpdates.current_stage as string)) {
        return error(`Invalid stage. Valid: ${VALID_STAGES.join(", ")}`);
      }

      // Validate platforms
      if (dbUpdates.platforms) {
        const p = dbUpdates.platforms as string[];
        if (!Array.isArray(p) || !p.every((v) => VALID_PLATFORMS.includes(v))) {
          return error(`Invalid platforms. Valid: ${VALID_PLATFORMS.join(", ")}`);
        }
      }

      if (Object.keys(dbUpdates).length === 0) {
        return error("No valid fields to update");
      }

      // Stage change logic
      const newStage = dbUpdates.current_stage as string | undefined;
      if (newStage && newStage !== current.current_stage) {
        dbUpdates.stage_updated_at = new Date().toISOString();
        if (newStage === "pre_publish") {
          dbUpdates.is_todays_focus = true;
        }
        if (newStage === "published") {
          dbUpdates.published_at = new Date().toISOString();
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from("kols")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();
      if (updateErr) return error(updateErr.message, 500);

      // Insert change_log if stage changed
      if (newStage && newStage !== current.current_stage) {
        await supabase.from("change_log").insert({
          kol_id: id,
          from_stage: current.current_stage,
          to_stage: newStage,
        });
      }

      return json(updated);
    }

    // ── DELETE ──
    if (req.method === "DELETE") {
      const { id } = body;
      if (!id) return error("Missing required field: id");

      // Delete change_log first (if no cascade)
      await supabase.from("change_log").delete().eq("kol_id", id);
      const { error: delErr } = await supabase.from("kols").delete().eq("id", id);
      if (delErr) return error(delErr.message, 500);

      return json({ success: true, deleted_id: id });
    }

    return error("Method not allowed", 405);
  } catch (e) {
    console.error("manage-kols error:", e);
    return error("Internal server error", 500);
  }
});
