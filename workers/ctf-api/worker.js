/* Mini-CTF API for sakoi-cyber.me — Cloudflare Worker + D1, served on sakoi-cyber.me/api/ctf/*.
   The server checks every flag itself and stamps it with its own clock: the score never comes from the browser.
   Stored per player: a random session id, flag numbers with timestamps, then a pseudo and a score. No IP, no cookie. */

const HASHES = [
  "0b47e86c24da90ec2fd84837e85a3ffcab08f0e82e88a2bf528ac5b36f67d3ea",
  "018c339eb37d009d2e9c95a22bd2b7e2c3384bf8d2932877047c9f63f3ca3501",
  "4730fd6fbe724dcf29b4de56c7a0830248bf4020a8d9c16a29c842f9a62df4f8",
  "76081738c6656bc21099cfa282cf42c38c80850286bda81c425c434f539fef30",
  "11def4318bfe6f94bc337091289df4b4e5b604b5fa7835786c39f1d355c88a44",
  "ed9f5348d27f5f953015a5f69c4d1addc328fc7c31ee8101f1c7f6b18fa86e6a",
];
const POINTS = [50, 100, 100, 150, 150, 200];   // per flag, 750 in total
const SPEED_BONUS = 2250;                        // full bonus for an instant solve…
const HALF_LIFE = 30 * 60;                       // …halved every 30 minutes
const MAX_ATTEMPTS = 300;                        // per session
const PSEUDO = /^[\p{L}\p{N}_.\- ]{2,20}$/u;

export function score(seconds) {
  const flags = POINTS.reduce((a, b) => a + b, 0);
  const bonus = Math.round(SPEED_BONUS * Math.pow(0.5, seconds / HALF_LIFE));
  return { flags, bonus, total: flags + bonus };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
});
const now = () => Math.floor(Date.now() / 1000);

async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const parse = row => row && { id: row.id, found: JSON.parse(row.found), attempts: row.attempts, finished: row.finished };
const elapsed = found => found.length ? Math.max(1, Math.max(...found.map(f => f.t)) - Math.min(...found.map(f => f.t))) : 0;

async function top(env, limit = 10) {
  const { results } = await env.DB.prepare("SELECT pseudo, score, seconds, created FROM scores ORDER BY score DESC, seconds ASC, created ASC LIMIT ?").bind(limit).all();
  return results;
}

async function body(req) {
  const len = +(req.headers.get("content-length") || 0);
  if (len > 2048) throw new Error("too large");
  const text = await req.text();
  if (text.length > 2048) throw new Error("too large");
  return JSON.parse(text || "{}");
}

async function submitFlag(req, env) {
  const { sid, flag } = await body(req);
  const f = String(flag || "").trim();
  let s = typeof sid === "string" && /^[0-9a-f-]{36}$/.test(sid)
    ? parse(await env.DB.prepare("SELECT * FROM sessions WHERE id = ?").bind(sid).first()) : null;
  if (s && s.attempts >= MAX_ATTEMPTS) return json({ error: "too_many_attempts" }, 429);
  const n = f.length <= 100 && /^DMOD\{.+\}$/.test(f) ? HASHES.indexOf(await sha256(f)) + 1 : 0;
  if (s) await env.DB.prepare("UPDATE sessions SET attempts = attempts + 1 WHERE id = ?").bind(s.id).run();
  if (!n) return json({ ok: false, sid: s ? s.id : null });
  if (!s) {
    s = { id: crypto.randomUUID(), found: [], attempts: 1, finished: 0 };
    await env.DB.prepare("INSERT INTO sessions (id, created, found, attempts, finished) VALUES (?, ?, '[]', 1, 0)").bind(s.id, now()).run();
  }
  const fresh = !s.found.some(x => x.n === n);
  if (fresh && !s.finished) {
    s.found.push({ n, t: now() });
    await env.DB.prepare("UPDATE sessions SET found = ? WHERE id = ?").bind(JSON.stringify(s.found), s.id).run();
  }
  const complete = s.found.length === HASHES.length;
  return json({ ok: true, sid: s.id, n, fresh, found: s.found.map(x => x.n).sort(), complete,
    seconds: complete ? elapsed(s.found) : null, finished: !!s.finished });
}

async function finish(req, env) {
  const { sid, pseudo } = await body(req);
  const name = String(pseudo || "").trim().replace(/\s+/g, " ");
  if (!PSEUDO.test(name)) return json({ error: "bad_pseudo" }, 400);
  const s = typeof sid === "string" ? parse(await env.DB.prepare("SELECT * FROM sessions WHERE id = ?").bind(sid).first()) : null;
  if (!s || s.found.length !== HASHES.length) return json({ error: "not_complete" }, 403);
  if (s.finished) return json({ error: "already_registered" }, 409);
  const seconds = elapsed(s.found), sc = score(seconds);
  try {
    await env.DB.prepare("INSERT INTO scores (sid, pseudo, score, seconds, created) VALUES (?, ?, ?, ?, ?)")
      .bind(s.id, name, sc.total, seconds, now()).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e))) return json({ error: "pseudo_taken" }, 409);
    throw e;
  }
  await env.DB.prepare("UPDATE sessions SET finished = 1 WHERE id = ?").bind(s.id).run();
  const better = await env.DB.prepare("SELECT COUNT(*) AS c FROM scores WHERE score > ? OR (score = ? AND seconds < ?)")
    .bind(sc.total, sc.total, seconds).first();
  const total = await env.DB.prepare("SELECT COUNT(*) AS c FROM scores").first();
  return json({ pseudo: name, rank: better.c + 1, players: total.c, seconds, ...sc, top: await top(env) });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "");
    try {
      if (req.method === "GET" && path === "/api/ctf/leaderboard") {
        const total = await env.DB.prepare("SELECT COUNT(*) AS c FROM scores").first();
        return json({ players: total.c, top: await top(env, 20) });
      }
      if (req.method !== "POST") return json({ error: "not_found" }, 404);
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) return json({ error: "forbidden" }, 403);
      if (path === "/api/ctf/flag") return await submitFlag(req, env);
      if (path === "/api/ctf/finish") return await finish(req, env);
      return json({ error: "not_found" }, 404);
    } catch (e) {
      return json({ error: e.message === "too large" ? "too_large" : "server_error" }, e.message === "too large" ? 413 : 500);
    }
  },
};
