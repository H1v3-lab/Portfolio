/* 3D model viewers.
   Each <div class="model3d" data-model="…glb" data-rim="#a,#b"> becomes a small WebGL stage.
   three.js is only downloaded when the first viewer gets close to the viewport, each viewer
   renders only while visible, and the models are untextured so they get a dark "studio"
   material lit by two colored rim lights. Drag to rotate; it eases back to a gentle sway. */
const stages=[...document.querySelectorAll(".model3d")];
const reduced=matchMedia("(prefers-reduced-motion:reduce)").matches;
let lib=null;
const loadLib=()=>lib||(lib=Promise.all([import("three"),import("../vendor/three/GLTFLoader.js")]).then(([THREE,{GLTFLoader}])=>({THREE,GLTFLoader})));

async function mount(el){
  const {THREE,GLTFLoader}=await loadLib();
  const [rimA,rimB]=(el.dataset.rim||"#8b5cf6,#22d3ee").split(",");
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  el.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(30,1,0.01,20);
  scene.add(new THREE.HemisphereLight(0xbfc6d6,0x050507,0.9));
  const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(1.5,2.2,2.5);scene.add(key);
  const r1=new THREE.DirectionalLight(rimA,5);r1.position.set(-2.5,1.2,-1.5);scene.add(r1);
  const r2=new THREE.DirectionalLight(rimB,4);r2.position.set(2.5,0.6,-2);scene.add(r2);

  const gltf=await new GLTFLoader().loadAsync(el.dataset.model);
  const model=gltf.scene;
  const mat=new THREE.MeshStandardMaterial({color:0x2a2b31,roughness:0.42,metalness:0.35});
  model.traverse(o=>{if(o.isMesh)o.material=mat});
  // center on the floor, then frame the camera on the bounding box
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(ctr.x,box.min.y,ctr.z));
  const pivot=new THREE.Group();pivot.add(model);scene.add(pivot);
  // glowing floor ring
  const ring=new THREE.Mesh(new THREE.RingGeometry(size.x*0.42,size.x*0.6,64),new THREE.MeshBasicMaterial({color:rimB,transparent:true,opacity:0.18,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=0.002;scene.add(ring);
  const h=size.y,wid=Math.max(size.x,size.z),target=new THREE.Vector3(0,h*0.5,0);
  // fit the whole model (height and swaying width) inside the frame, whatever the stage shape
  function frame(){const f=Math.tan(THREE.MathUtils.degToRad(cam.fov/2));
    const d=Math.max(h*1.18/(2*f),wid*1.12/(2*f*cam.aspect))+wid*0.5;
    cam.position.set(0,h*0.5+d*0.16,d);cam.lookAt(target)}

  function resize(){const w=el.clientWidth,hh=el.clientHeight;renderer.setSize(w,hh,false);cam.aspect=w/hh;cam.updateProjectionMatrix();frame()}
  resize();new ResizeObserver(resize).observe(el);

  // interaction: drag rotates, otherwise slow sway; pointer adds a little parallax
  let drag=null,yaw=0,vel=0,tilt=0,tTilt=0,visible=true,t0=performance.now();
  el.addEventListener("pointerdown",e=>{drag=e.clientX;el.setPointerCapture(e.pointerId);el.classList.add("grab")});
  el.addEventListener("pointermove",e=>{const r=el.getBoundingClientRect();tTilt=((e.clientY-r.top)/r.height-.5)*0.25;
    if(drag!==null){vel=(e.clientX-drag)*0.01;yaw+=vel;drag=e.clientX}});
  const up=()=>{drag=null;el.classList.remove("grab")};el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);
  el.addEventListener("pointerleave",()=>{tTilt=0});

  new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)loop()}).observe(el);
  let raf=0;
  function loop(){cancelAnimationFrame(raf);
    const step=now=>{if(!visible)return;const t=(now-t0)/1000;
      if(drag===null){vel*=0.92;yaw+=vel;if(!reduced)yaw+=(Math.sin(t*0.4)*0.45-yaw)*0.01}
      tilt+=(tTilt-tilt)*0.08;pivot.rotation.y=yaw;pivot.rotation.x=tilt*0.3;
      ring.material.opacity=0.14+Math.sin(t*1.6)*0.05;
      renderer.render(scene,cam);raf=requestAnimationFrame(step)};
    raf=requestAnimationFrame(step)}
  el.classList.add("ready");loop();
}

const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);
  mount(e.target).catch(()=>e.target.classList.add("failed"))}),{rootMargin:"400px 0px"});
stages.forEach(s=>io.observe(s));
