# Knowledge Base Keyword Search Optimization

## Context
AI chat edge function currently loads ALL knowledge_base records into the system prompt on every request. As KB grows, this wastes tokens and may exceed context limits. Optimize to keyword-based retrieval.

## Approach

### 1. Database: Add full-text search support
- Add a `tsv` (tsvector) column to `knowledge_base` for Chinese+English full-text search
- Create a GIN index on the `tsv` column
- Add a trigger to auto-populate `tsv` from `title || content` on insert/update
- Backfill existing rows

### 2. Edge Function: Keyword-based retrieval
In `ai-chat-462b20ce438b/index.ts`:
- Extract the user's latest message text
- Use PostgreSQL `websearch_to_tsquery` or `plainto_tsquery` to search `tsv`
- Also do a simple `ilike` fallback for CJK characters (tsquery doesn't handle Chinese well natively)
- Strategy: extract meaningful words from the last user message, search with `ilike '%keyword%'` on title+content
- Limit results to top 3 most relevant docs (by match count)
- If no matches found, fall back to latest 1 doc (lightweight default context)

### 3. Files to modify
- **Migration**: Add `tsv` column + GIN index + trigger (but given CJK limitations, we'll primarily use `ilike`)
- **`supabase/functions/ai-chat-462b20ce438b/index.ts`**: Replace full-table `select` with keyword search query

### 4. Search strategy (CJK-friendly)
Since PostgreSQL tsvector doesn't handle Chinese segmentation well without extensions:
- Split user's last message into character n-grams / words
- Use SQL `ilike` with `%keyword%` on `title` and `content` columns
- Score docs by number of keyword matches
- Return top 3 scoring docs
- Simpler and more reliable for mixed CJK/English content

## Verification
- Ask AI a question related to KB content → should return relevant answer
- Ask unrelated question → should not load all docs, only fallback
- Check edge function logs for query details
