/* Honeypot API — Cloudflare Worker + D1, served on sakoi-cyber.me/api/honeypot/*.
   - POST /ingest   : the VPS agent pushes attack events (Bearer token auth). Not public.
   - GET  /stats    : aggregated, anonymised-enough stats for the public dashboard. Read-only.
   The ingest token is a Worker secret (env.HP_TOKEN); it never appears in the repo or the browser. */

const MAX_EVENTS = 200;          // per ingest call
const MAX_PAYLOAD = 240;         // stored chars per field
const RETENTION_DAYS = 30;
const STATS_CACHE_S = 15;

const json = (body, status = 200, extra) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "x-content-type-options": "nosniff", ...(extra || {}) } });
const pub = (body, status = 200) => json(body, status, {
  "access-control-allow-origin": "https://sakoi-cyber.me", "cache-control": "public, max-age=" + STATS_CACHE_S, "vary": "Origin" });

const clip = (s, n) => (s == null ? null : String(s).slice(0, n || MAX_PAYLOAD));
const now = () => Math.floor(Date.now() / 1000);
const isIp = s => typeof s === "string" && /^[0-9a-fA-F:.]{3,45}$/.test(s);

async function ingest(req, env) {
  const auth = req.headers.get("authorization") || "";
  if (!env.HP_TOKEN || auth !== "Bearer " + env.HP_TOKEN) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (!events.length) return json({ ok: true, count: 0 });
  const stmt = env.DB.prepare(
    "INSERT INTO events (ts, ip, country, proto, port, cred, payload, path, ua) VALUES (?,?,?,?,?,?,?,?,?)");
  const batch = [];
  for (const e of events) {
    if (!isIp(e.ip)) continue;
    batch.push(stmt.bind(
      Number.isFinite(e.ts) ? Math.floor(e.ts) : now(),
      clip(e.ip, 45),
      clip(e.country, 2) || "??",
      clip(e.proto, 12) || "tcp",
      Number.isFinite(e.port) ? (e.port | 0) : 0,
      clip(e.cred, MAX_PAYLOAD),
      clip(e.payload, MAX_PAYLOAD),
      clip(e.path, MAX_PAYLOAD),
      clip(e.ua, MAX_PAYLOAD)));
  }
  if (batch.length) await env.DB.batch(batch);
  // opportunistic housekeeping (~1 call in 20)
  if (Math.random() < 0.05)
    await env.DB.prepare("DELETE FROM events WHERE ts < ?").bind(now() - RETENTION_DAYS * 86400).run();
  return json({ ok: true, count: batch.length });
}

async function stats(env) {
  const t24 = now() - 86400, t7 = now() - 7 * 86400;
  const one = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first()) || {};
  const all = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results || [];

  const totals = await one(
    "SELECT COUNT(*) AS total, COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT country) AS countries FROM events");
  const d24 = await one("SELECT COUNT(*) AS n, COUNT(DISTINCT ip) AS ips FROM events WHERE ts >= ?", t24);
  const topIps = await all(
    "SELECT ip, country, COUNT(*) AS n, MAX(ts) AS last FROM events GROUP BY ip ORDER BY n DESC LIMIT 12");
  const topCountries = await all(
    "SELECT country, COUNT(*) AS n FROM events WHERE country != '??' GROUP BY country ORDER BY n DESC LIMIT 12");
  const topPorts = await all(
    "SELECT port, proto, COUNT(*) AS n FROM events GROUP BY port ORDER BY n DESC LIMIT 10");
  const topCreds = await all(
    "SELECT cred, COUNT(*) AS n FROM events WHERE cred IS NOT NULL AND cred != '' GROUP BY cred ORDER BY n DESC LIMIT 12");
  const recent = await all(
    "SELECT ts, ip, country, proto, port, cred, payload, path FROM events ORDER BY ts DESC LIMIT 40");
  const rows = await all(
    "SELECT ts/3600*3600 AS h, COUNT(*) AS n FROM events WHERE ts >= ? GROUP BY h ORDER BY h", t24);
  // live globe points: distinct recent IPs with a country (capped)
  const points = await all(
    "SELECT ip, country, MAX(ts) AS ts, COUNT(*) AS n FROM events WHERE ts >= ? AND country != '??' GROUP BY ip ORDER BY ts DESC LIMIT 120", t7);

  return pub({
    generated: now(),
    totals: { total: totals.total || 0, ips: totals.ips || 0, countries: totals.countries || 0,
      last24: d24.n || 0, ips24: d24.ips || 0 },
    topIps, topCountries, topPorts, topCreds, recent, points,
    timeline: rows.map(r => ({ h: r.h, n: r.n })),
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://sakoi-cyber.me", "access-control-allow-methods": "GET,OPTIONS" } });
    try {
      if (req.method === "POST" && path === "/api/honeypot/ingest") return await ingest(req, env);
      if (req.method === "GET" && path === "/api/honeypot/stats") return await stats(env);
      return json({ error: "not_found" }, 404);
    } catch (e) { return json({ error: "server_error", detail: String(e).slice(0, 120) }, 500); }
  },
};
