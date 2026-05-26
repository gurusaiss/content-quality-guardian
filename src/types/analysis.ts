export interface ScoreResult {
  score: number;
  issues: string[];
  recommendations: string[];
  metrics?: Record<string, string | number>;
  predictedRank?: string;
}

export interface SiteSignals {
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

export interface AnalysisResults {
  seoScore: ScoreResult;
  serpScore: ScoreResult;
  aeoScore: ScoreResult;
  humanizationScore: ScoreResult;
  engagementScore?: ScoreResult;
  targetKeyword?: string;
  siteSignals?: SiteSignals | null;
  serpAnalysis?: {
    competitors: { title: string; url: string; rank: number; score: number }[];
    comparison: {
      userWordCount: number;
      avgCompetitorWordCount: number;
      userKeywordDensity: number;
      avgCompetitorKeywordDensity: number;
    };
  };
  aiDetection?: {
    segments: { text: string; type: "ai" | "human" | "mixed"; score: number }[];
    overallAiScore: number;
    breakdown: { highAi: number; mixed: number; human: number };
  };
  gapAnalysis?: {
    missingTopics: string[];
    contentGaps: string[];
  };
  snippetOptimization?: {
    currentSnippet?: string;
    potentialSnippet: string;
  };
  topicClusters?: {
    clusterName: string;
    keywords: string[];
    relevance: number;
  }[];
  technicalAudit?: {
    score: number;
    issues: { severity: "critical" | "warning" | "info"; message: string }[];
    metrics: {
      mobileFriendly: boolean;
      loadSpeed: string;
      https: boolean;
      schemaDetected: boolean;
    };
  };
  accessibilityScore?: ScoreResult;
  readabilityScore?: ScoreResult;
  plagiarismScore?: {
    score: number;
    originality: number;
    reasoning?: string;
    matches: { source: string; similarity: number }[];
  };
  differentiationScore?: ScoreResult;
  timestamp: string;
}
