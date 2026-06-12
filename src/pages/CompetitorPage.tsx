import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore, scoreBadgeVariant } from "@/lib/scoring";
import {
  Loader2, Plus, X, Target, TrendingUp, TrendingDown, Minus, Swords, Globe, AlertTriangle,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Legend, Tooltip,
} from "recharts";

interface SiteEntry {
  label: string;
  url: string;
  isYours: boolean;
}

interface AnalyzedSite {
  label: string;
  url: string;
  isYours: boolean;
  results: AnalysisResults;
  overallScore: number;
}

const DIMENSION_KEYS = [
  { key: "seoScore",           label: "SEO" },
  { key: "serpScore",          label: "SERP" },
  { key: "aeoScore",           label: "AEO" },
  { key: "humanizationScore",  label: "Human" },
  { key: "differentiationScore", label: "Diff" },
  { key: "engagementScore",    label: "Engage" },
  { key: "readabilityScore",   label: "Readability" },
  { key: "accessibilityScore", label: "Accessibility" },
] as const;

const COLORS = ["hsl(var(--primary))", "#f97316", "#22c55e", "#a855f7"];

export const CompetitorPage = () => {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [sites, setSites] = useState<SiteEntry[]>([
    { label: "Your Site", url: "", isYours: true },
    { label: "Competitor 1", url: "", isYours: false },
    { label: "Competitor 2", url: "", isYours: false },
  ]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedSite[]>([]);

  const addCompetitor = () => {
    if (sites.length >= 4) return;
    setSites([...sites, { label: `Competitor ${sites.length}`, url: "", isYours: false }]);
  };

  const removeSite = (idx: number) => {
    if (sites[idx].isYours) return;
    setSites(sites.filter((_, i) => i !== idx));
  };

  const updateUrl = (idx: number, url: string) => {
    setSites(sites.map((s, i) => i === idx ? { ...s, url } : s));
  };

  const handleAnalyze = async () => {
    const validSites = sites.filter(s => s.url.trim());
    if (validSites.length < 2) {
      toast({ title: "Need at least 2 URLs", description: "Enter your URL and at least one competitor URL.", variant: "destructive" });
      return;
    }
    for (const s of validSites) {
      const normalized = s.url.startsWith("http") ? s.url : `https://${s.url}`;
      try { new URL(normalized); } catch {
        toast({ title: "Invalid URL", description: `"${s.url}" is not a valid URL. Try https://example.com.`, variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    setAnalyzed([]);

    try {
      // Fetch all URLs in parallel
      const fetchResults = await Promise.allSettled(
        validSites.map(async (site) => {
          const siteUrl = site.url.startsWith("http") ? site.url : `https://${site.url}`;
          const { data: urlData, error: urlErr } = await supabase.functions.invoke("fetch-url-content", {
            body: { url: siteUrl },
          });
          if (urlErr) throw urlErr;
          if (!urlData?.content) throw new Error(`No content from ${site.url}`);
          return { site, content: urlData.content, siteSignals: urlData.siteSignals };
        })
      );

      // Analyze all content in parallel
      const analyzeResults = await Promise.allSettled(
        fetchResults.map(async (fetchResult, idx) => {
          if (fetchResult.status === "rejected") throw fetchResult.reason;
          const { site, content, siteSignals } = fetchResult.value;
          const { data, error } = await supabase.functions.invoke("analyze-content", {
            body: { content, targetKeyword: keyword || undefined, siteSignals },
          });
          if (error) throw error;
          return { site, results: data as AnalysisResults };
        })
      );

      const results: AnalyzedSite[] = [];
      analyzeResults.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          const { site, results: res } = r.value;
          results.push({ ...site, results: res, overallScore: getOverallScore(res) });
        } else {
          toast({ title: `Failed: ${validSites[idx].label}`, description: r.reason?.message || "Could not analyze", variant: "destructive" });
        }
      });

      setAnalyzed(results);
      toast({ title: "Analysis Complete", description: `Compared ${results.length} sites.` });
    } catch (err: any) {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const yourSite = analyzed.find(s => s.isYours);
  const competitors = analyzed.filter(s => !s.isYours);

  const getScore = (site: AnalyzedSite, key: string): number => {
    return (site.results as any)[key]?.score ?? 0;
  };

  const radarData = DIMENSION_KEYS.filter(d => analyzed.some(s => getScore(s, d.key) > 0))
    .map(d => {
      const point: Record<string, any> = { subject: d.label };
      analyzed.forEach(s => { point[s.label] = getScore(s, d.key); });
      return point;
    });

  const weaknesses = yourSite
    ? DIMENSION_KEYS.filter(d => {
        const yourScore = getScore(yourSite, d.key);
        if (yourScore === 0) return false;
        return competitors.some(c => getScore(c, d.key) > yourScore + 5);
      }).map(d => ({
        label: d.label,
        yourScore: getScore(yourSite, d.key),
        bestCompetitor: Math.max(...competitors.map(c => getScore(c, d.key))),
      }))
    : [];

  return (
    <div className="container py-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Swords className="h-8 w-8 text-primary" />
          Competitor Comparison
        </h1>
        <p className="text-muted-foreground mt-2">
          Analyze your content against competitors side-by-side across every dimension.
        </p>
      </div>

      {/* Input form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" /> Target Keyword (optional)
            </Label>
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="e.g. content marketing strategy"
              className="max-w-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sites.map((site, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={site.url}
                    onChange={e => updateUrl(idx, e.target.value)}
                    placeholder={`https://example.com/${site.isYours ? "your-page" : "competitor-page"}`}
                    className="pl-9"
                  />
                </div>
                <Badge variant={site.isYours ? "default" : "secondary"} className="shrink-0 text-xs">
                  {site.label}
                </Badge>
                {!site.isYours && (
                  <Button variant="ghost" size="icon" onClick={() => removeSite(idx)} className="shrink-0 h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            {sites.length < 4 && (
              <Button variant="outline" size="sm" onClick={addCompetitor} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add Competitor
              </Button>
            )}
            <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
              {loading ? "Analyzing…" : "Run Comparison"}
            </Button>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching & analyzing all URLs in parallel — this may take 30–60 seconds…
            </p>
          )}
        </CardContent>
      </Card>

      {analyzed.length >= 2 && (
        <>
          {/* Weakness alert */}
          {weaknesses.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" /> You are weaker than competitors on:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {weaknesses.map(w => (
                    <div key={w.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-sm">
                      <span className="font-medium text-orange-800 dark:text-orange-300">{w.label}</span>
                      <span className="text-orange-600 dark:text-orange-400 text-xs">
                        {w.yourScore} vs {w.bestCompetitor}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Radar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score Radar — All Sites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Legend />
                    {analyzed.map((site, i) => (
                      <Radar
                        key={site.label}
                        name={site.label}
                        dataKey={site.label}
                        stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={site.isYours ? 2.5 : 1.5}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Side-by-side table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dimension</TableHead>
                    {analyzed.map(s => (
                      <TableHead key={s.label} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>{s.label}</span>
                          <Badge variant={scoreBadgeVariant(s.overallScore)} className="text-xs">
                            {s.overallScore}/100
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DIMENSION_KEYS.map(d => {
                    const scores = analyzed.map(s => getScore(s, d.key));
                    const anyNonZero = scores.some(v => v > 0);
                    if (!anyNonZero) return null;
                    const maxScore = Math.max(...scores);
                    return (
                      <TableRow key={d.key}>
                        <TableCell className="font-medium">{d.label}</TableCell>
                        {analyzed.map((site, i) => {
                          const score = scores[i];
                          const isMax = score === maxScore && maxScore > 0;
                          const delta = yourSite && !site.isYours ? score - getScore(yourSite, d.key) : null;
                          return (
                            <TableCell key={site.label} className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`font-semibold ${isMax ? "text-green-600 dark:text-green-400" : ""}`}>
                                  {score}/100
                                </span>
                                {delta !== null && delta !== 0 && (
                                  <span className={`text-xs flex items-center gap-0.5 ${delta > 0 ? "text-red-500" : "text-green-500"}`}>
                                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                )}
                                {delta === 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" />tie</span>}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  {/* Word count row */}
                  {analyzed[0]?.results?.serpAnalysis?.comparison && (
                    <TableRow>
                      <TableCell className="font-medium">Word Count</TableCell>
                      {analyzed.map((site) => (
                        <TableCell key={site.label} className="text-center text-sm">
                          {site.results?.serpAnalysis?.comparison?.userWordCount ?? "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
