/* =========================================================
   01 · Utilities, storage, save slots
   ========================================================= */
const VERSION=3;
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
const pack=obj=>'Z:'+LZString.compressToBase64(JSON.stringify(obj));
const unpack=raw=>{if(!raw)return null;if(raw.startsWith('Z:'))return JSON.parse(LZString.decompressFromBase64(raw.slice(2)));return JSON.parse(raw)};
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
  exportCode(L){return 'GL3Z:'+LZString.compressToBase64(JSON.stringify(L))},
  importCode(code){code=String(code).trim().replace(/\s+/g,'');let L;if(code.startsWith('GL3Z:'))L=JSON.parse(LZString.decompressFromBase64(code.slice(5)));else{if(code.startsWith('GL3:'))code=code.slice(4);L=JSON.parse(decodeURIComponent(escape(atob(code))))}return migrate(L)}
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
