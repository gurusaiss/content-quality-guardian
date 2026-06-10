import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { InputForm } from "@/components/InputForm";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { OnboardingModal } from "@/components/OnboardingModal";
import { AnalysisResults } from "@/types/analysis";

const Index = () => {
  const [searchParams] = useSearchParams();
  const prefillUrl     = searchParams.get("url") || "";
  const prefillKeyword = searchParams.get("keyword") || "";

  const [results, setResults]   = useState<AnalysisResults | null>(null);
  const [auditId, setAuditId]   = useState<string | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisComplete = (data: AnalysisResults, id?: string) => {
    if (data) { setResults(data); setAuditId(id); }
    setIsAnalyzing(false);
  };

  const handleNewAnalysis = () => {
    setResults(null);
    setAuditId(undefined);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <OnboardingModal />
      <Header onNewAnalysis={handleNewAnalysis} />

      <main className="container mx-auto px-4 py-8">
        {!results ? (
          <InputForm
            onAnalysisStart={() => setIsAnalyzing(true)}
            onAnalysisComplete={handleAnalysisComplete}
            isAnalyzing={isAnalyzing}
            prefillUrl={prefillUrl}
            prefillKeyword={prefillKeyword}
          />
        ) : (
          <ResultsDashboard results={results} auditId={auditId} />
        )}
      </main>

      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ContentIQ — AI-Powered Content Intelligence Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
