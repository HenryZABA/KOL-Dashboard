# Video Performance Dashboard (Stock-Ticker Style)

## Context
Need a new sidebar page showing published KOLs' video performance data (views, likes, comments, shares) in a stock-market-inspired dashboard. Data is written via the existing CRUD API by external agents.

## 1. Database: `video_metrics` table
```sql
CREATE TABLE video_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kol_id UUID NOT NULL REFERENCES kols(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- youtube/tiktok/instagram/x/facebook
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- Multiple rows per KOL+platform over time to track trends
- `recorded_at` = when the data was sampled (allows historical trend)
- RLS: open for anon read/write (same as kols)

## 2. API: `manage-video-metrics` Edge Function
- **POST**: Insert a new metric snapshot `{kol_id, platform, views, likes, comments, shares, recorded_at?}`
- **GET**: List metrics `?kol_id=` or `?latest=true` (returns most recent per KOL+platform)
- **DELETE**: Remove a metric by id

## 3. UI: `PerformancePage.tsx`
Two main sections:

### Section A — Ticker Board (individual KOLs)
- Grid of cards, one per published KOL
- Each card shows: KOL name, platform icons, latest metrics (views/likes/comments/shares)
- Delta indicators (up/down arrows + percentage change vs. previous snapshot) — green for up, red for down, like stock price movement
- Mini sparkline chart showing views trend (last N snapshots)
- Sortable by any metric column

### Section B — Market Overview (totals)
- Summary stat cards: Total Views, Total Likes, Total Comments, Total Shares across all published KOLs
- A combined trend chart (recharts AreaChart) showing aggregate views over time
- Top performers list (top 3 by views)

### Design tokens (index.css)
- `--metric-up: 142 71% 45%` (green, reuse --success)
- `--metric-down: 0 84% 60%` (red, reuse --overdue)

## 4. Files to create/modify
- **DB migration**: `video_metrics` table + RLS
- **Edge Function**: `manage-video-metrics`
- **New page**: `src/pages/PerformancePage.tsx`
- **New component**: `src/components/performance/KolTickerCard.tsx`
- **New component**: `src/components/performance/MarketOverview.tsx`
- **Router**: `src/router.tsx` — add `/dashboard/performance`
- **Sidebar**: `src/components/layout/AppSidebar.tsx` — add nav item with BarChart3 icon
- **Settings**: `src/pages/SettingsPage.tsx` — add video metrics API info

## Verification
- Insert sample metrics via API
- Verify ticker cards show data with delta indicators
- Verify summary section shows aggregate totals + chart
