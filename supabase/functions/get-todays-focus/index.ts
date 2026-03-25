/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const OVERDUE_DAYS = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all KOLs with agency info
    const { data: kols, error: kolError } = await supabase
      .from("kols")
      .select("*");

    if (kolError) throw kolError;

    const { data: agencies, error: agencyError } = await supabase
      .from("agencies")
      .select("*");

    if (agencyError) throw agencyError;

    const agencyMap = new Map(agencies.map((a: any) => [a.id, a.name]));
    const now = new Date();

    const STAGE_LABELS: Record<string, string> = {
      writing_idea: "Idea",
      writing_script: "Script",
      creating_project: "Project",
      video_production: "Video",
      pre_publish: "Pre-publish Confirmation",
      published: "Published",
    };

    function getDaysWaiting(stageUpdatedAt: string): number {
      const diff = now.getTime() - new Date(stageUpdatedAt).getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    function isOverdue(stageUpdatedAt: string): boolean {
      return getDaysWaiting(stageUpdatedAt) > OVERDUE_DAYS;
    }

    // Focus KOLs: overdue (not published) or manually flagged
    const focusKols = kols
      .filter(
        (kol: any) =>
          kol.current_stage !== "pre_publish" &&
          (kol.is_todays_focus ||
            (isOverdue(kol.stage_updated_at) && kol.current_stage !== "published"))
      )
      .map((kol: any) => ({
        id: kol.id,
        name: kol.name,
        platforms: kol.platforms,
        stage: STAGE_LABELS[kol.current_stage] || kol.current_stage,
        stageKey: kol.current_stage,
        daysWaiting: getDaysWaiting(kol.stage_updated_at),
        isOverdue: isOverdue(kol.stage_updated_at) && kol.current_stage !== "published",
        isFlagged: kol.is_todays_focus,
        agency: agencyMap.get(kol.agency_id) || "Unknown",
        scriptVersion: kol.script_version,
        scriptComplete: kol.script_complete,
        projectComplete: kol.project_complete,
        videoVersion: kol.video_version,
      }));

    // Pre-publish KOLs
    const prePublishKols = kols
      .filter((kol: any) => kol.current_stage === "pre_publish")
      .map((kol: any) => ({
        id: kol.id,
        name: kol.name,
        platforms: kol.platforms,
        daysWaiting: getDaysWaiting(kol.stage_updated_at),
        isOverdue: isOverdue(kol.stage_updated_at),
        agency: agencyMap.get(kol.agency_id) || "Unknown",
        scriptVersion: kol.script_version,
        videoVersion: kol.video_version,
        feishuUrl: kol.feishu_url || null,
      }));

    // Stage breakdown
    const stageCounts: Record<string, number> = {};
    for (const kol of kols) {
      const stage = kol.current_stage;
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    }

    const stageBreakdown = Object.entries(stageCounts).map(([key, count]) => ({
      stage: STAGE_LABELS[key] || key,
      stageKey: key,
      count,
    }));

    const overdueCount = kols.filter(
      (kol: any) => isOverdue(kol.stage_updated_at) && kol.current_stage !== "published"
    ).length;

    const response = {
      summary: {
        total: kols.length,
        overdueCount,
        focusCount: focusKols.length,
        prePublishCount: prePublishKols.length,
        stages: stageBreakdown,
      },
      focusKols,
      prePublishKols,
      generatedAt: now.toISOString(),
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
