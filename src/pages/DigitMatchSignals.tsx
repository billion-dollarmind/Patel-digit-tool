import { motion } from 'framer-motion';
import { Hash, Wifi, WifiOff, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { useSignalCycle } from '@/hooks/useSignalCycle';
import { analyzeDigitMatch, getLastDigit } from '@/utils/predictions';
import { TickChart } from '@/components/TickChart';
import { PredictionBadge } from '@/components/PredictionBadge';
import { SignalCountdown } from '@/components/SignalCountdown';
import { Button } from '@/components/ui/button';

const symbolNames: Record<string, string> = {
  R_10: 'Volatility 10',
  R_25: 'Volatility 25',
  R_50: 'Volatility 50',
  R_75: 'Volatility 75',
  R_100: 'Volatility 100',
  '1HZ10V': 'Volatility 10 (1s)',
  '1HZ25V': 'Volatility 25 (1s)',
  '1HZ50V': 'Volatility 50 (1s)',
  '1HZ100V': 'Volatility 100 (1s)'
};

interface SignalCardProps {
  symbol: string;
  ticks: { epoch: number; quote: number; symbol: string }[];
  isConnected: boolean;
}

const DigitMatchCard = ({ symbol, ticks, isConnected }: SignalCardProps) => {
  const { phase, countdown, signalTicks, collectedCount, isReady } = useSignalCycle(ticks);
  const digitMatchResult = useMemo(() => analyzeDigitMatch(signalTicks), [signalTicks]);
  const showSignal = phase === 'signal' && isReady;

  // Live digit display
  const lastDigits = ticks.slice(-10).map(t => ({
    digit: getLastDigit(t.quote),
    epoch: t.epoch
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 space-y-6 text-center"
    >
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
          {symbolNames[symbol] || symbol}
        </h3>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{symbol}</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-even animate-pulse' : 'bg-destructive'}`} />
        </div>
      </div>

      {!showSignal ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          {/* Countdown Display */}
          <SignalCountdown phase={phase} countdown={countdown} collectedCount={collectedCount} />
          
          <div className="w-32 h-32 rounded-full border-4 border-muted border-t-match animate-spin" />
          <div className="space-y-1">
            <div className="text-lg font-bold text-foreground">ANALYZING</div>
            <div className="text-sm text-muted-foreground">Signal ready in {countdown}s</div>
          </div>
        </div>
      ) : digitMatchResult && (
        <div className="space-y-6">
          {/* Large Circular Prediction */}
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-br from-match to-match/80 ${
                digitMatchResult.confidence > 75 ? 'animate-pulse' : ''
              }`}
            >
              <div className="text-6xl font-black text-white">
                {digitMatchResult.prediction}
              </div>
            </motion.div>

            {/* Entry Now Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-2xl font-bold text-even"
            >
              <span>ENTRY NOW</span>
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            </motion.div>

            {/* Confidence */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-even"
            >
              Confidence: {digitMatchResult.confidence}%
            </motion.div>
          </div>

          {/* Digit Frequency Grid */}
          <div className="rounded-xl p-4 bg-muted/10 border border-muted/30">
            <div className="text-sm font-medium mb-3 text-muted-foreground">Digit Frequency Analysis</div>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => {
                const count = digitMatchResult.frequency[digit] || 0;
                const isTarget = digit === digitMatchResult.prediction;
                return (
                  <div
                    key={digit}
                    className={`rounded-lg p-2 text-center transition-all ${
                      isTarget 
                        ? 'bg-match/30 border-2 border-match scale-105' 
                        : 'bg-muted/50 border border-muted/30'
                    }`}
                  >
                    <div className={`text-lg font-bold ${isTarget ? 'text-match' : 'text-foreground'}`}>
                      {digit}
                    </div>
                    <div className="text-xs text-muted-foreground">{count}x</div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-3 text-xs text-muted-foreground">
              Most frequent digit: {digitMatchResult.prediction} ({digitMatchResult.frequency[digitMatchResult.prediction]}x)
            </div>
          </div>
          
          {/* Live digits */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-muted-foreground">Last 10 Digits (Live)</div>
            <div className="flex gap-2 justify-center">
              {lastDigits.map(({ digit, epoch }) => (
                <motion.div
                  key={epoch}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    digit === digitMatchResult.prediction 
                      ? 'bg-match/20 text-match border border-match/30 scale-110' 
                      : 'bg-muted/50 text-muted-foreground border border-muted/30'
                  }`}
                >
                  {digit}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const DigitMatchSignals = () => {
  const navigate = useNavigate();
  const { tickData, isConnected, symbols } = useDerivWebSocket();

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-match/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-match to-primary flex items-center justify-center">
                <Hash className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Digit Match Signals</h1>
                <p className="text-xs text-muted-foreground">Predict the most frequent digit</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                {isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-even" />
                    <span className="text-sm text-even font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive font-medium">Disconnected</span>
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {symbols.map((symbol, index) => (
            <motion.div
              key={symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <DigitMatchCard
                symbol={symbol}
                ticks={tickData[symbol]?.ticks || []}
                isConnected={tickData[symbol]?.isConnected || false}
              />
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};