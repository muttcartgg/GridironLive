/* =========================================================
   08t · 3D broadcast style, part 1: the stadium (three.js r170 from 00-three.js, the global THREE)
   World: 1 unit = 1 yard; world X = field x (goal lines at 10 / 110, the offense attacks +x), world Z = field y
   (0 = far sideline), world Y = up. The TV camera sits on the near side (Z > FW), so the layout matches the 2D views.
   Everything here is built once per game (t3Env, keyed by the host, both teams, the light and the weather) and cached:
   a canvas turf (mowing stripes, noise, end zones in the host's colours, white border) with a tiling grain bump map,
   painted lines as one merged mesh, yard numbers and the end-zone words (the school name and the nickname) as decals
   from one atlas, goalposts, pylons, benches, a two-tier bowl (horseshoe upper deck, open on the camera side) with
   ribbon boards and a suite band, an instanced crowd (home colours, a student section, an away corner) that hops on
   big plays, a press box with the venue's name on its roof sign, light towers, a live video board, and the sky dome.
   Logos are only the user's own imported images (02c logoTexImage) or the school's designed badge, never drawn here:
   the midfield logo, small logos beside the end-zone words, logos on the ribbon boards and both logos on the video
   board each own a small canvas texture that starts blank (today's look) and is redrawn when its logo arrives.
   ========================================================= */
const T3F={x0:-16,x1:136,y0:-16,y1:FW+16,ppy:12};   // turf texture extent (yards) and pixels per yard
const BOWL={cx:60,cz:CEN,hx:75,hz:42,r:20};          // the bowl's inner edge: a rounded rectangle around the field
function t3Rng(seed){let a=seed>>>0||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function t3Tex(cv,srgb,rep){const t=new THREE.CanvasTexture(cv);if(srgb!==false)t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}t.anisotropy=G3.aniso||4;return t}
const t3Col=h=>new THREE.Color(h);
const t3Dark=h=>lum(h)<.06;
/* ---------- turf: stripes, end zones, border, wear and grain (one 1.8k canvas) ---------- */
function t3Turf(o){
  const p=T3F.ppy,w=Math.round((T3F.x1-T3F.x0)*p),h=Math.round((T3F.y1-T3F.y0)*p),cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const g=cv.getContext('2d'),X=x=>(x-T3F.x0)*p,Y=y=>(y-T3F.y0)*p,r=t3Rng(7);
  const A=o.snow?['#58804f','#628b58']:o.wet?['#2f6a2a','#397634']:['#3b7a31','#47893b'];
  g.fillStyle=o.snow?'#4f6e48':'#2c5a27';g.fillRect(0,0,w,h);   // apron
  for(let i=0;i<20;i++){g.fillStyle=A[i%2];g.fillRect(X(10+i*5),Y(0),5*p+1,FW*p)}
  /* sideline apron stripes continue faintly past the border (the mower does not stop at the paint) */
  g.globalAlpha=.35;for(let i=-3;i<27;i++){g.fillStyle=A[(i+40)%2];g.fillRect(X(-5+i*5),0,5*p+1,Y(-2));g.fillRect(X(-5+i*5),Y(FW+2),5*p+1,h-Y(FW+2))}g.globalAlpha=1;
  const ez=o.host.c1;g.fillStyle=ez;g.fillRect(X(0),Y(0),10*p,FW*p);g.fillRect(X(110),Y(0),10*p,FW*p);
  /* team area (between the 25s) on both sidelines, a shade darker */
  g.fillStyle='rgba(0,0,0,.12)';g.fillRect(X(35),Y(-12),50*p,8*p);g.fillRect(X(35),Y(FW+4),50*p,8*p);
  /* soft wear and colour variation: worn between the hashes, a little everywhere else */
  for(let i=0;i<900;i++){const x=10+r()*100,y=r()*FW,mid=Math.abs(y-CEN)<5?1:0,rad=(.6+r()*2.4)*p;
    g.fillStyle=r()<.5?`rgba(255,250,200,${(.025+.04*mid).toFixed(3)})`:`rgba(10,30,0,${(.03).toFixed(3)})`;g.beginPath();g.ellipse(X(x),Y(y),rad*1.6,rad,0,0,7);g.fill()}
  /* the 6-foot white border around the field */
  g.fillStyle='#ECEDE6';g.fillRect(X(-2),Y(-2),124*p,2*p);g.fillRect(X(-2),Y(FW),124*p,2*p);g.fillRect(X(-2),Y(-2),2*p,(FW+4)*p);g.fillRect(X(120),Y(-2),2*p,(FW+4)*p);
  /* per-pixel grain */
  const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(r()-.5)*(o.snow?14:18);d[i]=d[i]+n*.8;d[i+1]=d[i+1]+n;d[i+2]=d[i+2]+n*.6}g.putImageData(id,0,0);
  /* under the lights: the field glows, the surroundings fall off into the dark, four soft pools from the corner banks */
  /* under the lights: a light map multiplied over the turf. Night: the banks' wash fills the middle, pools along both
     sidelines with darker gaps between them, the end zones and everything past the border falling off into the dark.
     Dusk: a gentle version of the falloff only. */
  if(o.night||o.dusk){const lm=document.createElement('canvas');lm.width=w;lm.height=h;const L=lm.getContext('2d'),N=o.night;
    L.fillStyle=N?'rgb(70,72,74)':'rgb(205,198,190)';L.fillRect(0,0,w,h);L.globalCompositeOperation='lighter';
    L.save();L.setTransform(1,0,0,.5,0,Y(CEN)*.5);const c=L.createRadialGradient(X(60),Y(CEN),0,X(60),Y(CEN),64*p);
    c.addColorStop(0,N?'rgba(255,255,250,.7)':'rgba(255,250,240,.2)');c.addColorStop(.6,N?'rgba(255,255,250,.5)':'rgba(255,250,240,.16)');c.addColorStop(1,'rgba(255,252,246,0)');
    L.fillStyle=c;L.fillRect(0,-h,w,h*3);L.restore();
    if(N)for(const [pz,xs] of [[2,[18,42,66,90]],[FW-2,[30,54,78,102]]])for(const px of xs){const r2=L.createRadialGradient(X(px),Y(pz),0,X(px),Y(pz),17*p);
      r2.addColorStop(0,'rgba(255,255,248,.5)');r2.addColorStop(.5,'rgba(255,255,248,.24)');r2.addColorStop(1,'rgba(255,252,240,0)');L.fillStyle=r2;L.fillRect(X(px-17),Y(pz-17),34*p,34*p)}
    g.save();g.globalCompositeOperation='multiply';g.drawImage(lm,0,0);g.restore();
    if(N){g.fillStyle='rgba(0,3,8,.5)';g.fillRect(0,0,w,Y(-2.6));g.fillRect(0,Y(FW+2.6),w,h-Y(FW+2.6));g.fillRect(0,0,X(-2.6),h);g.fillRect(X(122.6),0,w-X(122.6),h)}}
  if(o.snow){g.fillStyle='rgba(234,240,248,.5)';g.fillRect(0,0,w,h);for(let i=0;i<70000;i++){g.fillStyle=r()<.62?'rgba(252,253,255,.55)':'rgba(190,202,216,.4)';g.fillRect(r()*w|0,r()*h|0,1+(r()*2|0),1)}
    g.fillStyle='rgba(70,100,60,.12)';for(let i=0;i<260;i++){const x=12+r()*96,y=CEN+(r()-.5)*16;g.beginPath();g.ellipse(X(x),Y(y),(1+r()*3)*p,(.3+r()*.6)*p,0,0,7);g.fill()}}
  return cv;
}
function t3Grain(){const n=256,cv=document.createElement('canvas');cv.width=cv.height=n;const g=cv.getContext('2d'),r=t3Rng(11);g.fillStyle='#808080';g.fillRect(0,0,n,n);
  for(let i=0;i<9000;i++){const v=r()<.5?40+r()*60:150+r()*90;g.fillStyle=`rgb(${v|0},${v|0},${v|0})`;g.fillRect(r()*n|0,r()*n|0,1,1+(r()*3|0))}return cv}
/* ---------- the atlas: yard numbers (100 px per yard) and the two end-zone words ---------- */
const T3A={w:2048,h:1280,cell:[512,200],words:600,wordH:300};
function t3Atlas(o){
  const cv=document.createElement('canvas');cv.width=T3A.w;cv.height=T3A.h;const g=cv.getContext('2d');g.clearRect(0,0,cv.width,cv.height);
  const num=['10','20','30','40'],cells=[];
  const fnt='400 280px "League Gothic",'+FFONT;g.font=fnt;const m=g.measureText('0'),asc=m.actualBoundingBoxAscent||200,sy=196/asc;
  const digit=(ch,cx,cy)=>{g.save();g.translate(cx,cy);const mw=g.measureText(ch).width||120;g.scale(130/mw,sy);g.textAlign='center';g.textBaseline='alphabetic';g.fillText(ch,0,0);g.restore()};
  let k=0;for(const s of [...num.map(n=>[n,-1]),...num.map(n=>[n,1]),['50',0]]){const cx=(k%4)*512+256,cy=Math.floor(k/4)*200;g.fillStyle='#F3F3EE';g.font=fnt;
    digit(s[0][0],cx-88,cy+198);digit(s[0][1],cx+88,cy+198);
    if(s[1]){const ax=cx+s[1]*205,ay=cy+58;g.beginPath();g.moveTo(ax+s[1]*30,ay);g.lineTo(ax-s[1]*22,ay-26);g.lineTo(ax-s[1]*22,ay+26);g.closePath();g.fill()}
    cells.push({n:s[0],arrow:s[1],u0:(k%4)*512/T3A.w,v0:1-(cy+200)/T3A.h,u1:((k%4)*512+512)/T3A.w,v1:1-cy/T3A.h});k++}
  /* end-zone words: the school (left end zone) and the nickname (right), fitted to the width, outlined */
  const ink=t3Dark(o.host.c1)||lum(o.host.c1)<.45?'#FFFFFF':'#0B0E14',edge=o.host.c2&&Math.abs(lum(o.host.c2)-lum(ink))>.25?o.host.c2:shade(o.host.c1,-.5);
  const words=[String(o.host.city||o.host.name||'HOME').toUpperCase(),String(o.host.name||o.host.city||'').toUpperCase()];
  words.forEach((wd,i)=>{const y0=T3A.words+i*T3A.wordH;g.save();g.font='400 260px "League Gothic",'+FFONT;const mw=g.measureText(wd).width||1000,asc2=g.measureText('H').actualBoundingBoxAscent||190;
    g.translate(1024,y0+T3A.wordH/2+asc2*.5*Math.min(1.08,236/asc2));g.scale(Math.min(1880/mw,1.15),Math.min(1.08,236/asc2));g.textAlign='center';g.lineJoin='round';g.lineWidth=22;g.strokeStyle=edge;g.strokeText(wd,0,0);g.fillStyle=ink;g.fillText(wd,0,0);g.restore();
    cells.push({word:i,u0:0,u1:1,v0:1-(y0+T3A.wordH)/T3A.h,v1:1-y0/T3A.h,tw:(mw*Math.min(1880/mw,1.15)+22)/T3A.w*44})});
  return {cv,cells};
}
/* ---------- geometry helpers ---------- */
function t3Merge(parts){   // parts: [{g, m (Matrix4), c (Color)}] → one non-indexed geometry with vertex colours
  let n=0;const gs=parts.map(p=>{const g=p.g.index?p.g.toNonIndexed():p.g.clone();if(p.m)g.applyMatrix4(p.m);n+=g.attributes.position.count;return g});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
  gs.forEach((g,i)=>{const c=parts[i].c,cnt=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);for(let k=0;k<cnt;k++){col[(o+k)*3]=c.r;col[(o+k)*3+1]=c.g;col[(o+k)*3+2]=c.b}o+=cnt;g.dispose();parts[i].g.dispose()});
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(pos,3));G.setAttribute('normal',new THREE.BufferAttribute(nor,3));G.setAttribute('color',new THREE.BufferAttribute(col,3));return G;
}
const t3M=(x,y,z,rx,ry,rz)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new THREE.Vector3(1,1,1));
/* flat ground quads: q(x0,z0,x1,z1) axis-aligned; returns one geometry (normals up) */
function t3Ground(rects,y){const pos=[],uv=[];for(const r of rects){const [x0,z0,x1,z1]=r;pos.push(x0,y,z0,x0,y,z1,x1,y,z1,x0,y,z0,x1,y,z1,x1,y,z0);uv.push(0,1,0,0,1,0,0,1,1,0,1,1)}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const nr=new Float32Array(pos.length);for(let i=1;i<nr.length;i+=3)nr[i]=1;G.setAttribute('normal',new THREE.BufferAttribute(nr,3));return G}
/* the painted lines: yard lines, goal lines, sidelines / end lines, hashes, the sideline ticks, the 3-yard try marks */
function t3Lines(){const R=[],lw=.111;
  for(let x=15;x<=105;x+=5)R.push([x-lw/2,0,x+lw/2,FW]);
  for(const x of [10,110])R.push([x-.11,0,x+.11,FW]);
  R.push([0,-.2,120,0],[0,FW,120,FW+.2],[-.2,-.2,0,FW+.2],[120,-.2,120.2,FW+.2]);
  for(let x=11;x<110;x++){if(x%5===0)continue;for(const y of [HASH1,HASH2])R.push([x-lw/2,y-.33,x+lw/2,y+.33]);R.push([x-lw/2,.12,x+lw/2,.78],[x-lw/2,FW-.78,x+lw/2,FW-.12])}
  for(const x of [13,107])R.push([x-lw/2,CEN-.5,x+lw/2,CEN+.5]);
  return t3Ground(R,.012)}
/* decal quad on the ground: centre (x,z), reading direction (rx,rz), letter-up (ux,uz), size w×h, uv rect */
function t3Decals(list){const pos=[],uv=[];for(const d of list){const {x,z,rx,rz,ux,uz,w,h,c}=d,hw=w/2,hh=h/2;
    const P=(a,b)=>[x+rx*a+ux*b,.014,z+rz*a+uz*b],q=[P(-hw,-hh),P(hw,-hh),P(hw,hh),P(-hw,hh)],t=[[c.u0,c.v0],[c.u1,c.v0],[c.u1,c.v1],[c.u0,c.v1]];
    const cr=(q[1][0]-q[0][0])*(q[3][2]-q[0][2])-(q[1][2]-q[0][2])*(q[3][0]-q[0][0]),ord=cr<0?[0,1,2,0,2,3]:[0,2,1,0,3,2];   // keep the face up
    for(const i of ord){pos.push(...q[i]);uv.push(...t[i])}}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const nr=new Float32Array(pos.length);for(let i=1;i<nr.length;i+=3)nr[i]=1;G.setAttribute('normal',new THREE.BufferAttribute(nr,3));return G}
function t3FieldDecals(at){const L=[],C=at.cells;
  for(let i=1;i<=9;i++){const x=10+i*10,yd=i<=5?i*10:100-i*10,left=x<60;
    /* near numbers read left to right on TV (letter-up toward the far side); far numbers are upside down on TV */
    for(const near of [1,0]){const rx=near?1:-1,cell=yd===50?C[8]:C[(yd/10-1)+((left?-1:1)*rx<0?0:4)];
      L.push({x,z:near?FW-8:8,rx,rz:0,ux:0,uz:near?-1:1,w:5.12,h:2,c:cell})}}
  /* end-zone words: letters stand up toward the end line, reading across the end zone as seen from the field */
  L.push({x:5,z:CEN,rx:0,rz:-1,ux:-1,uz:0,w:44,h:6.4,c:C[9]});
  L.push({x:115,z:CEN,rx:0,rz:1,ux:1,uz:0,w:44,h:6.4,c:C[10]});
  return t3Decals(L)}
/* ---------- goalposts, pylons, benches, sideline gear (one merged vertex-coloured mesh) ---------- */
function t3Props(o){const P=[],yel=t3Col('#F2C230'),pad=t3Col(o.host.c1),org=t3Col('#FF6A13'),wht=t3Col('#EDEDE8'),dk=t3Col('#2a2f36');
  const cyl=(r,h,seg)=>new THREE.CylinderGeometry(r,r,h,seg||10);
  for(const [gx,s] of [[0,-1],[120,1]]){const bx=gx+s*1.9;
    P.push({g:cyl(.16,3.05),m:t3M(bx,1.52,CEN),c:yel},{g:cyl(.34,2,14),m:t3M(bx,1,CEN),c:pad},
      {g:cyl(.12,Math.abs(bx-gx)+.1),m:t3M((bx+gx)/2,3.05,CEN,0,0,Math.PI/2),c:yel},{g:cyl(.12,.32),m:t3M(gx,3.18,CEN),c:yel},
      {g:cyl(.1,6.17+.1),m:t3M(gx,3.33,CEN,Math.PI/2,0,0),c:yel});
    for(const dz of [-3.083,3.083])P.push({g:cyl(.075,10),m:t3M(gx,8.33,CEN+dz),c:yel},{g:new THREE.BoxGeometry(.04,1.3,.12),m:t3M(gx+s*.05,12.7,CEN+dz+.18),c:t3Col('#E8442B')})}
  for(const x of [0,10,110,120])for(const y of [-.06,FW+.06])P.push({g:new THREE.BoxGeometry(.11,.5,.11),m:t3M(x,.25,y),c:org});
  /* benches on both sidelines (team areas between the 25s), coolers and the chain crew's markers */
  for(const [z,tc] of [[-9.2,o.host],[FW+9.2,o.away]]){const c1=t3Col(tc.c1);for(let x=37;x<84;x+=7.5){P.push({g:new THREE.BoxGeometry(6.6,.42,.5),m:t3M(x,.21,z),c:dk},{g:new THREE.BoxGeometry(6.6,.5,.12),m:t3M(x,.62,z+(z<0?-.25:.25)),c:c1})}
    for(const x of [34,86])P.push({g:cyl(.32,.75,12),m:t3M(x,.38,z),c:org},{g:new THREE.BoxGeometry(1.6,1,1),m:t3M(x+(x<60?-2:2),.5,z),c:wht})}
  return t3Merge(P)}
/* ---------- the bowl: lofted bands along the rounded rectangle, offset d outward, height h ---------- */
function bowlSegs(d){const B=BOWL,ex=B.hx-B.r,ez=B.hz-B.r,R=B.r+d,PI=Math.PI;
  return [{a:[B.cx-ex,B.cz-B.hz-d],b:[B.cx+ex,B.cz-B.hz-d],n:[0,-1]},{c:[B.cx+ex,B.cz-ez],a0:-PI/2,a1:0,R},
    {a:[B.cx+B.hx+d,B.cz-ez],b:[B.cx+B.hx+d,B.cz+ez],n:[1,0]},{c:[B.cx+ex,B.cz+ez],a0:0,a1:PI/2,R},
    {a:[B.cx+ex,B.cz+B.hz+d],b:[B.cx-ex,B.cz+B.hz+d],n:[0,1]},{c:[B.cx-ex,B.cz+ez],a0:PI/2,a1:PI,R},
    {a:[B.cx-B.hx-d,B.cz+ez],b:[B.cx-B.hx-d,B.cz-ez],n:[-1,0]},{c:[B.cx-ex,B.cz-ez],a0:PI,a1:PI*1.5,R}]}
function segAt(s,u){if(s.c){const t=s.a0+(s.a1-s.a0)*u,c=Math.cos(t),n=Math.sin(t);return [s.c[0]+s.R*c,s.c[1]+s.R*n,c,n,-n,c]}
  const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],l=Math.hypot(dx,dz)||1;return [s.a[0]+dx*u,s.a[1]+dz*u,s.n[0],s.n[1],dx/l,dz/l]}
const segLen=s=>s.c?s.R*Math.abs(s.a1-s.a0):Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);
/* a band between profile points pa=[d,h] and pb over the given segments; uv: u = arc length / uLen, v = 0..vRep */
function t3Band(segIdx,pa,pb,uLen,vRep){const pos=[],uv=[],idx=[];let base=0;
  for(const k of segIdx){const sa=bowlSegs(pa[0])[k],sb=bowlSegs(pb[0])[k],N=sa.c?10:1,la=segLen(sa);let u0=0;
    for(let i=0;i<=N;i++){const A=segAt(sa,i/N),Bp=segAt(sb,i/N),u=la*i/N/uLen;pos.push(A[0],pa[1],A[1],Bp[0],pb[1],Bp[1]);uv.push(u,0,u,vRep);
      if(i<N){const j=base+i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2)}}base+=(N+1)*2}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));G.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));G.setIndex(idx);G.computeVertexNormals();return G}
const T3P={wall:[[0,0],[0,2.4]],walk:[[0,2.4],[1.2,2.4]],low:[[1.2,2.4],[25,14.3]],lowBack:[[25,14.3],[25,17.2]],lowTop:[[25,17.2],[27,17.2]],
  suites:[[25,14.3],[25,19.6]],ledge:[[25,19.6],[27.5,19.6]],up:[[27.5,19.6],[52,35.6]],back:[[52,35.6],[52,39.5]],rim:[[52,39.5],[54,39.5]]};
const SEG_UP=[0,1,2,6,7],SEG_ALL=[0,1,2,3,4,5,6,7],SEG_NEAR=[3,4,5];
/* canvases for the stands: ribbon board, suite windows, seat rows */
function t3Ribbon(o,img,cv){cv=cv||document.createElement('canvas');cv.width=1024;cv.height=64;const g=cv.getContext('2d'),c1=o.host.c1,ink=inkOn(c1);
  g.fillStyle=shade(c1,-.25);g.fillRect(0,0,1024,64);g.fillStyle=ink;g.font='400 44px "League Gothic",'+FFONT;g.textBaseline='middle';g.textAlign='center';
  const w=String(o.host.city||o.host.name).toUpperCase(),n=String(o.host.name||'').toUpperCase();
  /* with the imported logo: logo · SCHOOL · logo · NICKNAME, repeating around the bowl */
  if(img){g.fillText(w,288,34,400);g.fillStyle=o.host.c2||'#fff';g.fillText(n,800,34,400);t3Fit(g,img,32,32,54,54);t3Fit(g,img,544,32,54,54)}
  else{g.fillText(w,256,34);g.fillStyle=o.host.c2||'#fff';g.fillText(n,768,34)}
  g.fillStyle='rgba(255,255,255,.12)';for(let x=0;x<1024;x+=4)g.fillRect(x,0,1,64);return cv}
function t3Suites(){const cv=document.createElement('canvas');cv.width=256;cv.height=64;const g=cv.getContext('2d'),r=t3Rng(5);g.fillStyle='#1d2229';g.fillRect(0,0,256,64);
  for(let x=0;x<256;x+=32){const lit=r();g.fillStyle=`rgb(${120+lit*110|0},${130+lit*100|0},${150+lit*70|0})`;g.fillRect(x+3,14,26,36);g.fillStyle='rgba(20,24,30,.55)';g.fillRect(x+3,34,26,16)}
  g.fillStyle='#3a4250';g.fillRect(0,0,256,10);g.fillRect(0,54,256,10);return cv}
function t3Seats(o){const cv=document.createElement('canvas');cv.width=64;cv.height=64;const g=cv.getContext('2d');g.fillStyle='#3b4048';g.fillRect(0,0,64,64);g.fillStyle=shade(o.host.c1,-.35);for(let y=0;y<64;y+=16)g.fillRect(0,y+4,64,9);g.fillStyle='#22262c';for(let x=0;x<64;x+=32)g.fillRect(x,0,3,64);return cv}
/* ---------- the crowd: instanced quads standing on the seat rows, a hop shader for big plays ---------- */
function t3Fan(){const cv=document.createElement('canvas');cv.width=32;cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,32,64);
  /* red = shading, green = skin mask, alpha = coverage: shoulders and torso, then the head */
  g.fillStyle='rgb(200,0,0)';g.beginPath();g.moveTo(3,64);g.lineTo(4,34);g.quadraticCurveTo(16,26,28,34);g.lineTo(29,64);g.closePath();g.fill();
  g.fillStyle='rgb(255,0,0)';g.fillRect(9,36,8,28);
  g.fillStyle='rgb(230,255,0)';g.beginPath();g.ellipse(16,20,7,8.5,0,0,7);g.fill();return cv}
function t3Crowd(o){
  const r=t3Rng(31),inst=[],c1=t3Col(o.host.c1),c2=t3Col(o.host.c2||'#ffffff'),wh=t3Col('#f2f2f2'),a1=t3Col(o.away.c1),a2=t3Col(o.away.c2||'#ffffff');
  const misc=['#2b2f36','#6b7280','#9aa3ad','#1f3b70','#5a3a22','#c9c2b0'].map(t3Col),skins=TONES.map(t3Col);
  const tier=(segs,p0,p1,rowD,kind)=>{const rows=Math.floor((p1[0]-p0[0])/rowD);for(let i=0;i<rows;i++){const d=p0[0]+(i+.5)*rowD,h=p0[1]+(p1[1]-p0[1])*(i+.5)/rows,S=bowlSegs(d);
    for(const k of segs){const s=S[k],L=segLen(s),n=Math.floor(L/.82);for(let j=0;j<n;j++){if(r()<.07)continue;const a=segAt(s,(j+.5+(r()-.5)*.3)/n);
      let stud=0,away=0;if(kind==='low'&&(k===6||k===7&&j<n*.55||k===0&&j<n*.12))stud=1;if(kind==='up'&&(k===2&&j<n*.4||k===1&&j>n*.5))away=1;
      const q=r();const col=stud?(q<.82?c1:wh):away?(q<.7?a1:q<.85?a2:misc[r()*6|0]):(q<.5?c1:q<.64?c2:q<.74?wh:misc[r()*6|0]);
      inst.push(a[0],h,a[1],Math.atan2(a[5],a[4]),col.r,col.g,col.b,skins[r()*4|0].r,skins[r()*4|0].g,skins[r()*4|0].b,r(),stud?1:away?2:0)}}}};
  tier(SEG_ALL,T3P.low[0],T3P.low[1],1.05,'low');tier(SEG_UP,T3P.up[0],T3P.up[1],1.12,'up');
  return t3CrowdMesh(inst,t3Fan(),.62,1)}
function t3CrowdMesh(inst,tex,sx,sy){const n=inst.length/12,G=new THREE.InstancedBufferGeometry(),q=new Float32Array([-.5,0,0,.5,0,0,.5,1,0,-.5,0,0,.5,1,0,-.5,1,0]);
  G.setAttribute('position',new THREE.BufferAttribute(q,3));G.instanceCount=n;
  const f=(off,sz)=>{const a=new Float32Array(n*sz);for(let i=0;i<n;i++)for(let k=0;k<sz;k++)a[i*sz+k]=inst[i*12+off+k];return new THREE.InstancedBufferAttribute(a,sz)};
  G.setAttribute('iPos',f(0,3));G.setAttribute('iAng',f(3,1));G.setAttribute('iCol',f(4,3));G.setAttribute('iSkin',f(7,3));G.setAttribute('iPh',f(10,1));G.setAttribute('iKind',f(11,1));
  G.boundingSphere=new THREE.Sphere(new THREE.Vector3(60,20,CEN),220);
  const M=new THREE.ShaderMaterial({uniforms:{uT:{value:0},uJ:{value:0},uL:{value:1},uN:{value:0},uTex:{value:t3Tex(tex,false)},uSz:{value:new THREE.Vector2(sx,sy)}},side:THREE.DoubleSide,
    vertexShader:`attribute vec3 iPos;attribute float iAng,iPh,iKind;attribute vec3 iCol,iSkin;uniform float uT,uJ;uniform vec2 uSz;varying vec2 vUv;varying vec3 vC,vS;varying float vH,vF;
      void main(){float j=iKind>.5&&iKind<1.5?max(uJ,.22):uJ*(iKind>1.5?.25:1.);float hop=j*max(0.,sin(uT*(7.+iPh*2.)+iPh*6.283))*.42+sin(uT*1.1+iPh*40.)*.025;
        vec2 t=vec2(cos(iAng),sin(iAng));vec3 p=iPos+vec3(t.x*position.x*uSz.x,position.y*uSz.y*(.92+iPh*.16)+hop,t.y*position.x*uSz.x);
        vUv=vec2(position.x+.5,position.y);vC=iCol;vS=iSkin;vH=iPos.y;vF=fract(sin(iPh*913.7+floor(uT*2.3+iPh*7.))*4375.5);gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform sampler2D uTex;uniform float uL,uN;varying vec2 vUv;varying vec3 vC,vS;varying float vH,vF;
      void main(){vec4 t=texture2D(uTex,vUv);if(t.a<.5)discard;vec3 c=mix(vC*(.55+.45*t.r),vS,step(.5,t.g))*uL;
        /* under the lights the lower bowl catches the spill and the upper deck falls into shadow; phones flash at night */
        c*=1.-uN*smoothstep(6.,30.,vH)*.82;c=mix(c,vec3(2.4),uN*step(.9965,vF)*step(.55,vUv.y));gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.Mesh(G,M);mesh.frustumCulled=false;mesh.userData.count=n;return mesh;
}
/* ---------- the teams on the sidelines (home far, visitors near): standing players in jerseys and helmets, a few
   coaches in front; the crowd shader's billboards at standing size, hopping with the crowd on big plays ---------- */
function t3Player(){const cv=document.createElement('canvas');cv.width=32;cv.height=64;const g=cv.getContext('2d');g.clearRect(0,0,32,64);
  g.fillStyle='rgb(90,0,0)';g.fillRect(9,38,6,26);g.fillRect(17,38,6,26);   // pants (dark)
  g.fillStyle='rgb(210,0,0)';g.beginPath();g.moveTo(4,40);g.lineTo(3,22);g.quadraticCurveTo(16,14,29,22);g.lineTo(28,40);g.closePath();g.fill();   // pads + jersey
  g.fillStyle='rgb(160,0,0)';g.fillRect(2,23,4,13);g.fillRect(26,23,4,13);
  g.fillStyle='rgb(240,255,0)';g.beginPath();g.ellipse(16,10,6.5,7.5,0,0,7);g.fill();return cv}
function t3Sideline(o){const r=t3Rng(19),inst=[];
  for(const [z0,dir,tm] of [[-5.6,-1,o.host],[FW+5.6,1,o.away]]){let U=null;try{U=typeof uniColorsC==='function'?uniColorsC(tm):null}catch(e){U=null}
    const jc=t3Col(U&&U.j?athHex(U.j):tm.c1),hc=t3Col(U&&U.h?athHex(U.h):tm.c1),polo=t3Col(shade(tm.c1,-.2)),sk=TONES.map(t3Col),ang=dir<0?0:Math.PI;
    for(let i=0;i<58;i++){const coach=i<7,x=coach?38+r()*44:35+r()*50,z=z0+dir*(coach?r()*.8:1+r()*3.4),c=coach?polo:jc,h=coach?sk[r()*4|0]:hc;
      inst.push(x,0,z,ang+(r()-.5)*.5,c.r,c.g,c.b,h.r,h.g,h.b,r(),0)}}
  const m=t3CrowdMesh(inst,t3Player(),.9,2.05);m.renderOrder=0;return m}
/* ---------- video board (live score), press box, light towers ---------- */
function t3Board(){const cv=document.createElement('canvas');cv.width=512;cv.height=256;return cv}
function t3BoardDraw(cv,lg){const g=cv.getContext('2d'),h=hostT(),A=S.away,Hm=S.home;if(!A||!Hm)return;
  g.fillStyle='#07090d';g.fillRect(0,0,512,256);g.fillStyle=shade(h.c1,-.3);g.fillRect(0,0,512,46);g.fillStyle=inkOn(shade(h.c1,-.3));g.font='400 34px "League Gothic",'+FFONT;g.textAlign='center';g.textBaseline='middle';
  g.fillText(String(h.city||h.name).toUpperCase(),256,25);
  /* a team's logo (when imported) sits on a dark plate beside its score */
  const side=(t,sc,x,img)=>{g.fillStyle=t.c1;g.fillRect(x,60,236,118);let cx=x+118,mw=224;
    if(img){g.fillStyle='rgba(6,8,12,.84)';g.fillRect(x+8,68,98,102);t3Fit(g,img,x+57,119,86,86);cx=x+171;mw=124}
    g.fillStyle=inkOn(t.c1);g.font='400 40px "League Gothic",'+FFONT;g.fillText(String(t.abbr||t.name).toUpperCase(),cx,84,mw);g.font='400 84px "League Gothic",'+FFONT;g.fillText(String(sc),cx,144,mw)};
  side(A,S.score[1],14,lg&&lg.a);side(Hm,S.score[0],262,lg&&lg.h);
  g.fillStyle='#FFD23F';g.font='400 40px "League Gothic",'+FFONT;const q=S.ot?'OT':(typeof qName==='function'?qName(S.q):'Q'+S.q);g.fillText(`${q}   ${typeof fmtClock==='function'?fmtClock(S.clock):''}`,256,206);
  g.fillStyle='#cfd6e0';g.font='400 26px "League Gothic",'+FFONT;const dd=$('#dd');g.fillText(dd?dd.textContent.toUpperCase():'',256,238);
  g.fillStyle='rgba(255,255,255,.06)';for(let y=0;y<256;y+=3)g.fillRect(0,y,512,1)}
function t3Glow(){const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,250,1)');gr.addColorStop(.18,'rgba(255,250,235,.55)');gr.addColorStop(.5,'rgba(200,215,255,.12)');gr.addColorStop(1,'rgba(200,215,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return cv}
function t3LightPanel(){const cv=document.createElement('canvas');cv.width=128;cv.height=64;const g=cv.getContext('2d');g.fillStyle='#20252c';g.fillRect(0,0,128,64);for(let y=0;y<4;y++)for(let x=0;x<8;x++){g.fillStyle='#e9eef7';g.beginPath();g.arc(8+x*16,8+y*16,6,0,7);g.fill()}return cv}
/* ---------- imported logos and the venue name ---------- */
/* draw img fitted (aspect kept) into a mw x mh box centred at cx,cy */
function t3Fit(g,img,cx,cy,mw,mh,a){const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1,k=Math.min(mw/iw,mh/ih);g.globalAlpha=a==null?1:a;try{g.drawImage(img,cx-iw*k/2,cy-ih*k/2,iw*k,ih*k)}catch(e){}g.globalAlpha=1}
/* the venue: the host's stadium (t.stadium, the imported name when there is one) or the neutral site without its city */
function t3Venue(){if(S.neutral){const g=S.game;return String((g&&g.site)||'').split(',')[0].trim().slice(0,40)}return String(hostT().stadium||'').trim().slice(0,40)}
/* the press-box roof sign: the venue's name in lit letters on a dark facade, a host-colour band below */
function t3Sign(name,c1){const cv=document.createElement('canvas');cv.width=1024;cv.height=112;const g=cv.getContext('2d');g.fillStyle='#15191f';g.fillRect(0,0,1024,112);g.fillStyle=shade(c1,-.12);g.fillRect(0,100,1024,12);
  g.fillStyle='#F4F2EA';g.font='400 72px "League Gothic",'+FFONT;g.textAlign='center';g.textBaseline='middle';g.fillText(String(name||'').toUpperCase(),512,54,972);return cv}
/* the wall board at midfield on the far side (in the TV shot): the venue's name on a dark LED panel, host-colour edges */
function t3WallSign(name,c1){const cv=document.createElement('canvas');cv.width=1024;cv.height=96;const g=cv.getContext('2d');g.fillStyle='#0d1015';g.fillRect(0,0,1024,96);g.fillStyle=c1;g.fillRect(0,0,1024,7);g.fillRect(0,89,1024,7);
  g.fillStyle='#F4F2EA';g.font='400 62px "League Gothic",'+FFONT;g.textAlign='center';g.textBaseline='middle';g.fillText(String(name||'').toUpperCase(),512,51,992);
  g.fillStyle='rgba(255,255,255,.1)';for(let x=0;x<1024;x+=4)g.fillRect(x,0,1,96);return cv}
/* a square canvas holding one logo (blank without one): mh caps its height (share of the side), a its opacity */
function t3LogoCv(cv,img,mh,a){cv.width=cv.width;const g=cv.getContext('2d'),n=cv.width;if(img)t3Fit(g,img,n/2,n/2,n-8,(mh||1)*(n-8),a);return cv}
/* the logo for a spot: the school's designed badge (10c) wins, as in the menus; else the imported logo (02c) */
function t3LogoSrc(t,dark){if(!t)return Promise.resolve(null);
  if(t.bdg&&typeof bdgCanvas==='function'){try{return Promise.resolve(bdgCanvas(t,256))}catch(e){return Promise.resolve(null)}}
  return typeof logoTexImage==='function'?logoTexImage(t,dark):Promise.resolve(null)}
const t3LogoId=(t,dark)=>!t?'':t.bdg?'b'+t.id+'.'+JSON.stringify(t.bdg).length:typeof teamLogoURL==='function'?teamLogoURL(t,dark):'';
/* (re)request the logos whenever what they would be changes (a pack filled in, Settings > Show imported logos): each spot
   is redrawn in place on its own small canvas; the video board picks its logos up on its next refresh */
function t3Logos(env){if(!env||env.dead)return;const o=env.o,L=env.logo,fld=!o.neutral;
  const want=[[fld&&L.mf?o.host:null,false],[fld&&L.ez?o.host:null,L.ezDark],[fld?o.host:null,L.ribDark],[S.home,true],[S.away,true]];
  const k=want.map(([t,d])=>t3LogoId(t,d)).join('|');if(k===env.lk)return;env.lk=k;const n=++env.ln;
  want.forEach(([t,d],i)=>{(t?t3LogoSrc(t,d):Promise.resolve(null)).then(img=>{if(env.dead||env.ln!==n||L.cur[i]===img)return;L.cur[i]=img;
    if(i===0){if(L.mf){t3LogoCv(L.mf.cv,img,.75,.94);L.mf.tex.needsUpdate=true}}
    else if(i===1){if(L.ez){t3LogoCv(L.ez.cv,img,1,.95);L.ez.tex.needsUpdate=true}}
    else if(i===2){t3Ribbon(o,img,L.rib.image);L.rib.needsUpdate=true}
    else{L[i===3?'h':'a']=img;env.board.key=''}}).catch(e=>console.warn('logo',e))})}
/* ground decals for the logos: midfield (reads left to right on TV, a 12 yd box) and one beside each end of each end-zone
   word, sized to the letters and kept inside the sidelines */
function t3LogoDecals(at,mid){const full={u0:0,v0:0,u1:1,v1:1},ez=[];
  for(const [x,ci,s] of [[5,9,-1],[115,10,1]]){const tw=at.cells[ci].tw||40,sz=Math.min(4.8,CEN-.8-tw/2-1.1);if(sz<3.2)continue;const d=tw/2+1.1+sz/2;
    for(const sg of [-1,1])ez.push({x,z:CEN+sg*d,rx:0,rz:s,ux:s,uz:0,w:sz,h:sz,c:full})}
  return {mid:mid?t3Decals([{x:60,z:CEN,rx:1,rz:0,ux:0,uz:-1,w:12,h:12,c:full}]):null,ez:ez.length?t3Decals(ez):null}}
/* ---------- sky dome by time slot ---------- */
const SKY3={day:['#2f63b4','#a9c8ea','#d8e6f3'],late:['#4a6fa9','#d9c39e','#efd9b5'],sunset:['#1a2550','#e6814a','#f4b06d'],night:['#000003','#01040c','#081022']};
function t3Sky(st){const c=SKY3[st]||SKY3.day,M=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{cT:{value:t3Col(c[0])},cH:{value:t3Col(c[1])},cG:{value:t3Col(c[2])}},
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 cT,cH,cG;varying vec3 vD;void main(){float y=vD.y;vec3 c=y>0.?mix(cG,mix(cH,cT,smoothstep(.02,.55,y)),smoothstep(0.,.05,y)):cG*.6;gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const m=new THREE.Mesh(new THREE.SphereGeometry(1800,32,16),M);m.renderOrder=-10;m.frustumCulled=false;return m}
/* ---------- build the whole environment ---------- */
function t3EnvKey(){const h=hostT();return [h.id,h.c1,h.c2,h.city,h.name,S.home.id,S.away.id,S.home.c1,S.away.c1,lightStage(),wxKind(),G3.fontOk?1:0,S.neutral?1:0,t3Venue(),typeof stadOf==='function'&&stadOf(h).mid===0?0:1].join('|')}
function t3Build(){
  const h=hostT(),st=lightStage(),wk=wxKind(),o={host:h,away:h===S.home?S.away:S.home,snow:wk==='snow',wet:wk==='wet',night:st==='night',dusk:st==='sunset',neutral:!!S.neutral},E=new THREE.Group(),own=[];
  const keep=x=>{own.push(x);return x};
  /* turf */
  const turf=keep(t3Tex(t3Turf(o)));turf.generateMipmaps=true;turf.minFilter=THREE.LinearMipmapLinearFilter;
  const grain=keep(t3Tex(t3Grain(),false,true));grain.repeat.set((T3F.x1-T3F.x0)/2.4,(T3F.y1-T3F.y0)/2.4);
  const tg=new THREE.PlaneGeometry(T3F.x1-T3F.x0,T3F.y1-T3F.y0);tg.rotateX(-Math.PI/2);tg.translate((T3F.x0+T3F.x1)/2,0,(T3F.y0+T3F.y1)/2);
  const field=new THREE.Mesh(tg,keep(new THREE.MeshStandardMaterial({map:turf,color:'#ffffff',bumpMap:grain,bumpScale:o.snow?.6:1.1,roughness:o.wet?.58:o.night?.7:.92,metalness:0})));field.receiveShadow=true;E.add(field);
  /* outer ground (beyond the turf, under the stands) */
  const og=new THREE.PlaneGeometry(700,600);og.rotateX(-Math.PI/2);og.translate(60,-.05,CEN);E.add(new THREE.Mesh(og,keep(new THREE.MeshStandardMaterial({color:o.night?'#15171b':'#2a2e33',roughness:1}))));
  /* paint */
  const lm=keep(new THREE.MeshStandardMaterial({color:o.snow?'#ffffff':'#F4F4EE',roughness:.85,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const lines=new THREE.Mesh(t3Lines(),lm);lines.receiveShadow=true;E.add(lines);
  const at=t3Atlas(o),atx=keep(t3Tex(at.cv));const dec=new THREE.Mesh(t3FieldDecals(at),keep(new THREE.MeshStandardMaterial({map:atx,transparent:true,depthWrite:false,roughness:.85,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3})));
  dec.receiveShadow=true;dec.renderOrder=1;E.add(dec);
  /* imported logos on the turf: blank canvases until a logo arrives (t3Logos) */
  const lgo={cur:[undefined,undefined,undefined,undefined,undefined],ezDark:lum(h.c1)<.45,ribDark:lum(shade(h.c1,-.25))<.45},mid=!(typeof stadOf==='function'&&stadOf(h).mid===0),ld=t3LogoDecals(at,mid);
  const decM=tx=>keep(new THREE.MeshStandardMaterial({map:tx,transparent:true,depthWrite:false,roughness:.85,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  for(const [k,gm,n] of [['mf',ld.mid,512],['ez',ld.ez,256]]){if(!gm)continue;const cv=document.createElement('canvas');cv.width=cv.height=n;const tx=keep(t3Tex(cv));tx.generateMipmaps=true;tx.minFilter=THREE.LinearMipmapLinearFilter;
    const m=new THREE.Mesh(gm,decM(tx));m.receiveShadow=true;m.renderOrder=1;E.add(m);lgo[k]={cv,tex:tx,mesh:m}}
  /* props */
  const props=new THREE.Mesh(t3Props(o),keep(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.15})));props.castShadow=true;E.add(props);
  /* the bowl */
  const nk=o.night?.2:1,conc=keep(new THREE.MeshStandardMaterial({color:t3Col('#5b616a').multiplyScalar(nk),roughness:.95,side:THREE.DoubleSide})),dark=keep(new THREE.MeshStandardMaterial({color:t3Col('#2b3038').multiplyScalar(nk),roughness:.95,side:THREE.DoubleSide}));
  const seatT=keep(t3Tex(t3Seats(o),true,true)),seat=keep(new THREE.MeshStandardMaterial({map:seatT,color:t3Col('#ffffff').multiplyScalar(o.night?.2:1),roughness:.9,side:THREE.DoubleSide}));
  const ribT=keep(t3Tex(t3Ribbon(o),true,true));lgo.rib=ribT;const rib=keep(new THREE.MeshStandardMaterial({map:ribT,emissiveMap:ribT,emissive:'#ffffff',emissiveIntensity:o.night?1.25:.45,roughness:.6,side:THREE.DoubleSide}));
  /* the boards are seen from the field (their back faces): from outside the bowl, e.g. the TV camera behind the near
     stands, the front faces show a plain dark board, never mirrored text */
  rib.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n\tif(gl_FrontFacing)diffuseColor.rgb=vec3(.05,.055,.065);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n\tif(gl_FrontFacing)totalEmissiveRadiance=vec3(0.);')};rib.customProgramCacheKey=()=>'t3ribBack';
  const suT=keep(t3Tex(t3Suites(),true,true)),sui=keep(new THREE.MeshStandardMaterial({map:suT,emissiveMap:suT,emissive:'#ffffff',emissiveIntensity:o.night?.75:.15,roughness:.4,side:THREE.DoubleSide}));
  const add=(g,m)=>{const x=new THREE.Mesh(g,m);E.add(x);return x};
  add(t3Band(SEG_ALL,...T3P.wall,22,1),rib);add(t3Band(SEG_ALL,...T3P.walk,30,1),conc);
  add(t3Band(SEG_ALL,...T3P.low,2,Math.round((T3P.low[1][0]-T3P.low[0][0])/1.05)),seat);
  add(t3Band(SEG_NEAR,...T3P.lowBack,30,1),dark);add(t3Band(SEG_NEAR,...T3P.lowTop,30,1),conc);
  add(t3Band(SEG_UP,...T3P.suites,8,1),sui);add(t3Band(SEG_UP,...T3P.ledge,30,1),conc);
  add(t3Band(SEG_UP,...T3P.up,2,Math.round((T3P.up[1][0]-T3P.up[0][0])/1.12)),seat);add(t3Band(SEG_UP,...T3P.back,30,1),dark);add(t3Band(SEG_UP,...T3P.rim,30,1),conc);
  /* the venue's name on a wall board at midfield, far side (just in front of the ribbon) */
  const vn=t3Venue();if(vn){const wsT=keep(t3Tex(t3WallSign(vn,h.c1)));const ws=new THREE.Mesh(new THREE.PlaneGeometry(24,24*96/1024),keep(new THREE.MeshStandardMaterial({map:wsT,emissiveMap:wsT,emissive:'#ffffff',emissiveIntensity:o.night?1.25:.45,roughness:.6})));
    ws.position.set(60,1.2,BOWL.cz-BOWL.hz+.06);E.add(ws)}
  /* press box above the far upper deck; a camera deck behind the near lower bowl */
  const pbT=keep(t3Tex(t3Suites(),true,true));pbT.repeat.set(10,1);
  const pbm=keep(new THREE.MeshStandardMaterial({map:pbT,emissiveMap:pbT,emissive:'#ffffff',emissiveIntensity:o.night?.8:.12,roughness:.35}));
  const pb=new THREE.Mesh(new THREE.BoxGeometry(76,9,8),[dark,dark,dark,dark,pbm,dark]);pb.position.set(60,39.5+4.5,BOWL.cz-BOWL.hz-52-3.5);E.add(pb);
  const pbr=new THREE.Mesh(new THREE.BoxGeometry(80,1,11),conc);pbr.position.set(60,49,pb.position.z);E.add(pbr);
  /* the venue's name on a sign along the front of the press-box roof, facing the field */
  if(vn){const sgT=keep(t3Tex(t3Sign(vn,h.c1)));const sg=new THREE.Mesh(new THREE.PlaneGeometry(66,66*112/1024),keep(new THREE.MeshBasicMaterial({map:sgT,toneMapped:false})));sg.position.set(60,49.5+66*112/2048+.2,pb.position.z+5.45);E.add(sg)}
  /* video board over the right end, live score */
  const bcv=t3Board();t3BoardDraw(bcv,null);const bt=keep(t3Tex(bcv));const bm=keep(new THREE.MeshBasicMaterial({map:bt,toneMapped:false}));
  const board=new THREE.Mesh(new THREE.PlaneGeometry(34,17),bm);board.rotation.y=-Math.PI/2;board.position.set(BOWL.cx+BOWL.hx+50,50,CEN);E.add(board);
  const bfr=new THREE.Mesh(new THREE.BoxGeometry(2,19,37),dark);bfr.position.set(board.position.x+1.1,50,CEN);E.add(bfr);
  for(const dz of [-12,12]){const leg=new THREE.Mesh(new THREE.BoxGeometry(1.5,14,1.5),conc);leg.position.set(board.position.x+1,36,CEN+dz);E.add(leg)}
  /* light towers at the four corners, banks aimed at the field */
  const lpT=keep(t3Tex(t3LightPanel())),lpm=keep(new THREE.MeshStandardMaterial({map:lpT,emissiveMap:lpT,emissive:'#ffffff',emissiveIntensity:o.night||st==='sunset'?2.2:.05,roughness:.5}));
  const glowT=keep(t3Tex(t3Glow())),glowM=keep(new THREE.SpriteMaterial({map:glowT,color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:o.night?.95:st==='sunset'?.45:0,toneMapped:false}));
  for(const [tx,tz] of [[-53,-53],[173,-53],[-53,FW+53],[173,FW+53]]){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.6,72,8),conc);pole.position.set(tx,36,tz);E.add(pole);
    const bank=new THREE.Mesh(new THREE.BoxGeometry(16,9,1.2),[dark,dark,dark,dark,lpm,dark]);bank.position.set(tx,76,tz);bank.lookAt(60,0,CEN);E.add(bank);
    if(glowM.opacity>0){const sp=new THREE.Sprite(glowM);sp.scale.set(70,70,1);sp.position.copy(bank.position);E.add(sp)}}
  /* the crowd */
  const crowd=t3Crowd(o);E.add(crowd);
  const side=t3Sideline(o);E.add(side);own.push(side.material,side.geometry,side.material.uniforms.uTex.value);
  /* sky */
  const sky=t3Sky(st);E.add(sky);own.push(sky.material,sky.geometry,crowd.material,crowd.geometry,crowd.material.uniforms.uTex.value);
  E.traverse(x=>{if(x.isMesh&&x.geometry)own.push(x.geometry)});
  const env={group:E,own,crowd,side,board:{cv:bcv,tex:bt,key:''},night:o.night,stage:st,wk,field,o,logo:lgo,lk:null,ln:0};
  t3Logos(env);return env;
}
function t3Dispose(env){if(!env)return;env.dead=true;env.group.parent&&env.group.parent.remove(env.group);const seen=new Set();for(const x of env.own){if(!x||seen.has(x))continue;seen.add(x);if(x.dispose)x.dispose()}}
