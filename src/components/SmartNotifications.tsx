import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { ConsensusResult } from '@/hooks/useMultiTimeframeAnalysis';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'high-confidence' | 'consensus-change' | 'risk-warning';
  title: string;
  message: string;
  symbol: string;
  timestamp: number;
  consensus?: ConsensusResult;
  autoHide?: boolean;
}

interface SmartNotificationsProps {
  consensus: ConsensusResult | null;
  symbol: string;
  analysisType: 'evenOdd' | 'overUnder' | 'digitMatch';
}

export const SmartNotifications = ({ consensus, symbol, analysisType }: SmartNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastConsensus, setLastConsensus] = useState<ConsensusResult | null>(null);

  useEffect(() => {
    if (!consensus) return;

    // High-confidence signal notification
    if (consensus.confidence >= 85 && consensus.agreement >= 80) {
      const notification: Notification = {
        id: `high-conf-${symbol}-${Date.now()}`,
        type: 'high-confidence',
        title: '🎯 High-Confidence Signal',
        message: `${consensus.signal.replace('_', ' ')} with ${consensus.confidence}% confidence and ${consensus.agreement}% agreement`,
        symbol,
        timestamp: Date.now(),
        consensus,
        autoHide: true
      };
      
      addNotification(notification);
    }

    // Consensus change notification
    if (lastConsensus && lastConsensus.signal !== consensus.signal) {
      const notification: Notification = {
        id: `consensus-change-${symbol}-${Date.now()}`,
        type: 'consensus-change',
        title: '🔄 Signal Changed',
        message: `Consensus shifted from ${lastConsensus.signal.replace('_', ' ')} to ${consensus.signal.replace('_', ' ')}`,
        symbol,
        timestamp: Date.now(),
        consensus,
        autoHide: true
      };
      
      addNotification(notification);
    }

    // Risk warning for conflicting signals
    if (consensus.conflictingSignals && consensus.confidence < 60) {
      const notification: Notification = {
        id: `risk-warning-${symbol}-${Date.now()}`,
        type: 'risk-warning',
        title: '⚠️ Conflicting Signals',
        message: `Low agreement (${consensus.agreement}%) detected. Consider reducing position size.`,
        symbol,
        timestamp: Date.now(),
        consensus,
        autoHide: false
      };
      
      addNotification(notification);
    }

    setLastConsensus(consensus);
  }, [consensus, symbol, lastConsensus]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Remove duplicate notifications of the same type for the same symbol
      const filtered = prev.filter(n => 
        !(n.type === notification.type && n.symbol === notification.symbol)
      );
      return [...filtered, notification];
    });

    // Auto-hide notification after 5 seconds if autoHide is true
    if (notification.autoHide) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'high-confidence':
        return <CheckCircle className="w-5 h-5 text-even" />;
      case 'consensus-change':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'risk-warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationStyle = (type: Notification['type']) => {
    switch (type) {
      case 'high-confidence':
        return 'bg-even/10 border-even/30 text-even';
      case 'consensus-change':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'risk-warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      default:
        return 'bg-muted/10 border-muted/30 text-foreground';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`rounded-xl p-4 border shadow-lg backdrop-blur-sm ${getNotificationStyle(notification.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm mb-1">{notification.title}</div>
                  <div className="text-xs opacity-90 leading-relaxed">
                    {notification.message}
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    {notification.symbol} • {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                onClick={() => removeNotification(notification.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};