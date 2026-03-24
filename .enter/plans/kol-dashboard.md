# Move Dismiss X Button to Card Border Edge

## Context
The X dismiss button currently sits inside the card content area (next to platform icons). The user wants it positioned on the card's border/outline — a floating circular button at the top-right corner that overlaps the card edge.

## Approach
For both `KolFocusCard` and `PrePublishCard`:

1. Add `relative` + `group` class to the card wrapper `<div>`
2. Move the X `<button>` out of the header row and position it `absolute` at `-top-2 -right-2`
3. Style as a small circular button (`rounded-full`, `h-5 w-5`) with `bg-muted border` to look like it sits on the card outline
4. Show on hover only via `opacity-0 group-hover:opacity-100` for a cleaner look
5. Remove X button from the inner header flex row to restore original header layout (name + platform icons only)

## Files to Modify
- `src/components/kol/KolFocusCard.tsx` — move X button to absolute position on card border
- `src/components/kol/PrePublishBoard.tsx` — same treatment for PrePublishCard

## Verification
- Hover over a Focus card or Pre-publish card — X button appears on the top-right corner of the card border
- Click X — card is dismissed (unflagged from Today's Focus)
- Cards without `onDismiss` prop show no button
