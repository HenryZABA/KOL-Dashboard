import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { KOL, Platform } from '@/lib/types';
import { fetchVideoMetrics, type VideoMetric } from '@/services/metrics-service';

export type { VideoMetric };

export function useVideoMetrics(kols: KOL[]) {
  const kolIds = useMemo(() => kols.map((k) => k.id), [kols]);

  const { data: metrics = [], isLoading: loading } = useQuery({
    queryKey: ['videoMetrics', kolIds],
    queryFn: () => fetchVideoMetrics(kolIds),
    enabled: kolIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false,
  });

  /** Pre-grouped by kol_id for O(1) lookup */
  const metricsByKol = useMemo(() => {
    const map = new Map<string, VideoMetric[]>();
    for (const m of metrics) {
      const arr = map.get(m.kol_id);
      if (arr) arr.push(m);
      else map.set(m.kol_id, [m]);
    }
    return map;
  }, [metrics]);

  /** Get metrics for a specific KOL (optionally filtered by platform) */
  const getMetricsForKol = (kolId: string, platform?: Platform): VideoMetric[] => {
    const all = metricsByKol.get(kolId) || [];
    if (!platform) return all;
    return all.filter((m) => m.platform === platform);
  };

  return { metrics, loading, getMetricsForKol, metricsByKol };
}
