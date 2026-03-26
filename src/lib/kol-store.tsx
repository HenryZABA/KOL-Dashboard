import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { KOL, Agency, Stage, Platform } from './mock-data';

interface KolStoreContext {
  kols: KOL[];
  agencies: Agency[];
  loading: boolean;
  addKol: (data: { name: string; platforms: Platform[]; agencyId: string; profileUrl?: string; contentDirection?: string; notes?: string }) => Promise<void>;
  updateKolStage: (kolId: string, newStage: Stage, note?: string) => Promise<void>;
  updateKolField: (kolId: string, updates: Partial<KOL>) => Promise<void>;
  toggleTodaysFocus: (kolId: string) => Promise<void>;
  addAgency: (name: string) => Promise<Agency>;
  removeAgency: (agencyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<KolStoreContext | null>(null);

// Map DB row to frontend KOL type (changeLog loaded lazily via useKolChangelog)
function dbToKol(row: Record<string, unknown>): KOL {
  return {
    id: row.id as string,
    name: row.name as string,
    platforms: (row.platforms as string[]) as Platform[],
    profileUrl: (row.profile_url as string) || undefined,
    contentDirection: (row.content_direction as string) || undefined,
    notes: (row.notes as string) || undefined,
    currentStage: row.current_stage as Stage,
    scriptVersion: row.script_version as number,
    scriptComplete: row.script_complete as boolean,
    projectComplete: row.project_complete as boolean,
    videoVersion: row.video_version as number,
    feishuUrl: (row.feishu_url as string) || undefined,
    isTodaysFocus: row.is_todays_focus as boolean,
    agencyId: row.agency_id as string,
    stageLinks: (row.stage_links as Record<string, string>) || {},
    stageUpdatedAt: row.stage_updated_at as string,
    publishedAt: (row.published_at as string) || undefined,
    createdAt: row.created_at as string,
  };
}

function dbToAgency(row: Record<string, unknown>): Agency {
  return {
    id: row.id as string,
    name: row.name as string,
    token: row.token as string,
  };
}

export function KolStoreProvider({ children }: { children: ReactNode }) {
  const [kols, setKols] = useState<KOL[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [agencyRes, kolRes] = await Promise.all([
      supabase.from('agencies').select('*').order('created_at'),
      supabase.from('kols').select('*').order('created_at'),
    ]);

    const agencyRows = (agencyRes.data || []) as Record<string, unknown>[];
    const kolRows = (kolRes.data || []) as Record<string, unknown>[];

    setAgencies(agencyRows.map(dbToAgency));
    setKols(kolRows.map(dbToKol));
    setLoading(false);
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
    const stage = data.initialStage || 'writing_idea';
    const { data: inserted, error } = await supabase.from('kols').insert({
      name: data.name,
      platforms: data.platforms,
      profile_url: data.profileUrl || null,
      content_direction: data.contentDirection || null,
      notes: data.notes || null,
      current_stage: stage,
      agency_id: data.agencyId,
    }).select().single();

    if (error || !inserted) { console.error('addKol error:', error); return; }

    await supabase.from('change_log').insert({
      kol_id: (inserted as Record<string, unknown>).id as string,
      from_stage: null,
      to_stage: stage,
    });
    // Realtime INSERT event will update state
  }, []);

  const updateKolStage = useCallback(async (kolId: string, newStage: Stage, note?: string) => {
    const currentKol = kols.find((k) => k.id === kolId);
    const fromStage = currentKol?.currentStage || null;

    await supabase.from('kols').update({
      current_stage: newStage,
      stage_updated_at: new Date().toISOString(),
      ...(newStage === 'pre_publish' ? { is_todays_focus: true } : {}),
      ...(newStage === 'published' ? { published_at: new Date().toISOString() } : {}),
    }).eq('id', kolId);

    await supabase.from('change_log').insert({
      kol_id: kolId,
      from_stage: fromStage,
      to_stage: newStage,
      note: note || null,
    });
    // Realtime UPDATE event will update state
  }, [kols]);

  const updateKolField = useCallback(async (kolId: string, updates: Partial<KOL>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.scriptVersion !== undefined) dbUpdates.script_version = updates.scriptVersion;
    if (updates.scriptComplete !== undefined) dbUpdates.script_complete = updates.scriptComplete;
    if (updates.projectComplete !== undefined) dbUpdates.project_complete = updates.projectComplete;
    if (updates.videoVersion !== undefined) dbUpdates.video_version = updates.videoVersion;
    if (updates.feishuUrl !== undefined) dbUpdates.feishu_url = updates.feishuUrl;
    if (updates.isTodaysFocus !== undefined) dbUpdates.is_todays_focus = updates.isTodaysFocus;
    if (updates.stageLinks !== undefined) dbUpdates.stage_links = updates.stageLinks;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('kols').update(dbUpdates).eq('id', kolId);
      // Realtime UPDATE event will update state
    }
  }, []);

  const toggleTodaysFocus = useCallback(async (kolId: string) => {
    const kol = kols.find((k) => k.id === kolId);
    if (!kol) return;
    await supabase.from('kols').update({ is_todays_focus: !kol.isTodaysFocus }).eq('id', kolId);
    // Realtime UPDATE event will update state
  }, [kols]);

  const addAgency = useCallback(async (name: string): Promise<Agency> => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const rand = Math.random().toString(36).slice(2, 8);
    const token = `${slug}-${rand}`;

    const { data: inserted, error } = await supabase.from('agencies').insert({
      name,
      token,
    }).select().single();

    if (error || !inserted) {
      console.error('addAgency error:', error);
      return { id: '', name, token };
    }

    // Return the newly created agency directly from the insert result
    // Realtime INSERT event will also update state
    return dbToAgency(inserted as Record<string, unknown>);
  }, []);

  const removeAgency = useCallback(async (agencyId: string) => {
    await supabase.from('agencies').delete().eq('id', agencyId);
    // Realtime DELETE event will update state
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
