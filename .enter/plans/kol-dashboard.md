# Fix Layout: Pipeline Overview left-aligned next to Pre-publish

## Problem
Pipeline Overview panel is stretching to fill remaining space and sticking to the right edge of the page. User wants it to sit immediately next to the Pre-publish cards, left-aligned.

## Fix
In `src/pages/TodaysFocusPage.tsx`:
- Remove `lg:flex-1` from Pipeline Overview wrapper — use fixed width only (`w-full lg:w-[300px]`)
- Keep `flex items-start` on the container (no justify-between or flex-1 that would spread items)

This makes both sections sit naturally left-aligned, Pipeline Overview directly after Pre-publish.

## Files
- `src/pages/TodaysFocusPage.tsx` — adjust the flex container classes
