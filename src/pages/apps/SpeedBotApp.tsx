import {
  ArmControls,
  ConnectedAppShell,
  SignalInbox,
  TradeLogList,
  useConnectedAppTrader,
} from '@/components/ConnectedAppKit';
import type { DispatchedSignal } from '@/lib/signalDispatcher';

export const SpeedBotApp = () => {
  const trader = useConnectedAppTrader({
    appId: 'speedbot',
    autoTradeKinds: ['even_odd'],
    defaultStake: 0.5,
    buildTrade: (signal: DispatchedSignal, stake: number) => {
      if (signal.kind !== 'even_odd') return null;
      return {
        contractType: signal.contractType,
        symbol: signal.symbol,
        amount: stake,
        duration: 1,
      };
    },
  });

  return (
    <ConnectedAppShell
      title="Speed Bot"
      subtitle="Downstream app — fast Even/Odd entries from dispatcher"
    >
      <p className="text-sm text-muted-foreground">
        Listens for Even/Odd signals from Auto Engine. When armed, places 1-tick DIGITEVEN / DIGITODD
        contracts on the signal symbol.
      </p>
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
