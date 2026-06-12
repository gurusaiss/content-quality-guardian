import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Hash, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Minus, Loader2, Globe, Target, AlertTriangle, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { getOverallScore } from "@/lib/scoring";

interface Keyword {
  id: string;
  keyword: string;
  url: string | null;
  target_position: number | null;
  alert_threshold: number | null;
  created_at: string;
}

interface HistoryPoint {
  id: string;
  keyword_id: string;
  overall_score: number | null;
  seo_score: number | null;
  density: number | null;
  checked_at: string;
}

interface KeywordWithHistory extends Keyword {
  history: HistoryPoint[];
  lastScore: number | null;
  prevScore: number | null;
  trend: "up" | "down" | "flat" | null;
}

export const KeywordsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [keywords, setKeywords] = useState<KeywordWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ keyword: "", url: "", target_position: "", alert_threshold: "60" });
  const [selectedKw, setSelectedKw] = useState<KeywordWithHistory | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: kws } = await supabase
      .from("keywords")
      .select("*")
      .order("created_at", { ascending: false });

    if (!kws?.length) { setKeywords([]); setLoading(false); return; }

    const { data: hist } = await supabase
      .from("keyword_history")
      .select("*")
      .in("keyword_id", kws.map(k => k.id))
      .order("checked_at", { ascending: true });

    const enriched: KeywordWithHistory[] = kws.map(kw => {
      const h = (hist || []).filter(h => h.keyword_id === kw.id);
      const last = h.at(-1)?.overall_score ?? null;
      const prev = h.at(-2)?.overall_score ?? null;
      const trend: "up" | "down" | "flat" | null =
        last !== null && prev !== null
          ? last > prev ? "up" : last < prev ? "down" : "flat"
          : null;
      return { ...kw, history: h, lastScore: last, prevScore: prev, trend };
    });

    setKeywords(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAdd = async () => {
    if (!user || !form.keyword.trim()) return;
    const { data, error } = await supabase.from("keywords").insert({
      user_id: user.id,
      keyword: form.keyword.trim(),
      url: form.url.trim() || null,
      target_position: form.target_position ? parseInt(form.target_position) : null,
      alert_threshold: form.alert_threshold ? parseInt(form.alert_threshold) : 60,
    }).select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDialogOpen(false);
    setForm({ keyword: "", url: "", target_position: "", alert_threshold: "60" });
    toast({ title: "Keyword added", description: `Tracking "${form.keyword}"` });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("keywords").delete().eq("id", id);
    setKeywords(prev => prev.filter(k => k.id !== id));
    if (selectedKw?.id === id) setSelectedKw(null);
    toast({ title: "Keyword removed" });
  };

  const handleCheck = async (kw: KeywordWithHistory) => {
    if (!kw.url) {
      toast({ title: "No URL", description: "Add a URL to this keyword to run a check.", variant: "destructive" });
      return;
    }
    setRunning(kw.id);
    try {
      // Fetch URL content
      const { data: urlData, error: urlErr } = await supabase.functions.invoke("fetch-url-content", {
        body: { url: kw.url },
      });
      if (urlErr || !urlData?.content) throw new Error("Failed to fetch URL");

      // Analyze
      const { data: analysis, error: analysisErr } = await supabase.functions.invoke("analyze-content", {
        body: { content: urlData.content, targetKeyword: kw.keyword, siteSignals: urlData.siteSignals },
      });
      if (analysisErr) throw analysisErr;

      const overall = getOverallScore(analysis);
      const seoScore = analysis.seoScore?.score ?? null;
      // Compute keyword density from metrics
      const density = analysis.seoScore?.metrics?.keywordDensity
        ? parseFloat(String(analysis.seoScore.metrics.keywordDensity))
        : null;

      // Save history point
      await supabase.from("keyword_history").insert({
        keyword_id: kw.id,
        overall_score: overall,
        seo_score: seoScore,
        density,
      });

      // Save full audit too
      if (user) {
        await supabase.from("audits").insert({
          user_id: user.id,
          target_keyword: kw.keyword,
          content_preview: urlData.content.slice(0, 300),
          results: analysis,
          url: kw.url,
          seo_score: seoScore,
          serp_score: analysis.serpScore?.score ?? null,
          aeo_score: analysis.aeoScore?.score ?? null,
          humanization_score: analysis.humanizationScore?.score ?? null,
          overall_score: overall,
        });
      }

      // Alert check
      if (kw.alert_threshold !== null && overall < kw.alert_threshold) {
        toast({
          title: `⚠️ Score Alert: "${kw.keyword}"`,
          description: `Score ${overall}/100 is below your threshold of ${kw.alert_threshold}.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Check complete", description: `"${kw.keyword}" scored ${overall}/100` });
      }

      fetchData();
    } catch (err: any) {
      toast({ title: "Check failed", description: err.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const chartData = (kw: KeywordWithHistory) =>
    kw.history.map(h => ({
      date: new Date(h.checked_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      overall: h.overall_score,
      seo: h.seo_score,
    }));

  const belowThreshold = keywords.filter(k => k.alert_threshold !== null && k.lastScore !== null && k.lastScore < k.alert_threshold);

  return (
    <div className="container py-8 space-y-8 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Hash className="h-8 w-8 text-primary" />
            Keyword Tracking
          </h1>
          <p className="text-muted-foreground mt-1">
            Track keyword score trends over time. Run checks to log snapshots.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Track Keyword</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Keyword to Track</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Keyword *</Label>
                <Input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))} placeholder="e.g. content marketing strategy" />
              </div>
              <div className="space-y-1.5">
                <Label>Page URL (for automated checks)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://yoursite.com/page" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target Position</Label>
                  <Input type="number" min={1} max={100} value={form.target_position} onChange={e => setForm(f => ({ ...f, target_position: e.target.value }))} placeholder="e.g. 3" />
                </div>
                <div className="space-y-1.5">
                  <Label>Alert Below Score</Label>
                  <Input type="number" min={0} max={100} value={form.alert_threshold} onChange={e => setForm(f => ({ ...f, alert_threshold: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleAdd} disabled={!form.keyword.trim()} className="w-full">
                Add Keyword
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert banner */}
      {belowThreshold.length > 0 && (
        <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-red-700 dark:text-red-400">Score alert: </span>
              {belowThreshold.map(k => `"${k.keyword}" (${k.lastScore}/100)`).join(", ")} below threshold.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Keywords Tracked", value: keywords.length, icon: Hash, sub: "active" },
          { label: "Avg Score", value: keywords.filter(k => k.lastScore !== null).length > 0
              ? Math.round(keywords.filter(k => k.lastScore !== null).reduce((s, k) => s + (k.lastScore ?? 0), 0) / keywords.filter(k => k.lastScore !== null).length)
              : "—", icon: BarChart3, sub: "across checked keywords" },
          { label: "Checks Run", value: keywords.reduce((s, k) => s + k.history.length, 0), icon: RefreshCw, sub: "total snapshots" },
        ].map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Icon className="h-3 w-3" />{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Keywords table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracked Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : keywords.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Hash className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No keywords yet. Add one to start tracking.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Last Score</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map(kw => (
                  <TableRow key={kw.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedKw(kw)}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">
                      {kw.url ? <span className="flex items-center gap-1"><Globe className="h-3 w-3 shrink-0" />{kw.url}</span> : "—"}
                    </TableCell>
                    <TableCell>
                      {kw.lastScore !== null ? (
                        <Badge variant={kw.lastScore >= 80 ? "default" : kw.lastScore >= 60 ? "secondary" : "destructive"}>
                          {kw.lastScore}/100
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">Not checked</span>}
                    </TableCell>
                    <TableCell>
                      {kw.trend === "up" && <span className="flex items-center gap-1 text-green-600 text-sm"><TrendingUp className="h-4 w-4" />+{(kw.lastScore ?? 0) - (kw.prevScore ?? 0)}</span>}
                      {kw.trend === "down" && <span className="flex items-center gap-1 text-red-500 text-sm"><TrendingDown className="h-4 w-4" />{(kw.lastScore ?? 0) - (kw.prevScore ?? 0)}</span>}
                      {kw.trend === "flat" && <span className="flex items-center gap-1 text-muted-foreground text-sm"><Minus className="h-4 w-4" />0</span>}
                      {kw.trend === null && <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{kw.alert_threshold ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="outline" size="sm"
                          disabled={running === kw.id || !kw.url}
                          onClick={e => { e.stopPropagation(); handleCheck(kw); }}
                          className="gap-1.5 h-8 text-xs"
                          title={!kw.url ? "Add a URL to run checks" : "Run check now"}
                        >
                          {running === kw.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Check
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={e => { e.stopPropagation(); handleDelete(kw.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Score trend chart for selected keyword */}
      {selectedKw && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Score History — <span className="text-primary">"{selectedKw.keyword}"</span>
            </CardTitle>
            <div className="flex gap-2">
              {selectedKw.url && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                  onClick={() => navigate(`/audit?url=${encodeURIComponent(selectedKw.url!)}&keyword=${encodeURIComponent(selectedKw.keyword)}`)}
                >
                  Re-audit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedKw(null)}>Close</Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedKw.history.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm space-y-2">
                <RefreshCw className="h-8 w-8 mx-auto opacity-40" />
                <p>No history yet. Run a check to log the first snapshot.</p>
                {selectedKw.url && (
                  <Button size="sm" onClick={() => handleCheck(selectedKw)} disabled={running === selectedKw.id} className="gap-1.5">
                    {running === selectedKw.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Run First Check
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData(selectedKw)} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} name="Overall" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="seo" stroke="#f97316" strokeWidth={1.5} name="SEO" dot={{ r: 3 }} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Improvement summary */}
                {selectedKw.history.length >= 2 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "First Score", value: `${selectedKw.history[0].overall_score}/100` },
                      { label: "Latest Score", value: `${selectedKw.lastScore}/100` },
                      { label: "Change", value: `${(selectedKw.lastScore ?? 0) - (selectedKw.history[0].overall_score ?? 0) >= 0 ? "+" : ""}${(selectedKw.lastScore ?? 0) - (selectedKw.history[0].overall_score ?? 0)}` },
                      { label: "Checks", value: String(selectedKw.history.length) },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
