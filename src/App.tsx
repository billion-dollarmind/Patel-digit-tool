import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PasswordGate } from "@/components/PasswordGate";
import { useAuth } from "@/hooks/useAuth";
import { DerivAccountProvider } from "@/context/DerivAccountContext";
import { SignalEngineProvider } from "@/context/SignalEngineContext";
import { isOAuthCallbackLocation } from "@/lib/derivConfig";
import { Dashboard } from "./pages/Dashboard";
import { EvenOddSignals } from "./pages/EvenOddSignals";
import { OverUnderSignals } from "./pages/OverUnderSignals";
import { DigitMatchSignals } from "./pages/DigitMatchSignals";
import { EngineMonitor } from "./pages/EngineMonitor";
import { SpeedBotApp } from "./pages/apps/SpeedBotApp";
import { AccumulatorsApp } from "./pages/apps/AccumulatorsApp";
import { BotBuilderApp } from "./pages/apps/BotBuilderApp";
import { OAuthCallback } from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedApp = () => (
  <SignalEngineProvider>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/signals/even-odd" element={<EvenOddSignals />} />
      <Route path="/signals/over-under" element={<OverUnderSignals />} />
      <Route path="/signals/digit-match" element={<DigitMatchSignals />} />
      <Route path="/engine" element={<EngineMonitor />} />
      <Route path="/apps/speedbot" element={<SpeedBotApp />} />
      <Route path="/apps/accumulators" element={<AccumulatorsApp />} />
      <Route path="/apps/bot-builder" element={<BotBuilderApp />} />
      <Route path="/speed-bot" element={<Navigate to="/apps/speedbot" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </SignalEngineProvider>
);

const AppContent = () => {
  const { isAuthenticated, isLoading, authenticate } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  // OAuth return can land on / (production redirect) or /oauth/callback
  if (isOAuthCallbackLocation(location.search, location.pathname)) {
    return <OAuthCallback />;
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={authenticate} />;
  }

  return <AuthenticatedApp />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DerivAccountProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </DerivAccountProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
