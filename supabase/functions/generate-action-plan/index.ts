import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { auditResults } = await req.json() as { auditResults: any };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!auditResults) {
      return new Response(JSON.stringify({ error: "auditResults is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scores = {
      seo: auditResults.seoScore?.score ?? 0,
      serp: auditResults.serpScore?.score ?? 0,
      aeo: auditResults.aeoScore?.score ?? 0,
      humanization: auditResults.humanizationScore?.score ?? 0,
      differentiation: auditResults.differentiationScore?.score ?? 0,
      engagement: auditResults.engagementScore?.score ?? 0,
      readability: auditResults.readabilityScore?.score ?? 0,
      accessibility: auditResults.accessibilityScore?.score ?? 0,
    };

    const allIssues = [
      ...(auditResults.seoScore?.issues ?? []).map((i: string) => `[SEO] ${i}`),
      ...(auditResults.serpScore?.issues ?? []).map((i: string) => `[SERP] ${i}`),
      ...(auditResults.aeoScore?.issues ?? []).map((i: string) => `[AEO] ${i}`),
      ...(auditResults.humanizationScore?.issues ?? []).map((i: string) => `[Humanization] ${i}`),
      ...(auditResults.differentiationScore?.issues ?? []).map((i: string) => `[Differentiation] ${i}`),
      ...(auditResults.technicalAudit?.issues ?? []).map((i: { message: string }) => `[Technical] ${i.message}`),
      ...(auditResults.accessibilityScore?.issues ?? []).map((i: string) => `[Accessibility] ${i}`),
      ...(auditResults.readabilityScore?.issues ?? []).map((i: string) => `[Readability] ${i}`),
    ];

    const missingTopics = auditResults.gapAnalysis?.missingTopics?.slice(0, 5) ?? [];
    const targetKeyword = auditResults.targetKeyword || "not specified";

    const prompt = `You are a senior SEO and content strategist. Based on this content audit, generate a PRIORITIZED action plan.

AUDIT SCORES:
- SEO: ${scores.seo}/100
- SERP: ${scores.serp}/100
- AEO: ${scores.aeo}/100
- Humanization: ${scores.humanization}/100
- Differentiation: ${scores.differentiation}/100
- Engagement: ${scores.engagement}/100
- Readability: ${scores.readability}/100
- Accessibility: ${scores.accessibility}/100

TARGET KEYWORD: ${targetKeyword}

ALL ISSUES FOUND:
${allIssues.slice(0, 20).join("\n")}

MISSING TOPICS:
${missingTopics.join(", ")}

Generate exactly 10-14 action items. Return ONLY valid JSON in this exact format (no markdown):
{
  "actionItems": [
    {
      "title": "Short imperative title (max 60 chars)",
      "description": "1-2 sentences on exactly what to do and why it matters for ranking/engagement",
      "priority": "critical | high | medium | low",
      "effortHours": 0.5,
      "category": "seo | serp | aeo | technical | content | humanization | accessibility"
    }
  ]
}

Priority rules:
- critical: fixes scoring dimensions below 50 OR broken technical issues (no HTTPS, no schema on key pages)
- high: improvements with direct ranking impact (word count, internal links, meta tags)
- medium: engagement and readability improvements
- low: nice-to-have polish items

Order by priority (critical first). Be SPECIFIC — reference actual score numbers and real issues found.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";

    let parsed;
    try {
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-action-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Action plan generation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
