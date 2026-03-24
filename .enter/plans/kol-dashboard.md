# Fix: Dismissed Cards Reappear After Refresh

## Problem
Focus cards filter includes overdue KOLs regardless of `isTodaysFocus` flag. Pre-publish cards filter by stage only. Both bypass the DB, so dismissed cards reappear on refresh.

## Solution
Make both filters rely solely on `isTodaysFocus`:
- **Focus cards**: Show only `isTodaysFocus === true` (remove `isOverdue` auto-include)
- **Pre-publish cards**: Show only `currentStage === 'pre_publish' && isTodaysFocus === true`
- Remove local `dismissed` state (no longer needed since DB flag is authoritative)
- Simplify `handleDismiss` to just call `toggleTodaysFocus`

This works because:
- Agency manually flags KOLs for Idea/Script/Video stages
- Pre-publish auto-flags via `updateKolStage`
- Dashboard X button sets `isTodaysFocus = false` persistently
- Card only reappears when agency re-enables the flag

### File: `src/pages/TodaysFocusPage.tsx`
