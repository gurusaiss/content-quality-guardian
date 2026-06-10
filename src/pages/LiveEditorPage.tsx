import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore } from "@/lib/scoring";
import {
  PenLine, RefreshCw, Loader2, AlignLeft, Clock, Hash, Target,
  TrendingUp, Zap, BookOpen,
} from "lucide-react";

// ─── Flesch-Kincaid readability ──────────────────────────────────────────────
function fleschKincaid(text: string): { score: number; grade: string } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length || 1;
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  if (!words.length) return { score: 0, grade: "—" };

  const score = Math.round(
    206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length)
  );
  const clampedScore = Math.max(0, Math.min(100, score));

  const grade =
    clampedScore >= 90 ? "Very Easy (5th grade)" :
    clampedScore >= 80 ? "Easy (6th grade)" :
    clampedScore >= 70 ? "Fairly Easy (7th grade)" :
    clampedScore >= 60 ? "Standard (8-9th grade)" :
    clampedScore >= 50 ? "Fairly Difficult (10-12th grade)" :
    clampedScore >= 30 ? "Difficult (College)" :
    "Very Difficult (Professional)";

  return { score: clampedScore, grade };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  const matches = word.match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}

// ─── Keyword density ─────────────────────────────────────────────────────────
function keywordDensity(text: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const kw = keyword.toLowerCase();
  const count = words.filter(w => w.includes(kw) || kw.includes(w.replace(/[^a-z]/g, ""))).length;
  return parseFloat(((count / words.length) * 100).toFixed(2));
}

// ─── Reading time ─────────────────────────────────────────────────────────────
function readingTime(text: string): string {
  const wpm = 225;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / wpm));
  return mins === 1 ? "1 min read" : `${mins} min read`;
}

const SCORE_COLORS: Record<string, string> = {
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
  muted: "text-muted-foreground",
};

function scoreColor(score: number): string {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export const LiveEditorPage = () => {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<number>(0);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [auditId, setAuditId] = useState<string | undefined>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Live metrics (no API needed) ──────────────────────────────────────────
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;
  const density = keywordDensity(content, keyword);
  const readability = fleschKincaid(content);
  const timeToRead = readingTime(content);

  // Target: ~1500 words for a typical top-ranking post
  const TARGET_WORDS = 1500;
  const wordProgress = Math.min(100, Math.round((wordCount / TARGET_WORDS) * 100));
  const wordsNeeded = Math.max(0, TARGET_WORDS - wordCount);

  // Density ideal: 0.5% – 2%
  const densityStatus =
    !keyword ? "muted" :
    density >= 0.5 && density <= 2 ? "green" :
    density > 0 ? "yellow" : "red";

  // ── Debounced auto-score (every 30s if content changed) ───────────────────
  const scheduleScore = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (content.trim().length > 100 && Date.now() - lastAnalyzed > 25000) {
        runAnalysis(true);
      }
    }, 30000);
  }, [content, lastAnalyzed]);

  useEffect(() => {
    scheduleScore();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content, scheduleScore]);

  const runAnalysis = async (silent = false) => {
    if (!content.trim() || content.length < 50) {
      if (!silent) toast({ title: "Too short", description: "Write at least 50 characters first.", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: { content, targetKeyword: keyword || undefined },
      });
      if (error) throw error;
      setResults(data as AnalysisResults);
      setLastAnalyzed(Date.now());
      if (!silent) toast({ title: "Analysis complete", description: `Overall: ${getOverallScore(data)}/100` });
    } catch (err: any) {
      if (!silent) toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const overallScore = results ? getOverallScore(results) : null;

  return (
    <div className="container py-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <PenLine className="h-8 w-8 text-primary" />
          Live Content Editor
        </h1>
        <p className="text-muted-foreground mt-1">
          Write or paste content — get real-time metrics and run a full AI audit on demand.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Editor ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <Target className="h-3.5 w-3.5" /> Target Keyword
              </Label>
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. content marketing strategy"
              />
            </div>
            <Button
              onClick={() => runAnalysis(false)}
              disabled={analyzing || !content.trim()}
              className="gap-2"
            >
              {analyzing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
                : <><Zap className="h-4 w-4" /> Analyze Now</>
              }
            </Button>
          </div>

          <div className="relative">
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing or paste your content here…"
              className="min-h-[500px] resize-none font-mono text-sm leading-relaxed p-4 focus-visible:ring-1"
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
              {wordCount.toLocaleString()} words
            </div>
          </div>

          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Sending to AI for full analysis… (auto-scores every 30s of inactivity)
            </div>
          )}
        </div>

        {/* ── Live Metrics Sidebar ── */}
        <div className="space-y-4">
          {/* Overall score */}
          {overallScore !== null && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-primary">Last AI Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-extrabold ${SCORE_COLORS[scoreColor(overallScore)]}`}>
                  {overallScore}<span className="text-lg font-normal text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {results?.targetKeyword ? `For: "${results.targetKeyword}"` : "No keyword set"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Word count */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlignLeft className="h-4 w-4" /> Word Count
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{wordCount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">target: {TARGET_WORDS.toLocaleString()}</span>
              </div>
              <Progress value={wordProgress} className="h-2" />
              {wordsNeeded > 0 ? (
                <p className="text-xs text-muted-foreground">
                  +{wordsNeeded.toLocaleString()} words to match top-ranking content
                </p>
              ) : (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Meets target word count</p>
              )}
            </CardContent>
          </Card>

          {/* Reading time + chars */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Reading Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">{wordCount > 0 ? timeToRead : "—"}</div>
              <p className="text-xs text-muted-foreground">{charCount.toLocaleString()} characters</p>
            </CardContent>
          </Card>

          {/* Keyword density */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" /> Keyword Density
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {keyword ? (
                <>
                  <div className={`text-2xl font-bold ${SCORE_COLORS[densityStatus]}`}>
                    {density}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ideal: 0.5% – 2.0%
                  </p>
                  <div className="h-1.5 w-full bg-muted rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${
                        densityStatus === "green" ? "bg-green-500" :
                        densityStatus === "yellow" ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, (density / 3) * 100)}%` }}
                    />
                  </div>
                  <Badge variant="outline" className={`text-xs ${SCORE_COLORS[densityStatus]}`}>
                    {densityStatus === "green" ? "✓ Optimal" :
                     density === 0 ? "Keyword not found" :
                     density < 0.5 ? "Too low" : "Too high"}
                  </Badge>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Enter a keyword above to track density.</p>
              )}
            </CardContent>
          </Card>

          {/* Readability */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Readability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {wordCount >= 10 ? (
                <>
                  <div className={`text-2xl font-bold ${SCORE_COLORS[scoreColor(readability.score)]}`}>
                    {readability.score}
                  </div>
                  <p className="text-xs font-medium">{readability.grade}</p>
                  <p className="text-xs text-muted-foreground">Flesch Reading Ease (0-100)</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Write at least 10 words to calculate.</p>
              )}
            </CardContent>
          </Card>

          {/* AI score breakdown (if available) */}
          {results && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> AI Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "SEO",    score: results.seoScore?.score },
                  { label: "SERP",   score: results.serpScore?.score },
                  { label: "AEO",    score: results.aeoScore?.score },
                  { label: "Human",  score: results.humanizationScore?.score },
                ].map(({ label, score }) => score !== undefined && (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-muted-foreground">{label}</span>
                    <Progress value={score} className="flex-1 h-1.5" />
                    <span className={`w-10 text-right font-medium ${SCORE_COLORS[scoreColor(score)]}`}>{score}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Full AI results */}
      {results && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground font-medium">Full AI Audit Results</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <ResultsDashboard results={results} auditId={auditId} />
        </div>
      )}
    </div>
  );
};
