import { motion } from 'framer-motion';
import { Wifi, WifiOff, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { useSignalCycle } from '@/hooks/useSignalCycle';
import { analyzeEvenOdd, getLastDigit } from '@/utils/predictions';
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

const EvenOddCard = ({ symbol, ticks, isConnected }: SignalCardProps) => {
  const { phase, countdown, signalTicks, collectedCount, isReady, liveCycleTicks, cycleId, scanDuration } =
    useSignalCycle(ticks, symbol);
  const evenOddResult = useMemo(() => analyzeEvenOdd(signalTicks), [signalTicks]);
  const showSignal = phase === 'signal' && isReady;

  const lastDigits = useMemo(
    () =>
      liveCycleTicks.map((t, index, arr) => {
        const digit = getLastDigit(t.quote);
        const isEven = digit % 2 === 0;
        return {
          digit,
          epoch: t.epoch,
          isNewest: index === arr.length - 1,
          className: isEven
            ? 'bg-even/20 text-even border-even/35'
            : 'bg-odd/20 text-odd border-odd/35',
        };
      }),
    [liveCycleTicks]
  );

  const evenPct = evenOddResult
    ? Math.round((evenOddResult.evenCount / Math.max(evenOddResult.total, 1)) * 100)
    : 0;
  const oddPct = 100 - evenPct;

  return (
    <SignalCardShell symbol={symbol} isConnected={isConnected} accent="even-odd">
      {!showSignal ? (
        <>
          <AnalyzingState countdown={countdown} collectedCount={collectedCount} scanDuration={scanDuration} />
          <LiveDigitsRow digits={lastDigits} symbol={symbol} cycleId={cycleId} />
        </>
      ) : evenOddResult ? (
        <>
          <CompactSignal
            label={evenOddResult.prediction}
            confidence={evenOddResult.confidence}
            toneClass={
              evenOddResult.prediction === 'EVEN'
                ? 'bg-gradient-to-br from-even to-emerald-600'
                : 'bg-gradient-to-br from-odd to-fuchsia-600'
            }
            pulse={evenOddResult.confidence > 75}
            stats={
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] min-w-0">
                <span className="text-even font-bold whitespace-nowrap">{evenPct}% E</span>
                <div className="hidden sm:flex w-16 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-even" style={{ width: `${evenPct}%` }} />
                  <div className="h-full bg-odd" style={{ width: `${oddPct}%` }} />
                </div>
                <span className="text-odd font-bold whitespace-nowrap">{oddPct}% O</span>
                <span className="text-muted-foreground font-mono hidden md:inline">
                  {evenOddResult.total}t
                </span>
              </div>
            }
          />
          <LiveDigitsRow digits={lastDigits} symbol={symbol} cycleId={cycleId} />
        </>
      ) : null}
    </SignalCardShell>
  );
};

export const EvenOddSignals = () => {
  const navigate = useNavigate();
  const { tickData, isConnected, symbols } = useDerivWebSocket();

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
                <h1 className="text-sm sm:text-lg font-bold text-foreground truncate">Even / Odd</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Even or odd last-digit signals</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-muted/50">
                {isConnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-even" />
                    <span className="text-[11px] sm:text-sm text-even font-medium hidden sm:inline">Connected</span>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={signalsGridClass}
        >
          {symbols.map((symbol) => (
            <EvenOddCard
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
