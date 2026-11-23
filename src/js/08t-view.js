/* =========================================================
   08t · 3D broadcast style, part 2: renderer, cameras, painted overlays, the screen ↔ field mapping, the kick view
   Settings › Art style › 3D broadcast (stored as '3d'): the DOM UI keeps the Modern broadcast theme
   (dataset.style='modern', dataset.render='3d'); a WebGL canvas (#gl3d) sits under the transparent #field canvas,
   which becomes the 2D overlay (receiver badges, the stick, the kick meter, the replay pen) and keeps every pointer
   listener. draw() (08) hands each frame to draw3D. The athletes, ball, officials and flag come from 08u:
   ath3dFrame(G3.actors, now, dt) every frame and ath3dReset() when the teams change or a game ends; until that
   file exists, team-coloured placeholder capsules stand in.
   Cameras: the TV sideline camera (about 25 yd up and 60 yd back of the near sideline, telephoto: about 40 yd across
   at the line in landscape, a taller, closer frame in portrait; follows the ball with smoothing and lead, pulls out
   on passes), a wider kickoff / punt camera, the behind-the-kicker camera for field goals and extra points, and a
   low cinematic camera for replays and touchdowns.
   Input: fieldToScreen(x,y,z) → [sx,sy,onScreen] and screenToField(sx,sy,h) (a ray to the plane at height h);
   06-input and 06c route their conversions through these (and g3Aim / g3ScreenVec for drags) when is3D().
   ========================================================= */
const G3={ok:null,R:null,cv:null,scene:null,cam:null,env:null,key:'',tkey:'',actors:null,ov:null,w:0,h:0,t:0,last:0,fontOk:false,fr:0,cover:false,
  cs:{x:60,z:CEN,w:40},mode:'',cutN:-1,ex:0,cpu:0,kb:null,wx:null,wxk:'',ph:null,lp:''};
function is3D(){return !!(LG&&LG.settings&&LG.settings.style==='3d')}
function g3Init(){
  if(G3.R)return true;if(G3.ok===false)return false;
  try{
    if(typeof THREE==='undefined')throw new Error('three.js missing');
    const c=document.createElement('canvas');c.id='gl3d';c.setAttribute('aria-hidden','true');
    const R=new THREE.WebGLRenderer({canvas:c,antialias:true,powerPreference:'high-performance',stencil:false});
    if(!R.capabilities.isWebGL2)throw new Error('WebGL 2 unavailable');
    $('#app').insertBefore(c,$('#field'));
    R.setPixelRatio(Math.min(window.devicePixelRatio||1,2));R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1;
    R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFShadowMap;R.info.autoReset=true;
    G3.R=R;G3.cv=c;G3.aniso=Math.min(8,R.capabilities.getMaxAnisotropy()||1);
    const sc=new THREE.Scene();G3.scene=sc;G3.cam=new THREE.PerspectiveCamera(20,1,1.5,4200);
    G3.hemi=new THREE.HemisphereLight('#bcd4ff','#35502a',1.1);sc.add(G3.hemi);
    const sun=new THREE.DirectionalLight('#fff4e0',2.6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    const sh=sun.shadow.camera;sh.left=-42;sh.right=42;sh.top=42;sh.bottom=-42;sh.near=10;sh.far=420;sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;
    sc.add(sun);sc.add(sun.target);G3.sun=sun;
    /* the opposite light banks at night (no shadow; zero by day, so every shader compiles once for all light stages) */
    const fill=new THREE.DirectionalLight('#dfe7ff',0);sc.add(fill);sc.add(fill.target);G3.fill=fill;
    G3.actors=new THREE.Group();G3.actors.name='actors';sc.add(G3.actors);
    G3.ov=g3MakeOverlays();sc.add(G3.ov.group);
    if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('700 80px "Big Shoulders Display"'),document.fonts.load('800 80px "Big Shoulders Display"')]).then(()=>{G3.fontOk=true}).catch(()=>{G3.fontOk=true});else G3.fontOk=true;
    G3.ok=true;return true;
  }catch(e){console.warn('3D broadcast unavailable:',e&&e.message);G3.ok=false;return false}
}
function g3Show(on){if(G3.cv)G3.cv.style.display=on?'block':'none';if(!on&&G3.R){G3.cover=false}}
function g3Size(){const w=W||innerWidth,h=H||innerHeight;if(w!==G3.w||h!==G3.h){G3.w=w;G3.h=h;G3.R.setSize(w,h,true)}}
/* ---------- screen ↔ field ---------- */
const G3V=[0,0,0].map(()=>null);
function fieldToScreen(x,y,z){if(!G3.cam||!G3.w)return [0,0,false];const v=G3V[0]||(G3V[0]=new THREE.Vector3());v.set(x,z||0,y).project(G3.cam);return [(v.x+1)/2*G3.w,(1-v.y)/2*G3.h,v.z>-1&&v.z<1]}
function screenToField(sx,sy,h){if(!G3.cam||!G3.w)return [S.los||60,S.ballY||CEN];const c=G3.cam,o=c.position,v=G3V[1]||(G3V[1]=new THREE.Vector3());v.set(sx/G3.w*2-1,1-sy/G3.h*2,.5).unproject(c).sub(o);
  const t=((h||0)-o.y)/(Math.abs(v.y)<1e-6?-1e-6:v.y);if(!(t>0)){const n=Math.hypot(v.x,v.z)||1;return [o.x+v.x/n*400,o.z+v.z/n*400]}return [o.x+v.x*t,o.z+v.z*t]}
/* a screen drag (dx,dy) at the screen anchor (ax,ay) → the unit field direction under it */
function g3ScreenVec(dx,dy,ax,ay){const m=Math.hypot(dx,dy);if(!m)return [0,0];const e=14/m,a=screenToField(ax,ay),b=screenToField(ax+dx*e,ay+dy*e),fx=b[0]-a[0],fy=b[1]-a[1],n=Math.hypot(fx,fy)||1;return [fx/n,fy/n]}
/* slingshot / drag aim: the field direction of the pull as seen on screen at o, with the 2D views' reach (k yd per px, VY) */
function g3Aim(px,py,k,o){const m=Math.hypot(px*k,py*k/VY);if(!m||!o)return [0,0];const s=fieldToScreen(o.x,o.y,0),u=g3ScreenVec(px,py,s[0],s[1]);return [u[0]*m,u[1]*m]}
/* ---------- the painted overlays (blue line, yellow line, rings, aim arc, landing marker, routes, confetti) ---------- */
function g3Basic(col,op,extra){return new THREE.MeshBasicMaterial(Object.assign({color:col,transparent:true,opacity:op==null?1:op,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4},extra||{}))}
function g3Ring(r0,r1,col,op){const g=new THREE.RingGeometry(r0,r1,56);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,g3Basic(col,op));m.renderOrder=3;m.visible=false;return m}
function g3MakeOverlays(){const g=new THREE.Group(),O={group:g};
  const strip=col=>{const m=new THREE.Mesh(t3Ground([[-.16,0,.16,FW]],.02),g3Basic(col,.9));m.renderOrder=2;m.visible=false;g.add(m);return m};
  O.los=strip('#3D8BFF');O.fd=strip('#FFD23F');
  O.ring=g3Ring(1.05,1.36,'#FFD23F',.95);O.ring2=g3Ring(1.5,1.62,'#FFD23F',.5);O.car=g3Ring(.95,1.1,'#FFFFFF',.8);g.add(O.ring,O.ring2,O.car);
  O.open=[];for(let i=0;i<6;i++){const r=g3Ring(.9,1.12,'#3BD98A',.9);O.open.push(r);g.add(r)}
  O.land=g3Ring(.9,1,'#FFFFFF',.95);O.landF=new THREE.Mesh((()=>{const c=new THREE.CircleGeometry(.9,40);c.rotateX(-Math.PI/2);return c})(),g3Basic('#FFFFFF',.16));O.landF.renderOrder=3;O.landF.visible=false;
  O.lead=g3Ring(.42,.55,'#FFFFFF',.7);g.add(O.land,O.landF,O.lead);
  O.dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.16,10,6),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false,transparent:true,opacity:.95}),72);O.dots.count=0;O.dots.frustumCulled=false;O.dots.renderOrder=4;g.add(O.dots);
  O.routes=new THREE.Mesh(new THREE.BufferGeometry(),g3Basic('#ffffff',.5,{side:THREE.DoubleSide}));O.routes.renderOrder=2;O.routes.visible=false;O.routes.frustumCulled=false;O.rsig='';g.add(O.routes);
  O.conf=new THREE.InstancedMesh(new THREE.PlaneGeometry(.26,.15),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,toneMapped:false}),220);O.conf.count=0;O.conf.frustumCulled=false;g.add(O.conf);
  return O}
const G3M=new THREE.Matrix4(),G3Q=new THREE.Quaternion(),G3E=new THREE.Euler(),G3P=new THREE.Vector3(),G3S=new THREE.Vector3(1,1,1),G3C=new THREE.Color();
/* dashed ground ribbons for the routes (one geometry, rebuilt only when a route changes) */
function g3RouteGeo(lines){const pos=[],hw=.11,y=.024;
  const quad=(ax,az,bx,bz,w)=>{const dx=bx-ax,dz=bz-az,l=Math.hypot(dx,dz)||1,nx=-dz/l*w,nz=dx/l*w;pos.push(ax+nx,y,az+nz,ax-nx,y,az-nz,bx-nx,y,bz-nz,ax+nx,y,az+nz,bx-nx,y,bz-nz,bx+nx,y,bz+nz)};
  for(const L of lines){const p=L.pts;let on=true,left=L.dash?.75:1e9;
    for(let i=1;i<p.length;i++){let ax=p[i-1][0],az=p[i-1][1];const bx=p[i][0],bz=p[i][1];let seg=Math.hypot(bx-ax,bz-az);
      while(seg>1e-4){const st=Math.min(seg,left),t=st/seg,cx=ax+(bx-ax)*t,cz=az+(bz-az)*t;if(on)quad(ax,az,cx,cz,L.w||hw);ax=cx;az=cz;seg-=st;left-=st;if(left<=1e-4){on=!on;left=on?.75:.5}}}
    const e=p[p.length-1],f=p[p.length-2]||p[0],dx=e[0]-f[0],dz=e[1]-f[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l,s=L.w?1.9:1.3;
    pos.push(e[0]+ux*.7*s,y,e[1]+uz*.7*s,e[0]-uz*.45*s,y,e[1]+ux*.45*s,e[0]+uz*.45*s,y,e[1]-ux*.45*s)}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));return G}
function g3Routes(){const O=G3.ov,show=uOff()&&LG.settings.routes!==false&&(S.phase==='presnap'||(S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble));
  if(!show){O.routes.visible=false;return}
  const lines=[];let sig='';const rp=S.phase==='presnap'&&S.pc&&S.pc.run,cr=rp&&KP[rp.carrier==='QB'?'QB':rp.carrier];
  if(cr){const L=S.los,gy=clamp(S.ballY+rp.gap*S.flip,3,FW-3);lines.push({pts:[[cr.x,cr.y],[L+1.2,gy],[L+5.5,gy]],w:.16});sig+='r'+cr.x.toFixed(1)+cr.y.toFixed(1)+gy.toFixed(1)}
  for(const p of OFF){if(!p.rpath||!p.rpath.length||(play&&play.type==='run'))continue;const pts=p.rpath.slice();if(p.cont){const a=pts[pts.length-1],b=p.cont,d=hyp(b[0]-a[0],b[1]-a[1])||1;pts.push([a[0]+(b[0]-a[0])/d*5,a[1]+(b[1]-a[1])/d*5])}
    if(pts.length<2)continue;lines.push({pts,dash:1});for(const q of pts)sig+=q[0].toFixed(1)+','+q[1].toFixed(1)+';'}
  const col=tvCol(S.home);if(sig!==O.rsig){O.rsig=sig;O.routes.geometry.dispose();O.routes.geometry=g3RouteGeo(lines)}
  O.routes.material.color.set(col);O.routes.material.opacity=S.phase==='presnap'?.6:.34;O.routes.visible=lines.length>0;
}
function g3Overlays(now){const O=G3.ov,inGame=['presnap','live','dead','pat','kick','wait','drive'].includes(S.phase)&&S.phase!=='kick';
  O.los.visible=inGame;O.los.position.x=S.los;O.fd.visible=inGame&&!S.conv&&S.firstDownX<110&&S.phase!=='pat';O.fd.position.x=S.firstDownX;
  /* the man you control: a bold gold ring (pulsing outer ring), the ball carrier a white one */
  let me=null;if(S.phase!=='dead'&&S.phase!=='kick'){if(S.ctrl&&typeof ctrlRing==='function'&&ctrlRing(S.ctrl))me=S.ctrl;else{for(const p of P)if(typeof rtgMine==='function'&&rtgMine(p)&&p.side==='o'){me=p;break}}}
  O.ring.visible=O.ring2.visible=!!me;if(me){O.ring.position.set(me.x,.03,me.y);const k=1+.1*Math.sin(now/180);O.ring2.position.set(me.x,.03,me.y);O.ring2.scale.set(k,1,k)}
  const car=play&&play.carrier&&typeof isRunner==='function'&&isRunner()&&S.phase==='live'?play.carrier:null;O.car.visible=!!car&&car!==me;if(car)O.car.position.set(car.x,.03,car.y);
  /* receivers' openness while the QB has the ball */
  const passLive=uOff()&&S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble;let oi=0;
  if(passLive)for(const p of OFF){if(oi>=O.open.length)break;if(!eligible(p)||p===Q||p.blocker)continue;const [,nd]=nearest(DEF,p.x,p.y);const r=O.open[oi++];r.visible=true;r.position.set(p.x,.028,p.y);r.material.color.set(openCol(nd))}
  for(;oi<O.open.length;oi++)O.open[oi].visible=false;
  g3Routes();
  /* the aim arc: dots along the throw's path, the landing marker (green when a receiver gets there), the lead spot */
  O.dots.count=0;O.land.visible=O.landF.visible=O.lead.visible=false;G3.aimTxt=null;
  if(aim&&S.phase==='live'&&Q){const d=hyp(aim.x-Q.x,aim.y-Q.y),hgt=aim.bullet?d*.03+.45:aim.lob?d*.18+1.3:d*.11+.5,col=aim.bullet?'#FF8A2A':aim.lob?'#7FD4FF':'#FFFFFF';
    const n=Math.min(70,Math.max(10,Math.round(d*1.5))),ph=(now/45)%3;
    for(let k=0;k<=n&&k<72;k++){const t=k/n,z=1.9*(1-t)+4*hgt*t*(1-t)+.12*t,s=(((k+ph)|0)%3===0?1.45:1)*(.75+.35*t);G3P.set(lerp(Q.x,aim.x,t),z,lerp(Q.y,aim.y,t));G3S.set(s,s,s);G3M.compose(G3P,G3Q.identity(),G3S);O.dots.setMatrixAt(k,G3M);O.dots.count=k+1}
    O.dots.instanceMatrix.needsUpdate=true;O.dots.material.color.set(col);
    let rc=col;{const T=typeof flightT==='function'?flightT(d,aim.bullet,aim.lob,Q.pl.thr):d/22;let r=null,rd=7;for(const o of OFF){if(o===Q||o.blocker||!eligible(o))continue;const lx=o.x+(o.vx||0)*T,ly=o.y+(o.vy||0)*T,dd=hyp(lx-aim.x,ly-aim.y);if(dd<rd){rd=dd;r=[o,lx,ly]}}
      if(r){const on=rd<=Math.max(1.3,aim.err+.7)||aim.r===r[0];if(on)rc='#5BE37D';O.lead.visible=true;O.lead.position.set(r[1],.03,r[2]);O.lead.material.color.set(on?'#5BE37D':'#FFFFFF')}}
    const e=Math.max(.7,aim.err||0);O.land.visible=O.landF.visible=true;O.land.position.set(aim.x,.032,aim.y);O.land.scale.set(e,1,e);O.landF.position.set(aim.x,.03,aim.y);O.landF.scale.set(e,1,e);O.land.material.color.set(rc);O.landF.material.color.set(aim.bullet?'#FF8A2A':rc);
    G3.aimTxt={x:aim.x,y:aim.y,t:`${Math.round(d)} YD${aim.bullet?' · BULLET':aim.lob?' · LOB':''}`,c:rc}}
  /* confetti (08 spawnConfetti) */
  let ci=0;for(const p of particles){if(p.kind!=='conf'||ci>=220)continue;G3E.set(p.rot||0,(p.rot||0)*.7,0);G3Q.setFromEuler(G3E);G3P.set(p.x,Math.max(.02,p.z),p.y);G3S.set(1,1,1);G3M.compose(G3P,G3Q,G3S);O.conf.setMatrixAt(ci,G3M);O.conf.setColorAt(ci,G3C.set(p.c));ci++}
  O.conf.count=ci;if(ci){O.conf.instanceMatrix.needsUpdate=true;if(O.conf.instanceColor)O.conf.instanceColor.needsUpdate=true}
}
/* ---------- placeholder athletes (only until 08u's ath3dFrame exists) ---------- */
function g3Placeholders(){
  if(!G3.ph){const body=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.34,1.05,4,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.6}),48),
      head=new THREE.InstancedMesh(new THREE.SphereGeometry(.27,14,10),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.3,metalness:.2}),48),
      bm=new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),new THREE.MeshStandardMaterial({color:'#7a3b16',roughness:.5}));bm.scale.set(1.7,1,1);
    for(const m of [body,head,bm]){m.castShadow=true;m.frustumCulled=false}G3.ph={body,head,ball:bm};G3.actors.add(body,head,bm)}
  const ph=G3.ph,list=[];for(const p of P)list.push(p);if(OFFI&&OFFI.list&&S.phase!=='kick')for(const o of OFFI.list)list.push(o);
  let i=0;for(const p of list){if(i>=48)break;const off=p.ref!=null,t=off?null:(p.side==='o'?offT():defT());let u=null;try{u=t&&typeof uniColorsC==='function'?uniColorsC(t):null}catch(e){u=null}
    const jc=off?'#f4f4f4':u&&u.j||t.c1,hc=off?'#111111':u&&u.h||t.c1,fall=p.fallP||0,z=Math.max(0,p.z||0);
    G3E.set(0,0,fall*1.4*(p.face||1)*-1);G3Q.setFromEuler(G3E);G3P.set(p.x,.86+z-fall*.55,p.y);G3S.set(1,1,1);G3M.compose(G3P,G3Q,G3S);ph.body.setMatrixAt(i,G3M);ph.body.setColorAt(i,G3C.set(jc));
    G3P.set(p.x+fall*.9*(p.face||1),1.96+z-fall*1.5,p.y);G3M.compose(G3P,G3Q.identity(),G3S);ph.head.setMatrixAt(i,G3M);ph.head.setColorAt(i,G3C.set(hc));i++}
  ph.body.count=ph.head.count=i;for(const m of [ph.body,ph.head]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}
  let bx=ball.x,by=ball.y,bz=ball.z||0;if(ball.state==='held'&&play&&play.carrier&&S.phase==='live'){bx=play.carrier.x+.3;by=play.carrier.y;bz=1.15}else if(ball.state!=='air')bz=Math.max(bz,.15);
  ph.ball.position.set(bx,bz,by);ph.ball.rotation.y=ball.state==='air'?-Math.atan2((ball.ty||by)-(ball.fy||by),(ball.tx||bx)-(ball.fx||bx)):0;ph.ball.visible=true;
}
function g3DropPlaceholders(){if(!G3.ph)return;for(const k of ['body','head','ball']){const m=G3.ph[k];G3.actors.remove(m);m.geometry.dispose();m.material.dispose()}G3.ph=null}
/* ---------- the kick: the ball sits on the hold and flies through (or past) the uprights; the meter is 2D on top ---------- */
const G3K={half:3.083};
function g3KickSpot(){return [S.los-7,S.ballY]}
function g3KickBall(){
  const k=kick;
  if(k)G3.lastKick=k;
  if(S.phase==='kick'&&!k&&G3.kb)return;   // the result beat: the ball stays where it came down
  if(S.phase==='kick'&&k){if(!G3.kb)G3.kb={x:ball.x,y:ball.y,z:ball.z,state:ball.state};
    const [x0,y0]=g3KickSpot();let x=x0,y=y0,z=.18,st='dead';
    if(k.stage==='flight'){const t=Math.min(1,k.flight/1),x1=k.blocked?x0+6:128,tp=Math.min(.95,(120-x0)/(x1-x0)),off=(k.aimF||0)*(G3K.half/Math.max(.05,k.width)),yp=CEN+off;
      const zp=k.blocked?1.2:k.lockP>=k.need?3.33+2.4+(k.lockP-k.need)*14:3.33*clamp(k.lockP/Math.max(.01,k.need),0,1)*.72,hm=zp/(4*tp*(1-tp)+.001);
      x=lerp(x0,x1,t);y=y0+(yp-y0)*(t/tp);z=Math.max(.12,.18*(1-t)+4*Math.min(hm,45)*t*(1-t));st='air';
      if(!k.blocked&&k.lockP<k.need&&t>tp)z=Math.max(.12,z)}
    ball.x=x;ball.y=y;ball.z=z;ball.state=st;G3.kb.set=[x,y,z];return}
  if(G3.kb){const s=G3.kb.set;if(s&&ball.x===s[0]&&ball.y===s[1]&&ball.z===s[2]){ball.x=G3.kb.x;ball.y=G3.kb.y;ball.z=G3.kb.z;ball.state=G3.kb.state}G3.kb=null}
}
function g3KickUI(c,now){const k=kick;if(!k||S.phase!=='kick')return;const [x0,y0]=g3KickSpot(),sp=G3K.half/Math.max(.05,k.width);c.save();
  if(k.stage==='aim'||k.stage==='power'){const a=k.stage==='aim'?k.ang:k.lockA,A=fieldToScreen(x0+1,y0,.3),B=fieldToScreen(120,CEN+a*sp,5.2);
    c.setLineDash([12,9]);c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=7;c.beginPath();c.moveTo(A[0],A[1]);c.lineTo(B[0],B[1]);c.stroke();c.strokeStyle='#fff';c.lineWidth=4;c.stroke();c.setLineDash([]);
    const an=Math.atan2(B[1]-A[1],B[0]-A[0]);c.translate(B[0],B[1]);c.rotate(an);c.fillStyle='#fff';c.beginPath();c.moveTo(16,0);c.lineTo(-9,11);c.lineTo(-9,-11);c.closePath();c.fill();c.setTransform(DPR,0,0,DPR,0,0)}
  if(k.stage==='power'||k.stage==='flight'){const bx=W-Math.max(42,SAFE.r+34),bt=H*.2,bb=H*.74,bh=bb-bt,pw=k.stage==='power'?k.pow:k.lockP;
    c.fillStyle='rgba(6,9,14,.66)';c.fillRect(bx-15,bt-4,30,bh+8);const pg=c.createLinearGradient(0,bb,0,bt);pg.addColorStop(0,'#3BD98A');pg.addColorStop(.7,'#F2B33D');pg.addColorStop(1,'#FF4D5E');c.fillStyle=pg;c.fillRect(bx-11,bb-pw*bh,22,pw*bh);
    const ny=bb-Math.min(1,k.need)*bh;c.strokeStyle='#FFD23F';c.lineWidth=3;c.beginPath();c.moveTo(bx-21,ny);c.lineTo(bx+21,ny);c.stroke();c.fillStyle='#fff';c.font='800 13px "Big Shoulders Display",'+FFONT;c.textAlign='right';c.textBaseline='middle';c.fillText('NEEDED',bx-24,ny);
    c.textAlign='center';c.fillText('POWER',bx,bb+16)}
  if(k.stage==='flight'&&k.flight>=1){c.font='800 54px "Big Shoulders Display",'+FFONT;c.textAlign='center';c.textBaseline='middle';c.lineWidth=6;c.strokeStyle='rgba(0,0,0,.55)';const tx=k.good?'GOOD!':k.blocked?'BLOCKED':'NO GOOD';c.strokeText(tx,W/2,H*.3);c.fillStyle=k.good?'#3BD98A':'#FF4D5E';c.fillText(tx,W/2,H*.3)}
  if(S.wx==='Wind'||k.drift){c.fillStyle='#fff';c.font='800 15px "Big Shoulders Display",'+FFONT;c.textAlign='left';c.textBaseline='top';c.fillText(`WIND ${k.drift<0?'◀':'▶'}`,Math.max(14,SAFE.l+10),Math.max(topY,60))}
  c.restore()}
/* ---------- cameras ---------- */
function g3Damp(o,k,tgt,st,dt){const v=k+'v',w=2/st,x=w*dt,e=1/(1+x+.48*x*x+.235*x*x*x),ch=o[k]-tgt,tmp=((o[v]||0)+w*ch)*dt;o[v]=((o[v]||0)-w*tmp)*e;o[k]=tgt+(ch+tmp)*e}
/* the TV rig: a ground target, the width seen across at it, the pitch and the slant distance */
function g3Rig(tx,tz,wid,pitch,dist,lift){const a=G3.w/Math.max(1,G3.h),p=pitch*Math.PI/180,c=G3.cam;c.position.set(tx,dist*Math.sin(p),tz+dist*Math.cos(p));c.lookAt(tx,lift||0,tz);
  const hf=2*Math.atan(wid/2/dist);c.fov=clamp(2*Math.atan(Math.tan(hf/2)/a)*180/Math.PI,5,75);c.aspect=a;c.updateProjectionMatrix()}
function g3CamMode(){
  if(S.phase==='kick'&&(kick||G3.mode==='kick'))return 'kick';
  if(S.phase==='replay')return 'cine';
  if(S.phase==='dead'&&S.celebrate)return 'cine';
  if((S.phase==='live'||S.phase==='dead')&&play&&play.st)return 'st';
  return 'tv'}
/* screen fit for the TV rig: the ground rows `far` (its players' helmets) and `near` must sit between the score bug and the
   bottom UI. Returns the target depth (centred, or `bias` of the way toward the far limit, never showing more than the
   ground beyond row `fill` past either sideline, i.e. stands; when the span does not fit the far row wins); widens up to wMax. Ground row z projects to NDC y = (tz−z)·sinP / (D + (tz−z)·cosP) / t. */
const G3FIT=[0,0,0,0];
function g3Fit(w,wMax,far,near,P,D,bias,fill){
  const H=G3.h||1,a=G3.w/Math.max(1,H),sp=Math.sin(P),cp=Math.cos(P),bug=Math.min(H*.42,G3.bugY||48);
  const yT=1-2*bug/H,yB=2*G3.bot/H-1;let tz=(far+near)/2;
  for(let it=0;it<4;it++){const t=w/(2*D)/a,dT=sp-yT*t*cp,E=dT>1e-4?yT*t*D/dT:1e4,En=yB*t*D/(sp+yB*t*cp),hi=far+E,lo=near-En;
    G3FIT[2]=lo;G3FIT[3]=hi;if(lo<=hi){let b=bias==null?(far+near)/2:lo+(hi-lo)*bias;const sL=fill+E,sH=FW-fill-En;b=sL<=sH?clamp(b,sL,sH):Math.min(b,sH);tz=clamp(b,lo,hi);break}tz=hi;if(w>=wMax-1e-3)break;w=Math.min(wMax,w*Math.min(1.6,(near-far)/Math.max(1,E+En))*1.03)}
  G3FIT[0]=w;G3FIT[1]=tz;return G3FIT}
/* photo mode: the 2D pan (cam.x / cam.y, in 2D yards) and zoom (cam.z) drive the 3D shot, finger-for-finger */
function g3Photo(cs,P){const p=G3.pho||(G3.pho={cx:cam.x,cy:cam.y,z:cam.z||1,w:cs.w,x:cs.x,tz:cs.z});
  const k=scE()*(cs.w/Math.max(1,G3.w));p.x+=(cam.x-p.cx)*k;p.tz+=(cam.y-p.cy)*k*VY/Math.max(.2,Math.sin(P));p.cx=cam.x;p.cy=cam.y;
  p.x=clamp(p.x,-20,140);p.tz=clamp(p.tz,-12,FW+10);cs.x=p.x;cs.z=p.tz;cs.w=clamp(p.w/Math.max(.3,(cam.z||1)/p.z),6,120);cs.xv=cs.zv=cs.wv=0}
function g3Camera(dt){
  const port=G3.h>G3.w*1.2,mode=g3CamMode(),cs=G3.cs;let cut=false;
  if(mode!==G3.mode){if(G3.mode&&(mode==='cine'||G3.mode==='cine'||mode==='kick'||G3.mode==='kick'))S.cutA=Math.max(S.cutA||0,.8);cut=true;G3.mode=mode;cs.t0=G3.t}
  if((S.cutN||0)!==G3.cutN){G3.cutN=S.cutN||0;cut=true;cs.t0=G3.t}
  if(!S.photo)G3.pho=null;
  if(mode==='kick'&&!S.photo){const [x0,y0]=g3KickSpot(),c=G3.cam,k=kick||G3.lastKick,fl=!k||k.stage==='flight'?Math.min(1,k?k.flight:1):0;c.position.set(x0-13.5,5.6+fl*1.5,y0+(CEN-y0)*.25);
    const lx=lerp(120,Math.max(ball.x,x0+20),fl*.25),ly=lerp(2.4,Math.min(9,ball.z||4),fl*.35);c.lookAt(lx,ly,CEN+(y0-CEN)*.15);c.fov=port?50:28;c.aspect=G3.w/G3.h;c.updateProjectionMatrix();cs.x=x0+20;cs.z=CEN;return}
  /* replays ride the ball low and close; a touchdown pushes in on the scorer and drifts round him */
  if(mode==='cine'&&!S.photo){const cel=S.phase!=='replay'&&S.celebrate,h=cel||null,hb=!h&&ball.state==='held'&&play&&play.carrier;
    const bx=h?h.x:hb?play.carrier.x:ball.x,by=h?h.y:hb?play.carrier.y:ball.y;
    if(cut||cs.cx==null){cs.cx=bx;cs.cz=by;cs.cxv=cs.czv=0;cs.ca=cel?-.75:-.42}g3Damp(cs,'cx',bx,cel?.3:.18,dt);g3Damp(cs,'cz',by,cel?.35:.24,dt);cs.ca+=dt*(cel?.2:.07);
    const age=G3.t-(cs.t0||0),q=1-Math.pow(1-clamp(age/1.1,0,1),3),r=(port?17:15.5)*(cel?1.45-.5*q:1.08-.08*q),c=G3.cam;
    c.position.set(cs.cx+Math.sin(cs.ca)*r,cel?2.4+.5*q:3.1,cs.cz+Math.cos(cs.ca)*r);c.lookAt(cs.cx,cel?1.25:1.05,cs.cz);c.fov=port?42:26;c.aspect=G3.w/G3.h;c.updateProjectionMatrix();cs.x=cs.cx;cs.z=cs.cz;return}
  /* TV + special teams: what the shot follows (fx), the ground rows it must keep in view (far, near), how wide it is (w),
     smoothing (st). Landscape is the classic press-box angle; portrait climbs higher so the field, not the stands, fills
     the tall frame. Runs tighten (bigger players) with a lead from the carrier's smoothed velocity. */
  let pitch=port?36:18.5,dist=port?64:88;
  let w=port?24:36,wMax=port?30:42,fx=S.los+w*(port?.06:.12),far=null,near=null,st=.5,wst=.8,bias=null;
  const live=(S.phase==='live'||S.phase==='dead'||S.phase==='replay')&&play;
  if(mode==='st'){pitch+=port?2:4;dist+=8;const t=ball.state==='air'?null:play.carrier;
    if(t){g3Lead(cs,t,dt);w=port?26:44;wMax=port?34:54;fx=t.x+clamp(cs.lvx*(port?.35:.55),-7,7);far=t.y-6;near=t.y+4;st=.26}
    else{w=port?34:60;wMax=port?46:70;fx=lerp(ball.x,ball.tx==null?ball.x:ball.tx,.35);far=Math.min(ball.y,ball.ty==null?ball.y:ball.ty)-4;near=Math.max(ball.y,ball.ty==null?ball.y:ball.ty)+4;st=.42}}
  else if(live){const h=play.carrier||Q;
    if(ball.state==='air'&&!ball.pitch){const tx=ball.tx==null?ball.x:ball.tx,ty=ball.ty==null?ball.y:ball.ty,fx0=ball.fx==null?ball.x:ball.fx,fy0=ball.fy==null?ball.y:ball.fy,d=hyp(tx-fx0,ty-fy0);
      fx=lerp(ball.x,tx,.5);w=clamp(d*(port?.6:.9)+(port?10:16),port?24:40,port?40:64);wMax=port?48:70;far=Math.min(ty,ball.y)-1;near=Math.max(ty,ball.y,fy0)+2;st=.36;wst=.6;bias=.7}
    else if(aim&&Q){const d=hyp(aim.x-Q.x,aim.y-Q.y);fx=lerp(Q.x,aim.x,.5);w=clamp(d*(port?.7:1.02)+(port?12:16),port?26:42,port?44:66);wMax=port?52:72;
      far=Math.min(aim.y-1,-1.5);near=Math.max(Q.y,aim.y)+2;st=.3;wst=.4;bias=.85}
    else if(h&&play.type==='pass'&&!play.thrown&&!play.scramble&&h===Q){
      /* dropback: from the QB to the deepest receiver, every route's depth on screen */
      let x1=Q.x+12,y0=Q.y,y1=Q.y;for(const p of OFF){if(p===Q||p.blocker||!eligible(p))continue;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y}
      const x0=Q.x-5;w=clamp((x1-x0)*1.08+4,port?26:44,port?40:62);wMax=port?44:66;fx=Math.max((x0+x1)/2,x0+w*.42);far=y0-1;near=y1+1.5;st=.38;wst=.7;bias=.75}
    else if(h){g3Lead(cs,h,dt);const open=Math.abs(h.x-S.los)>12&&Math.hypot(h.vx||0,h.vy||0)>6;
      w=port?(open?23:21):(open?35:31);wMax=port?28:44;fx=h.x+clamp(cs.lvx*(port?.32:.5),port?-3.5:-5,port?4:7.5);far=h.y-5;near=h.y+4;st=.2;wst=.7}
    if(S.phase==='dead'){fx=cs.x;far=null;w=cs.w}}
  else if(S.phase==='presnap'||S.phase==='pat'||S.phase==='wait'){
    let y0=S.ballY-4,y1=S.ballY+4;for(const p of P){if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y}far=y0-1;near=y1+1;bias=.85}
  /* fit: helmets of the far row below the score bug, the near row above the bottom UI */
  const Pr=pitch*Math.PI/180;let tz=cs.z;
  if(far!=null){G3.bot=G3.h-Math.max(SAFE.b||0,22,G3.bugB||0)-(S.phase==='presnap'?G3.h*(port?.12:.2):G3.h*(port?.08:.04));
    const f=g3Fit(w,Math.max(w,wMax),far-2.15/Math.tan(Pr),near,Pr,dist,bias,port?-3:-5);w=f[0];tz=f[1];G3.dbg=[+far.toFixed(1),+near.toFixed(1),+w.toFixed(1),+tz.toFixed(1),+f[2].toFixed(1),+f[3].toFixed(1)]}
  else if(!live)tz=lerp(CEN,S.ballY,.45);
  fx=clamp(fx,-6+w*.4,126-w*.4);tz=clamp(tz,port?6:4,port?47:44);
  if(S.photo){g3Photo(cs,Pr);g3Rig(cs.x,cs.z,cs.w,pitch,dist,0);return}
  if(cut){cs.x=fx;cs.z=tz;cs.w=w;cs.xv=cs.zv=cs.wv=0}else{g3Damp(cs,'x',fx,st,dt);g3Damp(cs,'z',tz,st*1.6,dt);g3Damp(cs,'w',w,wst,dt)}
  /* keep the ball inside the frame when the spring lags (the spring keeps its velocity: no hitch) */
  if(live&&S.phase!=='dead'){const b=ball.state==='air'?ball:(play.carrier||Q);if(b){const hw=cs.w*.43;let o=b.x<cs.x-hw?b.x+hw-cs.x:b.x>cs.x+hw?b.x-hw-cs.x:0;if(o)cs.x+=o*Math.min(1,dt*10)}}
  g3Rig(cs.x,cs.z,cs.w,pitch,dist,0);
}
/* the carrier's velocity, smoothed (the lead must not twitch on every cut) */
function g3Lead(cs,h,dt){if(cs.lp!==h){cs.lp=h;cs.lvx=h.vx||0;return}cs.lvx+=((h.vx||0)-cs.lvx)*Math.min(1,dt*4.5)}
/* ---------- light, shadows, sky, crowd, video board, weather ---------- */
const G3L={day:{h:['#c4dbff','#3f5d2c',1.12],s:['#fff4e2',2.75],f:0,el:56,dx:-.55,dz:-.83,ex:1},late:{h:['#d8d2c4','#3d5130',1.0],s:['#ffd9a8',2.45],f:0,el:34,dx:-.88,dz:-.47,ex:1},
  sunset:{h:['#c09284','#2c3620',.98],s:['#ff9a52',2.9],f:.3,el:11,dx:-.98,dz:-.2,ex:1.02},night:{h:['#141c30','#040604',.08],s:['#f7f8ff',4.3],f:.5,fd:[.05,.3,-.95],el:55,dx:-.55,dz:.62,ex:.82}};
/* the key light (sun, or the far light banks at night) follows the shot; its shadow box is snapped to whole shadow-map
   texels in light space, so shadows do not crawl or shimmer while the camera pans */
const G3SH={half:42,map:2048};
function g3Light(){const st=G3.env?G3.env.stage:'day',L=G3L[st]||G3L.day,wk=G3.env?G3.env.wk:'dry',dim=wk!=='dry'&&st!=='night'?.62:1,hm=wk!=='dry'?1.2:1;
  G3.hemi.color.set(L.h[0]);G3.hemi.groundColor.set(L.h[1]);G3.hemi.intensity=L.h[2]*hm;G3.sun.color.set(L.s[0]);G3.sun.intensity=L.s[1]*dim;G3.R.toneMappingExposure=L.ex;G3.fill.intensity=L.f*dim;
  const e=L.el*Math.PI/180,ce=Math.cos(e),dx=L.dx*ce,dy=Math.sin(e),dz=L.dz*ce,rl=Math.hypot(dz,dx)||1,rx=dz/rl,rz=-dx/rl,ux=dy*rz,uy=dz*rx-dx*rz,uz=-dy*rx,tx=G3.cs.x,tz=G3.cs.z;
  const q=2*G3SH.half/G3SH.map,a=tx*rx+tz*rz,b=tx*ux+tz*uz,da=Math.round(a/q)*q-a,db=Math.round(b/q)*q-b,X=tx+da*rx+db*ux,Y=db*uy,Z=tz+da*rz+db*uz;
  G3.sun.target.position.set(X,Y,Z);G3.sun.position.set(X+dx*160,Y+dy*160,Z+dz*160);G3.sun.target.updateMatrixWorld();
  /* fill: opposite the key by day; at night a low back light from the far banks (turf sheen toward the camera, rim light) */
  const fd=L.fd;G3.fill.target.position.set(tx,0,tz);if(fd)G3.fill.position.set(tx+fd[0]*120,fd[1]*120,tz+fd[2]*120);else G3.fill.position.set(tx-dx*100,60,tz-dz*100+40);G3.fill.target.updateMatrixWorld();
  if(!G3.fogK||G3.fogK!==st+wk){G3.fogK=st+wk;const c=(SKY3[st]||SKY3.day)[1];G3.scene.fog=st==='night'?new THREE.Fog('#020308',90,520):new THREE.Fog(wk==='dry'?c:'#8a929c',wk==='dry'?260:150,wk==='dry'?1500:700)}}
onFx('td',()=>{G3.ex=1});onFx('roar',()=>{G3.ex=Math.max(G3.ex,.75)});onFx('turnover',()=>{G3.ex=Math.max(G3.ex,.85)});onFx('safety',()=>{G3.ex=Math.max(G3.ex,.8)});
onFx('fg',e=>{if(e&&e.good)G3.ex=Math.max(G3.ex,.7)});onFx('tackle',e=>{if(e&&e.big)G3.ex=Math.max(G3.ex,.4)});
function g3Crowd(dt,now){const m=G3.env&&G3.env.crowd;if(!m)return;if(S.celebrate)G3.ex=Math.max(G3.ex,.6);G3.ex=Math.max(0,G3.ex-dt*.22);const u=m.material.uniforms,st=G3.env.stage;
  const sd=G3.env.side;if(sd){const v=sd.material.uniforms;v.uT.value=now/1000;v.uJ.value=G3.ex*.8;v.uL.value=st==='night'?1:st==='sunset'?.9:1;v.uN.value=0}
  u.uT.value=now/1000;u.uJ.value=G3.ex;u.uL.value=st==='night'?.34:st==='sunset'?.8:G3.env.wk!=='dry'?.8:1;u.uN.value=st==='night'?1:st==='sunset'?.4:0}
/* twice a second: the logos (t3Logos re-requests them only when they would change) and the video board, redrawn when the
   score, clock, down or its logos change */
function g3Board(now){const b=G3.env&&G3.env.board;if(!b||now-(b.t||0)<500)return;b.t=now;t3Logos(G3.env);const dd=$('#dd'),k=[S.score[0],S.score[1],S.q,Math.ceil(S.clock),dd?dd.textContent:''].join('|');if(k===b.key)return;b.key=k;t3BoardDraw(b.cv,G3.env.logo);b.tex.needsUpdate=true}
function g3Weather(dt){let k=S.wx==='Rain'?'rain':S.wx==='Snow'?'snow':'';if(typeof stdIndoor==='function'&&stdIndoor())k='';
  if(k!==G3.wxk){if(G3.wx){G3.scene.remove(G3.wx.obj);G3.wx.obj.geometry.dispose();G3.wx.obj.material.dispose();if(G3.wx.tex)G3.wx.tex.dispose()}G3.wx=null;G3.wxk=k;
    if(k){const n=k==='rain'?1700:2200,pos=new Float32Array(n*(k==='rain'?6:3)),G=new THREE.BufferGeometry(),r=t3Rng(3),P0=[];for(let i=0;i<n;i++)P0.push([r(),r()*36,r(),.7+r()*.6,r()*6.28]);G.setAttribute('position',new THREE.BufferAttribute(pos,3));
      let obj,tex=null;if(k==='rain')obj=new THREE.LineSegments(G,new THREE.LineBasicMaterial({color:'#c8d4e6',transparent:true,opacity:.42,depthWrite:false,fog:false}));
      else{const cv=document.createElement('canvas');cv.width=cv.height=32;const g=cv.getContext('2d'),gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.8)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);tex=new THREE.CanvasTexture(cv);
        obj=new THREE.Points(G,new THREE.PointsMaterial({map:tex,size:.3,sizeAttenuation:true,transparent:true,depthWrite:false,color:'#ffffff',fog:false}))}
      obj.frustumCulled=false;obj.renderOrder=6;G3.scene.add(obj);G3.wx={obj,p:P0,n,tex}}}
  const X=G3.wx;if(!X)return;const a=X.obj.geometry.attributes.position.array,cx=G3.cs.x,cz=G3.cs.z,sw=G3.cs.w*1.1+20,wd=S.wind?Math.min(1.4,S.wind.mph/14)*(typeof windX==='function'?windX():0):0,rain=G3.wxk==='rain',t=G3.t;
  for(let i=0;i<X.n;i++){const q=X.p[i];q[1]-=(rain?34:2.2)*q[3]*dt;if(q[1]<0){q[1]+=36;q[0]=Math.random();q[2]=Math.random()}
    const x=cx+(q[0]-.5)*sw+(rain?wd*(36-q[1])*.25:Math.sin(t*.7+q[4])*1.2+wd*(36-q[1])*.5),z=cz-25+q[2]*80,y=q[1];
    if(rain){const j=i*6;a[j]=x;a[j+1]=y;a[j+2]=z;a[j+3]=x+wd*.25;a[j+4]=y-1.25;a[j+5]=z}else{const j=i*3;a[j]=x;a[j+1]=y;a[j+2]=z}}
  if(!rain)X.obj.material.size=.2/Math.tan(G3.cam.fov*Math.PI/360);X.obj.geometry.attributes.position.needsUpdate=true}
/* the chain crew on the far sideline: the down box at the line of scrimmage, the rods at the start of the series and at the
   line to gain (orange markers, the chain between them), three crew in vests; built once, moved every frame */
function g3Chains(){let C=G3.ch;const show=G3.env&&['presnap','live','dead','pat','wait','replay'].includes(S.phase)&&!S.conv&&S.firstDownX<110&&S.phase!=='pat';
  if(!C){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:'#ff6a13',roughness:.5}),pm=new THREE.MeshStandardMaterial({color:'#1b1d22',roughness:.6}),
      vest=new THREE.MeshStandardMaterial({color:'#ff8a1e',roughness:.8}),dark=new THREE.MeshStandardMaterial({color:'#24262b',roughness:.85});
    const rod=()=>{const r=new THREE.Group(),p=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2.6,6),pm);p.position.y=1.3;const t=new THREE.Mesh(new THREE.BoxGeometry(.06,.42,.3),m);t.position.y=2.45;r.add(p,t);return r};
    const man=()=>{const r=new THREE.Group(),b=new THREE.Mesh(new THREE.CylinderGeometry(.17,.15,.75,8),vest),l=new THREE.Mesh(new THREE.CylinderGeometry(.14,.11,.95,8),dark),h=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),dark);
      l.position.y=.48;b.position.y=1.32;h.position.y=1.85;r.add(b,l,h);return r};
    const box=rod();box.children[1].scale.set(1.4,1.3,1.4);const a=rod(),b=rod(),ch=new THREE.Mesh(new THREE.BoxGeometry(1,.03,.03),pm);ch.position.y=.04;
    const crew=[man(),man(),man()];g.add(box,a,b,ch,...crew);for(const o of g.children)o.traverse(x=>{if(x.isMesh)x.receiveShadow=true});
    C=G3.ch={g,box,a,b,ch,crew};G3.scene.add(g)}
  C.g.visible=!!show;if(!show)return;const z=-2.9,x1=S.firstDownX,x0=x1-10,lx=S.los;
  C.box.position.set(lx,0,z);C.a.position.set(x0,0,z);C.b.position.set(x1,0,z);C.ch.position.set((x0+x1)/2,0,z+.05);C.ch.scale.x=10;
  C.crew[0].position.set(lx,0,z-.55);C.crew[1].position.set(x0,0,z-.55);C.crew[2].position.set(x1,0,z-.55)}
/* ---------- the frame ---------- */
function g3EnsureEnv(){const k=t3EnvKey();if(k===G3.key&&G3.env)return;
  const tk=[S.home.id,S.away.id].join('|');if(G3.tkey&&tk!==G3.tkey)g3ResetAth();G3.tkey=tk;
  t3Dispose(G3.env);G3.env=t3Build();G3.scene.add(G3.env.group);G3.key=k;G3.ov.rsig='';}
function g3ResetAth(){if(typeof ath3dReset==='function'){try{ath3dReset()}catch(e){console.warn('ath3dReset',e)}}}
function draw3D(now){
  const t0=performance.now(),c=ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);c.setTransform(DPR,0,0,DPR,0,0);
  if(!g3Init()){if(LG&&LG.settings)applyStyle();return}   // 04 applyStyle: the 2D view, one toast
  if(!S.home||!S.away)return;
  g3ToastSweep();
  if(S.game!==G3.gref){if(G3.gref!==undefined)g3ResetAth();G3.gref=S.game}   // a game ended / a new one began
  if(G3.cv.style.display!=='block')g3Show(true);
  if(++G3.fr%12===1)G3.cover=!!document.querySelector('#app>.screen:not([hidden])');if(G3.cover)return;   // a menu covers the field: no render
  /* the score bug's footprint (top, or bottom when Settings put it there): the TV fit keeps the far row clear of it */
  if(G3.fr%30===1){const sb=$('#sb'),bb=document.documentElement.dataset.bug==='bottom';let t=Math.max(14,SAFE.t||0)+6,bt=0;
    if(sb&&!sb.hidden){const r=sb.getBoundingClientRect();if(r.height>0){if(bb)bt=(H||innerHeight)-r.top+4;else t=Math.max(t,r.bottom+4)}}G3.bugY=t;G3.bugB=bt}
  const dt=Math.min(.1,Math.max(0,(now-(G3.last||now))/1000));G3.last=now;G3.t+=dt;
  g3Size();const rb=G3.key;g3EnsureEnv();const rebuilt=rb!==G3.key;g3Camera(dt);g3Light();g3Crowd(dt,now);g3Board(now);g3Weather(dt);g3KickBall();g3Overlays(now);
  if(typeof ath3dFrame==='function'){if(G3.ph)g3DropPlaceholders();try{ath3dFrame(G3.actors,now,dt)}catch(e){if(!G3.athErr){G3.athErr=1;console.warn('ath3dFrame',e)}}}else g3Placeholders();
  const tj=performance.now();if(!rebuilt)G3.js=G3.js?G3.js*.9+(tj-t0)*.1:tj-t0;
  g3Chains();
  /* first frame of a new stadium / new teams: compile every program now (no hitch at the first flag, kick or weather) */
  const nt=typeof A3!=='undefined'?A3.teams.size:0;if(rebuilt||G3.warm!==nt){G3.warm=nt;if(typeof ath3dWarm==='function')ath3dWarm();try{G3.R.compile(G3.scene,G3.cam)}catch(e){}}
  G3.R.render(G3.scene,G3.cam);
  g3Overlay2D(c,now);g3Adapt(t0);
  const ms=performance.now()-t0;if(!rebuilt)G3.cpu=G3.cpu?G3.cpu*.9+ms*.1:ms;
}
/* no stale toast at the snap: toast() is wrapped (here, so 07 is untouched) to remember the phase it fired in; when a
   presnap begins, a toast still showing from the previous play (BIG HIT!, BROKEN TACKLE!) is taken down */
if(typeof toast==='function'&&!toast.g3){const t0=toast;toast=function(m){G3.tph=S.phase;return t0.apply(this,arguments)};toast.g3=1}
function g3ToastSweep(){const ph=S.phase;if(ph==='presnap'&&G3.lph!=='presnap'&&G3.tph!=='presnap'){const t=$('#toast');if(t&&t.classList.contains('show'))t.classList.remove('show')}G3.lph=ph}
/* the 2D layer over the 3D picture: receiver badges and the sling pull (06c arcDraw), your man's marker, the aim
   distance, the stick, the kick meter, the slow-motion letterbox */
function g3Overlay2D(c,now){
  const s=scE();
  if(G3.aimTxt){const p=fieldToScreen(G3.aimTxt.x,G3.aimTxt.y,0);c.save();c.font='800 14px "Big Shoulders Display",'+FFONT;c.textAlign='center';c.textBaseline='bottom';c.fillStyle='#fff';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=5;c.fillText(G3.aimTxt.t,p[0],p[1]-16);c.restore()}
  const me=G3.ov.ring.visible?G3.ov.ring.position:null;if(me&&S.phase!=='kick'){const p=fieldToScreen(me.x,me.z,2.55),b=Math.sin(now/180)*3,x=p[0],y=p[1]-10+b;c.save();c.beginPath();c.moveTo(x,y);c.lineTo(x-8,y-11);c.lineTo(x+8,y-11);c.closePath();c.fillStyle='#FFD23F';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1.5;c.stroke();c.fill();c.restore()}
  if(typeof arcDraw==='function'&&S.phase==='live')arcDraw(c,s,now);
  if(S.phase==='live'||S.phase==='presnap')drawStick(c);
  g3KickUI(c,now);
  if(G3.env&&(G3.env.stage==='night'||G3.env.stage==='sunset')&&S.phase!=='kick'){const g=G3.vig&&G3.vig.w===W&&G3.vig.h===H&&G3.vig.st===G3.env.stage?G3.vig.g:null;let gr=g;
    if(!gr){gr=c.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.hypot(W,H)*.62);gr.addColorStop(0,'rgba(0,0,8,0)');gr.addColorStop(.55,G3.env.stage==='night'?'rgba(0,2,12,.12)':'rgba(30,10,0,.05)');gr.addColorStop(1,G3.env.stage==='night'?'rgba(0,2,12,.8)':'rgba(30,10,0,.3)');G3.vig={w:W,h:H,st:G3.env.stage,g:gr}}
    c.fillStyle=gr;c.fillRect(0,0,W,H)}
  if(S.ts<.9){const a=(1-S.ts)*.9,bh=H*.07;c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(0,0,W,bh);c.fillRect(0,H-bh,W,bh)}
}
/* adaptive resolution: the real frame interval (smoothed) steps the pixel ratio down when frames run long and back up
   with steady headroom; never above the device ratio (cap 2), never below 1. Pauses and tab switches are ignored. */
function g3Adapt(t0){const A=G3.ad||(G3.ad={pt:0,ema:16,t:0,hi:Math.min(window.devicePixelRatio||1,2),px:0});if(!A.px)A.px=G3.R.getPixelRatio();
  const d=A.pt?t0-A.pt:0;A.pt=t0;if(!(d>0&&d<250))return;A.ema+=(d-A.ema)*.06;A.t+=d;
  const lo=Math.min(1,A.hi);let nx=A.px;if(A.t>1500&&A.ema>22&&A.px>lo)nx=Math.max(lo,A.px-.25);else if(A.t>4000&&A.ema<13.5&&A.px<A.hi)nx=Math.min(A.hi,A.px+.25);
  if(nx!==A.px){A.px=nx;A.t=0;G3.R.setPixelRatio(nx);G3.R.setSize(G3.w,G3.h,true)}else if(A.t>4000)A.t=0}
/* frame-cost readout for QA / Settings: CPU ms per frame (smoothed), draw calls and triangles of the last frame */
function g3Stats(){const i=G3.R?G3.R.info.render:{calls:0,triangles:0};return {cpu:+(G3.cpu||0).toFixed(2),js:+(G3.js||0).toFixed(2),calls:i.calls,tris:i.triangles,crowd:G3.env&&G3.env.crowd?G3.env.crowd.userData.count:0,px:G3.R?G3.R.getPixelRatio():0}}

/* stadium reflection for glossy helmets, one per light stage: sky, the ring of stands, the turf and the light banks
   (blazing at night), prefiltered once each (PMREM). Only the helmet materials use it, so the tuned lighting is unchanged. */
function g3EnvTex(st){
  st=st||(G3.env?G3.env.stage:'day');const T=G3.envTx||(G3.envTx={});if(st in T)return T[st];
  T[st]=null;if(!G3.R)return null;
  try{
    const N=st==='night',D=st==='sunset',sc=new THREE.Scene(),g=new THREE.SphereGeometry(50,48,24),n=g.attributes.position.count,col=new Float32Array(n*3),
      top=new THREE.Color(N?'#020308':D?'#3a4a7a':'#78aee8'),hor=new THREE.Color(N?'#0b1120':D?'#f2a262':'#e6eef7'),std=new THREE.Color(N?'#1b1e27':D?'#4a3c38':'#59606b'),gr=new THREE.Color(N?'#2c5426':'#2f5c2b'),c=new THREE.Color();
    for(let i=0;i<n;i++){const y=g.attributes.position.getY(i)/50,x=g.attributes.position.getX(i)/50;
      if(y>.3)c.copy(hor).lerp(top,Math.min(1,(y-.3)*1.9));else if(y>.03){c.copy(std);if(((Math.atan2(x,g.attributes.position.getZ(i)/50)*9+y*40)|0)%3===0)c.multiplyScalar(1.25);if(y>.26)c.lerp(hor,(y-.26)/.04)}else c.copy(gr).multiplyScalar(N?.8:1);
      col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
    g.setAttribute('color',new THREE.BufferAttribute(col,3));
    sc.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    const k=N?20:D?8:5,lm=new THREE.MeshBasicMaterial({color:new THREE.Color(k,k,k*.96)}),bg=new THREE.BoxGeometry(12,4.5,1),nb=N?6:4;
    for(let j=0;j<nb;j++){const b=new THREE.Mesh(bg,lm),a=j/nb*Math.PI*2+.4;b.position.set(Math.cos(a)*40,N?24:28,Math.sin(a)*40);b.lookAt(0,0,0);sc.add(b)}
    const pm=new THREE.PMREMGenerator(G3.R);T[st]=pm.fromScene(sc,.025).texture;pm.dispose();g.dispose();bg.dispose();lm.dispose();
  }catch(e){console.warn('g3EnvTex',e);T[st]=null}
  return T[st];
}
