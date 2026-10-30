/* =========================================================
   05d · Passing & coverage (Step 7)
   Throw: aimError(d,bullet,lob) = error radius in yards from acc and distance, worse under pressure (nearest
   rusher inside PASS.prR yd, closer = worse; pressure()), off-platform (QB moving / feet not set: Q.setT builds while
   he stands still) and near max range (maxRange() from thr). flightT: thr sets ball speed; bullets are fast and flat
   (harder to catch up close), lobs float (apex d*.18+1.3) over underneath defenders but hang for the DBs. The error
   splits into along (ball.err: short = DBs undercut, long = sails) and lateral parts. Release: anim 'throw', fx throw.
   In flight (ballFlight): a defender the ball passes within reach of (arc height vs his reach) can get a hand on it:
   DL in the lane bat passes at the line (more vs short QBs), LBs/DBs undercut low throws. A deflection pops the
   ball up (ball.tip) and whoever gets under it can catch it (tipLand).
   Arrival (resolveCatch): receiver reach (cat, height; a dive reaches further but is harder to hold) vs defender
   position. A defender who gets there first plays the ball (INT / PBU), a close one contests (cov+cat vs cat+str),
   otherwise it is the receiver's hands (cat; bullets, big hits and rain/snow cause drops); sideline / end-line
   catches need a toe-tap. fx catch / drop / deflect; anims catch / dive / swat.
   Coverage (COVS in 05b): man = press jam at the snap by press-capable corners, mirror with cov/spd/agi, reaction
   lag on breaks from rte vs cov (routeBreak), trail technique under two-deep help; zone = real landmarks (flat,
   curl, hook, robber, deep thirds / halves / quarters, Tampa pole) that pattern-match receivers entering them and
   hand verticals off to the deep defenders. Blitzers take gap/edge paths, a man defender whose man stays in to
   block adds to the rush, a spy shadows a mobile QB. Disguise: the shell shown pre-snap can differ (rotation at
   the snap). Play-action: LBs/safeties bite (step up) by awr, opening windows behind them.
   ========================================================= */
const PASS={prR:2.6,dive:1.05,drop:.06,pbu:.24,popUp:.24};

/* ---------- QB: platform, pressure, accuracy, flight ---------- */
function qbTick(dt){const v=hyp(Q.vx,Q.vy);Q.setT=v<1.8?(Q.setT||0)+dt:Math.max(0,(Q.setT||0)-dt*3)}
function pressure(){let p=0;if(!Q)return 0;for(const d of DEF){if(d.stun>0||d.cov&&d.cov.type!=='rush'&&d.role!=='DL')continue;const r=d.engaged?1.4:PASS.prR,k=hyp(d.x-Q.x,d.y-Q.y);if(k<r){const v=(1-k/r)*(d.engaged?.45:1);if(v>p)p=v}}return p}
function aimError(d,bullet,lob){
  const qb=Q;if(!qb)return 1;const v=hyp(qb.vx,qb.vy),set=clamp((qb.setT||0)/.45,0,1),mr=maxRange(),strain=clamp((d/mr-.72)/.28,0,1);
  const wx=S.wx==='Rain'?1.15:S.wx==='Snow'?1.12:S.wx==='Wind'&&d>20?1.25:1;
  const plat=1+Math.min(1,v/5.5)*.6*(1.15-.05*qb.pl.agi)+(1-set)*.15;
  const acc=play&&play.dblDone?Math.max(qb.pl.acc,2.8):qb.pl.acc;   // the trick-play passer is the back or receiver who can throw
  const e=(.3+d*.0074*(6.3-acc))*(1+pressure()*.9)*plat*(1+strain*.6)*(bullet?1.15:lob?.92:1)*wx;
  return e*(qb.user?(focus('passing')?.8:1)/SL('acc'):1.1-S.aiSkill*.2)/coachMod(qb.team,'acc');
}
function flightT(d,bullet,lob,thr){let T=(.2+d*.028+d*d*.00028)*(1.1-.035*thr);if(bullet)T*=.72;else if(lob)T=T*1.28+.08;const mr=maxRange();if(d>mr*.8)T*=1+(d/mr-.8)*.8;return Math.max(.28,T)}
function throwBall(tx,ty,bullet,intended,lob){
  const qb=Q,pl=play,mr=maxRange();let d=hyp(tx-qb.x,ty-qb.y);bullet=!!bullet;lob=!bullet&&!!(lob!=null?lob:qb.user&&S.lob);
  if(d>mr){tx=qb.x+(tx-qb.x)*mr/d;ty=qb.y+(ty-qb.y)*mr/d;d=mr}
  const er=pl.throwAway?0:aimError(d,bullet,lob),ux=(tx-qb.x)/(d||1),uy=(ty-qb.y)/(d||1),a=Math.random()*Math.PI*2,r=er*Math.sqrt(Math.random());
  const along=Math.cos(a)*r*.75,perp=Math.sin(a)*r;tx+=ux*along-uy*perp;ty+=uy*along+ux*perp;
  const T=flightT(Math.max(1,d+along),bullet,lob,qb.pl.thr);
  if(S.wind&&S.wind.mph>3){const k=S.wind.mph/20*.55*T*(lob?1.5:bullet?.4:1);tx+=windX()*k;ty+=windY()*k}
  const dd=hyp(tx-qb.x,ty-qb.y);
  ball={state:'air',fx:qb.x,fy:qb.y,x:qb.x,y:qb.y,z:0,tx,ty,t:0,T,h:bullet?dd*.03+.45:lob?dd*.18+1.3:dd*.11+.5,bullet,lob,spin:0,err:along};haptic('light');
  if(!intended){const [n,nd]=nearest(OFF,tx,ty,o=>eligible(o)&&!o.blocker);intended=nd<8?n:null}
  pl.intended=intended;pl.thrown=true;pl.ballT0=pl.t;pl.carrier=null;qb.throwT=.35;setAnim(qb,'throw',.35);
  if(!S.conv){tstat().att++;ps(qb).pa++}
  sfx(bullet?'zip':'thump');hint('');$('#bulletBtn').hidden=true;hideActs();showActs();
  fx('throw',{qb,to:intended,x:tx,y:ty,bullet,lob});
}
function throwAway(){play.throwAway=true;throwBall(Q.x+10,Q.y<CEN?-4:FW+4,false,null)}
/* CPU throw: pick the ball type for the window, lead the receiver over the real flight time */
function aiThrow(r){
  const pl=play,[df,dd]=nearest(DEF,r.x,r.y,o=>o.stun<=0);let d=hyp(r.x-Q.x,r.y-Q.y),bullet=false,lob=false;
  const deep=r.x-S.los>15&&d>20,trail=df&&df.x<r.x-.3;
  if(deep&&(trail||Math.random()<.3)&&!(pl.dblDone&&dd>3))lob=true;   // a trick passer with a man open lets it go on a lineelse if(d<18&&dd<2.6&&Math.random()<.6)bullet=true;else if(d<11&&Math.random()<.25)bullet=true;
  let T=flightT(d,bullet,lob,Q.pl.thr),tx=r.x,ty=r.y;
  for(let i=0;i<2;i++){tx=r.x+r.vx*T*.92;ty=r.y+r.vy*T*.92;d=hyp(tx-Q.x,ty-Q.y);T=flightT(d,bullet,lob,Q.pl.thr)}
  throwBall(Math.min(tx,119),clamp(ty,.8,FW-.8),bullet,r,lob);
}
/* CPU QB: progression read on predicted windows; awr = better judgment, pressure speeds the clock up */
function passWindow(r){
  const d0=hyp(r.x-Q.x,r.y-Q.y),T=flightT(d0,false,false,Q.pl.thr),px=r.x+r.vx*T*.85,py=r.y+r.vy*T*.85;let w=9;
  for(const d of DEF){if(d.stun>0||d.role==='DL'&&d.engaged)continue;const k=hyp(d.x-px,d.y-py)-Math.max(0,T-.3)*d.spd*.35;if(k<w)w=k;
    /* an underneath defender sitting in the throwing lane */
    if(d.x>Q.x+3&&d.x<px-1){const t=clamp(((d.x-Q.x)*(px-Q.x)+(d.y-Q.y)*(py-Q.y))/((px-Q.x)**2+(py-Q.y)**2||1),0,1),lx=Q.x+(px-Q.x)*t,ly=Q.y+(py-Q.y)*t,l=hyp(d.x-lx,d.y-ly);if(l<1.3&&d0<22)w=Math.min(w,l+.4)}}
  return [w,px];
}
function aiQB(dt){
  const pl=play;if(pl.thrown||pl.scramble||pl.carrier!==Q||pl.fleaHold)return;
  const sk=S.aiSkill,awr=Q.pl.awr,readStart=(pl.screen?.75:pl.pa?1.35:1.05)+(pl.flea?1.2:0)+(pl.screen?0:pl.hold||(pl.hold=R(.2,1.1)));
  if(pl.t<readStart||pl.t<pl.nextRead)return;pl.nextRead=pl.t+.2;
  const pr=pressure(),noise=(1.15-.17*awr)*(1.2-sk*.4);
  let best=null,bs=-1e9,bo=0;
  for(const r of OFF){if(!eligible(r)||r.blocker||r.fallen||r.jamT>0)continue;
    const [w,px]=passWindow(r),depth=px-S.los;
    let s=w*1.1+Math.min(Math.max(depth,0),20)*.15-Math.max(0,depth-15)*.1+(px>=S.firstDownX?1.3:0)-(depth<1&&!pl.screen?1.2:0)-(depth<-1?1:0)+R(-1,1)*noise;
    if(pl.screen&&r.key===pl.screen)s+=pl.t<1.6?6:-2;
    if(S.down>=3&&px<S.firstDownX&&!pl.screen)s-=1.1;
    if(s>bs){bs=s;best=r;bo=w+R(-.6,.6)*noise-Math.max(0,depth-15)*.05}}
  const need=3.6-(pl.t-readStart)*.75-pr*.9;
  if(best&&(bo>=need||pl.t>4.2)){if(bo<.6&&pl.t>3.4&&Math.random()<.5){throwAway();return}aiThrow(best);return}
  if(pr>.5&&pl.t>2.1){if(Q.pl.spd>=3.6&&Math.random()<.3){pl.scramble=true;pl.scrT=pl.t;if(!S.conv){tstat().rushAtt++;ps(Q).ra++}return}if(Math.random()<.18){throwAway();return}}
  if(pl.t>5)throwAway();
}

/* ---------- ball in flight: undercuts, batted balls, pop-ups ---------- */
const reachOf=p=>.95+.11*p.pl.cat+.03*((p.pl.ht||73)-73);
function ballFlight(dt){
  const pl=play;ball.t+=dt;const p=Math.min(1,ball.t/ball.T);ball.x=lerp(ball.fx,ball.tx,p);ball.y=lerp(ball.fy,ball.ty,p);ball.z=4*ball.h*p*(1-p);ball.spin+=dt*20;
  if(p>=1)return ball.tip?tipLand():resolveCatch();
  if(ball.tip||pl.throwAway||p>.9)return;
  for(const d of DEF){
    if(d.stun>0||d.fallen||pl.tipped.has(d))continue;
    const k=hyp(d.x-ball.x,d.y-ball.y);if(k>.9)continue;
    const dl=d.role==='DL'&&ball.x<S.los+2,reach=dl?.88+.028*((d.pl.ht||75)-75)+.03*(75-(Q.pl.ht||75)):1.2+.03*((d.pl.ht||73)-73);
    if(ball.z>reach)continue;pl.tipped.add(d);
    const man=d.cov&&d.cov.type==='man'&&!dl,react=(ball.bullet?.7:1)*(man?.55:1)*(p<.2&&!dl?.6:1)*(d.user?1:.9+S.aiSkill*.2);
    const pPlay=(dl?.3+.05*(d.pl.awr-3)+(d.engaged?.12:0):.32+.08*(d.pl.cov-3)+.08*(d.pl.cat-3))*react;
    if(Math.random()>=pPlay)continue;
    setAnim(d,'swat');fx('deflect',{p:d,x:ball.x,y:ball.y});credit(d,'xp',6,0);
    if(!dl&&Math.random()<clamp(.3+.1*(d.pl.cat-3),.1,.55))return pickOff(d,'flight');
    if(Math.random()<(dl?.3:.4)){tipBall(d);toast(dl?'Batted at the line!':'Tipped!');return}
    logPass('X');pl.pbu=d;return endPlay('inc',dl?'Batted at the line':'Knocked away');
  }
}
function tipBall(by){
  const pl=play,dir=Math.atan2(ball.ty-ball.fy,ball.tx-ball.fx),a=dir+R(-1.4,1.4),r=R(1,3.2);
  ball={state:'air',tip:true,tipBy:by,fx:ball.x,fy:ball.y,x:ball.x,y:ball.y,z:0,tx:ball.x+Math.cos(a)*r,ty:ball.y+Math.sin(a)*r,t:0,T:R(.55,.9),h:R(1,2.2),bullet:false,lob:false,spin:0,err:0};
  pl.tipN=(pl.tipN||0)+1;slowMo(.35);
}
function tipLand(){
  const pl=play,bx=ball.tx,by=ball.ty;let best=null,bs=1e9;
  for(const p of P){if(p.stun>0||p.fallen||p===ball.tipBy||p===Q||p.side==='o'&&!eligible(p))continue;const k=hyp(p.x-bx,p.y-by);if(k>reachOf(p)+.4)continue;if(k<bs){bs=k;best=p}}
  if(best&&by>=0&&by<=FW&&bx<=120&&Math.random()<clamp(.4+.08*(best.pl.cat-3)-bs*.3,.08,.7)){
    if(best.side==='d')return pickOff(best,'tip');
    return completeTo(best,bx,by,false);
  }
  logPass('X');endPlay('inc','Deflected');
}
function pickOff(d,src){play.intSrc=src||'arr';logPass('I');ball.state='held';play.carrier=d;credit(d,'dint',1,25);setAnim(d,'catch');stInt(d)}
function breakup(d,msg,pop){
  setAnim(d,'swat');fx('deflect',{p:d,x:ball.x,y:ball.y});credit(d,'xp',6,0);credit(d,'pd',1,0);play.pbu=d;
  if(Math.random()<pop){tipBall(d);return}
  logPass('X');endPlay('inc',msg);
}
function completeTo(rec,cx,cy,contested,dive){
  const pl=play;ball.state='held';pl.carrier=rec;pl.caught=true;rec.route=null;if(!S.conv){tstat().comp++;ps(Q).pc++;ps(rec).rec++}
  pl.rec=logPass('C');
  OFF.forEach(o=>{if(o===rec||o===Q)return;if(o.role==='OL'||hyp(o.x-cx,o.y-cy)<9){o.blocker=true;o.tgt=null}else{o.route=null;o.cont=null}});
  rec.x=cx;rec.y=cy;pl.catchX=rec.x;setAnim(rec,dive?'dive':'catch');{const k=dive?.35:contested?.5:.62;rec.vx*=k;rec.vy*=k;pl.slowT=Math.max(pl.slowT,.3)}
  if(contested){toast('Contested catch!');slowMo(.3)}
  if(rec.user)hint('Drag to steer · JUKE / SPIN / TRUCK buttons');showActs();
  fx('catch',{p:rec,contested:!!contested});
  if(typeof BC!=='undefined')BC.say('catch',{p:rec,contested});
}

/* ---------- arrival ---------- */
function resolveCatch(){
  const pl=play,tx=ball.tx,ty=ball.ty;pl.passDepth=tx-S.los;
  if(pl.throwAway){logPass('X');return endPlay('inc','Thrown away')}
  const out=ty<-.5||ty>FW+.5||tx>120.5;let rec=null,dr=1e9,df=null,dd=1e9;
  for(const o of OFF){if(!eligible(o)||o.blocker||o.fallen||o.stun>0)continue;const k=hyp(o.x-tx,o.y-ty);if(k<dr){dr=k;rec=o}}
  for(const d of DEF){if(d.stun>0||d.fallen)continue;const k=hyp(d.x-tx,d.y-ty);if(k<dd){dd=k;df=d}}
  const userSwat=!!df&&df===S.ctrl&&pl.swat>0,rR=rec?reachOf(rec):0,dR=df?reachOf(df)*.9+(userSwat?.4:0):0;
  pl.sep=rec?nearest(DEF,rec.x,rec.y,d=>d.stun<=0&&!d.fallen)[1]:null;pl.cover=df;pl.arr=[dr,dd];
  if(out||!rec||dr>rR+PASS.dive){
    if(df&&!out&&dd<dR){if(Math.random()<clamp(.12+.07*(df.pl.cat-3)+(userSwat?.15:0),.1,.65)*coachMod(df.team,'int'))return pickOff(df,'norec');return breakup(df,'Pass defended',.2)}
    logPass('X');return endPlay('inc',out?'Sails out of bounds':ball.err<-.6?'Underthrown':ball.err>.6?'Overthrown':'Off target');
  }
  const dive=dr>rR;
  /* a defender who gets there first plays the ball: undercut on short balls, high-point on lobs */
  if(df&&dd<dR&&dd<dr-.6){
    const pI=clamp(.07+.06*(df.pl.cat-3)+.04*(df.pl.cov-3)+(ball.err<-.5?.1:0)+(ball.lob?.05:0)-(ball.bullet?.05:0)+(userSwat?.15:0),.04,.4);
    if(Math.random()<pI*coachMod(df.team,'int'))return pickOff(df,'first');   /* Turnover Specialist (04c) */return breakup(df,userSwat?'Swatted away!':'Broken up',.3);
  }
  const contested=!!df&&dd<dR+.45&&pl.sep<1.7;pl.contested=contested;
  if(contested){const edge=((df.pl.cov+df.pl.cat)-(rec.pl.cat+rec.pl.str))/2;
    const pB=clamp(PASS.pbu+.12*edge+(dr-dd)*.25+(1.7-pl.sep)*.12+(userSwat?.25:0)+(ball.lob?.05:0)+(dive?.1:0)+(df.user?0:(S.aiSkill-.5)*.1),.05,.75);
    if(Math.random()<pB*(pl.dblDone?.8:1))return breakup(df,userSwat?'Swatted away!':'Broken up',PASS.popUp)}   // a trick throw: the defender recovering from the run fake arrives a step late
  /* the receiver's hands */
  const hit=df&&dd<1.9&&hyp(df.vx,df.vy)>4?.06*(df.pl.str/3):0,wx=S.wx==='Rain'?.035:S.wx==='Snow'?.03:0;
  const shortBullet=ball.bullet&&hyp(tx-ball.fx,ty-ball.fy)<15?.05:0;
  let pD=PASS.drop-.012*(rec.pl.cat-3)+shortBullet+hit+wx+(contested?.1+.03*(df.pl.str-rec.pl.str):0)-(rec.user&&focus('passing')?.01:0)-(rec.user?0:(S.aiSkill-.5)*.02);
  if(dive)pD=1-(1-pD)*clamp(.55+.07*(rec.pl.cat-3),.35,.8);
  const cx=lerp(rec.x,tx,.6),cy=lerp(rec.y,ty,.6),m=Math.min(cy,FW-cy,120-cx);
  if(Math.random()<clamp(pD,.01,.9)){
    logPass('X');if(dive){setAnim(rec,'dive');return endPlay('inc','Just out of reach')}
    if(contested){credit(df,'xp',6,0);credit(df,'pd',1,0);pl.pbu=df;setAnim(df,'swat');fx('deflect',{p:df,x:tx,y:ty});return endPlay('inc','Broken up')}
    setAnim(rec,'catch');fx('drop',{p:rec});if(!S.conv)tstat().drops=(tstat().drops||0)+1;return endPlay('inc','Dropped');
  }
  /* sideline / end line: the toe-tap */
  if(m<.55&&Math.random()>clamp(.35+.55*m/.55+.08*(rec.pl.awr-3)+.05*(rec.pl.agi-3),0,.97)){logPass('X');setAnim(rec,'catch');return endPlay('inc','No feet in bounds')}
  completeTo(rec,clamp(cx,0,119.9),clamp(cy,.1,FW-.1),contested,dive);
}

/* ---------- coverage: alignment, assignments, man, zone, spy, play-action ---------- */
const ZK={flat:{r:9,hand:8},curl:{r:9,hand:13},hook:{r:8.5,hand:12},robber:{r:9,hand:15},pole:{r:11,deep:1,minD:9},third:{r:13,deep:1,minD:8},mid:{r:17,deep:1,minD:8},half:{r:15,deep:1,minD:8},quarter:{r:10,deep:1,minD:6},prev:{r:16,deep:1,minD:10}};
const pressOK=d=>d.pl.cov+.6*d.pl.str>=4.8;
function assignCoverage(cov,D,K){
  const L=S.los,b=S.ballY,sX=K.X.y<b?-1:1,hS=K.H.y<b?-1:1,fS=b<CEN?1:-1;
  const yS=(side,off)=>side<0?off:FW-off;
  const Z=(k,x,y)=>Object.assign({type:'zone',k,x:Math.min(L+x,117),y:clamp(y,2,FW-2)},ZK[k]);
  const M=(t,o)=>Object.assign({type:'man',tgt:t},o||{}),rush={type:'rush'},gap=gy=>({type:'rush',gy});
  for(const k in D)if(k.startsWith('DL'))D[k].cov=rush;
  const third=K.H.role==='WR'?K.H:K.Y,te=K.H.role==='WR'?K.Y:K.H,cbX=D.CB0,cbZ=D.CB1;
  const sTop=D.S0,sBot=D.S1;
  switch(cov){
    case 'blitz':cbX.cov=M(K.X,{tight:1});cbZ.cov=M(K.Z,{tight:1});D.CB2.cov=M(third,{tight:1});sBot.cov=M(te,{dog:1});sTop.cov=M(K.R,{dog:1});D.LB0.cov=gap(b-.8);D.LB1.cov=gap(b+.8);break;
    case 'man':case 'spy':cbX.cov=M(K.X);cbZ.cov=M(K.Z);D.CB2.cov=M(third);D.LB0.cov=M(te);sTop.cov=Z('mid',17,CEN);
      if(cov==='spy'){D.LB1.cov={type:'spy'};sBot.cov=M(K.R,{dog:1})}else{D.LB1.cov=M(K.R,{dog:1});sBot.cov=Z('robber',10,b)}break;
    case '2man':cbX.cov=M(K.X,{trail:1});cbZ.cov=M(K.Z,{trail:1});D.CB2.cov=M(third,{trail:1});D.LB0.cov=M(te,{trail:1});D.LB1.cov=M(K.R,{dog:1});sTop.cov=Z('half',16,yS(-1,15));sBot.cov=Z('half',16,yS(1,15));break;
    case 'cover2':case 'tampa2':cbX.cov=Z('flat',5,yS(sX,9));cbZ.cov=Z('flat',5,yS(-sX,9));D.CB2.cov=Z('curl',10,yS(hS,17));
      if(cov==='tampa2'){D.LB0.cov=Z('pole',14,CEN);D.LB1.cov=Z('hook',9,yS(-hS,20));sTop.cov=Z('half',17,yS(-1,13));sBot.cov=Z('half',17,yS(1,13))}
      else{D.LB0.cov=Z('hook',9,b-4);D.LB1.cov=Z('hook',9,b+4);sTop.cov=Z('half',16,yS(-1,15));sBot.cov=Z('half',16,yS(1,15))}break;
    case 'cover4':cbX.cov=Z('quarter',13,yS(sX,8));cbZ.cov=Z('quarter',13,yS(-sX,8));sTop.cov=Z('quarter',13.5,yS(-1,20));sBot.cov=Z('quarter',13.5,yS(1,20));
      D.CB2.cov=Z('flat',6,yS(hS,10));D.LB0.cov=Z('hook',9,b-4);D.LB1.cov=Z('hook',9,b+4);break;
    case 'cover6':{const cbF=sX===fS?cbX:cbZ,cbB=cbF===cbX?cbZ:cbX,sF=fS>0?sBot:sTop,sB=sF===sBot?sTop:sBot;
      cbF.cov=Z('quarter',13,yS(fS,8));sF.cov=Z('quarter',13.5,yS(fS,20));cbB.cov=Z('flat',5,yS(-fS,9));sB.cov=Z('half',16,yS(-fS,15));
      D.CB2.cov=Z('curl',10,yS(hS,17));D.LB0.cov=Z('hook',9,b-4);D.LB1.cov=Z('hook',9,b+4);break}
    case 'firezone':D.LB0.cov=gap(b-1.5);D.LB1.cov=gap(b+1.5);D.DL0.cov=Z('hook',8,b-5);cbX.cov=Z('third',16,yS(sX,9));cbZ.cov=Z('third',16,yS(-sX,9));sTop.cov=Z('mid',17,CEN);
      D.CB2.cov=Z('curl',9,yS(hS,14));sBot.cov=Z('curl',9,yS(-hS,14));break;
    case 'agap':D.LB0.cov=gap(b-.7);D.LB1.cov=M(K.R,{dog:1});cbX.cov=M(K.X);cbZ.cov=M(K.Z);D.CB2.cov=M(third);sBot.cov=M(te);sTop.cov=Z('mid',17,CEN);break;
    case 'cblitz':D.CB2.cov=gap(third.y<b?b-5.5:b+5.5);sBot.cov=M(third);cbX.cov=M(K.X);cbZ.cov=M(K.Z);D.LB0.cov=M(te);D.LB1.cov=M(K.R,{dog:1});sTop.cov=Z('mid',17,CEN);break;
    case 'prevent':cbX.cov=Z('prev',22,yS(sX,10));cbZ.cov=Z('prev',22,yS(-sX,10));sTop.cov=Z('prev',27,yS(-1,20));sBot.cov=Z('prev',27,yS(1,20));D.CB2.cov=Z('robber',11,CEN);D.LB0.cov=Z('hook',9,b-7);D.LB1.cov=Z('hook',9,b+7);break;
    default:cbX.cov=Z('third',16,yS(sX,9));cbZ.cov=Z('third',16,yS(-sX,9));sTop.cov=Z('mid',17,CEN);D.CB2.cov=Z('curl',9,yS(hS,14));sBot.cov=Z('curl',9,yS(-hS,14));D.LB0.cov=Z('hook',8.5,b-4.5);D.LB1.cov=Z('hook',8.5,b+4.5);
  }
  /* man coverage behind two deep safeties trails underneath; single-high man plays inside leverage */
  for(const k in D){const cv=D[k].cov;if(cv.type==='man'&&cov==='2man')cv.trail=1}
}
/* pre-snap look: press or off corners, the safety shell (sometimes a disguise that rotates at the snap), mugged LBs */
function alignDefense(cov,D,K){
  const C=COVS[cov]||COVS.cover3,L=S.los,b=S.ballY,set=(p,x,y)=>{p.x=p.homeX=Math.min(119,x);p.y=p.homeY=clamp(y,1.5,FW-1.5)};
  const shell=C.shell==='1'?(Math.random()<.42?'2':'1'):(Math.random()<.18?'1':'2');
  for(const k of ['CB0','CB1','CB2']){const d=D[k],cv=d.cov,t=cv.type==='man'?cv.tgt:null;d.press=false;
    if(t&&C.press&&k!=='CB2'&&pressOK(d)&&t.x>S.los-2){d.press=true;set(d,L+1.2,t.y+(t.y<CEN?.5:-.5))}
    else if(t)set(d,L+(k==='CB2'?R(3,5):R(5,7)),t.y+(t.y<CEN?.8:-.8));
    else if(cv.type==='rush')set(d,L+R(3,5),d.y);
    else if(cv.k==='flat')set(d,L+R(4,5.5),d.y+(d.y<CEN?-1:1));
    else set(d,L+(cov==='prevent'?R(9,11):R(6,8)),d.y)}
  if(shell==='2'){set(D.S0,L+R(11.5,13.5),clamp(b-9.5,5,FW-5));set(D.S1,L+R(11.5,13.5),clamp(b+9.5,5,FW-5))}
  else{const deep=D.S1.cov.type==='zone'&&D.S1.cov.deep&&!(D.S0.cov.type==='zone'&&D.S0.cov.deep)?D.S1:D.S0,low=deep===D.S0?D.S1:D.S0;set(deep,L+R(12,14),lerp(b,CEN,.5));set(low,L+R(6.5,8.5),clamp(b+(low===D.S0?-6:6),4,FW-4))}
  if(cov==='prevent'){set(D.S0,L+20,D.S0.y);set(D.S1,L+20,D.S1.y)}
  if(cov==='agap'||cov==='blitz'&&Math.random()<.4){set(D.LB0,L+1.4,b-.9);set(D.LB1,L+1.4,b+.9)}
}
/* snap: press jams + play-action bites */
function coverageSnap(){
  const pl=play;
  for(const d of DEF){d.lagT=0;d.bite=0;const cv=d.cov;
    if(d.press&&cv&&cv.type==='man'&&cv.tgt.route&&pl.type==='pass'){const w=cv.tgt,r=(.4*d.pl.str+.4*d.pl.cov+.2*d.pl.agi)-(.35*w.pl.rte+.35*w.pl.agi+.3*w.pl.str)+R(-1,1)*.9;
      if(r>.35)w.jamT=R(.3,.55);else if(r<-.6){d.lagT=R(.3,.5);d.lvx=0;d.lvy=0}else w.jamT=R(.08,.18)}
    if((pl.pa||pl.flea)&&(d.role==='LB'||d.role==='S')&&cv&&cv.type!=='rush'){const k=clamp(.95-.2*d.pl.awr+(d.role==='LB'?.15:0)-(cv.type==='man'?.2:0)+(d.user?0:.15-.3*S.aiSkill)+R(-.15,.15),0,.75);d.bite=k>.08?.2+k*.9:0}
    /* HB pass / double pass: the toss sells a sweep, so the whole back seven (corners in run support too) comes up
       until the ball carrier pulls up to throw */
    if(pl.dbl&&cv&&cv.type!=='rush'&&d.role!=='DL'){const k=clamp(1.05-.18*d.pl.awr+(d.role==='LB'?.15:d.role==='CB'?-.1:0)-(cv.type==='man'?.15:0)+(d.user?-.08:-.08-.25*S.aiSkill)+R(-.15,.15),0,.8);d.bite=.5+k*.9}}
}
/* a receiver breaks: man defenders on him react late by route running vs coverage */
function routeBreak(p){
  p.brkT=play.t;
  for(const d of DEF){const cv=d.cov;if(!cv||cv.type!=='man'||cv.tgt!==p||d.stun>0)continue;
    const lag=clamp(.3+.09*(p.pl.rte-d.pl.cov)-.03*(d.pl.agi-3)+R(-.06,.08),.05,.5)*(cv.trail?.8:1);if(lag>d.lagT){d.lagT=lag;d.lvx=d.vx;d.lvy=d.vy}}
}
function covTarget(d,cv,dt){
  const L=S.los,pl=play;
  if(d.bite>0&&pl.t<d.bite&&!pl.thrown)return [L+(d.role==='LB'?1.2:6),lerp(d.y,RB?RB.y:S.ballY,.3),.8,12];
  if(cv.type==='spy'){if(pl.type==='run'&&pl.handed)return [pl.carrier.x,pl.carrier.y,1];return [Math.max(L+3.5,Q.x+9),Q.y,.9,12]}
  if(cv.type==='man'){
    const a=cv.tgt;
    if(a.blocker&&!a.route){if(cv.dog&&pl.type==='pass'&&!pl.thrown&&pl.t>.5){d.cov={type:'rush'};return [Q.x,Q.y,1]}return [L+4.5,lerp(d.y,a.y,.5),.8]}
    if(d.lagT>0){d.lagT-=dt;return [d.x+d.lvx*.5,d.y+d.lvy*.5,1,6]}
    const look=.3+.06*(d.pl.cov-3),inside=a.y<CEN?1:-1,lev=cv.tight?.35:cv.trail?.6:.45;
    const cush=cv.trail?-.8:Math.max(.25,(d.role==='CB'?1.6:1.1)-pl.t*.7);
    return [a.x+a.vx*look+cush,a.y+a.vy*look+inside*lev,1,7+1.2*d.pl.cov];
  }
  return zoneAI(d,cv);
}
function zoneAI(d,cv){
  const L=S.los,zx=cv.x,zy=cv.y;let thr=null,ts=1e9;
  for(const o of OFF){if(!eligible(o)||o.blocker)continue;const px=o.x+o.vx*.35,py=o.y+o.vy*.35,depth=px-L;
    if(cv.deep){if(depth<cv.minD)continue}else if(depth>cv.hand)continue;
    const k=hyp((px-zx)*(cv.deep?.6:1),(py-zy)*(cv.deep?.8:1));if(k>cv.r)continue;const s=k-(cv.deep?depth*.35:0);if(s<ts){ts=s;thr=o}}
  if(thr){if(cv.deep)return [Math.max(zx-3,thr.x+thr.vx*.4+1.6+.5*(3.5-d.pl.spd)),lerp(zy,thr.y,.8),1,9+d.pl.cov];
    return [clamp(thr.x+thr.vx*.3-.8,L+1.5,zx+3.5),lerp(zy,thr.y+thr.vy*.3,.8),1,9+d.pl.cov]}
  /* nothing in an underneath zone: sink under the nearest vertical through it (cloud corner, hook carrying a seam) */
  if(!cv.deep){let v=null,vd=1e9;for(const o of OFF){if(!eligible(o)||o.blocker||o.x-L<=cv.hand)continue;const k=Math.abs(o.y-zy);if(k<cv.r*.8&&k<vd){vd=k;v=o}}
    if(v)return [Math.min(v.x-2,L+cv.hand+4),lerp(zy,v.y,.6),1,9+d.pl.cov]}
  return [zx,lerp(zy,Q?Q.y:CEN,cv.deep?.1:.25),cv.deep?1:.85,9];
}
