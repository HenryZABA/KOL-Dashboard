# Plan: Performance Card Data Logic

## Context
User wants card metrics to show cumulative totals (sum of latest records) while the sparkline shows daily increments. The delta percentages should reflect the daily increment change (matching the sparkline trend).

## Changes

### File: `src/hooks/useVideoMetrics.ts` — `kolSummaries`

1. **`totals`**: Revert to cumulative — sum of latest record per platform (original logic)
2. **`deltas`**: Based on daily increments — `(today_increment - yesterday_increment) / yesterday_increment * 100`
   - Uses the same day-aggregated snapshots as sparkline
   - Needs 2+ days for increments, 3+ days for delta %

## Verification
- Totals should show large cumulative numbers
- Deltas should show % matching the sparkline trend direction
- KOLs with only 1 day data: totals show values, deltas show 0%
