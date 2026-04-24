# 架构重构计划

## 背景
三个优化方向：(1) 引入 React Query 统一数据缓存 (2) 用 Supabase 类型替代手写类型 (3) 抽 services 层

## 重构方案

### 第一步：重命名 mock-data.ts -> types.ts 并统一类型

**核心思路**：`mock-data.ts` 已经没有 mock 数据了，只剩类型和常量。将其重命名为 `src/lib/types.ts`，但**保留现有的 camelCase 前端类型**（KOL、Agency 等）。

Supabase 自动生成的类型是 snake_case（`current_stage`、`agency_id`），前端用的是 camelCase（`currentStage`、`agencyId`）。完全去掉映射意味着所有组件都要改成 snake_case，改动量巨大且可读性下降。

**实际操作**：
- 重命名 `src/lib/mock-data.ts` -> `src/lib/types.ts`
- 全局替换所有 `from '@/lib/mock-data'` -> `from '@/lib/types'`
- 在 `types.ts` 里导出 Supabase 原生 Row 类型的别名，供 services 层使用
- 涉及 25+ 个文件的 import 路径更新

### 第二步：抽 services 层

**新建文件**：
- `src/services/kol-service.ts` — KOL/Agency 的 CRUD 操作
- `src/services/metrics-service.ts` — video_metrics 分页查询
- `src/services/conversion-service.ts` — kol_conversions 查询

**kol-service.ts** 内容（从 kol-store.tsx 提取）：
- `fetchAllKols()` — 返回 KOL[]
- `fetchAllAgencies()` — 返回 Agency[]
- `insertKol(data)` — 插入 KOL
- `updateKolStage(kolId, stage, note?)` — 更新阶段
- `updateKolFields(kolId, updates)` — 更新字段
- `toggleFocus(kolId, current)` — 切换今日焦点
- `insertAgency(name)` — 创建 agency
- `deleteAgency(agencyId)` — 删除 agency
- 每个函数内部用 `supabase.from()`，包含 `dbToKol` / `dbToAgency` 映射

**metrics-service.ts** 内容（从 useVideoMetrics.ts 提取）：
- `fetchVideoMetrics(kolIds: string[])` — 分页查询，返回 VideoMetric[]

**conversion-service.ts** 内容（从 useKolConversions.ts 提取）：
- `fetchConversions(kolIds: string[])` — 返回 KolConversion[]

### 第三步：引入 React Query

**安装**：`@tanstack/react-query`

**改造文件**：
- `src/main.tsx` — 包裹 `QueryClientProvider`
- `src/lib/kol-store.tsx` — `fetchData` 改用 React Query 的 `useQuery`，保留 realtime 订阅做乐观更新
- `src/hooks/useVideoMetrics.ts` — 用 `useQuery` 包裹 `fetchVideoMetrics()`，自动缓存
- `src/hooks/useKolConversions.ts` — 用 `useQuery` 包裹 `fetchConversions()`，自动缓存

**缓存策略**：
- KOL/Agency 数据：`staleTime: 30s`（realtime 补充更新）
- video_metrics：`staleTime: 5min`（数据更新频率低）
- conversions：`staleTime: 5min`

## 涉及文件

**新建**：
- `src/services/kol-service.ts`
- `src/services/metrics-service.ts`
- `src/services/conversion-service.ts`

**重命名**：
- `src/lib/mock-data.ts` -> `src/lib/types.ts`

**修改**：
- `src/main.tsx` — 加 QueryClientProvider
- `src/lib/kol-store.tsx` — 提取 DB 操作到 service，引入 useQuery
- `src/hooks/useVideoMetrics.ts` — 引入 useQuery + service
- `src/hooks/useKolConversions.ts` — 引入 useQuery + service
- 25+ 个组件文件的 import 路径更新（mock-data -> types）

## 验证
- `pnpm run lint` 通过
- 所有页面正常渲染（Kanban、Performance、Agency Portal）
- 切换页面时数据不重复加载（React Query 缓存生效）
- Realtime 更新仍然正常
