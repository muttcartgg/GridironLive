/* Key moments: plays one full user game in the 'km' play style. The game sims itself on the real engine (05h kmPump,
   driven by the page's own frame loop) and the script only acts when it is handed control (S.ff off), then plays
   like the smoke test's user. Prints each key moment, the box score and drive count; fails on a stuck or unfinished
   game, no key moments, broken stats or any page error.
   NODE_PATH=$(npm root -g) node tools/qa/keymoments.js [web/index.html] [TEAM]            */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
await Q.startDynasty(p,process.argv[3]||'UGA');
await p.evaluate(()=>{Object.assign(LG.settings,{playStyle:'km',defMode:'play',pregame:true,halftime:true})});
await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();
const t0=Date.now();
const res=await p.evaluate(async()=>{
  const log={moments:[],ffMs:0,userSteps:0,errs:[],lastKm:null,ffSnaps:0,userSnaps:0,ffOff:0};
  const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden},sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let lastPlay=null,lastPhase='',same=0;
  function step(){const real=1/60;
    if(S.phase==='presnap'){if(S.clockRun&&!S.ot&&!S.conv&&S.preRun<CLK.preCap){const d=Math.min(real*CLK.pre*4,CLK.preCap-S.preRun);S.clock=Math.max(0,S.clock-d);S.preRun+=d;if(S.clock<=0)presnapExpire()}
      if(!uOff()&&aiSnapT>0){aiSnapT-=real;if(aiSnapT<=0){aiSnapT=0;startPlay(S.aiPlay)}}}
    else if(S.phase==='kick'){updateKick(real)}
    else if(S.phase==='replay'){endReplay()}
    else if((S.phase==='live'||S.phase==='dead')&&play){simulate(real/2);simulate(real/2);if(S.phase==='dead'){deadT-=real;if(deadT<=0)applyResult()}}
    BC.tick(real);
  }
  for(let n=0;n<900000;n++){
    if(S.phase==='over')break;
    if(play&&play!==lastPlay&&S.phase==='live'){lastPlay=play;if(S.ff)log.ffSnaps++;else log.userSnaps++}
    if(S.km&&S.km!==log.lastKm){log.lastKm=S.km;log.moments.push(`${S.ot?'OT':'Q'+S.q} ${fmtClock(S.clock)} ${S.score[0]}-${S.score[1]} ${S.poss} · ${S.km.why}`)}
    if(S.phase===lastPhase&&S.phase==='wait')same++;else same=0;lastPhase=S.phase;if(same>3000){log.errs.push('stuck in wait');break}
    if(S.ff){await sleep(40);log.ffMs+=40;continue}   // simming: the page's own frame loop runs the engine
    if(S.auto)log.ffOff++;   // handed control means Full control (no autopilot)
    log.userSteps++;
    const idle=S.phase==='wait'||S.phase==='kick'&&(!kick||kick.done);if(n%300===0||idle)await sleep(idle?30:0);
    if(vis('#studio')){document.querySelector('#studioGo').click();continue}
    if(vis('#card')){document.querySelector('#dcGo').click();continue}
    if(vis('#celebSheet')){const c=document.querySelector('#celebRow [data-c]');if(c)c.click();continue}
    if(vis('#opt')){document.querySelector('#optRow button').click();continue}
    if(S.phase==='presnap'&&uOff()&&vis('#call')){
      if(S.down===4&&!S.conv){if(fgDist()<=48)callSpecial('fg');else if(S.firstDownX-S.los<=2&&S.los>50)pickPlay(playByName('QB Sneak')||PLAYBOOK[0]);else callSpecial('punt');continue}
      const pool=PLAYBOOK.filter(x=>!x.hail&&!x.special);pickPlay(pool[Math.floor(Math.random()*pool.length)]);continue}
    if(S.phase==='presnap'&&uOff()&&vis('#snapBar')){startPlay(S.pc);continue}
    if(S.phase==='presnap'&&!uOff()&&vis('#call')){document.querySelector('#callRow [data-dc="auto"]').click();continue}
    if(S.phase==='kick'&&kick){if(kick.stage==='aim'&&Math.abs(kick.ang)<.05)kickTap();else if(kick.stage==='power'&&kick.pow>.95)kickTap()}
    if(S.phase==='live'&&uOff()&&play&&play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q&&play.t>1.6){let best=null,bs=-1;for(const r of OFF){if(!eligible(r)||r.blocker)continue;const [,dd]=nearest(DEF,r.x,r.y);const s=dd+Math.max(0,r.x-S.los)*.05;if(s>bs){bs=s;best=r}}if(best)aiThrow(best)}
    try{step()}catch(e){log.errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));break}
  }
  delete log.lastKm;
  return {score:S.score,phase:S.phase,q:S.q,clock:Math.round(S.clock),ot:S.ot,log,stats:S.stats,ostats:S.ostats,drives:(S.drives||[]).length,pbp:(S.pbp||[]).length,ff:S.ff,dpts:(S.drives||[]).map(d=>d.team[0]+':'+d.res).join(' ')};
});
const s=res.stats||{},o=res.ostats||{},lg=res.log;
console.log('GAME',JSON.stringify({score:res.score,phase:res.phase,q:res.q,clock:res.clock,ot:res.ot,drives:res.drives,pbp:res.pbp,ffSnaps:lg.ffSnaps,userSnaps:lg.userSnaps,simSec:Math.round(lg.ffMs/1000),wallSec:Math.round((Date.now()-t0)/1000)}));
console.log('MOMENTS',lg.moments.length);lg.moments.forEach(m=>console.log('   ',m));
console.log('DRIVES',res.dpts);
console.log('US  ',`comp ${s.comp}/${s.att} ${s.passYds}y TD${s.passTD} INT${s.int} | rush ${s.rushAtt}-${s.rushYds} TD${s.rushTD} | sacks ${s.sacks} fum ${s.fum} plays ${s.plays} 3rd ${s.thirdC}/${s.thirdA} rz ${s.rzTD}/${s.rzA}`);
console.log('THEM',`comp ${o.comp}/${o.att} ${o.passYds}y TD${o.passTD} INT${o.int} | rush ${o.rushAtt}-${o.rushYds} | sacks ${o.sacks} plays ${o.plays}`);
const bad=[...lg.errs];if(res.phase!=='over')bad.push('game did not finish');if(!lg.moments.length)bad.push('never handed control');if(!(lg.ffSnaps>20))bad.push('little simming');
if(!(s.plays>15&&o.plays>15))bad.push('thin box score');if(res.drives<8)bad.push('drive chart has '+res.drives+' drives');if(lg.ffOff)bad.push('autopilot left on in a key moment');if(res.ff)bad.push('still simming after the final');
console.log('ERRORS',errs.length||bad.length?[...bad,...errs].slice(0,15):'none');await b.close();process.exit(errs.length||bad.length?1:0)})();
