/* Interactive dissection of the "Romulus" ClickFix campaign (defensive case study).
   Data-driven from my real analysis; indicators stay defanged. CSP-safe (textContent / DOM only),
   bilingual FR/EN. Source article: blog.sakoi-cyber.me. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var L = function (o) { return en() ? o.en : o.fr; };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  var CH = {
    fr: { crumb: "Dissection Romulus", h: "Romulus — dissection d'une campagne ClickFix",
      lead: "Une chaîne d'infection réelle où aucune faille n'est exploitée : la victime colle elle-même la commande. Huit couches, chacune conçue pour aveugler une défense précise. Analyse défensive, indicateurs défangués.",
      kc: "Chaîne d'infection (8 couches)", kc_sub: "Clique une étape : technique, défense visée, et correspondance MITRE ATT&CK.",
      tree: "Arbre des processus", attack: "Cartographie MITRE ATT&CK", ioc: "Indicateurs (défangués)",
      det: "Signaux de détection comportementale", rem: "Réponse à incident", concept: "Le concept clé",
      conceptp: "Cette attaque ne casse aucune serrure : elle convainc l'habitant d'ouvrir la porte. ClickFix contourne le navigateur, l'IP décimale les filtres d'URL, l'installation par utilisateur l'UAC, le MSI polymorphe les listes de hashes, le chargement en mémoire l'analyse disque, l'anti-VM les bacs à sable. Seule la détection comportementale voit toute la chaîne.",
      net: "Réseau", host: "Hôte", copy: "Copier", vt: "VirusTotal", full: "Article complet",
      defense: "Défense visée", tech: "Technique", lead2: "⚠️ Synthèse défensive, pédagogique. Indicateurs défangués ([.], hxxp) ; aucune commande malveillante n'est reproduite ; le serveur de commande n'a jamais été contacté." },
    en: { crumb: "Romulus dissection", h: "Romulus — dissecting a ClickFix campaign",
      lead: "A real infection chain where no vulnerability is exploited: the victim pastes the command themselves. Eight layers, each built to blind one specific defense. Defensive analysis, defanged indicators.",
      kc: "Infection chain (8 layers)", kc_sub: "Click a stage: technique, targeted defense, and MITRE ATT&CK mapping.",
      tree: "Process tree", attack: "MITRE ATT&CK mapping", ioc: "Indicators (defanged)",
      det: "Behavioral detection signals", rem: "Incident response", concept: "The key idea",
      conceptp: "This attack breaks no lock: it convinces the resident to open the door. ClickFix bypasses the browser, the decimal IP bypasses URL filters, per-user install dodges UAC, the polymorphic MSI defeats hash lists, in-memory loading beats disk scanning, anti-VM fools sandboxes. Only behavioral detection sees the whole chain.",
      net: "Network", host: "Host", copy: "Copy", vt: "VirusTotal", full: "Full article",
      defense: "Targeted defense", tech: "Technique", lead2: "⚠️ Defensive, educational synthesis. Defanged indicators ([.], hxxp); no malicious command is reproduced; the C2 server was never contacted." }
  };
  var W = function (k) { return CH[en() ? "en" : "fr"][k]; };

  var STAGES = [
    { layer: { fr: "Commande collée", en: "Pasted command" }, tech: { fr: "Obfuscation par reconstruction caractère par caractère", en: "Obfuscation via char-by-char reconstruction" }, defense: { fr: "Lecture des lignes de commande", en: "Command-line logging" }, att: [["T1204.002", "User Execution"], ["T1059.001", "PowerShell"], ["T1027", "Obfuscation"]] },
    { layer: { fr: "Téléchargement", en: "Download" }, tech: { fr: "Adresse IP en notation décimale", en: "IP address in decimal notation" }, defense: { fr: "Filtres d'URL et de réputation", en: "URL / reputation filters" }, att: [["T1105", "Ingress Tool Transfer"], ["T1027", "Obfuscation"]] },
    { layer: { fr: "Installation", en: "Install" }, tech: { fr: "msiexec silencieux, par utilisateur", en: "Silent, per-user msiexec" }, defense: { fr: "Invite UAC & processus de confiance", en: "UAC prompt & trusted process" }, att: [["T1218.007", "Msiexec"]] },
    { layer: { fr: "Fichier installé", en: "Installed file" }, tech: { fr: "MSI généré à la volée, différent à chaque fois", en: "MSI generated on the fly, different every time" }, defense: { fr: "Listes de hashes (signatures)", en: "Hash lists (signatures)" }, att: [["T1027", "Polymorphism"]] },
    { layer: { fr: "Chargement", en: "Loading" }, tech: { fr: "Déchiffrement en mémoire, multi-couches", en: "Multi-layer in-memory decryption" }, defense: { fr: "Antivirus scannant le disque", en: "Disk-scanning antivirus" }, att: [["T1140", "Deobfuscate/Decode"], ["T1027", "Obfuscation"]] },
    { layer: { fr: "Loader", en: "Loader" }, tech: { fr: "Contrôles anti-VM et anti-sandbox", en: "Anti-VM & anti-sandbox checks" }, defense: { fr: "Analyse automatique en bac à sable", en: "Automated sandbox analysis" }, att: [["T1497", "Virtualization/Sandbox Evasion"]] },
    { layer: { fr: "Payload", en: "Payload" }, tech: { fr: "Code mappé en mémoire, aucun exécutable sur disque", en: "Code mapped in memory, no file on disk" }, defense: { fr: "Détection par fichier", en: "File-based detection" }, att: [["T1620", "Reflective Code Loading"], ["T1055", "Process Injection"]] },
    { layer: { fr: "C2", en: "C2" }, tech: { fr: "JSON chiffré (RC4) vers un domaine distinct", en: "RC4-encrypted JSON to a separate domain" }, defense: { fr: "Inspection réseau simple", en: "Simple network inspection" }, att: [["T1071.001", "Web Protocols"], ["T1573", "Encrypted Channel"]] }
  ];
  // Post-install capabilities (shown as extra ATT&CK coverage)
  var CAPS = [["T1134.004", "Parent PID Spoofing"], ["T1562.001", "Impair Defenses: AMSI"], ["T1112", "Modify Registry (persistence)"], ["T1555.003", "Credentials from Web Browsers"]];

  var TREE = {
    name: "explorer.exe", note: { fr: "RunMRU : entrée fraîche (Win+R)", en: "RunMRU: fresh entry (Win+R)" }, kids: [
      { name: "cmd.exe", note: { fr: "expansion différée", en: "delayed expansion" }, kids: [
        { name: "powershell.exe", note: { fr: "-enc <base64>", en: "-enc <base64>" }, kids: [
          { name: "msiexec.exe", note: { fr: "/qn  %TEMP%\\v.msi", en: "/qn  %TEMP%\\v.msi" }, kids: [
            { name: "powershell.exe", note: { fr: "%TEMP%\\<chiffres>.ps1", en: "%TEMP%\\<digits>.ps1" }, kids: [
              { name: "⟶ payload (RAM)", bad: true, note: { fr: "injection → explorer.exe / RuntimeBroker.exe (parent falsifié)", en: "injection → explorer.exe / RuntimeBroker.exe (spoofed parent)" }, kids: [] }
            ] }
          ] }
        ] }
      ] }
    ]
  };

  var IOCS = {
    net: [
      { v: "23.94.145[.]93", note: { fr: "distribution + panneau « Romulus » (AS207043)", en: "distribution + \"Romulus\" panel (AS207043)" } },
      { v: "23.94.145[.]88", note: { fr: "infrastructure liée", en: "related infrastructure" } },
      { v: "23.94.145[.]224", note: { fr: "infrastructure liée", en: "related infrastructure" } },
      { v: "havelbeenpwned[.]net", note: { fr: "panneau /login (typosquat de haveibeenpwned)", en: "/login panel (haveibeenpwned typosquat)" } },
      { v: "unalively[.]com", note: { fr: "C2 du payload (/nfront.php, /nback.php)", en: "payload C2 (/nfront.php, /nback.php)" } }
    ],
    host: [
      { v: "%TEMP%\\v.msi", note: { fr: "installeur déposé (polymorphe)", en: "dropped installer (polymorphic)" } },
      { v: "%TEMP%\\<chiffres>.ps1", note: { fr: "script déposé, jamais supprimé", en: "dropped script, never deleted" } },
      { v: "Chrome\\User Data\\Local State", note: { fr: "lu par un processus autre que Chrome (clé App-Bound)", en: "read by a non-Chrome process (App-Bound key)" } }
    ]
  };

  var DETECT = {
    fr: ["explorer.exe → cmd (expansion différée) → powershell -enc, avec entrée RunMRU fraîche",
      "msiexec /qn sur un fichier %TEMP%, suivi d'un powershell lancé par msiexec sur un .ps1 aux chiffres aléatoires",
      "mémoire exécutable privée contenant un exécutable, à l'intérieur de powershell.exe",
      "processus explorer / csc / RuntimeBroker au parent incohérent (parent spoofing)",
      "lecture de Chrome\\Local State par un processus autre que Chrome ; pipe nommé trop ouvert",
      "appel à un service de géolocalisation d'IP, puis POST base64 vers un .php"],
    en: ["explorer.exe → cmd (delayed expansion) → powershell -enc, with a fresh RunMRU entry",
      "msiexec /qn on a %TEMP% file, followed by a powershell spawned by msiexec on a random-digit .ps1",
      "private executable memory containing an executable, inside powershell.exe",
      "explorer / csc / RuntimeBroker process with an incoherent parent (parent spoofing)",
      "read of Chrome\\Local State by a non-Chrome process; over-permissive named pipe",
      "a call to an IP-geolocation service, then base64 POSTs to a .php"]
  };
  var REMED = {
    fr: ["Isoler la machine ; bloquer les indicateurs réseau au proxy et au DNS.",
      "Capturer la mémoire AVANT de redémarrer (le payload n'existe qu'en RAM).",
      "Depuis un appareil sain : déconnecter les sessions, changer les mots de passe, révoquer les jetons (secrets Chrome volés).",
      "Réinstaller le système — on ne nettoie pas, on reconstruit.",
      "Prévenir : « aucun CAPTCHA ne demande Win+R » ; interdire l'install de MSI aux utilisateurs standard ; AppLocker / WDAC."],
    en: ["Isolate the host; block the network indicators at the proxy and DNS.",
      "Capture memory BEFORE rebooting (the payload only exists in RAM).",
      "From a clean device: sign out sessions, rotate passwords, revoke tokens (Chrome secrets are stolen).",
      "Rebuild the system — you don't clean, you reinstall.",
      "Awareness: \"no CAPTCHA asks for Win+R\"; block MSI install for standard users; AppLocker / WDAC."]
  };

  function refang(s) { return s.replace(/\[\.\]/g, ".").replace(/hxxp/g, "http"); }
  function vtUrl(v) { var r = refang(v); return /^\d{1,3}(\.\d{1,3}){3}$/.test(r) ? "https://www.virustotal.com/gui/ip-address/" + r : "https://www.virustotal.com/gui/domain/" + r.split("/")[0]; }

  function renderStages() {
    var host = $("rom-chain"); host.textContent = "";
    STAGES.forEach(function (s, i) {
      var d = el("details", "rom-stage");
      var sum = el("summary");
      sum.appendChild(el("span", "rom-num", String(i + 1)));
      sum.appendChild(el("span", "rom-layer", L(s.layer)));
      sum.appendChild(el("span", "rom-arrow", i < STAGES.length - 1 ? "↓" : "⚑"));
      d.appendChild(sum);
      var b = el("div", "rom-sbody");
      var t = el("div", "rom-kv"); t.appendChild(el("span", "rom-k", W("tech"))); t.appendChild(el("span", "rom-v", L(s.tech))); b.appendChild(t);
      var df = el("div", "rom-kv"); df.appendChild(el("span", "rom-k", W("defense"))); df.appendChild(el("span", "rom-v rom-def", L(s.defense))); b.appendChild(df);
      var at = el("div", "rom-att");
      s.att.forEach(function (a) { var bd = el("a", "rom-tech"); bd.href = "https://attack.mitre.org/techniques/" + a[0].replace(".", "/") + "/"; bd.target = "_blank"; bd.rel = "noopener"; bd.textContent = a[0] + " · " + a[1]; at.appendChild(bd); });
      b.appendChild(at);
      d.appendChild(b);
      host.appendChild(d);
    });
  }

  function renderTree() {
    var host = $("rom-tree"); host.textContent = "";
    function node(n, depth) {
      var wrap = el("div", "rom-tnode");
      var row = el("div", "rom-trow" + (n.bad ? " bad" : ""));
      row.style.marginLeft = (depth * 18) + "px";
      if (depth) row.appendChild(el("span", "rom-tbranch", "└─"));
      row.appendChild(el("code", "rom-tname", n.name));
      if (n.note) row.appendChild(el("span", "rom-tnote", L(n.note)));
      wrap.appendChild(row);
      (n.kids || []).forEach(function (k) { wrap.appendChild(node(k, depth + 1)); });
      return wrap;
    }
    host.appendChild(node(TREE, 0));
  }

  function renderAttack() {
    var host = $("rom-attack"); host.textContent = "";
    var seen = {}, all = [];
    STAGES.forEach(function (s) { s.att.forEach(function (a) { if (!seen[a[0]]) { seen[a[0]] = 1; all.push(a); } }); });
    CAPS.forEach(function (a) { if (!seen[a[0]]) { seen[a[0]] = 1; all.push(a); } });
    all.forEach(function (a) {
      var bd = el("a", "rom-mitre"); bd.href = "https://attack.mitre.org/techniques/" + a[0].replace(".", "/") + "/"; bd.target = "_blank"; bd.rel = "noopener";
      bd.appendChild(el("b", null, a[0])); bd.appendChild(el("span", null, a[1]));
      host.appendChild(bd);
    });
  }

  function iocRow(o) {
    var row = el("div", "rom-ioc");
    var v = el("code", "rom-iv", o.v); row.appendChild(v);
    row.appendChild(el("span", "rom-in", L(o.note)));
    var act = el("span", "rom-ia");
    var cp = el("button", "rom-cp"); cp.type = "button"; cp.textContent = W("copy");
    cp.addEventListener("click", function () { try { navigator.clipboard.writeText(o.v); cp.textContent = "✓"; setTimeout(function () { cp.textContent = W("copy"); }, 1200); } catch (e) {} });
    act.appendChild(cp);
    if (/\[\.\]/.test(o.v)) { var vt = el("a", "rom-vt", W("vt")); vt.href = vtUrl(o.v); vt.target = "_blank"; vt.rel = "noopener nofollow"; act.appendChild(vt); }
    row.appendChild(act);
    return row;
  }
  function renderIOC() {
    var n = $("rom-ioc-net"); n.textContent = ""; IOCS.net.forEach(function (o) { n.appendChild(iocRow(o)); });
    var h = $("rom-ioc-host"); h.textContent = ""; IOCS.host.forEach(function (o) { h.appendChild(iocRow(o)); });
  }
  function renderList(id, arr) { var host = $(id); host.textContent = ""; arr.forEach(function (x) { host.appendChild(el("li", null, x)); }); }

  function applyT() { document.querySelectorAll("[data-t]").forEach(function (n) { var v = W(n.dataset.t); if (v != null) n.textContent = v; }); }
  function renderAll() {
    applyT(); renderStages(); renderTree(); renderAttack(); renderIOC();
    renderList("rom-detect", en() ? DETECT.en : DETECT.fr);
    renderList("rom-remed", en() ? REMED.en : REMED.fr);
  }
  function boot() {
    renderAll();
    var l = $("lang"); if (l) l.addEventListener("click", function () { setTimeout(renderAll, 0); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
