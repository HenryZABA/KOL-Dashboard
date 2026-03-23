import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import { ParallelStageLabel } from '@/components/kol/StageLabel';
import type { KOL, Agency } from '@/lib/mock-data';
import { getDaysInStage, isOverdue } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Eye, Clock } from 'lucide-react';

interface KolFocusCardProps {
  kol: KOL;
  agency?: Agency;
  onViewDetails?: (kol: KOL) => void;
}

export function KolFocusCard({ kol, agency, onViewDetails }: KolFocusCardProps) {
  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card min-w-[260px] max-w-[300px] shrink-0 transition-shadow hover:shadow-card-hover',
        overdue && 'border-l-2 border-l-overdue',
      )}
    >
      {/* Header: name + platforms */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-card-foreground leading-tight">{kol.name}</span>
          <PlatformIcons platforms={kol.platforms} />
        </div>
        {agency && (
          <Badge variant="secondary" className="text-[10px] font-normal shrink-0 py-0.5">
            {agency.name}
          </Badge>
        )}
      </div>

      {/* Stage — fixed height to keep cards aligned */}
      <div className="min-h-[44px] flex items-start">
        <ParallelStageLabel kol={kol} />
      </div>

      {/* Bottom section — pushed to bottom for consistent alignment */}
      <div className="mt-auto flex flex-col gap-2">
        {/* Days waiting */}
        <div className="flex items-center gap-1.5">
          <Clock className={cn('h-3.5 w-3.5', overdue ? 'text-overdue' : 'text-muted-foreground')} />
          <span
            className={cn(
              'text-xs font-medium',
              overdue ? 'text-overdue' : 'text-muted-foreground',
            )}
          >
            {days}d in current stage
          </span>
        </div>

        {/* Actions */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onViewDetails?.(kol)}
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </Button>
      </div>
    </div>
  );
}
