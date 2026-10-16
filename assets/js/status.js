/* Status page: polls the Worker /api/tools/status and shows each service up/down + latency. */
(function () {
  "use strict";
  var API = "/api/tools/status";
  var $ = function (id) { return document.getElementById(id); };
  var en = function () { return document.documentElement.lang === "en"; };
  var tr = function (fr, enx) { return en() ? enx : fr; };

  function render(d) {
    var banner = $("st-banner");
    banner.className = "st-banner " + (d.all_up ? "up" : "down");
    banner.textContent = d.all_up
      ? tr("Tous les services sont opérationnels", "All systems operational")
      : tr(d.up + "/" + d.total + " services opérationnels", d.up + "/" + d.total + " services operational");
    var list = $("st-list"); list.textContent = "";
    (d.services || []).forEach(function (s) {
      var row = document.createElement("div"); row.className = "st-row " + (s.up ? "up" : "down");
      var dot = document.createElement("span"); dot.className = "st-dot";
      var name = document.createElement("span"); name.className = "st-name"; name.textContent = s.name;
      var state = document.createElement("span"); state.className = "st-state";
      state.textContent = s.up ? tr("opérationnel", "operational") : tr("indisponible", "down");
      var ms = document.createElement("span"); ms.className = "st-ms"; ms.textContent = s.up ? s.ms + " ms" : "—";
      row.appendChild(dot); row.appendChild(name); row.appendChild(state); row.appendChild(ms);
      list.appendChild(row);
    });
    var t = new Date((d.generated || Date.now() / 1000) * 1000);
    $("st-updated").textContent = tr("Mis à jour à ", "Updated at ") + t.toLocaleTimeString();
  }

  async function poll() {
    try {
      var r = await fetch(API, { cache: "no-store" });
      var d = await r.json();
      render(d);
    } catch (e) {
      $("st-banner").className = "st-banner down";
      $("st-banner").textContent = tr("Page de statut indisponible", "Status page unavailable");
    }
  }
  poll(); setInterval(poll, 30000);
  document.getElementById("lang") && document.getElementById("lang").addEventListener("click", function () { setTimeout(poll, 0); });
})();
