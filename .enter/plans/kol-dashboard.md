# Plan: KOL Search + Hide Stage Duration for Published

## Context
User wants: (1) search in Performance page (Agency already has it), (2) hide "Xd" stage duration for published KOLs on Kanban cards.

## Changes

### 1. Add search to Performance page
**File: `src/pages/PerformancePage.tsx`**
- Add `searchQuery` state and `Search` + `Input` imports
- Add search input below agency filter pills
- Filter `publishedKols` (or `sortedSummaries`) by name before rendering Cards/Calendar
- Same pattern as AgencyPortalPage line 35-41

### 2. Hide stage duration for published KOLs
**File: `src/components/kol/KolKanbanCard.tsx`**
- In the footer section (lines 66-78), conditionally render the Clock + days display only when `kol.currentStage !== 'published'`
- Published KOLs don't need the "in stage for X days" indicator

## Verification
- Performance page: type in search box, cards/calendar filter by KOL name
- Kanban board: published column cards no longer show "Xd" clock
