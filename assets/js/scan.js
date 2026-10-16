/* Security header / DNS scanner front-end. Calls the Worker /api/tools/scan and renders a grade. */
(function () {
  "use strict";
  var API = "/api/tools/scan?url=";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var LBL = {
    https: ["HTTPS", "Connexion chiffrée (TLS)", "Encrypted connection (TLS)"],
    hsts: ["HSTS", "Force HTTPS (Strict-Transport-Security)", "Forces HTTPS (Strict-Transport-Security)"],
    csp: ["Content-Security-Policy", "Limite les scripts exécutables", "Restricts executable scripts"],
    xfo: ["Anti-clickjacking", "X-Frame-Options / frame-ancestors", "X-Frame-Options / frame-ancestors"],
    xcto: ["X-Content-Type-Options", "nosniff", "nosniff"],
    refp: ["Referrer-Policy", "Limite la fuite d'URL", "Limits URL leakage"],
    perm: ["Permissions-Policy", "Restreint les API du navigateur", "Restricts browser APIs"],
    server_hidden: ["Server discret", "N'expose pas sa version", "Hides its version"],
    dnssec: ["DNSSEC", "Réponses DNS signées", "Signed DNS answers"],
    caa: ["CAA", "Autorités de certification limitées", "Restricted certificate authorities"],
    dmarc: ["DMARC", "Anti-usurpation d'e-mail", "Anti e-mail spoofing"],
    spf: ["SPF", "Serveurs d'envoi autorisés", "Authorised sending servers"]
  };
  var tr = function (fr, enx) { return en() ? enx : fr; };

  function render(d) {
    var res = $("sc-res"); res.hidden = false;
    $("sc-grade").textContent = d.grade;
    $("sc-grade").className = "sc-grade g-" + d.grade.replace("+", "p");
    $("sc-host").textContent = d.host;
    $("sc-score").textContent = d.score + " / 100";
    var list = $("sc-checks"); list.textContent = "";
    (d.checks || []).forEach(function (c) {
      var L = LBL[c.id] || [c.id, "", ""];
      var li = document.createElement("li"); li.className = "sc-chk " + (c.ok ? "ok" : "ko");
      var st = document.createElement("span"); st.className = "sc-st"; st.textContent = c.ok ? "✓" : "✕";
      var txt = document.createElement("div");
      var b = document.createElement("b"); b.textContent = L[0];
      var s = document.createElement("small"); s.textContent = tr(L[1], L[2]);
      txt.appendChild(b); txt.appendChild(s);
      var v = document.createElement("code"); v.className = "sc-val"; v.textContent = c.value || "";
      li.appendChild(st); li.appendChild(txt); li.appendChild(v);
      list.appendChild(li);
    });
  }

  async function run(e) {
    if (e) e.preventDefault();
    var url = $("sc-url").value.trim();
    var msg = $("sc-msg"); msg.textContent = "";
    if (!url) return;
    $("sc-btn").disabled = true; msg.textContent = tr("Analyse en cours…", "Scanning…"); msg.className = "sc-msg";
    try {
      var r = await fetch(API + encodeURIComponent(url));
      var d = await r.json();
      if (d.error) { msg.className = "sc-msg ko"; msg.textContent = tr("Adresse invalide ou site injoignable.", "Invalid address or unreachable site."); }
      else { msg.textContent = ""; render(d); }
    } catch (err) { msg.className = "sc-msg ko"; msg.textContent = tr("Le scanner est injoignable pour le moment.", "The scanner is unavailable right now."); }
    $("sc-btn").disabled = false;
  }

  $("sc-form").addEventListener("submit", run);
  document.querySelectorAll("[data-ex]").forEach(function (b) {
    b.addEventListener("click", function () { $("sc-url").value = b.dataset.ex; run(); });
  });
})();
