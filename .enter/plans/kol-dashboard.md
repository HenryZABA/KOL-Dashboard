# Contextual Stage Links

## Change
In KolDetailPanel, only show the review material link input for the KOL's current stage instead of all stages.

## File
`src/components/agency/KolDetailPanel.tsx` — filter LINK_STAGES to current stage

## Verification
Open a KOL in Idea stage → only Idea link shows. Change to Script stage → only Script+Project links show.
