import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEnterAgent, type AgentEvent } from '@/hooks/useEnterAgent';
import { Bot, Send, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/** Extract text deltas from streamed agent events */
function extractTextFromEvent(event: AgentEvent): string {
  // AG-UI protocol uses various event types
  if (event.type === 'TEXT_MESSAGE_CONTENT' && typeof event.delta === 'string') return event.delta;
  if (event.type === 'TEXT_MESSAGE_CHUNK' && typeof event.delta === 'string') return event.delta;
  // Fallback: try common field names
  if (typeof event.delta === 'string') return event.delta;
  if (typeof event.content === 'string' && event.type?.includes('TEXT')) return event.content;
  if (typeof event.text === 'string') return event.text;
  return '';
}

export function AgentFab() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { sendMessage, running, error } = useEnterAgent();

  // Auto-scroll on new messages/streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || running) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setInput('');
    setStreaming('');

    let acc = '';
    await sendMessage(text, (evt) => {
      console.log('[AgentFab] event:', evt.type, evt);
      const delta = extractTextFromEvent(evt);
      if (delta) {
        acc += delta;
        setStreaming(acc);
      }
    });

    if (acc) {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: acc }]);
    }
    setStreaming('');
  };

  const handleClear = () => {
    setMessages([]);
    setStreaming('');
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        aria-label="Open Agent"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Side panel */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Enter Agent
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={handleClear} className="h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Ask the agent anything...
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {streaming && <MessageBubble role="assistant" content={streaming} streaming />}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="resize-none"
              disabled={running}
            />
            <Button onClick={handleSend} disabled={running || !input.trim()} size="icon">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}) {
  return (
    <div className={cn('flex', role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words',
          role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {content}
        {streaming && <span className="inline-block w-1 h-3 ml-1 bg-current animate-pulse" />}
      </div>
    </div>
  );
}
