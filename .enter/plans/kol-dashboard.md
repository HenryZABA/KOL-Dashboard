# AI Chat Refactoring Plan

## Context

AI chat has been broken through multiple patch attempts. The root cause is a complex SSE event parsing + re-forwarding pipeline in the edge function, combined with `fetchEventSource.onmessage` only receiving `event: message` type events. The current edge function buffers all upstream SSE, manually parses tool_use blocks, runs tools, then tries to re-emit events — too many failure points.

## Root Cause Analysis

1. **Edge Function**: Buffers ALL Claude SSE events, manually parses them, then re-serializes and re-emits. SSE line parsing (splitting by `\n`, tracking `currentEvent`) is fragile — any edge case (partial chunks, multi-line data) breaks it.
2. **Event type mismatch**: `fetchEventSource.onmessage` ONLY fires for `event: message` or events with no `event:` prefix. The edge function previously forwarded with original event names (`content_block_start`, etc.), which `onmessage` ignores.
3. **SSE parsing fragility**: The `content_block_stop` vs `content_block_start` state machine for tracking `currentBlock` (tool_use) can silently fail if events arrive in unexpected order.

## Approach: Simplify the Architecture

**Strategy**: Remove all SSE-level parsing from the edge function. Instead:

1. **Edge Function**: Call Claude API with `stream: false` (non-streaming). This returns a simple JSON response that's trivial to parse. Extract tool_use from the JSON, run tools, loop. Send the final result back as a single SSE stream with our own simple event format.
2. **Frontend**: Keep `fetchEventSource` but receive our own simplified event protocol — just `tool_start`, `tool_done`, `text_delta`, `done`, `error`.

This eliminates all Claude SSE parsing complexity from the edge function while keeping frontend streaming UX.

### Edge Function Protocol (our own, not Claude's)

All events use `event: message` so `onmessage` receives them:

```
data: {"type":"tool_start","name":"list_kols","input":{}}
data: {"type":"tool_done","name":"list_kols","summary":"Done"}
data: {"type":"text_delta","text":"Here are the KOLs..."}
data: {"type":"done"}
```

### Why `stream: false` on server side?

- Tool calling requires reading the FULL response anyway to detect tool_use blocks
- Current code already buffers the entire response — `stream: true` provides zero benefit server-side
- JSON parsing is 100% reliable vs hand-rolled SSE parsing
- Eliminates the most complex and bug-prone part of the codebase

### Trade-off

- Slightly longer initial wait (no thinking/text streaming during the Claude API call itself)
- But tool steps still stream in real-time to the frontend
- Final text response is sent as chunked `text_delta` events (simulated streaming) for good UX

## Files to Modify

### 1. `supabase/functions/ai-chat-462b20ce438b/index.ts` — Full rewrite

- Keep: tool implementations (listKols, getKolDetails, etc.), system prompt, KB loading, CORS
- Change: Use `stream: false` for Claude API calls
- Change: Parse JSON response instead of SSE
- Change: Emit our own simplified SSE events via `ReadableStream`
- Change: Chunk final text into `text_delta` events (e.g., 20 chars at a time) for streaming feel

### 2. `src/hooks/useAiChat.ts` — Simplify onmessage handler

- Remove `content_block_start`, `content_block_delta`, `content_block_stop`, `message_stop` handling
- Add `text_delta` handler: append text to assistant message
- Add `done` handler: set isStreaming = false  
- Keep: `tool_start`, `tool_done` handling (unchanged)
- Keep: error handling, abort, clearChat

### 3. `src/components/ai/AiChatPanel.tsx` — No changes needed

The component already handles all the state correctly.

## Verification

1. Send a simple message like "你好" — should see text response stream in
2. Send "列出所有KOL" — should see tool_start (list_kols), tool_done, then text response
3. Send a multi-turn conversation — history should work correctly
4. Clear chat and send again — should work
5. Check no console errors
