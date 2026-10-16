/* Proof dashboard — aggregates live signals: GitHub (via same-origin /api/stats Worker),
   the mini-CTF counter (window.CTF + /api/ctf), and maintained platform stats (profiles.json).
   Auto-refreshes. CSP-safe (textContent only), bilingual FR/EN. */
(function () {
  "use strict";
  var STATS = "/api/stats";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var tr = function (fr, e) { return en() ? e : fr; };
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  var T = {
    fr: { crumb: "Dashboard de preuve", h: "Dashboard de preuve", lead: "Pas de blabla : des signaux vérifiables, agrégés en direct. Contributions GitHub, activité récente, plateformes, mini-CTF. Auto-actualisé.",
      repos: "Dépôts", stars: "Étoiles", followers: "Abonnés", years: "Années sur GitHub", contrib: "Contributions (90 j)", flags: "Flags mini-CTF",
      heat: "Activité GitHub — 90 derniers jours", langs: "Langages", recent: "Activité récente", platforms: "Plateformes", live: "live",
      empty: "Signaux indisponibles pour l'instant.", streak: "série", days: "j", ctf_sub: "flags trouvés sur ce navigateur", less: "moins", more: "plus", tocomplete: "à compléter" },
    en: { crumb: "Proof dashboard", h: "Proof dashboard", lead: "No talk: verifiable signals, aggregated live. GitHub contributions, recent activity, platforms, mini-CTF. Auto-refreshed.",
      repos: "Repos", stars: "Stars", followers: "Followers", years: "Years on GitHub", contrib: "Contributions (90 d)", flags: "Mini-CTF flags",
      heat: "GitHub activity — last 90 days", langs: "Languages", recent: "Recent activity", platforms: "Platforms", live: "live",
      empty: "Signals unavailable right now.", streak: "streak", days: "d", ctf_sub: "flags found on this browser", less: "less", more: "more", tocomplete: "to fill" }
  };
  function applyT() { var d = T[en() ? "en" : "fr"]; document.querySelectorAll("[data-t]").forEach(function (n) { var v = d[n.dataset.t]; if (v != null) n.textContent = v; }); }
  var L = function (k) { return T[en() ? "en" : "fr"][k]; };

  function tile(id, value) { var e = $(id); if (e) e.textContent = value; }
  function since(year) { var y = parseInt(year, 10); return y ? (new Date().getFullYear() - y) : "—"; }
  function ago(iso) {
    var s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 3600) return Math.floor(s / 60) + " min";
    if (s < 86400) return Math.floor(s / 3600) + " h";
    return Math.floor(s / 86400) + " " + L("days");
  }

  function renderStats(d) {
    var u = d.user || {};
    tile("s-repos", u.repos != null ? u.repos : "—");
    tile("s-stars", u.stars != null ? u.stars : "—");
    tile("s-followers", u.followers != null ? u.followers : "—");
    tile("s-years", since(u.created));
    tile("s-contrib", d.activity ? d.activity.total : "—");
    // heatmap
    var heat = $("dash-heat"); heat.textContent = "";
    if (d.activity && d.activity.days) {
      var weeks = [], cur = [];
      // pad so the first column starts on Sunday
      var first = new Date(d.activity.days[0].date + "T00:00:00Z").getUTCDay();
      for (var p = 0; p < first; p++) cur.push(null);
      d.activity.days.forEach(function (day) { cur.push(day); if (cur.length === 7) { weeks.push(cur); cur = []; } });
      if (cur.length) weeks.push(cur);
      weeks.forEach(function (w) {
        var col = el("div", "dash-week");
        for (var i = 0; i < 7; i++) {
          var day = w[i];
          var cell = el("div", "dash-cell" + (day ? " l" + day.level : " empty"));
          if (day) cell.title = day.date + " · " + day.count + " " + (en() ? "contributions" : "contributions");
          col.appendChild(cell);
        }
        heat.appendChild(col);
      });
      $("dash-streak").textContent = d.activity.streak + " " + L("days") + " " + L("streak");
    }
    // languages
    var lx = $("dash-langs"); lx.textContent = "";
    var max = (d.languages[0] || {}).n || 1;
    (d.languages || []).forEach(function (g) {
      var row = el("div", "dash-lang");
      row.appendChild(el("span", "dash-lang-n", g.name));
      var tr0 = el("span", "dash-lang-t"); var fl = el("span", "dash-lang-f"); fl.style.width = Math.max(8, Math.round(g.n / max * 100)) + "%"; tr0.appendChild(fl);
      row.appendChild(tr0);
      lx.appendChild(row);
    });
    if (!(d.languages || []).length) lx.appendChild(el("p", "dash-empty", "—"));
    // recent
    var rc = $("dash-recent"); rc.textContent = "";
    (d.recent || []).forEach(function (e2) {
      var row = el("div", "dash-ev");
      row.appendChild(el("span", "dash-ev-t", ago(e2.at)));
      row.appendChild(el("span", "dash-ev-v", en() ? e2.verb_en : e2.verb_fr));
      var a = el("a", "dash-ev-r", e2.repo); a.href = "https://github.com/" + e2.repo; a.target = "_blank"; a.rel = "noopener";
      row.appendChild(a);
      rc.appendChild(row);
    });
    if (!(d.recent || []).length) rc.appendChild(el("p", "dash-empty", L("empty")));
  }

  async function loadStats() {
    try {
      var r = await fetch(STATS, { cache: "no-store" });
      if ((r.headers.get("content-type") || "").indexOf("json") < 0) throw new Error("x");
      renderStats(await r.json());
      $("dash-live").classList.add("on");
    } catch (e) {
      $("dash-live").classList.remove("on");
      $("dash-recent").textContent = ""; $("dash-recent").appendChild(el("p", "dash-empty", L("empty")));
    }
  }

  async function loadProfiles() {
    var host = $("dash-platforms"); if (!host) return;
    var data;
    try { data = await (await fetch("assets/data/profiles.json", { cache: "no-store" })).json(); } catch (e) { return; }
    host.textContent = "";
    (data.platforms || []).forEach(function (p) {
      var card = el("a", "dash-plat"); card.href = p.url; card.target = "_blank"; card.rel = "noopener";
      if (p.accent) card.style.setProperty("--pc", p.accent);
      card.appendChild(el("span", "dash-plat-name", p.label));
      var v = el("span", "dash-plat-v");
      v.textContent = p.points ? p.points : p.rank ? p.rank : L("tocomplete");
      card.appendChild(v);
      card.appendChild(el("span", "dash-plat-h", p.handle || p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")));
      host.appendChild(card);
    });
  }

  function loadCTF() {
    try {
      if (window.CTF) {
        var found = (CTF.found && CTF.found().length) || 0;
        tile("s-flags", found + " / " + (CTF.total || 6));
      }
    } catch (e) {}
  }

  function wire() {
    applyT();
    var lang = $("lang"); if (lang) lang.addEventListener("click", function () { setTimeout(function () { applyT(); loadStats(); loadProfiles(); }, 0); });
    loadStats(); loadProfiles(); loadCTF();
    setInterval(loadStats, 300000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
