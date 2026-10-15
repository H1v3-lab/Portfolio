/* /flag: submit flags of the hidden mini-CTF and show progress (state lives in ctf.js / localStorage). */
(function(){
  const form=document.getElementById("fl-form");if(!form||!window.CTF)return;
  const inp=document.getElementById("fl-in"),msg=document.getElementById("fl-msg");
  const tr=(key,n)=>((typeof T!=="undefined"&&T[typeof lang!=="undefined"?lang:"fr"][key])||"").replace("{n}",n);
  function render(){const got=CTF.found(),n=got.length;
    document.getElementById("fl-count").textContent=n+"/"+CTF.total;
    document.getElementById("fl-bar").style.width=(n/CTF.total*100)+"%";
    document.querySelectorAll(".fl").forEach(li=>{const ok=got.includes(+li.dataset.n);li.classList.toggle("got",ok);li.querySelector(".fl-st").textContent=ok?"✓":"?"});
    document.getElementById("fl-win").hidden=n<CTF.total}
  form.addEventListener("submit",async e=>{e.preventDefault();const r=await CTF.check(inp.value);
    msg.className="fl-msg "+(r.n?"ok":"ko");msg.textContent=r.n?tr(r.fresh?"fl_ok":"fl_dup",r.n):tr("fl_bad");
    if(r.n)inp.value="";render()});
  document.getElementById("fl-reset").addEventListener("click",()=>{CTF.reset();msg.textContent=""});
  addEventListener("ctf:update",render);render();
})();
