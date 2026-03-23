import { useMemo } from 'react';
import { useKolStore } from '@/lib/kol-store';
import { isOverdue } from '@/lib/mock-data';
import { KolFocusCard } from '@/components/kol/KolFocusCard';
import { PrePublishBoard } from '@/components/kol/PrePublishBoard';
import { Crosshair, FileCheck } from 'lucide-react';

export default function TodaysFocusPage() {
  const { kols, agencies } = useKolStore();

  const focusKols = useMemo(() => {
    return kols.filter(
      (kol) =>
        kol.currentStage !== 'pre_publish' &&
        (kol.isTodaysFocus ||
          (isOverdue(kol.stageUpdatedAt) && kol.currentStage !== 'published')),
    );
  }, [kols]);

  const prePublishKols = useMemo(() => {
    return kols.filter((kol) => kol.currentStage === 'pre_publish');
  }, [kols]);

  return (
    <div className="p-6 space-y-8">
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
              <KolFocusCard
                key={kol.id}
                kol={kol}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pre-publish Confirmation Board */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-stage-confirm" />
          <h2 className="text-lg font-semibold text-foreground">Pre-publish Confirmation</h2>
          <span className="text-sm text-muted-foreground">({prePublishKols.length})</span>
        </div>
        <PrePublishBoard kols={prePublishKols} agencies={agencies} />
      </div>
    </div>
  );
}
