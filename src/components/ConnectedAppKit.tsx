import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import { useDerivAccount } from '@/context/DerivAccountContext';
import { useSignalEngine } from '@/context/SignalEngineContext';
import type { ConnectedAppId, DispatchedSignal } from '@/lib/signalDispatcher';
import { cn } from '@/lib/utils';

interface TradeLog {
  id: string;
  at: number;
  ok: boolean;
  message: string;
}

interface UseConnectedAppOptions {
  appId: ConnectedAppId;
  autoTradeKinds?: DispatchedSignal['kind'][];
  defaultStake?: number;
  buildTrade: (signal: DispatchedSignal, stake: number) => {
    contractType: Parameters<ReturnType<typeof useDerivAccount>['placeAppTrade']>[0]['contractType'];
    symbol: string;
    amount: number;
    duration?: number;
    barrier?: string | number;
    growthRate?: number;
  } | null;
}

export function useConnectedAppTrader({
  appId,
  autoTradeKinds,
  defaultStake = 0.5,
  buildTrade,
}: UseConnectedAppOptions) {
  const { subscribe, settings } = useSignalEngine();
  const { placeAppTrade, account, verified } = useDerivAccount();
  const [armed, setArmed] = useState(false);
  const [stake, setStake] = useState(defaultStake);
  const [inbox, setInbox] = useState<DispatchedSignal[]>([]);
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [busy, setBusy] = useState(false);

  const receiving = settings.connectedApps.includes(appId);

  const execute = useCallback(
    async (signal: DispatchedSignal) => {
      if (!account) {
        setLogs((prev) => [
          {
            id: `${Date.now()}`,
            at: Date.now(),
            ok: false,
            message: 'Connect a verified Deriv token first',
          },
          ...prev,
        ].slice(0, 40));
        return;
      }
      const trade = buildTrade(signal, stake);
      if (!trade) return;
      setBusy(true);
      try {
        const buy = await placeAppTrade(trade);
        setLogs((prev) => [
          {
            id: `${buy.contractId}`,
            at: Date.now(),
            ok: true,
            message: `Bought ${trade.contractType} ${trade.symbol} #${buy.contractId} @ ${buy.buyPrice}`,
          },
          ...prev,
        ].slice(0, 40));
      } catch (err) {
        setLogs((prev) => [
          {
            id: `${Date.now()}`,
            at: Date.now(),
            ok: false,
            message: err instanceof Error ? err.message : 'Trade failed',
          },
          ...prev,
        ].slice(0, 40));
      } finally {
        setBusy(false);
      }
    },
    [account, buildTrade, placeAppTrade, stake]
  );

  useEffect(() => {
    return subscribe((signal) => {
      if (!signal.targetApps.includes(appId)) return;
      if (autoTradeKinds && !autoTradeKinds.includes(signal.kind)) return;
      setInbox((prev) => [signal, ...prev].slice(0, 30));
      if (armed && receiving) {
        void execute(signal);
      }
    });
  }, [subscribe, appId, autoTradeKinds, armed, receiving, execute]);

  return {
    armed,
    setArmed,
    stake,
    setStake,
    inbox,
    logs,
    busy,
    receiving,
    account,
    verified,
    execute,
  };
}

interface AppShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const ConnectedAppShell = ({ title, subtitle, children }: AppShellProps) => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen">
      <SiteBackground />
      <header className="sticky top-0 z-50 glass border-b border-border/60">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <BrandLogo size="sm" />
          <div>
            <h1 className="text-base font-bold gradient-text">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-5">{children}</main>
    </div>
  );
};

export const ArmControls = ({
  armed,
  setArmed,
  stake,
  setStake,
  receiving,
  verified,
  busy,
}: {
  armed: boolean;
  setArmed: (v: boolean) => void;
  stake: number;
  setStake: (n: number) => void;
  receiving: boolean;
  verified: boolean;
  busy: boolean;
}) => (
  <div className="glass rounded-2xl p-4 flex flex-wrap items-end gap-4">
    <label className="text-xs space-y-1">
      <span className="text-muted-foreground uppercase tracking-wide">Stake</span>
      <input
        type="number"
        min={0.35}
        step={0.05}
        className="w-28 h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
        value={stake}
        onChange={(e) => setStake(Number(e.target.value) || 0.35)}
        disabled={busy}
      />
    </label>
    <Button
      variant={armed ? 'destructive' : 'default'}
      className={cn(!armed && 'bg-emerald-600 hover:bg-emerald-500')}
      onClick={() => setArmed(!armed)}
      disabled={!receiving}
    >
      <Power className="w-4 h-4 mr-2" />
      {armed ? 'Disarm auto-trade' : 'Arm auto-trade'}
    </Button>
    <div className="text-xs text-muted-foreground space-y-1">
      <div>Dispatcher: {receiving ? 'receiving' : 'muted on Engine Monitor'}</div>
      <div>Account: {verified ? 'verified' : 'not verified'}</div>
    </div>
  </div>
);

export const SignalInbox = ({
  inbox,
  onFire,
  busy,
}: {
  inbox: DispatchedSignal[];
  onFire: (s: DispatchedSignal) => void;
  busy: boolean;
}) => (
  <div className="glass rounded-2xl p-4 space-y-3">
    <h3 className="font-semibold text-sm">Signal inbox</h3>
    {inbox.length === 0 ? (
      <p className="text-sm text-muted-foreground">Waiting for Auto Engine dispatches…</p>
    ) : (
      <div className="space-y-2 max-h-64 overflow-auto">
        {inbox.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-xs"
          >
            <span className="font-mono text-cyan-300">{s.symbol}</span>
            <span>{s.direction}</span>
            <span>{s.confidence}%</span>
            <span className="text-muted-foreground">{s.contractType}</span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onFire(s)}>
              Trade once
            </Button>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const TradeLogList = ({ logs }: { logs: TradeLog[] }) => (
  <div className="glass rounded-2xl p-4 space-y-3">
    <h3 className="font-semibold text-sm">Trade log</h3>
    {logs.length === 0 ? (
      <p className="text-sm text-muted-foreground">No trades yet.</p>
    ) : (
      <div className="space-y-2 max-h-56 overflow-auto">
        {logs.map((l) => (
          <div
            key={l.id + l.at}
            className={cn(
              'text-xs rounded-lg border px-3 py-2',
              l.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            )}
          >
            {new Date(l.at).toLocaleTimeString()} — {l.message}
          </div>
        ))}
      </div>
    )}
  </div>
);
