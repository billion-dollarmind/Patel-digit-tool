import { motion } from 'framer-motion';
import { ArrowLeft, Play, Square, Radio, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import { useSignalEngine } from '@/context/SignalEngineContext';
import { useDerivAccount } from '@/context/DerivAccountContext';
import { DEFAULT_ENGINE_SYMBOLS, type StrategyMode } from '@/lib/signalDispatcher';
import { cn } from '@/lib/utils';

const MODES: { id: StrategyMode; label: string }[] = [
  { id: 'AUTOSWITCH', label: 'Auto Switch' },
  { id: 'EVEN_ODD', label: 'Even / Odd' },
  { id: 'OVER_UNDER', label: 'Over / Under' },
  { id: 'DIGIT_MATCH', label: 'Digit Match' },
];

export const EngineMonitor = () => {
  const navigate = useNavigate();
  const {
    settings,
    running,
    recentSignals,
    lastError,
    isMarketConnected,
    apps,
    startEngine,
    stopEngine,
    updateSettings,
    toggleApp,
  } = useSignalEngine();
  const { account, verified } = useDerivAccount();

  const toggleSymbol = (symbol: string) => {
    const has = settings.symbols.includes(symbol);
    updateSettings({
      symbols: has
        ? settings.symbols.filter((s) => s !== symbol)
        : [...settings.symbols, symbol],
    });
  };

  return (
    <div className="relative min-h-screen">
      <SiteBackground />
      <header className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <BrandLogo size="sm" />
            <div className="min-w-0">
              <h1 className="text-base font-bold gradient-text truncate">Auto Engine / Dispatcher</h1>
              <p className="text-xs text-muted-foreground truncate">
                Generate signals and push to connected apps
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isMarketConnected ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5" /> Live ticks
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <WifiOff className="w-3.5 h-3.5" /> Connecting
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Radio className={cn('w-4 h-4', running && 'text-emerald-400 animate-pulse')} />
                Engine status
              </h2>
              <p className="text-sm text-muted-foreground">
                {running
                  ? `Scanning ${settings.symbols.length} symbol(s) · Mode ${settings.strategyMode}`
                  : 'Auto Engine stopped'}
              </p>
              {account && (
                <p className="text-xs text-cyan-300/90 mt-1">
                  Deriv {account.loginid} · {account.balance} {account.currency}
                  {verified ? ' · verified' : ' · not verified'}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="destructive" onClick={stopEngine}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Engine
                </Button>
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-500"
                  onClick={startEngine}
                  disabled={settings.symbols.length === 0}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Auto Engine
                </Button>
              )}
            </div>
          </div>

          {lastError && (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {lastError}
            </p>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground uppercase tracking-wide">Strategy mode</span>
              <select
                className="w-full h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
                value={settings.strategyMode}
                onChange={(e) => updateSettings({ strategyMode: e.target.value as StrategyMode })}
              >
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground uppercase tracking-wide">Interval (sec)</span>
              <input
                type="number"
                min={5}
                max={60}
                className="w-full h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
                value={settings.intervalSec}
                onChange={(e) => updateSettings({ intervalSec: Number(e.target.value) || 12 })}
              />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground uppercase tracking-wide">Min confidence %</span>
              <input
                type="number"
                min={50}
                max={95}
                className="w-full h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
                value={settings.minConfidence}
                onChange={(e) => updateSettings({ minConfidence: Number(e.target.value) || 60 })}
              />
            </label>
          </div>
        </motion.section>

        <section className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">Symbols</h3>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_ENGINE_SYMBOLS.map((symbol) => {
              const on = settings.symbols.includes(symbol);
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => toggleSymbol(symbol)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                    on
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-background/40 border-border text-muted-foreground'
                  )}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">Dispatch targets</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {apps.map((app) => {
              const on = settings.connectedApps.includes(app.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => toggleApp(app.id)}
                  className={cn(
                    'text-left rounded-xl border p-3 transition-colors',
                    on ? 'border-fuchsia-400/40 bg-fuchsia-500/10' : 'border-border bg-background/40'
                  )}
                >
                  <div className="font-medium text-sm">{app.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{app.description}</div>
                  <div className="text-[11px] mt-2 font-semibold text-cyan-300">
                    {on ? 'Receiving signals' : 'Muted'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">Recent dispatches</h3>
          {recentSignals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signals yet — start the engine.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {recentSignals.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs"
                >
                  <span className="font-mono text-cyan-300">{s.symbol}</span>
                  <span className="uppercase font-semibold">{s.kind.replace('_', ' ')}</span>
                  <span className="text-emerald-300">{s.direction}</span>
                  <span>{s.confidence}%</span>
                  <span className="text-muted-foreground">{s.contractType}</span>
                  <span className="text-muted-foreground">
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
