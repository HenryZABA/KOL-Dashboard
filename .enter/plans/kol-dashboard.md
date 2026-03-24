# AI Assistant Module for Agency Portal

## Context
Add an AI-powered assistant to the agency portal that helps agencies review copy, review publication info, and answer KOL/brand questions. The brand configures a knowledge base (text entries + file uploads) that automatically feeds into AI responses.

## Architecture Overview

### Database
- **`knowledge_base`** table: `id`, `title`, `content` (text), `file_url` (nullable), `file_type` (nullable), `created_at`
  - Text entries: title + content filled, file_url null
  - File entries: title + file_url filled, content stores extracted text or description
  - RLS: authenticated full access, anon read access

### Supabase Storage
- **`knowledge-files`** bucket: stores uploaded files (PDF, docs, etc.)
- Public read access for serving files

### Edge Function
- **`ai-chat`**: Receives messages array + agency token, fetches all knowledge_base entries as system context, calls AI text generation API, streams response back

### Frontend

#### Brand Dashboard (authenticated)
- New sidebar item: **"AI Knowledge Base"** (`/dashboard/knowledge-base`)
- Page: `KnowledgeBasePage.tsx` — List of entries with add/edit/delete
  - Add text entry: title + content textarea
  - Add file entry: title + file upload (stored in Supabase storage)
  - List view showing all entries with type indicator

#### Agency Portal (token-based)
- Convert single-page to tabbed layout with 2 tabs: **KOL Management** | **AI Assistant**
- New component: `AgencyAiChat.tsx` — Chat interface
  - Message list (user + assistant bubbles)
  - Text input + send button
  - Streams AI responses
  - Clean chat UI with proper scroll behavior

## Files to Create/Modify

### New Files
1. `src/pages/KnowledgeBasePage.tsx` — Brand knowledge base management
2. `src/components/agency/AgencyAiChat.tsx` — Agency AI chat interface

### Modified Files
1. `src/router.tsx` — Add `/dashboard/knowledge-base` route
2. `src/components/layout/AppSidebar.tsx` — Add Knowledge Base nav item
3. `src/pages/AgencyPortalPage.tsx` — Add tab navigation (KOLs | AI)

### Backend
1. Edge function: `ai-chat` — AI chat with knowledge base context
2. DB migration: `knowledge_base` table + storage bucket
3. Enable AI capability

## Implementation Steps
1. Enable AI capability
2. Load AI text-to-text skill for edge function template
3. Create `knowledge_base` table + storage bucket via migration
4. Build `KnowledgeBasePage` for brand dashboard
5. Deploy `ai-chat` edge function
6. Build `AgencyAiChat` component
7. Add tabs to `AgencyPortalPage`
8. Add route + sidebar nav for Knowledge Base

## Verification
- Brand: Add text entries and upload files to knowledge base
- Agency: Open AI tab, ask a question — AI responds using knowledge base context
- Verify streaming responses render correctly
- Verify file uploads work and entries persist
