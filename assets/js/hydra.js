/* Hydra page: renders docs/hydra.md and swaps the architecture placeholder for the inline SVG diagram */
(function(){
  const out=document.getElementById("hydra-doc");if(!out||!window.marked)return;
  fetch("docs/hydra.md").then(r=>{if(!r.ok)throw 0;return r.text()}).then(md=>{
    md=md.replace(/^Oct \d+, \d{4} · @\w+\s*$/m,"");          // drop the editor's date/author line
    out.innerHTML=marked.parse(md);
    const slot=out.querySelector("#hydra-arch"),tpl=document.getElementById("arch-tpl");
    if(slot&&tpl)slot.replaceWith(tpl.content.cloneNode(true));
    out.querySelectorAll("table").forEach(t=>{const w=document.createElement("div");w.className="tbl";t.before(w);w.appendChild(t)});
  }).catch(()=>{out.innerHTML='<p>Document indisponible.</p>'});
})();
