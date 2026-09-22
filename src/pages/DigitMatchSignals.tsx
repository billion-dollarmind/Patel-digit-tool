import { motion } from 'framer-motion';
import { Wifi, WifiOff, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useDerivMarket } from '@/context/DerivMarketContext';
import { useSignalCycle } from '@/hooks/useSignalCycle';
import { analyzeDigitMatch, getLastDigit } from '@/utils/predictions';
import { Button } from '@/components/ui/button';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import {
  AnalyzingState,
  CompactSignal,
  LiveDigitsRow,
  MatchNowBanner,
  SignalCardShell,
  signalsGridClass,
} from '@/components/SignalCard';

interface SignalCardProps {
  symbol: string;
  ticks: { epoch: number; quote: number; symbol: string }[];
  isConnected: boolean;
}

const DigitMatchCard = ({ symbol, ticks, isConnected }: SignalCardProps) => {
  const { phase, countdown, signalTicks, collectedCount, isReady, liveCycleTicks, cycleId, scanDuration } =
    useSignalCycle(ticks, symbol);
  const digitMatchResult = useMemo(() => analyzeDigitMatch(signalTicks), [signalTicks]);
  const showSignal = phase === 'signal' && isReady;

  const lastDigits = useMemo(
    () =>
      liveCycleTicks.map((t, index, arr) => ({
        digit: getLastDigit(t.quote),
        epoch: t.epoch,
        isNewest: index === arr.length - 1,
        highlight: digitMatchResult
          ? getLastDigit(t.quote) === digitMatchResult.prediction
          : false,
        className:
          digitMatchResult && getLastDigit(t.quote) === digitMatchResult.prediction
            ? 'bg-match/25 text-match border-match/40'
            : undefined,
      })),
    [liveCycleTicks, digitMatchResult]
  );

  const topDigits = useMemo(() => {
    if (!digitMatchResult) return [];
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((d) => ({
        d,
        pct: digitMatchResult.percentages[d] || 0,
        count: digitMatchResult.frequency[d] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [digitMatchResult]);

  return (
    <SignalCardShell symbol={symbol} isConnected={isConnected} accent="digit-match">
      {!showSignal ? (
        <>
          <AnalyzingState countdown={countdown} collectedCount={collectedCount} scanDuration={scanDuration} />
          <LiveDigitsRow digits={lastDigits} symbol={symbol} cycleId={cycleId} />
        </>
      ) : digitMatchResult ? (
        <>
          <CompactSignal
            label={digitMatchResult.prediction}
            confidence={digitMatchResult.confidence}
            actionLabel="MATCH NOW"
            toneClass="bg-gradient-to-br from-match to-orange-600 shadow-match/50"
            pulse
            stats={
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {topDigits.map(({ d, pct }) => (
                  <span
                    key={d}
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                      d === digitMatchResult.prediction
                        ? 'bg-match/25 text-match border-match/40'
                        : 'bg-muted/40 text-muted-foreground border-border/40'
                    }`}
                  >
                    {d}:{pct}%
                  </span>
                ))}
              </div>
            }
          />
          <MatchNowBanner digit={digitMatchResult.prediction} />
          <LiveDigitsRow digits={lastDigits} symbol={symbol} cycleId={cycleId} />
        </>
      ) : null}
    </SignalCardShell>
  );
};

export const DigitMatchSignals = () => {
  const navigate = useNavigate();
  const { tickData, isConnected, feedMode, symbols } = useDerivMarket();

  return (
    <div className="relative min-h-screen">
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
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">Digit Match</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Most frequent digit signals</p>
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

      <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={signalsGridClass}>
          {symbols.map((symbol) => (
            <DigitMatchCard
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
