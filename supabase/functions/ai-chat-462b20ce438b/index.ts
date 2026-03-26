import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Tool Definitions
// ============================================================
const TOOLS = [
  {
    name: "list_kols",
    description: "List KOLs with optional filters. Use to answer questions about KOL status, overdue items, today's focus, stage distribution, etc.",
    input_schema: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          enum: ["writing_idea", "writing_script", "creating_project", "video_production", "pre_publish", "published"],
          description: "Filter by current workflow stage",
        },
        agency_id: { type: "string", description: "Filter by agency UUID" },
        overdue_only: { type: "boolean", description: "Only return KOLs stuck in their stage for more than 2 days" },
        is_todays_focus: { type: "boolean", description: "Only return KOLs marked as today's focus" },
        platform: {
          type: "string",
          enum: ["youtube", "tiktok", "instagram", "x", "facebook"],
          description: "Filter by platform",
        },
      },
    },
  },
  {
    name: "get_kol_details",
    description: "Get full details of a specific KOL by name or ID, including recent change history. Use when user asks about a specific person.",
    input_schema: {
      type: "object",
      properties: {
        kol_name: { type: "string", description: "Partial or full KOL name (case-insensitive search)" },
        kol_id: { type: "string", description: "KOL UUID" },
      },
    },
  },
  {
    name: "update_kol_stage",
    description: "Move a KOL to a new workflow stage. Automatically logs the change. Moving to pre_publish also marks as today's focus. Moving to published sets the publish timestamp.",
    input_schema: {
      type: "object",
      properties: {
        kol_id: { type: "string", description: "KOL UUID" },
        new_stage: {
          type: "string",
          enum: ["writing_idea", "writing_script", "creating_project", "video_production", "pre_publish", "published"],
          description: "The target stage",
        },
        note: { type: "string", description: "Optional reason for the stage change" },
      },
      required: ["kol_id", "new_stage"],
    },
  },
  {
    name: "toggle_todays_focus",
    description: "Mark or unmark a KOL as today's focus.",
    input_schema: {
      type: "object",
      properties: {
        kol_id: { type: "string", description: "KOL UUID" },
        is_focus: { type: "boolean", description: "true to mark as focus, false to unmark" },
      },
      required: ["kol_id", "is_focus"],
    },
  },
  {
    name: "get_summary",
    description: "Get statistics summary: KOL count per stage, overdue count, published count. Optionally filtered by agency.",
    input_schema: {
      type: "object",
      properties: {
        agency_id: { type: "string", description: "Filter by agency UUID. Omit for all agencies." },
      },
    },
  },
];

// ============================================================
// Tool Execution
// ============================================================
// deno-lint-ignore no-explicit-any
async function executeTool(name: string, input: Record<string, unknown>, supabase: any): Promise<unknown> {
  switch (name) {
    case "list_kols": return execListKols(input, supabase);
    case "get_kol_details": return execGetKolDetails(input, supabase);
    case "update_kol_stage": return execUpdateKolStage(input, supabase);
    case "toggle_todays_focus": return execToggleTodaysFocus(input, supabase);
    case "get_summary": return execGetSummary(input, supabase);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// deno-lint-ignore no-explicit-any
async function execListKols(input: Record<string, unknown>, supabase: any) {
  let query = supabase
    .from("kols")
    .select("id, name, platforms, current_stage, is_todays_focus, stage_updated_at, agencies(name)");

  if (input.stage) query = query.eq("current_stage", input.stage);
  if (input.agency_id) query = query.eq("agency_id", input.agency_id);
  if (input.is_todays_focus === true) query = query.eq("is_todays_focus", true);
  if (input.platform) query = query.contains("platforms", [input.platform]);
  if (input.overdue_only === true) {
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    query = query.lt("stage_updated_at", cutoff).neq("current_stage", "published");
  }

  const { data, error } = await query.order("stage_updated_at");
  if (error) return { error: error.message };

  const now = Date.now();
  // deno-lint-ignore no-explicit-any
  return (data || []).map((k: any) => ({
    id: k.id,
    name: k.name,
    stage: k.current_stage,
    agency: k.agencies?.name || "Unknown",
    days_in_stage: Math.floor((now - new Date(k.stage_updated_at).getTime()) / (1000 * 60 * 60 * 24)),
    platforms: k.platforms,
    is_todays_focus: k.is_todays_focus,
  }));
}

// deno-lint-ignore no-explicit-any
async function execGetKolDetails(input: Record<string, unknown>, supabase: any) {
  if (!input.kol_id && !input.kol_name) return { error: "Provide either kol_id or kol_name" };

  let query = supabase.from("kols").select("*, agencies(name)");
  if (input.kol_id) {
    query = query.eq("id", input.kol_id);
  } else {
    query = query.ilike("name", `%${input.kol_name}%`);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "KOL not found" };

  const { data: logs } = await supabase
    .from("change_log")
    .select("*")
    .eq("kol_id", data.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const now = Date.now();
  return {
    id: data.id,
    name: data.name,
    platforms: data.platforms,
    stage: data.current_stage,
    agency: data.agencies?.name,
    days_in_stage: Math.floor((now - new Date(data.stage_updated_at).getTime()) / (1000 * 60 * 60 * 24)),
    script_version: data.script_version,
    script_complete: data.script_complete,
    video_version: data.video_version,
    is_todays_focus: data.is_todays_focus,
    notes: data.notes,
    profile_url: data.profile_url,
    content_direction: data.content_direction,
    // deno-lint-ignore no-explicit-any
    recent_changes: (logs || []).map((l: any) => ({
      from: l.from_stage,
      to: l.to_stage,
      note: l.note,
      date: l.created_at,
    })),
  };
}

// deno-lint-ignore no-explicit-any
async function execUpdateKolStage(input: Record<string, unknown>, supabase: any) {
  const { kol_id, new_stage, note } = input;

  const { data: current } = await supabase
    .from("kols")
    .select("name, current_stage")
    .eq("id", kol_id)
    .maybeSingle();
  if (!current) return { error: "KOL not found" };

  const updates: Record<string, unknown> = {
    current_stage: new_stage,
    stage_updated_at: new Date().toISOString(),
  };
  if (new_stage === "pre_publish") updates.is_todays_focus = true;
  if (new_stage === "published") updates.published_at = new Date().toISOString();

  const { error } = await supabase.from("kols").update(updates).eq("id", kol_id);
  if (error) return { error: error.message };

  await supabase.from("change_log").insert({
    kol_id,
    from_stage: current.current_stage,
    to_stage: new_stage,
    note: note || null,
  });

  return {
    success: true,
    kol_name: current.name,
    from_stage: current.current_stage,
    to_stage: new_stage,
  };
}

// deno-lint-ignore no-explicit-any
async function execToggleTodaysFocus(input: Record<string, unknown>, supabase: any) {
  const { kol_id, is_focus } = input;

  const { data: kol } = await supabase.from("kols").select("name").eq("id", kol_id).maybeSingle();
  if (!kol) return { error: "KOL not found" };

  const { error } = await supabase.from("kols").update({ is_todays_focus: is_focus }).eq("id", kol_id);
  if (error) return { error: error.message };

  return { success: true, kol_name: kol.name, is_todays_focus: is_focus };
}

// deno-lint-ignore no-explicit-any
async function execGetSummary(input: Record<string, unknown>, supabase: any) {
  let query = supabase.from("kols").select("current_stage, stage_updated_at");
  if (input.agency_id) query = query.eq("agency_id", input.agency_id);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const kols = data || [];
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const byStage: Record<string, number> = {};
  let overdueCount = 0;
  let publishedCount = 0;

  // deno-lint-ignore no-explicit-any
  for (const k of kols as any[]) {
    byStage[k.current_stage] = (byStage[k.current_stage] || 0) + 1;
    if (k.current_stage === "published") publishedCount++;
    if (k.current_stage !== "published" && k.stage_updated_at < cutoff) overdueCount++;
  }

  return {
    total: kols.length,
    by_stage: byStage,
    overdue_count: overdueCount,
    published_count: publishedCount,
  };
}

// ============================================================
// Tool Summary for UI
// ============================================================
function buildToolSummary(name: string, result: unknown): string {
  if (result && typeof result === "object" && "error" in result) {
    return `Error: ${(result as { error: string }).error}`;
  }
  switch (name) {
    case "list_kols": {
      const arr = result as unknown[];
      return `Found ${arr.length} KOL${arr.length !== 1 ? "s" : ""}`;
    }
    case "get_kol_details": {
      const r = result as { name?: string };
      return r.name ? `Got details for ${r.name}` : "Not found";
    }
    case "update_kol_stage": {
      const r = result as { kol_name?: string; to_stage?: string };
      return r.kol_name ? `Updated ${r.kol_name} → ${r.to_stage}` : "Failed";
    }
    case "toggle_todays_focus": {
      const r = result as { kol_name?: string; is_todays_focus?: boolean };
      return r.kol_name ? `${r.is_todays_focus ? "Marked" : "Unmarked"} ${r.kol_name}` : "Failed";
    }
    case "get_summary": {
      const r = result as { total?: number; overdue_count?: number };
      return `Total ${r.total} KOLs, ${r.overdue_count} overdue`;
    }
    default:
      return "Done";
  }
}

// ============================================================
// Model Call Helper
// ============================================================
async function callModel(
  messages: unknown[],
  stream: boolean,
  apiToken: string,
  model: string,
): Promise<Response> {
  return fetch("https://api.enter.pro/code/api/v1/ai/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOLS,
      tool_choice: { type: "auto" },
      stream,
      max_tokens: 4096,
    }),
  });
}

// ============================================================
// Main Handler
// ============================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_462b20ce438b");
    if (!AI_API_TOKEN) throw new Error("AI_API_TOKEN is not configured");

    const { messages, model, saveToKb, fileName, fileContent } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save file to KB if requested
    if (saveToKb && fileContent && fileName) {
      const title = fileName.replace(/\.[^/.]+$/, "");
      const { error: insertError } = await supabase.from("knowledge_base").insert({
        title,
        content: fileContent,
        file_type: fileName.split(".").pop()?.toLowerCase() || "txt",
      });
      if (insertError) console.error("Failed to save to knowledge base:", insertError);
      else console.log(`Saved "${title}" to knowledge base`);
    }

    // Fetch KB entries
    const { data: kbEntries } = await supabase
      .from("knowledge_base")
      .select("title, content")
      .order("created_at");

    // Build system prompt
    let systemPrompt = `You are an intelligent AI agent for a KOL (Key Opinion Leader) marketing campaign management system. You can answer questions AND take direct actions by calling your tools.

You have the following tools available — USE THEM whenever relevant:

1. list_kols — Query KOL list with optional filters (stage, agency, overdue, platform, today's focus)
2. get_kol_details — Get full details of a specific KOL by name or ID, including recent change history
3. update_kol_stage — Move a KOL to a new workflow stage (automatically logs the change)
4. toggle_todays_focus — Mark or unmark a KOL as today's focus
5. get_summary — Get statistics: count per stage, overdue count, published count

CRITICAL RULES:
- NEVER say you don't have tools, can't access data, or are a "pure knowledge assistant"
- ALWAYS call a tool when the user asks about KOL status, data, or requests an action
- Use tools to get accurate live data — do not guess or make up information
- After completing write operations, confirm what was done
- Always respond in the same language as the user's message
- Be concise and professional`;

    if (saveToKb && fileContent && fileName) {
      systemPrompt += `\n\nIMPORTANT: The user just uploaded a file named "${fileName}" and it has been automatically saved to the knowledge base. Confirm that the document has been saved and provide a brief summary of key points.`;
    }

    if (kbEntries && kbEntries.length > 0) {
      const kbText = kbEntries
        // deno-lint-ignore no-explicit-any
        .map((entry: any) => `## ${entry.title}\n${entry.content}`)
        .join("\n\n");
      systemPrompt += `\n\nBrand Knowledge Base:\n\n${kbText}`;
    }

    const systemPair = [
      { role: "user", content: systemPrompt },
      {
        role: "assistant",
        content:
          "Understood. I have 5 tools available (list_kols, get_kol_details, update_kol_stage, toggle_todays_focus, get_summary) to query and manage KOL data in real time. I will always use them when needed. How can I help?",
      },
    ];

    const selectedModel = model || "anthropic/claude-sonnet-4.5";

    // Stream response to client
    const responseStream = new ReadableStream({
      async start(controller) {
        const emit = (data: unknown) => {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          let conversationMessages = [...systemPair, ...messages];
          const MAX_ITERATIONS = 5;

          for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
            // Non-streaming call to check for tool use
            const response = await callModel(conversationMessages, false, AI_API_TOKEN, selectedModel);

            if (!response.ok) {
              const text = await response.text();
              let errorMessage = "AI service error";
              let errorCode = "api_error";
              const dataMatch = text.match(/data: (.+)/);
              if (dataMatch) {
                try {
                  const errorData = JSON.parse(dataMatch[1]);
                  errorMessage = errorData.error?.message || errorMessage;
                  errorCode = errorData.error?.type || errorCode;
                } catch { /* use defaults */ }
              }
              emit({ type: "error", error: { type: errorCode, message: errorMessage } });
              controller.close();
              return;
            }

            // deno-lint-ignore no-explicit-any
            const result: any = await response.json();
            const content = result.content || [];
            const stopReason = result.stop_reason;

            // deno-lint-ignore no-explicit-any
            const toolUseBlocks = content.filter((b: any) => b.type === "tool_use");

            if (stopReason === "tool_use" && toolUseBlocks.length > 0) {
              // Execute each tool and emit progress events
              const toolResults = [];
              // deno-lint-ignore no-explicit-any
              for (const block of toolUseBlocks as any[]) {
                emit({ type: "tool_start", name: block.name, input: block.input });
                const toolResult = await executeTool(block.name, block.input, supabase);
                const summary = buildToolSummary(block.name, toolResult);
                emit({ type: "tool_done", name: block.name, summary });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(toolResult),
                });
              }

              // Append assistant + tool results to conversation
              conversationMessages = [
                ...conversationMessages,
                { role: "assistant", content },
                { role: "user", content: toolResults },
              ];
              continue;
            }

            // No tool use — stream the final response
            const streamResponse = await callModel(
              conversationMessages,
              true,
              AI_API_TOKEN,
              selectedModel,
            );

            if (!streamResponse.ok || !streamResponse.body) {
              emit({ type: "error", error: { type: "api_error", message: "Streaming failed" } });
              controller.close();
              return;
            }

            const reader = streamResponse.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            break;
          }
        } catch (err) {
          // deno-lint-ignore no-explicit-any
          emit({ type: "error", error: { type: "api_error", message: (err as any).message || "Unknown error" } });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    // deno-lint-ignore no-explicit-any
    const errorSSE = `data: ${JSON.stringify({ type: "error", error: { type: "api_error", message: (error as any).message } })}\n\n`;
    return new Response(errorSSE, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }
});
