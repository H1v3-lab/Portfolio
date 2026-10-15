/* Terminal mode: press ~ (or ² / `) or the >_ button to open a small fake shell.
   Output is built with textContent only: nothing typed here is ever parsed as HTML. */
(function(){
  if(!document.querySelector(".rail"))return;
  const L=()=>(typeof lang!=="undefined"&&lang==="en")?"en":"fr";
  const t=o=>o[L()];
  const kb=k=>{const e=(typeof KB!=="undefined"?KB:[]).find(x=>x.k.includes(k));return e?e[L()]:""};
  const rot13=s=>s.replace(/[a-z]/gi,c=>String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26));

  const PROJ={
    "hydra.txt":()=>kb("hydra")+"\n\n→ open hydra",
    "vulnlab.txt":()=>t({fr:"VulnLab — laboratoire Docker de 15 challenges couvrant l'OWASP Top 10, pour s'entraîner à l'exploitation web en local.",en:"VulnLab — Docker lab with 15 challenges covering the OWASP Top 10, to practise web exploitation locally."}),
    "koudipay.txt":()=>t({fr:"KoudiPay — agrégateur Mobile Money. Co-fondateur, responsable cybersécurité.",en:"KoudiPay — Mobile Money aggregator. Co-founder, head of cybersecurity."}),
    "sentinel-avsec.txt":()=>t({fr:"SENTINEL-AVSEC — cybersurveillance aéroportuaire pilotée par IA (ANAC 2026).",en:"SENTINEL-AVSEC — AI-driven airport cyber-surveillance (ANAC 2026)."}),
    "bloodlogic.txt":()=>t({fr:"BloodLogic — projet du hackathon AI4YOUTH 2026.",en:"BloodLogic — AI4YOUTH 2026 hackathon project."})
  };
  const HOME={
    "about.txt":()=>kb("qui"),
    "skills.txt":()=>kb("skill"),
    "ctf.txt":()=>kb("palmarès"),
    "certs.txt":()=>kb("certif"),
    "experience.txt":()=>kb("expérience"),
    "privacy.txt":()=>kb("privacy"),
    "contact.txt":()=>kb("contact"),
    "security.txt":()=>kb("security.txt"),
    ".bash_history":()=>"nmap -sC -sV sakoi-cyber.me\ncurl -sI https://sakoi-cyber.me\ncat /robots.txt\nvim .flag\nrot13 --help",
    ".flag":()=>"QZBQ{q0gs1y35_4e3_a0g_u1qq3a}"
  };
  const DIRS={"~":HOME,"~/projets":PROJ};
  const PAGES={accueil:"index.html",home:"index.html",about:"index.html#about",competences:"competences.html",skills:"competences.html",
    projets:"projets.html",projects:"projets.html",hydra:"hydra.html",ctf:"ctf.html",writeups:"writeups.html",certifications:"certifications.html",certs:"certifications.html",
    formation:"formation.html",education:"formation.html",experience:"experience.html",evenements:"evenements.html",events:"evenements.html",talks:"evenements.html",
    uses:"uses.html",contact:"contact.html",securite:"securite.html",security:"securite.html",flag:"flag.html",blog:"https://blog.sakoi-cyber.me"};

  let cwd="~",hist=[],hi=0,ov,out,inp,ps;

  function build(){
    ov=document.createElement("div");ov.className="term-ov";ov.hidden=true;
    ov.innerHTML='<div class="term-win" role="dialog" aria-modal="true" aria-label="Terminal"><div class="term-bar"><span class="term-dots"><i></i><i></i><i></i></span><span class="term-title">dmod@sakoi-cyber: ~</span><button class="term-x" type="button" aria-label="Fermer">✕</button></div><div class="term-out" aria-live="polite"></div><form class="term-f" autocomplete="off"><label class="term-ps"></label><input class="term-in" type="text" spellcheck="false" autocapitalize="off" aria-label="Commande"></form></div>';
    document.body.appendChild(ov);
    out=ov.querySelector(".term-out");inp=ov.querySelector(".term-in");ps=ov.querySelector(".term-ps");
    ov.querySelector(".term-x").addEventListener("click",close);
    ov.addEventListener("mousedown",e=>{if(e.target===ov)close()});
    ov.querySelector(".term-win").addEventListener("click",()=>{if(!getSelection().toString())inp.focus()});
    ov.querySelector(".term-f").addEventListener("submit",e=>{e.preventDefault();run(inp.value);inp.value=""});
    inp.addEventListener("keydown",key);
    banner();prompt();
  }
  const ps1=()=>`dmod@sakoi-cyber:${cwd}$`;
  function prompt(){ps.textContent=ps1();ov.querySelector(".term-title").textContent="dmod@sakoi-cyber: "+cwd}
  function print(text,cls){const d=document.createElement("div");d.className="tl-"+(cls||"o");d.textContent=text;out.appendChild(d);out.scrollTop=out.scrollHeight}
  function banner(){
    print("  ___    ___\n / _ \\  / _ \\\n| | | || | | |\n| |_| || |_| |\n \\___/  \\___/ ______","art");
    print(t({fr:"dmod-sh 1.0 — tape « help » pour la liste des commandes, « exit » ou Échap pour quitter.",en:"dmod-sh 1.0 — type “help” for the list of commands, “exit” or Esc to quit."}),"dim");
  }
  function open(){if(!ov)build();ov.hidden=false;document.documentElement.classList.add("term-open");setTimeout(()=>inp.focus(),30)}
  function close(){if(!ov)return;ov.hidden=true;document.documentElement.classList.remove("term-open")}

  function resolve(p){if(!p||p==="~"||p==="~/")return "~";
    p=p.replace(/\/+$/,"");if(p===".."||p==="~/..")return "~";
    if(p.startsWith("~/"))return DIRS[p]?p:null;
    if(cwd==="~"&&DIRS["~/"+p])return "~/"+p;
    if(cwd!=="~"&&(p==="../"||p===".."))return "~";
    return null}
  function file(p){const i=p.lastIndexOf("/");let dir=cwd,name=p;
    if(i>=0){dir=resolve(p.slice(0,i)||"~");name=p.slice(i+1)}
    return dir&&DIRS[dir]&&DIRS[dir][name]?DIRS[dir][name]:null}

  const C={
    help:()=>print(t({fr:
`Commandes disponibles :
  whoami            qui est Dmod
  ls [-a] [dossier] lister les fichiers (-a : fichiers cachés)
  cd <dossier>      changer de dossier (ex. cd projets)
  cat <fichier>     afficher un fichier (ex. cat about.txt)
  open <page>       ouvrir une page (ex. open hydra, open uses)
  neofetch          fiche système
  contact           me joindre
  cv                télécharger mon CV
  flag <DMOD{...}>  valider un flag du mini-CTF
  lang [fr|en]      changer de langue
  history, clear, date, echo, pwd, exit`,en:
`Available commands:
  whoami            who is Dmod
  ls [-a] [dir]     list files (-a: hidden files)
  cd <dir>          change directory (e.g. cd projets)
  cat <file>        print a file (e.g. cat about.txt)
  open <page>       open a page (e.g. open hydra, open uses)
  neofetch          system card
  contact           get in touch
  cv                download my CV
  flag <DMOD{...}>  submit a mini-CTF flag
  lang [fr|en]      switch language
  history, clear, date, echo, pwd, exit`})),
    whoami:()=>print(t({fr:"dmod — Dominique-Savio SAKOI\nJunior Security Engineer · pentester · joueur de CTF (capitaine de Smile 0_0)\nLomé, Togo · ouvert aux opportunités",en:"dmod — Dominique-Savio SAKOI\nJunior Security Engineer · pentester · CTF player (Smile 0_0 captain)\nLomé, Togo · open to opportunities"})),
    id:()=>print("uid=1337(dmod) gid=1337(hackers) groups=1337(hackers),27(ctf),100(privacy)"),
    pwd:()=>print(cwd.replace("~","/home/dmod")),
    ls:a=>{const all=a.includes("-a")||a.includes("-la")||a.includes("-al");const p=a.filter(x=>!x.startsWith("-"))[0];
      const d=p?resolve(p):cwd;if(!d){print(`ls: ${p}: `+t({fr:"aucun fichier ou dossier de ce nom",en:"no such file or directory"}),"err");return}
      let names=Object.keys(DIRS[d]);if(d==="~")names=["projets/",...names];if(!all)names=names.filter(n=>!n.startsWith("."));
      print((all?"./  ../  ":"")+names.join("  "))},
    cd:a=>{const d=resolve(a[0]||"~");if(!d){print(`cd: ${a[0]}: `+t({fr:"aucun dossier de ce nom",en:"no such directory"}),"err");return}cwd=d;prompt()},
    cat:a=>{if(!a[0]){print("cat: "+t({fr:"quel fichier ? (ex. cat about.txt)",en:"which file? (e.g. cat about.txt)"}),"err");return}
      const f=file(a[0]);if(f){print(f());if(a[0].endsWith(".flag"))print(t({fr:"(hmm… ça ne ressemble pas à du français. César aurait souri.)",en:"(hmm… that doesn't look like English. Caesar would smile.)"}),"dim")}
      else if(resolve(a[0]))print(`cat: ${a[0]}: `+t({fr:"est un dossier",en:"is a directory"}),"err");
      else print(`cat: ${a[0]}: `+t({fr:"aucun fichier de ce nom — essaie ls",en:"no such file — try ls"}),"err")},
    open:a=>{const k=(a[0]||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");const u=PAGES[k];
      if(!u){print(t({fr:"open: page inconnue. Pages : ",en:"open: unknown page. Pages: "})+Object.keys(PAGES).join(", "),"err");return}
      print("→ "+u,"ok");setTimeout(()=>{location.href=u},350)},
    contact:()=>print("✉  contact@sakoi-cyber.me\nin linkedin.com/in/dominique-savio-sakoi-b607b333a\n⌥  github.com/H1v3-lab\n🔑 sakoi-cyber.me/pgp.asc"),
    neofetch:()=>{print("  ___    ___ \n / _ \\  / _ \\    dmod@sakoi-cyber\n| | | || | | |   ----------------\n| |_| || |_| |   OS: sakoi-cyber.me (static · GitHub Pages + Cloudflare)\n \\___/  \\___/    Shell: dmod-sh 1.0\n        ______   Location: Lomé, Togo (UTC+0)\n                 Langs: FR · EN\n                 Certs: CAPT · Fortinet · Cisco\n                 Team: Smile 0_0\n                 Status: "+t({fr:"ouvert aux opportunités",en:"open to work"}),"art")},
    date:()=>print(new Date().toString()),
    echo:a=>print(a.join(" ")),
    history:()=>print(hist.map((h,i)=>String(i+1).padStart(4)+"  "+h).join("\n")||""),
    clear:()=>{out.textContent=""},
    lang:a=>{const l=a[0]||(L()==="fr"?"en":"fr");if(l!==L()&&(l==="fr"||l==="en"))document.getElementById("lang").click();print("lang="+L(),"ok")},
    flag:async a=>{if(!window.CTF){print("CTF offline","err");return}const r=await CTF.check(a.join(" "));
      if(!r.n){print(t({fr:"✕ Flag invalide. Format : DMOD{...}",en:"✕ Invalid flag. Format: DMOD{...}"}),"err");return}
      const n=CTF.found().length;print((r.fresh?"✓ ":"• ")+t({fr:`Flag ${r.n} ${r.fresh?"validé":"déjà trouvé"} — ${n}/${CTF.total}`,en:`Flag ${r.n} ${r.fresh?"accepted":"already found"} — ${n}/${CTF.total}`}),"ok");
      if(n===CTF.total)print(t({fr:"🏁 Tous les flags ! Passe sur /flag.html pour la suite.",en:"🏁 All flags! Head to /flag.html for what's next."}),"ok")},
    sudo:()=>print(t({fr:"dmod n'appartient pas au fichier sudoers. Cet incident sera signalé. 0_0",en:"dmod is not in the sudoers file. This incident will be reported. 0_0"}),"err"),
    rm:()=>print(t({fr:"Bien essayé. Ce site est en lecture seule — et versionné sur GitHub.",en:"Nice try. This site is read-only — and versioned on GitHub."}),"err"),
    cv:()=>{const u="CV_Dominique-Savio_SAKOI_"+(L()==="en"?"EN":"FR")+".pdf";print("→ "+u,"ok");setTimeout(()=>{location.href=u},350)},
    exit:close,quit:close,
    hydra:()=>C.cat(["projets/hydra.txt"]),
    uname:()=>print("dmod-sh 1.0 sakoi-cyber.me static x86_64 GNU/Cloudflare"),
    vim:()=>print(t({fr:"Pour quitter vim : … personne ne sait. Utilise plutôt cat.",en:"How to exit vim: … nobody knows. Use cat instead."}),"dim"),
    nmap:()=>print("PORT    STATE  SERVICE\n443/tcp open   https   (Cloudflare)\n80/tcp  open   http    → 301 https\n"+t({fr:"Tu scannes mon site ? Lis plutôt /.well-known/security.txt 😉",en:"Scanning my site? Read /.well-known/security.txt instead 😉"})),
    curl:a=>print(t({fr:"Pas de réseau dans ce shell. Essaie depuis ton vrai terminal : curl -sI https://sakoi-cyber.me",en:"No network in this shell. Try from your real terminal: curl -sI https://sakoi-cyber.me"}),"dim")
  };
  C.ll=a=>C.ls(["-a",...a]);C["cd.."]=()=>C.cd([".."]);C.cls=C.clear;C.aide=C.help;C["?"]=C.help;

  function run(line){const s=line.trim();print(ps1()+" "+s,"cmd");if(!s)return;
    hist.push(s);hi=hist.length;
    const [c,...a]=s.split(/\s+/);const f=C[c.toLowerCase()];
    if(f)f(a);else print(`${c}: `+t({fr:"commande introuvable — tape help",en:"command not found — type help"}),"err")}
  function key(e){
    if(e.key==="Escape"){e.preventDefault();close()}
    else if(e.key==="ArrowUp"){e.preventDefault();if(hi>0){hi--;inp.value=hist[hi]}}
    else if(e.key==="ArrowDown"){e.preventDefault();if(hi<hist.length-1){hi++;inp.value=hist[hi]}else{hi=hist.length;inp.value=""}}
    else if(e.key==="Tab"){e.preventDefault();const parts=inp.value.split(" "),last=parts[parts.length-1];
      const pool=parts.length===1?Object.keys(C):[...Object.keys(DIRS[cwd]),...(cwd==="~"?["projets/"]:[]),...(parts[0]==="open"?Object.keys(PAGES):[])];
      const m=pool.filter(x=>x.startsWith(last));if(m.length===1){parts[parts.length-1]=m[0];inp.value=parts.join(" ")}else if(m.length>1)print(m.join("  "),"dim")}
    else if(e.key==="l"&&e.ctrlKey){e.preventDefault();C.clear()}
  }

  document.addEventListener("keydown",e=>{
    if(!["~","`","²"].includes(e.key)||e.ctrlKey||e.metaKey)return;
    const el=e.target;if(el.closest&&el.closest("input,textarea,select,[contenteditable]"))return;
    e.preventDefault();ov&&!ov.hidden?close():open()});
  document.querySelectorAll("[data-term]").forEach(b=>b.addEventListener("click",open));
  if(location.hash==="#terminal")open();
})();
