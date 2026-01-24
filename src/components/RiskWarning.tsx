import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RiskWarningProps {
  trigger?: 'startup' | 'loss-streak' | 'high-risk' | 'manual';
  lossStreak?: number;
  onDismiss?: () => void;
}

export const RiskWarning = ({ trigger = 'startup', lossStreak = 0, onDismiss }: RiskWarningProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenToday, setHasSeenToday] = useState(false);

  useEffect(() => {
    // Check if user has seen warning today
    const lastSeen = localStorage.getItem('risk-warning-seen');
    const today = new Date().toDateString();
    
    if (lastSeen === today) {
      setHasSeenToday(true);
    }

    // Show warning based on trigger
    if (trigger === 'startup' && !hasSeenToday) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    } else if (trigger === 'loss-streak' && lossStreak >= 3) {
      setIsVisible(true);
    } else if (trigger === 'high-risk') {
      setIsVisible(true);
    } else if (trigger === 'manual') {
      setIsVisible(true);
    }
  }, [trigger, lossStreak, hasSeenToday]);

  const handleDismiss = () => {
    setIsVisible(false);
    
    // Mark as seen today for startup warnings
    if (trigger === 'startup') {
      localStorage.setItem('risk-warning-seen', new Date().toDateString());
    }
    
    onDismiss?.();
  };

  const getWarningContent = () => {
    switch (trigger) {
      case 'loss-streak':
        return {
          title: 'Loss Streak Detected',
          message: `You've had ${lossStreak} consecutive incorrect predictions. Consider taking a break or reviewing your strategy.`,
          icon: TrendingDown,
          color: 'border-red-500/30 bg-red-500/5',
          iconColor: 'text-red-500'
        };
      
      case 'high-risk':
        return {
          title: 'High Risk Activity',
          message: 'You\'re making predictions with high frequency. Remember to trade responsibly and manage your risk.',
          icon: AlertTriangle,
          color: 'border-amber-500/30 bg-amber-500/5',
          iconColor: 'text-amber-500'
        };
      
      default:
        return {
          title: 'Important Risk Disclosure',
          message: 'This tool is for educational purposes. Trading involves significant risk and past performance does not guarantee future results.',
          icon: Shield,
          color: 'border-blue-500/30 bg-blue-500/5',
          iconColor: 'text-blue-500'
        };
    }
  };

  const content = getWarningContent();

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />

          {/* Warning Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className={`glass rounded-2xl p-6 space-y-6 border ${content.color}`}>
              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className={`w-16 h-16 mx-auto rounded-xl bg-background/50 flex items-center justify-center`}
                >
                  <content.icon className={`w-8 h-8 ${content.iconColor}`} />
                </motion.div>
                
                <div>
                  <h2 className="text-xl font-bold text-foreground">{content.title}</h2>
                  <p className="text-muted-foreground text-sm mt-2">{content.message}</p>
                </div>
              </div>

              {/* Risk Points */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <DollarSign className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Never risk more than you can afford to lose.</strong> Only trade with money you can afford to lose completely.
                  </span>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <TrendingDown className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Past performance doesn't predict future results.</strong> Market conditions can change rapidly.
                  </span>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">This is an educational tool.</strong> Always do your own research and consider seeking professional advice.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleDismiss}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  size="lg"
                >
                  I Understand the Risks
                </Button>
                
                {trigger === 'loss-streak' && (
                  <Button
                    onClick={() => {
                      handleDismiss();
                      // Could add logic to pause predictions for a period
                    }}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Take a Break (Recommended)
                  </Button>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground border-t border-muted/30 pt-4">
                Trade responsibly • Educational purposes only • Not financial advice
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};