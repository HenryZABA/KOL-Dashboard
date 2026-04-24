import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeLogEntry, Stage } from '@/lib/types';

function dbToChangeLog(row: Record<string, unknown>): ChangeLogEntry {
  return {
    id: row.id as string,
    fromStage: (row.from_stage as Stage) || null,
    toStage: row.to_stage as Stage,
    timestamp: row.created_at as string,
    note: (row.note as string) || undefined,
  };
}

export function useKolChangelog(kolId: string | null) {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kolId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    supabase
      .from('change_log')
      .select('*')
      .eq('kol_id', kolId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setLogs((data as Record<string, unknown>[] || []).map(dbToChangeLog));
        setLoading(false);
      });
  }, [kolId]);

  return { logs, loading };
}
