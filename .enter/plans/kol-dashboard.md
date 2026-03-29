# Plan: Knowledge Base Chunking

## Context
Currently the knowledge base stores documents as single records. Long documents waste tokens when loaded into AI context. We need to split documents into chunks for more precise keyword retrieval, and update the frontend to handle grouped display and cascading deletion.

## Changes

### 1. Database Migration
- Add `source_doc_id uuid` and `chunk_index int` columns to `knowledge_base`
- `source_doc_id` is nullable (NULL = legacy single doc or parent doc, non-NULL = chunk belonging to parent)
- Add DELETE RLS policy for authenticated users (currently only have SELECT + ALL for authenticated)

### 2. Edge Function: ai-chat (KB save path)
**File:** `supabase/functions/ai-chat-462b20ce438b/index.ts`
- When `saveToKb` is true, chunk the `fileContent`:
  1. Split by `\n\n` (double newline / paragraph breaks)
  2. If a paragraph > 800 chars, sub-split by sentence boundaries (。.！!？?\n)
  3. Merge consecutive small chunks (< 200 chars) to avoid fragments
  4. Insert parent doc (title, empty content, source_doc_id = own id)
  5. Insert each chunk with `source_doc_id` = parent id, `chunk_index` = sequential

### 3. Edge Function: ai-chat (KB retrieval)
- `searchKb()` already works at row level — chunks are individual rows, so keyword matching automatically works at chunk granularity
- Increase topN from 3 to 5 for chunk-level retrieval (chunks are smaller)

### 4. Frontend: KnowledgeBasePage
**File:** `src/pages/KnowledgeBasePage.tsx`
- Fetch entries, group by `source_doc_id` (or self id if null)
- Display parent docs in list, show chunk count badge (e.g. "6 chunks")
- Delete button: delete by `source_doc_id` (cascading) — `supabase.from('knowledge_base').delete().or('id.eq.{id},source_doc_id.eq.{id}')`
- AddEntryDialog: when content is long (> 800 chars), auto-chunk on save instead of saving as single record

### 5. Frontend: AddEntryDialog chunking
- Move chunking logic to a shared utility function
- On save: if content > 800 chars, chunk and insert parent + chunks
- If content <= 800 chars, insert as single record (backward compatible)

## Verification
1. Upload a long document (2000+ chars) → verify it's split into multiple chunks in DB
2. Search with relevant keywords → verify only matching chunks are loaded
3. Delete a chunked document → verify all chunks are removed
4. Upload a short document → verify it's stored as single record (no chunking)
5. Legacy documents (no source_doc_id) still display and work correctly
