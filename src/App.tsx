import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { BriefPage } from "@/pages/BriefPage";
import { CompetitorPage } from "@/pages/CompetitorPage";
import { KeywordsPage } from "@/pages/KeywordsPage";
import { LiveEditorPage } from "@/pages/LiveEditorPage";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="content-iq-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/"           element={<HomePage />} />
              <Route path="/auth"       element={<AuthPage />} />
              <Route path="/audit"      element={<P><Index /></P>} />
              <Route path="/editor"     element={<P><LiveEditorPage /></P>} />
              <Route path="/brief"      element={<P><BriefPage /></P>} />
              <Route path="/competitor" element={<P><CompetitorPage /></P>} />
              <Route path="/keywords"   element={<P><KeywordsPage /></P>} />
              <Route path="/dashboard"  element={<P><DashboardPage /></P>} />
              <Route path="/calendar"   element={<P><CalendarPage /></P>} />
              <Route path="*"           element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
