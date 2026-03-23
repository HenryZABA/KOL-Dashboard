## Plan: Fix footer pinned to card bottom

### Problem
`space-y-2` adds uniform spacing between all children, overriding `mt-auto` on the footer. Footer doesn't stick to the bottom.

### Fix
Remove `space-y-2` from the card container. Add `gap-2` to the content wrapper, keep `mt-auto` on footer so it's always pinned to the bottom.

### File
- `src/components/kol/KolKanbanCard.tsx`
