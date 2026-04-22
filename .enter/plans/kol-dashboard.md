# Plan: Replace Timeline View with Calendar View

## Context
The current Timeline view in the Performance section groups KOLs by publish date in a flat list. The user wants a **Calendar month view** instead, where each day cell shows KOLs published that day. Clicking a day opens a Dialog with full details.

## Files to Modify
- **CREATE** `src/components/performance/CalendarView.tsx` — Custom month grid calendar
- **CREATE** `src/components/performance/DayDetailDialog.tsx` — Dialog showing KOL details for a clicked day
- **MODIFY** `src/pages/PerformancePage.tsx` — Replace `DateTimeline` import/usage with `CalendarView`, update toggle icon from `List` to `CalendarDays`
- **DELETE** `src/components/performance/DateTimeline.tsx` — No longer needed

## Implementation

### CalendarView.tsx
- Props: same as DateTimeline (`kolSummaries`, `conversionMap`, `conversionsByKol`)
- State: `currentMonth` (Date), `selectedDate` (string | null for dialog)
- Group `kolSummaries` by `publishedAt` ISO date string → `Map<string, KolMetricSummary[]>`
- Render a 7-column grid (Mon–Sun), with prev/next month navigation
- Each day cell:
  - Day number
  - If KOLs exist for that date: show count badge + first 2-3 KOL names truncated with platform icons
  - Days with events get a subtle highlight background
  - `onClick` → set `selectedDate` to open dialog
- Show outside-month days dimmed

### DayDetailDialog.tsx
- Uses shadcn `Dialog`
- Props: `date`, `entries: KolMetricSummary[]`, `conversionMap`, `conversionsByKol`, `open`, `onClose`
- Content: reuses the same row layout from the old TimelineRow — KOL name, platform icons, Views, Reached, Signups, Sign R, Paid, Paid R
- Date header with aggregate totals for the day

### PerformancePage.tsx
- Replace `DateTimeline` import with `CalendarView`
- Change toggle icon from `List` to `CalendarDays` (from lucide-react)
- Pass same props to CalendarView

## Reused Patterns
- `PlatformIcon` component for platform icons in calendar cells and dialog
- `parsePubLinks` + `openExternal` for clickable platform links in dialog
- `fmt()` number formatter
- `KolConversion` / `KolConversionAgg` types from useKolConversions
- shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`

## Verification
- Navigate to Performance page, toggle to Calendar view
- See month grid with KOL names on their publish dates
- Navigate between months with prev/next buttons
- Click a day with KOLs → Dialog opens showing detailed data
- Agency filter still works (filters KOLs shown in calendar)
