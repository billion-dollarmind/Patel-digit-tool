import { motion } from 'framer-motion';
import { Wifi, WifiOff, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { useDerivMarket } from '@/context/DerivMarketContext';
import { useSignalCycle } from '@/hooks/useSignalCycle';
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';
import { analyzeOverUnder, getLastDigit } from '@/utils/predictions';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { RiskWarning } from '@/components/RiskWarning';
import { Button } from '@/components/ui/button';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import {
  AnalyzingState,
  CompactSignal,
  LiveDigitsRow,
  SignalCardShell,
  signalsGridClass,
} from '@/components/SignalCard';

interface SignalCardProps {
  symbol: string;
  ticks: { epoch: number; quote: number; symbol: string }[];
  isConnected: boolean;
}

const OverUnderCard = ({ symbol, ticks, isConnected }: SignalCardProps) => {
  const { phase, countdown, signalTicks, collectedCount, isReady, liveCycleTicks, cycleId, scanDuration, recommendedRuns } =
    useSignalCycle(ticks, symbol);
  const { addPrediction } = usePerformanceTracking();
  const overUnderResult = useMemo(() => analyzeOverUnder(signalTicks), [signalTicks]);
  const showSignal = phase === 'signal' && isReady;

  const lastDigits = useMemo(
    () =>
      liveCycleTicks.map((t, index, arr) => {
        const digit = getLastDigit(t.quote);
        return {
          digit,
          epoch: t.epoch,
          isNewest: index === arr.length - 1,
          className:
            digit >= 5
              ? 'bg-over/20 text-over border-over/35'
              : 'bg-under/20 text-under border-under/35',
        };
      }),
    [liveCycleTicks]
  );

  useEffect(() => {
    if (showSignal && overUnderResult) {
      addPrediction({
        symbol,
        predictionType: overUnderResult.prediction,
        prediction: `${overUnderResult.prediction} ${overUnderResult.digit}`,
        confidence: overUnderResult.confidence,
        barrier: overUnderResult.digit,
      });
    }
  }, [showSignal, overUnderResult, symbol, addPrediction]);

  return (
    <SignalCardShell symbol={symbol} isConnected={isConnected} accent="over-under">
      {!showSignal ? (
        <>
          <AnalyzingState countdown={countdown} collectedCount={collectedCount} scanDuration={scanDuration} />
          <LiveDigitsRow digits={lastDigits} symbol={symbol} cycleId={cycleId} />
        </>
      ) : overUnderResult ? (
        <>
          <CompactSignal
            label={overUnderResult.prediction}
            sublabel={overUnderResult.digit}
            confidence={overUnderResult.confidence}
            toneClass={
              overUnderResult.prediction === 'OVER'
                ? 'bg-gradient-to-br from-over to-teal-600'
                : 'bg-gradient-to-br from-under to-rose-600'
            }
            pulse={overUnderResult.confidence > 75}
          />
          <div
            className={`rounded-md px-2 py-1.5 text-[11px] sm:text-xs leading-snug border ${
              overUnderResult.waitForPattern
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-even/10 border-even/30 text-even'
            }`}
          >
            {overUnderResult.waitForPattern ? (
              <>
                <span className="font-bold">Wait to enter</span>
                <span className="text-muted-foreground"> — watch for digits </span>
                <span className="font-mono font-semibold text-foreground">
                  {overUnderResult.entryDigits.join(', ')}
                </span>
                <span className="text-muted-foreground">, then place </span>
                <span className="font-semibold text-foreground">
                  {overUnderResult.recommendedRuns} runs
                </span>
              </>
            ) : (
              <>
                <span className="font-bold">Enter now</span>
                <span className="text-muted-foreground"> — best digits </span>
                <span className="font-mono font-semibold text-foreground">
                  {overUnderResult.entryDigits.join(', ')}
                </span>
                <span className="text-muted-foreground"> · place </span>
                <span className="font-semibold text-foreground">
                  {overUnderResult.recommendedRuns} runs
                </span>
              </>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground font-mono">
              Signal open for {countdown}s more (sized for {recommendedRuns} runs @ ~3s each)
            </div>
          </div>
          <LiveDigitsRow digits={lastDigits} symbol={symbol} cycleId={cycleId} />
        </>
      ) : null}
    </SignalCardShell>
  );
};

export const OverUnderSignals = () => {
  const navigate = useNavigate();
  const { tickData, isConnected, feedMode, symbols } = useDerivMarket();
  const { stats } = usePerformanceTracking();

  return (
    <div className="relative min-h-screen">
      <RiskWarning
        trigger={stats.currentStreak < -2 ? 'loss-streak' : 'startup'}
        lossStreak={Math.abs(stats.currentStreak)}
      />

      <SiteBackground variant="main" />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border/60"
      >
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <BrandLogo size="sm" className="sm:hidden" />
              <BrandLogo size="md" className="hidden sm:block" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">Over / Under</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">High or low digit signals</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-muted/50">
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-even" />
                    <span className="text-[11px] sm:text-sm text-even font-medium hidden sm:inline">
                      {feedMode === 'demo' ? 'Demo feed' : 'Connected'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                    <span className="text-[11px] sm:text-sm text-destructive font-medium hidden sm:inline">Offline</span>
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3" onClick={() => navigate('/')}>
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <PerformanceDashboard />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={signalsGridClass}>
          {symbols.map((symbol) => (
            <OverUnderCard
              key={symbol}
              symbol={symbol}
              ticks={tickData[symbol]?.ticks || []}
              isConnected={tickData[symbol]?.isConnected || false}
            />
          ))}
        </motion.div>
      </main>
    </div>
  );
};
