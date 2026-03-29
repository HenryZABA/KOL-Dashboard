# Fix: AI Chat Markdown Tables Not Rendering

## Context
AI chat outputs markdown tables (e.g. `| Column | Column |`) but they display as raw pipe-separated text instead of formatted HTML tables. This is because `react-markdown` does not support GFM (GitHub Flavored Markdown) table syntax by default.

## Approach
1. Install `remark-gfm` plugin
2. Add it to `<ReactMarkdown>` in `AiChatPanel.tsx`
3. Add table-specific prose styles for proper rendering (borders, padding, overflow-x for mobile)

## Files to modify
- `src/components/ai/AiChatPanel.tsx` — import and use `remark-gfm`, add table overflow wrapper and prose table styles

## Verification
- Send a message to the AI that triggers a table response (e.g. ask about prohibited expressions)
- Tables should render with proper borders, headers, and alignment
- Tables should be horizontally scrollable on mobile
