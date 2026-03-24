# Restore Today's Focus Toggle for Non-Pre-publish Stages

## Context
The toggle was fully removed earlier, but it should only be hidden for `pre_publish` (auto-flagged) and `published` stages. Idea, Script/Project, and Video stages still need the manual toggle.

## Changes

### `src/components/agency/KolDetailPanel.tsx`
- Re-add `onToggleFocus` to props interface
- Re-add the Switch import
- Add back the "Flag for Today's Focus" toggle section, conditionally rendered when `currentStage` is NOT `pre_publish` and NOT `published`

### `src/pages/AgencyPortalPage.tsx`
- Re-add `toggleTodaysFocus` from `useKolStore` and pass as `onToggleFocus` prop to KolDetailPanel
