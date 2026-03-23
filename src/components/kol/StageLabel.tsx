import { Badge } from '@/components/ui/badge';
import type { KOL, Stage } from '@/lib/mock-data';
import { STAGE_LABELS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<Stage, string> = {
  writing_idea: 'bg-stage-idea/15 text-stage-idea border-stage-idea/30',
  writing_script: 'bg-stage-script/15 text-stage-script border-stage-script/30',
  creating_project: 'bg-stage-script/15 text-stage-script border-stage-script/30',
  video_production: 'bg-stage-video/15 text-stage-video border-stage-video/30',
  pre_publish: 'bg-stage-confirm/15 text-stage-confirm border-stage-confirm/30',
  published: 'bg-stage-published/15 text-stage-published border-stage-published/30',
};

interface StageLabelProps {
  stage: Stage;
  className?: string;
}

export function StageLabel({ stage, className }: StageLabelProps) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium', STAGE_COLORS[stage], className)}
    >
      {STAGE_LABELS[stage]}
    </Badge>
  );
}

interface ParallelStageLabelProps {
  kol: KOL;
  className?: string;
}

export function ParallelStageLabel({ kol, className }: ParallelStageLabelProps) {
  const isParallel = kol.currentStage === 'writing_script' || kol.currentStage === 'creating_project';

  if (!isParallel) {
    return <StageLabel stage={kol.currentStage} className={className} />;
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5">
        <StageLabel stage="writing_script" />
        <span className="text-[10px] text-muted-foreground">
          v{kol.scriptVersion} {kol.scriptComplete ? '(done)' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <StageLabel stage="creating_project" />
        <span className="text-[10px] text-muted-foreground">
          {kol.projectComplete ? '(done)' : '(in progress)'}
        </span>
      </div>
    </div>
  );
}
