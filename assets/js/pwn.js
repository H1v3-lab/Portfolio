/* /pwn — interactive exploitation of the VulnBank sandbox (/api/pwn/*). The visitor really
   exploits SQLi / IDOR / JWT alg:none / path traversal against fake data, reads the flag from
   the response, and submits it. Attack and remediation shown side by side. CSP-safe, bilingual. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var L = function (o) { return en() ? o.en : o.fr; };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  var KEY = "dmod_pwn";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var st = load();

  async function sha(s) { var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [].map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }

  var CH = {
    fr: { crumb: "Exploite le site", h: "/pwn — le site est la cible", lead: "Pas un CTF à côté : voici une vraie API bancaire volontairement vulnérable, sur des données factices. Exploite-la pour de vrai dans ton navigateur, lis le flag dans la réponse, soumets-le. Attaque et remédiation côte à côte.",
      send: "Envoyer", solved: "résolu", flagph: "SAKOI-PWN{...}", check: "Valider le flag", reset: "Réinitialiser le bac à sable", resp: "Réponse brute", rem: "Remédiation", attack: "L'attaque", forge: "Forger alg:none + admin", getTok: "Obtenir un jeton", prog: "Progression",
      ok: "✓ Flag validé", bad: "✕ Flag incorrect (lis la réponse ci-dessus)", won: "🏴 Les 4 failles exploitées. Bravo — maintenant lis les remédiations.",
      warn: "Bac à sable volontairement vulnérable, données 100% factices. Ne reproduis ces techniques que sur des systèmes dont tu as l'autorisation." },
    en: { crumb: "Hack the site", h: "/pwn — the site is the target", lead: "Not a side CTF: this is a real, deliberately vulnerable bank API over fake data. Exploit it for real in your browser, read the flag in the response, submit it. Attack and remediation side by side.",
      send: "Send", solved: "solved", flagph: "SAKOI-PWN{...}", check: "Submit flag", reset: "Reset the sandbox", resp: "Raw response", rem: "Remediation", attack: "The attack", forge: "Forge alg:none + admin", getTok: "Get a token", prog: "Progress",
      ok: "✓ Flag accepted", bad: "✕ Wrong flag (read the response above)", won: "🏴 All 4 flaws exploited. Nice — now read the fixes.",
      warn: "Deliberately vulnerable sandbox, 100% fake data. Only use these techniques on systems you are authorized to test." }
  };
  var W = function (k) { return CH[en() ? "en" : "fr"][k]; };

  var CHALLENGES = [
    { id: "sqli", hash: "775854dfe641001f5998e38598512f5db7422d8056db63982cb7b8929a1fbf06",
      badge: "SQLi", ep: "/api/pwn/search", param: "q", ph: "%' UNION SELECT k,v,3 FROM secrets-- ",
      title: { fr: "Injection SQL — recherche produit", en: "SQL injection — product search" },
      brief: { fr: "Le paramètre q est concaténé dans la requête. Fais un UNION pour lire la table secrets.", en: "The q parameter is concatenated into the query. UNION to read the secrets table." },
      rem: { fr: "Requêtes paramétrées (prepared statements), jamais de concaténation ; compte SQL en moindre privilège ; messages d'erreur génériques.", en: "Parameterized queries, never string concatenation; least-privilege SQL account; generic error messages." } },
    { id: "idor", hash: "99ea442d02019bff3afa677d2ba0525d53569c4dcd4ae9dfbb5f45e58f7a83c5",
      badge: "IDOR", ep: "/api/pwn/account", param: "id", ph: "1337",
      title: { fr: "IDOR — relevé de compte", en: "IDOR — account statement" },
      brief: { fr: "Aucun contrôle d'accès : l'id est séquentiel. Essaie des comptes… et vise l'admin.", en: "No access control: the id is sequential. Try accounts… and aim for the admin." },
      rem: { fr: "Vérifier côté serveur que l'objet appartient à l'appelant ; identifiants non devinables (UUID).", en: "Check server-side that the object belongs to the caller; non-guessable identifiers (UUID)." } },
    { id: "jwt", hash: "7f9fef726d3506e766d7c7a5da4f0ea19b40b625bf717a9a4f814fb1074e95a9",
      badge: "JWT", ep: "/api/pwn/admin", jwt: true,
      title: { fr: "JWT — confusion d'algorithme (alg:none)", en: "JWT — algorithm confusion (alg:none)" },
      brief: { fr: "Le serveur fait confiance à l'en-tête du jeton. Obtiens un jeton, mets alg:none et role:admin, retire la signature.", en: "The server trusts the token header. Get a token, set alg:none and role:admin, drop the signature." },
      rem: { fr: "Figer l'algorithme attendu ; rejeter explicitement none ; vraie vérification de signature.", en: "Pin the expected algorithm; explicitly reject none; real signature verification." } },
    { id: "lfi", hash: "763d63c04bd7f4755cf0356f35f5ef0e61a6668347acd2482d34d9d3a9293e27",
      badge: "Path traversal", ep: "/api/pwn/view", param: "file", ph: "../flag",
      title: { fr: "Traversée de chemin — lecture de fichier", en: "Path traversal — file read" },
      brief: { fr: "Pas de normalisation du chemin : sors du dossier web avec ../ pour lire le flag.", en: "No path normalization: climb out of the web root with ../ to read the flag." },
      rem: { fr: "Normaliser et confiner le chemin (allow-list) ; jamais d'accès fichier piloté par l'utilisateur.", en: "Normalize and confine the path (allow-list); never user-controlled file access." } }
  ];

  function viewer(box, data, status) {
    box.textContent = "";
    var st2 = el("div", "pwn-status " + (status >= 200 && status < 300 ? "ok" : "ko"), "HTTP " + status);
    box.appendChild(st2);
    var pre = el("pre", "pwn-json"); pre.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    box.appendChild(pre);
  }

  function forgeNone() {
    var b64 = function (o) { return btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); };
    return b64({ alg: "none", typ: "JWT" }) + "." + b64({ role: "admin", sub: "pwned" }) + ".";
  }

  function card(c) {
    var wrap = el("div", "card pwn-card"); wrap.id = "pwn-" + c.id;
    var head = el("div", "pwn-h");
    head.appendChild(el("span", "pwn-badge", c.badge));
    head.appendChild(el("b", "pwn-title", L(c.title)));
    var state = el("span", "pwn-solved"); state.textContent = st[c.id] ? "✓ " + W("solved") : "";
    head.appendChild(state);
    wrap.appendChild(head);
    wrap.appendChild(el("p", "pwn-brief", L(c.brief)));

    // request builder
    var form = el("form", "pwn-req"); form.autocomplete = "off";
    var method = el("span", "pwn-m", "GET");
    var epc = el("code", "pwn-ep", c.ep + (c.jwt ? "" : "?" + c.param + "="));
    form.appendChild(method); form.appendChild(epc);
    var input = el("input", "pwn-in"); input.spellcheck = false;
    input.value = c.jwt ? forgeNone() : c.ph;
    input.setAttribute("aria-label", c.jwt ? "JWT" : c.param);
    form.appendChild(input);
    var send = el("button", "btn sm solid"); send.type = "submit"; send.textContent = W("send");
    form.appendChild(send);
    wrap.appendChild(form);

    if (c.jwt) {
      var tools = el("div", "pwn-tools");
      var tf = el("button", "pwn-tbtn"); tf.type = "button"; tf.textContent = W("forge");
      tf.addEventListener("click", function () { input.value = forgeNone(); });
      var tg = el("button", "pwn-tbtn"); tg.type = "button"; tg.textContent = W("getTok");
      tg.addEventListener("click", async function () { try { var r = await fetch("/api/pwn/token"); viewer(resp, await r.json(), r.status); } catch (e) { viewer(resp, { error: "offline" }, 0); } });
      tools.appendChild(tf); tools.appendChild(tg); wrap.appendChild(tools);
    }

    var resp = el("div", "pwn-resp"); wrap.appendChild(resp);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        var r, data;
        if (c.jwt) { r = await fetch(c.ep, { headers: { authorization: "Bearer " + input.value.trim() } }); }
        else { r = await fetch(c.ep + "?" + c.param + "=" + encodeURIComponent(input.value)); }
        var ct = r.headers.get("content-type") || "";
        data = ct.indexOf("json") >= 0 ? await r.json() : await r.text();
        viewer(resp, data, r.status);
      } catch (err) { viewer(resp, { error: "sandbox offline — deploy pwn/worker.js" }, 0); }
    });

    // flag submit
    var fl = el("form", "pwn-flag"); fl.autocomplete = "off";
    var fin = el("input", "pwn-fin"); fin.placeholder = W("flagph"); fin.spellcheck = false;
    var fb = el("button", "btn sm"); fb.type = "submit"; fb.textContent = W("check");
    var fmsg = el("span", "pwn-fmsg");
    fl.appendChild(fin); fl.appendChild(fb); fl.appendChild(fmsg);
    wrap.appendChild(fl);
    fl.addEventListener("submit", async function (e) {
      e.preventDefault();
      var h = await sha(fin.value.trim());
      if (h === c.hash) { st[c.id] = true; save(st); state.textContent = "✓ " + W("solved"); fmsg.className = "pwn-fmsg ok"; fmsg.textContent = W("ok"); wrap.classList.add("done"); progress(); }
      else { fmsg.className = "pwn-fmsg ko"; fmsg.textContent = W("bad"); }
    });

    // remediation
    var det = el("details", "pwn-rem");
    var sum = el("summary"); sum.textContent = W("rem"); det.appendChild(sum);
    det.appendChild(el("p", "pwn-remp", L(c.rem)));
    wrap.appendChild(det);

    if (st[c.id]) wrap.classList.add("done");
    return wrap;
  }

  function progress() {
    var n = CHALLENGES.filter(function (c) { return st[c.id]; }).length;
    var p = $("pwn-prog"); if (p) p.textContent = n + " / " + CHALLENGES.length;
    var bar = $("pwn-bar"); if (bar) bar.style.width = (n / CHALLENGES.length * 100) + "%";
    var won = $("pwn-won"); if (won) won.hidden = n < CHALLENGES.length;
  }

  function applyT() { document.querySelectorAll("[data-t]").forEach(function (n) { var v = W(n.dataset.t); if (v != null) n.textContent = v; }); }
  function build() {
    applyT();
    var host = $("pwn-cards"); if (host) { host.textContent = ""; CHALLENGES.forEach(function (c) { host.appendChild(card(c)); }); }
    progress();
    var rb = $("pwn-reset"); if (rb) rb.addEventListener("click", async function () { try { await fetch("/api/pwn/reset"); rb.textContent = "✓"; setTimeout(function () { rb.textContent = W("reset"); }, 1200); } catch (e) {} });
    var l = $("lang"); if (l) l.addEventListener("click", function () { setTimeout(build, 0); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
