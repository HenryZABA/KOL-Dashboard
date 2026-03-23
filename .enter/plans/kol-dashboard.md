# Rename Stage Labels

## Changes
Rename display labels across code and database:
- "Writing Idea" → "Idea"
- "Creating Project" → "Project"  
- "Writing Script / Creating Project" → "Writing Script / Project"
- "Video Production" → "Video"

## Files
- `src/lib/mock-data.ts` — STAGE_LABELS + KANBAN_COLUMNS
- `src/components/kol/KolKanbanColumn.tsx` — COLUMN_HEADER_COLORS keys
- `src/components/agency/KolDetailPanel.tsx` — hardcoded labels
- `src/components/kol/StageDistributionPanel.tsx` — STAGES labels
- Database: update stage values in `kols.current_stage` and `change_log` columns
