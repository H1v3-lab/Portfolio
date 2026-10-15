/* "Sécurité de ce site": live checks run in the visitor's browser.
   HTTP headers come from a same-origin HEAD request; DNS facts come from Cloudflare's public
   DNS-over-HTTPS resolver (JSON API, CORS-enabled, no cookies). Nothing is hard-coded as "OK". */
(function(){
  const list=document.querySelector(".chk-grid");if(!list)return;
  const DOMAIN="sakoi-cyber.me";
  const L={fr:{ok:"Actif",ko:"Absent",na:"Non vérifiable ici",run:"Analyse en cours…",
      res:(o,t)=>`${o} protections actives sur ${t} vérifiées à l'instant dans votre navigateur.`,
      err:"Vérification DNS impossible depuis ce réseau."},
    en:{ok:"Active",ko:"Missing",na:"Can't be checked here",run:"Running checks…",
      res:(o,t)=>`${o} of ${t} protections active, checked just now in your browser.`,
      err:"DNS checks unavailable from this network."}};
  const lang=()=>document.documentElement.lang==="en"?"en":"fr";
  const state={};

  function set(id,st,val){state[id]={st,val};paint(id)}
  function paint(id){const li=document.getElementById("c-"+id),s=state[id];if(!li||!s)return;
    li.dataset.st=s.st;li.querySelector(".st").textContent=s.st==="ok"?"✓":s.st==="ko"?"✕":"–";
    const v=li.querySelector(".val");v.textContent=s.val||L[lang()][s.st];v.title=s.val||""}
  function score(){const v=Object.values(state),done=v.filter(s=>s.st!=="pend"),ok=v.filter(s=>s.st==="ok").length,tot=done.filter(s=>s.st!=="na").length;
    document.getElementById("score").textContent=tot?Math.round(ok/tot*100)+"%":"–";
    const fg=document.getElementById("ring-fg"),c=2*Math.PI*52;fg.style.strokeDasharray=c;fg.style.strokeDashoffset=c*(1-(tot?ok/tot:0));
    fg.style.stroke=!tot?"#5e5e67":ok/tot>.85?"#7ee2a8":ok/tot>.5?"#f5c451":"#f87171";
    document.getElementById("score-txt").textContent=L[lang()].res(ok,tot)}
  const short=(s,n=60)=>s&&s.length>n?s.slice(0,n)+"…":s;

  async function doh(name,type){
    const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}&do=1`,{headers:{accept:"application/dns-json"},cache:"no-store",credentials:"omit"});
    if(!r.ok)throw new Error(r.status);return r.json()}
  const txt=a=>(a.Answer||[]).map(x=>x.data.replace(/^"|"$/g,"").replace(/" "/g,""));

  async function run(){
    ["https","hsts","csp","xfo","xcto","refp","perm","dnssec","caa","dmarc","spf","sectxt"].forEach(id=>{state[id]={st:"pend"};const li=document.getElementById("c-"+id);li.dataset.st="pend";li.querySelector(".st").textContent="…";li.querySelector(".val").textContent=""});
    document.getElementById("score-txt").textContent=L[lang()].run;
    const live=location.protocol==="https:"&&location.hostname.endsWith(DOMAIN);

    set("https",location.protocol==="https:"?"ok":live?"ko":"na",location.protocol==="https:"?"TLS":"");
    try{
      const h=(await fetch(location.pathname,{method:"HEAD",cache:"no-store"})).headers;
      const g=k=>h.get(k);
      const hsts=g("strict-transport-security"),age=+(/max-age=(\d+)/i.exec(hsts||"")||[])[1]||0;
      const csp=g("content-security-policy"),xfo=g("x-frame-options");
      const na=live?"ko":"na";
      set("hsts",age>=15552000?"ok":na,hsts&&short(hsts));
      set("csp",csp?"ok":na,csp&&short(csp));
      set("xfo",/deny|sameorigin/i.test(xfo||"")||/frame-ancestors/i.test(csp||"")?"ok":na,xfo||(/frame-ancestors[^;]*/i.exec(csp||"")||[])[0]);
      set("xcto",/nosniff/i.test(g("x-content-type-options")||"")?"ok":na,g("x-content-type-options"));
      set("refp",g("referrer-policy")?"ok":na,g("referrer-policy"));
      set("perm",g("permissions-policy")?"ok":na,g("permissions-policy")&&short(g("permissions-policy")));
    }catch(e){["hsts","csp","xfo","xcto","refp","perm"].forEach(id=>set(id,"na"))}
    try{const r=await fetch("/.well-known/security.txt",{cache:"no-store"}),t=r.ok?await r.text():"";
      const exp=(/^Expires:\s*(.+)$/m.exec(t)||[])[1];set("sectxt",/^Contact:/m.test(t)&&(!exp||new Date(exp)>new Date())?"ok":"ko",exp&&"Expires "+exp.slice(0,10))}catch(e){set("sectxt","na")}
    score();
    try{
      const [a,caa,dm,tx]=await Promise.all([doh(DOMAIN,"A"),doh(DOMAIN,"CAA"),doh("_dmarc."+DOMAIN,"TXT"),doh(DOMAIN,"TXT")]);
      set("dnssec",a.AD?"ok":"ko",a.AD?"AD=1":"");
      const c=(caa.Answer||[]).filter(x=>x.type===257);set("caa",c.length?"ok":"ko",c.length?c.map(x=>x.data.replace(/^\\#.*$/,"…")).join(" · "):"");
      const d=txt(dm).find(x=>x.startsWith("v=DMARC1"));set("dmarc",d?"ok":"ko",d&&short(d));
      const s=txt(tx).find(x=>x.startsWith("v=spf1"));set("spf",s?"ok":"ko",s&&short(s));
    }catch(e){["dnssec","caa","dmarc","spf"].forEach(id=>set(id,"na",L[lang()].err))}
    score();
  }
  document.getElementById("rerun").addEventListener("click",run);
  document.getElementById("lang")?.addEventListener("click",()=>setTimeout(()=>{Object.keys(state).forEach(paint);if(Object.values(state).every(s=>s.st!=="pend"))score()},0));
  run();
})();
