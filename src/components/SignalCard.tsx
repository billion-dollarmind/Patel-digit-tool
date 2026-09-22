import { motion } from 'framer-motion';
import { ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

export const SYMBOL_NAMES: Record<string, string> = {
  R_10: 'Volatility 10',
  R_25: 'Volatility 25',
  R_50: 'Volatility 50',
  R_75: 'Volatility 75',
  R_100: 'Volatility 100',
  '1HZ10V': 'Volatility 10 (1s)',
  '1HZ25V': 'Volatility 25 (1s)',
  '1HZ50V': 'Volatility 50 (1s)',
  '1HZ75V': 'Volatility 75 (1s)',
  '1HZ100V': 'Volatility 100 (1s)',
};

type Accent = 'even-odd' | 'over-under' | 'digit-match';

const accentStyles: Record<Accent, { glow: string; ring: string; orb: string }> = {
  'even-odd': {
    glow: 'shadow-cyan-500/10',
    ring: 'from-cyan-500/30 via-fuchsia-500/15 to-transparent',
    orb: 'from-cyan-400 to-fuchsia-500',
  },
  'over-under': {
    glow: 'shadow-sky-500/10',
    ring: 'from-sky-400/30 via-blue-500/15 to-transparent',
    orb: 'from-sky-400 to-blue-600',
  },
  'digit-match': {
    glow: 'shadow-amber-500/10',
    ring: 'from-amber-400/30 via-orange-500/15 to-transparent',
    orb: 'from-amber-400 to-orange-600',
  },
};

interface SignalCardShellProps {
  symbol: string;
  isConnected: boolean;
  accent: Accent;
  children: ReactNode;
  className?: string;
  /** Compact header sits on same row as meta (default true) */
  meta?: ReactNode;
}

export const SignalCardShell = ({
  symbol,
  isConnected,
  accent,
  children,
  className,
  meta,
}: SignalCardShellProps) => {
  const styles = accentStyles[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 bg-card/80 backdrop-blur-xl',
        styles.glow,
        className
      )}
    >
      <div className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${styles.ring} blur-2xl`} />

      <div className="relative px-2.5 py-2 sm:px-3 sm:py-2.5 space-y-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0 shrink-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wide truncate">
                {SYMBOL_NAMES[symbol] || symbol}
              </h3>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConnected ? 'bg-even animate-pulse' : 'bg-destructive'}`} />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground leading-none">{symbol}</div>
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5 sm:gap-2 overflow-hidden">
            {meta}
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-gradient-to-r ${styles.orb} text-white/95`}>
              AI
            </span>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
};

interface CompactSignalProps {
  label: ReactNode;
  sublabel?: ReactNode;
  confidence: number;
  toneClass: string;
  pulse?: boolean;
  stats?: ReactNode;
  /** Override the default ENTRY label (e.g. MATCH NOW) */
  actionLabel?: string;
}

/** One-line prediction: badge + action + confidence + optional stats */
export const CompactSignal = ({
  label,
  sublabel,
  confidence,
  toneClass,
  pulse,
  stats,
  actionLabel = 'ENTRY',
}: CompactSignalProps) => (
  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap sm:flex-nowrap">
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'relative h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1 shadow-lg text-white shrink-0',
        toneClass,
        pulse && 'animate-pulse'
      )}
    >
      {/* Soft glow ring pulsing toward the digit */}
      <span className="pointer-events-none absolute inset-0 rounded-full bg-white/10 animate-ping opacity-40" />
      <span className="relative text-sm sm:text-base font-black tracking-wide leading-none">{label}</span>
      {sublabel != null && (
        <span className="relative text-sm sm:text-base font-black leading-none opacity-90">{sublabel}</span>
      )}
    </motion.div>

    <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-even shrink-0">
      <span>{actionLabel}</span>
      <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center">
        <span className="w-1 h-1 bg-white rounded-full" />
      </span>
      <span className="text-muted-foreground font-semibold">{confidence}%</span>
    </div>

    {stats && (
      <div className="min-w-0 flex-1 flex items-center justify-end overflow-hidden">
        {stats}
      </div>
    )}
  </div>
);

/** Animated callout: flow into glowing digit → MATCH NOW → Entry digit N */
export const MatchNowBanner = ({ digit }: { digit: number }) => (
  <div className="relative overflow-hidden rounded-md border border-match/35 bg-match/10 px-2 py-1.5">
    {/* Flow streaks toward the digit */}
    <div className="pointer-events-none absolute inset-y-0 left-0 right-16 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 h-0.5 w-8 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-match to-match/80"
          initial={{ left: '-10%', opacity: 0 }}
          animate={{ left: ['0%', '85%'], opacity: [0, 1, 0] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.35,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>

    <div className="relative flex items-center gap-2 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <motion.span
          className="text-[11px] sm:text-xs font-black tracking-wider text-match uppercase"
          animate={{ opacity: [0.55, 1, 0.55], x: [0, 3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          Match now
        </motion.span>
        <motion.span
          className="text-match/80 text-xs"
          animate={{ x: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          →
        </motion.span>
        <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
          Entry digit
        </span>
      </div>

      <motion.div
        className="relative shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-match to-orange-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-match/40"
        animate={{
          scale: [1, 1.12, 1],
          boxShadow: [
            '0 0 0 0 rgba(249, 115, 22, 0.55)',
            '0 0 0 10px rgba(249, 115, 22, 0)',
            '0 0 0 0 rgba(249, 115, 22, 0)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
      >
        {digit}
      </motion.div>
    </div>
  </div>
);

interface LiveDigit {
  digit: number;
  epoch: number;
  isNewest?: boolean;
  highlight?: boolean;
  className?: string;
}

interface LiveDigitsRowProps {
  digits: LiveDigit[];
  symbol: string;
  title?: string;
  cycleId?: number;
  compact?: boolean;
}

const VISIBLE_WINDOW = 14;
const SLIDE_PX = 28;

export const LiveDigitsRow = ({
  digits,
  symbol,
  cycleId = 0,
  compact = true,
}: LiveDigitsRowProps) => {
  const visible = digits.slice(-VISIBLE_WINDOW);
  const newestEpoch = digits.length ? digits[digits.length - 1].epoch : 0;

  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', compact && 'h-7')}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-even opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-even" />
      </span>
      <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
        {digits.length}
      </span>

      <div className="relative flex-1 min-w-0 h-7 overflow-hidden rounded-md border border-border/40 bg-muted/20">
        <motion.div
          key={`${cycleId}-${newestEpoch}`}
          className="flex h-full items-center gap-1 px-1.5"
          initial={{ x: SLIDE_PX }}
          animate={{ x: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {visible.map(({ digit, epoch, isNewest, highlight, className }) => (
            <div
              key={`${symbol}-${epoch}`}
              className={cn(
                'w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded flex items-center justify-center text-[10px] sm:text-[11px] font-bold border',
                highlight
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-background/90 text-muted-foreground border-border/60',
                isNewest && 'ring-1 ring-primary/70',
                className
              )}
            >
              {digit}
            </div>
          ))}
          {digits.length === 0 && (
            <span className="text-[10px] text-muted-foreground px-1">Waiting…</span>
          )}
        </motion.div>
      </div>
    </div>
  );
};

interface AnalyzingStateProps {
  countdown: number;
  collectedCount?: number;
  scanDuration?: number;
  accentClass?: string;
}

export const AnalyzingState = ({
  countdown,
  collectedCount = 0,
  scanDuration = 15,
}: AnalyzingStateProps) => {
  const gradId = useId().replace(/:/g, '');
  const progress = Math.min(1, Math.max(0, 1 - countdown / Math.max(scanDuration, 1)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-3 sm:gap-4 min-h-[3.25rem]">
      <div className="relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] shrink-0">
        <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
            opacity="0.45"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={countdown}
            initial={{ scale: 1.35, opacity: 0.35, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="text-2xl sm:text-3xl font-black font-mono leading-none tabular-nums text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.55)]"
          >
            {countdown}
          </motion.span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground -mt-0.5">
            sec
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-foreground">SCANNING</span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {collectedCount} ticks · {scanDuration}s window
        </div>
      </div>
    </div>
  );
};

/** @deprecated kept for any leftover imports */
export const PredictionOrb = CompactSignal;
export const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('rounded-lg border border-border/50 bg-muted/10 p-2', className)}>{children}</div>
);

export const signalsGridClass =
  'grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5';
