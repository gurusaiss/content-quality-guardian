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

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentAuditBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error("This website blocks automated access");
      }
      if (response.status === 404) {
        throw new Error("Page not found");
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract text content (simple HTML stripping)
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/si);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/si);

    // Strip HTML tags, scripts, styles
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

    // Limit content length
    if (content.length > 25000) {
      content = content.slice(0, 25000);
    }

    return new Response(JSON.stringify({
      content,
      meta: {
        title: titleMatch?.[1]?.trim() || "",
        description: descMatch?.[1]?.trim() || "",
      },
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
