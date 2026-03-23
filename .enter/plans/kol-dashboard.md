# Stage Review Links Feature

## Context
User wants each KOL to have optional review material links per stage (Idea, Script, Project, Video, Pre-publish). Agency portal users can fill these in. On the brand dashboard (Today's Focus), the progress bar step labels become clickable links that open the corresponding review material.

## Approach

### 1. Database: Add `stage_links` JSONB column to `kols` table
Add a single JSONB column `stage_links` to the existing `kols` table. Structure:
```json
{
  "writing_idea": "https://...",
  "writing_script": "https://...",
  "creating_project": "https://...",
  "video_production": "https://...",
  "pre_publish": "https://..."
}
```
This is simpler than a separate table and allows easy reads without joins.

### 2. Data Model: Add `stageLinks` to KOL type
- **`src/lib/mock-data.ts`**: Add `stageLinks?: Record<string, string>` to `KOL` interface
- **`src/lib/kol-store.tsx`**: 
  - Map `stage_links` DB column to `stageLinks` in `dbToKol()`
  - Support updating `stageLinks` in `updateKolField()`

### 3. Agency Portal: Add link input fields per stage in KolDetailPanel
- **`src/components/agency/KolDetailPanel.tsx`**: Add a new "Review Material Links" section showing an input for each stage (Idea, Script, Project, Video, Pre-publish). Each input lets the agency paste a URL. Changes saved via `onUpdateField`.

### 4. Today's Focus Cards: Clickable progress bar labels
- **`src/components/kol/KolFocusCard.tsx`**: In `StageProgressBar`, if a stage has a link in `kol.stageLinks`, render the label as a clickable `<a>` that opens the link in a new tab. Visual cue: underline + slightly different styling for linked stages.

### 5. Kanban Cards & PrePublishBoard (optional enhancement)
- If stage-specific info shows on kanban cards (Script, Project, Video), those labels could also be clickable. But keeping scope minimal — only the Focus card progress bar as requested.

## Files to Modify
1. **Database migration** — add `stage_links jsonb default '{}'` to `kols`
2. **`src/lib/mock-data.ts`** — add `stageLinks` to `KOL` interface
3. **`src/lib/kol-store.tsx`** — map `stage_links` in `dbToKol`, handle in `updateKolField`
4. **`src/components/agency/KolDetailPanel.tsx`** — add link inputs per stage
5. **`src/components/kol/KolFocusCard.tsx`** — make progress step labels clickable

## Verification
- Open Agency Portal → select a KOL → fill in link for "Idea" stage → save
- Go to Today's Focus → find that KOL → "Idea" label in progress bar should be clickable and open the link
- Stages without links remain plain text (not clickable)
