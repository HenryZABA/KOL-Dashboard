# Fix: Dismiss Button Not Hiding Cards

## Problem
1. **Focus cards**: `focusKols` filter includes overdue KOLs regardless of `isTodaysFocus`. Dismissing toggles `isTodaysFocus` off, but the overdue condition still matches, so the card stays.
2. **Pre-publish cards**: Filtered by `currentStage === 'pre_publish'` only, not by `isTodaysFocus` at all, so dismiss has no effect.

## Solution
Use a `dismissed` Set in local state to immediately hide dismissed cards from the UI, while still toggling `isTodaysFocus` in the database for persistence.

### `src/pages/TodaysFocusPage.tsx`
- Add `dismissed` state: `useState<Set<string>>(new Set())`
- Reset `dismissed` when `kols` changes (since refreshed data reflects DB state)
- In `handleDismiss`: add kolId to `dismissed` set AND call `toggleTodaysFocus`
- Filter out dismissed IDs from both `focusKols` and `prePublishKols`
