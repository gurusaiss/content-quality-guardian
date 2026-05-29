import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keyword, audience, contentType, tone } = await req.json() as {
      keyword: string;
      audience?: string;
      contentType?: string;
      tone?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!keyword?.trim()) {
      return new Response(JSON.stringify({ error: "Keyword is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Create a comprehensive SEO content brief for the keyword: "${keyword}"
Target audience: ${audience || "general"}
Content type: ${contentType || "blog post"}
Tone: ${tone || "authoritative yet conversational"}

Return a JSON object with this exact structure:
{
  "title": "SEO-optimized H1 title",
  "metaDescription": "150-160 character meta description",
  "targetWordCount": number (recommended word count),
  "primaryKeyword": "${keyword}",
  "secondaryKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "outline": [
    { "heading": "H2 heading text", "type": "h2", "notes": "what to cover in this section", "wordCount": number },
    { "heading": "H3 subheading", "type": "h3", "notes": "what to cover", "wordCount": number }
  ],
  "competitorInsights": ["insight1", "insight2", "insight3"],
  "faqQuestions": ["question1?", "question2?", "question3?", "question4?"],
  "callToAction": "suggested CTA text",
  "internalLinkOpportunities": ["topic1", "topic2", "topic3"],
  "contentGoal": "what this piece should achieve",
  "searchIntent": "informational | transactional | navigational | commercial"
}

Return ONLY valid JSON, no markdown code blocks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";

    let brief;
    try {
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      brief = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify({ brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Brief generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
