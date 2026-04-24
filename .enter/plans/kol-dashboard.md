# Fix: Sparkline oscillation bug

## Root Cause
`sparklineData()` in `useVideoMetrics.ts` (line 145-156) iterates over **raw rows** sorted by `recorded_at`. When a KOL has multiple platforms, rows alternate (e.g. youtube-1000, tiktok-500, youtube-1100, tiktok-600), causing nonsensical growth rates like -50% → +120% → -50%.

## Fix
Change `sparklineData()` to **group by date first** (summing all platforms' views per day), then compute daily growth rate between consecutive dates. This matches how `trendData` already works (lines 113-142).

### File: `src/hooks/useVideoMetrics.ts`

Replace `sparklineData` (lines 144-156):
```ts
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
```

Same fix for `sparklineDataByPlatform` (lines 158-170) — it already filters by platform, but should still group by date in case there are multiple records per day per platform.

## Verification
- Sparklines should show smooth daily curves, not oscillating noise
- Selecting a specific platform icon should show that platform's daily trend
