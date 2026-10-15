/* Links page: the 0_0 eyes follow the cursor, wander when idle, and blink. No tracking, no inline JS (CSP-friendly). */
(function(){
  const logo=document.getElementById("logo");if(!logo)return;
  const eyes=[...logo.querySelectorAll(".eye")],pupils=eyes.map(e=>e.firstElementChild);
  if(!eyes.length)return;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  let idle;
  function look(dx,dy){pupils.forEach(p=>{const e=p.parentElement,mx=(e.clientWidth-p.offsetWidth)/2-2,my=(e.clientHeight-p.offsetHeight)/2-3;
    p.style.transform=`translate(${dx*mx}px,${dy*my}px)`})}
  function wander(){const spots=[[0,0],[-1,0],[1,0],[-.7,-.7],[.7,-.7],[0,.8],[.8,.5],[-.8,.5]],s=spots[Math.floor(Math.random()*spots.length)];
    look(s[0],s[1]);idle=setTimeout(wander,900+Math.random()*1600)}
  addEventListener("pointermove",ev=>{clearTimeout(idle);
    const r=eyes[0].getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,
      dx=ev.clientX-cx,dy=ev.clientY-cy,d=Math.hypot(dx,dy)||1,k=Math.min(1,d/220);
    look(dx/d*k,dy/d*k);idle=setTimeout(wander,2500)});
  function blink(){eyes.forEach(e=>e.classList.add("blink"));setTimeout(()=>eyes.forEach(e=>e.classList.remove("blink")),140);
    if(Math.random()<.25)setTimeout(()=>{eyes.forEach(e=>e.classList.add("blink"));setTimeout(()=>eyes.forEach(e=>e.classList.remove("blink")),140)},300);
    setTimeout(blink,2500+Math.random()*3500)}
  logo.addEventListener("click",()=>{eyes.forEach(e=>e.classList.add("blink"));setTimeout(()=>eyes.forEach(e=>e.classList.remove("blink")),140)});
  wander();setTimeout(blink,1800);
})();
