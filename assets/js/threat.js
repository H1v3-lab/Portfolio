/* THREAT LEVEL / DEFCON mode — a selector injected into the controls rail that reskins the
   site accent by threat level and shows a live security posture (services up, attacks 24h).
   Choice persists in localStorage. CSP-safe (textContent only). */
(function () {
  "use strict";
  if (!document.querySelector(".controls")) return;
  var KEY = "dmod_threat";
  var en = function () { return document.documentElement.lang === "en"; };
  var tr = function (fr, e) { return en() ? e : fr; };
  var LEVELS = [
    { n: 5, label: "DEFCON 5", fr: "Calme", en: "Calm", c: "#7ee2a8" },
    { n: 4, label: "DEFCON 4", fr: "Vigilance", en: "Elevated", c: "#60a5fa" },
    { n: 3, label: "DEFCON 3", fr: "Alerte", en: "Guarded", c: "#f5c451" },
    { n: 2, label: "DEFCON 2", fr: "Haute", en: "High", c: "#fb923c" },
    { n: 1, label: "DEFCON 1", fr: "Critique", en: "Severe", c: "#f87171" }
  ];
  function lvl(n) { return LEVELS.filter(function (l) { return l.n === n; })[0] || LEVELS[0]; }

  function apply(n) {
    document.documentElement.dataset.threat = String(n);
    try { localStorage.setItem(KEY, String(n)); } catch (e) {}
    var b = document.getElementById("defcon-btn");
    if (b) { b.querySelector(".defcon-dot").style.background = lvl(n).c; b.querySelector(".defcon-n").textContent = n; }
    var rows = document.querySelectorAll(".defcon-lvl");
    rows.forEach(function (r) { r.classList.toggle("on", +r.dataset.n === n); });
  }
  function saved() { try { var v = +localStorage.getItem(KEY); return v >= 1 && v <= 5 ? v : 5; } catch (e) { return 5; } }

  var panel;
  function buildPanel() {
    panel = document.createElement("div"); panel.className = "defcon-panel"; panel.hidden = true;
    var head = document.createElement("div"); head.className = "defcon-head";
    head.textContent = tr("Niveau de menace", "Threat level");
    panel.appendChild(head);
    LEVELS.forEach(function (l) {
      var row = document.createElement("button"); row.type = "button"; row.className = "defcon-lvl"; row.dataset.n = l.n;
      var dot = document.createElement("span"); dot.className = "defcon-ld"; dot.style.background = l.c;
      var nm = document.createElement("span"); nm.className = "defcon-ln"; nm.textContent = l.label;
      var ds = document.createElement("span"); ds.className = "defcon-ls"; ds.textContent = en() ? l.en : l.fr;
      row.appendChild(dot); row.appendChild(nm); row.appendChild(ds);
      row.addEventListener("click", function () { apply(l.n); });
      panel.appendChild(row);
    });
    var post = document.createElement("div"); post.className = "defcon-post"; post.id = "defcon-post";
    post.textContent = tr("Posture : …", "Posture: …");
    panel.appendChild(post);
    document.body.appendChild(panel);
  }
  function togglePanel(show) {
    if (!panel) buildPanel();
    var b = document.getElementById("defcon-btn");
    if (show == null) show = panel.hidden;
    if (show) {
      var r = b.getBoundingClientRect();
      panel.hidden = false; loadPosture();
      var ph = panel.offsetHeight, pw = panel.offsetWidth;
      var top = r.bottom + 8;
      if (top + ph > window.innerHeight - 10) top = r.top - ph - 8;        // open upward
      if (top < 10) top = Math.max(10, window.innerHeight - ph - 10);       // clamp
      var left = Math.min(r.left, window.innerWidth - pw - 10);
      panel.style.left = Math.max(10, left) + "px";
      panel.style.top = top + "px";
    } else panel.hidden = true;
  }

  async function loadPosture() {
    var post = document.getElementById("defcon-post"); if (!post) return;
    var up = "—", total = "—", atk = "—";
    try { var s = await (await fetch("/api/tools/status", { cache: "no-store" })).json(); up = s.up; total = s.total; } catch (e) {}
    try { var h = await (await fetch("/api/honeypot/stats", { cache: "no-store" })).json(); atk = (h.totals && h.totals.last24 != null) ? h.totals.last24 : "—"; } catch (e) {}
    post.textContent = "";
    var a = document.createElement("div"); a.className = "defcon-pr";
    a.appendChild(mk(tr("Services", "Services"), up + " / " + total, (up !== "—" && up === total) ? "ok" : "warn"));
    post.appendChild(a);
    var b2 = document.createElement("div"); b2.className = "defcon-pr";
    b2.appendChild(mk(tr("Attaques 24 h", "Attacks 24 h"), String(atk), atk === "—" ? "" : (atk > 50 ? "ko" : atk > 0 ? "warn" : "ok")));
    post.appendChild(b2);
    var note = document.createElement("p"); note.className = "defcon-note";
    note.textContent = tr("Posture live du site. Le niveau change l'ambiance.", "Live site posture. The level sets the mood.");
    post.appendChild(note);
  }
  function mk(k, v, tone) {
    var w = document.createElement("span");
    var ks = document.createElement("span"); ks.className = "defcon-pk"; ks.textContent = k;
    var vs = document.createElement("span"); vs.className = "defcon-pv " + (tone || ""); vs.textContent = v;
    w.appendChild(ks); w.appendChild(vs); return w;
  }

  function mount() {
    var box = document.querySelector(".controls");
    if (!box || document.getElementById("defcon-btn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "defcon-btn"; b.className = "defcon-btn";
    b.setAttribute("aria-label", tr("Niveau de menace", "Threat level"));
    b.title = "DEFCON";
    var dot = document.createElement("span"); dot.className = "defcon-dot";
    var txt = document.createElement("span"); txt.className = "defcon-t"; txt.textContent = "DEFCON ";
    var n = document.createElement("span"); n.className = "defcon-n";
    b.appendChild(dot); b.appendChild(txt); b.appendChild(n);
    b.addEventListener("click", function (e) { e.stopPropagation(); togglePanel(); });
    box.appendChild(b);
    document.addEventListener("click", function (e) { if (panel && !panel.hidden && !panel.contains(e.target) && e.target !== b && !b.contains(e.target)) panel.hidden = true; });
    var lang = document.getElementById("lang"); if (lang) lang.addEventListener("click", function () { setTimeout(function () { if (panel) { panel.remove(); panel = null; } }, 0); });
    apply(saved());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
