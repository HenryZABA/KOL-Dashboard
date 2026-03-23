import type { KOL, Agency } from '@/lib/mock-data';
import { KolKanbanCard } from './KolKanbanCard';
import { cn } from '@/lib/utils';

interface KolKanbanColumnProps {
  label: string;
  kols: KOL[];
  agencies: Agency[];
  className?: string;
}

const COLUMN_HEADER_COLORS: Record<string, string> = {
  'Writing Idea': 'bg-stage-idea',
  'Writing Script / Creating Project': 'bg-stage-script',
  'Video Production': 'bg-stage-video',
  'Pre-publish Confirmation': 'bg-stage-confirm',
  'Published': 'bg-stage-published',
};

export function KolKanbanColumn({ label, kols, agencies, className }: KolKanbanColumnProps) {
  const dotColor = COLUMN_HEADER_COLORS[label] || 'bg-muted-foreground';

  return (
    <div className={cn('flex flex-col min-w-[260px] max-w-[300px] shrink-0', className)}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={cn('h-2 w-2 rounded-full', dotColor)} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {kols.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
        {kols.map((kol) => {
          const agency = agencies.find((a) => a.id === kol.agencyId);
          return <KolKanbanCard key={kol.id} kol={kol} agency={agency} />;
        })}

        {kols.length === 0 && (
          <div className="flex items-center justify-center rounded-md border border-dashed py-8 text-xs text-muted-foreground">
            No KOLs
          </div>
        )}
      </div>
    </div>
  );
}
