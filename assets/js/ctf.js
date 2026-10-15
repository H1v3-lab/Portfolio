/* Hidden mini-CTF: six flags are scattered around the site. Only their SHA-256 hashes live here,
   so reading this file tells you how flags are checked, not what they are. Progress stays in this browser. */
(function(){
  const H=["0b47e86c24da90ec2fd84837e85a3ffcab08f0e82e88a2bf528ac5b36f67d3ea",
    "018c339eb37d009d2e9c95a22bd2b7e2c3384bf8d2932877047c9f63f3ca3501",
    "4730fd6fbe724dcf29b4de56c7a0830248bf4020a8d9c16a29c842f9a62df4f8",
    "76081738c6656bc21099cfa282cf42c38c80850286bda81c425c434f539fef30",
    "11def4318bfe6f94bc337091289df4b4e5b604b5fa7835786c39f1d355c88a44",
    "ed9f5348d27f5f953015a5f69c4d1addc328fc7c31ee8101f1c7f6b18fa86e6a"];
  const KEY="dmod_flags";
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(e){return[]}};
  const save=a=>{try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}};
  async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
  /* returns {n: flag number 1-6 or 0, fresh: first time found} */
  async function check(input){const f=String(input||"").trim();if(!/^DMOD\{.+\}$/.test(f)||!crypto.subtle)return{n:0};
    const i=H.indexOf(await sha(f));if(i<0)return{n:0};
    const got=load(),fresh=!got.includes(i+1);if(fresh){got.push(i+1);got.sort();save(got)}
    dispatchEvent(new CustomEvent("ctf:update"));return{n:i+1,fresh}}
  window.CTF={total:H.length,found:load,check,reset(){save([]);dispatchEvent(new CustomEvent("ctf:update"))}};

  /* flag 3 — for those who open the devtools */
  console.log("%c 0_0 ","font:700 42px monospace;color:#000;background:#f4f4f6;border-radius:10px;padding:4px 10px");
  console.log("%cTu ouvres la console ? Bon réflexe. / Opening the console? Good instinct.\n%cRE1PRHtjMG41MGwzX2wwZ19sMzRrNX0=\n%c→ sakoi-cyber.me/flag.html",
    "font:13px monospace;color:#7ee2a8","font:13px monospace;color:#f5c451","font:12px monospace;color:#9a9aa3");
})();
