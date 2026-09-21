import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useDerivWebSocket } from '@/hooks/useDerivWebSocket';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import {
  buildSignalFromTicks,
  CONNECTED_APPS,
  DEFAULT_ENGINE_SYMBOLS,
  pickKindForMode,
  signalDispatcher,
  type ConnectedAppId,
  type DispatchedSignal,
  type StrategyMode,
} from '@/lib/signalDispatcher';

const ENGINE_KEY = 'patel-engine-settings';

interface EngineSettings {
  enabled: boolean;
  symbols: string[];
  strategyMode: StrategyMode;
  intervalSec: number;
  minConfidence: number;
  connectedApps: ConnectedAppId[];
}

const defaultSettings: EngineSettings = {
  enabled: false,
  symbols: DEFAULT_ENGINE_SYMBOLS.slice(0, 5),
  strategyMode: 'AUTOSWITCH',
  intervalSec: 12,
  minConfidence: 60,
  connectedApps: ['speedbot', 'accumulators', 'bot_builder'],
};

interface SignalEngineContextValue {
  settings: EngineSettings;
  running: boolean;
  recentSignals: DispatchedSignal[];
  lastError: string | null;
  isMarketConnected: boolean;
  apps: typeof CONNECTED_APPS;
  startEngine: () => void;
  stopEngine: () => void;
  updateSettings: (patch: Partial<EngineSettings>) => void;
  toggleApp: (id: ConnectedAppId) => void;
  subscribe: (listener: (s: DispatchedSignal) => void) => () => void;
}

const SignalEngineContext = createContext<SignalEngineContextValue | null>(null);

const loadSettings = (): EngineSettings => {
  try {
    const raw = localStorage.getItem(ENGINE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
};

export const SignalEngineProvider = ({ children }: { children: ReactNode }) => {
  const { tickData, isConnected } = useDerivWebSocket();
  const { pushSignalToConnectedApps } = usePlatformAdmin();
  const [settings, setSettings] = useState<EngineSettings>(() => loadSettings());
  const [running, setRunning] = useState(false);
  const [recentSignals, setRecentSignals] = useState<DispatchedSignal[]>(() =>
    signalDispatcher.getRecent()
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const tickDataRef = useRef(tickData);
  tickDataRef.current = tickData;
  const pushRef = useRef(pushSignalToConnectedApps);
  pushRef.current = pushSignalToConnectedApps;
  const symbolCursor = useRef(0);

  useEffect(() => {
    localStorage.setItem(ENGINE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    return signalDispatcher.subscribe((signal) => {
      setRecentSignals(signalDispatcher.getRecent());
    });
  }, []);

  const scanOnce = useCallback(() => {
    const cfg = settingsRef.current;
    if (!cfg.enabled || cfg.symbols.length === 0) return;

    const symbol = cfg.symbols[symbolCursor.current % cfg.symbols.length];
    symbolCursor.current += 1;

    const ticks = tickDataRef.current[symbol]?.ticks || [];
    const kind = pickKindForMode(cfg.strategyMode);
    const signal = buildSignalFromTicks(ticks, symbol, kind, cfg.strategyMode, cfg.connectedApps);

    if (!signal) {
      setLastError(`Not enough ticks yet for ${symbol}`);
      return;
    }
    if (signal.confidence < cfg.minConfidence) {
      setLastError(`${symbol} ${signal.kind} @ ${signal.confidence}% below min ${cfg.minConfidence}%`);
      return;
    }

    setLastError(null);
    signalDispatcher.dispatch(signal);
    // Hub-style push to connected app webhooks (Applications with webhook URL)
    void pushRef.current(signal, 'signal_dispatch').catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!settings.enabled || !running) return;
    scanOnce();
    const id = window.setInterval(scanOnce, Math.max(5, settings.intervalSec) * 1000);
    return () => window.clearInterval(id);
  }, [settings.enabled, settings.intervalSec, running, scanOnce]);

  const startEngine = useCallback(() => {
    setSettings((s) => ({ ...s, enabled: true }));
    setRunning(true);
    setLastError(null);
  }, []);

  const stopEngine = useCallback(() => {
    setSettings((s) => ({ ...s, enabled: false }));
    setRunning(false);
  }, []);

  const updateSettings = useCallback((patch: Partial<EngineSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const toggleApp = useCallback((id: ConnectedAppId) => {
    setSettings((s) => {
      const has = s.connectedApps.includes(id);
      return {
        ...s,
        connectedApps: has
          ? s.connectedApps.filter((a) => a !== id)
          : [...s.connectedApps, id],
      };
    });
  }, []);

  const subscribe = useCallback((listener: (s: DispatchedSignal) => void) => {
    return signalDispatcher.subscribe(listener);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      running: running && settings.enabled,
      recentSignals,
      lastError,
      isMarketConnected: isConnected,
      apps: CONNECTED_APPS,
      startEngine,
      stopEngine,
      updateSettings,
      toggleApp,
      subscribe,
    }),
    [
      settings,
      running,
      recentSignals,
      lastError,
      isConnected,
      startEngine,
      stopEngine,
      updateSettings,
      toggleApp,
      subscribe,
    ]
  );

  return <SignalEngineContext.Provider value={value}>{children}</SignalEngineContext.Provider>;
};

export const useSignalEngine = () => {
  const ctx = useContext(SignalEngineContext);
  if (!ctx) throw new Error('useSignalEngine must be used within SignalEngineProvider');
  return ctx;
};
