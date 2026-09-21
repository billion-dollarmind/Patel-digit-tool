import {
  DERIV_API_BASE,
  DERIV_APP_ID,
  DERIV_CLIENT_ID,
  DERIV_LEGACY_OAUTH_URL,
  DERIV_OAUTH2_AUTH_URL,
  DERIV_OAUTH2_TOKEN_URL,
  DERIV_OAUTH_CALLBACK_PATH,
  DERIV_OAUTH_SCOPES,
  DERIV_REDIRECT_URI,
  getOAuthRedirectUri,
  isOAuth2Configured,
  isOAuthCallbackLocation,
} from '@/lib/derivConfig';

export {
  DERIV_APP_ID,
  DERIV_CLIENT_ID,
  DERIV_OAUTH_CALLBACK_PATH,
  DERIV_OAUTH_SCOPES,
  DERIV_REDIRECT_URI,
  getOAuthRedirectUri,
  isOAuth2Configured,
  isOAuthCallbackLocation,
} from '@/lib/derivConfig';

export interface OAuthAccount {
  account: string;
  token: string;
  currency: string;
}

export interface OAuth2TokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  scope?: string;
}

export interface OAuthIntent {
  verifyAfter: boolean;
  returnTo: string;
  mode: 'oauth2' | 'legacy';
  prompt?: 'registration';
  startedAt: number;
}

const OAUTH_INTENT_KEY = 'patel-deriv-oauth-intent';
const OAUTH_ACCOUNTS_KEY = 'patel-deriv-oauth-accounts';
const PKCE_VERIFIER_KEY = 'patel-oauth2-code-verifier';
const PKCE_STATE_KEY = 'patel-oauth2-state';
const PKCE_TS_KEY = 'patel-oauth2-pkce-ts';
const OAUTH2_TOKEN_KEY = 'patel-oauth2-token-set';
const OAUTH_START_FLAG = 'patel_oauth_start';
const PKCE_TTL_MS = 10 * 60 * 1000;

/** Parent cookie domain so www and apex share PKCE (e.g. .dukehub.site) */
const cookieDomainForRedirect = (): string | undefined => {
  try {
    const host = new URL(getOAuthRedirectUri()).hostname;
    const parts = host.split('.').filter(Boolean);
    if (parts.length >= 2) return `.${parts.slice(-2).join('.')}`;
  } catch {
    /* ignore */
  }
  return undefined;
};

const writeCookie = (name: string, value: string, maxAgeSec = 600) => {
  if (typeof document === 'undefined') return;
  const domain = cookieDomainForRedirect();
  let cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    cookie += '; Secure';
  }
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
};

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=') || '');
  }
  return null;
};

const clearCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  const domain = cookieDomainForRedirect();
  let cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  if (domain) cookie += `; Domain=${domain}`;
  document.cookie = cookie;
  // Also clear host-only cookie if Domain one differs
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
};

const pkceStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return window.sessionStorage;
  }
};

const setPkce = (verifier: string, state: string) => {
  const store = pkceStorage();
  const ts = String(Date.now());
  store.setItem(PKCE_VERIFIER_KEY, verifier);
  store.setItem(PKCE_STATE_KEY, state);
  store.setItem(PKCE_TS_KEY, ts);
  try {
    sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    sessionStorage.setItem(PKCE_STATE_KEY, state);
    sessionStorage.setItem(PKCE_TS_KEY, ts);
  } catch {
    /* ignore */
  }
  // Shared across www / non-www on the same registrable domain
  writeCookie(PKCE_VERIFIER_KEY, verifier);
  writeCookie(PKCE_STATE_KEY, state);
  writeCookie(PKCE_TS_KEY, ts);
};

const getPkce = () => {
  const store = pkceStorage();
  const ts = Number(
    store.getItem(PKCE_TS_KEY) ||
      sessionStorage.getItem(PKCE_TS_KEY) ||
      readCookie(PKCE_TS_KEY) ||
      0
  );
  if (ts && Date.now() - ts > PKCE_TTL_MS) {
    clearPkce();
    return { verifier: null as string | null, state: null as string | null, expired: true };
  }
  const verifier =
    store.getItem(PKCE_VERIFIER_KEY) ||
    sessionStorage.getItem(PKCE_VERIFIER_KEY) ||
    readCookie(PKCE_VERIFIER_KEY);
  const state =
    store.getItem(PKCE_STATE_KEY) ||
    sessionStorage.getItem(PKCE_STATE_KEY) ||
    readCookie(PKCE_STATE_KEY);
  return { verifier, state, expired: false };
};

const clearPkce = () => {
  const store = pkceStorage();
  [PKCE_VERIFIER_KEY, PKCE_STATE_KEY, PKCE_TS_KEY].forEach((k) => {
    store.removeItem(k);
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    clearCookie(k);
  });
};

/** If we're not on the registered redirect origin, bounce there first so PKCE can work */
export const getOAuthRedirectOrigin = () => {
  try {
    return new URL(getOAuthRedirectUri()).origin;
  } catch {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
};

export const isOnOAuthRedirectOrigin = () => {
  if (typeof window === 'undefined') return true;
  const configured = DERIV_REDIRECT_URI;
  if (!configured) return true;
  return window.location.origin === getOAuthRedirectOrigin();
};

export const saveOAuthIntent = (intent: Omit<OAuthIntent, 'startedAt'>) => {
  const payload = JSON.stringify({ ...intent, startedAt: Date.now() } satisfies OAuthIntent);
  try {
    localStorage.setItem(OAUTH_INTENT_KEY, payload);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(OAUTH_INTENT_KEY, payload);
  } catch {
    /* ignore */
  }
  writeCookie(OAUTH_INTENT_KEY, payload);
};

export const loadOAuthIntent = (): OAuthIntent | null => {
  try {
    const raw =
      localStorage.getItem(OAUTH_INTENT_KEY) ||
      sessionStorage.getItem(OAUTH_INTENT_KEY) ||
      readCookie(OAUTH_INTENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OAuthIntent;
  } catch {
    return null;
  }
};

export const clearOAuthIntent = () => {
  try {
    localStorage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    /* ignore */
  }
  clearCookie(OAUTH_INTENT_KEY);
};

export const saveOAuthAccounts = (accounts: OAuthAccount[]) => {
  sessionStorage.setItem(OAUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const loadOAuthAccounts = (): OAuthAccount[] => {
  try {
    const raw = sessionStorage.getItem(OAUTH_ACCOUNTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OAuthAccount[];
  } catch {
    return [];
  }
};

export const clearOAuthAccounts = () => sessionStorage.removeItem(OAUTH_ACCOUNTS_KEY);

export const saveOAuth2TokenSet = (tokens: OAuth2TokenSet) => {
  localStorage.setItem(OAUTH2_TOKEN_KEY, JSON.stringify(tokens));
};

export const loadOAuth2TokenSet = (): OAuth2TokenSet | null => {
  try {
    const raw = localStorage.getItem(OAUTH2_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuth2TokenSet;
    if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(OAUTH2_TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearOAuth2TokenSet = () => localStorage.removeItem(OAUTH2_TOKEN_KEY);

// ——— PKCE helpers ———

const base64Url = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  arr.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64Url(array);
};

export const generateCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(digest);
};

export const generateOAuthState = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Build new OAuth2 + PKCE authorize URL */
export const buildOAuth2AuthorizeUrl = async (opts?: {
  prompt?: 'registration';
  language?: string;
}) => {
  if (!isOAuth2Configured()) {
    throw new Error('VITE_DERIV_CLIENT_ID is not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateOAuthState();
  const redirectUri = getOAuthRedirectUri();

  setPkce(codeVerifier, state);

  const url = new URL(DERIV_OAUTH2_AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', DERIV_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', DERIV_OAUTH_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // Bridge users still on legacy Deriv API
  if (DERIV_APP_ID) url.searchParams.set('app_id', DERIV_APP_ID);
  if (opts?.prompt) url.searchParams.set('prompt', opts.prompt);
  if (opts?.language) url.searchParams.set('lang', opts.language);

  return url.toString();
};

/** Legacy authorize URL (acct/token in redirect) */
export const buildLegacyOAuthUrl = (opts?: { language?: string }) => {
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID,
    l: opts?.language || 'en',
    brand: 'deriv',
  });
  return `${DERIV_LEGACY_OAUTH_URL}?${params.toString()}`;
};

/** Start OAuth — OAuth2+PKCE when client_id set, else legacy */
export const startDerivOAuth = async (intent: {
  verifyAfter: boolean;
  returnTo: string;
  prompt?: 'registration';
  forceLegacy?: boolean;
}) => {
  const useOAuth2 = isOAuth2Configured() && !intent.forceLegacy;

  // PKCE state must be created on the same origin as the redirect URI
  if (useOAuth2 && !isOnOAuthRedirectOrigin()) {
    const target = new URL(getOAuthRedirectUri());
    target.searchParams.set(OAUTH_START_FLAG, '1');
    target.searchParams.set('verify', intent.verifyAfter ? '1' : '0');
    target.searchParams.set('returnTo', intent.returnTo || '/');
    if (intent.prompt) target.searchParams.set('prompt', intent.prompt);
    window.location.assign(target.toString());
    return;
  }

  saveOAuthIntent({
    verifyAfter: intent.verifyAfter,
    returnTo: intent.returnTo,
    mode: useOAuth2 ? 'oauth2' : 'legacy',
    prompt: intent.prompt,
  });

  if (useOAuth2) {
    const url = await buildOAuth2AuthorizeUrl({ prompt: intent.prompt });
    window.location.assign(url);
    return;
  }

  window.location.assign(buildLegacyOAuthUrl());
};

/** Consume ?patel_oauth_start=1 on the redirect host and begin Deriv login */
export const consumeOAuthStartFlag = (): {
  verifyAfter: boolean;
  returnTo: string;
  prompt?: 'registration';
} | null => {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get(OAUTH_START_FLAG) !== '1') return null;
  const result = {
    verifyAfter: q.get('verify') !== '0',
    returnTo: q.get('returnTo') || '/',
    prompt: q.get('prompt') === 'registration' ? ('registration' as const) : undefined,
  };
  q.delete(OAUTH_START_FLAG);
  q.delete('verify');
  q.delete('returnTo');
  q.delete('prompt');
  const url = new URL(window.location.href);
  url.search = q.toString();
  window.history.replaceState({}, document.title, url.pathname + (url.search ? `?${url.search}` : ''));
  return result;
};

export interface OAuth2CallbackParams {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export const parseOAuth2CallbackParams = (
  search = typeof window !== 'undefined' ? window.location.search : ''
): OAuth2CallbackParams => {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    code: q.get('code') || undefined,
    state: q.get('state') || undefined,
    error: q.get('error') || undefined,
    errorDescription: q.get('error_description') || undefined,
  };
};

export const verifyOAuth2State = (returnedState?: string) => {
  const { state: expected, expired } = getPkce();
  if (expired) {
    throw new Error(
      'OAuth login expired (over 10 minutes). Start Login with Deriv again from https://www.dukehub.site/'
    );
  }
  if (!returnedState || !expected) {
    throw new Error(
      'OAuth state missing. Use https://www.dukehub.site/ (with www), redeploy the latest build, then try Login with Deriv again.'
    );
  }
  if (returnedState !== expected) {
    throw new Error(
      'OAuth state mismatch. Prefer https://www.dukehub.site/ (with www — same as your redirect URL), then try again.'
    );
  }
};

export const exchangeOAuth2Code = async (code: string): Promise<OAuth2TokenSet> => {
  const { verifier: codeVerifier } = getPkce();
  if (!codeVerifier) {
    throw new Error(
      'Missing PKCE code_verifier. Start Login with Deriv from https://www.dukehub.site/ so the verifier is saved on that site.'
    );
  }
  if (!DERIV_CLIENT_ID) {
    throw new Error('VITE_DERIV_CLIENT_ID is not configured');
  }

  const redirectUri = getOAuthRedirectUri();
  const response = await fetch(DERIV_OAUTH2_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: DERIV_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  clearPkce();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Token exchange failed (${response.status})`);
  }

  const tokens: OAuth2TokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    scope: data.scope,
  };
  saveOAuth2TokenSet(tokens);
  return tokens;
};

/** Fetch trading accounts for OAuth2 Bearer token */
export const fetchOAuth2Accounts = async (accessToken: string): Promise<OAuthAccount[]> => {
  const response = await fetch(`${DERIV_API_BASE}/trading/v1/options/accounts`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as {
    data?: Array<{
      account_id?: string;
      loginid?: string;
      balance?: string | number;
      currency?: string;
    }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `Failed to load accounts (${response.status})`);
  }

  const rows = payload.data || [];
  return rows
    .map((row) => {
      const account = row.account_id || row.loginid || '';
      if (!account) return null;
      return {
        account,
        // OAuth2 uses Bearer + OTP; store access token reference per account slot
        token: accessToken,
        currency: (row.currency || 'USD').toUpperCase(),
      } satisfies OAuthAccount;
    })
    .filter(Boolean) as OAuthAccount[];
};

/** Get authenticated Options WebSocket URL via OTP */
export const fetchAuthenticatedWsUrl = async (accessToken: string, accountId: string) => {
  const response = await fetch(
    `${DERIV_API_BASE}/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const payload = (await response.json()) as {
    data?: { url?: string };
    error?: { message?: string };
  };

  if (!response.ok || !payload.data?.url) {
    throw new Error(payload.error?.message || `OTP WebSocket URL failed (${response.status})`);
  }

  return payload.data.url;
};

/**
 * Parse legacy acctN / tokenN / curN from query or hash.
 */
export const parseOAuthAccountsFromLocation = (
  search = typeof window !== 'undefined' ? window.location.search : '',
  hash = typeof window !== 'undefined' ? window.location.hash : ''
): OAuthAccount[] => {
  const fromSearch = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash;
  const fromHash = new URLSearchParams(hashBody.includes('=') ? hashBody : '');

  const merged = new URLSearchParams(fromSearch);
  fromHash.forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value);
  });

  const accounts: OAuthAccount[] = [];
  for (let i = 1; i <= 20; i++) {
    const account = merged.get(`acct${i}`);
    const token = merged.get(`token${i}`);
    const currency = merged.get(`cur${i}`) || 'USD';
    if (account && token) {
      accounts.push({
        account,
        token,
        currency: currency.toUpperCase(),
      });
    }
  }
  return accounts;
};

export const pickDefaultOAuthAccount = (accounts: OAuthAccount[]): OAuthAccount | null => {
  if (!accounts.length) return null;
  const real = accounts.find((a) => /^CR/i.test(a.account) && !/^CRW/i.test(a.account));
  if (real) return real;
  const demo = accounts.find((a) => /^VRTC/i.test(a.account) || /^VRW/i.test(a.account) || /^VRT/i.test(a.account));
  return demo || accounts[0];
};

export const stripOAuthParamsFromUrl = () => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  window.history.replaceState({}, document.title, url.pathname);
};

export const isBearerAccessToken = (token: string) =>
  token.startsWith('ory_at_') || token.length > 80;
