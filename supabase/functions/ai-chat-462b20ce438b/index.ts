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
  return { ...data, stage_label: STAGE_LABELS[data.current_stage] ?? data.current_stage };
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

async function getSummary(_args: Record<string, unknown>) {
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

    const toolDefs = [
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

    /* ---- conversation loop (max 5 tool rounds) ---- */
    const apiToken = Deno.env.get("AI_API_TOKEN_462b20ce438b")!;
    const apiBase = "https://api.enter.dev/code/api/v1/ai";
    const loopMessages = [...userMessages];
    let finalStream: ReadableStream | null = null;

    for (let round = 0; round < 6; round++) {
      const isLast = round === 5;
      const res = await fetch(`${apiBase}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          stream: true,
          system: systemPrompt,
          messages: loopMessages,
          ...(isLast ? {} : { tools: toolDefs }),
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        return new Response(t, {
          status: res.status,
          headers: corsHeaders,
        });
      }

      /* ---- read full response to check for tool_use ---- */
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const events: Array<{ event: string; data: string }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop()!;
        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
          else if (line.startsWith("data: "))
            events.push({ event: currentEvent, data: line.slice(6) });
        }
      }

      /* check if any content_block is tool_use */
      const toolUseBlocks: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];
      let currentBlock: {
        id: string;
        name: string;
        inputJson: string;
      } | null = null;

      for (const ev of events) {
        if (ev.event === "content_block_start") {
          const d = JSON.parse(ev.data);
          if (d.content_block?.type === "tool_use") {
            currentBlock = {
              id: d.content_block.id,
              name: d.content_block.name,
              inputJson: "",
            };
          }
        } else if (
          ev.event === "content_block_delta" &&
          currentBlock
        ) {
          const d = JSON.parse(ev.data);
          if (d.delta?.type === "input_json_delta")
            currentBlock.inputJson += d.delta.partial_json;
        } else if (ev.event === "content_block_stop" && currentBlock) {
          toolUseBlocks.push({
            id: currentBlock.id,
            name: currentBlock.name,
            input: currentBlock.inputJson
              ? JSON.parse(currentBlock.inputJson)
              : {},
          });
          currentBlock = null;
        }
      }

      if (toolUseBlocks.length === 0 || isLast) {
        /* No tool calls → stream the buffered events to client */
        const body = events
          .map((e) => `event: ${e.event}\ndata: ${e.data}\n\n`)
          .join("");
        finalStream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(new TextEncoder().encode(body));
            ctrl.close();
          },
        });
        break;
      }

      /* ---- execute tools & continue ---- */
      // Build assistant message content (text blocks + tool_use blocks)
      const assistantContent: unknown[] = [];
      let textBuf = "";
      let blockIdx = 0;
      for (const ev of events) {
        if (ev.event === "content_block_start") {
          const d = JSON.parse(ev.data);
          if (d.content_block?.type === "text") textBuf = d.content_block.text ?? "";
          blockIdx = d.index ?? blockIdx;
        } else if (ev.event === "content_block_delta") {
          const d = JSON.parse(ev.data);
          if (d.delta?.type === "text_delta") textBuf += d.delta.text;
        } else if (ev.event === "content_block_stop") {
          if (textBuf) assistantContent.push({ type: "text", text: textBuf });
          textBuf = "";
        }
      }
      for (const tb of toolUseBlocks) {
        assistantContent.push({
          type: "tool_use",
          id: tb.id,
          name: tb.name,
          input: tb.input,
        });
      }
      loopMessages.push({ role: "assistant", content: assistantContent });

      const toolResults: unknown[] = [];
      for (const tb of toolUseBlocks) {
        const fn = TOOLS[tb.name];
        let result: unknown = { error: "unknown tool" };
        if (fn) {
          try {
            result = await fn(tb.input);
          } catch (e) {
            result = { error: String(e) };
          }
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: tb.id,
          content: JSON.stringify(result),
        });
      }
      loopMessages.push({ role: "user", content: toolResults });
    }

    return new Response(finalStream!, {
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
