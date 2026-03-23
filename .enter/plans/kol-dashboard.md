# CSV Import: Support Comma-Separated + Multi-Row KOLs

## Context
The real data is comma-separated (not tab-separated) with quoted fields containing commas. Some KOLs span multiple rows where sub-rows only have Account link + Platform (additional social accounts). Status labels are mixed Chinese+English like "视频修改中 Video under modification".

## Changes — `src/components/agency/CsvImportDialog.tsx`

### 1. Auto-detect delimiter (comma vs tab)
Check if first line contains tabs → TSV, otherwise → CSV with proper quoted-field parsing.

### 2. Proper CSV parser
Handle quoted fields with embedded commas, e.g. `"AI,Sci/Tech"` or `"$1,200"`.

### 3. Multi-row KOL merging
When a data row has no name but has an Account link + Platform, merge the platform into the previous KOL's platform list.

### 4. Fuzzy status matching
Strip everything after the Chinese text, or match partial substrings against STATUS_MAP keys.

### 5. Add FB platform
Add `fb` and `facebook` to PLATFORM_MAP.

## File
- `src/components/agency/CsvImportDialog.tsx` — all changes in this one file
