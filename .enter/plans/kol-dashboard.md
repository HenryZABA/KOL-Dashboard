# Plan: Stage Distribution Dashboard

## Context
User wants a data visualization panel placed to the right of the Pre-publish Confirmation section on the Today's Focus page. It should show the count of KOLs in each pipeline stage (Idea, Script/Project, Video, Pre-publish, Published) using visual elements inspired by the pastel-crypto-data reference component (animated bars, gauge, clean cards with rounded corners).

## Approach
Create a `StageDistributionPanel` component with:
1. **Horizontal bar chart** — one bar per stage with count + percentage, animated on mount
2. **Total KOL count** with a prominent number display
3. **Overdue count** highlighted
4. **Mini donut/ring** gauge showing pipeline completion (% published)

Visual style: Matches the pastel-crypto-data aesthetic — rounded cards (rounded-2xl), soft shadows, mint green + purple accents, smooth entry animations. Uses design system tokens (no raw colors in component — define accent tokens in index.css).

## Files to Modify
- `src/index.css` — add animation keyframes + accent color tokens
- `src/components/kol/StageDistributionPanel.tsx` — **NEW** — the dashboard widget
- `src/pages/TodaysFocusPage.tsx` — update layout: Pre-publish + Dashboard side by side in a grid

## Layout Change (TodaysFocusPage)
```
Today's Focus (horizontal scroll cards)
─────────────────────────────────────────
Pre-publish Board (left, 2/3) | Stage Dashboard (right, 1/3)
```
Use `grid grid-cols-1 lg:grid-cols-3 gap-6` for the bottom section.

## Verification
- Stage counts should match real Supabase data
- Bars animate on mount
- Responsive: stacks vertically on small screens
