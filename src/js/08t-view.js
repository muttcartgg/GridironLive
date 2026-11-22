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
    G3.actors=new THREE.Group();G3.actors.name='actors';sc.add(G3.actors);
    G3.ov=g3MakeOverlays();sc.add(G3.ov.group);
    if(document.fonts&&document.fonts.load)Promise.all([document.fonts.load('700 80px "Barlow Condensed"'),document.fonts.load('italic 800 80px "Barlow Condensed"')]).then(()=>{G3.fontOk=true}).catch(()=>{G3.fontOk=true});else G3.fontOk=true;
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
    const ny=bb-Math.min(1,k.need)*bh;c.strokeStyle='#FFD23F';c.lineWidth=3;c.beginPath();c.moveTo(bx-21,ny);c.lineTo(bx+21,ny);c.stroke();c.fillStyle='#fff';c.font='800 13px "Barlow Condensed",'+FFONT;c.textAlign='right';c.textBaseline='middle';c.fillText('NEEDED',bx-24,ny);
    c.textAlign='center';c.fillText('POWER',bx,bb+16)}
  if(k.stage==='flight'&&k.flight>=1){c.font='italic 800 54px "Barlow Condensed",'+FFONT;c.textAlign='center';c.textBaseline='middle';c.lineWidth=6;c.strokeStyle='rgba(0,0,0,.55)';const tx=k.good?'GOOD!':k.blocked?'BLOCKED':'NO GOOD';c.strokeText(tx,W/2,H*.3);c.fillStyle=k.good?'#3BD98A':'#FF4D5E';c.fillText(tx,W/2,H*.3)}
  if(S.wx==='Wind'||k.drift){c.fillStyle='#fff';c.font='800 15px "Barlow Condensed",'+FFONT;c.textAlign='left';c.textBaseline='top';c.fillText(`WIND ${k.drift<0?'◀':'▶'}`,Math.max(14,SAFE.l+10),Math.max(topY,60))}
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
function g3Camera(dt){
  const port=G3.h>G3.w*1.2,mode=g3CamMode(),cs=G3.cs;let cut=false;
  if(mode!==G3.mode){if(G3.mode&&(mode==='cine'||G3.mode==='cine'||mode==='kick'||G3.mode==='kick'))S.cutA=Math.max(S.cutA||0,.8);cut=true;G3.mode=mode}
  if((S.cutN||0)!==G3.cutN){G3.cutN=S.cutN||0;cut=true}
  if(mode==='kick'){const [x0,y0]=g3KickSpot(),c=G3.cam,k=kick||G3.lastKick,fl=!k||k.stage==='flight'?Math.min(1,k?k.flight:1):0;c.position.set(x0-13.5,5.6+fl*1.5,y0+(CEN-y0)*.25);
    const lx=lerp(120,Math.max(ball.x,x0+20),fl*.25),ly=lerp(2.4,Math.min(9,ball.z||4),fl*.35);c.lookAt(lx,ly,CEN+(y0-CEN)*.15);c.fov=port?50:28;c.aspect=G3.w/G3.h;c.updateProjectionMatrix();cs.x=x0+20;cs.z=CEN;return}
  if(mode==='cine'){const h=S.celebrate||(play&&play.carrier)||null,bx=h?h.x:ball.x,by=h?h.y:ball.y;
    if(cut||cs.cx==null){cs.cx=bx;cs.cz=by;cs.ca=-.55}g3Damp(cs,'cx',bx,.35,dt);g3Damp(cs,'cz',by,.35,dt);cs.ca+=dt*.12;
    const r=port?16:15,c=G3.cam;c.position.set(cs.cx+Math.sin(cs.ca)*r,3.3,cs.cz+Math.cos(cs.ca)*r);c.lookAt(cs.cx,1.2,cs.cz);c.fov=port?44:28;c.aspect=G3.w/G3.h;c.updateProjectionMatrix();cs.x=cs.cx;cs.z=cs.cz;return}
  /* TV + special teams: what the shot follows (fx, fz), how wide it is (w), smoothing (st) */
  let w=port?26:40,fx=S.los+w*.12,fz=lerp(CEN,S.ballY,.45),st=.55,wst=.9,pitch=port?25:17.5,dist=port?80:88;
  const live=(S.phase==='live'||S.phase==='dead'||S.phase==='replay')&&play;
  if(mode==='st'){w=port?40:62;pitch+=5;dist+=8;const t=ball.state==='air'?null:play.carrier;if(t){fx=t.x+clamp((t.vx||0)*.6,-6,6);fz=lerp(CEN,t.y,.5)}else{fx=lerp(ball.x,ball.tx||ball.x,.35);fz=lerp(CEN,ball.y,.4)}st=.45}
  else if(live){const h=play.carrier||Q;
    if(ball.state==='air'&&!ball.pitch){const far=hyp((ball.tx||0)-(ball.fx||0),(ball.ty||0)-(ball.fy||0));fx=lerp(ball.x,ball.tx,.5);fz=lerp(CEN,lerp(ball.y,ball.ty,.5),.85);w=clamp(far+(port?6:18),port?28:44,port?44:66);st=.4;wst=.7}
    else if(aim&&Q){const d=hyp(aim.x-Q.x,aim.y-Q.y);fx=lerp(Q.x,aim.x,.5);fz=lerp(CEN,lerp(Q.y,aim.y,.5),.9);w=clamp(d*(port?.75:1.05)+(port?16:18),port?28:44,port?48:66);st=.3;wst=.4}
    else if(h){if(play.type==='pass'&&!play.thrown&&!play.scramble&&h===Q){w=port?30:48;fx=Q.x+w*.24;fz=lerp(CEN,Q.y,.4)}
      else{fx=h.x+clamp((h.vx||0)*.5,-4,7);fz=lerp(CEN,h.y,.6);w=port?26:(Math.abs(h.vx||0)>6&&Math.abs(h.x-S.los)>14?46:40);st=.34}}
    if(S.phase==='dead'){fx=cs.x;fz=cs.z;w=cs.w}}
  else if(S.phase==='presnap'||S.phase==='pat'||S.phase==='wait'){fx=S.los+w*(port?.05:.12);fz=lerp(CEN,S.ballY,.45)}
  fx=clamp(fx,-6+w*.4,126-w*.4);fz=clamp(fz,port?18:14,port?36:40);
  if(cut){cs.x=fx;cs.z=fz;cs.w=w;cs.xv=cs.zv=cs.wv=0}else{g3Damp(cs,'x',fx,st,dt);g3Damp(cs,'z',fz,st*1.3,dt);g3Damp(cs,'w',w,wst,dt)}
  /* keep the ball inside the frame when the spring lags */
  if(live&&S.phase!=='dead'){const b=ball.state==='air'?ball:(play.carrier||Q);if(b){const hw=cs.w*.42;let o=b.x<cs.x-hw?b.x+hw-cs.x:b.x>cs.x+hw?b.x-hw-cs.x:0;if(o){cs.x+=o*Math.min(1,dt*9);cs.xv=0}}}
  g3Rig(cs.x,cs.z-(port?1:3),cs.w,pitch,dist,0);
}
/* ---------- light, shadows, sky, crowd, video board, weather ---------- */
const G3L={day:{h:['#c6dcff','#3d5a2c',1.15],s:['#fff3df',2.7],el:56,dx:-.55,dz:-.83,ex:1},late:{h:['#d8d2c4','#3d5130',1.0],s:['#ffd9a8',2.4],el:34,dx:-.88,dz:-.47,ex:1},
  sunset:{h:['#c08a7a','#2f3a22',.85],s:['#ff9a55',2.1],el:13,dx:-.97,dz:-.24,ex:1.02},night:{h:['#4a5878','#141c12',.38],s:['#f1f5ff',2.7],el:64,dx:-.25,dz:.55,ex:1.06}};
function g3Light(){const st=G3.env?G3.env.stage:'day',L=G3L[st]||G3L.day,wk=G3.env?G3.env.wk:'dry',dim=wk!=='dry'&&st!=='night'?.62:1,hm=wk!=='dry'?1.2:1;
  G3.hemi.color.set(L.h[0]);G3.hemi.groundColor.set(L.h[1]);G3.hemi.intensity=L.h[2]*hm;G3.sun.color.set(L.s[0]);G3.sun.intensity=L.s[1]*dim;G3.R.toneMappingExposure=L.ex;
  const e=L.el*Math.PI/180,tx=Math.round(G3.cs.x/.04)*.04,tz=Math.round(G3.cs.z/.04)*.04;G3.sun.target.position.set(tx,0,tz);G3.sun.position.set(tx+L.dx*Math.cos(e)*160,Math.sin(e)*160,tz+L.dz*Math.cos(e)*160);G3.sun.target.updateMatrixWorld();
  if(!G3.fogK||G3.fogK!==st+wk){G3.fogK=st+wk;const c=(SKY3[st]||SKY3.day)[1];G3.scene.fog=st==='night'?new THREE.Fog('#05070d',110,520):new THREE.Fog(wk==='dry'?c:'#8a929c',wk==='dry'?260:150,wk==='dry'?1500:700)}}
onFx('td',()=>{G3.ex=1});onFx('roar',()=>{G3.ex=Math.max(G3.ex,.75)});onFx('turnover',()=>{G3.ex=Math.max(G3.ex,.85)});onFx('safety',()=>{G3.ex=Math.max(G3.ex,.8)});
onFx('fg',e=>{if(e&&e.good)G3.ex=Math.max(G3.ex,.7)});onFx('tackle',e=>{if(e&&e.big)G3.ex=Math.max(G3.ex,.4)});
function g3Crowd(dt,now){const m=G3.env&&G3.env.crowd;if(!m)return;if(S.celebrate)G3.ex=Math.max(G3.ex,.6);G3.ex=Math.max(0,G3.ex-dt*.22);const u=m.material.uniforms,st=G3.env.stage;
  u.uT.value=now/1000;u.uJ.value=G3.ex;u.uL.value=st==='night'?.5:st==='sunset'?.78:G3.env.wk!=='dry'?.8:1}
function g3Board(now){const b=G3.env&&G3.env.board;if(!b||now-(b.t||0)<500)return;b.t=now;const dd=$('#dd'),k=[S.score[0],S.score[1],S.q,Math.ceil(S.clock),dd?dd.textContent:''].join('|');if(k===b.key)return;b.key=k;t3BoardDraw(b.cv);b.tex.needsUpdate=true}
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
/* ---------- the frame ---------- */
function g3EnsureEnv(){const k=t3EnvKey();if(k===G3.key&&G3.env)return;
  const tk=[S.home.id,S.away.id].join('|');if(G3.tkey&&tk!==G3.tkey)g3ResetAth();G3.tkey=tk;
  t3Dispose(G3.env);G3.env=t3Build();G3.scene.add(G3.env.group);G3.key=k;G3.ov.rsig='';}
function g3ResetAth(){if(typeof ath3dReset==='function'){try{ath3dReset()}catch(e){console.warn('ath3dReset',e)}}}
function draw3D(now){
  const t0=performance.now(),c=ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);c.setTransform(DPR,0,0,DPR,0,0);
  if(!g3Init()){if(LG&&LG.settings)applyStyle();return}   // 04 applyStyle: the 2D view, one toast
  if(!S.home||!S.away)return;
  if(S.game!==G3.gref){if(G3.gref!==undefined)g3ResetAth();G3.gref=S.game}   // a game ended / a new one began
  if(G3.cv.style.display!=='block')g3Show(true);
  if(++G3.fr%12===1)G3.cover=!!document.querySelector('#app>.screen:not([hidden])');if(G3.cover)return;   // a menu covers the field: no render
  const dt=Math.min(.1,Math.max(0,(now-(G3.last||now))/1000));G3.last=now;G3.t+=dt;
  g3Size();const rb=G3.key;g3EnsureEnv();const rebuilt=rb!==G3.key;g3Camera(dt);g3Light();g3Crowd(dt,now);g3Board(now);g3Weather(dt);g3KickBall();g3Overlays(now);
  if(typeof ath3dFrame==='function'){if(G3.ph)g3DropPlaceholders();try{ath3dFrame(G3.actors,now,dt)}catch(e){if(!G3.athErr){G3.athErr=1;console.warn('ath3dFrame',e)}}}else g3Placeholders();
  const tj=performance.now();if(!rebuilt)G3.js=G3.js?G3.js*.9+(tj-t0)*.1:tj-t0;
  G3.R.render(G3.scene,G3.cam);
  g3Overlay2D(c,now);
  const ms=performance.now()-t0;if(!rebuilt)G3.cpu=G3.cpu?G3.cpu*.9+ms*.1:ms;
}
/* the 2D layer over the 3D picture: receiver badges and the sling pull (06c arcDraw), your man's marker, the aim
   distance, the stick, the kick meter, the slow-motion letterbox */
function g3Overlay2D(c,now){
  const s=scE();
  if(G3.aimTxt){const p=fieldToScreen(G3.aimTxt.x,G3.aimTxt.y,0);c.save();c.font='800 14px "Barlow Condensed",'+FFONT;c.textAlign='center';c.textBaseline='bottom';c.fillStyle='#fff';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=5;c.fillText(G3.aimTxt.t,p[0],p[1]-16);c.restore()}
  const me=G3.ov.ring.visible?G3.ov.ring.position:null;if(me&&S.phase!=='kick'){const p=fieldToScreen(me.x,me.z,2.55),b=Math.sin(now/180)*3,x=p[0],y=p[1]-10+b;c.save();c.beginPath();c.moveTo(x,y);c.lineTo(x-8,y-11);c.lineTo(x+8,y-11);c.closePath();c.fillStyle='#FFD23F';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1.5;c.stroke();c.fill();c.restore()}
  if(typeof arcDraw==='function'&&S.phase==='live')arcDraw(c,s,now);
  if(S.phase==='live'||S.phase==='presnap')drawStick(c);
  g3KickUI(c,now);
  if(G3.env&&(G3.env.stage==='night'||G3.env.stage==='sunset')&&S.phase!=='kick'){const g=G3.vig&&G3.vig.w===W&&G3.vig.h===H&&G3.vig.st===G3.env.stage?G3.vig.g:null;let gr=g;
    if(!gr){gr=c.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.hypot(W,H)*.62);gr.addColorStop(0,'rgba(0,0,8,0)');gr.addColorStop(1,G3.env.stage==='night'?'rgba(0,2,10,.5)':'rgba(20,6,0,.28)');G3.vig={w:W,h:H,st:G3.env.stage,g:gr}}
    c.fillStyle=gr;c.fillRect(0,0,W,H)}
  if(S.ts<.9){const a=(1-S.ts)*.9,bh=H*.07;c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(0,0,W,bh);c.fillRect(0,H-bh,W,bh)}
}
/* frame-cost readout for QA / Settings: CPU ms per frame (smoothed), draw calls and triangles of the last frame */
function g3Stats(){const i=G3.R?G3.R.info.render:{calls:0,triangles:0};return {cpu:+(G3.cpu||0).toFixed(2),js:+(G3.js||0).toFixed(2),calls:i.calls,tris:i.triangles,crowd:G3.env&&G3.env.crowd?G3.env.crowd.userData.count:0,px:G3.R?G3.R.getPixelRatio():0}}

/* soft stadium reflection for glossy helmets: a sky/turf gradient with four light banks, prefiltered once (PMREM).
   Only the helmet materials use it, so the scene's tuned lighting is unchanged. Shared, never disposed. */
function g3EnvTex(){
  if(G3.envTex!==undefined)return G3.envTex;
  G3.envTex=null;if(!G3.R)return null;
  try{
    const sc=new THREE.Scene(),g=new THREE.SphereGeometry(50,24,12),n=g.attributes.position.count,col=new Float32Array(n*3),
      top=new THREE.Color('#9fc3ee'),hor=new THREE.Color('#e9eef5'),gr=new THREE.Color('#2e5a2a'),c=new THREE.Color();
    for(let i=0;i<n;i++){const y=g.attributes.position.getY(i)/50;if(y>0)c.copy(hor).lerp(top,Math.min(1,y*1.6));else c.copy(hor).lerp(gr,Math.min(1,-y*4));col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
    g.setAttribute('color',new THREE.BufferAttribute(col,3));
    sc.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    const lm=new THREE.MeshBasicMaterial({color:new THREE.Color(6,6,6)}),bg=new THREE.BoxGeometry(14,5,1);
    for(let k=0;k<4;k++){const b=new THREE.Mesh(bg,lm),a=k/4*Math.PI*2+.4;b.position.set(Math.cos(a)*40,26,Math.sin(a)*40);b.lookAt(0,0,0);sc.add(b)}
    const pm=new THREE.PMREMGenerator(G3.R);G3.envTex=pm.fromScene(sc,.03).texture;pm.dispose();g.dispose();bg.dispose();
  }catch(e){console.warn('g3EnvTex',e);G3.envTex=null}
  return G3.envTex;
}
