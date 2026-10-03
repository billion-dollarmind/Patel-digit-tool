const LOG_KEY = 'patel-deriv-login-log';

export interface DerivLoginRecord {
  at: number;
  loginid: string;
  currency: string;
  balance?: number;
  virtual?: boolean;
}

export const loadDerivLoginLog = (): DerivLoginRecord[] => {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DerivLoginRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Keep the latest balance seen for each Deriv login on this browser. */
export const rememberDerivLogins = (
  rows: Array<Omit<DerivLoginRecord, 'at'> & { at?: number }>
) => {
  const now = Date.now();
  const byId = new Map<string, DerivLoginRecord>();
  for (const existing of loadDerivLoginLog()) byId.set(existing.loginid, existing);
  for (const row of rows) {
    if (!row.loginid) continue;
    byId.set(row.loginid, {
      at: row.at ?? now,
      loginid: row.loginid,
      currency: row.currency || 'USD',
      balance: row.balance,
      virtual: row.virtual,
    });
  }
  const next = Array.from(byId.values()).sort((a, b) => b.at - a.at).slice(0, 100);
  localStorage.setItem(LOG_KEY, JSON.stringify(next));
  return next;
};
