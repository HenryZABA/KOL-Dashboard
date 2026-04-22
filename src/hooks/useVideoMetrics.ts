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

export type MetricTotals = { views: number; likes: number; comments: number; shares: number };

export interface KolMetricSummary {
  kol: KOL;
  latest: Record<Platform, VideoMetric | null>;
  previous: Record<Platform, VideoMetric | null>;
  totals: MetricTotals;
  deltas: MetricTotals;
  perPlatform: Record<Platform, { totals: MetricTotals; deltas: MetricTotals }>;
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
    // Paginate to avoid Supabase default 1000-row limit
    const pageSize = 1000;
    let page = 0;
    let allData: VideoMetric[] = [];
    while (true) {
      const { data, error } = await supabase
        .from('video_metrics')
        .select('*')
        .in('kol_id', ids)
        .order('recorded_at', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) break;
      allData = allData.concat((data ?? []) as unknown as VideoMetric[]);
      if (!data || data.length < pageSize) break;
      page++;
    }
    setMetrics(allData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics(kolIdsKey ? kolIdsKey.split(',') : []);
  }, [kolIdsKey, fetchMetrics]);

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

      // TOTALS: cumulative — sum of latest record per platform
      const totals = { views: 0, likes: 0, comments: 0, shares: 0 };
      for (const p of kol.platforms) {
        const l = latestMap[p];
        if (l) {
          totals.views += l.views;
          totals.likes += l.likes;
          totals.comments += l.comments;
          totals.shares += l.shares;
        }
      }

      // DELTAS: based on daily increments (matching sparkline logic)
      // Deduplicate: keep latest record per day+platform, then sum across platforms
      const dayPlatformMap = new Map<string, Map<string, VideoMetric>>();
      for (const m of kolMetrics) {
        const day = m.recorded_at.slice(0, 10);
        if (!dayPlatformMap.has(day)) dayPlatformMap.set(day, new Map());
        const existing = dayPlatformMap.get(day)!.get(m.platform);
        if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
          dayPlatformMap.get(day)!.set(m.platform, m);
        }
      }
      const dayMap = new Map<string, { views: number; likes: number; comments: number; shares: number }>();
      for (const [day, platMap] of dayPlatformMap) {
        const t = { views: 0, likes: 0, comments: 0, shares: 0 };
        for (const m of platMap.values()) {
          t.views += m.views;
          t.likes += m.likes;
          t.comments += m.comments;
          t.shares += m.shares;
        }
        dayMap.set(day, t);
      }
      const days = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));

      // DELTAS: latest day's growth rate (%) — matches sparkline logic
      let deltas = { views: 0, likes: 0, comments: 0, shares: 0 };
      if (days.length >= 2) {
        const todaySnap = days[days.length - 1][1];
        const yesterdaySnap = days[days.length - 2][1];
        deltas = {
          views: yesterdaySnap.views !== 0 ? ((todaySnap.views - yesterdaySnap.views) / yesterdaySnap.views) * 100 : 0,
          likes: yesterdaySnap.likes !== 0 ? ((todaySnap.likes - yesterdaySnap.likes) / yesterdaySnap.likes) * 100 : 0,
          comments: yesterdaySnap.comments !== 0 ? ((todaySnap.comments - yesterdaySnap.comments) / yesterdaySnap.comments) * 100 : 0,
          shares: yesterdaySnap.shares !== 0 ? ((todaySnap.shares - yesterdaySnap.shares) / yesterdaySnap.shares) * 100 : 0,
        };
      }

      // Per-platform totals and deltas
      const perPlatform = {} as Record<Platform, { totals: MetricTotals; deltas: MetricTotals }>;
      for (const p of kol.platforms) {
        const l = latestMap[p];
        const pTotals: MetricTotals = l
          ? { views: l.views, likes: l.likes, comments: l.comments, shares: l.shares }
          : { views: 0, likes: 0, comments: 0, shares: 0 };

        // Per-platform daily deltas
        const platDayMap = new Map<string, VideoMetric>();
        for (const m of kolMetrics.filter((m) => m.platform === p)) {
          const day = m.recorded_at.slice(0, 10);
          const existing = platDayMap.get(day);
          if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
            platDayMap.set(day, m);
          }
        }
        const platDays = Array.from(platDayMap.entries()).sort(([a], [b]) => a.localeCompare(b));
        let pDeltas: MetricTotals = { views: 0, likes: 0, comments: 0, shares: 0 };
        if (platDays.length >= 2) {
          const cur = platDays[platDays.length - 1][1];
          const prev = platDays[platDays.length - 2][1];
          pDeltas = {
            views: prev.views !== 0 ? ((cur.views - prev.views) / prev.views) * 100 : 0,
            likes: prev.likes !== 0 ? ((cur.likes - prev.likes) / prev.likes) * 100 : 0,
            comments: prev.comments !== 0 ? ((cur.comments - prev.comments) / prev.comments) * 100 : 0,
            shares: prev.shares !== 0 ? ((cur.shares - prev.shares) / prev.shares) * 100 : 0,
          };
        }
        perPlatform[p] = { totals: pTotals, deltas: pDeltas };
      }

      return { kol, latest: latestMap, previous: prevMap, totals, deltas, perPlatform };
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

  // Time-series for aggregate chart (grouped by recorded_at date) — DAILY GROWTH RATE (%)
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

    // Step 3: Convert to daily growth rate (%) — skip first day
    const result: typeof snapshots = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      result.push({
        date: snapshots[i].date,
        views: prev.views !== 0 ? parseFloat(((snapshots[i].views - prev.views) / prev.views * 100).toFixed(2)) : 0,
        likes: prev.likes !== 0 ? parseFloat(((snapshots[i].likes - prev.likes) / prev.likes * 100).toFixed(2)) : 0,
        comments: prev.comments !== 0 ? parseFloat(((snapshots[i].comments - prev.comments) / prev.comments * 100).toFixed(2)) : 0,
        shares: prev.shares !== 0 ? parseFloat(((snapshots[i].shares - prev.shares) / prev.shares * 100).toFixed(2)) : 0,
      });
    }
    return result;
  }, [metrics]);

  // Sparkline data per KOL (daily views growth rate %)
  const sparklineData = useCallback(
    (kolId: string): { date: string; views: number }[] => {
      const kolMetrics = metrics.filter((m) => m.kol_id === kolId);
      // Deduplicate: keep latest record per day+platform, then sum across platforms
      const dayPlatMap = new Map<string, Map<string, VideoMetric>>();
      for (const m of kolMetrics) {
        const day = m.recorded_at.slice(0, 10);
        if (!dayPlatMap.has(day)) dayPlatMap.set(day, new Map());
        const existing = dayPlatMap.get(day)!.get(m.platform);
        if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
          dayPlatMap.get(day)!.set(m.platform, m);
        }
      }
      const snapshots: { date: string; views: number }[] = [];
      for (const [day, platMap] of dayPlatMap) {
        let views = 0;
        for (const m of platMap.values()) views += m.views;
        snapshots.push({ date: day, views });
      }
      snapshots.sort((a, b) => a.date.localeCompare(b.date));

      // Convert to daily growth rate (%) — skip first day (no previous to compare)
      const result: { date: string; views: number }[] = [];
      for (let i = 1; i < snapshots.length; i++) {
        const prev = snapshots[i - 1].views;
        const pct = prev !== 0 ? ((snapshots[i].views - prev) / prev) * 100 : 0;
        result.push({ date: snapshots[i].date, views: parseFloat(pct.toFixed(1)) });
      }
      return result;
    },
    [metrics],
  );

  // Sparkline data per KOL per platform (daily views growth rate %)
  const sparklineDataByPlatform = useCallback(
    (kolId: string, platform: Platform): { date: string; views: number }[] => {
      const platMetrics = metrics.filter((m) => m.kol_id === kolId && m.platform === platform);
      const dayMap = new Map<string, VideoMetric>();
      for (const m of platMetrics) {
        const day = m.recorded_at.slice(0, 10);
        const existing = dayMap.get(day);
        if (!existing || new Date(m.recorded_at) > new Date(existing.recorded_at)) {
          dayMap.set(day, m);
        }
      }
      const snapshots = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, m]) => ({ date: day, views: m.views }));

      const result: { date: string; views: number }[] = [];
      for (let i = 1; i < snapshots.length; i++) {
        const prev = snapshots[i - 1].views;
        const pct = prev !== 0 ? ((snapshots[i].views - prev) / prev) * 100 : 0;
        result.push({ date: snapshots[i].date, views: parseFloat(pct.toFixed(1)) });
      }
      return result;
    },
    [metrics],
  );

  const refresh = useCallback(() => fetchMetrics(kolIdsKey ? kolIdsKey.split(',') : []), [fetchMetrics, kolIdsKey]);

  return { metrics, kolSummaries, aggregateTotals, trendData, sparklineData, sparklineDataByPlatform, loading, refresh };
}
