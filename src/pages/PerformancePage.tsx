import { useMemo, useState } from 'react';
import { useKolStore } from '@/lib/kol-store';
import { useVideoMetrics } from '@/hooks/useVideoMetrics';
import { useKolConversions } from '@/hooks/useKolConversions';
import { KolTickerCard } from '@/components/performance/KolTickerCard';
import { MarketOverview } from '@/components/performance/MarketOverview';
import { CalendarView } from '@/components/performance/CalendarView';
import { BarChart3, ArrowUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ViewMode = 'cards' | 'calendar';
type SortKey = 'name' | 'views' | 'likes' | 'comments' | 'shares' | 'signups';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'signups', label: 'Signups' },
];

export default function PerformancePage() {
  const { kols, agencies } = useKolStore();

  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('views');
  const [sortDesc, setSortDesc] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  const activeAgencies = useMemo(() => {
    const agencyIds = new Set(kols.filter((k) => k.currentStage === 'published').map((k) => k.agencyId));
    return agencies.filter((a) => agencyIds.has(a.id));
  }, [kols, agencies]);

  const publishedKols = useMemo(() => {
    return kols.filter((k) => {
      if (k.currentStage !== 'published') return false;
      if (selectedAgencyId && k.agencyId !== selectedAgencyId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!k.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [kols, selectedAgencyId, searchQuery]);

  const { kolSummaries, aggregateTotals, trendData, sparklineData, sparklineDataByPlatform, loading } = useVideoMetrics(publishedKols);
  const { conversionMap, conversionsByKol } = useKolConversions(publishedKols.map((k) => k.id));

  const sortedSummaries = useMemo(() => {
    return [...kolSummaries].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDesc ? b.kol.name.localeCompare(a.kol.name) : a.kol.name.localeCompare(b.kol.name);
      }
      if (sortBy === 'signups') {
        const aSignups = conversionMap.get(a.kol.id)?.signups ?? 0;
        const bSignups = conversionMap.get(b.kol.id)?.signups ?? 0;
        return sortDesc ? bSignups - aSignups : aSignups - bSignups;
      }
      const aVal = a.totals[sortBy];
      const bVal = b.totals[sortBy];
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
  }, [kolSummaries, sortBy, sortDesc, conversionMap]);

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search KOLs..."
          className="pl-9 h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Market Overview */}
      <MarketOverview totals={aggregateTotals} trendData={trendData} kolSummaries={kolSummaries} />

      {/* Ticker Board */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-foreground">KOL Performance Board</h2>
            {/* View toggle */}
            <div className="flex items-center bg-muted rounded-md p-0.5 ml-2">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                  viewMode === 'cards' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                  viewMode === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Calendar
              </button>
            </div>
          </div>
          {viewMode === 'cards' && (
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
          )}
        </div>

        {viewMode === 'calendar' ? (
          <CalendarView kolSummaries={sortedSummaries} conversionMap={conversionMap} conversionsByKol={conversionsByKol} />
        ) : sortedSummaries.length === 0 ? (
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
                sparklineByPlatform={(platform) => sparklineDataByPlatform(summary.kol.id, platform)}
                conversion={conversionMap.get(summary.kol.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
