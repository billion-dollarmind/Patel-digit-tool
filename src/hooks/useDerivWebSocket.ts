import { useState, useEffect, useRef, useCallback } from 'react';
import { Tick } from '@/utils/predictions';
import { DERIV_WS_URL } from '@/lib/derivConfig';

export const MARKET_SYMBOLS = [
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
] as const;

const SYMBOLS = [...MARKET_SYMBOLS];
const MAX_TICKS = 1000;
const MAX_CANDLES = 100;
const PING_MS = 30000;
const RECONNECT_MS = 3000;
const DEMO_FALLBACK_AFTER_MS = 8000;
const SUBSCRIBE_STAGGER_MS = 120;

const WS_CANDIDATES = [
  DERIV_WS_URL,
  'wss://ws.derivws.com/websockets/v3?app_id=1089',
  'wss://green.derivws.com/websockets/v3?app_id=1089',
  'wss://ws.binaryws.com/websockets/v3?app_id=1089',
];

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SymbolData {
  ticks: Tick[];
  candles: CandlestickData[];
  isConnected: boolean;
}

export type FeedMode = 'connecting' | 'live' | 'demo';

const emptySymbolData = (): SymbolData => ({
  ticks: [],
  candles: [],
  isConnected: false,
});

const initialTickData = (): Record<string, SymbolData> => {
  const initial: Record<string, SymbolData> = {};
  SYMBOLS.forEach((symbol) => {
    initial[symbol] = emptySymbolData();
  });
  return initial;
};

const basePriceFor = (symbol: string): number => {
  const map: Record<string, number> = {
    R_10: 6200,
    R_25: 8500,
    R_50: 240,
    R_75: 1800,
    R_100: 1200,
    '1HZ10V': 6200,
    '1HZ25V': 8500,
    '1HZ50V': 240,
    '1HZ75V': 1800,
    '1HZ100V': 1200,
  };
  return map[symbol] ?? 1000;
};

const tickIntervalMs = (symbol: string) => (symbol.startsWith('1HZ') ? 1000 : 2000);

const appendTick = (prev: SymbolData, tick: Tick): SymbolData => {
  const ticks = [...prev.ticks, tick];
  if (ticks.length > MAX_TICKS) ticks.splice(0, ticks.length - MAX_TICKS);
  return { ...prev, ticks, isConnected: true };
};

const seedDemoHistory = (symbol: string, count = 40): Tick[] => {
  const ticks: Tick[] = [];
  let quote = basePriceFor(symbol);
  const now = Math.floor(Date.now() / 1000);
  const stepSec = tickIntervalMs(symbol) / 1000;
  for (let i = count; i > 0; i--) {
    quote = Math.max(1, quote + (Math.random() - 0.5) * (quote * 0.0008));
    // Nudge last digit variety via tiny noise on 2nd decimal
    quote = Number((quote + (Math.random() - 0.5) * 0.01).toFixed(5));
    ticks.push({ epoch: now - Math.floor(i * stepSec), quote, symbol });
  }
  return ticks;
};

/**
 * Shared Deriv market feed.
 * - One WebSocket for the whole app (via DerivMarketProvider)
 * - Staggered subscribe to avoid rate limits
 * - Demo tick simulator if live feed cannot connect
 */
export const useDerivWebSocket = () => {
  const [tickData, setTickData] = useState<Record<string, SymbolData>>(initialTickData);
  const [isConnected, setIsConnected] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const demoIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const subscribeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const urlIndexRef = useRef(0);
  const aliveRef = useRef(true);
  const gotLiveDataRef = useRef(false);
  const demoActiveRef = useRef(false);
  const lastQuotesRef = useRef<Record<string, number>>({});

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    subscribeTimersRef.current.forEach(clearTimeout);
    subscribeTimersRef.current = [];
    demoIntervalRef.current = undefined;
    pingIntervalRef.current = undefined;
    reconnectTimeoutRef.current = undefined;
  }, []);

  const stopDemoFeed = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = undefined;
    }
    demoActiveRef.current = false;
  }, []);

  const startDemoFeed = useCallback(() => {
    if (demoActiveRef.current || !aliveRef.current) return;
    demoActiveRef.current = true;
    gotLiveDataRef.current = false;
    setIsConnected(true);
    setFeedMode('demo');

    setTickData((prev) => {
      const next = { ...prev };
      SYMBOLS.forEach((symbol) => {
        const seeded = seedDemoHistory(symbol);
        lastQuotesRef.current[symbol] = seeded[seeded.length - 1]?.quote ?? basePriceFor(symbol);
        next[symbol] = {
          ticks: seeded,
          candles: prev[symbol]?.candles || [],
          isConnected: true,
        };
      });
      return next;
    });

    // Drive ~1Hz / ~0.5Hz ticks depending on symbol class
    demoIntervalRef.current = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      setTickData((prev) => {
        const next = { ...prev };
        SYMBOLS.forEach((symbol) => {
          const intervalSec = tickIntervalMs(symbol) / 1000;
          // Emit on matching second buckets so 2s symbols don't fire every 1s
          if (now % intervalSec !== 0) return;
          const prevQuote = lastQuotesRef.current[symbol] ?? basePriceFor(symbol);
          const quote = Number(
            Math.max(1, prevQuote + (Math.random() - 0.5) * (prevQuote * 0.0008) + (Math.random() - 0.5) * 0.02).toFixed(5)
          );
          lastQuotesRef.current[symbol] = quote;
          next[symbol] = appendTick(next[symbol] || emptySymbolData(), { epoch: now, quote, symbol });
        });
        return next;
      });
    }, 1000);
  }, []);

  const subscribeSymbol = useCallback((ws: WebSocket, symbol: string) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        ticks_history: symbol,
        count: MAX_TICKS,
        end: 'latest',
        style: 'ticks',
      })
    );
    ws.send(
      JSON.stringify({
        ticks_history: symbol,
        count: MAX_CANDLES,
        end: 'latest',
        style: 'candles',
        granularity: 60,
      })
    );
    ws.send(
      JSON.stringify({
        ticks: symbol,
        subscribe: 1,
      })
    );
  }, []);

  const connect = useCallback(() => {
    if (!aliveRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    clearTimers();
    setFeedMode((m) => (m === 'demo' ? m : 'connecting'));

    const url = WS_CANDIDATES[urlIndexRef.current % WS_CANDIDATES.length];
    let opened = false;

    // If live feed never opens, fall back to demo so the UI can still produce signals
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!aliveRef.current || gotLiveDataRef.current || demoActiveRef.current) return;
      if (!opened) {
        try {
          wsRef.current?.close();
        } catch {
          /* ignore */
        }
        startDemoFeed();
      }
    }, DEMO_FALLBACK_AFTER_MS);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        opened = true;
        if (!aliveRef.current) {
          ws.close();
          return;
        }
        stopDemoFeed();
        setIsConnected(true);
        setFeedMode('live');

        SYMBOLS.forEach((symbol, index) => {
          const timer = setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) subscribeSymbol(ws, symbol);
          }, index * SUBSCRIBE_STAGGER_MS);
          subscribeTimersRef.current.push(timer);
        });

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ ping: 1 }));
          }
        }, PING_MS);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.error) {
            console.warn('Deriv API error:', data.error);
            return;
          }

          // Historical ticks
          if (data.history?.prices && data.history?.times && data.echo_req?.style !== 'candles') {
            const symbol = data.echo_req?.ticks_history as string | undefined;
            if (!symbol) return;
            gotLiveDataRef.current = true;
            stopDemoFeed();
            setFeedMode('live');

            const historicalTicks: Tick[] = data.history.prices.map((price: number, index: number) => ({
              epoch: data.history.times[index],
              quote: Number(price),
              symbol,
            }));
            lastQuotesRef.current[symbol] = historicalTicks[historicalTicks.length - 1]?.quote ?? basePriceFor(symbol);

            setTickData((prev) => ({
              ...prev,
              [symbol]: {
                ...prev[symbol],
                ticks: historicalTicks.slice(-MAX_TICKS),
                isConnected: true,
              },
            }));
            return;
          }

          // Historical candles (Deriv returns `candles` array, not history.prices)
          if (Array.isArray(data.candles) && data.echo_req?.ticks_history) {
            const symbol = data.echo_req.ticks_history as string;
            const historicalCandles: CandlestickData[] = data.candles.map(
              (c: { epoch: number; open: number | string; high: number | string; low: number | string; close: number | string }) => ({
                timestamp: c.epoch,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
              })
            );
            setTickData((prev) => ({
              ...prev,
              [symbol]: {
                ...prev[symbol],
                candles: historicalCandles.slice(-MAX_CANDLES),
                isConnected: true,
              },
            }));
            return;
          }

          // Live tick
          if (data.tick?.quote != null && data.tick?.symbol) {
            const { symbol, quote, epoch } = data.tick as { symbol: string; quote: number; epoch: number };
            gotLiveDataRef.current = true;
            stopDemoFeed();
            setFeedMode('live');
            lastQuotesRef.current[symbol] = Number(quote);

            setTickData((prev) => ({
              ...prev,
              [symbol]: appendTick(prev[symbol] || emptySymbolData(), {
                epoch,
                quote: Number(quote),
                symbol,
              }),
            }));
            return;
          }

          // Live OHLC candle stream
          if (data.ohlc) {
            const ohlc = data.ohlc as {
              symbol: string;
              open: string | number;
              high: string | number;
              low: string | number;
              close: string | number;
              open_time: number;
            };
            const newCandle: CandlestickData = {
              timestamp: ohlc.open_time,
              open: Number(ohlc.open),
              high: Number(ohlc.high),
              low: Number(ohlc.low),
              close: Number(ohlc.close),
            };
            setTickData((prev) => {
              const symbolData = prev[ohlc.symbol] || emptySymbolData();
              const candles = [...symbolData.candles];
              if (candles.length && Math.abs(candles[candles.length - 1].timestamp - newCandle.timestamp) < 60) {
                candles[candles.length - 1] = newCandle;
              } else {
                candles.push(newCandle);
                if (candles.length > MAX_CANDLES) candles.shift();
              }
              return {
                ...prev,
                [ohlc.symbol]: { ...symbolData, candles, isConnected: true },
              };
            });
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setIsConnected(demoActiveRef.current);
      };

      ws.onclose = () => {
        setIsConnected(demoActiveRef.current);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        if (!aliveRef.current) return;

        // Rotate endpoint and retry; keep demo running meanwhile
        urlIndexRef.current += 1;
        if (!gotLiveDataRef.current) {
          startDemoFeed();
        } else {
          setFeedMode('connecting');
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          if (aliveRef.current) connect();
        }, RECONNECT_MS);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      startDemoFeed();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (aliveRef.current) connect();
      }, RECONNECT_MS);
    }
  }, [clearTimers, startDemoFeed, stopDemoFeed, subscribeSymbol]);

  useEffect(() => {
    aliveRef.current = true;
    connect();

    return () => {
      aliveRef.current = false;
      clearTimers();
      stopDemoFeed();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [clearTimers, connect, stopDemoFeed]);

  const disconnect = useCallback(() => {
    aliveRef.current = false;
    clearTimers();
    stopDemoFeed();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setFeedMode('connecting');
  }, [clearTimers, stopDemoFeed]);

  const reconnect = useCallback(() => {
    aliveRef.current = true;
    gotLiveDataRef.current = false;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  return {
    tickData,
    isConnected,
    feedMode,
    symbols: SYMBOLS,
    connect: reconnect,
    disconnect,
  };
};
