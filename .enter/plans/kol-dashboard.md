# Remove Flag Toggle from Agency Panel + Ensure Auto-flag

## Context
Pre-publish KOLs are auto-flagged already in `updateKolStage`. The "Flag for Today's Focus" toggle in the agency KolDetailPanel is no longer needed — agencies should not manually control this; it should be automatic when entering pre_publish.

## Changes

### `src/components/agency/KolDetailPanel.tsx`
- Remove the entire "Flag for Today's Focus" section (the Switch toggle, label, and surrounding Separator)
- Remove `onToggleFocus` from props interface since it's no longer used here

### `src/pages/AgencyPortalPage.tsx`
- Stop passing `onToggleFocus` prop to KolDetailPanel (clean up unused prop)

## Verification
- Open agency portal KOL detail panel — "Flag for Today's Focus" toggle should no longer appear
- Change a KOL's stage to Pre-publish Confirmation — it should auto-appear on the brand dashboard
