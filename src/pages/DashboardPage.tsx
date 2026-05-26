import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, ArrowUpRight, Plus, Trash2, TrendingUp, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore, scoreBadgeVariant } from "@/lib/scoring";

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

  const handleDelete = async (id: string) => {
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
              <div className="text-3xl font-bold">{audits.length}</div>
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
                  <BarChart3 className="h-3 w-3" /> Best performing audit
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audits</CardTitle>
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => {
                  const score = getAvgScore(audit.results);
                  return (
                    <TableRow key={audit.id}>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(audit.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
