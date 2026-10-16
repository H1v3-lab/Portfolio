/* Stats API — Cloudflare Worker on sakoi-cyber.me/api/stats.
   Aggregates public GitHub data (REST, no scraping) into a "proof dashboard" payload:
   repos, stars, followers, top languages, a ~90-day activity heatmap and a recent-activity
   feed — all from the public API. Same origin, so the page needs no CSP change.

   Optional: set a GITHUB_TOKEN Worker secret to raise the API rate limit (60/h -> 5000/h).
   The response is cached at the edge (cache-control), so GitHub is hit at most ~2×/hour. */

const USER = "H1v3-lab";
const DAYS = 91;
const CACHE_S = 1800;

const now = () => Math.floor(Date.now() / 1000);
const json = (body, status = 200, extra) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...(extra || {}) } });
const pub = (body) => json(body, 200, {
  "access-control-allow-origin": "https://sakoi-cyber.me", "cache-control": "public, max-age=" + CACHE_S, "vary": "Origin" });

function gh(path, env) {
  const headers = { "user-agent": "sakoi-cyber.me-stats", accept: "application/vnd.github+json" };
  if (env.GITHUB_TOKEN) headers.authorization = "Bearer " + env.GITHUB_TOKEN;
  return fetch("https://api.github.com" + path, { headers });
}
async function ghJSON(path, env) {
  const r = await gh(path, env);
  if (!r.ok) throw new Error("gh " + r.status);
  return r.json();
}

function levelFor(n) { return n <= 0 ? 0 : n < 2 ? 1 : n < 5 ? 2 : n < 9 ? 3 : 4; }

function buildActivity(events) {
  // Day buckets (UTC) for the last DAYS days.
  const days = [];
  const idx = {};
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    idx[key] = days.length;
    days.push({ date: key, count: 0, level: 0 });
  }
  let total = 0;
  for (const e of events || []) {
    const key = (e.created_at || "").slice(0, 10);
    if (!(key in idx)) continue;
    let w = 1;
    if (e.type === "PushEvent") w = Math.min(10, (e.payload && e.payload.size) || 1);
    days[idx[key]].count += w; total += w;
  }
  days.forEach(d => { d.level = levelFor(d.count); });
  // current streak (consecutive days up to today with activity)
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) streak++; else break; }
  return { total, days, streak };
}

function humanEvent(e) {
  const repo = e.repo ? e.repo.name : "";
  const map = {
    PushEvent: { fr: "a poussé sur", en: "pushed to" },
    PullRequestEvent: { fr: "pull request sur", en: "pull request on" },
    IssuesEvent: { fr: "issue sur", en: "issue on" },
    CreateEvent: { fr: "a créé", en: "created" },
    WatchEvent: { fr: "a mis une étoile à", en: "starred" },
    ForkEvent: { fr: "a forké", en: "forked" },
    ReleaseEvent: { fr: "a publié une release sur", en: "released on" },
  };
  const m = map[e.type]; if (!m) return null;
  return { type: e.type, repo, at: e.created_at, verb_fr: m.fr, verb_en: m.en };
}

async function stats(env) {
  const out = { generated: now(), user: null, languages: [], activity: null, recent: [] };
  try {
    const u = await ghJSON("/users/" + USER, env);
    out.user = {
      login: u.login, name: u.name, repos: u.public_repos, followers: u.followers,
      following: u.following, created: (u.created_at || "").slice(0, 4), avatar: u.avatar_url,
    };
  } catch (e) { /* leave null */ }
  try {
    const repos = await ghJSON("/users/" + USER + "/repos?per_page=100&sort=pushed&type=owner", env);
    let stars = 0; const langs = {};
    for (const r of repos) { stars += r.stargazers_count || 0; if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; }
    if (out.user) out.user.stars = stars;
    out.languages = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, n]) => ({ name, n }));
  } catch (e) { /* leave */ }
  try {
    const events = await ghJSON("/users/" + USER + "/events/public?per_page=100", env);
    out.activity = buildActivity(events);
    out.recent = events.map(humanEvent).filter(Boolean).slice(0, 8);
  } catch (e) { /* leave */ }
  return pub(out);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://sakoi-cyber.me", "access-control-allow-methods": "GET,OPTIONS" } });
    try {
      if (req.method === "GET" && (path === "/api/stats" || path === "/api/stats/github")) return await stats(env);
      return json({ error: "not_found" }, 404);
    } catch (e) { return json({ error: "server_error", detail: String(e).slice(0, 120) }, 500); }
  },
};
