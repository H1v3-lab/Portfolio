/* Writeups are listed in writeups/index.json. A writeup is either a local Markdown
   file ("file") rendered here, or an external link ("url") opened in a new tab.
   Routes: #<ctf-slug> scrolls to that CTF, #<ctf-slug>/<file-name> opens a writeup. */
const L={fr:{back:"Retour aux CTF",lead:"Mes solutions de challenges CTF, compétition par compétition.",all:"Tous les writeups",soon:"Writeups à venir pour cette compétition.",every:"Tout",err:"Impossible de charger ce writeup."},
         en:{back:"Back to CTFs",lead:"My CTF challenge solutions, competition by competition.",all:"All writeups",soon:"Writeups for this competition are coming soon.",every:"All",err:"Could not load this writeup."}};
let lang="fr";try{lang=localStorage.getItem("lang")||"fr"}catch(e){}
document.documentElement.lang=lang;
const t=k=>L[lang][k]||L.fr[k];
document.querySelectorAll("[data-l]").forEach(e=>e.textContent=t(e.dataset.l));
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const trophy='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/></svg>';
let data={ctfs:[]},cat="all";

function renderList(){
  const cats=[...new Set(data.ctfs.flatMap(c=>c.writeups.map(w=>(w.category||"misc").toLowerCase())))].sort();
  const f=document.getElementById("filters");f.innerHTML="";
  if(cats.length>1)["all",...cats].forEach(c=>{const b=document.createElement("button");b.type="button";b.textContent=c==="all"?t("every"):c;b.className=c===cat?"on":"";b.onclick=()=>{cat=c;renderList()};f.appendChild(b)});
  document.getElementById("ctfs").innerHTML=data.ctfs.map(c=>{
    const ws=c.writeups.filter(w=>cat==="all"||(w.category||"misc").toLowerCase()===cat);
    if(cat!=="all"&&!ws.length)return"";
    const logo=c.logo?`<img src="${esc(c.logo)}" alt="">`:esc(c.name.slice(0,2));
    const light=c.logo&&!/ecowas|brctf|boroctf/.test(c.logo)?" on-light":"";
    const items=ws.map(w=>{const href=w.url?esc(w.url):`#${esc(c.slug)}/${esc(w.file.split("/").pop())}`;
      return `<li><a href="${href}"${w.url?' target="_blank" rel="noopener"':""}><span class="wcat ${esc((w.category||"misc").toLowerCase())}">${esc(w.category||"misc")}</span><b>${esc(w.title)}</b>${w.difficulty?`<span class="wdiff">${esc(w.difficulty)}</span>`:""}</a></li>`}).join("");
    const tier=c.tier?` tier-${esc(c.tier)}`:"";
    return `<article class="wctf${tier}" id="${esc(c.slug)}"><div class="wctf-h"><span class="ctf-logo${light}">${logo}</span><div><h2>${esc(c.name)}</h2><p>${esc(c.team||"")}</p></div><span class="score${c.tier?"":" muted"}">${c.tier?trophy:""}${esc(c.result||"")}</span></div>${items?`<ul class="wlist">${items}</ul>`:`<p class="wempty">${t("soon")}</p>`}</article>`}).join("");
}
async function open(slug,name){
  const c=data.ctfs.find(x=>x.slug===slug),w=c&&c.writeups.find(x=>x.file&&x.file.split("/").pop()===name);
  const md=document.getElementById("md");
  document.getElementById("list").hidden=true;document.getElementById("read").hidden=false;scrollTo(0,0);
  if(!w){md.innerHTML=`<p class="err">${t("err")}</p>`;return}
  document.title=w.title+" — Writeups — Dmod";
  try{const r=await fetch(w.file);if(!r.ok)throw 0;md.innerHTML=marked.parse(await r.text())}
  catch(e){md.innerHTML=`<p class="err">${t("err")}</p>`}
}
function route(){
  const h=decodeURIComponent(location.hash.slice(1)),[slug,file]=h.split("/");
  if(file){open(slug,file);return}
  document.title="Writeups — Dmod";
  document.getElementById("read").hidden=true;document.getElementById("list").hidden=false;
  if(slug){const el=document.getElementById(slug);if(el)el.scrollIntoView({block:"start"})}
}
document.getElementById("back").onclick=()=>{const s=location.hash.slice(1).split("/")[0];location.hash=s||""};
addEventListener("hashchange",route);
fetch("writeups/index.json").then(r=>r.json()).then(d=>{data=d;renderList();route()}).catch(()=>{document.getElementById("ctfs").innerHTML=`<p class="err">${t("err")}</p>`});
