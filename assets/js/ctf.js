/* Hidden mini-CTF: six flags are scattered around the site. Only their SHA-256 hashes live here,
   so reading this file tells you how flags are checked, not what they are.
   Flags are checked instantly in the browser, then sent to /api/ctf (Cloudflare Worker) which stamps them
   with the server clock: that is where the time — and so the score — comes from. */
(function(){
  const H=["0b47e86c24da90ec2fd84837e85a3ffcab08f0e82e88a2bf528ac5b36f67d3ea",
    "018c339eb37d009d2e9c95a22bd2b7e2c3384bf8d2932877047c9f63f3ca3501",
    "4730fd6fbe724dcf29b4de56c7a0830248bf4020a8d9c16a29c842f9a62df4f8",
    "76081738c6656bc21099cfa282cf42c38c80850286bda81c425c434f539fef30",
    "11def4318bfe6f94bc337091289df4b4e5b604b5fa7835786c39f1d355c88a44",
    "ed9f5348d27f5f953015a5f69c4d1addc328fc7c31ee8101f1c7f6b18fa86e6a"];
  const POINTS=[50,100,100,150,150,200],BONUS=2250,HALF=1800;   // same rules as the server
  // Bonus "secret" flag #7, hidden by steganography in an image. Not part of the scored six;
  // only its hash lives here, and it never touches the server.
  const SECRET="e4b75cc12a0e6428dc2c92cf98212559bd6238da62330791e5676c74996f0e02";
  const KEY="dmod_ctf";
  const L=()=>(typeof lang!=="undefined"&&lang==="en")?"en":"fr";
  const tr=o=>o[L()];

  /* state: {sid, flags:{n:"DMOD{…}"}, t:{n:unix}, server:{complete,seconds}, done:{pseudo,rank,players,total}} */
  function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}}
  function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
  let st=load();st.flags=st.flags||{};st.t=st.t||{};
  const found=()=>Object.keys(st.flags).map(Number).sort();

  async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
  async function api(path,body){
    const r=await fetch("/api/ctf/"+path,body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),credentials:"omit"}:{credentials:"omit",cache:"no-store"});
    const ct=r.headers.get("content-type")||"";if(!ct.includes("json"))throw new Error("offline");
    const d=await r.json();d.status=r.status;return d}

  async function sync(flag){
    try{const d=await api("flag",{sid:st.sid||null,flag});
      if(d.sid)st.sid=d.sid;
      if(d.ok&&d.found&&d.found.length<found().length){ /* server missed some (e.g. found while offline): resend them */
        for(const n of found())if(!d.found.includes(n)){const e=await api("flag",{sid:st.sid,flag:st.flags[n]});if(e.complete){d.complete=true;d.seconds=e.seconds}}}
      if(d.complete)st.server={complete:true,seconds:d.seconds};save(st);return d}
    catch(e){return null}}

  /* returns {n: flag number 1-6 or 0, fresh: first time found} */
  async function check(input){const f=String(input||"").trim();if(!/^DMOD\{.+\}$/.test(f)||!crypto.subtle)return{n:0};
    const hsh=await sha(f);
    if(hsh===SECRET){const fresh=!st.secret;if(fresh){st.secret=f;save(st);confetti(document.body)}dispatchEvent(new CustomEvent("ctf:update"));return{n:0,secret:true,fresh}}
    const i=H.indexOf(hsh);if(i<0)return{n:0};
    const n=i+1,fresh=!st.flags[n];
    if(fresh){st.flags[n]=f;st.t[n]=Math.floor(Date.now()/1000);save(st)}
    dispatchEvent(new CustomEvent("ctf:update"));
    const done=found().length===H.length;
    const p=sync(f);
    if(fresh&&done){await p;celebrate()}
    return{n,fresh}}

  function localSeconds(){const t=Object.values(st.t);return t.length>1?Math.max(1,Math.max(...t)-Math.min(...t)):1}
  function calc(sec){const flags=POINTS.reduce((a,b)=>a+b,0),bonus=Math.round(BONUS*Math.pow(.5,sec/HALF));return{flags,bonus,total:flags+bonus}}
  function fmt(sec){sec=Math.max(0,Math.round(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
    return (h?h+" h ":"")+(h||m?String(m).padStart(h?2:1,"0")+" min ":"")+(h||m?String(s).padStart(2,"0"):s)+" s"}

  /* ---------- confetti (canvas, ~4 s, skipped with reduced motion) ---------- */
  function confetti(host){
    if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
    const c=document.createElement("canvas");c.className="ctf-confetti";host.appendChild(c);
    const x=c.getContext("2d"),dpr=Math.min(2,devicePixelRatio||1);let W,Hh;
    const size=()=>{W=c.width=innerWidth*dpr;Hh=c.height=innerHeight*dpr};size();addEventListener("resize",size);
    const cols=["#f5c451","#7ee2a8","#f4f4f6","#a78bfa","#60a5fa","#f472b6","#fbbf24"];
    const P=[];const burst=(ox,n)=>{for(let i=0;i<n;i++)P.push({x:ox*W,y:Hh*.35,vx:(Math.random()-.5)*16*dpr,vy:(-Math.random()*16-6)*dpr,
      r:(Math.random()*5+3)*dpr,c:cols[i%cols.length],a:Math.random()*6.28,va:(Math.random()-.5)*.3,sh:Math.random()<.5,life:1})};
    burst(.5,160);setTimeout(()=>burst(.2,90),350);setTimeout(()=>burst(.8,90),650);
    let t0=performance.now();
    (function frame(t){x.clearRect(0,0,W,Hh);
      P.forEach(p=>{p.vy+=.35*dpr;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;if(t-t0>2600)p.life-=.012;
        x.save();x.globalAlpha=Math.max(0,p.life);x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;
        if(p.sh)x.fillRect(-p.r,-p.r/2,p.r*2,p.r);else{x.beginPath();x.arc(0,0,p.r*.6,0,6.28);x.fill()}x.restore()});
      if(t-t0<5200)requestAnimationFrame(frame);else{c.remove();removeEventListener("resize",size)}})(t0);
  }

  /* ---------- congratulations pop-up + pseudo + leaderboard ---------- */
  const TXT={
    title:{fr:"Félicitations !",en:"Congratulations!"},
    sub:{fr:"Tu as trouvé les six flags du site.",en:"You found all six flags on this site."},
    time:{fr:"Temps",en:"Time"},pts:{fr:"Points",en:"Points"},flags:{fr:"Flags",en:"Flags"},bonus:{fr:"Bonus vitesse",en:"Speed bonus"},
    est:{fr:"estimé",en:"estimated"},
    ask:{fr:"Entre ton pseudo pour rejoindre le classement :",en:"Enter your handle to join the leaderboard:"},
    ph:{fr:"Ton pseudo",en:"Your handle"},go:{fr:"Valider",en:"Submit"},
    rank:{fr:(r,p)=>`Tu es ${r}${r===1?"er":"e"} sur ${p} joueur${p>1?"s":""} !`,en:(r,p)=>`You rank #${r} out of ${p} player${p>1?"s":""}!`},
    top:{fr:"Classement",en:"Leaderboard"},
    bad:{fr:"Pseudo de 2 à 20 caractères : lettres, chiffres, espace, _ . -",en:"Handle of 2 to 20 characters: letters, digits, space, _ . -"},
    taken:{fr:"Ce pseudo est déjà pris, choisis-en un autre.",en:"This handle is taken, pick another one."},
    already:{fr:"Ton score est déjà enregistré.",en:"Your score is already registered."},
    off:{fr:"Le classement en ligne n'est pas disponible pour le moment — ton score reste enregistré dans ce navigateur.",en:"The online leaderboard is unavailable right now — your score stays saved in this browser."},
    rules:{fr:"Points : 750 pour les flags + un bonus vitesse de 2 250 qui diminue de moitié toutes les 30 minutes, chronométré par le serveur entre ton premier et ton dernier flag.",en:"Points: 750 for the flags + a 2,250 speed bonus halved every 30 minutes, timed by the server between your first and last flag."},
    close:{fr:"Fermer",en:"Close"}
  };
  function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function board(rows,me){const t=el("ol","ctf-board");
    (rows||[]).forEach((r,i)=>{const li=el("li",r.pseudo===me?"me":"");li.append(el("span","b-r",String(i+1)),el("span","b-p",r.pseudo),el("span","b-t",fmt(r.seconds)),el("span","b-s",String(r.score)));t.appendChild(li)});
    return t}

  let ov;
  function celebrate(){
    if(ov)ov.remove();
    const sv=st.server&&st.server.complete,sec=sv?st.server.seconds:localSeconds(),sc=calc(sec);
    ov=el("div","ctf-ov");ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
    const box=el("div","ctf-pop");ov.appendChild(box);
    box.append(el("div","ctf-trophy","🏆"),el("h2","ctf-h",tr(TXT.title)),el("p","ctf-sub",tr(TXT.sub)));
    const stats=el("div","ctf-stats");
    [[tr(TXT.flags),"6/6"],[tr(TXT.time)+(sv?"":" ("+tr(TXT.est)+")"),fmt(sec)],[tr(TXT.pts),String(sc.total)]].forEach(([k,v])=>{const d=el("div","ctf-stat");d.append(el("b",null,v),el("span",null,k));stats.appendChild(d)});
    box.append(stats,el("p","ctf-fine",`${sc.flags} (flags) + ${sc.bonus} (${tr(TXT.bonus).toLowerCase()})`));
    const area=el("div","ctf-area");box.appendChild(area);
    if(st.done)showResult(area,st.done);
    else{
      const form=el("form","ctf-form");form.autocomplete="off";
      const lab=el("label","ctf-ask",tr(TXT.ask));const inp=el("input");inp.maxLength=20;inp.placeholder=tr(TXT.ph);inp.required=true;inp.id="ctf-pseudo";lab.htmlFor="ctf-pseudo";
      const b=el("button","btn sm solid",tr(TXT.go));b.type="submit";
      const msg=el("p","ctf-msg");form.append(lab,inp,b,msg);area.appendChild(form);
      form.addEventListener("submit",async e=>{e.preventDefault();const name=inp.value.trim().replace(/\s+/g," ");
        if(!/^[\p{L}\p{N}_.\- ]{2,20}$/u.test(name)){msg.textContent=tr(TXT.bad);return}
        b.disabled=true;msg.textContent="…";
        try{if(!st.sid||!(st.server&&st.server.complete))await sync(Object.values(st.flags)[0]);
          const d=await api("finish",{sid:st.sid,pseudo:name});
          if(d.status===200){st.done={pseudo:d.pseudo,rank:d.rank,players:d.players,total:d.total,seconds:d.seconds,top:d.top};save(st);form.remove();showResult(area,st.done);dispatchEvent(new CustomEvent("ctf:board"))}
          else msg.textContent=tr(d.error==="pseudo_taken"?TXT.taken:d.error==="already_registered"?TXT.already:d.error==="bad_pseudo"?TXT.bad:TXT.off);
        }catch(err){msg.textContent=tr(TXT.off)}
        b.disabled=false});
      setTimeout(()=>inp.focus(),400);
    }
    const x=el("button","ctf-x",tr(TXT.close));x.type="button";x.addEventListener("click",close);box.appendChild(x);
    ov.addEventListener("mousedown",e=>{if(e.target===ov)close()});
    document.body.appendChild(ov);document.documentElement.classList.add("ctf-open");
    requestAnimationFrame(()=>ov.classList.add("in"));confetti(ov);
  }
  function showResult(area,d){area.textContent="";
    area.append(el("p","ctf-rank",tr(TXT.rank)(d.rank,d.players)),el("span","kicker",tr(TXT.top)),board(d.top,d.pseudo))}
  function close(){if(!ov)return;ov.remove();ov=null;document.documentElement.classList.remove("ctf-open")}
  addEventListener("keydown",e=>{if(e.key==="Escape"&&ov)close()});

  window.CTF={total:H.length,found,check,celebrate,format:fmt,api,
    state:()=>st,secretFound:()=>!!st.secret,
    reset(){st={flags:{},t:{}};save(st);dispatchEvent(new CustomEvent("ctf:update"))}};

  /* flag 3 — for those who open the devtools */
  console.log("%c 0_0 ","font:700 42px monospace;color:#000;background:#f4f4f6;border-radius:10px;padding:4px 10px");
  console.log("%cTu ouvres la console ? Bon réflexe. / Opening the console? Good instinct.\n%cRE1PRHtjMG41MGwzX2wwZ19sMzRrNX0=\n%c→ sakoi-cyber.me/flag.html",
    "font:13px monospace;color:#7ee2a8","font:13px monospace;color:#f5c451","font:12px monospace;color:#9a9aa3");
})();
