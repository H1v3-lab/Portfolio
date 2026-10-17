# AI red-team challenge — jailbreak VAULT

Powers `/redteam.html`: a small assistant (**VAULT**) that guards a secret flag in its
system prompt. Visitors try to extract it via **prompt injection**; attempts are logged
to the honeypot. It shows both sides — attack *and* guardrails — which is the point.

Worker: `redteam/worker.js` on `sakoi-cyber.me/api/redteam/*`, calling the **Anthropic
Messages API over raw HTTP** (no SDK in the Workers runtime).

## Deploy

1. **Worker**: create a Worker, paste `redteam/worker.js` → Deploy.
2. **Route**: `sakoi-cyber.me/api/redteam/*` (zone `sakoi-cyber.me`).
3. **Secret**: Worker → Settings → Variables and secrets → **Secret** →
   `ANTHROPIC_API_KEY` = your Anthropic key. *(Until this is set, `/redteam.html`
   shows a clean "not deployed yet" message — nothing breaks.)*

That's the minimum. The challenge is live.

## Cost control (important — it calls a paid LLM)

- **Model**: defaults to **`claude-haiku-5-5`** (cheapest: ~$0.10 / $0.50 per Mtok) — ideal
  for a public punching bag. To make VAULT a tougher opponent, set an env var
  `MODEL = claude-opus-5-5` (pricier). Your call.
- The Worker caps input (≤ 10 turns, ≤ 800 chars each) and output (`max_tokens` 300).
- **Add a Cloudflare Rate Limiting rule** on `/api/redteam/*` (e.g. 20 req/min per IP) so a
  bot can't run up your bill. Recommended before sharing the link widely.

## Optional: log attempts to the honeypot

Set two more vars so prompt-injection attempts show up in `/attaques.html` as
`proto: jailbreak` (and `FLAG-EXTRACTED` when someone wins):

- `HP_INGEST_URL = https://sakoi-cyber.me/api/honeypot/ingest`
- `HP_TOKEN` = the same token as your honeypot Worker's `HP_TOKEN`.

## Override the flag / prompt

- `FLAG` env var overrides the default `SAKOI-AI{...}`.
- The guard system prompt is in `systemPrompt()` in `worker.js` — harden it as you like;
  that hardening *is* the defensive half of the demo.
