/* Honeypot API — Cloudflare Worker + D1, served on sakoi-cyber.me/api/honeypot/*.
   - POST /ingest    : the VPS agent pushes attack events (Bearer token auth). Not public.
   - GET  /stats     : aggregated stats for the public dashboard. Read-only.
   - GET  /attackers : per-IP "dossier" with threat-intel enrichment (ASN, Tor, reputation).

   Enrichment is cached in the `intel` table (see schema-intel.sql). Sources:
   - ASN / network owner : Team Cymru over DNS-over-HTTPS (free, no key).
   - Tor exit node       : cached copy of the public bulk exit list (free, no key).
   - Reputation          : AbuseIPDB (env.ABUSEIPDB_KEY) and GreyNoise
                           (env.GREYNOISE_KEY) — both OPTIONAL; skipped if unset.
   The ingest token and API keys are Worker secrets; they never reach the browser. */

const MAX_EVENTS = 200;
const MAX_PAYLOAD = 240;
const RETENTION_DAYS = 30;
const STATS_CACHE_S = 15;
const INTEL_CACHE_S = 60;
const INTEL_TTL = 7 * 86400;     // re-enrich an IP at most weekly
const ENRICH_BUDGET = 4;         // max IPs enriched per /attackers call
const TOR_REFRESH_S = 12 * 3600;
const ATTACKERS_LIMIT = 15;

const json = (body, status = 200, extra) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "x-content-type-options": "nosniff", ...(extra || {}) } });
const pub = (body, cache = STATS_CACHE_S) => json(body, 200, {
  "access-control-allow-origin": "https://sakoi-cyber.me", "cache-control": "public, max-age=" + cache, "vary": "Origin" });

const clip = (s, n) => (s == null ? null : String(s).slice(0, n || MAX_PAYLOAD));
const now = () => Math.floor(Date.now() / 1000);
const isIp = s => typeof s === "string" && /^[0-9a-fA-F:.]{3,45}$/.test(s);
const isIpv4 = s => typeof s === "string" && /^\d{1,3}(\.\d{1,3}){3}$/.test(s);

/* ---------------- ingest ---------------- */
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
      clip(e.ip, 45), clip(e.country, 2) || "??", clip(e.proto, 12) || "tcp",
      Number.isFinite(e.port) ? (e.port | 0) : 0,
      clip(e.cred, MAX_PAYLOAD), clip(e.payload, MAX_PAYLOAD), clip(e.path, MAX_PAYLOAD), clip(e.ua, MAX_PAYLOAD)));
  }
  if (batch.length) await env.DB.batch(batch);
  if (Math.random() < 0.05)
    await env.DB.prepare("DELETE FROM events WHERE ts < ?").bind(now() - RETENTION_DAYS * 86400).run();
  return json({ ok: true, count: batch.length });
}

/* ---------------- stats ---------------- */
async function stats(env) {
  const t24 = now() - 86400, t7 = now() - 7 * 86400;
  const one = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).first()) || {};
  const all = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results || [];

  const totals = await one("SELECT COUNT(*) AS total, COUNT(DISTINCT ip) AS ips, COUNT(DISTINCT country) AS countries FROM events");
  const d24 = await one("SELECT COUNT(*) AS n, COUNT(DISTINCT ip) AS ips FROM events WHERE ts >= ?", t24);
  const topIps = await all("SELECT ip, country, COUNT(*) AS n, MAX(ts) AS last FROM events GROUP BY ip ORDER BY n DESC LIMIT 12");
  const topCountries = await all("SELECT country, COUNT(*) AS n FROM events WHERE country != '??' GROUP BY country ORDER BY n DESC LIMIT 12");
  const topPorts = await all("SELECT port, proto, COUNT(*) AS n FROM events GROUP BY port ORDER BY n DESC LIMIT 10");
  const topCreds = await all("SELECT cred, COUNT(*) AS n FROM events WHERE cred IS NOT NULL AND cred != '' GROUP BY cred ORDER BY n DESC LIMIT 12");
  const recent = await all("SELECT ts, ip, country, proto, port, cred, payload, path FROM events ORDER BY ts DESC LIMIT 40");
  const rows = await all("SELECT ts/3600*3600 AS h, COUNT(*) AS n FROM events WHERE ts >= ? GROUP BY h ORDER BY h", t24);
  const points = await all("SELECT ip, country, MAX(ts) AS ts, COUNT(*) AS n FROM events WHERE ts >= ? AND country != '??' GROUP BY ip ORDER BY ts DESC LIMIT 120", t7);

  return pub({
    generated: now(),
    totals: { total: totals.total || 0, ips: totals.ips || 0, countries: totals.countries || 0, last24: d24.n || 0, ips24: d24.ips || 0 },
    topIps, topCountries, topPorts, topCreds, recent, points,
    timeline: rows.map(r => ({ h: r.h, n: r.n })),
  });
}

/* ---------------- threat-intel enrichment ---------------- */

// DNS-over-HTTPS TXT lookup (Cloudflare). Returns array of unquoted strings.
async function dohTXT(name) {
  const r = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=TXT",
    { headers: { accept: "application/dns-json" } });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.Answer || []).filter(a => a.type === 16).map(a => String(a.data).replace(/^"|"$/g, "").replace(/\\"/g, '"'));
}

// Team Cymru IP->ASN mapping over DoH (IPv4). Free, no key.
async function cymru(ip) {
  if (!isIpv4(ip)) return {};
  const rev = ip.split(".").reverse().join(".");
  const origin = (await dohTXT(rev + ".origin.asn.cymru.com"))[0];
  if (!origin) return {};
  // "13335 | 1.1.1.0/24 | US | arin | 2010-07-14"
  const p = origin.split("|").map(s => s.trim());
  const asn = p[0] ? p[0].split(/\s+/)[0] : null;
  let org = null;
  if (asn) {
    const as = (await dohTXT("AS" + asn + ".asn.cymru.com"))[0];
    if (as) { const q = as.split("|").map(s => s.trim()); org = q[q.length - 1] || null; }
  }
  return { asn: asn ? "AS" + asn : null, as_org: org, prefix: p[1] || null, rir: p[3] || null };
}

async function abuseipdb(ip, env) {
  if (!env.ABUSEIPDB_KEY) return {};
  const r = await fetch("https://api.abuseipdb.com/api/v2/check?maxAgeInDays=90&ipAddress=" + encodeURIComponent(ip),
    { headers: { Key: env.ABUSEIPDB_KEY, Accept: "application/json" } });
  if (!r.ok) return {};
  const d = (await r.json()).data || {};
  return { abuse_score: d.abuseConfidenceScore ?? null, abuse_reports: d.totalReports ?? null,
    usage: d.usageType || null, isp: d.isp || null, tor_abuse: d.isTor ? 1 : 0 };
}

async function greynoise(ip, env) {
  if (!env.GREYNOISE_KEY) return {};
  const r = await fetch("https://api.greynoise.io/v3/community/" + encodeURIComponent(ip),
    { headers: { key: env.GREYNOISE_KEY, Accept: "application/json" } });
  if (!r.ok) return {};
  const d = await r.json();
  return { gn_class: d.classification || null, gn_name: d.name || null, gn_noise: d.noise ? 1 : 0 };
}

async function isTorExit(ip, env) {
  try {
    const row = await env.DB.prepare("SELECT 1 AS x FROM torexits WHERE ip = ?").bind(ip).first();
    return row ? 1 : 0;
  } catch (e) { return 0; }
}

// Refresh the cached Tor bulk exit list at most twice a day.
async function refreshTor(env) {
  let last = 0;
  try { const m = await env.DB.prepare("SELECT v FROM meta WHERE k='tor_updated'").first(); last = m ? parseInt(m.v, 10) || 0 : 0; } catch (e) { return; }
  if (now() - last < TOR_REFRESH_S) return;
  let txt;
  try { const r = await fetch("https://check.torproject.org/torbulkexitlist"); if (!r.ok) return; txt = await r.text(); }
  catch (e) { return; }
  const ips = txt.split("\n").map(s => s.trim()).filter(isIp).slice(0, 8000);
  try {
    await env.DB.prepare("DELETE FROM torexits").run();
    const stmt = env.DB.prepare("INSERT OR IGNORE INTO torexits (ip) VALUES (?)");
    for (let i = 0; i < ips.length; i += 100)
      await env.DB.batch(ips.slice(i, i + 100).map(ip => stmt.bind(ip)));
    await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('tor_updated', ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(String(now())).run();
  } catch (e) { /* non-fatal */ }
}

async function enrichIP(ip, env) {
  const parts = await Promise.allSettled([cymru(ip), abuseipdb(ip, env), greynoise(ip, env), isTorExit(ip, env)]);
  const g = i => (parts[i].status === "fulfilled" ? parts[i].value : {});
  const c = g(0), a = g(1), n = g(2), tor = parts[3].status === "fulfilled" ? parts[3].value : 0;
  const intel = {
    asn: c.asn || null, as_org: c.as_org || a.isp || null, prefix: c.prefix || null, rir: c.rir || null,
    tor: tor || a.tor_abuse || 0,
    abuse_score: a.abuse_score ?? null, abuse_reports: a.abuse_reports ?? null, usage: a.usage || null, isp: a.isp || null,
    gn_class: n.gn_class || null, updated: now(),
  };
  try {
    await env.DB.prepare(
      "INSERT INTO intel (ip, asn, as_org, prefix, rir, tor, abuse_score, abuse_reports, usage, isp, gn_class, updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) " +
      "ON CONFLICT(ip) DO UPDATE SET asn=excluded.asn, as_org=excluded.as_org, prefix=excluded.prefix, rir=excluded.rir, tor=excluded.tor, abuse_score=excluded.abuse_score, abuse_reports=excluded.abuse_reports, usage=excluded.usage, isp=excluded.isp, gn_class=excluded.gn_class, updated=excluded.updated")
      .bind(ip, intel.asn, intel.as_org, intel.prefix, intel.rir, intel.tor, intel.abuse_score, intel.abuse_reports, intel.usage, intel.isp, intel.gn_class, intel.updated).run();
  } catch (e) { /* cache write best-effort */ }
  return intel;
}

async function attackers(env) {
  const all = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results || [];
  await refreshTor(env);

  const top = await all(
    "SELECT ip, MAX(country) AS country, COUNT(*) AS events, MIN(ts) AS first, MAX(ts) AS last FROM events GROUP BY ip ORDER BY events DESC LIMIT ?",
    ATTACKERS_LIMIT);

  // Load cached intel for these IPs.
  const cache = {};
  for (const r of top) {
    try { const c = await env.DB.prepare("SELECT * FROM intel WHERE ip = ?").bind(r.ip).first(); if (c) cache[r.ip] = c; } catch (e) {}
  }
  // Enrich the stalest few within budget.
  const stale = top.filter(r => !cache[r.ip] || (now() - (cache[r.ip].updated || 0)) > INTEL_TTL).slice(0, ENRICH_BUDGET);
  await Promise.allSettled(stale.map(async r => { cache[r.ip] = await enrichIP(r.ip, env); }));

  const out = [];
  for (const r of top) {
    const services = await all("SELECT proto, port, COUNT(*) AS n FROM events WHERE ip = ? GROUP BY proto, port ORDER BY n DESC LIMIT 6", r.ip);
    const creds = await all("SELECT cred, COUNT(*) AS n FROM events WHERE ip = ? AND cred IS NOT NULL AND cred != '' GROUP BY cred ORDER BY n DESC LIMIT 6", r.ip);
    const ic = cache[r.ip] || {};
    out.push({
      ip: r.ip, country: r.country, events: r.events, first: r.first, last: r.last,
      services: services.map(s => ({ proto: s.proto, port: s.port, n: s.n })),
      creds: creds.map(c => ({ cred: c.cred, n: c.n })),
      intel: {
        asn: ic.asn || null, as_org: ic.as_org || null, prefix: ic.prefix || null, rir: ic.rir || null,
        tor: ic.tor ? 1 : 0, abuse_score: ic.abuse_score ?? null, abuse_reports: ic.abuse_reports ?? null,
        usage: ic.usage || null, isp: ic.isp || null, gn_class: ic.gn_class || null, updated: ic.updated || null,
      },
    });
  }
  return pub({ generated: now(), attackers: out }, INTEL_CACHE_S);
}

/* Canary token: an invisible link / robots-disallowed path. A real visitor never follows it;
   a crawler or scraper that ignores robots.txt does, and gets logged as a caught bot. */
const GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
async function canary(req, env) {
  try {
    const url = new URL(req.url);
    const ip = req.headers.get("cf-connecting-ip") || "0.0.0.0";
    const country = (req.headers.get("cf-ipcountry") || "??").slice(0, 2);
    const ua = clip(req.headers.get("user-agent"), MAX_PAYLOAD);
    const src = clip(url.searchParams.get("s") || url.pathname, 64);
    if (isIp(ip))
      await env.DB.prepare("INSERT INTO events (ts, ip, country, proto, port, cred, payload, path, ua) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(now(), ip, country, "canary", 0, null, "canary", src, ua).run();
  } catch (e) { /* best-effort */ }
  const bytes = Uint8Array.from(atob(GIF), c => c.charCodeAt(0));
  return new Response(bytes, { status: 200, headers: { "content-type": "image/gif", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://sakoi-cyber.me", "access-control-allow-methods": "GET,OPTIONS" } });
    try {
      if (req.method === "POST" && path === "/api/honeypot/ingest") return await ingest(req, env);
      if (req.method === "GET" && path === "/api/honeypot/stats") return await stats(env);
      if (req.method === "GET" && path === "/api/honeypot/attackers") return await attackers(env);
      if (req.method === "GET" && path === "/api/honeypot/canary") return await canary(req, env);
      return json({ error: "not_found" }, 404);
    } catch (e) { return json({ error: "server_error", detail: String(e).slice(0, 120) }, 500); }
  },
};
