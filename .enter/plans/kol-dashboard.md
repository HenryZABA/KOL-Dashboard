# Plan: Enable Realtime for kols and agencies tables

## Context
The dismiss button on Today's Focus cards updates the database but the UI doesn't refresh because the `kols` table is not part of the `supabase_realtime` publication. The store relies on Realtime UPDATE events to update local state.

## Fix
Run migration: `ALTER PUBLICATION supabase_realtime ADD TABLE kols, agencies;`

## File: No code changes needed
The kol-store.tsx Realtime subscription code is already correct - it just needs the publication enabled.

## Verification
- Click X on a Focus card → card should disappear immediately
- Changes via API should also reflect in real-time
