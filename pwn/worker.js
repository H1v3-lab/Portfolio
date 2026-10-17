/* /pwn — "VulnBank": a DELIBERATELY vulnerable sandbox API on sakoi-cyber.me/api/pwn/*.
   The portfolio itself becomes the target. Every vuln is real and exploitable, but the
   backing D1 (binding PWN) holds ONLY fake challenge data — no real data, no secrets beyond
   the four challenge flags. Reads only: destructive SQL is refused, so one visitor cannot
   affect another. This is an intentionally insecure teaching endpoint; see pwn/README.md.

   Challenges:
   1. SQLi  GET /api/pwn/search?q=        (UNION into `secrets`)
   2. IDOR  GET /api/pwn/account?id=      (guess id 1337)
   3. JWT   GET /api/pwn/admin  (Bearer)  (accepts alg:none with role=admin)
   4. LFI   GET /api/pwn/view?file=       (path traversal over a fake file map)
   Plus GET /api/pwn/token (a sample guest JWT) and GET /api/pwn/reset (reseed, idempotent). */

const json = (b, s = 200) => new Response(JSON.stringify(b, null, 2), {
  status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "access-control-allow-origin": "https://sakoi-cyber.me", "x-content-type-options": "nosniff", "x-pwn": "intentionally-vulnerable" } });
const text = (b, s = 200) => new Response(b, { status: s, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "https://sakoi-cyber.me" } });

const FLAGS = {
  sqli: "SAKOI-PWN{un10n_s3l3ct_g0es_brrr}",
  idor: "SAKOI-PWN{c0unt_t0_1337_1d0r}",
  jwt: "SAKOI-PWN{alg_n0ne_n3v3r_trust_th3_cl13nt}",
  lfi: "SAKOI-PWN{d0t_d0t_sl4sh_h0m3}",
};

// Fake, read-only "filesystem" for the traversal challenge.
const FS = {
  "welcome.txt": "Welcome to VulnBank internal docs. Public files only, please.",
  "readme.txt": "Nothing to see here. (hint: files live one level up from the web root…)",
  "../flag": "FLAG: " + FLAGS.lfi,
  "/home/dmod/flag": "FLAG: " + FLAGS.lfi,
};

async function reseed(env) {
  await env.PWN.batch([
    env.PWN.prepare("DELETE FROM products"),
    env.PWN.prepare("DELETE FROM secrets"),
    env.PWN.prepare("DELETE FROM accounts"),
  ]);
  const p = env.PWN.prepare("INSERT INTO products (id,name,price) VALUES (?,?,?)");
  const prod = [[1, "Compte Courant", 0], [2, "Livret Épargne", 0], [3, "Carte Gold", 120], [4, "Assurance Vie", 0], [5, "Crédit Conso", 0]];
  const s = env.PWN.prepare("INSERT INTO secrets (k,v) VALUES (?,?)");
  const a = env.PWN.prepare("INSERT INTO accounts (id,owner,balance,secret) VALUES (?,?,?,?)");
  const acc = [[1001, "alice", 2300, null], [1002, "bob", 540, null], [1337, "admin", 9999999, FLAGS.idor]];
  await env.PWN.batch([
    ...prod.map(r => p.bind(...r)),
    s.bind("flag", FLAGS.sqli),
    ...acc.map(r => a.bind(...r)),
  ]);
}

// SELECT-only guard: keep the SQLi real (UNION works) but block anything that could
// mutate state or stack statements, so the shared sandbox stays intact for everyone.
function sqlSafe(q) {
  if (/;/.test(q)) return false;
  if (/\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex)\b/i.test(q)) return false;
  return true;
}

async function search(url, env) {
  const q = (url.searchParams.get("q") || "").slice(0, 200);
  if (!sqlSafe(q)) return json({ error: "write/stacked statements are refused in this sandbox (reads only)" }, 400);
  // The vulnerability: q is concatenated straight into the query.
  const sql = "SELECT id, name, price FROM products WHERE name LIKE '%" + q + "%'";
  try {
    const rows = (await env.PWN.prepare(sql).all()).results || [];
    return json({ query: sql, count: rows.length, results: rows.slice(0, 50) });
  } catch (e) {
    // Verbose errors are part of the fun (and realistic for a vulnerable app).
    return json({ query: sql, error: String(e).slice(0, 200) }, 500);
  }
}

async function account(url, env) {
  const id = parseInt(url.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return json({ error: "id must be an integer, e.g. ?id=1001" }, 400);
  // The vulnerability: no authorization check — any id is returned.
  const r = await env.PWN.prepare("SELECT id, owner, balance, secret FROM accounts WHERE id = ?").bind(id).first();
  if (!r) return json({ error: "no account with id " + id }, 404);
  return json(r);
}

function b64urlToStr(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  try { return atob(s); } catch (e) { return ""; }
}
async function admin(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return json({ error: "missing Bearer token. Get one at /api/pwn/token, then become admin." }, 401);
  const parts = m[1].split(".");
  if (parts.length < 2) return json({ error: "malformed JWT" }, 400);
  let header, payload;
  try { header = JSON.parse(b64urlToStr(parts[0])); payload = JSON.parse(b64urlToStr(parts[1])); }
  catch (e) { return json({ error: "cannot parse JWT header/payload" }, 400); }
  // The vulnerability: the server trusts alg:none and does not verify the signature.
  const alg = String(header.alg || "").toLowerCase();
  if (alg === "none") {
    if (payload.role === "admin") return json({ ok: true, role: "admin", flag: FLAGS.jwt, note: "alg:none accepted — signature never checked." });
    return json({ error: "token accepted (alg:none) but role is not admin", role: payload.role || null }, 403);
  }
  // For signed algs we pretend to verify but never actually do the crypto here (still insecure by design):
  return json({ error: "this toy server only understands alg:none — try forging that", seen_alg: header.alg || null }, 400);
}

function token() {
  const h = { alg: "HS256", typ: "JWT" };
  const p = { sub: "guest-" + Math.floor(Math.random() * 100000), role: "guest", iat: Math.floor(Date.now() / 1000) };
  const b64 = o => btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const t = b64(h) + "." + b64(p) + ".c2lnbmF0dXJl"; // fake signature
  return json({ token: t, role: "guest", hint: "decode it, flip the header to alg:none, set role:admin, drop the signature, send it to /api/pwn/admin" });
}

function view(url) {
  const file = (url.searchParams.get("file") || "").slice(0, 120);
  if (!file) return json({ error: "usage: ?file=welcome.txt" }, 400);
  // The vulnerability: no path normalization — traversal reaches files outside the web root.
  if (Object.prototype.hasOwnProperty.call(FS, file)) return text(FS[file]);
  return json({ error: "file not found: " + file, available_public: ["welcome.txt", "readme.txt"] }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "");
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: { "access-control-allow-origin": "https://sakoi-cyber.me", "access-control-allow-methods": "GET,OPTIONS", "access-control-allow-headers": "authorization" } });
    try {
      if (req.method === "GET" && path === "/api/pwn/search") return await search(url, env);
      if (req.method === "GET" && path === "/api/pwn/account") return await account(url, env);
      if (req.method === "GET" && path === "/api/pwn/admin") return await admin(req);
      if (req.method === "GET" && path === "/api/pwn/token") return token();
      if (req.method === "GET" && path === "/api/pwn/view") return view(url);
      if (req.method === "GET" && path === "/api/pwn/reset") { await reseed(env); return json({ ok: true, reseeded: true }); }
      return json({ error: "not_found", endpoints: ["/api/pwn/search?q=", "/api/pwn/account?id=", "/api/pwn/admin", "/api/pwn/token", "/api/pwn/view?file="] }, 404);
    } catch (e) { return json({ error: "server_error", detail: String(e).slice(0, 160) }, 500); }
  },
};
