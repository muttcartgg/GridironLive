/* =========================================================
   05f · 2026 NCAA rules (v9): penalties, enforcement, accept / decline, booth review, crowd noise,
   the two-minute timeout, timeout rules and ejections.
   Pre-snap fouls (rulesPreSnap, called by startPlay) kill the play before the snap. Live-ball fouls are decided
   during the play at the spot of the foul (rulesSnap schedules them, rulesTick and the fx listeners below throw
   the flag: fx('flag',{x,y,on})) and wait on play.fouls; applyResult() hands them to penResolve() after the
   whistle (kick plays: penResolveKick). The offended team chooses: the CPU takes the better result, the user is
   asked only when declining could be better. Offsetting fouls replay the down. A nullified play gives back its
   stats (snapshot taken at the snap). Team stats get penBy {name:[n,yds]} for the box score.
   Engine coordinates: the offense attacks +x, its goal line is x=10, the defense's x=110.
   ========================================================= */
SETTINGS_EXTRA.push({card:'Gameplay',key:'penalties',label:'Penalties',opts:[['normal','Normal'],['low','Fewer'],['off','Off']],def:'normal',note:'Pre-snap and live-ball fouls, enforced under the 2026 college rules.'});
const penMul=()=>{const v=LG&&LG.settings?LG.settings.penalties:'normal';return v==='off'?0:v==='low'?.55:1.2};
const PN={fs:'False start',enc:'Encroachment',nzi:'Neutral zone infraction',offs:'Offside',ifm:'Illegal formation',imo:'Illegal motion',ish:'Illegal shift',tmm:'Too many men on the field',dog:'Delay of game',
  oh:'Holding',dh:'Holding',dpi:'Pass interference',opi:'Offensive pass interference',ig:'Intentional grounding',ifp:'Illegal forward pass',idf:'Ineligible man downfield',rtp:'Roughing the passer',
  tgt:'Targeting',fm:'Face mask',lh:'Late hit out of bounds',ur:'Unnecessary roughness',ibb:'Illegal block in the back',kci:'Kick-catch interference',rik:'Running into the kicker',rok:'Roughing the kicker',usc:'Unsportsmanlike conduct'};
let PEN_ST0=null;

/* ---------- clock helpers: "the last 2:00 of a half" in compressed game time ---------- */
const lateThr=()=>Math.min(120,120*S.qlen/900+10);
const inside2=()=>!S.ot&&(S.q===2||S.q===4)&&S.clock<=lateThr();
const tmoPending=()=>!S.ot&&(S.q===2||S.q===4)&&!(S.tmo&&S.tmo[S.q]);
const tmoDue=()=>tmoPending()&&S.clock>0&&S.clock<=lateThr()+.01;
/* 2024 rule: a two-minute timeout at the 2:00 mark of each half (an official's timeout: a running clock restarts on the ready) */
function fireTMO(){
  (S.tmo||(S.tmo={}))[S.q]=true;S.clockHold=Math.max(S.clockHold||0,2.8);
  fx('twoMinute',{q:S.q,clock:S.clock});
  if(typeof BC!=='undefined'){if(!(FX_SUBS.twoMinute&&FX_SUBS.twoMinute.length)&&typeof BC.twoMin==='function')BC.twoMin();if(BC.lateShown)BC.lateShown[S.q]=true}
  toast('Two-minute timeout');logPBP(`Two-minute timeout · ${fmtClock(S.clock)} left in the ${S.q===2?'half':'game'}`);
}
/* the clock can cross 2:00 between plays (09 runs it during the presnap): stop it there */
setInterval(()=>{if(S.phase==='presnap'&&S.home&&!S.paused&&tmoDue()){fireTMO();S.preRun=Math.max(0,CLK.preCap-6)}},200);
/* after the play: does the clock run on the ready signal (true) or wait for the snap (false)? */
function playRun(r){
  if(!r)return false;const k=r.kind;
  if(k==='tackle'||k==='sack'||k==='kneel')return true;
  if(k==='oob')return !inside2();
  if(k==='st')return r.sk==='oob'?!inside2():r.sk!=='td'&&r.sk!=='safety'&&!(play&&play.st&&play.st.chg);
  return false;
}

/* ---------- who fouls: low awareness, the road offense in a loud stadium ---------- */
function discOf(t){
  if(!t||!S.dc)return 1;const d=dcOf(t);let s=0,n=0;
  for(const pos of ['QB','OL','DL','LB','CB','S','WR','TE'])for(const p of (d[pos]||[]).slice(0,pos==='OL'?5:2))if(p){s+=p.awr||3;n++}
  return clamp(1+.25*(3-(n?s/n:3)),.6,1.6)*(t===S.home?(hasTrait('dc','Disciplinarian')?.7:1)*(1.2-(LG.morale==null?50:LG.morale)/250):1);
}
/* 0..1: crowd noise against the visiting offense (host prestige, rivalry, primetime, a close game late, 3rd down) */
function crowdNoise(){
  if(S.neutral||!S.home||!S.away)return 0;const host=S.userHome?S.home:S.away;if(offT()===host)return 0;
  const g=S.game||{},close=Math.abs(S.score[0]-S.score[1])<=8&&(S.ot||S.q>=4);
  return clamp(.15+.1*(host.prestige||2)+(g.rival?.15:0)+(S.slot==='Primetime'?.12:0)+(close?.2:0)+(S.down>=3?.08:0),0,1);
}

/* ---------- stats, graphics, ejections ---------- */
function penStat(team,k,y){const st=team===S.home?S.stats:S.ostats;if(!st)return;st.pen++;st.penYds+=Math.max(0,Math.round(y));const b=st.penBy||(st.penBy={}),n=PN[k]||k,e=b[n]||(b[n]=[0,0]);e[0]++;e[1]+=Math.max(0,Math.round(y))}
function penAnnounce(m){
  logPBP('Flag: '+m);
  if(typeof BC!=='undefined'&&typeof BC.flagCard==='function'&&BC.flagCard(m)){if(BC.say)BC.say('flag',{m});return}
  const f=$('#flag');if(f){f.textContent='🚩 '+m;f.classList.add('show');clearTimeout(penAnnounce.t);penAnnounce.t=setTimeout(()=>f.classList.remove('show'),2600)}
  if(typeof BC!=='undefined'&&BC.say)BC.say('flag',{m});
}
const sideWord=(f)=>`${f.team.abbr} ${f.side==='o'?(play&&play.st&&(play.st.kind==='ko'||play.st.kind==='punt')?'return team':'offense'):(play&&play.st&&(play.st.kind==='ko'||play.st.kind==='punt')?'kicking team':'defense')}`;
const ddAt=(x,d,fdx,side)=>`${ord(d)} & ${fdx>=110?'Goal':Math.max(1,Math.round(fdx-x))} at the ${spotLabelFor(clamp(x,10,110),side||S.poss)}`;
function ejectDepth(){
  const bad=new Set(S.ejected||[]);if(!bad.size||!S.dc)return;
  for(const side of ['u','a'])for(const pos in S.dc[side]){const l=S.dc[side][pos],ok=l.filter(p=>p&&!bad.has(p.id));S.dc[side][pos]=ok.length>=2?ok:ok.concat(l.filter(p=>p&&bad.has(p.id)))}
}
function eject(p){if(!p||!p.pl)return;(S.ejected||(S.ejected=[])).push(p.pl.id);ejectDepth();const m=`#${p.pl.num} ${p.pl.last} (${p.team.abbr}) is ejected for targeting`;toast(m);logPBP(m,'big');if(typeof BC!=='undefined'&&BC.chip)BC.chip('EJECTED',p.team.c1,`#${p.pl.num} ${p.pl.last}`)}
const isOut=pl=>!!pl&&!!S.ejected&&S.ejected.includes(pl.id);
function penSnap(){try{return JSON.stringify({s:S.stats,o:S.ostats,p:S.pst,op:S.opst,dx:S.dxp,dr:S.drive?S.drive.res||null:null})}catch(e){return null}}
function penRestore(pl){if(!pl.st0)return;const o=JSON.parse(pl.st0);S.stats=o.s;S.ostats=o.o;S.pst=o.p;S.opst=o.op;S.dxp=o.dx;if(S.drive)S.drive.res=o.dr;pl.st0=null}

/* ---------- replay review: a short beat, then the ruling ---------- */
function reviewBeat(what,call,res,cb){
  S.phase='wait';hideActs();$('#toBtn').hidden=true;
  const card=(a,b)=>{if(typeof BC!=='undefined'&&typeof BC.card==='function'&&LG.settings.gfx!==false)BC.card('REPLAY REVIEW',esc(a),b,'#33415C',false);else toast(a+(b?' · '+b:''))};
  card('Play under review',what);sfx('whistle');
  setTimeout(()=>{const t=call==='overturned'?'Overturned':call==='confirmed'?'Confirmed':'Ruling stands';card(t,res);fx('review',{call,what,res});logPBP(`Replay review · ${what} · ${t}${res?' · '+res:''}`);setTimeout(cb,1100)},1500);
}
/* booth reviews of close calls on scrimmage plays: goal line / pylon touchdowns, goal-line spots, sideline catches.
   A call is overturned only when the engine's own data disagrees with it: pl.glBall (where the ball really was at
   the goal line, 05 endPlay) and pl.toe (the true toe tap vs the official's call, 05d resolveCatch) */
function reviewCheck(pl){
  pl.revDone=1;const r=pl.result;if(S.conv||!r||pl.st)return false;
  if(r.kind==='td'&&pl.tdRaw!=null&&(pl.tdRaw<110.4||pl.tdY<1.2||pl.tdY>FW-1.2)){
    const ok=pl.tdRaw>=110||(pl.glBall!=null?pl.glBall:pl.tdRaw+.45*(pl.fp||0))>=110;
    reviewBeat('Touchdown · did the ball break the plane?',ok?'confirmed':'overturned',ok?'Touchdown':'Runner down short of the goal line',()=>{if(!ok)overturnTD(pl);applyResult()});return true}
  if(r.kind==='tackle'&&pl.glBall!=null&&r.x>=109&&r.x<110){const td=pl.glBall>=110;
    if(td||Math.random()<.5){reviewBeat('Goal line · did the ball break the plane?',td?'overturned':'stands',td?'Touchdown · the ball crossed before the knee went down':'Short of the goal line',()=>{if(td)spotTD(pl);applyResult()});return true}}
  const toe=pl.toe,wrong=!!toe&&toe.call!==toe.inb;
  if(r.kind==='inc'&&r.msg==='No feet in bounds'&&(wrong||Math.random()<.6)){reviewBeat('Catch at the sideline',wrong?'overturned':'stands',wrong?'Catch · the toe was down in bounds':'Incomplete · no foot down in bounds',()=>{if(wrong)toeCatch(pl);applyResult()});return true}
  if(pl.caught&&(r.kind==='tackle'||r.kind==='oob')&&(wrong||pl.sideCatch&&Math.random()<.5)){reviewBeat('Catch at the sideline',wrong?'overturned':'stands',wrong?'Incomplete · no foot down in bounds':'Catch · a foot down in bounds',()=>{if(wrong)toeInc(pl);applyResult()});return true}
  return false;
}
/* goal-line spot overturned: the ball broke the plane, a touchdown from the previous spot */
function spotTD(pl){
  const r=pl.result,c=pl.carrier||Q,st=tstat(),d=Math.round(110-S.los)-Math.round(r.x-S.los);
  if(pl.caught){st.passTD++;st.passYds+=d;ps(Q).ptd++;ps(Q).py+=d;if(c&&c.pl){ps(c).rectd++;ps(c).recy+=d}}
  else if(c&&c.pl){st.rushTD++;st.rushYds+=d;ps(c).rtd++;ps(c).ry+=d}
  r.kind='td';r.x=110;banner('Overturned · touchdown',offT().c1);
}
/* sideline catch overturned to a catch: the receiver is down / out at the spot of the catch */
function toeCatch(pl){
  const t=pl.toe,rec=t.rec,st=tstat(),td=t.cx>=110,x=td?110:Math.min(t.cx,109.9),g=Math.round(x-S.los);
  st.comp++;ps(Q).pc++;ps(rec).rec++;st.passYds+=g;ps(Q).py+=g;ps(rec).recy+=g;if(g>=20)st.bigPlays++;if(td){st.passTD++;ps(Q).ptd++;ps(rec).rectd++}
  const lp=uOff()&&S.stats.passes?S.stats.passes[S.stats.passes.length-1]:null;if(lp&&lp.res==='X'){lp.res='C';lp.yds=g}
  pl.caught=true;pl.catchX=x;pl.carrier=rec;Object.assign(pl.result,{kind:td?'td':'oob',x,y:t.cy<CEN?0:FW,msg:''});
  if(td){pl.tdRaw=null;banner('Overturned · touchdown',offT().c1)}else banner('Overturned · catch','#5B6672');
}
/* sideline catch overturned to an incompletion: the completion and its yards come off */
function toeInc(pl){
  const r=pl.result,rec=pl.carrier,st=tstat(),g=Math.round(r.x-S.los),yac=Math.max(0,Math.round(r.x-pl.catchX));
  st.comp--;st.passYds-=g;st.yac-=yac;ps(Q).pc--;ps(Q).py-=g;if(rec&&rec.pl){ps(rec).rec--;ps(rec).recy-=g}if(g>=20)st.bigPlays--;
  const lp=uOff()&&S.stats.passes?S.stats.passes[S.stats.passes.length-1]:null;if(lp&&lp.res==='C'){lp.res='X';lp.yds=0;lp.yac=0}
  pl.caught=false;Object.assign(r,{kind:'inc',x:S.los,y:S.ballY,msg:'No feet in bounds'});banner('Overturned · incomplete','#5B6672');
}
function overturnTD(pl){
  const r=pl.result,c=pl.carrier||Q,st=tstat(),x=clamp(pl.tdRaw+.45*(pl.fp||0),108.6,109.6),d=Math.round(110-S.los)-Math.round(x-S.los);
  if(pl.caught){st.passTD--;st.passYds-=d;ps(Q).ptd--;ps(Q).py-=d;if(c&&c.pl){ps(c).rectd--;ps(c).recy-=d}}
  else if(c&&c.pl){st.rushTD--;st.rushYds-=d;ps(c).rtd--;ps(c).ry-=d}
  r.kind='tackle';r.x=x;S.celebrate=null;$('#celebBtn').hidden=true;banner('Overturned · down at the 1','#5B6672');
}

/* ---------- pre-snap fouls: the play never starts ---------- */
function rulesPreSnap(){
  const m=penMul();if(!m||S.conv)return false;
  const nz=crowdNoise(),dO=discOf(offT())*m,dD=discOf(defT())*m,roll=p=>Math.random()<p;let f=null;
  if(roll(.0115*dO*(1+1.8*nz)))f={k:'fs',side:'o'};
  else if(roll(.0035*dO*(1+.8*nz)))f={k:'ifm',side:'o'};
  else if(roll(.003*dO))f={k:Math.random()<.6?'imo':'ish',side:'o'};
  else if(!uOff()&&roll(.0035*dO*(1+nz)))f={k:'dog',side:'o'};
  else if(roll(.0009*m))f={k:'tmm',side:Math.random()<.65?'d':'o'};
  else if(roll(.0085*dD))f={k:Math.random()<.5?'nzi':'enc',side:'d'};
  if(!f)return false;
  penPre(f,nz>.35&&f.k==='fs'?' · crowd noise':'');return true;
}
/* 5 yards from the previous spot (half the distance near a goal line); the offense replays the down, the defense can give a first down */
function penPre(f,extra){
  f.team=f.side==='o'?offT():defT();
  S.phase='wait';hideActs();['#call','#opt','#snapBar'].forEach(s=>$(s).hidden=true);$('#toBtn').hidden=true;
  fx('flag',{x:S.los+(f.side==='o'?-1.5:1.2),y:S.ballY+R(-3,3),on:f.side,team:f.team,k:f.k});
  let y;if(f.side==='o'){y=Math.min(5,(S.los-10)/2);S.los-=y}else{y=Math.min(5,(110-S.los)/2);S.los+=y;if(S.los>=S.firstDownX){S.down=1;S.firstDownX=Math.min(110,S.los+10)}}
  S.los=Math.round(S.los*2)/2;penStat(f.team,f.k,y);
  const ran=!!S.clockRun;if(S.clockRun)S.clockHold=Math.max(S.clockHold||0,1.6);   // a running clock restarts on the ready signal
  penAnnounce(`${PN[f.k]} · ${sideWord(f)} · ${y<5?'half the distance':y+' yards'} · ${ddAt(S.los,S.down,S.firstDownX)}${extra||''}`);
  fx('penalty',{name:PN[f.k],yards:y,on:f.side,team:f.team,accepted:true,k:f.k});
  const go=()=>setTimeout(()=>{if(S.phase==='wait')toPresnap()},1000);
  if(ran&&runoffDue(f))return setTimeout(()=>runoffOffer(f,go),900);
  go();
}

/* ---------- NCAA 3-4-4: the 10-second runoff ----------
   An offensive foul that stops a running clock in the last minute of a half gives the defense the option of a
   10-second subtraction (scaled to the compressed game clock, like the two-minute timeout). The offense can stop it
   with a timeout; with less time left than the runoff, the half is over. A declined penalty has no runoff. */
const lastMin=()=>!S.ot&&(S.q===2||S.q===4)&&S.clock>0&&S.clock<=lateThr()/2+.01;
const runoffSec=()=>Math.max(3,Math.round(10*lateThr()/120));
const runoffDue=f=>!!f&&f.side==='o'&&!S.conv&&lastMin();
function runoffOffer(f,cont){
  if(!runoffDue(f))return cont();
  const def=defT(),off=offT(),di=def===S.home?0:1,oi=1-di,lead=S.score[di]-S.score[oi],sec=runoffSec(),left=Math.max(0,S.clock-sec),hw=S.q===2?'half':'game';
  S.phase='wait';hideActs();$('#toBtn').hidden=true;
  const doRun=()=>{S.clock=left;S.untimed=false;S.clockRun=left>0;S.clockHold=left>0?1.6:0;
    penAnnounce(`10-second runoff · ${def.abbr} takes it · ${left>0?fmtClock(left)+' left':'that ends the '+hw}`);fx('runoff',{team:def,sec,left});
    if(left<=0){S.phase='wait';return setTimeout(()=>boundary(()=>toPresnap()),1100)}
    cont()};
  const useTO=()=>{S.to[oi]--;(S.toDB||(S.toDB=[0,0]))[oi]=1;S.clockRun=false;S.clockHold=0;fx('timeout',{team:off});
    toast(`Timeout ${off.abbr} · no runoff · ${S.to[oi]} left`);logPBP(`${off.abbr} uses a timeout to avoid the 10-second runoff`);cont()};
  /* the offense may burn a timeout to keep the seconds */
  const runIt=()=>{
    if(S.to[oi]<=0)return doRun();
    if(off===S.home)return showOpt(`<b>10-second runoff</b> · ${esc(def.abbr)} takes it · clock to ${fmtClock(left)}`,[{t:'Call timeout',s:`No runoff · ${S.to[oi]} left`,f:useTO},{t:'Take the runoff',s:left<=0?`Ends the ${hw}`:`Clock to ${fmtClock(left)}`,cls:'alt',f:doRun}]);
    const need=S.q===4?lead>=0:S.los>=45;   // CPU offense: keep the time when it has to score (or is in range before the half)
    return need?useTO():doRun()};
  if(def===S.home){const rec=S.q===2||lead>=0,A={t:'Take the runoff',s:left<=0?`Ends the ${hw}`:`Clock to ${fmtClock(left)}`,f:runIt},D={t:'No runoff',s:`Clock stays at ${fmtClock(S.clock)}`,cls:'alt',f:cont};
    penAnnounce(`${PN[f.k]} · ${sideWord(f)} · 10-second runoff option`);
    return showOpt(`<b>🚩 ${esc(PN[f.k])}</b> · inside the last minute · take a 10-second runoff?`,rec?[A,D]:[D,A])}
  /* CPU defense: protect a lead or a tie, and give nobody extra time before the half */
  return S.q===2||lead>=0?runIt():cont();
}

/* ---------- live-ball fouls: scheduled at the snap, flagged at the spot ---------- */
function penFlag(k,side,p,x,y,o){
  const pl=play;if(!pl||!pl.fouls||pl.ended||pl.fouls.some(f=>f.k===k))return null;
  const f=Object.assign({k,side,team:side==='o'?offT():defT(),p,x,y},o||{});pl.fouls.push(f);
  fx('flag',{x,y,on:side,team:f.team,k});if(pl.fouls.length===1)toast('Flag on the play');return f;
}
function rulesSnap(pl){
  pl.fouls=[];pl.pend=[];pl.st0=PEN_ST0;PEN_ST0=null;S.toDB=[0,0];
  const m=penMul();if(!m||S.conv||pl.fake)return;
  const nz=crowdNoise(),dO=discOf(offT())*m,dD=discOf(defT())*m;
  if(Math.random()<.027*dO*(1+.25*nz))pl.pend.push({k:'oh',t:R(.4,2.2)});
  if(pl.type==='pass'&&Math.random()<.011*dD)pl.pend.push({k:'dh',t:R(.6,1.9)});
  if(Math.random()<.0035*dD)pl.pend.push({k:'offs',t:.05});
  if(nz>.35&&uOff())for(const o of OFF)if(o.role==='OL')o.spd*=1-.08*nz;   // silent count: the line is a beat late off the ball
}
function rulesTick(pl){
  if(!pl.fouls||pl.ended)return;
  if(pl.st)stFoulTick(pl);
  const q=pl.pend;if(!q||!q.length)return;
  for(let i=q.length-1;i>=0;i--){const e=q[i];if(pl.t<e.t)continue;if(penTry(pl,e)||pl.t>e.t+(e.w||1.2))q.splice(i,1)}
}
function penTry(pl,e){
  switch(e.k){
    case 'oh':{if(pl.st)return true;let b=null,bs=-9;for(const d of DEF){const o=d.engBy;if(!o||!d.engaged||o.side!=='o')continue;const s=(d.pl.shd+.5*d.pl.str)-(o.pl.blk+.5*o.pl.str)+R(-1,1);if(s>bs){bs=s;b=o}}
      if(!b)return false;penFlag('oh','o',b,b.x,b.y);return true}
    case 'dh':{if(pl.st||pl.thrown||pl.caught||pl.handed)return true;for(const d of DEF){if(d.role==='DL'||d.stun>0)continue;for(const r of OFF){if(!eligible(r)||r.blocker||r.x<S.los+1)continue;if(hyp(d.x-r.x,d.y-r.y)<1.5){penFlag('dh','d',d,d.x,d.y);return true}}}return false}
    case 'offs':{if(pl.st)return true;const d=DEF.find(d=>d.role==='DL');if(d)penFlag('offs','d',d,Math.min(119,S.los+.8),d.y);return true}
    case 'rtp':{if(pl.st||!Q)return true;for(const d of DEF){if(d.engaged||d.stun>0)continue;if(hyp(d.x-Q.x,d.y-Q.y)<1.25&&hyp(d.vx,d.vy)>3.5){if(Math.random()<.1*e.m){penFlag('rtp','d',d,Q.x,Q.y);setAnim(Q,'tackled');Q.fallen=true}return true}}return false}
    case 'pi':{if(pl.st)return true;if(ball.state!=='air'||ball.pitch||ball.tip||pl.throwAway)return true;
      const rec=pl.intended||nearest(OFF,ball.tx,ball.ty,o=>eligible(o)&&!o.blocker)[0];if(!rec)return true;
      const [d,dd]=nearest(DEF,rec.x,rec.y,o=>o.stun<=0&&!o.fallen);if(!d||dd>1.7)return dd>4;
      const close=(1.7-dd)/1.2;
      if(rec.x>S.los+1&&Math.random()<.075*close*e.dD*(1+.12*(3-d.pl.cov))){penFlag('dpi','d',d,Math.min(rec.x,119.5),rec.y);return true}
      if(Math.random()<.03*close*e.dO){penFlag('opi','o',rec,rec.x,rec.y);return true}
      return true}
    case 'ibb':{const st=pl.st;if(!st||st.phase!=='ret')return true;const c=pl.carrier;for(const b of P){if(b.side!=='o'||b===c||!b.eng||!b.engaged)continue;penFlag('ibb','o',b,b.x,b.y);return true}return false}
  }
  return true;
}
/* kick plays: kick-catch interference as the ball comes down, blocks in the back on the return */
function stFoulTick(pl){
  const st=pl.st,m=penMul();if(!m||!(st.kind==='ko'||st.kind==='punt'))return;
  if(st.phase==='air'&&!pl.kciDone&&ball.kick&&st.fielder&&!st.noCatch&&ball.T-ball.t<.3){pl.kciDone=true;const f=st.fielder,[c,cd]=nearest(P,f.x,f.y,p=>p.side==='d'&&p.stun<=0);
    if(c&&cd<1.1&&Math.random()<.3*discOf(c.team)*m)penFlag('kci','d',c,f.x,f.y)}
  if(st.phase==='ret'&&!pl.ibbDone){pl.ibbDone=true;if(Math.random()<.075*discOf(st.rt)*m)pl.pend.push({k:'ibb',t:pl.t+R(.4,1.6),w:1.5})}
}
/* the punt leaves the foot: running into (5) / roughing the kicker (15 + first down) */
function rulesPuntKick(k){const pl=play,m=penMul();if(!m||!pl||!pl.fouls)return;const q=discOf(pl.st.rt)*m;if(Math.random()<.012*q){const [r]=nearest(P,k.x,k.y,p=>p.side==='o');penFlag(Math.random()<.35?'rok':'rik','o',r||k,k.x,k.y)}}

onFx('catch',e=>{const pl=play;if(!pl||!e.p)return;pl.catchT=pl.t;if(e.p.y<1.1||e.p.y>FW-1.1)pl.sideCatch=true});
onFx('throw',e=>{
  const pl=play;if(!pl||!pl.fouls||pl.st||S.conv||pl.ended)return;const m=penMul();if(!m)return;
  const dO=discOf(offT())*m,dD=discOf(defT())*m,qb=e.qb||Q;if(!qb)return;
  if(qb.x>S.los+.4){penFlag('ifp','o',qb,qb.x,qb.y);return}
  const tx=e.x,ty=e.y,pr=pressure(),box=Math.abs(qb.y-S.ballY)<3.6,near=OFF.some(o=>eligible(o)&&!o.blocker&&hyp(o.x-tx,o.y-ty)<7);
  if(!near&&pr>.55&&(box||tx<S.los)&&Math.random()<.4*Math.min(1.3,dO)){penFlag('ig','o',qb,qb.x,qb.y);return}
  if(tx>S.los+1){const ol=OFF.find(o=>o.role==='OL'&&o.x>S.los+3);if(ol&&Math.random()<.5)penFlag('idf','o',ol,ol.x,ol.y);else if(Math.random()<.0025*dO){const r=pick(OFF.filter(o=>o.role==='OL'));if(r)penFlag('idf','o',r,S.los+3.5,r.y)}}
  pl.pend.push({k:'rtp',t:pl.t+.05,w:.45,m:dD});
  if(!pl.throwAway)pl.pend.push({k:'pi',t:pl.t+ball.T*.8,w:ball.T*.35,dO,dD});
});
/* personal fouls at the tackle: targeting (big hits, defenseless receivers), face mask, late hits at the sideline */
onFx('tackle',e=>{
  const pl=play,c=e.c,d=e.d;if(!pl||!pl.fouls||!c||!d||S.conv||pl.ended)return;const m=penMul();if(!m)return;
  if(pl.st){if(!(pl.st.kind==='ko'||pl.st.kind==='punt')||d.side!=='d')return}else if(c.side!=='o'||d.side!=='d')return;
  const k=discOf(d.team)*m,defenseless=pl.caught&&pl.t-(pl.catchT||0)<.6,side=c.y<1.3||c.y>FW-1.3;
  if(e.big&&Math.random()<(defenseless?.04:.012)*k){penFlag('tgt','d',d,c.x,c.y,{real:Math.random()<.68});return}
  if(Math.random()<.005*k){penFlag('fm','d',d,c.x,c.y);return}
  if(side&&Math.random()<.04*k){penFlag('lh','d',d,c.x,c.y);return}
  if(Math.random()<.0025*k)penFlag('ur','d',d,c.x,c.y);
});

/* ---------- enforcement (scrimmage plays) ---------- */
/* expected points for the team with the ball at x (own goal line 10), down d, togo yards */
const epx=(x,d,t)=>-1.1+.068*(x-10)-[0,0,.3,.85,1.7][clamp(d,1,4)]-(d>1?.05*Math.max(0,t-4):0);
function outVal(o){if(o.td)return 6.3;if(o.dtd)return -6.3;if(o.safety)return -2.6;if(o.to!=null)return -epx(o.to,1,10);if(o.down>4)return -epx(120-o.x,1,10);return epx(o.x,o.down,o.fdx-o.x)}
/* the result if the foul is declined (what applyResult / stApply would do) */
function declineOut(pl){
  const r=pl.result,L=S.los,fd=S.firstDownX,dn=S.down;let x;
  if(pl.st){const p0=pl.st.poss0==='away'?S.away:S.home;if(r.team!==p0){if(r.sk==='td')return {dtd:1,txt:'Keep the turnover touchdown'};return {to:r.side==='d'?120-r.x:r.x,txt:'Keep the turnover'}}
    if(r.sk==='td')return {td:1,txt:'Keep the touchdown'};x=r.side==='o'?r.x:120-r.x}
  else{if(r.kind==='td')return {td:1,txt:'Keep the touchdown'};x=r.kind==='inc'?L:Math.min(109.9,r.x)}
  if(x<=10)return {safety:1,txt:'Take the safety'};
  const g=Math.round(x-L),lab=r.kind==='inc'?'Incomplete':g?`${g>0?'+':''}${g} yd play`:'No gain';
  if(x>=fd)return {x,down:1,fdx:Math.min(110,x+10),txt:`${lab} · ${ddAt(x,1,Math.min(110,x+10))}`};
  if(dn>=4)return {x,down:5,fdx:fd,txt:`${lab} · turnover on downs`};
  return {x,down:dn+1,fdx:fd,txt:`${lab} · ${ddAt(x,dn+1,fd)}`};
}
function enforce(f,pl){
  const L=S.los,fd=S.firstDownX,dn=S.down,r=pl.result,pass=!!pl.thrown,k=f.k;
  const run=!pl.st&&['tackle','oob','sack'].includes(r.kind)?Math.min(109.9,r.x):!pl.st&&r.kind==='td'?110:L;
  const basic=pass&&!pl.caught?L:Math.max(L,run);
  const fin=(x,o)=>{o=o||{};x=Math.round(x*2)/2;const first=o.afd||x>=fd,lod=!!o.lod;const down=first?1:lod?dn+1:dn,fdx=first?Math.min(110,x+10):fd;
    const yds=o.yds!=null?o.yds:Math.abs(Math.round(x-(o.base!=null?o.base:L)));
    return {f,x,down,fdx,first,lod,afd:!!o.afd,keep:!!o.keep,yds,txt:`${o.lab||yds+' yards'}${o.afd?', automatic first down':lod?', loss of down':first?' · first down':', replay the down'} · ${down>4?'turnover on downs':ddAt(x,down,fdx)}`}};
  if(f.side==='o'){
    if(k==='oh'){if(f.x<=10)return {f,safety:1,yds:0,txt:'Holding in the end zone · safety'};const base=pass?L:Math.min(f.x,basic),y=Math.min(10,(base-10)/2);return fin(base-y,{base,yds:Math.round(y+(L-base)),lab:y<10?'Half the distance':base===L?'10 yards':'10 yards from the spot'})}
    if(k==='opi'){const y=Math.min(10,(L-10)/2);return fin(L-y,{lab:y<10?'Half the distance':'10 yards'})}
    if(k==='idf'){const y=Math.min(5,(L-10)/2);return fin(L-y,{lab:y<5?'Half the distance':'5 yards'})}
    if(k==='ig'){const x=Math.min(L,f.x);if(x<=10)return {f,safety:1,yds:0,txt:'Intentional grounding in the end zone · safety'};return fin(x,{lod:1,base:L,lab:'Loss of down at the spot'})}
    if(k==='ifp'){const y=Math.min(5,(f.x-10)/2);return fin(f.x-y,{lod:1,base:L,lab:'5 yards from the spot'})}
  }
  if(k==='offs'){const y=Math.min(5,(110-L)/2);return fin(L+y,{lab:y<5?'Half the distance':'5 yards'})}
  if(k==='dh'){const base=pass?L:basic,y=Math.min(10,(110-base)/2);return fin(base+y,{afd:1,base:L,keep:base!==L,yds:Math.round(y)})}
  if(k==='dpi'){let x=f.x>=110?Math.min(L+15,108):Math.min(L+15,f.x);if(x<=L)x=L+Math.min(15,(110-L)/2);x=Math.min(x,109.5);return fin(x,{afd:1,lab:x-L>=15?'15 yards':'Spot foul'})}
  /* personal fouls: from the end of the run when it ends beyond the line, else from the previous spot */
  const base=(k==='rtp'?pl.caught:(!pass||pl.caught))&&run>L?run:L,y=Math.min(15,(110-base)/2);
  return fin(base+y,{afd:1,base:L,keep:base!==L,yds:Math.round(y),lab:y<15?'Half the distance':'15 yards'});
}
function penResolve(){
  const pl=play,F=pl.fouls;S.phase='wait';hideActs();$('#toBtn').hidden=true;
  const tg=F.find(f=>f.k==='tgt'&&!f.rev);
  if(tg){tg.rev=1;const who=`#${tg.p.pl.num} ${tg.p.pl.last}`;return reviewBeat(`Targeting · ${tg.team.abbr} ${who}`,tg.real?'confirmed':'overturned',tg.real?`Targeting confirmed · ${who} is ejected`:'No targeting · the flag is picked up',()=>{if(tg.real)eject(tg.p);else F.splice(F.indexOf(tg),1);penResolve()})}
  if(!F.length){pl.penDone=true;return applyResult()}
  const fo=F.filter(f=>f.side==='o'),fd=F.filter(f=>f.side==='d');
  if(fo.length&&fd.length){
    pl.penDone=true;penRestore(pl);S.clockRun=playRun(pl.result);S.clockHold=S.clockRun?2:0;if(!S.ot&&S.clock<=0){S.untimed=true;S.clockRun=false}
    penAnnounce(`Offsetting fouls · ${PN[fo[0].k]} on ${fo[0].team.abbr}, ${PN[fd[0].k]} on ${fd[0].team.abbr} · replay the down`);
    fx('penalty',{name:'Offsetting fouls',yards:0,on:'both',team:null,accepted:true});return setTimeout(nextSnap,1100);
  }
  const side=fo.length?'o':'d',list=side==='o'?fo:fd,sg=side==='o'?-1:1;   // sg: value sign for the offended team
  let best=null,bv=-1e9;for(const f of list){const a=enforce(f,pl),v=outVal(a)*sg;if(v>bv){bv=v;best=a}}
  const dec=declineOut(pl),dv=outVal(dec)*sg,offended=side==='o'?defT():offT();
  const acc=()=>penAccept(best),decl=()=>penDecline(best.f);
  if(offended!==S.home)return (bv>=dv?acc:decl)();
  if(dec.td||dv>bv+2.5)return decl();
  if(bv>=dv+.25)return acc();
  const f=best.f,A={t:'Accept',s:best.txt,f:acc},D={t:'Decline',s:dec.txt,cls:'alt',f:decl};
  penAnnounce(`${PN[f.k]} · ${sideWord(f)} · your call`);
  showOpt(`<b>🚩 ${esc(PN[f.k])}</b> · ${esc(sideWord(f))} · accept or decline?`,bv>=dv?[A,D]:[D,A]);
}
function penDecline(f){const pl=play;pl.penDone=true;penAnnounce(`${PN[f.k]} · ${sideWord(f)} · declined`);fx('penalty',{name:PN[f.k],yards:0,on:f.side,team:f.team,accepted:false,k:f.k});applyResult()}
function penAccept(a){
  const pl=play,f=a.f;pl.penDone=true;if(!a.keep)penRestore(pl);if(pl.st&&pl.st.ck){S.ctrlKey=pl.st.ck;S.ctrl=null}
  penStat(f.team,f.k,a.yds);fx('penalty',{name:PN[f.k],yards:a.yds,on:f.side,team:f.team,accepted:true,k:f.k});
  S.clockRun=playRun(pl.result);S.clockHold=S.clockRun?2.2:0;S.celebrate=null;$('#celebBtn').hidden=true;
  penAnnounce(`${PN[f.k]} · ${sideWord(f)} · ${a.txt}`);
  if(a.safety)return setTimeout(scoreSafety,900);
  S.los=clamp(a.x,11,109.5);S.down=a.down;S.firstDownX=a.fdx;if(a.keep)S.ballY=clamp(pl.result.y,HASH1,HASH2);
  if(!S.ot&&S.clock<=0&&!a.lod){S.untimed=true;S.clockRun=false}   // a half can't end on an accepted live-ball foul
  if(S.down>4)return setTimeout(()=>turnoverDowns(S.los),900);
  if(a.first){tstat().firstDowns++;fx('firstDown',{x:S.los,team:offT()})}
  /* the foul stopped a clock that would have kept running: the 10-second runoff option */
  if(!pl.st&&playRun(pl.result)&&runoffDue(f))return setTimeout(()=>runoffOffer(f,()=>setTimeout(nextSnap,600)),900);
  setTimeout(nextSnap,1000);
}

/* ---------- enforcement on kickoffs and punts (S.poss = the receiving team, which attacks +x) ---------- */
function penResolveKick(){
  const pl=play,st=pl.st,r=pl.result,F=pl.fouls;S.phase='wait';hideActs();
  const tg=F.find(f=>f.k==='tgt'&&!f.rev);
  if(tg){tg.rev=1;const who=`#${tg.p.pl.num} ${tg.p.pl.last}`;return reviewBeat(`Targeting · ${tg.team.abbr} ${who}`,tg.real?'confirmed':'overturned',tg.real?`Targeting confirmed · ${who} is ejected`:'No targeting · the flag is picked up',()=>{if(tg.real)eject(tg.p);else F.splice(F.indexOf(tg),1);penResolveKick()})}
  const fo=F.filter(f=>f.side==='o'),fd=F.filter(f=>f.side==='d'),done=()=>{pl.penDone=true;applyResult()};
  if(!F.length)return done();
  /* offsetting fouls on a kick: the kick is replayed (its kick and return stats come off) */
  if(fo.length&&fd.length){pl.penDone=true;penAnnounce('Offsetting fouls · re-kick');S.clockRun=false;S.clockHold=0;
    if(st.s0)for(const [t,k0] of [[S.home,st.s0[0]],[S.away,st.s0[1]]]){const s=t===S.home?S.stats:S.ostats;if(s)for(const k of ST_KEYS)s[k]=k0[k]||0}
    return setTimeout(()=>{if(st.kind==='ko')return stKickoff(st.rt===S.home?'home':'away',st.sub,120-st.spot,'Re-kick');S.los=st.L;S.firstDownX=120-st.ltg;S.ballY=st.by!=null?st.by:CEN;S.down=4;stPunt(st.kt===S.home?'home':'away')},1000)}
  const f=(fo.length?fo:fd)[0],rt=st.rt,kt=st.kt,recv=r.team===rt&&r.sk!=='safety',endX=r.sk==='td'&&r.team===rt?110:recv?r.x:null;
  const decline=()=>{penAnnounce(`${PN[f.k]} · ${sideWord(f)} · declined`);fx('penalty',{name:PN[f.k],yards:0,on:f.side,team:f.team,accepted:false,k:f.k});done()};
  const recvBall=(x,y,txt)=>{x=Math.round(clamp(x,11,109)*2)/2;pl.penDone=true;penStat(f.team,f.k,y);fx('penalty',{name:PN[f.k],yards:y,on:f.side,team:f.team,accepted:true,k:f.k});
    penAnnounce(`${PN[f.k]} · ${sideWord(f)} · ${txt} · ${rt.abbr} ball at the ${spotLabelFor(x,rt===S.home?'home':'away')}`);S.clockRun=false;S.clockHold=0;
    setTimeout(()=>{if(S.ot)return otNext(st.poss0||'home');rt===S.home?toUser(x,'Penalty on the kick'):toOpp(110-x,'Penalty on the kick')},1000)};
  if(f.k==='ibb'){   // the return team: 10 yards from the spot of the foul (or from the end of the run, if that is shorter); in its own end zone = safety
    if(!recv)return decline();
    const base=Math.min(f.x,endX),wiped=Math.max(0,Math.round(endX-base));   // the return only counts to the spot of the foul
    if(wiped||r.sk==='td'){const ko=st.kind==='ko';sAdd(rt,ko?'krYds':'prYds',-wiped);if(r.sk==='td')sAdd(rt,ko?'krTD':'prTD',-1)}
    if(base<=10){pl.penDone=true;penStat(f.team,f.k,0);penAnnounce(`${PN[f.k]} · ${sideWord(f)} · in the end zone · safety`);return setTimeout(scoreSafety,900)}
    const y=Math.min(10,(base-10)/2);return recvBall(base-y,y,y<10?'half the distance':'10 yards from the spot')}
  if(f.k==='kci'){const y=Math.min(15,(110-f.x)/2),ax=f.x+y,user=rt===S.home;
    if(!recv||endX==null||endX<ax)return recvBall(ax,y,'15 yards from the spot');
    if(r.sk==='td')return decline();
    if(!user)return decline();
    return showOpt(`<b>🚩 ${PN.kci}</b> · ${esc(kt.abbr)} · accept or decline?`,[{t:'Decline',s:`Keep the return · ball at the ${spotLabelFor(endX,'home')}`,f:decline},{t:'Accept',s:`15 yards · ball at the ${spotLabelFor(Math.min(109,ax),'home')}`,cls:'alt',f:()=>recvBall(ax,y,'15 yards from the spot')}])}
  if(f.k==='rik'||f.k==='rok'){   // the kicking team may keep the ball: from the previous spot
    const ks=kt===S.home?'home':'away',L=st.L,ltg=120-st.ltg,y=Math.min(f.k==='rok'?15:5,(110-L)/2),nx=Math.round((L+y)*2)/2,first=f.k==='rok'||nx>=ltg,down=first?1:4,fdx=first?Math.min(110,nx+10):ltg;
    const av=epx(nx,down,fdx-nx),dvv=r.sk==='td'&&r.team===rt?-6.3:recv?-epx(endX,1,10):r.team===kt&&r.sk==='td'?6.3:r.team===kt?epx(120-r.x,1,10):-epx(30,1,10);
    const accept=()=>{pl.penDone=true;penStat(f.team,f.k,y);fx('penalty',{name:PN[f.k],yards:y,on:f.side,team:f.team,accepted:true,k:f.k});
      penAnnounce(`${PN[f.k]} · ${sideWord(f)} · ${Math.round(y)} yards${f.k==='rok'?', automatic first down':''} · ${kt.abbr} keeps it · ${ddAt(nx,down,fdx,ks)}`);
      setTimeout(()=>{S.poss=ks;S.los=nx;S.down=down;S.firstDownX=fdx;S.ballY=CEN;S.conv=false;S.rzActive=false;S.clockRun=false;
        if(ks==='away'&&down===1)return boundary(()=>oppPossession(110-nx,'Penalty on the punt'));boundary(toPresnap)},1000)};
    if(kt!==S.home)return (av>=dvv?accept:decline)();
    if(av>=dvv+.25)return accept();
    return showOpt(`<b>🚩 ${PN[f.k]}</b> · ${esc(rt.abbr)} · accept or decline?`,[{t:'Decline',s:'Keep the result of the punt',f:decline},{t:'Accept',s:`${Math.round(y)} yards · ${ddAt(nx,down,fdx,ks)}`,cls:'alt',f:accept}])}
  /* personal fouls by the kicking team on the returner: 15 from the end of the return */
  if(!recv||r.sk==='td')return decline();
  const y=Math.min(15,(110-endX)/2);return recvBall(endX+y,y,'15 yards from the end of the return');
}

/* box score rows: penalties by type (count-yards per team) */
function penRowsHTML(s,o,row){
  const a=s.penBy||{},b=o.penBy||{},keys=[...new Set(Object.keys(a).concat(Object.keys(b)))];
  keys.sort((x,y)=>((b[y]||[0])[0]+(a[y]||[0])[0])-((b[x]||[0])[0]+(a[x]||[0])[0]));
  const c=e=>e?`${e[0]}-${e[1]}`:'–';return keys.map(k=>row(`&nbsp;· ${esc(k)}`,c(a[k]),c(b[k]))).join('');
}
