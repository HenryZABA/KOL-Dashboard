import { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { PlatformIcon } from '@/components/kol/PlatformIcon';
import type { KolMetricSummary, MetricTotals } from '@/hooks/useVideoMetrics';
import type { KolConversion } from '@/hooks/useKolConversions';
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
  conversionMap: Map<string, KolConversion>;
}

export function DateTimeline({ kolSummaries, conversionMap }: DateTimelineProps) {
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
        <DateGroup key={date} date={date} entries={entries} conversionMap={conversionMap} />
      ))}
    </div>
  );
}

function DateGroup({
  date, entries, conversionMap,
}: {
  date: string;
  entries: KolMetricSummary[];
  conversionMap: Map<string, KolConversion>;
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
        <TimelineRow key={s.kol.id} summary={s} conversion={conversionMap.get(s.kol.id)} />
      ))}
    </div>
  );
}

function TimelineRow({ summary, conversion }: { summary: KolMetricSummary; conversion?: KolConversion }) {
  const { kol, totals, perPlatform } = summary;
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const pubMap = parsePubLinks(kol.stageLinks);

  const displayTotals: MetricTotals = activePlatform
    ? (perPlatform[activePlatform]?.totals ?? totals)
    : totals;

  const handlePlatformClick = (p: Platform) => {
    if (activePlatform === p) {
      const url = pubMap[p];
      if (url) openExternal(url);
    } else {
      setActivePlatform(p);
    }
  };

  const signR = conversion && conversion.triggered_users > 0
    ? (conversion.signups / conversion.triggered_users * 100).toFixed(1) + '%' : '-';
  const paidR = conversion && conversion.signups > 0
    ? (conversion.paid_users / conversion.signups * 100).toFixed(1) + '%' : '-';

  return (
    <div
      onClick={() => activePlatform && setActivePlatform(null)}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs"
    >
      {/* Name + icons */}
      <div className="flex items-center gap-1.5 w-44 shrink-0 min-w-0">
        <span className="font-medium text-card-foreground truncate">{kol.name}</span>
        {kol.platforms.map((p) => {
          const isActive = activePlatform === p;
          return (
            <button
              key={p}
              onClick={(e) => { e.stopPropagation(); handlePlatformClick(p); }}
              title={isActive ? `Open ${p} link` : `View ${p} data`}
              className={cn(
                'rounded p-0.5 transition-all cursor-pointer shrink-0',
                isActive
                  ? 'bg-primary/15 ring-1 ring-primary/50 scale-110'
                  : 'hover:bg-accent',
                !pubMap[p] && !isActive && 'opacity-40',
              )}
            >
              <PlatformIcon platform={p} className="h-3 w-3" />
            </button>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 ml-auto text-[11px]">
        <Metric label="Views" value={fmt(displayTotals.views)} />
        {conversion && conversion.triggered_users > 0 && (
          <>
            <Metric label="Reached" value={fmt(conversion.triggered_users)} />
            <Metric label="Signups" value={fmt(conversion.signups)} />
            <Metric label="Sign R" value={signR} highlight />
            <Metric label="Paid" value={fmt(conversion.paid_users)} />
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
