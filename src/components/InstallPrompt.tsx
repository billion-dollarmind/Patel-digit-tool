import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show prompt after 3 seconds if installable and not installed
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Show again after 24 hours
    setTimeout(() => {
      if (!isInstalled) {
        setShowPrompt(true);
      }
    }, 24 * 60 * 60 * 1000);
  };

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleRemindLater}
          />

          {/* Install Prompt */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="glass rounded-2xl p-6 space-y-6 border border-primary/20">
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
                  className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg"
                >
                  <Smartphone className="w-8 h-8 text-white" />
                </motion.div>
                
                <div>
                  <h2 className="text-xl font-bold text-foreground">Install Patel Digit Tool</h2>
                  <p className="text-muted-foreground text-sm">Get the app for faster access and offline use</p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground">Faster loading and better performance</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Download className="w-4 h-4 text-secondary" />
                  </div>
                  <span className="text-foreground">Works offline and saves to home screen</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-even/10 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-even" />
                  </div>
                  <span className="text-foreground">Native app experience on Android</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Install App
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleRemindLater}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground"
                  >
                    Remind Later
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-muted-foreground"
                  >
                    No Thanks
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground">
                Free • No ads • Works offline
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};