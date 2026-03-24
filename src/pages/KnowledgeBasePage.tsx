import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { BookOpen, Plus, Trash2, FileText, Type, Loader2 } from 'lucide-react';

interface KBEntry {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

export default function KnowledgeBasePage() {
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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">AI Knowledge Base</h1>
          <span className="text-sm text-muted-foreground">({entries.length})</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Add brand guidelines, review standards, FAQs, and reference materials here. The AI assistant will automatically use this information when helping agencies.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No entries yet. Add brand guidelines or reference materials.</p>
        </div>
      ) : (
        <div className="grid gap-3 max-w-3xl">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-card"
            >
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                {entry.file_url ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <Type className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-medium text-foreground">{entry.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {entry.content || '(File attachment)'}
                </p>
                {entry.file_url && (
                  <p className="text-[11px] text-primary font-medium">
                    {entry.file_type || 'File'} attached
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddEntryDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdded={fetchEntries}
      />
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
            Add brand guidelines, review standards, or any reference information for the AI assistant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              placeholder="e.g. Brand Voice Guidelines"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Content</Label>
            <Textarea
              placeholder="Enter the reference content..."
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
