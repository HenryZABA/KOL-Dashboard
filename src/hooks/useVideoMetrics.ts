import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { KOL, Platform } from '@/lib/mock-data';

export interface VideoMetric {
  id: string;
  kol_id: string;
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  recorded_at: string;
}

export interface KolMetricSummary {
  kol: KOL;
  latest: Record<Platform, VideoMetric | null>;
  previous: Record<Platform, VideoMetric | null>;
  totals: { views: number; likes: number; comments: number; shares: number };
  deltas: { views: number; likes: number; comments: number; shares: number };
}

export function useVideoMetrics(publishedKols: KOL[]) {
  const [metrics, setMetrics] = useState<VideoMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    const { data, error } = await supabase
      .from('video_metrics')
      .select('*')
      .order('recorded_at', { ascending: true });

    if (!error && data) {
      setMetrics(data as unknown as VideoMetric[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const kolSummaries = useMemo((): KolMetricSummary[] => {
    return publishedKols.map((kol) => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kol.id);

      // Group by platform, get latest + previous
      const latestMap = {} as Record<Platform, VideoMetric | null>;
      const prevMap = {} as Record<Platform, VideoMetric | null>;

      for (const p of kol.platforms) {
        const platformMetrics = kolMetrics
          .filter((m) => m.platform === p)
          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
        latestMap[p] = platformMetrics[0] || null;
        prevMap[p] = platformMetrics[1] || null;
      }

      // Sum all latest metrics across platforms
      const totals = { views: 0, likes: 0, comments: 0, shares: 0 };
      const prevTotals = { views: 0, likes: 0, comments: 0, shares: 0 };

      for (const p of kol.platforms) {
        const l = latestMap[p];
        const pr = prevMap[p];
        if (l) {
          totals.views += l.views;
          totals.likes += l.likes;
          totals.comments += l.comments;
          totals.shares += l.shares;
        }
        if (pr) {
          prevTotals.views += pr.views;
          prevTotals.likes += pr.likes;
          prevTotals.comments += pr.comments;
          prevTotals.shares += pr.shares;
        }
      }

      const deltas = {
        views: prevTotals.views > 0 ? ((totals.views - prevTotals.views) / prevTotals.views) * 100 : 0,
        likes: prevTotals.likes > 0 ? ((totals.likes - prevTotals.likes) / prevTotals.likes) * 100 : 0,
        comments: prevTotals.comments > 0 ? ((totals.comments - prevTotals.comments) / prevTotals.comments) * 100 : 0,
        shares: prevTotals.shares > 0 ? ((totals.shares - prevTotals.shares) / prevTotals.shares) * 100 : 0,
      };

      return { kol, latest: latestMap, previous: prevMap, totals, deltas };
    });
  }, [publishedKols, metrics]);

  // Aggregate totals
  const aggregateTotals = useMemo(() => {
    const t = { views: 0, likes: 0, comments: 0, shares: 0 };
    for (const s of kolSummaries) {
      t.views += s.totals.views;
      t.likes += s.totals.likes;
      t.comments += s.totals.comments;
      t.shares += s.totals.shares;
    }
    return t;
  }, [kolSummaries]);

  // Time-series for aggregate chart (grouped by recorded_at date)
  const trendData = useMemo(() => {
    const dayMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();

    // We need the latest metric per kol+platform per day
    const byDay = new Map<string, Map<string, VideoMetric>>();
    for (const m of metrics) {
      const day = m.recorded_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, new Map());
      const key = `${m.kol_id}_${m.platform}`;
      const existing = byDay.get(day)!.get(key);
      if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
        byDay.get(day)!.set(key, m);
      }
    }

    for (const [day, metricsMap] of byDay) {
      const totals = { views: 0, likes: 0, comments: 0, shares: 0 };
      for (const m of metricsMap.values()) {
        totals.views += m.views;
        totals.likes += m.likes;
        totals.comments += m.comments;
        totals.shares += m.shares;
      }
      dayMap.set(day, totals);
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totals]) => ({ date, ...totals }));
  }, [metrics]);

  // Sparkline data per KOL (views over time)
  const sparklineData = useCallback(
    (kolId: string): { date: string; views: number }[] => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kolId);
      const dayMap = new Map<string, number>();
      for (const m of kolMetrics) {
        const day = m.recorded_at.slice(0, 10);
        dayMap.set(day, (dayMap.get(day) || 0) + m.views);
      }
      return Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, views]) => ({ date, views }));
    },
    [metrics],
  );

  return { metrics, kolSummaries, aggregateTotals, trendData, sparklineData, loading, refresh: fetchMetrics };
}
