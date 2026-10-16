/* Minimal OpenAPI renderer — reads openapi.json and renders a Swagger-like, CSP-safe view
   (textContent / DOM only, no external Swagger UI, no eval). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  var en = function () { return document.documentElement.lang === "en"; };
  var CH = {
    fr: { crumb: "API publique", h: "API publique", lead: "Le portfolio est une plateforme, pas une page perso : voici les endpoints publics qui l'alimentent, documentés en OpenAPI 3.1. Tout est servi par des Cloudflare Workers, lecture seule, sans pistage.", raw: "Spec brute (openapi.json)", params: "Paramètres", rbody: "Corps de requête", resp: "Réponse" },
    en: { crumb: "Public API", h: "Public API", lead: "The portfolio is a platform, not a personal page: here are the public endpoints powering it, documented in OpenAPI 3.1. All served by Cloudflare Workers, read-only, no tracking.", raw: "Raw spec (openapi.json)", params: "Parameters", rbody: "Request body", resp: "Response" }
  };
  function applyCH() { var d = CH[en() ? "en" : "fr"]; document.querySelectorAll("[data-t]").forEach(function (n) { if (d[n.dataset.t] != null) n.textContent = d[n.dataset.t]; }); }
  var W = function (k) { return CH[en() ? "en" : "fr"][k]; };

  function opsForTag(spec, tag) {
    var out = [];
    Object.keys(spec.paths).forEach(function (path) {
      Object.keys(spec.paths[path]).forEach(function (method) {
        var op = spec.paths[path][method];
        if ((op.tags || []).indexOf(tag) >= 0) out.push({ path: path, method: method, op: op });
      });
    });
    return out;
  }

  function example(responses) {
    if (!responses) return null;
    var keys = Object.keys(responses);
    for (var i = 0; i < keys.length; i++) {
      var c = responses[keys[i]].content;
      if (c && c["application/json"]) {
        var j = c["application/json"];
        if (j.example) return j.example;
        if (j.schema) return j.schema;
      }
    }
    return null;
  }

  function renderOp(o) {
    var d = el("details", "api-op " + o.method);
    var sum = el("summary");
    sum.appendChild(el("span", "api-m " + o.method, o.method.toUpperCase()));
    sum.appendChild(el("code", "api-path", o.path));
    sum.appendChild(el("span", "api-sum", o.op.summary || ""));
    d.appendChild(sum);
    var body = el("div", "api-body");
    if (o.op.description) body.appendChild(el("p", "api-desc", o.op.description));

    var params = o.op.parameters || [];
    if (params.length) {
      body.appendChild(el("div", "api-h", W("params")));
      params.forEach(function (p) {
        var row = el("div", "api-param");
        row.appendChild(el("code", "api-pn", p.name));
        row.appendChild(el("span", "api-pin", p.in + (p.required ? " · requis" : "")));
        if (p.description) row.appendChild(el("span", "api-pd", p.description));
        body.appendChild(row);
      });
    }
    if (o.op.requestBody) {
      body.appendChild(el("div", "api-h", W("rbody")));
      var rb = o.op.requestBody.content && o.op.requestBody.content["application/json"];
      var pre = el("pre", "api-json"); pre.textContent = JSON.stringify(rb && (rb.example || rb.schema) || {}, null, 2);
      body.appendChild(pre);
    }
    body.appendChild(el("div", "api-h", W("resp")));
    var ex = example(o.op.responses);
    var pre2 = el("pre", "api-json"); pre2.textContent = ex ? JSON.stringify(ex, null, 2) : "—";
    body.appendChild(pre2);
    d.appendChild(body);
    return d;
  }

  async function render() {
    var spec;
    try { spec = await (await fetch("openapi.json", { cache: "no-store" })).json(); }
    catch (e) { $("api-root").appendChild(el("p", "api-err", "openapi.json indisponible.")); return; }

    var info = $("api-info"); info.textContent = "";
    info.appendChild(el("h2", "api-title", spec.info.title));
    var badges = el("div", "api-meta");
    badges.appendChild(el("span", "api-ver", "v" + spec.info.version));
    badges.appendChild(el("span", "api-ver", "OpenAPI " + spec.openapi));
    if (spec.servers && spec.servers[0]) badges.appendChild(el("code", "api-srv", spec.servers[0].url));
    info.appendChild(badges);
    info.appendChild(el("p", "api-idesc", spec.info.description));

    var root = $("api-root"); root.textContent = "";
    (spec.tags || []).forEach(function (t) {
      var ops = opsForTag(spec, t.name);
      if (!ops.length) return;
      var sec = el("div", "api-tag");
      sec.appendChild(el("h3", "api-tagn", t.name));
      if (t.description) sec.appendChild(el("p", "api-tagd", t.description));
      ops.forEach(function (o) { sec.appendChild(renderOp(o)); });
      root.appendChild(sec);
    });
  }
  function boot() {
    applyCH(); render();
    var l = $("lang"); if (l) l.addEventListener("click", function () { setTimeout(function () { applyCH(); render(); }, 0); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
