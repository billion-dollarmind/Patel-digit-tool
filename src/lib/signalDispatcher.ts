import {
  analyzeEvenOdd,
  analyzeOverUnder,
  analyzeDigitMatch,
  calculateRecommendedRuns,
  Tick,
} from '@/utils/predictions';
import type { DigitContractType } from '@/lib/derivTrading';

export type SignalKind = 'even_odd' | 'over_under' | 'digit_match' | 'rise_fall';
export type StrategyMode = 'EVEN_ODD' | 'OVER_UNDER' | 'DIGIT_MATCH' | 'AUTOSWITCH';
export type ConnectedAppId = 'speedbot' | 'accumulators' | 'bot_builder';

export interface DispatchedSignal {
  id: string;
  kind: SignalKind;
  symbol: string;
  direction: string;
  confidence: number;
  contractType: DigitContractType;
  barrier?: string | number;
  recommendedRuns: number;
  timestamp: number;
  strategyMode: StrategyMode;
  targetApps: ConnectedAppId[];
}

export type SignalListener = (signal: DispatchedSignal) => void;

const CHANNEL = 'patel-signal-dispatch';

class SignalDispatcher {
  private listeners = new Set<SignalListener>();
  private recent: DispatchedSignal[] = [];

  subscribe(listener: SignalListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecent(limit = 40) {
    return this.recent.slice(0, limit);
  }

  dispatch(signal: DispatchedSignal) {
    this.recent = [signal, ...this.recent].slice(0, 100);
    this.listeners.forEach((l) => {
      try {
        l(signal);
      } catch (err) {
        console.error('Signal listener error', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHANNEL, { detail: signal }));
    }
  }

  clear() {
    this.recent = [];
  }
}

export const signalDispatcher = new SignalDispatcher();

export const DEFAULT_ENGINE_SYMBOLS = [
  'R_10',
  'R_25',
  'R_50',
  'R_75',
  'R_100',
  '1HZ10V',
  '1HZ25V',
  '1HZ50V',
  '1HZ75V',
  '1HZ100V',
];

export const CONNECTED_APPS: {
  id: ConnectedAppId;
  name: string;
  description: string;
  route: string;
}[] = [
  {
    id: 'speedbot',
    name: 'Speed Bot',
    description: 'Fast Even/Odd auto-entries from dispatched signals.',
    route: '/apps/speedbot',
  },
  {
    id: 'accumulators',
    name: 'Accumulators',
    description: 'Growth-rate accumulator entries when engine confidence is high.',
    route: '/apps/accumulators',
  },
  {
    id: 'bot_builder',
    name: 'Bot Builder',
    description: 'Map signal kinds to contract types and fire on dispatch.',
    route: '/apps/bot-builder',
  },
];

let switchCursor = 0;

export function pickKindForMode(mode: StrategyMode): SignalKind {
  if (mode === 'EVEN_ODD') return 'even_odd';
  if (mode === 'OVER_UNDER') return 'over_under';
  if (mode === 'DIGIT_MATCH') return 'digit_match';
  const cycle: SignalKind[] = ['even_odd', 'over_under', 'digit_match'];
  const kind = cycle[switchCursor % cycle.length];
  switchCursor += 1;
  return kind;
}

export function buildSignalFromTicks(
  ticks: Tick[],
  symbol: string,
  kind: SignalKind,
  strategyMode: StrategyMode,
  targetApps: ConnectedAppId[]
): DispatchedSignal | null {
  if (!ticks || ticks.length < 8) return null;

  if (kind === 'even_odd') {
    const result = analyzeEvenOdd(ticks);
    if (!result) return null;
    return {
      id: `${symbol}-${Date.now()}-eo`,
      kind,
      symbol,
      direction: result.prediction,
      confidence: result.confidence,
      contractType: result.prediction === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD',
      recommendedRuns: calculateRecommendedRuns(result.confidence),
      timestamp: Date.now(),
      strategyMode,
      targetApps,
    };
  }

  if (kind === 'over_under') {
    const result = analyzeOverUnder(ticks);
    if (!result) return null;
    return {
      id: `${symbol}-${Date.now()}-ou`,
      kind,
      symbol,
      direction: result.prediction,
      confidence: result.confidence,
      contractType: result.prediction === 'OVER' ? 'DIGITOVER' : 'DIGITUNDER',
      barrier: result.prediction === 'OVER' ? '4' : '5',
      recommendedRuns: result.recommendedRuns,
      timestamp: Date.now(),
      strategyMode,
      targetApps,
    };
  }

  if (kind === 'digit_match') {
    const result = analyzeDigitMatch(ticks);
    if (!result) return null;
    return {
      id: `${symbol}-${Date.now()}-dm`,
      kind,
      symbol,
      direction: String(result.prediction),
      confidence: result.confidence,
      contractType: 'DIGITMATCH',
      barrier: result.prediction,
      recommendedRuns: calculateRecommendedRuns(result.confidence),
      timestamp: Date.now(),
      strategyMode,
      targetApps,
    };
  }

  // rise_fall — last tick vs previous
  if (ticks.length < 2) return null;
  const last = ticks[ticks.length - 1].quote;
  const prev = ticks[ticks.length - 2].quote;
  const up = last >= prev;
  return {
    id: `${symbol}-${Date.now()}-rf`,
    kind: 'rise_fall',
    symbol,
    direction: up ? 'RISE' : 'FALL',
    confidence: 60,
    contractType: up ? 'CALL' : 'PUT',
    recommendedRuns: 5,
    timestamp: Date.now(),
    strategyMode,
    targetApps,
  };
}
