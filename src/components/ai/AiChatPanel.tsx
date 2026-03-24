import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

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

  const isWaiting = message.isStreaming && !message.thinking && !message.content;

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
              'rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap',
              message.isStreaming && 'animate-pulse-subtle',
            )}
          >
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-1 h-3.5 bg-foreground/50 animate-pulse ml-0.5 align-text-bottom" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
