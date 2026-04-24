import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { KOL, Agency, Stage, Platform } from './types';
import {
  dbToKol,
  dbToAgency,
  fetchAllKols,
  fetchAllAgencies,
  insertKol as svcInsertKol,
  updateKolStage as svcUpdateKolStage,
  updateKolFields as svcUpdateKolFields,
  toggleFocus as svcToggleFocus,
  insertAgency as svcInsertAgency,
  deleteAgency as svcDeleteAgency,
} from '@/services/kol-service';

interface KolStoreContext {
  kols: KOL[];
  agencies: Agency[];
  loading: boolean;
  addKol: (data: { name: string; platforms: Platform[]; agencyId: string; profileUrl?: string; contentDirection?: string; notes?: string; initialStage?: Stage }) => Promise<void>;
  updateKolStage: (kolId: string, newStage: Stage, note?: string) => Promise<void>;
  updateKolField: (kolId: string, updates: Partial<KOL>) => Promise<void>;
  toggleTodaysFocus: (kolId: string) => Promise<void>;
  addAgency: (name: string) => Promise<Agency>;
  removeAgency: (agencyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<KolStoreContext | null>(null);

export function KolStoreProvider({ children }: { children: ReactNode }) {
  const [kols, setKols] = useState<KOL[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [kolList, agencyList] = await Promise.all([fetchAllKols(), fetchAllAgencies()]);
      setKols(kolList);
      setAgencies(agencyList);
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime: kols table
    const kolsChannel = supabase
      .channel('kols-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kols' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setKols((prev) => [...prev, dbToKol(payload.new as Record<string, unknown>)]);
          } else if (payload.eventType === 'UPDATE') {
            setKols((prev) =>
              prev.map((k) =>
                k.id === (payload.new as Record<string, unknown>).id
                  ? { ...dbToKol(payload.new as Record<string, unknown>), changeLog: k.changeLog }
                  : k,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            setKols((prev) => prev.filter((k) => k.id !== (payload.old as Record<string, unknown>).id));
          }
        },
      )
      .subscribe();

    // Realtime: agencies table
    const agenciesChannel = supabase
      .channel('agencies-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agencies' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgencies((prev) => [...prev, dbToAgency(payload.new as Record<string, unknown>)]);
          } else if (payload.eventType === 'UPDATE') {
            setAgencies((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Record<string, unknown>).id
                  ? dbToAgency(payload.new as Record<string, unknown>)
                  : a,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            setAgencies((prev) => prev.filter((a) => a.id !== (payload.old as Record<string, unknown>).id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kolsChannel);
      supabase.removeChannel(agenciesChannel);
    };
  }, [fetchData]);

  const addKol = useCallback(async (data: { name: string; platforms: Platform[]; agencyId: string; profileUrl?: string; contentDirection?: string; notes?: string; initialStage?: Stage }) => {
    await svcInsertKol(data);
  }, []);

  const updateKolStage = useCallback(async (kolId: string, newStage: Stage, note?: string) => {
    const currentKol = kols.find((k) => k.id === kolId);
    const fromStage = currentKol?.currentStage || null;
    await svcUpdateKolStage(kolId, fromStage, newStage, note);
  }, [kols]);

  const updateKolField = useCallback(async (kolId: string, updates: Partial<KOL>) => {
    await svcUpdateKolFields(kolId, updates);
  }, []);

  const toggleTodaysFocus = useCallback(async (kolId: string) => {
    const kol = kols.find((k) => k.id === kolId);
    if (!kol) return;
    await svcToggleFocus(kolId, kol.isTodaysFocus);
  }, [kols]);

  const addAgency = useCallback(async (name: string): Promise<Agency> => {
    return await svcInsertAgency(name);
  }, []);

  const removeAgency = useCallback(async (agencyId: string) => {
    await svcDeleteAgency(agencyId);
  }, []);

  return (
    <StoreContext.Provider value={{ kols, agencies, loading, addKol, updateKolStage, updateKolField, toggleTodaysFocus, addAgency, removeAgency, refresh: fetchData }}>
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
