import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PasswordGate } from "@/components/PasswordGate";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "./pages/Dashboard";
import { EvenOddSignals } from "./pages/EvenOddSignals";
import { OverUnderSignals } from "./pages/OverUnderSignals";
import { DigitMatchSignals } from "./pages/DigitMatchSignals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, isLoading, authenticate } = useAuth();

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={authenticate} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/signals/even-odd" element={<EvenOddSignals />} />
        <Route path="/signals/over-under" element={<OverUnderSignals />} />
        <Route path="/signals/digit-match" element={<DigitMatchSignals />} />
        <Route path="/speed-bot" element={<Navigate to="/" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
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
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
