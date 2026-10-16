/* Command palette — Ctrl/Cmd-K opens a VS-Code-style launcher: navigate, run the terminal,
   switch language, download the CV, toggle Matrix mode. Keyboard-driven, CSP-safe (textContent only). */
(function () {
  "use strict";
  var en = function () { return document.documentElement.lang === "en"; };
  var t = function (fr, e) { return en() ? e : fr; };

  function items() {
    var nav = [
      ["À propos", "About", "index.html#about", "nav"],
      ["Compétences", "Skills", "competences.html", "nav"],
      ["Uses — mes outils", "Uses — my setup", "uses.html", "nav"],
      ["Projets", "Projects", "projets.html", "nav"],
      ["Hydra", "Hydra", "hydra.html", "nav"],
      ["CTF — palmarès", "CTF — results", "ctf.html", "nav"],
      ["Attaques en direct", "Live attacks", "attaques.html", "nav"],
      ["Certifications", "Certifications", "certifications.html", "nav"],
      ["Formation", "Education", "formation.html", "nav"],
      ["Expérience", "Experience", "experience.html", "nav"],
      ["Talks & événements", "Talks & events", "evenements.html", "nav"],
      ["Contact", "Contact", "contact.html", "nav"],
      ["Sécurité du site", "Site security", "securite.html", "nav"],
      ["Rapport de pentest (démo)", "Pentest report (demo)", "rapport.html", "nav"],
      ["Dashboard de preuve", "Proof dashboard", "dashboard.html", "nav"],
      ["Identité vérifiable", "Verifiable identity", "identite.html", "nav"],
      ["Labo crypto (WASM)", "Crypto lab (WASM)", "labo.html", "nav"],
      ["Scanner de sécurité", "Security scanner", "scan.html", "nav"],
      ["Secure Drop — message chiffré", "Secure Drop — encrypted message", "securedrop.html", "nav"],
      ["Statut des services", "Service status", "status.html", "nav"],
      ["Mini-CTF", "Mini-CTF", "flag.html", "nav"]
    ];
    var ext = [
      ["Blog", "Blog", "https://blog.sakoi-cyber.me", "ext"],
      ["Arène CTF", "CTF Arena", "https://ctf.sakoi-cyber.me", "ext"],
      ["GitHub", "GitHub", "https://github.com/H1v3-lab", "ext"],
      ["LinkedIn", "LinkedIn", "https://www.linkedin.com/in/dominique-savio-sakoi-b607b333a", "ext"]
    ];
    var act = [
      { fr: "Ouvrir le terminal", en: "Open the terminal", kind: "act", run: function () { var b = document.querySelector("[data-term]"); if (b) b.click(); } },
      { fr: "Changer de langue (FR / EN)", en: "Switch language (FR / EN)", kind: "act", run: function () { var l = document.getElementById("lang"); if (l) l.click(); } },
      { fr: "Télécharger mon CV", en: "Download my CV", kind: "act", run: function () { location.href = "CV_Dominique-Savio_SAKOI_" + (en() ? "EN" : "FR") + ".pdf"; } },
      { fr: "Copier mon e-mail", en: "Copy my e-mail", kind: "act", run: function () { try { navigator.clipboard.writeText("contact@sakoi-cyber.me"); } catch (e) {} } },
      { fr: "CV machine-lisible (JSON Resume)", en: "Machine-readable CV (JSON Resume)", kind: "act", run: function () { window.open("resume.json", "_blank", "noopener"); } },
      { fr: "Mode Matrix", en: "Matrix mode", kind: "act", run: function () { if (window.DmodFun) window.DmodFun.matrix(); } }
    ];
    var out = [];
    nav.forEach(function (n) { out.push({ label: en() ? n[1] : n[0], sub: t("Page", "Page"), href: n[2], kind: n[3] }); });
    act.forEach(function (a) { out.push({ label: en() ? a.en : a.fr, sub: t("Action", "Action"), run: a.run, kind: "act" }); });
    ext.forEach(function (n) { out.push({ label: en() ? n[1] : n[0], sub: t("Lien externe", "External link"), href: n[2], kind: "ext", ext: true }); });
    return out;
  }

  var ov, input, list, data = [], filtered = [], sel = 0;
  function build() {
    ov = document.createElement("div"); ov.className = "cmdk"; ov.hidden = true;
    ov.innerHTML = '<div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Palette de commandes">'
      + '<div class="cmdk-in"><span class="cmdk-pr">&gt;_</span><input type="text" id="cmdk-q" autocomplete="off" spellcheck="false"></div>'
      + '<ul class="cmdk-list" id="cmdk-list"></ul>'
      + '<div class="cmdk-foot"><span>↑↓ ' + t("naviguer", "navigate") + '</span><span>↵ ' + t("ouvrir", "open") + '</span><span>esc ' + t("fermer", "close") + '</span></div></div>';
    document.body.appendChild(ov);
    input = ov.querySelector("#cmdk-q"); list = ov.querySelector("#cmdk-list");
    input.placeholder = t("Rechercher une page, une action…", "Search a page, an action…");
    input.addEventListener("input", function () { render(); });
    input.addEventListener("keydown", key);
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) close(); });
  }
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function render() {
    var q = norm(input.value.trim());
    filtered = q ? data.filter(function (d) { return norm(d.label).indexOf(q) >= 0 || norm(d.sub).indexOf(q) >= 0; }) : data;
    sel = 0; list.textContent = "";
    filtered.forEach(function (d, i) {
      var li = document.createElement("li"); li.className = "cmdk-item" + (i === sel ? " on" : ""); li.dataset.i = i;
      var ic = document.createElement("span"); ic.className = "cmdk-ic " + d.kind;
      ic.textContent = d.kind === "act" ? "⚡" : d.kind === "ext" ? "↗" : "→";
      var lab = document.createElement("span"); lab.className = "cmdk-lab"; lab.textContent = d.label;
      var sub = document.createElement("span"); sub.className = "cmdk-sub"; sub.textContent = d.sub;
      li.appendChild(ic); li.appendChild(lab); li.appendChild(sub);
      li.addEventListener("mouseenter", function () { sel = i; mark(); });
      li.addEventListener("click", function () { go(filtered[i]); });
      list.appendChild(li);
    });
    if (!filtered.length) { var e = document.createElement("li"); e.className = "cmdk-empty"; e.textContent = t("Aucun résultat", "No result"); list.appendChild(e); }
  }
  function mark() { [].forEach.call(list.children, function (li, i) { li.classList.toggle("on", i === sel); }); var on = list.children[sel]; if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest" }); }
  function go(d) { if (!d) return; close(); if (d.run) d.run(); else if (d.href) { if (d.ext) window.open(d.href, "_blank", "noopener"); else location.href = d.href; } }
  function key(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(filtered.length - 1, sel + 1); mark(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
    else if (e.key === "Enter") { e.preventDefault(); go(filtered[sel]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  }
  function open() { if (!ov) build(); data = items(); ov.hidden = false; document.documentElement.classList.add("cmdk-open"); input.value = ""; render(); setTimeout(function () { input.focus(); }, 20); }
  function close() { if (ov) { ov.hidden = true; document.documentElement.classList.remove("cmdk-open"); } }

  document.addEventListener("keydown", function (e) {
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ov && !ov.hidden ? close() : open(); }
  });

  function mountBtn() {
    var box = document.querySelector(".controls");
    if (!box || box.querySelector(".cmdk-btn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "cmdk-btn"; b.setAttribute("aria-label", t("Palette de commandes", "Command palette"));
    b.title = t("Palette (Ctrl-K)", "Palette (Ctrl-K)");
    var mac = /Mac|iPhone|iPad/.test(navigator.platform);
    b.textContent = (mac ? "⌘" : "Ctrl") + "K";
    b.addEventListener("click", open);
    var term = box.querySelector("[data-term]");
    term ? box.insertBefore(b, term) : box.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountBtn); else mountBtn();

  window.DmodPalette = { open: open };
})();
