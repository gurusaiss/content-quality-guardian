import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SiteSignals {
  url?: string;
  https?: boolean;
  responseTimeMs?: number;
  loadSpeed?: string;
  httpStatus?: number;
  mobileFriendly?: boolean;
  schemaDetected?: boolean;
  schemaCount?: number;
  canonical?: string | null;
  ogImage?: string | null;
  ogTitle?: string | null;
  headings?: { h1: number; h2: number; h3: number };
  imageCount?: number;
  imagesWithAlt?: number;
  internalLinkCount?: number;
  externalLinkCount?: number;
  htmlSizeKb?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, targetKeyword, siteSignals } = await req.json() as {
      content: string;
      targetKeyword?: string;
      siteSignals?: SiteSignals;
    };
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wordCount = content.split(/\s+/).filter((w: string) => w).length;
    const sentenceCount = (content.match(/[.!?]+(\s|$)/g) || []).length || 1;
    const avgSentenceLength = +(wordCount / sentenceCount).toFixed(1);
    // 5000 chars is enough for accurate scoring and cuts AI latency significantly
    const contentPreview = content.slice(0, 5000);

    const signalsSummary = siteSignals
      ? `\nReal observed site signals (use these — do not invent):
- URL: ${siteSignals.url}
- HTTPS: ${siteSignals.https}
- Response time: ${siteSignals.responseTimeMs}ms (${siteSignals.loadSpeed})
- Mobile viewport meta: ${siteSignals.mobileFriendly}
- Schema.org JSON-LD blocks detected: ${siteSignals.schemaCount}
- H1/H2/H3 counts: ${siteSignals.headings?.h1}/${siteSignals.headings?.h2}/${siteSignals.headings?.h3}
- Images: ${siteSignals.imageCount} (with alt: ${siteSignals.imagesWithAlt})
- Internal links: ${siteSignals.internalLinkCount}, external: ${siteSignals.externalLinkCount}
- Canonical tag present: ${!!siteSignals.canonical}
- OpenGraph image present: ${!!siteSignals.ogImage}
- HTML size: ${siteSignals.htmlSizeKb}kb`
      : "\nNo URL signals available — pasted text only. For technicalAudit, infer from content structure and set metrics based on what is verifiable from text.";

    const systemPrompt = `You are an expert SEO and content quality analyst. Analyze the provided content and return a comprehensive audit using the tool provided. Be specific, actionable, and data-driven. Score 0-100 (calibrate honestly — average content should score 50-70).

Reference observations:
- Word count: ${wordCount}
- Sentence count: ${sentenceCount}
- Average sentence length: ${avgSentenceLength} words
- Target keyword: ${targetKeyword ? `"${targetKeyword}"` : "none specified"}${signalsSummary}

Rules:
1. Every issue and recommendation MUST quote or reference specifics from the actual content above. Never use generic advice.
2. For aiDetection.segments, return 3-6 representative excerpts from the content with type and confidence (0-100).
3. For technicalAudit.metrics, copy the observed siteSignals verbatim when available (mobileFriendly, https, schemaDetected). For loadSpeed use the measured value.
4. For plagiarismScore, estimate originality 0-100 based on how distinctive the phrasing, examples, and angle are. Do not claim sources unless obvious.
5. snippetOptimization.currentSnippet must be a real verbatim sentence from the content (the one most likely to be pulled for a featured snippet). potentialSnippet must be a rewritten 40-60 word answer-engine-ready version.`;

    // 50s timeout — Gemini 2.5 Flash should respond in 10-25s; this prevents hanging
    const aiController = new AbortController();
    const aiTimer = setTimeout(() => aiController.abort(), 50000);

    let response: Response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        signal: aiController.signal,
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this content:\n\n${contentPreview}${content.length > 5000 ? `\n\n[... ${wordCount} total words — truncated for speed]` : ""}` },
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
                      segments: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string" },
                            type: { type: "string", enum: ["ai", "human", "mixed"] },
                            score: { type: "number" },
                          },
                          required: ["text", "type", "score"],
                        },
                      },
                    },
                    required: ["overallAiScore", "breakdown", "segments"],
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
                  plagiarismScore: {
                    type: "object",
                    properties: {
                      originality: { type: "number" },
                      reasoning: { type: "string" },
                    },
                    required: ["originality", "reasoning"],
                  },
                },
                required: [
                  "seoScore", "serpScore", "aeoScore", "humanizationScore",
                  "engagementScore", "aiDetection", "readabilityScore",
                  "accessibilityScore", "gapAnalysis", "topicClusters",
                  "technicalAudit", "differentiationScore", "snippetOptimization",
                  "plagiarismScore",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });
    } catch (fetchErr: unknown) {
      clearTimeout(aiTimer);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        return new Response(JSON.stringify({ error: "AI analysis timed out after 50s. Please try again." }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw fetchErr;
    } finally {
      clearTimeout(aiTimer);
    }

    if (!response!.ok) {
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
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured analysis");

    let analysis;
    try {
      analysis = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      throw new Error("Failed to parse AI analysis");
    }

    // Compute real metrics
    const keywordDensity = targetKeyword
      ? ((content.toLowerCase().match(new RegExp(targetKeyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length / wordCount * 100)
      : 0;

    if (analysis.seoScore) {
      analysis.seoScore.metrics = {
        ...analysis.seoScore.metrics,
        "Word Count": wordCount,
        "Keyword Density": targetKeyword ? `${keywordDensity.toFixed(2)}%` : "—",
        ...(siteSignals?.internalLinkCount !== undefined ? { "Internal Links": siteSignals.internalLinkCount } : {}),
        ...(siteSignals?.externalLinkCount !== undefined ? { "External Links": siteSignals.externalLinkCount } : {}),
      };
    }

    if (analysis.readabilityScore) {
      analysis.readabilityScore.metrics = {
        ...analysis.readabilityScore.metrics,
        "Avg Sentence Length": `${avgSentenceLength} words`,
        "Sentence Count": sentenceCount,
      };
    }

    if (analysis.engagementScore) {
      analysis.engagementScore.metrics = {
        ...analysis.engagementScore.metrics,
        "Estimated Reading Time": `${Math.ceil(wordCount / 200)} min`,
      };
    }

    // Override technicalAudit metrics with real observed signals when we have them
    if (analysis.technicalAudit && siteSignals) {
      analysis.technicalAudit.metrics = {
        mobileFriendly: !!siteSignals.mobileFriendly,
        loadSpeed: siteSignals.loadSpeed || analysis.technicalAudit.metrics?.loadSpeed || "Unknown",
        https: !!siteSignals.https,
        schemaDetected: !!siteSignals.schemaDetected,
      };
    }

    // Normalize plagiarism to legacy shape
    if (analysis.plagiarismScore) {
      analysis.plagiarismScore = {
        score: Math.round(analysis.plagiarismScore.originality ?? 0),
        originality: Math.round(analysis.plagiarismScore.originality ?? 0),
        reasoning: analysis.plagiarismScore.reasoning || "",
        matches: [],
      };
    }

    const results = {
      ...analysis,
      targetKeyword,
      siteSignals: siteSignals || null,
      timestamp: new Date().toISOString(),
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
