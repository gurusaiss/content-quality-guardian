import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Plus, Trash2, TrendingUp, BarChart3, Eye, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore, scoreBadgeVariant } from "@/lib/scoring";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ResultsDashboard } from "@/components/ResultsDashboard";

interface AuditRow {
  id: string;
  created_at: string;
  target_keyword: string | null;
  content_preview: string | null;
  results: AnalysisResults;
}

export const DashboardPage = () => {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewAudit, setViewAudit] = useState<AuditRow | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchAudits = async () => {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch audits:", error);
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
      setAudits((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Deleted", description: "Audit removed." });
    }
  };

  const getAvgScore = (r: AnalysisResults) => getOverallScore(r);

  const overallAvg = audits.length
    ? Math.round(audits.reduce((sum, a) => sum + getAvgScore(a.results), 0) / audits.length)
    : 0;

  const topScore = audits.length
    ? Math.max(...audits.map((a) => getAvgScore(a.results)))
    : 0;

  const chartData = [...audits]
    .reverse()
    .slice(-10)
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: getAvgScore(a.results),
      keyword: a.target_keyword || "—",
    }));

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track your content audit history and performance.</p>
        </div>
        <Button onClick={() => navigate("/audit")} className="gap-2">
          <Plus className="h-4 w-4" /> New Audit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Content Score</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{overallAvg}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Across all audits
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Audits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{audits.length}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Content pieces analyzed
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Score</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-16" /> : (
              <>
                <div className="text-3xl font-bold">{topScore}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Best performing audit
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score History Chart */}
      {!loading && chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value, _, props) => [`${value}/100`, props.payload.keyword]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">No audits yet. Run your first content audit!</p>
              <Button onClick={() => navigate("/audit")} variant="outline">Run Audit</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => {
                  const score = getAvgScore(audit.results);
                  return (
                    <TableRow
                      key={audit.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setViewAudit(audit)}
                    >
                      <TableCell className="font-medium max-w-[250px] truncate">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{audit.content_preview || "Untitled"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {audit.target_keyword || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(audit.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={scoreBadgeVariant(score)}>
                          {score}/100
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setViewAudit(audit); }}
                            className="text-muted-foreground hover:text-primary"
                            title="View results"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(audit.id, e)}
                            className="text-muted-foreground hover:text-destructive"
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
          )}
        </CardContent>
      </Card>

      {/* View Audit Modal */}
      <Dialog open={!!viewAudit} onOpenChange={(open) => !open && setViewAudit(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Audit Results
              {viewAudit?.target_keyword && (
                <span className="text-primary ml-2">— {viewAudit.target_keyword}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewAudit && <ResultsDashboard results={viewAudit.results} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
