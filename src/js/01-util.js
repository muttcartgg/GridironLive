/* =========================================================
   01 · Utilities, storage, save slots
   ========================================================= */
const VERSION=4;
const $=s=>document.querySelector(s);
const R=(a,b)=>a+Math.random()*(b-a), rint=(a,b)=>Math.floor(R(a,b+1)), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)], hyp=Math.hypot, lerp=(a,b,t)=>a+(b-a)*t;
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=a=>a.reduce((s,x)=>s+x,0);
let UID=1;const uid=()=>++UID;
function lum(hex){const n=parseInt(String(hex).slice(1),16)||0,r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255;return .2126*r+.7152*g+.0722*b}
const inkOn=c=>lum(c)>.55?'#0B0E14':'#FFFFFF';
const contrasty=(a,b)=>Math.abs(lum(a)-lum(b))>.25;
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const t=f<0?0:255,p=Math.abs(f);r=Math.round((t-r)*p+r);g=Math.round((t-g)*p+g);b=Math.round((t-b)*p+b);return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}
const starStr=n=>{n=clamp(Math.round(n),0,5);return `<span class="stars" aria-label="${n} of 5 stars">${'★'.repeat(n)}<i>${'★'.repeat(5-n)}</i></span>`};
const ordn=n=>n+(['th','st','nd','rd'][((n%100)-20)%10]||['th','st','nd','rd'][n%100]||'th');
const money=k=>k>=1000?`$${(k/1000).toFixed(k%1000?2:0)}M`:`$${Math.round(k)}K`;
const pct=x=>Math.round(x*100)+'%';
const meterHTML=(v,col)=>`<div class="meter"><i style="width:${clamp(v,0,100)}%;background:${col||(v>66?'var(--ok)':v>33?'var(--warn)':'var(--hot)')}"></i></div>`;

/* Key-value storage: the iOS app bridges to UserDefaults; browsers use localStorage */
const KV={
  get(k){
    try{const n=window.__NATIVE_KV__;if(n&&typeof n[k]==='string'&&n[k])return n[k]}catch(e){}
    try{return localStorage.getItem(k)}catch(e){return null}
  },
  set(k,v){
    const val=v==null?'':String(v);
    try{const h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.kv;if(h){h.postMessage({k,v:val});(window.__NATIVE_KV__=window.__NATIVE_KV__||{})[k]=val}}catch(e){}
    try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,val)}catch(e){}
  }
};
const SLOTS=[1,2,3];
/* ---------- save format ----------
   'Y:' (v2, Gridiron Live 7 step 16): LZ(JSON of the league without rosters) + '~' + every roster as dense base-64 text
   (names/hometowns interned in a table sorted by use, ratings one character each, season/career stats as a field mask
   plus variable-length numbers, defaults left out). Older 'Z:' (LZ of the whole JSON) and plain JSON saves still load.
   lzB64 is lz-string's compressToBase64 with a hash table instead of string keys: same output, several times faster. */
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',B64I=new Int8Array(128).fill(-1);for(let i=0;i<64;i++)B64I[B64.charCodeAt(i)]=i;
function lzB64(s){
  const n=s.length;
  let cap=1<<15,mask=cap-1,kp=new Int32Array(cap).fill(-1),kc=new Uint16Array(cap),kv=new Int32Array(cap),cnt=0;
  const one=new Int32Array(65536).fill(-1),pend=new Uint8Array(65536),out=[];let val=0,pos=0;
  const hs=(p,c)=>(Math.imul(p,0x9E3779B1)^Math.imul(c+1,0x85EBCA6B))>>>0;
  const grow=()=>{const op=kp,oc=kc,ov=kv;cap<<=1;mask=cap-1;kp=new Int32Array(cap).fill(-1);kc=new Uint16Array(cap);kv=new Int32Array(cap);
    for(let i=0;i<op.length;i++)if(op[i]>=0){let h=hs(op[i],oc[i])&mask;while(kp[h]>=0)h=(h+1)&mask;kp[h]=op[i];kc[h]=oc[i];kv[h]=ov[i]}};
  const bits=(v,nb)=>{for(let i=0;i<nb;i++){val=(val<<1)|(v&1);v>>=1;if(pos===5){out.push(val);val=0;pos=0}else pos++}};
  let size=3,nb=2,enl=2,w=-1,w1=-1;
  const emit=()=>{if(w1>=0&&pend[w1]){if(w1<256){bits(0,nb);bits(w1,8)}else{bits(1,nb);bits(w1,16)}if(!--enl){enl=2**nb;nb++}pend[w1]=0}else bits(w,nb);if(!--enl){enl=2**nb;nb++}};
  for(let i=0;i<n;i++){const c=s.charCodeAt(i);
    if(one[c]<0){one[c]=size++;pend[c]=1}
    if(w<0){w=one[c];w1=c;continue}
    let h=hs(w,c)&mask;while(kp[h]>=0&&(kp[h]!==w||kc[h]!==c))h=(h+1)&mask;
    if(kp[h]>=0){w=kv[h];w1=-1;continue}
    emit();kp[h]=w;kc[h]=c;kv[h]=size++;if(++cnt*2>cap)grow();w=one[c];w1=c}
  if(w>=0)emit();
  bits(2,nb);for(;;){val<<=1;if(pos===5){out.push(val);break}pos++}
  let r='';for(let i=0;i<out.length;i+=8192)r+=String.fromCharCode.apply(null,out.slice(i,i+8192).map(x=>B64.charCodeAt(x)));
  return r+['','===','==','='][r.length%4];
}
/* dense roster codec: stat keys most-used first (the field mask is a variable-length number) */
const SSK=['gp','tkl','sck','rec','recy','rectd','ra','ry','rtd','pa','pc','py','ptd','int','dint','ff','fgm','fga','xpm','xpa','tfl','pd','sn','gs'];
const PKEYS=new Set(['id','first','last','home','pos','yr','rs','redshirt','tone','num','dev','injNew','injW','ht','wt','xp','ss','cs','cond','inj','injWhy','real','isNew','fine','espnId',...ATTR_KEYS_U()]);
function ATTR_KEYS_U(){return ['spd','agi','str','awr','thr','acc','cat','rte','car','blk','tkl','cov','shd','end']}
const POSK=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const vqW=(o,v)=>{v=Math.max(0,Math.round(v));while(v>=32){o.push(B64[32|(v%32)]);v=Math.floor(v/32)}o.push(B64[v])};
const vqR=(D,I,s)=>{let v=0,m=1,c;do{c=B64I[D[s].charCodeAt(I[s]++)];v+=(c&31)*m;m*=32}while(c&32);return v};
/* one stream per column (ids, first/last names, hometowns, position, class byte, number, height, weight, flags, each of the 14
   ratings, stats), joined by '!', so LZ sees runs of similar values instead of interleaved records */
const NSTR=28;
function rosterEnc(teams,user){
  const freq=new Map(),bump=s=>freq.set(s,(freq.get(s)||0)+1),AK=ATTR_KEYS_U();
  for(const t of teams)for(const p of t.roster){bump(p.first);bump(p.last);bump(p.home||'');if(p.inj>0)bump(p.injWhy||'')}
  const tab=[...freq.keys()].sort((a,b)=>freq.get(b)-freq.get(a)),ix=new Map(tab.map((s,i)=>[s,i])),X={};
  const O=Array.from({length:NSTR},()=>[]),ch=(s,v)=>O[s].push(B64[v&63]),vq=(s,v)=>vqW(O[s],v);
  const st=s=>{if(!s)return 0;let m=0;for(const k in s){const v=s[k];if(!v)continue;const i=SSK.indexOf(k);if(i<0||!Number.isInteger(v)||v<0)return -1;m|=1<<i}
    if(!m)return 0;vq(26,m);for(let i=0;i<SSK.length;i++)if(m>>i&1)vq(26,s[SSK[i]]);return 1};
  let last=0,pn=0;
  for(const t of teams){vq(0,t.roster.length);for(const p of t.roster){pn++;
    const d=(p.id|0)-last;last=p.id|0;vq(0,d>=0?d*2:-d*2-1);vq(1,ix.get(p.first));vq(2,ix.get(p.last));vq(3,ix.get(p.home||''));
    const pi=POSK.indexOf(p.pos),ex={};
    for(const k in p)if(!PKEYS.has(k))ex[k]=p[k];
    if(pi<0||!Number.isInteger(p.id))ex.__raw=p;
    ch(4,pi<0?0:pi);ch(5,((p.yr||1)-1)&3|(p.rs?4:0)|(p.redshirt?8:0)|((p.tone|0)&3)<<4);
    const num=clamp(p.num|0,0,127),dv=p.dev|0;ch(6,num);ch(7,num>>6|(dv&3)<<1|(p.injNew?8:0)|(p.real?16:0)|(p.isNew?32:0));
    if(dv>3)ex.dev=p.dev;if(typeof p.num==='number'&&(p.num<0||p.num>127||!Number.isInteger(p.num)))ex.num=p.num;
    ch(8,clamp(Math.round(p.ht||0)-50,0,63));const wt=clamp(Math.round(p.wt||0),0,4095);ch(9,wt);ch(10,wt>>6);if(p.ht&&(p.ht<50||p.ht>113))ex.ht=p.ht;
    AK.forEach((k,j)=>{const v=p[k];ch(12+j,typeof v==='number'?clamp(Math.round(v*10)-10,0,40):63);if(typeof v==='number'&&(v<1||v>5))ex[k]=v});
    let fl=0;
    if(t.id===user&&p.xp>0){fl|=1;vq(26,p.xp*2)}
    if(p.cond!=null&&p.cond!==100){fl|=2;vq(26,p.cond*2)}
    if(p.inj>0){fl|=4;vq(26,p.inj);vq(26,ix.get(p.injWhy||''))}
    if(p.ss){const r=st(p.ss);if(r>0)fl|=8;else if(r<0)ex.ss=p.ss}
    if(p.cs){const r=st(p.cs);if(r>0)fl|=16;else if(r<0)ex.cs=p.cs}
    if(p.injW>0){fl|=32;vq(26,p.injW)}
    ch(11,fl);let f2=0;   /* imported players: the pack's overall offset and ESPN id */
    if(typeof p.fine==='number'&&p.fine>=-3&&p.fine<=3){f2|=1;vq(26,(p.fine+3)*100)}else if(p.fine!=null)ex.fine=p.fine;
    if(typeof p.espnId==='string'&&/^[1-9]\d{0,14}$/.test(p.espnId)){f2|=2;vq(26,+p.espnId)}else if(p.espnId!=null)ex.espnId=p.espnId;
    ch(27,f2);
    for(const k in ex){X[pn]=ex;break}}}
  return {d:O.map(o=>o.join('')).join('!'),tab,X};
}
function rosterDec(teams,D,tab,X){
  const I=new Array(NSTR).fill(0),AK=ATTR_KEYS_U();let last=0,pn=0;
  const g=s=>B64I[D[s].charCodeAt(I[s]++)],vq=s=>vqR(D,I,s);
  const st=()=>{const m=vq(26),s={};for(let k=0;k<SSK.length;k++)if(m>>k&1)s[SSK[k]]=vq(26);return s};
  for(const t of teams){const n=vq(0);t.roster=[];
    for(let j=0;j<n;j++){pn++;const z=vq(0),id=last+(z&1?-(z+1)/2:z/2);last=id;
      const p={id,first:tab[vq(1)],last:tab[vq(2)],home:tab[vq(3)]};
      p.pos=POSK[g(4)];const a=g(5);p.yr=(a&3)+1;p.rs=!!(a&4);p.redshirt=!!(a&8);p.tone=a>>4&3;
      const n0=g(6),n1=g(7);p.num=n0|(n1&1)<<6;p.dev=n1>>1&3;if(n1&8)p.injNew=true;if(n1&16)p.real=true;if(n1&32)p.isNew=true;
      p.ht=g(8)+50;p.wt=g(9)|g(10)<<6;
      AK.forEach((k,q)=>{const v=g(12+q);if(v<=40)p[k]=(v+10)/10});
      const fl=g(11);p.xp=fl&1?vq(26)/2:0;p.cond=fl&2?vq(26)/2:100;p.inj=0;p.injWhy='';if(fl&4){p.inj=vq(26);p.injWhy=tab[vq(26)]}
      p.ss=Object.assign(newSS(),fl&8?st():null);if(fl&16)p.cs=st();if(fl&32)p.injW=vq(26);const f2=g(27);if(f2&1)p.fine=vq(26)/100-3;if(f2&2)p.espnId=String(vq(26));
      const ex=X&&X[pn];if(ex){if(ex.__raw){t.roster.push(ex.__raw);continue}Object.assign(p,ex)}
      t.roster.push(p)}}
}
/* arrays of same-shaped records (the recruiting pool), column by column: integers, strings (interned) and integer lists */
function structEnc(arr){
  const k0=Object.keys(arr[0]||{}),ks=k0.join(),y=k0.map(k=>{const v=arr[0][k];return Number.isInteger(v)?0:typeof v==='string'?1:Array.isArray(v)?2:-1});
  if(!k0.length||y.includes(-1))return null;const o=[],t=[],ti=new Map(),z=v=>vqW(o,v<0?-v*2-1:v*2);
  for(const x of arr)if(!x||Object.keys(x).join()!==ks)return null;
  for(let j=0;j<k0.length;j++)for(const x of arr){const v=x[k0[j]];
    if(y[j]===0){if(!Number.isInteger(v)||Math.abs(v)>1e9)return null;z(v)}
    else if(y[j]===1){if(typeof v!=='string')return null;let i=ti.get(v);if(i==null){i=t.length;t.push(v);ti.set(v,i)}z(i)}
    else{if(!Array.isArray(v)||!v.every(n=>Number.isInteger(n)&&Math.abs(n)<1e9))return null;z(v.length);v.forEach(z)}}
  return {m:{k:k0,y,t,n:arr.length},d:o.join('')};
}
function structDec(m,d){const D=[d],I=[0],z=()=>{const v=vqR(D,I,0);return v%2?-(v+1)/2:v/2},out=Array.from({length:m.n},()=>({}));
  for(let j=0;j<m.k.length;j++){const y=m.y[j],k=m.k[j];for(const x of out){if(y===0)x[k]=z();else if(y===1)x[k]=m.t[z()];else{const n=z(),a=[];for(let q=0;q<n;q++)a.push(z());x[k]=a}}}
  return out}
/* rankings context (power, résumés) is rebuilt on load instead of saved */
const pack=L=>{
  if(!L||!Array.isArray(L.teams))return 'Z:'+lzB64(JSON.stringify(L));
  const ros=L.teams.map(t=>t.roster),{d,tab,X}=rosterEnc(L.teams,L.user),Rc=L.recruit,rp=Rc&&Array.isArray(Rc.p)&&Rc.p.length?Rc.p:null,re=rp&&structEnc(rp),keep={rinfo:L.rinfo,power:L.power};let js;
  try{L.teams.forEach(t=>t.roster=0);L.__s=tab;L.__x=X;if(re)Rc.p={$s:re.m};delete L.rinfo;delete L.power;js=JSON.stringify(L)}
  finally{L.teams.forEach((t,i)=>t.roster=ros[i]);delete L.__s;delete L.__x;if(re)Rc.p=rp;for(const k in keep)if(keep[k]!==undefined)L[k]=keep[k]}
  return 'Y:'+lzB64(js)+'~'+lzB64(d+(re?'!'+re.d:''))};
const unpack=raw=>{if(!raw)return null;
  if(raw.startsWith('Y:')){const k=raw.indexOf('~'),L=JSON.parse(LZString.decompressFromBase64(raw.slice(2,k))),D=LZString.decompressFromBase64(raw.slice(k+1)).split('!');
    rosterDec(L.teams,D,L.__s,L.__x);delete L.__s;delete L.__x;
    if(L.recruit&&L.recruit.p&&L.recruit.p.$s)L.recruit.p=structDec(L.recruit.p.$s,D[NSTR]||'');
    if(!L.rinfo&&typeof rankCtx==='function')try{const C=rankCtx(L);L.power=C.r;resumeCard(L,C)}catch(e){console.error(e)}
    return L}
  if(raw.startsWith('Z:'))return JSON.parse(LZString.decompressFromBase64(raw.slice(2)));return JSON.parse(raw)};
const Saves={
  meta(){try{return JSON.parse(KV.get('gl3.meta'))||{slots:{},last:null}}catch(e){return {slots:{},last:null}}},
  writeMeta(m){KV.set('gl3.meta',JSON.stringify(m))},
  load(slot){
    try{const L=migrate(unpack(KV.get('gl3.slot'+slot)));if(!L)return null;let live=null;try{live=JSON.parse(KV.get('gl3.live'+slot)||'null')}catch(e){}L.live=live&&live.wk===L.week&&L.phase==='regular'?live:null;return L}
    catch(e){console.error(e);return null}
  },
  save(slot,L){
    if(!slot||!L)return;
    try{if(typeof backupBeforeSave==='function')backupBeforeSave(slot);const live=L.live;L.live=null;const raw=pack(L);L.live=live;KV.set('gl3.slot'+slot,raw);KV.set('gl3.live'+slot,live?JSON.stringify(live):null)}catch(e){console.error(e);try{toast('Could not save. Storage may be full.')}catch(_){}}
    this.touch(slot,L);
  },
  saveLive(slot,L){if(!slot||!L)return;KV.set('gl3.live'+slot,L.live?JSON.stringify(L.live):null);this.touch(slot,L)},
  touch(slot,L){const m=this.meta(),u=L.teams[L.user];
    m.slots[slot]={name:L.name,coach:L.coach.name,team:teamName(u),abbr:u.abbr,c1:u.c1,c2:u.c2,season:L.season,label:weekLabel(L),rec:`${u.rec.w}–${u.rec.l}`,updated:Date.now(),live:!!L.live,titles:L.coach.natties,div:u.div};
    m.last=slot;this.writeMeta(m)},
  del(slot){KV.set('gl3.bak'+slot,null);KV.set('gl3.bakt'+slot,null);KV.set('gl3.slot'+slot,null);KV.set('gl3.live'+slot,null);const m=this.meta();delete m.slots[slot];if(m.last==slot)m.last=null;this.writeMeta(m)},
  exportCode(L){return 'GL3'+pack(L)},
  importCode(code){code=String(code).trim().replace(/\s+/g,'');let L;if(code.startsWith('GL3Y:'))L=unpack(code.slice(3));else if(code.startsWith('GL3Z:'))L=JSON.parse(LZString.decompressFromBase64(code.slice(5)));else{if(code.startsWith('GL3:'))code=code.slice(4);L=JSON.parse(decodeURIComponent(escape(atob(code))))}return migrate(L)}
};
/* Older saves (v1) are carried into slot 1 on first launch */
function importLegacy(){
  const m=Saves.meta();if(Object.keys(m.slots).length)return;
  let raw=null;
  try{if(typeof window.__NATIVE_SAVE__==='string'&&window.__NATIVE_SAVE__)raw=window.__NATIVE_SAVE__}catch(e){}
  if(!raw){try{raw=localStorage.getItem('gridiron-live-dynasty-v1')}catch(e){}}
  if(!raw)return;
  try{const L=migrate(JSON.parse(raw));if(L){Saves.save(1,L)}}catch(e){console.error(e)}
}
function bumpUID(L){for(const t of L.teams)for(const p of t.roster)UID=Math.max(UID,p.id||0);for(const k of ['recruits','portal'])if(L.off&&L.off[k])for(const p of L.off[k])UID=Math.max(UID,p.id||0)}
const timeAgo=ts=>{const s=(Date.now()-ts)/1000;if(s<60)return 'just now';if(s<3600)return Math.round(s/60)+' min ago';if(s<86400)return Math.round(s/3600)+' hr ago';return Math.round(s/86400)+' days ago'};
