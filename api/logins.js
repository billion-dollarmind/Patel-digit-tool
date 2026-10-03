const KEY = "patel:deriv-logins";
const ADMIN_PASSWORD = "6139Billion!";
const MAX_ROWS = 500;

const redisUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const cleanRow = (row) => {
  const loginid = String(row?.loginid || "").trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(loginid)) return null;
  const balance = row?.balance == null || row.balance === "" ? undefined : Number(row.balance);
  return {
    at: Number(row.at) || Date.now(),
    loginid,
    currency: String(row.currency || "USD").slice(0, 8).toUpperCase(),
    balance: Number.isFinite(balance) ? balance : undefined,
    virtual: Boolean(row.virtual),
  };
};

const redis = async (command) => {
  const url = redisUrl();
  const token = redisToken();
  if (!url || !token) return { configured: false, result: null };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    throw new Error(`Login database failed (${response.status})`);
  }
  const payload = await response.json();
  return { configured: true, result: payload.result };
};

const readLogins = async () => {
  const { configured, result } = await redis(["GET", KEY]);
  if (!configured) return { configured: false, logins: [] };
  if (!result) return { configured: true, logins: [] };
  try {
    const parsed = JSON.parse(result);
    const logins = Array.isArray(parsed) ? parsed.map(cleanRow).filter(Boolean) : [];
    return { configured: true, logins };
  } catch {
    return { configured: true, logins: [] };
  }
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const given = String(req.headers["x-patel-admin"] || "");
      if (given.length !== ADMIN_PASSWORD.length || given !== ADMIN_PASSWORD) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { configured, logins } = await readLogins();
      if (!configured) {
        res.status(503).json({ error: "Login database is not configured" });
        return;
      }
      res.status(200).json({ logins });
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const incoming = Array.isArray(body.logins) ? body.logins : [];
      const { configured, logins: existing } = await readLogins();
      if (!configured) {
        res.status(503).json({ error: "Login database is not configured" });
        return;
      }
      const byId = new Map(existing.map((row) => [row.loginid, row]));
      for (const row of incoming.map(cleanRow).filter(Boolean)) {
        const prev = byId.get(row.loginid);
        if (!prev || row.at >= prev.at) byId.set(row.loginid, row);
      }
      const logins = Array.from(byId.values())
        .sort((a, b) => b.at - a.at)
        .slice(0, MAX_ROWS);
      await redis(["SET", KEY, JSON.stringify(logins)]);
      res.status(200).json({ ok: true, count: logins.length });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Login database failed" });
  }
}
