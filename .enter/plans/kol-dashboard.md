# CSV Import for Bulk KOL Addition

## Context
User wants to paste tab-separated CSV data (copied from spreadsheets) into the system to bulk-add KOLs. The CSV contains many columns, but only a few map to our KOL model. Unused columns should be discarded, and platform abbreviations (YT, TT, IG, X) should be auto-converted.

## CSV Column Mapping
Source columns → KOL fields:
- **Influencer Name** → `name`
- **Account link** → `profileUrl`
- **Category** → `contentDirection`
- **Platform** → `platforms[]` (auto-convert: YT→youtube, TT→tiktok, IG→instagram, X→x)
- **Agency Name** → match to existing `agencies` by name to get `agencyId`

All other columns (Type, Follower, Region, Price, Email, etc.) are ignored.

## Implementation

### 1. New Component: `CsvImportDialog`
**File**: `src/components/agency/CsvImportDialog.tsx`

- Dialog with a large textarea for pasting TSV/CSV data
- "Parse" button to process the pasted data
- After parsing, shows a preview table with columns: Name, Platform, Profile URL, Content Direction, Agency (matched)
- Rows with unmatched agency names are highlighted with a warning
- "Import All" button to bulk-add all valid rows via `addKol()`
- Shows success count after import

### 2. Add Import Button to All KOLs Page
**File**: `src/pages/AllKolsKanbanPage.tsx`

- Add an "Import CSV" button in the header toolbar (next to filters)
- Opens the `CsvImportDialog`

### 3. Reuse Existing
- `useKolStore().addKol()` for adding each KOL
- `useKolStore().agencies` for matching agency names
- Platform type from `mock-data.ts`

## Files to Modify
1. `src/components/agency/CsvImportDialog.tsx` — **new file**
2. `src/pages/AllKolsKanbanPage.tsx` — add Import button

## Verification
- Go to All KOLs page → click "Import CSV"
- Paste tab-separated data with header row
- Preview table shows only mapped fields
- Click "Import All" → KOLs appear in kanban board under correct agencies
