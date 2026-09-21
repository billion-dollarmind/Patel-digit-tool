import { useState } from 'react';
import {
  ArmControls,
  ConnectedAppShell,
  SignalInbox,
  TradeLogList,
  useConnectedAppTrader,
} from '@/components/ConnectedAppKit';
import type { DispatchedSignal } from '@/lib/signalDispatcher';

export const AccumulatorsApp = () => {
  const [growthRate, setGrowthRate] = useState(0.01);
  const trader = useConnectedAppTrader({
    appId: 'accumulators',
    autoTradeKinds: ['even_odd', 'over_under', 'digit_match'],
    defaultStake: 1,
    buildTrade: (signal: DispatchedSignal, stake: number) => {
      if (signal.confidence < 70) return null;
      return {
        contractType: 'ACCU',
        symbol: signal.symbol.startsWith('1HZ') ? 'R_100' : signal.symbol,
        amount: stake,
        growthRate,
      };
    },
  });

  return (
    <ConnectedAppShell
      title="Accumulators"
      subtitle="Downstream app — growth-rate ACCU entries on high-confidence signals"
    >
      <p className="text-sm text-muted-foreground">
        When confidence is ≥ 70%, opens an Accumulator on the mapped volatility index. 1s indices
        map to R_100 for ACCU compatibility.
      </p>
      <div className="glass rounded-2xl p-4">
        <label className="text-xs space-y-1 block max-w-xs">
          <span className="text-muted-foreground uppercase tracking-wide">Growth rate</span>
          <select
            className="w-full h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
            value={growthRate}
            onChange={(e) => setGrowthRate(Number(e.target.value))}
          >
            {[0.01, 0.02, 0.03, 0.04, 0.05].map((r) => (
              <option key={r} value={r}>
                {(r * 100).toFixed(0)}%
              </option>
            ))}
          </select>
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
