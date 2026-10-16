/* Tools API — one Cloudflare Worker, served on sakoi-cyber.me/api/tools/*. Three endpoints:
   - POST /drop         : store a PGP-encrypted message (Secure Drop). Needs D1. Read via admin token.
   - GET  /scan?url=    : grade a public site's security headers + DNS (DNSSEC/CAA/DMARC/SPF).
   - GET  /status       : up/down + latency of the sakoi-cyber.me services.
   D1 binding: DB. Secret: DROP_ADMIN (token to read the drops). */

const CORS = { "access-control-allow-origin": "https://sakoi-cyber.me", "vary": "Origin" };
const json = (b, s = 200, extra) => new Response(JSON.stringify(b), { status: s,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...CORS, ...(extra || {}) } });
const now = () => Math.floor(Date.now() / 1000);

/* ---------------- Secure Drop ---------------- */
async function drop(req, env) {
  if (!env.DB) return json({ error: "no_storage" }, 500);
  let body; try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  const ct = String(body.ct || "");
  if (!ct.startsWith("-----BEGIN PGP MESSAGE-----") || !ct.includes("-----END PGP MESSAGE-----"))
    return json({ error: "not_encrypted" }, 400);
  if (ct.length > 16384) return json({ error: "too_large" }, 413);
  await env.DB.prepare("INSERT INTO drops (ts, ct) VALUES (?, ?)").bind(now(), ct).run();
  if (Math.random() < 0.1) await env.DB.prepare("DELETE FROM drops WHERE ts < ?").bind(now() - 90 * 86400).run();
  return json({ ok: true });
}
async function dropRead(req, env, url) {
  const tok = url.searchParams.get("token") || (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!env.DROP_ADMIN || tok !== env.DROP_ADMIN) return json({ error: "unauthorized" }, 401);
  const { results } = await env.DB.prepare("SELECT id, ts, ct FROM drops ORDER BY ts DESC LIMIT 50").all();
  return json({ drops: results || [] });
}

/* ---------------- Security scanner ---------------- */
const PRIVATE = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|fe80)/i;
function safeTarget(raw) {
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); } catch (e) { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || PRIVATE.test(h)) return null;
  if (!h.includes(".")) return null;
  return u;
}
async function doh(name, type) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}&do=1`,
      { headers: { accept: "application/dns-json" }, cf: { cacheTtl: 60 } });
    return await r.json();
  } catch (e) { return null; }
}
function grade(points, max) {
  const pct = max ? points / max : 0;
  return pct >= 0.9 ? "A+" : pct >= 0.8 ? "A" : pct >= 0.65 ? "B" : pct >= 0.5 ? "C" : pct >= 0.35 ? "D" : pct >= 0.2 ? "E" : "F";
}
async function scan(url, env) {
  const target = safeTarget(url.searchParams.get("url") || "");
  if (!target) return json({ error: "bad_url" }, 400);
  const host = target.hostname;
  let resp, err = null, redirectedToHttps = false;
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 8000);
    resp = await fetch("https://" + host + target.pathname, { method: "GET", redirect: "manual", signal: ctrl.signal,
      headers: { "user-agent": "sakoi-cyber.me security scanner" }, cf: { cacheTtl: 0 } });
    clearTimeout(to);
  } catch (e) { err = String(e).slice(0, 120); }
  const H = {}; if (resp) for (const [k, v] of resp.headers) H[k.toLowerCase()] = v;
  const has = k => H[k] != null;
  const checks = [];
  const add = (id, ok, weight, value, note) => checks.push({ id, ok, weight, value: value || null, note: note || "" });

  add("https", !err, 2, err ? null : "TLS");
  const hsts = H["strict-transport-security"] || "";
  const age = +(/max-age=(\d+)/i.exec(hsts) || [])[1] || 0;
  add("hsts", age >= 15552000, 2, hsts || null);
  const csp = H["content-security-policy"] || "";
  add("csp", !!csp, 2, csp ? csp.slice(0, 80) : null);
  add("xfo", /deny|sameorigin/i.test(H["x-frame-options"] || "") || /frame-ancestors/i.test(csp), 1, H["x-frame-options"] || (/frame-ancestors[^;]*/i.exec(csp) || [])[0] || null);
  add("xcto", /nosniff/i.test(H["x-content-type-options"] || ""), 1, H["x-content-type-options"] || null);
  add("refp", has("referrer-policy"), 1, H["referrer-policy"] || null);
  add("perm", has("permissions-policy"), 1, H["permissions-policy"] ? H["permissions-policy"].slice(0, 60) : null);
  const srv = H["server"] || "";
  add("server_hidden", !/\/\d/.test(srv), 0.5, srv || "(masqué)");

  // DNS
  const [a, caa, dmarc, txt] = await Promise.all([doh(host, "A"), doh(host, "CAA"), doh("_dmarc." + host, "TXT"), doh(host, "TXT")]);
  const txtv = arr => ((arr && arr.Answer) || []).map(x => (x.data || "").replace(/^"|"$/g, "").replace(/" "/g, ""));
  add("dnssec", !!(a && a.AD), 1, a && a.AD ? "AD=1" : null);
  const caaN = ((caa && caa.Answer) || []).filter(x => x.type === 257);
  add("caa", caaN.length > 0, 1, caaN.length ? caaN.length + " enreg." : null);
  const dm = txtv(dmarc).find(x => x.startsWith("v=DMARC1"));
  add("dmarc", !!dm, 1, dm ? dm.slice(0, 50) : null);
  const spf = txtv(txt).find(x => x.startsWith("v=spf1"));
  add("spf", !!spf, 1, spf ? spf.slice(0, 50) : null);

  const got = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const max = checks.reduce((s, c) => s + c.weight, 0);
  return json({ host, grade: grade(got, max), score: Math.round(got / max * 100), checks, error: err }, 200, { "cache-control": "public, max-age=30" });
}

/* ---------------- Status ---------------- */
const SERVICES = [
  { id: "portfolio", name: "Portfolio", url: "https://sakoi-cyber.me/" },
  { id: "blog", name: "Blog", url: "https://blog.sakoi-cyber.me/" },
  { id: "ctf", name: "Arène CTF", url: "https://ctf.sakoi-cyber.me/" },
  { id: "links", name: "Liens", url: "https://links.sakoi-cyber.me/" },
  { id: "api-ctf", name: "API mini-CTF", url: "https://sakoi-cyber.me/api/ctf/leaderboard" },
  { id: "api-arena", name: "API Arène", url: "https://sakoi-cyber.me/api/arena/scoreboard" },
  { id: "api-hp", name: "API Honeypot", url: "https://sakoi-cyber.me/api/honeypot/stats" },
];
async function status() {
  const out = await Promise.all(SERVICES.map(async s => {
    const t0 = Date.now(); let up = false, code = 0;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(s.url, { method: "GET", signal: ctrl.signal, cf: { cacheTtl: 0 } });
      clearTimeout(to); code = r.status; up = r.status < 500;
    } catch (e) { up = false; }
    return { id: s.id, name: s.name, up, code, ms: Date.now() - t0 };
  }));
  const upCount = out.filter(s => s.up).length;
  return json({ generated: now(), all_up: upCount === out.length, up: upCount, total: out.length, services: out },
    200, { "cache-control": "public, max-age=20" });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" } });
    try {
      if (req.method === "POST" && path === "/api/tools/drop") {
        const o = req.headers.get("origin"); if (o && o !== "https://sakoi-cyber.me") return json({ error: "forbidden" }, 403);
        return await drop(req, env);
      }
      if (req.method === "GET" && path === "/api/tools/drop/read") return await dropRead(req, env, url);
      if (req.method === "GET" && path === "/api/tools/scan") return await scan(url, env);
      if (req.method === "GET" && path === "/api/tools/status") return await status();
      return json({ error: "not_found" }, 404);
    } catch (e) { return json({ error: "server_error", detail: String(e).slice(0, 120) }, 500); }
  },
};
