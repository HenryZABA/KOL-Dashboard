# Clickable Platform Icons on Published Kanban Cards

## Context
Published KOLs have publication links stored in `stageLinks` as `pub_N: "platform|url"`. The platform icons on their kanban cards should link to the corresponding publication URL when available.

## Changes

### `src/components/kol/PlatformIcon.tsx`
- Add a new `LinkedPlatformIcons` component that accepts `stageLinks` and renders each platform icon as a clickable `<a>` when a matching pub link exists (with hover effect), or as a plain icon otherwise.
- Parse `pub_*` entries from `stageLinks` to build a `platform -> url` map.

### `src/components/kol/KolKanbanCard.tsx`
- When `kol.currentStage === 'published'`, render `LinkedPlatformIcons` instead of `PlatformIcons`, passing `kol.stageLinks`.
