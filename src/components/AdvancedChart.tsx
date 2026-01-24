import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { CandlestickData } from '@/hooks/useDerivWebSocket';

interface Tick {
  epoch: number;
  quote: number;
  symbol: string;
}

interface AdvancedChartProps {
  ticks: Tick[];
  candles?: CandlestickData[];
  height?: number;
  showEMA?: boolean;
  showHeatmap?: boolean;
}

interface EMAData {
  timestamp: number;
  ema50: number;
  ema20: number;
}

export const AdvancedChart = ({ 
  ticks, 
  candles = [],
  height = 200, 
  showEMA = true, 
  showHeatmap = false 
}: AdvancedChartProps) => {
  
  // Use real candlestick data from Deriv if available, otherwise fallback to tick-based candles
  const candlestickData = useMemo(() => {
    // Prefer real candle data from Deriv
    if (candles && candles.length > 0) {
      return candles;
    }
    
    // Fallback: Convert ticks to candlestick data (group by time periods)
    if (ticks.length < 4) return [];
    
    const groupSize = Math.max(1, Math.floor(ticks.length / 20)); // Create ~20 candles
    const mockCandles: CandlestickData[] = [];
    
    for (let i = 0; i < ticks.length; i += groupSize) {
      const group = ticks.slice(i, i + groupSize);
      if (group.length === 0) continue;
      
      const open = group[0].quote;
      const close = group[group.length - 1].quote;
      const high = Math.max(...group.map(t => t.quote));
      const low = Math.min(...group.map(t => t.quote));
      
      mockCandles.push({
        timestamp: group[0].epoch,
        open,
        high,
        low,
        close
      });
    }
    
    return mockCandles;
  }, [ticks, candles]);

  // Calculate EMA values using candle close prices
  const emaData = useMemo(() => {
    const dataSource = candlestickData.length > 0 ? candlestickData : ticks;
    if (dataSource.length < 20) return []; // Need at least 20 data points
    
    // Extract prices (use close prices for candles, quote for ticks)
    const prices = dataSource.map(item => 
      'close' in item ? item.close : item.quote
    );
    
    // EMA calculation
    const calculateEMA = (prices: number[], period: number) => {
      const k = 2 / (period + 1);
      const emaArray: number[] = [];
      
      // Start with SMA for first value
      let sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
      emaArray.push(sma);
      
      // Calculate EMA for remaining values
      for (let i = period; i < prices.length; i++) {
        const ema = (prices[i] * k) + (emaArray[emaArray.length - 1] * (1 - k));
        emaArray.push(ema);
      }
      
      return emaArray;
    };
    
    const ema10 = calculateEMA(prices, 10);
    const ema20 = calculateEMA(prices, 20);
    const emaResults: EMAData[] = [];
    
    // Combine EMA data with timestamps
    for (let i = 19; i < dataSource.length; i++) { // Start from index 19 (20th data point)
      const timestamp = 'timestamp' in dataSource[i] ? dataSource[i].timestamp : dataSource[i].epoch;
      emaResults.push({
        timestamp,
        ema20: ema10[i - 19] || 0, // This is actually EMA10 now
        ema50: ema20[i - 19] || 0  // This is actually EMA20 now
      });
    }
    
    return emaResults;
  }, [candlestickData, ticks]);

  // Calculate price range for scaling
  const priceRange = useMemo(() => {
    if (candlestickData.length === 0 && ticks.length === 0) return { min: 0, max: 1 };
    
    let prices: number[] = [];
    
    if (candlestickData.length > 0) {
      // Use OHLC data for better range calculation
      candlestickData.forEach(candle => {
        prices.push(candle.open, candle.high, candle.low, candle.close);
      });
    } else {
      prices = ticks.map(t => t.quote);
    }
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1; // 10% padding
    
    return {
      min: min - padding,
      max: max + padding
    };
  }, [candlestickData, ticks]);

  // Scale price to chart coordinates
  const scalePrice = (price: number) => {
    const { min, max } = priceRange;
    return height - ((price - min) / (max - min)) * height;
  };

  // Generate heatmap data for digit frequency
  const heatmapData = useMemo(() => {
    if (!showHeatmap) return [];
    
    const digitFreq: Record<number, number> = {};
    const recentTicks = ticks.slice(-15); // Use last 15 ticks
    
    recentTicks.forEach(tick => {
      const lastDigit = parseInt(tick.quote.toFixed(4).slice(-1));
      digitFreq[lastDigit] = (digitFreq[lastDigit] || 0) + 1;
    });
    
    const maxFreq = Math.max(...Object.values(digitFreq));
    
    return Array.from({ length: 10 }, (_, digit) => ({
      digit,
      frequency: digitFreq[digit] || 0,
      intensity: maxFreq > 0 ? (digitFreq[digit] || 0) / maxFreq : 0
    }));
  }, [ticks, showHeatmap]);

  // Current trend analysis
  const trendAnalysis = useMemo(() => {
    if (emaData.length < 2) return { trend: 'neutral', strength: 0 };
    
    const latest = emaData[emaData.length - 1];
    const previous = emaData[emaData.length - 2];
    
    const ema20Trend = latest.ema20 > previous.ema20 ? 'up' : 'down';
    const ema50Trend = latest.ema50 > previous.ema50 ? 'up' : 'down';
    const crossover = latest.ema20 > latest.ema50 ? 'bullish' : 'bearish';
    
    const strength = Math.abs(latest.ema20 - latest.ema50) / latest.ema50 * 100;
    
    return {
      trend: ema20Trend === ema50Trend ? ema20Trend : 'neutral',
      crossover,
      strength: Math.min(strength, 100)
    };
  }, [emaData]);

  if (candlestickData.length === 0 && ticks.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Activity className="w-6 h-6 mr-2" />
        <span>Waiting for market data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data Source Indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {candlestickData.length > 0 && candles.length > 0 
            ? `Real Deriv Candles (${candlestickData.length})` 
            : `Tick-based Candles (${candlestickData.length})`
          }
        </span>
        <span>1-minute timeframe</span>
      </div>

      {/* Trend Indicator */}
      {showEMA && emaData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-muted/30"
        >
          <div className="flex items-center gap-2">
            {trendAnalysis.trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : trendAnalysis.trend === 'down' ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Activity className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">
              Trend: {trendAnalysis.crossover === 'bullish' ? 'Bullish' : 'Bearish'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-500 rounded"></div>
              <span>EMA10</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-500 rounded"></div>
              <span>EMA20</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Chart */}
      <div className="relative bg-muted/10 rounded-lg border border-muted/30 overflow-hidden">
        <svg width="100%" height={height} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Candlesticks */}
          {candlestickData.map((candle, index) => {
            const x = (index / candlestickData.length) * 100;
            const openY = scalePrice(candle.open);
            const closeY = scalePrice(candle.close);
            const highY = scalePrice(candle.high);
            const lowY = scalePrice(candle.low);
            
            const isGreen = candle.close > candle.open;
            const bodyHeight = Math.abs(closeY - openY);
            const bodyY = Math.min(openY, closeY);
            
            return (
              <g key={`${candle.timestamp}-${index}`}>
                {/* Wick */}
                <line
                  x1={`${x}%`}
                  y1={highY}
                  x2={`${x}%`}
                  y2={lowY}
                  stroke={isGreen ? '#10b981' : '#ef4444'}
                  strokeWidth="1"
                  opacity="0.8"
                />
                {/* Body */}
                <rect
                  x={`${x - 0.8}%`}
                  y={bodyY}
                  width="1.6%"
                  height={Math.max(bodyHeight, 1)}
                  fill={isGreen ? '#10b981' : '#ef4444'}
                  opacity="0.8"
                />
              </g>
            );
          })}
          
          {/* EMA Lines */}
          {showEMA && emaData.length > 1 && (
            <>
              {/* EMA 10 (Green) */}
              <path
                d={emaData.map((point, index) => {
                  const x = (index / (emaData.length - 1)) * 100;
                  const y = scalePrice(point.ema20);
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                opacity="0.8"
              />
              
              {/* EMA 20 (Red) */}
              <path
                d={emaData.map((point, index) => {
                  const x = (index / (emaData.length - 1)) * 100;
                  const y = scalePrice(point.ema50);
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                opacity="0.8"
              />
            </>
          )}
        </svg>
        
        {/* Price labels */}
        <div className="absolute top-2 right-2 text-xs space-y-1">
          <div className="bg-background/80 backdrop-blur-sm rounded px-2 py-1">
            Current: {candlestickData.length > 0 
              ? candlestickData[candlestickData.length - 1]?.close.toFixed(4)
              : ticks[ticks.length - 1]?.quote.toFixed(4)
            }
          </div>
          {showEMA && emaData.length > 0 && (
            <>
              <div className="bg-green-500/20 backdrop-blur-sm rounded px-2 py-1 text-green-400">
                EMA10: {emaData[emaData.length - 1]?.ema20.toFixed(4)}
              </div>
              <div className="bg-red-500/20 backdrop-blur-sm rounded px-2 py-1 text-red-400">
                EMA20: {emaData[emaData.length - 1]?.ema50.toFixed(4)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Heatmap */}
      {showHeatmap && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h4 className="text-sm font-medium text-muted-foreground">Digit Frequency Heatmap (Last 15 ticks)</h4>
          <div className="grid grid-cols-10 gap-1">
            {heatmapData.map(({ digit, frequency, intensity }) => (
              <div
                key={digit}
                className="aspect-square rounded flex flex-col items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8})`,
                  color: intensity > 0.5 ? 'white' : 'currentColor'
                }}
              >
                <div>{digit}</div>
                <div className="text-[10px] opacity-80">{frequency}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};