/* Secure Drop: the message is encrypted in the visitor's browser with Dmod's PGP public key,
   then only the ciphertext is sent. The server (and anyone in between) never sees the plaintext.
   Uses the self-hosted OpenPGP.js (CSP-friendly). */
(function () {
  "use strict";
  var API = "/api/tools/drop";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var pubkey = null, fpr = "";

  var T = {
    fr: { loading: "Chargement de la clé de chiffrement…", ready: "Chiffrement prêt. Ton message sera chiffré dans ton navigateur avant d'être envoyé.",
      nokey: "Impossible de charger la clé. Réessaie plus tard.", empty: "Écris d'abord un message.",
      enc: "Chiffrement…", sent: "✓ Message chiffré et envoyé. Moi seul peux le lire. Merci !",
      offline: "L'envoi a échoué, mais ton message est chiffré ci-dessous : copie-le et envoie-le par un autre canal.",
      copy: "Copier le message chiffré", copied: "Copié ✓" },
    en: { loading: "Loading the encryption key…", ready: "Encryption ready. Your message is encrypted in your browser before it is sent.",
      nokey: "Could not load the key. Try again later.", empty: "Write a message first.",
      enc: "Encrypting…", sent: "✓ Message encrypted and sent. Only I can read it. Thank you!",
      offline: "Sending failed, but your message is encrypted below: copy it and send it another way.",
      copy: "Copy the encrypted message", copied: "Copied ✓" } };
  var tr = function (k) { return T[en() ? "en" : "fr"][k]; };
  function msg(el, text, cls) { el.textContent = text; el.className = "sd-msg" + (cls ? " " + cls : ""); }

  async function loadKey() {
    try {
      var armored = await (await fetch("/pgp.asc", { cache: "no-store" })).text();
      pubkey = await openpgp.readKey({ armoredKey: armored });
      fpr = pubkey.getFingerprint().toUpperCase().replace(/(.{4})/g, "$1 ").trim();
      $("sd-fpr").textContent = fpr;
      msg($("sd-state"), tr("ready"), "ok");
      $("sd-send").disabled = false;
    } catch (e) {
      msg($("sd-state"), tr("nokey"), "ko");
    }
  }

  async function submit(e) {
    e.preventDefault();
    var body = $("sd-body").value.trim();
    var from = $("sd-from").value.trim();
    var out = $("sd-out"), state = $("sd-state"), btn = $("sd-send");
    if (!body) { msg(state, tr("empty"), "ko"); return; }
    if (!pubkey) { msg(state, tr("nokey"), "ko"); return; }
    btn.disabled = true; msg(state, tr("enc"));
    out.hidden = true;
    var text = (from ? "De / From: " + from + "\n\n" : "") + body;
    try {
      var enc = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: text }),
        encryptionKeys: pubkey });
      var ok = false;
      try {
        var r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ct: enc }) });
        ok = r.ok;
      } catch (err) { ok = false; }
      if (ok) {
        msg(state, tr("sent"), "ok");
        $("sd-body").value = ""; $("sd-from").value = "";
      } else {
        msg(state, tr("offline"), "ko");
        $("sd-ct").value = enc; out.hidden = false;
      }
    } catch (err) {
      msg(state, tr("nokey"), "ko");
    }
    btn.disabled = false;
  }

  function copyCt() {
    $("sd-ct").select();
    navigator.clipboard.writeText($("sd-ct").value).then(function () {
      var b = $("sd-copy"); b.textContent = tr("copied"); setTimeout(function () { b.textContent = tr("copy"); }, 1500);
    }).catch(function () {});
  }

  if (typeof openpgp === "undefined") { msg($("sd-state"), tr("nokey"), "ko"); return; }
  msg($("sd-state"), tr("loading"));
  $("sd-form").addEventListener("submit", submit);
  $("sd-copy").addEventListener("click", copyCt);
  $("sd-copy").textContent = tr("copy");
  document.getElementById("lang") && document.getElementById("lang").addEventListener("click", function () {
    setTimeout(function () { if (pubkey) msg($("sd-state"), tr("ready"), "ok"); $("sd-copy").textContent = tr("copy"); }, 0);
  });
  loadKey();
})();
