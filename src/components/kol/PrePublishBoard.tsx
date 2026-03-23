import { Badge } from '@/components/ui/badge';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import type { KOL, Agency } from '@/lib/mock-data';
import { getDaysInStage, isOverdue, getAgencyById } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Clock, ExternalLink, FileCheck } from 'lucide-react';

interface PrePublishBoardProps {
  kols: KOL[];
  agencies: Agency[];
}

export function PrePublishBoard({ kols, agencies }: PrePublishBoardProps) {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {kols.map((kol) => {
        const agency = getAgencyById(agencies, kol.agencyId);
        return <PrePublishCard key={kol.id} kol={kol} agency={agency} />;
      })}
    </div>
  );
}

function PrePublishCard({ kol, agency }: { kol: KOL; agency?: Agency }) {
  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover',
        overdue && 'border-l-2 border-l-overdue',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-card-foreground">{kol.name}</span>
          <PlatformIcons platforms={kol.platforms} />
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className={cn('h-3 w-3', overdue ? 'text-overdue' : 'text-muted-foreground')} />
          <span className={cn('text-xs font-medium', overdue ? 'text-overdue' : 'text-muted-foreground')}>
            {days}d
          </span>
        </div>
      </div>

      {/* Details grid */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Script</span>
          <span className="font-medium text-card-foreground">v{kol.scriptVersion}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Video</span>
          <span className="font-medium text-card-foreground">v{kol.videoVersion}</span>
        </div>
        {kol.feishuUrl && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Materials</span>
            <a
              href={kol.feishuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline font-medium"
            >
              Feishu Doc
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {!kol.feishuUrl && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Materials</span>
            <span className="text-warning text-[11px] font-medium">Not submitted</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Suppress lint warning
void FileCheck;
