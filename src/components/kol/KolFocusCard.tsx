import { Badge } from '@/components/ui/badge';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import { ParallelStageLabel } from '@/components/kol/StageLabel';
import type { KOL, Stage, Agency } from '@/lib/mock-data';
import { getDaysInStage, isOverdue } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Clock, ExternalLink } from 'lucide-react';

const STAGE_PROGRESS: Record<Stage, number> = {
  writing_idea: 10,
  writing_script: 30,
  creating_project: 30,
  video_production: 55,
  pre_publish: 80,
  published: 100,
};

const STAGE_STEPS: { label: string; stages: Stage[] }[] = [
  { label: 'Idea', stages: ['writing_idea'] },
  { label: 'Script', stages: ['writing_script', 'creating_project'] },
  { label: 'Video', stages: ['video_production'] },
  { label: 'Review', stages: ['pre_publish'] },
  { label: 'Live', stages: ['published'] },
];

interface KolFocusCardProps {
  kol: KOL;
  agency?: Agency;
}

function StageProgressBar({ stage, stageLinks }: { stage: Stage; stageLinks?: Record<string, string> }) {
  const pct = STAGE_PROGRESS[stage];
  const currentIdx = STAGE_STEPS.findIndex((s) => s.stages.includes(stage));

  return (
    <div className="flex flex-col gap-1.5">
      {/* Bar */}
      <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Step labels */}
      <div className="flex justify-between">
        {STAGE_STEPS.map((step, idx) => {
          // Check if any stage in this step has a link
          const link = stageLinks
            ? step.stages.map((s) => stageLinks[s]).find((url) => url && url.trim() !== '')
            : undefined;

          const labelClass = cn(
            'text-[9px] leading-none font-medium',
            idx <= currentIdx ? 'text-primary' : 'text-muted-foreground/50',
          );

          if (link) {
            return (
              <a
                key={step.label}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(labelClass, 'underline decoration-dotted underline-offset-2 hover:opacity-70 inline-flex items-center gap-0.5')}
              >
                {step.label}
                <ExternalLink className="h-2 w-2" />
              </a>
            );
          }

          return (
            <span key={step.label} className={labelClass}>
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function KolFocusCard({ kol, agency }: KolFocusCardProps) {
  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card min-w-[260px] max-w-[300px] shrink-0 transition-shadow hover:shadow-card-hover',
        overdue && 'border-l-2 border-l-overdue',
      )}
    >
      {/* Header: name + agency/platforms */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-card-foreground leading-tight">{kol.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <PlatformIcons platforms={kol.platforms} />
        </div>
      </div>

      {/* Stage — fixed height to keep cards aligned */}
      <div className="min-h-[44px] flex items-start">
        <ParallelStageLabel kol={kol} />
      </div>

      {/* Bottom section — pushed to bottom for consistent alignment */}
      <div className="mt-auto flex flex-col gap-2.5">
        {/* Days waiting + agency */}
        <div className="flex items-center justify-between">
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
          {agency && (
            <Badge variant="secondary" className="text-[10px] font-normal py-0 px-1.5 shrink-0">
              {agency.name}
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        <StageProgressBar stage={kol.currentStage} stageLinks={kol.stageLinks} />
      </div>
    </div>
  );
}
