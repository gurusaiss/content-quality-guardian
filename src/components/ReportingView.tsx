import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, Download, History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore, scoreBadgeVariant } from "@/lib/scoring";
import { format, formatDistanceToNow } from "date-fns";

interface ReportingViewProps {
  currentResult: AnalysisResults;
}

interface AuditRow {
  id: string;
  created_at: string;
  target_keyword: string | null;
  content_preview: string | null;
  results: AnalysisResults;
}

export const ReportingView = ({ currentResult }: ReportingViewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("audits")
        .select("id, created_at, target_keyword, content_preview, results")
        .order("created_at", { ascending: false })
        .limit(10);
      setAudits((data as unknown as AuditRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const currentScore = getOverallScore(currentResult);
  const previousAudit = audits[1]; // index 0 is current/most recent
  const previousScore = previousAudit ? getOverallScore(previousAudit.results) : null;
  const delta = previousScore !== null ? currentScore - previousScore : null;
  const lastAuditDate = audits[0]?.created_at || currentResult.timestamp;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Audit Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Last Audit</div>
              <div className="font-medium">{format(new Date(lastAuditDate), "MMM d, yyyy")}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(lastAuditDate), { addSuffix: true })}
              </div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Score Change</div>
              {delta === null ? (
                <div className="font-medium flex items-center gap-1 text-muted-foreground">
                  <Minus className="h-4 w-4" /> No baseline
                </div>
              ) : delta > 0 ? (
                <div className="font-medium flex items-center gap-1 text-success">
                  <TrendingUp className="h-4 w-4" /> +{delta} pts
                </div>
              ) : delta < 0 ? (
                <div className="font-medium flex items-center gap-1 text-destructive">
                  <TrendingDown className="h-4 w-4" /> {delta} pts
                </div>
              ) : (
                <div className="font-medium flex items-center gap-1">
                  <Minus className="h-4 w-4" /> No change
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">vs previous audit</div>
            </div>
          </div>
          <Button className="w-full" onClick={() => navigate("/calendar")}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Next Audit
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
            View Full Dashboard
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Audit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : audits.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No previous audits yet. This will populate as you run more audits.
            </div>
          ) : (
            <div className="space-y-3">
              {audits.slice(0, 6).map((a) => {
                const s = getOverallScore(a.results);
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-8 w-8 text-muted-foreground bg-muted p-1.5 rounded shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {a.target_keyword || a.content_preview?.slice(0, 50) || "Untitled audit"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(a.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                    <Badge variant={scoreBadgeVariant(s)}>{s}/100</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
