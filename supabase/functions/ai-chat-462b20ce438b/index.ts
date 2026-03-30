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

/* ── chunking ────────────────────────────────────────── */
function chunkText(text: string, maxLen = 800, minLen = 200): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const rawChunks: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      rawChunks.push(trimmed);
    } else {
      const sentences = trimmed.split(/(?<=[。.！!？?\n])/);
      let buf = "";
      for (const s of sentences) {
        if (buf.length + s.length > maxLen && buf.length > 0) {
          rawChunks.push(buf.trim());
          buf = s;
        } else {
          buf += s;
        }
      }
      if (buf.trim()) rawChunks.push(buf.trim());
    }
  }

  const merged: string[] = [];
  let acc = "";
  for (const c of rawChunks) {
    if (acc.length + c.length + 2 <= maxLen) {
      acc = acc ? acc + "\n\n" + c : c;
    } else {
      if (acc) merged.push(acc);
      acc = c;
    }
  }
  if (acc) merged.push(acc);

  if (merged.length > 1) {
    const final: string[] = [];
    let buf2 = "";
    for (const m of merged) {
      if (buf2.length < minLen && buf2.length + m.length + 2 <= maxLen) {
        buf2 = buf2 ? buf2 + "\n\n" + m : m;
      } else {
        if (buf2) final.push(buf2);
        buf2 = m;
      }
    }
    if (buf2) final.push(buf2);
    return final;
  }

  return merged;
}

/* ── KB keyword search ──────────────────────────────── */
function extractKeywords(text: string): string[] {
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
    "\u7684", "\u4e86", "\u5728", "\u662f", "\u6211", "\u6709", "\u548c", "\u5c31", "\u4e0d", "\u4eba", "\u90fd", "\u4e00",
    "\u4e2a", "\u4e0a", "\u4e5f", "\u5f88", "\u5230", "\u8bf4", "\u8981", "\u53bb", "\u4f60", "\u4f1a", "\u7740", "\u6ca1\u6709",
    "\u770b", "\u597d", "\u81ea\u5df1", "\u8fd9", "\u4ed6", "\u5979", "\u5b83", "\u4eec", "\u90a3", "\u4e9b", "\u88ab", "\u4ece",
    "\u5417", "\u5427", "\u5462", "\u554a", "\u54e6", "\u55ef", "\u628a", "\u7ed9", "\u8ba9", "\u7528", "\u5bf9", "\u7b49",
    "\u80fd", "\u53ef\u4ee5", "\u4ec0\u4e48", "\u600e\u4e48", "\u4e3a\u4ec0\u4e48", "\u54ea", "\u8c01", "\u591a\u5c11",
  ]);

  const keywords: string[] = [];
  const engWords = text.toLowerCase().match(/[a-zA-Z]{3,}/g) || [];
  for (const w of engWords) {
    if (!stopWords.has(w)) keywords.push(w);
  }

  const cjkSegments = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]{2,}/g) || [];
  for (const seg of cjkSegments) {
    if (seg.length >= 2 && seg.length <= 6 && !stopWords.has(seg)) {
      keywords.push(seg);
    }
    if (seg.length > 2) {
      for (let i = 0; i < seg.length - 1; i++) {
        const bigram = seg.slice(i, i + 2);
        if (!stopWords.has(bigram)) keywords.push(bigram);
      }
    }
  }

  return [...new Set(keywords)];
}

async function searchKb(
  userMessage: string,
  agencyId?: string,
  topN = 5
): Promise<Array<{ title: string; content: string }>> {
  const sb = supabaseAdmin();
  const keywords = extractKeywords(userMessage);
  console.log("[KB] Extracted keywords:", keywords.slice(0, 20), agencyId ? `(agency: ${agencyId})` : "(brand)");

  if (keywords.length === 0) {
    let q = sb
      .from("knowledge_base")
      .select("title, content")
      .is("source_doc_id", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (agencyId) {
      q = q.or(`agency_id.eq.${agencyId},agency_id.is.null`);
    } else {
      q = q.is("agency_id", null);
    }
    const { data } = await q;
    return data ?? [];
  }

  // Fetch docs: brand mode = brand-only (agency_id is null); agency mode = own + brand
  let q = sb
    .from("knowledge_base")
    .select("title, content, source_doc_id, chunk_index, agency_id");
  if (agencyId) {
    q = q.or(`agency_id.eq.${agencyId},agency_id.is.null`);
  } else {
    q = q.is("agency_id", null);
  }
  const { data: allDocs } = await q;

  if (!allDocs?.length) return [];

  const scored = allDocs.map((doc: { title: string; content: string; source_doc_id: string | null; chunk_index: number | null; agency_id: string | null }) => {
    const haystack = `${doc.title} ${doc.content}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      let idx = 0;
      let count = 0;
      while ((idx = haystack.indexOf(lowerKw, idx)) !== -1) {
        count++;
        idx += lowerKw.length;
      }
      if (count > 0) score += Math.min(count, 5);
    }
    return { ...doc, score };
  });

  const matched = scored
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  if (matched.length === 0) {
    let q2 = sb
      .from("knowledge_base")
      .select("title, content")
      .is("source_doc_id", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (agencyId) {
      q2 = q2.or(`agency_id.eq.${agencyId},agency_id.is.null`);
    } else {
      q2 = q2.is("agency_id", null);
    }
    const { data } = await q2;
    return data ?? [];
  }

  console.log(
    "[KB] Matched docs:",
    matched.map((d) => `${d.title}${d.chunk_index != null ? ` [chunk ${d.chunk_index}]` : ""} (score: ${d.score})`)
  );

  return matched.map(({ title, content }) => ({ title, content }));
}

/* ── tool implementations ────────────────────────────── */
async function listKols(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const scopeAgency = args._scope_agency_id as string | undefined;
  let q = sb
    .from("kols")
    .select("id, name, current_stage, platforms, agency_id, is_todays_focus");
  if (scopeAgency) {
    q = q.eq("agency_id", scopeAgency);
  } else if (args.agency_id) {
    q = q.eq("agency_id", args.agency_id as string);
  }
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
  const scopeAgency = args._scope_agency_id as string | undefined;
  let q = sb.from("kols").select("*").eq("id", args.kol_id as string);
  if (scopeAgency) q = q.eq("agency_id", scopeAgency);
  const { data, error } = await q.maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "KOL not found" };
  return {
    ...data,
    stage_label: STAGE_LABELS[data.current_stage] ?? data.current_stage,
  };
}

async function updateKolStage(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const scopeAgency = args._scope_agency_id as string | undefined;
  const newStage = args.stage as string;

  if (scopeAgency) {
    const { data: kol } = await sb.from("kols").select("agency_id").eq("id", args.kol_id as string).maybeSingle();
    if (!kol || kol.agency_id !== scopeAgency) return { error: "KOL not found" };
  }

  const updates: Record<string, unknown> = {
    current_stage: newStage,
    stage_updated_at: new Date().toISOString(),
  };
  if (newStage === "pre_publish") updates.is_todays_focus = true;

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
  const scopeAgency = args._scope_agency_id as string | undefined;
  const focused = (args.focused ?? true) as boolean;

  if (scopeAgency) {
    const { data: kol } = await sb.from("kols").select("agency_id").eq("id", args.kol_id as string).maybeSingle();
    if (!kol || kol.agency_id !== scopeAgency) return { error: "KOL not found" };
  }

  const { data, error } = await sb
    .from("kols")
    .update({ is_todays_focus: focused })
    .eq("id", args.kol_id as string)
    .select("id, name, is_todays_focus")
    .single();
  if (error) return { error: error.message };
  return data;
}

async function getSummary(args: Record<string, unknown>) {
  const sb = supabaseAdmin();
  const scopeAgency = args._scope_agency_id as string | undefined;
  let q = sb.from("kols").select("current_stage, is_todays_focus");
  if (scopeAgency) q = q.eq("agency_id", scopeAgency);
  const { data: kols } = await q;
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
      agencyId,
    } = await req.json();

    /* ---- optional KB save with chunking ---- */
    if (saveToKb && fileContent && fileName) {
      const sb = supabaseAdmin();
      const chunks = chunkText(fileContent);
      const kbAgency = agencyId || null; // null = brand KB
      console.log(`[KB] Saving "${fileName}" -> ${chunks.length} chunk(s), agency: ${kbAgency ?? "brand"}`);

      if (chunks.length <= 1) {
        await sb
          .from("knowledge_base")
          .insert({ title: fileName, content: fileContent, agency_id: kbAgency });
      } else {
        const { data: parent } = await sb
          .from("knowledge_base")
          .insert({ title: fileName, content: "", agency_id: kbAgency })
          .select("id")
          .single();

        if (parent) {
          const chunkRows = chunks.map((c, i) => ({
            title: `${fileName} [${i + 1}/${chunks.length}]`,
            content: c,
            source_doc_id: parent.id,
            chunk_index: i,
            agency_id: kbAgency,
          }));
          await sb.from("knowledge_base").insert(chunkRows);
        }
      }
    }

    /* ---- keyword-based KB retrieval ---- */
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

    const relevantDocs = await searchKb(searchText, agencyId);

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

    const agencyModeNote = agencyId
      ? "\n\n## Agency Mode\nYou are operating in agency mode. You can ONLY access KOLs belonging to your agency. Do not attempt to access or discuss other agencies' KOLs. You also have your own knowledge base - documents uploaded by your agency are available to you alongside brand-level reference materials.\n\nUsers can upload documents to your agency's private knowledge base using the file upload button (paperclip icon) in the chat. Uploaded files are automatically chunked and indexed for keyword-based retrieval. You can remind users of this capability when relevant."
      : "";

    const systemPrompt = `You are a helpful KOL campaign assistant.${kbContext}

## Your architecture
- Knowledge base retrieval: keyword-based search (not full-text dump). User messages are tokenized into keywords, matched against document chunks by relevance score, and only the top 5 most relevant chunks are loaded into context.
- Long documents are automatically split into ~800-character chunks at paragraph/sentence boundaries for more precise retrieval.
- You have tool-calling capabilities to query and update the KOL database in real time.${agencyModeNote}

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

            if (toolUseBlocks.length === 0 || isLast) {
              const fullText = textBlocks.join("\n");
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

            loopMessages.push({ role: "assistant", content: body.content });

            const toolResults: unknown[] = [];
            for (const tb of toolUseBlocks) {
              send({ type: "tool_start", name: tb.name, input: tb.input });

              const fn = TOOLS[tb.name];
              let result: unknown = { error: "unknown tool" };
              if (fn) {
                try {
                  // Inject agency scope into tool args for data isolation
                  const scopedInput = agencyId
                    ? { ...tb.input, _scope_agency_id: agencyId }
                    : tb.input;
                  result = await fn(scopedInput);
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
