import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useKolStore } from '@/lib/kol-store';
import { isOverdue, STAGE_LABELS, type Stage } from '@/lib/mock-data';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
const STAGE_DOT_COLORS: Record<string, string> = {
  writing_idea: 'bg-stage-idea',
  writing_script: 'bg-stage-script',
  creating_project: 'bg-stage-script',
  video_production: 'bg-stage-video',
  pre_publish: 'bg-stage-confirm',
  published: 'bg-stage-published'
};
export function SummaryBar() {
  const {
    kols
  } = useKolStore();
  const stats = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    let overdueCount = 0;
    for (const kol of kols) {
      const stage = kol.currentStage;
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      if (isOverdue(kol.stageUpdatedAt) && kol.currentStage !== 'published') {
        overdueCount++;
      }
    }
    return {
      total: kols.length,
      stageCounts,
      overdueCount
    };
  }, [kols]);
  const stageEntries = Object.entries(stats.stageCounts) as [Stage, number][];
  return <div className="flex items-center gap-4 border-b px-6 py-3 bg-background overflow-x-auto">
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium text-foreground">{stats.total}</span>
        <span className="text-sm text-muted-foreground">KOLs</span>
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      <div className="flex items-center gap-2 flex-wrap">
        {stageEntries.map(([stage, count]) => <Badge key={stage} variant="outline" className={cn('gap-1.5 text-[11px] font-normal py-0.5 px-2')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STAGE_DOT_COLORS[stage])} />
            {STAGE_LABELS[stage]}
            <span className="font-semibold text-foreground">{count}</span>
          </Badge>)}
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      
    </div>;
}