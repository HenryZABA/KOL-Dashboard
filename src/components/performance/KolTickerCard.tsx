import { TrendingUp, TrendingDown, Minus, Calendar, Users, UserPlus, CreditCard } from 'lucide-react';
import { LinkedPlatformIcons } from '@/components/kol/PlatformIcon';
import type { KolMetricSummary } from '@/hooks/useVideoMetrics';
import type { KolConversion } from '@/hooks/useKolConversions';
import { cn } from '@/lib/utils';
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

interface KolTickerCardProps {
  summary: KolMetricSummary;
  sparkline: { date: string; views: number }[];
  conversion?: KolConversion;
}

export function KolTickerCard({ summary, sparkline, conversion }: KolTickerCardProps) {
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
        <LinkedPlatformIcons platforms={kol.platforms} stageLinks={kol.stageLinks} className="shrink-0" />
      </div>

      {/* Sparkline */}
      {sparkline.length > 0 && (
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
                fill={`url(#spark-${kol.id})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: overallTrend >= 0 ? 'hsl(var(--metric-up))' : 'hsl(var(--metric-down))' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Published date + Metrics row */}
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
              <span className="text-xs font-semibold text-card-foreground">{formatNumber(totals[key])}</span>
              <DeltaBadge value={deltas[key]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">No data yet</p>
      )}

      {/* Conversion funnel row */}
      {conversion && conversion.triggered_users > 0 && (
        <div className="border-t border-border pt-3 mt-1">
          <div className="grid grid-cols-5 gap-1.5">
            <div className="flex flex-col items-center">
              <Users className="h-3 w-3 text-muted-foreground mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Reached</span>
              <span className="text-xs font-semibold text-card-foreground">{formatNumber(conversion.triggered_users)}</span>
            </div>
            <div className="flex flex-col items-center">
              <UserPlus className="h-3 w-3 text-muted-foreground mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Signups</span>
              <span className="text-xs font-semibold text-card-foreground">{formatNumber(conversion.signups)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Sign CVR</span>
              <span className="text-xs font-semibold text-[hsl(var(--primary))]">
                {(conversion.signups / conversion.triggered_users * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col items-center">
              <CreditCard className="h-3 w-3 text-muted-foreground mb-0.5" />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Paid</span>
              <span className="text-xs font-semibold text-card-foreground">{formatNumber(conversion.paid_users)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Paid CVR</span>
              <span className="text-xs font-semibold text-[hsl(var(--primary))]">
                {conversion.signups > 0 ? (conversion.paid_users / conversion.signups * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
