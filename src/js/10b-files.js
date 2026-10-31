/* =========================================================
   10b · Back up to Files / Restore from file
   A backup file is JSON: {format:'gridiron-live-backup', v:1, created, slots:[{slot, meta, save, live}]}, where save is the
   packed save exactly as the slot stores it and meta its title-screen card. In the iOS app the text goes to the shell
   (messageHandlers.export), which writes a temp file and opens the system export sheet (Files, iCloud Drive, On My iPhone);
   browsers download it. Restoring reads a file through <input type=file> (also works in WKWebView); a file holding a save
   code (GL3…) works too.
   ========================================================= */
const BACKUP_FMT='gridiron-live-backup';
const ymd=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
async function backupText(slots){
  await KV.need(slots.flatMap(n=>Saves.keys(n)));
  const m=Saves.meta(),out=[];
  for(const n of slots){const raw=KV.get('gl3.slot'+n);if(raw)out.push({slot:n,meta:m.slots[n]||null,save:raw,live:KV.get('gl3.live'+n)||null})}
  return out.length?JSON.stringify({format:BACKUP_FMT,v:1,app:'Gridiron Live',created:new Date().toISOString(),slots:out}):'';
}
/* hand a file to the user: native export sheet in the app, a download in browsers */
function saveTextFile(name,text){
  let h=null;try{h=window.webkit.messageHandlers.export}catch(e){}
  if(h){try{h.postMessage({name,data:text});return 'native'}catch(e){console.error(e)}}
  try{const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},5000);return 'download'}
  catch(e){console.error(e);return ''}
}
function openBackupFiles(){
  saveNow(true);const m=Saves.meta(),used=SLOTS.filter(n=>m.slots[n]),u=LG.teams[LG.user];
  openModal(`<div class="eyebrow">Back up to Files</div><div class="h2">Save a backup file</div>
    <p class="note">Keeps your dynasty safe outside the app: save it to iCloud Drive or On My iPhone. Restore it any time from the title screen or Settings › Saves, even on another phone.</p>
    <div class="btns"><button class="btn light" id="bkOne">This dynasty · ${esc(u.abbr)}</button>${used.length>1?`<button class="btn ghost" id="bkAll">All slots (${used.length})</button>`:''}<button class="btn ghost" id="bkX">Cancel</button></div><p class="note" id="bkMsg"></p>`);
  const go=async all=>{const msg=$('#bkMsg');msg.textContent='Preparing the file…';
    try{const text=await backupText(all?used:[SLOT]);if(!text)throw new Error('empty');
      const name=all?`GridironLive-all-slots-${ymd()}.json`:`GridironLive-${String(u.abbr).replace(/[^A-Za-z0-9]/g,'')||'dynasty'}-${LG.season}-${ymd()}.json`;
      const how=saveTextFile(name,text);if(!how)throw new Error('save');closeModal();toast(how==='native'?'Choose where to keep the backup':'Backup downloaded')}
    catch(e){console.error(e);msg.textContent='The backup could not be made. Try again, or use Export save code.'}};
  on('bkOne',()=>go(false));on('bkAll',()=>go(true));on('bkX',closeModal);
}
/* entries in a backup file (or a save code in a text file): [{slot, L, raw, live}] */
function parseBackup(text){
  text=String(text||'').replace(/^﻿/,'').trim();
  if(/^GL3/.test(text)){const L=Saves.importCode(text);if(!L||!Array.isArray(L.teams))throw new Error('code');return [{slot:null,L,raw:null,live:null}]}
  const j=JSON.parse(text);if(!j||j.format!==BACKUP_FMT||!Array.isArray(j.slots))throw new Error('format');
  const out=j.slots.filter(e=>e&&typeof e.save==='string'&&e.save).map(e=>{const L=migrate(unpack(e.save));if(!L||!Array.isArray(L.teams))throw new Error('save');
    return {slot:SLOTS.includes(+e.slot)?+e.slot:null,L,raw:e.save,live:typeof e.live==='string'?e.live:null}});
  if(!out.length)throw new Error('empty');return out;
}
/* write one entry into slot n; whatever was there becomes that slot's backup (Restore backup on the title screen undoes it) */
async function restoreEntry(e,n){
  await KV.need(Saves.keys(n).concat(['gl3.bak'+n]));
  const prev=KV.get('gl3.slot'+n);if(prev){KV.set('gl3.bak'+n,prev);KV.set('gl3.bakt'+n,String(Date.now()))}
  if(e.raw){let live=null;try{live=e.live?JSON.parse(e.live):null}catch(_){}live=live&&live.wk===e.L.week&&e.L.phase==='regular'?live:null;
    KV.set('gl3.slot'+n,e.raw);KV.set('gl3.live'+n,live?e.live:null);e.L.live=live;Saves.touch(n,e.L)}
  else Saves.save(n,e.L);
}
const entryLine=e=>{const u=e.L.teams[e.L.user]||{};return `${esc(teamName(u))} · ${esc(e.L.coach&&e.L.coach.name||'')} · ${esc(e.L.name||'')} · ${e.L.season}`};
/* pick a file, then a slot; done() runs after a restore (the title screen redraws, Settings goes back to it) */
function openRestoreFile(done){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json,.glsave,.txt,application/json,text/plain';inp.style.display='none';document.body.appendChild(inp);
  inp.onchange=()=>{const f=inp.files&&inp.files[0];inp.remove();if(!f)return;if(f.size>60e6)return toast('That file is too big to be a backup');
    const rd=new FileReader();rd.onerror=()=>toast('That file could not be read');
    rd.onload=()=>{let list;try{list=parseBackup(rd.result)}catch(e){console.error(e);openModal(`<div class="h2">Not a Gridiron Live backup</div><p class="note">Pick a file made with Back up to Files (or a text file holding a save code).</p><div class="btns"><button class="btn ghost" id="rfX">OK</button></div>`);on('rfX',closeModal);return}
      list.length===1?restorePick(list[0],done):restoreList(list,done)};
    rd.readAsText(f)};
  inp.click();
}
function restoreList(list,done){
  const m=Saves.meta(),hit=list.filter(e=>e.slot&&m.slots[e.slot]);
  openModal(`<div class="eyebrow">Restore from file</div><div class="h2">${list.length} dynasties in this backup</div>
    ${list.map((e,i)=>`<div class="setrow"><span class="note" style="margin:0">${e.slot?`Slot ${e.slot} · `:''}${entryLine(e)}</span><button class="btn sm ghost" id="rfOne-${i}">Restore…</button></div>`).join('')}
    <p class="note">${hit.length?`<b style="color:#FF8A96">Restore all replaces slot${hit.length>1?'s':''} ${hit.map(e=>e.slot).join(', ')}.</b> Each replaced dynasty is kept as that slot's backup.`:'Restore all puts each dynasty back in its own slot.'}</p>
    <div class="btns"><button class="btn light" id="rfAll">Restore all</button><button class="btn ghost" id="rfX">Cancel</button></div>`);
  list.forEach((e,i)=>on('rfOne-'+i,()=>restorePick(e,done)));on('rfX',closeModal);
  on('rfAll',async()=>{const free=SLOTS.filter(n=>!m.slots[n]&&!list.some(e=>e.slot===n));
    for(const e of list){const n=e.slot||free.shift();if(n)await restoreEntry(e,n)}closeModal();toast('Backup restored');done&&done()});
}
function restorePick(e,done){
  const m=Saves.meta();let slot=e.slot&&!m.slots[e.slot]?e.slot:SLOTS.find(n=>!m.slots[n])||e.slot||SLOTS[0];
  openModal(`<div class="eyebrow">Restore from file</div><div class="h2">${entryLine(e)}</div>
    <div class="setrow"><span class="eyebrow">Into slot</span><div class="seg" id="rfSlot">${SLOTS.map(n=>`<button data-v="${n}" class="${m.slots[n]?'full':''}" aria-label="Slot ${n}${m.slots[n]?', in use':', empty'}">${n}</button>`).join('')}</div></div>
    <p class="note" id="rfTo"></p><div class="btns"><button class="btn light" id="rfGo">Restore</button><button class="btn ghost" id="rfX">Cancel</button></div>`);
  const pick=v=>{slot=v;document.querySelectorAll('#rfSlot button').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.v===v));const s=m.slots[v];
    $('#rfTo').innerHTML=s?`<b style="color:#FF8A96">Replaces slot ${v}:</b> ${esc(s.team)} · ${esc(s.coach)} · ${esc(s.name)}. It is kept as that slot's backup.`:`Slot ${v} is empty.`};
  document.querySelectorAll('#rfSlot button').forEach(b=>b.onclick=()=>pick(+b.dataset.v));pick(slot);on('rfX',closeModal);
  on('rfGo',async()=>{const b=$('#rfGo');b.disabled=true;b.textContent='Restoring…';try{await restoreEntry(e,slot);closeModal();toast(`Restored into slot ${slot}`);done&&done()}catch(err){console.error(err);b.disabled=false;b.textContent='Restore';toast('That backup could not be restored')}});
}
