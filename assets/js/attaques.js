/* Live honeypot dashboard: polls /api/honeypot/stats and draws a rotating threat globe,
   stat tiles, top lists and a live feed. Same origin, no third party. textContent only. */
(function () {
  "use strict";
  var API = "/api/honeypot/stats";
  var ATT_API = "/api/honeypot/attackers";
  var POLL = 10000;
  var ATT_POLL = 45000;
  var SERVER = { lat: 6.13, lon: 1.22, name: "Lomé" };   // the honeypot's home
  var $ = function (id) { return document.getElementById(id); };
  var lang = function () { return document.documentElement.lang === "en" ? "en" : "fr"; };

  /* country ISO2 -> [lat, lon] centroid (compact table; "??" / unknown are skipped) */
  var C = {
    AF:[33,66],AL:[41,20],DZ:[28,3],AO:[-12.5,18.5],AR:[-34,-64],AM:[40,45],AU:[-25,133],AT:[47.3,13.3],AZ:[40.5,47.5],
    BD:[24,90],BY:[53,28],BE:[50.8,4],BJ:[9.5,2.25],BO:[-17,-65],BA:[44,18],BR:[-10,-55],BG:[43,25],BF:[13,-2],BI:[-3.5,30],
    KH:[13,105],CM:[6,12],CA:[60,-95],CF:[7,21],TD:[15,19],CL:[-30,-71],CN:[35,105],CO:[4,-72],CG:[-1,15],CD:[0,25],CR:[10,-84],
    CI:[8,-5.5],HR:[45.1,15.5],CU:[22,-80],CY:[35,33],CZ:[49.75,15.5],DK:[56,10],DO:[19,-70.7],EC:[-2,-77.5],EG:[27,30],SV:[13.8,-88.9],
    EE:[59,26],ET:[8,38],FI:[64,26],FR:[46,2],GA:[-1,11.75],GE:[42,43.5],DE:[51.5,10.5],GH:[8,-2],GR:[39,22],GT:[15.5,-90.25],
    GN:[11,-10],HT:[19,-72.4],HN:[15,-86.5],HK:[22.3,114.2],HU:[47,20],IS:[65,-18],IN:[22,79],ID:[-5,120],IR:[32,53],IQ:[33,44],
    IE:[53,-8],IL:[31.5,34.75],IT:[42.8,12.8],JM:[18.1,-77.3],JP:[36,138],JO:[31,36],KZ:[48,68],KE:[1,38],KW:[29.5,45.75],KG:[41,75],
    LA:[18,105],LV:[57,25],LB:[33.8,35.8],LY:[25,17],LT:[56,24],LU:[49.75,6.17],MG:[-20,47],MW:[-13.5,34],MY:[2.5,112.5],ML:[17,-4],
    MT:[35.9,14.4],MR:[20,-12],MX:[23,-102],MD:[47,28.5],MN:[46,105],ME:[42.5,19.3],MA:[32,-6],MZ:[-18.25,35],MM:[22,98],NA:[-22,17],
    NP:[28,84],NL:[52.5,5.75],NZ:[-41,174],NI:[13,-85],NE:[16,8],NG:[10,8],MK:[41.6,21.7],NO:[62,10],OM:[21,57],PK:[30,70],
    PA:[9,-80],PY:[-23,-58],PE:[-10,-76],PH:[13,122],PL:[52,20],PT:[39.5,-8],QA:[25.5,51.25],RO:[46,25],RU:[60,100],RW:[-2,30],
    SA:[25,45],SN:[14,-14],RS:[44,21],SG:[1.37,103.8],SK:[48.6,19.5],SI:[46.1,14.8],SO:[6,47],ZA:[-29,24],KR:[37,127.5],SS:[7,30],
    ES:[40,-4],LK:[7,81],SD:[15,30],SE:[62,15],CH:[47,8],SY:[35,38],TW:[23.5,121],TJ:[39,71],TZ:[-6,35],TH:[15,100],TG:[8,1.17],
    TN:[34,9],TR:[39,35],TM:[40,60],UG:[1,32],UA:[49,32],AE:[24,54],GB:[54,-2],US:[39.8,-98.5],UY:[-33,-56],UZ:[41.7,63.8],
    VE:[8,-66],VN:[16.2,107.8],YE:[15.5,48],ZM:[-15,30],ZW:[-19,29]
  };

  var T = {
    fr:{ lead:"Un honeypot écoute en direct les ports les plus scannés d'Internet. Voici les attaques qu'il reçoit — IP, pays, identifiants essayés — en temps réel. Rien n'est simulé.",
      total:"Attaques",ips:"IP uniques",countries:"Pays",last24:"Dernières 24 h",
      live:"En direct",ports:"Ports visés",creds:"Identifiants essayés",countries_t:"Pays d'origine",ipst:"IP les plus actives",feed:"Flux en direct",
      waiting:"Honeypot en cours de déploiement — les attaques apparaîtront ici dès le premier scan.",
      offline:"Dashboard temporairement indisponible.",attempts:"tentative(s)",ago:"il y a",now:"à l'instant",
      dossiers:"Dossiers — threat intel",dossiers_sub:"Chaque IP enrichie : réseau (ASN), nœud Tor, réputation, services visés, identifiants. Clique une IP pour l'ouvrir.",
      d_empty:"Les dossiers apparaîtront dès les premières attaques enrichies.",
      d_network:"Réseau",d_first:"Première vue",d_last:"Dernière vue",d_events:"Volume",d_services:"Services visés",d_creds:"Identifiants",d_rep:"Réputation",
      d_tor:"Nœud Tor",d_abuse:"AbuseIPDB",d_reports:"signalements",d_none:"aucune donnée externe",d_enriching:"enrichissement en cours…" },
    en:{ lead:"A honeypot listens live to the internet's most-scanned ports. Here are the attacks it receives — IP, country, attempted credentials — in real time. Nothing is simulated.",
      total:"Attacks",ips:"Unique IPs",countries:"Countries",last24:"Last 24 h",
      live:"Live",ports:"Targeted ports",creds:"Attempted credentials",countries_t:"Source countries",ipst:"Most active IPs",feed:"Live feed",
      waiting:"Honeypot being deployed — attacks will show up here on the first scan.",
      offline:"Dashboard temporarily unavailable.",attempts:"attempt(s)",ago:"",now:"just now",
      dossiers:"Dossiers — threat intel",dossiers_sub:"Every IP enriched: network (ASN), Tor node, reputation, targeted services, credentials. Click an IP to open it.",
      d_empty:"Dossiers will appear as soon as the first attacks are enriched.",
      d_network:"Network",d_first:"First seen",d_last:"Last seen",d_events:"Volume",d_services:"Targeted services",d_creds:"Credentials",d_rep:"Reputation",
      d_tor:"Tor node",d_abuse:"AbuseIPDB",d_reports:"reports",d_none:"no external data",d_enriching:"enriching…" }
  };
  var tr = function (k) { return T[lang()][k]; };

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ago(ts) {
    var s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
    if (s < 5) return tr("now");
    var u = lang() === "en" ? ["s", "min", "h", "d"] : ["s", "min", "h", "j"];
    if (s < 60) return (tr("ago") + " " + s + " " + u[0]).trim();
    if (s < 3600) return (tr("ago") + " " + Math.floor(s / 60) + " " + u[1]).trim();
    if (s < 86400) return (tr("ago") + " " + Math.floor(s / 3600) + " " + u[2]).trim();
    return (tr("ago") + " " + Math.floor(s / 86400) + " " + u[3]).trim();
  }
  function flag(iso) {
    if (!iso || iso.length !== 2 || iso === "??") return "🏴";
    return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65, 0x1F1E6 + iso.charCodeAt(1) - 65);
  }

  /* ---------------- threat globe (canvas) ---------------- */
  var cv = $("globe-cv"), cx2 = cv.getContext("2d");
  var points = [];            // {lat,lon,n,age}
  var rot = 0, W = 0, H = 0, R = 0, cxC = 0, cyC = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  function resize() {
    var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.42; cxC = W / 2; cyC = H / 2;
  }
  window.addEventListener("resize", resize);
  function project(lat, lon) {
    var phi = lat * Math.PI / 180, th = lon * Math.PI / 180 + rot;
    var x = Math.cos(phi) * Math.sin(th), y = Math.sin(phi), z = Math.cos(phi) * Math.cos(th);
    return { x: cxC + x * R, y: cyC - y * R, z: z };
  }
  function setPoints(pts) {
    points = (pts || []).map(function (p) {
      var c = C[p.country]; if (!c) return null;
      return { lat: c[0] + (Math.random() - 0.5) * 4, lon: c[1] + (Math.random() - 0.5) * 4, n: p.n || 1, t: p.ts || 0 };
    }).filter(Boolean);
  }
  var reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  function draw() {
    cx2.clearRect(0, 0, W, H);
    // globe disc
    var g = cx2.createRadialGradient(cxC - R * 0.3, cyC - R * 0.3, R * 0.2, cxC, cyC, R);
    g.addColorStop(0, "rgba(126,226,168,.05)"); g.addColorStop(1, "rgba(10,10,12,.9)");
    cx2.beginPath(); cx2.arc(cxC, cyC, R, 0, 7); cx2.fillStyle = g; cx2.fill();
    cx2.lineWidth = 1; cx2.strokeStyle = "rgba(126,226,168,.18)"; cx2.stroke();
    // graticule
    cx2.strokeStyle = "rgba(255,255,255,.06)";
    for (var la = -60; la <= 60; la += 30) {
      cx2.beginPath();
      for (var lo = -180; lo <= 180; lo += 6) { var p = project(la, lo); if (p.z < 0) { cx2.moveTo(p.x, p.y); continue; } cx2.lineTo(p.x, p.y); }
      cx2.stroke();
    }
    for (var lo2 = -150; lo2 <= 180; lo2 += 30) {
      cx2.beginPath();
      for (var la2 = -90; la2 <= 90; la2 += 6) { var q = project(la2, lo2); if (q.z < 0) { cx2.moveTo(q.x, q.y); continue; } cx2.lineTo(q.x, q.y); }
      cx2.stroke();
    }
    var srv = project(SERVER.lat, SERVER.lon);
    // arcs + points
    points.forEach(function (pt) {
      var p = project(pt.lat, pt.lon);
      if (p.z > -0.1 && srv.z > -0.2) {
        var mx = (p.x + srv.x) / 2, my = (p.y + srv.y) / 2;
        var dx = srv.x - p.x, dy = srv.y - p.y, d = Math.hypot(dx, dy);
        mx += -dy / (d || 1) * d * 0.22; my += dx / (d || 1) * d * 0.22;
        cx2.beginPath(); cx2.moveTo(p.x, p.y); cx2.quadraticCurveTo(mx, my, srv.x, srv.y);
        cx2.strokeStyle = "rgba(248,113,113," + (p.z > 0 ? 0.22 : 0.07) + ")"; cx2.lineWidth = 1; cx2.stroke();
      }
      if (p.z > 0) {
        var rad = 2 + Math.min(5, Math.log2(pt.n + 1));
        cx2.beginPath(); cx2.arc(p.x, p.y, rad, 0, 7);
        cx2.fillStyle = "rgba(248,113,113,.9)"; cx2.fill();
        cx2.beginPath(); cx2.arc(p.x, p.y, rad + 3, 0, 7);
        cx2.strokeStyle = "rgba(248,113,113,.35)"; cx2.stroke();
      }
    });
    // server node
    if (srv.z > 0) {
      var pulse = reduce ? 4 : 4 + 2 * Math.sin(Date.now() / 400);
      cx2.beginPath(); cx2.arc(srv.x, srv.y, pulse + 3, 0, 7); cx2.strokeStyle = "rgba(126,226,168,.5)"; cx2.stroke();
      cx2.beginPath(); cx2.arc(srv.x, srv.y, 4, 0, 7); cx2.fillStyle = "#7ee2a8"; cx2.fill();
    }
  }
  function loop() { if (!reduce) rot += 0.0016; draw(); requestAnimationFrame(loop); }

  /* ---------------- panels ---------------- */
  function bars(hostId, rows, label, color) {
    var host = $(hostId); host.textContent = "";
    if (!rows || !rows.length) { host.appendChild(el("p", "hp-empty", "—")); return; }
    var max = rows[0].n || 1;
    rows.forEach(function (r) {
      var row = el("div", "hp-bar");
      row.appendChild(el("span", "hp-bl", label(r)));
      var track = el("span", "hp-bt"); var fill = el("span", "hp-bf");
      fill.style.width = Math.max(6, Math.round(r.n / max * 100)) + "%"; if (color) fill.style.background = color;
      track.appendChild(fill); row.appendChild(track);
      row.appendChild(el("span", "hp-bn", String(r.n)));
      host.appendChild(row);
    });
  }
  function tile(id, v) { $(id).textContent = v; }

  function render(d) {
    $("hp-waiting").hidden = (d.totals.total > 0);
    tile("t-total", d.totals.total.toLocaleString());
    tile("t-24", d.totals.last24.toLocaleString());
    tile("t-ips", d.totals.ips.toLocaleString());
    tile("t-countries", d.totals.countries.toLocaleString());
    setPoints(d.points);
    bars("hp-ports", d.topPorts, function (r) { return (r.proto || "tcp") + " · " + (r.port || "?"); }, "#60a5fa");
    bars("hp-countries", d.topCountries, function (r) { return flag(r.country) + " " + r.country; }, "#f5c451");
    bars("hp-creds", d.topCreds, function (r) { return r.cred; }, "#f87171");
    // top IPs
    var host = $("hp-ips"); host.textContent = "";
    (d.topIps || []).forEach(function (r) {
      var row = el("div", "hp-ip clickable");
      row.appendChild(el("span", "hp-ipf", flag(r.country)));
      row.appendChild(el("span", "hp-ipa", r.ip));
      row.appendChild(el("span", "hp-ipn", r.n + " " + tr("attempts")));
      row.addEventListener("click", function () { openDossier(r.ip); });
      host.appendChild(row);
    });
    if (!(d.topIps || []).length) host.appendChild(el("p", "hp-empty", "—"));
    // feed
    var feed = $("hp-feed"); feed.textContent = "";
    (d.recent || []).forEach(function (e) {
      var row = el("div", "hp-ev");
      row.appendChild(el("span", "hp-et", ago(e.ts)));
      row.appendChild(el("span", "hp-ef", flag(e.country)));
      row.appendChild(el("span", "hp-ep", (e.proto || "tcp") + ":" + (e.port || "?")));
      var ipEl = el("span", "hp-ei clickable", e.ip);
      ipEl.addEventListener("click", function () { openDossier(e.ip); });
      row.appendChild(ipEl);
      var detail = e.cred || e.payload || e.path || "";
      if (detail) row.appendChild(el("span", "hp-ed", detail));
      feed.appendChild(row);
    });
    if (!(d.recent || []).length) feed.appendChild(el("p", "hp-empty", tr("waiting")));
    // timeline sparkline
    spark(d.timeline || []);
  }
  function spark(rows) {
    var host = $("hp-spark"); host.textContent = "";
    if (!rows.length) return;
    var now = Math.floor(Date.now() / 1000 / 3600) * 3600, map = {};
    rows.forEach(function (r) { map[r.h] = r.n; });
    var vals = [], max = 1;
    for (var i = 23; i >= 0; i--) { var v = map[now - i * 3600] || 0; vals.push(v); if (v > max) max = v; }
    vals.forEach(function (v) {
      var b = el("span", "hp-sb"); b.style.height = Math.max(3, Math.round(v / max * 100)) + "%";
      b.title = v; host.appendChild(b);
    });
  }

  /* ---------------- dossiers (threat intel) ---------------- */
  var dossierIps = {};  // ip -> card element, for click-to-open
  function repTone(score) { return score == null ? "" : score >= 50 ? "ko" : score >= 10 ? "warn" : "ok"; }
  function gnTone(cls) { return cls === "malicious" ? "ko" : cls === "benign" ? "ok" : "warn"; }

  function renderDossiers(list) {
    var host = $("hp-dossiers"); if (!host) return;
    host.textContent = ""; dossierIps = {};
    if (!list || !list.length) { host.appendChild(el("p", "hp-empty", tr("d_empty"))); return; }
    list.forEach(function (a) {
      var card = el("div", "card hp-dossier"); card.id = "dos-" + a.ip.replace(/[^a-zA-Z0-9]/g, "_");
      dossierIps[a.ip] = card;
      var head = el("div", "hp-dos-head");
      head.appendChild(el("span", "hp-dos-flag", flag(a.country)));
      head.appendChild(el("span", "hp-dos-ip", a.ip));
      var badges = el("span", "hp-dos-badges");
      var ic = a.intel || {};
      if (ic.tor) badges.appendChild(el("span", "hp-badge tor", "TOR"));
      if (ic.abuse_score != null) { var ab = el("span", "hp-badge " + repTone(ic.abuse_score), "abuse " + ic.abuse_score); badges.appendChild(ab); }
      if (ic.gn_class) badges.appendChild(el("span", "hp-badge " + gnTone(ic.gn_class), ic.gn_class));
      head.appendChild(badges);
      card.appendChild(head);

      var grid = el("div", "hp-dos-grid");
      function kv(k, v) { if (v == null || v === "") return; var r = el("div", "hp-dos-kv"); r.appendChild(el("span", "hp-dos-k", k)); r.appendChild(el("span", "hp-dos-v", v)); grid.appendChild(r); }
      kv(tr("d_network"), [ic.asn, ic.as_org].filter(Boolean).join(" · ") || (ic.isp || null));
      kv("Prefix", ic.prefix);
      kv("RIR", ic.rir ? ic.rir.toUpperCase() : null);
      kv(tr("d_events"), String(a.events) + " · " + flag(a.country) + " " + (a.country || "??"));
      kv(tr("d_first"), ago(a.first));
      kv(tr("d_last"), ago(a.last));
      if (ic.usage) kv("Usage", ic.usage);
      if (ic.abuse_score != null) kv(tr("d_abuse"), ic.abuse_score + "/100 · " + (ic.abuse_reports || 0) + " " + tr("d_reports"));
      card.appendChild(grid);

      if (a.services && a.services.length) {
        card.appendChild(el("div", "hp-dos-sub", tr("d_services")));
        var sv = el("div", "hp-dos-chips");
        a.services.forEach(function (s) { sv.appendChild(el("span", "hp-chip", (s.proto || "tcp") + ":" + (s.port || "?") + " ×" + s.n)); });
        card.appendChild(sv);
      }
      if (a.creds && a.creds.length) {
        card.appendChild(el("div", "hp-dos-sub", tr("d_creds")));
        var cr = el("div", "hp-dos-chips");
        a.creds.forEach(function (c) { cr.appendChild(el("span", "hp-chip cred", c.cred + " ×" + c.n)); });
        card.appendChild(cr);
      }
      if (!ic.asn && !ic.as_org && !ic.isp && ic.abuse_score == null && !ic.gn_class && !ic.tor)
        card.appendChild(el("p", "hp-dos-none", tr("d_none")));
      host.appendChild(card);
    });
  }
  function openDossier(ip) {
    var card = dossierIps[ip]; if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
  }

  async function pollAttackers() {
    try {
      var r = await fetch(ATT_API, { cache: "no-store" });
      if ((r.headers.get("content-type") || "").indexOf("json") < 0) throw new Error("x");
      var d = await r.json();
      renderDossiers(d.attackers || []);
    } catch (e) { /* keep whatever is shown; dossiers are best-effort */ }
  }

  function emptyState() {
    render({ totals: { total: 0, last24: 0, ips: 0, countries: 0 }, topPorts: [], topCountries: [], topCreds: [], topIps: [], recent: [], points: [], timeline: [] });
  }

  async function poll() {
    try {
      var r = await fetch(API, { cache: "no-store" });
      if ((r.headers.get("content-type") || "").indexOf("json") < 0) throw new Error("x");
      var d = await r.json();
      $("hp-dot").className = "hp-dot on";
      render(d);
    } catch (e) {
      $("hp-dot").className = "hp-dot off";
      var w = $("hp-waiting"); w.hidden = false; w.textContent = tr("offline");
    }
  }

  // i18n labels that are static on the page
  function labels() {
    document.querySelectorAll("[data-t]").forEach(function (n) { var v = T[lang()][n.dataset.t]; if (v) n.textContent = v; });
  }
  resize(); emptyState(); labels(); loop(); poll(); setInterval(poll, POLL);
  pollAttackers(); setInterval(pollAttackers, ATT_POLL);
  document.getElementById("lang") && document.getElementById("lang").addEventListener("click", function () { setTimeout(function () { labels(); poll(); pollAttackers(); }, 0); });
})();
