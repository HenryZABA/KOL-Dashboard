import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useKolStore } from '@/lib/kol-store';
import { AiChatPanel } from '@/components/ai/AiChatPanel';

export function AgencyAiChat() {
  const { token } = useParams<{ token: string }>();
  const { agencies } = useKolStore();

  const agency = useMemo(() => {
    if (!token) return undefined;
    return agencies.find((a) => a.token === token);
  }, [token, agencies]);

  if (!agency) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-73px)] text-sm text-muted-foreground">
        Loading AI Assistant...
      </div>
    );
  }

  return (
    <AiChatPanel
      saveToKb={true}
      agencyId={agency.id}
      emptyDescription="Ask me to review copy, check publication details, or answer questions about brand guidelines and KOL campaigns. You can also attach text files to build your agency knowledge base."
    />
  );
}
