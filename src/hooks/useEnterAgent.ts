import { useState, useCallback } from 'react';
import { HttpAgent } from '@ag-ui/client';

const AGENT_BASE = 'https://api.enter.pro/code/api/v1/agents/22f8279e-3481-414c-b595-84115ab6dd18';
// Public test key — replace with backend-proxied call once edge functions are back online
const AGENT_API_KEY = 'ek_301552d3166ae45f2f66d9a8de1d8cef7612ab281199c837b2acfce657ffe2db';

export interface AgentEvent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function useEnterAgent() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Create a new thread (call once per session) */
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

  /** Send a message to the agent and stream events */
  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setRunning(true);
      setEvents([]);
      try {
        const tid = threadId || (await createThread());
        const agent = new HttpAgent({
          url: `${AGENT_BASE}/run`,
          threadId: tid,
          initialMessages: [{ id: `m-${Date.now()}`, role: 'user', content }],
          headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
        });
        await agent.runAgent(
          {},
          {
            onEvent: ({ event }: { event: AgentEvent }) => {
              setEvents((prev) => [...prev, event]);
            },
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error('[useEnterAgent]', msg);
      } finally {
        setRunning(false);
      }
    },
    [threadId, createThread],
  );

  return { events, running, threadId, error, sendMessage, createThread };
}
