/** Deriv app configuration — OAuth2 client_id + optional legacy app_id */

/** Defaults for dukehub production (env overrides these at build time) */
const DEFAULT_CLIENT_ID = '34lHX10dJ3zAjlGmGx5x3';
const DEFAULT_REDIRECT_URI = 'https://www.dukehub.site/';

export const DERIV_APP_ID = String(import.meta.env.VITE_DERIV_APP_ID || '1089');

/** New OAuth 2.0 client id — required for Login with Deriv */
export const DERIV_CLIENT_ID = String(
  import.meta.env.VITE_DERIV_CLIENT_ID || DEFAULT_CLIENT_ID
).trim();

/** Space-separated OAuth2 scopes — only request scopes enabled on the client */
export const DERIV_OAUTH_SCOPES = String(
  import.meta.env.VITE_DERIV_OAUTH_SCOPES || 'trade'
).trim();

/**
 * Exact redirect URI registered on the Deriv OAuth2 client.
 * Must match character-for-character (including trailing slash).
 */
export const DERIV_REDIRECT_URI = String(
  import.meta.env.VITE_DERIV_REDIRECT_URI || DEFAULT_REDIRECT_URI
).trim();

export const DERIV_WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

/** New OAuth 2.0 (PKCE) — NOT oauth.deriv.com / NOT deriv.com marketing */
export const DERIV_OAUTH2_AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
export const DERIV_OAUTH2_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
export const DERIV_API_BASE = 'https://api.derivws.com';

/** Legacy OAuth (tokens in redirect query) — only if explicitly forced */
export const DERIV_LEGACY_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';

export const DERIV_OAUTH_CALLBACK_PATH = '/oauth/callback';

/** OAuth2 is configured when we have a non-empty client_id */
export const isOAuth2Configured = () => DERIV_CLIENT_ID.length > 0;

export const getOAuthRedirectUri = () => {
  if (DERIV_REDIRECT_URI) return DERIV_REDIRECT_URI;
  if (typeof window === 'undefined') return DEFAULT_REDIRECT_URI;
  return `${window.location.origin}/`;
};

/** True when URL carries OAuth2 or legacy token callback params */
export const isOAuthCallbackLocation = (search = '', pathname = '/') => {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (q.get('code') || q.get('error') || (q.get('acct1') && q.get('token1'))) return true;
  return pathname.startsWith(DERIV_OAUTH_CALLBACK_PATH);
};
