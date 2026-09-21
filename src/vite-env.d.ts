/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DERIV_APP_ID?: string;
  readonly VITE_DERIV_CLIENT_ID?: string;
  readonly VITE_DERIV_OAUTH_SCOPES?: string;
  readonly VITE_DERIV_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
