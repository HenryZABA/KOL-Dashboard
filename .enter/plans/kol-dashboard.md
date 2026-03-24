# Fix: Publication Links Open in Iframe

## Context
Clicking platform icons opens the URL inside the preview iframe, which gets blocked by YouTube's security policy. Need to use `window.open()` via onClick handler to force opening in a new browser tab.

## Change
### `src/components/kol/PlatformIcon.tsx`
- In `LinkedPlatformIcons`, change `<a>` tags to `<button>` with `onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}` to bypass iframe restrictions.
