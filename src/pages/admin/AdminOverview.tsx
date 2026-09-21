import { Link } from 'react-router-dom';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import { FEATURE_CATALOG } from '@/lib/platformAdmin';

export const AdminOverview = () => {
  const { state, activeSubscriberId, activeFeatures, setActiveSubscriber } = usePlatformAdmin();
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

      <section className="glass rounded-2xl p-5 text-sm text-muted-foreground space-y-2">
        <h2 className="font-semibold text-foreground">How this mirrors Subscriber Hub</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Applications</strong> — register connected products, feature keys, domains, webhooks
          </li>
          <li>
            <strong>Scanner Access</strong> — approve users onto a plan and unlock tabs
          </li>
          <li>
            <strong>Subscribers</strong> — pending / approved / revoked access records
          </li>
          <li>
            Data is stored locally in this browser (no Hub API). Point webhooks at your own workers to
            push live signals outward.
          </li>
        </ul>
      </section>
    </div>
  );
};
