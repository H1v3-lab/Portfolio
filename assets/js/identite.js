/* Identité cryptographique vérifiable.
   - Affiche la clé PGP publique (parsée en direct avec OpenPGP.js).
   - "Prouve que c'est moi" : défi aléatoire + vérification d'une signature détachée/clearsign.
   - Preuves liées (keybase-style) : déclarations signées, vérifiées en direct.
   - Démo WebCrypto Ed25519 : génère une paire éphémère, signe, vérifie, falsifie.
   Tout est côté client. CSP-safe (textContent only). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var tr = function (fr, e) { return en() ? e : fr; };
  var FP = "7A1E7DFF5B9C126533A5EF2FB73CAA6CDE272EE6";

  var T = {
    fr: {
      crumb: "Identité vérifiable", h: "Identité cryptographique vérifiable",
      lead: "Ne me crois pas sur parole : vérifie. Ma clé publique, un défi que je peux signer sous tes yeux, et des preuves liant mes comptes — le tout contrôlable dans ton navigateur, sans me faire confiance.",
      k_title: "Ma clé publique PGP", k_fp: "Empreinte", k_uid: "Identité", k_algo: "Algorithme", k_created: "Créée le", k_dl: "Télécharger la clé (.asc)",
      c_title: "Prouve que c'est bien moi", c_desc: "Principe : je possède la clé privée correspondant à la clé publique ci-dessus. Génère un défi aléatoire, je le signe (hors-ligne, avec ma clé), et tu vérifies la signature ici même. Personne d'autre ne peut produire une signature valide.",
      c_gen: "Générer un défi", c_chal: "Défi à signer", c_paste: "Colle ici le message signé (gpg --clearsign)", c_verify: "Vérifier", c_copy: "Copier le défi",
      p_title: "Preuves liées", p_desc: "Déclarations signées avec ma clé, reliant mes comptes. Chacune est vérifiée en direct dans ton navigateur.",
      d_title: "Démo : signature Ed25519 en direct (WebCrypto)", d_desc: "Pour illustrer le mécanisme : on génère une paire de clés Ed25519 éphémère dans ton navigateur, on signe un défi aléatoire, puis on vérifie — et on falsifie pour voir la détection.",
      d_gen: "1 · Générer une paire", d_sign: "2 · Signer un défi", d_verify: "3 · Vérifier", d_tamper: "Falsifier (1 bit)",
      foot: "OpenPGP.js (vérification PGP) et l'API WebCrypto du navigateur (Ed25519) font tout le travail, localement. Aucune clé privée de mon identité ne touche ce site."
    },
    en: {
      crumb: "Verifiable identity", h: "Verifiable cryptographic identity",
      lead: "Don't take my word for it — verify. My public key, a challenge I can sign in front of you, and proofs linking my accounts — all checkable in your browser, trustlessly.",
      k_title: "My PGP public key", k_fp: "Fingerprint", k_uid: "Identity", k_algo: "Algorithm", k_created: "Created", k_dl: "Download key (.asc)",
      c_title: "Prove it's really me", c_desc: "Principle: I hold the private key matching the public key above. Generate a random challenge, I sign it (offline, with my key), and you verify the signature right here. Nobody else can produce a valid signature.",
      c_gen: "Generate a challenge", c_chal: "Challenge to sign", c_paste: "Paste the signed message here (gpg --clearsign)", c_verify: "Verify", c_copy: "Copy challenge",
      p_title: "Linked proofs", p_desc: "Statements signed with my key, linking my accounts. Each is verified live in your browser.",
      d_title: "Demo: live Ed25519 signature (WebCrypto)", d_desc: "To illustrate the mechanism: we generate an ephemeral Ed25519 key pair in your browser, sign a random challenge, then verify — and tamper to see detection.",
      d_gen: "1 · Generate a pair", d_sign: "2 · Sign a challenge", d_verify: "3 · Verify", d_tamper: "Tamper (1 bit)",
      foot: "OpenPGP.js (PGP verification) and the browser's WebCrypto API (Ed25519) do all the work locally. No private key of my identity ever touches this site."
    }
  };
  function applyT() { var d = T[en() ? "en" : "fr"]; document.querySelectorAll("[data-t]").forEach(function (n) { var v = d[n.dataset.t]; if (v != null) n.textContent = v; }); }

  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function space4(s) { return s.toUpperCase().replace(/(.{4})/g, "$1 ").trim(); }
  function note(el, msg, cls) { el.hidden = false; el.className = "id-note " + (cls || ""); el.textContent = msg; }

  // ---------- 1. Public key ----------
  var pubKey = null;
  async function loadKey() {
    try {
      var armored = await (await fetch("pgp.asc", { cache: "no-store" })).text();
      pubKey = await openpgp.readKey({ armoredKey: armored });
      var info = pubKey.getAlgorithmInfo();
      $("k-fp").textContent = space4(pubKey.getFingerprint());
      $("k-uid").textContent = pubKey.getUserIDs().join(", ");
      $("k-algo").textContent = (info.algorithm || "") + (info.curve ? " · " + info.curve : "");
      $("k-created").textContent = pubKey.getCreationTime().toISOString().slice(0, 10);
    } catch (e) {
      $("k-fp").textContent = space4(FP);
      note($("k-err"), tr("Clé non chargée (vérification hors-ligne indisponible).", "Key not loaded (offline verification unavailable)."), "warn");
    }
  }

  // ---------- 2. Challenge / verify ----------
  var challenge = "";
  function genChallenge() {
    var nonce = hex(crypto.getRandomValues(new Uint8Array(12)));
    challenge = "SAKOI-IDENTITY-PROOF " + new Date().toISOString() + " nonce:" + nonce;
    $("c-chal").value = challenge;
    $("c-sig").value = "";
    $("c-res").hidden = true;
  }
  async function verifySigned() {
    var res = $("c-res");
    var armored = $("c-sig").value.trim();
    if (!armored) { note(res, tr("Colle d'abord un message signé.", "Paste a signed message first."), "warn"); return; }
    if (!pubKey) { note(res, tr("Clé publique indisponible.", "Public key unavailable."), "warn"); return; }
    try {
      var msg = await openpgp.readCleartextMessage({ cleartextMessage: armored });
      var verification = await openpgp.verify({ message: msg, verificationKeys: pubKey });
      var sig = verification.signatures[0];
      await sig.verified; // throws if invalid
      var signedText = msg.getText();
      var fresh = challenge && signedText.indexOf(challenge) !== -1;
      var okTxt = tr("Signature VALIDE — signée par la clé de Dmod (", "VALID signature — signed by Dmod's key (") + space4(pubKey.getFingerprint()) + ").";
      okTxt += fresh ? tr(" Défi frais reconnu. ✓", " Fresh challenge recognized. ✓") : tr(" (message signé arbitraire)", " (arbitrary signed message)");
      note(res, okTxt, "ok");
    } catch (e) {
      note(res, tr("Signature INVALIDE ou non produite par cette clé.", "INVALID signature, or not produced by this key."), "ko");
    }
  }

  // ---------- 3. Linked proofs ----------
  async function loadProofs() {
    var box = $("proofs"); if (!box) return;
    var manifest;
    try { manifest = await (await fetch("assets/data/proofs.json", { cache: "no-store" })).json(); }
    catch (e) { box.textContent = ""; return; }
    box.textContent = "";
    for (var i = 0; i < (manifest.proofs || []).length; i++) {
      var pr = manifest.proofs[i];
      var card = document.createElement("div"); card.className = "id-proof";
      var head = document.createElement("div"); head.className = "id-proof-h";
      var a = document.createElement("a"); a.href = pr.url; a.target = "_blank"; a.rel = "noopener";
      a.textContent = pr.label + " · " + pr.handle;
      var st = document.createElement("span"); st.className = "id-proof-st pending"; st.textContent = tr("vérification…", "verifying…");
      head.appendChild(a); head.appendChild(st);
      card.appendChild(head);
      box.appendChild(card);
      (function (st, pr) {
        verifyProof(pr).then(function (r) {
          st.className = "id-proof-st " + r.cls; st.textContent = r.txt;
        });
      })(st, pr);
    }
  }
  async function verifyProof(pr) {
    if (pr.signed === false) return { cls: "pending", txt: tr("en attente de signature", "awaiting signature") };
    if (!pubKey) return { cls: "pending", txt: tr("clé indisponible", "key unavailable") };
    var armored;
    try {
      var resp = await fetch(pr.file, { cache: "no-store" });
      if (!resp.ok) return { cls: "pending", txt: tr("en attente de signature", "awaiting signature") };
      armored = await resp.text();
      if (armored.indexOf("BEGIN PGP SIGNED MESSAGE") === -1) return { cls: "pending", txt: tr("en attente de signature", "awaiting signature") };
    } catch (e) { return { cls: "pending", txt: tr("en attente de signature", "awaiting signature") }; }
    try {
      var msg = await openpgp.readCleartextMessage({ cleartextMessage: armored });
      var v = await openpgp.verify({ message: msg, verificationKeys: pubKey });
      await v.signatures[0].verified;
      return { cls: "ok", txt: tr("vérifié ✓", "verified ✓") };
    } catch (e) { return { cls: "ko", txt: tr("signature invalide", "invalid signature") }; }
  }

  // ---------- 4. WebCrypto Ed25519 demo ----------
  var demo = { pub: null, priv: null, msg: null, sig: null };
  function dset(id, v) { $(id).textContent = v; }
  async function demoGen() {
    if (!(crypto.subtle && crypto.subtle.generateKey)) { note($("d-res"), tr("WebCrypto indisponible sur ce navigateur.", "WebCrypto unavailable in this browser."), "warn"); return; }
    try {
      var kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
      demo.pub = kp.publicKey; demo.priv = kp.privateKey; demo.sig = null; demo.msg = null;
      var raw = await crypto.subtle.exportKey("raw", kp.publicKey);
      dset("d-pub", hex(raw));
      dset("d-sig", "—"); $("d-res").hidden = true;
      $("d-sign").disabled = false; $("d-verify").disabled = true; $("d-tamper").disabled = true;
    } catch (e) { note($("d-res"), tr("Ed25519 non supporté ici.", "Ed25519 not supported here."), "warn"); }
  }
  async function demoSign() {
    demo.msg = crypto.getRandomValues(new Uint8Array(32));
    dset("d-msg", hex(demo.msg));
    demo.sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, demo.priv, demo.msg));
    dset("d-sig", hex(demo.sig));
    $("d-res").hidden = true; $("d-verify").disabled = false; $("d-tamper").disabled = false;
  }
  async function demoVerify() {
    var ok = await crypto.subtle.verify({ name: "Ed25519" }, demo.pub, demo.sig, demo.msg);
    note($("d-res"), ok ? tr("Signature valide ✓", "Valid signature ✓") : tr("Signature invalide ✕", "Invalid signature ✕"), ok ? "ok" : "ko");
  }
  function demoTamper() {
    if (!demo.sig) return;
    demo.sig[0] ^= 0x01; dset("d-sig", hex(demo.sig) + tr("  (falsifiée)", "  (tampered)"));
    note($("d-res"), tr("1 bit modifié — relance la vérification.", "1 bit flipped — run verification again."), "warn");
  }

  function wire() {
    applyT();
    var lang = $("lang"); if (lang) lang.addEventListener("click", function () { setTimeout(applyT, 0); });
    loadKey().then(loadProofs);
    genChallenge();
    $("c-gen").addEventListener("click", genChallenge);
    $("c-verify").addEventListener("click", verifySigned);
    $("c-copy").addEventListener("click", function () { try { navigator.clipboard.writeText(challenge); } catch (e) {} });
    $("d-gen").addEventListener("click", demoGen);
    $("d-sign").addEventListener("click", demoSign);
    $("d-verify").addEventListener("click", demoVerify);
    $("d-tamper").addEventListener("click", demoTamper);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
