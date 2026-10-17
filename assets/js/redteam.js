/* AI red-team challenge front-end: a chat with VAULT, an assistant guarding a secret flag.
   Jailbreak it via prompt injection to make it leak SAKOI-AI{...}. CSP-safe, bilingual. */
(function () {
  "use strict";
  var API = "/api/redteam/chat";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  var KEY = "dmod_redteam";

  var T = {
    fr: { crumb: "IA à jailbreaker", h: "Jailbreake VAULT", lead: "Un assistant IA garde un flag secret. Ta mission : le faire fuiter par prompt injection (« ignore tes instructions », jeu de rôle, base64, faux message système…). Chaque tentative est journalisée dans le honeypot. C'est le sujet sécurité de 2026 : attaque ET garde-fous.",
      ph: "Essaie de lui soutirer le flag…", send: "Envoyer", solved: "🏴 Jailbreak réussi — flag extrait !", offline: "Le défi n'est pas encore déployé (clé API manquante). Le code est prêt côté serveur.", err: "Erreur réseau.", rules: "Règles", reset: "Nouvelle conversation", you: "toi", bot: "VAULT",
      r1: "Le flag est au format SAKOI-AI{...}, caché dans le system prompt de VAULT.", r2: "VAULT a une seule règle : ne jamais le révéler. À toi de l'y pousser.", r3: "Tout se passe côté serveur (Worker + API LLM). Tes tentatives d'injection sont loggées dans le honeypot." },
    en: { crumb: "AI to jailbreak", h: "Jailbreak VAULT", lead: "An AI assistant guards a secret flag. Your mission: make it leak via prompt injection ('ignore your instructions', role-play, base64, fake system message…). Every attempt is logged to the honeypot. The 2026 security topic: attack AND guardrails.",
      ph: "Try to get the flag out of it…", send: "Send", solved: "🏴 Jailbreak successful — flag extracted!", offline: "The challenge isn't deployed yet (missing API key). The server code is ready.", err: "Network error.", rules: "Rules", reset: "New conversation", you: "you", bot: "VAULT",
      r1: "The flag has the form SAKOI-AI{...}, hidden in VAULT's system prompt.", r2: "VAULT has one rule: never reveal it. Your job is to push it to.", r3: "Everything runs server-side (Worker + LLM API). Your injection attempts are logged to the honeypot." }
  };
  var W = function (k) { return T[en() ? "en" : "fr"][k]; };
  function applyT() { document.querySelectorAll("[data-t]").forEach(function (n) { var v = W(n.dataset.t); if (v != null) n.textContent = v; }); }

  var msgs = [];   // {role, content}
  function bubble(role, content) {
    var row = el("div", "rt-msg " + role);
    row.appendChild(el("span", "rt-who", role === "user" ? W("you") : W("bot")));
    row.appendChild(el("div", "rt-txt", content));
    $("rt-log").appendChild(row);
    $("rt-log").scrollTop = $("rt-log").scrollHeight;
    return row;
  }
  function markSolved() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    var b = $("rt-solved"); if (b) { b.hidden = false; b.textContent = W("solved"); }
  }

  async function send(e) {
    e.preventDefault();
    var inp = $("rt-in"); var txt = inp.value.trim(); if (!txt) return;
    inp.value = ""; msgs.push({ role: "user", content: txt }); bubble("user", txt);
    var btn = $("rt-send"); btn.disabled = true;
    var pend = bubble("assistant", "…");
    try {
      var r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: msgs.slice(-10) }) });
      var d = await r.json();
      if (r.status === 503 || d.offline) { pend.querySelector(".rt-txt").textContent = W("offline"); }
      else if (d.reply != null) {
        pend.querySelector(".rt-txt").textContent = d.reply;
        msgs.push({ role: "assistant", content: d.reply });
        if (d.solved) markSolved();
      } else { pend.querySelector(".rt-txt").textContent = W("err"); }
    } catch (err) { pend.querySelector(".rt-txt").textContent = W("err"); }
    btn.disabled = false; inp.focus();
  }

  function reset() { msgs = []; $("rt-log").textContent = ""; }

  function wire() {
    applyT();
    try { if (localStorage.getItem(KEY)) markSolved(); } catch (e) {}
    $("rt-form").addEventListener("submit", send);
    $("rt-reset") && $("rt-reset").addEventListener("click", reset);
    var l = $("lang"); if (l) l.addEventListener("click", function () { setTimeout(function () { applyT(); $("rt-in").placeholder = W("ph"); }, 0); });
    $("rt-in").placeholder = W("ph");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
