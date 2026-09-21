import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, LogOut, KeyRound, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAuth } from '@/hooks/useAuth';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import { useDerivAccount } from '@/context/DerivAccountContext';
import { useSignalEngine } from '@/context/SignalEngineContext';
import { CONNECTED_APPS } from '@/lib/signalDispatcher';

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
  const {
    account,
    verified,
    verifying,
    connectAndVerify,
    loginWithDerivOAuth,
    switchOAuthAccount,
    oauthAccounts,
    disconnectAccount,
    verifyStake,
    verifySymbol,
    error: derivError,
    appId,
    clientId,
    oauth2Enabled,
    redirectUri,
  } = useDerivAccount();
  const { running, settings, recentSignals } = useSignalEngine();
  const [tokenInput, setTokenInput] = useState('');
  const [runVerify, setRunVerify] = useState(true);

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    await connectAndVerify(tokenInput, runVerify);
    setTokenInput('');
  };

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
                <p className="text-xs text-muted-foreground">
                  {running ? `Engine live · ${settings.strategyMode}` : 'Choose signal or launch apps'}
                </p>
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

      <main className="relative container mx-auto px-4 py-10 md:py-14 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Select Signal Type
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Real-time AI-assisted predictions — or start Auto Engine to push into connected apps.
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

        {/* Auto Engine + Deriv */}
        <section className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Auto Engine / Dispatcher
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {running
                    ? `Running · ${recentSignals.length} recent dispatches`
                    : 'Stopped — start to push Even/Odd, Over/Under, Digit Match to apps'}
                </p>
              </div>
              <Button onClick={() => navigate('/engine')}>Open Monitor</Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Admin + connected apps
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Hub-style applications, scanner access, and subscriber approvals
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Open Admin
              </Button>
            </div>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto grid lg:grid-cols-1 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-fuchsia-400" />
              Deriv account
            </h3>
            {account ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Login ID:</span>{' '}
                  <span className="font-mono text-cyan-300">{account.loginid}</span>
                </p>
                <p>
                  Balance: {account.balance} {account.currency} ·{' '}
                  {verified ? (
                    <span className="text-emerald-400">verified</span>
                  ) : (
                    <span className="text-amber-400">not verified</span>
                  )}
                </p>
                {oauthAccounts.length > 1 && (
                  <label className="block text-xs space-y-1">
                    <span className="text-muted-foreground">Switch OAuth account</span>
                    <select
                      className="w-full h-9 rounded-md border border-border bg-background/70 px-2 font-mono text-xs"
                      value={
                        oauthAccounts.find(
                          (a) => a.account.toLowerCase() === account.loginid.toLowerCase()
                        )?.account || oauthAccounts[0]?.account
                      }
                      onChange={(e) => {
                        const next = oauthAccounts.find((a) => a.account === e.target.value);
                        if (next) void switchOAuthAccount(next, false);
                      }}
                    >
                      {oauthAccounts.map((a) => (
                        <option key={a.account} value={a.account}>
                          {a.account} ({a.currency})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loginWithDerivOAuth({ verifyAfter: false, returnTo: '/' })}
                  >
                    Re-login with Deriv
                  </Button>
                  <Button variant="outline" size="sm" onClick={disconnectAccount}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full bg-[#ff444f] hover:bg-[#ff5c65] text-white"
                  onClick={() => void loginWithDerivOAuth({ verifyAfter: runVerify, returnTo: '/' })}
                  disabled={verifying}
                >
                  {oauth2Enabled ? 'Login with Deriv OAuth2' : 'Login with Deriv (legacy)'}
                </Button>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card/80 px-2 text-muted-foreground">or paste</span>
                  </div>
                </div>
                <Input
                  type="password"
                  placeholder="Deriv API token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono text-sm"
                />
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={runVerify}
                    onChange={(e) => setRunVerify(e.target.checked)}
                  />
                  Verify with ${verifyStake} DIGITODD on {verifySymbol}
                </label>
                {derivError && <p className="text-xs text-destructive">{derivError}</p>}
                <Button onClick={handleConnect} disabled={verifying || !tokenInput.trim()}>
                  {verifying ? 'Verifying…' : 'Connect & verify'}
                </Button>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {oauth2Enabled ? (
                    <>
                      client_id <span className="font-mono">{clientId}</span> · app_id{' '}
                      <span className="font-mono">{appId}</span>
                    </>
                  ) : (
                    <>
                      app_id <span className="font-mono">{appId}</span> · set{' '}
                      <span className="font-mono">VITE_DERIV_CLIENT_ID</span> for OAuth2
                    </>
                  )}
                  <br />
                  redirect <span className="font-mono break-all">{redirectUri}</span>
                </p>
              </div>
            )}
          </motion.div>
        </section>

        {/* Connected apps */}
        <section className="max-w-6xl mx-auto space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold">Connected trading apps</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Downstream products that receive dispatcher signals and can execute trades
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {CONNECTED_APPS.map((app, i) => (
              <motion.button
                key={app.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i }}
                onClick={() => navigate(app.route)}
                className="glass rounded-2xl p-5 text-left border border-white/10 hover:border-cyan-400/40 transition-colors"
              >
                <h4 className="font-semibold text-foreground">{app.name}</h4>
                <p className="text-sm text-muted-foreground mt-2">{app.description}</p>
                <span className="inline-flex items-center gap-1 text-sm text-cyan-300 mt-4 font-medium">
                  Open app <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
