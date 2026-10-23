/* Plays one full user game at high speed (offense AND defense in "play" mode, random play calls),
   then prints the box score, play mix and any errors.
   NODE_PATH=$(npm root -g) node tools/qa/smoke.js [web/index.html] [TEAM]            */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
await Q.startDynasty(p,process.argv[3]||'UGA');
await p.evaluate(()=>{LG.settings.defMode='play';LG.settings.pregame=false;LG.settings.halftime=false});
await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(400);
const res=await p.evaluate(async()=>{
  const log={plays:0,kinds:{},runs:[],passes:0,errs:[],steps:0,phases:{},stuck:0};
  const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
  function step(){const real=1/60;
    if(S.phase==='presnap'){if(S.clockRun&&!S.ot&&!S.conv&&S.preRun<CLK.preCap){const d=Math.min(real*CLK.pre,CLK.preCap-S.preRun);S.clock=Math.max(0,S.clock-d);S.preRun+=d;if(S.clock<=0)presnapExpire()}
      if(!uOff()&&aiSnapT>0){aiSnapT-=real;if(aiSnapT<=0){aiSnapT=0;startPlay(S.aiPlay)}}}
    else if(S.phase==='kick'){updateKick(real)}
    else if(S.phase==='replay'){if(typeof endReplay==='function')endReplay()}
    else if((S.phase==='live'||S.phase==='dead')&&play){simulate(real/2);simulate(real/2);if(S.phase==='dead'){deadT-=real;if(deadT<=0){log.plays++;const r=play.result;const k=(uOff()?'o:':'d:')+r.kind;log.kinds[k]=(log.kinds[k]||0)+1;if(uOff()&&play.type==='run'&&!S.conv)log.runs.push(Math.round(r.x-S.los));applyResult()}}}
    if(typeof BC!=='undefined'&&BC.tick)BC.tick(real);
  }
  let lastPhase='',same=0;
  for(let n=0;n<600000;n++){
    log.phases[S.phase]=(log.phases[S.phase]||0)+1;if(S.phase==='over')break;
    if(S.phase===lastPhase&&S.phase==='wait')same++;else same=0;lastPhase=S.phase;
    if(n%300===0||S.phase==='wait')await new Promise(r=>setTimeout(r,S.phase==='wait'?30:0));
    if(same>4000){log.stuck++;same=0;log.errs.push('stuck in wait');break}
    if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();continue}
    if(vis('#card')&&document.querySelector('#dcGo')){document.querySelector('#dcGo').click();continue}
    if(vis('#celebSheet')){const c=document.querySelector('#celebRow [data-c]');if(c)c.click();continue}
    if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click();continue}
    if(S.phase==='presnap'&&uOff()&&vis('#call')){
      if(S.down===4&&!S.conv){if(fgDist()<=48)callSpecial('fg');else if(S.firstDownX-S.los<=1&&S.los>50)pickPlay(playByName('QB Sneak')||PLAYBOOK[0]);else callSpecial('punt');continue}
      const pool=PLAYBOOK.filter(x=>!x.hail&&!x.special);pickPlay(pool[Math.floor(Math.random()*pool.length)]);continue}
    if(S.phase==='presnap'&&uOff()&&vis('#snapBar')){startPlay(S.pc);continue}
    if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="auto"]');if(a)a.click();else{const d=document.querySelector('#call [data-dc]');if(d)d.click()}continue}
    if(S.phase==='kick'&&kick){if(kick.stage==='aim'&&Math.abs(kick.ang)<.05)kickTap();else if(kick.stage==='power'&&kick.pow>.95)kickTap()}
    if(S.phase==='live'&&uOff()&&play&&play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q&&play.t>1.6){let best=null,bs=-1;for(const r of OFF){if(!eligible(r)||r.blocker)continue;const [,dd]=nearest(DEF,r.x,r.y);const s=dd+Math.max(0,r.x-S.los)*.05;if(s>bs){bs=s;best=r}}if(best){aiThrow(best);log.passes++}}
    try{step()}catch(e){log.errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));break}
    log.steps++;
  }
  const yc=log.runs.length?log.runs.reduce((a,b)=>a+b,0)/log.runs.length:0;
  return {score:S.score,phase:S.phase,q:S.q,clock:Math.round(S.clock),plays:log.plays,kinds:log.kinds,ypc:+yc.toFixed(2),runs:log.runs.length,errs:log.errs,steps:log.steps,stats:S.stats,ostats:S.ostats};
});
const s=res.stats||{},o=res.ostats||{};delete res.stats;delete res.ostats;
console.log('GAME',JSON.stringify(res));
console.log('US  ',`comp ${s.comp}/${s.att} ${s.passYds}y TD${s.passTD} INT${s.int} | rush ${s.rushAtt}-${s.rushYds} TD${s.rushTD} | sacks ${s.sacks} fum ${s.fum} pen ${s.pen} 3rd ${s.thirdC}/${s.thirdA} plays ${s.plays}`);
console.log('THEM',`comp ${o.comp}/${o.att} ${o.passYds}y TD${o.passTD} INT${o.int} | rush ${o.rushAtt}-${o.rushYds} | sacks ${o.sacks} fum ${o.fum} pen ${o.pen} plays ${o.plays}`);
console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(res.errs.length||errs.length?1:0)})();
