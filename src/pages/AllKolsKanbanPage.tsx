import { useMemo, useState } from 'react';
import { useKolStore } from '@/lib/kol-store';
import { KANBAN_COLUMNS, getKanbanColumn, isOverdue, type Platform } from '@/lib/mock-data';
import { KolKanbanColumn } from '@/components/kol/KolKanbanColumn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

export default function AllKolsKanbanPage() {
  const { kols, agencies } = useKolStore();
  const [agencyFilter, setAgencyFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filteredKols = useMemo(() => {
    return kols.filter((kol) => {
      if (agencyFilter !== 'all' && kol.agencyId !== agencyFilter) return false;
      if (platformFilter !== 'all' && !kol.platforms.includes(platformFilter as Platform)) return false;
      if (overdueOnly && (!isOverdue(kol.stageUpdatedAt) || kol.currentStage === 'published')) return false;
      return true;
    });
  }, [kols, agencyFilter, platformFilter, overdueOnly]);

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => ({
      ...col,
      kols: filteredKols.filter((kol) => getKanbanColumn(kol) === col.key),
    }));
  }, [filteredKols]);

  return (
    <div className="flex flex-col h-full">
      {/* Header + Filters */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 border-b">
        <div className="flex items-center gap-2 mr-auto">
          <Users className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">All KOLs</h1>
        </div>

        <Select value={agencyFilter} onValueChange={setAgencyFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Agencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agencies</SelectItem>
            {agencies.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="overdue-toggle" checked={overdueOnly} onCheckedChange={setOverdueOnly} />
          <Label htmlFor="overdue-toggle" className="text-xs text-muted-foreground cursor-pointer">
            Overdue only
          </Label>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-5 h-full min-h-[400px]">
          {columns.map((col) => (
            <KolKanbanColumn
              key={col.key}
              label={col.label}
              kols={col.kols}
              agencies={agencies}
              collapsible={col.key === 'published'}
              defaultCollapsed={col.key === 'published'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
