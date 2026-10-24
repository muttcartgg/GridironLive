/* =========================================================
   08d · Players (modern HD style): procedural 2.5D athletes and the football
   drawAthlete(c,p,now) draws one on-field player at its feet (officials, p.ref, go to drawOfficial in 08e);
   drawFootball(c,x,y,r,ang,spin) draws the ball (nose follows the arc and wobbles on bad throws in flight).
   prepPlayers(c,list,now) runs once per frame from drawModern before the depth-sorted loop: it captures the
   canvas transform, merges the officials into the list and draws every shadow in one batch from sceneLight().
   Rig: side view facing ±x, two-bone IK legs (feet planted) and arms (hand targets) or arm angles
   (0 = straight down, π/2 = forward, π = up). Body size = BUILD[role] × the player's pl.ht / pl.wt.
   Animation: p.anim wins when an engine step sets it (p.animT counts down from ANIM_DUR[anim] seconds):
     throw catch dive tackle tackled stiff juke spin truck hurdle slide block swim rip swat kick punt snap kneel spike celebrate getup
   otherwise poses come from engine state (phase, velocity, engaged, fallP, lunge, throwT, stiff, play.*).
   Instant replay restores only x,y,z,fallP,phase,face,vx,vy, so transient flags are ignored while S.phase==='replay'.
   Per-frame work allocates nothing: team colours, number sprites and helmet decals are cached.
   ========================================================= */
const TAU2=6.2832;
const ATH={now:-1,f:0,a:1,b:0,c:0,d:1,e:0,ff:0,L:null,Lk:null,dirs:[],rots:[],sh:'',glow:'',tn:null,sk:null,cols:new Map(),nums:new Map(),deadPlay:null,deadAt:0,car:null,dirtS:null,gu:0};
const ATH_L0={sx:.6,sy:.35,len:.5,a:.32,n:1,tint:'',glow:0};
const ANIM_DUR={throw:.35,catch:.4,dive:.4,tackle:.5,tackled:.6,stiff:.5,juke:.36,spin:.45,truck:.55,hurdle:.5,slide:.6,block:1,swim:.4,rip:.4,swat:.4,kick:.5,punt:.5,snap:.3,kneel:1,spike:.5,celebrate:2,getup:.6};
const ATP={lean:0,cr:0,legs:'stand',st:0,ph:0,run:0,aN:'hang',aF:'hang',rot:0,kx:1,carry:0,u:0,ball:''};
const ATJ={hx:0,hy:0,k0x:0,k0y:0,f0x:0,f0y:0,k1x:0,k1y:0,f1x:0,f1y:0,sx:0,sy:0,nx:0,ny:0,e0x:0,e0y:0,w0x:0,w0y:0,e1x:0,e1y:0,w1x:0,w1y:0};
let ATH_IX=0,ATH_IY=0,ATH_HX=0,ATH_HY=0;
const athByY=(a,b)=>a.y-b.y;

/* ---------- frame setup, transforms, colours ---------- */
function athFrame(c,now){
  if(ATH.now===now)return;ATH.now=now;ATH.f++;
  const m=c.getTransform();ATH.a=m.a;ATH.b=m.b;ATH.c=m.c;ATH.d=m.d;ATH.e=m.e;ATH.ff=m.f;
  const L=typeof sceneLight==='function'?sceneLight():ATH_L0;ATH.L=L;
  if(ATH.Lk!==L){ATH.Lk=L;ATH.dirs.length=0;ATH.rots.length=0;const n=Math.max(1,L.n|0);
    for(let i=0;i<n;i++){const a=i*TAU2/n,ca=Math.cos(a),sa=Math.sin(a),x=L.sx*ca-L.sy*sa,y=L.sx*sa+L.sy*ca;ATH.dirs.push(x,y);ATH.rots.push(Math.atan2(y,x))}
    ATH.sh=`rgba(0,0,0,${((+L.a||.3)*(L.n>1?.62:1)).toFixed(3)})`;ATH.glow=L.glow>.3?`rgba(255,255,255,${(L.glow*.32).toFixed(3)})`:''}
  if(ATH.tn!==(L.tint||'')){ATH.tn=L.tint||'';const T=athTint(ATH.tn);ATH.sk=TONES.map(t=>[athMix(t,T),athMix(shade(t,-.25),T)])}
  if(!ATH.dirtS){ATH.dirtS=[[],[]];for(let i=0;i<=6;i++){ATH.dirtS[0].push(`rgba(74,54,30,${(i*.1).toFixed(2)})`);ATH.dirtS[1].push(`rgba(236,240,246,${(i*.11).toFixed(2)})`)}}
  if(S.phase==='dead'&&play&&ATH.deadPlay!==play){ATH.deadPlay=play;ATH.deadAt=now}
  ATH.car=null;
  if(play&&ball&&ball.state==='held'){if(S.phase!=='replay')ATH.car=play.carrier;else{let bd=1.3;for(const p of P){const d=Math.abs(p.x-ball.x)+Math.abs(p.y-ball.y);if(d<bd){bd=d;ATH.car=p}}}}
  c.lineCap='round';c.lineJoin='round';
}
/* local figure space: origin at the feet, +x = facing, y down; kx = facing × spin squash, rot = whole-body tilt */
function athXf(c,x,y,kx,rot){const A=ATH.a,D=ATH.d;
  if(rot){const co=Math.cos(rot),si=Math.sin(rot);c.setTransform(A*kx*co,D*si,-A*kx*si,D*co,A*x+ATH.e,D*y+ATH.ff)}
  else c.setTransform(A*kx,0,0,D,A*x+ATH.e,D*y+ATH.ff)}
const athReset=c=>c.setTransform(ATH.a,ATH.b,ATH.c,ATH.d,ATH.e,ATH.ff);
function athTint(s){const m=/rgba?\(([^)]+)\)/.exec(s||'');if(!m)return null;const v=m[1].split(',').map(Number);return [v[0],v[1],v[2],(v.length>3?v[3]:1)*.7]}
function athMix(h,T){if(!T||!h||h[0]!=='#'||h.length<7)return h;const n=parseInt(h.slice(1,7),16),a=T[3],f=(x,y)=>Math.round(x+(y-x)*a);return '#'+((1<<24)+(f(n>>16,T[0])<<16)+(f(n>>8&255,T[1])<<8)+f(n&255,T[2])).toString(16).slice(1)}
function athCols(team){
  const st=uniStyle(team);let e=ATH.cols.get(team);
  if(e&&e.st===st&&e.c1===team.c1&&e.c2===team.c2&&e.tn===ATH.tn)return e;
  const U=uniColors(team),T=athTint(ATH.tn),m=h=>athMix(h,T),j=U.j,t=U.t;
  const gl=lum(j)>.8?team.c1:contrasty(t,j)?t:inkOn(j),num=contrasty(t,j)?t:inkOn(j);
  const hs=contrasty(t,U.h)?t:contrasty(team.c2,U.h)?team.c2:inkOn(U.h),ps=contrasty(t,U.p)?t:contrasty(team.c1,U.p)?team.c1:inkOn(U.p);
  e={st,c1:team.c1,c2:team.c2,tn:ATH.tn,j:m(j),jD:m(shade(j,-.28)),jH:m(shade(j,.22)),p:m(U.p),pD:m(shade(U.p,-.3)),ps:m(ps),h:m(U.h),hD:m(shade(U.h,-.4)),hs:m(hs),
    s:m(U.s),sD:m(shade(U.s,-.3)),mask:m(U.mask),gl:m(gl),glD:m(shade(gl,-.3)),num,numO:lum(num)>.55?'rgba(0,0,0,.55)':'rgba(255,255,255,.65)',matte:(team.id|0)%3===0,dec:null,decLg:-1,lgF:-1,lg:null};
  ATH.cols.set(team,e);return e;
}
function athNum(e,num){const k=e.num+e.numO+num;let cv=ATH.nums.get(k);if(cv)return cv;
  cv=document.createElement('canvas');cv.width=72;cv.height=52;const g=cv.getContext('2d'),t=String(num);
  g.font='900 44px -apple-system,system-ui,"Helvetica Neue",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=7;g.strokeStyle=e.numO;g.strokeText(t,36,28);g.fillStyle=e.num;g.fillText(t,36,28);ATH.nums.set(k,cv);return cv}
/* helmet decal: an imported logo when the user loaded one (teamLogo, 02c), else a generated mark (letter, star or bolt) */
function athDecal(team,e){
  if(e.lgF!==ATH.f){e.lgF=ATH.f;e.lg=typeof teamLogo==='function'?teamLogo(team):null}
  const has=e.lg?1:0;if(e.dec&&e.decLg===has)return e.dec;
  const cv=e.dec||document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,64,64);e.decLg=has;e.dec=cv;
  if(e.lg){const w=e.lg.naturalWidth||1,h=e.lg.naturalHeight||1,k=58/Math.max(w,h);try{g.drawImage(e.lg,32-w*k/2,32-h*k/2,w*k,h*k)}catch(_){}return cv}
  const kind=(team.id|0)%5;g.fillStyle=e.hs;g.strokeStyle=e.hD;g.lineWidth=5;g.lineJoin='round';
  if(kind===3){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?12:28;g.lineTo(32+Math.cos(a)*r,34+Math.sin(a)*r)}g.closePath();g.stroke();g.fill()}
  else if(kind===4){g.beginPath();g.moveTo(40,3);g.lineTo(13,37);g.lineTo(30,37);g.lineTo(23,61);g.lineTo(51,25);g.lineTo(34,25);g.closePath();g.stroke();g.fill()}
  else{g.font='900 52px -apple-system,system-ui,"Helvetica Neue",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';const t=(team.abbr||'U')[0];g.strokeText(t,32,35);g.fillText(t,32,35)}
  return cv;
}
/* body scale from BUILD (position) and the player's real height/weight; accessories hashed from the player id */
function athBody(p){if(p._bh)return;const pl=p.pl||{},sz=(typeof SIZE!=='undefined'&&SIZE[pl.pos])||null,B=(typeof BUILD!=='undefined'&&BUILD[p.role])||[1,1];
  const ht=pl.ht||(sz?sz[0]:73),wt=pl.wt||(sz?sz[2]:205),aw=sz?sz[2]:wt;
  p._bh=clamp(ht/73,.92,1.09)*(.6+.4*B[1]);p._bw=B[0]*clamp(1+(wt-aw)/aw*.85,.88,1.15);p._acc=((pl.id|0)*2654435761)>>>0}

/* ---------- IK + segments ---------- */
function athIK(ax,ay,bx,by,l1,l2,sg){let dx=bx-ax,dy=by-ay,d=Math.sqrt(dx*dx+dy*dy);const mx=(l1+l2)*.999;if(d>mx){dx*=mx/d;dy*=mx/d;d=mx}ATH_HX=ax+dx;ATH_HY=ay+dy;
  if(d<1e-3){ATH_IX=ax;ATH_IY=ay+l1;return}const a=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),t=Math.atan2(dy,dx)+sg*a;ATH_IX=ax+Math.cos(t)*l1;ATH_IY=ay+Math.sin(t)*l1}
function athSeg(c,ax,ay,bx,by,w,col){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke()}

/* ---------- rig: joints from the pose ---------- */
function athRig(hh,bw){
  const A=ATP,J=ATJ,run=A.run,st=hh*A.st,ph=A.ph;let hipH=hh*.475*(1-.42*A.cr);
  if(A.legs==='run'||A.legs==='back')hipH*=1-.03*run+.025*run*Math.cos(2*ph);
  J.hx=0;J.hy=-hipH;let f0x=-hh*.05,f0y=0,f1x=hh*.06,f1y=0;
  switch(A.legs){
    case 'run':{const lift=hh*(.05+.14*Math.min(1,run)),s0=Math.sin(ph),c0=Math.cos(ph);f1x=st*s0+hh*.02;f1y=-Math.max(0,c0)*lift;f0x=-st*s0+hh*.02;f0y=-Math.max(0,-c0)*lift;break}
    case 'back':{const s0=Math.sin(ph),c0=Math.cos(ph);f1x=st*s0;f1y=-Math.max(0,-c0)*hh*.07;f0x=-st*s0;f0y=-Math.max(0,c0)*hh*.07;break}
    case 'stance2':f0x=-hh*.13;f1x=hh*.11;break;
    case 'stance3':f0x=-hh*.2;f1x=-hh*.02;break;
    case 'gun':f0x=-hh*.08;f1x=hh*.08;break;
    case 'wide':f0x=-hh*.2;f1x=hh*.19;break;
    case 'step':f0x=-hh*.14;f1x=hh*.17;break;
    case 'hurdle':f0x=-hh*.24;f0y=-hh*.26;f1x=hh*.3;f1y=-hh*.2;break;
    case 'trail':f0x=-hh*.1;f1x=-hh*.02;break;
    case 'kneel':f0x=-hh*.24;f1x=hh*.16;break;
    case 'heis':f0x=-hh*.06;f1x=hh*.12;f1y=-hh*.22;break;
    case 'kick':{const q=Math.sin(A.u*Math.PI);f0x=-hh*.04;f1x=hh*(.36*q-.05);f1y=-hh*.34*q;break}
    case 'slide':f0x=hh*.38;f0y=-hh*.02;f1x=hh*.44;f1y=-hh*.1;break;
  }
  const tl=hh*.25;
  athIK(0,J.hy,f0x,f0y,tl,tl,-1);J.k0x=ATH_IX;J.k0y=ATH_IY;J.f0x=ATH_HX;J.f0y=ATH_HY;
  athIK(0,J.hy,f1x,f1y,tl,tl,-1);J.k1x=ATH_IX;J.k1y=ATH_IY;J.f1x=ATH_HX;J.f1y=ATH_HY;
  const ln=A.lean,to=hh*.3;J.sx=Math.sin(ln)*to;J.sy=J.hy-Math.cos(ln)*to;
  const hl=ln*.55;J.nx=J.sx+Math.sin(hl)*hh*.145;J.ny=J.sy-Math.cos(hl)*hh*.145;
  athArm(A.aF,0,hh,ATH.now);athArm(A.aN,1,hh,ATH.now);
}
/* one arm (k: 0 far, 1 near) from a pose mode: angle modes or a hand target solved with IK */
function athArm(m,k,hh,now){
  const J=ATJ,A=ATP,sx=J.sx,sy=J.sy,l1=hh*.165,l2=hh*.155;let ua=.1,fa=.35,tx=0,ty=0,ik=false;
  switch(m){
    case 'swing':{const r=Math.min(1,A.run),am=.2+r*.95,sn=Math.sin(A.ph+(k?0:Math.PI));ua=-sn*am;fa=ua+.45+r*1.05;break}
    case 'hang':ua=.08+(k?.07:-.05)+Math.sin(now/700+k)*.03;fa=ua+.28;break;
    case 'down3':ik=true;tx=sx+hh*.03;ty=-hh*.012;break;
    case 'thigh':ik=true;tx=(k?J.k1x:J.k0x)+hh*.03;ty=(k?J.k1y:J.k0y)-hh*.04;break;
    case 'knees':ik=true;tx=(k?J.k1x:J.k0x)+hh*.015;ty=(k?J.k1y:J.k0y)-hh*.03;break;
    case 'gun':ik=true;tx=sx+hh*.15;ty=sy+hh*(k?.13:.12);break;
    case 'center':ik=true;tx=J.hx+hh*.25;ty=J.hy-hh*.01;break;
    case 'snap':ik=true;tx=sx+hh*.08;ty=-hh*.03;break;
    case 'push':ik=true;tx=sx+hh*.27;ty=sy+hh*(k?.05:.02);break;
    case 'carry':case 'heisCarry':ik=true;tx=sx*.55+J.hx*.45+hh*.11;ty=sy*.55+J.hy*.45-hh*.01;break;
    case 'secure':ik=true;tx=sx+hh*.13;ty=sy+hh*.09;break;
    case 'hold':ik=true;tx=sx+hh*.12;ty=sy+hh*.07;break;
    case 'wrap':ik=true;tx=sx+hh*.28;ty=sy+hh*(k?.1:.05);break;
    case 'hips':ik=true;tx=J.hx+hh*.05;ty=J.hy-hh*.05;break;
    case 'stiff':ua=1.62;fa=1.6;break;
    case 'dive':ua=2.55+(k?.08:-.06);fa=ua+.1;break;
    case 'reach':{const zz=ball&&ball.state==='air'?ball.z:2;ua=clamp(1.5+zz*.35,1.5,2.95)+(k?.1:-.1);fa=ua+.18;break}
    case 'cock':ua=-2.25;fa=-2.85;break;
    case 'aim':ua=1.75;fa=1.65;break;
    case 'throw':{const u=A.u;if(u<.3){const q=u/.3;ua=-2.25-q*1.75;fa=ua-.55+q*.3}else{const q=(u-.3)/.7;ua=-4-q*1.55;fa=ua-.25}break}
    case 'thrown':ua=1.6-A.u*1.9;fa=ua+.6;break;
    case 'flail':ua=-2.4+Math.sin(now/90+k)*.3;fa=ua-.4;break;
    case 'balance':ua=1.05+(k?.35:-.25);fa=ua+.5;break;
    case 'up':ua=Math.PI-(k?.1:-.1);fa=Math.PI-(k?.05:-.05);break;
    case 'fwd':ua=1.57;fa=1.57;break;
    case 'wave':{const w=Math.sin(now/115)*(k?1:-1);ua=1.3+w*.55;fa=ua+.12;break}
    case 'spot':ua=.95;fa=.85;break;
    case 'flagT':ua=2.6-A.u*1.7;fa=ua-.25;break;
    case 'celebrate':ua=2.95+(k?.08:-.08);fa=3.05;break;
    case 'point':if(k){ua=3;fa=3.1}else{ua=.3;fa=.2}break;
    case 'heisman':if(k){ua=1.6;fa=1.55}else{ik=true;tx=sx*.55+J.hx*.45+hh*.11;ty=sy*.55+J.hy*.45-hh*.01}break;
    case 'flex':ua=1.6;fa=3.0;break;
    case 'spikeA':if(k){ua=-.3+Math.sin(now/90)*.6;fa=ua}else{ua=.2;fa=.4}break;
    case 'salute':if(k){ua=2.4;fa=-1.2}else{ua=.2;fa=.3}break;
    case 'bowA':ua=.6;fa=.4;break;
    case 'swim':if(k){ua=2.8;fa=2.4}else{ik=true;tx=sx+hh*.25;ty=sy+hh*.05}break;
    case 'rip':if(k){ua=2.2;fa=3.0}else{ik=true;tx=sx+hh*.25;ty=sy+hh*.05}break;
    case 'swat':if(k){ua=2.9;fa=3.0}else{ua=1.2;fa=1.5}break;
  }
  let ex,ey,wx,wy;
  if(ik){athIK(sx,sy,tx,ty,l1,l2,1);ex=ATH_IX;ey=ATH_IY;wx=ATH_HX;wy=ATH_HY}
  else{ex=sx+Math.sin(ua)*l1;ey=sy+Math.cos(ua)*l1;wx=ex+Math.sin(fa)*l2;wy=ey+Math.cos(fa)*l2}
  if(k){J.e1x=ex;J.e1y=ey;J.w1x=wx;J.w1y=wy}else{J.e0x=ex;J.e0y=ey;J.w0x=wx;J.w0y=wy}
}

/* ---------- poses from engine state ---------- */
function athFall(p,now){ATH.gu=0;let f=p.fallP||0;if(f<.02)return 0;
  if(S.phase==='dead'&&S.celebrate!==p){const g=clamp((now-ATH.deadAt-900)/700,0,1);if(g>0){f*=1-g;ATH.gu=g}}return f}
function athStance(p){const A=ATP,r=p.role,L=S.los;
  if(p.vx*p.vx+p.vy*p.vy>.36)return;
  if(r==='OL'){A.legs='stance3';A.cr=1;A.lean=1.32;A.aN=p.key==='OL2'?'snap':'down3';A.aF='thigh';return}
  if(r==='DL'){A.legs='stance3';A.cr=1;A.lean=1.38;A.aN='down3';A.aF=(p._acc&1)?'down3':'thigh';return}
  if(r==='QB'){A.legs='gun';if(L-p.x<2.2){A.cr=.45;A.lean=.42;A.aN=A.aF='center'}else{A.cr=.2;A.lean=.14;A.aN=A.aF='gun'}return}
  if(r==='RB'){A.legs='stance2';A.cr=.36;A.lean=.62;A.aN=A.aF='knees';return}
  if(r==='TE'&&L-p.x<1.4&&Math.abs(p.y-S.ballY)<5){A.legs='stance3';A.cr=.9;A.lean=1.2;A.aN='down3';A.aF='thigh';return}
  if(r==='WR'||r==='TE'){A.legs='stance2';A.cr=.3;A.lean=.42;A.aN=A.aF='hang';return}
  if(r==='LB'){A.legs='stance2';A.cr=.34;A.lean=.38;A.aN=A.aF='gun';return}
  if(r==='CB'){const press=Math.abs(p.x-L)<3;A.legs='stance2';A.cr=press?.34:.26;A.lean=.34;A.aN=A.aF=press?'gun':'hang';return}
  if(r==='S'){A.legs='stance2';A.cr=.2;A.lean=.22;A.aN=A.aF='hang'}
}
function athPose(p,now){
  const A=ATP,ph=S.phase,pre=ph==='presnap',rp=ph==='replay',pl=play,face=p.face||1;
  const sp=Math.sqrt(p.vx*p.vx+p.vy*p.vy),run=clamp(sp/7.5,0,1.2),car=ATH.car===p&&!pre;
  A.ph=p.phase||0;A.run=run;A.rot=0;A.kx=face;A.carry=0;A.u=0;A.ball='';
  if(sp>.6){A.legs='run';A.st=.06+.26*Math.min(1,run);A.lean=.08+.27*Math.min(1,run);A.cr=.04+.08*run;A.aN=A.aF='swing'}
  else{A.legs='stand';A.st=0;A.lean=.06;A.cr=.06;A.aN=A.aF='hang'}
  /* sharp deceleration: plant */
  if(!pre&&!rp){const dtm=p._pt?(now-p._pt)/1000:0;p._pt=now;if(dtm>0&&dtm<.1&&(p._sp||0)>4.5&&((p._sp||0)-sp)/dtm>16)p._pl=now+190;p._sp=sp;
    if(p._pl>now){A.legs='wide';A.lean=-.14;A.cr=.3;A.aN=A.aF='balance'}}
  if(pre)athStance(p);
  else if((p.side==='d'||p.role==='OL'||p===Q)&&sp>.8&&p.vx*face<-.6&&!p.engaged){A.legs='back';A.lean=-.02;A.cr=.22;A.st=.06+.1*run;A.run=run*.5}
  /* quarterback: drop, hold, aim, throw */
  if(!pre&&p===Q&&pl){const thr=rp?0:(p.throwT||0);
    if(thr>0){A.u=1-thr/.35;A.kx=1;A.legs='step';A.lean=.1+A.u*.28;A.cr=.12;A.aN='throw';A.aF='thrown'}
    else if(car&&pl.type==='pass'&&!pl.scramble){A.kx=1;if(aim&&ph==='live'){A.aN='cock';A.aF='aim';A.ball='cock';A.legs=sp>.6?'back':'step';A.lean=-.06}
      else{A.aN=A.aF='hold';A.ball='hold';if(p.vx<-.6){A.legs='back';A.lean=.02;A.cr=.14;A.st=.08+.12*run}}}}
  /* ball carrier: tuck in the sideline-side arm, moves */
  if(car&&!A.ball&&!(p===Q&&(p.throwT||0)>0)){const near=p.y>CEN,fr=near?'aF':'aN';A.carry=near?1:2;A[near?'aN':'aF']='carry';
    if(pl&&!rp){
      if(pl.jukeT>0){A.legs='wide';A.cr=.3;A.lean=.18;A[fr]='balance'}
      if(pl.spinT>0){const q=Math.cos((1-pl.spinT/.45)*TAU2);A.kx=face*(Math.abs(q)<.2?(q<0?-.2:.2):q)}
      if(pl.truckT>0){A.lean=.62;A.cr=.28;A[fr]='push'}
      if(p.stiff>0&&!(pl.truckT>0))A[fr]='stiff';
      if(pl.hurdle>0&&p.z>.05){A.legs='hurdle';A.lean=.32;A[fr]='balance'}
      if(pl.caught&&ball.T&&pl.t-pl.ballT0-ball.T<.28){A.aN=A.aF='secure';A.carry=1}
      if(pl.dive>0){A.rot=.95*Math.min(1,(.38-pl.dive)/.12+.3);A.legs='trail';A.aN=A.aF='dive';A.carry=0;A.ball='dive'}}}
  /* hands up as the ball arrives */
  if(!pre&&!car&&ball&&ball.state==='air'&&!ball.pitch&&ball.T>0&&ball.t/ball.T>.45){const d=Math.abs(p.x-ball.tx)+Math.abs(p.y-ball.ty);
    if(d<(p.side==='o'?3.2:2.6)&&(p.side==='d'||eligible(p))){A.aN=A.aF='reach';if(sp<2)A.legs='stand'}}
  if(!pre&&!rp&&pl&&p===S.ctrl&&pl.swat>0){A.aN=A.aF='swat'}
  /* blocking */
  if(!pre&&!rp&&!car){if(p.engaged){A.aN=A.aF='push';A.lean=.55;A.cr=.3;if(sp<.6)A.legs='wide';else A.st=.07}
    else if(p.role==='OL'&&pl&&pl.type==='pass'&&!pl.thrown){A.aN=A.aF='gun';A.lean=.28;A.cr=.3;if(sp<.6)A.legs='wide'}}
  /* tackles: lunge, wrap, fall together, get up after the whistle */
  if(!pre&&!rp&&p.lunge>0){A.rot=Math.max(A.rot,.62*Math.min(1,p.lunge/.2));A.aN=A.aF='wrap';A.legs='trail';A.lean=.3}
  const fe=pre?0:athFall(p,now);
  if(fe>.02){A.rot=Math.max(A.rot,fe*1.42);A.cr=Math.min(A.cr,.1);if(fe>.4)A.legs='trail';
    if(car){A[A.carry===2?'aN':'aF']='balance'}else if(p.side==='d'){A.aN=A.aF='wrap'}else if(A.aN!=='push'){A.aN='flail';A.aF='balance'}}
  if(ATH.gu>0&&ATH.gu<1){A.legs='kneel';A.cr=.55*Math.sin(ATH.gu*Math.PI);A.aN=A.aF='knees'}
  /* celebrations (S.celebrate + POSE_ARM, 08c) */
  if(S.celebrate===p){const k=S.celebPose;A.aN=A.aF=(k&&POSE_ARM[k])||'celebrate';A.carry=0;A.ball='';A.rot=0;
    if(k==='bow'){A.lean=.9;A.legs='stand'}else if(k==='heisman'){A.legs='heis';A.cr=.15;A.lean=.1;A.carry=2}else if(sp<.6){A.legs='stand';A.lean=.04}}
  /* engine-driven animation (when a later engine step sets p.anim / p.animT) */
  const an=!rp&&p.anim&&(p.animT==null||p.animT>0)?p.anim:'';
  if(an){const u=p.animT!=null?1-clamp(p.animT/(ANIM_DUR[an]||.5),0,1):.5;A.u=u;const fr=A.carry===1?'aF':'aN';
    switch(an){case 'throw':A.kx=1;A.legs='step';A.lean=.1+u*.28;A.aN='throw';A.aF='thrown';A.ball='';break;
      case 'catch':A.aN=A.aF='reach';break;case 'dive':A.rot=.95;A.legs='trail';A.aN=A.aF='dive';break;
      case 'tackle':A.rot=Math.min(1.42,.6+u*.8);A.legs='trail';A.aN=A.aF='wrap';break;case 'tackled':A.rot=u*1.42;A.legs='trail';break;
      case 'stiff':A[fr]='stiff';break;case 'juke':A.legs='wide';A.cr=.3;break;
      case 'spin':{const q=Math.cos(u*TAU2);A.kx=face*(Math.abs(q)<.2?(q<0?-.2:.2):q);break}
      case 'truck':A.lean=.62;A.cr=.28;A[fr]='push';break;case 'hurdle':A.legs='hurdle';A.lean=.32;break;
      case 'slide':A.rot=-.95;A.legs='slide';A.lean=-.2;break;case 'block':A.aN=A.aF='push';A.lean=.55;A.cr=.3;break;
      case 'swim':case 'rip':case 'swat':A.aN=A.aF=an;break;
      case 'kick':case 'punt':A.legs='kick';A.lean=-.1;A.aN=A.aF='balance';break;case 'snap':A.aN='snap';break;
      case 'kneel':A.legs='kneel';A.cr=.55;A.aN=A.aF='knees';break;case 'spike':A.aN='spikeA';break;
      case 'celebrate':A.aN=A.aF='celebrate';break;case 'getup':A.rot=(1-u)*1.3;A.legs='kneel';A.cr=.5*Math.sin(u*Math.PI);break}}
}

/* ---------- drawing ---------- */
function athLegP(c,k,hh,bw,pc,sc,stc,wc,spat){const J=ATJ,kx=k?J.k1x:J.k0x,ky=k?J.k1y:J.k0y,fx=k?J.f1x:J.f0x,fy=k?J.f1y:J.f0y;
  athSeg(c,J.hx,J.hy,kx,ky,hh*.148*bw,pc);
  if(stc)athSeg(c,J.hx+(kx-J.hx)*.08,J.hy+(ky-J.hy)*.08,kx,ky,Math.max(1,hh*.026),stc);
  athSeg(c,kx,ky,fx,fy,hh*.096*bw,sc);
  if(spat)athSeg(c,fx+(kx-fx)*.2,fy+(ky-fy)*.2,fx,fy,hh*.09*bw,k?'#f1f3f6':'#c3c7cf');
  c.fillStyle=wc?(k?'#eef0f3':'#bfc3ca'):(k?'#1a1c21':'#0b0c0f');c.beginPath();c.ellipse(fx+hh*.035,fy,hh*.062,hh*.03,0,0,TAU2);c.fill()}
function athArmP(c,k,hh,bw,jc,ac,fc,gc){const J=ATJ,ex=k?J.e1x:J.e0x,ey=k?J.e1y:J.e0y,wx=k?J.w1x:J.w0x,wy=k?J.w1y:J.w0y;
  athSeg(c,J.sx,J.sy,ex,ey,hh*.094*bw,ac);
  athSeg(c,J.sx,J.sy,J.sx+(ex-J.sx)*.6,J.sy+(ey-J.sy)*.6,hh*.118*bw,jc);
  athSeg(c,ex,ey,wx,wy,hh*.076*bw,fc);
  c.fillStyle=gc;c.beginPath();c.arc(wx,wy,hh*.05*Math.min(1.15,bw),0,TAU2);c.fill()}
function athTorso(c,hh,bw,fill,hi,ol){const J=ATJ,ln=ATP.lean,nx=Math.cos(ln),ny=Math.sin(ln),hw=hh*.1*bw,cw=hh*.132*bw;
  c.fillStyle=fill;c.beginPath();c.moveTo(J.hx-nx*hw,J.hy-ny*hw);c.lineTo(J.sx-nx*cw,J.sy-ny*cw);c.lineTo(J.sx+nx*cw,J.sy+ny*cw);c.lineTo(J.hx+nx*hw,J.hy+ny*hw);c.closePath();if(ol){c.strokeStyle=ol;c.lineWidth=Math.max(1,hh*.022);c.stroke()}c.fill();
  if(hi){/* shoulder pads under the jersey */const sn=Math.sin(ln),cs=Math.cos(ln),px=J.sx-sn*hh*.012,py=J.sy+cs*hh*.012;
    c.beginPath();c.ellipse(px,py,cw*1.32,hh*.074,ln,0,TAU2);if(ol)c.stroke();c.fill();c.fillStyle=hi;c.beginPath();c.ellipse(px+sn*hh*.03,py-cs*hh*.03,cw*.95,hh*.032,ln,0,TAU2);c.fill()}}
function athHelmet(c,hh,e,skin,team,vis,fs){const J=ATJ,x=J.nx,y=J.ny,r=hh*.138;
  c.fillStyle=skin;c.beginPath();c.arc(x+r*.3,y+r*.2,r*.62,0,TAU2);c.fill();
  c.fillStyle=e.hD;c.beginPath();c.arc(x,y,r,.4*Math.PI,1.93*Math.PI);c.lineTo(x+r*.32,y+r*.16);c.closePath();c.fill();
  c.fillStyle=e.h;c.beginPath();c.arc(x+r*.03,y-r*.07,r*.89,.43*Math.PI,1.93*Math.PI);c.lineTo(x+r*.3,y+r*.1);c.closePath();c.fill();
  c.strokeStyle=e.hs;c.lineWidth=r*.24;c.beginPath();c.arc(x,y,r*.84,1.06*Math.PI,1.8*Math.PI);c.stroke();
  if(r>=4.2){const d=athDecal(team,e),ds=r*1.02,cx=x-r*.16,cy=y+r*.1;c.translate(cx,cy);c.scale(fs,1);c.drawImage(d,-ds/2,-ds/2,ds,ds);c.scale(fs,1);c.translate(-cx,-cy)}
  c.fillStyle=e.matte?'rgba(255,255,255,.16)':'rgba(255,255,255,.5)';c.beginPath();c.ellipse(x-r*.1,y-r*.56,r*.38,r*.15,-.3,0,TAU2);c.fill();
  if(ATH.glow){c.strokeStyle=ATH.glow;c.lineWidth=r*.12;c.beginPath();c.arc(x,y,r*.97,1.15*Math.PI,1.75*Math.PI);c.stroke()}
  if(vis){c.fillStyle='rgba(18,20,30,.85)';c.beginPath();c.moveTo(x+r*.52,y-r*.1);c.lineTo(x+r*1.04,y-r*.04);c.lineTo(x+r*1.02,y+r*.32);c.lineTo(x+r*.56,y+r*.3);c.closePath();c.fill()}
  c.strokeStyle=e.mask;c.lineWidth=Math.max(.8,r*.15);c.beginPath();
  c.moveTo(x+r*.6,y-r*.14);c.lineTo(x+r*1.14,y-r*.04);c.lineTo(x+r*1.08,y+r*.66);c.lineTo(x+r*.66,y+r*.86);
  c.moveTo(x+r*.66,y+r*.36);c.lineTo(x+r*1.12,y+r*.34);c.stroke()}
function athBallAt(c,k,hh){const J=ATJ;drawFootball(c,(k?J.w1x:J.w0x)-hh*.035,(k?J.w1y:J.w0y)-hh*.012,hh*.088,-.55,0)}
function drawAthlete(c,p,now){
  athFrame(c,now);
  if(p.ref){if(typeof drawOfficial==='function')drawOfficial(c,p,now);return}
  const s=scE(),sx=X(p.x),sy=Y(p.y);athBody(p);const hh=s*2.75*p._bh,bw=p._bw;
  if(sx<-hh*1.5||sx>W+hh*1.5||sy<-hh*.5||sy>H+hh*2)return;
  const team=p.team||(p.side==='o'?offT():defT()),e=athCols(team),sk=ATH.sk[(p.pl&&p.pl.tone)|0]||ATH.sk[1];
  if(LG.settings.stars!==false&&p.ovr>=86&&S.phase!=='kick'){const n=p.ovr>=94?3:p.ovr>=90?2:1;for(let i=0;i<n;i++){const x=sx+(i-(n-1)/2)*hh*.2,y=sy+hh*.16;c.fillStyle='rgba(0,0,0,.45)';starPath(c,x+1,y+1,hh*.075);c.fillStyle='#FFD23F';starPath(c,x,y,hh*.075)}}
  athPose(p,now);athRig(hh,bw);athXf(c,sx,sy-(p.z||0)*s*.9,ATP.kx,ATP.rot);
  const A=ATP,J=ATJ,fs=A.kx<0?-1:1,acc=p._acc|0,slv=(acc>>4)%5,wc=(acc>>8)%6===0,spat=(acc>>11)%4===0;
  const vis=(acc%9)<((p.role==='WR'||p.role==='CB'||p.role==='S'||p.role==='RB')?3:1);
  const aN=slv===1?'#16181d':slv===2?'#eef0f3':sk[0],aD=slv===1?'#0c0d10':slv===2?'#c3c7cf':sk[1];
  /* far side (shaded) */
  athLegP(c,0,hh,bw,e.pD,e.sD,'',wc,spat);
  athArmP(c,0,hh,bw,e.jD,aD,aD,e.glD);
  /* torso, pads, seat of the pants, number */
  athTorso(c,hh,bw,e.j,e.jH,e.jD);
  {const ln=A.lean,nx=Math.cos(ln),ny=Math.sin(ln),hw=hh*.095*bw;athSeg(c,J.hx-nx*hw,J.hy-ny*hw,J.hx+nx*hw,J.hy+ny*hw,hh*.13,e.p)}
  if(hh>=24&&p.num!=null){if(p._nse!==e){p._nse=e;p._nsp=athNum(e,p.num)}const nh=hh*.19,nw=nh*72/52,ln=A.lean,cx=J.hx*.42+J.sx*.58,cy=J.hy*.42+J.sy*.58+hh*.01;
    c.translate(cx,cy);c.rotate(ln);c.scale(fs,1);c.drawImage(p._nsp,-nw/2,-nh/2,nw,nh);c.scale(fs,1);c.rotate(-ln);c.translate(-cx,-cy)}
  if(A.carry===2){athBallAt(c,0,hh);athSeg(c,J.e0x,J.e0y,J.w0x,J.w0y,hh*.068*bw,aD);c.fillStyle=e.glD;c.beginPath();c.arc(J.w0x,J.w0y,hh*.045,0,TAU2);c.fill()}
  /* near side */
  athLegP(c,1,hh,bw,e.p,e.s,hh>=20?e.ps:'',wc,spat);
  if(p.dirt>.05){const lv=Math.min(6,Math.round(p.dirt*6)),mx=(J.hx+J.k1x)/2,my=(J.hy+J.k1y)/2,tx=J.hx*.6+J.sx*.4,ty=J.hy*.6+J.sy*.4;c.fillStyle=ATH.dirtS[S.wx==='Snow'?1:0][lv];c.beginPath();
    c.moveTo(mx+hh*.05,my);c.ellipse(mx,my,hh*.05,hh*.035,0,0,TAU2);c.moveTo(tx+hh*.045,ty);c.ellipse(tx,ty,hh*.045,hh*.03,.4,0,TAU2);c.moveTo(J.k1x+hh*.03,J.k1y);c.ellipse(J.k1x,J.k1y,hh*.03,hh*.025,0,0,TAU2);c.fill()}
  athHelmet(c,hh,e,sk[0],team,vis,fs);
  if(A.carry===1)athBallAt(c,1,hh);
  athArmP(c,1,hh,bw,e.j,aN,aN,e.gl);
  if(hh>=44&&p._nsp){const ex=J.sx+(J.e1x-J.sx)*.3,ey=J.sy+(J.e1y-J.sy)*.3,nh=hh*.055;c.translate(ex,ey);c.scale(fs,1);c.drawImage(p._nsp,-nh*.7,-nh/2,nh*1.4,nh);c.scale(fs,1);c.translate(-ex,-ey)}
  if(A.ball==='hold')drawFootball(c,(J.w0x+J.w1x)/2+hh*.01,(J.w0y+J.w1y)/2-hh*.01,hh*.095,-.35,0);
  else if(A.ball==='cock')drawFootball(c,J.w1x,J.w1y,hh*.092,-.9,0);
  else if(A.ball==='dive')drawFootball(c,J.w1x+hh*.04,J.w1y,hh*.09,-1.4,0);
  athReset(c);
}

/* ---------- shadows (one batch for everyone) + per-frame prep ---------- */
function athShadows(c,list,now){
  const s=scE(),dA=ATH.dirs,ro=ATH.rots,L=ATH.L,nl=dA.length>>1,lf=nl>1?.7:1;c.fillStyle=ATH.sh;
  for(let li=0;li<nl;li++){c.beginPath();
  for(const p of list){const x=X(p.x),y=Y(p.y);if(x<-90||x>W+90||y<-60||y>H+60)continue;athBody(p);
    const hh=s*2.75*p._bh,bw=p._bw,k=1-Math.min(.75,(p.z||0)*.5),fl=p.ref?0:athFall(p,now);
    if(fl>.5){if(li)continue;const cx=x+(p.face||1)*hh*.42*fl;c.moveTo(cx+hh*.5,y);c.ellipse(cx,y,hh*.5,hh*.13*bw,0,0,TAU2)}
    else{if(fl>.5&&li)continue;const len=L.len*hh*k*lf,rx=len*.5+hh*.07,cx=x+dA[li*2]*len*.5,cy=y+dA[li*2+1]*len*.5,r=ro[li];c.moveTo(cx+Math.cos(r)*rx,cy+Math.sin(r)*rx);c.ellipse(cx,cy,rx,hh*.1*bw*k,r,0,TAU2)}}
  c.fill()}
  c.fillStyle='rgba(0,0,0,.26)';c.beginPath();
  for(const p of list){const x=X(p.x),y=Y(p.y);if(x<-90||x>W+90||y<-60||y>H+60)continue;if(!p.ref&&athFall(p,now)>.5)continue;
    const hh=s*2.75*p._bh,k=1-Math.min(.8,(p.z||0)*.6),rx=hh*.19*p._bw*k;c.moveTo(x+rx,y);c.ellipse(x,y,rx,hh*.055*k,0,0,TAU2)}
  c.fill();
}
function prepPlayers(c,list,now){
  athFrame(c,now);if(!S.home)return;
  if(typeof offiFrame==='function'&&P.length&&LG.settings.officials!==false){const o=offiFrame(now);if(o){for(const x of o)list.push(x);list.sort(athByY)}}
  if(typeof offiFlagDraw==='function')offiFlagDraw(c,now);
  athShadows(c,list,now);
}

/* ---------- the football ---------- */
function athWob(){try{if(ball.pitch||!play)return 0;if(play.throwAway)return .3;const r=play.intended;if(!r)return .15;const rem=Math.max(0,ball.T-ball.t),d=Math.hypot(r.x+r.vx*rem-ball.tx,r.y+r.vy*rem-ball.ty);return clamp((d-1.8)/4,0,1)}catch(e){return 0}}
function drawFootball(c,x,y,r,ang,spin){
  let a=ang||0,sq=1;const sp=spin||0;
  if(sp&&ball&&ball.state==='air'&&sp===ball.spin&&ball.T){const s=scE(),q=Math.min(1,ball.t/ball.T),vx=(ball.tx-ball.fx)*s,vy=(ball.ty-ball.fy)*s*VY-4*(ball.h||0)*(1-2*q)*s*.9;
    if(vx*vx+vy*vy>1)a=Math.atan2(vy,vx);if(ball._wob===undefined)ball._wob=athWob();const w=ball._wob;if(w>0){a+=Math.sin(sp*.42)*.55*w;sq=1-.32*w*Math.abs(Math.sin(sp*.27))}}
  c.translate(x,y);c.rotate(a);
  const L=r*sq,h=r*.6;
  c.fillStyle='#7E4119';c.beginPath();c.moveTo(-L,0);c.bezierCurveTo(-L*.55,-h*1.36,L*.55,-h*1.36,L,0);c.bezierCurveTo(L*.55,h*1.36,-L*.55,h*1.36,-L,0);c.fill();
  c.fillStyle='#55290D';c.beginPath();c.moveTo(-L*.9,h*.12);c.bezierCurveTo(-L*.45,h*1.22,L*.45,h*1.22,L*.9,h*.12);c.bezierCurveTo(L*.4,h*.6,-L*.4,h*.6,-L*.9,h*.12);c.fill();
  if(r>=2.4){const lo=-Math.sin(sp)*h*.42-h*.22;c.strokeStyle='rgba(255,238,218,.9)';c.lineWidth=Math.max(.7,r*.085);c.beginPath();
    c.moveTo(-L*.6,-h*.74);c.quadraticCurveTo(-L*.7,0,-L*.6,h*.74);c.moveTo(L*.6,-h*.74);c.quadraticCurveTo(L*.7,0,L*.6,h*.74);
    if(Math.cos(sp)>-.25){c.moveTo(-L*.3,lo);c.lineTo(L*.3,lo);for(let i=-2;i<=2;i++){c.moveTo(i*L*.13,lo-h*.16);c.lineTo(i*L*.13,lo+h*.16)}}
    c.stroke();c.fillStyle='rgba(255,210,170,.28)';c.beginPath();c.ellipse(-L*.1,-h*.5,L*.45,h*.18,0,0,TAU2);c.fill()}
  c.rotate(-a);c.translate(-x,-y);
}
