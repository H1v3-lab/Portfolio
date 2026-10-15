/* /flag: submit flags of the hidden mini-CTF, show progress and the leaderboard (state lives in ctf.js). */
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
  document.getElementById("fl-show").addEventListener("click",()=>CTF.celebrate());

  /* leaderboard: top 20 from the Worker; built with textContent only */
  let rows=null,state="load";
  async function loadBoard(){try{const d=await CTF.api("leaderboard");rows=d;state="ok"}catch(e){state="off"}paintBoard()}
  function paintBoard(){const box=document.getElementById("fl-board"),pl=document.getElementById("fl-players");box.textContent="";pl.textContent="";
    if(state!=="ok"||!rows.top.length){const p=document.createElement("p");p.className="fl-msg";p.textContent=tr(state==="load"?"fl_board_load":state==="off"?"fl_board_off":"fl_board_empty");box.appendChild(p);return}
    pl.textContent=tr("fl_players",rows.players);
    const me=(CTF.state().done||{}).pseudo,ol=document.createElement("ol");ol.className="ctf-board";
    rows.top.forEach((r,i)=>{const li=document.createElement("li");if(r.pseudo===me)li.className="me";
      [["b-r",i<3?["🥇","🥈","🥉"][i]:String(i+1)],["b-p",r.pseudo],["b-t",CTF.format(r.seconds)],["b-s",String(r.score)]].forEach(([c,t])=>{const s=document.createElement("span");s.className=c;s.textContent=t;li.appendChild(s)});
      ol.appendChild(li)});box.appendChild(ol)}
  addEventListener("ctf:update",render);addEventListener("ctf:board",loadBoard);
  document.getElementById("lang")?.addEventListener("click",()=>setTimeout(paintBoard,0));
  render();loadBoard();
})();
