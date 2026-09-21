import { useMemo, useState } from 'react';
import {
  ArmControls,
  ConnectedAppShell,
  SignalInbox,
  TradeLogList,
  useConnectedAppTrader,
} from '@/components/ConnectedAppKit';
import type { DispatchedSignal, SignalKind } from '@/lib/signalDispatcher';
import type { DigitContractType } from '@/lib/derivTrading';

const KIND_OPTIONS: SignalKind[] = ['even_odd', 'over_under', 'digit_match', 'rise_fall'];

export const BotBuilderApp = () => {
  const [enabledKinds, setEnabledKinds] = useState<SignalKind[]>(['even_odd', 'over_under']);
  const [duration, setDuration] = useState(1);

  const mapping = useMemo(() => {
    const map: Partial<Record<SignalKind, DigitContractType>> = {
      even_odd: 'DIGITEVEN', // overridden by signal.contractType
      over_under: 'DIGITOVER',
      digit_match: 'DIGITMATCH',
      rise_fall: 'CALL',
    };
    return map;
  }, []);

  const trader = useConnectedAppTrader({
    appId: 'bot_builder',
    autoTradeKinds: enabledKinds,
    defaultStake: 0.5,
    buildTrade: (signal: DispatchedSignal, stake: number) => {
      if (!enabledKinds.includes(signal.kind)) return null;
      const contractType = signal.contractType || mapping[signal.kind] || 'DIGITODD';
      return {
        contractType,
        symbol: signal.symbol,
        amount: stake,
        duration,
        barrier: signal.barrier,
      };
    },
  });

  const toggleKind = (kind: SignalKind) => {
    setEnabledKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  };

  return (
    <ConnectedAppShell
      title="Bot Builder"
      subtitle="Downstream app — map signal kinds to contract rules and auto-fire"
    >
      <p className="text-sm text-muted-foreground">
        Choose which dispatched signal kinds this bot accepts. Contract type comes from the
        dispatcher (DIGITEVEN / DIGITODD / DIGITOVER / …).
      </p>

      <div className="glass rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold">Strategy blocks</h3>
        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map((kind) => {
            const on = enabledKinds.includes(kind);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggleKind(kind)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  on
                    ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200'
                    : 'bg-background/40 border-border text-muted-foreground'
                }`}
              >
                {kind.replace('_', ' ')}
              </button>
            );
          })}
        </div>
        <label className="text-xs space-y-1 block max-w-[10rem]">
          <span className="text-muted-foreground uppercase tracking-wide">Tick duration</span>
          <input
            type="number"
            min={1}
            max={10}
            className="w-full h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 1)}
          />
        </label>
      </div>

      <ArmControls
        armed={trader.armed}
        setArmed={trader.setArmed}
        stake={trader.stake}
        setStake={trader.setStake}
        receiving={trader.receiving}
        verified={trader.verified}
        busy={trader.busy}
      />
      <SignalInbox inbox={trader.inbox} onFire={trader.execute} busy={trader.busy} />
      <TradeLogList logs={trader.logs} />
    </ConnectedAppShell>
  );
};
