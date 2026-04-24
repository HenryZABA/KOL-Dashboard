import type { KOL } from '@/lib/types';
import { STAGE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChangeLogProps {
  changeLog?: KOL['changeLog'];
}

export function ChangeLog({ changeLog }: ChangeLogProps) {
  if (!changeLog || changeLog.length === 0) {
    return <p className="text-xs text-muted-foreground">No history yet.</p>;
  }
  const sorted = [...changeLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-0">
      {sorted.map((entry, index) => (
        <div key={entry.id} className="flex gap-3">
          {/* Timeline line + dot */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'h-2 w-2 rounded-full mt-1.5 shrink-0',
              index === 0 ? 'bg-primary' : 'bg-border'
            )} />
            {index < sorted.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0">
            <div className="text-sm text-foreground">
              {entry.fromStage ? (
                <>
                  <span className="text-muted-foreground">
                    {STAGE_LABELS[entry.fromStage]}
                  </span>
                  <span className="text-muted-foreground mx-1.5">&rarr;</span>
                  <span className="font-medium">{STAGE_LABELS[entry.toStage]}</span>
                </>
              ) : (
                <span className="font-medium">Created at {STAGE_LABELS[entry.toStage]}</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(entry.timestamp).toLocaleString()}
            </div>
            {entry.note && (
              <div className="text-xs text-muted-foreground mt-1 italic">
                {entry.note}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
