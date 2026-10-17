# /pwn — VulnBank (intentionally vulnerable sandbox)

Powers `/pwn.html`, where the **portfolio itself is the target**. The visitor
really exploits four classic web vulnerabilities and reads the flag from the
response — attack and remediation shown side by side.

> ⚠️ This Worker is **deliberately insecure**. It is safe only because its D1
> (binding `PWN`) holds **nothing but fake challenge data**, and writes are
> refused so one visitor cannot affect another. Never point this code at real data.

## Challenges

| # | Vuln | Endpoint | Exploit |
|---|------|----------|---------|
| 1 | SQL injection | `GET /api/pwn/search?q=` | `%' UNION SELECT k,v,3 FROM secrets-- ` |
| 2 | IDOR | `GET /api/pwn/account?id=` | guess `id=1337` (admin) |
| 3 | JWT alg confusion | `GET /api/pwn/admin` (Bearer) | forge `{"alg":"none"}` + `{"role":"admin"}`, no signature |
| 4 | Path traversal | `GET /api/pwn/view?file=` | `../flag` |

Helpers: `GET /api/pwn/token` (a sample guest JWT), `GET /api/pwn/reset` (reseed).

## Safety design

- The SQLi is **real** (the `q` value is concatenated into the query), but a
  SELECT-only guard refuses `;` and any `insert/update/delete/drop/alter/
  create/replace/attach/pragma/…`, so the shared sandbox cannot be mutated.
- The D1 holds only: fake `products`, a `secrets` row with the SQLi flag, and
  `accounts` (two normal + one admin holding the IDOR flag). No real secrets.
- The traversal reads from a tiny **fake file map**, not the real filesystem
  (Workers have none anyway).
- Responses and inputs are size-capped; CORS is limited to the site origin.

## Deploy

1. **D1**: create a database named `pwn` → console → paste `pwn/schema.sql`
   (one line) → Execute.
2. **Worker**: create a Worker, paste `pwn/worker.js` → Deploy.
3. **Binding**: Worker → Settings → Bindings → add D1 → variable name **`PWN`**,
   database `pwn`.
4. **Route**: `sakoi-cyber.me/api/pwn/*` (zone `sakoi-cyber.me`).
5. **Seed**: open `https://sakoi-cyber.me/api/pwn/reset` once (or any time to
   reseed). Then `/pwn.html` is fully playable.

The flags are `SAKOI-PWN{...}` and are checked client-side (SHA-256) on the page.
