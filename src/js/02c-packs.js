/* =========================================================
   02c · Roster & logo packs: real rosters, custom players, imported team logos
   Pack format (docs/PACKS.md): {"format":"gridiron-live-pack","version":2,"season":2026,
     "teams":[{school,mascot,abbr,espnId,primary,secondary,logo,logoDark,stadium,capacity,roster:[player…]}],
     "players":[{team,…player}]}   player: {name,pos,num,yr,rs,ht,wt,home,espnId, 14 attributes (1–5 or 25–99) and/or ovr (40–99)}
   The old v1 team pack ({conferences,teams:[…]} matched by order) still works through applyTeamPack.
   Nothing here ships real data: packs are files the user imports. Logos are only URLs (or data: URIs) from a pack.
   ========================================================= */
const PACK_KEY='gl.pack',PACK_ON='gl.packOn';
const PACK_POS={OT:'OL',OG:'OL',IOL:'OL',C:'OL',G:'OL',T:'OL',DE:'DL',DT:'DL',EDGE:'DL',NT:'DL',OLB:'LB',ILB:'LB',MLB:'LB',DB:'CB',FS:'S',SS:'S',SAF:'S',PK:'K',P:'K',HB:'RB',FB:'RB',ATH:'WR'};
const packPos=v=>{const s=String(v||'').toUpperCase().trim();return POS_ORDER.includes(s)?s:PACK_POS[s]||null};
const packNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/['ʻ’.]/g,'').replace(/&/g,' and ').replace(/\bst\b/g,'state').replace(/[^a-z0-9]+/g,' ').trim();
/* attribute from a pack: 1–5 as is, 25–99 converted back through a99 */
const packAttr=v=>{v=parseFloat(v);if(!(v>=1))return null;if(v<=5)return r1(v);if(v<=99)return r1(1+4*Math.pow(clamp((v-25)/74,0,1),1/.85));return null};
/* overall 40–99 (or 1–5) → the 1–5 quality that o99 maps to it */
const packQ=v=>{v=parseFloat(v);if(!(v>=1))return null;if(v<=5)return v;return clamp(1+4*Math.pow(clamp((v-45)/52,0,1),1/.9),1,5)};
const packJit=id=>(((id||0)*7919)%5-2)*.6;
/* quick overall of a pack entry without building a player (used to pick the best 60) */
function packEntryOvr(e,pos){const w=W8[pos];let s=0,n=0;for(const k in w){const a=packAttr(e[k]);if(a!=null){s+=a*w[k];n+=w[k]}}const q=packQ(e.ovr);return n>=.5?s/n:q!=null?q:2.2}

/* one pack entry → a full game player (every field genPlayer makes exists) */
function packPlayer(e,t){
  const pos=packPos(e.pos);if(!pos)return null;
  const has=ATTR_KEYS.filter(k=>packAttr(e[k])!=null),q=packQ(e.ovr);
  const p=genPlayer(pos,has.length?2.6:q!=null?q:qOf(t)-.3);
  const nm=String(e.name||((e.first||'')+' '+(e.last||''))).trim().split(/\s+/);p.first=(nm.shift()||'Player').slice(0,16);p.last=nm.join(' ').slice(0,22);
  const ys=String(e.yr==null?'':e.yr).toUpperCase();const yr=/^\d$/.test(ys)?+ys:YR.indexOf(ys.replace(/^RS[\s-]*/,''))+1;if(yr>=1&&yr<=4)p.yr=yr;
  p.rs=!!(e.rs===true||/^RS/.test(ys));
  const n=parseInt(e.num);p.num=n>=0&&n<=99?n:0;
  const ht=parseInt(e.ht),wt=parseInt(e.wt);if(ht>=60&&ht<=86)p.ht=ht;if(wt>=140&&wt<=420)p.wt=wt;
  if(e.home)p.home=String(e.home).slice(0,40);if(e.espnId)p.espnId=String(e.espnId).slice(0,14);p.real=true;
  if(has.length){
    /* attributes the pack leaves out are generated around the ones it gives */
    let s=0,c=0;for(const k of has){p[k]=packAttr(e[k]);if(W8[pos][k]){s+=p[k]-(BIAS[pos][k]||0);c++}}
    if(has.length<ATTR_KEYS.length){const base=c?s/c:2.6;for(const k of ATTR_KEYS)if(!has.includes(k))p[k]=r1(base+(BIAS[pos][k]||0)+R(-.4,.4))}
  }else if(q!=null){for(const k of ATTR_KEYS)p[k]=r1(q+(W8[pos][k]?.05:BIAS[pos][k]||0)+R(-.25,.25))}
  /* show the pack's overall exactly when it gives one (p.fine only shifts the displayed number) */
  const o=parseInt(e.ovr);if(o>=40&&o<=99){p.fine=clamp(o-(o99(ovr(p))+packJit(p.id)),-3,3)}
  return p;
}
/* best 60: every position minimum first, then the best of the rest (same rule as tools/data/build_pack.py) */
function packSelect(list){
  const by={};for(const e of list){const pos=packPos(e.pos);if(!pos)continue;(by[pos]=by[pos]||[]).push({e,pos,o:packEntryOvr(e,pos)})}
  const chosen=[],rest=[];let short=0;for(const pos of POS_ORDER){const L=(by[pos]||[]).sort((a,b)=>b.o-a.o);chosen.push(...L.slice(0,POS_COUNTS[pos]));rest.push(...L.slice(POS_COUNTS[pos]));short+=Math.max(0,POS_COUNTS[pos]-L.length)}
  rest.sort((a,b)=>b.o-a.o);const cap={QB:4,K:3},have={};chosen.forEach(x=>have[x.pos]=(have[x.pos]||0)+1);
  /* leave room for the walk-ons packRoster adds at positions the pack is short of */
  for(const x of rest){if(chosen.length>=ROSTER_CAP-short)break;if((have[x.pos]||0)>=(cap[x.pos]||99))continue;chosen.push(x);have[x.pos]=(have[x.pos]||0)+1}
  return chosen;
}
function packRoster(list,t){
  const out=[];for(const x of packSelect(list)){const p=packPlayer(x.e,t);if(p)out.push(p)}
  for(const pos of POS_ORDER){let have=out.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){out.push(genPlayer(pos,qOf(t)-.5,rint(1,2)));have++}}
  assignNumbers({roster:out});return out;
}
const packIsV2=pk=>!!(pk&&!Array.isArray(pk)&&(pk.format==='gridiron-live-pack'||pk.version>=2));
/* which league team each pack team belongs to: ESPN id, then abbreviation (NCAA leagues), then school name */
function packMatch(L,pk){
  const byE={},byA={},byN={};for(const t of L.teams){if(t.espnId)byE[t.espnId]=t;byA[String(t.abbr).toUpperCase()]=t;byN[packNorm(t.city)]=t;byN[packNorm(t.city+' '+t.name)]=t}
  const real=L.kind!=='original',used=new Set(),pairs=[],miss=[];
  for(const e of (pk.teams||[])){if(!e)continue;
    const t=(e.espnId&&byE[e.espnId])||(real&&e.abbr&&byA[String(e.abbr).toUpperCase()])||byN[packNorm(e.school)]||byN[packNorm((e.school||'')+' '+(e.mascot||''))];
    if(t&&!used.has(t)){used.add(t);pairs.push([t,e])}else miss.push(e.school||e.abbr||'?')}
  return {pairs,miss};
}
const packTeamFor=(L,key)=>{const k=String(key||'');const u=k.toUpperCase(),n=packNorm(k);return L.teams.find(t=>String(t.abbr).toUpperCase()===u)||L.teams.find(t=>packNorm(t.city)===n||packNorm(t.city+' '+t.name)===n)||null};
const safeURL=u=>typeof u==='string'&&/^(https:\/\/|data:image\/)/i.test(u)&&u.length<400000?u:null;
/* custom players are always added; a full roster drops its weakest spare player at that position (or overall) */
function packAddCustom(L,list,keepUser){
  let n=0;const touched=new Set();
  for(const e of (list||[])){if(!e)continue;const t=packTeamFor(L,e.team);if(!t||(keepUser&&t.id===L.user&&e.team==null))continue;const p=packPlayer(e,t);if(!p)continue;
    if(t.roster.length>=ROSTER_CAP){const same=t.roster.filter(x=>x.pos===p.pos&&!x.custom);const pool=same.length>POS_COUNTS[p.pos]?same:t.roster.filter(x=>!x.custom&&t.roster.filter(y=>y.pos===x.pos).length>POS_COUNTS[x.pos]);
      const drop=pool.sort((a,b)=>ovr(a)-ovr(b))[0];if(drop)t.roster=t.roster.filter(x=>x!==drop)}
    p.custom=true;t.roster.push(p);touched.add(t);n++}
  for(const t of touched){t.dco=null;assignNumbers(t)}return n;
}
/* apply a v2 pack to league L. opts: {keepUser, meta (stadium names), logos} → summary */
function applyRosterPack(L,pk,opts){
  opts=opts||{};const {pairs,miss}=packMatch(L,pk);let players=0,logos=0;
  for(const [t,e] of pairs){
    const lg=safeURL(e.logo),ld=safeURL(e.logoDark);if(opts.logos!==false&&(lg||ld)){t.logo=lg||ld;t.logoDark=ld||lg;logos++}
    if(e.espnId)t.espnId=String(e.espnId);
    if(opts.meta!==false&&e.stadium){t.stadium=String(e.stadium).slice(0,40);const c=parseInt(e.capacity);if(c>=1000&&c<=200000)t.cap=c}
    if(Array.isArray(e.roster)&&e.roster.length&&!(opts.keepUser&&t.id===L.user)){t.roster=packRoster(e.roster,t);t.dco=null;players+=t.roster.length}
  }
  const custom=packAddCustom(L,pk.players,false);
  if(L.user!=null&&L.teams[L.user]&&Array.isArray(L.captains)){const u=L.teams[L.user];const ids=new Set(u.roster.map(p=>p.id));if(!L.captains.every(id=>ids.has(id)))L.captains=u.roster.filter(p=>p.yr>=3).sort((a,b)=>ovr(b)-ovr(a)).slice(0,2).map(p=>p.id)}
  invalidate();if(typeof updateRankings==='function'&&L.weeks)try{updateRankings(L)}catch(err){console.error(err)}
  L.pack={name:String(pk.name||'Imported pack').slice(0,60),season:pk.season||null,teams:pairs.length};
  return {teams:pairs.length,miss,players,logos,custom};
}
/* summary for the preview, without touching the league */
function packPreview(L,pk){
  if(Array.isArray(pk))pk={players:pk};
  if(!packIsV2(pk)&&Array.isArray(pk.teams))return {v1:true,teams:Math.min(pk.teams.length,L.teams.length)};
  const {pairs,miss}=packMatch(L,pk);let players=0,logos=0;for(const [,e] of pairs){players+=Array.isArray(e.roster)?e.roster.length:0;if(safeURL(e.logo)||safeURL(e.logoDark))logos++}
  const cust=(pk.players||[]).filter(e=>e&&packTeamFor(L,e.team)).length;
  return {v1:false,pk,teams:pairs.length,total:(pk.teams||[]).length,miss,players,logos,custom:cust,customMiss:(pk.players||[]).length-cust};
}

/* ---------- saved pack for new dynasties (compressed in KV; only the 60 players each team would use) ---------- */
function packSave(pk){
  const A=ATTR_KEYS;const enc=e=>{const pos=packPos(e.pos);const a=A.map(k=>{const v=packAttr(e[k]);return v==null?'':Math.round(v*10)}).join('.');return [String(e.name||'').slice(0,40),pos,e.num==null?'':e.num,e.yr==null?'':e.yr,e.ht||'',e.wt||'',e.home||'',a,e.ovr||'',e.rs?1:0,e.espnId||'']};
  const c={v:2,name:pk.name||'Imported pack',season:pk.season||null,teams:(pk.teams||[]).map(t=>({school:t.school,mascot:t.mascot,abbr:t.abbr,espnId:t.espnId,logo:safeURL(t.logo),logoDark:safeURL(t.logoDark),stadium:t.stadium,capacity:t.capacity,
    r:Array.isArray(t.roster)?packSelect(t.roster).map(x=>enc(x.e)):[]})),players:(pk.players||[]).slice(0,600)};
  const raw='Z:'+LZString.compressToBase64(JSON.stringify(c));
  if(raw.length>6e6)throw new Error('This pack is too big to keep for new dynasties.');
  KV.set(PACK_KEY,raw);KV.set(PACK_ON,'1');return raw.length;
}
function packLoadSaved(){
  try{const raw=KV.get(PACK_KEY);if(!raw)return null;const c=unpack(raw);if(!c||!Array.isArray(c.teams))return null;
    const dec=r=>{const e={name:r[0],pos:r[1],num:r[2]===''?null:r[2],yr:r[3],ht:r[4],wt:r[5],home:r[6],ovr:r[8],rs:!!r[9],espnId:r[10]};String(r[7]).split('.').forEach((v,i)=>{if(v!=='')e[ATTR_KEYS[i]]=v/10});return e};
    return {format:'gridiron-live-pack',version:2,name:c.name,season:c.season,teams:c.teams.map(t=>({...t,roster:(t.r||[]).map(dec)})),players:c.players||[]}}
  catch(e){console.error(e);return null}
}
const packSavedOn=()=>!!KV.get(PACK_KEY)&&KV.get(PACK_ON)!=='0';
/* new NCAA dynasties start from the saved pack when it is on */
function packAutoApply(L){if(!L||L.kind!=='ncaa'||!packSavedOn())return false;const pk=packLoadSaved();if(!pk)return false;try{applyRosterPack(L,pk,{});return true}catch(e){console.error(e);return false}}

/* ---------- import UI ---------- */
function openRosterImport(L,done,opt){
  opt=opt||{};const live=typeof LG!=='undefined'&&LG&&L===LG;let pk=null,pv=null;
  const render=()=>{
    const p=pv;let prev='';
    if(p&&p.v1)prev=`<div class="ri-prev"><b>Old-style team pack</b><p class="note">${p.teams} schools, matched by their order in the list.</p></div>`;
    else if(p)prev=`<div class="ri-prev"><div class="kpis"><div><em>Teams matched</em><b>${p.teams}<small>/${p.total}</small></b></div><div><em>Players</em><b>${p.players.toLocaleString()}</b></div><div><em>Logos</em><b>${p.logos}</b></div><div><em>Custom players</em><b>${p.custom}</b></div></div>
      ${p.miss.length?`<p class="note">Not in this league (skipped): ${esc(p.miss.slice(0,8).join(', '))}${p.miss.length>8?` and ${p.miss.length-8} more`:''}</p>`:''}${p.customMiss?`<p class="note">${p.customMiss} custom player${p.customMiss>1?'s have':' has'} no matching team.</p>`:''}
      ${live?`<label class="ri-opt"><input type="checkbox" id="riCur" ${L.live?'disabled':'checked'}> Apply to this dynasty now${L.live?' (finish the game in progress first)':''}</label>
      <label class="ri-opt"><input type="checkbox" id="riKeep" checked> Keep my team's roster</label>`:''}
      ${p.teams&&(p.pk.teams||[]).length?`<label class="ri-opt"><input type="checkbox" id="riSave" checked> Use for new dynasties</label>`:''}</div>`;
    openModal(`<div class="eyebrow">Rosters &amp; logos</div><div class="h2">Import rosters &amp; logos</div>
      <p class="note">Choose a roster pack (.json) saved in Files, or paste one below. A pack replaces players, adds custom players and links team logos; school names and colors stay as they are.</p>
      <div class="btns"><label class="btn light ri-file">Choose file…<input type="file" id="riFile" accept=".json,application/json,text/plain" hidden></label></div>
      <textarea id="riPaste" placeholder='{"format":"gridiron-live-pack","version":2,…}  or a custom players list'></textarea>
      <div class="btns"><button class="btn ghost sm" id="riRead">Read pasted text</button></div>
      <p class="note" id="riErr"></p>${prev}
      <div class="btns">${p?`<button class="btn" id="riGo">${p.v1?'Apply team pack':'Import'}</button>`:''}<button class="btn ghost" id="riX">${p?'Cancel':'Close'}</button></div>`);
    on('riX',closeModal);
    const err=m=>{$('#riErr').textContent=m};
    const take=txt=>{try{let j=JSON.parse(String(txt).replace(/^﻿/,''));if(Array.isArray(j))j={players:j};if(!j||typeof j!=='object'||!(Array.isArray(j.teams)||Array.isArray(j.players)))throw new Error('shape');pk=j;pv=packPreview(L,j);render()}
      catch(e){pk=pv=null;err(e.message==='shape'?'That JSON has no "teams" or "players" list.':'That isn’t valid JSON. Check that you copied all of it.')}};
    const f=$('#riFile');f.onchange=()=>{const file=f.files&&f.files[0];if(!file)return;if(file.size>40e6){err('That file is too big (40 MB max).');return}err('Reading '+file.name+'…');const rd=new FileReader();rd.onload=()=>take(rd.result);rd.onerror=()=>err('That file could not be read.');rd.readAsText(file)};
    on('riRead',()=>{const v=$('#riPaste').value.trim();if(!v){err('Paste a pack first.');return}take(v)});
    on('riGo',()=>{const b=$('#riGo');b.disabled=true;b.textContent='Importing…';setTimeout(()=>{try{
      if(pv.v1){applyTeamPack(L,pk,{regen:opt.regen||L.phase==='regular'&&L.week===0});closeModal();done&&done();return}
      const save=!!($('#riSave')&&$('#riSave').checked),keep=live&&$('#riKeep')&&$('#riKeep').checked;
      const cur=live?!!($('#riCur')&&$('#riCur').checked&&!L.live):!(opt.setup&&save);
      let msg=[],saved=false;if(cur){const s=applyRosterPack(L,pk,{keepUser:keep});msg.push(`${s.teams} teams updated`+(s.custom?`, ${s.custom} custom players`:''))}
      if(save){try{packSave(pk);saved=true;msg.push('saved for new dynasties')}catch(e){msg.push(e.message)}}
      closeModal();toast(msg.join(' · ')||'Nothing to import');done&&done({saved,applied:cur})}catch(e){console.error(e);b.disabled=false;b.textContent='Import';err('Import failed: '+e.message)}},30)});
  };render();
}
/* the old entry point (League tab and the setup screen) now opens the same importer */
function openPackImport(L,done,regen){openRosterImport(L,done,{regen})}
function openRosterExport(){
  const u=T(LG.user);const out={format:'gridiron-live-pack',version:2,season:LG.season,name:teamName(u)+' roster',teams:[{school:u.city,mascot:u.name,abbr:u.abbr,primary:u.c1,secondary:u.c2,...(u.logo?{logo:u.logo,logoDark:u.logoDark}:{}),
    roster:u.roster.map(p=>{const e={name:fullName(p),pos:p.pos,num:p.num,yr:YR[clamp(p.yr,1,4)-1],rs:!!p.rs,ht:p.ht,wt:p.wt,home:p.home};for(const k of ATTR_KEYS)e[k]=p[k];e.ovr=ovr99(p);return e})}]};
  const txt=JSON.stringify(out,null,1);let url='';try{url=URL.createObjectURL(new Blob([txt],{type:'application/json'}))}catch(e){}
  openModal(`<div class="eyebrow">Rosters &amp; logos</div><div class="h2">Export my roster</div><p class="note">${u.roster.length} players as a roster pack. Save the file, or copy the text (on iPhone: Copy, then paste into a note or the Files app).</p>
    <textarea id="rxOut" readonly>${esc(txt)}</textarea><div class="btns">${url?`<a class="btn light" id="rxDl" href="${url}" download="${esc(u.abbr.toLowerCase())}-roster-${LG.season}.json">Save file</a>`:''}<button class="btn ghost" id="rxCopy">Copy</button><button class="btn ghost" id="rxX">Done</button></div>`);
  on('rxX',()=>{closeModal();if(url)setTimeout(()=>URL.revokeObjectURL(url),1000)});
  on('rxCopy',()=>{const ta=$('#rxOut');const sel=()=>{ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);try{document.execCommand('copy');toast('Copied')}catch(e){toast('Select all and copy')}};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(ta.value).then(()=>toast('Copied'),sel);else sel()});
}
/* setup screen: the saved pack switch + the import button (rendered inside the League card) */
function packSetupHTML(st){
  const has=!!KV.get(PACK_KEY);
  return `<div class="setrow"><span class="eyebrow">Real rosters &amp; logos</span><span style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${has&&st.league==='ncaa'?`<span class="seg" id="packOnSeg">${[['1','On'],['0','Off']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${(KV.get(PACK_ON)!=='0')===(v==='1')}">${l}</button>`).join('')}</span>`:''}<button class="btn sm ghost" id="packImp">Import rosters &amp; logos</button></span></div>
    ${has&&st.league==='ncaa'&&packSavedOn()&&st.L.pack?`<p class="note">Using ${esc(st.L.pack.name)}: ${st.L.pack.teams} teams with imported rosters.</p>`:''}`;
}
function packSetupBind(st){
  on('packImp',()=>openRosterImport(st.L,r=>{if(r&&r.saved&&st.league==='ncaa'){st.L=genNCAALeague();packAutoApply(st.L)}renderSetupKeep()},{setup:true}));
  document.querySelectorAll('#packOnSeg button').forEach(b=>b.onclick=()=>{KV.set(PACK_ON,b.dataset.v);st.L=genNCAALeague();if(b.dataset.v==='1')packAutoApply(st.L);renderSetupKeep()});
}

/* ---------- logos ---------- */
const LOGO_CACHE=new Map();
const logosOn=()=>!(typeof LG!=='undefined'&&LG&&LG.settings&&LG.settings.showLogos===false);
const logoURL=(t,dark)=>{if(!t)return '';const u=dark?(t.logoDark||t.logo):(t.logo||t.logoDark);return safeURL(u)||''};
/* the loaded Image for a team's logo, or null (not loaded yet, failed, none, or logos off). Never throws, never retries a failure. */
function teamLogo(t,dark){
  try{if(!logosOn())return null;const u=logoURL(t,dark);if(!u)return null;let e=LOGO_CACHE.get(u);
    if(!e){const img=new Image();e={img,bad:false};img.decoding='async';try{img.referrerPolicy='no-referrer'}catch(_){}img.onerror=()=>{e.bad=true};img.src=u;LOGO_CACHE.set(u,e)}
    return !e.bad&&e.img.complete&&e.img.naturalWidth>0?e.img:null}catch(err){return null}
}
const teamLogoURL=(t,dark)=>logosOn()?logoURL(t,dark):'';
function logoHTML(t,size,cls){const u=teamLogoURL(t);if(!u)return '';size=size||28;return `<img class="tlogo ${cls||''}" src="${esc(u)}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'">`}

/* ---------- settings (registered after the whole script has run: SETTINGS_EXTRA lives in 04-hub.js) ---------- */
Promise.resolve().then(()=>{
SETTINGS_EXTRA.push({card:'Rosters & data',label:'Rosters pack',button:'Import rosters & logos',id:'impRosters',note:'Load a roster pack (.json) from Files or paste one: real rosters, custom players and team logos.',onClick:()=>openRosterImport(LG,()=>{saveNow();showHub('settings')})});
SETTINGS_EXTRA.push({card:'Rosters & data',key:'showLogos',label:'Show imported logos',opts:[[1,'On'],[0,'Off']],def:1,bool:true});
SETTINGS_EXTRA.push({card:'Rosters & data',label:'Your roster',button:'Export my roster (JSON)',id:'expRoster',onClick:()=>openRosterExport()});
SETTINGS_EXTRA.push({card:'Rosters & data',label:'Imported data',button:'Remove imported data',id:'rmPack',note:'New dynasties go back to generated rosters; this dynasty keeps its players and drops the imported logos.',
  onClick:()=>{KV.set(PACK_KEY,null);KV.set(PACK_ON,null);for(const t of LG.teams){delete t.logo;delete t.logoDark}delete LG.pack;saveNow();showHub('settings');toast('Imported data removed')}});
});

/* ---------- v1 team packs (moved from 02-data.js) ---------- */
function applyTeamPack(L,pack,opts){
  if(packIsV2(pack))return applyRosterPack(L,pack,opts);
  const list=Array.isArray(pack)?pack:pack&&pack.teams;if(!Array.isArray(list)||!list.length)throw new Error('not a pack');
  if(!Array.isArray(pack)&&Array.isArray(pack.conferences))pack.conferences.forEach((n,i)=>{if(L.confs[i])L.confs[i].name=String(n).slice(0,22)});
  const hex=/^#[0-9a-f]{6}$/i;
  list.slice(0,L.teams.length).forEach((e,i)=>{const t=L.teams[i];if(!t||!e)return;
    if(e.school)t.city=String(e.school).slice(0,24);if(e.mascot)t.name=String(e.mascot).slice(0,18);if(e.abbr)t.abbr=String(e.abbr).toUpperCase().slice(0,5);
    if(hex.test(e.primary||''))t.c1=e.primary;if(hex.test(e.secondary||''))t.c2=e.secondary;if(e.stadium)t.stadium=String(e.stadium).slice(0,34);
    const lg=safeURL(e.logo);if(lg){t.logo=lg;t.logoDark=safeURL(e.logoDark)||lg}
    const pr=parseInt(e.prestige);if(pr>=1&&pr<=5&&pr!==t.prestige){t.prestige=pr;t.q=1.1+pr*.62;
      if(opts&&opts.regen&&t.id!==L.user){t.roster=[];for(const pos of POS_ORDER)for(let k=0;k<POS_COUNTS[pos];k++)t.roster.push(genPlayer(pos,qOf(t)));assignNumbers(t)}}
    if(Array.isArray(e.roster)&&e.roster.length)t.roster=rosterFromPack(e.roster,t);
    t.dco=null;});
  invalidate();if(L.phase==='regular'&&L.week===0){resetRecords(L);buildSchedule(L)}updateRankings(L);
}
/* Roster entries: {name, pos, num?, yr? ('FR'..'SR' or 1-4), ovr? (1-5 stars), spd?, str?, cat?, thr?, acc?, tkl?, end?}
   Missing ratings are generated around the player's overall; open spots are filled with walk-ons. */
function rosterFromPack(list,t){
  const out=[];
  for(const e of list.slice(0,ROSTER_CAP)){if(!e||!e.name)continue;const pos=packPos(e.pos);if(!pos)continue;
    const q=parseFloat(e.ovr);const p=genPlayer(pos,q>=1&&q<=5?q:qOf(t));const nm=String(e.name).trim().split(/\s+/);p.first=nm.shift().slice(0,16);p.last=(nm.join(' ')||'').slice(0,20);
    const yr=typeof e.yr==='string'?['FR','SO','JR','SR'].indexOf(e.yr.toUpperCase().replace(/^RS\s*/,''))+1:parseInt(e.yr);if(yr>=1&&yr<=4)p.yr=yr;if(/^RS/i.test(String(e.yr||'')))p.rs=true;
    const n=parseInt(e.num);if(n>=0&&n<=99)p.num=n;for(const k of ATTR_KEYS){const v=parseFloat(e[k]);if(v>=1&&v<=5)p[k]=r1(v)}out.push(p)}
  for(const pos of POS_ORDER){let have=out.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){out.push(genPlayer(pos,qOf(t)-.5));have++}}
  assignNumbers({roster:out});return out;
}
