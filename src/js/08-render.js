/* =========================================================
   08 · Rendering: Modern HD (procedural animated athletes,
        stadium, lighting, weather, particles) and Retro pixel
   ========================================================= */
const TONES=['#7A4A22','#A8693A','#D9A066','#F1C27D'];
let CROWD_STATE='',turfPat=null,crowdM=null,wxParts=null,spriteCache=new Map(),crowd=null;
function resetRenderCaches(){spriteCache.clear();crowd=null;crowdM=null;wxParts=null;if(typeof FLD!=='undefined'){FLD.key='';FLD.chk=-1;FLD.surfKey='';FLD.gradeKey='';FLD.lightKey=''}}

/* ---------- particles ---------- */
function spawnTurf(x,y,n){if(LG&&LG.settings.style==='retro')n=Math.ceil(n/2);for(let i=0;i<n;i++)particles.push({x,y,z:.1,vx:R(-3,3),vy:R(-3,3),vz:R(2,5),life:R(.4,.8),t:0,c:pick(['#3f8f45','#2f6f35','#6b4a2a','#4f9a55']),s:R(.07,.15),kind:'turf'})}
function spawnConfetti(x,y){const cols=[S.home.c1,S.home.c2,'#ffffff',S.home.c1,'#FFD23F'];for(let i=0;i<80;i++)particles.push({x:x+R(-2,2),y:y+R(-2,2),z:R(1,3),vx:R(-6,6),vy:R(-6,6),vz:R(4,11),life:R(1.6,2.6),t:0,c:pick(cols),s:R(.12,.22),rot:R(0,6),vr:R(-10,10),kind:'conf'})}
function updateParticles(dt){for(const p of particles){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=(p.kind==='conf'?7:18)*dt;if(p.kind==='conf'){p.vx*=.985;p.vy*=.985;p.rot+=p.vr*dt;if(p.vz<-2.2)p.vz=-2.2}if(p.z<0){p.z=0;p.vz=0;p.vx*=.5;p.vy*=.5}}particles=particles.filter(p=>p.t<p.life)}
function updateWeather(dt){
  if(!S.wx||S.wx==='Clear'||S.wx==='Wind'){wxParts=null;return}
  const rain=S.wx==='Rain',now=performance.now(),wm=S.wind?Math.min(1.4,S.wind.mph/14):0,wx=typeof windX==='function'?windX()*wm:0;
  if(!wxParts||wxParts.kind!==S.wx){wxParts=Array.from({length:rain?170:150},(_,i)=>({x:Math.random()*W,y:Math.random()*H,v:R(.7,1.3),s:R(.5,1.5),d:i%3===0?1:0,vx:0,vy:0}));wxParts.kind=S.wx;wxParts.spl=rain?Array.from({length:22},()=>({x:0,y:0,t:R(-.4,.3)})):null}
  for(const p of wxParts){if(rain){p.vy=(640+380*p.d)*p.v;p.vx=(-110-wx*150)*p.v}else{p.vy=(26+40*p.s+30*p.d)*p.v;p.vx=(Math.sin(now/900+p.s*5)*16+wx*36)*p.s}
    p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y>H+10){p.y=-24;p.x=Math.random()*(W+160)-40}if(p.x<-40)p.x+=W+80;else if(p.x>W+40)p.x-=W+80}
  if(wxParts.spl){const t0=Math.max(0,Y(0)),t1=Math.min(H,Y(FW));for(const q of wxParts.spl){q.t+=dt;if(q.t>.32&&t1>t0){q.t=R(-.25,0);q.x=Math.random()*W;q.y=t0+Math.random()*(t1-t0)}}}
}
function drawWeather(c){
  if(!wxParts)return;c.save();
  if(S.wx==='Rain'){
    c.lineWidth=1;c.strokeStyle='rgba(190,205,225,.22)';c.beginPath();for(const p of wxParts)if(!p.d){c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.03,p.y-p.vy*.03)}c.stroke();
    c.lineWidth=1.6;c.strokeStyle='rgba(215,228,245,.36)';c.beginPath();for(const p of wxParts)if(p.d){c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.034,p.y-p.vy*.034)}c.stroke();
    if(wxParts.spl&&!(LG&&LG.settings.style==='retro')){c.lineWidth=1;c.strokeStyle='rgba(220,232,250,.42)';c.beginPath();for(const q of wxParts.spl){if(q.t<0)continue;const r=1.5+q.t*16;c.moveTo(q.x+r,q.y);c.ellipse(q.x,q.y,r,r*.32,0,0,6.283)}c.stroke()}}
  else{c.fillStyle='rgba(255,255,255,.5)';c.beginPath();for(const p of wxParts)if(!p.d){const r=.5+p.s*.6;c.moveTo(p.x+r,p.y);c.arc(p.x,p.y,r,0,6.283)}c.fill();
    c.fillStyle='rgba(255,255,255,.85)';c.beginPath();for(const p of wxParts)if(p.d){const r=1+p.s*1.1;c.moveTo(p.x+r,p.y);c.arc(p.x,p.y,r,0,6.283)}c.fill()}
  c.restore();
}

/* ---------- camera: critically damped follow (SmoothDamp) on x, y and zoom ----------
   presnap frames the LOS a little behind center; runs follow the carrier with look-ahead; open-field runs widen, the goal line tightens.
   Pass plays FRAME a box instead: the QB (or the ball in the air) plus what is downfield of him: the deepest route runner during the
   drop, the aim point and the receiver under it while aiming, the landing spot and the intended receiver while the ball is up.
   The zoom backs out only as far as that box needs (the narrow portrait view backs out much further), relative to the user's
   zoom setting and never past a legibility floor; the pan keeps the QB / ball inside its margin and leans downfield.
   Modern style may look a few yards past the end lines and above the far sideline (end-zone stands). */
function camDamp(k,tgt,st,dt){const v=k+'v',o=2/st,x=o*dt,e=1/(1+x+.48*x*x+.235*x*x*x),ch=cam[k]-tgt,tmp=((cam[v]||0)+o*ch)*dt;cam[v]=((cam[v]||0)-o*tmp)*e;cam[k]=tgt+(ch+tmp)*e}
const CAM_M={l:4,r:7,t:4.5,b:3};   // framing margins in yards: behind the QB, beyond the target, far side (sprites stand up into it), near side
const camPad=()=>[Math.max(0,50-topY),58];   // px the overlays cover when framing: scorebug strip on top, hint bar + ticker at the bottom
const camBox=(b,x,y)=>{if(x<b[0])b[0]=x;if(x>b[1])b[1]=x;if(y<b[2])b[2]=y;if(y>b[3])b[3]=y;return b};
/* cam.z that fits box b=[x0,x1,y0,y1] plus margins on this screen at the user's zoom; floor about 6 px per yard */
function camFit(b){const s0=sc*((LG&&LG.settings&&LG.settings.zoom)||1),pd=camPad();
  return Math.max(Math.min(W/(s0*(b[1]-b[0]+CAM_M.l+CAM_M.r)),Math.max(60,H-topY-pd[0]-pd[1])/(s0*VY*(b[3]-b[2]+CAM_M.t+CAM_M.b))),6.2/s0)}
/* camera centre on one axis so [c0,c1] fits a view of size v with margins m0/m1 (bias 0..1 leans toward c1's side being roomier);
   when it cannot fit (zoom still easing out, or at the floor) keep the anchor a inside its margin. Continuous in v. */
function camPan(c0,c1,a,v,m0,m1,bias){const lo=c1+m1-v/2,hi=c0-m0+v/2;if(lo<=hi)return lo+(hi-lo)*bias;const w=c1>c0?clamp((a-c0)/(c1-c0),0,1):0;return hi+(lo-hi)*w}
function updateCam(dt){
  dt=Math.min(dt,.05);const retro=LG&&LG.settings.style==='retro';
  let fx=S.los+2,fy=S.ballY,z=1.04,st=.5,zst=.8,bx=S.los,by=S.ballY,box=null,zbox=null;
  if(S.phase==='presnap'){if(!uOff()&&S.ctrl)fx=lerp(S.los+4,S.ctrl.x,.3);if(S.los>97&&!S.conv)z=1.1}
  if((S.phase==='live'||S.phase==='dead'||S.phase==='replay')&&ball){z=1;st=.42;const h=(play&&play.carrier)||Q;
    if(ball.state==='air'){const far=hyp(ball.tx-ball.fx,ball.ty-ball.fy),r=play&&play.intended;bx=ball.x;by=ball.y;z=clamp(1.04-.008*far,.8,.95);st=.36;zst=.5;
      box=camBox([bx,bx,by,by],ball.tx,ball.ty);if(r&&r.side==='o')camBox(box,r.x,r.y);
      zbox=camBox(box.slice(),lerp(ball.fx,ball.tx,.2),lerp(ball.fy,ball.ty,.2))}   // hold most of the release framing through the flight
    else if(aim&&Q){const d=hyp(aim.x-Q.x,aim.y-Q.y);bx=Q.x;by=Q.y;z=clamp(1.03-.007*d,.82,.97);st=.4;zst=.45;
      box=camBox([bx,bx,by,by],aim.x,aim.y);const [n,nd]=nearest(OFF,aim.x,aim.y,o=>eligible(o)&&!o.blocker);if(n&&nd<8)camBox(box,n.x,n.y)}
    else if(h){bx=h.x;by=h.y;
      if(play&&play.type==='pass'&&!play.thrown&&!play.scramble&&h===Q){let t=null,far=-1e9;
        for(const o of OFF)if(eligible(o)&&!o.blocker){const lx=o.x+clamp((o.vx||0)*.6,0,5);if(lx>far){far=lx;t=o}}
        far=t?clamp(far,Q.x,Q.x+maxRange()):Q.x+12;z=clamp(1.07-.009*(far-Q.x),.86,.95);st=.5;zst=.6;box=camBox([bx,bx,by,by],far,t?t.y:by)}
      else{const vx=h.vx||0,vy=h.vy||0;fx=h.x+clamp(vx*.55,-3.5,6);fy=h.y+clamp(vy*.3,-2.5,2.5);z=isRunner()?.97:1;if(Math.abs(vx)>6&&Math.abs(h.x-S.los)>14)z=.9;st=.32}}
    const gx=ball.state==='air'?ball.tx:bx;if(gx>100&&gx<=112)z*=1.07}
  if(retro)z=1;else if(box)z=Math.min(z,camFit(zbox||box));
  camDamp('z',z,zst,dt);
  const s=scE(),vw=W/s,vh=(H-topY)/(s*VY),ext=retro?0:7;
  const pd=box?camPad().map(v=>v/(s*VY)):[0,0];   // overlay pads in world yards (framing only)
  let tx=fx+vw*.1;if(box){tx=camPan(box[0],box[1],bx,vw,CAM_M.l,CAM_M.r,.62);fy=camPan(box[2],box[3],by,vh,CAM_M.t+pd[0],CAM_M.b+pd[1],.5)}
  const mn=-6-ext+vw/2,mx=126+ext-vw/2;tx=mn>mx?60:clamp(tx,mn,mx);
  const ylo=(retro?-8:-11)+vh/2,yhi=FW+3+pd[1]-vh/2,ymid=retro?CEN-3:CEN-3.6,ty=clamp(fy,Math.min(ylo,ymid),Math.max(yhi,ymid));   // whole width in view: hold mid
  camDamp('x',tx,st,dt);camDamp('y',ty,st*1.2,dt);
  /* keep the ball (or its carrier) on screen even when the spring lags; between plays (presnap) glide back to the new LOS instead */
  const hw=S.phase==='presnap'?1e9:vw/2-Math.min(vw*.2,3);if(bx<cam.x-hw){cam.x=bx+hw;cam.xv=Math.min(cam.xv||0,0)}else if(bx>cam.x+hw){cam.x=bx-hw;cam.xv=Math.max(cam.xv||0,0)}
  if(vh<FW+10){const hh=vh/2-1.5;if(by<cam.y-hh){cam.y=by+hh;cam.yv=Math.min(cam.yv||0,0)}else if(by>cam.y+hh){cam.y=by-hh;cam.yv=Math.max(cam.yv||0,0)}}
  S.shake=Math.max(0,S.shake-dt*1.6);
}

/* ---------- modern renderer ---------- */
/* the stands, crowd, benches and end-zone stands live in 08g (STAD); crowdM just marks them built */
function buildCrowdModern(){STAD.key='';ensureStadium();crowdM=STAD;CROWD_STATE=STAD.key}
function fieldPath(c,x0,y0,x1,y1){c.fillRect(X(x0),Y(y0),X(x1)-X(x0),Y(y1)-Y(y0))}
function drawModern(now){
  const c=ctx;c.setTransform(DPR,0,0,DPR,0,0);
  const night=isNight(),s=scE();
  c.fillStyle=night?'#03050a':'#0a111d';c.fillRect(0,0,W,H);
  if(!S.home)return;
  if(!crowdM)buildCrowdModern();
  c.save();if(S.shake>0)c.translate(R(-1,1)*S.shake*14,R(-1,1)*S.shake*10);
  // stadium (08g): sky, light towers, press box, decks, club band, ribbon boards
  ensureStadium();drawStands(c,s,now);
  // field: cached turf + paint (08f), wear/snow, scuffs; end-zone stands beyond the end lines
  drawField(c,s,now);drawEndStands(c,s,now);
  // broadcast lines (painted under the players), pylons, goal posts
  const inGame=['presnap','live','dead','pat','kick','wait','drive'].includes(S.phase);
  if(inGame){tvLine(c,S.los,'#3D8BFF',s);if(!S.conv&&S.firstDownX<110&&S.phase!=='pat')tvLine(c,S.firstDownX,'#FFD23F',s);drawFieldGfx(c,s,now)}
  drawPylons(c,s);drawGoalposts(c,s,now);
  // routes
  if(uOff()&&LG.settings.routes!==false&&(S.phase==='presnap'||(S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble))){
    c.save();c.strokeStyle=S.home.c1;c.fillStyle=S.home.c1;c.lineWidth=Math.max(1.5,s*.16);c.setLineDash([s*.7,s*.45]);c.globalAlpha=.6;c.lineJoin='round';
    for(const p of OFF){if(!p.rpath||(play&&play.type==='run'))continue;const pts=p.rpath.slice();if(p.cont){const a=pts[pts.length-1],b=p.cont,d=hyp(b[0]-a[0],b[1]-a[1])||1;pts.push([a[0]+(b[0]-a[0])/d*5,a[1]+(b[1]-a[1])/d*5])}
      c.beginPath();c.moveTo(X(pts[0][0]),Y(pts[0][1]));for(let i=1;i<pts.length;i++)c.lineTo(X(pts[i][0]),Y(pts[i][1]));c.stroke();
      const e=pts[pts.length-1],f=pts[pts.length-2],ang=Math.atan2(Y(e[1])-Y(f[1]),X(e[0])-X(f[0]));c.save();c.setLineDash([]);c.translate(X(e[0]),Y(e[1]));c.rotate(ang);c.beginPath();c.moveTo(s*.6,0);c.lineTo(-s*.4,s*.4);c.lineTo(-s*.4,-s*.4);c.closePath();c.fill();c.restore()}
    c.restore();
  }
  // aim arc with accuracy cone
  if(aim&&S.phase==='live'&&Q){const d=hyp(aim.x-Q.x,aim.y-Q.y),h=aim.bullet?d*.03+.45:aim.lob?d*.18+1.3:d*.11+.5,col=aim.bullet?'#FF8A2A':aim.lob?'#7FD4FF':'#FFFFFF';
    c.save();c.fillStyle=col;const n=Math.max(10,Math.round(d*1.6));const ph=(now/40)%3;
    for(let k=0;k<=n;k++){const t=k/n;const z=4*h*t*(1-t);const px=X(lerp(Q.x,aim.x,t)),py=Y(lerp(Q.y,aim.y,t))-z*s*.9-s*1.6;c.globalAlpha=.25+.75*t;c.beginPath();c.arc(px,py,Math.max(1.5,s*.12)*(((k+ph)|0)%3===0?1.5:1),0,7);c.fill()}
    c.globalAlpha=1;const ax=X(aim.x),ay=Y(aim.y);c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.ellipse(ax,ay,Math.max(6,aim.err*s),Math.max(4,aim.err*s*VY),0,0,7);c.stroke();
    c.fillStyle=aim.bullet?'rgba(255,138,42,.15)':'rgba(255,255,255,.12)';c.fill();
    c.beginPath();c.moveTo(ax-8,ay);c.lineTo(ax+8,ay);c.moveTo(ax,ay-6);c.lineTo(ax,ay+6);c.stroke();
    c.font='800 13px -apple-system,system-ui,sans-serif';c.textAlign='center';c.fillStyle='#fff';c.shadowColor='#000';c.shadowBlur=4;c.fillText(`${Math.round(d)} YD${aim.bullet?' · BULLET':aim.lob?' · LOB':''}`,ax,ay-Math.max(10,aim.err*s*VY)-10);c.restore()}
  // players
  const passLive=uOff()&&S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble;
  drawSideline(c,s,now,false);
  const sorted=P.slice().sort((a,b)=>a.y-b.y);
  if(typeof prepPlayers==='function')prepPlayers(c,sorted,now);
  for(const p of sorted){
    if(passLive&&eligible(p)){const [,nd]=nearest(DEF,p.x,p.y);const col=openCol(nd);c.save();c.strokeStyle=col;c.shadowColor=col;c.shadowBlur=10;c.lineWidth=2.5;c.beginPath();c.ellipse(X(p.x),Y(p.y),s*.85,s*.85*VY,0,0,7);c.stroke();c.restore()}
    if(play&&p===play.carrier&&isRunner()){c.save();c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=2;const pr=s*(.9+.12*Math.sin(now/120));c.beginPath();c.ellipse(X(p.x),Y(p.y),pr,pr*VY,0,0,7);c.stroke();if(play.jukeT>0||play.hurdle>0){c.strokeStyle=S.home.c1;c.lineWidth=3;c.beginPath();c.ellipse(X(p.x),Y(p.y),pr*1.3,pr*1.3*VY,0,0,7);c.stroke()}c.restore()}
    if(p===S.ctrl&&ctrlRing(p)&&S.phase!=='dead'){c.save();c.strokeStyle='#FFD23F';c.shadowColor='#FFD23F';c.shadowBlur=12;c.lineWidth=3;c.beginPath();c.ellipse(X(p.x),Y(p.y),s*1.05,s*1.05*VY,0,0,7);c.stroke();c.beginPath();c.moveTo(X(p.x),Y(p.y)-s*3.6);c.lineTo(X(p.x)-s*.45,Y(p.y)-s*4.3);c.lineTo(X(p.x)+s*.45,Y(p.y)-s*4.3);c.closePath();c.fillStyle='#FFD23F';c.fill();c.restore()}
    drawAthlete(c,p,now);
  }
  drawSideline(c,s,now,true);drawStick(c);
  // ball in flight / at rest
  if(inGame&&ball){
    if(ball.state==='air'){const bx=X(ball.x),by=Y(ball.y);{const sh=1-Math.min(.6,ball.z/12);c.fillStyle=`rgba(0,0,0,${.35*sh})`;c.beginPath();c.ellipse(bx,by,s*.3*sh,s*.12*sh,0,0,7);c.fill()}if(!ball.bullet&&ball.T>.9&&!ball.pitch)drawBallTrail(c,s);const yy=by-ball.z*s*.9-s*1.6;const ang=Math.atan2((ball.ty-ball.fy)*VY,ball.tx-ball.fx);
      if(ball.bullet){c.save();c.strokeStyle='rgba(255,160,80,.55)';c.lineWidth=2;for(let k=1;k<=3;k++){c.beginPath();c.moveTo(bx-Math.cos(ang)*s*.6*k,yy-Math.sin(ang)*s*.6*k);c.lineTo(bx-Math.cos(ang)*s*(.6*k+.5),yy-Math.sin(ang)*s*(.6*k+.5));c.stroke()}c.restore()}
      drawFootball(c,bx,yy,s*.42,ang,ball.spin)}
    else if(S.phase==='presnap'||(play&&play.result&&play.result.kind==='inc')){drawFootball(c,X(ball.x),Y(ball.y)-s*.15,s*.38,0,0)}
  }
  // particles
  for(const p of particles){const px=X(p.x),py=Y(p.y)-p.z*s*.9;c.fillStyle=p.c;c.globalAlpha=clamp(1-p.t/p.life+.3,0,1);if(p.kind==='conf'){c.save();c.translate(px,py);c.rotate(p.rot);c.fillRect(-p.s*s/2,-p.s*s/4,p.s*s,p.s*s/2);c.restore()}else c.fillRect(px,py,Math.max(1.5,p.s*s),Math.max(1.5,p.s*s));c.globalAlpha=1}
  c.restore();
  // lighting: sky events, one cached grade layer (tint + haze + vignette), weather
  drawSky(c,now);drawGrade(c);
  drawWeather(c);
  if(S.ts<.9){const a=(1-S.ts)*.9,bh=H*.07;c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(0,0,W,bh);c.fillRect(0,H-bh,W,bh)}
}

/* ---------- kick view (direction + power) ---------- */
function drawKick(){
  const k=kick;if(!k)return;const cv2=$('#kcv'),g=cv2.getContext('2d'),w=cv2.width,h=cv2.height,cx=w/2,st=lightStage(),night=st==='night',host=hostT(),now=performance.now();
  if(S.home){const kk=stadKey();if(!STAD.T||kk!==STAD.key){STAD.key=kk;buildStadium()}}const T=STAD.T,hz=h*.47;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
  /* sky by time slot, end-zone stands (same tiles as the far stands), light towers */
  const sk={day:['#4f7fbf','#a8c4e2'],late:['#5d7fb0','#e2c9a2'],sunset:['#23305c','#ee8a4e'],night:['#02040a','#101a33']}[st]||['#4f7fbf','#a8c4e2'];
  const sky=g.createLinearGradient(0,0,0,h*.2);sky.addColorStop(0,sk[0]);sky.addColorStop(1,sk[1]);g.fillStyle=sky;g.fillRect(0,0,w,hz);
  const good=k.stage==='flight'&&k.flight>=1&&k.good;
  if(T){const P=STAD.ppu,f=h*.15/(ST.loN*ST.loH*P),fu=f*.82,tw=ST.tile*P,ex=good?1:0,lo=ex?T.lo1:T.lo0,up=ex?T.up1:T.up0,ub=h*.255,lb=h*.42,cb=lb-ST.wall*0;
    g.fillStyle=night?'#151920':'#4c535d';g.fillRect(0,h*.075,w,h*.03);g.fillStyle=host.c1;g.fillRect(0,h*.095,w,h*.008);
    for(let x=-((now*.01)%1);x<w;x+=tw*fu){const b=ex?Math.abs(Math.sin(now/120+x))*6:0;g.drawImage(up,x,ub-up.height*fu-b,tw*fu+1,up.height*fu)}
    for(let x=0;x<w;x+=tw*f)g.drawImage(T.club,x,ub-2,tw*f+1,ST.club*P*f*.75);
    for(let x=0;x<w;x+=tw*f){const b=ex?Math.abs(Math.sin(now/110+x*.01))*8:0;g.drawImage(lo,x,cb-lo.height*f-b,tw*f+1,lo.height*f)}
    const rh=h*.04;g.fillStyle=shade(host.c1,-.35);g.fillRect(0,lb,w,hz-lb);const msg=good?'IT\'S GOOD · ':(k.kind==='xp'?'EXTRA POINT · ':'FIELD GOAL · ')+String(host.city||host.name).toUpperCase()+' · ';
    const rc=stadRibbon('kick',msg,Math.round(rh),shade(host.c1,-.35),inkOn(shade(host.c1,-.35)));for(let x=-((now*.06)%rc.width);x<w;x+=rc.width)g.drawImage(rc,x,lb+(hz-lb-rh)/2);
    const L=sceneLight();for(const tx of [w*.07,w*.93]){g.fillStyle=L.glow>.25?'#151a21':'#3a4049';g.fillRect(tx-4,h*.03,8,h*.06);g.drawImage(T.tow,tx-46,0,92,h*.065);
      if(L.glow>.05){g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,L.glow*1.2);g.drawImage(T.glow,tx-160,-100,320,230);g.globalAlpha=1;g.globalCompositeOperation='source-over'}}}
  /* turf in perspective: mow bands, yard lines, sidelines, end zone in host colors */
  const vy=hz-h*.9,pz=y=>(y-vy)/(h-vy),fx2=(x,y)=>cx+(x-cx)*pz(y),span=w*.45,postY=h*.5,barY=h*.42,topY2=h*.08,ux=k.width*span;
  for(let i=0;i<9;i++){const y0=hz+(h-hz)*Math.pow(i/9,1.55),y1=hz+(h-hz)*Math.pow((i+1)/9,1.55);g.fillStyle=i%2?'#2f7f36':'#2a7231';g.fillRect(0,y0,w,y1-y0+1)}
  const ez=hz+(h-hz)*.07;g.fillStyle=host.c1;g.globalAlpha=.85;g.fillRect(0,hz,w,ez-hz);g.globalAlpha=1;g.save();g.translate(cx,(hz+ez)/2);g.scale(1,.32);g.fillStyle=inkOn(host.c1);g.font=`900 italic ${Math.round((ez-hz)*2.4)}px ${FFONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(host.city||host.name).toUpperCase(),0,0);g.restore();
  g.strokeStyle='rgba(255,255,255,.75)';for(let i=0;i<=9;i++){const y=hz+(h-hz)*Math.pow(i/9,1.55);g.lineWidth=1+3*pz(y);g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
  g.lineWidth=3;g.beginPath();for(const sx of [-1,1]){g.moveTo(fx2(cx+sx*w*.62,hz),hz);g.lineTo(fx2(cx+sx*w*.62,h),h)}g.stroke();
  g.fillStyle='rgba(255,255,255,.7)';for(let i=1;i<9;i++){const y=hz+(h-hz)*Math.pow(i/9,1.55),p=pz(y);for(const sx of [-1,1])g.fillRect(cx+sx*ux*p/pz(hz)-2*p,y-1,4*p+2,2+2*p)}
  /* uprights in perspective: padded base, gooseneck, crossbar, tapering uprights, wind ribbons */
  g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,hz+4,ux*.9,7,0,0,7);g.fill();
  g.fillStyle=host.c1;g.fillRect(cx-9,hz-30,18,34);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(cx-9,hz-30,5,34);
  g.lineCap='round';g.lineJoin='round';const post=(lw,col,o)=>{g.strokeStyle=col;g.lineWidth=lw;g.beginPath();g.moveTo(cx+o,hz-28);g.lineTo(cx+o,barY+o);g.moveTo(cx-ux,barY+o);g.lineTo(cx+ux,barY+o);g.moveTo(cx-ux+o,barY);g.lineTo(cx-ux*.985+o,topY2);g.moveTo(cx+ux+o,barY);g.lineTo(cx+ux*.985+o,topY2);g.stroke()};
  post(10,'#8a6a12',0);post(7,'#F2C230',0);post(2,'rgba(255,241,170,.85)',-2);
  const wm=S.wind?clamp(S.wind.mph/16,0,1):0;g.strokeStyle='#E8442B';g.lineWidth=4;for(const sx of [-1,1]){const tx=cx+sx*ux*.985,fl=Math.sin(now/110+sx);g.beginPath();g.moveTo(tx,topY2);g.quadraticCurveTo(tx+(k.drift||0)*40+fl*6,topY2+12,tx+(k.drift||0)*90*wm+fl*10,topY2+26-wm*12);g.stroke()}
  const kx=cx,ky=h*.93;
  if(k.stage==='aim'||k.stage==='power'){const a=k.stage==='aim'?k.ang:k.lockA;const tx=cx+a*span,ty=barY-30;g.save();g.setLineDash([14,10]);g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.moveTo(kx,ky);g.lineTo(tx,ty);g.stroke();g.setLineDash([]);const an=Math.atan2(ty-ky,tx-kx);g.fillStyle='#fff';g.translate(tx,ty);g.rotate(an);g.beginPath();g.moveTo(18,0);g.lineTo(-10,12);g.lineTo(-10,-12);g.closePath();g.fill();g.restore()}
  if(k.stage==='power'||k.stage==='flight'){const bx=w-60,bt=h*.12,bb=h*.88,bh=bb-bt;g.fillStyle='rgba(0,0,0,.5)';g.fillRect(bx-18,bt,36,bh);const pw=k.stage==='power'?k.pow:k.lockP;const pg=g.createLinearGradient(0,bb,0,bt);pg.addColorStop(0,'#3BD98A');pg.addColorStop(.7,'#F2B33D');pg.addColorStop(1,'#FF4D5E');g.fillStyle=pg;g.fillRect(bx-14,bb-pw*bh,28,pw*bh);
    const ny=bb-Math.min(1,k.need)*bh;g.strokeStyle='#FFD23F';g.lineWidth=4;g.beginPath();g.moveTo(bx-26,ny);g.lineTo(bx+26,ny);g.stroke();g.fillStyle='#fff';g.font='700 22px -apple-system,system-ui,sans-serif';g.textAlign='right';g.fillText('NEEDED',bx-30,ny+8)}
  if(k.stage==='flight'){const t=Math.min(1,k.flight/1);const tx=cx+k.aimF*span;const endY=k.lockP>=k.need?barY-90:barY+60+(k.need-k.lockP)*200;const x=lerp(kx,tx,t),y=lerp(ky,endY,t)-Math.sin(t*Math.PI)*h*.35,sc2=lerp(1,.35,t);
    {const gy=lerp(ky,hz+6,Math.pow(t,.7)),air=Math.max(0,gy-y),a=clamp(.38-air/h*.5,.08,.38);g.fillStyle=`rgba(0,0,0,${a})`;g.beginPath();g.ellipse(x,gy+4*sc2,24*sc2,7*sc2,0,0,7);g.fill()}
    g.save();g.translate(x,y);g.rotate(t*12);g.fillStyle='#8A4519';g.beginPath();g.ellipse(0,0,26*sc2,16*sc2,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.85)';g.fillRect(-9*sc2,-1.5*sc2,18*sc2,3*sc2);g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(-6*sc2,-6*sc2,12*sc2,5*sc2,0,0,7);g.fill();g.restore();
    if(t>=1){g.font='900 italic 64px -apple-system,system-ui,sans-serif';g.textAlign='center';g.fillStyle=k.good?'#3BD98A':'#FF4D5E';g.fillText(k.good?'GOOD!':'NO GOOD',cx,h*.32)}}
  else{g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(kx,ky+12,26,7,0,0,7);g.fill();g.fillStyle='#8A4519';g.beginPath();g.ellipse(kx,ky,24,15,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.85)';g.fillRect(kx-8,ky-1.5,16,3)}
  if(S.wx==='Wind'){g.fillStyle='#fff';g.font='700 24px -apple-system,system-ui,sans-serif';g.textAlign='left';g.fillText(`WIND ${k.drift<0?'◀':'▶'}`,20,40)}
}

/* ---------- retro pixel renderer ---------- */
const low=document.createElement('canvas'),lx=low.getContext('2d');
let PXS=3,A=4,LW=0,LH=0;
function resizeRetro(){PXS=Math.max(2,Math.round(sc/3.5));A=sc/PXS;LW=Math.ceil(W/PXS);LH=Math.ceil(H/PXS);low.width=LW;low.height=LH}
const AX=x=>Math.round((x-cam.x)*A+LW/2),AY=y=>Math.round((y-cam.y)*A*VY+midY()/PXS);
const GLY={A:[2,5,7,5,5],B:[6,5,6,5,6],C:[3,4,4,4,3],D:[6,5,5,5,6],E:[7,4,6,4,7],F:[7,4,6,4,4],G:[3,4,5,5,3],H:[5,5,7,5,5],I:[7,2,2,2,7],J:[1,1,1,5,2],K:[5,5,6,5,5],L:[4,4,4,4,7],M:[5,7,7,5,5],N:[6,5,5,5,5],O:[2,5,5,5,2],P:[6,5,6,4,4],Q:[2,5,5,6,3],R:[6,5,6,5,5],S:[3,4,2,1,6],T:[7,2,2,2,2],U:[5,5,5,5,7],V:[5,5,5,5,2],W:[5,5,7,7,5],X:[5,5,2,5,5],Y:[5,5,2,2,2],Z:[7,1,2,4,7],'0':[7,5,5,5,7],'1':[2,6,2,2,7],'2':[6,1,2,4,7],'3':[6,1,2,1,6],'4':[5,5,7,1,1],'5':[7,4,6,1,6],'6':[3,4,6,5,2],'7':[7,1,2,2,2],'8':[2,5,2,5,2],'9':[2,5,3,1,6],'-':[0,0,7,0,0],' ':[0,0,0,0,0],'.':[0,0,0,0,2],"'":[2,2,0,0,0]};
function pxText(c,str,x,y,s,col,vertical){str=String(str).toUpperCase();c.fillStyle=col;for(let i=0;i<str.length;i++){const g=GLY[str[i]]||GLY[' '];const ox=vertical?x:x+i*4*s,oy=vertical?y+i*6*s:y;for(let r=0;r<5;r++)for(let b=0;b<3;b++)if(g[r]&(4>>b))c.fillRect(ox+b*s,oy+r*s,s,s)}}
const pxW=(str,s)=>String(str).length*4*s-s;
const SPR={stand:["..HHH..",".HHHHH.",".HHHFM.","..JJJ..",".JJJJJ.",".SNNNS.","..PPP..","..P.P..","..P.P..",".KK.KK."],run1:["..HHH..",".HHHHH.",".HHHFM.","..JJJ..",".JJJJJ.","SJNNNJ.","..PPP..",".P...P.","P.....P","K.....K"],run2:["..HHH..",".HHHHH.",".HHHFM.","..JJJ..",".JJJJJ.",".JNNNJS","..PPP..","..PP...","..P.P..","..KK..."],down:[".......",".......",".......",".......",".......","..HHH..","JJJHHFM","JNNJHHH","PPPKK..","......."]};
function sprite(team,side,tone,frame,flip){
  const key=team.id+side+tone+frame+flip+team.c1+team.c2;let c=spriteCache.get(key);if(c)return c;
  const rows=SPR[frame];c=document.createElement('canvas');c.width=9;c.height=12;const g=c.getContext('2d');const home=side==='o';
  const pal={H:team.c1,J:home?team.c1:'#F4F4F2',N:home?(contrasty(team.c1,team.c2)?team.c2:'#FFFFFF'):team.c1,P:home?team.c2:'#DADAD6',K:'#14161A',F:TONES[tone],S:TONES[tone],M:'#C9CED6'};
  const fill=new Set();rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(ch!=='.')fill.add(((flip?6-x:x)+1)+','+(y+1))}));
  g.fillStyle='rgba(6,14,8,.75)';for(const k of fill){const [x,y]=k.split(',').map(Number);for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]])if(!fill.has((x+a)+','+(y+b)))g.fillRect(x+a,y+b,1,1)}
  rows.forEach((r,y)=>[...r].forEach((ch,x)=>{if(ch==='.')return;g.fillStyle=pal[ch];g.fillRect((flip?6-x:x)+1,y+1,1,1)}));spriteCache.set(key,c);return c;
}
function buildCrowdRetro(){const w=192,h=44;crowd=document.createElement('canvas');crowd.width=w;crowd.height=h;const g=crowd.getContext('2d');g.fillStyle='#10141B';g.fillRect(0,0,w,h);const cols=[S.home.c1,S.home.c1,S.home.c2,S.away.c1,'#3B4252','#5B6472','#E8E8E8'];for(let y=3;y<h-2;y+=4){g.fillStyle='rgba(255,255,255,.04)';g.fillRect(0,y+3,w,1);for(let x=(y/4%2)*2;x<w;x+=4){if(Math.random()<.12)continue;g.fillStyle=pick(TONES);g.fillRect(x,y,2,1);g.fillStyle=pick(cols);g.fillRect(x,y+1,2,2)}}}
function pxRing(c,cx,cy,rx,ry,col){c.fillStyle=col;for(let i=0;i<28;i++){const a=i/28*Math.PI*2;c.fillRect(Math.round(cx+Math.cos(a)*rx),Math.round(cy+Math.sin(a)*ry),1,1)}}
function drawRetro(now){
  const c=lx;c.imageSmoothingEnabled=false;c.fillStyle='#0A120D';c.fillRect(0,0,LW,LH);
  if(!S.home){ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(low,0,0,LW*PXS*DPR,LH*PXS*DPR);return}
  if(!crowd)buildCrowdRetro();
  const standBot=AY(-6),standTop=standBot-crowd.height;const off=((-cam.x*A*.9)%crowd.width+crowd.width)%crowd.width;
  for(let x=off-crowd.width;x<LW;x+=crowd.width)c.drawImage(crowd,Math.round(x),standTop);
  c.fillStyle='#0A0D12';c.fillRect(0,0,LW,Math.max(0,standTop));c.fillStyle=S.home.c1;c.fillRect(0,standBot,LW,2);c.fillStyle='#16361F';c.fillRect(0,standBot+2,LW,AY(FW+6)-standBot-2);
  const t0=AY(0),t1=AY(FW);
  for(let i=0;i<24;i++){const x0=AX(i*5),x1=AX((i+1)*5);if(x1<0||x0>LW)continue;c.fillStyle=i%2?'#2F7D36':'#2A7231';c.fillRect(x0,t0,x1-x0,t1-t0)}
  for(const [x0,t] of [[0,offT()],[110,defT()]]){const a=AX(x0),b=AX(x0+10);if(b<0||a>LW)continue;c.fillStyle=t.c1;c.fillRect(a,t0,b-a,t1-t0);c.fillStyle='rgba(0,0,0,.18)';for(let y=t0;y<t1;y+=4)c.fillRect(a,y,b-a,1);const name=t.name.toUpperCase(),s2=Math.max(1,Math.floor((t1-t0-8)/(name.length*6)));pxText(c,name,Math.round((a+b)/2-1.5*s2),Math.round((t0+t1)/2-name.length*3*s2),s2,contrasty(t.c1,t.c2)?t.c2:'#FFFFFF',true)}
  {const ab=S.home.abbr,s2=Math.max(2,Math.round(A*.9));const x=AX(60)-Math.round(pxW(ab,s2)/2),y=AY(CEN)-Math.round(2.5*s2);c.globalAlpha=.55;pxText(c,ab,x+s2,y+s2,s2,'rgba(0,0,0,.6)');pxText(c,ab,x,y,s2,S.home.c1);c.globalAlpha=1}
  c.fillStyle='rgba(255,255,255,.85)';for(let x=10;x<=110;x+=5){const ax=AX(x);if(ax<-2||ax>LW+2)continue;c.fillRect(ax,t0,(x===10||x===110)?2:1,t1-t0)}
  c.fillStyle='rgba(255,255,255,.6)';for(let x=11;x<110;x++){if(x%5===0)continue;const ax=AX(x);if(ax<0||ax>LW)continue;for(const y of [.8,HASH1,HASH2,FW-.8])c.fillRect(ax,AY(y),1,1)}
  c.fillStyle='#FFFFFF';c.fillRect(AX(0),t0-1,AX(120)-AX(0),2);c.fillRect(AX(0),t1,AX(120)-AX(0),2);
  const ns=Math.max(1,Math.round(A*VY*1.8/5));for(let x=20;x<=100;x+=10){const n=String(x<=60?x-10:110-x),ax=AX(x),w=pxW(n,ns);if(ax<-20||ax>LW+20)continue;pxText(c,n,ax-Math.round(w/2),AY(FW-8),ns,'rgba(255,255,255,.75)');pxText(c,n,ax-Math.round(w/2),AY(7),ns,'rgba(255,255,255,.75)')}
  for(const gx of [0,120]){const ax=AX(gx),cy=AY(CEN),ph=Math.round(A*5);c.fillStyle='#F2C230';c.fillRect(ax,cy-ph,1,ph);c.fillRect(ax-1,cy-ph-1,3,1);c.fillRect(ax-1,cy-ph-Math.round(A*4),1,Math.round(A*4));c.fillRect(ax+1,cy-ph-Math.round(A*4),1,Math.round(A*4))}
  const inGame=['presnap','live','dead','pat','kick','wait','drive'].includes(S.phase);
  const vl=(x,col)=>{const ax=AX(x);c.fillStyle=col;c.globalAlpha=.35;c.fillRect(ax-1,t0,3,t1-t0);c.globalAlpha=1;c.fillRect(ax,t0,1,t1-t0)};
  if(inGame){vl(S.los,'#4DA3FF');if(!S.conv&&S.firstDownX<110&&S.phase!=='pat')vl(S.firstDownX,'#FFD23F')}
  if(uOff()&&(S.phase==='presnap'||(S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble))){c.fillStyle=S.home.c1;for(const p of OFF){if(!p.rpath||(play&&play.type==='run'))continue;const pts=p.rpath.slice();if(p.cont){const a=pts[pts.length-1],b=p.cont,d=hyp(b[0]-a[0],b[1]-a[1])||1;pts.push([a[0]+(b[0]-a[0])/d*5,a[1]+(b[1]-a[1])/d*5])}for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];const n=Math.max(1,Math.round(hyp(AX(x1)-AX(x0),AY(y1)-AY(y0))/3));for(let k=0;k<=n;k++){const tt=k/n;c.globalAlpha=.75;c.fillRect(AX(lerp(x0,x1,tt)),AY(lerp(y0,y1,tt)),1,1)}}const e=pts[pts.length-1];c.globalAlpha=1;c.fillRect(AX(e[0])-1,AY(e[1])-1,3,3)}c.globalAlpha=1}
  if(aim&&S.phase==='live'){const d=hyp(aim.x-Q.x,aim.y-Q.y),h=aim.bullet?d*.03+.45:d*.11+.5;c.fillStyle=aim.bullet?'#FF8A2A':'#FFFFFF';const n=Math.max(8,Math.round(d*1.5)),ph=Math.floor(now/60)%3;for(let k=0;k<=n;k++){if((k+ph)%3)continue;const t=k/n,z=4*h*t*(1-t);c.fillRect(AX(lerp(Q.x,aim.x,t)),AY(lerp(Q.y,aim.y,t))-Math.round(z*A*.8)-5,1,1)}const ax=AX(aim.x),ay=AY(aim.y);pxRing(c,ax,ay,Math.max(2,Math.round(aim.err*A)),Math.max(1,Math.round(aim.err*A*VY)),'#FFFFFF');c.fillStyle=S.home.c1;c.fillRect(ax-4,ay,3,1);c.fillRect(ax+2,ay,3,1);c.fillRect(ax,ay-3,1,2);c.fillRect(ax,ay+2,1,2);pxText(c,String(Math.round(d)),ax-Math.round(pxW(String(Math.round(d)),1)/2),ay-10,1,'#FFFFFF')}
  const passLive=uOff()&&S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble;
  for(const p of P.slice().sort((a,b)=>a.y-b.y)){const ax=AX(p.x),ay=AY(p.y);if(ax<-12||ax>LW+12||ay<-16||ay>LH+16)continue;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(ax-3,ay,7,2);if(p===S.ctrl&&ctrlRing(p))pxRing(c,ax,ay,6,2,'#FFD23F');
    if(passLive&&eligible(p)){const [,nd]=nearest(DEF,p.x,p.y);pxRing(c,ax,ay,6,2,openCol(nd))}
    if(Math.abs(p.vx)>.3)p.face=p.vx>0?1:-1;const sp=hyp(p.vx,p.vy);const frame=p.fallP>.5?'down':sp>.6?(Math.floor(p.phase/Math.PI)%2?'run1':'run2'):'stand';
    if(p.stun>0&&!p.fallen&&Math.floor(now/90)%2)c.globalAlpha=.45;c.drawImage(sprite(p.team,p.team===hostT()?'o':'d',p.pl.tone,frame,p.face<0),ax-4,ay-10-Math.round((p.z||0)*A*.9));c.globalAlpha=1;
    if(play&&p===play.carrier&&isRunner()){c.fillStyle='#FFFFFF';const bob=Math.floor(now/200)%2;c.fillRect(ax-1,ay-15-bob-Math.round((p.z||0)*A*.9),3,1);c.fillRect(ax,ay-14-bob-Math.round((p.z||0)*A*.9),1,1)}}
  if(inGame&&ball){const bx=AX(ball.x),by=AY(ball.y);if(ball.state==='air'){c.fillStyle='rgba(0,0,0,.4)';c.fillRect(bx-1,by,3,1);const yy=by-Math.round(ball.z*A*.8)-5;c.fillStyle='#8A4A22';c.fillRect(bx-1,yy,3,2);c.fillStyle='#fff';c.fillRect(bx,yy,1,1)}else if(S.phase==='presnap'){c.fillStyle='#8A4A22';c.fillRect(bx-1,by-1,3,2)}else{const h=(play&&play.carrier)||Q;if(h){const f=h.face||1;c.fillStyle='#8A4A22';c.fillRect(AX(h.x)+f*2-1,AY(h.y)-5-Math.round((h.z||0)*A*.9),3,2)}}}
  for(const p of particles){c.fillStyle=p.c;c.fillRect(AX(p.x),AY(p.y)-Math.round(p.z*A*.9),1,1)}
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  const sx=S.shake>0?Math.round(R(-1,1)*S.shake*8):0;ctx.drawImage(low,0,0,LW,LH,sx*DPR,0,LW*PXS*DPR,LH*PXS*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);drawWeather(ctx);
}
function draw(now){if(LG&&LG.settings.style==='retro')drawRetro(now);else drawModern(now);if(S.phase==='replay')drawOverlay(now)}
