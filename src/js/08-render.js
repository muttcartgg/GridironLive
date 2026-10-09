/* =========================================================
   08 · Rendering: Modern HD (procedural animated athletes,
        stadium, lighting, weather, particles) and Retro pixel
   ========================================================= */
const TONES=['#7A4A22','#A8693A','#D9A066','#F1C27D'];
let CROWD_STATE='',turfPat=null,crowdM=null,wxParts=null,spriteCache=new Map(),crowd=null;
function resetRenderCaches(){spriteCache.clear();crowd=null;crowdM=null;wxParts=null}

/* ---------- particles ---------- */
function spawnTurf(x,y,n){if(LG&&LG.settings.style==='retro')n=Math.ceil(n/2);for(let i=0;i<n;i++)particles.push({x,y,z:.1,vx:R(-3,3),vy:R(-3,3),vz:R(2,5),life:R(.4,.8),t:0,c:pick(['#3f8f45','#2f6f35','#6b4a2a','#4f9a55']),s:R(.07,.15),kind:'turf'})}
function spawnConfetti(x,y){const cols=[S.home.c1,S.home.c2,'#ffffff',S.home.c1,'#FFD23F'];for(let i=0;i<80;i++)particles.push({x:x+R(-2,2),y:y+R(-2,2),z:R(1,3),vx:R(-6,6),vy:R(-6,6),vz:R(4,11),life:R(1.6,2.6),t:0,c:pick(cols),s:R(.12,.22),rot:R(0,6),vr:R(-10,10),kind:'conf'})}
function updateParticles(dt){for(const p of particles){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=(p.kind==='conf'?7:18)*dt;if(p.kind==='conf'){p.vx*=.985;p.vy*=.985;p.rot+=p.vr*dt;if(p.vz<-2.2)p.vz=-2.2}if(p.z<0){p.z=0;p.vz=0;p.vx*=.5;p.vy*=.5}}particles=particles.filter(p=>p.t<p.life)}
function updateWeather(dt){
  if(!S.wx||S.wx==='Clear'||S.wx==='Wind'){wxParts=null;return}
  if(!wxParts){wxParts=Array.from({length:S.wx==='Rain'?140:110},()=>({x:Math.random()*W,y:Math.random()*H,v:R(.7,1.3),s:R(.6,1.4)}))}
  for(const p of wxParts){if(S.wx==='Rain'){p.y+=900*p.v*dt;p.x-=180*p.v*dt}else{p.y+=60*p.v*dt;p.x+=Math.sin(performance.now()/900+p.s*5)*20*dt}if(p.y>H){p.y=-10;p.x=Math.random()*(W+200)}if(p.x<-20)p.x=W+20}
}
function drawWeather(c){
  if(!wxParts)return;c.save();
  if(S.wx==='Rain'){c.strokeStyle='rgba(200,215,235,.35)';c.lineWidth=1;c.beginPath();for(const p of wxParts){c.moveTo(p.x,p.y);c.lineTo(p.x+6*p.v,p.y-22*p.v)}c.stroke();c.fillStyle='rgba(20,30,45,.18)';c.fillRect(0,0,W,H)}
  else{c.fillStyle='rgba(255,255,255,.85)';for(const p of wxParts){c.beginPath();c.arc(p.x,p.y,1.2+p.s*1.4,0,7);c.fill()}}
  c.restore();
}

/* ---------- camera ---------- */
function updateCam(dt){
  let fx=S.los+2,fy=S.ballY,z=1.04,speed=4;
  if(S.phase==='presnap'&&!uOff()&&S.ctrl){fx=lerp(S.los+4,S.ctrl.x,.3)}
  if(S.phase==='live'||S.phase==='dead'||S.phase==='replay'){z=1;
    if(ball.state==='air'){const far=hyp(ball.tx-ball.fx,ball.ty-ball.fy);fx=lerp(ball.x,ball.tx,.55);fy=lerp(ball.y,ball.ty,.4);z=far>30?.76:far>18?.86:.94;speed=5.5}
    else if(aim&&Q){const d=hyp(aim.x-Q.x,aim.y-Q.y);fx=lerp(Q.x,aim.x,.58);fy=lerp(Q.y,aim.y,.35);z=d>30?.78:d>18?.88:.96;speed=5}
    else{const h=(play&&play.carrier)||Q;if(h){fx=h.x+clamp(h.vx*.45,-2,4);fy=h.y}if(isRunner()){z=.97;speed=6}
      if(play&&play.type==='pass'&&!play.thrown&&!play.scramble&&Q){const far=OFF.filter(eligible).reduce((m,o)=>Math.max(m,o.x),Q.x);fx=lerp(Q.x,far,.42);z=far-Q.x>22?.84:.94}}}
  if(LG&&LG.settings.style==='retro')z=1;
  cam.z+=(z-cam.z)*(1-Math.exp(-dt*2.6));
  const s=scE(),vw=W/s,vh=(H-topY)/(s*VY);
  let tx=fx+vw*.1;const mn=-6+vw/2,mx=126-vw/2;tx=mn>mx?60:clamp(tx,mn,mx);
  const ty=vh>=FW+10?CEN-3:clamp(fy,-8+vh/2,FW+3-vh/2);
  const k=1-Math.exp(-dt*speed);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;
  S.shake=Math.max(0,S.shake-dt*1.6);
}

/* ---------- modern renderer ---------- */
function buildTurf(){const n=document.createElement('canvas');n.width=n.height=96;const g=n.getContext('2d');for(let i=0;i<1400;i++){g.fillStyle=Math.random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)';g.fillRect(Math.random()*96,Math.random()*96,1,Math.random()<.3?2:1)}turfPat=ctx.createPattern(n,'repeat')}
function buildCrowdModern(){
  const w=900,h=260;crowdM=document.createElement('canvas');crowdM.width=w;crowdM.height=h;const g=crowdM.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#05070c');gr.addColorStop(1,'#141b26');g.fillStyle=gr;g.fillRect(0,0,w,h);
  const home=hostT(),away=home===S.home?S.away:S.home,cols=[home.c1,home.c1,home.c1,home.c2,home.c1,away.c1,'#2b3240','#3a4352','#e9e9e9'];
  const theme=crowdTheme(),empty=crowdEmpty();CROWD_STATE=theme+'|'+Math.round(empty*10);
  for(let y=18,row=0;y<h-6;y+=10,row++){g.fillStyle='rgba(255,255,255,.035)';g.fillRect(0,y+7,w,2);
    for(let x=(row%2)*5;x<w;x+=10){const student=x>w*.62&&x<w*.92;if(Math.random()<.06+empty*(student?.3:1))continue;let sh=pick(cols);
      if(student&&theme!=='none'){sh=theme==='white'?'#f2f3f5':theme==='black'?'#121418':theme==='stripe'?((row%2)?home.c1:home.c2):theme==='neon'?pick(['#39ff88','#ff3cac','#2de2ff',home.c1]):home.c1}
      const sk=pick(TONES);const jx=x+R(-1.5,1.5),jy=y+R(-1,1);g.fillStyle=sh;g.beginPath();g.ellipse(jx,jy+5,4,3.4,0,0,7);g.fill();g.fillStyle=sk;g.beginPath();g.arc(jx,jy,2.6,0,7);g.fill()}}
  const lg=g.createLinearGradient(0,0,0,h);lg.addColorStop(0,'rgba(0,0,0,.65)');lg.addColorStop(.5,'rgba(0,0,0,.1)');lg.addColorStop(1,'rgba(0,0,0,.25)');g.fillStyle=lg;g.fillRect(0,0,w,h);
}
function fieldPath(c,x0,y0,x1,y1){c.fillRect(X(x0),Y(y0),X(x1)-X(x0),Y(y1)-Y(y0))}
function drawModern(now){
  const c=ctx;c.setTransform(DPR,0,0,DPR,0,0);
  const night=isNight(),s=scE();
  c.fillStyle=night?'#03050a':'#0a111d';c.fillRect(0,0,W,H);
  if(!S.home)return;
  if(!turfPat)buildTurf();if(!crowdM)buildCrowdModern();
  c.save();if(S.shake>0)c.translate(R(-1,1)*S.shake*14,R(-1,1)*S.shake*10);
  // stands + LED ribbon board
  const standBot=Y(-6);
  if(standBot>0){const ch=Math.max(standBot+20,160),k=ch/crowdM.height,cw=crowdM.width*k;if(CROWD_STATE!==crowdTheme()+'|'+Math.round(crowdEmpty()*10))crowdM=null,buildCrowdModern();const hype=typeof BC!=='undefined'?BC.noise():0;const bob=Math.max(0,Math.sin(now/110))*hype*3;let off=((-cam.x*s*.55)%cw+cw)%cw;for(let x=off-cw;x<W;x+=cw)c.drawImage(crowdM,x,standBot-ch-bob,cw,ch);if(hype>.6){c.fillStyle=`rgba(255,255,255,${(hype-.6)*.12*(Math.sin(now/60)>0?1:.3)})`;c.fillRect(0,0,W,standBot)}
    const bh=Math.max(6,s*.75);const team=hostT();const lg=c.createLinearGradient(0,standBot-bh,0,standBot);lg.addColorStop(0,shade(team.c1,.2));lg.addColorStop(1,shade(team.c1,-.3));c.fillStyle=lg;c.fillRect(0,standBot-bh,W,bh);
    c.fillStyle=inkOn(team.c1);c.font=`900 italic ${bh*.72}px -apple-system,system-ui,sans-serif`;c.textBaseline='middle';const txt=(typeof BC!=='undefined'&&BC.ribbon())||`${team.abbr} · ${team.name.toUpperCase()} · `;const tw=c.measureText(txt).width;let to=((-cam.x*s*.9-now*.04)%tw+tw)%tw;for(let x=to-tw;x<W;x+=tw)c.fillText(txt,x,standBot-bh/2+1)}
  // sideline surface
  c.fillStyle=night?'#163d1f':'#1c4a25';fieldPath(c,-8,-6,128,FW+8);
  c.fillStyle='rgba(255,255,255,.05)';fieldPath(c,-8,-6,128,-4.8);
  // turf stripes
  const tf=turfColors(night);for(let i=0;i<24;i++){c.fillStyle=i%2?tf[0]:tf[1];fieldPath(c,i*5,0,(i+1)*5,FW)}
  c.save();c.translate(X(0),Y(0));c.fillStyle=turfPat;c.globalAlpha=.9;c.fillRect(0,0,X(120)-X(0),Y(FW)-Y(0));c.restore();
  drawWear(c,s);
  // endzones
  for(const [x0,t,dir] of [[0,offT(),-1],[110,defT(),1]]){const a=X(x0),b=X(x0+10);if(b<0||a>W)continue;
    c.fillStyle=t.c1;fieldPath(c,x0,0,x0+10,FW);c.save();c.beginPath();c.rect(a,Y(0),b-a,Y(FW)-Y(0));c.clip();c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=s*.5;for(let k=-20;k<60;k+=2){c.beginPath();c.moveTo(X(x0)+k*s,Y(0));c.lineTo(X(x0)+(k-8)*s,Y(FW));c.stroke()}c.restore();
    c.save();c.translate((a+b)/2,Y(CEN));c.rotate(dir*Math.PI/2);c.scale(1,1);const name=t.name.toUpperCase();let fs=s*5.6;c.font=`900 italic ${fs}px -apple-system,system-ui,sans-serif`;const mw=c.measureText(name).width,maxw=(Y(FW)-Y(0))*.92;if(mw>maxw){fs*=maxw/mw;c.font=`900 italic ${fs}px -apple-system,system-ui,sans-serif`}
    c.textAlign='center';c.textBaseline='middle';c.lineWidth=Math.max(2,fs*.08);c.strokeStyle=contrasty(t.c1,t.c2)?t.c2:'#ffffff';c.fillStyle=contrasty(t.c1,t.c2)?t.c2:'#ffffff';c.globalAlpha=.95;c.scale(1,1/VY*VY);c.fillText(name,0,0);c.restore()}
  // midfield logo
  {const t=hostT(),cx=X(60),cy=Y(CEN),r=s*4.6;if(cx>-r*2&&cx<W+r*2){c.save();c.translate(cx,cy);c.scale(1,VY);c.globalAlpha=.9;c.fillStyle=t.c2;c.beginPath();c.moveTo(-r,-r*.9);c.lineTo(r,-r*.9);c.lineTo(r,r*.25);c.lineTo(0,r*1.05);c.lineTo(-r,r*.25);c.closePath();c.fill();
    c.fillStyle=t.c1;c.beginPath();const q=r*.86;c.moveTo(-q,-q*.9);c.lineTo(q,-q*.9);c.lineTo(q,q*.25);c.lineTo(0,q*1.05);c.lineTo(-q,q*.25);c.closePath();c.fill();
    c.fillStyle=inkOn(t.c1);c.font=`900 italic ${r*.7}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(t.abbr,0,-r*.08);c.restore()}}
  // lines
  c.strokeStyle='rgba(255,255,255,.88)';
  for(let x=10;x<=110;x+=5){const px=X(x);if(px<-4||px>W+4)continue;c.lineWidth=Math.max(1,(x===10||x===110?.32:.14)*s);c.beginPath();c.moveTo(px,Y(0));c.lineTo(px,Y(FW));c.stroke()}
  c.lineWidth=Math.max(2,.3*s);c.strokeRect(X(0),Y(0),X(120)-X(0),Y(FW)-Y(0));
  c.lineWidth=Math.max(1,.1*s);c.beginPath();for(let x=11;x<110;x++){if(x%5===0)continue;const px=X(x);if(px<0||px>W)continue;for(const [a,b] of [[.4,1.1],[HASH1-.35,HASH1+.35],[HASH2-.35,HASH2+.35],[FW-1.1,FW-.4]]){c.moveTo(px,Y(a));c.lineTo(px,Y(b))}}c.stroke();
  // numbers (painted flat on the field)
  c.fillStyle='rgba(255,255,255,.82)';c.textAlign='center';c.textBaseline='middle';
  for(let x=20;x<=100;x+=10){const n=String(x<=60?x-10:110-x),px=X(x);if(px<-60||px>W+60)continue;
    for(const [yy,rot] of [[FW-8,0],[8,Math.PI]]){c.save();c.translate(px,Y(yy));c.scale(1,VY);c.rotate(rot);c.font=`800 ${s*2.4}px -apple-system,system-ui,sans-serif`;c.fillText(n,0,0);
      if(x!==60){const dir=(x<60?-1:1)*(rot?-1:1);c.beginPath();c.moveTo(dir*s*2.3,-s*.35);c.lineTo(dir*s*2.3,s*.35);c.lineTo(dir*s*2.8,0);c.closePath();c.fill()}c.restore()}}
  // goal posts (oblique so the crossbar reads in depth)
  for(const gx of [0,120]){const px=X(gx);if(px<-60||px>W+60)continue;const hgt=s*3.2,up=s*4.2,ox=yy=>(yy-CEN)*s*.2;
    const a={x:px+ox(CEN-3.08),y:Y(CEN-3.08)-hgt},b={x:px+ox(CEN+3.08),y:Y(CEN+3.08)-hgt};
    c.save();c.strokeStyle='#F2C230';c.shadowColor='rgba(242,194,48,.55)';c.shadowBlur=8;c.lineCap='round';c.lineWidth=Math.max(2,s*.24);
    c.beginPath();c.moveTo(px,Y(CEN));c.lineTo(px,Y(CEN)-hgt);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.moveTo(a.x,a.y);c.lineTo(a.x,a.y-up);c.moveTo(b.x,b.y);c.lineTo(b.x,b.y-up);c.stroke();c.restore()}
  // broadcast lines
  const inGame=['presnap','live','dead','pat','kick','wait','drive'].includes(S.phase);
  const glowLine=(x,col)=>{const px=X(x);c.save();c.strokeStyle=col;c.shadowColor=col;c.shadowBlur=12;c.lineWidth=Math.max(2,.24*s);c.globalAlpha=.95;c.beginPath();c.moveTo(px,Y(0));c.lineTo(px,Y(FW));c.stroke();c.restore()};
  if(inGame){glowLine(S.los,'#4DA3FF');if(!S.conv&&S.firstDownX<110&&S.phase!=='pat')glowLine(S.firstDownX,'#FFD23F');drawFieldGfx(c,s,now)}
  drawPylons(c,s);
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
  for(const p of sorted){
    if(passLive&&eligible(p)){const [,nd]=nearest(DEF,p.x,p.y);const col=openCol(nd);c.save();c.strokeStyle=col;c.shadowColor=col;c.shadowBlur=10;c.lineWidth=2.5;c.beginPath();c.ellipse(X(p.x),Y(p.y),s*.85,s*.85*VY,0,0,7);c.stroke();c.restore()}
    if(play&&p===play.carrier&&isRunner()){c.save();c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=2;const pr=s*(.9+.12*Math.sin(now/120));c.beginPath();c.ellipse(X(p.x),Y(p.y),pr,pr*VY,0,0,7);c.stroke();if(play.jukeT>0||play.hurdle>0){c.strokeStyle=S.home.c1;c.lineWidth=3;c.beginPath();c.ellipse(X(p.x),Y(p.y),pr*1.3,pr*1.3*VY,0,0,7);c.stroke()}c.restore()}
    if(p===S.ctrl&&!uOff()&&S.phase!=='dead'){c.save();c.strokeStyle='#FFD23F';c.shadowColor='#FFD23F';c.shadowBlur=12;c.lineWidth=3;c.beginPath();c.ellipse(X(p.x),Y(p.y),s*1.05,s*1.05*VY,0,0,7);c.stroke();c.beginPath();c.moveTo(X(p.x),Y(p.y)-s*3.6);c.lineTo(X(p.x)-s*.45,Y(p.y)-s*4.3);c.lineTo(X(p.x)+s*.45,Y(p.y)-s*4.3);c.closePath();c.fillStyle='#FFD23F';c.fill();c.restore()}
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
  // lighting
  drawSky(c,now);
  if(night){const g=c.createRadialGradient(W/2,midY(),Math.min(W,H)*.2,W/2,midY(),Math.max(W,H)*.75);g.addColorStop(0,'rgba(255,250,235,.06)');g.addColorStop(1,'rgba(0,0,10,.5)');c.fillStyle=g;c.fillRect(0,0,W,H)}
  else{const g=c.createRadialGradient(W/2,midY(),Math.min(W,H)*.35,W/2,midY(),Math.max(W,H)*.8);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=g;c.fillRect(0,0,W,H)}
  drawWeather(c);
  if(S.ts<.9){const a=(1-S.ts)*.9,bh=H*.07;c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(0,0,W,bh);c.fillRect(0,H-bh,W,bh)}
}
function drawFootball(c,x,y,r,ang,spin){
  c.save();c.translate(x,y);c.rotate(ang);const g=c.createLinearGradient(0,-r*.6,0,r*.6);g.addColorStop(0,'#B5642E');g.addColorStop(.5,'#8A4519');g.addColorStop(1,'#4E250C');c.fillStyle=g;c.beginPath();c.ellipse(0,0,r,r*.6,0,0,7);c.fill();
  c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=Math.max(1,r*.12);const o=Math.sin(spin||0)*r*.25;c.beginPath();c.moveTo(-r*.35,o-r*.1);c.lineTo(r*.35,o-r*.1);c.stroke();c.lineWidth=Math.max(1,r*.08);for(let k=-2;k<=2;k++){c.beginPath();c.moveTo(k*r*.13,o-r*.24);c.lineTo(k*r*.13,o+r*.04);c.stroke()}c.restore();
}
function drawAthlete(c,p,now){
  const s=scE(),sx=X(p.x),sy=Y(p.y),H=s*2.75;
  if(sx<-H||sx>W+H||sy<-H*1.6||sy>H*2+window.innerHeight)return;
  const team=p.team||(p.side==='o'?offT():defT()),home=team===hostT(),ct=contrasty(team.c1,team.c2);
  const U=uniColors(team),jersey=U.j,trim=U.t,pants=U.p,helm=U.h,skin=TONES[p.pl.tone],sock=U.s,BW=BUILD[p.role]||[1,1];
  const sp=hyp(p.vx,p.vy),run=clamp(sp/7.5,0,1.2),z=(p.z||0)*s*.9;
  c.fillStyle=`rgba(0,0,0,${.33*(1-Math.min(.7,p.z||0))})`;c.beginPath();c.ellipse(sx+s*.1,sy,H*.24,H*.075,0,0,7);c.fill();
  let lean=run*.3,amp=run*.95,crouch=0,arm='swing';
  const pre=S.phase==='presnap';
  if(pre){if(p.role==='OL'||p.role==='DL'){crouch=1;lean=.95;arm='down'}else if(p.role!=='QB'){crouch=.35;lean=.3}}
  if(p.engaged&&!pre){lean=Math.max(lean,.6);arm='push';amp=Math.max(amp,.35)}
  const carrying=play&&p===play.carrier&&ball.state==='held'&&!pre;
  if(carrying)arm='carry';if(p.stiff>0)arm='stiff';if(p===Q&&aim&&S.phase==='live')arm='cock';if(p.throwT>0)arm='follow';
  if(ball.state==='air'&&hyp(p.x-ball.tx,p.y-ball.ty)<(p.side==='o'?3:2.5)&&ball.t/ball.T>.55)arm='reach';
  if(S.celebrate===p)arm=S.celebPose&&POSE_ARM[S.celebPose]||'celebrate';
  if(S.celebrate===p&&S.celebPose==='bow')lean=.9;if(S.celebrate===p&&S.celebPose==='heisman'){crouch=.2}
  if(LG.settings.stars!==false&&p.ovr>=86&&S.phase!=='kick'){const n=p.ovr>=94?3:p.ovr>=90?2:1;c.save();c.fillStyle='#FFD23F';c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=3;for(let i=0;i<n;i++)starPath(c,sx+(i-(n-1)/2)*H*.2,sy+H*.16,H*.075);c.restore()}
  const ph=p.phase,face=p.face||1;
  c.save();c.translate(sx,sy-z);c.scale(face*BW[0],BW[1]);
  const fallRot=p.fallP*1.4+(p.lunge>0?.55:0)+(play&&p===play.carrier&&play.dive>0?.9:0);if(fallRot>.01)c.rotate(fallRot);
  const hip={x:0,y:-H*(.47-crouch*.13)},tl=H*.235,sl=H*.235;
  const legs=[0,1].map(k=>{const sn=Math.sin(ph+k*Math.PI);const a=sn*amp*.75+(crouch?(k?.4:-.2):0);const bend=crouch*.9+Math.max(0,-Math.cos(ph+k*Math.PI))*amp*1.1+(p.z>.2?1.2:0);const knee={x:hip.x+Math.sin(a)*tl,y:hip.y+Math.cos(a)*tl};return {knee,foot:{x:knee.x+Math.sin(a-bend)*sl,y:knee.y+Math.cos(a-bend)*sl},front:sn>0}});
  const shoulder={x:hip.x+Math.sin(lean)*H*.3,y:hip.y-Math.cos(lean)*H*.3},head={x:shoulder.x+Math.sin(lean)*H*.13,y:shoulder.y-Math.cos(lean)*H*.13};
  const limb=(a,b,w,col)=>{c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke()};
  const drawLeg=l=>{limb(hip,l.knee,H*.105,pants);limb(l.knee,l.foot,H*.078,sock);c.fillStyle='#101114';c.beginPath();c.ellipse(l.foot.x+H*.03,l.foot.y,H*.055,H*.03,0,0,7);c.fill()};
  const armPts=k=>{const sn=Math.sin(ph+(k?0:Math.PI));let ua,fa;
    switch(arm){case 'down':ua=.25;fa=.1;break;case 'push':ua=1.35;fa=1.45;break;
      case 'carry':if(k){ua=.45;fa=2.5}else{ua=-sn*amp*.8;fa=ua+.8}break;case 'stiff':if(k){ua=1.55;fa=1.58}else{ua=.45;fa=2.5}break;
      case 'cock':if(k){ua=.9;fa=1.6}else{ua=-2.2;fa=-2.9}break;case 'follow':if(k){ua=1.2;fa=1.0}else{ua=1.65;fa=1.25}break;
      case 'reach':ua=2.65+(k?.12:-.12);fa=2.95;break;case 'celebrate':ua=2.95;fa=3.05;break;
      case 'point':if(k){ua=3;fa=3.1}else{ua=.3;fa=.2}break;case 'heisman':if(k){ua=1.6;fa=1.55}else{ua=.5;fa=2.6}break;case 'flex':ua=1.6;fa=3.0;break;case 'spikeA':if(k){ua=-.3+Math.sin(now/90)*.6;fa=ua}else{ua=.2;fa=.4}break;case 'salute':if(k){ua=2.4;fa=-1.2}else{ua=.2;fa=.3}break;case 'bowA':ua=.6;fa=.4;break;
      default:ua=-sn*amp*.9;fa=ua+.9*amp+.3}
    const el={x:shoulder.x+Math.sin(ua)*H*.16,y:shoulder.y+Math.cos(ua)*H*.16};return {el,hand:{x:el.x+Math.sin(fa)*H*.15,y:el.y+Math.cos(fa)*H*.15}}};
  const drawArm=k=>{const {el,hand}=armPts(k);limb(shoulder,el,H*.078,jersey);limb(el,hand,H*.06,skin);return hand};
  const back=legs.find(l=>!l.front)||legs[0],frontL=legs.find(l=>l!==back);
  drawLeg(back);const hb=drawArm(0);
  const nx=Math.cos(lean),ny=Math.sin(lean),tw=H*.11;
  c.fillStyle=jersey;c.strokeStyle=jersey;c.lineWidth=H*.05;c.lineJoin='round';c.beginPath();
  c.moveTo(hip.x-nx*tw*.8,hip.y-ny*tw*.8);c.lineTo(shoulder.x-nx*tw*1.2,shoulder.y-ny*tw*1.2);c.lineTo(shoulder.x+nx*tw*1.2,shoulder.y+ny*tw*1.2);c.lineTo(hip.x+nx*tw*.8,hip.y+ny*tw*.8);c.closePath();c.fill();c.stroke();
  limb({x:hip.x-nx*tw*.75,y:hip.y-ny*tw*.75},{x:hip.x+nx*tw*.75,y:hip.y+ny*tw*.75},H*.05,pants);
  if(p.dirt>.05){c.fillStyle=`rgba(${S.wx==='Snow'?'235,240,245':'74,54,30'},${Math.min(.6,p.dirt*.7)})`;c.beginPath();c.ellipse(hip.x+H*.02,hip.y+H*.12,H*.07,H*.05,0,0,7);c.ellipse(shoulder.x*.4+hip.x*.6,shoulder.y*.4+hip.y*.6,H*.06,H*.04,.4,0,7);c.fill()}
  if(H>28){c.save();c.translate((hip.x+shoulder.x)/2,(hip.y+shoulder.y)/2-H*.02);c.rotate(lean);c.scale(face,1);c.fillStyle=trim;c.font=`900 ${H*.13}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(p.num,0,0);c.restore()}
  drawLeg(frontL);const hf=drawArm(1);
  if(arm==='carry'||arm==='stiff'){const bx=shoulder.x*.55+hip.x*.45+H*.1,by=shoulder.y*.55+hip.y*.45;drawFootball(c,bx,by,H*.085,-.5,0)}
  if(arm==='cock')drawFootball(c,hb.x,hb.y,H*.085,-.8,0);
  const r=H*.118,g=c.createRadialGradient(head.x-r*.35,head.y-r*.45,r*.1,head.x,head.y,r*1.15);g.addColorStop(0,shade(helm,.5));g.addColorStop(.45,helm);g.addColorStop(1,shade(helm,-.4));
  c.fillStyle=g;c.beginPath();c.arc(head.x,head.y,r,0,7);c.fill();
  c.strokeStyle=trim;c.lineWidth=r*.26;c.beginPath();c.arc(head.x,head.y,r*.8,-Math.PI*.98,-Math.PI*.38);c.stroke();
  if(H>30){c.save();c.fillStyle=trim;c.globalAlpha=.9;c.font=`900 ${r*.8}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(team.abbr[0],head.x-r*.15,head.y+r*.05);c.restore();c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(head.x-r*.35,head.y-r*.45,r*.28,r*.16,-.5,0,7);c.fill()}
  c.strokeStyle=U.mask;c.lineWidth=Math.max(1,r*.17);c.lineCap='round';c.beginPath();c.moveTo(head.x+r*.55,head.y-r*.1);c.lineTo(head.x+r*1.18,head.y+r*.15);c.lineTo(head.x+r*.98,head.y+r*.78);c.moveTo(head.x+r*.62,head.y+r*.45);c.lineTo(head.x+r*1.12,head.y+r*.47);c.stroke();
  c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.arc(head.x-r*.05,head.y+r*.12,r*.16,0,7);c.fill();
  c.restore();
}

/* ---------- kick view (direction + power) ---------- */
function drawKick(){
  const k=kick;if(!k)return;const cv2=$('#kcv'),g=cv2.getContext('2d'),w=cv2.width,h=cv2.height,cx=w/2,night=S.slot==='Primetime';
  const sky=g.createLinearGradient(0,0,0,h*.45);sky.addColorStop(0,night?'#02040a':'#20324d');sky.addColorStop(1,night?'#0d1422':'#4a6a8f');g.fillStyle=sky;g.fillRect(0,0,w,h);
  g.fillStyle=night?'#0a0f18':'#1a2333';g.fillRect(0,h*.26,w,h*.2);for(let i=0;i<260;i++){g.fillStyle=pick(['#2b3342','#3b4556',S.home.c1,S.away.c1,'#d9d9d9']);g.fillRect((i*37)%w,h*.27+((i*13)%Math.round(h*.17)),5,4)}
  const fg=g.createLinearGradient(0,h*.45,0,h);fg.addColorStop(0,'#2a7230');fg.addColorStop(1,'#33873a');g.fillStyle=fg;g.fillRect(0,h*.45,w,h*.55);
  g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=2;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(cx+i*40,h*.46);g.lineTo(cx+i*190,h);g.stroke()}
  const span=w*.45,postY=h*.5,barY=h*.42,topY2=h*.08;
  g.strokeStyle='#F2C230';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(cx,postY+20);g.lineTo(cx,barY);g.moveTo(cx-k.width*span,barY);g.lineTo(cx+k.width*span,barY);g.moveTo(cx-k.width*span,barY);g.lineTo(cx-k.width*span,topY2);g.moveTo(cx+k.width*span,barY);g.lineTo(cx+k.width*span,topY2);g.stroke();
  const kx=cx,ky=h*.93;
  if(k.stage==='aim'||k.stage==='power'){const a=k.stage==='aim'?k.ang:k.lockA;const tx=cx+a*span,ty=barY-30;g.save();g.setLineDash([14,10]);g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.moveTo(kx,ky);g.lineTo(tx,ty);g.stroke();g.setLineDash([]);const an=Math.atan2(ty-ky,tx-kx);g.fillStyle='#fff';g.translate(tx,ty);g.rotate(an);g.beginPath();g.moveTo(18,0);g.lineTo(-10,12);g.lineTo(-10,-12);g.closePath();g.fill();g.restore()}
  if(k.stage==='power'||k.stage==='flight'){const bx=w-60,bt=h*.12,bb=h*.88,bh=bb-bt;g.fillStyle='rgba(0,0,0,.5)';g.fillRect(bx-18,bt,36,bh);const pw=k.stage==='power'?k.pow:k.lockP;const pg=g.createLinearGradient(0,bb,0,bt);pg.addColorStop(0,'#3BD98A');pg.addColorStop(.7,'#F2B33D');pg.addColorStop(1,'#FF4D5E');g.fillStyle=pg;g.fillRect(bx-14,bb-pw*bh,28,pw*bh);
    const ny=bb-Math.min(1,k.need)*bh;g.strokeStyle='#FFD23F';g.lineWidth=4;g.beginPath();g.moveTo(bx-26,ny);g.lineTo(bx+26,ny);g.stroke();g.fillStyle='#fff';g.font='700 22px -apple-system,system-ui,sans-serif';g.textAlign='right';g.fillText('NEEDED',bx-30,ny+8)}
  if(k.stage==='flight'){const t=Math.min(1,k.flight/1);const tx=cx+k.aimF*span;const endY=k.lockP>=k.need?barY-90:barY+60+(k.need-k.lockP)*200;const x=lerp(kx,tx,t),y=lerp(ky,endY,t)-Math.sin(t*Math.PI)*h*.35,sc2=lerp(1,.35,t);
    g.save();g.translate(x,y);g.rotate(t*12);g.fillStyle='#8A4519';g.beginPath();g.ellipse(0,0,26*sc2,16*sc2,0,0,7);g.fill();g.restore();
    if(t>=1){g.font='900 italic 64px -apple-system,system-ui,sans-serif';g.textAlign='center';g.fillStyle=k.good?'#3BD98A':'#FF4D5E';g.fillText(k.good?'GOOD!':'NO GOOD',cx,h*.32)}}
  else{g.fillStyle='#8A4519';g.beginPath();g.ellipse(kx,ky,24,15,0,0,7);g.fill()}
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
  for(const p of P.slice().sort((a,b)=>a.y-b.y)){const ax=AX(p.x),ay=AY(p.y);if(ax<-12||ax>LW+12||ay<-16||ay>LH+16)continue;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(ax-3,ay,7,2);if(p===S.ctrl&&!uOff())pxRing(c,ax,ay,6,2,'#FFD23F');
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
