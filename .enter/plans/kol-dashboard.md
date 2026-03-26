# Plan: Fix duplicate record aggregation bug in metrics

## Context
When multiple metric records exist for the same KOL + platform on the same day, the `kolSummaries` deltas and `sparklineData` incorrectly SUM all records instead of keeping only the latest one. This causes wildly incorrect delta percentages (e.g., +200% instead of +0.01%).

## Root Cause
`dayMap` in both `kolSummaries` and `sparklineData` does `+=` for all records on the same day, but the data contains cumulative snapshots (not incremental), so duplicates get double/triple counted.

## Fix

### File: `src/hooks/useVideoMetrics.ts`

1. **`kolSummaries` dayMap**: Change from sum-all to deduplicate per `day + platform`, keeping only the latest `recorded_at` per combo, then sum across platforms per day.

2. **`sparklineData` dayMap**: Same fix — deduplicate per `day + platform` before summing across platforms.

Both should match the existing `trendData` deduplication pattern (lines 137-145).

## Verification
- BeerMoneyForum should show ~0.01% delta (not 200%)
- Sparkline should show flat trend (views only changed by 10)
- KOLs with single daily records should be unaffected
