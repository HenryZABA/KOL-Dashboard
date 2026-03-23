## Plan: Today's Focus API Edge Function

### Context
User wants an API that external agents/bots can call to get today's focus KOLs, so the data can be forwarded to Slack, Feishu, etc.

### Implementation
Create a Supabase Edge Function `get-todays-focus` that:

1. Queries the `kols` table joined with `agencies` for:
   - KOLs flagged as `is_todays_focus = true`
   - KOLs overdue (stage_updated_at > 2 days ago, not published)
   - KOLs in `pre_publish` stage
2. Returns structured JSON with:
   - `focusKols`: overdue/flagged KOLs (name, platforms, stage, days waiting, agency name)
   - `prePublishKols`: KOLs awaiting publish confirmation
   - `summary`: total count, overdue count, stage breakdown
3. No auth required (public API) — data is read-only

### API Response Shape
```json
{
  "summary": { "total": 12, "overdueCount": 3, "focusCount": 5, "prePublishCount": 2, "stages": {...} },
  "focusKols": [{ "name": "...", "platforms": [...], "stage": "...", "daysWaiting": 5, "agency": "..." }],
  "prePublishKols": [{ "name": "...", "scriptVersion": 2, "videoVersion": 1, "feishuUrl": "...", "agency": "..." }]
}
```

### File
- Edge Function: `supabase/functions/get-todays-focus/index.ts`

### Verification
- Call the edge function URL to verify JSON response
- Check that overdue logic matches frontend (>2 days in stage, not published)
