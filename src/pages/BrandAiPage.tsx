import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AiChatPanel } from '@/components/ai/AiChatPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Type,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';

interface KBEntry {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

export default function BrandAiPage() {
  const [showKb, setShowKb] = useState(false);
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });
    setEntries((data as KBEntry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (id: string) => {
    await supabase.from('knowledge_base').delete().eq('id', id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Chat area */}
      <div className="flex-1 min-w-0 relative">
        <AiChatPanel
          saveToKb={true}
          heightClass="h-full"
          emptyDescription="Chat with AI to review content, get insights, or ask questions. Upload documents to automatically save them to the Knowledge Base for agency reference."
          onFileSaved={fetchEntries}
        />
        {/* KB toggle button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 gap-1.5 text-muted-foreground z-10"
          onClick={() => setShowKb(!showKb)}
        >
          {showKb ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
          <BookOpen className="h-3.5 w-3.5" />
          <span className="text-xs">{entries.length}</span>
        </Button>
      </div>

      {/* Knowledge Base sidebar */}
      {showKb && (
        <div className="w-[340px] border-l bg-card flex flex-col shrink-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Knowledge Base</h2>
            </div>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BookOpen className="h-6 w-6 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  No entries yet. Upload documents in the chat or add manually.
                </p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 rounded-lg border bg-background p-3 group"
                >
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    {entry.file_type ? (
                      <FileText className="h-3 w-3 text-primary" />
                    ) : (
                      <Type className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium text-foreground truncate">{entry.title}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {entry.content || '(File attachment)'}
                    </p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <AddEntryDialog open={showAdd} onOpenChange={setShowAdd} onAdded={fetchEntries} />
    </div>
  );
}

function AddEntryDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('knowledge_base').insert({
      title: title.trim(),
      content: content.trim(),
    });
    setSaving(false);
    setTitle('');
    setContent('');
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Knowledge Entry</DialogTitle>
          <DialogDescription>
            Add brand guidelines, review standards, or reference information for the AI.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input placeholder="e.g. Brand Voice Guidelines" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea placeholder="Enter the reference content..." rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
