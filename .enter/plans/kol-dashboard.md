# Fix: KolTickerCard Deltas Not Showing Changes

## Context
Sparkline 折线图已改为每日增量，但卡片下方的 totals/deltas 仍然使用"最近两条原始记录"比较，导致与折线图趋势不一致，delta 经常显示 0%。

## Change

### `src/hooks/useVideoMetrics.ts` — `kolSummaries` 计算

当前逻辑:
- `totals` = 每个平台最近一条记录的累计值之和
- `deltas` = 最近一条 vs 倒数第二条记录的百分比变化

新逻辑（与折线图保持一致）:
- `totals` = 最近一天的每日增量（当天快照 - 前一天快照）
- `deltas` = 最近一天增量 vs 前一天增量的百分比变化
- 按天聚合该 KOL 所有平台的数据，取最近两天计算

如果只有一天数据，totals 显示当天值，deltas 显示 0%。

## Verification
- 有多天数据时：totals 显示最近一天增量，deltas 显示增量的变化百分比
- 只有一天数据时：totals 显示当天值，deltas 为 0%
- 无数据时：显示 "No data yet"
