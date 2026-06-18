import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, auditContext } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      auditContext?: {
        overallScore: number;
        targetKeyword?: string;
        seoScore: number;
        serpScore: number;
        aeoScore: number;
        humanizationScore: number;
        topIssues: string[];
        topRecommendations: string[];
      };
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const contextBlock = auditContext
      ? `You have access to the user's latest content audit results:
- Overall Score: ${auditContext.overallScore}/100
- Target Keyword: ${auditContext.targetKeyword || "not specified"}
- SEO Score: ${auditContext.seoScore}/100
- SERP Score: ${auditContext.serpScore}/100
- AEO Score: ${auditContext.aeoScore}/100
- Humanization Score: ${auditContext.humanizationScore}/100
- Top Issues: ${auditContext.topIssues.slice(0, 3).join("; ")}
- Top Recommendations: ${auditContext.topRecommendations.slice(0, 3).join("; ")}

Use this data to give specific, personalized advice. Reference actual scores and issues when relevant.`
      : "No audit has been run yet. Provide general SEO and content strategy advice.";

    const systemPrompt = `You are ContentIQ's AI assistant — an expert in SEO, content strategy, AEO (Answer Engine Optimization), readability, and content marketing. You are concise, actionable, and specific.

${contextBlock}

Rules:
1. Be direct and actionable — no fluff
2. Reference specific scores and issues from the audit when answering
3. Suggest concrete next steps the user can take right now
4. Keep responses under 150 words unless the user asks for detail
5. If asked about something outside content/SEO, redirect to your expertise`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          max_tokens: 400,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Chat failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
