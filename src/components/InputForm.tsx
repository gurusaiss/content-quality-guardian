import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, FileText, Link, Target } from "lucide-react";
import { AnalysisResults } from "@/types/analysis";
import { getOverallScore } from "@/lib/scoring";

interface InputFormProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (results: AnalysisResults, auditId?: string) => void;
  isAnalyzing: boolean;
  prefillUrl?: string;
  prefillKeyword?: string;
}

export const InputForm = ({ onAnalysisStart, onAnalysisComplete, isAnalyzing, prefillUrl = "", prefillKeyword = "" }: InputFormProps) => {
  const [textContent, setTextContent] = useState("");
  const [urlInput, setUrlInput] = useState(prefillUrl);
  const [targetKeyword, setTargetKeyword] = useState(prefillKeyword);
  const { toast } = useToast();
  const { user } = useAuth();

  const analyzeContent = async (content: string, siteSignals?: any, sourceUrl?: string) => {
    try {
      onAnalysisStart();

      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: {
          content,
          targetKeyword: targetKeyword || undefined,
          siteSignals: siteSignals || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const results = data as AnalysisResults;
      let auditId: string | undefined;

      if (user) {
        const overall = getOverallScore(results);
        const { data: inserted } = await supabase.from("audits").insert({
          user_id: user.id,
          target_keyword: targetKeyword || null,
          content_preview: content.slice(0, 300),
          results: results as any,
          url: sourceUrl || null,
          seo_score: results.seoScore?.score ?? null,
          serp_score: results.serpScore?.score ?? null,
          aeo_score: results.aeoScore?.score ?? null,
          humanization_score: results.humanizationScore?.score ?? null,
          overall_score: overall,
        }).select("id").single();
        auditId = inserted?.id;
      }

      onAnalysisComplete(results, auditId);
      toast({ title: "Analysis Complete", description: "Your content has been analyzed with AI." });
    } catch (error: any) {
      console.error("Analysis error:", error);
      const msg = error?.message || "Failed to analyze content.";
      toast({
        title: "Analysis Failed",
        description: msg.includes("429") ? "Rate limit hit. Please wait a moment and try again." : msg,
        variant: "destructive",
      });
      onAnalysisComplete(null as any);
    }
  };

  const handleTextAnalysis = async () => {
    if (!textContent.trim()) {
      toast({ title: "No Content", description: "Please enter some content to analyze.", variant: "destructive" });
      return;
    }
    if (textContent.length > 25000) {
      toast({ title: "Content Too Long", description: "Please reduce your text to under 5000 words.", variant: "destructive" });
      return;
    }
    await analyzeContent(textContent, undefined, undefined);
  };

  const handleUrlAnalysis = async () => {
    if (!urlInput.trim()) {
      toast({ title: "No URL", description: "Please enter a URL to analyze.", variant: "destructive" });
      return;
    }
    // Auto-prefix https:// so bare domains don't fail URL validation
    const normalizedUrl = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
    try { new URL(normalizedUrl); } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL (e.g. https://example.com).", variant: "destructive" });
      return;
    }

    // onAnalysisStart is called inside analyzeContent — do NOT call it here too
    try {
      const { data: urlData, error: urlError } = await supabase.functions.invoke("fetch-url-content", {
        body: { url: normalizedUrl },
      });

      // Supabase wraps edge function errors — unwrap the real message
      const serverError = urlError?.message || urlData?.error;
      if (serverError) throw new Error(serverError);
      if (!urlData?.content) throw new Error("No readable text could be extracted from this page. Try pasting the content directly.");

      await analyzeContent(urlData.content, urlData.siteSignals, normalizedUrl);
    } catch (error: any) {
      console.error("URL fetch error:", error);
      // Pass through the specific error from the edge function — it already has a helpful message
      const msg = error?.message || "Could not retrieve content from the URL.";
      toast({ title: "Could Not Fetch URL", description: msg, variant: "destructive", duration: 7000 });
      // Reset analyzing state
      onAnalysisComplete(null as any);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <Card className="p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow duration-300">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">Analyze Your Content</h2>
          <p className="text-muted-foreground">
            AI-powered insights on SEO, SERP performance, AEO, humanization, and differentiation
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Target Keyword (Optional but recommended)"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-1">
            Enter a target keyword for more accurate SEO and SERP analysis
          </p>
        </div>

        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="gap-2"><FileText className="h-4 w-4" />Paste Text</TabsTrigger>
            <TabsTrigger value="url" className="gap-2"><Link className="h-4 w-4" />URL</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-6">
            <Textarea
              placeholder="Paste your content here..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[300px] resize-none"
              disabled={isAnalyzing}
            />
            <Button onClick={handleTextAnalysis} disabled={isAnalyzing} className="w-full" size="lg">
              {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI...</>) : "Analyze Text"}
            </Button>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Input type="url" placeholder="https://example.com/article" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} disabled={isAnalyzing} />
              <p className="text-xs text-muted-foreground">Some websites may block automated access.</p>
            </div>
            <Button onClick={handleUrlAnalysis} disabled={isAnalyzing} className="w-full" size="lg">
              {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching & Analyzing...</>) : "Analyze URL"}
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
