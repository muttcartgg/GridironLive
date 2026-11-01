/* Road to Glory, part 2: one game each as a QB, an RB and a CB with scripted input (the QB throws to the most open
   receiver, the RB runs upfield after the handoff, the CB chases the ball and dives at the carrier), then two careers
   fast-forwarded: declare after the junior season (draft result + career summary), and return for the senior year
   (career ends after it). Each career is made a starter at the start (test setup). Uses save slots 1–5.
   NODE_PATH=$(npm root -g) node tools/qa/rtg2.js [web/index.html]            */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
const bad=[];const t0=Date.now();
/* a new Road to Glory career in `slot`: create, commit to the offer with the most playing time, make him a starter */
const career=(slot,pos,stars)=>p.evaluate(([slot,pos,stars])=>{
  showSetup(slot);SETUP.mode='rtg';const o=SETUP.rtg={first:'Test',last:pos+'man',pos,arch:1,stars,st:0,ci:0};o.hs=rtgHS(o);o.offers=rtgOffers(SETUP.L,o);
  const f=o.offers.slice().sort((a,b)=>a.dep-b.dep)[0];rtgStartCareer(f);
  const me=rtgMe();LG.rtg.trust=100;for(let i=0;i<40&&rtgDepth(LG,true)>=STARTERS[me.pos];i++){for(const k of PATTR[me.pos])me[k]=r1(Math.min(5,me[k]+.15));invalidate()}
  return {team:T(LG.user).abbr,depth:LG.rtg.depth,ovr:ovr99(me),offers:o.offers.length}},[slot,pos,stars]);
const toHub=()=>p.evaluate(()=>{const g=document.querySelector('#postGo');if(g)g.click()});
/* ---------- part 1: a game as QB, RB, CB ---------- */
for(const [slot,pos] of [[1,'QB'],[2,'RB'],[3,'CB']]){
  const c=await career(slot,pos,5);
  await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();
  const g=await p.evaluate(async()=>{
    const log={errs:[],live:0,ffSnaps:0,frames:0,others:0,qbWrong:0,throws:0,carries:0,dives:0,lastPlay:null};
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
      if(S.ff){await sleep(40);if(play&&play!==log.lastPlay&&S.phase==='live'){log.lastPlay=play;log.ffSnaps++}continue}
      const idle=S.phase==='wait'||S.phase==='kick'&&(!kick||kick.done);if(n%300===0||idle)await sleep(idle?30:0);
      if(vis('#studio')){document.querySelector('#studioGo').click();continue}
      if(vis('#card')){document.querySelector('#dcGo').click();continue}
      if(vis('#opt')){log.errs.push('option sheet shown');document.querySelector('#optRow button').click();continue}
      if(vis('#call')&&S.phase==='presnap'){log.errs.push('call sheet shown');break}
      stick=null;
      if(S.phase==='live'&&play&&!play.st){const ex=autoSprite();
        if(play!==log.lastPlay){log.lastPlay=play;if(ex)log.live++}if(ex&&play.carrier===ex&&ex!==Q&&isRunner()&&!play.qaC){play.qaC=1;log.carries++}
        if(ex){log.frames++;for(const q of P)if(q!==ex&&userCtl(q))log.others++;if(ex!==Q&&userCtl(Q))log.qbWrong++;
          if(ex===Q){if(play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q&&play.t>1.3){let best=null,bs=-1;for(const r of OFF){if(!eligible(r)||r.blocker)continue;const [,dd]=nearest(DEF,r.x,r.y);const s=dd+Math.max(0,r.x-S.los)*.05;if(s>bs){bs=s;best=r}}
              if(best){throwBall(best.x+best.vx*.45,best.y+best.vy*.45,false,best);log.throws++}}
            else if(isRunner()&&play.carrier===Q)stick={dx:1,dy:0,m:60}}
          else if(ex.side==='o'){if(play.carrier===ex&&isRunner())stick={dx:1,dy:0,m:60}}
          else{const c=play.carrier,air=ball.state==='air';if(air||isRunner()){const tx=air?ball.tx:c.x,ty=air?ball.ty:c.y,dx=tx-ex.x,dy=ty-ex.y,dd=Math.hypot(dx,dy)||1;stick={dx:dx/dd,dy:dy/dd,m:60};
              if(!air&&c.side==='o'&&dd<2.4&&ex.lungeCD<=0&&ex.stun<=0){userTackle();log.dives++}}}}}
      try{step()}catch(e){log.errs.push(e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));break}
    }
    stick=null;const r=LG.rtg,gr=r.grades[r.grades.length-1];
    return {inj:(S.injured||[]).includes(r.pid)||(rtgMe()||{}).inj>0,score:S.score,phase:S.phase,log,grade:gr,pst:S.pst[r.pid]||null,dxp:S.dxp[r.pid]||null,post:!!document.querySelector('#postBody .rtg-post')}});
  const l=g.log;
  console.log(pos,JSON.stringify({team:c.team,depth:c.depth,injured:g.inj,score:g.score,live:l.live,ff:l.ffSnaps,throws:l.throws,carries:l.carries,dives:l.dives,others:l.others,qbWrong:l.qbWrong}));
  console.log('   stats',JSON.stringify(g.pst),JSON.stringify(g.dxp),'grade',g.grade&&g.grade.g,g.grade&&g.grade.line,g.grade&&g.grade.snaps+' snaps');
  bad.push(...l.errs.map(e=>pos+': '+e));if(g.phase!=='over')bad.push(pos+': game did not finish');if(!(l.live>5)&&!g.inj)bad.push(pos+': only '+l.live+' live snaps');   // an in-game injury benches him for the rest of the game
  if(l.others)bad.push(pos+': another player answered to the stick');if(l.qbWrong)bad.push(pos+': QB under user control');if(!g.grade||!g.grade.live||g.grade.q==null&&!g.inj)bad.push(pos+': no live grade');if(!g.post)bad.push(pos+': no grade card');
  if(pos==='QB'&&!(l.throws>0&&g.pst&&g.pst.pa>0))bad.push('QB: no user throws recorded');if(pos==='RB'&&!(g.pst&&g.pst.ra>0&&l.carries>0)&&!g.inj)bad.push('RB: no carries recorded');
  await toHub();await p.waitForTimeout(150);
}
/* ---------- part 2: careers to the draft ---------- */
const simSeason=()=>p.evaluate(async()=>{for(let n=0;n<70;n++){const m=document.querySelector('#modal');if(m&&!m.hidden){closeModal();continue}if(LG.phase==='offseason')return 'off';
  const me=rtgMe();if(me){LG.rtg.trust=Math.max(LG.rtg.trust,80)}const bt=document.querySelector('#simGame')||document.querySelector('#advWeek');if(!bt)return 'stuck at week '+LG.week;bt.click();await new Promise(r=>setTimeout(r,2))}return 'too long'});
for(const [slot,choice] of [[4,'declare'],[5,'return']]){
  const c=await career(slot,'WR',5);const out={choice,seasons:[],errs:[]};
  for(let yr=0;yr<6;yr++){
    const st=await simSeason();if(st!=='off'){out.errs.push(st);break}
    const rec=await p.evaluate(()=>{const me=rtgMe();return {s:LG.season,yr:me&&yrStr(me),decl:!!document.querySelector('#rtgDecl'),next:(document.querySelector('#rtgNext')||{}).textContent||null}});
    out.seasons.push(rec.s+' '+rec.yr+(rec.decl?' (decision)':''));
    if(rec.decl)await p.click(`#rtgDecl [data-v="${choice}"]`);
    await p.click('#rtgNext');await p.waitForTimeout(80);
    const done=await p.evaluate(()=>LG.rtg.stage==='done');if(done)break;
  }
  const end=await p.evaluate(()=>{const r=LG.rtg;return {stage:r.stage,result:r.result,hist:r.hist.map(h=>h.s+' '+h.yr+' '+h.g+' · '+h.line),summary:!!document.querySelector('#rtgSlots')&&/career summary/i.test(document.querySelector('#hubBody').textContent),rows:document.querySelectorAll('#hubBody tbody tr').length}});
  console.log('CAREER',choice,JSON.stringify({seasons:out.seasons,stage:end.stage,result:end.result,rows:end.rows,summary:end.summary}));end.hist.forEach(h=>console.log('   ',h));
  bad.push(...out.errs.map(e=>choice+': '+e));if(end.stage!=='done'||!end.result)bad.push(choice+': career did not reach the draft');if(!end.summary)bad.push(choice+': no career summary screen');
  if(choice==='declare'&&!(end.result&&end.result.early))bad.push('declare: not an early entry');if(choice==='return'&&!(end.hist.length>=4&&end.result&&!end.result.early))bad.push('return: no senior season');
}
console.log('TIME',Math.round((Date.now()-t0)/1000)+'s');
console.log('ERRORS',errs.length||bad.length?[...bad,...errs].slice(0,15):'none');await b.close();process.exit(errs.length||bad.length?1:0)})();
