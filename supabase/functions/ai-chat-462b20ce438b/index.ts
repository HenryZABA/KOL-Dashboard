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

/* ── KB keyword search ──────────────────────────────── */
/** Extract meaningful keywords from text (handles CJK + English) */
function extractKeywords(text: string): string[] {
  // Remove common stop words and short tokens
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "like",
    "through", "after", "over", "between", "out", "against", "during",
    "without", "before", "under", "around", "among", "and", "or", "but",
    "not", "no", "nor", "so", "yet", "both", "either", "neither", "each",
    "every", "all", "any", "few", "more", "most", "other", "some", "such",
    "than", "too", "very", "just", "also", "how", "what", "which", "who",
    "whom", "this", "that", "these", "those", "it", "its", "my", "your",
    "his", "her", "our", "their", "me", "him", "them", "we", "you", "i",
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
    "个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有",
    "看", "好", "自己", "这", "他", "她", "它", "们", "那", "些", "被", "从",
    "吗", "吧", "呢", "啊", "哦", "嗯", "把", "给", "让", "用", "对", "等",
    "能", "可以", "什么", "怎么", "为什么", "哪", "谁", "多少",
  ]);

  const keywords: string[] = [];

  // Extract English words (3+ chars)
  const engWords = text.toLowerCase().match(/[a-zA-Z]{3,}/g) || [];
  for (const w of engWords) {
    if (!stopWords.has(w)) keywords.push(w);
  }

  // Extract CJK character bigrams (2-char sliding window)
  const cjkChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || [];
  // Also extract full CJK segments (consecutive CJK chars)
  const cjkSegments = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]{2,}/g) || [];
  for (const seg of cjkSegments) {
    if (seg.length >= 2 && seg.length <= 6 && !stopWords.has(seg)) {
      keywords.push(seg);
    }
    // Also add bigrams from longer segments
    if (seg.length > 2) {
      for (let i = 0; i < seg.length - 1; i++) {
        const bigram = seg.slice(i, i + 2);
        if (!stopWords.has(bigram)) keywords.push(bigram);
      }
    }
  }

  // Deduplicate
  return [...new Set(keywords)];
}

/** Search KB docs by keyword relevance, return top N */
async function searchKb(
  userMessage: string,
  topN = 3
): Promise<Array<{ title: string; content: string }>> {
  const sb = supabaseAdmin();
  const keywords = extractKeywords(userMessage);
  console.log("[KB] Extracted keywords:", keywords.slice(0, 20));

  if (keywords.length === 0) {
    // Fallback: return latest 1 doc
    const { data } = await sb
      .from("knowledge_base")
      .select("title, content")
      .order("created_at", { ascending: false })
      .limit(1);
    return data ?? [];
  }

  // Fetch all docs (lightweight: just id + title + content)
  const { data: allDocs } = await sb
    .from("knowledge_base")
    .select("title, content");

  if (!allDocs?.length) return [];

  // Score each doc by keyword match count
  const scored = allDocs.map((doc: { title: string; content: string }) => {
    const haystack = `${doc.title} ${doc.content}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      // Count occurrences
      let idx = 0;
      let count = 0;
      while ((idx = haystack.indexOf(lowerKw, idx)) !== -1) {
        count++;
        idx += lowerKw.length;
      }
      if (count > 0) score += Math.min(count, 5); // Cap per-keyword contribution
    }
    return { ...doc, score };
  });

  // Sort by score desc, take top N with score > 0
  const matched = scored
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  if (matched.length === 0) {
    // No matches: return latest 1 doc as fallback
    const { data } = await sb
      .from("knowledge_base")
      .select("title, content")
      .order("created_at", { ascending: false })
      .limit(1);
    return data ?? [];
  }

  console.log(
    "[KB] Matched docs:",
    matched.map((d) => `${d.title} (score: ${d.score})`)
  );

  return matched.map(({ title, content }) => ({ title, content }));
}

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

    /* ---- keyword-based KB retrieval ---- */
    // Extract the latest user message for keyword search
    const lastUserMsg = [...userMessages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");
    const searchText =
      typeof lastUserMsg?.content === "string"
        ? lastUserMsg.content
        : Array.isArray(lastUserMsg?.content)
          ? lastUserMsg.content
              .filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text)
              .join(" ")
          : "";

    const relevantDocs = await searchKb(searchText);

    let kbContext = "";
    if (relevantDocs.length) {
      kbContext =
        "\n\n## Knowledge Base (relevant excerpts)\n" +
        relevantDocs
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
