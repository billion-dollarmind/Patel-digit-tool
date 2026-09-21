import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Tick, estimateRecommendedRuns, getSignalHoldSeconds } from '@/utils/predictions';

const SCAN_MIN = 8;
const SCAN_SPAN = 15; // 8–22s scan windows stay staggered

type CyclePhase = 'collecting' | 'signal';

interface SignalCycleState {
  phase: CyclePhase;
  countdown: number;
  signalTicks: Tick[];
  scanDuration: number;
  signalDuration: number;
  recommendedRuns: number;
}

const hashSeed = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
};

const pickScanDuration = (symbol: string, cycleId: number) => {
  const h = hashSeed(`${symbol}|${cycleId}|scan`);
  return SCAN_MIN + (h % (SCAN_SPAN + 1));
};

/** Small extra stagger so markets still finish at different times */
const pickStaggerSeconds = (symbol: string, cycleId: number) => {
  const h = hashSeed(`${symbol}|${cycleId}|hold`);
  return h % 8; // 0–7s
};

const pickStartOffsetMs = (symbol: string) => {
  const h = hashSeed(`${symbol}|boot`);
  return (h % 11) * 1000; // 0–10s
};

export const useSignalCycle = (ticks: Tick[], symbol = 'default') => {
  const bootOffset = useMemo(() => pickStartOffsetMs(symbol), [symbol]);
  const initialScan = useMemo(() => pickScanDuration(symbol, 0), [symbol]);

  const [state, setState] = useState<SignalCycleState>(() => {
    const elapsedSec = Math.floor(bootOffset / 1000);
    const remaining = Math.max(1, initialScan - (elapsedSec % initialScan));
    return {
      phase: 'collecting',
      countdown: remaining,
      signalTicks: [],
      scanDuration: initialScan,
      signalDuration: getSignalHoldSeconds(8),
      recommendedRuns: 8,
    };
  });
  const [cycleId, setCycleId] = useState(0);

  const cycleStartRef = useRef<number>(Date.now() - (initialScan - state.countdown) * 1000);
  const streamStartEpochRef = useRef<number | null>(null);
  const scanDurationRef = useRef(initialScan);
  const signalDurationRef = useRef(getSignalHoldSeconds(8));
  const cycleIdRef = useRef(0);
  const ticksRef = useRef(ticks);
  ticksRef.current = ticks;

  useEffect(() => {
    if (streamStartEpochRef.current == null && ticks.length > 0) {
      streamStartEpochRef.current = ticks[ticks.length - 1].epoch;
    }
  }, [ticks]);

  const startNewCycle = useCallback(() => {
    cycleIdRef.current += 1;
    const nextCycle = cycleIdRef.current;
    const scanDuration = pickScanDuration(symbol, nextCycle);
    scanDurationRef.current = scanDuration;

    const latest = ticksRef.current;
    streamStartEpochRef.current = latest.length
      ? latest[latest.length - 1].epoch
      : Math.floor(Date.now() / 1000);
    cycleStartRef.current = Date.now();
    setCycleId(nextCycle);
    setState({
      phase: 'collecting',
      countdown: scanDuration,
      signalTicks: [],
      scanDuration,
      signalDuration: signalDurationRef.current,
      recommendedRuns: 8,
    });
  }, [symbol]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - cycleStartRef.current) / 1000);
      const currentTicks = ticksRef.current;

      if (state.phase === 'collecting') {
        const duration = scanDurationRef.current;
        const remaining = duration - elapsed;

        if (remaining <= 0) {
          const baseline = streamStartEpochRef.current ?? 0;
          const scanned = currentTicks.filter((t) => t.epoch > baseline);
          const captured = (scanned.length >= 5 ? scanned : currentTicks.slice(-15)).slice(-30);

          streamStartEpochRef.current = captured.length
            ? captured[0].epoch - 1
            : streamStartEpochRef.current;

          const runs = estimateRecommendedRuns(captured);
          const stagger = pickStaggerSeconds(symbol, cycleIdRef.current);
          const signalDuration = getSignalHoldSeconds(runs, stagger);
          signalDurationRef.current = signalDuration;

          cycleStartRef.current = Date.now();
          cycleIdRef.current += 1;
          setCycleId(cycleIdRef.current);
          setState({
            phase: 'signal',
            countdown: signalDuration,
            signalTicks: captured,
            scanDuration: scanDurationRef.current,
            signalDuration,
            recommendedRuns: runs,
          });
        } else if (remaining !== state.countdown) {
          setState((prev) => ({ ...prev, countdown: remaining }));
        }
      } else {
        const duration = signalDurationRef.current;
        const remaining = duration - elapsed;

        if (remaining <= 0) {
          startNewCycle();
        } else if (remaining !== state.countdown) {
          setState((prev) => ({ ...prev, countdown: remaining }));
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [state.phase, state.countdown, startNewCycle, symbol]);

  const liveCycleTicks = useMemo(() => {
    const baseline = streamStartEpochRef.current;
    if (baseline == null) return [];
    return ticks.filter((t) => t.epoch > baseline);
  }, [ticks, cycleId]);

  return {
    phase: state.phase,
    countdown: state.countdown,
    scanDuration: state.scanDuration,
    signalDuration: state.signalDuration,
    recommendedRuns: state.recommendedRuns,
    signalTicks: state.phase === 'signal' ? state.signalTicks : liveCycleTicks.slice(-15),
    liveCycleTicks,
    cycleId,
    collectedCount: liveCycleTicks.length,
    isReady: state.phase === 'signal' && state.signalTicks.length >= 5,
  };
};
