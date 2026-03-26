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

  // Stable string key to avoid re-fetching on every render due to array reference changes
  const kolIdsKey = useMemo(() => publishedKols.map((k) => k.id).join(','), [publishedKols]);

  const fetchMetrics = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setMetrics([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('video_metrics')
      .select('*')
      .in('kol_id', ids)
      .order('recorded_at', { ascending: true });

    if (!error && data) {
      setMetrics(data as unknown as VideoMetric[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics(kolIdsKey ? kolIdsKey.split(',') : []);
  }, [kolIdsKey, fetchMetrics]);

  const kolSummaries = useMemo((): KolMetricSummary[] => {
    return publishedKols.map((kol) => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kol.id);

      // Group by platform for latest/previous maps (kept for compatibility)
      const latestMap = {} as Record<Platform, VideoMetric | null>;
      const prevMap = {} as Record<Platform, VideoMetric | null>;
      for (const p of kol.platforms) {
        const platformMetrics = kolMetrics
          .filter((m) => m.platform === p)
          .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
        latestMap[p] = platformMetrics[0] || null;
        prevMap[p] = platformMetrics[1] || null;
      }

      // Aggregate by day across all platforms for this KOL
      const dayMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
      for (const m of kolMetrics) {
        const day = m.recorded_at.slice(0, 10);
        const existing = dayMap.get(day) || { views: 0, likes: 0, comments: 0, shares: 0 };
        existing.views += m.views;
        existing.likes += m.likes;
        existing.comments += m.comments;
        existing.shares += m.shares;
        dayMap.set(day, existing);
      }

      const days = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b));

      // Calculate daily increments for the last two days
      let totals = { views: 0, likes: 0, comments: 0, shares: 0 };
      let prevTotals = { views: 0, likes: 0, comments: 0, shares: 0 };

      if (days.length >= 2) {
        const lastSnap = days[days.length - 1][1];
        const prevSnap = days[days.length - 2][1];
        // Today's increment = today's snapshot - yesterday's snapshot
        totals = {
          views: Math.max(0, lastSnap.views - prevSnap.views),
          likes: Math.max(0, lastSnap.likes - prevSnap.likes),
          comments: Math.max(0, lastSnap.comments - prevSnap.comments),
          shares: Math.max(0, lastSnap.shares - prevSnap.shares),
        };
        // Yesterday's increment (for delta calculation)
        if (days.length >= 3) {
          const prevPrevSnap = days[days.length - 3][1];
          prevTotals = {
            views: Math.max(0, prevSnap.views - prevPrevSnap.views),
            likes: Math.max(0, prevSnap.likes - prevPrevSnap.likes),
            comments: Math.max(0, prevSnap.comments - prevPrevSnap.comments),
            shares: Math.max(0, prevSnap.shares - prevPrevSnap.shares),
          };
        }
      } else if (days.length === 1) {
        totals = { ...days[0][1] };
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

  // Time-series for aggregate chart (grouped by recorded_at date) — DAILY INCREMENTS
  const trendData = useMemo(() => {
    // Step 1: Get snapshot per day (latest metric per kol+platform per day)
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

    // Step 2: Sum per day
    const snapshots: { date: string; views: number; likes: number; comments: number; shares: number }[] = [];
    for (const [day, metricsMap] of byDay) {
      const t = { views: 0, likes: 0, comments: 0, shares: 0 };
      for (const m of metricsMap.values()) {
        t.views += m.views;
        t.likes += m.likes;
        t.comments += m.comments;
        t.shares += m.shares;
      }
      snapshots.push({ date: day, ...t });
    }
    snapshots.sort((a, b) => a.date.localeCompare(b.date));

    // Step 3: Convert to daily increments (day[i] - day[i-1])
    return snapshots.map((snap, i) => {
      if (i === 0) return snap; // first day uses its own value as the increment
      const prev = snapshots[i - 1];
      return {
        date: snap.date,
        views: Math.max(0, snap.views - prev.views),
        likes: Math.max(0, snap.likes - prev.likes),
        comments: Math.max(0, snap.comments - prev.comments),
        shares: Math.max(0, snap.shares - prev.shares),
      };
    });
  }, [metrics]);

  // Sparkline data per KOL (daily views increments)
  const sparklineData = useCallback(
    (kolId: string): { date: string; views: number }[] => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kolId);
      const dayMap = new Map<string, number>();
      for (const m of kolMetrics) {
        const day = m.recorded_at.slice(0, 10);
        dayMap.set(day, (dayMap.get(day) || 0) + m.views);
      }
      const snapshots = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, views]) => ({ date, views }));

      // Convert to daily increments
      return snapshots.map((snap, i) => {
        if (i === 0) return snap;
        return { date: snap.date, views: Math.max(0, snap.views - snapshots[i - 1].views) };
      });
    },
    [metrics],
  );

  const refresh = useCallback(() => fetchMetrics(kolIdsKey ? kolIdsKey.split(',') : []), [fetchMetrics, kolIdsKey]);

  return { metrics, kolSummaries, aggregateTotals, trendData, sparklineData, loading, refresh };
}
