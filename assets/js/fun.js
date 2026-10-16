/* Easter eggs — Konami code toggles a full-screen Matrix rain + CRT scanline mode.
   Also exposed as window.DmodFun.matrix() so the command palette can trigger it. CSP-safe. */
(function () {
  "use strict";
  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  var buf = [];
  var on = false, canvas, ctx, raf, cols, drops, toast;

  var GLYPHS = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄSAKOIДМОД#%&<>$".split("");

  function en() { return document.documentElement.lang === "en"; }

  function start() {
    if (on) return; on = true;
    document.documentElement.classList.add("crt");
    canvas = document.createElement("canvas"); canvas.className = "matrix-rain"; canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    loop();
    showToast(en() ? "Matrix mode — press ESC to exit" : "Mode Matrix — ÉCHAP pour quitter");
    document.addEventListener("keydown", escOnce, true);
  }
  function escOnce(e) { if (e.key === "Escape") { e.stopPropagation(); stop(); } }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var size = 16;
    cols = Math.floor(canvas.width / size);
    drops = []; for (var i = 0; i < cols; i++) drops[i] = Math.random() * -40;
  }
  function loop() {
    var size = 16;
    ctx.fillStyle = "rgba(8,10,12,0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = size + "px monospace";
    for (var i = 0; i < cols; i++) {
      var ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      var x = i * size, y = drops[i] * size;
      ctx.fillStyle = drops[i] > 0 && Math.random() > 0.975 ? "#eafff2" : "#19c37d";
      ctx.fillText(ch, x, y);
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!on) return; on = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    document.removeEventListener("keydown", escOnce, true);
    document.documentElement.classList.remove("crt");
    if (canvas) { canvas.remove(); canvas = null; }
    showToast(en() ? "Back to reality." : "Retour à la réalité.");
  }
  function toggle() { on ? stop() : start(); }

  function showToast(msg) {
    if (toast) toast.remove();
    toast = document.createElement("div"); toast.className = "egg-toast"; toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("show"); });
    setTimeout(function () { if (toast) { toast.classList.remove("show"); } }, 2600);
  }

  document.addEventListener("keydown", function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    buf.push(k); if (buf.length > KONAMI.length) buf.shift();
    if (buf.length === KONAMI.length && KONAMI.every(function (x, i) { return buf[i].toLowerCase() === x.toLowerCase(); })) {
      buf = []; toggle();
    }
  });
  window.DmodFun = { matrix: toggle };
})();
