import { adminRegistryHeaders } from '@/lib/adminGate';
import type { DerivLoginRecord } from '@/lib/derivLoginLog';

const ENDPOINT = '/api/logins';

const sanitize = (row: DerivLoginRecord): DerivLoginRecord | null => {
  const loginid = String(row.loginid || '').trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(loginid)) return null;
  const balance = row.balance == null ? undefined : Number(row.balance);
  return {
    at: Number(row.at) || Date.now(),
    loginid,
    currency: String(row.currency || 'USD').slice(0, 8).toUpperCase(),
    balance: balance != null && Number.isFinite(balance) ? balance : undefined,
    virtual: Boolean(row.virtual),
  };
};

/** Save login ids and balances. Access tokens are never sent. */
export const publishLogins = async (rows: DerivLoginRecord[]) => {
  const logins = rows.map(sanitize).filter(Boolean);
  if (!logins.length) return;
  await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logins }),
  });
};

/** Every Deriv login stored on the server, from any device. */
export const fetchSharedLogins = async (): Promise<DerivLoginRecord[] | null> => {
  const response = await fetch(ENDPOINT, { headers: adminRegistryHeaders() });
  if (!response.ok) return null;
  const payload = (await response.json()) as { logins?: DerivLoginRecord[] };
  if (!Array.isArray(payload.logins)) return null;
  return payload.logins.map(sanitize).filter(Boolean) as DerivLoginRecord[];
};
