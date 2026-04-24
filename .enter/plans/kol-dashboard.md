# 优化计划：代码清理与性能提升

## 发现的问题与修复方案

### 1. 死代码：mock-data.ts 里 200+ 行假数据
- 所有数据已经走 Supabase，`MOCK_KOLS`、`MOCK_AGENCIES`、`daysAgo()` 完全没用
- **修复**：删除假数据数组，保留类型定义和工具函数

### 2. 重复函数：`formatNumber` / `parsePubLinks` 到处复制粘贴
- `formatNumber` 出现在 4 个文件：KolTickerCard、MarketOverview、CalendarView、DayDetailDialog
- `parsePubLinks` 出现在 2 个文件：KolTickerCard、DayDetailDialog
- **修复**：提取到 `src/lib/utils.ts`，统一引用

### 3. AppSidebar.tsx 解构了不存在的 `showBadge`
- 第 58 行解构了 `showBadge` 但 NAV_ITEMS 里根本没这个字段
- **修复**：删除多余解构

### 4. SummaryBar.tsx 残留空 JSX
- 第 66 行有个没内容的空块
- **修复**：清理掉

### 5. 性能问题：sparkline 每次调用都遍历全量 metrics（2000+ 条）
- 每张卡片渲染时 `sparklineData(kolId)` 都 filter 整个 metrics 数组
- **修复**：在 hook 里预先按 kol_id 建索引 Map，sparkline 只遍历当前 KOL 的子集

### 6. useVideoMetrics 缺少错误处理
- 分页查询出错时 metrics 会是空的但没有任何提示
- **修复**：加 console.warn 和显式 setMetrics([])

### 7. Performance 排序缺少"注册数"选项
- 之前计划加的 Signups 排序没在当前代码里
- **修复**：加上 signups 排序（用 conversionMap 数据）

## 涉及文件
- `src/lib/mock-data.ts` — 删假数据
- `src/lib/utils.ts` — 加 formatNumber、parsePubLinks
- `src/components/performance/KolTickerCard.tsx` — 引用共享函数
- `src/components/performance/MarketOverview.tsx` — 引用共享函数
- `src/components/performance/CalendarView.tsx` — 引用共享函数
- `src/components/performance/DayDetailDialog.tsx` — 引用共享函数
- `src/components/layout/AppSidebar.tsx` — 删 showBadge
- `src/components/layout/SummaryBar.tsx` — 清理空 JSX
- `src/hooks/useVideoMetrics.ts` — 预索引 + 错误处理
- `src/pages/PerformancePage.tsx` — 加 signups 排序
