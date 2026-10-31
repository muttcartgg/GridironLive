/* Five save slots + real player photos.
   Creates dynasties in slots 1, 4 and 5 (5 with the roster pack), renames 4, reloads the page and loads 4 and 5, checks that
   slot 1's save is untouched, restores a backup in 5, imports 5's save code into 4 (replace) and deletes 4. Then checks the
   headshot links on the roster and player sheet with a stand-in image served for the ESPN CDN (unreachable here) and the
   generated fallback when the image fails, plus the 'Show real player photos' setting.
   NODE_PATH=$(npm root -g) node tools/qa/slots.js [web/index.html] [shots-outdir] [pack.json]                         */
const Q=require('./_boot');const fs=require('fs');const path=require('path');
const PAGE=process.argv[2]||'web/index.html',OUT=process.argv[3]||'',PACK=process.argv[4]||'/home/claude/packs/gridiron-live-2026-rosters.json';
const HEAD=/^https:\/\/a\.espncdn\.com\/i\/headshots\/college-football\/players\/full\/(\d+)\.png$/;
(async()=>{
const b=await Q.launch();const errs=[],fails=[];let netFail=0;{const push=errs.push.bind(errs);errs.push=(...a)=>push(...a.filter(m=>{const n=/Failed to load resource: net::/.test(m);if(n)netFail++;return !n}))}
const ok=(c,m)=>{if(!c)fails.push(m);console.log((c?'ok   ':'FAIL ')+m)};
/* stand-in headshot: a drawn head-and-shoulders on a transparent 350x254 PNG (ESPN's headshot size), not a real photo */
const pg0=await b.newPage({viewport:{width:350,height:254}});
await pg0.setContent(`<body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="350" height="254" viewBox="0 0 350 254"><path d="M70 254c4-58 46-86 105-86s101 28 105 86z" fill="#B8343F"/><path d="M150 170h50l-25 34z" fill="#fff"/><rect x="155" y="128" width="40" height="46" rx="14" fill="#8A5A3C"/><ellipse cx="175" cy="96" rx="40" ry="48" fill="#9C6A48"/><path d="M135 86c2-34 22-50 40-50s38 16 40 50c-10-14-24-20-40-20s-30 6-40 20z" fill="#2A1C14"/></svg></body>`);
const STAND=await pg0.screenshot({omitBackground:true});await pg0.close();
const p=await Q.newPage(b,390,844,errs);
let mode='stand',heads=[];
await p.route(/a\.espncdn\.com\/i\/headshots\//,r=>{heads.push(r.request().url());return mode==='stand'?r.fulfill({status:200,contentType:'image/png',body:STAND}):r.abort('internetdisconnected')});
await p.goto(Q.pageURL(PAGE));await p.waitForSelector('#slotNew-5',{timeout:15000});
const title=async()=>p.evaluate(()=>({cards:[...document.querySelectorAll('#setup .slots>.slot')].map(e=>e.classList.contains('full')?'full':'empty'),cnt:(document.querySelector('.ttl-cnt')||{}).textContent}));
let t=await title();ok(t.cards.length===5&&t.cards.every(c=>c==='empty'),`title shows five empty slots (${t.cards})`);
/* a new dynasty in slot n coaching abbr, landing on the hub */
const start=async(n,abbr)=>{await p.click('#slotNew-'+n);await p.waitForTimeout(150);
  await p.evaluate(a=>{const t=SETUP.L.teams.find(t=>t.abbr===a)||SETUP.L.teams[0];openTeamDetail(t.id)},abbr);await p.waitForTimeout(150);await p.click('#coachHere');await p.waitForTimeout(300);
  await p.evaluate(()=>{for(let i=0;i<5;i++){const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else closeModal()}}});
  return p.evaluate(()=>({slot:SLOT,abbr:T(LG.user).abbr}))};
const toTitle=async()=>{await p.evaluate(()=>{closeModal();showHub('settings')});await p.click('#toSlots');await p.waitForSelector('#slotNew-2')};
let r=await start(1,'UGA');ok(r.slot===1&&r.abbr==='UGA','dynasty in slot 1 (UGA)');
await toTitle();const raw1=await p.evaluate(()=>KV.get('gl3.slot1')),meta1=await p.evaluate(()=>JSON.stringify(Saves.meta().slots[1]));
r=await start(4,'TEX');ok(r.slot===4&&r.abbr==='TEX','dynasty in slot 4 (TEX)');
await p.evaluate(()=>showHub('settings'));await p.fill('#dynRename','Slot Four Saga');await p.dispatchEvent('#dynRename','change');
await p.evaluate(()=>{const a=document.querySelector('#advWeek');showHub('home');const b=document.querySelector('#advWeek');if(b)b.click()});await p.waitForTimeout(300);
const s4=await p.evaluate(()=>{closeModal();saveNow(true);return {name:LG.name,week:LG.week,season:LG.season}});ok(s4.name==='Slot Four Saga','slot 4 renamed in settings');
await toTitle();
/* slot 5: roster pack saved for new dynasties, so the league starts with the imported (ESPN id) players */
await p.evaluate(t=>packSave(JSON.parse(t)),fs.readFileSync(PACK,'utf8'));
r=await start(5,'ALA');ok(r.slot===5&&r.abbr==='ALA','dynasty in slot 5 (ALA, imported rosters)');
const ids5=await p.evaluate(()=>{const u=T(LG.user);return {n:u.roster.length,ids:u.roster.filter(p=>/^\d+$/.test(p.espnId||'')).length,all:LG.teams.reduce((s,t)=>s+t.roster.filter(p=>p.espnId).length,0)}});
ok(ids5.ids>=ids5.n*.9,`imported players keep ESPN ids (${ids5.ids}/${ids5.n} on ALA, ${ids5.all} league-wide)`);
await p.evaluate(()=>{saveNow(true);LG.credits+=1;saveNow(true)});   // second save backs up the first
await toTitle();
t=await title();ok(t.cards.join()==='full,empty,empty,full,full'&&/3 of 5/.test(t.cnt),`title after creating: ${t.cards} · "${t.cnt}"`);
ok(await p.evaluate(()=>KV.get('gl3.slot1'))===raw1,'slot 1 save untouched by slots 4 and 5');
/* reload the page and load slots 4 and 5 */
await p.reload();await p.waitForSelector('#slotGo-5',{timeout:15000});
t=await title();ok(t.cards.join()==='full,empty,empty,full,full','after reload: slots 1, 4, 5 are full');
if(OUT){fs.mkdirSync(OUT,{recursive:true});await p.waitForTimeout(2600);/* the splash covers the first 2.2 s */await p.screenshot({path:path.join(OUT,'P-title.png')});
  await p.evaluate(()=>{const s=document.querySelector('#setup .scroll');s.scrollTop=s.scrollHeight});await p.waitForTimeout(200);await p.screenshot({path:path.join(OUT,'P-title-end.png')});
  await p.setViewportSize({width:844,height:390});await p.evaluate(()=>{const s=document.querySelector('#setup .scroll');s.scrollTop=0});await p.waitForTimeout(300);await p.screenshot({path:path.join(OUT,'L-title.png')});
  await p.evaluate(()=>{const s=document.querySelector('#setup .scroll');s.scrollTop=s.scrollHeight});await p.waitForTimeout(200);await p.screenshot({path:path.join(OUT,'L-title-end.png')});await p.setViewportSize({width:390,height:844})}
await p.click('#slotGo-4');await p.waitForTimeout(300);
let L=await p.evaluate(()=>({slot:SLOT,name:LG.name,abbr:T(LG.user).abbr,week:LG.week,season:LG.season}));
ok(L.slot===4&&L.name==='Slot Four Saga'&&L.abbr==='TEX'&&L.week===s4.week,`slot 4 loads after reload (${JSON.stringify(L)})`);
await toTitle();await p.click('#slotGo-5');await p.waitForTimeout(300);
L=await p.evaluate(()=>({slot:SLOT,abbr:T(LG.user).abbr,ids:T(LG.user).roster.filter(p=>p.espnId).length}));
ok(L.slot===5&&L.abbr==='ALA'&&L.ids===ids5.ids,`slot 5 loads after reload with ESPN ids intact (${L.ids})`);
const code5=await p.evaluate(()=>Saves.exportCode(LG));

/* photos: roster rows and the player sheet, stand-in image first */
await p.evaluate(()=>showHub('team'));await p.waitForTimeout(900);
const ros=await p.evaluate(()=>{const im=[...document.querySelectorAll('#hub .rrow .pph img')];return {rows:document.querySelectorAll('#hub .rrow').length,av:document.querySelectorAll('#hub .rrow .pph').length,img:im.length,
  src:im[0]&&im[0].src,lazy:im.every(i=>i.loading==='lazy'),ref:im.every(i=>i.referrerPolicy==='no-referrer'),cors:im.some(i=>i.hasAttribute('crossorigin')),ok:document.querySelectorAll('#hub .rrow .pph.ok').length}});
ok(ros.av===ros.rows&&ros.img>=ros.rows*.9,`roster: ${ros.av} avatars on ${ros.rows} rows, ${ros.img} headshot links`);
ok(HEAD.test(ros.src||'')&&ros.lazy&&ros.ref&&!ros.cors,`headshot <img>: ESPN URL, loading=lazy, no-referrer, no crossorigin (${ros.src})`);
ok(ros.ok>0,`stand-in headshots loaded on the visible rows (${ros.ok})`);
if(OUT){await p.evaluate(()=>{const r=document.querySelector('#hub .rrow');r&&r.scrollIntoView({block:'center'})});await p.waitForTimeout(300);await p.screenshot({path:path.join(OUT,'P-roster.png')})}
const qb=await p.evaluate(()=>{const u=T(LG.user),q=depth(u,'QB')[0];return {id:q.id,eid:q.espnId,name:fullName(q)}});
await p.evaluate(id=>openPlayer(id),qb.id);await p.waitForFunction(()=>document.querySelector('#modal .pl-hd .pph.ok'),null,{timeout:5000}).catch(()=>{});
const sh=await p.evaluate(()=>{const e=document.querySelector('#modal .pl-hd .pph');return e&&{ok:e.classList.contains('ok'),src:(e.querySelector('img')||{}).src}});
ok(sh&&sh.ok&&sh.src.endsWith('/'+qb.eid+'.png'),`player sheet shows ${qb.name}'s headshot (${sh&&sh.src})`);
if(OUT){await p.waitForTimeout(300);await p.screenshot({path:path.join(OUT,'P-player-photo.png')})}
/* image fails (offline / no headshot): the generated avatar stays */
mode='fail';await p.evaluate(()=>closeModal());
/* a player whose headshot was never requested (the browser would answer a requested one from its cache) */
const wr=await p.evaluate(seen=>{const u=T(LG.user),w=u.roster.slice().reverse().find(p=>p.espnId&&!seen.some(s=>s.endsWith('/'+p.espnId+'.png')));return {id:w.id,name:fullName(w)}},heads);
await p.evaluate(id=>openPlayer(id),wr.id);await p.waitForFunction(()=>{const e=document.querySelector('#modal .pl-hd .pph');return e&&!e.querySelector('img')},null,{timeout:5000}).catch(()=>{});
const fb=await p.evaluate(()=>{const e=document.querySelector('#modal .pl-hd .pph');return e&&{img:!!e.querySelector('img'),ok:e.classList.contains('ok'),num:(e.querySelector('.pph-n')||{}).textContent,sil:getComputedStyle(e.querySelector('.pph-sil')).display}});
ok(fb&&!fb.img&&!fb.ok&&fb.num!==''&&fb.sil!=='none',`failed headshot falls back to the avatar (#${fb&&fb.num})`);
if(OUT){await p.waitForTimeout(200);await p.screenshot({path:path.join(OUT,'P-player-fallback.png')})}
/* generated player (no ESPN id): avatar only, no request */
const gen=await p.evaluate(()=>{const g=genPlayer('RB',3);g.num=27;return photoHTML(g,40,'',T(LG.user))});ok(!/<img/.test(gen)&&/pph-n">27</.test(gen),'generated player gets the number avatar, no image link');
/* setting off: no links at all */
const off=await p.evaluate(()=>{LG.settings.showPhotos=false;const q=depth(T(LG.user),'QB')[0],h=photoHTML(q,40,'',T(LG.user)),u=playerPhoto(q);LG.settings.showPhotos=true;return {h,u}});
ok(!/<img/.test(off.h)&&off.u==='','"Show real player photos" off: no headshot links');
const setRow=await p.evaluate(()=>{closeModal();showHub('settings');const e=document.querySelector('#sx-showPhotos');return e&&e.closest('.card').querySelector('.h2').textContent});
ok(setRow==='Rosters & data','setting sits in the Rosters & data card');
/* lower third, studio top performers and awards use the same links */
const misc=await p.evaluate(()=>{const u=T(LG.user),q=depth(u,'QB')[0],el=document.querySelector('#lower');BC.lowerNum(el,q,q.num);const lo=el.querySelector('.num img');
  const a=seasonAwards(LG),x=a.tro[0];return {lower:lo&&lo.src,lowerNum:el.querySelector('.num span').textContent,tro:x&&x.e,award:awardsHTML({season:LG.season,...a,allAm:a.aa1,heisman:null,coy:LG.user}).match(/headshots[^"]+/g)?.length||0}});
ok(HEAD.test(misc.lower||'')&&misc.lowerNum!=='','lower third gets the headshot over the number');ok(misc.tro>0&&misc.award>20,`award entries carry the ESPN id (e=${misc.tro}); awards screen links ${misc.award} photos`);
if(OUT){mode='stand';await p.evaluate(()=>{const a=seasonAwards(LG),u=T(LG.user),q=depth(u,'QB')[0];
    const h={season:LG.season,pid:q.id,name:fullName(q),pos:q.pos,team:u.id,line:statLine(q),e:+q.espnId,finalists:heismanTop(LG,4).map(x=>({pid:x.p.id,name:fullName(x.p),team:x.t.id,pos:x.p.pos,pts:1200,e:+x.p.espnId||undefined}))};
    openModal(awardsHTML({season:LG.season,...a,allAm:a.aa1,heisman:h,coy:LG.user})+'<button class="btn light wide" id="awX">Done</button>',true)});
  await p.waitForTimeout(900);await p.screenshot({path:path.join(OUT,'P-awards.png')});await p.evaluate(()=>closeModal());mode='fail'}
/* backups, save codes and delete on slots 4 and 5 */
await p.evaluate(()=>{showHub('settings')});await p.click('#toSlots');await p.waitForSelector('#slotBak-5',{timeout:5000}).catch(()=>{});
ok(!!(await p.$('#slotBak-5')),'slot 5 offers its backup');
await p.click('#slotBak-5');await p.click('#bakYes');await p.waitForTimeout(300);
ok(await p.evaluate(()=>{const L=Saves.load(5);return !!L&&L.teams[L.user].abbr==='ALA'}),'slot 5 backup restored and loads');
await p.click('#importCode');await p.fill('#codeIn',code5);await p.click('#codeSlot button[data-v="4"]');
const to=await p.evaluate(()=>document.querySelector('#codeTo').textContent);ok(/Replaces slot 4/.test(to),`import picker warns before replacing slot 4 ("${to}")`);
await p.click('#codeGo');await p.waitForTimeout(400);
L=await p.evaluate(()=>{const L=Saves.load(4);return L&&{abbr:L.teams[L.user].abbr,ids:L.teams[L.user].roster.filter(p=>p.espnId).length,meta:Saves.meta().slots[4].abbr}});
ok(L&&L.abbr==='ALA'&&L.meta==='ALA'&&L.ids===ids5.ids,`slot 5's save code imported into slot 4 (${JSON.stringify(L)})`);
await p.click('#slotDel-4');await p.click('#slotYes-4');await p.waitForTimeout(200);
const del=await p.evaluate(()=>({meta:Saves.meta().slots[4]||null,raw:KV.get('gl3.slot4'),bak:KV.get('gl3.bak4'),card:document.querySelector('#slotNew-4')?'empty':'full'}));
ok(!del.meta&&!del.raw&&!del.bak&&del.card==='empty','slot 4 deleted (save, backup and meta)');
ok(await p.evaluate(()=>KV.get('gl3.slot1'))===raw1&&await p.evaluate(()=>JSON.stringify(Saves.meta().slots[1]))===meta1,'slot 1 save and card unchanged at the end');
const kb=await p.evaluate(()=>Object.fromEntries([1,4,5].map(n=>[n,Math.round((KV.get('gl3.slot'+n)||'').length/1024)])));console.log('SAVE KB',JSON.stringify(kb),'headshot requests',heads.length);
if(netFail)console.log(`(${netFail} team-logo requests could not reach the CDN from this machine; badges fell back to abbreviations)`);
console.log('FAILED',fails.length?fails:'none');console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length||fails.length?1:0)})();
