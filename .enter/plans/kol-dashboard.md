# Plan: KOL Card Platform Icons with Two-Click Interaction

## Context
KOL cards in Performance page may have videos on multiple platforms (YouTube, TikTok, etc.). Currently the platform icons just link out. The user wants:
1. Each platform with data should show its icon in top-right corner
2. **First click**: Switch card data to show that platform's metrics/sparkline only (icon enters "selected" state — visually distinct: filled background + ring)
3. **Second click on same selected icon**: Open external link (icon pulses briefly as feedback)
4. Default: show aggregated all-platform data (no icon selected)

## Files to modify

### 1. `src/hooks/useVideoMetrics.ts`
- Add `sparklineDataByPlatform(kolId, platform)` — returns per-platform daily growth rate sparkline
- Add per-platform totals/deltas to `KolMetricSummary` (a `perPlatform` map)

### 2. `src/components/performance/KolTickerCard.tsx`
- Add `activePlatform` state (null = all, or a Platform value)
- Replace `<LinkedPlatformIcons>` with custom inline icons that:
  - Track click count via `activePlatform` state
  - First click: `setActivePlatform(p)` — show platform-specific data
  - Second click (same platform already active): `openExternal(url)` + optionally keep selected
  - Click different platform: switch to that platform
  - Visual states:
    - **Inactive**: normal icon with hover effect (current style)
    - **Selected/Active (1st click)**: icon gets `bg-primary/10 ring-1 ring-primary rounded` highlight
- When `activePlatform` is set, show that platform's sparkline and metrics instead of aggregate
- Accept new props: `sparklineByPlatform` callback and `perPlatformData` map

### 3. `src/pages/PerformancePage.tsx`
- Pass `sparklineDataByPlatform` to KolTickerCard
- Pass per-platform summary data

## Visual distinction (first click vs second click)
- **Default**: icon normal, `opacity-100` or `opacity-30` if no link
- **First click (selected)**: `bg-primary/15 ring-1 ring-primary/50 rounded-md p-1` — highlighted background + ring  
- **Second click**: opens link (icon is already highlighted, clicking again navigates out)
- Clicking a different icon deselects previous, selects new one

## Verification
- Card with 2+ platforms: click YouTube → sparkline/metrics switch to YouTube only
- Click YouTube again → opens external link
- Click TikTok → switches to TikTok data, YouTube deselects
- Click empty area / no platform selected → shows aggregate data
