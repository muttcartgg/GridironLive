/* Screenshots of the main screens and a live play, landscape (844x390) and portrait (390x844), at 2x.
   NODE_PATH=$(npm root -g) node tools/qa/shots.js [web/index.html] [outdir]   (default outdir: /tmp/gl-shots) */
const Q=require('./_boot');const fs=require('fs');
(async()=>{const OUT=process.argv[3]||'/tmp/gl-shots';fs.mkdirSync(OUT,{recursive:true});const b=await Q.launch();const errs=[];
for(const [w,h,tag] of [[844,390,'L'],[390,844,'P']]){
  const p=await Q.newPage(b,w,h,errs,2);await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(2600);
  const shot=async n=>{await p.screenshot({path:`${OUT}/${tag}-${n}.png`})};
  await shot('01-title');await p.click('#slotNew-1');await p.waitForTimeout(300);await shot('02-setup');
  await p.evaluate(()=>{const t=SETUP.L.teams.find(t=>t.abbr==='UGA');openTeamDetail(t.id)});await p.waitForTimeout(200);await shot('03-team');
  await p.click('#coachHere');await p.waitForTimeout(400);
  await p.evaluate(()=>{const m=document.querySelector('#modal');if(m&&!m.hidden){const x=document.querySelector('#evX');if(x)x.click();else closeModal()}});await p.waitForTimeout(200);await shot('04-hub');
  for(const tab of ['schedule','rankings','roster','program']){await p.evaluate(t=>{try{showHub(t)}catch(e){}},tab);await p.waitForTimeout(250);await shot('05-'+tab)}
  await p.evaluate(()=>showHub('home'));await Q.toUserGame(p);await shot('06-pregame');
  await p.evaluate(()=>{LG.settings.pregame=false});const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(2600);await shot('07-intro');
  await p.evaluate(async()=>{const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
    for(let n=0;n<4000;n++){
      if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();await new Promise(r=>setTimeout(r,60));continue}
      if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click();await new Promise(r=>setTimeout(r,60));continue}
      if(S.phase==='presnap'&&uOff()&&vis('#call'))break;
      if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="auto"]');if(a)a.click()}
      if(S.phase==='kick'&&kick){kick.ang=0;if(kick.stage==='aim')kickTap();else if(kick.stage==='power'){kick.pow=.97;kickTap()}}
      await new Promise(r=>setTimeout(r,16));
    }});
  await p.waitForTimeout(600);await shot('08-playcall');
  await p.evaluate(()=>{pickPlay(PLAYBOOK.find(x=>x.cat==='pass'&&!x.hail)||PLAYBOOK[0])});await p.waitForTimeout(800);await shot('09-presnap');
  await p.evaluate(()=>{startPlay(S.pc)});await p.waitForTimeout(1400);await shot('10-dropback');
  await p.evaluate(()=>{let best=null,bs=-1;for(const r of OFF){if(!eligible(r)||r.blocker)continue;const [,dd]=nearest(DEF,r.x,r.y);if(dd>bs){bs=dd;best=r}}if(best)aiThrow(best)});
  await p.waitForTimeout(450);await shot('11-air');await p.waitForTimeout(1300);await shot('12-result');await p.waitForTimeout(2500);await shot('13-next');
  await p.close()}
console.log('saved to',OUT);console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close()})();
