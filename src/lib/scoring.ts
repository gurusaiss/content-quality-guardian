import { AnalysisResults } from "@/types/analysis";

/**
 * Canonical overall score: average of the six core AI-derived scores
 * (SEO, SERP, AEO, Humanization, Differentiation, Engagement).
 * Missing dimensions are ignored so older audits stay comparable.
 */
export const getOverallScore = (r: AnalysisResults | null | undefined): number => {
  if (!r) return 0;
  const values = [
    r.seoScore?.score,
    r.serpScore?.score,
    r.aeoScore?.score,
    r.humanizationScore?.score,
    r.differentiationScore?.score,
    r.engagementScore?.score,
  ].filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

export const scoreTier = (score: number): "excellent" | "good" | "needsWork" => {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  return "needsWork";
};

export const scoreBadgeVariant = (
  score: number,
): "default" | "secondary" | "destructive" => {
  const tier = scoreTier(score);
  if (tier === "excellent") return "default";
  if (tier === "good") return "secondary";
  return "destructive";
};
