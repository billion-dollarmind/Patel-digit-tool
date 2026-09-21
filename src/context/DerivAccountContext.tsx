import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  tradingClient,
  VERIFY_STAKE,
  VERIFY_SYMBOL,
  type AuthorizeInfo,
  type VerificationResult,
} from '@/lib/derivTrading';
import {
  clearOAuthAccounts,
  clearOAuthIntent,
  clearOAuth2TokenSet,
  DERIV_APP_ID,
  DERIV_CLIENT_ID,
  exchangeOAuth2Code,
  fetchOAuth2Accounts,
  getOAuthRedirectUri,
  isBearerAccessToken,
  isOAuth2Configured,
  loadOAuthAccounts,
  loadOAuthIntent,
  loadOAuth2TokenSet,
  pickDefaultOAuthAccount,
  saveOAuthAccounts,
  startDerivOAuth,
  type OAuthAccount,
} from '@/lib/derivOAuth';

const TOKEN_KEY = 'patel-deriv-token';
const VERIFY_KEY = 'patel-deriv-verified';
const ACCOUNT_LIST_KEY = 'patel-deriv-oauth-account-list';
const ACTIVE_ACCOUNT_KEY = 'patel-deriv-active-account';
const REDIRECT_FALLBACK = '/oauth/callback';

interface DerivAccountContextValue {
  token: string | null;
  account: AuthorizeInfo | null;
  oauthAccounts: OAuthAccount[];
  verified: boolean;
  verifying: boolean;
  lastVerification: VerificationResult | null;
  error: string | null;
  appId: string;
  clientId: string;
  oauth2Enabled: boolean;
  redirectUri: string;
  connectAndVerify: (
    token: string,
    runTrade?: boolean,
    opts?: { accountId?: string; currency?: string }
  ) => Promise<VerificationResult>;
  connectOnly: (
    token: string,
    opts?: { accountId?: string; currency?: string }
  ) => Promise<AuthorizeInfo>;
  loginWithDerivOAuth: (opts?: {
    verifyAfter?: boolean;
    returnTo?: string;
    prompt?: 'registration';
    forceLegacy?: boolean;
  }) => Promise<void>;
  completeLegacyOAuthLogin: (
    accounts: OAuthAccount[],
    opts?: { verifyAfter?: boolean; selected?: OAuthAccount }
  ) => Promise<VerificationResult>;
  completeOAuth2Login: (opts?: {
    code?: string;
    verifyAfter?: boolean;
    selectedAccountId?: string;
  }) => Promise<VerificationResult>;
  switchOAuthAccount: (account: OAuthAccount, runVerify?: boolean) => Promise<VerificationResult>;
  disconnectAccount: () => void;
  placeAppTrade: (params: {
    contractType: Parameters<typeof tradingClient.placeTrade>[0]['contractType'];
    symbol: string;
    amount: number;
    duration?: number;
    barrier?: string | number;
    growthRate?: number;
  }) => ReturnType<typeof tradingClient.placeTrade>;
  verifyStake: number;
  verifySymbol: string;
}

const DerivAccountContext = createContext<DerivAccountContextValue | null>(null);

const loadStoredAccountList = (): OAuthAccount[] => {
  try {
    const raw = localStorage.getItem(ACCOUNT_LIST_KEY);
    if (raw) return JSON.parse(raw) as OAuthAccount[];
  } catch {
    /* ignore */
  }
  return loadOAuthAccounts();
};

export const DerivAccountProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    const oauth2 = loadOAuth2TokenSet();
    return oauth2?.accessToken || localStorage.getItem(TOKEN_KEY);
  });
  const [account, setAccount] = useState<AuthorizeInfo | null>(null);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>(() => loadStoredAccountList());
  const [verified, setVerified] = useState(() => localStorage.getItem(VERIFY_KEY) === 'true');
  const [verifying, setVerifying] = useState(false);
  const [lastVerification, setLastVerification] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState(REDIRECT_FALLBACK);

  useEffect(() => {
    setRedirectUri(getOAuthRedirectUri());
  }, []);

  // Soft reconnect on refresh
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY) || undefined;
        const info = await tradingClient.authorizeSmart(token, {
          accountId: activeId || oauthAccounts[0]?.account,
          currency: oauthAccounts[0]?.currency,
        });
        if (!cancelled) {
          setAccount(info);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to restore Deriv session');
          setVerified(false);
          localStorage.removeItem(VERIFY_KEY);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const connectOnly = useCallback(
    async (nextToken: string, opts?: { accountId?: string; currency?: string }) => {
      setError(null);
      const info = await tradingClient.authorizeSmart(nextToken.trim(), opts);
      localStorage.setItem(TOKEN_KEY, nextToken.trim());
      if (opts?.accountId) localStorage.setItem(ACTIVE_ACCOUNT_KEY, opts.accountId);
      setToken(nextToken.trim());
      setAccount(info);
      return info;
    },
    []
  );

  const connectAndVerify = useCallback(
    async (
      nextToken: string,
      runTrade = true,
      opts?: { accountId?: string; currency?: string }
    ) => {
      setVerifying(true);
      setError(null);
      try {
        const trimmed = nextToken.trim();
        if (!trimmed) {
          const fail: VerificationResult = { ok: false, message: 'Deriv API token is required' };
          setLastVerification(fail);
          return fail;
        }

        if (!runTrade) {
          const info = await connectOnly(trimmed, opts);
          const result: VerificationResult = {
            ok: true,
            message: `Connected ${info.loginid} (verification trade skipped)`,
            authorize: info,
          };
          setLastVerification(result);
          setVerified(true);
          localStorage.setItem(VERIFY_KEY, 'true');
          return result;
        }

        const result = await tradingClient.runVerificationTrade(trimmed, opts);
        setLastVerification(result);
        if (result.ok && result.authorize) {
          localStorage.setItem(TOKEN_KEY, trimmed);
          if (opts?.accountId) localStorage.setItem(ACTIVE_ACCOUNT_KEY, opts.accountId);
          setToken(trimmed);
          setAccount(result.authorize);
          setVerified(true);
          localStorage.setItem(VERIFY_KEY, 'true');
        } else {
          setVerified(false);
          localStorage.removeItem(VERIFY_KEY);
          setError(result.message);
        }
        return result;
      } finally {
        setVerifying(false);
      }
    },
    [connectOnly]
  );

  const loginWithDerivOAuth = useCallback(
    async (opts?: {
      verifyAfter?: boolean;
      returnTo?: string;
      prompt?: 'registration';
      forceLegacy?: boolean;
    }) => {
      await startDerivOAuth({
        verifyAfter: opts?.verifyAfter ?? true,
        returnTo: opts?.returnTo ?? '/',
        prompt: opts?.prompt,
        forceLegacy: opts?.forceLegacy,
      });
    },
    []
  );

  const completeLegacyOAuthLogin = useCallback(
    async (
      accounts: OAuthAccount[],
      opts?: { verifyAfter?: boolean; selected?: OAuthAccount }
    ) => {
      if (!accounts.length) {
        const fail: VerificationResult = {
          ok: false,
          message: 'No accounts returned from Deriv OAuth',
        };
        setLastVerification(fail);
        setError(fail.message);
        return fail;
      }

      saveOAuthAccounts(accounts);
      localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(accounts));
      setOauthAccounts(accounts);

      const intent = loadOAuthIntent();
      const verifyAfter = opts?.verifyAfter ?? intent?.verifyAfter ?? true;
      const selected = opts?.selected || pickDefaultOAuthAccount(accounts);

      if (!selected) {
        const fail: VerificationResult = { ok: false, message: 'Could not select an account' };
        setLastVerification(fail);
        return fail;
      }

      clearOAuthIntent();
      return connectAndVerify(selected.token, verifyAfter, {
        accountId: selected.account,
        currency: selected.currency,
      });
    },
    [connectAndVerify]
  );

  const completeOAuth2Login = useCallback(
    async (opts?: { code?: string; verifyAfter?: boolean; selectedAccountId?: string }) => {
      if (!opts?.code && !loadOAuth2TokenSet()?.accessToken) {
        const fail: VerificationResult = { ok: false, message: 'Missing OAuth2 authorization code' };
        setLastVerification(fail);
        return fail;
      }

      setVerifying(true);
      setError(null);
      try {
        let accessToken = loadOAuth2TokenSet()?.accessToken;
        if (!accessToken) {
          if (!opts?.code) {
            throw new Error('Missing OAuth2 authorization code');
          }
          const tokens = await exchangeOAuth2Code(opts.code);
          accessToken = tokens.accessToken;
        }

        let accounts = loadStoredAccountList();
        if (!accounts.length || !opts?.selectedAccountId) {
          accounts = await fetchOAuth2Accounts(accessToken);
          saveOAuthAccounts(accounts);
          localStorage.setItem(ACCOUNT_LIST_KEY, JSON.stringify(accounts));
          setOauthAccounts(accounts);
        }

        if (!accounts.length) {
          const fail: VerificationResult = {
            ok: false,
            message: 'OAuth2 succeeded but no trading accounts were returned',
          };
          setLastVerification(fail);
          setError(fail.message);
          return fail;
        }

        const intent = loadOAuthIntent();
        const verifyAfter = opts?.verifyAfter ?? intent?.verifyAfter ?? true;

        if (accounts.length > 1 && !opts?.selectedAccountId) {
          const pending: VerificationResult = {
            ok: true,
            message: `Select one of ${accounts.length} accounts`,
          };
          setLastVerification(pending);
          return pending;
        }

        const selected =
          accounts.find((a) => a.account === opts?.selectedAccountId) ||
          pickDefaultOAuthAccount(accounts);

        if (!selected) {
          const fail: VerificationResult = { ok: false, message: 'Could not select an account' };
          setLastVerification(fail);
          return fail;
        }

        clearOAuthIntent();
        return connectAndVerify(accessToken, verifyAfter, {
          accountId: selected.account,
          currency: selected.currency,
        });
      } catch (err) {
        const fail: VerificationResult = {
          ok: false,
          message: err instanceof Error ? err.message : 'OAuth2 login failed',
        };
        setLastVerification(fail);
        setError(fail.message);
        return fail;
      } finally {
        setVerifying(false);
      }
    },
    [connectAndVerify]
  );

  const switchOAuthAccount = useCallback(
    async (next: OAuthAccount, runVerify = false) => {
      const activeToken =
        (isBearerAccessToken(next.token) ? next.token : null) ||
        loadOAuth2TokenSet()?.accessToken ||
        token ||
        next.token;
      return connectAndVerify(activeToken, runVerify, {
        accountId: next.account,
        currency: next.currency,
      });
    },
    [connectAndVerify, token]
  );

  const disconnectAccount = useCallback(() => {
    tradingClient.disconnect();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(VERIFY_KEY);
    localStorage.removeItem(ACCOUNT_LIST_KEY);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    clearOAuthAccounts();
    clearOAuthIntent();
    clearOAuth2TokenSet();
    setToken(null);
    setAccount(null);
    setOauthAccounts([]);
    setVerified(false);
    setLastVerification(null);
    setError(null);
  }, []);

  const placeAppTrade = useCallback(
    (params: Parameters<typeof tradingClient.placeTrade>[0]) => tradingClient.placeTrade(params),
    []
  );

  const value = useMemo(
    () => ({
      token,
      account,
      oauthAccounts,
      verified,
      verifying,
      lastVerification,
      error,
      appId: DERIV_APP_ID,
      clientId: DERIV_CLIENT_ID,
      oauth2Enabled: isOAuth2Configured(),
      redirectUri,
      connectAndVerify,
      connectOnly,
      loginWithDerivOAuth,
      completeLegacyOAuthLogin,
      completeOAuth2Login,
      switchOAuthAccount,
      disconnectAccount,
      placeAppTrade,
      verifyStake: VERIFY_STAKE,
      verifySymbol: VERIFY_SYMBOL,
    }),
    [
      token,
      account,
      oauthAccounts,
      verified,
      verifying,
      lastVerification,
      error,
      redirectUri,
      connectAndVerify,
      connectOnly,
      loginWithDerivOAuth,
      completeLegacyOAuthLogin,
      completeOAuth2Login,
      switchOAuthAccount,
      disconnectAccount,
      placeAppTrade,
    ]
  );

  return <DerivAccountContext.Provider value={value}>{children}</DerivAccountContext.Provider>;
};

export const useDerivAccount = () => {
  const ctx = useContext(DerivAccountContext);
  if (!ctx) throw new Error('useDerivAccount must be used within DerivAccountProvider');
  return ctx;
};
