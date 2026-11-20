/* =========================================================
   08d · Players (modern HD style): a 2D skeletal puppet with cached, shaded uniform parts and keyframed animation
   drawAthlete(c,p,now) draws one on-field player (or official, p.ref) standing at its feet; drawFootball draws the ball.
   prepPlayers(c,list,now) runs once per frame before the depth-sorted loop: captures the canvas transform, merges the
   officials (08e), evaluates every pose and draws all shadows + foot contact shadows in one batch from sceneLight().
   PUPPET  14 bones in "unit" space (1 = standing height, feet at 0, y down): pelvis, spine/torso, neck/head, upper arm,
     forearm+hand ×2, thigh, shin, foot ×2. Legs are two-bone IK to ankle targets (feet planted), arms are FK angles
     (0 = straight down, +π/2 = forward, π = up). Side-on with a slight 3/4 turn (chest toward the camera; the back
     shows while running up-screen). Height = PL_H yd × pl.ht; width (limbs, pads) = BUILD[role] × pl.wt.
   PARTS  each part is an offscreen canvas per team uniform (helmet shell + stripe + decal + facemask, jersey torso +
     pads, sleeves, pants + stripe, socks, cleats, gloves, skin), soft gradient shading lit from the scene light side,
     a thin darker edge. Built lazily per resolution bucket (√2 steps of device px per unit) and kept; nothing is
     gradient-filled per frame. Numbers and helmet decals are drawn un-mirrored.
   ANIMATION  keyframed poses (17 floats: hx hy sp hd f0x f0y f1x f1y a0 a1 u0 e0 u1 e1 rot lift rx; index 0 = far
     side) eased between keys; the run cycle (8 keys, Catmull-Rom) advances with distance travelled and the stance foot
     is ground-locked, stride/cadence scale with speed; lower and upper body crossfade separately (~0.14 s) when the
     state changes. p.anim wins when an engine step sets it (p.animT counts down from ANIM_DUR[anim] seconds):
       throw catch dive tackle tackled stiff juke spin truck hurdle slide block swim rip swat kick punt snap kneel spike celebrate getup
     otherwise poses come from engine state (phase, velocity, engaged, fallP, lunge, throwT, stiff, play.*).
   Instant replay restores only x,y,z,fallP,phase,face,vx,vy, so transient flags are ignored while S.phase==='replay';
   gait is re-derived from the restored positions. Per-frame work allocates nothing.
   ========================================================= */
const TAU2=6.2832;
/* visual height vs the previous figures (2.9 yd standing): 0.9 → ≈2.6 yd standing, ≈2.4 yd in a full run */
const PLAYER_SCALE=.9;
const PL_H=2.9*PLAYER_SCALE;
const PB_AH=.04,PB_LT=.245,PB_LS=.235,PB_SP=.29,PB_NK=.118,PB_LU=.172,PB_LF=.148;
const ATH={now:-1,f:0,a:1,b:0,c:0,d:1,e:0,ff:0,L:null,Lk:null,dirs:[],rots:[],sh:'',glow:'',tn:null,sk:null,cols:new Map(),nums:new Map(),deadPlay:null,deadAt:0,car:null,gu:0,dt:0,t0:0,gen:1,lf:0,ref:null};
const ATH_L0={sx:.6,sy:.35,len:.5,a:.32,n:1,tint:'',glow:0};
const ANIM_DUR={throw:.35,catch:.4,dive:.4,tackle:.5,tackled:.6,stiff:.5,juke:.36,spin:.45,truck:.55,hurdle:.5,slide:.6,block:1,swim:.4,rip:.4,swat:.4,kick:.5,punt:.5,snap:.3,kneel:1,spike:.5,celebrate:2,getup:.6};
const ATJ={nx:0,ny:0};   // legacy: the uniform editor's side helmet (athHelmet) reads its centre from here
const ATH_T=new Float32Array(17),ATH_M=new Float64Array(6),ATH_JN=new Float64Array(24);
const ATH_LO=[0,1,4,5,6,7,8,9,14,15,16],ATH_UP=[2,3,10,11,12,13];
const athByY=(a,b)=>a.y-b.y;
const athE=u=>u<=0?0:u>=1?1:u*u*(3-2*u);

/* ---------- keyposes [hx,hy,sp,hd, f0x,f0y,f1x,f1y, a0,a1, u0,e0,u1,e1, rot,lift,rx] (unit = standing height) ---------- */
const KP_IDLE=[0,.5,.05,.03,-.055,.04,.06,.04,0,0,.06,.3,-.04,.36,0,0,0];
const KP_READY=[0,.43,.42,.15,-.1,.04,.1,.04,0,0,.5,1,.45,1.05,0,0,0];
const KP_LOOSE=[0,.46,.28,.1,-.09,.04,.09,.04,0,0,.2,.6,.15,.7,0,0,0];
const KP_WR=[.02,.45,.42,.15,-.17,.04,.1,.04,.3,0,-.2,.6,.3,.9,0,0,0];
const KP_RB=[0,.42,.62,.3,-.1,.04,.09,.04,0,0,-.15,.1,-.08,.05,0,0,0];
const KP_ST3=[-.02,.33,1.32,.62,-.21,.04,.02,.04,.35,.1,-.35,.05,.05,0,0,0,0];
const KP_ST4=[-.02,.33,1.34,.62,-.19,.04,.02,.04,.35,.1,.02,0,.05,0,0,0,0];
const KP_GUN=[0,.47,.18,.05,-.08,.04,.08,.04,0,0,.5,.95,.45,1,0,0,0];
const KP_CTR=[0,.4,.65,.3,-.08,.04,.07,.04,0,0,.4,.65,.35,.7,0,0,0];
const KP_BLK=[0,.4,.5,.3,-.24,.04,.08,.04,.5,0,1.25,.45,1.3,.35,0,0,0];
const KP_PLANT=[-.03,.41,-.12,-.05,-.12,.04,.2,.04,0,-.1,-.6,.7,1,.5,0,0,0];
const KP_KNEEL=[0,.27,.08,0,-.24,.04,.14,.04,.7,0,.3,.5,.25,.6,0,0,0];
const KP_LIE=[0,.5,.05,.3,-.04,.05,.05,.06,.5,.5,2.6,.4,2.75,.3,1.5,0,0];
const KP_DIVE=[0,.5,0,-.25,-.1,.08,-.04,.05,.5,.5,2.7,.1,2.85,.05,1.25,0,0];
const KP_HURD=[0,.5,.35,.15,-.25,.3,.28,.2,.5,.3,1.6,.4,1.9,.3,.05,0,0];
const KP_SLIDE=[0,.4,-.3,-.2,.3,.06,.36,.14,-.2,-.2,.5,.8,.6,1.7,-1,0,0];
const KP_HEIS=[0,.47,.05,0,-.03,.04,.13,.26,0,.4,-.1,2,1.55,0,0,0,0];
const KP_LEAP=[0,.48,-.05,-.2,-.1,.14,.08,.2,.4,.3,2.95,.15,3.05,.1,0,0,0];
const KP_BOW=[-.02,.49,.95,.6,-.06,.04,.06,.04,0,0,.6,.4,.55,.45,0,0,0];
/* full-body clips: [[u,pose],…] eased between keys */
const CL_THROW=[[0,[-.02,.47,-.06,0,-.15,.04,.1,.04,.1,0,1.45,.25,-1.8,-1.2,0,0,0]],[.3,[0,.46,.02,0,-.16,.04,.17,.07,.3,0,1.1,.8,-2.55,-.4,0,0,0]],
  [.45,[.04,.45,.18,.05,-.16,.05,.2,.04,.55,0,.5,1.3,-3.7,-.2,0,0,0]],[.65,[.07,.44,.36,.1,-.12,.07,.2,.04,.7,0,.15,1.4,-4.6,.25,0,0,0]],[1,[.06,.45,.38,.12,-.08,.05,.2,.04,.5,0,-.15,1.5,-5.4,.55,0,0,0]]];
const CL_KICK=[[0,[-.05,.47,.1,.12,-.06,.04,.12,.06,0,.2,.5,.5,-.5,.6,0,0,0]],[.3,[.05,.46,.05,.15,.12,.04,-.26,.2,0,.9,1,.4,-.6,.5,0,0,0]],
  [.5,[.08,.47,-.08,.2,.12,.04,.24,.14,0,.5,.9,.3,-.3,.4,0,0,0]],[.72,[.06,.5,-.22,.15,.12,.06,.4,.6,.3,.6,1.5,.2,-.5,.3,0,0,0]],[1,[.04,.48,-.05,.1,.08,.04,.16,.12,0,.3,.9,.4,-.3,.5,0,0,0]]];
const CL_PUNT=[[0,[-.04,.47,.12,.2,-.07,.04,.1,.05,0,.1,1.1,.6,1.15,.55,0,0,0]],[.3,[.04,.46,.1,.25,.12,.04,-.2,.16,0,.8,.9,.5,.8,.6,0,0,0]],
  [.5,[.08,.48,-.12,.15,.12,.05,.3,.3,.2,.4,1.3,.3,-.2,.4,0,0,0]],[.75,[.05,.52,-.3,.05,.12,.08,.36,.78,.4,.5,1.7,.2,-.6,.3,0,0,0]],[1,[.03,.48,-.05,.1,.08,.04,.16,.14,0,.3,1,.4,-.3,.5,0,0,0]]];
const CL_TACKLE=[[0,[0,.42,.6,.35,-.22,.04,.05,.04,.4,0,1.4,1,1.5,.9,.2,0,0]],[.5,[0,.44,.55,.3,-.3,.06,-.05,.08,.6,.4,1.5,1,1.6,.9,.85,0,0]],[1,[0,.46,.3,.1,-.12,.06,-.04,.06,.4,.3,1.6,1.1,1.7,1,1.42,0,0]]];
const CL_TACKLED=[[0,[0,.47,.15,-.1,-.08,.04,.08,.04,0,0,-.4,.6,1.6,.6,0,0,0]],[.4,[0,.45,.1,-.2,-.18,.06,.06,.1,.3,.2,1,.4,2.2,.2,.55,0,0]],[1,KP_LIE]];
const CL_GETUP=[[0,KP_LIE],[.45,[0,.27,.35,.15,-.22,.04,.13,.04,.7,0,.8,.6,.5,.5,.15,0,0]],[1,KP_IDLE]];
const CL_JUKE=[[0,[0,.46,.2,.1,-.1,.04,.12,.04,0,0,0,0,0,0,0,0,0]],[.35,[-.05,.39,.12,.05,-.22,.04,.19,.04,.3,0,0,0,0,0,0,0,0]],[1,[.03,.42,.25,.1,-.12,.05,.15,.06,.2,0,0,0,0,0,0,0,0]]];
/* upper-body poses / clips [sp,hd,u0,e0,u1,e1] */
const UP_AIM=[-.06,0,1.45,.25,-1.8,-1.2],UP_HOLD=[.08,.02,.5,1.6,.42,1.75],UP_SEC=[.15,.15,.45,1.9,.4,1.95],UP_PUSH=[.5,.3,1.25,.45,1.3,.35],UP_PRO=[.32,.15,.85,1.3,.8,1.35],
  UP_WRAP=[.4,.2,1.45,1.05,1.55,.95],UP_BAL=[.1,0,-.7,.7,1,.5],UP_FLAIL=[-.1,-.2,2.5,-.25,2.2,-.15],UP_SWAT=[-.05,-.3,2,.4,2.95,.08],UP_UP=[-.05,-.2,2.95,.08,3.05,.05],
  UP_POINT=[0,-.25,.25,.35,2.95,0],UP_FLEX=[-.05,-.1,1.7,1.9,1.75,1.95],UP_SALUTE=[0,-.05,.15,.3,2.2,2.15],UP_FWD=[0,0,.1,.25,1.57,0],UP_SPOT=[0,.05,.1,.25,.95,0];
const CU_SWIM=[[0,[.3,.1,1.2,.6,1.1,.5]],[.5,[.35,.1,2.9,.3,.9,.6]],[1,[.4,.1,4.2,.3,.6,.8]]];
const CU_RIP=[[0,[.35,.1,1.2,.5,.3,1.2]],[.5,[.3,0,1,.6,1.6,1.6]],[1,[.25,-.1,.9,.7,2.6,.9]]];
const CU_SPIKE=[[0,[-.1,-.1,.3,.3,2.9,.1]],[.4,[.5,.3,.2,.4,.2,.2]],[1,[.35,.2,.2,.4,.3,.3]]];
const CU_FLAG=[[0,[0,0,.1,.2,2.6,.2]],[1,[0,0,.1,.2,.9,.1]]];
const CU_CATCH=[[0,[.05,-.25,1.9,.15,2,.12]],[.45,[.05,-.2,1.75,.2,1.85,.15]],[.72,UP_SEC],[1,[.12,.1,.4,1.9,-.1,2]]];
const CU_SNAP=[[0,[1.32,.62,-.35,.05,.05,0]],[1,[1.25,.6,-.35,.05,-.95,.1]]];
/* run / backpedal cycles: one leg's ankle path, 8 keys [x in cycle-lengths, height in lift units, toe pitch]; the
   other leg is half a cycle later. Keys 0–3 are the stance (colinear: the planted foot is locked to the ground). */
const RUNK=[[.1875,0,-.12],[.0625,0,0],[-.0625,0,.12],[-.1875,0,.55],[-.27,.5,.95],[-.12,1,.7],[.12,.78,.15],[.27,.3,-.2]];
const BACKK=[[-.1875,0,.12],[-.0625,0,.08],[.0625,0,.05],[.1875,0,.3],[.22,.45,.5],[.05,.8,.35],[-.15,.6,.15],[-.25,.25,.08]];
const ARMK=[[-.55,1.25],[-.35,1.35],[-.05,1.45],[.3,1.65],[.6,1.85],[.4,1.75],[.05,1.55],[-.3,1.35]];
const ATH_CR=[0,0,0];
function athCR(K,ps){const n=K.length,q=((ps%1)+1)%1*n,i=q|0,t=q-i,t2=t*t,t3=t2*t,A=K[(i+n-1)%n],B=K[i],C=K[(i+1)%n],D=K[(i+2)%n];
  for(let j=0;j<3;j++){const p0=A[j],p1=B[j],p2=C[j],p3=D[j];ATH_CR[j]=.5*(2*p1+(p2-p0)*t+(2*p0-5*p1+4*p2-p3)*t2+(3*p1-p0-3*p2+p3)*t3)}return ATH_CR}
/* sample a keyframed clip into T (full pose, or the 6 upper channels when up) */
function athClip(T,K,u,up){let i=0;while(i<K.length-2&&u>K[i+1][0])i++;const a=K[i],b=K[i+1],w=athE(clamp((u-a[0])/((b[0]-a[0])||1),0,1)),A=a[1],B=b[1];
  if(up){for(let j=0;j<6;j++)T[ATH_UP[j]]=A[j]+(B[j]-A[j])*w}else for(let j=0;j<17;j++)T[j]=A[j]+(B[j]-A[j])*w}
function athClipLo(T,K,u){let i=0;while(i<K.length-2&&u>K[i+1][0])i++;const a=K[i],b=K[i+1],w=athE(clamp((u-a[0])/((b[0]-a[0])||1),0,1)),A=a[1],B=b[1];for(const j of ATH_LO)T[j]=A[j]+(B[j]-A[j])*w}
const athSet=(T,K)=>{for(let j=0;j<17;j++)T[j]=K[j]};
const athUp=(T,U)=>{for(let j=0;j<6;j++)T[ATH_UP[j]]=U[j]};
const athMixP=(T,K,w)=>{for(let j=0;j<17;j++)T[j]+=(K[j]-T[j])*w};

/* ---------- frame setup, colours ---------- */
function athFrame(c,now){
  if(ATH.now===now)return;ATH.dt=ATH.now<0||S.photo||S.paused?0:clamp((now-ATH.now)/1000,0,.05);ATH.now=now;ATH.f++;
  const m=c.getTransform();ATH.a=m.a;ATH.b=m.b;ATH.c=m.c;ATH.d=m.d;ATH.e=m.e;ATH.ff=m.f;
  const L=typeof sceneLight==='function'?sceneLight():ATH_L0;ATH.L=L;
  if(ATH.Lk!==L){ATH.Lk=L;ATH.dirs.length=0;ATH.rots.length=0;const n=Math.max(1,L.n|0);
    for(let i=0;i<n;i++){const a=i*TAU2/n,ca=Math.cos(a),sa=Math.sin(a),x=L.sx*ca-L.sy*sa,y=L.sx*sa+L.sy*ca;ATH.dirs.push(x,y);ATH.rots.push(Math.atan2(y,x))}
    ATH.sh=`rgba(0,0,0,${((+L.a||.3)*(L.n>1?.62:1)).toFixed(3)})`;ATH.glow=L.glow>.3?`rgba(255,255,255,${(L.glow*.32).toFixed(3)})`:'';ATH.lf=L.sx<0?1:0}
  if(ATH.tn!==(L.tint||'')){ATH.tn=L.tint||'';const T=athTint(ATH.tn);ATH.sk=TONES.map(t=>[athMix(t,T),athMix(shade(t,-.25),T)]);ATH.gen++;ATH.ref=null}
  if(S.phase==='dead'&&play&&ATH.deadPlay!==play){ATH.deadPlay=play;ATH.deadAt=now}
  ATH.car=null;
  if(play&&ball&&ball.state==='held'){if(S.phase!=='replay')ATH.car=play.carrier;else{let bd=1.3;for(const p of P){const d=Math.abs(p.x-ball.x)+Math.abs(p.y-ball.y);if(d<bd){bd=d;ATH.car=p}}}}
}
function athTint(s){const m=/rgba?\(([^)]+)\)/.exec(s||'');if(!m)return null;const v=m[1].split(',').map(Number);return [v[0],v[1],v[2],(v.length>3?v[3]:1)*.7]}
function athMix(h,T){if(!T||!h||h[0]!=='#'||h.length<7)return h;const n=parseInt(h.slice(1,7),16),a=T[3],f=(x,y)=>Math.round(x+(y-x)*a);return '#'+((1<<24)+(f(n>>16,T[0])<<16)+(f(n>>8&255,T[1])<<8)+f(n&255,T[2])).toString(16).slice(1)}
const athHex=h=>{h=String(h||'#888888');if(h[0]==='#'&&h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];return h[0]==='#'&&h.length>=7?h.slice(0,7):'#888888'};
/* draw-ready colours from a resolved uniform set U (10c field names), m = tint mapper; used by athCols and the editor preview */
function athMake(team,U,m){const j=U.j,n=U.n,gl=lum(j)>.8?team.c1:contrasty(n,j)?n:inkOn(j);
  return {j:m(j),jD:m(shade(j,-.28)),jH:m(shade(j,.22)),p:m(U.p),pD:m(shade(U.p,-.3)),ps:m(U.pc),pn:U.ps|0,h:m(U.h),hD:m(shade(U.h,-.4)),hs:m(U.hc),hn:U.hs|0,dc:m(U.dc),dk:U.d||'L',
    s:m(U.k),sD:m(shade(U.k,-.3)),mask:m(U.m),gl:m(gl),glD:m(shade(gl,-.3)),num:n,numO:U.no||(lum(n)>.55?'rgba(0,0,0,.55)':'rgba(255,255,255,.65)'),
    fin:U.hf||'g',matte:U.hf==='m',sl:U.sl|0,sc:m(U.sc),scD:m(shade(U.sc,-.28)),dec:null,decK:'',lgF:-1,lg:null,decN:null,spr:new Map()}}
function athCols(team){
  const st=uniStyle(team),o=S.home&&S.away?(team===S.home?S.away:S.home).id*2+(hostT()===team?1:0):-1;let e=ATH.cols.get(team);
  if(e&&e.st===st&&e.v===UNI_VER&&e.o===o&&e.c1===team.c1&&e.c2===team.c2&&e.tn===ATH.tn)return e;
  const T=athTint(ATH.tn);e=athMake(team,uniColors(team),h=>athMix(h,T));Object.assign(e,{st,v:UNI_VER,o,c1:team.c1,c2:team.c2,tn:ATH.tn,team});
  ATH.cols.set(team,e);ATH.gen++;return e;
}
function athNum(e,num){const k=e.num+e.numO+num;let cv=ATH.nums.get(k);if(cv)return cv;
  cv=document.createElement('canvas');cv.width=72;cv.height=52;const g=cv.getContext('2d'),t=String(num);
  g.font='900 44px -apple-system,system-ui,"Helvetica Neue",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=7;g.strokeStyle=e.numO;g.strokeText(t,36,28);g.fillStyle=e.num;g.fillText(t,36,28);ATH.nums.set(k,cv);return cv}
/* helmet decal by the set's style: G imported logo (teamLogo, 02c; a letter until it loads), M the team's badge
   (10c badge designer, generated shield otherwise), N the player's number, L letter, S star, B bolt, X none */
function athDecal(team,e,num){
  let k=e.dk;if(k==='X')return null;
  if(k==='G'){if(e.lgF!==ATH.f){e.lgF=ATH.f;e.lg=typeof teamLogo==='function'?teamLogo(team):null}if(!e.lg)k='L'}
  const font='900 52px -apple-system,system-ui,"Helvetica Neue",Arial,sans-serif';
  if(k==='N'){const mp=e.decN||(e.decN=new Map());let cv=mp.get(num);if(cv)return cv;cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),t=String(num==null?'':num);
    g.font=t.length>1?'900 40px -apple-system,system-ui,"Helvetica Neue",Arial,sans-serif':font;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=5;g.strokeStyle=e.hD;g.fillStyle=e.dc;g.strokeText(t,32,35);g.fillText(t,32,35);mp.set(num,cv);return cv}
  if(e.dec&&e.decK===k)return e.dec;
  const cv=e.dec||document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,64,64);e.decK=k;e.dec=cv;
  if(k==='G'){const w=e.lg.naturalWidth||1,h=e.lg.naturalHeight||1,s=58/Math.max(w,h);try{g.drawImage(e.lg,32-w*s/2,32-h*s/2,w*s,h*s)}catch(_){}return cv}
  if(k==='M'&&typeof bdgCanvas==='function'){const b=bdgCanvas(team,64,true);g.drawImage(b,32-27,2,54,60);return cv}
  g.fillStyle=e.dc;g.strokeStyle=e.hD;g.lineWidth=5;g.lineJoin='round';
  if(k==='S'){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?12:28;g.lineTo(32+Math.cos(a)*r,34+Math.sin(a)*r)}g.closePath();g.stroke();g.fill()}
  else if(k==='B'){g.beginPath();g.moveTo(40,3);g.lineTo(13,37);g.lineTo(30,37);g.lineTo(23,61);g.lineTo(51,25);g.lineTo(34,25);g.closePath();g.stroke();g.fill()}
  else{g.font=font;g.textAlign='center';g.textBaseline='middle';const t=(team.abbr||'U')[0];g.strokeText(t,32,35);g.fillText(t,32,35)}
  return cv;
}
/* body scale from BUILD (position) and the player's real height/weight; accessories hashed from the player id */
function athBody(p){if(p._bh)return;const pl=p.pl||{},sz=(typeof SIZE!=='undefined'&&SIZE[pl.pos])||null,B=(typeof BUILD!=='undefined'&&BUILD[p.role])||[1,1];
  const ht=pl.ht||(sz?sz[0]:73),wt=pl.wt||(sz?sz[2]:205),aw=sz?sz[2]:wt;
  p._bh=clamp(ht/73,.93,1.07)*(.7+.3*B[1]);p._bw=B[0]*clamp(1+(wt-aw)/aw*.85,.9,1.14);p._acc=((pl.id|0)*2654435761)>>>0}

/* ---------- legacy side helmet (uniform editor preview, 10c) ---------- */
const athStripe=(c,x,y,r,k,w)=>{c.lineWidth=r*w;c.beginPath();c.arc(x,y,r*k,1.06*Math.PI,1.8*Math.PI);c.stroke()};
function athHelmet(c,hh,e,skin,team,vis,fs,num){const x=ATJ.nx,y=ATJ.ny,r=hh*.138,hn=e.hn;
  c.fillStyle=skin;c.beginPath();c.arc(x+r*.3,y+r*.2,r*.62,0,TAU2);c.fill();
  c.fillStyle=e.hD;c.beginPath();c.arc(x,y,r,.4*Math.PI,1.93*Math.PI);c.lineTo(x+r*.32,y+r*.16);c.closePath();c.fill();
  c.fillStyle=e.h;c.beginPath();c.arc(x+r*.03,y-r*.07,r*.89,.43*Math.PI,1.93*Math.PI);c.lineTo(x+r*.3,y+r*.1);c.closePath();c.fill();
  if(e.fin==='c'){c.fillStyle='rgba(255,255,255,.34)';c.beginPath();c.ellipse(x-r*.06,y-r*.3,r*.72,r*.2,-.25,0,TAU2);c.fill();c.fillStyle='rgba(0,0,0,.24)';c.beginPath();c.ellipse(x-r*.12,y+r*.42,r*.6,r*.16,-.15,0,TAU2);c.fill()}
  if(hn){c.strokeStyle=e.hs;if(hn===1)athStripe(c,x,y,r,.84,.24);else if(hn===2){athStripe(c,x,y,r,.88,.1);athStripe(c,x,y,r,.68,.1)}else{athStripe(c,x,y,r,.79,.14);athStripe(c,x,y,r,.94,.055);athStripe(c,x,y,r,.62,.055)}}
  if(r>=4.2){const d=athDecal(team,e,num);if(d){const ds=r*1.02,cx=x-r*.16,cy=y+r*.1;c.translate(cx,cy);c.scale(fs,1);c.drawImage(d,-ds/2,-ds/2,ds,ds);c.scale(fs,1);c.translate(-cx,-cy)}}
  c.fillStyle=e.matte?'rgba(255,255,255,.16)':e.fin==='c'?'rgba(255,255,255,.85)':'rgba(255,255,255,.5)';c.beginPath();c.ellipse(x-r*.1,y-r*.56,r*.38,r*.15,-.3,0,TAU2);c.fill();
  if(vis){c.fillStyle='rgba(18,20,30,.85)';c.beginPath();c.moveTo(x+r*.52,y-r*.1);c.lineTo(x+r*1.04,y-r*.04);c.lineTo(x+r*1.02,y+r*.32);c.lineTo(x+r*.56,y+r*.3);c.closePath();c.fill()}
  c.strokeStyle=e.mask;c.lineWidth=Math.max(.8,r*.15);c.beginPath();
  c.moveTo(x+r*.6,y-r*.14);c.lineTo(x+r*1.14,y-r*.04);c.lineTo(x+r*1.08,y+r*.66);c.lineTo(x+r*.66,y+r*.86);
  c.moveTo(x+r*.66,y+r*.36);c.lineTo(x+r*1.12,y+r*.34);c.stroke()}

/* ---------- cached part sprites (unit space: a bone runs from its joint at 0,0 down +y) ---------- */
function athCv(R,x0,y0,x1,y1){const w=Math.ceil((x1-x0)*R)+4,h=Math.ceil((y1-y0)*R)+4,cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const g=cv.getContext('2d');g.setTransform(R,0,0,R,2-x0*R,2-y0*R);g.lineJoin='round';g.lineCap='round';return {cv,g,x:x0-2/R,y:y0-2/R,w:w/R,h:h/R,R}}
/* soft cylinder shading across x, lit from -x (lx<0) or +x */
function athGr(g,col,x0,x1,lx,hi,lo){col=athHex(col);const gr=g.createLinearGradient(lx<0?x0:x1,0,lx<0?x1:x0,0);
  gr.addColorStop(0,shade(col,(hi||.24)*.4));gr.addColorStop(.24,shade(col,hi||.24));gr.addColorStop(.52,col);gr.addColorStop(.84,shade(col,-(lo||.26)));gr.addColorStop(1,shade(col,-(lo||.26)*1.5));return gr}
function athEdge(g,col,R,k){g.strokeStyle=shade(athHex(col),-.55);g.globalAlpha=k||.85;g.lineWidth=1.25/R;g.stroke();g.globalAlpha=1}
function athThigh(R,e,lx,K){const o=athCv(R,-.075,-.06,.075,.27),g=o.g;
  const path=()=>{g.beginPath();g.moveTo(-.058,-.012);g.quadraticCurveTo(-.07,.09,-.049,.17);g.quadraticCurveTo(-.04,.225,-.037,.252);g.lineTo(.041,.256);g.quadraticCurveTo(.054,.205,.051,.17);g.quadraticCurveTo(.068,.08,.053,0);g.quadraticCurveTo(0,-.05,-.058,-.012);g.closePath()};
  path();g.fillStyle=athGr(g,e.p,-.07,.068,lx);g.fill();g.save();g.clip();
  if(e.pn&&!K){g.fillStyle=e.ps;const n=e.pn,w=n===1?.017:.008;for(let i=0;i<n;i++){const ox=(i-(n-1)/2)*.016-.004;g.beginPath();g.moveTo(ox-w/2-.004,-.06);g.lineTo(ox+w/2-.004,-.06);g.lineTo(ox+w/2+.004,.27);g.lineTo(ox-w/2+.004,.27);g.fill()}}
  if(K){g.fillStyle=K;for(const ox of [-.045,-.005,.035]){g.fillRect(ox,-.06,.018,.33)}}
  g.fillStyle='rgba(255,255,255,.13)';g.beginPath();g.ellipse(.03,.215,.024,.03,0,0,TAU2);g.fill();
  g.fillStyle='rgba(0,0,0,.14)';g.fillRect(-.08,.238,.16,.03);g.restore();path();athEdge(g,e.p,R);return o}
function athShin(R,e,lx,sock){const o=athCv(R,-.065,-.03,.055,.25),g=o.g;
  const path=()=>{g.beginPath();g.moveTo(-.037,-.014);g.quadraticCurveTo(-.06,.06,-.042,.14);g.quadraticCurveTo(-.031,.2,-.025,.238);g.lineTo(.022,.241);g.quadraticCurveTo(.03,.15,.034,.06);g.quadraticCurveTo(.046,0,.041,-.014);g.closePath()};
  path();g.fillStyle=athGr(g,sock||e.s,-.06,.046,lx);g.fill();g.save();g.clip();g.fillStyle=athGr(g,e.p,-.06,.046,lx);g.fillRect(-.07,-.04,.14,.085);
  g.fillStyle='rgba(0,0,0,.28)';g.fillRect(-.07,.045,.14,.008);g.restore();path();athEdge(g,sock||e.s,R);return o}
function athFoot(R,col,lx,spat){const o=athCv(R,-.045,-.025,.1,.055),g=o.g;
  const path=()=>{g.beginPath();g.moveTo(-.027,-.014);g.quadraticCurveTo(-.04,.018,-.035,.043);g.lineTo(.072,.047);g.quadraticCurveTo(.096,.046,.092,.03);g.quadraticCurveTo(.074,.008,.03,-.003);g.lineTo(.022,-.018);g.closePath()};
  path();g.fillStyle=athGr(g,col,-.04,.095,lx,.3,.3);g.fill();g.save();g.clip();
  const lt=lum(athHex(col))>.5;g.fillStyle=lt?'#9ba1aa':'#3b3f47';g.fillRect(-.05,.037,.16,.02);
  g.strokeStyle=lt?'rgba(0,0,0,.25)':'rgba(255,255,255,.35)';g.lineWidth=.006;g.beginPath();g.moveTo(-.01,.03);g.quadraticCurveTo(.03,.012,.075,.03);g.stroke();
  if(spat){g.fillStyle=athGr(g,'#f2f3f5',-.04,.095,lx,.15,.2);g.fillRect(-.05,-.03,.085,.045)}g.restore();path();athEdge(g,col,R,.7);return o}
function athUArm(R,e,lx,arm,ref){const o=athCv(R,-.07,-.07,.07,.2),g=o.g;
  g.beginPath();g.moveTo(-.033,.04);g.quadraticCurveTo(-.034,.14,-.027,.172);g.arc(0,.172,.027,Math.PI,0,true);g.quadraticCurveTo(.04,.11,.035,.04);g.closePath();
  g.fillStyle=athGr(g,arm,-.04,.04,lx);g.fill();athEdge(g,arm,R,.6);
  const sl=()=>{g.beginPath();g.moveTo(-.06,.02);g.arc(0,.008,.06,Math.PI*.98,Math.PI*.02,false);g.quadraticCurveTo(.06,.06,.042,ref?.075:.098);g.lineTo(-.04,ref?.072:.095);g.quadraticCurveTo(-.058,.06,-.06,.02);g.closePath()};
  const jc=ref?'#f2f3f5':e.j;sl();g.fillStyle=athGr(g,jc,-.062,.062,lx);g.fill();g.save();g.clip();
  if(ref){g.fillStyle='#16181c';for(const ox of [-.05,-.015,.02])g.fillRect(ox,-.07,.017,.2)}
  else if(e.sl){g.fillStyle=e.sc;for(let i=0;i<e.sl;i++)g.fillRect(-.07,.072-i*.014,.14,.008)}
  g.fillStyle='rgba(255,255,255,.12)';g.beginPath();g.ellipse(-.008*Math.sign(lx||-1),-.03,.04,.018,0,0,TAU2);g.fill();g.restore();sl();athEdge(g,jc,R);return o}
function athFArm(R,arm,glove,lx){const o=athCv(R,-.05,-.04,.055,.215),g=o.g;
  g.beginPath();g.arc(0,0,.027,Math.PI,0,false);g.quadraticCurveTo(.034,.05,.021,.15);g.lineTo(-.021,.15);g.quadraticCurveTo(-.034,.05,-.027,0);g.closePath();g.fillStyle=athGr(g,arm,-.034,.034,lx);g.fill();athEdge(g,arm,R,.6);
  g.beginPath();g.moveTo(-.024,.138);g.quadraticCurveTo(-.036,.17,-.026,.198);g.quadraticCurveTo(.0,.214,.026,.2);g.quadraticCurveTo(.04,.17,.024,.138);g.closePath();g.fillStyle=athGr(g,glove,-.034,.036,lx,.3,.3);g.fill();athEdge(g,glove,R,.7);return o}
/* jersey torso + shoulder pads + pants seat (origin at the hip joint, spine up −y); back = 3/4 back view; K = official's stripes */
function athTorso(R,e,lx,back,K){const o=athCv(R,-.15,-.37,.16,.1),g=o.g,jc=K?'#f2f3f5':e.j,pc=K?'#1a1c20':e.p;g.scale(.86,1);
  const path=()=>{g.beginPath();g.moveTo(-.074,.06);g.quadraticCurveTo(-.085,0,-.068,-.06);g.quadraticCurveTo(-.09,-.16,-.124,-.262);g.quadraticCurveTo(-.13,-.318,-.085,-.336);
    g.quadraticCurveTo(-.03,-.352,.02,-.338);g.quadraticCurveTo(.1,-.34,.132,-.292);g.quadraticCurveTo(.142,-.25,.118,-.215);g.quadraticCurveTo(.09,-.15,.084,-.08);g.quadraticCurveTo(.08,-.02,.07,.01);g.quadraticCurveTo(.064,.06,.04,.075);g.quadraticCurveTo(-.02,.088,-.074,.06);g.closePath()};
  path();g.fillStyle=athGr(g,jc,-.13,.14,lx,.22,.28);g.fill();g.save();g.clip();
  if(K){g.fillStyle='#16181c';for(let x=-.14;x<.16;x+=.064)g.fillRect(x,-.37,.026,.36)}
  /* pants from the belt down, belt, jersey hem shadow */
  g.fillStyle=athGr(g,pc,-.09,.08,lx);g.fillRect(-.16,-.025,.33,.13);g.fillStyle='rgba(0,0,0,.32)';g.fillRect(-.16,-.03,.33,.012);
  if(!K&&e.pn){g.fillStyle=e.ps;g.fillRect(-.012,-.018,.016,.12)}
  g.fillStyle='rgba(0,0,0,.16)';g.fillRect(-.16,-.05,.33,.02);
  /* shoulder pads: crown highlight, a seam under the pad edge, the near cap */
  g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.ellipse(-.01,-.315,.1,.026,.04,0,TAU2);g.fill();
  g.strokeStyle='rgba(0,0,0,.16)';g.lineWidth=.006;g.beginPath();g.moveTo(-.12,-.25);g.quadraticCurveTo(0,-.225,.125,-.24);g.stroke();
  /* collar */
  const cc=K?'#16181c':e.sc||e.jD;g.fillStyle=cc;
  if(back){g.beginPath();g.ellipse(-.03,-.338,.05,.012,0,0,TAU2);g.fill()}else{g.beginPath();g.moveTo(.0,-.344);g.lineTo(.065,-.338);g.lineTo(.038,-.305);g.closePath();g.fill();g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.moveTo(.012,-.34);g.lineTo(.055,-.336);g.lineTo(.036,-.314);g.closePath();g.fill()}
  /* soft side-seam darkening toward the shaded edge and a lower-back AO band */
  g.fillStyle='rgba(0,0,0,.1)';g.beginPath();g.ellipse(lx<0?.1:-.1,-.12,.04,.16,0,0,TAU2);g.fill();
  g.restore();path();athEdge(g,jc,R);return o}
/* helmet (or an official's cap) with face, facemask, stripe, decal; fd = facing on screen (sprite is drawn un-mirrored) */
function athHead(R,e,team,fd,lx,skin,skinD,vis,num,cap){const o=athCv(R,-.105,-.105,.125,.13),g=o.g,X=x=>x*fd;
  /* neck + face */
  g.fillStyle=skinD;g.beginPath();g.moveTo(X(-.03),.035);g.lineTo(X(-.034),.125);g.lineTo(X(.04),.125);g.lineTo(X(.04),.03);g.closePath();g.fill();
  g.fillStyle=athGr(g,skin,-.09,.1,lx,.18,.2);g.beginPath();g.ellipse(X(.04),.025,.05,.058,0,0,TAU2);g.fill();
  if(cap){const cc=cap;g.fillStyle=athGr(g,skin,-.08,.08,lx,.2,.25);g.beginPath();g.ellipse(X(.005),.0,.066,.072,0,0,TAU2);g.fill();
    g.fillStyle=skinD;g.beginPath();g.ellipse(X(-.02),.012,.012,.018,0,0,TAU2);g.fill();
    g.fillStyle=athGr(g,cc,-.07,.07,lx,.2,.3);g.beginPath();g.moveTo(X(-.07),-.002);g.quadraticCurveTo(X(-.07),-.075,X(0),-.077);g.quadraticCurveTo(X(.068),-.075,X(.07),-.012);g.closePath();g.fill();athEdge(g,cc,R,.6);
    g.fillStyle=shade(athHex(cc),-.25);g.beginPath();g.moveTo(X(.05),-.016);g.quadraticCurveTo(X(.1),-.02,X(.118),-.004);g.lineTo(X(.06),-.002);g.closePath();g.fill();
    if(cap==='#F4F5F7'){g.strokeStyle='#16181c';g.lineWidth=.008;g.beginPath();g.moveTo(X(-.066),-.01);g.quadraticCurveTo(X(0),-.08,X(.066),-.02);g.stroke()}
    return o}
  /* shell */
  const shell=()=>{g.beginPath();g.moveTo(X(.068),.012);g.quadraticCurveTo(X(.084),-.03,X(.06),-.06);g.quadraticCurveTo(X(.02),-.086,X(-.03),-.074);g.quadraticCurveTo(X(-.082),-.056,X(-.082),-.004);
    g.quadraticCurveTo(X(-.08),.04,X(-.05),.066);g.lineTo(X(-.008),.07);g.quadraticCurveTo(X(.02),.07,X(.03),.05);g.lineTo(X(.035),.03);g.quadraticCurveTo(X(.05),.012,X(.068),.012);g.closePath()};
  shell();const gr=g.createLinearGradient(lx<0?-.07:.07,-.08,lx<0?.06:-.06,.07);const hc=athHex(e.h);
  gr.addColorStop(0,shade(hc,e.matte?.12:.3));gr.addColorStop(.35,hc);gr.addColorStop(.8,shade(hc,-.3));gr.addColorStop(1,shade(hc,-.45));g.fillStyle=gr;g.fill();
  g.save();g.clip();
  if(e.fin==='c'){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(X(-.01),.05,.09,.028,0,0,TAU2);g.fill()}
  if(e.hn){g.strokeStyle=e.hs;const n=e.hn,w=n===1?.022:.009;g.lineWidth=w;for(let i=0;i<Math.min(3,n);i++){const k=n===1?0:n===2?(i?.014:-.014):(i-1)*.02;g.beginPath();g.moveTo(X(.078),-.04+k*.4);g.quadraticCurveTo(X(.02),-.088+k,X(-.06),-.064+k*.6);g.quadraticCurveTo(X(-.084),-.04+k*.3,X(-.088),-.0);g.stroke()}}
  const dcv=athDecal(team,e,num);if(dcv&&e.dk!=='N'){const ds=.06;g.save();g.translate(X(-.016),.0);g.drawImage(dcv,-ds/2,-ds/2,ds,ds);g.restore()}
  /* specular */
  g.fillStyle=e.matte?'rgba(255,255,255,.13)':e.fin==='c'?'rgba(255,255,255,.8)':'rgba(255,255,255,.45)';g.beginPath();g.ellipse(X(lx<0?-.022:.012),-.052,.03,.012,lx<0?-.35*fd:.35*fd,0,TAU2);g.fill();
  g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(X(-.03),.062,.06,.012,0,0,TAU2);g.fill();
  g.restore();shell();athEdge(g,e.h,R,.8);
  /* ear hole + jaw pad */
  g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.arc(X(-.012),.032,.006,0,TAU2);g.fill();
  if(vis){g.fillStyle='rgba(16,20,30,.82)';g.beginPath();g.moveTo(X(.062),-.004);g.lineTo(X(.1),.0);g.lineTo(X(.098),.024);g.lineTo(X(.058),.026);g.closePath();g.fill()}
  /* facemask: dark under-stroke then the colour */
  const fm=()=>{g.beginPath();g.moveTo(X(.066),.0);g.lineTo(X(.104),.004);g.quadraticCurveTo(X(.11),.04,X(.096),.068);g.lineTo(X(.04),.078);g.moveTo(X(.07),.034);g.lineTo(X(.106),.034);g.moveTo(X(.068),.056);g.lineTo(X(.1),.056)};
  fm();g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=.016;g.stroke();fm();g.strokeStyle=e.mask;g.lineWidth=.009;g.stroke();
  g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=.003;g.beginPath();g.moveTo(X(.07),-.002);g.lineTo(X(.102),.002);g.stroke();
  return o}

/* per-team sprite store: e.spr[key] (lazy) */
function athSp(e,k,mk){let s=e.spr.get(k);if(!s){s=mk();e.spr.set(k,s)}return s}
const ATH_BK=[64,90,128,181,256,362,512,724];
function athRes(px){for(const b of ATH_BK)if(b>=px*.92)return b;return 724}
/* the official's kit acts like a team entry */
function athRefE(){if(ATH.ref&&ATH.ref.tn===ATH.tn)return ATH.ref;const T=athTint(ATH.tn),m=h=>athMix(h,T);
  return ATH.ref={tn:ATH.tn,j:m('#F2F3F5'),jD:m('#C3C7CE'),p:m('#1C1E23'),pD:m('#0e0f12'),s:m('#16181c'),sD:'#0b0c0f',pn:0,sl:0,sc:'#16181c',h:'#16181c',spr:new Map()}}
/* resolve one figure's sprite set (cached on its anim state until the uniform, tint or resolution changes) */
function athSprites(p,a,e,R,ref){
  if(a.Se===e&&a.SR===R&&a.Sg===ATH.gen)return a.S;
  const acc=p._acc|0,tone=ref?p.tone|0:(p.pl&&p.pl.tone)|0,sk=ATH.sk[tone]||ATH.sk[1],slv=ref?0:(acc>>4)%5,wc=!ref&&(acc>>8)%6===0,spat=!ref&&(acc>>11)%4===0;
  const vis=!ref&&(acc%9)<((p.role==='WR'||p.role==='CB'||p.role==='S'||p.role==='RB')?3:1);
  const arm=slv===1?'#1b1d22':slv===2?'#e9ebee':sk[0],cl=wc?'#eceef1':'#17191d',gl=ref?sk[0]:e.gl;
  const K=ref?'#16181c':'',S=a.S||(a.S={});
  for(let v=0;v<2;v++){const lx=v?1:-1;
    (S.th||(S.th=[]))[v]=athSp(e,R+'th'+v+K,()=>athThigh(R,e,lx,''));
    (S.sh||(S.sh=[]))[v]=athSp(e,R+'sh'+v,()=>athShin(R,e,lx,ref?'#16181c':''));
    (S.ft||(S.ft=[]))[v]=athSp(e,R+'ft'+v+cl+spat,()=>athFoot(R,cl,lx,spat));
    (S.ua||(S.ua=[]))[v]=athSp(e,R+'ua'+v+arm+K,()=>athUArm(R,e,lx,arm,!!ref));
    (S.fa||(S.fa=[]))[v]=athSp(e,R+'fa'+v+arm+gl,()=>athFArm(R,arm,gl,lx));
    (S.tf||(S.tf=[]))[v]=athSp(e,R+'tf'+v+K,()=>athTorso(R,e,lx,false,K));
    (S.tb||(S.tb=[]))[v]=athSp(e,R+'tb'+v+K,()=>athTorso(R,e,lx,true,K))}
  const lx=ATH.lf?1:-1,cap=ref?(p.ref==='R'?'#F4F5F7':'#16181c'):'';
  S.hd=[0,1].map(i=>athSp(e,R+'hd'+i+lx+sk[0]+vis+cap+(e.dk==='N'?'':''),()=>athHead(R,e,e.team||null,i?-1:1,lx,sk[0],sk[1],vis,p.num,cap)));
  S.nm=!ref&&p.num!=null?athNum(e,p.num):null;S.dn=!ref&&e.dk==='N'?athDecal(e.team,e,p.num):null;
  a.Se=e;a.SR=R;a.Sg=ATH.gen;return S}

/* ---------- per-figure animation state ---------- */
function athAn(p){let a=p._an;if(!a)a=p._an={o:new Float32Array(17),s:new Float32Array(17),kL:-1,kU:-1,bL:1,bU:1,ph:Math.random(),px:p.x,py:p.y,f:-1,kf:p.face||1,tv:1,sp:0,acc:0,
  car:0,ball:0,fq:0,kL2:1,kU2:1,kxs:0,back:false,pl:0,S:null,Se:null,SR:0,Sg:0,fx:new Float32Array(4)};return a}
function athFall(p,now){ATH.gu=0;let f=p.fallP||0;if(f<.02)return 0;
  if(S.phase==='dead'&&S.celebrate!==p){const g=clamp((now-ATH.deadAt-900)/700,0,1);if(g>0){f*=1-g;ATH.gu=g}}return f}
/* locomotion: idle/ready ↔ run (continuous in speed), or backpedal; the stance foot is locked to the ground */
function athLoco(T,a,p,sp,vf,base,back,dt,crouch){
  const bh=p._bh||1,r=Math.min(1.15,sp/8),cad=2.3+.27*sp,D=sp>.25?2*sp/cad:1.2,DH=D/(PL_H*bh),ax=Math.abs(vf)/(sp||1),kx=sp>.25?Math.max(.3,ax):1;
  const w=athE(sp/1.4);athSet(T,base);if(w<=0)return;
  const K=back?BACKK:RUNK,lift=(back?.05:.06+.2*Math.min(1,r))*(1-.4*(1-kx)),pa=a.ph;
  for(let leg=0;leg<2;leg++){const ps=pa+(leg?0:.5),q=((ps%1)+1)%1;let x,y,pt;
    if(q<.375){x=back?q-.1875:.1875-q;y=0;const j=Math.min(2,(q*8)|0);pt=K[j][2]+(K[j+1][2]-K[j][2])*(q*8-j)}
    else{const c=athCR(K,q);x=c[0];y=Math.max(0,c[1]);pt=c[2]}
    const i=leg?6:4;T[i]+=((x*DH*kx+(back?-.01:.02))-T[i])*w;T[i+1]+=((PB_AH+y*lift)-T[i+1])*w;T[leg?9:8]+=(pt*(.45+.55*Math.min(1,r))-T[leg?9:8])*w}
  const lean=back?.3:.1+.27*Math.min(1,r)+clamp(a.acc*.025,-.12,.18),bob=(back?.006:.015*Math.min(1,r))*Math.cos(TAU2*2*(pa-.4375));
  T[0]+=((back?-.01:.02*r)-T[0])*w;T[1]+=((back?.44:(.49-.04*Math.min(1,r))-(crouch||0))+bob-T[1])*w;T[2]+=(lean+(crouch?crouch*1.5:0)-T[2])*w;T[3]+=(lean*.35-T[3])*w;
  const am=back?.3:.32+.78*Math.min(1,r);
  for(let arm=0;arm<2;arm++){const c=athCR(ARMK,pa+(arm?0:.5)),i=arm?12:10;T[i]+=(c[0]*am+.06+.08*r-T[i])*w;T[i+1]+=(1.1+(c[1]-1.1)*(.55+.45*Math.min(1,r))-T[i+1])*w}
}
function athStanceK(p){const r=p.role,L=S.los;
  if(r==='OL'){return p.key==='OL2'?KP_ST4:KP_ST3}
  if(r==='DL')return (p._acc&1)?KP_ST4:KP_ST3;
  if(r==='QB')return L-p.x<2.2?KP_CTR:KP_GUN;
  if(r==='RB')return KP_RB;
  if(r==='TE'&&L-p.x<1.4&&Math.abs(p.y-S.ballY)<5)return KP_ST3;
  if(r==='WR'||r==='TE')return KP_WR;
  if(r==='LB')return KP_READY;
  if(r==='CB')return Math.abs(p.x-L)<3?KP_READY:KP_LOOSE;
  if(r==='S')return KP_LOOSE;return KP_IDLE}
/* the pose for this frame: lower/upper mode ids pick the crossfade; writes T */
function athPose(p,a,now,T){
  const ph=S.phase,pre=ph==='presnap',rp=ph==='replay',pl=play,face=p.face||1,dt=ATH.dt;
  const vx=p.vx||0,vy=p.vy||0,sp=Math.sqrt(vx*vx+vy*vy),vf=vx*face,car=ATH.car===p&&!pre;
  let kL=1,kU=1,carry=0;a.ball=0;a.fq=0;
  /* acceleration (lean) and sharp deceleration (plant) */
  if(dt>0){const ac=(sp-a.sp)/dt;a.acc+=(clamp(ac,-20,20)-a.acc)*Math.min(1,dt*8);if(!pre&&!rp&&a.sp>4.5&&ac<-16)a.pl=now+190}a.sp=sp;
  const backOK=(p.side==='d'||p.role==='OL'||p===Q)&&sp>.8&&vf<-.6&&!p.engaged;
  const base=pre&&p._gx==null?athStanceK(p):p.side==='d'&&sp<1.5&&!pre&&pl&&!pl.ended?KP_READY:KP_IDLE;
  athLoco(T,a,p,sp,vf,base,backOK,dt,0);if(backOK)kL=2;else if(pre&&p._gx==null&&sp<.6)kL=10+(base===KP_ST3?0:base===KP_ST4?1:base===KP_CTR?2:base===KP_GUN?3:base===KP_RB?4:base===KP_WR?5:base===KP_READY?6:7);
  if(a.pl>now&&!pre){athSet(T,KP_PLANT);kL=3;kU=3}
  /* quarterback: drop, hold, aim, throw */
  if(!pre&&p===Q&&pl){const thr=rp?0:(p.throwT||0);
    if(thr>0){athClip(T,CL_THROW,1-thr/.35,false);kL=kU=4;a.fq=1}
    else if(car&&pl.type==='pass'&&!pl.scramble){if(aim&&ph==='live'){athUp(T,UP_AIM);kU=5;a.ball=2}else{athUp(T,UP_HOLD);kU=6;a.ball=1}}}
  /* ball carrier: tuck in the sideline-side arm */
  if(car&&!a.ball&&!(p===Q&&(p.throwT||0)>0)){const near=p.y>CEN;carry=near?1:2;const i=near?12:10;T[i]=-.12;T[i+1]=2;kU=near?7:8;
    if(pl&&!rp){const fi=near?10:12;
      if(pl.jukeT>0){athClipLo(T,CL_JUKE,clamp(1-pl.jukeT/.36,0,1));T[2]=.18;T[3]=.1;T[fi]=near?-.6:1;T[fi+1]=.6;kL=5;kU=23}
      if(pl.spinT>0){athUp(T,UP_HOLD);T[2]=.3;kU=9;carry=0;a.ball=1}
      if(pl.truckT>0){T[2]=.72;T[3]=.4;T[1]-=.05;T[fi]=1.2;T[fi+1]=1.25;kU=10}
      if(p.stiff>0&&!(pl.truckT>0)){T[fi]=1.45;T[fi+1]=.05;T[2]=Math.max(T[2],.15);kU=11}
      if(pl.hurdle>0&&p.z>.05){athSet(T,KP_HURD);T[i]=-.12;T[i+1]=2;kL=6}
      if(pl.caught&&ball.T&&pl.t-pl.ballT0-ball.T<.28){athUp(T,UP_SEC);kU=12;carry=1}
      if(pl.dive>0){athSet(T,KP_DIVE);T[14]=1.25*Math.min(1,(.38-pl.dive)/.12+.3);kL=kU=13;carry=0;a.ball=3}}}
  /* hands up as the ball arrives */
  if(!pre&&!car&&ball&&ball.state==='air'&&!ball.pitch&&ball.T>0&&ball.t/ball.T>.45){const d=Math.abs(p.x-ball.tx)+Math.abs(p.y-ball.ty);
    if(d<(p.side==='o'?3.2:2.6)&&(p.side==='d'||eligible(p))){const zz=ball.z||2,R2=clamp(1.5+zz*.35,1.5,2.95);T[2]=.05;T[3]=-.25;T[10]=R2;T[11]=.15;T[12]=R2+.1;T[13]=.12;kU=14}}
  if(!pre&&!rp&&pl&&p===S.ctrl&&pl.swat>0){athUp(T,UP_SWAT);kU=15}
  /* blocking */
  if(!pre&&!rp&&!car){if(p.engaged){athUp(T,UP_PUSH);kU=16;if(sp<.6){athSet(T,KP_BLK);athUp(T,UP_PUSH);kL=7}else{T[1]-=.04;T[2]=.5}}
    else if(p.role==='OL'&&pl&&pl.type==='pass'&&!pl.thrown){athUp(T,UP_PRO);kU=17;T[1]-=.05;if(sp<.6){T[4]=-.14;T[6]=.11}}}
  /* tackles: lunge, wrap, fall together, get up after the whistle */
  if(!pre&&!rp&&p.lunge>0){athClip(T,CL_TACKLE,clamp(1-p.lunge/.3,0,1)*.55,false);kL=kU=18}
  const fe=pre?0:athFall(p,now);
  if(fe>.02){if(kL!==18&&kL!==13){athMixP(T,KP_LIE,athE(fe));if(car||fe<.6){T[10]+=(UP_FLAIL[2]-T[10])*(1-fe)*.6;T[12]+=(UP_FLAIL[4]-T[12])*(1-fe)*.6}}else T[14]=Math.max(T[14],fe*1.45);kL=19;kU=19;carry=car&&fe<.7?carry:0}
  if(ATH.gu>0&&ATH.gu<1){athClip(T,CL_GETUP,ATH.gu,false);kL=kU=20}
  /* celebrations (S.celebrate + POSE_ARM, 08c) */
  if(S.celebrate===p){const k=S.celebPose;carry=0;a.ball=0;kL=kU=21;
    if(k==='heisman'){athSet(T,KP_HEIS);carry=2}else if(k==='bow')athSet(T,KP_BOW);else if(k==='leap'||!k){athSet(T,KP_LEAP);if(!k){T[4]=-.06;T[5]=.04+(p.z||0)*.1;T[6]=.07;T[7]=.04+(p.z||0)*.12}}
    else{if(sp<.6)athSet(T,KP_IDLE);athUp(T,k==='point'||k==='taunt'?UP_POINT:k==='flex'?UP_FLEX:k==='salute'?UP_SALUTE:k==='spike'?CU_SPIKE[1][1]:UP_UP);
      if(k==='spike'){athClip(T,CU_SPIKE,clamp((S.celebT||0)/.5,0,1),true)}kU=22}}
  /* engine-driven animation (p.anim / p.animT) */
  const an=!rp&&p.anim&&(p.animT==null||p.animT>0)?p.anim:'';
  if(an){const u=p.animT!=null?1-clamp(p.animT/(ANIM_DUR[an]||.5),0,1):.5,fi=carry===1?10:12;
    switch(an){case 'throw':athClip(T,CL_THROW,u,false);kL=kU=4;a.fq=1;a.ball=0;break;
      case 'catch':athClip(T,CU_CATCH,u,true);kU=30;if(u>.72&&car)carry=p.y>CEN?1:2;break;
      case 'dive':athSet(T,KP_DIVE);T[14]=1.25*Math.min(1,u*2.5+.3);kL=kU=13;break;
      case 'tackle':athClip(T,CL_TACKLE,.4+u*.6,false);kL=kU=18;break;
      case 'tackled':athClip(T,CL_TACKLED,u,false);kL=kU=31;break;
      case 'stiff':T[fi]=1.45;T[fi+1]=.05;kU=11;break;
      case 'juke':athClipLo(T,CL_JUKE,u);kL=5;break;
      case 'spin':athUp(T,UP_HOLD);kU=9;break;
      case 'truck':T[2]=.72;T[3]=.4;T[fi]=1.2;T[fi+1]=1.25;kU=10;break;
      case 'hurdle':athSet(T,KP_HURD);kL=kU=6;break;
      case 'slide':athSet(T,KP_SLIDE);kL=kU=32;break;
      case 'block':if(!p.engaged){athUp(T,UP_PUSH);kU=16}break;
      case 'swim':athClip(T,CU_SWIM,u,true);kU=33;break;case 'rip':athClip(T,CU_RIP,u,true);kU=34;break;
      case 'swat':athUp(T,UP_SWAT);kU=15;break;
      case 'kick':athClip(T,CL_KICK,u,false);kL=kU=35;break;case 'punt':athClip(T,CL_PUNT,u,false);kL=kU=36;break;
      case 'snap':athClip(T,CU_SNAP,u,true);kU=37;break;
      case 'kneel':athSet(T,KP_KNEEL);kL=kU=38;break;case 'spike':athClip(T,CU_SPIKE,u,true);kU=39;break;
      case 'celebrate':athUp(T,UP_UP);kU=22;break;
      case 'getup':athClip(T,CL_GETUP,u,false);kL=kU=20;break}}
  /* spin move: the body turns through profile and back */
  a.kxs=0;if(pl&&!rp&&car&&pl.spinT>0){const q=Math.cos((1-pl.spinT/.45)*TAU2);a.kxs=face*(Math.abs(q)<.22?(q<0?-.22:.22):q);a.back=q<0}
  else if(an==='spin'){const q=Math.cos((1-p.animT/.45)*TAU2);a.kxs=face*(Math.abs(q)<.22?(q<0?-.22:.22):q);a.back=q<0}
  a.car=carry;a.kL2=kL;a.kU2=kU;
}
/* officials: run/backpedal, presnap crouch, signals */
function athPoseRef(o,a,now,T){const sp=Math.hypot(o.vx,o.vy),vf=o.vx*o.face;let kL=1,kU=1;
  const crouch=S.phase==='presnap'&&(o.ref==='HL'||o.ref==='LJ'||o.ref==='U')&&sp<.45;
  athLoco(T,a,o,sp,vf,crouch?KP_RB:KP_IDLE,vf<-.4&&sp>.45,ATH.dt,0);if(crouch)kL=14;
  T[10]*=.8;T[12]*=.8;
  if(o.sig&&now<o.sigEnd){const m=o.sig,u=clamp((now-o.sigT0)/420,0,1);kU=40;
    if(m==='up')athUp(T,UP_UP);else if(m==='wave'){const q=(now/260)%2,w=athE(q<1?q:2-q);T[10]=1.55-w*.9;T[11]=.15;T[12]=.65+w*.9;T[13]=.15}
    else if(m==='fwd')athUp(T,UP_FWD);else if(m==='spot')athUp(T,UP_SPOT);else if(m==='flagT')athClip(T,CU_FLAG,u,true);kU=41+(ATH_SIG[m]|0)}
  a.kxs=0;a.car=0;a.ball=0;a.fq=0;a.kL2=kL;a.kU2=kU}
const ATH_SIG={up:0,wave:1,fwd:2,spot:3,flagT:4};
/* evaluate + crossfade (lower and upper body separately) */
function athEval(p,a,now){
  const T=ATH_T,dt=ATH.dt;a.f=ATH.f;
  let dd=Math.hypot(p.x-a.px,p.y-a.py);a.px=p.x;a.py=p.y;if(dd>1.6)dd=0;
  const sp=Math.hypot(p.vx||0,p.vy||0),cad=2.3+.27*sp,D=sp>.25?2*sp/cad:1.2;a.ph=(a.ph+dd/D)%1;
  if(p.ref)athPoseRef(p,a,now,T);else athPose(p,a,now,T);
  /* facing: ease the mirror through a narrow profile (~0.12 s) instead of flipping in one frame */
  const face=a.fq?1:(p.face||1);if(a.kL<0||S.phase==='presnap')a.kf=face;else{a.kf+=(face-a.kf)*Math.min(1,dt*16);if(Math.abs(a.kf-face)<.03)a.kf=face}
  /* 3/4 turn: chest toward the camera; the back shows while running up-screen */
  const vy=p.vy||0,tgt=sp>2&&vy<-.62*sp?-1:1;a.tv+=(tgt-a.tv)*Math.min(1,dt*7);if(!a.kxs)a.back=a.tv<-.15;
  const first=a.kL<0,o=a.o,s=a.s,dL=.15,dU=.13;
  if(a.kL2!==a.kL){if(!first)for(const i of ATH_LO)s[i]=o[i];a.kL=a.kL2;a.bL=first?1:0}
  if(a.kU2!==a.kU){if(!first)for(const i of ATH_UP)s[i]=o[i];a.kU=a.kU2;a.bU=first?1:0}
  a.bL=Math.min(1,a.bL+(dt||(first?1:0))/dL);a.bU=Math.min(1,a.bU+(dt||(first?1:0))/dU);
  const wL=athE(a.bL),wU=athE(a.bU);
  for(const i of ATH_LO)o[i]=wL>=1?T[i]:s[i]+(T[i]-s[i])*wL;
  for(const i of ATH_UP){if(wU>=1){o[i]=T[i];continue}let d=T[i]-s[i];if(i>=10){while(d>Math.PI)d-=TAU2;while(d<-Math.PI)d+=TAU2}o[i]=s[i]+d*wU}
}

/* ---------- drawing ---------- */
/* root matrix: local unit space (x forward, y down, feet at 0) → device px */
function athRoot(sx,sy,Hp,f,o){const t=o[14],co=Math.cos(t),si=Math.sin(t),A=ATH.a,D=ATH.d,M=ATH_M;
  M[0]=A*f*Hp*co;M[2]=-A*f*Hp*si;M[1]=D*Hp*si;M[3]=D*Hp*co;M[4]=A*(sx+f*Hp*o[16])+ATH.e;M[5]=D*(sy-o[15]*Hp)+ATH.ff}
/* draw sprite S with its +y axis along the unit vector (dx,dy) from joint (jx,jy); w scales across the bone (−w mirrors) */
function athPM(c,S,jx,jy,dx,dy,w){const M=ATH_M,ux=dy*w,uy=-dx*w;
  c.setTransform(M[0]*ux+M[2]*uy,M[1]*ux+M[3]*uy,M[0]*dx+M[2]*dy,M[1]*dx+M[3]*dy,M[0]*jx+M[2]*jy+M[4],M[1]*jx+M[3]*jy+M[5]);c.drawImage(S.cv,S.x,S.y,S.w,S.h)}
/* two-bone IK (knee forward): writes knee to ATH_JN[k..k+1], ankle to [k+2..k+3] */
function athLegIK(hx,hy,fx,fy,k){let dx=fx-hx,dy=fy-hy,d=Math.sqrt(dx*dx+dy*dy);const mx=(PB_LT+PB_LS)*.999;if(d>mx){dx*=mx/d;dy*=mx/d;d=mx}if(d<1e-4){dy=1e-4;d=1e-4}
  const J=ATH_JN,cs=clamp((PB_LT*PB_LT+d*d-PB_LS*PB_LS)/(2*PB_LT*d),-1,1),an=Math.atan2(dy,dx)-Math.acos(cs);J[k]=hx+Math.cos(an)*PB_LT;J[k+1]=hy+Math.sin(an)*PB_LT;J[k+2]=hx+dx;J[k+3]=hy+dy}
function athLeg(c,S,v,hx,hy,o,leg,bw,k,nf){const J=ATH_JN,fx=o[leg?6:4],fy=-o[leg?7:5];athLegIK(hx,hy,fx,fy,k);
  const kx=J[k],ky=J[k+1],ax=J[k+2],ay=J[k+3];let dx=kx-hx,dy=ky-hy,l=Math.sqrt(dx*dx+dy*dy)||1;athPM(c,S.th[v],hx,hy,dx/l,dy/l,bw);
  dx=ax-kx;dy=ay-ky;l=Math.sqrt(dx*dx+dy*dy)||1;athPM(c,S.sh[v],kx,ky,dx/l,dy/l,bw*.96);
  if(nf)return;const pt=o[leg?9:8];athPM(c,S.ft[v],ax,ay,-Math.sin(pt),Math.cos(pt),1)}
function athArm(c,S,v,sx,sy,ua,ea,bw,k,skipU){const J=ATH_JN,s1=Math.sin(ua),c1=Math.cos(ua),ex=sx+s1*PB_LU,ey=sy+c1*PB_LU,fa=ua+ea,s2=Math.sin(fa),c2=Math.cos(fa);
  J[k]=ex;J[k+1]=ey;J[k+2]=ex+s2*(PB_LF+.035);J[k+3]=ey+c2*(PB_LF+.035);
  if(!skipU)athPM(c,S.ua[v],sx,sy,s1,c1,bw);athPM(c,S.fa[v],ex,ey,s2,c2,bw*.95)}
function athBall(c,k,ang,f,r){const M=ATH_M,J=ATH_JN,x=J[k],y=J[k+1],X0=(M[0]*x+M[2]*y+M[4]-ATH.e)/ATH.a,Y0=(M[1]*x+M[3]*y+M[5]-ATH.ff)/ATH.d;
  c.setTransform(ATH.a,ATH.b,ATH.c,ATH.d,ATH.e,ATH.ff);drawFootball(c,X0,Y0,r,f>0?ang:Math.PI-ang,0)}
function drawAthlete(c,p,now){athFrame(c,now);athFig(c,p,now)}
function athFig(c,p,now){
  const ref=!!p.ref,s=scE(),sx=X(p.x),sy=Y(p.y);athBody(p);const Hp=s*PL_H*p._bh,bw=p._bw||1;
  if(sx<-Hp*1.6||sx>W+Hp*1.6||sy<-Hp*.4||sy>H+Hp*1.8)return;
  const a=athAn(p);if(a.f!==ATH.f)athEval(p,a,now);
  const team=ref?null:p.team||(p.side==='o'?offT():defT()),e=ref?athRefE():athCols(team);
  if(!ref&&LG.settings.stars!==false&&p.ovr>=86&&S.phase!=='kick'&&S.phase!=='live'){const n=p.ovr>=94?3:p.ovr>=90?2:1;for(let i=0;i<n;i++){const x=sx+(i-(n-1)/2)*Hp*.2,y=sy+Hp*.16;c.fillStyle='rgba(0,0,0,.45)';starPath(c,x+1,y+1,Hp*.075);c.fillStyle='#FFD23F';starPath(c,x,y,Hp*.075)}}
  const need=Hp*ATH.a,R=a.SR&&need<=a.SR*1.12&&need>=a.SR*.5?a.SR:athRes(need),Sx=athSprites(p,a,e,R,ref),o=a.o,kf=a.kxs||a.kf,fs=kf<0?-1:1,f=fs*Math.max(.22,Math.abs(kf)),v=(fs<0)!==!!ATH.lf?1:0;
  athRoot(sx,sy-(p.z||0)*s*.9,Hp,f,o);
  /* joints: hips, shoulders (3/4 turn offsets), head */
  const tv=a.tv,hx=o[0],hy=-o[1],sp=o[2],ssx=hx+Math.sin(sp)*PB_SP,ssy=hy-Math.cos(sp)*PB_SP,hd=o[3],nx=ssx+Math.sin(hd*.6+sp*.4)*PB_NK,ny=ssy-Math.cos(hd*.6+sp*.4)*PB_NK;
  const so=.024*tv*bw,ho=.012*tv;
  /* far side */
  {const u=o[10];if(!ref||Hp*ATH.a>150)athArm(c,Sx,v,ssx+so,ssy-.012,u,o[11],bw,0,u>-.42&&u<.42&&Math.abs(o[2])<.7)}
  athLeg(c,Sx,v,hx+ho,hy-.004,o,0,bw,8,ref&&Hp*ATH.a<=150);
  /* torso (+ number) */
  const tdx=-Math.sin(sp),tdy=Math.cos(sp);athPM(c,a.back?Sx.tb[v]:Sx.tf[v],hx,hy,tdx,tdy,bw);
  if(Sx.nm&&Hp*ATH.a>=48){const nb=a.back,ox=(nb?-.045:.036)*bw,oy=-.172,k=(nb?.62:.58)*(f<0?-1:1)*bw,px=hx+ox*tdy+oy*tdx,py=hy-ox*tdx+oy*tdy;
    const M=ATH_M,ux=tdy*k,uy=-tdx*k;c.setTransform(M[0]*ux+M[2]*uy,M[1]*ux+M[3]*uy,M[0]*tdx+M[2]*tdy,M[1]*tdx+M[3]*tdy,M[0]*px+M[2]*py+M[4],M[1]*px+M[3]*py+M[5]);
    c.drawImage(Sx.nm,-.07,-.05,.14,.1)}
  if(a.car===2){athBall(c,2,-.75,fs,Hp*.085);const J=ATH_JN;athPM(c,Sx.fa[v],J[0],J[1],Math.sin(o[10]+o[11]),Math.cos(o[10]+o[11]),bw*.95)}
  /* near side */
  athLeg(c,Sx,v,hx-ho,hy+.004,o,1,bw,12);
  {const hs=Sx.hd[fs<0?1:0],hdx=-Math.sin(hd*.6+sp*.4),hdy=Math.cos(hd*.6+sp*.4);athPM(c,hs,nx,ny,hdx,hdy,fs<0?-1:1);
    if(Sx.dn&&Hp*ATH.a>=90){const M=ATH_M,k=.055*(fs<0?-1:1),ux=hdy*k,uy=-hdx*k,jx=nx-.016*hdy,jy=ny+.016*hdx;c.setTransform(M[0]*ux+M[2]*uy,M[1]*ux+M[3]*uy,(M[0]*hdx+M[2]*hdy)*.055,(M[1]*hdx+M[3]*hdy)*.055,M[0]*jx+M[2]*jy+M[4],M[1]*jx+M[3]*jy+M[5]);c.drawImage(Sx.dn,-.5,-.5,1,1)}}
  athArm(c,Sx,v,ssx-so,ssy+.008,o[12],o[13],bw,4,false);
  if(a.car===1)athBall(c,6,-.75,fs,Hp*.085);
  else if(a.ball===1){const J=ATH_JN;J[20]=(J[2]+J[6])/2;J[21]=(J[3]+J[7])/2-.01;athBall(c,20,-.35,fs,Hp*.09)}
  else if(a.ball===2)athBall(c,6,-.9,fs,Hp*.088);
  else if(a.ball===3)athBall(c,6,-1.4,fs,Hp*.088);
  c.setTransform(ATH.a,ATH.b,ATH.c,ATH.d,ATH.e,ATH.ff);
}

/* ---------- shadows (one batch for everyone) + per-frame prep ---------- */
function athShadows(c,list,now){
  const s=scE(),dA=ATH.dirs,ro=ATH.rots,L=ATH.L,nl=dA.length>>1,lf=nl>1?.7:1;c.fillStyle=ATH.sh;
  for(let li=0;li<nl;li++){c.beginPath();
  for(const p of list){const x=X(p.x),y=Y(p.y);if(x<-120||x>W+120||y<-80||y>H+80)continue;athBody(p);
    const hh=s*PL_H*p._bh,bw=p._bw,k=1-Math.min(.75,(p.z||0)*.5),a=p._an,rt=a?a.o[14]:0,fl=Math.min(1,Math.abs(rt)/1.4),fc=a?(a.kf<0?-1:1):(p.face||1);
    if(fl>.55){if(li)continue;const cx=x+fc*Math.sign(rt||1)*hh*.45*fl;c.moveTo(cx+hh*.52,y);c.ellipse(cx,y,hh*.52,hh*.11*bw,0,0,TAU2)}
    else{const len=L.len*hh*k*lf,rx=len*.5+hh*.07,cx=x+dA[li*2]*len*.5,cy=y+dA[li*2+1]*len*.5,r=ro[li];c.moveTo(cx+Math.cos(r)*rx,cy+Math.sin(r)*rx);c.ellipse(cx,cy,rx,hh*.09*bw*k,r,0,TAU2)}}
  c.fill()}
  /* ambient occlusion: a soft contact patch under the body and a dark spot under each planted foot */
  c.fillStyle='rgba(0,0,0,.2)';c.beginPath();
  for(const p of list){const x=X(p.x),y=Y(p.y);if(x<-120||x>W+120||y<-80||y>H+80)continue;const a=p._an;if(a&&Math.abs(a.o[14])>.8)continue;
    const hh=s*PL_H*p._bh,k=1-Math.min(.8,(p.z||0)*.6),rx=hh*.17*p._bw*k;c.moveTo(x+rx,y);c.ellipse(x,y,rx,hh*.045*k,0,0,TAU2)}
  c.fill();
  c.fillStyle='rgba(0,0,0,.28)';c.beginPath();
  for(const p of list){const a=p._an;if(!a||(p.z||0)>.15||Math.abs(a.o[14])>.5)continue;const x=X(p.x),y=Y(p.y);if(x<-120||x>W+120||y<-80||y>H+80)continue;
    const hh=s*PL_H*p._bh,fc=a.kxs||a.kf,f=(fc<0?-1:1)*Math.max(.22,Math.abs(fc)),o=a.o,fw=hh*.06,fh=hh*.016;
    for(let leg=0;leg<2;leg++){const fy=o[leg?7:5];if(fy>PB_AH+.03)continue;const fx=x+f*hh*(o[leg?6:4]+.025),yy=y+(leg?1:-1)*hh*.012;c.moveTo(fx+fw,yy);c.ellipse(fx,yy,fw,fh,0,0,TAU2)}}
  c.fill();
}
function prepPlayers(c,list,now){
  athFrame(c,now);if(!S.home)return;
  if(typeof offiFrame==='function'&&P.length&&LG.settings.officials!==false){const o=offiFrame(now);if(o){for(const x of o)list.push(x);list.sort(athByY)}}
  if(typeof offiFlagDraw==='function')offiFlagDraw(c,now);
  for(const p of list){athBody(p);const a=athAn(p);if(a.f!==ATH.f)athEval(p,a,now)}
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
