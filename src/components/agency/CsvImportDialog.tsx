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
import type { Platform, Agency } from '@/lib/mock-data';
import { FileSpreadsheet, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  name: string;
  platforms: Platform[];
  profileUrl: string;
  contentDirection: string;
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

/** Fuzzy-match column headers to known field keys */
function matchHeader(header: string): string | null {
  const h = header.trim().toLowerCase();
  if (h === 'influencer name' || h === 'name' || h === 'kol name') return 'name';
  if (h === 'account link' || h === 'profile url' || h === 'link' || h === 'url') return 'profileUrl';
  if (h === 'category' || h === 'content direction' || h === 'direction') return 'contentDirection';
  if (h === 'platform') return 'platform';
  if (h === 'type') return 'type';
  if (h === 'agency name' || h === 'agency') return 'agencyName';
  return null;
}

function parsePlatform(raw: string): Platform[] {
  const parts = raw.split(/[,/&+\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const result: Platform[] = [];
  for (const p of parts) {
    const mapped = PLATFORM_MAP[p];
    if (mapped && !result.includes(mapped)) result.push(mapped);
  }
  return result;
}

function parseTsv(text: string, agencies: Agency[]): ParsedRow[] {
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
    const raw: Record<string, string> = {};
    for (const [idx, key] of Object.entries(fieldMap)) {
      raw[key] = (cols[Number(idx)] || '').trim();
    }

    if (!raw.name) continue;

    // Merge platform + type columns for broader platform detection
    const platformText = [raw.platform || '', raw.type || ''].join(' ');
    const platforms = parsePlatform(platformText);
    const agencyName = raw.agencyName || '';
    const matchedAgency = agencies.find(
      (a) => a.name.toLowerCase().replace(/\s+/g, '') === agencyName.toLowerCase().replace(/\s+/g, ''),
    );

    rows.push({
      name: raw.name,
      platforms: platforms.length > 0 ? platforms : ['youtube'],
      profileUrl: raw.profileUrl || '',
      contentDirection: raw.contentDirection || '',
      agencyName,
      matchedAgency,
    });
  }

  return rows;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const { agencies, addKol } = useKolStore();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);

  const handleParse = useCallback(() => {
    const rows = parseTsv(rawText, agencies);
    setParsed(rows);
    setResult(null);
  }, [rawText, agencies]);

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
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import KOLs from CSV
          </DialogTitle>
          <DialogDescription>
            Paste tab-separated data (copied from a spreadsheet). The system will auto-detect columns like Influencer Name, Platform, Account link, Category, and Agency Name.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* Success state */
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Import complete
            </p>
            <p className="text-xs text-muted-foreground">
              {result.success} KOL(s) added{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
            </p>
            <Button size="sm" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : !parsed ? (
          /* Step 1: Paste CSV */
          <div className="space-y-3">
            <Textarea
              placeholder={"Agency Name\tAccount link\tInfluencer Name\tCategory\tPlatform\t...\nInpander\thttps://...\tAi Lockup\tAI\tYT\t..."}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Parse Data
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Step 2: Preview parsed data */
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
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Agency</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsed.map((row, i) => (
                    <tr key={i} className={cn(!row.matchedAgency && 'bg-amber-50 dark:bg-amber-950/20')}>
                      <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.platforms.join(', ')}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{row.contentDirection || '-'}</td>
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
              <Button variant="outline" onClick={() => { setParsed(null); setResult(null); }}>
                Back
              </Button>
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
