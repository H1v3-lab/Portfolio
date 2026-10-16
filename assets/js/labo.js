/* Labo crypto — front-end for the Go→WebAssembly security toolkit (assets/wasm/sectools.wasm).
   Loads the module lazily, then wires three tools: JWT analyzer, X.509 parser, hash tool.
   All work happens client-side; nothing is sent anywhere. CSP-safe (textContent only). */
(function () {
  "use strict";
  var WASM = "assets/wasm/sectools.wasm?v=e86a3103ad";
  var ready = false, loading = false;
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var tr = function (fr, e) { return en() ? e : fr; };

  var T = {
    fr: {
      crumb: "Labo crypto",
      h: "Labo crypto",
      lead: "Une boîte à outils compilée en WebAssembly depuis du Go. Analyse de JWT, parseur de certificats X.509, outil de hachage. Tout s'exécute dans ton navigateur — aucun jeton, certificat ou secret n'est envoyé où que ce soit.",
      tab_jwt: "JWT", tab_cert: "Certificat X.509", tab_hash: "Hash",
      jwt_lbl: "Jeton JWT", jwt_sec: "Secret HMAC (optionnel, pour vérifier HS256/384/512)",
      analyze: "Analyser", run: "Calculer", try: "Essayer :",
      cert_lbl: "Certificat (PEM, ou DER en base64 / hex)", cert_sample: "Certificat d'exemple",
      hash_digest: "Hacher un texte", hash_identify: "Identifier un hash", hash_lbl: "Entrée",
      foot: "Code source du module (Go) : tools/wasm/sectools dans le dépôt. Il s'exécute sous CSP stricte avec 'wasm-unsafe-eval' — qui autorise WebAssembly sans permettre l'eval() JavaScript."
    },
    en: {
      crumb: "Crypto lab",
      h: "Crypto lab",
      lead: "A toolkit compiled to WebAssembly from Go. JWT analysis, X.509 certificate parser, hashing tool. Everything runs in your browser — no token, certificate or secret is ever sent anywhere.",
      tab_jwt: "JWT", tab_cert: "X.509 certificate", tab_hash: "Hash",
      jwt_lbl: "JWT token", jwt_sec: "HMAC secret (optional, to verify HS256/384/512)",
      analyze: "Analyze", run: "Compute", try: "Try:",
      cert_lbl: "Certificate (PEM, or base64 / hex DER)", cert_sample: "Sample certificate",
      hash_digest: "Hash a text", hash_identify: "Identify a hash", hash_lbl: "Input",
      foot: "Module source (Go): tools/wasm/sectools in the repo. It runs under a strict CSP with 'wasm-unsafe-eval' — which allows WebAssembly without permitting JavaScript eval()."
    }
  };
  function applyT() {
    var d = T[en() ? "en" : "fr"];
    document.querySelectorAll("[data-t]").forEach(function (n) { var v = d[n.dataset.t]; if (v != null) n.textContent = v; });
  }

  var LEVEL = { crit: "crit", warn: "warn", ok: "ok", info: "info" };
  function badge(level) {
    var b = document.createElement("span");
    b.className = "lab-badge " + (LEVEL[level] || "info");
    b.textContent = { crit: "critique", warn: "attention", ok: "ok", info: "info" }[level] || "info";
    if (en()) b.textContent = { crit: "critical", warn: "warning", ok: "ok", info: "info" }[level] || "info";
    return b;
  }
  function findingList(findings) {
    var ul = document.createElement("ul"); ul.className = "lab-find";
    (findings || []).forEach(function (f) {
      var li = document.createElement("li"); li.className = "lab-f " + (f.level || "info");
      var top = document.createElement("div"); top.className = "lab-f-top";
      top.appendChild(badge(f.level));
      var t = document.createElement("b"); t.textContent = f.title; top.appendChild(t);
      var d = document.createElement("p"); d.textContent = f.detail;
      li.appendChild(top); li.appendChild(d); ul.appendChild(li);
    });
    return ul;
  }
  function kv(label, value, mono) {
    var row = document.createElement("div"); row.className = "lab-kv";
    var k = document.createElement("span"); k.className = "lab-k"; k.textContent = label;
    var v = document.createElement(mono ? "code" : "span"); v.className = "lab-v"; v.textContent = value;
    row.appendChild(k); row.appendChild(v); return row;
  }
  function section(title) {
    var h = document.createElement("div"); h.className = "lab-sub"; h.textContent = title; return h;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function err(box, msg) { clear(box); box.hidden = false; var p = document.createElement("p"); p.className = "lab-err"; p.textContent = msg; box.appendChild(p); }

  // ---- WASM loading ----
  function setStatus(txt, cls) {
    var s = $("lab-status"); if (!s) return;
    s.textContent = txt; s.className = "lab-status " + (cls || "");
  }
  function load() {
    if (ready || loading) return Promise.resolve(ready);
    loading = true;
    setStatus(tr("Chargement du module WASM…", "Loading the WASM module…"), "loading");
    if (typeof Go === "undefined") { setStatus(tr("Runtime Go introuvable.", "Go runtime missing."), "ko"); return Promise.resolve(false); }
    var go = new Go();
    globalThis.__sectoolsReady = function () {
      ready = true; loading = false;
      setStatus(tr("Module prêt — tout s'exécute dans ton navigateur.", "Module ready — everything runs in your browser."), "ok");
      document.querySelectorAll("[data-run]").forEach(function (b) { b.disabled = false; });
    };
    var inst = WebAssembly.instantiateStreaming
      ? WebAssembly.instantiateStreaming(fetch(WASM), go.importObject).catch(function () {
          return fetch(WASM).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return WebAssembly.instantiate(b, go.importObject); });
        })
      : fetch(WASM).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return WebAssembly.instantiate(b, go.importObject); });
    return inst.then(function (res) { go.run(res.instance); return true; })
      .catch(function (e) { loading = false; setStatus(tr("Échec du chargement du module.", "Module failed to load."), "ko"); return false; });
  }

  function callWasm(fn, args) {
    try { return JSON.parse(globalThis[fn].apply(null, args)); }
    catch (e) { return { error: tr("Erreur interne du module.", "Internal module error.") }; }
  }

  // ---- Tabs ----
  function initTabs() {
    var tabs = document.querySelectorAll(".lab-tab");
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        tabs.forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-selected", "false"); });
        t.classList.add("on"); t.setAttribute("aria-selected", "true");
        document.querySelectorAll(".lab-panel").forEach(function (p) { p.hidden = p.dataset.panel !== t.dataset.tab; });
      });
    });
  }

  // ---- JWT ----
  function renderJWT(box, d) {
    clear(box); box.hidden = false;
    if (d.error) { err(box, d.error); return; }
    var sig = { none: tr("non signé", "unsigned"), unverified: tr("non vérifiée", "unverified"), valid: tr("valide", "valid"), invalid: tr("invalide", "invalid") }[d.signature] || d.signature;
    box.appendChild(section(tr("Signature", "Signature")));
    var meta = document.createElement("div"); meta.className = "lab-grid";
    meta.appendChild(kv("alg", d.alg || "—", true));
    if (d.typ) meta.appendChild(kv("typ", d.typ, true));
    if (d.kid) meta.appendChild(kv("kid", d.kid, true));
    meta.appendChild(kv(tr("État", "State"), sig, true));
    box.appendChild(meta);

    if (d.claims && d.claims.length) {
      box.appendChild(section(tr("Revendications", "Claims")));
      d.claims.forEach(function (c) { box.appendChild(kv(c.key, c.value + (c.human ? "  (" + c.human + ")" : ""), true)); });
    }
    box.appendChild(section(tr("En-tête (JSON)", "Header (JSON)")));
    var h = document.createElement("pre"); h.className = "lab-json"; h.textContent = JSON.stringify(d.header, null, 2); box.appendChild(h);
    box.appendChild(section(tr("Charge utile (JSON)", "Payload (JSON)")));
    var p = document.createElement("pre"); p.className = "lab-json"; p.textContent = JSON.stringify(d.payload, null, 2); box.appendChild(p);
    if (d.findings && d.findings.length) { box.appendChild(section(tr("Analyse", "Analysis"))); box.appendChild(findingList(d.findings)); }
  }

  // ---- Cert ----
  function renderCert(box, d) {
    clear(box); box.hidden = false;
    if (d.error) { err(box, d.error); return; }
    box.appendChild(section(tr("Identité", "Identity")));
    box.appendChild(kv(tr("Sujet", "Subject"), d.subject, true));
    box.appendChild(kv(tr("Émetteur", "Issuer"), d.issuer, true));
    box.appendChild(kv(tr("Numéro de série", "Serial"), d.serial, true));
    box.appendChild(section(tr("Validité & clé", "Validity & key")));
    box.appendChild(kv(tr("Valide du", "Not before"), d.notBefore, true));
    box.appendChild(kv(tr("Valide au", "Not after"), d.notAfter + "  (" + d.daysLeft + " j)", true));
    box.appendChild(kv(tr("Clé", "Key"), d.keyType, true));
    box.appendChild(kv(tr("Signature", "Signature"), d.sigAlg, true));
    box.appendChild(kv("CA", d.isCA ? tr("oui", "yes") : tr("non", "no"), false));
    if (d.sans && d.sans.length) { box.appendChild(section("SAN")); box.appendChild(kv(tr("Noms", "Names"), d.sans.join("  "), true)); }
    if (d.keyUsage && d.keyUsage.length) box.appendChild(kv("Key Usage", d.keyUsage.join(", "), false));
    if (d.extKeyUsage && d.extKeyUsage.length) box.appendChild(kv("Ext Key Usage", d.extKeyUsage.join(", "), false));
    box.appendChild(section(tr("Empreintes", "Fingerprints")));
    box.appendChild(kv("SHA-256", d.fingerprintSha256, true));
    box.appendChild(kv("SHA-1", d.fingerprintSha1, true));
    if (d.findings && d.findings.length) { box.appendChild(section(tr("Analyse", "Analysis"))); box.appendChild(findingList(d.findings)); }
  }

  // ---- Hash ----
  function renderHash(box, d) {
    clear(box); box.hidden = false;
    if (d.error) { err(box, d.error); return; }
    if (d.mode === "digest") {
      box.appendChild(section(tr("Condensats", "Digests")));
      (d.digests || []).forEach(function (r) { box.appendChild(kv(r.name + " (" + r.bits + " bits)", r.hex, true)); });
    } else {
      box.appendChild(section(tr("Algorithmes candidats", "Candidate algorithms")));
      if (!d.guesses || !d.guesses.length) { var p = document.createElement("p"); p.className = "lab-muted"; p.textContent = tr("Aucune correspondance.", "No match."); box.appendChild(p); }
      (d.guesses || []).forEach(function (g) {
        var row = document.createElement("div"); row.className = "lab-guess";
        var n = document.createElement("b"); n.textContent = g.name;
        var c = document.createElement("span"); c.className = "lab-conf " + (g.confidence === "élevée" ? "hi" : "mid"); c.textContent = tr("confiance ", "confidence ") + g.confidence;
        row.appendChild(n); row.appendChild(c);
        if (g.hashcat && g.hashcat !== "—") { var hc = document.createElement("code"); hc.className = "lab-hc"; hc.textContent = "hashcat -m " + g.hashcat; row.appendChild(hc); }
        box.appendChild(row);
      });
    }
    if (d.findings && d.findings.length) { box.appendChild(section(tr("Notes", "Notes"))); box.appendChild(findingList(d.findings)); }
  }

  function run(btn, worker) {
    if (!ready) { load().then(function (ok) { if (ok) worker(); }); return; }
    worker();
  }

  function wire() {
    applyT();
    var lang = $("lang"); if (lang) lang.addEventListener("click", function () { setTimeout(applyT, 0); });
    initTabs();
    // JWT
    $("jwt-run") && $("jwt-run").addEventListener("click", function () {
      run(this, function () { renderJWT($("jwt-res"), callWasm("sectoolsJWT", [$("jwt-in").value, $("jwt-secret").value])); });
    });
    document.querySelectorAll("[data-jwt-ex]").forEach(function (b) {
      b.addEventListener("click", function () { $("jwt-in").value = b.dataset.jwtEx; $("jwt-secret").value = b.dataset.jwtSecret || ""; $("jwt-run").click(); });
    });
    // Cert
    $("cert-run") && $("cert-run").addEventListener("click", function () {
      run(this, function () { renderCert($("cert-res"), callWasm("sectoolsCert", [$("cert-in").value])); });
    });
    $("cert-ex") && $("cert-ex").addEventListener("click", function () {
      var s = $("cert-sample"); if (s) { $("cert-in").value = s.textContent.trim(); $("cert-run").click(); }
    });
    // Hash
    $("hash-run") && $("hash-run").addEventListener("click", function () {
      var mode = document.querySelector('input[name="hash-mode"]:checked');
      run(this, function () { renderHash($("hash-res"), callWasm("sectoolsHash", [$("hash-in").value, mode ? mode.value : "digest"])); });
    });
    document.querySelectorAll("[data-hash-ex]").forEach(function (b) {
      b.addEventListener("click", function () {
        $("hash-in").value = b.dataset.hashEx;
        // "identify" for hash-looking inputs, "digest" for plain text.
        var looksHash = /^[0-9a-fA-F]{8,}$/.test(b.dataset.hashEx) || b.dataset.hashEx.charAt(0) === "$";
        var want = document.querySelector('input[name="hash-mode"][value="' + (looksHash ? "identify" : "digest") + '"]');
        if (want) want.checked = true;
        $("hash-run").click();
      });
    });

    // Preload the module as soon as the page is idle, so the first click is instant.
    (window.requestIdleCallback || function (f) { setTimeout(f, 1200); })(function () { load(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
