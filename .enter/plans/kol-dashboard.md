# Published Stage: Platform-specific Publication Links

## Context
When a KOL enters the `published` stage, the agency panel currently shows "Review Material Link" with a single "Publication Link" input. The user wants:
1. Section title changed to "Publication Link"
2. Each row: left = platform dropdown, right = URL input
3. Support adding more rows (+ button)

## Data Storage
Reuse the existing `stageLinks` JSONB field. Store publication links with keys like `pub_0`, `pub_1`, etc. Each value is `platform|url` (pipe-delimited) so we can parse both the platform and URL from a single string.

## Changes

### `src/components/agency/KolDetailPanel.tsx`
1. When `currentStage === 'published'`, render a separate **Publication Link** section instead of the generic Review Material Link section
2. The section renders a list of rows parsed from `stageLinks` entries that start with `pub_`
3. Each row: `Select` for platform (youtube/tiktok/instagram/x/facebook) on the left, `Input` for URL on the right
4. A "+" button to add a new empty row
5. A small trash/remove button per row (except if only 1 row remains)
6. On any change, serialize back to `stageLinks` and call `onUpdateField`
7. Remove `published` from `LINK_STAGES` so it no longer appears in the generic Review Material Link section
8. Import `Plus` and `Trash2` from lucide-react, reuse existing `PlatformIcon` for visual cues

### No database or type changes needed
The `stageLinks` JSONB field already supports arbitrary keys.

## Verification
- Set a KOL to `published` stage in agency portal
- See "Publication Link" section with platform selector + URL input
- Add multiple rows with different platforms
- Verify data persists after closing and reopening the panel
- Verify other stages still show their normal Review Material Link
