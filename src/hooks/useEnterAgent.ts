import { useState, useCallback, useRef } from 'react';
import { HttpAgent } from '@ag-ui/client';
import { AGENT_TOOLS, executeAgentTool } from '@/lib/agent-tools';

const AGENT_BASE = 'https://api.enter.pro/code/api/v1/agents/22f8279e-3481-414c-b595-84115ab6dd18';
const AGENT_API_KEY = 'ek_301552d3166ae45f2f66d9a8de1d8cef7612ab281199c837b2acfce657ffe2db';
const MAX_TOOL_ROUNDS = 5;

export interface AgentEvent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolCalls?: any[];
}

export function useEnterAgent() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const createThread = useCallback(async (): Promise<string> => {
    const res = await fetch(`${AGENT_BASE}/threads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AGENT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Create thread failed: ${await res.text()}`);
    const { thread_id } = await res.json();
    setThreadId(thread_id);
    return thread_id;
  }, []);

  /** Run a single round; returns whether more rounds are needed (i.e. tool calls happened) */
  const runOnce = useCallback(
    async (
      tid: string,
      messages: ChatMessage[],
      onEvent?: (evt: AgentEvent) => void,
    ): Promise<{ pendingToolCalls: { id: string; name: string; args: Record<string, unknown> }[] }> => {
      const pending: { id: string; name: string; args: Record<string, unknown> }[] = [];
      const argBuffers = new Map<string, { name: string; buffer: string }>();

      const agent = new HttpAgent({
        url: `${AGENT_BASE}/run`,
        threadId: tid,
        initialMessages: messages,
        headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
      });

      await agent.runAgent(
        { tools: AGENT_TOOLS },
        {
          onEvent: ({ event }) => {
            const evt = event as unknown as AgentEvent;
            setEvents((prev) => [...prev, evt]);
            onEvent?.(evt);

            // Track tool calls
            if (evt.type === 'ToolCallStart' && evt.toolCallId && evt.toolCallName) {
              argBuffers.set(evt.toolCallId as string, {
                name: evt.toolCallName as string,
                buffer: '',
              });
            }
            if (evt.type === 'ToolCallArgs' && evt.toolCallId && typeof evt.delta === 'string') {
              const entry = argBuffers.get(evt.toolCallId as string);
              if (entry) entry.buffer += evt.delta;
            }
            if (evt.type === 'ToolCallEnd' && evt.toolCallId) {
              const entry = argBuffers.get(evt.toolCallId as string);
              if (entry) {
                let parsed: Record<string, unknown> = {};
                try {
                  parsed = entry.buffer ? JSON.parse(entry.buffer) : {};
                } catch {
                  parsed = { _raw: entry.buffer };
                }
                pending.push({ id: evt.toolCallId as string, name: entry.name, args: parsed });
              }
            }
          },
        },
      );

      return { pendingToolCalls: pending };
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string, onEvent?: (evt: AgentEvent) => void) => {
      setError(null);
      setRunning(true);
      setEvents([]);

      try {
        const tid = threadId || (await createThread());

        // Initial user message
        messagesRef.current = [
          ...messagesRef.current,
          { id: `m-${Date.now()}`, role: 'user', content },
        ];

        // Loop: run agent, if it requests tool calls, execute and feed back
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const { pendingToolCalls } = await runOnce(tid, messagesRef.current, onEvent);

          if (pendingToolCalls.length === 0) break;

          // Execute all tool calls in parallel, append results as tool messages
          const results = await Promise.all(
            pendingToolCalls.map(async (tc) => {
              const result = await executeAgentTool(tc.name, tc.args);
              return { id: tc.id, name: tc.name, result };
            }),
          );

          for (const r of results) {
            messagesRef.current.push({
              id: `tool-${r.id}`,
              role: 'tool',
              toolCallId: r.id,
              content: JSON.stringify(r.result),
            });
            // Emit synthetic event so UI can show tool execution
            const syntheticEvt: AgentEvent = {
              type: 'TOOL_EXECUTED',
              toolCallId: r.id,
              toolName: r.name,
              result: r.result,
            };
            setEvents((prev) => [...prev, syntheticEvt]);
            onEvent?.(syntheticEvt);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error('[useEnterAgent]', msg);
      } finally {
        setRunning(false);
      }
    },
    [threadId, createThread, runOnce],
  );

  return { events, running, threadId, error, sendMessage, createThread };
}
