import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContentEditorProps {
  segments: {
    text: string;
    type: "ai" | "human" | "mixed";
    score: number;
  }[];
  overallScore: number;
  targetKeyword?: string;
}

export const ContentEditor = ({ segments, overallScore, targetKeyword }: ContentEditorProps) => {
  const { toast } = useToast();
  const [activeSegments, setActiveSegments] = useState(segments);
  const [humanizing, setHumanizing] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleHumanize = async (index: number) => {
    const segment = activeSegments[index];
    setHumanizing(index);

    try {
      const { data, error } = await supabase.functions.invoke("humanize-content", {
        body: { text: segment.text, targetKeyword },
      });

      if (error) throw error;

      const newSegments = [...activeSegments];
      newSegments[index] = {
        ...newSegments[index],
        type: "human",
        score: Math.floor(Math.random() * 10) + 5,
        text: data.humanized || segment.text,
      };
      setActiveSegments(newSegments);

      toast({
        title: "Segment Humanized",
        description: "The selected segment has been rewritten to sound more natural.",
      });
    } catch {
      toast({
        title: "Humanization Failed",
        description: "Could not rewrite this segment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setHumanizing(null);
    }
  };

  const handleHumanizeAll = async () => {
    const aiSegments = activeSegments
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.type !== "human");

    if (!aiSegments.length) {
      toast({ title: "Nothing to humanize", description: "All segments are already human-written." });
      return;
    }

    for (const { i } of aiSegments) {
      await handleHumanize(i);
    }
  };

  const handleCopyAll = () => {
    const fullText = activeSegments.map((s) => s.text).join(" ");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "All content copied to clipboard." });
  };

  const aiCount = activeSegments.filter((s) => s.type !== "human").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle>AI Content Detection</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Overall AI Probability:
              <Badge variant={overallScore > 70 ? "destructive" : overallScore > 40 ? "secondary" : "default"} className="text-base px-3">
                {overallScore}%
              </Badge>
            </div>
            {aiCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleHumanizeAll}
                disabled={humanizing !== null}
              >
                {humanizing !== null ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                Humanize All ({aiCount})
              </Button>
            )}
            <Button size="sm" variant="ghost" className="gap-2" onClick={handleCopyAll}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none leading-relaxed text-sm">
            {activeSegments.map((segment, index) => (
              <span
                key={index}
                className={`relative group inline cursor-default transition-colors duration-200 rounded px-0.5 py-0.5 ${
                  segment.type === "ai"
                    ? "bg-red-100 hover:bg-red-200 border-b-2 border-red-300 dark:bg-red-950/40 dark:border-red-700"
                    : segment.type === "mixed"
                    ? "bg-yellow-100 hover:bg-yellow-200 border-b-2 border-yellow-300 dark:bg-yellow-950/40 dark:border-yellow-700"
                    : ""
                }`}
              >
                {segment.text}{" "}
                {segment.type !== "human" && (
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-popover text-popover-foreground text-xs px-2 py-1.5 rounded-lg shadow-lg border items-center gap-2 z-20 whitespace-nowrap">
                    <span className="font-medium">{segment.score}% AI</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 hover:bg-accent"
                      disabled={humanizing === index}
                      onClick={() => handleHumanize(index)}
                    >
                      {humanizing === index ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3 mr-1" />
                          Humanize
                        </>
                      )}
                    </Button>
                  </span>
                )}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-6 text-sm text-muted-foreground justify-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-100 border-b-2 border-red-300 rounded-sm" />
          <span>High AI Probability</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 border-b-2 border-yellow-300 rounded-sm" />
          <span>Mixed / Uncertain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-transparent border border-dashed border-muted-foreground/50 rounded-sm" />
          <span>Human Written</span>
        </div>
      </div>
    </div>
  );
};
