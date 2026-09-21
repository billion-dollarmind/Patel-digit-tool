import { Button } from '@/components/ui/button';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';

export const AdminSubscribers = () => {
  const {
    state,
    setActiveSubscriber,
    activeSubscriberId,
    setSubscriberStatus,
    removeSubscriber,
    resetPlatform,
  } = usePlatformAdmin();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Subscribers</h2>
          <p className="text-sm text-muted-foreground">Active subscriber management</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetPlatform}>
          Reset platform data
        </Button>
      </div>

      <div className="space-y-2">
        {state.subscribers.map((s) => {
          const plan = state.plans.find((p) => p.id === s.planId);
          return (
            <div
              key={s.id}
              className={`glass rounded-2xl p-4 border ${
                activeSubscriberId === s.id ? 'border-cyan-400/40' : 'border-transparent'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{s.email}</p>
                  <p className="text-xs text-muted-foreground">{s.fullName || '—'}</p>
                  <p className="text-xs mt-1">
                    Plan: <span className="text-cyan-300">{plan?.name || s.planId}</span> ·{' '}
                    <span
                      className={
                        s.status === 'approved'
                          ? 'text-emerald-300'
                          : s.status === 'pending'
                            ? 'text-amber-300'
                            : 'text-destructive'
                      }
                    >
                      {s.status}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.featureKeys.map((k) => (
                      <span
                        key={k}
                        className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActiveSubscriber(s.id)}>
                    Use session
                  </Button>
                  {s.status !== 'approved' && (
                    <Button size="sm" onClick={() => setSubscriberStatus(s.id, 'approved')}>
                      Approve
                    </Button>
                  )}
                  {s.status === 'approved' && (
                    <Button size="sm" variant="ghost" onClick={() => setSubscriberStatus(s.id, 'revoked')}>
                      Revoke
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeSubscriber(s.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
