import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle2, Circle, Clock, AlertTriangle, TrendingUp, Zap, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResults } from "@/types/analysis";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getOverallScore } from "@/lib/scoring";

interface ActionItem {
  id?: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  effortHours: number;
  category: string;
  status: "todo" | "in_progress" | "done";
}

interface ActionPlanTabProps {
  results: AnalysisResults;
  auditId?: string;
}

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800", icon: AlertTriangle, bar: "#ef4444" },
  high:     { label: "High",     color: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800", icon: TrendingUp, bar: "#f97316" },
  medium:   { label: "Medium",   color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800", icon: Zap, bar: "#eab308" },
  low:      { label: "Low",      color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800", icon: Circle, bar: "#3b82f6" },
};

export const ActionPlanTab = ({ results, auditId }: ActionPlanTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const chartData = [
    { subject: "SEO",    score: results.seoScore?.score ?? 0 },
    { subject: "SERP",   score: results.serpScore?.score ?? 0 },
    { subject: "AEO",    score: results.aeoScore?.score ?? 0 },
    { subject: "Human",  score: results.humanizationScore?.score ?? 0 },
    { subject: "Diff",   score: results.differentiationScore?.score ?? 0 },
    { subject: "Engage", score: results.engagementScore?.score ?? 0 },
  ].filter(d => d.score > 0);

  const getBarColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-action-plan", {
        body: { auditResults: results },
      });

      if (error) throw error;

      const rawItems: ActionItem[] = (data.actionItems || []).map((item: any) => ({
        ...item,
        status: "todo" as const,
        effortHours: item.effortHours ?? 1,
      }));

      setItems(rawItems);
      setGenerated(true);

      // Persist to Supabase if we have a user + auditId (delete old rows first to avoid duplicates on regenerate)
      if (user && auditId && rawItems.length > 0) {
        await supabase.from("action_items").delete().eq("audit_id", auditId);
        await supabase.from("action_items").insert(
          rawItems.map((item) => ({
            audit_id: auditId,
            user_id: user.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            effort_hours: item.effortHours,
            category: item.category,
            status: "todo",
          }))
        );
      }

      toast({ title: "Action Plan Generated!", description: `${rawItems.length} prioritized action items created.` });
    } catch (err: any) {
      toast({ title: "Generation Failed", description: err.message || "Could not generate action plan.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (index: number) => {
    const item = items[index];
    const newStatus: ActionItem["status"] =
      item.status === "todo" ? "in_progress" : item.status === "in_progress" ? "done" : "todo";

    const updated = items.map((it, i) => i === index ? { ...it, status: newStatus } : it);
    setItems(updated);

    if (item.id) {
      await supabase.from("action_items").update({ status: newStatus }).eq("id", item.id);
    }
  };

  const doneCount = items.filter(i => i.status === "done").length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const overallScore = getOverallScore(results);

  return (
    <div className="space-y-6">
      {/* Score Overview Bar Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Score Breakdown — Overall: <span className="text-primary font-bold">{overallScore}/100</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(v: number) => [`${v}/100`, "Score"]}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Generate CTA or Plan */}
      {!generated ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Generate Your AI Action Plan</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                AI analyzes all your scores and issues, then creates a prioritized to-do list with effort estimates — specific to YOUR content.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={loading} size="lg" className="gap-2 mt-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {loading ? "Analyzing your audit…" : "Generate Action Plan"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Progress header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1 mr-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{doneCount}/{items.length} items completed</span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5 shrink-0">
              <RotateCcw className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>

          {/* Priority groups */}
          {(["critical", "high", "medium", "low"] as const).map((priority) => {
            const group = items.filter(it => it.priority === priority);
            if (!group.length) return null;
            const cfg = PRIORITY_CONFIG[priority];
            const Icon = cfg.icon;
            return (
              <div key={priority} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <h4 className="font-semibold capitalize">{cfg.label} Priority</h4>
                  <Badge variant="outline" className={`text-xs ${cfg.color}`}>{group.length}</Badge>
                </div>
                {group.map((item, idx) => {
                  const globalIdx = items.indexOf(item);
                  return (
                    <Card
                      key={idx}
                      className={`transition-all ${item.status === "done" ? "opacity-60" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleStatusToggle(globalIdx)}
                            className="mt-0.5 shrink-0 transition-colors hover:text-primary"
                          >
                            {item.status === "done" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : item.status === "in_progress" ? (
                              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <p className={`font-medium text-sm leading-snug ${item.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                {item.title}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                                  {cfg.label}
                                </Badge>
                                {item.effortHours && (
                                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {item.effortHours}h
                                  </span>
                                )}
                                {item.category && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {item.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                            {item.status !== "done" && (
                              <button
                                onClick={() => handleStatusToggle(globalIdx)}
                                className="text-xs text-primary hover:underline mt-1"
                              >
                                {item.status === "todo" ? "→ Mark in progress" : "→ Mark done"}
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
