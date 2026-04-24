import { useState } from 'react';
import type { KOL, Agency } from '@/lib/types';
import { KolKanbanCard } from './KolKanbanCard';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface KolKanbanColumnProps {
  label: string;
  kols: KOL[];
  agencies: Agency[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

const COLUMN_HEADER_COLORS: Record<string, string> = {
  'Idea': 'bg-stage-idea',
  'Script / Project': 'bg-stage-script',
  'Video': 'bg-stage-video',
  'Pre-publish Confirmation': 'bg-stage-confirm',
  'Published': 'bg-stage-published',
};

export function KolKanbanColumn({ label, kols, agencies, collapsible, defaultCollapsed = false, className }: KolKanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const dotColor = COLUMN_HEADER_COLORS[label] || 'bg-muted-foreground';

  if (collapsible && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          'flex flex-col items-center gap-3 min-w-[44px] max-w-[44px] shrink-0 rounded-lg border bg-muted/40 py-4 px-1 hover:bg-muted/80 transition-colors cursor-pointer',
          className,
        )}
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground bg-background rounded-full px-2 py-0.5">
          {kols.length}
        </span>
        <span className="text-xs font-semibold text-foreground [writing-mode:vertical-lr] tracking-wider">
          {label}
        </span>
      </button>
    );
  }

  return (
    <div className={cn('flex flex-col min-w-[260px] max-w-[300px] shrink-0', className)}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={cn('h-2 w-2 rounded-full', dotColor)} />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{label}</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {kols.length}
        </span>
        {collapsible && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse column"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          </button>
        )}
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
