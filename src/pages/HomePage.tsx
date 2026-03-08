import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Zap, BarChart3, Search, Shield, Brain, Sparkles, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const HomePage = () => {
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Sparkles className="h-6 w-6" />
            <span>ContentIQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/audit">
                  <Button size="sm">Go to App</Button>
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-xs">{displayName[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center py-24 md:py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container px-4 md:px-6 relative z-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-primary" />
              Powered by Advanced AI
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Master Your{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Content Strategy
              </span>
            </h1>
            <p className="mx-auto max-w-[640px] text-lg text-muted-foreground md:text-xl">
              Audit, optimize, and rank. The all-in-one platform for modern content teams to dominate search and engage readers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to={user ? "/audit" : "/auth"}>
                <Button size="lg" className="h-12 px-8 text-lg gap-2">
                  Run Free Audit <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Free audits included
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Comprehensive content analysis across every dimension that matters.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: "Deep SEO Audits", desc: "Analyze content against top SERP competitors with actionable recommendations.", color: "text-primary bg-primary/10" },
              { icon: Zap, title: "AI Optimization", desc: "Improve readability, tone, and structure instantly with our AI engine.", color: "text-amber-600 bg-amber-100" },
              { icon: BarChart3, title: "Performance Tracking", desc: "Monitor content health over time and stay ahead of algorithm updates.", color: "text-emerald-600 bg-emerald-100" },
              { icon: Shield, title: "AI Detection", desc: "Identify AI-generated segments and humanize your content for authenticity.", color: "text-rose-600 bg-rose-100" },
              { icon: Brain, title: "AEO & Snippets", desc: "Optimize for Answer Engine Optimization and win featured snippets.", color: "text-violet-600 bg-violet-100" },
              { icon: Sparkles, title: "Differentiation", desc: "Stand out from competitors with unique voice and perspective analysis.", color: "text-cyan-600 bg-cyan-100" },
            ].map((f) => (
              <div key={f.title} className="flex flex-col items-start space-y-4 p-6 bg-card rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                <div className={`p-3 rounded-full ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 border-t">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Three Simple Steps</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Get actionable insights in under a minute.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Paste or Link", desc: "Drop in your content text or paste a URL." },
              { step: "02", title: "AI Analysis", desc: "Our engine scores SEO, AEO, humanization, and more." },
              { step: "03", title: "Optimize", desc: "Apply recommendations and track improvements over time." },
            ].map((s) => (
              <div key={s.step} className="text-center space-y-3">
                <div className="text-5xl font-extrabold text-primary/20">{s.step}</div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t bg-primary/5">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to Level Up Your Content?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Join thousands of content teams using AI-powered insights to rank higher and engage better.</p>
          <Link to={user ? "/audit" : "/auth"}>
            <Button size="lg" className="h-12 px-8 text-lg gap-2">
              Start for Free <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>ContentIQ — Built for modern content teams</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:underline">Terms</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
