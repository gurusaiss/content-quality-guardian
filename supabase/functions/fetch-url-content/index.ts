import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const t0 = performance.now();
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentAuditBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const html = await response.text();
    const elapsedMs = Math.round(performance.now() - t0);

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error("This website blocks automated access");
      }
      if (response.status === 404) {
        throw new Error("Page not found");
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // Extract structured metadata directly from the HTML
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["']/i);
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const schemaScripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

    const headingCounts = {
      h1: (html.match(/<h1[\s>]/gi) || []).length,
      h2: (html.match(/<h2[\s>]/gi) || []).length,
      h3: (html.match(/<h3[\s>]/gi) || []).length,
    };
    const images = html.match(/<img\b[^>]*>/gi) || [];
    const imagesWithAlt = images.filter((tag) => /\balt\s*=/.test(tag)).length;
    const internalLinks: Set<string> = new Set();
    const externalLinks: Set<string> = new Set();
    const linkMatches = html.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    for (const a of linkMatches) {
      const href = a.match(/href=["']([^"']+)["']/i)?.[1];
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
      try {
        const u = new URL(href, parsedUrl);
        if (u.hostname === parsedUrl.hostname) internalLinks.add(u.toString());
        else externalLinks.add(u.toString());
      } catch { /* ignore */ }
    }

    // Strip HTML tags for text content
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (content.length < 50) {
      throw new Error("No meaningful content extracted from URL");
    }
    if (content.length > 25000) content = content.slice(0, 25000);

    const siteSignals = {
      url: parsedUrl.toString(),
      https: parsedUrl.protocol === "https:",
      responseTimeMs: elapsedMs,
      loadSpeed: elapsedMs < 600 ? "Fast" : elapsedMs < 1500 ? "Average" : "Slow",
      httpStatus: response.status,
      contentType: response.headers.get("content-type") || "",
      mobileFriendly: !!viewportMatch,
      schemaDetected: schemaScripts.length > 0,
      schemaCount: schemaScripts.length,
      canonical: canonicalMatch?.[1] || null,
      ogImage: ogImageMatch?.[1] || null,
      ogTitle: ogTitleMatch?.[1]?.trim() || null,
      headings: headingCounts,
      imageCount: images.length,
      imagesWithAlt,
      internalLinkCount: internalLinks.size,
      externalLinkCount: externalLinks.size,
      htmlSizeKb: Math.round(html.length / 1024),
    };

    return new Response(JSON.stringify({
      content,
      meta: {
        title: titleMatch?.[1]?.trim() || "",
        description: descMatch?.[1]?.trim() || "",
      },
      siteSignals,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-url-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Failed to fetch URL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
