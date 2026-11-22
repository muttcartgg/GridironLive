/* =========================================================
   06c · Arcade controls (the default scheme) + the steady side-view camera + first-use control tips
   Settings › Controls & camera › Controls: Arcade | Simulation (06-input's floating stick, drag-aim and the move
   buttons). Camera: Auto (follows the scheme) | Steady | Broadcast (08 updateCam's auto-framing).
   PASS    touch anywhere and pull back like a slingshot: the ball goes the other way, a longer pull throws deeper and
           faster. The dotted arc lands exactly where the ball will come down: pointing near a receiver locks it onto
           his lead spot (arcLead, the same flight time the throw uses). Release to throw; a pull under ARC.pull px
           cancels. Tap a receiver (his badge or his body) for a quick bullet on his lead. Badges over the receivers
           show how open each one is; RUN scrambles. Accuracy stays the QB's (aimError), a little more forgiving.
   RUN     the carrier runs upfield on his own; drag up / down anywhere to steer between lanes (drag back to reverse
           field). A quick flick up / down = juke that way, flick back = spin, flick toward the goal line or a
           two-finger tap = dive; a tap = the move the moment needs (hurdle a diving tackler, truck / stiff-arm a man in
           reach, otherwise a short burst). The user's runner turns with little momentum (ARC.f); the AI keeps it all.
   DEFENSE the highlighted defender plays his assignment until you drag (then the stick drives him, snapping to the
           pursuit angle when you point roughly at the carrier); tap = the defender nearest the ball, a swipe toward
           the carrier = dive tackle (near a thrown ball: go for the ball), two-finger tap = dive.
   TIPS    ctlTip(key) shows a one-line tip the first time each control comes up (Settings › Control tips).
   ========================================================= */
const arcade=()=>!(LG&&LG.settings&&LG.settings.ctl==='sim');
const camSteady=()=>{const m=LG&&LG.settings&&LG.settings.camMode;return m==='steady'||m!=='broadcast'&&arcade()};
const ARC={f:2.6,R:58,flickT:260,flickD:28,tapT:240,tapD:14,pull:20,acc:.9,mag:3.2};
const arcPS=()=>typeof PLAYER_SCALE==='number'&&PLAYER_SCALE>0?PLAYER_SCALE:1;
/* the user's QB is in the pocket with the ball (career mode: only when the QB is your player) */
function arcQB(){if(!play||!uOff()||play.st||play.type!=='pass'||play.thrown||play.scramble||play.carrier!==Q)return false;const ex=S.auto?autoSprite():null;return S.auto?ex===Q:true}
/* where receiver o will be when a ball thrown now arrives (tm = the throw's speed factor) */
function arcLead(o,bullet,tm){let tx=o.x,ty=o.y,T=0;for(let i=0;i<3;i++){T=flightT(hyp(tx-Q.x,ty-Q.y),bullet,false,Q.pl.thr)*(tm||1);tx=o.x+(o.vx||0)*T*.92;ty=o.y+(o.vy||0)*T*.92}return [Math.min(tx,119.5),clamp(ty,.8,FW-.8),T]}
const arcRcvs=()=>OFF.filter(o=>eligible(o)&&!o.blocker&&o!==Q);
/* screen position of a receiver's badge (over his helmet) */
function arcBadge(o){if(is3D()){const p=fieldToScreen(o.x,o.y,2.15);return [p[0],p[1]-17]}const s=scE();return [X(o.x),Y(o.y)-s*(2.75*arcPS()+.55)-9]}
function arcRcvAt(sx,sy){let b=null,bd=34;for(const o of arcRcvs()){const [bx,by]=arcBadge(o),s=scE(),bp=is3D()?fieldToScreen(o.x,o.y,1):[X(o.x),Y(o.y)-s*1.3*arcPS()];const d=Math.min(hyp(bx-sx,by-sy),hyp(bp[0]-sx,bp[1]-sy)*1.1);if(d<bd){bd=d;b=o}}return b}
/* slingshot aim from the pull (start - finger) */
function arcAim(t){
  const px=t.sx-t.x,py=t.sy-t.y,pull=hyp(px,py),span=Math.min(W,H)*.5;
  if(pull<ARC.pull){aim=null;return}
  const mr=maxRange(),k=mr/span;let [ax,ay]=is3D()?g3Aim(px,py,k,Q):[px*k,py*k/VY],d=hyp(ax,ay);if(d>mr){ax*=mr/d;ay*=mr/d;d=mr}
  const pr=clamp(pull/span,0,1),tm=lerp(1.08,.9,pr);let tx=Q.x+ax,ty=Q.y+ay,r=null,bd=ARC.mag+d*.1;
  for(const o of arcRcvs()){const L=arcLead(o,false,tm),e=hyp(L[0]-tx,L[1]-ty);if(e<bd){bd=e;r=o;t.lx=L[0];t.ly=L[1]}}
  if(r){tx=t.lx;ty=t.ly;d=hyp(tx-Q.x,ty-Q.y)}
  tx=Math.min(tx,119.5);ty=clamp(ty,.6,FW-.6);
  aim={x:tx,y:ty,err:aimError(Math.min(d,mr),false,false),bullet:false,lob:false,arc:true,r,tm};
}
function arcThrow(){if(!aim||!play||play.thrown)return;const a=aim;aim=null;play.tMul=a.tm;throwBall(a.x,a.y,false,a.r||null,false);play.tMul=null;ctlTip('passed')}
function arcBullet(r){if(!play||play.thrown)return;const L=arcLead(r,true,1);aim=null;throwBall(L[0],L[1],true,r,false)}
/* runner: vertical lane steering from a floating origin */
function arcSteer(t){
  let dx=t.x-t.ox,dy=t.y-t.oy;const R=ARC.R,m=hyp(dx,dy);if(m>R){t.ox=t.x-dx/m*R;t.oy=t.y-dy/m*R;dx=t.x-t.ox;dy=t.y-t.oy}
  const ux=dx/R,uy=dy/R;let hx,hy;
  if(ux<-.6){const n=hyp(ux,uy)||1;hx=ux/n;hy=uy/n}   // dragged back: reverse field
  else{hy=Math.abs(uy)<.1?0:clamp((uy-Math.sign(uy)*.1)*1.25,-.94,.94);hx=Math.sqrt(1-hy*hy)}
  stick={dx:hx,dy:hy,m:60,ox:t.ox,oy:t.oy,x:t.x,y:t.y,arc:1};
}
function arcBurst(){const pl=play,c=pl&&pl.carrier;if(!c||pl.dive>0||(pl.burstCD||0)>0)return;pl.burstT=.6;pl.burstCD=2;c.fat=(c.fat||0)+.03;haptic('light');sfx('cut');toast('Burst!')}
/* one tap: the move the moment needs */
function arcTap(){
  const pl=play,c=pl&&pl.carrier;if(!c)return;let lunger=null,near=null,nd=2.9;
  for(const d of DEF){if(d.stun>0||d.engaged)continue;const dd=hyp(d.x-c.x,d.y-c.y);if(d.lunge>0&&dd<3.4&&d.x>c.x-1.2)lunger=d;if(dd<nd){nd=dd;near=d}}
  if(lunger&&(c.pl.agi||3)>=2.5)return doHurdle();
  if(near)return doTruck();
  arcBurst();
}
/* defense: switch to the man nearest the ball (he may already be yours) */
function arcSwitch(){if(play&&play.st&&S.phase==='live')return switchDefender();const fx=ball.state==='air'?ball.tx:play&&play.carrier?play.carrier.x:S.los,fy=ball.state==='air'?ball.ty:play&&play.carrier?play.carrier.y:S.ballY;
  const [d]=nearest(DEF,fx,fy,o=>o.stun<=0||o===S.ctrl);if(d&&d!==S.ctrl)switchDefender(d)}
function arcDive(fx,fy){
  const d=S.ctrl;if(!d||!play||play.st||d.engaged&&d.engBy||ball.state==='air'||d.stun>0||d.lunge>0||d.lungeCD>0)return userTackle();
  const c=play.carrier;let tx=d.x+fx*2.4,ty=d.y+fy*2.4;
  if(c&&c.side!==d.side){const rx=c.x-d.x,ry=c.y-d.y,n=hyp(rx,ry)||1;if(n<4.8&&(rx*fx+ry*fy)/n>.45){tx=c.x+c.vx*.25;ty=c.y+c.vy*.25}}
  d.lunge=.32;d.lungeCD=1.1;d.lx=tx;d.ly=ty;d.userLunge=true;sfx('cut');haptic('light');
}
/* the user steering his defender: pointing roughly at the play takes the pursuit angle (or the ball's landing spot) */
function arcAssist(d,gx,gy){
  let px,py;const c=play.carrier;
  if(ball.state==='air'&&!ball.pitch){px=ball.tx;py=ball.ty}else if(c&&c.side!==d.side&&isRunner()){[px,py]=intercept(d,c,d.spd)}else return [gx,gy];
  const ux=gx-d.x,uy=gy-d.y,vx=px-d.x,vy=py-d.y,cs=(ux*vx+uy*vy)/((hyp(ux,uy)||1)*(hyp(vx,vy)||1));return cs>.8?[px,py]:[gx,gy];
}
/* ---------- pointer handling (06-input hands every live-play touch here while arcade() is on) ---------- */
function arcDown(e){
  const now=performance.now();
  if(touch&&touch.arc){   // a second finger
    if(touch.arc==='run'&&isRunner())doDive();else if(touch.arc==='def')arcDive(-1,0);return true}
  if(touch)return false;
  const ex=S.auto?autoSprite():null;let mode=null;
  if(!uOff())mode=ex&&ex.side!=='d'?null:'def';
  else if(arcQB())mode='sling';
  else if(isRunner()&&userCtl(play.carrier))mode='run';
  if(!mode)return false;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  touch={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,ox:e.clientX,oy:e.clientY,t0:now,moved:0,arc:mode,mode:'arc',rcv:mode==='sling'?arcRcvAt(e.clientX,e.clientY):null};
  return true;
}
function arcMove(e){
  const t=touch;t.x=e.clientX;t.y=e.clientY;t.moved=Math.max(t.moved,hyp(t.x-t.sx,t.y-t.sy));
  if(t.arc==='sling'){if(!arcQB()){aim=null;return}if(t.moved>10)arcAim(t)}
  else if(t.arc==='run'){if(isRunner())arcSteer(t)}
  else if(t.arc==='def'&&t.moved>10)updateStick(t);
}
function arcUp(t){
  stick=null;const dtm=performance.now()-t.t0,ddx=t.x-t.sx,ddy=t.y-t.sy,tap=dtm<ARC.tapT&&t.moved<ARC.tapD,flick=dtm<ARC.flickT&&t.moved>ARC.flickD;
  if(S.phase!=='live'||!play){aim=null;return}
  if(t.arc==='sling'){
    if(!arcQB()){aim=null;return}
    if(tap&&t.rcv){arcBullet(t.rcv);return}
    if(aim&&t.moved>=ARC.pull){arcThrow();return}
    aim=null;if(tap)hint('Pull back to throw · tap a receiver for a bullet · RUN to scramble');return}
  if(t.arc==='run'){if(!isRunner())return;
    if(flick){if(Math.abs(ddy)>=Math.abs(ddx)*.8)doJuke(Math.sign(ddy)||1);else if(ddx>0)doDive();else doSpin();return}
    if(tap)arcTap();return}
  if(t.arc==='def'){
    if(tap){const d=defenderAt(t.x,t.y);if(d&&d!==S.ctrl)switchDefender(d);else arcSwitch();return}
    if(flick){if(is3D()){const u=g3ScreenVec(ddx,ddy,t.sx,t.sy);arcDive(u[0],u[1]);return}const wx=ddx,wy=ddy/VY,n=hyp(wx,wy)||1;arcDive(wx/n,wy/n)}}
}
/* ---------- snap / carry hooks: the right one-line tip, once ---------- */
const TIPS={pass:'Pull back anywhere to aim · let go to throw · tap a receiver for a bullet',
  run:'Drag up or down to steer · flick to juke · tap to burst or stiff-arm · two fingers to dive',
  def:'Drag to take over your man · flick at the ball carrier to dive · tap to switch',
  passed:'The arc shows the landing spot · green badge = open',
  sim:'Drag to steer · use the buttons for moves'};
function ctlTip(k){
  if(!LG||!LG.settings||LG.settings.ctlTips===false||S.ff||S.auto&&!autoSprite()||!arcade()||!TIPS[k])return;
  const seen=LG.settings.tipsSeen||(LG.settings.tipsSeen={});if(seen[k])return;seen[k]=1;
  let el=$('#ctlTip');if(!el){el=document.createElement('div');el.id='ctlTip';el.setAttribute('role','status');document.body.appendChild(el)}
  el.innerHTML=`<b>Tip</b>${esc(TIPS[k])}`;el.hidden=false;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');hint('');   // the tip says it all: no second line at the bottom the first time
  clearTimeout(ctlTip.t);ctlTip.t=setTimeout(()=>{el.classList.remove('on');setTimeout(()=>{el.hidden=true},300)},4200);
}
function arcSnap(pl){if(!arcade())return;if(uOff()){if(pl.type==='pass'&&arcQB())ctlTip('pass')}else if(S.ctrl)ctlTip('def')}
function arcHint(pl){
  if(uOff())return pl.type==='pass'?'Pull back to aim · release to throw · tap a receiver for a bullet':'Drag up / down to steer · flick to juke · tap to burst';
  return S.ctrl?`You are #${S.ctrl.num} ${S.ctrl.pl.last} · drag to move · flick at the carrier to dive · tap to switch`:'';
}
/* ---------- overlay: receiver badges (openness), the sling pull, off-screen receivers ---------- */
function arcDraw(c,s,now){
  if(!arcade()||S.phase!=='live'||!play||play.st)return;
  if(arcQB()){
    c.save();c.font=`800 ${Math.round(clamp(s*.55,11,15))}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';
    for(const o of arcRcvs()){const [,nd]=nearest(DEF,o.x,o.y,d=>d.stun<=0),col=openCol(nd);let [bx,by]=arcBadge(o);const r=clamp(s*.62,11,17),off=bx>W-r-4||bx<r+4;bx=clamp(bx,r+4,W-r-4);by=clamp(by,r+4,H-r-4);
      const hi=aim&&aim.r===o;c.globalAlpha=1;c.fillStyle='rgba(8,12,20,.78)';c.beginPath();c.arc(bx,by,r+(hi?3:0),0,7);c.fill();c.lineWidth=hi?4:3;c.strokeStyle=col;c.stroke();
      c.fillStyle='#fff';c.fillText(String(o.num!=null?o.num:''),bx,by+.5);
      if(off){c.fillStyle=col;c.beginPath();const ax=bx>W/2?bx+r+2:bx-r-2,dir=bx>W/2?1:-1;c.moveTo(ax+dir*7,by);c.lineTo(ax,by-6);c.lineTo(ax,by+6);c.closePath();c.fill()}}
    c.restore();
  }
  const t=touch;if(t&&t.arc==='sling'&&aim){c.save();c.globalAlpha=.4;c.strokeStyle='#fff';c.lineWidth=2;c.setLineDash([5,6]);c.beginPath();c.moveTo(t.sx,t.sy);c.lineTo(t.x,t.y);c.stroke();c.setLineDash([]);c.globalAlpha=.7;c.fillStyle='#fff';c.beginPath();c.arc(t.sx,t.sy,6,0,7);c.fill();c.restore()}
}

/* ---------- steady side-view camera (arcade style) ----------
   Fixed zoom per orientation and situation (runs, passes one fixed step wider, defense in between), set once and eased;
   the pan follows the ball horizontally with a gentle lead and a dead zone, vertically only a little (more when the
   field is taller than the view); the ball is kept on screen. Special teams and replays use 08's camera. */
const CAMA={L:{run:1.06,pass:.9,def:.95},P:{run:1,pass:.9,def:.94},dz:.07};
function camArc(dt){
  const ph=S.phase;if(!(ph==='presnap'||ph==='live'||ph==='dead')||play&&play.st&&ph!=='presnap'||!S.home)return false;
  const port=H>W*1.2,Z=port?CAMA.P:CAMA.L,o=uOff();
  const pass=ph==='presnap'?!!(S.pc&&S.pc.cat==='pass'&&!S.pc.special):!!(play&&play.type==='pass');
  let z=!o?Z.def:pass?Z.pass:Z.run;if(ph==='dead')z=cam.az||z;cam.az=z;
  const cut=cam.cut;if(cut){cam.z=z;cam.zv=0}else camDamp('z',z,.55,dt);
  const s=scE(),vw=W/s,vh=(H-topY)/(s*VY);
  /* focus: what the shot follows, and where across the view it sits (0 = left edge) */
  let fx=S.los,fy=S.ballY,an=.36,st=.42;
  const pa=port?.2:.27;   // passes: the QB sits further left in the narrow portrait view (more of the routes ahead)
  if(ph==='presnap'){const qx=Q?Q.x:S.los-1;fx=o?(pass?qx:S.los):S.los;an=o?(pass?pa:.36):.52}
  else if(ball.state==='air'&&!ball.pitch){fx=ball.x+(ball.tx-ball.x)*.4;fy=lerp(ball.y,ball.ty,.4);an=.5;st=.32}
  else{const h=(play&&play.carrier)||Q;if(h){fx=h.x;fy=h.y;
    if(play&&play.type==='pass'&&!play.thrown&&!play.scramble&&h===Q){an=pa;if(aim)fy=lerp(Q.y,aim.y,.4)}
    else{fx+=clamp((h.vx||0)*.4,-3,5);an=o?.4:.45;st=.34}}}
  let tx=fx+vw*(.5-an);
  /* dead zone: the target only moves once the focus leaves a window around the current aim */
  const dz=vw*CAMA.dz;if(cut||cam.ax==null)cam.ax=tx;else if(tx>cam.ax+dz)cam.ax=tx-dz;else if(tx<cam.ax-dz)cam.ax=tx+dz;
  if(ph==='dead')tx=cam.x;else tx=cam.ax;
  const mn=-13+vw/2,mx=133-vw/2;tx=mn>mx?60:clamp(tx,mn,mx);
  /* vertical: slight follow; whole width in view holds mid */
  const ylo=-11+vh/2,yhi=FW+4-vh/2,ymid=CEN-3.6,full=ylo>=yhi,k=vh>FW*.8?.45:.8;
  let ty=full?ymid:clamp(CEN-1.5+(fy-CEN)*k,Math.min(ylo,ymid),Math.max(yhi,ymid));
  if(ph==='dead')ty=cam.y;
  if(cut){cam.x=tx;cam.y=ty;cam.xv=cam.yv=0;cam.cut=0;S.cutA=1;S.cutN=(S.cutN||0)+1}
  else{camDamp('x',tx,st,dt);camDamp('y',ty,st*1.6,dt)}
  /* keep the ball / carrier inside the frame when the spring lags (pulled in quickly, never snapped) */
  if(ph!=='presnap'){const b=ball.state==='air'?ball:(play&&play.carrier)||Q;if(b){const hw=vw/2-Math.min(vw*.18,4),hh=vh/2-2.2*arcPS()-1;
    let d=b.x<cam.x-hw?b.x+hw-cam.x:b.x>cam.x+hw?b.x-hw-cam.x:0;if(d){cam.x+=d*Math.min(1,dt*9);cam.xv=0}
    if(!full){d=b.y<cam.y-hh?b.y+hh-cam.y:b.y>cam.y+hh?b.y-hh-cam.y:0;if(d){cam.y+=d*Math.min(1,dt*9);cam.yv=0}}}}
  S.shake=Math.max(0,S.shake-dt*1.6);return true;
}

/* ---------- settings ---------- */
SETTINGS_EXTRA.push({card:'Controls & camera',key:'ctl',label:'Controls',opts:[['arcade','Arcade'],['sim','Simulation']],def:'arcade',
  note:'<b>Arcade</b>: pull back anywhere to throw (tap a receiver for a bullet), drag up / down to steer the runner, flick to juke, tap to burst; on defense drag to take over, flick at the carrier to dive, tap to switch. <b>Simulation</b>: the floating joystick, drag-to-aim passing and the move buttons.',
  after:()=>{if(typeof hideActs==='function'&&play&&S.phase==='live'){hideActs();showActs()}}});
SETTINGS_EXTRA.push({card:'Controls & camera',key:'camMode',label:'Camera',opts:[['auto','Auto'],['steady','Steady side view'],['broadcast','Broadcast']],def:'auto',
  note:'Auto: the steady side view with Arcade controls, the auto-framing broadcast camera with Simulation.'});
SETTINGS_EXTRA.push({card:'Controls & camera',key:'ctlTips',label:'Control tips',opts:[[1,'On'],[0,'Off']],def:1,bool:true,
  note:'A one-line tip the first time each control comes up.',after:v=>{if(v&&LG)LG.settings.tipsSeen={}}});
