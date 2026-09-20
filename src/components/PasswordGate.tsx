import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLogo, SiteBackground } from '@/components/Brand';

interface PasswordGateProps {
  onAuthenticated: () => void;
}

const signalChips = [
  { label: 'Even / Odd', className: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' },
  { label: 'Over / Under', className: 'border-sky-400/30 bg-sky-500/10 text-sky-300' },
  { label: 'Digit Match', className: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
];

export const PasswordGate = ({ onAuthenticated }: PasswordGateProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const correctPassword = '9898';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (password === correctPassword) {
        localStorage.setItem('patel-digit-tool-auth', 'true');
        onAuthenticated();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <SiteBackground variant="auth" />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <span className="text-sm font-semibold tracking-wide text-foreground/90">
            Patel Digit Tool
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Brand hero */}
          <div className="mb-6 text-center space-y-4">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
              className="mx-auto w-fit relative"
            >
              <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-xl scale-125" />
              <BrandLogo size="xl" className="relative w-20 h-20 rounded-2xl" />
            </motion.div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight gradient-text">
                Patel Digit Tool
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                AI signal intelligence for Deriv volatility indices
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {signalChips.map((chip, i) => (
                <motion.span
                  key={chip.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${chip.className}`}
                >
                  {chip.label}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Auth card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-card/70 backdrop-blur-2xl shadow-2xl shadow-cyan-500/15"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
            <div className="pointer-events-none absolute -top-20 right-0 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-0 h-36 w-36 rounded-full bg-cyan-500/15 blur-3xl" />

            <div className="relative p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Secure access</span>
                <span className="ml-auto inline-flex items-center gap-1 text-cyan-300/90">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-even opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-even" />
                  </span>
                  Online
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12 text-center text-lg font-mono tracking-[0.35em] bg-background/60 border-cyan-500/25 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/50"
                      disabled={isLoading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cyan-300 transition-colors"
                      disabled={isLoading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 via-primary to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white shadow-lg shadow-cyan-500/25 border-0"
                  disabled={isLoading || !password}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Enter Dashboard
                    </span>
                  )}
                </Button>
              </form>

              <p className="text-center text-[11px] text-muted-foreground">
                Protected access · Real-time AI trading signals
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
