/* Ephemeral lab showcase page — bilingual chrome for the Terraform IaC demo. textContent only. */
(function () {
  "use strict";
  var en = function () { return document.documentElement.lang === "en"; };
  var T = {
    fr: {
      crumb: "Lab éphémère (IaC)", h: "Lab éphémère à la demande",
      lead: "Une commande provisionne une VM jetable et volontairement vulnérable, avec un shell dans le navigateur — et elle s'autodétruit après 30 min. DevSecOps + Infrastructure-as-Code : la cible est éphémère, le rayon d'explosion est minuscule, et il n'y a aucun nettoyage manuel.",
      arch: "Architecture", how: "Comment ça marche", how_p: "Terraform décrit l'infra ; cloud-init lance la cible vulnérable (Juice Shop) et un terminal web (ttyd) ; l'instance est configurée pour se terminer à l'extinction, et cloud-init programme cette extinction à TTL. Résultat : la VM se détruit elle-même, sans cron sur ta machine ni ressource oubliée.",
      run: "Lancer un lab", safe: "Sûreté", safe_p: "Box jetable et courte durée — aucune donnée réelle dessus. Verrouille allowed_cidr sur TON IP /32 : la cible ouverte et le shell web ne sont alors joignables que par toi.",
      vars: "Variables", note: "Le code complet (Terraform + cloud-init) est dans le dossier lab/ du dépôt. Le module ci-dessous tourne sur TON compte cloud — c'est ça, l'IaC.",
      v_ttl: "durée de vie avant autodestruction (5–240)", v_cidr: "CIDR autorisé — mets TON_IP/32", v_img: "image de la cible vulnérable", v_region: "région de déploiement"
    },
    en: {
      crumb: "Ephemeral lab (IaC)", h: "On-demand ephemeral lab",
      lead: "One command provisions a disposable, deliberately vulnerable VM with a browser shell — and it self-destructs after 30 min. DevSecOps + Infrastructure-as-Code: the target is short-lived, the blast radius is tiny, and there's no manual cleanup.",
      arch: "Architecture", how: "How it works", how_p: "Terraform describes the infra; cloud-init runs the vulnerable target (Juice Shop) and a web terminal (ttyd); the instance is set to terminate on shutdown, and cloud-init schedules that shutdown at the TTL. Result: the VM destroys itself — no cron on your laptop, no leftover resources.",
      run: "Launch a lab", safe: "Safety", safe_p: "Throwaway, short-lived box — no real data on it. Lock allowed_cidr to YOUR IP /32 so the open target and web shell are reachable only by you.",
      vars: "Variables", note: "The full code (Terraform + cloud-init) is in the repo's lab/ folder. The module below runs on YOUR cloud account — that's the IaC.",
      v_ttl: "lifetime before self-destruct (5–240)", v_cidr: "allowed CIDR — set YOUR_IP/32", v_img: "vulnerable target image", v_region: "deployment region"
    }
  };
  function applyT() { var d = T[en() ? "en" : "fr"]; document.querySelectorAll("[data-t]").forEach(function (n) { if (d[n.dataset.t] != null) n.textContent = d[n.dataset.t]; }); }
  function wire() { applyT(); var l = document.getElementById("lang"); if (l) l.addEventListener("click", function () { setTimeout(applyT, 0); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
