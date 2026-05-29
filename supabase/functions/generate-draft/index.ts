import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, targetKeyword, contentGaps } = await req.json() as {
      topic: string;
      targetKeyword?: string;
      contentGaps?: string[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!topic?.trim()) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gapContext = contentGaps?.length
      ? `\nAlso address these identified content gaps: ${contentGaps.slice(0, 3).join("; ")}`
      : "";

    const prompt = `Write a well-structured content section about: "${topic}"${targetKeyword ? ` for the keyword "${targetKeyword}"` : ""}.${gapContext}

Requirements:
- 200-300 words
- Use H2/H3 headings with markdown (## and ###)
- Include actionable, specific information
- Write in a conversational but authoritative tone
- Naturally include the topic keyword 2-3 times
- End with a transition sentence to encourage reading more
- Return ONLY the content section, no preambles

Write the section now:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const draft = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-draft error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Draft generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
