/* Pentest report page — bilingual FR/EN labels for the demo deliverable. textContent only. */
(function () {
  "use strict";
  var en = function () { return document.documentElement.lang === "en"; };
  var T = {
    fr: {
      crumb: "Rapport de pentest", h: "Rapport de test d'intrusion",
      lead: "Un exemple de livrable, sur une cible fictive volontairement vulnérable (« VulnBank ») que j'ai montée moi-même. Objectif : montrer comment je documente, pas seulement comment j'exploite.",
      m_client: "Client", m_scope: "Périmètre", m_type: "Type", m_type_v: "Boîte grise, authentifié + non authentifié", m_date: "Dates", m_ver: "Version", fictif: "(fictif)",
      s_crit: "Critique", s_high: "Élevé", s_med: "Moyen", s_low: "Faible",
      b_crit: "CRITIQUE", b_high: "ÉLEVÉ", b_med: "MOYEN", b_low: "FAIBLE",
      h_syn: "Synthèse exécutive",
      syn: "Cinq vulnérabilités ont été identifiées, dont une critique permettant l'exfiltration complète de la base clients via injection SQL, et deux élevées (accès horizontal aux comptes tiers, et exécution de script stocké). Une chaîne réaliste mène d'un simple champ de recherche à la compromission des données de tous les utilisateurs. Les correctifs proposés sont standards et peu coûteux ; priorité absolue au finding VB-01.",
      h_find: "Findings",
      f1: "Injection SQL non authentifiée (recherche produit)",
      f1_d: "Le paramètre q est concaténé directement dans la requête SQL. Un attaquant non authentifié peut lire n'importe quelle table, dont users (identifiants, hachages, PII).",
      f1_r: "Requêtes paramétrées (prepared statements) ; principe du moindre privilège sur le compte SQL applicatif ; WAF en défense en profondeur.",
      f2: "Référence directe non sécurisée (IDOR) sur les relevés",
      f2_d: "L'identifiant de compte est séquentiel et n'est pas vérifié contre l'utilisateur authentifié : incrémenter {id} expose les relevés d'autres clients.",
      f2_r: "Contrôle d'autorisation côté serveur (l'objet appartient-il à l'appelant ?) ; identifiants non devinables (UUID).",
      f3: "XSS stocké dans le libellé de virement",
      f3_d: "Le libellé d'un virement est rendu sans échappement dans le back-office. Un attaquant exécute du JavaScript dans la session d'un conseiller qui consulte l'historique.",
      f3_r: "Échappement contextuel à la sortie ; Content-Security-Policy sans unsafe-inline ; cookie HttpOnly.",
      f4: "JWT : algorithme non figé (risque de confusion)",
      f4_d: "L'API accepte l'algorithme déclaré dans l'en-tête du jeton. Un attaquant peut tenter alg:none ou une confusion RS256→HS256 (clé publique utilisée comme secret HMAC).",
      f4_r: "Figer l'algorithme attendu côté serveur ; rejeter explicitement none ; clés séparées par usage.",
      f5: "En-têtes de sécurité HTTP manquants",
      f5_d: "Absence de HSTS, CSP, X-Content-Type-Options, Referrer-Policy. Réduit la défense en profondeur contre XSS, clickjacking et downgrade.",
      f5_r: "Ajouter HSTS, CSP, X-Content-Type-Options:nosniff, Referrer-Policy, Permissions-Policy.",
      r_affected: "Affecté", r_rem: "Remédiation",
      h_tl: "Déroulé de la mission",
      tl1: "Reconnaissance, cartographie de l'application et de l'API, énumération des endpoints.",
      tl2: "Tests non authentifiés → découverte de VB-01 (SQLi), extraction d'un hachage admin (hors ligne, lab).",
      tl3: "Tests authentifiés → VB-02 (IDOR) et VB-03 (XSS stocké), chaînage vers le back-office.",
      tl4: "Revue de l'authentification (JWT, VB-04) et de la configuration (VB-05).",
      tl5: "Rédaction, vérification des correctifs proposés, restitution.",
      foot: "⚠️ Cible, données et client entièrement fictifs. Aucun système réel n'a été testé. Ce document illustre un format de livrable (synthèse, findings CVSS, PoC, remédiation, timeline) — pas une mission réelle."
    },
    en: {
      crumb: "Pentest report", h: "Penetration test report",
      lead: "A sample deliverable, against a fictional, deliberately vulnerable target (\"VulnBank\") I built myself. The point: to show how I document, not just how I exploit.",
      m_client: "Client", m_scope: "Scope", m_type: "Type", m_type_v: "Grey box, authenticated + unauthenticated", m_date: "Dates", m_ver: "Version", fictif: "(fictional)",
      s_crit: "Critical", s_high: "High", s_med: "Medium", s_low: "Low",
      b_crit: "CRITICAL", b_high: "HIGH", b_med: "MEDIUM", b_low: "LOW",
      h_syn: "Executive summary",
      syn: "Five vulnerabilities were identified, including one critical allowing full exfiltration of the customer database via SQL injection, and two high ones (horizontal access to other accounts, and stored script execution). A realistic chain leads from a simple search field to the compromise of every user's data. The proposed fixes are standard and low-cost; absolute priority on finding VB-01.",
      h_find: "Findings",
      f1: "Unauthenticated SQL injection (product search)",
      f1_d: "The q parameter is concatenated directly into the SQL query. An unauthenticated attacker can read any table, including users (credentials, hashes, PII).",
      f1_r: "Parameterized queries (prepared statements); least privilege on the app SQL account; WAF as defense in depth.",
      f2: "Insecure direct object reference (IDOR) on statements",
      f2_d: "The account id is sequential and not checked against the authenticated user: incrementing {id} exposes other customers' statements.",
      f2_r: "Server-side authorization check (does the object belong to the caller?); non-guessable identifiers (UUID).",
      f3: "Stored XSS in the transfer label",
      f3_d: "A transfer label is rendered unescaped in the back office. An attacker runs JavaScript in the session of an advisor who views the history.",
      f3_r: "Contextual output encoding; Content-Security-Policy without unsafe-inline; HttpOnly cookie.",
      f4: "JWT: algorithm not pinned (confusion risk)",
      f4_d: "The API trusts the algorithm declared in the token header. An attacker can try alg:none or an RS256→HS256 confusion (public key used as HMAC secret).",
      f4_r: "Pin the expected algorithm server-side; explicitly reject none; separate keys per use.",
      f5: "Missing HTTP security headers",
      f5_d: "No HSTS, CSP, X-Content-Type-Options, Referrer-Policy. Weakens defense in depth against XSS, clickjacking and downgrade.",
      f5_r: "Add HSTS, CSP, X-Content-Type-Options:nosniff, Referrer-Policy, Permissions-Policy.",
      r_affected: "Affected", r_rem: "Remediation",
      h_tl: "Engagement timeline",
      tl1: "Reconnaissance, mapping the app and API, enumerating endpoints.",
      tl2: "Unauthenticated testing → found VB-01 (SQLi), extracted an admin hash (offline, lab).",
      tl3: "Authenticated testing → VB-02 (IDOR) and VB-03 (stored XSS), chaining to the back office.",
      tl4: "Review of authentication (JWT, VB-04) and configuration (VB-05).",
      tl5: "Writing, verifying the proposed fixes, debrief.",
      foot: "⚠️ Target, data and client are entirely fictional. No real system was tested. This document illustrates a deliverable format (summary, CVSS findings, PoC, remediation, timeline) — not a real engagement."
    }
  };
  function applyT() { var d = T[en() ? "en" : "fr"]; document.querySelectorAll("[data-t]").forEach(function (n) { var v = d[n.dataset.t]; if (v != null) n.textContent = v; }); }
  function wire() { applyT(); var l = document.getElementById("lang"); if (l) l.addEventListener("click", function () { setTimeout(applyT, 0); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
