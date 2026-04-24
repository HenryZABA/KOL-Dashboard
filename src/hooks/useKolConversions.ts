import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConversions, type KolConversion } from '@/services/conversion-service';

export type { KolConversion };

/** Aggregated conversion across all platforms for a single KOL */
export interface KolConversionAgg {
  kol_id: string;
  triggered_users: number;
  signups: number;
  paid_users: number;
}

export function useKolConversions(kolIds: string[]) {
  const stableIds = useMemo(() => [...kolIds].sort(), [kolIds]);

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ['kolConversions', stableIds],
    queryFn: () => fetchConversions(stableIds),
    enabled: stableIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false,
  });

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
