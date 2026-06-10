import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Globe, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { AnalysisResults } from "@/types/analysis";

interface SerpPreviewToolProps {
  results: AnalysisResults;
}

const TITLE_LIMITS   = { min: 30, max: 60, cutoff: 580 }; // pixels, ~60 chars
const META_LIMITS    = { min: 120, max: 160 };
const URL_DISPLAY_MAX = 70;

const getCharStatus = (len: number, min: number, max: number) => {
  if (len === 0)       return { label: "Empty",       color: "text-muted-foreground", bg: "bg-muted" };
  if (len < min)       return { label: "Too short",   color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500" };
  if (len <= max)      return { label: "Good",        color: "text-green-600 dark:text-green-400", bg: "bg-green-500" };
  if (len <= max + 20) return { label: "Borderline",  color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500" };
  return               { label: "Too long",    color: "text-red-600 dark:text-red-400", bg: "bg-red-500" };
};

const CharCounter = ({ len, min, max }: { len: number; min: number; max: number }) => {
  const st = getCharStatus(len, min, max);
  const pct = Math.min(100, (len / (max + 20)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={st.color}>{st.label}</span>
        <span className="text-muted-foreground">{len} / {max} chars</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${st.bg} rounded-full transition-all duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const SerpPreviewTool = ({ results }: SerpPreviewToolProps) => {
  const [title, setTitle] = useState(results.seoScore?.metrics?.title as string || "");
  const [meta, setMeta] = useState(results.seoScore?.metrics?.metaDescription as string || "");
  const [url, setUrl] = useState(results.siteSignals?.url || "https://example.com/your-page");
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  const displayUrl = url.length > URL_DISPLAY_MAX ? url.slice(0, URL_DISPLAY_MAX) + "…" : url;
  const breadcrumb = (() => {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      const parts = [u.hostname, ...u.pathname.split("/").filter(Boolean)];
      return parts.join(" › ");
    } catch {
      return url;
    }
  })();

  const titleStatus = getCharStatus(title.length, TITLE_LIMITS.min, TITLE_LIMITS.max);
  const metaStatus  = getCharStatus(meta.length,  META_LIMITS.min,  META_LIMITS.max);

  const truncate = (str: string, max: number) =>
    str.length > max ? str.slice(0, max - 1) + "…" : str;

  const displayTitle = truncate(title || "Your Page Title Here", 60);
  const displayMeta  = truncate(meta  || "Your meta description will appear here. Make it compelling and between 120–160 characters to maximise click-through rate.", 160);

  const isDesktop = mode === "desktop";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serp-title" className="flex items-center justify-between">
              <span>Page Title (H1 / &lt;title&gt; tag)</span>
              {titleStatus.label !== "Empty" && (
                <Badge variant="outline" className={`text-xs ${titleStatus.color}`}>{titleStatus.label}</Badge>
              )}
            </Label>
            <Input
              id="serp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your page title…"
              maxLength={100}
            />
            <CharCounter len={title.length} min={TITLE_LIMITS.min} max={TITLE_LIMITS.max} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serp-meta" className="flex items-center justify-between">
              <span>Meta Description</span>
              {metaStatus.label !== "Empty" && (
                <Badge variant="outline" className={`text-xs ${metaStatus.color}`}>{metaStatus.label}</Badge>
              )}
            </Label>
            <Textarea
              id="serp-meta"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              placeholder="Enter your meta description…"
              className="min-h-[80px] resize-none"
              maxLength={220}
            />
            <CharCounter len={meta.length} min={META_LIMITS.min} max={META_LIMITS.max} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serp-url">Page URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="serp-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Optimisation Tips</h4>
          <div className="space-y-2">
            {[
              { icon: title.length >= TITLE_LIMITS.min && title.length <= TITLE_LIMITS.max ? CheckCircle2 : AlertCircle,
                color: title.length >= TITLE_LIMITS.min && title.length <= TITLE_LIMITS.max ? "text-green-500" : "text-yellow-500",
                text: "Title: 30–60 characters (fits Google's ~580px width)" },
              { icon: meta.length >= META_LIMITS.min && meta.length <= META_LIMITS.max ? CheckCircle2 : AlertCircle,
                color: meta.length >= META_LIMITS.min && meta.length <= META_LIMITS.max ? "text-green-500" : "text-yellow-500",
                text: "Meta: 120–160 characters for full display" },
              { icon: Info, color: "text-blue-500",
                text: "Include target keyword near the start of the title" },
              { icon: Info, color: "text-blue-500",
                text: "Meta should describe what the user will get, with a call to action" },
            ].map(({ icon: Icon, color, text }, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
                <span className="text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview toggle */}
      <div className="flex gap-2">
        <Button
          variant={isDesktop ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("desktop")}
          className="gap-2"
        >
          <Monitor className="h-4 w-4" /> Desktop
        </Button>
        <Button
          variant={!isDesktop ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("mobile")}
          className="gap-2"
        >
          <Smartphone className="h-4 w-4" /> Mobile
        </Button>
      </div>

      {/* SERP Preview Card */}
      <Card className="bg-white dark:bg-slate-950 border shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
            {isDesktop ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            Google Search Preview — {isDesktop ? "Desktop" : "Mobile"}
          </CardTitle>
        </CardHeader>
        <CardContent className={`pt-4 ${isDesktop ? "" : "max-w-sm mx-auto"}`}>
          {/* Google-style result */}
          <div className={`space-y-1 ${isDesktop ? "max-w-xl" : "max-w-full"}`}>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <Globe className="h-3 w-3 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{breadcrumb}</p>
              </div>
            </div>

            {/* Title */}
            <h3
              className={`font-medium leading-snug cursor-pointer hover:underline ${
                isDesktop ? "text-xl" : "text-lg"
              } text-[#1a0dab] dark:text-[#8ab4f8]`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {displayTitle}
            </h3>

            {/* Meta description */}
            <p
              className={`text-slate-600 dark:text-slate-400 leading-snug ${isDesktop ? "text-sm" : "text-xs"}`}
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {displayMeta}
            </p>
          </div>

          {/* Status indicators below preview */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Title", status: titleStatus, len: title.length, range: `${TITLE_LIMITS.min}–${TITLE_LIMITS.max}` },
              { label: "Meta",  status: metaStatus,  len: meta.length,  range: `${META_LIMITS.min}–${META_LIMITS.max}` },
              { label: "URL Length", status: { label: url.length < 75 ? "Good" : "Long", color: url.length < 75 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400", bg: "" }, len: url.length, range: "< 75" },
            ].map(({ label, status, len, range }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-muted/50 space-y-0.5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-bold">{len}</p>
                <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
                <p className="text-[10px] text-muted-foreground">ideal: {range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
