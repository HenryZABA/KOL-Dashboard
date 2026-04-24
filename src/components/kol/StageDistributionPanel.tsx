import { useMemo } from 'react';
import type { KOL, Stage } from '@/lib/types';
import { isOverdue } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface StageDistributionPanelProps {
  kols: KOL[];
}

const STAGES: { key: Stage | 'script_project'; label: string; color: string; stages: Stage[] }[] = [
  { key: 'writing_idea', label: 'Idea', color: 'bg-stage-idea', stages: ['writing_idea'] },
  { key: 'script_project', label: 'Script / Project', color: 'bg-stage-script', stages: ['writing_script', 'creating_project'] },
  { key: 'video_production', label: 'Video', color: 'bg-stage-video', stages: ['video_production'] },
  { key: 'pre_publish', label: 'Pre-publish', color: 'bg-stage-confirm', stages: ['pre_publish'] },
  { key: 'published', label: 'Published', color: 'bg-stage-published', stages: ['published'] },
];

export function StageDistributionPanel({ kols }: StageDistributionPanelProps) {
  const stats = useMemo(() => {
    const total = kols.length;
    const overdueCount = kols.filter(
      (k) => isOverdue(k.stageUpdatedAt) && k.currentStage !== 'published',
    ).length;
    const publishedCount = kols.filter((k) => k.currentStage === 'published').length;
    const completionPct = total > 0 ? Math.round((publishedCount / total) * 100) : 0;

    const stageData = STAGES.map((stage) => {
      const count = kols.filter((k) => (stage.stages as string[]).includes(k.currentStage)).length;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return { ...stage, count, pct };
    });

    return { total, overdueCount, completionPct, stageData };
  }, [kols]);

  // SVG ring params
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.completionPct / 100) * circumference;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card space-y-5 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Pipeline Overview</h3>
        </div>
        <span className="text-xs text-muted-foreground">{stats.total} KOLs</span>
      </div>

      {/* Top: Ring gauge + overdue */}
      <div className="flex items-center gap-5">
        {/* Ring gauge */}
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            {/* Background ring */}
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              stroke="hsl(var(--stage-published))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
              className="animate-ring-draw"
              style={{
                '--ring-circumference': circumference,
                '--ring-offset': offset,
              } as React.CSSProperties}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-foreground">{stats.completionPct}%</span>
            <span className="text-[9px] text-muted-foreground">Published</span>
          </div>
        </div>

        {/* Overdue + active */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="rounded-xl bg-muted/60 p-3 flex items-center gap-2">
            <AlertCircle className={cn('h-4 w-4', stats.overdueCount > 0 ? 'text-overdue' : 'text-muted-foreground')} />
            <div>
              <span className={cn('text-lg font-bold', stats.overdueCount > 0 ? 'text-overdue' : 'text-foreground')}>
                {stats.overdueCount}
              </span>
              <p className="text-[10px] text-muted-foreground leading-none">Overdue</p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">
                {stats.total - (stats.stageData.find((s) => s.key === 'published')?.count || 0)}
              </span>
              <p className="text-[10px] text-muted-foreground leading-none">In Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal bar chart */}
      <div className="space-y-3">
        <span className="text-xs font-medium text-muted-foreground">Stage Breakdown</span>
        <div className="space-y-2.5">
          {stats.stageData.map((stage, idx) => (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{stage.label}</span>
                <span className="text-muted-foreground tabular-nums">{stage.count}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full animate-bar-grow', stage.color)}
                  style={{
                    width: `${Math.max(stage.pct, stage.count > 0 ? 6 : 0)}%`,
                    animationDelay: `${idx * 0.1 + 0.3}s`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
