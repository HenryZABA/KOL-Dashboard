# Performance Charts: Daily Incremental Data

## Context
Performance 页面的折线图目前显示的是每日累计快照值，用户希望改为**每日增量**（当天值 - 前一天值），以便直观看到每天的变化趋势。

## Changes

### `src/hooks/useVideoMetrics.ts`

**trendData** (MarketOverview 大折线图):
- 现有逻辑已经按天聚合了每个 kol+platform 的最新快照值
- 新增：排序后计算相邻两天的差值 `day[i] - day[i-1]`
- 第一天的增量为其自身值（无前一天可比）
- 返回 `{ date, views, likes, comments, shares }` 其中值为增量

**sparklineData** (KolTickerCard 小迷你图):
- 现有逻辑按天聚合该 KOL 所有平台的 views 总和
- 新增：排序后计算相邻两天的 views 差值
- 返回 `{ date, views }` 其中 views 为每日增量

### `src/components/performance/MarketOverview.tsx`
- 图表标题从 "Views Trend" 改为 "Daily Views Change"

## Verification
- 有数据时：折线图显示每日增量而非累计值
- 无数据时：仍显示 "No data yet"
- Sparkline 颜色仍根据 deltas.views 正负决定
