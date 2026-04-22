import { useState, useMemo } from 'react';
import { Eye, Heart, MessageCircle, Share2, Trophy } from 'lucide-react';
import type { KolMetricSummary } from '@/hooks/useVideoMetrics';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type TimeRange = '1W' | '1M' | '3M' | 'ALL';

const RANGES: { key: TimeRange; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: 'ALL', label: 'ALL', days: Infinity },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-card">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-card-foreground">{formatNumber(value)}</p>
      </div>
    </div>
  );
}

interface MarketOverviewProps {
  totals: { views: number; likes: number; comments: number; shares: number };
  trendData: { date: string; views: number; likes: number; comments: number; shares: number }[];
  kolSummaries: KolMetricSummary[];
}

export function MarketOverview({ totals, trendData, kolSummaries }: MarketOverviewProps) {
  const [range, setRange] = useState<TimeRange>('1M');

  const filteredTrend = useMemo(() => {
    if (range === 'ALL' || trendData.length === 0) return trendData;
    const days = RANGES.find((r) => r.key === range)!.days;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return trendData.filter((d) => d.date >= cutoffStr);
  }, [trendData, range]);

  // Top 3 performers by views
  const topPerformers = [...kolSummaries]
    .filter((s) => s.totals.views > 0)
    .sort((a, b) => b.totals.views - a.totals.views)
    .slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Eye} label="Total Views" value={totals.views} color="bg-primary/10 text-primary" />
        <StatCard icon={Heart} label="Total Likes" value={totals.likes} color="bg-[hsl(var(--metric-up))]/10 text-[hsl(var(--metric-up))]" />
        <StatCard icon={MessageCircle} label="Total Comments" value={totals.comments} color="bg-[hsl(var(--stage-idea))]/10 text-[hsl(var(--stage-idea))]" />
        <StatCard icon={Share2} label="Total Shares" value={totals.shares} color="bg-[hsl(var(--stage-script))]/10 text-[hsl(var(--stage-script))]" />
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Trend chart */}
        <div className="flex-1 rounded-lg border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-card-foreground">Daily Views Growth Rate (%)</h3>
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors',
                    range === r.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-card-foreground hover:bg-muted',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {filteredTrend.length > 0 ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredTrend}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: string) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    padding={{ right: 10 }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Views Growth']}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#viewsGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">No trend data yet</p>
            </div>
          )}
        </div>

        {/* Top performers */}
        <div className="w-full lg:w-[260px] shrink-0 rounded-lg border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-[hsl(var(--stage-idea))]" />
            <h3 className="text-sm font-medium text-card-foreground">Top Performers</h3>
          </div>
          {topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((s, idx) => (
                <div key={s.kol.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      idx === 0
                        ? 'bg-[hsl(var(--stage-idea))]/15 text-[hsl(var(--stage-idea))]'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">{s.kol.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatNumber(s.totals.views)} views</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
