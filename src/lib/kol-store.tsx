import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  type KOL,
  type Agency,
  type Stage,
  type Platform,
  MOCK_KOLS,
  MOCK_AGENCIES,
} from './mock-data';

interface KolStoreContext {
  kols: KOL[];
  agencies: Agency[];
  addKol: (kol: Omit<KOL, 'id' | 'createdAt' | 'changeLog' | 'stageUpdatedAt' | 'currentStage' | 'scriptVersion' | 'scriptComplete' | 'projectComplete' | 'videoVersion' | 'isTodaysFocus'> & { name: string; platforms: Platform[]; agencyId: string }) => void;
  updateKolStage: (kolId: string, newStage: Stage, note?: string) => void;
  updateKolField: (kolId: string, updates: Partial<KOL>) => void;
  toggleTodaysFocus: (kolId: string) => void;
  addAgency: (name: string) => Agency;
  removeAgency: (agencyId: string) => void;
}

const StoreContext = createContext<KolStoreContext | null>(null);

let nextId = 100;

export function KolStoreProvider({ children }: { children: ReactNode }) {
  const [kols, setKols] = useState<KOL[]>(MOCK_KOLS);
  const [agencies, setAgencies] = useState<Agency[]>(MOCK_AGENCIES);

  const addKol = useCallback((data: { name: string; platforms: Platform[]; agencyId: string; profileUrl?: string; contentDirection?: string; notes?: string }) => {
    const id = `kol-${nextId++}`;
    const now = new Date().toISOString();
    const newKol: KOL = {
      id,
      name: data.name,
      platforms: data.platforms,
      profileUrl: data.profileUrl,
      contentDirection: data.contentDirection,
      notes: data.notes,
      currentStage: 'writing_idea',
      scriptVersion: 0,
      scriptComplete: false,
      projectComplete: false,
      videoVersion: 0,
      isTodaysFocus: false,
      agencyId: data.agencyId,
      stageUpdatedAt: now,
      createdAt: now,
      changeLog: [
        { id: `cl-${Date.now()}`, fromStage: null, toStage: 'writing_idea', timestamp: now },
      ],
    };
    setKols((prev) => [...prev, newKol]);
  }, []);

  const updateKolStage = useCallback((kolId: string, newStage: Stage, note?: string) => {
    setKols((prev) =>
      prev.map((kol) => {
        if (kol.id !== kolId) return kol;
        const now = new Date().toISOString();
        return {
          ...kol,
          currentStage: newStage,
          stageUpdatedAt: now,
          changeLog: [
            ...kol.changeLog,
            {
              id: `cl-${Date.now()}`,
              fromStage: kol.currentStage,
              toStage: newStage,
              timestamp: now,
              note,
            },
          ],
        };
      })
    );
  }, []);

  const updateKolField = useCallback((kolId: string, updates: Partial<KOL>) => {
    setKols((prev) =>
      prev.map((kol) => (kol.id === kolId ? { ...kol, ...updates } : kol))
    );
  }, []);

  const toggleTodaysFocus = useCallback((kolId: string) => {
    setKols((prev) =>
      prev.map((kol) =>
        kol.id === kolId ? { ...kol, isTodaysFocus: !kol.isTodaysFocus } : kol
      )
    );
  }, []);

  const addAgency = useCallback((name: string): Agency => {
    const id = `agency-${nextId++}`;
    // Generate a URL-safe token: lowercase name slug + random suffix
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    const token = `${slug}-${rand}`;
    const agency: Agency = { id, name, token };
    setAgencies((prev) => [...prev, agency]);
    return agency;
  }, []);

  const removeAgency = useCallback((agencyId: string) => {
    setAgencies((prev) => prev.filter((a) => a.id !== agencyId));
    // Also remove KOLs belonging to this agency
    setKols((prev) => prev.filter((k) => k.agencyId !== agencyId));
  }, []);

  return (
    <StoreContext.Provider value={{ kols, agencies, addKol, updateKolStage, updateKolField, toggleTodaysFocus, addAgency, removeAgency }}>
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKolStore(): KolStoreContext {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useKolStore must be used within KolStoreProvider');
  return ctx;
}
