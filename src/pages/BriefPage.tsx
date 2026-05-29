import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, FileText, Target, Hash, List, MessageSquare,
  Link2, Lightbulb, Copy, Check, Download, Search,
} from "lucide-react";

interface Brief {
  title: string;
  metaDescription: string;
  targetWordCount: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  outline: { heading: string; type: string; notes: string; wordCount: number }[];
  competitorInsights: string[];
  faqQuestions: string[];
  callToAction: string;
  internalLinkOpportunities: string[];
  contentGoal: string;
  searchIntent: string;
}

export const BriefPage = () => {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [audience, setAudience] = useState("");
  const [contentType, setContentType] = useState("blog post");
  const [tone, setTone] = useState("authoritative");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setBrief(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-brief", {
        body: { keyword: keyword.trim(), audience, contentType, tone },
      });

      if (error) throw error;
      setBrief(data.brief);
      toast({ title: "Brief Generated!", description: `Content brief for "${keyword}" is ready.` });
    } catch (err) {
      toast({
        title: "Generation Failed",
        description: "Could not generate brief. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!brief) return;
    const text = `CONTENT BRIEF: ${brief.primaryKeyword}
${"=".repeat(50)}
Title: ${brief.title}
Meta: ${brief.metaDescription}
Word Count: ${brief.targetWordCount}
Search Intent: ${brief.searchIntent}
Content Goal: ${brief.contentGoal}

SECONDARY KEYWORDS:
${brief.secondaryKeywords.map((k) => `• ${k}`).join("\n")}

OUTLINE:
${brief.outline.map((o) => `${o.type === "h2" ? "##" : "###"} ${o.heading} (~${o.wordCount} words)\n   ${o.notes}`).join("\n")}

FAQ QUESTIONS:
${brief.faqQuestions.map((q) => `• ${q}`).join("\n")}

COMPETITOR INSIGHTS:
${brief.competitorInsights.map((c) => `• ${c}`).join("\n")}

CTA: ${brief.callToAction}

INTERNAL LINK OPPORTUNITIES:
${brief.internalLinkOpportunities.map((l) => `• ${l}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Brief copied to clipboard." });
  };

  const intentColors: Record<string, string> = {
    informational: "bg-blue-100 text-blue-800 border-blue-200",
    transactional: "bg-green-100 text-green-800 border-green-200",
    navigational: "bg-purple-100 text-purple-800 border-purple-200",
    commercial: "bg-orange-100 text-orange-800 border-orange-200",
  };

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Content Brief Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate a comprehensive SEO content brief with outline, keywords, and competitor insights — in seconds.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="keyword">Target Keyword *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="keyword"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g. content marketing strategy 2025"
                      className="pl-9"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading || !keyword.trim()} className="gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {loading ? "Generating..." : "Generate Brief"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. marketing managers, startup founders"
                />
              </div>

              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["blog post", "landing page", "pillar page", "listicle", "how-to guide", "comparison article", "case study"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["authoritative", "conversational", "professional", "casual", "educational", "persuasive"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm">Analyzing keyword intent and generating brief...</p>
        </div>
      )}

      {brief && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Content Brief</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy All"}
              </Button>
            </div>
          </div>

          {/* Header info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Recommended H1 Title</p>
                <p className="text-xl font-bold">{brief.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Meta Description</p>
                <p className="text-sm text-muted-foreground">{brief.metaDescription}</p>
                <p className="text-xs text-muted-foreground mt-1">{brief.metaDescription?.length || 0} characters</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">{brief.targetWordCount?.toLocaleString()} words</span>
                </div>
                <Badge className={`border ${intentColors[brief.searchIntent] || "bg-gray-100 text-gray-800"}`}>
                  {brief.searchIntent} intent
                </Badge>
                <div className="text-sm text-muted-foreground">{brief.contentGoal}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Secondary keywords */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" />
                  Secondary Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {brief.secondaryKeywords?.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitor insights */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Competitor Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {brief.competitorInsights?.map((insight, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-muted-foreground shrink-0">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Outline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4 text-primary" />
                Content Outline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {brief.outline?.map((section, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${section.type === "h2" ? "bg-muted/50 border-border" : "bg-background border-border/50 ml-4"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-muted-foreground mt-0.5 shrink-0">
                          {section.type.toUpperCase()}
                        </span>
                        <span className={`font-medium text-sm ${section.type === "h2" ? "text-foreground" : "text-foreground/80"}`}>
                          {section.heading}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">~{section.wordCount}w</Badge>
                    </div>
                    {section.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 ml-8">{section.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FAQ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  FAQ Questions to Answer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {brief.faqQuestions?.map((q, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="font-bold text-primary shrink-0">Q{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Internal links + CTA */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    Internal Link Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {brief.internalLinkOpportunities?.map((link, i) => (
                      <span key={i} className="px-2 py-1 text-xs rounded-md bg-muted border text-muted-foreground">{link}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-green-700 dark:text-green-400">Suggested CTA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{brief.callToAction}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
