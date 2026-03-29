# Fix: Agency AI "load failed" error

## Context
Agency-side AI chat frequently shows "load failed" after sending messages. The edge function uses `stream: false` to call Claude (taking 5-15s), then streams results via SSE. The long initial wait can cause connection issues.

## Root Causes
1. **`fetchEventSource` `onerror` throws immediately** — this aborts with no retry. The library's default behavior is to retry, but `throw err` in `onerror` kills it. When the SSE connection drops or the initial response takes too long, the user sees "load failed".
2. **Possible `agencyId` being `undefined`** during initial render (agencies haven't loaded yet). This causes the edge function to run in brand mode (no agency filter), which isn't the user-visible error but is a data issue.

## Changes

### `src/hooks/useAiChat.ts`
- In `onerror`: Instead of throwing immediately, add a retry count. On first 1-2 failures, let `fetchEventSource` retry. On 3rd failure, throw to surface the error.
- Add a custom `openWhenHidden: true` option so tab switching doesn't kill the connection.
- Show a clearer error message: "Connection lost, please try again" instead of raw "load failed".

### `src/components/agency/AgencyAiChat.tsx`
- Guard the `sendMessage` call: if `agencyId` is still `undefined`, disable the send button or show a loading state.

## Verification
- Open agency portal, send a message to AI, confirm it responds without "load failed"
- Switch tabs during AI response, confirm it still completes
- Test with slow connection (throttle in dev tools)
