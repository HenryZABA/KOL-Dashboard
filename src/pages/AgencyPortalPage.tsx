import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useKolStore } from '@/lib/kol-store';
import { AgencyKolTable } from '@/components/agency/AgencyKolTable';
import { AddKolForm } from '@/components/agency/AddKolForm';
import { KolDetailPanel } from '@/components/agency/KolDetailPanel';
import { CsvImportDialog } from '@/components/agency/CsvImportDialog';
import { Button } from '@/components/ui/button';
import type { KOL, Platform } from '@/lib/mock-data';
import { Building2, Plus, Upload } from 'lucide-react';

export default function AgencyPortalPage() {
  const { token } = useParams<{ token: string }>();
  const { kols, agencies, loading, addKol, updateKolStage, updateKolField, toggleTodaysFocus } = useKolStore();

  const agency = useMemo(() => {
    if (!token) return undefined;
    return agencies.find((a) => a.token === token);
  }, [token, agencies]);

  const agencyKols = useMemo(() => {
    if (!agency) return [];
    return kols.filter((k) => k.agencyId === agency.id);
  }, [kols, agency]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedKol, setSelectedKol] = useState<KOL | null>(null);

  // Keep selected KOL in sync with store updates
  const currentSelectedKol = useMemo(() => {
    if (!selectedKol) return null;
    return kols.find((k) => k.id === selectedKol.id) || null;
  }, [kols, selectedKol]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Invalid Access Link</h1>
          <p className="text-sm text-muted-foreground">
            This agency portal link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const handleAddKol = async (data: {
    name: string;
    platforms: Platform[];
    profileUrl?: string;
    contentDirection?: string;
    notes?: string;
  }) => {
    await addKol({
      ...data,
      agencyId: agency.id,
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">{agency.name}</h1>
              <p className="text-xs text-muted-foreground">Agency Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add KOL
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-background rounded-lg border shadow-card">
          <AgencyKolTable kols={agencyKols} onSelectKol={setSelectedKol} />
        </div>
      </main>

      {/* Add KOL Form */}
      <AddKolForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={handleAddKol}
      />

      {/* KOL Detail Panel */}
      <KolDetailPanel
        kol={currentSelectedKol}
        open={!!selectedKol}
        onOpenChange={(open) => !open && setSelectedKol(null)}
        onUpdateStage={updateKolStage}
        onUpdateField={updateKolField}
        onToggleFocus={toggleTodaysFocus}
      />

      {/* CSV Import */}
      <CsvImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        fixedAgency={agency}
      />
    </div>
  );
}
