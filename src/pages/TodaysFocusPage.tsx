import { useCallback, useMemo, useState } from 'react';
import { useKolStore } from '@/lib/kol-store';
import { KolFocusCard } from '@/components/kol/KolFocusCard';
import { PrePublishBoard } from '@/components/kol/PrePublishBoard';
import { StageDistributionPanel } from '@/components/kol/StageDistributionPanel';
import { Crosshair, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TodaysFocusPage() {
  const { kols, agencies, toggleTodaysFocus } = useKolStore();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

  // Agencies that have at least 1 KOL
  const activeAgencies = useMemo(() => {
    const agencyIds = new Set(kols.map((k) => k.agencyId));
    return agencies.filter((a) => agencyIds.has(a.id));
  }, [kols, agencies]);

  const filteredKols = useMemo(() => {
    if (!selectedAgencyId) return kols;
    return kols.filter((k) => k.agencyId === selectedAgencyId);
  }, [kols, selectedAgencyId]);

  const focusKols = useMemo(() => {
    return filteredKols.filter(
      (kol) => kol.isTodaysFocus && kol.currentStage !== 'pre_publish',
    );
  }, [filteredKols]);

  const prePublishKols = useMemo(() => {
    return filteredKols.filter(
      (kol) => kol.currentStage === 'pre_publish' && kol.isTodaysFocus,
    );
  }, [filteredKols]);

  const handleDismiss = useCallback((kolId: string) => {
    toggleTodaysFocus(kolId);
  }, [toggleTodaysFocus]);

  return (
    <div className="p-6 space-y-8">
      {/* Agency channel filter */}
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

      {/* Today's Focus section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Today's Focus</h1>
          <span className="text-sm text-muted-foreground">({focusKols.length})</span>
        </div>

        {focusKols.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
            <p className="text-sm text-muted-foreground">
              No KOLs need attention right now. Everything is on track.
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {focusKols.map((kol) => (
              <KolFocusCard key={kol.id} kol={kol} agency={agencies.find((a) => a.id === kol.agencyId)} onDismiss={handleDismiss} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom: Pre-publish Board + Stage Distribution side by side */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Pre-publish Confirmation Board — fixed 2-col width */}
        <div className="space-y-4 shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-stage-confirm" />
            <h2 className="text-lg font-semibold text-foreground">Pre-publish Confirmation</h2>
            <span className="text-sm text-muted-foreground">({prePublishKols.length})</span>
          </div>
          <PrePublishBoard kols={prePublishKols} agencies={agencies} onDismiss={handleDismiss} />
        </div>

        {/* Stage Distribution Dashboard — fixed width, left-aligned next to Pre-publish */}
        <div className="w-full lg:w-[500px] shrink-0">
          <StageDistributionPanel kols={filteredKols} />
        </div>
      </div>
    </div>
  );
}
