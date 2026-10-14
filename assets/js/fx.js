/* Effects layer — no dependencies.
   - preloader (terminal boot)          - 3D globe: points + mesh + attack arcs + orbit ring (canvas, hand-rolled projection)
   - custom cursor                      - scroll progress + hero parallax
   - 3D tilt cards + light spot         - magnetic buttons
   - scramble headings, counters, typed terminal, glitch title */
(function(){
const root=document.documentElement;
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
const fine=matchMedia("(pointer:fine)").matches;
const mouse={x:innerWidth/2,y:innerHeight/2,nx:0,ny:0};
addEventListener("pointermove",e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.nx=e.clientX/innerWidth*2-1;mouse.ny=e.clientY/innerHeight*2-1},{passive:true});

/* ---------- preloader ---------- */
function ready(){root.classList.remove("loading");document.getElementById("loader").classList.add("done");dispatchEvent(new Event("app:ready"))}
(function loader(){
  let seen=false;try{seen=sessionStorage.getItem("booted")==="1";sessionStorage.setItem("booted","1")}catch(e){}
  if(reduced||seen){ready();return}
  const log=document.getElementById("loader-log"),bar=document.getElementById("loader-bar");
  const lines=["mounting /dev/dmod","loading exploit modules","decrypting portfolio.enc","spawning shell as dmod","access granted"];
  let i=0;
  (function step(){
    if(i<lines.length){log.innerHTML+=`<b>[ok]</b> ${lines[i]}\n`;i++;bar.style.width=(i/lines.length*100)+"%";setTimeout(step,170+Math.random()*120)}
    else setTimeout(ready,280)})();
})();

/* ---------- 3D globe ---------- */
(function globe(){
  const cv=document.getElementById("globe");if(!cv||reduced)return;
  const ctx=cv.getContext("2d"),main=document.querySelector("main");
  const small=innerWidth<720;
  const N=small?420:900,DPR=Math.min(devicePixelRatio||1,2);
  let W,H,R,cx,cy;
  // fibonacci sphere (unit vectors)
  const P=[];const ga=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<N;i++){const y=1-i/(N-1)*2,r=Math.sqrt(1-y*y),t=ga*i;P.push([Math.cos(t)*r,y,Math.sin(t)*r])}
  // mesh: link each point to its nearest neighbour(s)
  const E=[];
  for(let i=0;i<N;i++){let b1=-1,b2=-1,d1=9,d2=9;
    for(let j=0;j<N;j++){if(i===j)continue;const dx=P[i][0]-P[j][0],dy=P[i][1]-P[j][1],dz=P[i][2]-P[j][2],d=dx*dx+dy*dy+dz*dz;
      if(d<d1){d2=d1;b2=b1;d1=d;b1=j}else if(d<d2){d2=d;b2=j}}
    if(i<b1)E.push([i,b1]);if(i%3===0&&i<b2)E.push([i,b2])}
  // orbit ring particles
  const ring=Array.from({length:small?70:140},(_,i)=>({a:i/(small?70:140)*Math.PI*2,r:1.42+Math.random()*.12,s:.6+Math.random()*.8}));
  // attack arcs between random surface points
  const arcs=[];
  function spawnArc(){const a=P[Math.random()*N|0],b=P[Math.random()*N|0];
    const m=[a[0]+b[0],a[1]+b[1],a[2]+b[2]],ml=Math.hypot(...m)||1,dist=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
    if(dist<.4)return;const h=1+dist*.35;
    arcs.push({a,b,c:[m[0]/ml*h,m[1]/ml*h,m[2]/ml*h],t:0,life:1.6+Math.random()})}
  function bez(a,c,b,t){const u=1-t;return[u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1],u*u*a[2]+2*u*t*c[2]+t*t*b[2]]}

  function size(){W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
  size();addEventListener("resize",size);

  let rotY=0,rotX=-.25,tx=0,ty=0,last=performance.now(),arcClock=0,scrollK=0;
  const F=3.2; // camera distance in globe radii
  function project(v,sx,cx_,sy,cy_){
    // rotate Y then X
    let x=v[0]*cx_+v[2]*sx,z=-v[0]*sx+v[2]*cx_,y=v[1];
    const y2=y*cy_-z*sy,z2=y*sy+z*cy_;
    const k=F/(F+z2);return[cx+x*R*k,cy+y2*R*k,z2,k]}

  function frame(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    // scroll: globe drifts right, shrinks and dims once past the hero
    const target=document.body.dataset.page&&document.body.dataset.page!=="home"?1:Math.min(1,scrollY/(innerHeight*.9));scrollK+=(target-scrollK)*.08;
    const left=main.offsetLeft,area=W-left;
    R=Math.min(area,H)*(small?.42:.36)*(1-scrollK*.25);
    cx=left+area/2+scrollK*area*(small?0:.28);cy=H*.5+(small?-H*.08:0);
    const alpha=(1-scrollK*.55)*(small?.7:1);
    // mouse parallax (eased)
    tx+=(mouse.ny*.35-tx)*.04;ty+=(mouse.nx*.5-ty)*.04;
    rotY+=dt*(.12+scrollK*.1);
    const ry=rotY+ty,rx=rotX+tx,sx=Math.sin(ry),cxr=Math.cos(ry),sy=Math.sin(rx),cyr=Math.cos(rx);
    ctx.clearRect(0,0,W,H);
    // soft halo
    const g=ctx.createRadialGradient(cx,cy,R*.2,cx,cy,R*1.6);
    g.addColorStop(0,`rgba(255,255,255,${.02*alpha})`);g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const S=P.map(v=>project(v,sx,cxr,sy,cyr));
    // mesh
    ctx.lineWidth=.6;
    for(const [i,j] of E){const a=S[i],b=S[j],z=(a[2]+b[2])/2,o=z<0?.16:.05;
      ctx.strokeStyle=`rgba(255,255,255,${o*alpha})`;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}
    // points (front = brighter/bigger); slight glow near the cursor
    for(const s of S){const front=s[2]<0,o=(front?.55:.14)*alpha,d=Math.hypot(s[0]-mouse.x,s[1]-mouse.y),boost=d<120?(1-d/120):0;
      ctx.fillStyle=`rgba(255,255,255,${Math.min(1,o+boost*.6)})`;const r=(front?1.25:.7)*s[3]+boost*1.4;
      ctx.fillRect(s[0]-r/2,s[1]-r/2,r,r)}
    // orbit ring, tilted
    for(const p of ring){p.a+=dt*.25*p.s;const v=[Math.cos(p.a)*p.r,Math.sin(p.a)*p.r*.18,Math.sin(p.a)*p.r],s=project(v,sx,cxr,sy,cyr);
      ctx.fillStyle=`rgba(255,255,255,${(s[2]<0?.5:.12)*alpha})`;ctx.fillRect(s[0],s[1],1.4*s[3],1.4*s[3])}
    // attack arcs: a pulse travels along a bezier, leaving a fading trail
    arcClock+=dt;if(arcClock>(small?1.4:.7)&&arcs.length<7){arcClock=0;spawnArc()}
    for(let k=arcs.length-1;k>=0;k--){const A=arcs[k];A.t+=dt/A.life;if(A.t>1.4){arcs.splice(k,1);continue}
      const head=Math.min(1,A.t),tail=Math.max(0,A.t-.45),fade=A.t>1?1-(A.t-1)/.4:1;
      ctx.beginPath();for(let q=0;q<=24;q++){const t=tail+(head-tail)*q/24,s=project(bez(A.a,A.c,A.b,t),sx,cxr,sy,cyr);q?ctx.lineTo(s[0],s[1]):ctx.moveTo(s[0],s[1])}
      ctx.strokeStyle=`rgba(126,226,168,${.55*fade*alpha})`;ctx.lineWidth=1.1;ctx.stroke();
      if(A.t<1){const s=project(bez(A.a,A.c,A.b,head),sx,cxr,sy,cyr);ctx.fillStyle=`rgba(200,255,220,${.9*alpha})`;ctx.beginPath();ctx.arc(s[0],s[1],2.2,0,7);ctx.fill()}
      else{const s=project(A.b,sx,cxr,sy,cyr),rr=(A.t-1)*30;ctx.strokeStyle=`rgba(126,226,168,${.5*fade*alpha})`;ctx.beginPath();ctx.arc(s[0],s[1],rr,0,7);ctx.stroke()}}
    requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
})();

/* ---------- scroll progress + hero parallax ---------- */
(function(){
  const bar=document.getElementById("progress"),hero=document.getElementById("hero-in");let tick=false;
  function upd(){tick=false;const max=document.documentElement.scrollHeight-innerHeight,y=scrollY;
    bar.style.transform=`scaleX(${max>0?y/max:0})`;
    if(hero&&!reduced&&y<innerHeight*1.2){hero.style.transform=`translateY(${y*.35}px) scale(${1-y/innerHeight*.08})`;hero.style.opacity=Math.max(0,1-y/(innerHeight*.75))}}
  addEventListener("scroll",()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});upd();
})();

/* ---------- custom cursor ---------- */
(function(){
  if(!fine||reduced)return;root.classList.add("has-cursor");
  const ring=document.getElementById("cursor"),dot=document.getElementById("cursor-dot");let x=mouse.x,y=mouse.y;
  (function loop(){x+=(mouse.x-x)*.18;y+=(mouse.y-y)*.18;ring.style.transform=`translate(${x}px,${y}px)`;dot.style.transform=`translate(${mouse.x}px,${mouse.y}px)`;requestAnimationFrame(loop)})();
  document.addEventListener("pointerover",e=>ring.classList.toggle("hover",!!e.target.closest("a,button,.chip,#logo")));
  addEventListener("pointerdown",()=>ring.classList.add("down"));addEventListener("pointerup",()=>ring.classList.remove("down"));
  document.addEventListener("pointerleave",()=>{ring.style.opacity=dot.style.opacity=0});document.addEventListener("pointerenter",()=>{ring.style.opacity=dot.style.opacity=1});
})();

/* ---------- 3D tilt cards + light spot ---------- */
document.querySelectorAll(".card").forEach(c=>{
  c.addEventListener("pointermove",e=>{const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
    c.style.setProperty("--mx",px*100+"%");c.style.setProperty("--my",py*100+"%");
    if(fine&&!reduced){c.classList.add("tilt");const k=Math.min(1,380/r.width);c.style.transform=`rotateX(${(.5-py)*10*k}deg) rotateY(${(px-.5)*12*k}deg) translateZ(6px)`}});
  c.addEventListener("pointerleave",()=>{c.style.transform=""});
});

/* ---------- magnetic buttons ---------- */
if(fine&&!reduced)document.querySelectorAll(".btn,.fab,.lang").forEach(b=>{
  b.addEventListener("pointermove",e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.25}px,${(e.clientY-r.top-r.height/2)*.35}px)`});
  b.addEventListener("pointerleave",()=>{b.style.transform=""});
});

/* ---------- on-view effects: scramble headings, counters, typed terminal ---------- */
const GLYPHS="!<>-_\\/[]{}=+*^?#01";
function scramble(el){const final=el.textContent,len=final.length;let f=0;const total=24;
  (function step(){f++;let out="";for(let i=0;i<len;i++){const reveal=i/len*total*.7;out+=f>=reveal+total*.3||final[i]===" "?final[i]:GLYPHS[Math.random()*GLYPHS.length|0]}
    el.textContent=out;if(f<total)requestAnimationFrame(()=>setTimeout(step,28));else el.textContent=final})()}
function count(el){const n=+el.dataset.count,t0=performance.now(),d=1300;
  (function step(now){const p=Math.min(1,(now-t0)/d),e=1-Math.pow(1-p,3);el.textContent=Math.round(n*e);if(p<1)requestAnimationFrame(step)})(t0)}
function typeTerm(pre){const lines=pre.innerHTML.split("\n"),head=lines.shift(),rest=lines.map(l=>{const d=document.createElement("div");d.innerHTML=l;return d.textContent});
  let li=0,ci=0;pre.innerHTML=head+'\n<span class="cur"></span>';
  const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
  (function step(){if(li>=rest.length){pre.innerHTML=head+"\n"+rest.map(esc).join("\n")+'\n<span class="p">dmod@Deamon</span>:~$ <span class="cur"></span>';return}
    ci+=3;const done=rest.slice(0,li).map(esc),cur=esc(rest[li].slice(0,ci));
    pre.innerHTML=head+"\n"+(done.length?done.join("\n")+"\n":"")+cur+'<span class="cur"></span>';
    if(ci>=rest[li].length){li++;ci=0;setTimeout(step,120)}else setTimeout(step,14)})()}

if(!reduced){
  document.querySelectorAll("main h2").forEach(h=>h.dataset.scramble="");
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const t=e.target;io.unobserve(t);
    if(t.matches("h2"))scramble(t);else if(t.dataset.count)count(t);else if(t.id==="term")typeTerm(t)}),{threshold:.4});
  document.querySelectorAll("main h2,[data-count],#term").forEach(el=>io.observe(el));
  // stagger children inside revealed sections
  document.querySelectorAll(".reveal").forEach(s=>s.querySelectorAll(".card,.tl,.acc-item").forEach((c,i)=>c.style.transitionDelay=Math.min(i,8)*70+"ms"));
  // clear the stagger once revealed so hover/tilt stay snappy
  document.addEventListener("transitionend",e=>{if(e.propertyName==="opacity"&&e.target.style.transitionDelay)e.target.style.transitionDelay=""});
}else document.querySelectorAll("[data-count]").forEach(el=>el.textContent=el.dataset.count);

/* ---------- section handoff on scroll ----------
   A section only appears once the previous one is ending: while a section's top travels
   from 68% to 28% of the viewport it fades/rises/sharpens in, and while its bottom travels
   from 70% to 20% it fades/rises/shrinks out. Neighbours therefore cross over briefly
   instead of both being visible, without adding any empty space between them. */
(function(){
  if(reduced)return;
  const secs=[...document.querySelectorAll("main > section:not(.hero)")];
  secs.forEach(s=>s.classList.add("sx"));
  const clamp=v=>v<0?0:v>1?1:v,ease=t=>t*t*(3-2*t);
  let tick=false;
  function upd(){tick=false;const H=innerHeight;
    for(const s of secs){const r=s.getBoundingClientRect();
      if(r.bottom<-H*.2||r.top>H*1.2){s.style.opacity=0;continue}
      const inP=ease(clamp((H*.68-r.top)/(H*.4)));         // 0 → 1 while entering
      const outP=ease(clamp((H*.7-r.bottom)/(H*.5)));      // 0 → 1 while leaving
      const o=Math.min(inP,1-outP);
      const ty=(1-inP)*70-outP*50, sc=1-(1-inP)*.035-outP*.04, bl=(1-inP)*6+outP*4;
      s.style.opacity=o.toFixed(3);
      s.style.transform=`translate3d(0,${ty.toFixed(1)}px,0) scale(${sc.toFixed(4)})`;
      s.style.filter=bl>.3?`blur(${bl.toFixed(1)}px)`:"none";
      s.style.pointerEvents=o<.15?"none":"";
      if(inP>.05&&!s.classList.contains("shown"))s.classList.add("shown");
    }}
  addEventListener("scroll",()=>{if(!tick){tick=true;requestAnimationFrame(upd)}},{passive:true});
  addEventListener("resize",upd);upd();
})();

/* ---------- glitch on the hero title ---------- */
(function(){
  const h=document.querySelector(".hero h1"),typed=document.getElementById("typed");if(reduced||!h||!typed)return;
  (function loop(){setTimeout(()=>{if(scrollY<innerHeight&&typed.textContent){h.dataset.text=typed.textContent;h.classList.add("glitch");setTimeout(()=>h.classList.remove("glitch"),260)}loop()},3500+Math.random()*3500)})();
})();
})();
