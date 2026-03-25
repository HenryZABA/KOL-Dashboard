import { useMemo, useState } from 'react';
import { useKolStore } from '@/lib/kol-store';
import { useVideoMetrics } from '@/hooks/useVideoMetrics';
import { KolTickerCard } from '@/components/performance/KolTickerCard';
import { MarketOverview } from '@/components/performance/MarketOverview';
import { BarChart3, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'views' | 'likes' | 'comments' | 'shares';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
];

export default function PerformancePage() {
  const { kols, agencies } = useKolStore();

  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('views');
  const [sortDesc, setSortDesc] = useState(true);

  const activeAgencies = useMemo(() => {
    const agencyIds = new Set(kols.filter((k) => k.currentStage === 'published').map((k) => k.agencyId));
    return agencies.filter((a) => agencyIds.has(a.id));
  }, [kols, agencies]);

  const publishedKols = useMemo(() => {
    return kols.filter((k) => {
      if (k.currentStage !== 'published') return false;
      if (selectedAgencyId && k.agencyId !== selectedAgencyId) return false;
      return true;
    });
  }, [kols, selectedAgencyId]);

  const { kolSummaries, aggregateTotals, trendData, sparklineData, loading } = useVideoMetrics(publishedKols);

  const sortedSummaries = useMemo(() => {
    return [...kolSummaries].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDesc ? b.kol.name.localeCompare(a.kol.name) : a.kol.name.localeCompare(b.kol.name);
      }
      const aVal = a.totals[sortBy];
      const bVal = b.totals[sortBy];
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
  }, [kolSummaries, sortBy, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Performance</h1>
        <span className="text-sm text-muted-foreground">({publishedKols.length} published)</span>
      </div>

      {/* Agency filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedAgencyId(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            !selectedAgencyId
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
          )}
        >
          All
        </button>
        {activeAgencies.map((agency) => (
          <button
            key={agency.id}
            onClick={() => setSelectedAgencyId(selectedAgencyId === agency.id ? null : agency.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              selectedAgencyId === agency.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {agency.name}
          </button>
        ))}
      </div>

      {/* Market Overview */}
      <MarketOverview totals={aggregateTotals} trendData={trendData} kolSummaries={kolSummaries} />

      {/* Ticker Board */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">KOL Performance Board</h2>
          <div className="flex items-center gap-1.5">
            {SORT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                  sortBy === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {label}
                {sortBy === key && <ArrowUpDown className="h-2.5 w-2.5" />}
              </button>
            ))}
          </div>
        </div>

        {sortedSummaries.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
            <p className="text-sm text-muted-foreground">
              No published KOLs yet. KOLs will appear here after reaching the Published stage.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedSummaries.map((summary) => (
              <KolTickerCard
                key={summary.kol.id}
                summary={summary}
                sparkline={sparklineData(summary.kol.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
