import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlatformAdmin } from '@/context/PlatformAdminContext';
import { useDerivAccount } from '@/context/DerivAccountContext';
import { Button } from '@/components/ui/button';
import { FEATURE_CATALOG } from '@/lib/platformAdmin';
import {
  fetchAccountBalance,
  fetchOAuth2Accounts,
  isDemoAccount,
  loadOAuth2TokenSet,
  loadTradeWalletMode,
  pickTradeAccount,
  saveTradeWalletMode,
  type OAuthAccount,
  type TradeWalletMode,
} from '@/lib/derivOAuth';
import { loadDerivLoginLog, rememberDerivLogins, type DerivLoginRecord } from '@/lib/derivLoginLog';

export const AdminOverview = () => {
  const { state, activeSubscriberId, activeFeatures, setActiveSubscriber, toggleClientVisible } =
    usePlatformAdmin();
  const {
    account,
    verified,
    lastVerification,
    oauthAccounts,
    token,
    clientId,
    appId,
    redirectUri,
    switchOAuthAccount,
    verifying,
  } = useDerivAccount();
  const [walletRows, setWalletRows] = useState<OAuthAccount[]>(oauthAccounts);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [loginLog, setLoginLog] = useState<DerivLoginRecord[]>(() => loadDerivLoginLog());
  const [picking, setPicking] = useState('');
  const [tradeMode, setTradeMode] = useState<TradeWalletMode>(() => loadTradeWalletMode());

  useEffect(() => {
    const accessToken = loadOAuth2TokenSet()?.accessToken || token;
    if (!accessToken) {
      setWalletRows(oauthAccounts);
      return;
    }
    let cancelled = false;
    setBalancesLoading(true);
    void (async () => {
      let list = oauthAccounts;
      try {
        const fresh = await fetchOAuth2Accounts(accessToken);
        if (fresh.length) list = fresh;
      } catch {
        /* keep the saved account list */
      }
      const withBalances = await Promise.all(
        list.map(async (row) => {
          try {
            const balance = await fetchAccountBalance(accessToken, row.account);
            if (balance != null && Number.isFinite(balance)) return { ...row, balance };
          } catch {
            /* keep the list balance if the live read fails */
          }
          return row;
        })
      );
      if (!cancelled) {
        setWalletRows(withBalances);
        setLoginLog(
          rememberDerivLogins(
            withBalances.map((row) => ({
              loginid: row.account,
              currency: row.currency,
              balance: row.balance,
              virtual: row.virtual ?? /^(DOT|VR|VRTC|VRW)/i.test(row.account),
            }))
          )
        );
        setBalancesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, oauthAccounts]);
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

      <section className="glass rounded-2xl p-5 space-y-3 text-sm">
        <h2 className="font-semibold">Trade on demo or real</h2>
        <p className="text-xs text-muted-foreground">
          Pick the wallet that places trades. Demo is DOT. Real is ROT. This does not follow the balance number.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['demo', 'real'] as TradeWalletMode[]).map((mode) => {
            const target = pickTradeAccount(walletRows, mode);
            const on = tradeMode === mode;
            return (
              <Button
                key={mode}
                variant={on ? 'default' : 'outline'}
                disabled={!target || verifying || picking === mode}
                onClick={() => {
                  if (!target) return;
                  setPicking(mode);
                  saveTradeWalletMode(mode);
                  setTradeMode(mode);
                  void switchOAuthAccount(target, false).finally(() => setPicking(''));
                }}
              >
                {mode === 'demo' ? 'Use demo (DOT)' : 'Use real (ROT)'}
                {target ? ` · ${target.account}` : ' · not connected'}
              </Button>
            );
          })}
        </div>
        {walletRows.length === 0 ? (
          <p className="text-muted-foreground">No Deriv account connected in this browser.</p>
        ) : (
          <div className="space-y-2">
            {walletRows.map((row) => {
              const demo = row.virtual ?? /^(DOT|VR|VRTC|VRW)/i.test(row.account);
              const active = account?.loginid?.toLowerCase() === row.account.toLowerCase();
              return (
                <div
                  key={row.account}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-cyan-300">{row.account}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {/^DOT/i.test(row.account)
                        ? 'DOT · demo'
                        : /^ROT/i.test(row.account)
                          ? 'ROT · real'
                          : demo
                            ? 'Demo'
                            : 'Real'}
                      {active ? ' · active' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">
                      {row.balance == null ? (balancesLoading ? 'Loading…' : '—') : row.balance.toFixed(2)}{' '}
                      {row.currency}
                    </p>
                    <Button
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      disabled={verifying || picking === row.account}
                      onClick={() => {
                        const mode: TradeWalletMode = isDemoAccount(row) ? 'demo' : 'real';
                        setPicking(row.account);
                        saveTradeWalletMode(mode);
                        setTradeMode(mode);
                        void switchOAuthAccount(row, false).finally(() => setPicking(''));
                      }}
                    >
                      {active ? 'Trading here' : 'Use for trades'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Trades from Speed Bot, Accumulators, and Bot Builder use the account marked Trading here.
          {account ? ` Active login ${account.loginid}.` : ''}{' '}
          {verified ? 'Verification trade succeeded.' : 'Not verified.'}
        </p>
        <div className="pt-2 space-y-2">
          <h3 className="font-semibold">Deriv logins saved on this browser</h3>
          <p className="text-xs text-muted-foreground">
            This list is only people who signed in with Deriv on this browser. Phones and other computers are not included.
          </p>
          {loginLog.length === 0 ? (
            <p className="text-xs text-muted-foreground">No Deriv logins saved yet.</p>
          ) : (
            loginLog.map((row) => (
              <div
                key={row.loginid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <div>
                  <p className="font-mono text-cyan-300">{row.loginid}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.virtual ? 'Demo' : 'Real'} · {new Date(row.at).toLocaleString()}
                  </p>
                </div>
                <p className="font-semibold">
                  {row.balance == null ? '—' : row.balance.toFixed(2)} {row.currency}
                </p>
              </div>
            ))
          )}
        </div>
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
