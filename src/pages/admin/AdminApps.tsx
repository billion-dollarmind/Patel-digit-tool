import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import { FEATURE_CATALOG, type ConnectedApplication, type FeatureKey } from '@/lib/platformAdmin';

export const AdminApps = () => {
  const { state, upsertApplication, removeApplication, createApplication } = usePlatformAdmin();
  const [editing, setEditing] = useState<ConnectedApplication | null>(null);

  const startCreate = () => {
    const app = createApplication({ name: 'New Connected App' });
    setEditing(app);
  };

  const toggleFeature = (key: FeatureKey) => {
    if (!editing) return;
    const has = editing.featureKeys.includes(key);
    setEditing({
      ...editing,
      featureKeys: has
        ? editing.featureKeys.filter((k) => k !== key)
        : [...editing.featureKeys, key],
    });
  };

  const save = () => {
    if (!editing) return;
    upsertApplication(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Applications</h2>
          <p className="text-sm text-muted-foreground">
            Connected products that can receive dispatcher signals (Hub Applications tab)
          </p>
        </div>
        <Button onClick={startCreate}>Create App</Button>
      </div>

      <div className="space-y-3">
        {state.applications.map((app) => (
          <div key={app.id} className="glass rounded-2xl p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{app.name}</h3>
                <p className="text-xs text-muted-foreground">{app.description || 'No description'}</p>
                <p className="text-[11px] font-mono text-cyan-300/80 mt-1">{app.id}</p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${
                    app.active
                      ? 'border-emerald-400/40 text-emerald-300'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {app.active ? 'Active' : 'Inactive'}
                </span>
                <Button size="sm" variant="outline" onClick={() => setEditing(app)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeApplication(app.id)}>
                  Remove
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {app.featureKeys.map((k) => (
                <span
                  key={k}
                  className="text-[10px] rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-200"
                >
                  {k}
                </span>
              ))}
            </div>
            {app.webhookUrl && (
              <p className="text-[11px] text-muted-foreground truncate">Webhook: {app.webhookUrl}</p>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg glass rounded-2xl p-5 space-y-3 border border-cyan-400/20">
            <h3 className="font-semibold">Edit application</h3>
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="App name"
            />
            <Input
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description"
            />
            <Input
              value={editing.webhookUrl}
              onChange={(e) => setEditing({ ...editing, webhookUrl: e.target.value })}
              placeholder="Webhook URL (optional)"
              className="font-mono text-xs"
            />
            <Input
              value={editing.allowedDomains.join(', ')}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  allowedDomains: e.target.value
                    .split(',')
                    .map((d) => d.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Allowed domains (comma-separated)"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Active
            </label>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Feature keys</p>
              <div className="flex flex-wrap gap-2">
                {FEATURE_CATALOG.map((f) => {
                  const on = editing.featureKeys.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFeature(f.id)}
                      className={`text-[11px] rounded-full border px-2.5 py-1 font-semibold ${
                        on
                          ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {f.id}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={save}>
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
