# Stats API — proof dashboard backend

A tiny Cloudflare Worker that powers `/dashboard.html`. It aggregates **public
GitHub data** (REST API, no scraping) into one JSON payload served same-origin
at `sakoi-cyber.me/api/stats`, so the page needs **no CSP change**.

Payload: `user` (repos, stars, followers, account age), `languages` (top 6),
`activity` (a ~90-day heatmap built from public events, with a current streak),
and `recent` (a short activity feed). Every field degrades to null/empty on error,
so a GitHub hiccup never breaks the page.

## Deploy (once)

1. **Workers & Pages → Create → Worker**, name e.g. `stats-api`.
2. Paste `stats/worker.js` → **Deploy**.
3. **Route**: Worker → *Settings → Domains & Routes → Add route* →
   `sakoi-cyber.me/api/stats*` (zone `sakoi-cyber.me`).
4. Check: `https://sakoi-cyber.me/api/stats` returns a JSON with `user`,
   `activity`, etc.

No database, no secret required: it reads only public GitHub endpoints and
caches the response at the edge (`cache-control: max-age=1800`), so GitHub is
hit at most ~2×/hour.

## Optional: higher rate limit

Unauthenticated GitHub API = 60 requests/hour per IP. With edge caching that is
plenty, but to be safe you can add a **read-only** token:

1. GitHub → *Settings → Developer settings → Fine-grained tokens* → new token
   with **no** scopes (public read is enough) → copy.
2. Worker → *Settings → Variables and secrets → Add → Secret* → name
   `GITHUB_TOKEN`, value = the token. The limit rises to 5000/hour.

## Platform stats (TryHackMe, Root-Me, HTB)

These have no clean public API, so they live in `assets/data/profiles.json`
(edit the `handle` / `rank` / `points` fields). GitHub is the live part; the
mini-CTF counter reflects the visitor's own progress (localStorage).
