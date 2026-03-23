import { Badge } from '@/components/ui/badge';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import type { KOL, Agency } from '@/lib/mock-data';
import { getDaysInStage, isOverdue } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { AlertCircle, Pin, Clock } from 'lucide-react';

interface KolKanbanCardProps {
  kol: KOL;
  agency?: Agency;
}

export function KolKanbanCard({ kol, agency }: KolKanbanCardProps) {
  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt) && kol.currentStage !== 'published';
  const isParallel = kol.currentStage === 'writing_script' || kol.currentStage === 'creating_project';

  return (
    <div
      className={cn(
        'rounded-md border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover space-y-2',
        overdue && 'border-l-2 border-l-overdue',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-card-foreground truncate">{kol.name}</span>
          {kol.isTodaysFocus && <Pin className="h-3 w-3 text-primary shrink-0" />}
          {overdue && <AlertCircle className="h-3 w-3 text-overdue shrink-0" />}
        </div>
        <PlatformIcons platforms={kol.platforms} className="shrink-0" />
      </div>

      {/* Stage detail */}
      {isParallel && (
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Script:</span>
            <span className="font-medium text-card-foreground">
              v{kol.scriptVersion} {kol.scriptComplete ? '(done)' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Project:</span>
            <span className="font-medium text-card-foreground">
              {kol.projectComplete ? '(done)' : '(in progress)'}
            </span>
          </div>
        </div>
      )}

      {kol.currentStage === 'video_production' && (
        <div className="text-[11px] text-muted-foreground">
          Version: <span className="font-medium text-card-foreground">v{kol.videoVersion}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <Clock className={cn('h-3 w-3', overdue ? 'text-overdue' : 'text-muted-foreground')} />
          <span className={cn('text-[11px]', overdue ? 'text-overdue font-medium' : 'text-muted-foreground')}>
            {days}d
          </span>
        </div>
        {agency && (
          <Badge variant="secondary" className="text-[10px] font-normal py-0 px-1.5">
            {agency.name}
          </Badge>
        )}
      </div>
    </div>
  );
}
