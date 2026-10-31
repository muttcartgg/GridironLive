/* Device-fit camera: screenshots of a presnap formation, a pass drop-back and a run on several iPhone sizes, portrait and
   landscape, with the shell's window.__DEVICE__ (model id + safe-area insets) emulated. Prints the fitted scale per size.
   NODE_PATH=$(npm root -g) node tools/qa/camfit.js [web/index.html] [outdir]   (default outdir: /tmp/gl-camfit) */
const Q=require('./_boot');const fs=require('fs');
const DEVS=[[375,667,'iPhone14,6',{t:20,r:0,b:0,l:0},{t:0,r:0,b:0,l:0}],[390,844,'iPhone14,5',{t:47,r:0,b:34,l:0},{t:0,r:47,b:21,l:47}],
  [393,852,'iPhone17,3',{t:59,r:0,b:34,l:0},{t:0,r:59,b:21,l:59}],[430,932,'iPhone16,2',{t:59,r:0,b:34,l:0},{t:0,r:59,b:21,l:59}]];
(async()=>{const OUT=process.argv[3]||'/tmp/gl-camfit';fs.mkdirSync(OUT,{recursive:true});const b=await Q.launch();const errs=[];
const p=await Q.newPage(b,844,390,errs,1);await p.goto(Q.pageURL(process.argv[2]));await Q.startDynasty(p,'UGA');
await p.evaluate(()=>{LG.settings.pregame=false;LG.settings.halftime=false});await Q.toUserGame(p);
const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(1500);
const toCall=()=>p.evaluate(async()=>{const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
  for(let n=0;n<6000;n++){
    if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();await new Promise(r=>setTimeout(r,60));continue}
    if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click();await new Promise(r=>setTimeout(r,60));continue}
    if(vis('#card')){const c=document.querySelector('#card button');if(c)c.click()}
    if(S.phase==='over')return 'over';
    if(S.phase==='presnap'&&uOff()&&vis('#call'))return 'call';
    if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="sim"]');if(a)a.click()}
    if(S.phase==='kick'&&kick){kick.ang=0;if(kick.stage==='aim')kickTap();else if(kick.stage==='power'){kick.pow=.97;kickTap()}}
    await new Promise(r=>setTimeout(r,16))}return 'timeout'});
const rows=[];
for(const [w,h,id,sp,sl] of DEVS)for(const land of [false,true]){
  const vw=land?h:w,vh=land?w:h,tag=`${w}x${h}-${land?'L':'P'}`;
  await p.setViewportSize({width:vw,height:vh});
  await p.evaluate(([id,vw,vh,s])=>{window.__DEVICE__={id,w:vw,h:vh,scale:3,isPad:false,safe:s};DEV_CACHE=null;resize()},[id,vw,vh,land?sl:sp]);
  if(await toCall()!=='call')break;await p.evaluate(()=>{resize();pickPlay(PLAYBOOK.find(x=>x.name==='Four Verticals')||PLAYBOOK.find(x=>x.cat==='pass'&&!x.hail))});await p.waitForTimeout(1300);
  await p.screenshot({path:`${OUT}/${tag}-1-presnap.png`});
  const info=await p.evaluate(()=>({dev:devLabel(),sc:+sc.toFixed(1),yAcross:+(W/scE()).toFixed(1),yDeep:+((H-topY)/(scE()*VY)).toFixed(1),z:+cam.z.toFixed(2),safe:SAFE}));
  await p.evaluate(()=>startPlay(S.pc));await p.waitForTimeout(1500);await p.screenshot({path:`${OUT}/${tag}-2-dropback.png`});
  const z2=await p.evaluate(()=>+cam.z.toFixed(2));
  await p.evaluate(()=>{if(play&&!play.thrown){let best=null,bs=-1;for(const r of OFF){if(!eligible(r)||r.blocker)continue;const [,dd]=nearest(DEF,r.x,r.y);if(dd>bs){bs=dd;best=r}}if(best)aiThrow(best)}});
  if(await toCall()!=='call')break;await p.evaluate(()=>pickPlay(PLAYBOOK.find(x=>x.name==='Inside Zone')||PLAYBOOK.find(x=>x.cat==='run'&&!(x.run&&(x.run.rpo||x.run.read||x.run.option||x.run.triple)))));await p.waitForTimeout(600);
  await p.evaluate(()=>startPlay(S.pc));await p.waitForTimeout(1300);await p.screenshot({path:`${OUT}/${tag}-3-run.png`});
  const z3=await p.evaluate(()=>({z:+cam.z.toFixed(2),yAcross:+(W/scE()).toFixed(1)}));
  rows.push({tag,...info,zDrop:z2,run:z3});console.log(JSON.stringify(rows[rows.length-1]));
}
console.log('saved to',OUT);console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length?1:0)})();
