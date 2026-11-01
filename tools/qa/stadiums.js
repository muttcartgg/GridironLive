/* Real stadium designs: imports a stadiums file through the real UI (Settings › Rosters & data), checks the matching, the saved
   copy for new dynasties and the setting, then screenshots very different stadiums at presnap (landscape + portrait) and in the
   kick view, and times the stadium layer (drawStands + drawEndStands) at DPR 3 with 4x CPU throttling.
   NODE_PATH=$(npm root -g) node tools/qa/stadiums.js [stadiums.json] [web/index.html] [outdir]
   TEAMS=MICH,UW,... picks the stadiums (default: a huge bowl, a horseshoe on a lake, a dome, mountains, a small sideline-only
   stadium, hedges). */
const Q=require('./_boot');const fs=require('fs');
const FILE=process.argv[2]||'/home/claude/packs/gridiron-live-2026-stadiums.json',PAGE=process.argv[3]||'web/index.html',OUT=process.argv[4]||'/tmp/gl-stadiums';
const PICK=(process.env.TEAMS||'MICH,UW,SYR,UTAH,KENN,UGA').split(',');
const toCall=p=>p.evaluate(async()=>{const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
  for(let n=0;n<6000;n++){
    if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();await new Promise(r=>setTimeout(r,60));continue}
    if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click();await new Promise(r=>setTimeout(r,60));continue}
    if(vis('#card')){const c=document.querySelector('#card button');if(c)c.click()}
    if(S.phase==='over')return 'over';
    if(S.phase==='presnap'&&uOff()&&vis('#call'))return 'call';
    if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="sim"]');if(a)a.click()}
    if(S.phase==='kick'&&kick){kick.ang=0;if(kick.stage==='aim')kickTap();else if(kick.stage==='power'){kick.pow=.97;kickTap()}}
    await new Promise(r=>setTimeout(r,16))}return 'timeout'});
/* make team `a` the host (the user's team plays at home, anyone else hosts the user) and rebuild the stadium + field */
const host=(p,a)=>p.evaluate(a=>{const t=LG.teams.find(x=>x.abbr===a);if(t===S.home)S.userHome=true;else{S.away=t;S.userHome=false}S.neutral=false;STAD.key='';FLD.key='';return {abbr:a,std:t.std,stadium:t.stadium}},a);
(async()=>{fs.mkdirSync(OUT,{recursive:true});const b=await Q.launch();const errs=[];
const p=await Q.newPage(b,844,390,errs,2);await p.goto(Q.pageURL(PAGE));await Q.startDynasty(p,'UGA');
await p.evaluate(()=>{LG.settings.pregame=false;LG.settings.halftime=false});
/* import through Settings › Rosters & data */
await p.evaluate(()=>{showHub('settings');document.querySelector('#sx-impRosters').click()});await p.waitForSelector('#riFile',{state:'attached'});
await p.setInputFiles('#riFile',FILE);await p.waitForSelector('#riGo',{timeout:30000});
const prev=await p.evaluate(()=>document.querySelector('.ri-prev').innerText.replace(/\s+/g,' '));await p.screenshot({path:`${OUT}/L-import.png`});
await p.click('#riGo');await p.waitForFunction(()=>document.querySelector('#modal').hidden,null,{timeout:30000});await p.waitForTimeout(300);
const setting=await p.evaluate(()=>{const e=document.querySelector('#sx-realStadiums');return e?e.innerText.replace(/\s+/g,' '):'missing'});await p.screenshot({path:`${OUT}/L-settings.png`});
const rep=await p.evaluate(()=>{const fbs=LG.teams.filter(t=>t.div==='FBS');return {fbs:fbs.length,withStd:fbs.filter(t=>t.std).length,fcsWithStd:LG.teams.filter(t=>t.div!=='FBS'&&t.std).length,saved:stdSavedOn(),
  newDynasty:(()=>{const L=genNCAALeague();packAutoApply(L);return L.teams.filter(t=>t.std).length})(),
  savesStd:(()=>{const u=JSON.parse(JSON.stringify(LG.teams.find(t=>t.abbr==='MICH')));return !!u.std})(),
  sample:['MICH','UW','SYR','UTAH','KENN','UGA','BOIS','CLEM','TENN','OSU'].map(a=>{const t=LG.teams.find(x=>x.abbr===a);return `${a} ${t.stadium} (${t.cap}) ${JSON.stringify(t.std)}`})}});
/* to a presnap snap in the user's game */
await p.evaluate(()=>showHub('home'));await p.waitForTimeout(200);await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(1200);
if(await toCall(p)!=='call')throw new Error('no play call');
await p.evaluate(()=>pickPlay(PLAYBOOK.find(x=>x.cat==='pass'&&!x.hail)||PLAYBOOK[0]));await p.waitForTimeout(600);
/* QA camera: freeze the spring and frame the far stands (top of the allowed view) at a given yard line */
const PINF=()=>{window.__pin=null;const orig=camDamp;camDamp=function(k,t,st,dt){if(window.__pin&&k in window.__pin){cam[k]=window.__pin[k];cam[k+'v']=0;return}return orig(k,t,st,dt)};
  window.pinCam=(x,z,wide)=>{cam.z=z;const s=sc*z*zoomMul(),vh=(H-topY)/(s*VY),y=wide?-6-(H*.6-midY())/(s*VY):-11+vh/2;window.__pin={x,y,z};cam.x=x;cam.y=y}};
await p.evaluate(PINF);
await p.evaluate(()=>{$('#call').hidden=true});
const shots=[];
for(const [w,h,tag] of [[844,390,'L'],[390,844,'P']]){await p.setViewportSize({width:w,height:h});await p.evaluate(()=>resize());
  for(const a of PICK){const i=await host(p,a);
    /* near the left end zone, then mid-field (the camera follows the ball between plays) */
    for(const [x,z,wide,nm] of [[14,.42,1,'wide-a'],[106,.42,1,'wide-b'],[10,.8,0,'game']]){await p.evaluate(([x,z,w])=>{pinCam(x,z,w)},[x,z,wide]);await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${tag}-${a}-${nm}.png`})}
    if(tag==='L'){await p.evaluate(()=>{startKick(32,'fg')});await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/K-${a}.png`});
      await p.evaluate(()=>{$('#kick').hidden=true;kick=null;S.phase='presnap';hint('')})}
    shots.push(`${tag} ${a}: ${i.stadium}`)}}
/* generic stadium still drawn with the setting off */
await p.setViewportSize({width:844,height:390});await p.evaluate(()=>{resize();LG.settings.realStadiums=false;STAD.key='';FLD.key=''});await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/L-generic-off.png`});
const offStd=await p.evaluate(()=>!!STAD.sd);await p.evaluate(()=>{LG.settings.realStadiums=true;STAD.key='';FLD.key=''});
/* performance: the stadium layer at DPR 3 with 4x CPU throttling */
const pp=await Q.newPage(b,844,390,errs,3);await pp.goto(Q.pageURL(PAGE));await Q.startDynasty(pp,'UGA');await pp.evaluate(t=>{applyStadiums(LG,JSON.parse(t).stadiums);LG.settings.pregame=false},fs.readFileSync(FILE,'utf8'));
await pp.evaluate(()=>showHub('home'));await Q.toUserGame(pp);const kb2=await pp.$('#kickoff');if(kb2)await kb2.click();await pp.waitForTimeout(1200);await toCall(pp);await pp.evaluate(PINF);
const cdp=await pp.context().newCDPSession(pp);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});const perf={};
for(const a of ['generic','TAMU','UW','MICH','UTAH','SYR','KENN']){
  if(a==='generic')await pp.evaluate(()=>{LG.settings.realStadiums=false;STAD.key='';FLD.key=''});else{await pp.evaluate(()=>{LG.settings.realStadiums=true});await host(pp,a)}
  await pp.waitForTimeout(900);
  /* wide framing (whole stadium on screen = worst case); each frame ends with a 1-pixel readback so deferred GPU work is counted,
     minus the readback alone */
  perf[a]=await pp.evaluate(()=>{ensureStadium();const c=ctx,out=[];for(const x of [8,60,112]){pinCam(x,.42,1);const s=scE();c.setTransform(DPR,0,0,DPR,0,0);
      let t0=performance.now();for(let i=0;i<30;i++){c.fillRect(0,0,1,1);c.getImageData(0,0,1,1)}const base=(performance.now()-t0)/30;
      t0=performance.now();for(let i=0;i<30;i++){const n=performance.now();drawStands(c,s,n);drawEndStands(c,s,n);c.getImageData(0,0,1,1)}const ras=Math.max(0,(performance.now()-t0)/30-base);
      c.getImageData(0,0,1,1);t0=performance.now();for(let i=0;i<30;i++){const n=performance.now();drawStands(c,s,n);drawEndStands(c,s,n)}const cpu=(performance.now()-t0)/30;c.getImageData(0,0,1,1);out.push(`cpu ${cpu.toFixed(2)} / raster ${ras.toFixed(1)}`)}
    window.__pin=null;return out})}
await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
console.log('PREVIEW',prev);console.log('SETTING',setting);console.log('IMPORT',JSON.stringify({fbs:rep.fbs,withStd:rep.withStd,fcsWithStd:rep.fcsWithStd,saved:rep.saved,newDynasty:rep.newDynasty,savesStd:rep.savesStd}));
for(const l of rep.sample)console.log('  ',l);for(const l of shots)console.log('SHOT',l);console.log('OFF -> generic',offStd?'NO (still std)':'ok');
console.log('PERF ms/frame stadium layer, DPR 3, 4x CPU throttle, whole stadium in view, cam x 8/60/112 (cpu = draw calls; raster = with a forced readback in headless software GL, compare with generic)',JSON.stringify(perf));
const bad=rep.withStd<rep.fbs||rep.newDynasty<rep.fbs||!rep.savesStd||offStd;
console.log('saved to',OUT);console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length||bad?1:0)})();
