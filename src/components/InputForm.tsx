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

interface InputFormProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (results: AnalysisResults) => void;
  isAnalyzing: boolean;
}

export const InputForm = ({ onAnalysisStart, onAnalysisComplete, isAnalyzing }: InputFormProps) => {
  const [textContent, setTextContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const analyzeContent = async (content: string, siteSignals?: any) => {
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

      if (user) {
        await supabase.from("audits").insert({
          user_id: user.id,
          target_keyword: targetKeyword || null,
          content_preview: content.slice(0, 300),
          results: results as any,
        });
      }

      onAnalysisComplete(results);
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
    await analyzeContent(textContent);
  };

  const handleUrlAnalysis = async () => {
    if (!urlInput.trim()) {
      toast({ title: "No URL", description: "Please enter a URL to analyze.", variant: "destructive" });
      return;
    }
    try { new URL(urlInput); } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive" });
      return;
    }

    try {
      onAnalysisStart();
      const { data: urlData, error: urlError } = await supabase.functions.invoke("fetch-url-content", {
        body: { url: urlInput },
      });
      if (urlError) throw urlError;
      if (!urlData?.content) throw new Error("No content extracted from URL");
      await analyzeContent(urlData.content, urlData.siteSignals);
    } catch (error: any) {
      console.error("URL fetch error:", error);
      let errorMessage = "Could not retrieve content from the URL.";
      if (error.message?.includes("blocks automated access")) {
        errorMessage = "This website blocks automated access. Please copy the text and paste it instead.";
      }
      toast({ title: "Failed to Fetch URL", description: errorMessage, variant: "destructive", duration: 5000 });
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
