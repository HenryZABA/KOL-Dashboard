# Schema Alignment: Add Missing KOL Fields

## Context
Agency spreadsheet has fields not yet in the `kols` database table. Need to add them so the sync agent can write complete data.

## Current vs Required

| Spreadsheet Column | DB Column | Status |
|---|---|---|
| Agency Name | `agency_id` (FK) | OK |
| Account Link | `profile_url` | OK |
| Influencer Name | `name` | OK |
| **Category** | -- | **MISSING** |
| Platform | `platforms` | OK (need to add `youtube_shorts`, `linkedin`) |
| **Follower (K)** | -- | **MISSING** |
| **Region** | -- | **MISSING** |
| **最近10条视频中位数 (K)** | -- | **MISSING** |
| **可接受植入方式** | -- | **MISSING** |
| **Final Price** | -- | **MISSING** |
| **达人互联网搜索** | -- | **MISSING** |
| Content Direction | `content_direction` | OK |
| UTM | `utm_content` + `utm_link` | OK |
| Bitly link | `bitly_link` | OK |
| **Boot link** | -- | **MISSING** |
| Published Date | `published_at` | OK |
| **Caption** | -- | **MISSING** |
| **Cover** | -- | **MISSING** |
| **原片 (raw footage)** | -- | **MISSING** |
| **数据详情链接** | -- | **MISSING** |
| **截图时间** | -- | **MISSING** |
| Notes/备注 | `notes` | OK |

## Step 1: DB Migration — Add 11 new columns to `kols`

```sql
ALTER TABLE kols ADD COLUMN category text;
ALTER TABLE kols ADD COLUMN follower_count real;          -- in K (thousands)
ALTER TABLE kols ADD COLUMN region text;
ALTER TABLE kols ADD COLUMN median_views real;            -- 最近10条视频中位数 (K)
ALTER TABLE kols ADD COLUMN integration_type text;        -- 可接受植入方式
ALTER TABLE kols ADD COLUMN final_price real;
ALTER TABLE kols ADD COLUMN influencer_search_note text;  -- 达人互联网搜索
ALTER TABLE kols ADD COLUMN boot_link text;
ALTER TABLE kols ADD COLUMN caption text;
ALTER TABLE kols ADD COLUMN cover_url text;
ALTER TABLE kols ADD COLUMN raw_footage_url text;         -- 原片
ALTER TABLE kols ADD COLUMN data_detail_link text;        -- 数据详情链接
ALTER TABLE kols ADD COLUMN screenshot_time timestamp with time zone; -- 截图时间
```

## Step 2: Update Platform type — add `youtube_shorts` and `linkedin`

In `src/lib/types.ts`:
```ts
export type Platform = 'youtube' | 'youtube_shorts' | 'tiktok' | 'instagram' | 'x' | 'facebook' | 'linkedin';
```
Update `PLATFORM_LABELS` accordingly.

## Step 3: Update KOL type in `src/lib/types.ts`

Add all 11 new optional fields to the `KOL` interface.

## Step 4: Update `dbToKol()` in `src/services/kol-service.ts`

Map all new snake_case DB columns to camelCase fields.

## Step 5: Update `updateKolFields()` in `src/services/kol-service.ts`

Add reverse mappings for the new fields.

## Files Changed
- `src/lib/types.ts` — Platform type, KOL interface, PLATFORM_LABELS
- `src/services/kol-service.ts` — dbToKol, updateKolFields
- DB migration (11 new columns)

## Verification
- Run `supabase_get_table_schema` to confirm columns added
- `run_lint` passes
- Existing features unaffected (all new fields are optional/nullable)
