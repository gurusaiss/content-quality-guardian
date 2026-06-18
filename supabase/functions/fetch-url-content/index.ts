import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Realistic Chrome browser headers — avoids most bot-detection blocks
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

// Fallback: Googlebot headers (many sites whitelist it)
const GOOGLEBOT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

const FETCH_TIMEOUT_MS = 12000; // 12 seconds — fail fast instead of hanging

function isAntiBotPage(html: string): boolean {
  const lower = html.toLowerCase();
  // Cloudflare challenge, JS-only SPAs, CAPTCHA walls
  return (
    html.length < 3000 && (
      lower.includes("cf-ray") ||
      lower.includes("just a moment") ||
      lower.includes("enable javascript") ||
      lower.includes("checking your browser") ||
      lower.includes("ddos-guard") ||
      lower.includes("please wait") && lower.includes("redirecting") ||
      lower.includes("captcha") ||
      lower.includes("403 forbidden") ||
      lower.includes("access denied")
    )
  );
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers,
      redirect: "follow",
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

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
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Attempt 1: Chrome browser headers ────────────────────────────────────
    const t0 = performance.now();
    let response: Response;
    let html: string;
    let usedFallback = false;

    try {
      response = await fetchWithTimeout(parsedUrl.toString(), BROWSER_HEADERS);
      html = await response.text();

      // If the page looks like an anti-bot wall, retry with Googlebot
      if (isAntiBotPage(html) || response.status === 403) {
        throw new Error("anti-bot wall detected");
      }
    } catch (firstErr: unknown) {
      const isTimeout = firstErr instanceof Error && firstErr.name === "AbortError";
      if (isTimeout) {
        return new Response(
          JSON.stringify({ error: "The website took too long to respond (> 12s). Try a different URL or paste the content directly." }),
          { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ── Attempt 2: Googlebot headers ───────────────────────────────────────
      try {
        usedFallback = true;
        response = await fetchWithTimeout(parsedUrl.toString(), GOOGLEBOT_HEADERS);
        html = await response.text();
      } catch (secondErr: unknown) {
        const isTimeout2 = secondErr instanceof Error && secondErr.name === "AbortError";
        if (isTimeout2) {
          return new Response(
            JSON.stringify({ error: "The website took too long to respond. Paste the content directly instead." }),
            { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw secondErr;
      }
    }

    const elapsedMs = Math.round(performance.now() - t0);

    // Handle HTTP error statuses
    if (!response!.ok) {
      const status = response!.status;
      if (status === 403 || status === 401) {
        return new Response(
          JSON.stringify({ error: "This website blocks automated access. Copy the page text and paste it directly." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 404) {
        return new Response(
          JSON.stringify({ error: "Page not found (404). Check the URL and try again." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "The website is rate-limiting our request. Try again in a few seconds." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `The website returned an error (HTTP ${status}). Try pasting the content directly.` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for anti-bot on the fallback response too
    if (isAntiBotPage(html!)) {
      return new Response(
        JSON.stringify({ error: "This website uses JavaScript rendering or a bot-protection service (e.g. Cloudflare). Please copy the page text and paste it directly." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Extract metadata ──────────────────────────────────────────────────────
    const titleMatch = html!.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html!.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
      || html!.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const viewportMatch = html!.match(/<meta[^>]*name=["']viewport["']/i);
    const canonicalMatch = html!.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const ogTitleMatch = html!.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogImageMatch = html!.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const schemaScripts = html!.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

    const headingCounts = {
      h1: (html!.match(/<h1[\s>]/gi) || []).length,
      h2: (html!.match(/<h2[\s>]/gi) || []).length,
      h3: (html!.match(/<h3[\s>]/gi) || []).length,
    };
    const images = html!.match(/<img\b[^>]*>/gi) || [];
    const imagesWithAlt = images.filter((tag) => /\balt\s*=/.test(tag)).length;
    const internalLinks: Set<string> = new Set();
    const externalLinks: Set<string> = new Set();
    const linkMatches = html!.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    for (const a of linkMatches) {
      const href = a.match(/href=["']([^"']+)["']/i)?.[1];
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
      try {
        const u = new URL(href, parsedUrl);
        if (u.hostname === parsedUrl.hostname) internalLinks.add(u.toString());
        else externalLinks.add(u.toString());
      } catch { /* ignore */ }
    }

    // ── Strip HTML → plain text ───────────────────────────────────────────────
    let content = html!
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    if (content.length < 50) {
      return new Response(
        JSON.stringify({ error: "Could not extract readable text from this page. It may be JavaScript-rendered. Try pasting the content directly." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 20 000 chars to keep AI cost/latency reasonable
    if (content.length > 20000) content = content.slice(0, 20000);

    const siteSignals = {
      url: parsedUrl.toString(),
      https: parsedUrl.protocol === "https:",
      responseTimeMs: elapsedMs,
      loadSpeed: elapsedMs < 600 ? "Fast" : elapsedMs < 1500 ? "Average" : "Slow",
      httpStatus: response!.status,
      contentType: response!.headers.get("content-type") || "",
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
      htmlSizeKb: Math.round(html!.length / 1024),
      fetchedViaFallback: usedFallback,
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
    const msg = e instanceof Error ? e.message : "Failed to fetch URL";
    const isBlocked = msg.toLowerCase().includes("blocked") || msg.toLowerCase().includes("access");
    return new Response(JSON.stringify({
      error: isBlocked
        ? "This website blocks automated access. Please copy the text and paste it directly."
        : `Could not retrieve the page: ${msg}. Try pasting the content directly.`,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
