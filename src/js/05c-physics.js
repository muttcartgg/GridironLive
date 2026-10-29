/* =========================================================
   05c · Physics (v8): momentum movement, in-game fatigue + rotation, blocking reps, tackling, ball-carrier moves.
   Movement: phyInit(p) (from add) gives every on-field player a top speed (p.spd, from spd), an acceleration (p.a0,
   from agi; heavier = slower to get going), braking (p.brk), a lateral-acceleration limit (p.lat) and a cut cost
   (p.kc). phyMove(p,vx,vy,dt,f) chases a desired velocity: speed builds along a force-velocity curve, turning is
   limited by lateral acceleration, every radian of cut bleeds speed (agility lowers the cost) and anything past ~95°
   has to plant and stop first. f>1 = more responsive (the user's runner gets PHY.user). steer() wraps it.
   Fatigue: S.fat[id]=[f,lastSnap,benched], f 0 (fresh)..1 (gassed). Sprinting, blocking and every snap raise it
   (pl.end sets the rate); the huddle recovers a little, the sideline a lot (lazy: fatOf counts the snaps missed via
   S.snapN). It slows top speed (stamina()) and agility. Starting RB/WR/DL above PHY.subAt sit for a play or two
   (pickFresh in setupFormation) and the next man up on the depth chart plays.
   Blocking: an engaged defender carries a rep d.rep (-1 blocker dominating .. +1 beaten). Pass rushers pick bull,
   swim, rip, speed (edge) or spin from their ratings; quick moves resolve at a check point (anim swim/rip/spin when
   they win), bull rushes walk the blocker back so the pocket caves in. Free pass blockers double the best rusher.
   Run game: blk(+str) vs shd(+str); blockers drive defenders back and out of the lane, combo then climb to the LBs.
   Tackling: approach angle (head-on wrap vs arm tackle from the side/behind), closing speed, mass and tkl/awr vs
   car/str/agi decide wrap or broken tackle (stumble + fx brokenTackle); a second man in reach nearly always
   finishes; play.fp = forward progress from the pile's momentum battle; tackles behind the line = stats.tfl.
   ========================================================= */
const PHY={a0:8,aAgi:2.6,lat0:10,latAgi:2.6,brk0:15,brkAgi:2.4,kc0:.6,kcAgi:.085,vturn:1.2,user:1.3,
  fd:.045,snap:.05,huddle:.9,huddleK:.015,bench:.7,benchK:.07,subAt:.45,backAt:.3,
  pk:.2,pDrift:.07,pLuck:.12,q0:.13,qk:.13,rk:.24,rDrift:.07,
  pen:.055,bHead:.05,bSide:.1,bBehind:.2,gang:.3,open:.1,fum:.016};
const ANIM_T={block:1,swim:.4,rip:.4,spin:.45,tackle:.5,tackled:.6,juke:.36,truck:.55,stiff:.5,hurdle:.5,getup:.6};
function setAnim(p,a,t){p.anim=a;p.animT=t!=null?t:ANIM_T[a]||.5}

/* ---------- movement ---------- */
function phyInit(p){
  const pl=p.pl,wt=pl.wt||(SIZE[pl.pos]||SIZE.WR)[2],agi=pl.agi||3,mf=Math.pow(wt/215,.6),f=fatOf(pl),fa=1-.16*f;
  p.mass=wt;p.fat=f;p.a0=(PHY.a0+PHY.aAgi*agi)/mf*fa;p.lat=(PHY.lat0+PHY.latAgi*agi)/Math.sqrt(mf)*fa;p.brk=(PHY.brk0+PHY.brkAgi*agi)/Math.sqrt(mf);
  p.kc=Math.max(.14,PHY.kc0-PHY.kcAgi*agi)*(1+.35*f);p.anim=null;p.animT=0;p.rep=0;p.engBy=null;p.beat=null;p.dbl=null;p.freeT=0;p.pile=0;p.pileV=0;
}
function phyMove(p,dvx,dvy,dt,f){
  if(p.a0===undefined)phyInit(p);f=f||1;
  const vx=p.vx,vy=p.vy,v=Math.sqrt(vx*vx+vy*vy),s=Math.sqrt(dvx*dvx+dvy*dvy);
  if(v<PHY.vturn){let ax=dvx-vx,ay=dvy-vy;const n=Math.sqrt(ax*ax+ay*ay),m=(s>v?p.a0:p.brk)*f*dt;if(n>m){ax*=m/n;ay*=m/n}p.vx+=ax;p.vy+=ay;return}
  let hx=vx/v,hy=vy/v,nv=v;
  if(s>.05){
    const ux=dvx/s,uy=dvy/s;let cs=hx*ux+hy*uy;cs=cs>1?1:cs<-1?-1:cs;const th=Math.acos(cs);
    if(th>.002){const rot=Math.min(th,p.lat*f/v*dt),sn=(hx*uy-hy*ux<0?-1:1)*Math.sin(rot),c=Math.cos(rot),nx=hx*c-hy*sn;hy=hx*sn+hy*c;hx=nx;nv*=1-Math.min(.5,p.kc/f*rot)}
    const want=th>1.65?0:Math.min(s,p.spd*1.7);
    nv=nv<want?Math.min(want,nv+p.a0*f*Math.max(.12,1-.8*nv/p.spd)*dt):Math.max(want,nv-p.brk*f*dt);
  }else nv=Math.max(0,v-p.brk*f*dt);
  p.vx=hx*nv;p.vy=hy*nv;
}
function steer(p,tx,ty,spd,dt,acc){
  if(p.brk===undefined)phyInit(p);
  const ddx=tx-p.x,ddy=ty-p.y,d=Math.sqrt(ddx*ddx+ddy*ddy);let vx=0,vy=0;
  if(d>.05){const s=Math.min(spd,Math.sqrt(1.5*p.brk*d));vx=ddx/d*s;vy=ddy/d*s}
  phyMove(p,vx,vy,dt,acc?clamp(acc/10,.4,2.4):1);
}

/* ---------- fatigue + rotation ---------- */
function fatOf(pl){const e=S.fat&&S.fat[pl.id];if(!e)return 0;let f=e[0];const n=Math.min(12,(S.snapN||0)-e[1]-1);
  if(n>=0){f=f*PHY.huddle-PHY.huddleK;for(let i=0;i<n;i++)f=f*PHY.bench-PHY.benchK}return f>0?f:0}
const fatRole=p=>p.role==='OL'?.55:p.role==='QB'?.5:1;
function fatTick(p,dt){const v2=(p.vx*p.vx+p.vy*p.vy)/(p.spd*p.spd+.01);p.fat+=dt*PHY.fd*fatRole(p)*(1.5-.18*(p.pl.end||3))*(.15+.85*Math.min(1.2,v2)+(p.engaged?.55:0))}
/* after every live play: store each player's fatigue (+ the cost of the snap itself) */
function fatSave(){const m=S.fat||(S.fat={}),n=S.snapN||0;for(const p of P){if(p.fat==null)continue;m[p.pl.id]=[Math.min(1,p.fat+PHY.snap*fatRole(p)*(1.5-.18*(p.pl.end||3))),n,0]}S.snapN=n+1}
/* rest: n snaps' worth of sideline time for everybody (possession changes, quarter breaks, halftime) */
function fatRest(n){S.snapN=(S.snapN||0)+n}
function tired(pl){const e=S.fat&&S.fat[pl.id],f=fatOf(pl);return f>PHY.subAt||!!(e&&e[2]&&f>PHY.backAt)}
function benchMark(pl,v){const m=S.fat||(S.fat={}),e=m[pl.id];if(e)e[2]=v;else if(v)m[pl.id]=[0,(S.snapN||0)-1,v]}
/* depth-chart pick with rotation: list[i] unless he is gassed and a fresher backup (index >= n) is available */
function pickFresh(list,i,n,used){
  const p=list[i];if(!p)return null;
  if(!used.has(p)&&!tired(p)){used.add(p);benchMark(p,0);return p}
  const bad=S.injured||[];
  for(let j=n;j<list.length;j++){const b=list[j];if(used.has(b)||b.inj>0||bad.includes(b.id)||tired(b)||fatOf(b)>fatOf(p)-.12)continue;used.add(b);benchMark(p,1);return b}
  used.add(p);return p;
}

/* ---------- blocking ---------- */
function rushMoveFor(d){
  const a=d.pl,edge=d.role!=='DL'||Math.abs(d.y-S.ballY)>2.6;
  const wB=.5*(a.str/3)**3,wS=.4*(a.shd*a.agi/9)**2,wR=.4*(a.shd*a.str/9)**2,wE=edge?.55*(a.spd/3)**3:0,wP=d.mFail?.45*(a.agi/3)**2:.04;
  let r=Math.random()*(wB+wS+wR+wE+wP);
  if((r-=wB)<0)return 'bull';if((r-=wS)<0)return 'swim';if((r-=wR)<0)return 'rip';if((r-=wE)<0)return 'speed';return 'spin';
}
/* rusher/defender power minus blocker power for a move ('shed' = run game) */
function repDiff(d,o,m){const a=d.pl,b=o.pl;let r,k;
  switch(m){case 'bull':r=.6*a.str+.4*a.shd;k=.45*b.blk+.55*b.str;break;
    case 'swim':r=.55*a.shd+.45*a.agi;k=.6*b.blk+.4*b.agi;break;
    case 'rip':r=.55*a.shd+.45*a.str;k=.6*b.blk+.4*b.str;break;
    case 'speed':r=.45*a.spd+.35*a.shd+.2*a.agi;k=.55*b.blk+.25*b.agi+.2*b.spd;break;
    case 'spin':r=.5*a.shd+.5*a.agi;k=.6*b.blk+.4*b.awr;break;
    default:r=.6*a.shd+.3*a.str+.1*a.awr;k=.6*b.blk+.4*b.str}
  let m2=0;if(!d.user)m2+=(S.diffMul-1)*2;if(!o.user)m2-=(S.diffMul-1)*2;
  if(o.user&&play.type==='run')m2-=.15+(focus('running')?.2:0)+(SL('run')-1)*1.2;
  if(d===S.ctrl)m2+=.25;
  return r-k+m2+.8*((o.fat||0)-(d.fat||0));
}
function blockCheck(d,dt){
  d.engaged=false;const pl=play;
  if(d.immune||d.stun>0||d.freeT>0){d.engBy=null;d.dbl=null;return false}
  let o=d.engBy;
  if(o&&(o.stun>0||o.fallen||o===pl.carrier||!o.blocker||hyp(o.x-d.x,o.y-d.y)>1.7)){o=null;d.engBy=null}
  if(!o){
    const run=pl.type==='run'||pl.caught||pl.scramble;
    for(const b of OFF){if(!b.blocker||b===pl.carrier||b.stun>0||b.fallen||b===d.beat)continue;if(b.role!=='OL'&&b.tgt!==d&&b.key!=='Y')continue;
      /* run fits: a lineman climbing to his linebacker is not grabbed by every down lineman he passes */
      const bt=b.tgt;if(run&&bt&&bt!==d&&!bt.immune&&bt.stun<=0&&hyp(bt.x-b.x,bt.y-b.y)<9)continue;
      const be=b.eng;if(be&&be!==d&&be.engBy===b&&be.engaged)continue;
      if(hyp(b.x-d.x,b.y-d.y)<1.25){o=b;break}}
    if(!o){d.dbl=null;return false}
    d.engBy=o;d.engT=0;d.rb=R(-1,1);d.move=null;d.mT=0;d.mFail=false;d.rep=Math.min(d.rep||0,0);d.lane=Math.sign(d.y-o.y)||(Math.random()<.5?1:-1);
    /* run game get-off: a quick first step can knife through before the blocker gets his hands on him */
    if(pl.type==='run'&&!pl.handed&&pl.t<.7&&(d.role==='DL'||d.role==='LB')&&Math.random()<clamp(PHY.pen+repDiff(d,o,'shed')*.035+(d.pl.agi-3)*.02,.01,.18))d.rep=1;
  }
  o.eng=d;o.engaged=true;d.engaged=true;d.engT+=dt;d.bt+=dt;setAnim(o,'block',1);
  const pp=pl.type==='pass'&&!pl.caught&&!pl.scramble&&!pl.screenGo,h=d.dbl&&d.dbl!==o?d.dbl:null;d.dbl=null;
  if(pp){
    if(!d.move||d.mT>d.mDur){d.move=rushMoveFor(d);d.mT=0;d.mAt=R(.5,1.05);d.mDur=d.move==='bull'?R(1.1,1.8):d.mAt+.3;d.mDone=false}
    d.mT+=dt;let df=repDiff(d,o,d.move);if(h)df-=.5*(.6*h.pl.blk+.4*h.pl.str);
    d.rep+=(df*PHY.pk+PHY.pDrift+d.rb*PHY.pLuck)*dt;
    if(d.move==='bull')setAnim(d,'block',1);
    if(d.move!=='bull'&&!d.mDone&&d.mT>=d.mAt){d.mDone=true;const ps=clamp(PHY.q0+df*PHY.qk+d.rep*.25,.03,.6)*(h?.4:1);if(Math.random()<ps)d.rep=1;else{d.rep-=.15;d.mFail=true}}
    if(Q&&!pl.thrown){const qd=hyp(Q.x-d.x,Q.y-d.y);if(qd<2.2)d.rep+=(2.2-qd)*.9*dt}
  }else{
    let df=repDiff(d,o,'shed');if(h)df-=.5*(.6*h.pl.blk+.4*h.pl.str);
    d.rep+=(df*PHY.rk+PHY.rDrift+d.rb*.15)*dt;
    if(d.force){d.force=false;if(Math.random()<clamp(.22+df*.15+d.rep*.3,.04,.65))d.rep=1;else d.rep-=.1}
    const c=pl.carrier;if(c&&(pl.handed||pl.caught)){const cd=hyp(c.x-d.x,c.y-d.y);if(cd<2.4)d.rep+=(2.4-cd)*.35*(d.pl.shd/3)*dt}
  }
  if(d.rep>=1){beatBlock(d,o,pp);return false}
  if(d.rep<-1)d.rep=-1;
  engagedMove(d,o,pp,!!h,dt);
  return true;
}
function beatBlock(d,o,pp){
  d.engaged=false;d.engBy=null;d.beat=o;d.rep=0;if(o.eng===d)o.eng=null;o.engaged=false;o.animT=Math.min(o.animT||0,.1);
  if(pp){d.freeT=.7;o.stun=d.move==='bull'?.45:.3;setAnim(d,d.move==='swim'||d.move==='spin'?d.move:'rip')}
  else{d.immune=true;o.stun=.2;setAnim(d,d.pl.str>d.pl.agi?'rip':'swim')}
}
/* an engaged pair moves together: the rusher toward the QB (or the defender toward the ball) as fast as the rep allows */
function engagedMove(d,o,pp,dbl,dt){
  const pl=play;let tx,ty;
  if(pp&&Q){tx=Q.x;ty=Q.y}else{const c=pl.carrier;if(c&&(pl.handed||pl.caught)){tx=c.x;ty=c.y}else{tx=S.los;ty=pl.gapY}}
  let ux=tx-d.x,uy=ty-d.y;const n=Math.sqrt(ux*ux+uy*uy)||1;ux/=n;uy/=n;
  const px=-uy*d.lane,py=ux*d.lane;let vp,vl,ey=0;
  if(pp){const sd=d.pl.str-o.pl.str;vp=(d.move==='bull'?.55+.5*sd+.9*Math.max(0,d.rep):.25+.6*Math.max(0,d.rep))-.6*Math.max(0,-d.rep);if(dbl)vp*=.4;vp=clamp(vp,-.5,2.4);
    vl=d.rep>.2?(d.rep-.2)*(d.move==='speed'?3.2:2.2):0}
  else if(d.rep<0){vp=-(.35+.8*-d.rep)*clamp(1+.2*(o.pl.str-d.pl.str),.6,1.5);vl=0;ey=(Math.sign(d.y-pl.gapY)||d.lane)*(.4+.8*-d.rep)}
  else{vp=.2+1.1*d.rep;vl=d.rep>.4?(d.rep-.4)*1.8:0}
  phyMove(d,ux*vp+px*vl,uy*vp+py*vl+ey,dt,1.8);
}
/* blockers: pass sets, double teams, run fits, combo-and-climb */
function claimRusher(p){let b=null,bd=1e9;for(const d of DEF){if(!d.cov||d.cov.type!=='rush'||d.immune||d.stun>0||d.beat===p)continue;if(d.engBy&&d.engBy!==p&&d.engaged)continue;
  const dd=hyp(d.x-p.x,d.y-p.y)+(d.claim&&d.claim!==p?3.5:0);if(dd<bd){bd=dd;b=d}}if(b)b.claim=p;return b}
function helpTarget(p,dl){let b=null,bs=-1;for(const d of DEF){if(!d.engaged||!d.engBy||d.engBy===p||(dl&&d.role!=='DL'))continue;const dd=hyp(d.x-p.x,d.y-p.y);if(dd>4.5)continue;const s=d.pl.shd+d.pl.str*.5-dd*.3;if(s>bs){bs=s;b=d}}return b}
function blockAI(p,dt){
  const pl=play;
  if(p.stun>0){p.stun-=dt;steer(p,p.x,p.y,0,dt,5);if(p.stun<=0)p.fallen=false;return}
  if(p.anim==='block'&&!p.engaged&&p.animT>.12)p.animT=.12;
  const e=p.eng;
  if(e&&e.engBy===p&&e.engaged){const g=(pl.handed||pl.caught)&&pl.carrier?pl.carrier:pl.type==='run'&&!pl.handed?{x:S.los,y:pl.gapY}:Q;const ddx=g.x-e.x,ddy=g.y-e.y,n=hyp(ddx,ddy)||1;steer(p,e.x+ddx/n*.95,e.y+ddy/n*.95,p.spd,dt,18);return}
  p.eng=null;
  const passPro=(pl.type==='pass'&&!pl.thrown&&!pl.scramble&&pl.carrier===Q&&!pl.screenGo)||(pl.run&&pl.run.delay&&pl.t<pl.run.delay+.25);
  if(passPro&&(p.role==='OL'||p.role==='TE'||p.role==='RB')){
    const t=p.tgt;if(!t||t.immune||t.stun>0||t.beat===p||t.freeT>0||(t.engBy&&t.engBy!==p&&t.engaged))p.tgt=claimRusher(p);
    const d=p.tgt;
    if(d){const ddx=Q.x-d.x,ddy=Q.y-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n,d.y+ddy/n,5.4,dt);return}
    const hd=helpTarget(p,false);if(hd){const ddx=Q.x-hd.x,ddy=Q.y-hd.y,n=hyp(ddx,ddy)||1,s=Math.sign(p.y-hd.y)||1;steer(p,hd.x+ddx/n*.9-ddy/n*.7*s,hd.y+ddy/n*.9+ddx/n*.7*s,5,dt);if(hyp(p.x-hd.x,p.y-hd.y)<1.9)hd.dbl=p;return}
    steer(p,p.homeX-1.4,p.homeY,3,dt);return;
  }
  const c=pl.carrier||Q,pre=pl.type==='run'&&!pl.handed;let gx=pre||c.x<S.los?S.los+.5:c.x,gy=pre?pl.gapY:c.y;
  if(pre&&p.tgt&&Math.sign(p.tgt.y-S.ballY)!==Math.sign(pl.gapY-S.ballY)){const ck=KP[pl.ckey]||Q;gx=ck.x;gy=ck.y}
  /* combo: a lineman whose man is a linebacker first helps on the down lineman at the point of attack, then climbs */
  if(pre&&p.role==='OL'&&p.tgt&&p.tgt.role==='LB'&&pl.t<.35){const hd=helpTarget(p,true);if(hd&&Math.abs(hd.y-pl.gapY)<3.5){steer(p,hd.x-.6,hd.y+(Math.sign(p.y-hd.y)||1)*.7,p.spd,dt);if(hyp(p.x-hd.x,p.y-hd.y)<1.9)hd.dbl=p;return}}
  const t=p.tgt;
  if(!t||t.immune||t.stun>0||(pl.handed||pl.caught)&&(hyp(t.x-gx,t.y-gy)>16||t.x<c.x-3)){
    let b=null,bd=1e9;const lim=p.lead?10:13,mx=Math.min(p.x,c.x)-1;
    for(const d of DEF){if(d.immune||d.stun>0||d.x<=mx||hyp(d.x-gx,d.y-gy)>=lim)continue;const dd=hyp(d.x-p.x,d.y-p.y)+(d.claim&&d.claim!==p?3.5:0);if(dd<bd){bd=dd;b=d}}
    if(b)b.claim=p;p.tgt=b;
  }
  const d=p.tgt;if(d){const ddx=gx-d.x,ddy=gy-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n*.9,d.y+ddy/n*.9,p.spd*(p.lead?1:.97),dt)}else steer(p,c.x+4,c.y+(p.homeY>c.y?3:-3),p.spd*.8,dt);
}

/* ---------- ball carrier: moves ---------- */
function moveMul(){const pl=play;return (pl.jukeT>0?1.04:1)*(pl.spinT>0?.93:1)*(pl.truckT>0?.92:1)*(pl.stiffT>0?.96:1)*(pl.slowT>0?.78:1)*(pl.dive>0?1.25:1)}
function doJuke(dir){if(!play||play.jukeCD>0||play.dive>0)return;const c=play.carrier;play.jukeT=.36;play.jukeCD=c&&c.user?.7:.9;play.jukeDir=dir;play.moveId++;play.move='juke';if(c){setAnim(c,'juke');spawnTurf(c.x,c.y,5)}sfx('cut')}
function doSpin(){if(!play||play.jukeCD>0||play.dive>0)return;const c=play.carrier;play.spinT=.45;play.jukeCD=.95;play.moveId++;play.move='spin';if(c)setAnim(c,'spin');sfx('cut')}
/* TRUCK lowers the shoulder into a man in front; against a pursuer from the side or behind it becomes a stiff arm */
function doTruck(){
  if(!play||play.jukeCD>0||play.dive>0)return;const c=play.carrier;if(!c)return;
  let best=null,bd=4.5;for(const d of DEF){if(d.stun>0||d.engaged)continue;const dd=hyp(d.x-c.x,d.y-c.y);if(dd<bd){bd=dd;best=d}}
  const vc=hyp(c.vx,c.vy),side=best&&vc>1&&((best.x-c.x)*c.vx+(best.y-c.y)*c.vy)/(bd*vc)<.4;
  play.moveId++;c.stiff=.5;
  if(side){play.stiffT=.5;play.jukeCD=.8;play.move='stiff';setAnim(c,'stiff')}else{play.truckT=.55;play.jukeCD=.9;play.move='truck';setAnim(c,'truck')}
}
function doHurdle(){const c=play&&play.carrier;if(!c||play.hurdle>0||play.dive>0)return;play.hurdle=.5;play.moveId++;play.move='hurdle';setAnim(c,'hurdle')}
function doDive(){if(!play||play.dive>0||play.hurdle>0)return;play.dive=.38}
/* CPU runners pick moves from their ratings and the tackler's angle */
function aiRunMove(c,d){
  const a=c.pl,vc=hyp(c.vx,c.vy),dd=hyp(d.x-c.x,d.y-c.y)||1,head=vc<1||((d.x-c.x)*c.vx+(d.y-c.y)*c.vy)/(dd*vc)>.45;
  const wT=head?Math.max(0,a.str-2)**2*(c.mass/210)*.6:0,wS=head?0:Math.max(.2,a.str-1.5),wJ=Math.max(.2,(a.agi-1.5)*(a.car-1)*.35),wP=Math.max(.1,(a.agi-2)*.5),wH=d.lunge>0?Math.max(0,a.agi-2.5)*1.5:0;
  let r=Math.random()*(wT+wS+wJ+wP+wH);
  if((r-=wT+wS)<0)return doTruck();if((r-=wJ)<0)return doJuke(Math.sign(c.y-d.y)||1);if((r-=wP)<0)return doSpin();doHurdle();
}

/* ---------- tackling ---------- */
const TK={cos:0,close:0,mr:0,head:false,behind:false};
function tkGeo(c,d){
  const rx=d.x-c.x,ry=d.y-c.y,dist=Math.sqrt(rx*rx+ry*ry)||.01,ux=rx/dist,uy=ry/dist,vc=Math.sqrt(c.vx*c.vx+c.vy*c.vy);
  TK.cos=vc>1?(c.vx*ux+c.vy*uy)/vc:.2;TK.head=TK.cos>.45;TK.behind=TK.cos<-.35;
  TK.close=(c.vx-d.vx)*ux+(c.vy-d.vy)*uy;
  const pc=(c.mass||210)*Math.max(0,c.vx*ux+c.vy*uy),pd=(d.mass||230)*Math.max(0,-(d.vx*ux+d.vy*uy));TK.mr=(pc-pd)/(pc+pd+500);
}
function breakP(c,d){
  const a=c.pl,b=d.pl,pl=play;
  let q=TK.head?PHY.bHead:TK.behind?PHY.bBehind:PHY.bSide;
  q+=.055*(a.car-3)+(TK.head?.06:.03)*(a.str-3)+(TK.head?0:.045)*(a.agi-3)-.075*(b.tkl-3)-.025*(b.awr-3);
  if(TK.behind)q+=.04*clamp(2.5-TK.close,0,3);else q+=.16*TK.mr-.012*clamp(TK.close-6,0,8);
  if(d.lunge>0)q+=.05;if(pl.slowT>0)q-=.07;q+=.25*((d.fat||0)-(c.fat||0));
  if(pl.truckT>0&&!TK.behind)q+=.14+.08*(a.str-3)+.05*(a.car-3)-.05*(b.str-3)+.15*TK.mr;
  if(pl.stiffT>0&&!TK.head)q+=.14+.09*(a.str-3)+.05*(a.car-3)-.04*(b.str-3);
  q+=c.user?.02+(focus('running')?.04:0):(S.aiSkill-.5)*.06;
  q-=d.user?(d.userLunge?.05:0):(S.diffMul-1)*1.2;
  if(c.user)q*=2-SL('tkl');
  return q;
}
function evadeP(c,d,m){const a=c.pl,b=d.pl;
  let p=m==='juke'?.48+.09*(a.car-3)+.08*(a.agi-3)-.08*(b.tkl-3)-.05*(b.awr-3)+(TK.head?.05:TK.behind?-.15:0)
    :.44+.07*(a.agi-3)+.07*(a.car-3)+.04*(a.str-3)-.07*(b.tkl-3)-.05*(b.awr-3)+(TK.behind?-.1:.04);
  p+=c.user?.04:(S.aiSkill-.5)*.08;if(d.userLunge)p-=.1;return clamp(p,.12,.85)}
function evaded(c,d,kind){const pl=play;d.stun=.9;d.fallen=true;pl.fakes++;fx(kind,{p:c,d});toast(kind==='spin'?'Spin move!':kind==='hurdle'?'Hurdle!':'Juke!');if(typeof BC!=='undefined')BC.say('juke',{p:c})}
function tackleCheck(c){
  const pl=play;
  for(const d of DEF){
    if(d.stun>0)continue;const dist=hyp(d.x-c.x,d.y-c.y),reach=d.lunge>0?(d.userLunge?1.55:1.3):1.05;if(dist>=reach)continue;
    let arm=false;
    if(d.engaged){if(d.armTried||dist>.85)continue;d.armTried=true;if(Math.random()>clamp(.1+.04*(d.pl.tkl-3)+.1*Math.max(0,d.rep||0),.03,.3))continue;arm=true}
    tkGeo(c,d);if(arm){TK.head=false;TK.behind=true}
    if(pl.hurdle>0&&c.z>.25){if(d.evadeId===pl.moveId)continue;d.evadeId=pl.moveId;
      const a=c.pl,b=d.pl,hp=clamp((d.lunge>0?.62:.3)+.08*(a.agi-3)+.05*(a.spd-3)-.06*(b.tkl-3)-.03*(b.awr-3),.08,.9);
      if(Math.random()<hp){d.stun=1;evaded(c,d,'hurdle');continue}c.fallen=true;return tackled(c,d)}
    if((pl.jukeT>0||pl.spinT>0)&&d.evadeId!==pl.moveId&&!arm){d.evadeId=pl.moveId;const k=pl.spinT>0?'spin':'juke';if(Math.random()<evadeP(c,d,k)){evaded(c,d,k);continue}}
    let gang=false;for(const o of DEF){if(o!==d&&o.stun<=0&&!o.engaged&&hyp(o.x-c.x,o.y-c.y)<1.4){gang=true;break}}
    let q=breakP(c,d)+(arm?.1:0);if(gang)q*=PHY.gang;
    /* open field: a lone DB with nobody else near the ball has the hardest tackle in football */
    else if((d.role==='S'||d.role==='CB')&&!arm){let near=false;for(const o of DEF){if(o!==d&&o.stun<=0&&hyp(o.x-c.x,o.y-c.y)<3.5){near=true;break}}if(!near)q+=PHY.open}
    q=clamp(q,.02,.7);
    if(Math.random()<q){brokenTackle(c,d,arm);continue}
    return tackled(c,d);
  }
}
function brokenTackle(c,d,arm){
  const pl=play,a=c.pl,how=pl.truckT>0&&!TK.behind?'truck':pl.stiffT>0&&!TK.head?'stiff':'';
  d.stun=how==='truck'?1.2:TK.behind?.6:.9;d.fallen=how==='truck'||!arm&&!TK.behind||Math.random()<.4;
  if(how==='stiff'){const n=hyp(d.x-c.x,d.y-c.y)||1;d.vx=(d.x-c.x)/n*3;d.vy=(d.y-c.y)/n*3}
  const keep=clamp((TK.head?.5:TK.behind?.82:.66)+.05*(a.agi-3)+.04*(a.str-3)+(how==='truck'?.08:how==='stiff'?.1:0),.35,.92);
  c.vx*=keep;c.vy*=keep;pl.slowT=clamp(.42-.06*(a.agi-3),.2,.6);c.stiff=.45;
  if(!S.conv){const st=tstat();st.brk=(st.brk||0)+1}
  fx('brokenTackle',{c,d});if(how==='truck')fx('truck',{p:c,d});else if(how==='stiff')fx('stiffArm',{p:c,d});
  toast(how==='truck'?'Trucked him!':how==='stiff'?'Stiff arm!':'Broken tackle!');S.shake=.22;spawnTurf(d.x,d.y,6);if(typeof BC!=='undefined')BC.say('broken',{p:c});
}
function tackled(c,d){
  const pl=play;c.fallen=true;d.fallen=true;dirty(c);dirty(d);setAnim(c,'tackled');setAnim(d,'tackle');pl.tackler=d;
  const closing=hyp(d.vx-c.vx,d.vy-c.vy);const big=closing>9&&Math.random()<(d.pl.tkl>=4||d.pl.str>=4?.6:.25);
  fx('tackle',{c,d,big});
  S.shake=.12+d.pl.str*.05+(big?.25:0);spawnTurf(c.x,c.y,big?16:10);credit(d,'tkl',1,big?6:3);haptic(big?'heavy':'medium');injuryCheck(c,d,big);
  /* forward progress: the carrier's forward momentum vs the tacklers' (a big back falls forward, a small one is stopped cold) */
  let help=0;for(const o of DEF){if(o!==d&&o.stun<=0&&hyp(o.x-c.x,o.y-c.y)<1.7)help+=o.mass||230}
  const md=d.mass||230,pc=(c.mass||210)*Math.max(0,c.vx)*(.7+.08*c.pl.str),pd=(md*Math.max(0,-d.vx)+md*(TK.behind?1.2:TK.head?2.6:1.8))*(.78+.075*d.pl.str)+help*1.8;
  const fp=clamp((pc-pd)/700+R(-.25,.25),-1.2,TK.behind?1.4:2.2);
  pl.fp=Math.max(0,fp);c.pile=d.pile=.4;c.pileV=d.pileV=fp/.4;
  if(big){slowMo(.4);toast('BIG HIT!');sfx('thump');pl.bigHit=true;if(typeof BC!=='undefined')BC.say('bighit',{d,c})}
  const fumP=Math.max(.004,PHY.fum+(big?.03:0)+.005*(3-c.pl.car)+(help?.004:0)+(S.wx==='Rain'||S.wx==='Snow'?.005:0));
  if(Math.random()<fumP&&spotOf(c)+pl.fp<110)return stFumble(c,d,'Fumble');
  endPlay('tackle');
}
