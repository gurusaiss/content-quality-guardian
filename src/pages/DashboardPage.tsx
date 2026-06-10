import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, Plus, Trash2, TrendingUp, TrendingDown, BarChart3, Eye,
  Target, RefreshCw, Search, Globe, Minus, ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore, scoreBadgeVariant } from "@/lib/scoring";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResultsDashboard } from "@/components/ResultsDashboard";

interface AuditRow {
  id: string;
  created_at: string;
  target_keyword: string | null;
  content_preview: string | null;
  url: string | null;
  overall_score: number | null;
  seo_score: number | null;
  serp_score: number | null;
  aeo_score: number | null;
  results: AnalysisResults;
}

export const DashboardPage = () => {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAudit, setViewAudit] = useState<AuditRow | null>(null);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchAudits = async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("id, created_at, target_keyword, content_preview, url, overall_score, seo_score, serp_score, aeo_score, results")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Error", description: "Failed to load audits.", variant: "destructive" });
      } else {
        setAudits((data as unknown as AuditRow[]) || []);
      }
      setLoading(false);
    };
    fetchAudits();
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("audits").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete audit.", variant: "destructive" });
    } else {
      setAudits(prev => prev.filter(a => a.id !== id));
      toast({ title: "Deleted", description: "Audit removed." });
    }
  };

  const getScore = (a: AuditRow) => a.overall_score ?? getOverallScore(a.results);

  // Filtered by search
  const filtered = audits.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.target_keyword?.toLowerCase().includes(q) ||
      a.content_preview?.toLowerCase().includes(q) ||
      a.url?.toLowerCase().includes(q)
    );
  });

  // Stats
  const allScores = audits.map(getScore);
  const overallAvg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const topScore = allScores.length ? Math.max(...allScores) : 0;

  // Score trend: last 2 audits
  const trendDelta = audits.length >= 2 ? getScore(audits[0]) - getScore(audits[1]) : null;

  // Chart data — chronological, last 10
  const chartData = [...audits].reverse().slice(-10).map(a => ({
    date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Overall: getScore(a),
    SEO: a.seo_score ?? null,
    SERP: a.serp_score ?? null,
    keyword: a.target_keyword || "—",
  }));

  // Per-keyword best scores for trend text
  const keywordGroups: Record<string, AuditRow[]> = {};
  audits.forEach(a => {
    if (a.target_keyword) {
      if (!keywordGroups[a.target_keyword]) keywordGroups[a.target_keyword] = [];
      keywordGroups[a.target_keyword].push(a);
    }
  });
  const keywordTrends = Object.entries(keywordGroups)
    .filter(([, rows]) => rows.length >= 2)
    .map(([kw, rows]) => {
      const sorted = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const first = getScore(sorted[0]);
      const last = getScore(sorted[sorted.length - 1]);
      return { kw, first, last, delta: last - first };
    })
    .filter(t => t.delta !== 0)
    .slice(0, 3);

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your content audit history and performance over time.</p>
        </div>
        <Button onClick={() => navigate("/audit")} className="gap-2">
          <Plus className="h-4 w-4" /> New Audit
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Audits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{audits.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><BarChart3 className="h-3 w-3" /> content pieces</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Score</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{overallAvg}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> across all audits</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Score</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{topScore}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Target className="h-3 w-3" /> best performing</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Change</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : trendDelta !== null ? (
              <>
                <div className={`text-3xl font-bold flex items-center gap-1 ${trendDelta > 0 ? "text-green-600 dark:text-green-400" : trendDelta < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {trendDelta > 0 ? <TrendingUp className="h-6 w-6" /> : trendDelta < 0 ? <TrendingDown className="h-6 w-6" /> : <Minus className="h-6 w-6" />}
                  {trendDelta > 0 ? `+${trendDelta}` : trendDelta}
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs previous audit</p>
              </>
            ) : <p className="text-sm text-muted-foreground">Run 2+ audits to see trend</p>}
          </CardContent>
        </Card>
      </div>

      {/* Keyword score improvement callouts */}
      {keywordTrends.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {keywordTrends.map(t => (
            <div key={t.kw} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${t.delta > 0 ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900" : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900"}`}>
              {t.delta > 0 ? <TrendingUp className="h-4 w-4 text-green-600 shrink-0" /> : <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />}
              <span className="font-medium">"{t.kw}"</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={t.delta > 0 ? "text-green-700 dark:text-green-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
                {t.first} → {t.last} ({t.delta > 0 ? "+" : ""}{t.delta})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Score history chart */}
      {!loading && chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score History (last {Math.min(10, audits.length)} audits)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value, name, props) =>
                      name === "Overall" ? [`${value}/100`, `${name} — ${props.payload.keyword}`] : [`${value}/100`, name]
                    }
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Overall" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="SEO" stroke="#f97316" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" connectNulls />
                  <Line type="monotone" dataKey="SERP" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 2" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audits table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Audit History</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search keyword, URL…"
              className="pl-9 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
              {search ? (
                <p className="text-muted-foreground text-sm">No results for "{search}"</p>
              ) : (
                <>
                  <p className="text-muted-foreground">No audits yet. Run your first content audit!</p>
                  <Button onClick={() => navigate("/audit")} variant="outline">Run Audit</Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>SEO / SERP</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((audit) => {
                    const score = getScore(audit);
                    return (
                      <TableRow
                        key={audit.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setViewAudit(audit)}
                      >
                        <TableCell className="max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate text-sm">{audit.content_preview?.slice(0, 60) || "Untitled"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {audit.target_keyword || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[150px]">
                          {audit.url ? (
                            <span className="flex items-center gap-1 text-xs truncate">
                              <Globe className="h-3 w-3 shrink-0" />
                              {audit.url.replace(/^https?:\/\//, "").slice(0, 30)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(audit.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={scoreBadgeVariant(score)}>{score}/100</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {audit.seo_score !== null && audit.serp_score !== null
                            ? `${audit.seo_score} / ${audit.serp_score}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {audit.url && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Re-audit this URL"
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/audit?url=${encodeURIComponent(audit.url!)}&keyword=${encodeURIComponent(audit.target_keyword || "")}`);
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={e => { e.stopPropagation(); setViewAudit(audit); }}
                              title="View results"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={e => handleDelete(audit.id, e)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View audit modal */}
      <Dialog open={!!viewAudit} onOpenChange={open => !open && setViewAudit(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Audit Results
              {viewAudit?.target_keyword && <span className="text-primary">— {viewAudit.target_keyword}</span>}
              {viewAudit?.url && (
                <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                  <Globe className="h-3 w-3" />{viewAudit.url.replace(/^https?:\/\//, "").slice(0, 50)}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewAudit && <ResultsDashboard results={viewAudit.results} auditId={viewAudit.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
