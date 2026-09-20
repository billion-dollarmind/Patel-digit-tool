import { motion } from 'framer-motion';
import { ArrowRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo, SiteBackground } from '@/components/Brand';

const featuredSignals = [
  {
    title: 'Even/Odd Signals',
    description: 'Predict whether the last digit will be even or odd from live pattern analysis.',
    route: '/signals/even-odd',
    image: '/images/even-odd-hero.png',
    accent: 'from-cyan-500/40 via-transparent to-fuchsia-500/30',
    glow: 'shadow-cyan-500/20 hover:shadow-cyan-400/40',
  },
  {
    title: 'Over/Under Signals',
    description: 'Predict high (5–9) or low (0–4) digits with recommended entry runs.',
    route: '/signals/over-under',
    image: '/images/over-under-hero.png',
    accent: 'from-sky-400/30 via-transparent to-blue-600/20',
    glow: 'shadow-sky-500/20 hover:shadow-sky-400/40',
  },
  {
    title: 'Digit Match Signals',
    description: 'Identify the most frequent digit for match predictions across all indices.',
    route: '/signals/digit-match',
    image: '/images/digit-match-hero.png',
    accent: 'from-amber-500/35 via-transparent to-orange-600/25',
    glow: 'shadow-amber-500/20 hover:shadow-amber-400/40',
  },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="relative min-h-screen">
      <InstallPrompt />
      <SiteBackground variant="main" />

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border/60"
      >
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" />
              <div>
                <h1 className="text-lg font-bold gradient-text">Patel Digit Tool</h1>
                <p className="text-xs text-muted-foreground">Choose Your Signal Type</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="relative container mx-auto px-4 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Select Signal Type
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Real-time AI-assisted predictions across volatility indices — 15s scan, 20s signal window.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {featuredSignals.map((signal, index) => (
            <motion.button
              key={signal.route}
              type="button"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * index, duration: 0.5 }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => navigate(signal.route)}
              className={`group relative overflow-hidden rounded-3xl text-left border border-white/10 shadow-2xl ${signal.glow} transition-shadow duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <motion.img
                  src={signal.image}
                  alt={signal.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  initial={{ scale: 1.08, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 * index, duration: 0.7 }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${signal.accent}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 drop-shadow-sm">
                    {signal.title}
                  </h3>
                  <p className="text-sm text-white/75 mb-4 max-w-md leading-relaxed">
                    {signal.description}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/95 group-hover:gap-3 transition-all">
                    View Signals
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10 glass rounded-2xl p-6 text-center max-w-2xl mx-auto"
        >
          <h3 className="text-lg font-semibold text-foreground mb-2">
            How It Works
          </h3>
          <p className="text-sm text-muted-foreground">
            Each signal type scans the market for <strong>15 seconds</strong> to collect tick data,
            then displays a signal for <strong>20 seconds</strong> before scanning again.
            This cycle keeps predictions fresh from the latest ticks.
          </p>
        </motion.div>
      </main>
    </div>
  );
};
