import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Lightbulb, AlertCircle, Loader2, Copy, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GapAnalysisViewProps {
  missingTopics: string[];
  contentGaps: string[];
  targetKeyword?: string;
}

export const GapAnalysisView = ({ missingTopics, contentGaps, targetKeyword }: GapAnalysisViewProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ topic: string; content: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (topic: string) => {
    setGenerating(topic);
    try {
      const { data, error } = await supabase.functions.invoke("generate-draft", {
        body: { topic, targetKeyword, contentGaps: contentGaps.slice(0, 3) },
      });

      if (error) throw error;

      setDraft({ topic, content: data.draft });
    } catch {
      toast({
        title: "Generation Failed",
        description: "Could not generate draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const handleCopyDraft = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Draft Copied", description: "Content copied to clipboard." });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-full border-yellow-200 bg-yellow-50/30 dark:border-yellow-900/40 dark:bg-yellow-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <Lightbulb className="h-5 w-5" />
              Missing Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Competitors cover these topics. Adding them can improve your relevance and ranking.
            </p>
            <div className="space-y-3">
              {missingTopics.map((topic, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background border border-yellow-100 dark:border-yellow-900/30 rounded-lg group hover:border-yellow-300 transition-colors shadow-sm"
                >
                  <span className="font-medium text-sm">{topic}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 gap-1.5 dark:bg-yellow-950/30 dark:text-yellow-400"
                    onClick={() => handleGenerate(topic)}
                    disabled={generating === topic}
                  >
                    {generating === topic ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <PlusCircle className="h-3.5 w-3.5" />
                    )}
                    {generating === topic ? "Generating..." : "Draft"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Content Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Specific depth your content is missing compared to top-ranking competitors.
            </p>
            <ul className="space-y-3">
              {contentGaps.map((gap, index) => (
                <li
                  key={index}
                  className="flex gap-3 items-start p-3 bg-background border border-red-100 dark:border-red-900/30 rounded-lg shadow-sm"
                >
                  <div className="mt-0.5 min-w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-xs font-bold text-red-700 dark:text-red-400 shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{gap}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Draft: {draft?.topic}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {draft?.content}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDraft(null)}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button onClick={handleCopyDraft}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy Draft"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
