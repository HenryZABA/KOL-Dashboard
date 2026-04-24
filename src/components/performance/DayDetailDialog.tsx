import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformIcon } from '@/components/kol/PlatformIcon';
import type { KolMetricSummary } from '@/hooks/useVideoMetrics';
import type { KolConversionAgg, KolConversion } from '@/hooks/useKolConversions';
import type { Platform } from '@/lib/mock-data';
import { cn, openExternal, formatNumber, parsePubLinks } from '@/lib/utils';

interface DayDetailDialogProps {
  date: string;
  entries: KolMetricSummary[];
  conversionMap: Map<string, KolConversionAgg>;
  conversionsByKol: Map<string, KolConversion[]>;
  open: boolean;
  onClose: () => void;
}

export function DayDetailDialog({ date, entries, conversionMap, conversionsByKol, open, onClose }: DayDetailDialogProps) {
  const dateTotals = useMemo(() => {
    let views = 0, reached = 0, signups = 0, paid = 0;
    for (const e of entries) {
      views += e.totals.views;
      const c = conversionMap.get(e.kol.id);
      if (c) { reached += c.triggered_users; signups += c.signups; paid += c.paid_users; }
    }
    return { views, reached, signups, paid };
  }, [entries, conversionMap]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{date}</DialogTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
            <span>Views {formatNumber(dateTotals.views)}</span>
            <span>Reached {formatNumber(dateTotals.reached)}</span>
            <span>Signups {formatNumber(dateTotals.signups)}</span>
            <span>Paid {formatNumber(dateTotals.paid)}</span>
          </div>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {entries.map((s) => (
            <DetailRow
              key={s.kol.id}
              summary={s}
              conversion={conversionMap.get(s.kol.id)}
              conversions={conversionsByKol.get(s.kol.id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ summary, conversion, conversions }: {
  summary: KolMetricSummary;
  conversion?: KolConversionAgg;
  conversions?: KolConversion[];
}) {
  const { kol, totals } = summary;
  const pubMap = parsePubLinks(kol.stageLinks);

  const signR = conversion && conversion.triggered_users > 0
    ? (conversion.signups / conversion.triggered_users * 100).toFixed(1) + '%' : '-';
  const paidR = conversion && conversion.signups > 0
    ? (conversion.paid_users / conversion.signups * 100).toFixed(1) + '%' : '-';

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5 w-36 shrink-0 min-w-0">
        <span className="font-medium text-card-foreground truncate">{kol.name}</span>
        {kol.platforms.map((p: Platform) => {
          const url = pubMap[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => url && openExternal(url)}
              title={url ? `Open ${p}` : p}
              className={cn(
                'rounded p-0.5 shrink-0 transition-opacity',
                url ? 'cursor-pointer hover:opacity-100 opacity-70' : 'opacity-50',
              )}
            >
              <PlatformIcon platform={p} className="h-3 w-3" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 ml-auto text-[10px]">
        <MetricCell label="Views" value={formatNumber(totals.views)} />
        {conversion && conversion.triggered_users > 0 && (
          <>
            <MetricCell label="Reached" value={formatNumber(conversion.triggered_users)} />
            <MetricCell label="Signups" value={formatNumber(conversion.signups)} />
            <MetricCell label="Sign R" value={signR} highlight />
            <MetricCell label="Paid" value={formatNumber(conversion.paid_users)} />
            <MetricCell label="Paid R" value={paidR} highlight />
          </>
        )}
      </div>
    </div>
  );
}

function MetricCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-[2.5rem]">
      <span className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', highlight ? 'text-[hsl(var(--primary))]' : 'text-card-foreground')}>
        {value}
      </span>
    </div>
  );
}
