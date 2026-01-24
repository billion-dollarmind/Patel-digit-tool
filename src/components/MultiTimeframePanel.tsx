import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { TimeframeResult, ConsensusResult } from '@/hooks/useMultiTimeframeAnalysis';

interface MultiTimeframePanelProps {
  timeframeResults: TimeframeResult[];
  consensus: ConsensusResult | null;
  analysisType: 'evenOdd' | 'overUnder' | 'digitMatch';
}

const getSignalIcon = (signal: ConsensusResult['signal']) => {
  switch (signal) {
    case 'STRONG_BUY':
      return <CheckCircle className="w-5 h-5 text-even" />;
    case 'BUY':
      return <TrendingUp className="w-5 h-5 text-even" />;
    case 'NEUTRAL':
      return <Minus className="w-5 h-5 text-muted-foreground" />;
    case 'SELL':
      return <TrendingDown className="w-5 h-5 text-destructive" />;
    case 'STRONG_SELL':
      return <XCircle className="w-5 h-5 text-destructive" />;
    default:
      return <Minus className="w-5 h-5 text-muted-foreground" />;
  }
};

const getSignalColor = (signal: ConsensusResult['signal']) => {
  switch (signal) {
    case 'STRONG_BUY':
      return 'text-even border-even/30 bg-even/10';
    case 'BUY':
      return 'text-even border-even/20 bg-even/5';
    case 'NEUTRAL':
      return 'text-muted-foreground border-muted/30 bg-muted/5';
    case 'SELL':
      return 'text-destructive border-destructive/20 bg-destructive/5';
    case 'STRONG_SELL':
      return 'text-destructive border-destructive/30 bg-destructive/10';
    default:
      return 'text-muted-foreground border-muted/30 bg-muted/5';
  }
};

const formatPrediction = (result: TimeframeResult, analysisType: string) => {
  if (analysisType === 'evenOdd' && result.evenOdd) {
    return result.evenOdd.prediction;
  }
  if (analysisType === 'overUnder' && result.overUnder) {
    return `${result.overUnder.prediction} ${result.overUnder.digit}`;
  }
  if (analysisType === 'digitMatch' && result.digitMatch) {
    return result.digitMatch.prediction.toString();
  }
  return 'N/A';
};

const getConfidence = (result: TimeframeResult, analysisType: string) => {
  if (analysisType === 'evenOdd' && result.evenOdd) {
    return result.evenOdd.confidence;
  }
  if (analysisType === 'overUnder' && result.overUnder) {
    return result.overUnder.confidence;
  }
  if (analysisType === 'digitMatch' && result.digitMatch) {
    return result.digitMatch.confidence;
  }
  return 0;
};

export const MultiTimeframePanel = ({ timeframeResults, consensus, analysisType }: MultiTimeframePanelProps) => {
  if (timeframeResults.length === 0) {
    return (
      <div className="rounded-xl p-4 bg-muted/10 border border-muted/30">
        <div className="text-sm font-medium text-muted-foreground mb-2">Multi-Timeframe Analysis</div>
        <div className="text-center py-4 text-muted-foreground">
          Collecting data... Need more ticks for analysis
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Consensus Signal */}
      {consensus && (
        <div className={`rounded-xl p-4 border ${getSignalColor(consensus.signal)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getSignalIcon(consensus.signal)}
              <span className="font-bold text-lg">{consensus.signal.replace('_', ' ')}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{consensus.confidence}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Agreement</div>
              <div className="font-bold">{consensus.agreement}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Lead Timeframe</div>
              <div className="font-bold">{consensus.dominantTimeframe}</div>
            </div>
          </div>

          {consensus.conflictingSignals && (
            <div className="mt-3 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Conflicting signals detected - trade with caution</span>
            </div>
          )}
        </div>
      )}

      {/* Individual Timeframe Results */}
      <div className="rounded-xl p-4 bg-muted/10 border border-muted/30">
        <div className="text-sm font-medium text-muted-foreground mb-3">Timeframe Breakdown</div>
        <div className="space-y-3">
          {timeframeResults.map((result) => {
            const prediction = formatPrediction(result, analysisType);
            const confidence = getConfidence(result, analysisType);
            const isStrongest = consensus?.dominantTimeframe === result.timeframe;
            
            return (
              <motion.div
                key={result.timeframe}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isStrongest 
                    ? 'bg-even/10 border-even/30 scale-105' 
                    : 'bg-muted/50 border-muted/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    result.timeframe === '10T' ? 'bg-green-500' :
                    result.timeframe === '30T' ? 'bg-blue-500' : 'bg-purple-500'
                  }`} />
                  <div>
                    <div className={`font-medium ${isStrongest ? 'text-even' : 'text-foreground'}`}>
                      {result.timeframe}
                    </div>
                    <div className="text-xs text-muted-foreground">{result.label}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-bold ${isStrongest ? 'text-even' : 'text-foreground'}`}>
                    {prediction}
                  </div>
                  <div className="text-xs text-muted-foreground">{confidence}%</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Smart Notification */}
      {consensus && consensus.confidence >= 80 && consensus.agreement >= 70 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl p-4 bg-gradient-to-r from-even/20 to-over/20 border border-even/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-even" />
            <span className="font-bold text-even">High-Confidence Signal</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Strong consensus across multiple timeframes. Consider increasing position size.
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};