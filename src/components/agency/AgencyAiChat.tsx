import { AiChatPanel } from '@/components/ai/AiChatPanel';

export function AgencyAiChat() {
  return (
    <AiChatPanel
      saveToKb={false}
      emptyDescription="Ask me to review copy, check publication details, or answer questions about brand guidelines and KOL campaigns. You can also attach text files for analysis."
    />
  );
}
