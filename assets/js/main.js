const T={
  fr:{about1:"Étudiant passionné en cybersécurité offensive, je me spécialise dans l'identification et l'exploitation de vulnérabilités : tests d'intrusion web, exploitation, cryptanalyse appliquée et forensique.",about2:"Je m'entraîne en CTF presque chaque semaine avec l'équipe n0_m3rcy, je construis mes propres labs vulnérables, et j'applique ce que j'apprends à des projets réels, du paiement mobile à la sûreté aéroportuaire.",f_id:"Identité",f_status:"Statut",f_status_v:"Consultant cybersécurité indépendant · Co-fondateur de KoudiPay",f_edu:"Formation",f_domains:"Domaines d'expertise",d1:"Tests d'intrusion web",d2:"Cryptanalyse",d3:"Forensique & stéganographie",d4:"Reverse engineering",b_skills:"Compétences",methodo:"Aperçu de méthodologie",tools:"Outils offensifs",l_projects:"Sélection de projets en cybersécurité offensive et de produits sur lesquels je travaille.",n_anac:"Projet présenté au concours ANAC · AVSEC 2026.",p_portfolio:"Portfolio personnel",p_portfolio_d:"Ce site : globe 3D rendu à la main sur canvas, animations, assistant intégré et bilingue FR/EN — sans aucune dépendance.",c_final:"Finale · 22–23 août 2026",c_part:"Participant",n_items:"éléments",n_item:"élément",brandsub:"Portfolio cybersécurité",n_about:"À propos",n_skills:"Compétences",n_projects:"Projets",n_edu:"Formation",n_exp:"Expérience",quote:"“Chaque système raconte une histoire. Je lis entre les lignes.”",c_projects:"Voir mes projets",c_chat:"Chat en direct avec l'IA",h_about:"À propos",avail:"Disponible pour stages et missions",h_skills:"Compétences",l_skills:"Ce que j'ai pratiqué en conditions réelles, en compétition ou en mission autorisée.",h_projects:"Projets",l_ctf:"Compétitions régionales et plateformes d'entraînement, avec l'équipe n0_m3rcy. Writeups signés Dmod.",l_certs:"Parcours d'entraînement suivis et certifications.",h_edu:"Formation",h_exp:"Expérience",t_consult:"Consultant cybersécurité indépendant",h_contact:"Travaillons ensemble",l_contact:"Pentest, audit, formation ou équipe CTF : écris-moi.",copy:"Copier l'adresse",k_loc:"Base",k_school:"École",k_lang:"Langues",s1:"IPNET Cyber Battle 2026",s2:"Challenges dans VulnLab",s3:"Compétitions CTF",s4:"Projets menés",chat_title:"Demande-moi n'importe quoi sur Dmod",chat_ph:"Pose ta question…"},
  en:{about1:"Passionate offensive security student, I specialise in finding and exploiting vulnerabilities: web penetration testing, exploitation, applied cryptanalysis and forensics.",about2:"I play CTFs almost every week with team n0_m3rcy, build my own vulnerable labs, and apply what I learn to real projects, from mobile payments to airport security.",f_id:"Identity",f_status:"Status",f_status_v:"Independent security consultant · Co-founder of KoudiPay",f_edu:"Education",f_domains:"Areas of expertise",d1:"Web penetration testing",d2:"Cryptanalysis",d3:"Forensics & steganography",d4:"Reverse engineering",b_skills:"Skills",methodo:"Methodology overview",tools:"Offensive tooling",l_projects:"A selection of offensive security projects and products I work on.",n_anac:"Entered in the ANAC · AVSEC 2026 competition.",p_portfolio:"Personal portfolio",p_portfolio_d:"This site: a hand-rendered 3D canvas globe, animations, a built-in assistant and FR/EN — with zero dependencies.",c_final:"Final · 22–23 Aug 2026",c_part:"Participant",n_items:"items",n_item:"item",brandsub:"Cybersecurity portfolio",n_about:"About",n_skills:"Skills",n_projects:"Projects",n_edu:"Education",n_exp:"Experience",quote:"“Every system tells a story. I read between the lines.”",c_projects:"See my projects",c_chat:"Live chat with the AI",h_about:"About",avail:"Open to internships and engagements",h_skills:"Skills",l_skills:"What I've practiced for real, in competitions or authorized engagements.",h_projects:"Projects",l_ctf:"Regional competitions and training platforms, with team n0_m3rcy. Writeups signed Dmod.",l_certs:"Training paths and certifications.",h_edu:"Education",h_exp:"Experience",t_consult:"Independent cybersecurity consultant",h_contact:"Let's work together",l_contact:"Pentest, audit, training or a CTF team: get in touch.",copy:"Copy address",k_loc:"Based in",k_school:"School",k_lang:"Languages",s1:"IPNET Cyber Battle 2026",s2:"Challenges in VulnLab",s3:"CTF competitions",s4:"Projects led",chat_title:"Ask me anything about Dmod",chat_ph:"Ask a question…"}
};
const titles={fr:"Étudiant en Cybersécurité Offensive",en:"Offensive Security Student"};
let lang="fr";try{lang=localStorage.getItem("lang")||"fr"}catch(e){}
const typed=document.getElementById("typed");let timer;
function type(text){clearTimeout(timer);let i=0;typed.textContent="";
  if(document.documentElement.classList.contains("loading")){addEventListener("app:ready",()=>type(titles[lang]),{once:true});return}
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){typed.textContent=text;return}
  (function step(){typed.textContent=text.slice(0,++i);if(i<text.length)timer=setTimeout(step,55)})()}
function apply(l){lang=l;document.documentElement.lang=l;
  document.querySelectorAll("[data-i18n]").forEach(el=>{const v=T[l][el.dataset.i18n];if(v)el.textContent=v});
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{el.placeholder=T[l][el.dataset.i18nPh]});
  document.getElementById("lang").textContent=l==="fr"?"EN":"FR";type(titles[l]);renderChips();countItems();
  try{localStorage.setItem("lang",l)}catch(e){}}
document.getElementById("lang").addEventListener("click",()=>apply(lang==="fr"?"en":"fr"));

document.getElementById("copy").addEventListener("click",async()=>{
  const txt=document.getElementById("mail").textContent;let ok=true;
  try{await navigator.clipboard.writeText(txt)}catch(e){ok=false;const r=document.createRange();r.selectNodeContents(document.getElementById("mail"));const s=getSelection();s.removeAllRanges();s.addRange(r)}
  const t=document.createElement("div");t.className="toast";t.textContent=ok?(lang==="fr"?"Adresse copiée":"Address copied"):(lang==="fr"?"Adresse sélectionnée":"Address selected");document.body.appendChild(t);setTimeout(()=>t.remove(),1800)});

/* active rail link + scroll reveal */
const links=[...document.querySelectorAll(".nav a")];
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id))}}),{rootMargin:"-45% 0px -50% 0px"});
document.querySelectorAll("main section[id]").forEach(s=>io.observe(s));
const rv=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("shown");rv.unobserve(e.target)}}),{threshold:.08});
document.querySelectorAll(".reveal").forEach(s=>rv.observe(s));

/* ---------- chat assistant (local knowledge base, no server needed) ---------- */
const KB=[
  {k:["qui","who","toi","you","dmod","présente","presente","about","propos"],fr:"Dmod, c'est Dominique-Savio SAKOI : étudiant en L3 Cybersécurité à IPNET Institute (Lomé) et consultant indépendant, spécialisé en sécurité offensive (pentest web, exploitation, cryptanalyse, forensique).",en:"Dmod is Dominique-Savio SAKOI: a third-year Cybersecurity student at IPNET Institute (Lomé) and independent consultant, focused on offensive security (web pentest, exploitation, cryptanalysis, forensics)."},
  {k:["compétence","competence","skill","sait","know","outil","tool","stack"],fr:"Domaines de Dmod : exploitation web (SQLi, SSRF, JWT, SSTI, XXE…), cryptanalyse (RSA, ECDSA, AES-CTR), forensique & stégano, reverse engineering (Ghidra, jadx), systèmes & réseau, et dev Python/Node.js/Flask.",en:"Dmod's areas: web exploitation (SQLi, SSRF, JWT, SSTI, XXE…), cryptanalysis (RSA, ECDSA, AES-CTR), forensics & stego, reverse engineering (Ghidra, jadx), systems & networking, and Python/Node.js/Flask dev."},
  {k:["projet","project","vulnlab","koudipay","sentinel","bloodlogic","réalis"],fr:"Projets phares :\n• VulnLab — lab Docker de 15 challenges OWASP Top 10\n• KoudiPay — agrégateur Mobile Money (co-fondateur, resp. cybersécurité)\n• SENTINEL-AVSEC — cybersurveillance aéroportuaire pilotée par IA (ANAC 2026)\n• BloodLogic — hackathon AI4YOUTH 2026",en:"Key projects:\n• VulnLab — Docker lab with 15 OWASP Top 10 challenges\n• KoudiPay — Mobile Money aggregator (co-founder, security lead)\n• SENTINEL-AVSEC — AI-driven airport security monitoring (ANAC 2026)\n• BloodLogic — AI4YOUTH 2026 hackathon"},
  {k:["ctf","flag","compétition","competition","classement","rank","n0_m3rcy","team","équipe"],fr:"Dmod joue en CTF avec l'équipe n0_m3rcy : 2e sur 10 à l'IPNET Cyber Battle 2026. Également à EcowasCTF, brCTF, boroCTF, ESIG Tech Arena, NEXUS CORE et Virtuoso Arena.",en:"Dmod plays CTFs with team n0_m3rcy: 2nd out of 10 at IPNET Cyber Battle 2026. Also EcowasCTF, brCTF, boroCTF, ESIG Tech Arena, NEXUS CORE and Virtuoso Arena."},
  {k:["certif","diplôme","diplome","degree","formation","education","école","ecole","school","étude","study"],fr:"Formation de Dmod : Licence 3 Cybersécurité à IPNET Institute (2025–2026). Entraînement sur TryHackMe, Root-Me, picoCTF et pwn.college.",en:"Dmod's education: 3rd-year Bachelor in Cybersecurity at IPNET Institute (2025–2026). Training on TryHackMe, Root-Me, picoCTF and pwn.college."},
  {k:["expérience","experience","travail","work","job","mission","consult","audit","pentest","stage","intern","dispo","available","hire","recrut"],fr:"Dmod est consultant cybersécurité indépendant (tests d'intrusion autorisés, dont l'audit d'une plateforme d'IPNET Institute) et est disponible pour stages, missions de pentest et audits.",en:"Dmod is an independent security consultant (authorized pentests, including an audit of an IPNET Institute platform) and open to internships, pentest engagements and audits."},
  {k:["contact","mail","email","joindre","reach","écrire","write"],fr:"Le plus simple : domqsavio@gmail.com. Tu peux aussi copier l'adresse depuis la section Contact.",en:"Easiest way: domqsavio@gmail.com. You can also copy it from the Contact section."},
  {k:["où","ou ","where","lomé","lome","togo","pays","country","based"],fr:"Dmod est basé à Lomé, au Togo (UTC+0), et travaille en français et en anglais.",en:"Dmod is based in Lomé, Togo (UTC+0), and works in French and English."},
  {k:["bonjour","salut","hello","hi","hey","coucou"],fr:"Salut ! 👋 Je peux te parler de son parcours, ses compétences, ses projets ou ses CTF.",en:"Hi! 👋 I can tell you about Dmod's background, skills, projects or CTFs."}
];
const CHIPS={fr:["Qui est Dmod ?","Projets","Compétences","Résultats CTF","Contact"],en:["Who is Dmod?","Projects","Skills","CTF results","Get in touch"]};
const chat=document.getElementById("chat"),log=document.getElementById("chat-log"),inp=document.getElementById("chat-in");
function add(text,who){const d=document.createElement("div");d.className="msg "+who;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
function answer(q){const s=q.toLowerCase();let best=null,score=0;
  KB.forEach(e=>{const n=e.k.filter(k=>s.includes(k)).length;if(n>score){score=n;best=e}});
  return best?best[lang]:(lang==="fr"?"Je n'ai pas cette info. Le mieux est d'écrire directement à Dmod : domqsavio@gmail.com":"I don't have that info. Best to email Dmod directly: domqsavio@gmail.com")}
function ask(q){if(!q.trim())return;add(q,"me");const t=add("…","bot typing");
  setTimeout(()=>{t.classList.remove("typing");t.textContent=answer(q);log.scrollTop=log.scrollHeight},500+Math.random()*400)}
function renderChips(){const c=document.getElementById("chips");c.innerHTML="";
  CHIPS[lang].forEach(q=>{const b=document.createElement("button");b.type="button";b.className="chip";b.textContent=q;b.onclick=()=>ask(q);c.appendChild(b)})}
function toggleChat(open){chat.classList.toggle("open",open);chat.setAttribute("aria-hidden",!open);
  if(open){if(!log.children.length)add(lang==="fr"?"Salut ! Je suis l'assistant de Dmod. Pose-moi une question sur son parcours, ses projets ou ses compétences.":"Hi! I'm Dmod's assistant. Ask me about Dmod's background, projects or skills.","bot");setTimeout(()=>inp.focus(),150)}}
document.querySelectorAll("[data-chat]").forEach(b=>b.addEventListener("click",()=>toggleChat(!chat.classList.contains("open"))));
document.getElementById("chat-x").addEventListener("click",()=>toggleChat(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape")toggleChat(false)});
document.getElementById("chat-f").addEventListener("submit",e=>{e.preventDefault();ask(inp.value);inp.value=""});

/* ---------- logo eyes: follow the cursor, look around when idle, blink ---------- */
(function(){
  const eyes=[...document.querySelectorAll("#logo .eye")],pupils=eyes.map(e=>e.firstElementChild);
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  let idle;
  function look(dx,dy){pupils.forEach(p=>{const e=p.parentElement,mx=(e.clientWidth-p.offsetWidth)/2-2,my=(e.clientHeight-p.offsetHeight)/2-3;
    p.style.transform=`translate(${dx*mx}px,${dy*my}px)`})}
  function wander(){const spots=[[0,0],[-1,0],[1,0],[-.7,-.7],[.7,-.7],[0,.8],[.8,.5],[-.8,.5]],s=spots[Math.floor(Math.random()*spots.length)];
    look(s[0],s[1]);idle=setTimeout(wander,900+Math.random()*1600)}
  addEventListener("pointermove",ev=>{clearTimeout(idle);
    const r=eyes[0].parentElement.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,
      dx=ev.clientX-cx,dy=ev.clientY-cy,d=Math.hypot(dx,dy)||1,k=Math.min(1,d/220);
    look(dx/d*k,dy/d*k);idle=setTimeout(wander,2500)});
  function blink(){eyes.forEach(e=>e.classList.add("blink"));setTimeout(()=>eyes.forEach(e=>e.classList.remove("blink")),140);
    if(Math.random()<.25)setTimeout(()=>{eyes.forEach(e=>e.classList.add("blink"));setTimeout(()=>eyes.forEach(e=>e.classList.remove("blink")),140)},300);
    setTimeout(blink,2500+Math.random()*3500)}
  document.getElementById("logo").addEventListener("click",()=>{eyes.forEach(e=>e.classList.add("blink"));setTimeout(()=>eyes.forEach(e=>e.classList.remove("blink")),140)});
  wander();setTimeout(blink,1800);
})();

/* skills accordion + item counts */
function countItems(){document.querySelectorAll(".acc-item").forEach(it=>{const n=it.querySelectorAll(".acc-b .tag").length,el=it.querySelector(".acc-n");if(el)el.textContent=n+" "+T[lang][n>1?"n_items":"n_item"]})}
document.querySelectorAll(".acc-h").forEach(h=>{const it=h.parentElement;h.setAttribute("aria-expanded",it.classList.contains("open"));
  h.addEventListener("click",()=>{const o=it.classList.toggle("open");h.setAttribute("aria-expanded",o)})});

apply(lang);
