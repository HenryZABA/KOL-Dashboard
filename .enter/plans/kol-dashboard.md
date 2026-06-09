# Deploy External Enter Agent — Test Page

## Context
User wants to integrate an external Enter agent (ID `22f8279e-3481-414c-b595-84115ab6dd18`) via the `@ag-ui/client` SDK. The agent uses thread-based streaming.

## Status So Far (done)
- `@ag-ui/client@0.0.55` installed
- `src/hooks/useEnterAgent.ts` created — wraps thread creation + `HttpAgent` streaming
- `src/pages/AgentTestPage.tsx` created — minimal chat UI that dumps all streamed events

## Remaining Step: Register Route
File: `src/router.tsx`

Add:
```tsx
import AgentTestPage from './pages/AgentTestPage';
// ...
{ path: 'agent-test', element: <AgentTestPage /> },
```

Place under `/dashboard` children block (alongside `performance`, `inbox`, etc.).

## How User Tests
Navigate to `/dashboard/agent-test` → type message → watch event stream.

## Security Note
Current implementation hardcodes the API key in `useEnterAgent.ts` for fast testing. After verification works, **next step** is:
1. Store `ENTER_AGENT_API_KEY` as a Supabase secret
2. Move thread creation + agent streaming behind an edge function proxy
3. Frontend hits edge function instead of `api.enter.pro` directly

Edge function deployment is currently failing (backend issue) — will retry after verifying the SDK flow works.

## Verification
- Route renders
- "Send" creates thread → shows `thread_id`
- Events stream into the UI list (e.g. `RUN_STARTED`, `TEXT_MESSAGE_*`, `RUN_FINISHED`)
- Errors display in red banner
