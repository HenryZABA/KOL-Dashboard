import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KolConversion {
  kol_id: string;
  triggered_users: number;
  signups: number;
  paid_users: number;
}

export function useKolConversions(kolIds: string[]) {
  const [rows, setRows] = useState<KolConversion[]>([]);
  const [loading, setLoading] = useState(true);

  const idsKey = useMemo(() => kolIds.join(','), [kolIds]);

  const fetch = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('kol_conversions')
      .select('kol_id, triggered_users, signups, paid_users')
      .in('kol_id', ids);

    if (!error && data) {
      setRows(data as unknown as KolConversion[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch(idsKey ? idsKey.split(',') : []);
  }, [idsKey, fetch]);

  const conversionMap = useMemo(() => {
    const map = new Map<string, KolConversion>();
    for (const r of rows) map.set(r.kol_id, r);
    return map;
  }, [rows]);

  return { conversionMap, loading };
}
