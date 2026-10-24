/* =========================================================
   08e · Officials (modern style): a 7-person crew in stripes that works the play like a real crew
   R referee (white cap) behind the offensive backfield · U umpire behind the defensive front ·
   HL head linesman (near sideline) and LJ line judge (far sideline) on the line of scrimmage ·
   SJ side judge (near) and FJ field judge (far) ~18 yd deep, on the goal line inside the 20 ·
   BJ back judge ~25 yd deep in the middle (end line in goal-to-go).
   offiFrame(now) moves them (once per frame, from prepPlayers in 08d) and returns the list that is depth-sorted
   with the players; drawAthlete hands them to drawOfficial, which reuses the 08d rig.
   Signals come from the play result (touchdown: both arms up · incomplete: arms waving · first down: point
   toward the offense's direction of attack · spotting the ball) and fx events (01b): flag (a yellow flag is
   tossed in an arc toward the foul and stays until the next snap), firstDown, snap.
   ========================================================= */
const OFFI={list:null,t:0,poss:'',flag:null,fd:0,fdWing:'HL',incPlay:null};
const OFFI_KIT={shirt:'#F2F3F5',shirtD:'#C3C7CE',stripe:'#15171B',pants:'#ECEEF2',pantsD:'#BFC3CA',sock:'#15171B'};
const OFFI_ST=[-.52,.04,.6];
function offiMake(){OFFI.list=['R','U','HL','LJ','SJ','FJ','BJ'].map((r,i)=>({ref:r,id:i,x:S.los,y:CEN,vx:0,vy:0,z:0,phase:i*1.7,face:1,fallP:0,tx:S.los,ty:CEN,sig:'',sigEnd:0,sigT0:0,_bh:.97,_bw:.9,tone:(i*3+1)%4,_inc:false}));OFFI.poss=''}
function offiHome(o){const L=S.los,b=S.ballY,dp=Math.min(L+18,110);
  switch(o.ref){case 'R':o.tx=Math.max(-3,L-12.5);o.ty=clamp(b+5.5,2,FW-2);break;case 'U':o.tx=Math.min(L+7.5,119);o.ty=clamp(b-1.6,2,FW-2);break;
    case 'HL':o.tx=L+1;o.ty=FW+.6;break;case 'LJ':o.tx=L+1;o.ty=-.6;break;
    case 'SJ':o.tx=dp;o.ty=FW-1.6;break;case 'FJ':o.tx=dp;o.ty=1.6;break;case 'BJ':o.tx=Math.min(L+25,119.5);o.ty=clamp(b,9,FW-9);break}}
function offiLive(o){const L=S.los,bx=ball.x,by=ball.y,air=ball.state==='air',run=!air&&bx>L+.8;let deep=L;for(const p of OFF)if(p.x>deep)deep=p.x;
  switch(o.ref){
    case 'R':o.tx=run?bx-8:Math.min(L-10,(Q?Q.x:L)-6);o.ty=clamp(by+5.5,1,FW-1);break;
    case 'U':o.tx=run?Math.max(L+4,bx-3.5):L+7.5;o.ty=clamp(run?by-3.2:S.ballY-1.6,1,FW-1);break;
    case 'HL':case 'LJ':o.tx=run?Math.max(L+1,bx-.5):air?Math.max(L+1,Math.min(ball.tx,L+6)):L+1;o.ty=o.ref==='HL'?FW+.6:-.6;break;
    default:{const bj=o.ref==='BJ',base=o.ref==='SJ'?FW-1.6:o.ref==='FJ'?1.6:clamp(S.ballY,9,FW-9),home=bj?Math.min(L+25,119.5):Math.min(L+18,110);
      o.tx=Math.min(119.5,Math.max(home,deep+(bj?7:5),air?ball.tx+4:run?bx+5:0));o.ty=lerp(base,air?ball.ty:by,bj?.45:.22)}}}
function offiSig(o,m,now,ms){if(o.sig!==m){o.sig=m;o.sigT0=now}o.sigEnd=now+ms}
function offiDead(o,r,t,now){
  const inc=r.kind==='inc',sx=inc?S.los:r.x,sy=inc?S.ballY:r.y,wing=sy>CEN?'HL':'LJ',k=r.kind;
  if(inc){o.tx=o.x;o.ty=o.y}
  else switch(o.ref){
    case 'R':o.tx=sx-7;o.ty=clamp(sy+4,1,FW-1);break;case 'U':o.tx=sx+1.4;o.ty=clamp(sy-1.8,.5,FW-.5);break;
    case 'HL':o.tx=sx;o.ty=o.ref===wing?Math.max(sy+1.4,FW-6):FW+.6;break;
    case 'LJ':o.tx=sx;o.ty=o.ref===wing?Math.min(sy-1.4,6):-.6;break;
    default:o.tx=Math.min(119.5,Math.max(sx+5,o.x-.5));o.ty=lerp(o.y,sy,.02)}
  if(k==='td'){if((Math.abs(o.x-110)<16||o.ref==='R')&&t>.15)offiSig(o,'up',now,300)}
  else if(inc){if(o._inc&&t>.12&&t<1.5)offiSig(o,'wave',now,250)}
  else if((k==='tackle'||k==='oob')&&!S.conv&&r.x>=S.firstDownX){if((o.ref===wing&&t>.45)||(o.ref==='R'&&t>.8))offiSig(o,'fwd',now,300)}
  else if(o.ref===wing&&t>.35&&(k==='tackle'||k==='oob'||k==='sack'||k==='fum'))offiSig(o,'spot',now,300);
}
function offiFrame(now){
  if(!OFFI.list)offiMake();const L=OFFI.list;
  let dt=OFFI.t?(now-OFFI.t)/1000:0;OFFI.t=now;if(S.photo||S.paused)dt=0;dt=Math.min(dt,.05);
  const ph=S.phase,dead=ph==='dead'&&play&&play.result,live=(ph==='live'||ph==='replay')&&play;
  const jump=OFFI.poss!==S.poss;OFFI.poss=S.poss;
  if(dead&&play.result.kind==='inc'&&OFFI.incPlay!==play){OFFI.incPlay=play;const tx=ball.tx!=null?ball.tx:S.los,ty=ball.ty!=null?ball.ty:S.ballY;
    const by=L.map(o=>[Math.hypot(o.x-tx,o.y-ty),o]).sort((a,b)=>a[0]-b[0]);for(const o of L)o._inc=false;by[0][1]._inc=true;by[1][1]._inc=true}
  const t=dead?(now-ATH.deadAt)/1000:0;
  for(const o of L){if(dead)offiDead(o,play.result,t,now);else if(live)offiLive(o);else offiHome(o)}
  if(!dead&&now<OFFI.fd)for(const o of L)if(o.ref===OFFI.fdWing)offiSig(o,'fwd',now,200);
  for(const o of L){
    if(jump||Math.abs(o.tx-o.x)>28){o.x=o.tx;o.y=o.ty;o.vx=o.vy=0;continue}
    if(!dt)continue;
    const dx=o.tx-o.x,dy=o.ty-o.y,d=Math.hypot(dx,dy),v=d<.15?0:Math.min(7.2,d*1.9+.6),k=Math.min(1,dt*7);
    o.vx+=((d>1e-3?dx/d*v:0)-o.vx)*k;o.vy+=((d>1e-3?dy/d*v:0)-o.vy)*k;o.x+=o.vx*dt;o.y+=o.vy*dt;
    /* keep clear of the players and of each other */
    for(const p of P){const ex=o.x-p.x,ey=o.y-p.y,dd=ex*ex+ey*ey;if(dd<1.8){const q=Math.sqrt(dd),m=1.34-q;if(q>.01){o.x+=ex/q*m;o.y+=ey/q*m}else o.y+=m}}
    for(const b of L){if(b===o)continue;const ex=o.x-b.x,ey=o.y-b.y,dd=ex*ex+ey*ey;if(dd<1.4){const q=Math.sqrt(dd)||.01,m=(1.18-q)*.5;o.x+=ex/q*m;o.y+=ey/q*m}}
    o.phase+=Math.hypot(o.vx,o.vy)*dt*1.85;
  }
  for(const o of L){const sp=Math.hypot(o.vx,o.vy);
    if(o.sig==='fwd'&&now<o.sigEnd)o.face=1;
    else if(sp>2.2&&Math.abs(o.vx)>1.2)o.face=((ball.x-o.x)*o.vx>=0||sp>5.5)?(o.vx>0?1:-1):(ball.x>o.x?1:-1);
    else if(Math.abs(ball.x-o.x)>.8)o.face=ball.x>o.x?1:-1}
  const f=OFFI.flag;if(f&&f.t<f.T)f.t+=dt;
  return L;
}
function offiPose(o,now){const A=ATP,sp=Math.hypot(o.vx,o.vy),run=clamp(sp/7.5,0,1);
  A.ph=o.phase;A.run=run;A.rot=0;A.kx=o.face;A.carry=0;A.u=0;A.ball='';
  if(sp>.45){A.legs=o.vx*o.face<-.4?'back':'run';A.st=.05+.22*run;A.lean=.05+.2*run;A.cr=.04+.05*run;A.aN=A.aF='swing'}
  else{A.legs='stand';A.st=0;A.lean=.03;A.cr=.03;A.aN=A.aF='hang';if(S.phase==='presnap'&&(o.ref==='HL'||o.ref==='LJ'||o.ref==='U')){A.legs='gun';A.cr=.25;A.lean=.32;A.aN=A.aF='knees'}}
  if(o.sig&&now<o.sigEnd){const m=o.sig;A.u=clamp((now-o.sigT0)/420,0,1);
    if(m==='up'||m==='wave')A.aN=A.aF=m;else if(m==='fwd'){A.kx=1;A.aN='fwd';A.aF='hang'}else A.aN=m}}
function drawOfficial(c,o,now){
  const s=scE(),sx=X(o.x),sy=Y(o.y),hh=s*2.75*o._bh,bw=o._bw;if(sx<-hh||sx>W+hh||sy<-hh*.3||sy>H+hh*2)return;
  offiPose(o,now);athRig(hh,bw);athXf(c,sx,sy,ATP.kx,0);
  const K=OFFI_KIT,J=ATJ,sk=ATH.sk[o.tone]||ATH.sk[1],ln=ATP.lean,nx=Math.cos(ln),ny=Math.sin(ln),hw=hh*.085*bw,cw=hh*.1*bw;
  athLegP(c,0,hh,bw*.85,K.pantsD,K.sock,'',false,false);
  athArmP(c,0,hh,bw*.85,K.shirtD,sk[1],sk[1],sk[1]);
  athTorso(c,hh,bw*.88,K.shirt,'',K.shirtD);
  c.strokeStyle=K.stripe;c.lineWidth=Math.max(1,hh*.03);c.beginPath();
  for(const f of OFFI_ST){c.moveTo(J.hx+nx*hw*f,J.hy+ny*hw*f);c.lineTo(J.sx+nx*cw*f,J.sy+ny*cw*f)}c.stroke();
  athSeg(c,J.hx-nx*hw,J.hy-ny*hw,J.hx+nx*hw,J.hy+ny*hw,hh*.1,K.pants);
  {const bx=J.hx+ny*hh*.05,by=J.hy-nx*hh*.05;athSeg(c,bx-nx*hw,by-ny*hw,bx+nx*hw,by+ny*hw,Math.max(1,hh*.026),K.stripe)}
  athLegP(c,1,hh,bw*.85,K.pants,K.sock,'',false,false);
  const r=hh*.112,x=J.nx,y=J.ny+hh*.01,cap=o.ref==='R'?'#F4F5F7':'#121417';
  c.fillStyle=sk[0];c.beginPath();c.arc(x,y,r*.92,0,TAU2);c.fill();
  c.fillStyle=cap;c.beginPath();c.arc(x,y-r*.08,r*.96,Math.PI,TAU2);c.closePath();c.fill();
  athSeg(c,x+r*.2,y-r*.1,x+r*1.3,y-r*.02,r*.24,cap);
  if(o.ref==='R'){c.strokeStyle='#15171B';c.lineWidth=Math.max(.7,r*.12);c.beginPath();c.arc(x,y-r*.08,r*.96,Math.PI*1.05,Math.PI*1.95);c.stroke()}
  athArmP(c,1,hh,bw*.85,K.shirt,sk[0],sk[0],sk[0]);
  athReset(c);
}
/* penalty flag: tossed toward the foul, then left lying on the turf until the next snap */
function offiFlagDraw(c,now){const f=OFFI.flag;if(!f||f.t<0)return;const s=scE(),q=clamp(f.t/f.T,0,1);
  const x=lerp(f.x0,f.x1,q),y=lerp(f.y0,f.y1,q),z=q<1?(1-q)*2.1+q*(1-q)*6.4:0,px=X(x),py=Y(y)-z*s*.9;if(px<-30||px>W+30)return;
  if(q<1){const a=f.rot+now/80;c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.ellipse(X(x),Y(y),s*.2,s*.08,0,0,TAU2);c.fill();
    c.translate(px,py);c.rotate(a);c.fillStyle='#FFD21F';c.fillRect(-s*.22,-s*.13,s*.44,s*.26);c.fillStyle='#D9A400';c.fillRect(-s*.22,-s*.13,s*.11,s*.26);c.rotate(-a);c.translate(-px,-py)}
  else{c.fillStyle='#FFD21F';c.beginPath();c.ellipse(px,py,s*.32,s*.13,.3,0,TAU2);c.fill();c.fillStyle='#D9A400';c.beginPath();c.arc(px-s*.2,py-s*.03,s*.08,0,TAU2);c.fill()}}
onFx('flag',e=>{if(!OFFI.list||!S.home)return;const fx0=e&&e.x!=null?e.x:ball.x,fy0=e&&e.y!=null?e.y:ball.y;let b=null,bd=1e9;
  for(const o of OFFI.list){const d=Math.hypot(o.x-fx0,o.y-fy0);if(d<bd){bd=d;b=o}}if(!b)return;const now=performance.now();offiSig(b,'flagT',now,450);
  OFFI.flag={x0:b.x+b.face*.3,y0:b.y,x1:clamp(fx0+R(-1.2,1.2),.5,119.5),y1:clamp(fy0+R(-1.5,1.5),.5,FW-.5),t:-.1,T:.62,rot:R(0,6)}});
onFx('snap',()=>{OFFI.flag=null;OFFI.fd=0});
onFx('firstDown',()=>{OFFI.fd=performance.now()+1500;OFFI.fdWing=S.ballY>CEN?'HL':'LJ'});

/* settings: referees on/off */
SETTINGS_EXTRA.push({card:'Graphics',key:'officials',label:'Referees on the field',opts:[[1,'On'],[0,'Off']],bool:true,def:true});
