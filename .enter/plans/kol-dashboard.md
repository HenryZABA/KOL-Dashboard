# Move agency badge to footer row in KolKanbanCard

Move agency name badge from header (top-right) to footer row, right-aligned on same line as days count.

File: `src/components/kol/KolKanbanCard.tsx`
- Remove agency badge from header div
- Add it to footer div with `justify-between`
