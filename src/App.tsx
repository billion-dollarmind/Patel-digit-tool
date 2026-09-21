import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PasswordGate } from "@/components/PasswordGate";
import { useAuth } from "@/hooks/useAuth";
import { DerivAccountProvider, useDerivAccount } from "@/context/DerivAccountContext";
import { SignalEngineProvider } from "@/context/SignalEngineContext";
import { PlatformAdminProvider } from "@/context/PlatformAdminContext";
import { FeatureGate } from "@/components/FeatureGate";
import { isOAuthCallbackLocation } from "@/lib/derivConfig";
import { consumeOAuthStartFlag } from "@/lib/derivOAuth";
import { useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { EvenOddSignals } from "./pages/EvenOddSignals";
import { OverUnderSignals } from "./pages/OverUnderSignals";
import { DigitMatchSignals } from "./pages/DigitMatchSignals";
import { EngineMonitor } from "./pages/EngineMonitor";
import { SpeedBotApp } from "./pages/apps/SpeedBotApp";
import { AccumulatorsApp } from "./pages/apps/AccumulatorsApp";
import { BotBuilderApp } from "./pages/apps/BotBuilderApp";
import { OAuthCallback } from "./pages/OAuthCallback";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminApps } from "./pages/admin/AdminApps";
import { AdminAccess } from "./pages/admin/AdminAccess";
import { AdminSubscribers } from "./pages/admin/AdminSubscribers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthenticatedApp = () => (
  <PlatformAdminProvider>
    <SignalEngineProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route
          path="/signals/even-odd"
          element={
            <FeatureGate feature="even_odd" title="Even/Odd locked">
              <EvenOddSignals />
            </FeatureGate>
          }
        />
        <Route
          path="/signals/over-under"
          element={
            <FeatureGate feature="over_under" title="Over/Under locked">
              <OverUnderSignals />
            </FeatureGate>
          }
        />
        <Route
          path="/signals/digit-match"
          element={
            <FeatureGate feature="digit_match" title="Digit Match locked">
              <DigitMatchSignals />
            </FeatureGate>
          }
        />
        <Route
          path="/engine"
          element={
            <FeatureGate feature="engine_monitor" title="Auto Engine locked">
              <EngineMonitor />
            </FeatureGate>
          }
        />
        <Route
          path="/apps/speedbot"
          element={
            <FeatureGate feature="speedbot" title="Speed Bot locked">
              <SpeedBotApp />
            </FeatureGate>
          }
        />
        <Route
          path="/apps/accumulators"
          element={
            <FeatureGate feature="accumulators" title="Accumulators locked">
              <AccumulatorsApp />
            </FeatureGate>
          }
        />
        <Route
          path="/apps/bot-builder"
          element={
            <FeatureGate feature="bot_builder" title="Bot Builder locked">
              <BotBuilderApp />
            </FeatureGate>
          }
        />
        <Route path="/speed-bot" element={<Navigate to="/apps/speedbot" replace />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="apps" element={<AdminApps />} />
          <Route path="access" element={<AdminAccess />} />
          <Route path="subscribers" element={<AdminSubscribers />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </SignalEngineProvider>
  </PlatformAdminProvider>
);

const AppContent = () => {
  const { isAuthenticated, isLoading, authenticate } = useAuth();
  const { loginWithDerivOAuth } = useDerivAccount();
  const location = useLocation();

  useEffect(() => {
    const start = consumeOAuthStartFlag();
    if (!start) return;
    void loginWithDerivOAuth({
      verifyAfter: start.verifyAfter,
      returnTo: start.returnTo,
      prompt: start.prompt,
    });
  }, [loginWithDerivOAuth]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

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
