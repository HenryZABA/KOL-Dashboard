# KOL CRUD API Edge Function

## Context
Currently only a read-only `get-todays-focus` endpoint exists. The user needs a full CRUD API for external agents to create, read, update, and delete KOLs.

## Approach
Create a single Edge Function `manage-kols` that handles all CRUD operations via HTTP methods:

### API Design
| Method | Path | Action |
|--------|------|--------|
| `GET` | `/manage-kols` | List all KOLs (with optional `?agency_id=` filter) |
| `GET` | `/manage-kols?id=xxx` | Get single KOL by ID |
| `POST` | `/manage-kols` | Create new KOL |
| `PATCH` | `/manage-kols` | Update existing KOL (body must include `id`) |
| `DELETE` | `/manage-kols` | Delete KOL (body must include `id`) |

### Request body fields (POST/PATCH)
- `name`, `platforms`, `agency_id` (required for POST)
- `current_stage`, `script_version`, `script_complete`, `project_complete`, `video_version`
- `profile_url`, `content_direction`, `notes`, `feishu_url`, `is_todays_focus`, `stage_links`

### Auth
- Uses the same `apikey` header (anon key) as `get-todays-focus`
- Leverages existing RLS policy "Anon can manage kols via agency portal" (ALL, qual=true)

### Stage change logic
- When `current_stage` is updated, auto-update `stage_updated_at` and insert a `change_log` entry
- When stage changes to `pre_publish`, auto-set `is_todays_focus = true` (matching frontend logic in kol-store.tsx)

## Files to modify
1. **New Edge Function**: `manage-kols` — deploy via `supabase_deploy_edge_function`
2. **`src/pages/SettingsPage.tsx`** — Add the new API endpoint info + usage examples for POST/PATCH/DELETE

## Verification
- Call GET to list KOLs
- Call POST to create a KOL, verify it appears in dashboard
- Call PATCH to update a KOL's stage, verify change_log is created
- Call DELETE to remove a KOL
