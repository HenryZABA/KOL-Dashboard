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
  isStreaming?: boolean;
  toolSteps?: ToolStep[];
}

const FALLBACK_MESSAGES: Record<string, string> = {
  authentication_error: 'Authentication failed. Please refresh the page.',
  rate_limit_error: 'Too many requests. Please try again later.',
  insufficient_credits:
    "AI credits have been exhausted. Please contact the administrator.",
  permission_error:
    'AI capability is disabled. Please contact the administrator.',
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
    async (
      content: string,
      options?: {
        fileContent?: string;
        fileName?: string;
        saveToKb?: boolean;
      },
    ) => {
      abortRef.current = new AbortController();

      const displayContent = options?.fileName
        ? `${content}\n\n[${options.fileName}]`
        : content;
      const userMessage: ChatMessage = { role: 'user', content: displayContent };
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolSteps: [],
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      const aiContent = options?.fileContent
        ? `${content}\n\n--- Attached file: ${options.fileName} ---\n${options.fileContent}`
        : content;

      let accumulatedText = '';

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
                ...messages
                  .filter((m) => m.content.trim() !== '')
                  .map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: aiContent },
              ],
              model: 'anthropic/claude-sonnet-4.5',
              ...(options?.saveToKb && options?.fileContent
                ? {
                    saveToKb: true,
                    fileName: options.fileName,
                    fileContent: options.fileContent,
                  }
                : {}),
            }),
            signal: abortRef.current.signal,

            async onopen(response) {
              if (!response.ok) {
                const ct = response.headers.get('content-type');
                if (ct?.includes('application/json')) {
                  const body = await response.json();
                  throw new Error(
                    body.error?.message || body.error || `Request failed: ${response.status}`,
                  );
                }
                throw new Error(`Request failed: ${response.status}`);
              }
            },

            onmessage(event) {
              if (!event.data) return;
              let data: Record<string, unknown>;
              try {
                data = JSON.parse(event.data);
              } catch {
                return;
              }

              switch (data.type) {
                case 'error': {
                  const msg = getUserErrorMessage(
                    ((data.error as Record<string, unknown>)?.type as string) || 'api_error',
                    ((data.error as Record<string, unknown>)?.message as string) || 'Service error',
                  );
                  setError(msg);
                  setMessages((prev) => prev.slice(0, -1));
                  setIsLoading(false);
                  break;
                }

                case 'tool_start':
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        toolSteps: [
                          ...(last.toolSteps ?? []),
                          {
                            name: data.name as string,
                            input: (data.input as Record<string, unknown>) ?? {},
                            status: 'running' as const,
                          },
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
                            ? { ...s, summary: data.summary as string, status: 'done' as const }
                            : s,
                        ),
                      };
                    }
                    return updated;
                  });
                  break;

                case 'text_delta':
                  accumulatedText += (data.text as string) || '';
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: accumulatedText,
                      };
                    }
                    return updated;
                  });
                  break;

                case 'done':
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        isStreaming: false,
                      };
                    }
                    return updated;
                  });
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
