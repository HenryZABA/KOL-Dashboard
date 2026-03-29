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
import { BookOpen, Plus, Trash2, FileText, Type, Loader2, Layers } from 'lucide-react';

interface KBEntry {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  source_doc_id: string | null;
  chunk_index: number | null;
  created_at: string;
}

interface GroupedDoc {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  chunkCount: number;
}

/** Split long text into chunks for storage */
function chunkText(text: string, maxLen = 800, minLen = 200): string[] {
  const paraSplitter = /\n\n+/;
  const paragraphs = text.split(paraSplitter);
  const rawChunks: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxLen) {
      rawChunks.push(trimmed);
    } else {
      const sentenceSplitter = /(?<=[。.！!？?\n])/;
      const sentences = trimmed.split(sentenceSplitter);
      let buf = '';
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
  let acc = '';
  for (const c of rawChunks) {
    if (acc.length + c.length + 2 <= maxLen) {
      acc = acc ? acc + '\n\n' + c : c;
    } else {
      if (acc) merged.push(acc);
      acc = c;
    }
  }
  if (acc) merged.push(acc);

  if (merged.length > 1) {
    const final: string[] = [];
    let buf2 = '';
    for (const m of merged) {
      if (buf2.length < minLen && buf2.length + m.length + 2 <= maxLen) {
        buf2 = buf2 ? buf2 + '\n\n' + m : m;
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

  // Group entries: show parent docs (source_doc_id is null), count their chunks
  const groupedDocs: GroupedDoc[] = (() => {
    const parents = entries.filter((e) => e.source_doc_id === null);
    const chunkMap = new Map<string, number>();
    for (const e of entries) {
      if (e.source_doc_id) {
        chunkMap.set(e.source_doc_id, (chunkMap.get(e.source_doc_id) || 0) + 1);
      }
    }
    return parents.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      file_url: p.file_url,
      file_type: p.file_type,
      created_at: p.created_at,
      chunkCount: chunkMap.get(p.id) || 0,
    }));
  })();

  const handleDelete = async (id: string) => {
    await supabase.from('knowledge_base').delete().eq('source_doc_id', id);
    await supabase.from('knowledge_base').delete().eq('id', id);
    setEntries((prev) =>
      prev.filter((e) => e.id !== id && e.source_doc_id !== id)
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">AI Knowledge Base</h1>
          <span className="text-sm text-muted-foreground">({groupedDocs.length})</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Manage AI reference materials here. You can add entries manually, or upload documents via the{' '}
        <a href="/dashboard/ai" className="text-primary font-medium hover:underline">AI Chat</a>{' '}
        where they will be automatically analyzed and saved.
        Long documents are automatically split into chunks for more precise AI retrieval.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : groupedDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <BookOpen className="h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No entries yet. Add brand guidelines or reference materials.</p>
        </div>
      ) : (
        <div className="grid gap-3 max-w-3xl">
          {groupedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-card"
            >
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                {doc.file_url ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : doc.chunkCount > 0 ? (
                  <Layers className="h-4 w-4 text-primary" />
                ) : (
                  <Type className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">{doc.title}</h3>
                  {doc.chunkCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {doc.chunkCount} chunks
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {doc.content || (doc.chunkCount > 0 ? '(Chunked document)' : '(File attachment)')}
                </p>
                {doc.file_url && (
                  <p className="text-[11px] text-primary font-medium">
                    {doc.file_type || 'File'} attached
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleDelete(doc.id)}
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

    const trimmedContent = content.trim();
    const chunks = chunkText(trimmedContent);

    if (chunks.length <= 1) {
      await supabase.from('knowledge_base').insert({
        title: title.trim(),
        content: trimmedContent,
      });
    } else {
      const { data: parent } = await supabase
        .from('knowledge_base')
        .insert({ title: title.trim(), content: '' })
        .select('id')
        .single();

      if (parent) {
        const chunkRows = chunks.map((c, i) => ({
          title: `${title.trim()} [${i + 1}/${chunks.length}]`,
          content: c,
          source_doc_id: parent.id,
          chunk_index: i,
        }));
        await supabase.from('knowledge_base').insert(chunkRows);
      }
    }

    setSaving(false);
    setTitle('');
    setContent('');
    onOpenChange(false);
    onAdded();
  };

  const chunks = chunkText(content.trim());
  const willChunk = chunks.length > 1;

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
            <div className="flex items-center justify-between">
              <Label className="text-xs">Content</Label>
              {willChunk && (
                <span className="text-[10px] text-muted-foreground">
                  Will be split into {chunks.length} chunks
                </span>
              )}
            </div>
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
