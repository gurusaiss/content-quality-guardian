import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const HomePage = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const PitchPage = lazy(() => import("@/pages/PitchPage").then(m => ({ default: m.PitchPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then(m => ({ default: m.CalendarPage })));
const BriefPage = lazy(() => import("@/pages/BriefPage").then(m => ({ default: m.BriefPage })));
const CompetitorPage = lazy(() => import("@/pages/CompetitorPage").then(m => ({ default: m.CompetitorPage })));
const KeywordsPage = lazy(() => import("@/pages/KeywordsPage").then(m => ({ default: m.KeywordsPage })));
const LiveEditorPage = lazy(() => import("@/pages/LiveEditorPage").then(m => ({ default: m.LiveEditorPage })));
const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            <ErrorBoundary>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Routes>
                <Route path="/"           element={<HomePage />} />
                <Route path="/pitch"      element={<PitchPage />} />
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
            </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
