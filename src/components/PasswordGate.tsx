import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import { useDerivAccount } from '@/context/DerivAccountContext';

interface PasswordGateProps {
  onAuthenticated: () => void;
}

const signalChips = [
  { label: 'Even / Odd', className: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' },
  { label: 'Over / Under', className: 'border-sky-400/30 bg-sky-500/10 text-sky-300' },
  { label: 'Digit Match', className: 'border-amber-400/30 bg-amber-500/10 text-amber-300' },
];

export const PasswordGate = ({ onAuthenticated }: PasswordGateProps) => {
  const {
    connectAndVerify,
    loginWithDerivOAuth,
    verifyStake,
    verifySymbol,
    verifying,
    appId,
    clientId,
    oauth2Enabled,
    redirectUri,
  } = useDerivAccount();
  const [password, setPassword] = useState('');
  const [derivToken, setDerivToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [runVerifyTrade, setRunVerifyTrade] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const correctPassword = '9898';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setStatus('');

    if (password !== correctPassword) {
      setError('Incorrect password. Please try again.');
      setPassword('');
      setIsLoading(false);
      return;
    }

    localStorage.setItem('patel-digit-tool-auth', 'true');

    if (derivToken.trim()) {
      setStatus(
        runVerifyTrade
          ? `Authorizing + $${verifyStake} ${verifySymbol} DIGITODD verification…`
          : 'Connecting Deriv account…'
      );
      const result = await connectAndVerify(derivToken, runVerifyTrade);
      if (!result.ok) {
        setError(result.message);
        setIsLoading(false);
        setStatus('');
        return;
      }
      setStatus(result.message);
    }

    onAuthenticated();
    setIsLoading(false);
  };

  const handleOAuth = () => {
    setError('');
    if (password !== correctPassword) {
      setError('Enter the site password first, then connect with Deriv.');
      return;
    }
    localStorage.setItem('patel-digit-tool-auth', 'true');
    void loginWithDerivOAuth({ verifyAfter: runVerifyTrade, returnTo: '/' });
  };

  const busy = isLoading || verifying;

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <SiteBackground variant="auth" />

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
                AI signal intelligence · Auto Engine · Deriv OAuth
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-card/70 backdrop-blur-2xl shadow-2xl shadow-cyan-500/15"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

            <div className="relative p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Secure access + Deriv OAuth</span>
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
                      className="h-12 pr-12 text-center text-lg font-mono tracking-[0.35em] bg-background/60 border-cyan-500/25 focus-visible:ring-cyan-400/40"
                      disabled={busy}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cyan-300"
                      disabled={busy}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleOAuth}
                  disabled={busy || !password}
                  className="w-full h-12 text-base font-semibold bg-[#ff444f] hover:bg-[#ff5c65] text-white border-0"
                >
                  {oauth2Enabled ? 'Login with Deriv OAuth2' : 'Login with Deriv (legacy)'}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-card/80 px-2 text-muted-foreground">or paste token</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3" />
                    Deriv API token (manual)
                  </label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Paste token (optional)"
                      value={derivToken}
                      onChange={(e) => setDerivToken(e.target.value)}
                      className="h-11 pr-12 text-sm bg-background/60 border-cyan-500/25 font-mono"
                      disabled={busy}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cyan-300"
                      disabled={busy}
                      aria-label={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-muted-foreground pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={runVerifyTrade}
                      onChange={(e) => setRunVerifyTrade(e.target.checked)}
                      className="mt-0.5 rounded border-cyan-500/40"
                      disabled={busy}
                    />
                    <span>
                      After connect, run verification: <strong>${verifyStake}</strong> DIGITODD on{' '}
                      <strong>{verifySymbol}</strong>
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="text-destructive text-sm text-center bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                {status && !error && (
                  <div className="text-cyan-300 text-xs text-center bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2">
                    {status}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 via-primary to-fuchsia-500 text-white shadow-lg shadow-cyan-500/25 border-0"
                  disabled={busy || !password}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {verifying ? 'Verifying token…' : 'Signing in…'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Enter Dashboard
                    </span>
                  )}
                </Button>
              </form>

              <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                {oauth2Enabled ? (
                  <>
                    OAuth2 client_id{' '}
                    <span className="font-mono text-cyan-300/90">{clientId}</span>
                    <br />
                    Legacy app_id <span className="font-mono text-cyan-300/90">{appId}</span>
                  </>
                ) : (
                  <>
                    OAuth app_id <span className="font-mono text-cyan-300/90">{appId}</span>
                    <br />
                    <span className="text-amber-300/90">
                      Set VITE_DERIV_CLIENT_ID for OAuth 2.0 + PKCE
                    </span>
                  </>
                )}
                <br />
                Redirect{' '}
                <span className="font-mono text-[10px] break-all text-cyan-300/80">{redirectUri}</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
