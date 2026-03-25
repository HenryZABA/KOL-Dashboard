import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import type { KolMetricSummary } from '@/hooks/useVideoMetrics';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

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

interface KolTickerCardProps {
  summary: KolMetricSummary;
  sparkline: { date: string; views: number }[];
}

export function KolTickerCard({ summary, sparkline }: KolTickerCardProps) {
  const { kol, totals, deltas } = summary;
  const hasData = totals.views > 0 || totals.likes > 0;
  const overallTrend = deltas.views;

  return (
    <div
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
        <PlatformIcons platforms={kol.platforms} className="shrink-0" />
      </div>

      {/* Sparkline */}
      {sparkline.length > 1 && (
        <div className="h-10 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline}>
              <defs>
                <linearGradient id={`spark-${kol.id}`} x1="0" y1="0" x2="0" y2="1">
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
              <Area
                type="monotone"
                dataKey="views"
                stroke={overallTrend >= 0 ? 'hsl(var(--metric-up))' : 'hsl(var(--metric-down))'}
                strokeWidth={1.5}
                fill={`url(#spark-${kol.id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

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
              <span className="text-xs font-semibold text-card-foreground">{formatNumber(totals[key])}</span>
              <DeltaBadge value={deltas[key]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">No data yet</p>
      )}
    </div>
  );
}
