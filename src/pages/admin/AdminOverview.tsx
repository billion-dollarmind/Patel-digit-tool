import { Link } from 'react-router-dom';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import { useDerivAccount } from '@/context/DerivAccountContext';
import { FEATURE_CATALOG } from '@/lib/platformAdmin';

export const AdminOverview = () => {
  const { state, activeSubscriberId, activeFeatures, setActiveSubscriber, toggleClientVisible } =
    usePlatformAdmin();
  const { account, verified, lastVerification, clientId, appId, redirectUri } = useDerivAccount();
  const approved = state.subscribers.filter((s) => s.status === 'approved').length;
  const pending = state.subscribers.filter((s) => s.status === 'pending').length;
  const activeApps = state.applications.filter((a) => a.active).length;

  return (
    <div className="space-y-6">
      <section className="grid sm:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Connected apps</p>
          <p className="text-2xl font-bold mt-1">{activeApps}</p>
          <Link to="/admin/apps" className="text-xs text-cyan-300 mt-2 inline-block">
            Manage applications →
          </Link>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Approved subscribers</p>
          <p className="text-2xl font-bold mt-1">{approved}</p>
          <p className="text-xs text-amber-300 mt-1">{pending} pending</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active features</p>
          <p className="text-2xl font-bold mt-1">{activeFeatures.length}</p>
          <Link to="/admin/access" className="text-xs text-cyan-300 mt-2 inline-block">
            Scanner access →
          </Link>
        </div>
      </section>

      <section className="glass rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Session access (Hub-style)</h2>
        <p className="text-sm text-muted-foreground">
          Pick which subscriber profile gates tabs and connected apps for this browser session.
        </p>
        <select
          className="w-full max-w-md h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
          value={activeSubscriberId}
          onChange={(e) => setActiveSubscriber(e.target.value)}
        >
          {state.subscribers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.email} · {s.status} · {state.plans.find((p) => p.id === s.planId)?.name || s.planId}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 pt-1">
          {FEATURE_CATALOG.map((f) => {
            const on = activeFeatures.includes(f.id);
            return (
              <span
                key={f.id}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  on
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {f.label}
              </span>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">Client menu</h2>
        <p className="text-sm text-muted-foreground">
          Master switches for what clients can open. Off hides the page even if a plan includes it.
          Engine and trading apps stay off for clients until you turn them on.
        </p>
        <div className="flex flex-wrap gap-2">
          {FEATURE_CATALOG.map((f) => {
            const on = state.clientVisible.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggleClientVisible(f.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  on
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {f.label}: {on ? 'Shown' : 'Hidden'}
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 space-y-2 text-sm">
        <h2 className="font-semibold">Deriv connection</h2>
        {account ? (
          <p>
            Connected <span className="font-mono text-cyan-300">{account.loginid}</span> · {account.balance}{' '}
            {account.currency} · {verified ? 'verification trade succeeded' : 'not verified'}
          </p>
        ) : (
          <p className="text-muted-foreground">No Deriv account connected in this browser.</p>
        )}
        {lastVerification && (
          <p className="text-xs text-muted-foreground">{lastVerification.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground font-mono break-all">
          client_id {clientId} · app_id {appId}
          <br />
          redirect {redirectUri}
        </p>
      </section>
    </div>
  );
};
