import fs from 'fs';
import path from 'path';

const MAX = 500;

export const loginFile = (root) => path.join(root, 'data', 'deriv-logins.json');

const cleanRow = (row) => {
  const loginid = String(row?.loginid || '').trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(loginid)) return null;
  const balance = row.balance == null || row.balance === '' ? undefined : Number(row.balance);
  return {
    at: Number(row.at) || Date.now(),
    loginid,
    currency: String(row.currency || 'USD').slice(0, 8).toUpperCase(),
    balance: Number.isFinite(balance) ? balance : undefined,
    virtual: Boolean(row.virtual),
  };
};

export const readLogins = (file) => {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed.logins) ? parsed.logins.map(cleanRow).filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const upsertLogins = (file, incoming) => {
  const byId = new Map();
  for (const row of readLogins(file)) byId.set(row.loginid, row);
  for (const row of incoming.map(cleanRow).filter(Boolean)) {
    const prev = byId.get(row.loginid);
    if (!prev || row.at >= prev.at) byId.set(row.loginid, row);
  }
  const logins = Array.from(byId.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ logins }, null, 2));
  return logins;
};
