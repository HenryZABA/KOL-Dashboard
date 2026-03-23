import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useKolStore } from '@/lib/kol-store';
import type { Platform, Agency, Stage } from '@/lib/mock-data';
import { STAGE_LABELS } from '@/lib/mock-data';
import { FileSpreadsheet, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, all imported KOLs are assigned to this agency (skip agency column matching) */
  fixedAgency?: Agency;
}

interface ParsedRow {
  name: string;
  platforms: Platform[];
  profileUrl: string;
  contentDirection: string;
  stage: Stage;
  agencyName: string;
  matchedAgency: Agency | undefined;
}

const PLATFORM_MAP: Record<string, Platform> = {
  yt: 'youtube',
  ytb: 'youtube',
  youtube: 'youtube',
  tt: 'tiktok',
  tiktok: 'tiktok',
  ig: 'instagram',
  ins: 'instagram',
  instagram: 'instagram',
  x: 'x',
  twitter: 'x',
};

/** Map Chinese progress labels to our Stage type */
const STATUS_MAP: Record<string, Stage> = {
  '待启动': 'writing_idea',
  'pending': 'writing_idea',
  '脚本制作中': 'writing_script',
  '脚本修改中': 'writing_script',
  '视频制作中': 'video_production',
  '视频修改中': 'video_production',
  '待发布': 'pre_publish',
  '已发布': 'published',
};

/** Fuzzy-match column headers to known field keys */
function matchHeader(header: string): string | null {
  const h = header.trim().toLowerCase().replace(/["""]/g, '');
  if (h === 'influencer name' || h === 'name' || h === 'kol name' || h === '达人名称') return 'name';
  if (h === 'account link' || h === 'profile url' || h === 'link' || h === 'url' || h === '账号链接') return 'profileUrl';
  if (h === 'category' || h === 'content direction' || h === 'direction' || h === '合作内容方向' || h === '内容方向') return 'contentDirection';
  if (h === 'platform' || h === '平台') return 'platform';
  if (h === 'type' || h === '类型') return 'type';
  if (h === 'agency name' || h === 'agency' || h === '机构' || h === '代理商') return 'agencyName';
  if (h === '进度' || h === 'progress' || h === 'status' || h === 'stage' || h === '状态') return 'stage';
  return null;
}

function parsePlatform(raw: string): Platform[] {
  // Pre-clean: remove descriptors like " - Video", " - Shorts"
  const cleaned = raw.replace(/\s*-\s*(video|shorts|reels|stories|post)\s*/gi, ' ');
  const parts = cleaned.split(/[,/&+\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const result: Platform[] = [];
  for (const p of parts) {
    const mapped = PLATFORM_MAP[p];
    if (mapped && !result.includes(mapped)) result.push(mapped);
  }
  return result;
}

function parseStage(raw: string): Stage {
  const trimmed = raw.trim().toLowerCase();
  // Check exact match first
  if (STATUS_MAP[raw.trim()]) return STATUS_MAP[raw.trim()];
  // Check lowercase
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (key.toLowerCase() === trimmed) return value;
  }
  return 'writing_idea';
}

function parseTsv(text: string, agencies: Agency[], fixedAgency?: Agency): ParsedRow[] {
  const lines = text.trim().split('\n').map((l) => l.split('\t'));
  if (lines.length < 2) return [];

  const headers = lines[0];
  const fieldMap: Record<number, string> = {};
  headers.forEach((h, i) => {
    const key = matchHeader(h);
    if (key) fieldMap[i] = key;
  });

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    // Skip empty lines
    if (cols.every((c) => !c.trim())) continue;

    const raw: Record<string, string> = {};
    for (const [idx, key] of Object.entries(fieldMap)) {
      raw[key] = (cols[Number(idx)] || '').trim();
    }

    if (!raw.name) continue;

    // Merge platform + type columns for broader platform detection
    const platformText = [raw.platform || '', raw.type || ''].join(' ');
    const platforms = parsePlatform(platformText);
    const stage = parseStage(raw.stage || '');

    let agencyName = '';
    let matchedAgency: Agency | undefined;

    if (fixedAgency) {
      matchedAgency = fixedAgency;
      agencyName = fixedAgency.name;
    } else {
      agencyName = raw.agencyName || '';
      matchedAgency = agencies.find(
        (a) => a.name.toLowerCase().replace(/\s+/g, '') === agencyName.toLowerCase().replace(/\s+/g, ''),
      );
    }

    rows.push({
      name: raw.name,
      platforms: platforms.length > 0 ? platforms : ['youtube'],
      profileUrl: raw.profileUrl || '',
      contentDirection: raw.contentDirection || '',
      stage,
      agencyName,
      matchedAgency,
    });
  }

  return rows;
}

export function CsvImportDialog({ open, onOpenChange, fixedAgency }: CsvImportDialogProps) {
  const { agencies, addKol } = useKolStore();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);

  const handleParse = useCallback(() => {
    const rows = parseTsv(rawText, agencies, fixedAgency);
    setParsed(rows);
    setResult(null);
  }, [rawText, agencies, fixedAgency]);

  const handleImport = useCallback(async () => {
    if (!parsed) return;
    setImporting(true);
    let success = 0;
    let skipped = 0;

    for (const row of parsed) {
      if (!row.matchedAgency) {
        skipped++;
        continue;
      }
      try {
        await addKol({
          name: row.name,
          platforms: row.platforms,
          agencyId: row.matchedAgency.id,
          profileUrl: row.profileUrl || undefined,
          contentDirection: row.contentDirection || undefined,
          initialStage: row.stage,
        });
        success++;
      } catch {
        skipped++;
      }
    }

    setImporting(false);
    setResult({ success, skipped });
  }, [parsed, addKol]);

  const handleClose = (v: boolean) => {
    if (!v) {
      setRawText('');
      setParsed(null);
      setResult(null);
    }
    onOpenChange(v);
  };

  const unmatchedCount = parsed?.filter((r) => !r.matchedAgency).length || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import KOLs from CSV
          </DialogTitle>
          <DialogDescription>
            Paste tab-separated data (copied from a spreadsheet). Auto-detects: Influencer Name, Platform, Account link, Category, Agency Name, and Progress status.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Import complete</p>
            <p className="text-xs text-muted-foreground">
              {result.success} KOL(s) added{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
            </p>
            <Button size="sm" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : !parsed ? (
          <div className="space-y-3">
            <Textarea
              placeholder={"Agency Name\tInfluencer Name\tPlatform\tCategory\t进度\t...\nInpander\tAi Lockup\tYT\tAI\t视频制作中\t..."}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>Parse Data</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Found <span className="font-medium text-foreground">{parsed.length}</span> KOL(s)
              </p>
              {unmatchedCount > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  {unmatchedCount} unmatched agency
                </Badge>
              )}
            </div>

            <div className="border rounded-md overflow-auto max-h-[320px]">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Platform</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Direction</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Stage</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Agency</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsed.map((row, i) => (
                    <tr key={i} className={cn(!row.matchedAgency && 'bg-amber-50 dark:bg-amber-950/20')}>
                      <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.platforms.join(', ')}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{row.contentDirection || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{STAGE_LABELS[row.stage]}</td>
                      <td className="px-3 py-2">
                        {row.matchedAgency ? (
                          <span className="text-foreground">{row.matchedAgency.name}</span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {row.agencyName || 'N/A'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {unmatchedCount > 0 && (
              <p className="text-[11px] text-amber-600">
                Rows with unmatched agencies will be skipped during import.
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { setParsed(null); setResult(null); }}>Back</Button>
              <Button onClick={handleImport} disabled={importing || parsed.length === 0}>
                {importing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Importing...
                  </>
                ) : (
                  `Import ${parsed.length - unmatchedCount} KOL(s)`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
