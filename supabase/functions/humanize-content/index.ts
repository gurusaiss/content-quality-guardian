import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, targetKeyword } = await req.json() as {
      text: string;
      targetKeyword?: string;
    };

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Rewrite the following text to sound more natural and human-written.
Keep the same meaning, length, and key information.${targetKeyword ? ` Naturally include the keyword "${targetKeyword}" if appropriate.` : ""}

Rules:
- Vary sentence structure and length
- Use contractions where natural (it's, you'll, we've)
- Add personal, direct tone
- Remove robotic phrases and overly formal language
- Do NOT add any explanations or preambles — return ONLY the rewritten text

Text to humanize:
${text}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const humanized = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(JSON.stringify({ humanized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("humanize-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Humanization failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
