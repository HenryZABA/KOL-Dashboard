import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { PlatformIcon } from '@/components/kol/PlatformIcon';
import type { KolMetricSummary, MetricTotals } from '@/hooks/useVideoMetrics';
import type { KolConversion } from '@/hooks/useKolConversions';
import type { Platform } from '@/lib/mock-data';
import { cn, openExternal } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-2.5 w-2.5" />
        0%
      </span>
    );
  }
  const isUp = value > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium',
        isUp ? 'text-[hsl(var(--metric-up))]' : 'text-[hsl(var(--metric-down))]',
      )}
    >
      {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isUp ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

/** Parse pub_* entries from stageLinks into a platform -> url map */
function parsePubLinks(stageLinks?: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  if (!stageLinks) return map;
  for (const [key, val] of Object.entries(stageLinks)) {
    if (key.startsWith('pub_')) {
      const pipeIdx = val.indexOf('|');
      if (pipeIdx >= 0) {
        const platform = val.slice(0, pipeIdx);
        const url = val.slice(pipeIdx + 1);
        if (url) map[platform] = url;
      }
    }
  }
  return map;
}

interface KolTickerCardProps {
  summary: KolMetricSummary;
  sparkline: { date: string; views: number }[];
  sparklineByPlatform: (platform: Platform) => { date: string; views: number }[];
  conversion?: KolConversion;
}

export function KolTickerCard({ summary, sparkline, sparklineByPlatform, conversion }: KolTickerCardProps) {
  const { kol, totals, deltas, perPlatform } = summary;
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);

  const pubMap = parsePubLinks(kol.stageLinks);

  // Determine which data to display
  const displayTotals: MetricTotals = activePlatform ? (perPlatform[activePlatform]?.totals ?? totals) : totals;
  const displayDeltas: MetricTotals = activePlatform ? (perPlatform[activePlatform]?.deltas ?? deltas) : deltas;
  const displaySparkline = activePlatform ? sparklineByPlatform(activePlatform) : sparkline;

  const hasData = displayTotals.views > 0 || displayTotals.likes > 0;
  const overallTrend = displayDeltas.views;

  const handlePlatformClick = (p: Platform) => {
    if (activePlatform === p) {
      // Second click — open external link
      const url = pubMap[p];
      if (url) openExternal(url);
    } else {
      // First click — select platform to show its data
      setActivePlatform(p);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Click on card background deselects platform (but not on icons/buttons)
    if ((e.target as HTMLElement).closest('[data-platform-icon]')) return;
    if (activePlatform) {
      setActivePlatform(null);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'relative flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover',
        overallTrend > 0 && 'border-l-2 border-l-[hsl(var(--metric-up))]',
        overallTrend < 0 && 'border-l-2 border-l-[hsl(var(--metric-down))]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-card-foreground truncate">{kol.name}</span>
          <DeltaBadge value={overallTrend} />
        </div>
        {/* Platform icons with two-click interaction */}
        <div className="flex items-center gap-1 shrink-0">
          {kol.platforms.map((p) => {
            const isActive = activePlatform === p;
            const hasLink = !!pubMap[p];
            return (
              <button
                key={p}
                data-platform-icon
                onClick={(e) => { e.stopPropagation(); handlePlatformClick(p); }}
                title={isActive && hasLink ? `Open ${p} link` : `View ${p} data`}
                className={cn(
                  'rounded-md p-1 transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary/15 ring-1 ring-primary/50 scale-110'
                    : 'hover:bg-accent',
                  !hasLink && !isActive && 'opacity-40',
                )}
              >
                <PlatformIcon platform={p} className={cn(isActive && 'scale-105')} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Active platform indicator */}
      {activePlatform && (
        <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium -mt-1">
          <span className="capitalize">{activePlatform}</span>
          {pubMap[activePlatform] && <span className="text-muted-foreground">(click icon again to open link)</span>}
        </div>
      )}

      {/* Sparkline */}
      {displaySparkline.length > 0 && (
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displaySparkline}>
              <defs>
                <linearGradient id={`spark-${kol.id}-${activePlatform ?? 'all'}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={overallTrend >= 0 ? 'hsl(var(--metric-up))' : 'hsl(var(--metric-down))'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={overallTrend >= 0 ? 'hsl(var(--metric-up))' : 'hsl(var(--metric-down))'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as { date: string; views: number };
                  const v = d.views;
                  return (
                    <div className="rounded-md border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-sm">
                      <div className="font-medium">{d.date}</div>
                      <div className={cn(v > 0 ? 'text-[hsl(var(--metric-up))]' : v < 0 ? 'text-[hsl(var(--metric-down))]' : 'text-muted-foreground')}>
                        {v > 0 ? '+' : ''}{v.toFixed(1)}%
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke={overallTrend >= 0 ? 'hsl(var(--metric-up))' : 'hsl(var(--metric-down))'}
                strokeWidth={1.5}
                fill={`url(#spark-${kol.id}-${activePlatform ?? 'all'})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: overallTrend >= 0 ? 'hsl(var(--metric-up))' : 'hsl(var(--metric-down))' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Published date */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Calendar className="h-3 w-3" />
        <span>{kol.publishedAt ? new Date(kol.publishedAt).toLocaleDateString() : 'N/A'}</span>
      </div>

      {/* Metrics row */}
      {hasData ? (
        <div className="grid grid-cols-4 gap-2">
          {([
            { label: 'Views', key: 'views' as const },
            { label: 'Likes', key: 'likes' as const },
            { label: 'Comments', key: 'comments' as const },
            { label: 'Shares', key: 'shares' as const },
          ]).map(({ label, key }) => (
            <div key={key} className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
              <span className="text-xs font-semibold text-card-foreground">{formatNumber(displayTotals[key])}</span>
              <DeltaBadge value={displayDeltas[key]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">No data yet</p>
      )}

      {/* Conversion funnel row */}
      {conversion && conversion.triggered_users > 0 && (
        <div className="border-t border-border pt-2">
          <div className="grid grid-cols-5 gap-2">
            {([
              { label: 'Reached', value: formatNumber(conversion.triggered_users) },
              { label: 'Signups', value: formatNumber(conversion.signups) },
              { label: 'Sign R', value: `${(conversion.signups / conversion.triggered_users * 100).toFixed(1)}%`, highlight: true },
              { label: 'Paid', value: formatNumber(conversion.paid_users) },
              { label: 'Paid R', value: `${conversion.signups > 0 ? (conversion.paid_users / conversion.signups * 100).toFixed(1) : '0.0'}%`, highlight: true },
            ] as { label: string; value: string; highlight?: boolean }[]).map(({ label, value, highlight }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className={cn('text-xs font-semibold', highlight ? 'text-[hsl(var(--primary))]' : 'text-card-foreground')}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
