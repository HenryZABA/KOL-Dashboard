# Plan: Agency AI 数据隔离

## Context
Agency 端 AI 助手复用了和 Brand 端相同的 edge function，没有传递 agency 身份。Agency 用户可以通过 AI 查到所有 KOL 数据，存在数据泄露风险。

## 方案
在 Agency 端 AI 调用链中传入 `agencyId`，edge function 收到后：
1. 强制所有 tool 调用按 `agency_id` 过滤
2. System prompt 声明 agency 身份并限制只能访问自己的 KOL
3. 禁用 `get_summary` 工具（跨 agency 汇总数据）

### 改动文件

#### 1. `src/components/ai/AiChatPanel.tsx`
- Props 新增 `agencyId?: string`
- 传给 `useAiChat` 的 `sendMessage`

#### 2. `src/hooks/useAiChat.ts`
- `sendMessage` 接收可选的 `agencyId` 参数
- 在 request body 中传 `agencyId` 给 edge function

#### 3. `src/components/agency/AgencyAiChat.tsx`
- 从 URL params 拿 `token` → 查 `agency` → 传 `agencyId` 给 `AiChatPanel`

#### 4. `supabase/functions/ai-chat-462b20ce438b/index.ts`
- 解析 request body 中的 `agencyId`
- 如果有 `agencyId`：
  - `listKols`: 强制 `.eq("agency_id", agencyId)` 忽略用户传的 `agency_id` 参数
  - `getKolDetails`: 查到后验证 `agency_id` 匹配，不匹配返回 "KOL not found"
  - `updateKolStage`: 查到后验证 `agency_id` 匹配
  - `toggleTodaysFocus`: 查到后验证 `agency_id` 匹配
  - `getSummary`: 仅统计该 agency 的 KOL
- System prompt 加入："You are operating in agency mode. You can only access KOLs belonging to your agency."
- KB 检索不受影响（Enter 品牌信息对所有 agency 可见）

## 验证
1. Agency 端 AI 问"列出所有 KOL"→ 只返回该 agency 的
2. Agency 端 AI 问其他 agency 的 KOL → 拿不到
3. Brand 端 AI 不受影响（不传 agencyId）
