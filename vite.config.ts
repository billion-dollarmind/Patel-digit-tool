import type { IncomingMessage, ServerResponse } from "http";
import { defineConfig, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Plain Node store shared by the dev server. Types live on the calls below.
// @ts-expect-error no declaration file for the javascript store
import { loginFile, readLogins, upsertLogins } from "./server/loginStore.mjs";

const ADMIN_PASSWORD = "6139Billion!";

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const handleLoginApi = async (
  root: string,
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
) => {
  const pathOnly = (req.url || "").split("?")[0];
  if (pathOnly !== "/api/logins") {
    next();
    return;
  }
  try {
    const file = loginFile(root);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "GET") {
      const given = req.headers["x-patel-admin"];
      if (given !== ADMIN_PASSWORD) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      res.end(JSON.stringify({ logins: readLogins(file) }));
      return;
    }
    if (req.method === "POST") {
      let body: { logins?: unknown[] } = {};
      try {
        body = JSON.parse(await readBody(req)) as { logins?: unknown[] };
      } catch {
        body = {};
      }
      const logins = upsertLogins(file, Array.isArray(body.logins) ? body.logins : []);
      res.end(JSON.stringify({ ok: true, count: logins.length }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Login database failed" }));
  }
};

/** Shared Deriv login list for every browser that hits this server. */
const loginRegistryPlugin = (): Plugin => ({
  name: "patel-login-registry",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      void handleLoginApi(server.config.root, req, res, next);
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      void handleLoginApi(server.config.root, req, res, next);
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [loginRegistryPlugin(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
