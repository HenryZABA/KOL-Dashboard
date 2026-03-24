# Clickable Platform Icons on Published Focus Cards

## Context
In the All KOLs kanban, published cards already use `LinkedPlatformIcons` which makes platform icons clickable, linking to publication URLs. However, `KolFocusCard` (used in Today's Focus section) always uses plain `PlatformIcons`, so published KOLs there have non-clickable icons.

## Change
**File: `src/components/kol/KolFocusCard.tsx`**
- Import `LinkedPlatformIcons` alongside `PlatformIcons`
- On line 108, conditionally render `LinkedPlatformIcons` when `kol.currentStage === 'published'`, else use `PlatformIcons` — same pattern as `KolKanbanCard` (lines 31-35)

## Verification
- Flag a published KOL for Today's Focus
- On the dashboard, the published card's platform icons should be clickable and open the corresponding publication link
