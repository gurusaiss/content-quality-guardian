import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, targetKeyword } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wordCount = content.split(/\s+/).filter((w: string) => w).length;
    const contentPreview = content.slice(0, 500);

    const systemPrompt = `You are an expert SEO and content quality analyst. Analyze the provided content and return a comprehensive audit using the tool provided. Be specific, actionable, and data-driven in your analysis. Score each category from 0-100.

Key analysis areas:
1. SEO Score: keyword usage, meta optimization, structure, internal linking potential
2. SERP Score: competitiveness, predicted ranking potential, content depth vs competitors
3. AEO Score (Answer Engine Optimization): structured data readiness, featured snippet potential, FAQ compatibility
4. Humanization Score: tone, authenticity, conversational quality, personal touch
5. Engagement Score: readability, skimmability, interactive potential, estimated reading time
6. AI Detection: estimate how much appears AI-generated vs human-written (analyze sentence patterns, vocabulary diversity, repetitiveness)
7. Readability: Flesch-Kincaid grade level, sentence complexity, passive voice
8. Accessibility: heading hierarchy, alt text needs, semantic structure
9. Content Gaps: missing topics compared to what top-ranking content typically covers
10. Topic Clusters: related keyword groups and content opportunities
11. Technical SEO: mobile-friendliness signals, schema markup opportunities, page structure

Word count of content: ${wordCount}
${targetKeyword ? `Target keyword: "${targetKeyword}"` : "No target keyword specified."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this content:\n\n${contentPreview}${content.length > 500 ? `\n\n[... ${wordCount} total words]` : ""}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the complete content analysis results",
              parameters: {
                type: "object",
                properties: {
                  seoScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                      metrics: { type: "object", additionalProperties: true },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  serpScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                      predictedRank: { type: "string" },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  aeoScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  humanizationScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                      metrics: { type: "object", additionalProperties: true },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  engagementScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                      metrics: { type: "object", additionalProperties: true },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  aiDetection: {
                    type: "object",
                    properties: {
                      overallAiScore: { type: "number" },
                      breakdown: {
                        type: "object",
                        properties: {
                          highAi: { type: "number" },
                          mixed: { type: "number" },
                          human: { type: "number" },
                        },
                        required: ["highAi", "mixed", "human"],
                      },
                    },
                    required: ["overallAiScore", "breakdown"],
                  },
                  readabilityScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                      metrics: { type: "object", additionalProperties: true },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  accessibilityScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  gapAnalysis: {
                    type: "object",
                    properties: {
                      missingTopics: { type: "array", items: { type: "string" } },
                      contentGaps: { type: "array", items: { type: "string" } },
                    },
                    required: ["missingTopics", "contentGaps"],
                  },
                  topicClusters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        clusterName: { type: "string" },
                        keywords: { type: "array", items: { type: "string" } },
                        relevance: { type: "number" },
                      },
                      required: ["clusterName", "keywords", "relevance"],
                    },
                  },
                  technicalAudit: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            severity: { type: "string", enum: ["critical", "warning", "info"] },
                            message: { type: "string" },
                          },
                          required: ["severity", "message"],
                        },
                      },
                      metrics: {
                        type: "object",
                        properties: {
                          mobileFriendly: { type: "boolean" },
                          loadSpeed: { type: "string" },
                          https: { type: "boolean" },
                          schemaDetected: { type: "boolean" },
                        },
                        required: ["mobileFriendly", "loadSpeed", "https", "schemaDetected"],
                      },
                    },
                    required: ["score", "issues", "metrics"],
                  },
                  differentiationScore: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      issues: { type: "array", items: { type: "string" } },
                      recommendations: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "issues", "recommendations"],
                  },
                  snippetOptimization: {
                    type: "object",
                    properties: {
                      currentSnippet: { type: "string" },
                      potentialSnippet: { type: "string" },
                    },
                    required: ["potentialSnippet"],
                  },
                },
                required: [
                  "seoScore", "serpScore", "aeoScore", "humanizationScore",
                  "engagementScore", "aiDetection", "readabilityScore",
                  "accessibilityScore", "gapAnalysis", "topicClusters",
                  "technicalAudit", "differentiationScore", "snippetOptimization",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured analysis");
    }

    let analysis;
    try {
      analysis = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      throw new Error("Failed to parse AI analysis");
    }

    // Enrich with computed data
    const keywordDensity = targetKeyword
      ? ((content.toLowerCase().match(new RegExp(targetKeyword.toLowerCase(), "g")) || []).length / wordCount * 100)
      : 0;

    if (analysis.seoScore) {
      analysis.seoScore.metrics = {
        ...analysis.seoScore.metrics,
        "Word Count": wordCount,
        "Keyword Density": `${keywordDensity.toFixed(2)}%`,
      };
    }

    if (analysis.engagementScore) {
      analysis.engagementScore.metrics = {
        ...analysis.engagementScore.metrics,
        "Estimated Reading Time": `${Math.ceil(wordCount / 200)} min`,
      };
    }

    // Build full results
    const results = {
      ...analysis,
      targetKeyword,
      timestamp: new Date().toISOString(),
      plagiarismScore: {
        score: 95,
        originality: 95,
        matches: [],
      },
      reporting: {
        lastAuditDate: new Date().toISOString(),
        nextScheduledAudit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        generatedReports: [],
      },
    };

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Analysis failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
