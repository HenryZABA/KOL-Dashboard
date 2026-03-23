## Plan: Fix footer height in Kanban cards

### Change
Add `h-6` to the footer div to ensure the days + agency row is always the same height across all cards.

### File
- `src/components/kol/KolKanbanCard.tsx` line 60
