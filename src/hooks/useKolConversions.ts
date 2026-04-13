import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KolConversion {
  kol_id: string;
  platform: string;
  triggered_users: number;
  signups: number;
  paid_users: number;
}

/** Aggregated conversion across all platforms for a single KOL */
export interface KolConversionAgg {
  kol_id: string;
  triggered_users: number;
  signups: number;
  paid_users: number;
}

export function useKolConversions(kolIds: string[]) {
  const [rows, setRows] = useState<KolConversion[]>([]);
  const [loading, setLoading] = useState(true);

  const idsKey = useMemo(() => kolIds.join(','), [kolIds]);

  const fetchData = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('kol_conversions')
      .select('kol_id, platform, triggered_users, signups, paid_users')
      .in('kol_id', ids);

    if (!error && data) {
      setRows(data as unknown as KolConversion[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(idsKey ? idsKey.split(',') : []);
  }, [idsKey, fetchData]);

  /** All conversion rows grouped by kol_id */
  const conversionsByKol = useMemo(() => {
    const map = new Map<string, KolConversion[]>();
    for (const r of rows) {
      const arr = map.get(r.kol_id) || [];
      arr.push(r);
      map.set(r.kol_id, arr);
    }
    return map;
  }, [rows]);

  /** Aggregated (all-platform) map for components that only need totals */
  const conversionMap = useMemo(() => {
    const map = new Map<string, KolConversionAgg>();
    for (const [kolId, convs] of conversionsByKol.entries()) {
      const agg: KolConversionAgg = { kol_id: kolId, triggered_users: 0, signups: 0, paid_users: 0 };
      for (const c of convs) {
        agg.triggered_users += c.triggered_users;
        agg.signups += c.signups;
        agg.paid_users += c.paid_users;
      }
      map.set(kolId, agg);
    }
    return map;
  }, [conversionsByKol]);

  return { conversionMap, conversionsByKol, loading };
}
