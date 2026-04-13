import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { PlatformIcon } from '@/components/kol/PlatformIcon';
import type { KolMetricSummary, MetricTotals } from '@/hooks/useVideoMetrics';
import type { KolConversion, KolConversionAgg } from '@/hooks/useKolConversions';
import type { Platform } from '@/lib/mock-data';
import { cn, openExternal } from '@/lib/utils';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function parsePubLinks(stageLinks?: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  if (!stageLinks) return map;
  for (const [key, val] of Object.entries(stageLinks)) {
    if (key.startsWith('pub_')) {
      const i = val.indexOf('|');
      if (i >= 0) { const url = val.slice(i + 1); if (url) map[val.slice(0, i)] = url; }
    }
  }
  return map;
}

interface DateTimelineProps {
  kolSummaries: KolMetricSummary[];
  conversionMap: Map<string, KolConversionAgg>;
  conversionsByKol: Map<string, KolConversion[]>;
}

export function DateTimeline({ kolSummaries, conversionMap, conversionsByKol }: DateTimelineProps) {
  // Group by published_at date
  const grouped = useMemo(() => {
    const map = new Map<string, KolMetricSummary[]>();
    for (const s of kolSummaries) {
      const dateStr = s.kol.publishedAt
        ? new Date(s.kol.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown';
      const arr = map.get(dateStr) || [];
      arr.push(s);
      map.set(dateStr, arr);
    }
    // Sort by date descending
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Unknown') return 1;
      if (b[0] === 'Unknown') return -1;
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [kolSummaries]);

  return (
    <div className="space-y-5">
      {grouped.map(([date, entries]) => (
        <DateGroup key={date} date={date} entries={entries} conversionMap={conversionMap} conversionsByKol={conversionsByKol} />
      ))}
    </div>
  );
}

function DateGroup({
  date, entries, conversionMap, conversionsByKol,
}: {
  date: string;
  entries: KolMetricSummary[];
  conversionMap: Map<string, KolConversionAgg>;
  conversionsByKol: Map<string, KolConversion[]>;
}) {
  // Aggregate totals for the date
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
    <div className="space-y-1.5">
      {/* Date header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{date}</span>
        <span className="text-xs text-muted-foreground">{entries.length} KOL{entries.length > 1 ? 's' : ''}</span>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Views {fmt(dateTotals.views)}</span>
          <span>Reached {fmt(dateTotals.reached)}</span>
          <span>Signups {fmt(dateTotals.signups)}</span>
          <span>Paid {fmt(dateTotals.paid)}</span>
        </div>
      </div>

      {/* KOL rows */}
      {entries.map((s) => (
        <TimelineRow key={s.kol.id} summary={s} conversion={conversionMap.get(s.kol.id)} conversions={conversionsByKol.get(s.kol.id)} />
      ))}
    </div>
  );
}

function TimelineRow({ summary, conversion, conversions }: { summary: KolMetricSummary; conversion?: KolConversionAgg; conversions?: KolConversion[] }) {
  const { kol, totals, perPlatform } = summary;
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const pubMap = parsePubLinks(kol.stageLinks);

  const displayTotals: MetricTotals = activePlatform
    ? (perPlatform[activePlatform]?.totals ?? totals)
    : totals;

  // Get conversion data matching active platform (or aggregated if none)
  const displayConversion = useMemo(() => {
    if (!activePlatform) return conversion;
    if (!conversions) return undefined;
    const match = conversions.find((c) => c.platform === activePlatform);
    return match ? { kol_id: match.kol_id, triggered_users: match.triggered_users, signups: match.signups, paid_users: match.paid_users } : undefined;
  }, [activePlatform, conversion, conversions]);

  const handlePlatformClick = (p: Platform) => {
    if (activePlatform === p) {
      const url = pubMap[p];
      if (url) openExternal(url);
      else setActivePlatform(null);
    } else {
      setActivePlatform(p);
    }
  };

  const signR = displayConversion && displayConversion.triggered_users > 0
    ? (displayConversion.signups / displayConversion.triggered_users * 100).toFixed(1) + '%' : '-';
  const paidR = displayConversion && displayConversion.signups > 0
    ? (displayConversion.paid_users / displayConversion.signups * 100).toFixed(1) + '%' : '-';

  return (
    <div
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs cursor-default"
    >
      {/* Name + icons */}
      <div className="flex items-center gap-1.5 w-44 shrink-0 min-w-0">
        <span className="font-medium text-card-foreground truncate">{kol.name}</span>
        {kol.platforms.map((p) => {
          const isActive = activePlatform === p;
          return (
            <button
              key={p}
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handlePlatformClick(p); }}
              title={isActive ? `Open ${p} link` : `View ${p} data`}
              className={cn(
                'rounded p-1 transition-all cursor-pointer shrink-0',
                isActive
                  ? 'bg-primary/15 ring-1 ring-primary/50 scale-110'
                  : 'hover:bg-accent opacity-70 hover:opacity-100',
              )}
            >
              <PlatformIcon platform={p} className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 ml-auto text-[11px]">
        <Metric label="Views" value={fmt(displayTotals.views)} />
        {displayConversion && displayConversion.triggered_users > 0 && (
          <>
            <Metric label="Reached" value={fmt(displayConversion.triggered_users)} />
            <Metric label="Signups" value={fmt(displayConversion.signups)} />
            <Metric label="Sign R" value={signR} highlight />
            <Metric label="Paid" value={fmt(displayConversion.paid_users)} />
            <Metric label="Paid R" value={paidR} highlight />
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', highlight ? 'text-[hsl(var(--primary))]' : 'text-card-foreground')}>
        {value}
      </span>
    </div>
  );
}
