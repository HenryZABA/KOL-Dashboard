
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_TOKEN = Deno.env.get("AI_API_TOKEN_462b20ce438b");
    if (!AI_API_TOKEN) {
      throw new Error("AI_API_TOKEN is not configured");
    }

    const { messages, model, saveToKb, fileName, fileContent } = await req.json();

    // Set up Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If saveToKb is true and there's file content, save it to knowledge base
    if (saveToKb && fileContent && fileName) {
      const title = fileName.replace(/\.[^/.]+$/, ""); // Remove extension for title
      const { error: insertError } = await supabase.from("knowledge_base").insert({
        title,
        content: fileContent,
        file_type: fileName.split(".").pop()?.toLowerCase() || "txt",
      });
      if (insertError) {
        console.error("Failed to save to knowledge base:", insertError);
      } else {
        console.log(`Saved "${title}" to knowledge base`);
      }
    }

    // Fetch knowledge base entries for system context
    const { data: kbEntries } = await supabase
      .from("knowledge_base")
      .select("title, content")
      .order("created_at");

    let systemPrompt = `You are a helpful AI assistant for a KOL (Key Opinion Leader) marketing campaign management system. You help staff review copy, check publication info, and answer questions about KOL campaigns and brand guidelines.

Always respond in the same language as the user's message. Be concise and professional.`;

    if (saveToKb && fileContent && fileName) {
      systemPrompt += `\n\nIMPORTANT: The user just uploaded a file named "${fileName}" and it has been automatically saved to the knowledge base. In your response, confirm that the document has been saved and provide a brief summary of the key points in the document.`;
    }

    if (kbEntries && kbEntries.length > 0) {
      const kbText = kbEntries
        .map((entry: { title: string; content: string }) => `## ${entry.title}\n${entry.content}`)
        .join("\n\n");
      systemPrompt += `\n\nBelow is the brand's knowledge base. Use this information to answer questions accurately:\n\n${kbText}`;
    }

    // Prepend system message
    const fullMessages = [
      { role: "user", content: systemPrompt },
      { role: "assistant", content: "Understood. I have the brand knowledge base loaded and will use it to assist you. How can I help?" },
      ...messages,
    ];

    const response = await fetch("https://api.enter.pro/code/api/v1/ai/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "anthropic/claude-sonnet-4.5",
        messages: fullMessages,
        stream: true,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = "AI service error";
      let errorCode = "api_error";

      const dataMatch = text.match(/data: (.+)/);
      if (dataMatch) {
        try {
          const errorData = JSON.parse(dataMatch[1]);
          errorMessage = errorData.error?.message || errorMessage;
          errorCode = errorData.error?.type || errorCode;
        } catch { /* use defaults */ }
      }

      const errorSSE = `event: error\ndata: ${JSON.stringify({
        type: "error",
        error: { type: errorCode, message: errorMessage }
      })}\n\n`;

      return new Response(errorSSE, {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const errorSSE = `event: error\ndata: ${JSON.stringify({
      type: "error",
      error: { type: "api_error", message: error.message }
    })}\n\n`;

    return new Response(errorSSE, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
    });
  }
});
