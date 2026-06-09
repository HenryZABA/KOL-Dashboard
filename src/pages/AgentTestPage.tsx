import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEnterAgent } from '@/hooks/useEnterAgent';
import { Loader2, Send } from 'lucide-react';

export default function AgentTestPage() {
  const [input, setInput] = useState('');
  const { events, running, threadId, error, sendMessage } = useEnterAgent();

  const handleSend = () => {
    if (!input.trim() || running) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Enter Agent Test</h1>
        <p className="text-sm text-muted-foreground">
          Thread: {threadId || '—'} {running && '(running...)'}
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          disabled={running}
        />
        <Button onClick={handleSend} disabled={running || !input.trim()}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <Card className="p-3 border-destructive bg-destructive/10 text-destructive text-sm">
          {error}
        </Card>
      )}

      <Card className="p-3">
        <h2 className="font-semibold mb-2 text-sm">Streamed Events ({events.length})</h2>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 font-mono text-xs">
            {events.map((evt, i) => (
              <div key={i} className="border-l-2 border-primary pl-2">
                <div className="text-primary font-bold">{evt.type}</div>
                <pre className="text-muted-foreground whitespace-pre-wrap break-all">
                  {JSON.stringify(evt, null, 2)}
                </pre>
              </div>
            ))}
            {events.length === 0 && !running && (
              <div className="text-muted-foreground italic">No events yet. Send a message above.</div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
