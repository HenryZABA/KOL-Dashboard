import { Badge } from '@/components/ui/badge';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import type { KOL, Agency } from '@/lib/mock-data';
import { getDaysInStage, isOverdue, getAgencyById } from '@/lib/mock-data';
import { cn, openExternal } from '@/lib/utils';
import { Clock, ExternalLink, FileCheck, X } from 'lucide-react';

interface PrePublishBoardProps {
  kols: KOL[];
  agencies: Agency[];
  onDismiss?: (kolId: string) => void;
}

export function PrePublishBoard({ kols, agencies, onDismiss }: PrePublishBoardProps) {
  if (kols.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-sm text-muted-foreground">
          No KOLs in pre-publish confirmation stage.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:w-[540px]">
      {kols.map((kol) => {
        const agency = getAgencyById(agencies, kol.agencyId);
        return <PrePublishCard key={kol.id} kol={kol} agency={agency} onDismiss={onDismiss} />;
      })}
    </div>
  );
}

function PrePublishCard({ kol, agency, onDismiss }: { kol: KOL; agency?: Agency; onDismiss?: (kolId: string) => void }) {
  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt);

  return (
    <div
      className={cn(
        'relative group flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover',
        overdue && 'border-l-2 border-l-overdue',
      )}
    >
      {onDismiss && (
        <button
          onClick={() => onDismiss(kol.id)}
          className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive opacity-0 group-hover:opacity-100 transition-all"
          title="Dismiss"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Header: name left, platform icons right */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-card-foreground">{kol.name}</span>
        <PlatformIcons platforms={kol.platforms} />
      </div>

      {/* Footer: materials + days + agency, pushed to bottom */}
      <div className="mt-auto flex flex-col gap-2.5">
        {/* Materials */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Materials</span>
          {kol.feishuUrl ? (
            <button
              type="button"
              onClick={() => openExternal(kol.feishuUrl!)}
              className="flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
            >
              Feishu Doc
              <ExternalLink className="h-3 w-3" />
            </button>
          ) : (
            <span className="text-warning text-[11px] font-medium">Not submitted</span>
          )}
        </div>
        {/* Days + agency */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock className={cn('h-3 w-3', overdue ? 'text-overdue' : 'text-muted-foreground')} />
            <span className={cn('text-xs font-medium', overdue ? 'text-overdue' : 'text-muted-foreground')}>
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
    </div>
  );
}

void FileCheck;
