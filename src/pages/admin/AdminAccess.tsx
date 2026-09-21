import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import { FEATURE_CATALOG, type FeatureKey } from '@/lib/platformAdmin';

export const AdminAccess = () => {
  const {
    state,
    createSubscriber,
    setSubscriberStatus,
    grantFeatures,
    upsertPlan,
  } = usePlatformAdmin();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [planId, setPlanId] = useState(state.plans[0]?.id || '');
  const [message, setMessage] = useState('');

  const pending = useMemo(
    () => state.subscribers.filter((s) => s.status === 'pending'),
    [state.subscribers]
  );

  const grant = () => {
    if (!email.trim()) {
      setMessage('Email is required');
      return;
    }
    const sub = createSubscriber({
      email: email.trim().toLowerCase(),
      fullName: fullName.trim() || email.trim(),
      planId,
      status: 'pending',
    });
    setSubscriberStatus(sub.id, 'approved');
    setMessage(`Approved ${sub.email} onto ${state.plans.find((p) => p.id === planId)?.name}`);
    setEmail('');
    setFullName('');
  };

  const unlockTabs = (subscriberId: string, keys: FeatureKey[]) => {
    grantFeatures(subscriberId, keys);
    setMessage('Scanner tabs unlocked');
  };

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">Scanner Access</h2>
        <p className="text-sm text-muted-foreground">
          Approve a user onto a plan and unlock scanner tabs (Hub Scanner Access / Grant Access)
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <select
          className="w-full h-10 rounded-md border border-border bg-background/70 px-3 text-sm"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {state.plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.priceLabel}
            </option>
          ))}
        </select>
        <Button onClick={grant}>Approve user onto plan</Button>
        {message && (
          <p className="text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2">
            {message}
          </p>
        )}
      </section>

      <section className="glass rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">Plans</h3>
        <div className="space-y-3">
          {state.plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.priceLabel}</p>
                </div>
                <label className="text-xs flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={plan.enabled}
                    onChange={(e) => upsertPlan({ ...plan, enabled: e.target.checked })}
                  />
                  Enabled
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {FEATURE_CATALOG.map((f) => {
                  const on = plan.featureKeys.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className={`text-[10px] rounded-full border px-2 py-0.5 ${
                        on
                          ? 'border-cyan-400/40 text-cyan-200 bg-cyan-500/10'
                          : 'border-border text-muted-foreground'
                      }`}
                      onClick={() =>
                        upsertPlan({
                          ...plan,
                          featureKeys: on
                            ? plan.featureKeys.filter((k) => k !== f.id)
                            : [...plan.featureKeys, f.id],
                        })
                      }
                    >
                      {f.id}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">Pending approvals</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending users.</p>
        ) : (
          pending.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
            >
              <div className="text-sm">
                <p className="font-medium">{s.email}</p>
                <p className="text-xs text-muted-foreground">{s.fullName}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setSubscriberStatus(s.id, 'approved')}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    unlockTabs(s.id, ['even_odd', 'over_under', 'digit_match'])
                  }
                >
                  Unlock scanner tabs
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSubscriberStatus(s.id, 'revoked')}>
                  Revoke
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};
