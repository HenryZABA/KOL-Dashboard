import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { KOL, Platform } from '@/lib/types';
import { fetchVideoMetrics, type VideoMetric } from '@/services/metrics-service';

export type { VideoMetric };

export interface MetricTotals {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

interface PlatformSummary {
  totals: MetricTotals;
  deltas: MetricTotals;
}

export interface KolMetricSummary {
  kol: KOL;
  totals: MetricTotals;
  deltas: MetricTotals;
  perPlatform: Record<string, PlatformSummary>;
}

function computeTotalsAndDeltas(rows: VideoMetric[]): { totals: MetricTotals; deltas: MetricTotals } {
  if (rows.length === 0) {
    return {
      totals: { views: 0, likes: 0, comments: 0, shares: 0 },
      deltas: { views: 0, likes: 0, comments: 0, shares: 0 },
    };
  }

  // Latest row = current totals
  const latest = rows[rows.length - 1];
  const totals: MetricTotals = {
    views: latest.views,
    likes: latest.likes,
    comments: latest.comments,
    shares: latest.shares,
  };

  // Delta = % change from second-to-last to latest
  const deltas: MetricTotals = { views: 0, likes: 0, comments: 0, shares: 0 };
  if (rows.length >= 2) {
    const prev = rows[rows.length - 2];
    for (const key of ['views', 'likes', 'comments', 'shares'] as const) {
      deltas[key] = prev[key] > 0 ? ((latest[key] - prev[key]) / prev[key]) * 100 : 0;
    }
  }

  return { totals, deltas };
}

export function useVideoMetrics(kols: KOL[]) {
  const kolIds = useMemo(() => kols.map((k) => k.id), [kols]);

  const { data: metrics = [], isLoading: loading } = useQuery({
    queryKey: ['videoMetrics', kolIds],
    queryFn: () => fetchVideoMetrics(kolIds),
    enabled: kolIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  /** Pre-grouped by kol_id */
  const metricsByKol = useMemo(() => {
    const map = new Map<string, VideoMetric[]>();
    for (const m of metrics) {
      const arr = map.get(m.kol_id);
      if (arr) arr.push(m);
      else map.set(m.kol_id, [m]);
    }
    return map;
  }, [metrics]);

  /** Per-KOL summaries with totals, deltas, per-platform breakdown */
  const kolSummaries = useMemo((): KolMetricSummary[] => {
    return kols.map((kol) => {
      const rows = metricsByKol.get(kol.id) || [];
      const { totals, deltas } = computeTotalsAndDeltas(rows);

      // Per-platform breakdown
      const byPlatform = new Map<string, VideoMetric[]>();
      for (const r of rows) {
        const arr = byPlatform.get(r.platform) || [];
        arr.push(r);
        byPlatform.set(r.platform, arr);
      }
      const perPlatform: Record<string, PlatformSummary> = {};
      for (const [platform, pRows] of byPlatform.entries()) {
        perPlatform[platform] = computeTotalsAndDeltas(pRows);
      }

      return { kol, totals, deltas, perPlatform };
    });
  }, [kols, metricsByKol]);

  /** Aggregate totals across all KOLs */
  const aggregateTotals = useMemo((): MetricTotals => {
    const agg: MetricTotals = { views: 0, likes: 0, comments: 0, shares: 0 };
    for (const s of kolSummaries) {
      agg.views += s.totals.views;
      agg.likes += s.totals.likes;
      agg.comments += s.totals.comments;
      agg.shares += s.totals.shares;
    }
    return agg;
  }, [kolSummaries]);

  /** Trend data: daily growth rates across all KOLs */
  const trendData = useMemo(() => {
    // Group all metrics by date
    const byDate = new Map<string, MetricTotals>();
    for (const m of metrics) {
      const date = m.recorded_at.slice(0, 10);
      const existing = byDate.get(date) || { views: 0, likes: 0, comments: 0, shares: 0 };
      existing.views += m.views;
      existing.likes += m.likes;
      existing.comments += m.comments;
      existing.shares += m.shares;
      byDate.set(date, existing);
    }

    const dates = [...byDate.keys()].sort();
    const result: { date: string; views: number; likes: number; comments: number; shares: number }[] = [];

    for (let i = 1; i < dates.length; i++) {
      const prev = byDate.get(dates[i - 1])!;
      const curr = byDate.get(dates[i])!;
      result.push({
        date: dates[i],
        views: prev.views > 0 ? ((curr.views - prev.views) / prev.views) * 100 : 0,
        likes: prev.likes > 0 ? ((curr.likes - prev.likes) / prev.likes) * 100 : 0,
        comments: prev.comments > 0 ? ((curr.comments - prev.comments) / prev.comments) * 100 : 0,
        shares: prev.shares > 0 ? ((curr.shares - prev.shares) / prev.shares) * 100 : 0,
      });
    }

    return result;
  }, [metrics]);

  /** Sparkline data for a specific KOL — daily growth rate (aggregated across platforms) */
  const sparklineData = (kolId: string): { date: string; views: number }[] => {
    const rows = metricsByKol.get(kolId) || [];
    if (rows.length < 2) return [];
    // Group by date, sum views across platforms
    const byDate = new Map<string, number>();
    for (const r of rows) {
      const d = r.recorded_at.slice(0, 10);
      byDate.set(d, (byDate.get(d) || 0) + r.views);
    }
    const dates = [...byDate.keys()].sort();
    if (dates.length < 2) return [];
    const result: { date: string; views: number }[] = [];
    for (let i = 1; i < dates.length; i++) {
      const prev = byDate.get(dates[i - 1])!;
      const curr = byDate.get(dates[i])!;
      result.push({ date: dates[i], views: prev > 0 ? ((curr - prev) / prev) * 100 : 0 });
    }
    return result;
  };

  /** Sparkline data for a specific KOL filtered by platform */
  const sparklineDataByPlatform = (kolId: string, platform: Platform): { date: string; views: number }[] => {
    const rows = (metricsByKol.get(kolId) || []).filter((m) => m.platform === platform);
    if (rows.length < 2) return [];
    // Group by date in case of multiple records per day
    const byDate = new Map<string, number>();
    for (const r of rows) {
      const d = r.recorded_at.slice(0, 10);
      byDate.set(d, (byDate.get(d) || 0) + r.views);
    }
    const dates = [...byDate.keys()].sort();
    if (dates.length < 2) return [];
    const result: { date: string; views: number }[] = [];
    for (let i = 1; i < dates.length; i++) {
      const prev = byDate.get(dates[i - 1])!;
      const curr = byDate.get(dates[i])!;
      result.push({ date: dates[i], views: prev > 0 ? ((curr - prev) / prev) * 100 : 0 });
    }
    return result;
  };

  return {
    metrics,
    loading,
    kolSummaries,
    aggregateTotals,
    trendData,
    sparklineData,
    sparklineDataByPlatform,
    metricsByKol,
  };
}
