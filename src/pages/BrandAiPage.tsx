import { AiChatPanel } from '@/components/ai/AiChatPanel';

export default function BrandAiPage() {
  return (
    <AiChatPanel
      saveToKb={true}
      heightClass="h-[calc(100vh-56px)]"
      emptyDescription="Chat with AI to review content, get insights, or ask questions. Upload documents to automatically save them to the Knowledge Base for agency reference."
    />
  );
}
