import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── helpers ─────────────────────────────────────────── */
const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

const STAGE_LABELS: Record<string, string> = {
  writing_idea: "Idea",
  writing_script: "Script / Project",
  creating_project: "Project",
  video_production: "Video Production",
  pre_publish: "Pre-publish Confirmation",
  published: "Published",
};

/* ── tool implementations ────────────────────────────── */
async function listKols(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  let q = sb
    .from("kols")
    .select("id, name, current_stage, platforms, agency_id, is_todays_focus");
  if (args.agency_id) q = q.eq("agency_id", args.agency_id as string);
  if (args.stage) q = q.eq("current_stage", args.stage as string);
  const { data, error } = await q.order("created_at");
  if (error) return { error: error.message };
  return (data ?? []).map((k: Record<string, unknown>) => ({
    ...k,
    stage_label: STAGE_LABELS[k.current_stage as string] ?? k.current_stage,
  }));
}

async function getKolDetails(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("kols")
    .select("*")
    .eq("id", args.kol_id as string)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "KOL not found" };
  return {
    ...data,
    stage_label: STAGE_LABELS[data.current_stage] ?? data.current_stage,
  };
}

async function updateKolStage(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const newStage = args.stage as string;
  const updates: Record<string, unknown> = {
    current_stage: newStage,
    stage_updated_at: new Date().toISOString(),
  };
  if (newStage === "pre_publish") updates.is_todays_focus = true;
  if (newStage === "published") updates.published_at = new Date().toISOString();

  const { data, error } = await sb
    .from("kols")
    .update(updates)
    .eq("id", args.kol_id as string)
    .select("id, name, current_stage")
    .single();
  if (error) return { error: error.message };

  await sb.from("change_log").insert({
    kol_id: args.kol_id,
    from_stage: (args._prev_stage as string) ?? null,
    to_stage: newStage,
  });

  return { ...data, stage_label: STAGE_LABELS[newStage] ?? newStage };
}

async function toggleTodaysFocus(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const focused = (args.focused ?? true) as boolean;
  const { data, error } = await sb
    .from("kols")
    .update({ is_todays_focus: focused })
    .eq("id", args.kol_id as string)
    .select("id, name, is_todays_focus")
    .single();
  if (error) return { error: error.message };
  return data;
}

async function getSummary() {
  const sb = supabaseAdmin();
  const { data: kols } = await sb
    .from("kols")
    .select("current_stage, is_todays_focus");
  const stages: Record<string, number> = {};
  let focus = 0;
  (kols ?? []).forEach((k: Record<string, unknown>) => {
    const s = k.current_stage as string;
    stages[s] = (stages[s] ?? 0) + 1;
    if (k.is_todays_focus) focus++;
  });
  return { total: kols?.length ?? 0, by_stage: stages, todays_focus: focus };
}

const TOOLS: Record<
  string,
  (a: Record<string, unknown>) => Promise<unknown>
> = {
  list_kols: listKols,
  get_kol_details: getKolDetails,
  update_kol_stage: updateKolStage,
  toggle_todays_focus: toggleTodaysFocus,
  get_summary: getSummary,
};

const TOOL_DEFS = [
  {
    name: "list_kols",
    description:
      "List KOLs. Optional filters: agency_id (uuid), stage (writing_idea|writing_script|creating_project|video_production|pre_publish|published).",
    input_schema: {
      type: "object",
      properties: {
        agency_id: { type: "string" },
        stage: { type: "string" },
      },
    },
  },
  {
    name: "get_kol_details",
    description: "Get full details of a KOL by ID.",
    input_schema: {
      type: "object",
      properties: { kol_id: { type: "string" } },
      required: ["kol_id"],
    },
  },
  {
    name: "update_kol_stage",
    description:
      "Move a KOL to a new pipeline stage. Provide kol_id, stage, and optionally _prev_stage for logging.",
    input_schema: {
      type: "object",
      properties: {
        kol_id: { type: "string" },
        stage: { type: "string" },
        _prev_stage: { type: "string" },
      },
      required: ["kol_id", "stage"],
    },
  },
  {
    name: "toggle_todays_focus",
    description: "Set or unset a KOL as today's focus.",
    input_schema: {
      type: "object",
      properties: {
        kol_id: { type: "string" },
        focused: { type: "boolean" },
      },
      required: ["kol_id"],
    },
  },
  {
    name: "get_summary",
    description:
      "Get a summary of all KOLs: totals, counts per stage, today's focus count.",
    input_schema: { type: "object", properties: {} },
  },
];

/* ── main handler ────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const {
      messages: userMessages,
      model = "anthropic/claude-sonnet-4.5",
      saveToKb,
      fileName,
      fileContent,
    } = await req.json();

    /* ---- optional KB save ---- */
    if (saveToKb && fileContent && fileName) {
      const sb = supabaseAdmin();
      await sb
        .from("knowledge_base")
        .insert({ title: fileName, content: fileContent });
    }

    /* ---- build system prompt ---- */
    const sb = supabaseAdmin();
    const { data: kbRows } = await sb
      .from("knowledge_base")
      .select("title, content")
      .order("created_at", { ascending: false });

    let kbContext = "";
    if (kbRows?.length) {
      kbContext =
        "\n\n## Knowledge Base\n" +
        kbRows
          .map(
            (r: { title: string; content: string }) =>
              `### ${r.title}\n${r.content}`
          )
          .join("\n\n");
    }

    const systemPrompt = `You are a helpful KOL campaign assistant.${kbContext}

## Available tools
You have tools to query and update the KOL database. Use them when the user asks about KOL status, needs to change stages, or wants summaries. Always respond in the same language the user writes in.`;

    /* ---- conversation loop (stream: false for reliability) ---- */
    const apiToken = Deno.env.get("AI_API_TOKEN_462b20ce438b")!;
    const apiBase = "https://api.enter.pro/code/api/v1/ai";
    const loopMessages = [...userMessages];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(ctrl) {
        const send = (data: Record<string, unknown>) => {
          ctrl.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          for (let round = 0; round < 6; round++) {
            const isLast = round === 5;

            console.log(`[round ${round}] Calling AI API...`);

            const res = await fetch(`${apiBase}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                max_tokens: 4096,
                stream: false,
                system: systemPrompt,
                messages: loopMessages,
                ...(isLast ? {} : { tools: TOOL_DEFS }),
              }),
            });

            if (!res.ok) {
              const errText = await res.text();
              console.error(`API error ${res.status}:`, errText);
              let errMsg = `API error: ${res.status}`;
              try {
                const parsed = JSON.parse(errText);
                errMsg = parsed.error?.message || errMsg;
              } catch { /* use default */ }
              send({
                type: "error",
                error: { type: "api_error", message: errMsg },
              });
              ctrl.close();
              return;
            }

            const body = await res.json();
            console.log(`[round ${round}] stop_reason:`, body.stop_reason);

            /* Extract text and tool_use blocks from response */
            const textBlocks: string[] = [];
            const toolUseBlocks: Array<{
              id: string;
              name: string;
              input: Record<string, unknown>;
            }> = [];

            for (const block of body.content || []) {
              if (block.type === "text") {
                textBlocks.push(block.text);
              } else if (block.type === "tool_use") {
                toolUseBlocks.push({
                  id: block.id,
                  name: block.name,
                  input: block.input || {},
                });
              }
            }

            /* No tool calls → send text and finish */
            if (toolUseBlocks.length === 0 || isLast) {
              const fullText = textBlocks.join("\n");
              // Chunk text into pieces for streaming feel
              const CHUNK_SIZE = 15;
              for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
                send({
                  type: "text_delta",
                  text: fullText.slice(i, i + CHUNK_SIZE),
                });
              }
              send({ type: "done" });
              ctrl.close();
              return;
            }

            /* ---- Execute tools ---- */
            // Add assistant response to conversation
            loopMessages.push({ role: "assistant", content: body.content });

            const toolResults: unknown[] = [];
            for (const tb of toolUseBlocks) {
              send({ type: "tool_start", name: tb.name, input: tb.input });

              const fn = TOOLS[tb.name];
              let result: unknown = { error: "unknown tool" };
              if (fn) {
                try {
                  result = await fn(tb.input);
                } catch (e) {
                  result = { error: String(e) };
                }
              }

              const summary =
                typeof result === "object" &&
                result !== null &&
                "error" in (result as Record<string, unknown>)
                  ? `Error: ${(result as Record<string, unknown>).error}`
                  : "Done";
              send({ type: "tool_done", name: tb.name, summary });

              toolResults.push({
                type: "tool_result",
                tool_use_id: tb.id,
                content: JSON.stringify(result),
              });
            }

            loopMessages.push({ role: "user", content: toolResults });
          }

          // If we exhaust all rounds
          send({ type: "done" });
          ctrl.close();
        } catch (e) {
          console.error("Stream error:", e);
          const send2 = (data: Record<string, unknown>) => {
            ctrl.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          };
          send2({
            type: "error",
            error: { type: "api_error", message: String(e) },
          });
          ctrl.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
