# Update Agency System Prompt with KB Upload Capability

## Context
Agency-side AI already supports file upload to knowledge base (via `saveToKb`), but the system prompt doesn't mention this capability, so the AI doesn't know it can guide users to upload documents.

## Change
**File**: `supabase/functions/ai-chat-462b20ce438b/index.ts`

Update the `agencyModeNote` string to include KB upload instructions:

```
const agencyModeNote = agencyId
  ? "\n\n## Agency Mode\nYou are operating in agency mode. You can ONLY access KOLs belonging to your agency. Do not attempt to access or discuss other agencies' KOLs. You also have your own knowledge base - documents uploaded by your agency are available to you alongside brand-level reference materials.\n\nUsers can upload documents to your agency's private knowledge base using the file upload button (paperclip icon) in the chat. Uploaded files are automatically chunked and indexed for keyword-based retrieval. You can remind users of this capability when relevant."
  : "";
```

## Verification
- Ask the agency AI "你有什么功能" or "我怎么上传资料" — it should mention知识库上传能力
