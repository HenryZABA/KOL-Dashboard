# Plan: Codebase Optimization Pass

## Issues Found & Fixes

### 1. Dead Code: `PerformanceView.tsx` deleted but still imported
- `PerformanceView.tsx` no longer exists (deleted during Calendar refactor) but may still be referenced
- **Fix**: Verify no orphan imports remain

### 2. Dead Code: `mock-data.ts` has MOCK_KOLS/MOCK_AGENCIES (200+ lines)
- All data comes from Supabase now. Mock arrays are unused.
- **Fix**: Remove `MOCK_KOLS`, `MOCK_AGENCIES`, and `daysAgo()` helper from `src/lib/mock-data.ts`. Keep types, constants, and utility functions.

### 3. Duplicate `formatNumber` / `fmt` / `parsePubLinks` functions
- `formatNumber` is copy-pasted in: `KolTickerCard.tsx`, `MarketOverview.tsx`
- `fmt` is copy-pasted in: `CalendarView.tsx`, `DayDetailDialog.tsx`
- `parsePubLinks` is copy-pasted in: `KolTickerCard.tsx`, `DayDetailDialog.tsx`
- **Fix**: Move `formatNumber` and `parsePubLinks` to `src/lib/utils.ts`, import everywhere.

### 4. `SummaryBar.tsx` trailing empty div in JSX
- Line 66 has a dangling empty block after the overdue section was removed.
- **Fix**: Clean up the JSX.

### 5. `AppSidebar.tsx` unused `showBadge` destructure
- Line 58: `{ to, icon: Icon, label, end, showBadge }` — `showBadge` doesn't exist in the NAV_ITEMS type.
- **Fix**: Remove `showBadge` from destructuring.

### 6. Performance: `sparklineData` and `sparklineDataByPlatform` are `useCallback` but re-filter metrics array every call
- Every card renders → calls `sparklineData(kolId)` → filters the entire metrics array (2000+ rows).
- **Fix**: Pre-compute a `Map<kolId, VideoMetric[]>` grouped index once in the hook, then sparkline functions only iterate that KOL's subset.

### 7. `useVideoMetrics.ts` — `fetchMetrics` missing error handling
- If the first page errors, `allData` stays empty but `setLoading(false)` is called with no metrics. No error state.
- **Fix**: Add `setMetrics([])` on error so it's explicit, and log a warning.

### 8. Signups sort option missing
- Previous plan added "Signups" sort, but current `SORT_OPTIONS` in PerformancePage only has name/views/likes/comments/shares.
- **Fix**: Add `signups` sort option (uses conversionMap).

## Files to Modify
- `src/lib/mock-data.ts` — remove mock arrays
- `src/lib/utils.ts` — add `formatNumber`, `parsePubLinks`
- `src/components/performance/KolTickerCard.tsx` — import shared utils
- `src/components/performance/MarketOverview.tsx` — import shared utils
- `src/components/performance/CalendarView.tsx` — import shared utils
- `src/components/performance/DayDetailDialog.tsx` — import shared utils
- `src/components/layout/AppSidebar.tsx` — remove `showBadge`
- `src/components/layout/SummaryBar.tsx` — clean trailing JSX
- `src/hooks/useVideoMetrics.ts` — pre-group metrics, error handling
- `src/pages/PerformancePage.tsx` — add signups sort

## Verification
- `pnpm run lint` passes
- Performance page renders correctly with Cards/Calendar views
- Sparkline data displays correctly
- Sort by signups works
