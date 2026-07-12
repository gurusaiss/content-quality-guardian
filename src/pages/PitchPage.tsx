import { useEffect, useState } from "react";

// B2B pitch page — rendered as React route at /pitch for Lovable SPA compatibility
const TICKER_ITEMS = [
  { s: "96.55%", l: "of published pages get zero organic search traffic" },
  { s: "$74.6B", l: "SEO software market size in 2024" },
  { s: "1.74%", l: "of new pages reach Google top 10 within one year" },
  { s: "53.3%", l: "of all web traffic comes from organic search" },
  { s: "9×", l: "higher close rate for SEO leads vs. outbound" },
  { s: "$2K–$5K", l: "cost of a single freelance content audit" },
  { s: "748%", l: "average 3-year ROI on B2B SEO investment" },
  { s: "13.5%", l: "CAGR of the SEO software market to 2030" },
];

const DIMS = [
  { name: "SEO Score",       badge: "pw-bc", label: "Core",    desc: "Keyword density, heading structure, internal links, meta" },
  { name: "SERP Preview",    badge: "pw-bc", label: "Core",    desc: "Title length, meta description, predicted rank range" },
  { name: "AEO Score",       badge: "pw-ba", label: "AI",      desc: "Featured snippet and AI answer box eligibility" },
  { name: "Readability",     badge: "pw-bp", label: "Quality", desc: "Flesch-Kincaid, sentence length, structural clarity" },
  { name: "Humanization",    badge: "pw-ba", label: "AI",      desc: "AI-generated segment detection with rewrite suggestions" },
  { name: "Technical Audit", badge: "pw-bc", label: "Core",    desc: "HTTPS, mobile, schema.org, speed, canonical, OG tags" },
  { name: "Engagement",      badge: "pw-bp", label: "Quality", desc: "Reading time, hook strength, visual break frequency" },
  { name: "Gap Analysis",    badge: "pw-bp", label: "Quality", desc: "Missing subtopics vs. top-ranking competitor content" },
  { name: "Competitor Diff", badge: "pw-ba", label: "AI",      desc: "Radar chart vs. up to 4 competitor URLs" },
  { name: "Differentiation", badge: "pw-bp", label: "Quality", desc: "Originality score, unique angle, plagiarism proximity" },
];

const COMP_ROWS = [
  { label: "Monthly cost",         iq: "$29",            fr: "$2,000–$5,000 / cycle", ma: "$139 + time cost" },
  { label: "Time per audit",       iq: "< 30 seconds",   fr: "1–2 weeks",             ma: "8–10 hours" },
  { label: "Score dimensions",     iq: "10",             fr: "3–5 typical",            ma: "3–4" },
  { label: "AI action plan",       iq: "✦",              fr: "Manual writeup",         ma: "✗" },
  { label: "AEO / snippet scoring",iq: "✦",              fr: "✗",                      ma: "✗" },
  { label: "Competitor comparison",iq: "✦",              fr: "Extra cost",             ma: "✦" },
  { label: "Keyword tracking",     iq: "✦",              fr: "✗",                      ma: "Separate tool" },
  { label: "Content calendar",     iq: "✦",              fr: "✗",                      ma: "✗" },
];

const PLANS = [
  {
    name: "Free", price: "$0", period: "/month",
    desc: "For individuals exploring the platform",
    featured: false,
    features: ["5 audits per month", "All 10 score dimensions", "PDF and CSV export", "Content calendar", "AI detection scoring"],
  },
  {
    name: "Pro", price: "$29", period: "/month",
    desc: "For teams that publish regularly",
    featured: true,
    features: ["Unlimited audits", "Competitor comparison (4 URLs)", "Keyword tracking and alerts", "Live content editor", "AI action plan generator", "Audit history and trend charts", "Priority support"],
  },
  {
    name: "Agency", price: "$99", period: "/month",
    desc: "For agencies managing multiple clients",
    featured: false,
    features: ["Everything in Pro", "Team workspaces", "White-label reports", "API access", "Client management dashboard", "Dedicated support"],
  },
];

const SCORE_BARS = [
  { label: "SEO Score",    w: 86,  color: "#4F46E5", val: "66", vc: "#EEF1FF", y: 56 },
  { label: "AEO Score",    w: 110, color: "#22C55E", val: "85", vc: "#22C55E", y: 84 },
  { label: "Readability",  w: 92,  color: "#F59E0B", val: "71", vc: "#F59E0B", y: 112 },
  { label: "Humanization", w: 118, color: "#4F46E5", val: "91", vc: "#EEF1FF", y: 140 },
  { label: "Technical",    w: 96,  color: "#4F46E5", val: "74", vc: "#EEF1FF", y: 168 },
];

const ACTIONS = [
  { color: "rgba(239,68,68,.3)", bc: "rgba(239,68,68,.5)", text: "Add 3+ H2 subheadings", y: 217 },
  { color: "rgba(245,158,11,.3)", bc: "rgba(245,158,11,.5)", text: "Increase keyword density 0.8% to 1.5%", y: 233 },
  { color: "rgba(245,158,11,.3)", bc: "rgba(245,158,11,.5)", text: "Add FAQ schema for AEO snippet", y: 249 },
  { color: "rgba(79,70,229,.3)", bc: "rgba(79,70,229,.5)", text: "Competitor gap: add 2 missing topics", y: 265 },
];

export const PitchPage = () => {
  const [team, setTeam] = useState(5);
  const hrs = team * 4 * 3;
  const cost = hrs * 50;
  const save = cost - 29;
  const multiple = Math.round(save / 29);
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1).replace(".0", "")}K` : `$${n.toLocaleString()}`;

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
        }),
      { threshold: 0.08 }
    );
    document.querySelectorAll(".pw .up").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const company = params.get("c") || params.get("company");
    if (company) {
      const h1 = document.querySelector(".pitch-h1") as HTMLElement | null;
      if (h1) h1.innerHTML = `${company}'s content team<br>is paying for words<br>Google will <em>never</em> read.`;
    }
  }, []);

  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      <style>{css}</style>
      <div className="pw">

        {/* NAV */}
        <nav className="pw-nav">
          <div className="pw-logo"><div className="pw-dot" /><span>ContentIQ</span></div>
          <a href="https://seo-content-audit.lovable.app" target="_blank" rel="noopener" className="pw-btn">
            Open App
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </nav>

        {/* HERO */}
        <div className="pw-hero">
          <div className="pw-hero-content">
            <div className="pw-eyebrow pw-hero-ey up">✦ CONTENT INTELLIGENCE PLATFORM &nbsp;|&nbsp; GEMINI 2.0 FLASH</div>
            <h1 className="pw-h1 pitch-h1 up">
              Your content team<br />
              is paying for words<br />
              Google will <em>never</em> read.
            </h1>
            <p className="pw-sub up">
              96.55% of published pages receive zero organic search traffic. ContentIQ audits yours across 10 AI-powered dimensions — SEO, AEO, readability, competitor gaps, technical signals — and delivers a prioritized fix list in under 30 seconds.
            </p>
            <div className="pw-meta up">
              <div className="pw-mi"><strong>&lt;30s</strong><span>Per full audit</span></div>
              <div className="pw-mi"><strong>10</strong><span>Score dimensions</span></div>
              <div className="pw-mi"><strong className="pw-ac">$0</strong><span>To start</span></div>
            </div>
          </div>

          <div className="pw-hero-browser up">
            <div className="pw-browser">
              <div className="pw-bar">
                <div className="pw-dots">
                  <span className="pw-dr" /><span className="pw-dy" /><span className="pw-dg" />
                </div>
                <div className="pw-url">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1C6.5 1 7.8 1.9 8.4 3.1" stroke="#22C55E" strokeWidth="1.1" strokeLinecap="round" />
                    <rect x="1" y="3.5" width="8" height="5.5" rx="1" stroke="#3D4A66" strokeWidth="1" />
                  </svg>
                  seo-content-audit.lovable.app/audit
                </div>
                <div className="pw-live"><div className="pw-live-dot" />LIVE</div>
              </div>
              <div className="pw-browser-body">
                <svg viewBox="0 0 460 288" width="100%" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
                  <rect width="460" height="288" fill="#0A0F1E" />
                  <g>
                    <rect x="8" y="8" width="198" height="272" rx="4" fill="#0F1628" stroke="#1B2540" strokeWidth="1" />
                    <text x="22" y="32" fontFamily="'Courier New',monospace" fontSize="8" fill="#7A86A0" letterSpacing="1.4">✦ OVERALL SCORE</text>
                    <circle cx="107" cy="148" r="62" fill="none" stroke="#1B2540" strokeWidth="9" />
                    <circle cx="107" cy="148" r="62" fill="none" stroke="#4F46E5" strokeWidth="9" strokeDasharray="237 153" strokeDashoffset="98" strokeLinecap="round" />
                    <text x="107" y="155" textAnchor="middle" fontFamily="'Courier New',monospace" fontSize="38" fontWeight="700" fill="#EEF1FF">78</text>
                    <text x="107" y="171" textAnchor="middle" fontFamily="'Courier New',monospace" fontSize="9" fill="#7A86A0" letterSpacing="1">/ 100</text>
                    <rect x="72" y="188" width="70" height="17" rx="3" fill="rgba(245,158,11,.12)" stroke="rgba(245,158,11,.3)" strokeWidth="1" />
                    <text x="107" y="200" textAnchor="middle" fontFamily="'Courier New',monospace" fontSize="8" fill="#F59E0B" letterSpacing="1.5" fontWeight="700">NEEDS WORK</text>
                    <text x="22" y="236" fontFamily="'Courier New',monospace" fontSize="7.5" fill="#3D4A66">Analyzed 4 min ago</text>
                    <text x="22" y="250" fontFamily="'Courier New',monospace" fontSize="7" fill="#3D4A66">acme.com/blog/seo-guide-2024</text>
                    <text x="22" y="264" fontFamily="'Courier New',monospace" fontSize="7" fill="#4F46E5">keyword: &quot;seo best practices&quot;</text>
                  </g>
                  <g>
                    <rect x="218" y="8" width="234" height="272" rx="4" fill="#0F1628" stroke="#1B2540" strokeWidth="1" />
                    <text x="232" y="32" fontFamily="'Courier New',monospace" fontSize="8" fill="#7A86A0" letterSpacing="1.4">✦ DIMENSIONS</text>
                    {SCORE_BARS.map(({ label, w, color, val, vc, y }) => (
                      <g key={y}>
                        <text x="232" y={y} fontFamily="'Courier New',monospace" fontSize="9" fill="#EEF1FF" fontWeight="700">{label}</text>
                        <rect x="232" y={y + 4} width="130" height="3.5" rx="1.5" fill="#1B2540" />
                        <rect x="232" y={y + 4} width={w} height="3.5" rx="1.5" fill={color} />
                        <text x="396" y={y + 9} textAnchor="end" fontFamily="'Courier New',monospace" fontSize="9" fill={vc}>{val}</text>
                      </g>
                    ))}
                    <line x1="232" y1="192" x2="442" y2="192" stroke="#1B2540" strokeWidth="1" />
                    <text x="232" y="208" fontFamily="'Courier New',monospace" fontSize="8" fill="#7A86A0" letterSpacing="1.4">✦ TOP ACTIONS</text>
                    {ACTIONS.map(({ color, bc, text, y }) => (
                      <g key={y}>
                        <rect x="232" y={y} width="6" height="6" rx="1" fill={color} stroke={bc} strokeWidth="1" />
                        <text x="244" y={y + 7} fontFamily="'Courier New',monospace" fontSize="8.5" fill="#EEF1FF">{text}</text>
                      </g>
                    ))}
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* TICKER */}
        <div className="pw-ticker-wrap">
          <div className="pw-ticker">
            {tickerItems.map((item, i) => (
              <div key={i} className="pw-ti">
                <span className="pw-ts">{item.s}</span>
                <span className="pw-tl">{item.l}</span>
                <span className="pw-tp">|</span>
              </div>
            ))}
          </div>
        </div>

        {/* PAIN */}
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-eyebrow up">✦ THE PROBLEM &nbsp;|&nbsp; WHY MOST CONTENT FAILS</div>
            <div className="pw-split">
              <div className="pw-pl up">
                <p style={{ fontSize: "13px", color: "var(--pw-muted)", marginBottom: ".3rem" }}>Of all published web pages</p>
                <span className="pw-big">96.55%</span>
                <p style={{ fontSize: "1.15rem", fontWeight: 600, marginTop: ".6rem", lineHeight: 1.3 }}>receive zero organic<br />traffic from Google.</p>
                <p className="pw-src">Source: Ahrefs Content Explorer &nbsp;|&nbsp; 14B pages analyzed &nbsp;|&nbsp; Dec 2023</p>
              </div>
              <div className="pw-vline" />
              <div className="pw-pr up">
                <div className="pw-eyebrow">✦ THE MATH</div>
                <h2 className="pw-h2" style={{ margin: ".7rem 0 1rem" }}>Every team has a<br />ghost content problem.</h2>
                <p style={{ fontSize: "14px", color: "var(--pw-muted)", maxWidth: "400px", lineHeight: 1.65 }}>Your team writes, reviews, publishes, and promotes. Then 97 in 100 articles vanish from search entirely. It is not a writing problem. It is an audit problem.</p>
                <table className="pw-pt">
                  <tbody>
                    <tr><td>Articles published</td><td>1,000</td></tr>
                    <tr><td>Getting any organic traffic</td><td className="pw-bad">34</td></tr>
                    <tr><td>Budget wasted on invisible content</td><td className="pw-bad">96.6%</td></tr>
                    <tr><td>Avg freelance audit cost</td><td className="pw-bad">$2,000–$5,000</td></tr>
                    <tr><td>ContentIQ Pro monthly cost</td><td className="pw-ok">$29</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-eyebrow up">✦ HOW IT WORKS &nbsp;|&nbsp; FROM URL TO ACTION PLAN IN THREE STEPS</div>
            <div className="pw-steps">
              {[
                { n: "01", tag: "Input",    h: "Paste a URL or raw content",              p: "Drop in any published URL or raw text. ContentIQ fetches the live page and extracts technical signals — schema markup, mobile status, page speed, canonical tags — alongside the content itself." },
                { n: "02", tag: "Analysis", h: "Gemini 2.0 scores 10 dimensions",         p: "In under 30 seconds, the AI audits keyword density, AEO snippet eligibility, readability, AI-generated segment detection, competitor gaps, SERP preview, engagement, accessibility, and differentiation score." },
                { n: "03", tag: "Output",   h: "Prioritized action plan, ready to execute", p: "A ranked fix list by effort and impact — with specific rewrite suggestions, schema recommendations, and competitor gap details. Export as PDF, CSV, or image. Track score trends over time." },
              ].map(({ n, tag, h, p }) => (
                <div key={n} className="pw-step up">
                  <div className="pw-ghost">{n}</div>
                  <div className="pw-step-body">
                    <span className="pw-step-tag">{tag}</span>
                    <h3 className="pw-step-h">{h}</h3>
                    <p className="pw-step-p">{p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DIMENSIONS */}
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-eyebrow up">✦ SCORING ENGINE &nbsp;|&nbsp; 10 DIMENSIONS, ONE AUDIT</div>
            <div className="pw-dims-grid">
              <div className="up">
                <p className="pw-dims-head">Most tools score SEO.<br />ContentIQ scores everything <span className="pw-ac">that matters.</span></p>
                <p style={{ fontSize: "14px", color: "var(--pw-muted)", lineHeight: 1.7, maxWidth: "380px" }}>Every dimension is scored 0–100 with observations pulled directly from your content — no generic advice. Each issue references a specific sentence, heading, or element in your actual page.</p>
                <div className="pw-dims-stats">
                  {[{ l: "Turnaround", v: "< 30s" }, { l: "Scored per audit", v: "10 dims" }, { l: "Export formats", v: "PDF CSV IMG" }].map(({ l, v }) => (
                    <div key={l}><p className="pw-dsl">{l}</p><p className="pw-dsv">{v}</p></div>
                  ))}
                </div>
              </div>
              <div className="up" style={{ overflowX: "auto" }}>
                <table className="pw-dt">
                  <thead><tr><th>Dimension</th><th>Type</th><th>What it checks</th></tr></thead>
                  <tbody>
                    {DIMS.map((d) => (
                      <tr key={d.name}>
                        <td><span className="pw-dn">{d.name}</span></td>
                        <td><span className={`pw-db ${d.badge}`}>{d.label}</span></td>
                        <td style={{ color: "var(--pw-muted)", fontSize: "12px" }}>{d.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ROI */}
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-eyebrow up">✦ ROI CALCULATOR &nbsp;|&nbsp; YOUR NUMBERS</div>
            <div className="pw-split" style={{ marginTop: "2.5rem" }}>
              <div className="pw-pl up">
                <h2 className="pw-h2">What are manual audits<br />actually costing you?</h2>
                <p style={{ color: "var(--pw-muted)", fontSize: "14px", lineHeight: 1.65, maxWidth: "400px", margin: ".8rem 0 2rem" }}>A thorough manual content audit takes 3–8 hours per piece. ContentIQ does all of it in 28 seconds.</p>
                <div style={{ marginBottom: "1.5rem" }}>
                  <div className="pw-sl-lbl">
                    <span>Content writers on your team</span>
                    <strong>{team}</strong>
                  </div>
                  <input type="range" className="pw-range" min="1" max="50" value={team} onChange={(e) => setTeam(+e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                  <div><p className="pw-al">Assumptions</p><p style={{ fontSize: "13px", color: "var(--pw-muted)", lineHeight: 1.6 }}>4 audits per writer per month<br />3 hours each at $50 per hour</p></div>
                  <div><p className="pw-al">ContentIQ Pro</p><p style={{ fontSize: "13px", color: "var(--pw-muted)", lineHeight: 1.6 }}>$29 per month<br />Unlimited audits</p></div>
                </div>
              </div>
              <div className="pw-vline" />
              <div className="pw-pr up">
                <div className="pw-roi-rows">
                  {[
                    { l: "Manual audit hours per month", v: `${hrs} hrs`,  cls: "" },
                    { l: "Cost of those hours",          v: fmt(cost),     cls: "pw-roi-bad" },
                    { l: "ContentIQ Pro plan",           v: "$29",         cls: "pw-roi-ac" },
                    { l: "Monthly savings",              v: fmt(save),     cls: "pw-roi-good" },
                    { l: "Annual ROI multiple",          v: `${multiple}×`, cls: "pw-roi-good" },
                  ].map(({ l, v, cls }) => (
                    <div key={l} className={`pw-roi-row ${cls}`}>
                      <span className="pw-rl">{l}</span>
                      <span className="pw-rv">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-eyebrow up">✦ COMPARISON &nbsp;|&nbsp; THREE OPTIONS, ONE CLEAR ANSWER</div>
            <p className="pw-comp-head up">Three ways to audit your content.</p>
            <div style={{ overflowX: "auto" }} className="up">
              <table className="pw-ct">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}></th>
                    <th className="pw-ct-iq-h">ContentIQ Pro</th>
                    <th>Freelance Auditor</th>
                    <th>Manual + Semrush</th>
                  </tr>
                </thead>
                <tbody>
                  {COMP_ROWS.map(({ label, iq, fr, ma }) => {
                    const iqClass = iq === "✦" ? "pw-chk" : iq === "✗" ? "pw-crs" : iq === "$29" ? "pw-ac pw-mono" : "pw-ac";
                    const frClass = fr === "✗" ? "pw-crs" : fr === "✦" ? "pw-chk" : fr.startsWith("$2") ? "pw-danger" : "";
                    const maClass = ma === "✗" ? "pw-crs" : ma === "✦" ? "pw-chk" : "";
                    return (
                      <tr key={label}>
                        <td>{label}</td>
                        <td className="pw-ct-iq-c"><span className={iqClass}>{iq}</span></td>
                        <td><span className={frClass}>{fr}</span></td>
                        <td><span className={maClass}>{ma}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="pw-section">
          <div className="pw-wrap">
            <div className="pw-eyebrow up">✦ PRICING &nbsp;|&nbsp; START FREE, SCALE WHEN READY</div>
            <p className="up pw-pricing-head">Every plan includes the full scoring engine.</p>
            <div className="pw-ptiers">
              {PLANS.map(({ name, price, period, desc, featured, features }) => (
                <div key={name} className={`pw-ptier up${featured ? " pw-feat" : ""}`}>
                  {featured && <div className="pw-pop">Most Popular</div>}
                  <div className={`pw-tname${featured ? " pw-ac" : ""}`}>{name}</div>
                  <div className="pw-tprice">
                    <strong className={featured ? "pw-ac" : ""}>{price}</strong>
                    <span>{period}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--pw-muted)", marginBottom: ".3rem" }}>{desc}</p>
                  <ul className="pw-tfeats">{features.map((f) => <li key={f}>{f}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="pw-cta-section">
          <div className="pw-cta-wrap">
            <div className="pw-eyebrow up" style={{ marginBottom: "1.5rem" }}>✦ GET STARTED &nbsp;|&nbsp; FREE FOREVER UP TO 5 AUDITS PER MONTH</div>
            <h2 className="pw-cta-h up">Your next article<br />is already <em>invisible.</em></h2>
            <p className="pw-cta-sub up">In the time it took to read this page, you could have audited five pieces of content and received a prioritized fix list for each one. No credit card required.</p>
            <a href="https://seo-content-audit.lovable.app" target="_blank" rel="noopener" className="pw-btn up" style={{ fontSize: "16px", padding: "14px 32px" }}>
              Open ContentIQ
              <svg width="13" height="13" viewBox="0 0 11 11" fill="none">
                <path d="M2 9L9 2M9 2H4.5M9 2V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

        <footer className="pw-footer">
          <p>✦ ContentIQ &nbsp;|&nbsp; AI Content Intelligence Platform</p>
          <p>Gemini 2.0 Flash &nbsp;|&nbsp; Supabase &nbsp;|&nbsp; React &nbsp;|&nbsp; Free to start</p>
        </footer>

      </div>
    </>
  );
};

const css = `
.pw {
  --pw-bg:     #050810;
  --pw-surf:   #0A0F1E;
  --pw-surf2:  #0F1628;
  --pw-bdr:    #1B2540;
  --pw-bdr2:   #2A3A5E;
  --pw-accent: #4F46E5;
  --pw-adim:   rgba(79,70,229,.10);
  --pw-aglow:  rgba(79,70,229,.28);
  --pw-danger: #EF4444;
  --pw-amber:  #F59E0B;
  --pw-green:  #22C55E;
  --pw-text:   #EEF1FF;
  --pw-muted:  #7A86A0;
  --pw-dim:    #3D4A66;
  --pw-mono:   'Courier New',Courier,monospace;
  --pw-serif:  Georgia,'Times New Roman',Times,serif;

  background: var(--pw-bg);
  color: var(--pw-text);
  font-family: system-ui,-apple-system,sans-serif;
  font-size: 18px;
  line-height: 1.6;
  overflow-x: hidden;
  min-height: 100vh;
  box-sizing: border-box;
}
.pw *, .pw *::before, .pw *::after { box-sizing: border-box; margin: 0; padding: 0; }
.pw a { color: inherit; text-decoration: none; }

/* util */
.pw .pw-ac     { color: var(--pw-accent) }
.pw .pw-danger { color: var(--pw-danger) }
.pw .pw-mono   { font-family: var(--pw-mono) }
.pw .pw-chk    { color: var(--pw-green) }
.pw .pw-crs    { color: var(--pw-danger) }

/* reveal */
.pw .up { opacity:0; transform:translateY(22px); transition:opacity .55s ease,transform .55s ease }
.pw .up.in { opacity:1; transform:translateY(0) }

/* nav */
.pw-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 clamp(1.5rem,5vw,4rem); height: 58px;
  background: rgba(5,8,16,.94); backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--pw-bdr);
}
.pw-logo { display:flex; align-items:center; gap:9px; font-weight:800; font-size:16px; letter-spacing:-.02em }
.pw-dot  { width:8px; height:8px; border-radius:50%; background:var(--pw-accent); animation:pw-pdot 2s ease-in-out infinite; flex-shrink:0 }
@keyframes pw-pdot { 0%,100%{ box-shadow:0 0 0 0 var(--pw-aglow) } 50%{ box-shadow:0 0 0 7px rgba(79,70,229,0) } }
.pw-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:9px 20px; background:var(--pw-accent); color:#fff;
  font-weight:700; font-size:14px; border:none; border-radius:4px; cursor:pointer;
  transition:opacity .15s; white-space:nowrap;
}
.pw-btn:hover { opacity:.85 }
.pw-btn svg { flex-shrink:0 }

/* hero */
.pw-hero {
  padding: clamp(3.5rem,7vw,7rem) clamp(1.5rem,5vw,4rem) 0;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: clamp(2rem,4vw,5rem); align-items: start;
  max-width: 1380px; margin: 0 auto;
}
.pw-hero-ey { margin-bottom: 1.2rem }
.pw-h1 {
  font-family: var(--pw-serif); font-size: clamp(3rem,5.5vw,5.2rem);
  font-weight: 900; line-height: .95; letter-spacing: -.04em;
  margin-bottom: 1.6rem; text-wrap: balance;
}
.pw-h1 em { font-style:normal; -webkit-text-stroke:2px var(--pw-accent); color:transparent }
.pw-sub {
  font-size: clamp(.95rem,1.6vw,1.1rem); color: var(--pw-muted);
  max-width: 460px; line-height: 1.72; margin-bottom: 2rem;
}
.pw-meta { display:flex; gap:2rem; flex-wrap:wrap; padding-top:1.5rem; border-top:1px solid var(--pw-bdr) }
.pw-mi strong { display:block; font-family:var(--pw-mono); font-size:1.5rem; font-weight:700 }
.pw-mi span   { font-family:var(--pw-mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--pw-muted) }

/* browser */
.pw-browser { background:var(--pw-surf); border:1px solid var(--pw-bdr2); border-radius:8px; overflow:hidden; box-shadow:0 40px 80px rgba(0,0,0,.55); margin-top:.5rem }
.pw-bar { display:flex; align-items:center; gap:9px; padding:10px 14px; background:var(--pw-surf2); border-bottom:1px solid var(--pw-bdr) }
.pw-dots { display:flex; gap:5px }
.pw-dots span { width:10px; height:10px; border-radius:50% }
.pw-dr { background:#FF5F57 } .pw-dy { background:#FFBD2E } .pw-dg { background:#28C840 }
.pw-url { flex:1; background:var(--pw-bg); border:1px solid var(--pw-bdr); border-radius:4px; padding:4px 10px; font-family:var(--pw-mono); font-size:11px; color:var(--pw-muted); display:flex; align-items:center; gap:6px }
.pw-live { display:flex; align-items:center; gap:4px; font-family:var(--pw-mono); font-size:10px; letter-spacing:.07em; color:var(--pw-green); background:rgba(34,197,94,.1); border:1px solid rgba(34,197,94,.2); padding:2px 7px; border-radius:3px }
.pw-live-dot { width:5px; height:5px; border-radius:50%; background:var(--pw-green); animation:pw-blink 1.4s ease-in-out infinite }
@keyframes pw-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
.pw-browser-body { padding:18px }

/* ticker */
.pw-ticker-wrap { border-top:1px solid var(--pw-bdr); border-bottom:1px solid var(--pw-bdr); background:var(--pw-surf); overflow:hidden; padding:13px 0; margin-top:clamp(3rem,6vw,5rem) }
.pw-ticker { display:flex; width:max-content; animation:pw-tick 45s linear infinite }
@keyframes pw-tick { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.pw-ti { display:flex; align-items:center; white-space:nowrap; padding:0 1.5rem; font-size:13px }
.pw-ts { font-family:var(--pw-mono); font-weight:700 }
.pw-tl { color:var(--pw-muted); margin-left:7px }
.pw-tp { color:var(--pw-dim); margin:0 1.2rem }
@media(prefers-reduced-motion:reduce){ .pw-ticker{ animation:none } .pw .up{ opacity:1; transform:none; transition:none } .pw-dot,.pw-live-dot{ animation:none } }

/* sections */
.pw-section { border-top:1px solid var(--pw-bdr) }
.pw-wrap { max-width:1380px; margin:0 auto; padding:clamp(3.5rem,6vw,5.5rem) clamp(1.5rem,5vw,4rem) }
.pw-eyebrow { font-family:var(--pw-mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--pw-muted) }
.pw-h2 { font-family:var(--pw-serif); font-size:clamp(1.6rem,3vw,2.6rem); font-weight:700; line-height:1.1; letter-spacing:-.03em }

/* split grid */
.pw-split { display:grid; grid-template-columns:1fr 1px 1fr; gap:0; align-items:start; margin-top:2.5rem }
.pw-vline { background:var(--pw-bdr) }
.pw-pl { padding-right:clamp(2rem,4vw,4rem) }
.pw-pr { padding-left:clamp(2rem,4vw,4rem) }

/* pain */
.pw-big { font-family:var(--pw-mono); font-size:clamp(4.5rem,13vw,13rem); font-weight:900; line-height:.85; -webkit-text-stroke:2.5px var(--pw-danger); color:transparent; display:block; margin:.6rem 0 .4rem }
.pw-src { font-family:var(--pw-mono); font-size:10px; letter-spacing:.1em; color:var(--pw-dim); text-transform:uppercase; margin-top:1rem; padding-top:.8rem; border-top:1px solid var(--pw-bdr) }
.pw-pt { width:100%; border-collapse:collapse; margin-top:1.5rem }
.pw-pt td { padding:10px 0; border-bottom:1px solid var(--pw-bdr); font-size:15px; vertical-align:middle }
.pw-pt td:first-child { color:var(--pw-muted) }
.pw-pt td:last-child { text-align:right; font-family:var(--pw-mono); font-weight:700 }
.pw-pt .pw-bad { color:var(--pw-danger) }
.pw-pt .pw-ok  { color:var(--pw-green) }

/* steps */
.pw-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin-top:2.5rem }
.pw-step { position:relative; padding:2.5rem clamp(1.2rem,2.5vw,2.2rem); border-right:1px solid var(--pw-bdr) }
.pw-step:last-child { border-right:none }
.pw-ghost { position:absolute; top:-8px; left:clamp(.8rem,2vw,1.8rem); font-family:var(--pw-mono); font-size:clamp(5rem,10vw,8rem); font-weight:900; color:var(--pw-surf2); line-height:1; user-select:none; pointer-events:none }
.pw-step-body { position:relative; z-index:1; padding-top:2.8rem }
.pw-step-tag { display:inline-flex; padding:3px 8px; font-family:var(--pw-mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase; background:var(--pw-adim); border:1px solid rgba(79,70,229,.3); border-radius:3px; color:var(--pw-accent); margin-bottom:.7rem }
.pw-step-h { font-size:1.05rem; font-weight:700; letter-spacing:-.01em; margin-bottom:.5rem }
.pw-step-p { font-size:14px; color:var(--pw-muted); line-height:1.65 }

/* dimensions */
.pw-dims-grid { display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,4vw,5rem); margin-top:2.5rem; align-items:start }
.pw-dims-head { font-size:clamp(1.4rem,2.8vw,1.9rem); font-weight:700; line-height:1.2; letter-spacing:-.03em; margin-bottom:1.2rem }
.pw-dims-stats { display:flex; gap:1.5rem; margin-top:1.8rem; flex-wrap:wrap }
.pw-dsl { font-family:var(--pw-mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--pw-dim); margin-bottom:4px }
.pw-dsv { font-family:var(--pw-mono); font-size:1.4rem; font-weight:700 }
.pw-dt { width:100%; border-collapse:collapse }
.pw-dt thead tr { border-bottom:2px solid var(--pw-bdr2) }
.pw-dt th { padding:9px 12px 9px 0; text-align:left; font-family:var(--pw-mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--pw-muted) }
.pw-dt td { padding:12px 12px 12px 0; border-bottom:1px solid var(--pw-bdr); font-size:14px; vertical-align:top }
.pw-dt tr:last-child td { border-bottom:none }
.pw-dn { font-weight:700; font-size:13px }
.pw-db { display:inline-flex; padding:2px 6px; border-radius:3px; font-family:var(--pw-mono); font-size:10px; letter-spacing:.06em; font-weight:700; text-transform:uppercase }
.pw-bc { background:var(--pw-adim);              color:var(--pw-accent); border:1px solid rgba(79,70,229,.25) }
.pw-bp { background:rgba(34,197,94,.07);         color:var(--pw-green);  border:1px solid rgba(34,197,94,.2) }
.pw-ba { background:rgba(245,158,11,.07);        color:var(--pw-amber);  border:1px solid rgba(245,158,11,.2) }

/* roi */
.pw-sl-lbl { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px }
.pw-sl-lbl span { font-size:14px; color:var(--pw-muted) }
.pw-sl-lbl strong { font-family:var(--pw-mono); font-size:2rem; font-weight:700 }
.pw-range { -webkit-appearance:none; width:100%; height:2px; background:var(--pw-bdr2); border-radius:2px; outline:none; margin:0 }
.pw-range::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--pw-accent); cursor:pointer; box-shadow:0 0 0 3px var(--pw-adim) }
.pw-range::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:var(--pw-accent); cursor:pointer; border:none }
.pw-roi-rows { margin-top:1.5rem }
.pw-roi-row { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--pw-bdr) }
.pw-roi-row:last-child { border-bottom:none }
.pw-rl { font-size:14px; color:var(--pw-muted) }
.pw-rv { font-family:var(--pw-mono); font-size:1.3rem; font-weight:700 }
.pw-roi-bad  .pw-rv { color:var(--pw-danger) }
.pw-roi-good .pw-rv { color:var(--pw-green) }
.pw-roi-ac   .pw-rv { color:var(--pw-accent) }
.pw-al { font-family:var(--pw-mono); font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--pw-dim); margin-bottom:4px }

/* comparison */
.pw-comp-head { font-size:clamp(1.2rem,2.3vw,1.7rem); font-weight:600; letter-spacing:-.025em; max-width:580px; margin:1rem 0 2.5rem; line-height:1.3 }
.pw-ct { width:100%; border-collapse:collapse }
.pw-ct th { padding:12px 14px; text-align:left; font-family:var(--pw-mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase; border-bottom:2px solid var(--pw-bdr2) }
.pw-ct th:not(:first-child) { text-align:center }
.pw-ct th.pw-ct-iq-h { color:var(--pw-accent) }
.pw-ct td { padding:13px 14px; border-bottom:1px solid var(--pw-bdr); font-size:14px; vertical-align:middle }
.pw-ct td:not(:first-child) { text-align:center; font-family:var(--pw-mono); font-size:13px }
.pw-ct td:first-child { color:var(--pw-muted); font-size:13px }
.pw-ct tr:last-child td { border-bottom:none }
.pw-ct-iq-c { background:var(--pw-adim) }

/* pricing */
.pw-pricing-head { font-size:clamp(1.2rem,2.3vw,1.7rem); font-weight:600; letter-spacing:-.025em; max-width:540px; margin:1rem 0 0; line-height:1.3 }
.pw-ptiers { display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin-top:2.5rem }
.pw-ptier { padding:2rem; border-right:1px solid var(--pw-bdr); position:relative }
.pw-ptier:last-child { border-right:none }
.pw-feat { background:var(--pw-surf) }
.pw-tname { font-family:var(--pw-mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--pw-muted) }
.pw-tprice { display:flex; align-items:baseline; gap:4px; margin:.8rem 0 .3rem }
.pw-tprice strong { font-family:var(--pw-mono); font-size:2.6rem; font-weight:700; line-height:1 }
.pw-tprice span { font-size:14px; color:var(--pw-muted) }
.pw-tfeats { list-style:none; margin-top:1.2rem; display:flex; flex-direction:column; gap:9px }
.pw-tfeats li { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--pw-muted); line-height:1.4 }
.pw-tfeats li::before { content:'✦'; color:var(--pw-accent); font-size:9px; flex-shrink:0; margin-top:3px }
.pw-pop { position:absolute; top:-1px; right:1.8rem; background:var(--pw-accent); color:#fff; font-family:var(--pw-mono); font-size:9px; letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:0 0 4px 4px }

/* cta */
.pw-cta-section { border-top:1px solid var(--pw-bdr); background:var(--pw-surf) }
.pw-cta-wrap { max-width:1380px; margin:0 auto; padding:clamp(5rem,9vw,8rem) clamp(1.5rem,5vw,4rem) }
.pw-cta-h { font-family:var(--pw-serif); font-size:clamp(2.8rem,7vw,7rem); font-weight:900; line-height:.93; letter-spacing:-.045em; max-width:820px; margin-bottom:2.2rem }
.pw-cta-h em { font-style:normal; -webkit-text-stroke:2px var(--pw-accent); color:transparent }
.pw-cta-sub { font-size:1.05rem; color:var(--pw-muted); max-width:460px; margin-bottom:2.5rem; line-height:1.72 }

/* footer */
.pw-footer { border-top:1px solid var(--pw-bdr); padding:1.8rem clamp(1.5rem,5vw,4rem); display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap }
.pw-footer p { font-family:var(--pw-mono); font-size:11px; color:var(--pw-dim) }

/* responsive */
@media(max-width:900px){
  .pw-hero,.pw-dims-grid { grid-template-columns:1fr }
  .pw-split { grid-template-columns:1fr }
  .pw-vline { display:none }
  .pw-pr { padding-left:0; padding-top:2.2rem; border-top:1px solid var(--pw-bdr) }
  .pw-steps { grid-template-columns:1fr }
  .pw-step { border-right:none; border-bottom:1px solid var(--pw-bdr) }
  .pw-step:last-child { border-bottom:none }
  .pw-ptiers { grid-template-columns:1fr }
  .pw-ptier { border-right:none; border-bottom:1px solid var(--pw-bdr) }
  .pw-ptier:last-child { border-bottom:none }
}
@media(max-width:600px){
  .pw-h1 { font-size:2.6rem }
  .pw-big { font-size:4.2rem }
  .pw-cta-h { font-size:2.4rem }
  .pw-meta { gap:1.2rem }
  .pw-ct th,.pw-ct td { padding:10px 8px; font-size:12px }
}
`;
