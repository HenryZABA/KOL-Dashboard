# Fix CSV parser for clean single-row format

## Change
1. Clear DB data
2. Fix duplicate key overwrite bug (Category + Content Direction both → contentDirection, empty overwrites non-empty)
3. Add "status" header matching (already exists but verify)

## File
`src/components/agency/CsvImportDialog.tsx` — fix raw value building to preserve first non-empty value
