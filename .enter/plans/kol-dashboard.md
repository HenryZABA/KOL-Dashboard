## Plan: Add Markdown Rendering to AI Chat

### Context
AI responses contain markdown (headings, bold, lists, code blocks) but the chat currently uses `whitespace-pre-wrap` which displays raw markdown text.

### Changes
1. Install `react-markdown` dependency
2. Update `MessageBubble` in `AiChatPanel.tsx` to render assistant content with `ReactMarkdown` instead of plain text
3. Add prose styling for proper markdown typography

### Files
- `src/components/ai/AiChatPanel.tsx` — Replace plain text with `<ReactMarkdown>` in assistant messages
