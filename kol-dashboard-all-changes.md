# KOL Dashboard — 修改文件完整内容

本文档包含所有修改过的文件完整代码，供 agent 直接覆盖目标项目对应路径。

## 修改说明

1. **AI Agent 升级**：将原 RAG 聊天机器人升级为真正的 Agent，支持5个工具调用和 agentic loop
2. **AI 工具感知修复**：system prompt 明确列出工具，防止模型说没有工具
3. **性能优化 - Realtime**：Supabase Realtime 替换全量重拉，所有 mutation 写完不再 fetchData()
4. **性能优化 - 懒加载**：change_log 从全局状态移除，改为展开 KOL 时按需加载
5. **性能优化 - 服务端过滤**：video_metrics 查询加 kol_id IN (...) 过滤

## 文件列表

| 文件路径 | 说明 |
|----------|------|
| `supabase/functions/ai-chat-462b20ce438b/index.ts` | Agent 核心：工具定义、agentic loop、system prompt |
| `src/hooks/useAiChat.ts` | 前端 SSE 处理，新增 tool_start/tool_done 事件 |
| `src/components/ai/AiChatPanel.tsx` | AI 聊天面板，新增工具执行步骤 UI |
| `src/lib/kol-store.tsx` | KOL 状态管理，引入 Realtime，移除全量重拉 |
| `src/lib/mock-data.ts` | 类型定义，changeLog 改为可选字段 |
| `src/hooks/useKolChangelog.ts` | 新文件：change_log 懒加载 hook |
| `src/hooks/useVideoMetrics.ts` | 视频指标 hook，添加服务端 kol_id 过滤 |
| `src/components/agency/ChangeLog.tsx` | 变更日志组件，支持可选 prop |
| `src/components/agency/KolDetailPanel.tsx` | KOL 详情面板，使用懒加载 hook |

---

## `supabase/functions/ai-chat-462b20ce438b/index.ts`

```ts
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
```

---

## `src/hooks/useAiChat.ts`

```ts
import { useState, useRef, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const SUPABASE_URL = 'https://ifrrsotvlvunpxtghbua.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcnJzb3R2bHZ1bnB4dGdoYnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTU3ODksImV4cCI6MjA4OTgzMTc4OX0.iZLvBr48krBjOFU-AE3hOSQ5iXOa19dxeCvBl2tX0O8';

export interface ToolStep {
  name: string;
  input: Record<string, unknown>;
  summary?: string;
  status: 'running' | 'done';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  isStreaming?: boolean;
  toolSteps?: ToolStep[];
}

const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: 'Authentication failed. Please refresh the page.',
  rate_limit_error: 'Too many requests. Please try again later.',
  insufficient_credits: "AI credits have been exhausted. Please contact the administrator.",
  permission_error: 'AI capability is disabled. Please contact the administrator.',
  api_error: 'Service temporarily unavailable.',
};

function getUserErrorMessage(code: string, backendMessage: string): string {
  if (backendMessage) return backendMessage;
  return FALLBACK_MESSAGES[code] || 'Service temporarily unavailable.';
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, options?: { fileContent?: string; fileName?: string; saveToKb?: boolean }) => {
      abortRef.current = new AbortController();

      const displayContent = options?.fileName
        ? `${content}\n\n📎 ${options.fileName}`
        : content;
      const userMessage: ChatMessage = { role: 'user', content: displayContent };
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        thinking: '',
        isStreaming: true,
        toolSteps: [],
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      const blocks = new Map<number, { type: string; content: string }>();

      // Build the actual message content for AI (includes full file content)
      const aiContent = options?.fileContent
        ? `${content}\n\n--- Attached file: ${options.fileName} ---\n${options.fileContent}`
        : content;

      try {
        await fetchEventSource(
          `${SUPABASE_URL}/functions/v1/ai-chat-462b20ce438b`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              messages: [
                ...messages.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: aiContent },
              ],
              model: 'anthropic/claude-sonnet-4.5',
              ...(options?.saveToKb && options?.fileContent
                ? { saveToKb: true, fileName: options.fileName, fileContent: options.fileContent }
                : {}),
            }),
            signal: abortRef.current.signal,

            async onopen(response) {
              const ct = response.headers.get('content-type');
              if (!response.ok) {
                if (ct?.includes('text/event-stream')) {
                  const text = await response.text();
                  const m = text.match(/data: (.+)/);
                  if (m) {
                    try {
                      const d = JSON.parse(m[1]);
                      if (d.error?.message) throw new Error(d.error.message);
                    } catch (pe) {
                      if (pe instanceof Error && pe.message !== 'Unexpected token')
                        throw pe;
                    }
                  }
                }
                throw new Error(`Request failed: ${response.status}`);
              }
            },

            onmessage(event) {
              if (!event.data) return;
              const data = JSON.parse(event.data);

              if (data.type === 'error') {
                const msg = getUserErrorMessage(
                  data.error?.type || 'api_error',
                  data.error?.message || 'Service error',
                );
                setError(msg);
                setMessages((prev) => prev.slice(0, -1));
                setIsLoading(false);
                return;
              }

              switch (data.type) {
                case 'tool_start':
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        toolSteps: [
                          ...(last.toolSteps ?? []),
                          { name: data.name, input: data.input, status: 'running' as const },
                        ],
                      };
                    }
                    return updated;
                  });
                  break;

                case 'tool_done':
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant' && last.toolSteps) {
                      updated[updated.length - 1] = {
                        ...last,
                        toolSteps: last.toolSteps.map((s) =>
                          s.name === data.name && s.status === 'running'
                            ? { ...s, summary: data.summary, status: 'done' as const }
                            : s,
                        ),
                      };
                    }
                    return updated;
                  });
                  break;

                case 'content_block_start':
                  blocks.set(data.index, {
                    type: data.content_block.type,
                    content: '',
                  });
                  break;

                case 'content_block_delta': {
                  const block = blocks.get(data.index);
                  if (block?.type === 'thinking') {
                    block.content += data.delta.thinking || '';
                    setMessages((prev) =>
                      updateLast(prev, { thinking: block.content }),
                    );
                  } else if (block?.type === 'text') {
                    block.content += data.delta.text || '';
                    setMessages((prev) =>
                      updateLast(prev, { content: block.content }),
                    );
                  }
                  break;
                }

                case 'message_stop':
                  setMessages((prev) =>
                    updateLast(prev, { isStreaming: false }),
                  );
                  break;
              }
            },
            onerror(err) {
              throw err;
            },
          },
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Failed to send message');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, cancel, clearChat };
}

function updateLast(
  msgs: ChatMessage[],
  updates: Partial<ChatMessage>,
): ChatMessage[] {
  const updated = [...msgs];
  const last = updated[updated.length - 1];
  if (last?.role === 'assistant') {
    updated[updated.length - 1] = { ...last, ...updates };
  }
  return updated;
}
```

---

## `src/components/ai/AiChatPanel.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAiChat, type ChatMessage } from '@/hooks/useAiChat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertCircle,
  Paperclip,
  FileText,
  X,
  Check,
} from 'lucide-react';

const TOOL_LABELS: Record<string, string> = {
  list_kols: '查询KOL列表',
  get_kol_details: '获取KOL详情',
  update_kol_stage: '更新KOL阶段',
  toggle_todays_focus: '标记今日焦点',
  get_summary: '获取统计摘要',
};

interface AiChatPanelProps {
  /** When true, uploaded files are auto-saved to knowledge base */
  saveToKb?: boolean;
  /** Height class override */
  heightClass?: string;
  /** Custom empty state description */
  emptyDescription?: string;
  /** Callback when a file is saved to KB */
  onFileSaved?: () => void;
}

const ALLOWED_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'html', 'xml', 'log'];

export function AiChatPanel({
  saveToKb = false,
  heightClass = 'h-[calc(100vh-73px)]',
  emptyDescription = 'Ask me to review copy, check publication details, or answer questions about brand guidelines and KOL campaigns.',
  onFileSaved,
}: AiChatPanelProps) {
  const { messages, isLoading, error, sendMessage, cancel, clearChat } = useAiChat();
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setAttachedFile({ name: file.name, content: text });
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    const text = input.trim();
    if ((!text && !attachedFile) || isLoading) return;

    const message = text || (attachedFile ? `Please analyze this file: ${attachedFile.name}` : '');
    setInput('');

    if (attachedFile) {
      sendMessage(message, {
        fileContent: attachedFile.content,
        fileName: attachedFile.name,
        saveToKb,
      });
      setAttachedFile(null);
      if (saveToKb && onFileSaved) {
        // Refresh KB list after a short delay to allow edge function to save
        setTimeout(onFileSaved, 2000);
      }
    } else {
      sendMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex flex-col bg-background', heightClass)}>
      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-lg font-semibold text-primary">AI</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">{emptyDescription}</p>
            {saveToKb && (
              <p className="text-xs text-muted-foreground mt-3 max-w-md border border-dashed border-border rounded-lg p-3">
                <Paperclip className="h-3 w-3 inline mr-1" />
                Upload documents here and they will be automatically analyzed and saved to the AI Knowledge Base for all agencies to reference.
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 space-y-1">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-xs text-destructive flex items-center gap-1.5 max-w-3xl mx-auto">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        </div>
      )}

      {/* Attached file preview */}
      {attachedFile && (
        <div className="px-4 pt-2 border-t">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground font-medium">{attachedFile.name}</span>
              <span className="text-muted-foreground">
                ({(attachedFile.content.length / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={() => setAttachedFile(null)}
                className="text-muted-foreground hover:text-foreground ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className={cn('border-t bg-background px-4 py-3', !attachedFile && 'border-t')}>
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              onClick={clearChat}
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,.html,.xml,.log"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? 'Add a message (optional)...' : 'Ask a question...'}
              rows={1}
              className="w-full resize-none rounded-lg border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[40px] max-h-[120px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                t.style.overflow = t.scrollHeight > 120 ? 'auto' : 'hidden';
              }}
            />
          </div>
          {isLoading ? (
            <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={cancel}>
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSubmit}
              disabled={!input.trim() && !attachedFile}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    if (message.content && message.thinking) {
      setShowThinking(false);
    }
  }, [message.content, message.thinking]);

  const hasToolSteps = (message.toolSteps?.length ?? 0) > 0;
  const isWaiting = message.isStreaming && !message.thinking && !message.content && !hasToolSteps;

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="max-w-[85%] space-y-2">
        {isWaiting && (
          <div className="flex items-center gap-2 text-muted-foreground py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        {hasToolSteps && (
          <div className="space-y-1 py-1">
            {message.toolSteps!.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                {step.status === 'running' ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                )}
                <span>{TOOL_LABELS[step.name] ?? step.name}</span>
                {step.summary && (
                  <span className="text-muted-foreground/60">— {step.summary}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {message.thinking && (
          <div>
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showThinking ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span className="font-medium">Thinking</span>
            </button>
            {showThinking && (
              <div className="mt-1.5 p-2.5 bg-muted/50 rounded-md text-[11px] text-muted-foreground whitespace-pre-wrap border border-border/50 max-h-[200px] overflow-y-auto">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {message.content && (
          <div
            className={cn(
              'rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm',
              message.isStreaming && 'animate-pulse-subtle',
            )}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-code:text-xs prose-code:bg-background/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            {message.isStreaming && (
              <span className="inline-block w-1 h-3.5 bg-foreground/50 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## `src/lib/kol-store.tsx`

```tsx
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { KOL, Agency, Stage, Platform } from './mock-data';

interface KolStoreContext {
  kols: KOL[];
  agencies: Agency[];
  loading: boolean;
  addKol: (data: { name: string; platforms: Platform[]; agencyId: string; profileUrl?: string; contentDirection?: string; notes?: string }) => Promise<void>;
  updateKolStage: (kolId: string, newStage: Stage, note?: string) => Promise<void>;
  updateKolField: (kolId: string, updates: Partial<KOL>) => Promise<void>;
  toggleTodaysFocus: (kolId: string) => Promise<void>;
  addAgency: (name: string) => Promise<Agency>;
  removeAgency: (agencyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<KolStoreContext | null>(null);

// Map DB row to frontend KOL type (changeLog loaded lazily via useKolChangelog)
function dbToKol(row: Record<string, unknown>): KOL {
  return {
    id: row.id as string,
    name: row.name as string,
    platforms: (row.platforms as string[]) as Platform[],
    profileUrl: (row.profile_url as string) || undefined,
    contentDirection: (row.content_direction as string) || undefined,
    notes: (row.notes as string) || undefined,
    currentStage: row.current_stage as Stage,
    scriptVersion: row.script_version as number,
    scriptComplete: row.script_complete as boolean,
    projectComplete: row.project_complete as boolean,
    videoVersion: row.video_version as number,
    feishuUrl: (row.feishu_url as string) || undefined,
    isTodaysFocus: row.is_todays_focus as boolean,
    agencyId: row.agency_id as string,
    stageLinks: (row.stage_links as Record<string, string>) || {},
    stageUpdatedAt: row.stage_updated_at as string,
    publishedAt: (row.published_at as string) || undefined,
    createdAt: row.created_at as string,
  };
}

function dbToAgency(row: Record<string, unknown>): Agency {
  return {
    id: row.id as string,
    name: row.name as string,
    token: row.token as string,
  };
}

export function KolStoreProvider({ children }: { children: ReactNode }) {
  const [kols, setKols] = useState<KOL[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [agencyRes, kolRes] = await Promise.all([
      supabase.from('agencies').select('*').order('created_at'),
      supabase.from('kols').select('*').order('created_at'),
    ]);

    const agencyRows = (agencyRes.data || []) as Record<string, unknown>[];
    const kolRows = (kolRes.data || []) as Record<string, unknown>[];

    setAgencies(agencyRows.map(dbToAgency));
    setKols(kolRows.map(dbToKol));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime: kols table
    const kolsChannel = supabase
      .channel('kols-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kols' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setKols((prev) => [...prev, dbToKol(payload.new as Record<string, unknown>)]);
          } else if (payload.eventType === 'UPDATE') {
            setKols((prev) =>
              prev.map((k) =>
                k.id === (payload.new as Record<string, unknown>).id
                  ? { ...dbToKol(payload.new as Record<string, unknown>), changeLog: k.changeLog }
                  : k,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            setKols((prev) => prev.filter((k) => k.id !== (payload.old as Record<string, unknown>).id));
          }
        },
      )
      .subscribe();

    // Realtime: agencies table
    const agenciesChannel = supabase
      .channel('agencies-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agencies' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgencies((prev) => [...prev, dbToAgency(payload.new as Record<string, unknown>)]);
          } else if (payload.eventType === 'UPDATE') {
            setAgencies((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Record<string, unknown>).id
                  ? dbToAgency(payload.new as Record<string, unknown>)
                  : a,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            setAgencies((prev) => prev.filter((a) => a.id !== (payload.old as Record<string, unknown>).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kolsChannel);
      supabase.removeChannel(agenciesChannel);
    };
  }, [fetchData]);

  const addKol = useCallback(async (data: { name: string; platforms: Platform[]; agencyId: string; profileUrl?: string; contentDirection?: string; notes?: string; initialStage?: Stage }) => {
    const stage = data.initialStage || 'writing_idea';
    const { data: inserted, error } = await supabase.from('kols').insert({
      name: data.name,
      platforms: data.platforms,
      profile_url: data.profileUrl || null,
      content_direction: data.contentDirection || null,
      notes: data.notes || null,
      current_stage: stage,
      agency_id: data.agencyId,
    }).select().single();

    if (error || !inserted) { console.error('addKol error:', error); return; }

    await supabase.from('change_log').insert({
      kol_id: (inserted as Record<string, unknown>).id as string,
      from_stage: null,
      to_stage: stage,
    });
    // Realtime INSERT event will update state
  }, []);

  const updateKolStage = useCallback(async (kolId: string, newStage: Stage, note?: string) => {
    const currentKol = kols.find((k) => k.id === kolId);
    const fromStage = currentKol?.currentStage || null;

    await supabase.from('kols').update({
      current_stage: newStage,
      stage_updated_at: new Date().toISOString(),
      ...(newStage === 'pre_publish' ? { is_todays_focus: true } : {}),
      ...(newStage === 'published' ? { published_at: new Date().toISOString() } : {}),
    }).eq('id', kolId);

    await supabase.from('change_log').insert({
      kol_id: kolId,
      from_stage: fromStage,
      to_stage: newStage,
      note: note || null,
    });
    // Realtime UPDATE event will update state
  }, [kols]);

  const updateKolField = useCallback(async (kolId: string, updates: Partial<KOL>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.scriptVersion !== undefined) dbUpdates.script_version = updates.scriptVersion;
    if (updates.scriptComplete !== undefined) dbUpdates.script_complete = updates.scriptComplete;
    if (updates.projectComplete !== undefined) dbUpdates.project_complete = updates.projectComplete;
    if (updates.videoVersion !== undefined) dbUpdates.video_version = updates.videoVersion;
    if (updates.feishuUrl !== undefined) dbUpdates.feishu_url = updates.feishuUrl;
    if (updates.isTodaysFocus !== undefined) dbUpdates.is_todays_focus = updates.isTodaysFocus;
    if (updates.stageLinks !== undefined) dbUpdates.stage_links = updates.stageLinks;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('kols').update(dbUpdates).eq('id', kolId);
      // Realtime UPDATE event will update state
    }
  }, []);

  const toggleTodaysFocus = useCallback(async (kolId: string) => {
    const kol = kols.find((k) => k.id === kolId);
    if (!kol) return;
    await supabase.from('kols').update({ is_todays_focus: !kol.isTodaysFocus }).eq('id', kolId);
    // Realtime UPDATE event will update state
  }, [kols]);

  const addAgency = useCallback(async (name: string): Promise<Agency> => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    const token = `${slug}-${rand}`;

    const { data: inserted, error } = await supabase.from('agencies').insert({
      name,
      token,
    }).select().single();

    if (error || !inserted) {
      console.error('addAgency error:', error);
      return { id: '', name, token };
    }

    // Return the newly created agency directly from the insert result
    // Realtime INSERT event will also update state
    return dbToAgency(inserted as Record<string, unknown>);
  }, []);

  const removeAgency = useCallback(async (agencyId: string) => {
    await supabase.from('agencies').delete().eq('id', agencyId);
    // Realtime DELETE event will update state
  }, []);

  return (
    <StoreContext.Provider value={{ kols, agencies, loading, addKol, updateKolStage, updateKolField, toggleTodaysFocus, addAgency, removeAgency, refresh: fetchData }}>
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKolStore(): KolStoreContext {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useKolStore must be used within KolStoreProvider');
  return ctx;
}
```

---

## `src/lib/mock-data.ts`

```ts
export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'facebook';

export type Stage =
  | 'writing_idea'
  | 'writing_script'
  | 'creating_project'
  | 'video_production'
  | 'pre_publish'
  | 'published';

export interface ChangeLogEntry {
  id: string;
  fromStage: Stage | null;
  toStage: Stage;
  timestamp: string;
  note?: string;
}

export interface KOL {
  id: string;
  name: string;
  platforms: Platform[];
  profileUrl?: string;
  contentDirection?: string;
  notes?: string;
  currentStage: Stage;
  scriptVersion: number;
  scriptComplete: boolean;
  projectComplete: boolean;
  videoVersion: number;
  feishuUrl?: string;
  isTodaysFocus: boolean;
  agencyId: string;
  stageUpdatedAt: string;
  publishedAt?: string;
  createdAt: string;
  stageLinks?: Record<string, string>;
  changeLog?: ChangeLogEntry[];
}

export interface Agency {
  id: string;
  name: string;
  token: string;
}

export const STAGE_LABELS: Record<Stage, string> = {
  writing_idea: 'Idea',
  writing_script: 'Script / Project',
  creating_project: 'Project',
  video_production: 'Video',
  pre_publish: 'Pre-publish Confirmation',
  published: 'Published',
};

export const STAGE_ORDER: Stage[] = [
  'writing_idea',
  'writing_script',
  'video_production',
  'pre_publish',
  'published',
];

// Kanban columns — script + project are merged
export type KanbanColumn = 'writing_idea' | 'script_project' | 'video_production' | 'pre_publish' | 'published';

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string; stages: Stage[] }[] = [
  { key: 'writing_idea', label: 'Idea', stages: ['writing_idea'] },
  { key: 'script_project', label: 'Script / Project', stages: ['writing_script', 'creating_project'] },
  { key: 'video_production', label: 'Video', stages: ['video_production'] },
  { key: 'pre_publish', label: 'Pre-publish Confirmation', stages: ['pre_publish'] },
  { key: 'published', label: 'Published', stages: ['published'] },
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  x: 'X',
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_AGENCIES: Agency[] = [
  { id: 'agency-1', name: 'StarReach Media', token: 'sr-token-2024' },
  { id: 'agency-2', name: 'Pulse Digital', token: 'pd-token-2024' },
  { id: 'agency-3', name: 'Nova Creators', token: 'nc-token-2024' },
];

export const MOCK_KOLS: KOL[] = [
  {
    id: 'kol-1',
    name: 'Alex Chen',
    platforms: ['youtube', 'tiktok'],
    profileUrl: 'https://youtube.com/@alexchen',
    contentDirection: 'Tech Reviews',
    currentStage: 'writing_script',
    scriptVersion: 2,
    scriptComplete: true,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: true,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(3),
    createdAt: daysAgo(10),
    changeLog: [
      { id: 'cl-1', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(10) },
      { id: 'cl-2', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(5) },
    ],
  },
  {
    id: 'kol-2',
    name: 'Maya Johnson',
    platforms: ['instagram'],
    contentDirection: 'Lifestyle & Fashion',
    currentStage: 'video_production',
    scriptVersion: 3,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 1,
    isTodaysFocus: false,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(15),
    changeLog: [
      { id: 'cl-3', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(15) },
      { id: 'cl-4', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(12) },
      { id: 'cl-5', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-3',
    name: 'Riku Tanaka',
    platforms: ['youtube'],
    contentDirection: 'Gaming',
    currentStage: 'writing_idea',
    scriptVersion: 0,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(4),
    createdAt: daysAgo(4),
    changeLog: [
      { id: 'cl-6', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(4) },
    ],
  },
  {
    id: 'kol-4',
    name: 'Sophie Martin',
    platforms: ['tiktok', 'instagram'],
    contentDirection: 'Beauty & Skincare',
    currentStage: 'pre_publish',
    scriptVersion: 2,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 2,
    feishuUrl: 'https://feishu.cn/docs/example1',
    isTodaysFocus: true,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(20),
    changeLog: [
      { id: 'cl-7', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(20) },
      { id: 'cl-8', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(16) },
      { id: 'cl-9', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(10) },
      { id: 'cl-10', fromStage: 'video_production', toStage: 'pre_publish', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-5',
    name: 'James Park',
    platforms: ['youtube', 'x'],
    contentDirection: 'Finance & Crypto',
    currentStage: 'published',
    scriptVersion: 1,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 1,
    feishuUrl: 'https://feishu.cn/docs/example2',
    isTodaysFocus: false,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(0),
    createdAt: daysAgo(25),
    changeLog: [
      { id: 'cl-11', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(25) },
      { id: 'cl-12', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(20) },
      { id: 'cl-13', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(14) },
      { id: 'cl-14', fromStage: 'video_production', toStage: 'pre_publish', timestamp: daysAgo(5) },
      { id: 'cl-15', fromStage: 'pre_publish', toStage: 'published', timestamp: daysAgo(0) },
    ],
  },
  {
    id: 'kol-6',
    name: 'Lina Wei',
    platforms: ['tiktok'],
    contentDirection: 'Dance & Entertainment',
    currentStage: 'creating_project',
    scriptVersion: 1,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(5),
    createdAt: daysAgo(8),
    changeLog: [
      { id: 'cl-16', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(8) },
      { id: 'cl-17', fromStage: 'writing_idea', toStage: 'creating_project', timestamp: daysAgo(5) },
    ],
  },
  {
    id: 'kol-7',
    name: 'Carlos Rivera',
    platforms: ['youtube', 'instagram'],
    contentDirection: 'Travel & Vlog',
    currentStage: 'writing_script',
    scriptVersion: 1,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(6),
    changeLog: [
      { id: 'cl-18', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(6) },
      { id: 'cl-19', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-8',
    name: 'Emma Davis',
    platforms: ['instagram', 'x'],
    contentDirection: 'Fitness & Wellness',
    currentStage: 'video_production',
    scriptVersion: 2,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 2,
    isTodaysFocus: false,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(3),
    createdAt: daysAgo(18),
    changeLog: [
      { id: 'cl-20', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(18) },
      { id: 'cl-21', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(13) },
      { id: 'cl-22', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(3) },
    ],
  },
  {
    id: 'kol-9',
    name: 'Kai Nakamura',
    platforms: ['youtube'],
    contentDirection: 'Cooking & Food',
    currentStage: 'writing_idea',
    scriptVersion: 0,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: true,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(1),
    changeLog: [
      { id: 'cl-23', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-10',
    name: 'Priya Sharma',
    platforms: ['tiktok', 'youtube'],
    contentDirection: 'Education & Science',
    currentStage: 'pre_publish',
    scriptVersion: 3,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 1,
    isTodaysFocus: false,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(4),
    createdAt: daysAgo(22),
    changeLog: [
      { id: 'cl-24', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(22) },
      { id: 'cl-25', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(18) },
      { id: 'cl-26', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(10) },
      { id: 'cl-27', fromStage: 'video_production', toStage: 'pre_publish', timestamp: daysAgo(4) },
    ],
  },
  {
    id: 'kol-11',
    name: 'Oliver Zhang',
    platforms: ['x'],
    contentDirection: 'AI & Technology',
    currentStage: 'writing_script',
    scriptVersion: 3,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(0),
    createdAt: daysAgo(7),
    changeLog: [
      { id: 'cl-28', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(7) },
      { id: 'cl-29', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(0) },
    ],
  },
  {
    id: 'kol-12',
    name: 'Hana Kim',
    platforms: ['instagram', 'tiktok'],
    contentDirection: 'K-Beauty & Culture',
    currentStage: 'video_production',
    scriptVersion: 1,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 3,
    isTodaysFocus: false,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(14),
    changeLog: [
      { id: 'cl-30', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(14) },
      { id: 'cl-31', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(10) },
      { id: 'cl-32', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(1) },
    ],
  },
];

export function getDaysInStage(stageUpdatedAt: string): number {
  const updated = new Date(stageUpdatedAt);
  const now = new Date();
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(stageUpdatedAt: string): boolean {
  return getDaysInStage(stageUpdatedAt) > 2;
}

export function getAgencyById(agencies: Agency[], id: string): Agency | undefined {
  return agencies.find((a) => a.id === id);
}

export function getAgencyByToken(agencies: Agency[], token: string): Agency | undefined {
  return agencies.find((a) => a.token === token);
}

/** Get the effective kanban column for a KOL */
export function getKanbanColumn(kol: KOL): KanbanColumn {
  if (kol.currentStage === 'writing_script' || kol.currentStage === 'creating_project') {
    return 'script_project';
  }
  return kol.currentStage as KanbanColumn;
}
```

---

## `src/hooks/useKolChangelog.ts`

```ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeLogEntry, Stage } from '@/lib/mock-data';

function dbToChangeLog(row: Record<string, unknown>): ChangeLogEntry {
  return {
    id: row.id as string,
    fromStage: (row.from_stage as Stage) || null,
    toStage: row.to_stage as Stage,
    timestamp: row.created_at as string,
    note: (row.note as string) || undefined,
  };
}

export function useKolChangelog(kolId: string | null) {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kolId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    supabase
      .from('change_log')
      .select('*')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setLogs((data as Record<string, unknown>[] || []).map(dbToChangeLog));
        setLoading(false);
      });
  }, [kolId]);

  return { logs, loading };
}
```

---

## `src/hooks/useVideoMetrics.ts`

```ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { KOL, Platform } from '@/lib/mock-data';

export interface VideoMetric {
  id: string;
  kol_id: string;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  recorded_at: string;
}

export interface KolMetricSummary {
  kol: KOL;
  latest: Record<Platform, VideoMetric | null>;
  previous: Record<Platform, VideoMetric | null>;
  totals: { views: number; likes: number; comments: number; shares: number };
  deltas: { views: number; likes: number; comments: number; shares: number };
}

export function useVideoMetrics(publishedKols: KOL[]) {
  const [metrics, setMetrics] = useState<VideoMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Stable string key to avoid re-fetching on every render due to array reference changes
  const kolIdsKey = useMemo(() => publishedKols.map((k) => k.id).join(','), [publishedKols]);

  const fetchMetrics = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setMetrics([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('video_metrics')
      .select('*')
      .in('kol_id', ids)
      .order('recorded_at', { ascending: true });

    if (!error && data) {
      setMetrics(data as unknown as VideoMetric[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics(kolIdsKey ? kolIdsKey.split(',') : []);
  }, [kolIdsKey, fetchMetrics]);

  const kolSummaries = useMemo((): KolMetricSummary[] => {
    return publishedKols.map((kol) => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kol.id);

      // Group by platform, get latest + previous
      const latestMap = {} as Record<Platform, VideoMetric | null>;
      const prevMap = {} as Record<Platform, VideoMetric | null>;

      for (const p of kol.platforms) {
        const platformMetrics = kolMetrics
          .filter((m) => m.platform === p)
          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
        latestMap[p] = platformMetrics[0] || null;
        prevMap[p] = platformMetrics[1] || null;
      }

      // Sum all latest metrics across platforms
      const totals = { views: 0, likes: 0, comments: 0, shares: 0 };
      const prevTotals = { views: 0, likes: 0, comments: 0, shares: 0 };

      for (const p of kol.platforms) {
        const l = latestMap[p];
        const pr = prevMap[p];
        if (l) {
          totals.views += l.views;
          totals.likes += l.likes;
          totals.comments += l.comments;
          totals.shares += l.shares;
        }
        if (pr) {
          prevTotals.views += pr.views;
          prevTotals.likes += pr.likes;
          prevTotals.comments += pr.comments;
          prevTotals.shares += pr.shares;
        }
      }

      const deltas = {
        views: prevTotals.views > 0 ? ((totals.views - prevTotals.views) / prevTotals.views) * 100 : 0,
        likes: prevTotals.likes > 0 ? ((totals.likes - prevTotals.likes) / prevTotals.likes) * 100 : 0,
        comments: prevTotals.comments > 0 ? ((totals.comments - prevTotals.comments) / prevTotals.comments) * 100 : 0,
        shares: prevTotals.shares > 0 ? ((totals.shares - prevTotals.shares) / prevTotals.shares) * 100 : 0,
      };

      return { kol, latest: latestMap, previous: prevMap, totals, deltas };
    });
  }, [publishedKols, metrics]);

  // Aggregate totals
  const aggregateTotals = useMemo(() => {
    const t = { views: 0, likes: 0, comments: 0, shares: 0 };
    for (const s of kolSummaries) {
      t.views += s.totals.views;
      t.likes += s.totals.likes;
      t.comments += s.totals.comments;
      t.shares += s.totals.shares;
    }
    return t;
  }, [kolSummaries]);

  // Time-series for aggregate chart (grouped by recorded_at date)
  const trendData = useMemo(() => {
    const dayMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();

    // We need the latest metric per kol+platform per day
    const byDay = new Map<string, Map<string, VideoMetric>>();
    for (const m of metrics) {
      const day = m.recorded_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Map());
      const key = `${m.kol_id}_${m.platform}`;
      const existing = byDay.get(day)!.get(key);
      if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
        byDay.get(day)!.set(key, m);
      }
    }

    for (const [day, metricsMap] of byDay) {
      const totals = { views: 0, likes: 0, comments: 0, shares: 0 };
      for (const m of metricsMap.values()) {
        totals.views += m.views;
        totals.likes += m.likes;
        totals.comments += m.comments;
        totals.shares += m.shares;
      }
      dayMap.set(day, totals);
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totals]) => ({ date, ...totals }));
  }, [metrics]);

  // Sparkline data per KOL (views over time)
  const sparklineData = useCallback(
    (kolId: string): { date: string; views: number }[] => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kolId);
      const dayMap = new Map<string, number>();
      for (const m of kolMetrics) {
        const day = m.recorded_at.slice(0, 10);
        dayMap.set(day, (dayMap.get(day) || 0) + m.views);
      }
      return Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, views]) => ({ date, views }));
    },
    [metrics],
  );

  const refresh = useCallback(() => fetchMetrics(kolIdsKey ? kolIdsKey.split(',') : []), [fetchMetrics, kolIdsKey]);

  return { metrics, kolSummaries, aggregateTotals, trendData, sparklineData, loading, refresh };
}
```

---

## `src/components/agency/ChangeLog.tsx`

```tsx
import type { KOL } from '@/lib/mock-data';
import { STAGE_LABELS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface ChangeLogProps {
  changeLog?: KOL['changeLog'];
}

export function ChangeLog({ changeLog }: ChangeLogProps) {
  if (!changeLog || changeLog.length === 0) {
    return <p className="text-xs text-muted-foreground">No history yet.</p>;
  }
  const sorted = [...changeLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-0">
      {sorted.map((entry, index) => (
        <div key={entry.id} className="flex gap-3">
          {/* Timeline line + dot */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'h-2 w-2 rounded-full mt-1.5 shrink-0',
              index === 0 ? 'bg-primary' : 'bg-border'
            )} />
            {index < sorted.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0">
            <div className="text-sm text-foreground">
              {entry.fromStage ? (
                <>
                  <span className="text-muted-foreground">
                    {STAGE_LABELS[entry.fromStage]}
                  </span>
                  <span className="text-muted-foreground mx-1.5">&rarr;</span>
                  <span className="font-medium">{STAGE_LABELS[entry.toStage]}</span>
                </>
              ) : (
                <span className="font-medium">Created at {STAGE_LABELS[entry.toStage]}</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(entry.timestamp).toLocaleString()}
            </div>
            {entry.note && (
              <div className="text-xs text-muted-foreground mt-1 italic">
                {entry.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## `src/components/agency/KolDetailPanel.tsx`

```tsx
import { useState } from 'react';
import { useKolChangelog } from '@/hooks/useKolChangelog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChangeLog } from './ChangeLog';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import { StageLabel } from '@/components/kol/StageLabel';
import type { KOL, Stage, Platform } from '@/lib/mock-data';
import { STAGE_LABELS, getDaysInStage, isOverdue } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Clock, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';

interface KolDetailPanelProps {
  kol: KOL | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStage: (kolId: string, stage: Stage, note?: string) => void;
  onUpdateField: (kolId: string, updates: Partial<KOL>) => void;
  onToggleFocus: (kolId: string) => void;
}

const ALLOWED_STAGES: Stage[] = [
  'writing_idea',
  'writing_script',
  'video_production',
  'pre_publish',
  'published',
];

const LINK_STAGES: { key: Stage; label: string }[] = [
  { key: 'writing_idea', label: 'Idea' },
  { key: 'writing_script', label: 'Script' },
  { key: 'creating_project', label: 'Project' },
  { key: 'video_production', label: 'Video' },
];

const REVISION_OPTIONS = [
  { value: 3, label: '3' },
  { value: 2, label: '2' },
  { value: 1, label: '1' },
  { value: 0, label: 'Final' },
];

function RevisionPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {REVISION_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={value === opt.value ? 'default' : 'outline'}
          className="h-8 px-3 text-xs"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X' },
  { value: 'facebook', label: 'Facebook' },
];

interface PubLink {
  platform: Platform;
  url: string;
}

function parsePubLinks(stageLinks: Record<string, string> | undefined): PubLink[] {
  if (!stageLinks) return [{ platform: 'youtube', url: '' }];
  const entries: PubLink[] = [];
  for (const [key, val] of Object.entries(stageLinks)) {
    if (key.startsWith('pub_')) {
      const pipeIdx = val.indexOf('|');
      if (pipeIdx >= 0) {
        entries.push({ platform: val.slice(0, pipeIdx) as Platform, url: val.slice(pipeIdx + 1) });
      }
    }
  }
  if (entries.length === 0) return [{ platform: 'youtube', url: '' }];
  return entries;
}

function serializePubLinks(links: PubLink[], existingStageLinks: Record<string, string> | undefined): Record<string, string> {
  // Remove old pub_ keys, keep other stage links
  const cleaned: Record<string, string> = {};
  if (existingStageLinks) {
    for (const [key, val] of Object.entries(existingStageLinks)) {
      if (!key.startsWith('pub_')) cleaned[key] = val;
    }
  }
  links.forEach((link, i) => {
    cleaned[`pub_${i}`] = `${link.platform}|${link.url}`;
  });
  return cleaned;
}

function PublicationLinks({
  stageLinks,
  onChange,
}: {
  stageLinks: Record<string, string> | undefined;
  onChange: (updated: Record<string, string>) => void;
}) {
  const links = parsePubLinks(stageLinks);

  const update = (newLinks: PubLink[]) => {
    onChange(serializePubLinks(newLinks, stageLinks));
  };

  const handlePlatformChange = (idx: number, platform: Platform) => {
    const next = [...links];
    next[idx] = { ...next[idx], platform };
    update(next);
  };

  const handleUrlChange = (idx: number, url: string) => {
    const next = [...links];
    next[idx] = { ...next[idx], url };
    update(next);
  };

  const addRow = () => {
    update([...links, { platform: 'youtube', url: '' }]);
  };

  const removeRow = (idx: number) => {
    const next = links.filter((_, i) => i !== idx);
    update(next.length > 0 ? next : [{ platform: 'youtube', url: '' }]);
  };

  return (
    <div className="space-y-2.5">
      {links.map((link, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Select value={link.platform} onValueChange={(v) => handlePlatformChange(idx, v as Platform)}>
            <SelectTrigger className="h-7 w-[110px] text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="https://..."
            className="h-7 text-xs"
            value={link.url}
            onChange={(e) => handleUrlChange(idx, e.target.value)}
          />
          {links.length > 1 && (
            <button
              onClick={() => removeRow(idx)}
              className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
        <Plus className="h-3 w-3" />
        Add Link
      </Button>
    </div>
  );
}

export function KolDetailPanel({
  kol,
  open,
  onOpenChange,
  onUpdateStage,
  onUpdateField,
  onToggleFocus,
}: KolDetailPanelProps) {
  const [selectedStage, setSelectedStage] = useState<Stage | ''>('');
  const { logs: changeLog } = useKolChangelog(open && kol ? kol.id : null);

  if (!kol) return null;

  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt) && kol.currentStage !== 'published';

  const handleStageChange = (value: string) => {
    const newStage = value as Stage;
    setSelectedStage(newStage);
    onUpdateStage(kol.id, newStage);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {kol.name}
            <PlatformIcons platforms={kol.platforms} />
          </SheetTitle>
          <SheetDescription>
            {kol.contentDirection || 'No content direction specified'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Current status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current Stage
              </Label>
              <div className="flex items-center gap-1.5">
                <Clock className={cn('h-3 w-3', overdue ? 'text-overdue' : 'text-muted-foreground')} />
                <span className={cn('text-xs', overdue ? 'text-overdue font-medium' : 'text-muted-foreground')}>
                  {days}d
                </span>
              </div>
            </div>
            <StageLabel stage={kol.currentStage} />
          </div>

          <Separator />

          {/* Update stage */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Update Stage
            </Label>
            <Select value={selectedStage || kol.currentStage} onValueChange={handleStageChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage-specific fields */}
          {kol.currentStage === 'writing_script' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Est. Remaining Revisions (Script)
                </Label>
                <RevisionPicker
                  value={kol.scriptVersion}
                  onChange={(v) => onUpdateField(kol.id, { scriptVersion: v })}
                />
              </div>
            </>
          )}

          {kol.currentStage === 'video_production' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Est. Remaining Revisions (Video)
                </Label>
                <RevisionPicker
                  value={kol.videoVersion}
                  onChange={(v) => onUpdateField(kol.id, { videoVersion: v })}
                />
              </div>
            </>
          )}

          {kol.currentStage === 'pre_publish' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Feishu Document URL
                </Label>
                <Input
                  placeholder="https://feishu.cn/docs/..."
                  value={kol.feishuUrl || ''}
                  onChange={(e) => onUpdateField(kol.id, { feishuUrl: e.target.value })}
                />
              </div>
            </>
          )}

          {kol.currentStage !== 'pre_publish' && kol.currentStage !== 'published' && (
            <>
              <Separator />

              {/* Review Material Link — only for current stage */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" />
                  Review Material Link
                </Label>
                <div className="space-y-2.5">
                  {LINK_STAGES
                    .filter(({ key }) => {
                      // For parallel stages, show both script and project
                      if (kol.currentStage === 'writing_script') {
                        return key === 'writing_script' || key === 'creating_project';
                      }
                      return key === kol.currentStage;
                    })
                    .map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                      <Input
                        placeholder="https://..."
                        className="h-7 text-xs"
                        value={kol.stageLinks?.[key] || ''}
                        onChange={(e) => {
                          const updated = { ...(kol.stageLinks || {}), [key]: e.target.value };
                          onUpdateField(kol.id, { stageLinks: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {kol.currentStage === 'published' && (
            <>
              <Separator />

              {/* Publication Links — platform + url rows */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" />
                  Publication Link
                </Label>
                <PublicationLinks
                  stageLinks={kol.stageLinks}
                  onChange={(updated) => onUpdateField(kol.id, { stageLinks: updated })}
                />
              </div>
            </>
          )}

          {kol.currentStage !== 'pre_publish' && kol.currentStage !== 'published' && (
            <>
              <Separator />

              {/* Today's Focus toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Flag for Today's Focus</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Highlights this KOL on the dashboard
                  </p>
                </div>
                <Switch
                  checked={kol.isTodaysFocus}
                  onCheckedChange={() => onToggleFocus(kol.id)}
                />
              </div>
            </>
          )}

          <Separator />

          {/* Change log */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Change History
            </Label>
            <ChangeLog changeLog={changeLog} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

