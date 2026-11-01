/* Coach mode: plays one full user game where the script only CALLS plays (offense call sheet, defense call sheet,
   4th-down specials, every decision prompt, the speed buttons) and the autopilot (05h) plays every snap. Fails if the
   autopilot was ever off, if it never threw and ran, if the game did not finish, or on any page error.
   NODE_PATH=$(npm root -g) node tools/qa/coach.js [web/index.html] [TEAM]            */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
await Q.startDynasty(p,process.argv[3]||'UGA');
await p.evaluate(()=>{Object.assign(LG.settings,{playStyle:'coach',defMode:'play',pregame:false,halftime:false})});
await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(400);
const res=await p.evaluate(async()=>{
  const log={calls:0,dcalls:0,specials:0,opts:0,errs:[],autoOff:0,speed2:0,skips:0,kicks:0};
  const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
  function step(){const real=1/60;
    if(S.phase==='presnap'){if(S.clockRun&&!S.ot&&!S.conv&&S.preRun<CLK.preCap){const d=Math.min(real*CLK.pre*4,CLK.preCap-S.preRun);S.clock=Math.max(0,S.clock-d);S.preRun+=d;if(S.clock<=0)presnapExpire()}
      if(!uOff()&&aiSnapT>0){aiSnapT-=real;if(aiSnapT<=0){aiSnapT=0;startPlay(S.aiPlay)}}}
    else if(S.phase==='kick'){updateKick(real)}
    else if(S.phase==='replay'){endReplay()}
    else if((S.phase==='live'||S.phase==='dead')&&play){const sp=AUTO.speed;for(let i=0;i<2*sp;i++)simulate(real/2);if(S.phase==='dead'){deadT-=real*sp;if(deadT<=0)applyResult()}}
    BC.tick(real);
  }
  for(let n=0;n<900000;n++){
    if(S.phase==='over')break;
    const idle=S.phase==='wait'||S.phase==='kick'||S.phase==='pat';if(n%250===0||idle)await new Promise(r=>setTimeout(r,idle?25:0));
    if(!S.auto)log.autoOff++;
    if(vis('#studio')){document.querySelector('#studioGo').click();continue}
    if(vis('#card')){document.querySelector('#dcGo').click();continue}
    if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];log.opts++;bs[Math.random()<.8?0:bs.length-1].click();continue}
    /* offense: the call sheet API only (tabs, play cards, Coach's pick, specials), then SNAP */
    if(S.phase==='presnap'&&uOff()&&vis('#call')){log.calls++;
      if(S.down===4&&!S.conv){CALL_TAB='special';renderCall();const k=fgDist()<=48?'fg':(S.firstDownX-S.los<=2&&S.los>55)?null:'punt',el=k&&document.querySelector(`#callRow [data-sp="${k}"]`);
        if(el){log.specials++;el.click();continue}}
      if(Math.random()<.35)document.querySelector('#callRow [data-coach]').click();
      else{CALL_TAB=CALL_TABS[Math.floor(Math.random()*5)][0];renderCall();const c=[...document.querySelectorAll('#callRow .pbgrid [data-pid]')];(c[Math.floor(Math.random()*c.length)]||document.querySelector('#callRow [data-coach]')).click()}
      continue}
    if(S.phase==='presnap'&&uOff()&&vis('#snapBar')){document.querySelector('#snapGo').click();continue}
    if(S.phase==='presnap'&&!uOff()&&vis('#call')){log.dcalls++;const d=[...document.querySelectorAll('#callRow [data-dc]')].filter(x=>x.dataset.dc!=='sim');d[Math.random()<.5?0:Math.floor(Math.random()*d.length)].click();continue}
    if(S.phase==='kick'&&kick&&kick.stage==='aim'&&!kick.seen){kick.seen=1;log.kicks++}
    /* speed buttons while a play runs */
    if(S.phase==='live'&&play&&!play.spd&&vis('#apBar')){play.spd=1;const r=Math.random();const bb=document.querySelector(r<.15?'#apBar [data-sp="skip"]':r<.45?'#apBar [data-sp="2"]':'#apBar [data-sp="1"]');bb.click();if(r<.15)log.skips++;else if(r<.45)log.speed2++}
    if(S.phase==='live'&&play&&!play.spd&&!play.st)apBarTick();
    try{step()}catch(e){log.errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));break}
  }
  return {score:S.score,phase:S.phase,q:S.q,clock:Math.round(S.clock),log,stats:S.stats,ostats:S.ostats,drives:(S.drives||[]).length,pbp:(S.pbp||[]).length,style:playStyle()};
});
const s=res.stats||{},o=res.ostats||{},lg=res.log;
console.log('GAME',JSON.stringify({score:res.score,phase:res.phase,q:res.q,clock:res.clock,drives:res.drives,pbp:res.pbp,style:res.style,calls:lg.calls,dcalls:lg.dcalls,specials:lg.specials,opts:lg.opts,kicks:lg.kicks,speed2:lg.speed2,skips:lg.skips}));
console.log('US  ',`comp ${s.comp}/${s.att} ${s.passYds}y TD${s.passTD} INT${s.int} | rush ${s.rushAtt}-${s.rushYds} TD${s.rushTD} | sacks ${s.sacks} fum ${s.fum} plays ${s.plays} 3rd ${s.thirdC}/${s.thirdA}`);
console.log('THEM',`comp ${o.comp}/${o.att} ${o.passYds}y TD${o.passTD} INT${o.int} | rush ${o.rushAtt}-${o.rushYds} | sacks ${o.sacks} plays ${o.plays}`);
const bad=[...lg.errs];if(res.phase!=='over')bad.push('game did not finish');if(!(s.att>5&&s.rushAtt>5))bad.push('autopilot offense did not both pass and run');if(!(o.plays>15))bad.push('few defensive snaps');if(lg.autoOff)bad.push('autopilot was off for '+lg.autoOff+' steps');
console.log('ERRORS',errs.length||bad.length?[...bad,...errs].slice(0,15):'none');await b.close();process.exit(errs.length||bad.length?1:0)})();
