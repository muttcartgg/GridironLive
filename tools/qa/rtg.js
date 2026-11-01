/* Road to Glory: creates a 4-star WR recruit on the new-dynasty screen, takes two official visits, commits, plays his
   first game controlling only him (scripted stick input on his routes and after the catch; the autopilot plays everyone
   else and the snaps he sits out are simmed), sims the rest of the season (spending skill points), checks for a
   depth-chart move, then goes through the offseason into year two. Fails on any page error or a broken step.
   NODE_PATH=$(npm root -g) node tools/qa/rtg.js [web/index.html]            */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
const bad=[];const t0=Date.now();
await p.waitForSelector('#slotNew-1',{timeout:15000});await p.click('#slotNew-1');await p.waitForTimeout(150);
await p.click('#modeRtg');await p.waitForTimeout(100);
await p.fill('#rtgFirst','Jaxson');await p.fill('#rtgLast','Merchant');
await p.click('#rtgPos [data-v="WR"]');await p.waitForTimeout(60);await p.click('#rtgStars [data-v="4"]');await p.waitForTimeout(60);
await p.selectOption('#rtgState',{index:2});await p.click('#rtgGo');await p.waitForTimeout(200);
const offers=await p.evaluate(()=>SETUP.rtg.offers.map(f=>`${SETUP.L.teams[f.t].abbr} int ${f.int} dep #${f.dep} [${f.pit.join(', ')}]`));
console.log('OFFERS',offers.length);offers.forEach(o=>console.log('   ',o));if(offers.length<5||offers.length>8)bad.push('offer count '+offers.length);
await p.click('#rtgVis-0');await p.waitForTimeout(60);await p.click('#rtgVis-1');await p.waitForTimeout(60);
const visits=await p.evaluate(()=>SETUP.rtg.offers.filter(f=>f.v).length);if(visits!==2)bad.push('visits '+visits);
const best=await p.evaluate(()=>{const o=SETUP.rtg.offers;let b=0;o.forEach((f,i)=>{if(f.dep<o[b].dep)b=i});return b});   // the most playing time
await p.click('#rtgCom-'+best);await p.waitForTimeout(400);
const start=await p.evaluate(()=>{const r=LG.rtg,me=rtgMe(),u=T(LG.user);return {team:u.abbr,ovr:ovr99(me),depth:r.depth,trust:r.trust,yr:me.yr,num:me.num,hub:!!document.querySelector('.rtg-card'),tabs:[...document.querySelectorAll('#tabs button')].map(b=>b.textContent).join(',')}});
console.log('COMMIT',JSON.stringify(start));if(!start.hub)bad.push('no career hub');
/* to his first game */
await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();
const game=await p.evaluate(async()=>{
  const log={errs:[],live:0,ffSnaps:0,frames:0,others:0,qbUser:0,stickFrames:0,catches:0,lastPlay:null,ffMs:0,maxSnapDur:0};
  const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden},sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function step(){const real=1/60;if(LG.rtg)rtgFrame();if(S.ff)return;
    if(S.phase==='presnap'){if(S.clockRun&&!S.ot&&!S.conv&&S.preRun<CLK.preCap){const d=Math.min(real*CLK.pre*4,CLK.preCap-S.preRun);S.clock=Math.max(0,S.clock-d);S.preRun+=d;if(S.clock<=0)presnapExpire()}
      if(!uOff()&&aiSnapT>0){aiSnapT-=real;if(aiSnapT<=0){aiSnapT=0;startPlay(S.aiPlay)}}
      if(uOff()&&S.pc&&S.phase==='presnap')startPlay(S.pc)}
    else if(S.phase==='kick'){updateKick(real)}
    else if(S.phase==='replay'){endReplay()}
    else if((S.phase==='live'||S.phase==='dead')&&play){simulate(real/2);simulate(real/2);if(S.phase==='dead'){deadT-=real;if(deadT<=0)applyResult()}}
    BC.tick(real)}
  for(let n=0;n<900000;n++){
    if(S.phase==='over')break;
    if(S.ff){await sleep(40);log.ffMs+=40;if(play&&play!==log.lastPlay&&S.phase==='live'){log.lastPlay=play;log.ffSnaps++}continue}
    const idle=S.phase==='wait'||S.phase==='kick'&&(!kick||kick.done);if(n%300===0||idle)await sleep(idle?30:0);
    if(vis('#studio')){document.querySelector('#studioGo').click();continue}
    if(vis('#card')){document.querySelector('#dcGo').click();continue}
    if(vis('#opt')){log.errs.push('option sheet shown in Road to Glory');document.querySelector('#optRow button').click();continue}
    if(vis('#call')&&S.phase==='presnap'){log.errs.push('call sheet shown in Road to Glory');break}
    if(S.phase==='live'&&play&&!play.st){
      const ex=autoSprite();
      if(play!==log.lastPlay){log.lastPlay=play;if(ex)log.live++}
      if(ex){log.frames++;
        for(const q of P)if(q!==ex&&userCtl(q))log.others++;
        if(userCtl(Q)&&Q!==ex)log.qbUser++;
        /* scripted input: veer the route toward the middle early, then let it run; after the catch, straight upfield */
        if(play.carrier===ex&&isRunner()){stick={dx:1,dy:0,m:60};log.stickFrames++}
        else if(play.t<1.1&&!play.thrown){const dy=(CEN-ex.y)/40,n2=Math.hypot(1,dy);stick={dx:1/n2,dy:dy/n2,m:60};log.stickFrames++}
        else stick=null}
      else stick=null}
    try{step()}catch(e){log.errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));break}
  }
  stick=null;const r=LG.rtg,g=r.grades[r.grades.length-1];
  return {score:S.score,phase:S.phase,log,grade:g,post:!!document.querySelector('#postBody .rtg-post'),pst:S.pst[r.pid]||null,exempt:AUTO.exempt===r.pid};
});
const lg=game.log;
console.log('GAME',JSON.stringify({score:game.score,phase:game.phase,liveSnaps:lg.live,ffSnaps:lg.ffSnaps,ctlFrames:lg.frames,stickFrames:lg.stickFrames,othersCtl:lg.others,qbUser:lg.qbUser,simSec:Math.round(lg.ffMs/1000)}));
console.log('HIS GAME',JSON.stringify(game.pst),'grade',JSON.stringify(game.grade));
bad.push(...lg.errs);if(game.phase!=='over')bad.push('game did not finish');if(!(lg.live>0))bad.push('never on the field');if(lg.others)bad.push('another player answered to the stick');if(lg.qbUser)bad.push('QB under user control');
if(!game.grade||!game.grade.live)bad.push('no live game grade');if(!game.post)bad.push('no grade card on the post-game screen');if(!game.exempt)bad.push('autopilot exemption not set');if(!(lg.ffSnaps>20))bad.push('little simming ('+lg.ffSnaps+')');
await p.evaluate(()=>{const g=document.querySelector('#postGo');if(g)g.click()});await p.waitForTimeout(200);
/* the rest of the season: sim, spending skill points on the lowest key rating */
const season=await p.evaluate(async()=>{const out={weeks:0,errs:[],spent:0};
  const modal=()=>{const m=document.querySelector('#modal');if(m&&!m.hidden){const x=document.querySelector('#evX')||document.querySelector('#closeP');if(x)x.click();else closeModal();return true}return false};
  for(let n=0;n<60;n++){if(modal())continue;if(LG.phase==='offseason')break;
    const me=rtgMe();if(me){const ks=PATTR.WR.slice(0,3).sort((a,b)=>me[a]-me[b]);for(let i=0;i<20;i++){if(rtgSpend(ks[0]))out.spent++;else break}}
    if(LG.rtg.nil.offer){const y=document.querySelector('#rtgNilY');if(y)y.click()}
    const b=document.querySelector('#simGame')||document.querySelector('#advWeek');if(!b){out.errs.push('stuck at week '+LG.week);break}b.click();out.weeks++;await new Promise(r=>setTimeout(r,3))}
  const r=LG.rtg,me=rtgMe();return {...out,phase:LG.phase,moves:r.moves,depth:r.depth,trust:Math.round(r.trust),sp:r.sp,line:me&&statLine(me),gp:me&&me.ss.gp,grades:r.grades.map(g=>g.g).join(' '),nil:r.nil.deals.length,cash:r.nil.cash,proj:rtgProj().txt,ovr:me&&ovr99(me),hub:!!document.querySelector('.rtg-card')||!!document.querySelector('#rtgNext')}});
console.log('SEASON',JSON.stringify(season));bad.push(...season.errs);if(season.phase!=='offseason')bad.push('season did not end');if(!season.moves.length)bad.push('no depth-chart move');
/* offseason → year two */
const off=await p.evaluate(async()=>{const s0=LG.season,out={clicks:0,errs:[]};
  for(let n=0;n<10&&LG.season===s0&&LG.rtg.stage==='college';n++){const b=document.querySelector('#rtgNext');if(!b){out.errs.push('no rtgNext at '+(LG.off&&LG.off.stage));break}b.click();out.clicks++;await new Promise(r=>setTimeout(r,5))}
  const me=rtgMe(),r=LG.rtg;return {...out,season:LG.season,phase:LG.phase,stage:r.stage,yr:me&&yrStr(me),depth:r.depth,goals:r.goals.map(g=>g.t),hist:r.hist.map(h=>h.s+' '+h.g+' '+h.line),onRoster:!!me,hub:!!document.querySelector('.rtg-card')}});
console.log('OFFSEASON',JSON.stringify(off));bad.push(...off.errs);if(off.phase!=='regular'||!off.onRoster||!off.hub)bad.push('year two did not start');
console.log('TIME',Math.round((Date.now()-t0)/1000)+'s');
console.log('ERRORS',errs.length||bad.length?[...bad,...errs].slice(0,15):'none');await b.close();process.exit(errs.length||bad.length?1:0)})();
