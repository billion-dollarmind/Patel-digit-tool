import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo, SiteBackground } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { useDerivAccount } from '@/context/DerivAccountContext';
import {
  loadOAuthIntent,
  parseOAuth2CallbackParams,
  parseOAuthAccountsFromLocation,
  pickDefaultOAuthAccount,
  stripOAuthParamsFromUrl,
  verifyOAuth2State,
  type OAuthAccount,
} from '@/lib/derivOAuth';

export const OAuthCallback = () => {
  const navigate = useNavigate();
  const {
    completeLegacyOAuthLogin,
    completeOAuth2Login,
    verifying,
    oauth2Enabled,
    oauthAccounts,
  } = useDerivAccount();
  const [legacyAccounts, setLegacyAccounts] = useState<OAuthAccount[]>([]);
  const [status, setStatus] = useState('Reading Deriv OAuth response…');
  const [error, setError] = useState('');
  const [needsPick, setNeedsPick] = useState(false);
  const [pickMode, setPickMode] = useState<'oauth2' | 'legacy' | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const intent = loadOAuthIntent();
    const oauth2Params = parseOAuth2CallbackParams();

    if (oauth2Params.error) {
      stripOAuthParamsFromUrl();
      setError(oauth2Params.errorDescription || oauth2Params.error);
      setStatus('');
      return;
    }

    if (oauth2Params.code) {
      try {
        verifyOAuth2State(oauth2Params.state);
      } catch (err) {
        stripOAuthParamsFromUrl();
        setError(err instanceof Error ? err.message : 'Invalid OAuth state');
        setStatus('');
        return;
      }

      const code = oauth2Params.code;
      stripOAuthParamsFromUrl();
      setStatus('Exchanging authorization code (PKCE)…');

      void (async () => {
        const result = await completeOAuth2Login({
          code,
          verifyAfter: intent?.verifyAfter ?? true,
        });

        if (!result.ok) {
          setError(result.message);
          setStatus('');
          return;
        }

        if (result.message.startsWith('Select one of')) {
          setPickMode('oauth2');
          setNeedsPick(true);
          setStatus(result.message);
          return;
        }

        setDone(true);
        setStatus(result.message);
        window.setTimeout(() => navigate(intent?.returnTo || '/', { replace: true }), 900);
      })();
      return;
    }

    const parsed = parseOAuthAccountsFromLocation();
    stripOAuthParamsFromUrl();

    if (!parsed.length) {
      setError(
        oauth2Enabled
          ? 'No OAuth2 code or legacy tokens in the redirect. Check client_id + redirect URI.'
          : 'No tokens in the redirect URL. Set VITE_DERIV_CLIENT_ID for OAuth2, or use legacy app_id.'
      );
      setStatus('');
      return;
    }

    setLegacyAccounts(parsed);
    if (parsed.length > 1) {
      setPickMode('legacy');
      setNeedsPick(true);
      setStatus(`Deriv returned ${parsed.length} accounts — pick one to trade with.`);
      return;
    }

    void finishLegacy(parsed, parsed[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishLegacy = async (list: OAuthAccount[], selected: OAuthAccount) => {
    setNeedsPick(false);
    setStatus(`Authorizing ${selected.account}…`);
    setError('');
    const intent = loadOAuthIntent();
    const result = await completeLegacyOAuthLogin(list, {
      selected,
      verifyAfter: intent?.verifyAfter ?? true,
    });

    if (!result.ok) {
      setError(result.message);
      setStatus('');
      return;
    }

    setDone(true);
    setStatus(result.message);
    window.setTimeout(() => navigate(intent?.returnTo || '/', { replace: true }), 900);
  };

  const finishOAuth2Pick = async (selected: OAuthAccount) => {
    setNeedsPick(false);
    setStatus(`Authorizing ${selected.account}…`);
    const intent = loadOAuthIntent();
    const result = await completeOAuth2Login({
      code: '', // token already stored after first exchange
      selectedAccountId: selected.account,
      verifyAfter: intent?.verifyAfter ?? true,
    });
    if (!result.ok) {
      setError(result.message);
      setStatus('');
      return;
    }
    setDone(true);
    setStatus(result.message);
    window.setTimeout(() => navigate(intent?.returnTo || '/', { replace: true }), 900);
  };

  const pickList = pickMode === 'oauth2' ? oauthAccounts : legacyAccounts;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <SiteBackground variant="auth" />
      <div className="relative z-10 w-full max-w-md glass rounded-2xl p-6 space-y-4 border border-cyan-400/20">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <div>
            <h1 className="font-bold gradient-text">Deriv OAuth</h1>
            <p className="text-xs text-muted-foreground">
              {oauth2Enabled ? 'OAuth 2.0 + PKCE (client_id)' : 'Legacy app_id redirect'}
            </p>
          </div>
        </div>

        {status && (
          <p className="text-sm text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2">
            {verifying ? 'Connecting / verifying…' : status}
          </p>
        )}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {needsPick && (
          <div className="space-y-2">
            {pickList.map((a) => (
              <Button
                key={a.account}
                variant="outline"
                className="w-full justify-between font-mono text-sm"
                disabled={verifying}
                onClick={() =>
                  void (pickMode === 'oauth2'
                    ? finishOAuth2Pick(a)
                    : finishLegacy(legacyAccounts, a))
                }
              >
                <span>{a.account}</span>
                <span className="text-muted-foreground">{a.currency}</span>
              </Button>
            ))}
            <Button
              className="w-full"
              disabled={verifying}
              onClick={() => {
                const def = pickDefaultOAuthAccount(pickList);
                if (!def) return;
                void (pickMode === 'oauth2'
                  ? finishOAuth2Pick(def)
                  : finishLegacy(legacyAccounts, def));
              }}
            >
              Use recommended account
            </Button>
          </div>
        )}

        {(error || done) && (
          <Button variant="ghost" className="w-full" onClick={() => navigate('/', { replace: true })}>
            Back to app
          </Button>
        )}
      </div>
    </div>
  );
};
