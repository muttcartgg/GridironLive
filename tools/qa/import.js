/* Imports a roster pack through the real UI (setup screen → Import rosters & logos → file picker), checks calibration,
   rosters and logo links, then plays a smoke game and sims a season with the imported rosters.
   NODE_PATH=$(npm root -g) node tools/qa/import.js [pack.json] [web/index.html] [shots-outdir]
   default pack: /home/claude/packs/gridiron-live-2026-rosters.json                                          */
const Q=require('./_boot');const fs=require('fs');const path=require('path');const {spawnSync}=require('child_process');
const PACK=process.argv[2]||'/home/claude/packs/gridiron-live-2026-rosters.json';
/* child mode: run smoke.js / season.js with the pack saved for new dynasties before the dynasty starts */
if(process.argv[3]==='--run'){
  const txt=fs.readFileSync(PACK,'utf8');const orig=Q.startDynasty,origPage=Q.newPage;
  /* logo images come from the ESPN CDN; offline (like this sandbox) they fail to load and the badges fall back, which is expected */
  Q.newPage=async(b,w,h,errs,dpr)=>{const push=errs.push.bind(errs);errs.push=(...a)=>push(...a.filter(m=>!/Failed to load resource: net::/.test(m)));return origPage(b,w,h,errs,dpr)};
  Q.startDynasty=async(p,abbr)=>{await p.waitForSelector('#slotNew-1',{timeout:15000});await p.evaluate(t=>{packSave(JSON.parse(t))},txt);return orig(p,abbr)};
  const target=process.argv[4]||'./smoke.js';
  process.argv=[process.argv[0],process.argv[1],process.argv[5]||'web/index.html',process.argv[6]||'ALA'];
  require(target);
  return;
}
(async()=>{
const PAGE=process.argv[3]||'web/index.html',OUT=process.argv[4]||'';
const b=await Q.launch();const errs=[];let netFail=0;{const push=errs.push.bind(errs);errs.push=(...a)=>push(...a.filter(m=>{const n=/Failed to load resource: net::/.test(m);if(n)netFail++;return !n}))}
const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(PAGE));await p.waitForTimeout(OUT?2600:400);
const dist=()=>{const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1]};const r={};for(const d of ['FBS','FCS']){const v=SETUP.L.teams.filter(t=>t.div===d).map(teamOvr);r[d]={top:+Math.max(...v).toFixed(3),median:+med(v).toFixed(3),top99:tOvr99(Math.max(...v)),med99:tOvr99(med(v))}}return r};
await p.click('#slotNew-1');await p.waitForTimeout(200);
const before=await p.evaluate(dist);
/* the real import path: setup screen button → file picker → preview → Import */
await p.click('#packImp');await p.waitForSelector('#riFile',{state:'attached'});
const t0=Date.now();await p.setInputFiles('#riFile',PACK);await p.waitForSelector('#riGo',{timeout:30000});const tPrev=Date.now()-t0;
const prev=await p.evaluate(()=>document.querySelector('.ri-prev').innerText.replace(/\s+/g,' '));
if(OUT){fs.mkdirSync(OUT,{recursive:true});await p.screenshot({path:path.join(OUT,'L-import-modal.png')})}
const t1=Date.now();await p.click('#riGo');await p.waitForFunction(()=>document.querySelector('#modal').hidden,null,{timeout:60000});const tImp=Date.now()-t1;
const after=await p.evaluate(dist);
/* timings of the pieces (desktop; a phone is ~3-5x slower) */
const perf=await p.evaluate(async t=>{const a=performance.now();const pk=JSON.parse(t);const b=performance.now();const L=genNCAALeague();const c=performance.now();const s=applyRosterPack(L,pk,{});const d=performance.now();
  const L2=genNCAALeague();const e=performance.now();packAutoApply(L2);const f=performance.now();
  return {parseMs:Math.round(b-a),applyFullMs:Math.round(d-c),autoApplyMs:Math.round(f-e),summary:{teams:s.teams,players:s.players,logos:s.logos,miss:s.miss.length},savedKB:Math.round((KV.get('gl.pack')||'').length/1024)}},fs.readFileSync(PACK,'utf8'));
/* start a dynasty at Alabama from the (auto-applied) setup league */
await p.evaluate(()=>{const t=SETUP.L.teams.find(t=>t.abbr==='ALA');openTeamDetail(t.id)});await p.waitForTimeout(150);
if(OUT)await p.screenshot({path:path.join(OUT,'L-team-detail.png')});
await p.click('#coachHere');await p.waitForTimeout(300);
await p.evaluate(()=>{for(let i=0;i<5;i++){const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else closeModal()}}});
const rep=await p.evaluate(()=>{const out={};for(const ab of ['ALA','OSU','UGA','TEX','ORE','ND','NDSU']){const t=LG.teams.find(x=>x.abbr===ab);if(!t){out[ab]='missing';continue}
    out[ab]={teamOvr:+teamOvr(t).toFixed(3),ovr99:tOvr99(teamOvr(t)),roster:t.roster.length,real:t.roster.filter(p=>p.real).length,logo:t.logo||null,stadium:t.stadium,
      top5:t.roster.slice().sort((a,b)=>ovr99(b)-ovr99(a)||ovr(b)-ovr(a)).slice(0,5).map(p=>`${p.pos} ${fullName(p)} #${p.num} ${yrStr(p)} ${ovr99(p)}`)}}
  const withLogo=LG.teams.filter(t=>/^https:\/\//.test(t.logo||'')).length;const sample=['ALA','OSU','UGA','TEX','ORE','ND','MICH','LSU','USC','PSU','CLEM','MIA','NDSU','MONT'].map(ab=>LG.teams.find(t=>t.abbr===ab)).filter(Boolean);
  const bad=sample.filter(t=>!/^https:\/\/a\.espncdn\.com\//.test(t.logo||''));
  const caps=LG.teams.filter(t=>t.roster.length>ROSTER_CAP||POS_ORDER.some(pos=>t.roster.filter(p=>p.pos===pos).length<POS_COUNTS[pos])).map(t=>t.abbr);
  const fields=LG.teams[0].roster.every(p=>ATTR_KEYS.every(k=>typeof p[k]==='number'&&p[k]>=1&&p[k]<=5)&&p.ss&&p.id&&p.ht&&p.wt);
  return {teams:out,logos:{teamsWithHttpsLogo:withLogo,sampleChecked:sample.length,sampleBad:bad.map(t=>t.abbr)},rosterRuleViolations:caps,allFieldsOk:fields,pack:LG.pack}});
/* screenshots: the CDN is unreachable here, so stand-in data: URI marks (a plain circle with the abbreviation, not a logo) show where logos render */
if(OUT){await p.evaluate(()=>{for(const t of LG.teams){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="${t.c1}" stroke="${t.c2}" stroke-width="5"/><text x="32" y="39" font-family="Arial" font-weight="900" font-size="${t.abbr.length>3?15:19}" text-anchor="middle" fill="${inkOn(t.c1)}">${t.abbr}</text></svg>`;t.logo=t.logoDark='data:image/svg+xml,'+encodeURIComponent(svg)}});
  await p.evaluate(()=>showHub('home'));await p.waitForTimeout(1500);await p.screenshot({path:path.join(OUT,'L-hub.png')});await p.evaluate(()=>showHub('league'));await p.waitForTimeout(1200);await p.screenshot({path:path.join(OUT,'L-league.png')});
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>showHub('home'));await p.waitForTimeout(1200);await p.screenshot({path:path.join(OUT,'P-hub.png')});
  await p.evaluate(()=>{const u=T(LG.user),o=LG.teams.find(t=>t.abbr==='UGA');S.home=u;S.away=o;S.score=[14,10];S.to=[3,2];S.q=2;S.clock=402;S.poss='home';$('#sb').hidden=false;hud()});await p.waitForTimeout(400);await p.screenshot({path:path.join(OUT,'P-scorebug.png'),clip:{x:0,y:0,width:390,height:140}});await p.evaluate(()=>{$('#sb').hidden=true;S.home=null});
  await p.evaluate(()=>{showHub('settings');const b=document.querySelector('#sx-impRosters');if(b)b.click()});await p.waitForTimeout(300);await p.setInputFiles('#riFile',PACK);await p.waitForSelector('#riGo',{timeout:30000});await p.screenshot({path:path.join(OUT,'P-import-modal.png')});await p.evaluate(()=>closeModal())}
console.log('PREVIEW',prev,`(${tPrev} ms to read+preview, ${tImp} ms to import+save+rebuild)`);
console.log('PERF',JSON.stringify(perf));
console.log('TEAMOVR before (generated)',JSON.stringify(before));
console.log('TEAMOVR after  (imported) ',JSON.stringify(after));
for(const [ab,v] of Object.entries(rep.teams))console.log(ab.padEnd(5),typeof v==='string'?v:`teamOvr ${v.teamOvr} (${v.ovr99}) roster ${v.roster} real ${v.real} | ${v.stadium} | ${v.logo}\n      ${v.top5.join(' · ')}`);
console.log('LOGOS',JSON.stringify(rep.logos),'ROSTER RULES',rep.rosterRuleViolations.length?rep.rosterRuleViolations:'ok','FIELDS',rep.allFieldsOk?'ok':'MISSING','PACK',JSON.stringify(rep.pack));
const fail=errs.length||rep.logos.sampleBad.length||rep.rosterRuleViolations.length||!rep.allFieldsOk;
if(netFail)console.log(`(${netFail} logo requests could not reach the CDN from this machine; badges fell back to abbreviations)`);
console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();
if(process.env.SKIP_PLAY){process.exit(fail?1:0)}
let code=fail?1:0;
for(const s of ['smoke.js','season.js']){console.log('---- '+s+' with imported rosters (ALA)');const r=spawnSync(process.execPath,[__filename,PACK,'--run','./'+s,PAGE,'ALA'],{stdio:'inherit',env:process.env});if(r.status)code=1}
process.exit(code)})();
