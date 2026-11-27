/* =========================================================
   08t · 3D broadcast style, part 1b: real stadiums (t.std from an imported stadiums file, 02c; v:1 or v:2)
   The design + the capacity, the host's colours, the venue's name and the imported logo (the ribbon boards and the
   video board share the env's canvases, 08t-scene) → one THREE.Group, built once per design and kept for the session
   (S3.cache, the S3.max most recent; t3Dispose never touches it, an eviction disposes everything it owns).
   Layout: the stands' inner edge is a rounded rectangle around the field with its own distance to each end and a
   radius per corner (0 = an open corner): bowl closes every corner next to a seated end, horse curves its bigger end
   into a half circle, u squares off its closed end, side keeps the sideline stands. Every stand is one cross-section
   (wall, walkway, 1–3 decks with suites, overhangs and fascia ribbons, back wall, rim, outer facade) lofted along its
   piece of that edge, the corners blending the side's section into the end's. Rows come from the capacity (a 107k
   bowl towers, a 15k grandstand stays small). Ends are big / medium / small stands, a grass hill, a building or
   open (wall + backdrop). Far = the press-box side (the TV camera looks across at it, as documented); the ends as
   documented, mirrored while the user defends (like 08g stdEnd); near = the stands behind the camera, cut away by
   two clipping planes in the TV shots (s3Frame) so they never block the picture.
   Draw calls: one vertex-coloured structure mesh (concrete, facades, press box, hills, hedges, towers, trees, arches,
   canopies, light poles, ground), one each for seats, ribbon boards, glass, light panels, light glows (billboards),
   the instanced crowd, the backdrop ring, water, dome, the board and the two signs; pyro only while it burns.
   ========================================================= */
const S3={cache:new Map(),max:3,ms:0,pyro:0,clipA:null,clipB:null};
const S3RK={L:3,M:2,S:1};
function s3Design(h,o){if(!h||o.neutral||typeof stdOf!=='function')return null;const sd=stdOf(h);return sd?s3Norm(sd):null}
function s3Norm(sd){const v2=sd.v===2,d=clamp(sd.d|0||2,1,3),ft=Array.isArray(sd.ft)?sd.ft.slice():[];
  return {sh:['bowl','horse','u','side'].includes(sd.sh)?sd.sh:'bowl',dF:d,dN:v2?clamp(sd.d2|0||1,1,3):d===3?3:Math.max(1,d-1),L:sd.L||'M',R:sd.R||'M',
    bd:sd.bd||'',bs:sd.bs||'',ft,sc:sd.sc||null,tf:sd.tf||'',gr:!!sd.gr,rf:!!sd.rf||ft.includes('dome'),cap:clamp(+sd.cap||40000,5000,120000),el:+sd.el||0,ct:sd.ct||'',op:+sd.op||0,
    has(f){return this.ft.indexOf(f)>=0}}}
/* ---------- geometry accumulators: one per material, flat-shaded triangles ---------- */
function s3Acc(uv){return {p:[],n:[],c:[],u:uv?[]:null}}
function s3Tri(A,a,b,c,col,ua,ub,uc,want){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz);if(l<1e-7)return;nx/=l;ny/=l;nz/=l;
  if(want&&nx*want[0]+ny*want[1]+nz*want[2]<0){const t=b;b=c;c=t;const q=ub;ub=uc;uc=q;nx=-nx;ny=-ny;nz=-nz}
  A.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);A.n.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);A.c.push(col.r,col.g,col.b,col.r,col.g,col.b,col.r,col.g,col.b);
  if(A.u)A.u.push(ua?ua[0]:0,ua?ua[1]:0,ub?ub[0]:0,ub?ub[1]:0,uc?uc[0]:0,uc?uc[1]:0)}
function s3Quad(A,a,b,c,d,col,ua,ub,uc,ud,want){s3Tri(A,a,b,c,col,ua,ub,uc,want);s3Tri(A,a,c,d,col,ua,uc,ud,want)}
/* a three.js geometry (transformed by m) into an accumulator; us/vs scale its uvs */
function s3Geo(A,g,m,col,us,vs){const G=g.index?g.toNonIndexed():g;if(m)G.applyMatrix4(m);const P=G.attributes.position.array,Nn=G.attributes.normal.array,U=G.attributes.uv?G.attributes.uv.array:null,n=P.length/3;
  for(let i=0;i<P.length;i++){A.p.push(P[i]);A.n.push(Nn[i])}for(let i=0;i<n;i++)A.c.push(col.r,col.g,col.b);
  if(A.u)for(let i=0;i<n;i++)A.u.push(U?U[i*2]*(us||1):0,U?U[i*2+1]*(vs||1):0);if(G!==g)G.dispose();g.dispose()}
function s3Mesh(A,mat){if(!A.p.length)return null;const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(A.p,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(A.n,3));
  if(mat.vertexColors)G.setAttribute('color',new THREE.Float32BufferAttribute(A.c,3));if(A.u)G.setAttribute('uv',new THREE.Float32BufferAttribute(A.u,2));G.computeBoundingSphere();return new THREE.Mesh(G,mat)}
/* ---------- pieces of the inner edge: at(u,d) → [x, z, nx, nz] (d yards outward), L(d) the length at depth d ---------- */
function s3Line(ax,az,bx,bz,nx,nz){const L=Math.hypot(bx-ax,bz-az);return {L:()=>L,at:(u,d)=>[ax+(bx-ax)*u+nx*d,az+(bz-az)*u+nz*d,nx,nz],N:1}}
function s3Arc(cx,cz,r,a0,a1){return {L:d=>(r+d)*Math.abs(a1-a0),at:(u,d)=>{const a=a0+(a1-a0)*u,c=Math.cos(a),s=Math.sin(a);return [cx+(r+d)*c,cz+(r+d)*s,c,s]},N:Math.max(5,Math.ceil(Math.abs(a1-a0)*(r+25)/7))}}
/* ---------- the cross-section: 15 points (d, h), 14 segments; a missing deck collapses to a point ----------
   0 wall · 1 walkway · 2 deck 1 · 3 suites / back · 4 overhang · 5 fascia · 6 deck 2 · 7 · 8 · 9 · 10 deck 3 · 11 back wall · 12 rim · 13 facade */
const S3RISE=[.42,.55,.64],S3RD=.95;
function s3Prof(rows,suites){const P=[[0,0],[0,2.2],[1.2,2.2]];let d=1.2,h=2.2;
  for(let k=0;k<3;k++){const n=rows[k]||0;
    if(k>0){if(n>0){const gH=suites?(k===1?4.4:3.4):2.4,oh=Math.min(6,(rows[k-1]||0)*S3RD*.2);P.push([d,h+gH],[d-oh,h+gH]);d-=oh;h+=gH;P.push([d,h+1.2]);h+=1.2}else P.push([d,h],[d,h],[d,h])}
    if(n>0){d+=n*S3RD;h+=n*S3RISE[k]}P.push([d,h])}
  P.push([d,h+2.4]);h+=2.4;P.push([d+1.6,h]);d+=1.6;P.push([d,0]);return {P,R:rows.slice(0,3).map(x=>x||0),D:d,H:h}}
function s3Lerp(A,B,t){if(t<=0)return A;if(t>=1)return B;return {P:A.P.map((p,i)=>[p[0]+(B.P[i][0]-p[0])*t,p[1]+(B.P[i][1]-p[1])*t]),R:A.R.map((r,i)=>r+(B.R[i]-r)*t),D:A.D+(B.D-A.D)*t,H:A.H+(B.H-A.H)*t}}
const s3Smooth=u=>u*u*(3-2*u);
/* segment roles: [material, colour key, facing (in/up weights)] */
const S3IN=[1,0],S3UP=[0,1],S3IU=[1,1],S3DN=[0,-1],S3OUT=[-1,0];
function s3Segs(suites,cl){const g=suites?['glass',null,S3IN]:['st',cl.dark,S3IN];
  return [['rib',null,S3IN],['st',cl.conc,S3UP],['seat',0,S3IU],g,['st',cl.under,S3DN],['rib',null,S3IN],['seat',1,S3IU],g,['st',cl.under,S3DN],['rib',null,S3IN],['seat',2,S3IU],['st',cl.dark,S3IN],['st',cl.conc,S3UP],['st',cl.fac,S3OUT]]}
/* loft a section along a piece: prof(u) → {P, R}; segs per segment; caps close an end of the piece that has no neighbour */
function s3Loft(B,pc,prof,segs,capA,capB,capCol){const N=pc.N,st=[];for(let i=0;i<=N;i++)st.push(prof(i/N));
  const W=(q,h)=>[q[0],h,q[1]];
  for(let k=0;k<segs.length;k++){const [key,cv,f]=segs[k];if(!key)continue;const A=B[key],col=key==='st'?cv:B.white;
    for(let i=0;i<N;i++){const u0=i/N,u1=(i+1)/N,p0=st[i],p1=st[i+1],a0=p0.P[k],b0=p0.P[k+1],a1=p1.P[k],b1=p1.P[k+1];
      if(Math.abs(b0[0]-a0[0])+Math.abs(b0[1]-a0[1])<.02&&Math.abs(b1[0]-a1[0])+Math.abs(b1[1]-a1[1])<.02)continue;
      const qa0=pc.at(u0,a0[0]),qb0=pc.at(u0,b0[0]),qa1=pc.at(u1,a1[0]),qb1=pc.at(u1,b1[0]);
      const dm=(a0[0]+b0[0])/2,s0=pc.L(dm)*u0,s1=pc.L(dm)*u1,nx=(qa0[2]+qa1[2])/2,nz=(qa0[3]+qa1[3])/2,want=[-nx*f[0],f[1],-nz*f[0]];
      let U=null;if(A.u){const sc=key==='seat'?24:key==='rib'?22:8,v0=key==='seat'?Math.max(1,Math.round(p0.R[cv])):1,v1=key==='seat'?Math.max(1,Math.round(p1.R[cv])):1;U=[[s0/sc,0],[s1/sc,0],[s1/sc,v1],[s0/sc,v0]]}
      s3Quad(A,W(qa0,a0[1]),W(qa1,a1[1]),W(qb1,b1[1]),W(qb0,b0[1]),col,U&&U[0],U&&U[1],U&&U[2],U&&U[3],want)}}
  for(const [on,u] of [[capA,0],[capB,1]]){if(!on)continue;const pr=st[u?N:0],pts=[];for(const p of pr.P){const l=pts[pts.length-1];if(!l||Math.abs(l.x-p[0])+Math.abs(l.y-p[1])>.01)pts.push(new THREE.Vector2(p[0],p[1]))}
    if(pts.length>2&&pts[0].distanceTo(pts[pts.length-1])<.01)pts.pop();if(pts.length<3)continue;let tri;try{tri=THREE.ShapeUtils.triangulateShape(pts,[])}catch(e){continue}
    const q0=pc.at(u,0),q1=pc.at(Math.abs(u-.02),0),tx=(q0[0]-q1[0])*(u?1:1),tz=q0[1]-q1[1],tl=Math.hypot(tx,tz)||1,want=[tx/tl,0,tz/tl];
    const w=p=>{const q=pc.at(u,p.x);return [q[0],p.y,q[1]]};for(const t of tri)s3Tri(B.st,w(pts[t[0]]),w(pts[t[1]]),w(pts[t[2]]),capCol,null,null,null,want)}
  return st}
/* ---------- the plan: where every piece goes and how many rows it holds ---------- */
function s3Plan(n){
  const rk=c=>S3RK[c]||0,cap=n.cap,cz=CEN,hz=CEN+(cap<25000?11:cap<50000?13:15),e0=c=>c==='O'?15:cap<25000?10:12;
  let xL=60+e0(n.L),xR=60+e0(n.R);const r={FL:0,FR:0,NL:0,NR:0},R0=cap<40000?12:cap<70000?17:21,closed=rk(n.R)>=rk(n.L)?'R':'L';
  if(n.sh==='bowl'){if(rk(n.L)>=2)r.FL=r.NL=R0;if(rk(n.R)>=2)r.FR=r.NR=R0}
  else if(n.sh==='horse'&&rk(n[closed])>=2){const x=60+hz-Math.sqrt(Math.max(0,(hz-8)**2-CEN*CEN))+1;if(closed==='R'){xR=Math.max(xR,x);r.FR=r.NR=hz}else{xL=Math.max(xL,x);r.FL=r.NL=hz}}
  else if(n.sh==='u'&&rk(n[closed])>=2){if(closed==='R')r.FR=r.NR=7;else r.FL=r.NL=7}
  const aL=60-xL,aR=60+xR,zF=cz-hz,zN=cz+hz,xs=n.sh==='side'?(cap<20000?50:57):0;
  const sx0=k=>r[k]?aL+r[k]:xs?60-xs:aL+3,sx1=k=>r[k]?aR-r[k]:xs?60+xs:aR-3;
  const halfW=c=>c==='O'?34:rk(c)?(rk(c)===1?29:31):33;
  const ez=(e,f,nn)=>[r[f]?zF+r[f]:cz-halfW(n[e]),r[nn]?zN-r[nn]:cz+halfW(n[e])];
  const [lz0,lz1]=ez('L','FL','NL'),[rz0,rz1]=ez('R','FR','NR');
  const split=(R,d)=>{R=Math.max(3,Math.round(R));if(d===1)return [R,0,0];if(d===2){const a=Math.round(R*.56);return [a,R-a,0]}const a=Math.round(R*.42),b=Math.round(R*.2);return [a,b,R-a-b]};
  const eRows=(c,Rs)=>c==='L'?Rs*.85:c==='M'?Rs*.5:c==='S'?Math.max(6,Rs*.24):0,eDk=c=>c==='L'?(n.dF>=3||cap>=85000?2:1):c==='M'&&cap>=95000?2:1;
  const profs=Rs=>({F:s3Prof(split(Rs,n.dF),1),N:s3Prof(split(Rs*(n.dN<n.dF?.85:1),n.dN),0),L:rk(n.L)?s3Prof(split(eRows(n.L,Rs),eDk(n.L)),0):null,R:rk(n.R)?s3Prof(split(eRows(n.R,Rs),eDk(n.R)),0):null});
  const rows=p=>p?p.R[0]+p.R[1]+p.R[2]:0;
  const seats=pf=>{let s=(sx1('FR')-sx0('FL'))*rows(pf.F)+(sx1('NR')-sx0('NL'))*rows(pf.N)+(pf.L?(lz1-lz0)*rows(pf.L):0)+(pf.R?(rz1-rz0)*rows(pf.R):0);
    for(const k of ['FL','FR','NL','NR'])if(r[k]){const a=pf[k[0]],b=pf[k[1]]||a;s+=(r[k]+(a.D+b.D)/4)*Math.PI/2*(rows(a)+rows(b))/2}return s/.55};
  let Rs=30;for(let i=0;i<6;i++)Rs=clamp(Rs*cap/Math.max(1,seats(profs(Rs))),8,115);
  const pf=profs(Rs);
  return {n,hz,xL,xR,aL,aR,zF,zN,r,pf,Rs,lz:[lz0,lz1],rz:[rz0,rz1],fx:[sx0('FL'),sx1('FR')],nx:[sx0('NL'),sx1('NR')]}}
/* ---------- canvases ---------- */
function s3SeatCv(n,h){const cv=document.createElement('canvas');cv.width=128;cv.height=16;const g=cv.getContext('2d'),c1=h.c1,c2=h.c2||'#ffffff';
  const metal=n.sc==='metal',cols=metal?['#c3c8cf','#b6bcc4']:n.sc==='primary'?[c1,shade(c1,-.08)]:Array.isArray(n.sc)?n.sc:[c1,lum(c2)>.85||!contrasty(c1,c2)?shade(c1,-.3):c2];
  for(let i=0;i<2;i++){g.fillStyle=cols[i];g.fillRect(i*64,0,64,16)}
  g.fillStyle=metal?'rgba(255,255,255,.5)':'rgba(255,255,255,.18)';g.fillRect(0,1,128,2);
  g.fillStyle=metal?'rgba(40,46,54,.55)':'rgba(10,12,16,.55)';g.fillRect(0,10,128,6);
  g.fillStyle='rgba(20,22,26,.8)';g.fillRect(0,0,3,16);g.fillRect(64,0,3,16);return cv}
/* the backdrop ring (2048 × 256, wraps 360°: u .5 = behind the far side, .25 the right end, .75 the left end) */
function s3Backdrop(cv,n,stg,p){const W=2048,H=256;cv.width=W;cv.height=H;const g=cv.getContext('2d'),r=t3Rng((n.cap|0)+7),N=stg==='night',D=stg==='sunset',sky=SKY3[stg]||SKY3.day,hz=sky[1];
  g.clearRect(0,0,W,H);const mix=(a,b,t)=>{const A=t3Col(a),B=t3Col(b);return '#'+A.lerp(B,t).getHexString()};
  const ridge=(base,amp,col,seed,cut,snow)=>{const q=t3Rng(seed),pts=[];let y=0,v=0;for(let x=0;x<=W;x+=8){v+=(q()-.5)*cut;v*=.92;y=Math.max(-1,Math.min(1,y*.96+v));pts.push([x,H-base-amp*(.55+.45*Math.sin(x/W*Math.PI*6+seed)*.6+y*.5)])}
    pts[pts.length-1][1]=pts[0][1];g.fillStyle=col;g.beginPath();g.moveTo(0,H);for(const [x,yy] of pts)g.lineTo(x,yy);g.lineTo(W,H);g.closePath();g.fill();
    if(snow&&!N){g.save();g.clip();g.fillStyle='rgba(245,248,252,.75)';for(const [x,yy] of pts)if(yy<H-base-amp*.82)g.fillRect(x-5,yy,10,6+r()*5);g.restore()}};
  if(n.has('mountains')){const tall=n.el>4000?1.25:.85;ridge(40,150*tall,N?'#0b1018':mix(hz,'#6e7f9a',.45),3,.5,n.el>4000);ridge(24,95*tall,N?'#070a10':mix(hz,'#4d5f6c',.62),9,.7,false)}
  else ridge(10,26,N?'#06080c':mix(hz,'#6b7a72',.5),5,.4,false);
  if(n.has('skyline')){const x0=W*.36,x1=W*.64;for(let i=0;i<90;i++){const x=x0+r()*(x1-x0),c=1-Math.abs((x-W/2)/(x1-x0))*1.6,bw=14+r()*26,bh=(30+r()*110)*Math.max(.25,c);
      g.fillStyle=N?'#0a0d14':mix(hz,r()<.5?'#5a6a80':'#76869a',.5);g.fillRect(x,H-18-bh,bw,bh+18);
      if(N){g.fillStyle='rgba(255,214,140,.85)';for(let wy=H-14-bh;wy<H-22;wy+=6)for(let wx=x+3;wx<x+bw-3;wx+=5)if(r()<.3)g.fillRect(wx,wy,2,3)}}}
  /* treeline: everywhere a little, thick with the trees feature */
  const tr=n.has('trees')?1:.45;g.fillStyle=N?'#030504':mix(hz,'#2e4429',.78);for(let x=0;x<W;x+=6){const hh=(10+r()*14+(r()<.15?r()*16:0))*tr+4;g.beginPath();g.ellipse(x,H-4-hh*.4,7,hh*.6,0,0,7);g.fill()}
  g.fillRect(0,H-6,W,6);
  /* haze toward the horizon colour by day */
  if(!N){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,D?'rgba(240,170,110,.18)':'rgba(220,232,245,.18)');g.globalCompositeOperation='source-atop';g.fillStyle=gr;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over'}
  return cv}
/* ---------- glows (light banks, the torch) and pyro: camera-facing billboards in one draw call each ---------- */
function s3Billboards(list,tex,fire){const n=list.length/7,G=new THREE.InstancedBufferGeometry(),q=new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0]);
  G.setAttribute('position',new THREE.BufferAttribute(q,3));G.instanceCount=n;const a=new Float32Array(n*4),c=new Float32Array(n*3);
  for(let i=0;i<n;i++){a.set([list[i*7],list[i*7+1],list[i*7+2],list[i*7+3]],i*4);c.set([list[i*7+4],list[i*7+5],list[i*7+6]],i*3)}
  G.setAttribute('iP',new THREE.InstancedBufferAttribute(a,4));G.setAttribute('iC',new THREE.InstancedBufferAttribute(c,3));
  const M=new THREE.ShaderMaterial({uniforms:{uTex:{value:tex},uOp:{value:1},uT:{value:0},uCut:{value:new THREE.Vector3()}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
    vertexShader:`attribute vec4 iP;attribute vec3 iC;uniform float uT;uniform vec3 uCut;varying vec2 vU;varying vec3 vC;varying float vA;
      void main(){vec3 c=iP.xyz;float s=iP.w,a=1.;${fire?'float ph=fract(uT*1.7+iC.r*7.1),k=iC.g;c.y+=ph*(9.+k*7.);s*=(1.15-ph*.7);a=(1.-ph)*(.55+.45*sin(uT*31.+k*20.));':''}
        vec4 w=modelMatrix*vec4(c,1.);vec4 mv=viewMatrix*w;mv.xy+=position.xy*s;gl_Position=projectionMatrix*mv;vU=position.xy+.5;vC=${fire?'mix(vec3(1.,.82,.35),vec3(1.,.28,.05),ph)':'iC'};vA=a;
        if(uCut.x>.5&&w.z>uCut.y&&w.y>uCut.z+.5*(w.z-uCut.y))gl_Position=vec4(0.,0.,2.,1.);}`,
    fragmentShader:`uniform sampler2D uTex;uniform float uOp;varying vec2 vU;varying vec3 vC;varying float vA;void main(){float t=texture2D(uTex,vU).a;gl_FragColor=vec4(vC*t*uOp*vA,1.);}`});
  const m=new THREE.Mesh(G,M);m.frustumCulled=false;m.renderOrder=5;return m}
/* ---------- build one stadium ---------- */
function s3Build(n,o,tx){
  const h=o.host,P=s3Plan(n),pf=P.pf,own=[],keep=x=>{own.push(x);return x},grp=new THREE.Group(),r=t3Rng(h.id*13+7);grp.name='stadium3d';
  const cl={conc:t3Col('#9a9ea5'),dark:t3Col('#2e333b'),under:t3Col('#3b4048'),fac:t3Col(n.cap>=60000?'#8b8f96':'#7f848b'),grass:t3Col('#4b7f3a'),hedge:t3Col('#2c5b24'),stone:t3Col('#cfc3a6'),roof:t3Col('#dfe3e8'),pole:t3Col('#7d838c'),trk:t3Col('#2c4f2a')};
  const B={st:s3Acc(false),near:s3Acc(false),seat:s3Acc(true),rib:s3Acc(true),glass:s3Acc(true),lp:s3Acc(true),white:t3Col('#ffffff')},tm={t0:performance.now()},glows=[],pyro=[],crowd=[],ext={x:0,z:0,h:0};
  const clip=[S3.clipA||(S3.clipA=new THREE.Plane(new THREE.Vector3(0,0,-1),1e6)),S3.clipB||(S3.clipB=new THREE.Plane(new THREE.Vector3(0,-1,.5).normalize(),1e6))];
  const mat=(M,cut)=>{if(cut!==false){M.clippingPlanes=clip;M.clipIntersection=true}return keep(M)};
  const M={st:mat(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,metalness:0,side:THREE.DoubleSide}))};
  const seatT=keep(t3Tex(s3SeatCv(n,h),true,true));M.seat=mat(new THREE.MeshStandardMaterial({map:seatT,roughness:n.sc==='metal'?.45:.85,metalness:n.sc==='metal'?.35:0,side:THREE.DoubleSide}));
  M.rib=mat(new THREE.MeshStandardMaterial({map:tx.rib,emissiveMap:tx.rib,emissive:'#ffffff',emissiveIntensity:.45,roughness:.6,side:THREE.DoubleSide}));
  M.rib.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n\tif(!gl_FrontFacing)diffuseColor.rgb=vec3(.05,.055,.065);').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n\tif(!gl_FrontFacing)totalEmissiveRadiance=vec3(0.);')};M.rib.customProgramCacheKey=()=>'s3ribFront';
  const suT=keep(t3Tex(t3Suites(),true,true));M.glass=mat(new THREE.MeshStandardMaterial({map:suT,emissiveMap:suT,emissive:'#ffffff',emissiveIntensity:.15,roughness:.35,side:THREE.DoubleSide}));
  const lpT=keep(t3Tex(t3LightPanel()));M.lp=mat(new THREE.MeshStandardMaterial({map:lpT,emissiveMap:lpT,emissive:'#ffffff',emissiveIntensity:.05,roughness:.5,side:THREE.DoubleSide}));
  const segF=s3Segs(true,cl),segO=s3Segs(false,cl);
  /* ---- pieces ---- */
  const {aL,aR,zF,zN,r:rc,hz}=P,cz=CEN,PI=Math.PI,rk=c=>S3RK[c]||0;
  const pcs=[];const add=(id,pc,prof,segs,ca,cb,deckProf)=>{if(pc.L(0)<.4&&!(pc.N>1))return;pcs.push({id,pc,prof,segs,ca,cb});s3Loft(B,pc,prof,segs,ca,cb,cl.fac)};
  const cF=pf.F,cN=pf.N,lerpP=(a,b)=>u=>s3Lerp(a,b,s3Smooth(u));
  add('F',s3Line(P.fx[0],zF,P.fx[1],zF,0,-1),()=>cF,segF,!rc.FL,!rc.FR);
  add('N',s3Line(P.nx[1],zN,P.nx[0],zN,0,1),()=>cN,segO,!rc.NR,!rc.NL);
  if(rc.FR)add('FR',s3Arc(aR-rc.FR,zF+rc.FR,rc.FR,-PI/2,0),lerpP(cF,pf.R),segF,0,0);
  if(rc.NR)add('NR',s3Arc(aR-rc.NR,zN-rc.NR,rc.NR,0,PI/2),lerpP(pf.R,cN),segO,0,0);
  if(rc.NL)add('NL',s3Arc(aL+rc.NL,zN-rc.NL,rc.NL,PI/2,PI),lerpP(cN,pf.L),segO,0,0);
  if(rc.FL)add('FL',s3Arc(aL+rc.FL,zF+rc.FL,rc.FL,PI,PI*1.5),lerpP(pf.L,cF),segF,0,0);
  const endInfo={};
  for(const e of ['L','R']){const c=n[e],s=e==='L'?-1:1,x=e==='L'?aL:aR,[z0,z1]=e==='L'?P.lz:P.rz,pc=e==='L'?s3Line(x,z1,x,z0,-1,0):s3Line(x,z0,x,z1,1,0),
      ca=e==='L'?!rc.NL:!rc.FR,cb=e==='L'?!rc.FL:!rc.NR;endInfo[e]={x,s,c,D:0,H:2,z0,z1};
    if(rk(c)){if(Math.abs(z1-z0)>.4)add(e,pc,()=>pf[e],segO,ca,cb);endInfo[e].D=pf[e].D;endInfo[e].H=pf[e].H}
    else if(c==='B'){/* grass hill: a low wall, then a long green slope people sit on */
      const hp={P:[[0,0],[0,1.1],[1.2,1.1],[27,9.5],[32,10.2],[42,0]],R:[0,0,0]},hs=[['st',cl.conc,S3IN],['st',cl.conc,S3UP],['st',cl.grass,S3IU],['st',cl.grass,S3UP],['st',t3Col('#3f6f31'),[-1,1]]];
      s3Loft(B,pc,()=>hp,hs,1,1,cl.grass);endInfo[e].D=42;endInfo[e].H=10.2;
      const L=pc.L(0);for(let d=3;d<26;d+=1.5)for(let j=0;j<L/1.15;j++){if(r()>.5)continue;const u=(j+r())/(L/1.15),q=pc.at(Math.min(1,u),d),hh=1.1+(d-1.2)/(27-1.2)*8.4;crowd.push([q[0],hh-.25,q[1],Math.atan2(q[2],-q[3]),0,e])}}
    else if(c==='X'){/* a building: a few rows in front, a facility with a glass face behind */
      const lp=s3Prof([6,0,0],0);s3Loft(B,pc,()=>lp,segO,1,1,cl.fac);pcs.push({id:e,pc,prof:()=>lp,segs:segO});
      const bh=n.cap>=60000?24:16,bd=16,wz=Math.abs(z1-z0)+6,bx=x+s*(lp.D+bd/2+1);
      s3Geo(B.st,new THREE.BoxGeometry(bd,bh,wz),t3M(bx,bh/2,cz),t3Col('#8e939b'));s3Geo(B.st,new THREE.BoxGeometry(bd+1.5,1,wz+1.5),t3M(bx,bh+.5,cz),cl.roof);
      const gx=x+s*(lp.D+1-.05),gl=new THREE.PlaneGeometry(wz-2,bh-4);s3Geo(B.glass,gl,t3M(gx,bh/2+1,cz,0,-s*PI/2,0),B.white,(wz-2)/8,2);endInfo[e].D=lp.D+bd+1;endInfo[e].H=bh}
    else{/* open: a low wall across the end */
      const wp={P:[[0,0],[0,1.4],[.6,1.4],[.6,0]],R:[0,0,0]};s3Loft(B,pc,()=>wp,[['rib',null,S3IN],['st',cl.conc,S3UP],['st',cl.dark,S3OUT]],1,1,cl.dark);endInfo[e].D=1;endInfo[e].H=1.4}}
  /* ---- extents (for the establishing shot) ---- */
  ext.x=Math.max(P.xL+endInfo.L.D,P.xR+endInfo.R.D,Math.abs(P.fx[0]-60)+4,Math.abs(P.fx[1]-60)+4);ext.z=hz+Math.max(cF.D,cN.D);ext.h=Math.max(cF.H,cN.H);
  /* ---- hedges along the wall, all the way round ---- */
  if(n.has('hedges'))for(const p of pcs){if(p.id==='X')continue;const hp={P:[[-1.9,0],[-1.9,1.35],[-1.5,1.75],[-.5,1.75],[-.15,1.35],[-.15,0]],R:[0,0,0]};
    s3Loft(B,p.pc,()=>hp,[['st',cl.hedge,S3IN],['st',t3Col('#336a2a'),S3IU],['st',t3Col('#3a7430'),S3UP],['st',t3Col('#336a2a'),[-1,1]],['st',cl.hedge,S3OUT]],p.ca,p.cb,cl.hedge)}
  /* ---- the crowd: every seat row of every deck, fans every sp yards (rows skipped in huge bowls to hold ~36k) ---- */
  const tot=n.cap*.55/.82,stride=tot>50000?2:1,sp=stride===2?Math.max(.82,.82*tot/72000):Math.max(.82,.82*tot/36000);
  for(const p of pcs){
    for(let k=0;k<3;k++){const pr0=p.prof(0),pr1=p.prof(1),Rm=Math.ceil(Math.max(pr0.R[k],pr1.R[k],p.prof(.5).R[k]));if(Rm<1)continue;const si=2+4*k;
      const dmid=(pr0.P[si][0]+pr0.P[si+1][0])/2,L=p.pc.L(dmid),nf=Math.max(1,Math.floor(L/sp)),nc=p.pc.N===1?1:Math.max(8,Math.ceil(nf/6)),cols=[];
      for(let c=0;c<=nc;c++)cols.push(p.pc.N===1?pr0:p.prof(c/nc));
      for(let j=0;j<nf;j++){const u0=Math.min(1,Math.max(0,(j+.5)/nf)),pr=cols[Math.round(u0*nc)],nr=pr.R[k],a=pr.P[si],b=pr.P[si+1],R1=Math.max(1,Math.round(nr));
        for(let i=0;i<Rm;i+=stride){if(i>=nr-.3)break;if(r()<.08)continue;const u=Math.min(1,Math.max(0,u0+(r()-.5)*.3/nf)),t=(i+.5)/R1,d=a[0]+(b[0]-a[0])*t,hh=a[1]+(b[1]-a[1])*t,q=p.pc.at(u,d);
          crowd.push([q[0],hh,q[1],Math.atan2(q[2],-q[3]),k,p.id,i,nr])}}}}
  tm.crowd=performance.now();
  /* ---- press box with suites on the far side ---- */
  const pw=clamp(n.cap/1500+22,34,86),ph=n.rf?5:n.cap<30000?6:n.cap<60000?8.5:n.cap<90000?11:14,pbF=zF-(cF.D-(n.rf?9:5.5)),pbB=zF-(cF.D+(n.rf?-1:3.5)),pbz=(pbF+pbB)/2,pby=n.rf?cF.H-ph-3:cF.H-1;
  s3Geo(B.st,new THREE.BoxGeometry(pw,ph+1,pbF-pbB),t3M(60,pby+(ph+1)/2,pbz),t3Col('#3a3f47'));s3Geo(B.st,new THREE.BoxGeometry(pw+3,1,pbF-pbB+3),t3M(60,pby+ph+1.5,pbz+.5),cl.roof);
  s3Geo(B.glass,new THREE.PlaneGeometry(pw-2,ph-1.5),t3M(60,pby+.5+ph/2,pbF+.06),B.white,(pw-2)/7,ph>=11?2:1);
  ext.h=Math.max(ext.h,pby+ph+2);
  const vn=t3Venue(),signs=[];
  if(vn){const sw=Math.min(pw*.86,66),sT=keep(t3Tex(t3Sign(vn,h.c1))),sm=keep(new THREE.MeshBasicMaterial({map:sT,toneMapped:false})),sg=new THREE.Mesh(keep(new THREE.PlaneGeometry(sw,sw*112/1024)),sm);
    sg.position.set(60,pby+ph+2+sw*112/2048,pbF+1.6);grp.add(sg);signs.push(sT);
    if(!n.has('hedges')){const wT=keep(t3Tex(t3WallSign(vn,h.c1)));M.ws=keep(new THREE.MeshStandardMaterial({map:wT,emissiveMap:wT,emissive:'#ffffff',emissiveIntensity:.45,roughness:.6}));
      const ws=new THREE.Mesh(keep(new THREE.PlaneGeometry(24,24*96/1024)),M.ws);ws.position.set(60,1.15,zF+.06);grp.add(ws);signs.push(wT)}}
  /* ---- video board ---- */
  let bw=clamp(n.cap/2600,15,40)*(n.has('board')?1.45:1),bh=bw/2,board=null;
  const bdE=n.bd==='L'||n.bd==='R'?endInfo[n.bd]:null;
  if(bdE||n.bs==='N'){let x,y,z,ry;
    if(bdE){const sx=bdE.s,free=!rk(bdE.c);x=bdE.x+sx*(free?(bdE.c==='O'?9:bdE.D+4):bdE.D+1.5);y=(free?(bdE.c==='X'?bdE.H+2:7):bdE.H+1)+bh/2;z=cz;ry=-sx*PI/2;
      for(const dz of [-bw*.3,bw*.3])s3Geo(B.st,new THREE.BoxGeometry(1.2,y-bh/2,1.2),t3M(x+sx*.8,(y-bh/2)/2,cz+dz),cl.pole)}
    else{x=60;z=zN+cN.D+1.5;y=cN.H+1+bh/2;ry=PI}
    M.board=keep(new THREE.MeshBasicMaterial({map:tx.board,toneMapped:false}));board=new THREE.Mesh(keep(new THREE.PlaneGeometry(bw,bh)),M.board);board.position.set(x,y,z);board.rotation.y=ry;grp.add(board);
    const fr=new THREE.BoxGeometry(bw+2,bh+2,1.4);s3Geo(B.st,fr,new THREE.Matrix4().compose(new THREE.Vector3(x-Math.sin(ry)*.8,y,z-Math.cos(ry)*.8),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(1,1,1)),t3Col('#1b1f26'));
    ext.h=Math.max(ext.h,y+bh/2)}
  /* ---- canopy roofs over the stands ---- */
  if(n.has('canopy'))for(const p of pcs){if(!(p.id[0]==='F'||p.id[0]==='N'||n.sh==='bowl'))continue;if((p.id==='L'||p.id==='R')&&!rk(n[p.id]))continue;
    const cp=u=>{const s=p.prof(u),cw=Math.min(s.D*.46,24),y=s.H+6.5;return {P:[[s.D-1,y],[s.D-cw,y+cw*.1],[s.D-cw,y+cw*.1-.9],[s.D-1,y-.8]],R:[0,0,0]}};
    s3Loft(B,p.pc,cp,[['st',cl.roof,S3UP],['st',t3Col('#4a5058'),S3IN],['st',t3Col('#3b4048'),S3DN]],0,0,cl.dark);
    const L=p.pc.L(0),nc=Math.max(1,Math.round(L/30));for(let i=0;i<=nc;i++){const u=i/nc,s=p.prof(u),q=p.pc.at(u,s.D-1.2);s3Geo(B.st,new THREE.BoxGeometry(1,8,1),t3M(q[0],s.H+3.5,q[1]),cl.pole)}
    const nl=Math.max(2,Math.round(L/20));for(let i=0;i<nl;i++){const u=(i+.5)/nl,s=p.prof(u),cw=Math.min(s.D*.46,24),q=p.pc.at(u,s.D-cw+.5);glows.push(q[0],s.H+6.5+cw*.1-1.2,q[1],26,1,1,.96)}
    ext.h=Math.max(ext.h,p.prof(.5).H+12)}
  /* ---- lights: a ring on the rim of big bowls, towers at the corners of the rest, under the roof in a dome ---- */
  const ring=!n.rf&&!n.has('canopy')&&((n.sh==='bowl'&&n.cap>=50000)||n.dF>=3);
  const bank=(x,y,z,w,hh,gs)=>{const pl=new THREE.PlaneGeometry(w,hh),m=new THREE.Matrix4().lookAt(new THREE.Vector3(x,y,z),new THREE.Vector3(60,0,cz),new THREE.Vector3(0,1,0));m.setPosition(x,y,z);
    const f=new THREE.Matrix4().makeRotationY(PI);s3Geo(B.lp,pl,m.clone().multiply(f),B.white);s3Geo(B.st,new THREE.BoxGeometry(w+.6,hh+.6,.8),m.clone().multiply(new THREE.Matrix4().makeTranslation(0,0,.5)),t3Col('#23272e'));glows.push(x,y,z,gs,1,1,.97)};
  if(n.rf){}else if(ring){for(const [p,cnt] of [['F',6],['N',6]]){const pr=p==='F'?cF:cN,z=p==='F'?zF-pr.D+.8:zN+pr.D-.8;for(let i=0;i<cnt;i++){const x=60+(i-(cnt-1)/2)*(Math.min(P.fx[1]-P.fx[0],130)/cnt);
        if(p==='F'&&Math.abs(x-60)<pw/2+3)continue;s3Geo(B.st,new THREE.BoxGeometry(.6,5,.6),t3M(x,pr.H+2.5,z),cl.pole);bank(x,pr.H+6,z,9,4,32)}}
    for(const e of ['L','R'])if(rk(n[e])>=2){const E=endInfo[e];for(const dz of [-18,18]){const x=E.x+E.s*(E.D-.8);s3Geo(B.st,new THREE.BoxGeometry(.6,5,.6),t3M(x,E.H+2.5,cz+dz),cl.pole);bank(x,E.H+6,cz+dz,9,4,32)}}}
  else{const tH=Math.max(cF.H,cN.H)+24,tx0=Math.max(n.sh==='side'?P.fx[1]-60-6:P.xR-2,40),pos=[[60-tx0,zF-cF.D-5],[60+tx0,zF-cF.D-5],[60-tx0,zN+cN.D+5],[60+tx0,zN+cN.D+5]];
    for(const [x,z] of pos){s3Geo(z>cz?B.near:B.st,new THREE.CylinderGeometry(.7,1.3,tH,8),t3M(x,tH/2,z),cl.pole);bank(x,tH+4,z,14,8,60)}ext.h=Math.max(ext.h,tH+8)}
  /* ---- dome: a superelliptic roof over the rim, lit from inside ---- */
  if(n.rf){const Rx=ext.x+3,Rz=ext.z+3,H0=Math.max(cF.H,cN.H,endInfo.L.H,endInfo.R.H)+1,Hd=Math.max(26,Rx*.24),A=s3Acc(false),NS=56,NR=9,pt=(i,j)=>{const th=i/NS*PI*2,ph=j/NR*PI/2,c=Math.cos(th),s=Math.sin(th),rr=Math.pow(Math.pow(Math.abs(c)/Rx,4)+Math.pow(Math.abs(s)/Rz,4),-.25)*Math.sin(PI/2-ph);return [60+c*rr,H0+Hd*Math.sin(ph),cz+s*rr]};
    for(let i=0;i<NS;i++)for(let j=0;j<NR;j++){const col=t3Col(i%2?'#e3e6ea':'#d2d6dc');s3Quad(A,pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1),col,null,null,null,null,[0,1,0])}
    for(let i=0;i<NS;i++)s3Quad(A,pt(i,0),pt(i+1,0),[pt(i+1,0)[0],0,pt(i+1,0)[2]],[pt(i,0)[0],0,pt(i,0)[2]],cl.fac,null,null,null,null,null);
    M.dome=mat(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide,emissive:'#9aa1ab',emissiveIntensity:.32}));const dm=s3Mesh(A,M.dome);if(dm){keep(dm.geometry);grp.add(dm)}
    for(let i=0;i<20;i++){const th=i/20*PI*2,c=Math.cos(th),s=Math.sin(th),rr=Math.pow(Math.pow(Math.abs(c)/Rx,4)+Math.pow(Math.abs(s)/Rz,4),-.25)*.62;glows.push(60+c*rr,H0+Hd*.72,cz+s*rr,22,1,.98,.93)}
    ext.h=H0+Hd}
  /* ---- arches (a peristyle behind the smaller end) and its torch ---- */
  if(n.has('arches')){const e=rk(n.L)<=rk(n.R)?'L':'R',E=endInfo[e],wz=74,ah=Math.max(E.H+12,22),sh=new THREE.Shape();sh.moveTo(-wz/2,0);sh.lineTo(wz/2,0);sh.lineTo(wz/2,ah);sh.lineTo(-wz/2,ah);sh.closePath();
    const na=11,aw=wz/na;for(let i=0;i<na;i++){const c=-wz/2+aw*(i+.5),w2=aw*.32,top=ah-4.5,hp=new THREE.Path();hp.moveTo(c-w2,1.5);hp.lineTo(c+w2,1.5);hp.lineTo(c+w2,top-w2);hp.absarc(c,top-w2,w2,0,PI,false);hp.lineTo(c-w2,1.5);sh.holes.push(hp)}
    const g=new THREE.ExtrudeGeometry(sh,{depth:2.5,bevelEnabled:false,curveSegments:6}),xb=E.x+E.s*(E.D+3),m=new THREE.Matrix4().makeBasis(new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),new THREE.Vector3(-1,0,0));m.setPosition(xb,0,cz);
    s3Geo(B.st,g,m,cl.stone);s3Geo(B.st,new THREE.BoxGeometry(4,4,6),t3M(xb,ah+2,cz),cl.stone);s3Geo(B.st,new THREE.CylinderGeometry(2.6,1.2,2,10),t3M(xb,ah+5,cz),t3Col('#6b5a3a'));
    glows.push(xb,ah+7.5,cz,14,1,.62,.22);ext.h=Math.max(ext.h,ah+8)}
  /* ---- a landmark tower beyond the smaller end, behind the far side ---- */
  if(n.has('tower')){const e=rk(n.L)<rk(n.R)?'L':'R',s=e==='L'?-1:1,x=60+s*(Math.max(P.xL,P.xR)+40),z=zF-cF.D-70,th=Math.max(70,cF.H+40);
    s3Geo(B.st,new THREE.BoxGeometry(9,th,9),t3M(x,th/2,z),t3Col('#d7cdb6'));s3Geo(B.st,new THREE.BoxGeometry(12,12,12),t3M(x,th+6,z),t3Col('#e2d9c4'));s3Geo(B.st,new THREE.BoxGeometry(14,1.2,14),t3M(x,th,z),cl.stone);
    s3Geo(B.st,new THREE.ConeGeometry(8.5,10,4),t3M(x,th+17,z,0,PI/4,0),t3Col('#a99b7d'));for(const [dx,dz,ry] of [[0,6.05,0],[6.05,0,PI/2]])s3Geo(B.st,new THREE.CircleGeometry(3.2,16),t3M(x+dx,th+6.5,z+dz,0,ry,0),t3Col('#f4f1e8'));
    glows.push(x,th+6,z,30,t3Col(h.c1).r*.6+.4,t3Col(h.c1).g*.6+.3,t3Col(h.c1).b*.6+.2)}
  /* ---- the ground around: a plaza, lawns, parking, trees, a skyline and water by the features ---- */
  {const A=B.st,NS=64,cols=[t3Col('#7f838a'),t3Col('#55823f'),t3Col('#4a7139')];
    const f=th=>{const c=Math.cos(th),s=Math.sin(th);return Math.pow(Math.pow(Math.abs(c)/(ext.x+14),4)+Math.pow(Math.abs(s)/(ext.z+14),4),-.25)};
    for(let i=0;i<NS;i++){const t0=i/NS*PI*2,t1=(i+1)/NS*PI*2;for(let j=0;j<3;j++){const p=(t,k)=>{const rr=k===0?0:k===1?f(t):k===2?f(t)*1.35:900;return [60+Math.cos(t)*rr,-.04,cz+Math.sin(t)*rr]};
      s3Quad(A,p(t0,j),p(t1,j),p(t1,j+1),p(t0,j+1),cols[j],null,null,null,null,[0,1,0])}}
    const lots=4+(r()*3|0);for(let i=0;i<lots;i++){const th=r()*PI*2,d=f(th)*1.55+30+r()*60,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d;s3Geo(A,new THREE.BoxGeometry(50+r()*40,.05,30+r()*20),t3M(x,-.01,z,0,-th,0),t3Col('#55595f'))}
    const water=n.has('water');let wd=null;if(water){const e=n.L==='O'?'L':n.R==='O'?'R':rk(n.L)<rk(n.R)?'L':'R';wd=e==='L'?-1:1}
    const ntr=n.has('trees')?150:55;for(let i=0;i<ntr;i++){const th=r()*PI*2,d=f(th)*(1.4+r()*(n.has('trees')?1.6:2.6))+12,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d;if(wd&&(x-60)*wd>ext.x+30)continue;
      const tr=2.5+r()*3.5;s3Geo(A,new THREE.IcosahedronGeometry(tr,0),t3M(x,tr*1.1,z,r(),r(),0),t3Col(r()<.5?'#2f5a2a':'#3b6a30'))}
    if(n.has('skyline'))for(let i=0;i<34;i++){const th=-PI/2+(r()-.5)*1.1,d=260+r()*170,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d,bh=20+r()*r()*95,bw=10+r()*16;
      s3Geo(B.glass,new THREE.BoxGeometry(bw,bh,bw),t3M(x,bh/2,z,0,r()*PI,0),B.white,bw/6,bh/5)}
    if(water){const wm=keep(new THREE.MeshStandardMaterial({color:'#2c5872',roughness:.16,metalness:.25}));M.water=wm;const pg=new THREE.PlaneGeometry(900,1300);pg.rotateX(-PI/2);
      const wx=60+wd*(ext.x+42+450);const w=new THREE.Mesh(keep(pg),wm);w.position.set(wx,-.02,cz);grp.add(w)}}
  /* ---- backdrop ring ---- */
  const bkCv=document.createElement('canvas');s3Backdrop(bkCv,n,o.night?'night':o.dusk?'sunset':'day',P);const bkT=keep(t3Tex(bkCv,true,true));M.bk=keep(new THREE.MeshBasicMaterial({map:bkT,transparent:true,side:THREE.BackSide,depthWrite:false,fog:false}));
  const bg=new THREE.CylinderGeometry(560,560,170,64,1,true);bg.translate(60,83,cz);const bk=new THREE.Mesh(keep(bg),M.bk);bk.renderOrder=-5;bk.frustumCulled=false;grp.add(bk);
  /* ---- pyro along the end-stand rims (or the far rim) ---- */
  if(n.has('pyro')){const spots=[];for(const e of ['L','R'])if(rk(n[e])){const E=endInfo[e];for(const dz of [-22,-8,8,22])spots.push([E.x+E.s*(E.D-1),E.H+1,cz+dz])}
    if(!spots.length)for(const dx of [-40,-20,0,20,40])spots.push([60+dx,cF.H+1,zF-cF.D+1]);
    for(const [x,y,z] of spots)for(let k=0;k<9;k++)pyro.push(x+(r()-.5)*1.5,y,z+(r()-.5)*1.5,4.5,r(),r(),0)}
  /* ---- meshes ---- */
  tm.geo=performance.now();for(const k of ['st','seat','rib','glass','lp']){const m=s3Mesh(B[k],M[k]);if(!m)continue;keep(m.geometry);m.matrixAutoUpdate=false;grp.add(m)}
  const near=s3Mesh(B.near,M.st);if(near){keep(near.geometry);grp.add(near)}
  const glowT=keep(t3Tex(t3Glow(),false));let glow=null,fire=null;
  if(glows.length){glow=s3Billboards(glows,glowT,false);keep(glow.geometry);keep(glow.material);grp.add(glow)}
  if(pyro.length){fire=s3Billboards(pyro,glowT,true);keep(fire.geometry);keep(fire.material);fire.visible=false;grp.add(fire)}
  /* crowd colours: home colours, students in the left end (or the left of the far side), visitors high in the right corner, card stunts on the far side */
  const c1=t3Col(h.c1),c2=t3Col(h.c2||'#ffffff'),wh=t3Col('#f2f2f2'),aw=o.away,a1=t3Col(aw.c1),a2=t3Col(aw.c2||'#ffffff'),misc=['#2b2f36','#6b7280','#9aa3ad','#1f3b70','#5a3a22','#c9c2b0'].map(t3Col),skins=TONES.map(t3Col);
  const studL=rk(n.L)>=1,inst=[],lastF=n.dF-1;
  for(const f of crowd){const [x,y,z,ang,k,id,row,nr]=f;let kind=0;
    if(k===0&&(studL?(id==='L'||id==='FL'):(id==='F'&&x<30)))kind=1;else if((k===lastF&&k>0&&(id==='FR'||id==='F'&&x>92))||(lastF===0&&(id==='R'||id==='FR'||id==='F'&&x>98)&&row>(nr||0)*.5))kind=2;
    const q=r();let col=kind===1?(q<.82?c1:wh):kind===2?(q<.7?a1:q<.85?a2:misc[r()*6|0]):(q<.5?c1:q<.64?c2:q<.74?wh:misc[r()*6|0]);
    if(n.has('cards')&&id==='F'&&k===0&&Math.abs(x-60)<26&&row>1){const v=(Math.floor(Math.abs(x-60)/4.5)+Math.floor(row/3))%3;col=v===0?c1:v===1?c2:wh;kind=0}
    const sk=skins[r()*4|0];inst.push(x,y,z,ang,col.r,col.g,col.b,sk.r,sk.g,sk.b,r(),kind)}
  const fw=.62*Math.max(1,sp/.82)*(stride===2?1.12:1),cm=t3CrowdMesh(inst,t3Fan(),Math.min(.95,fw),stride===2?1.22:1);keep(cm.geometry);keep(cm.material);keep(cm.material.uniforms.uTex.value);grp.add(cm);
  tm.end=performance.now();
  return {group:grp,own,mats:M,crowd:cm,glow,fire,board,bk,bkCv,bkT,near,tm:{crowd:+(tm.crowd-tm.t0).toFixed(1),geo:+(tm.geo-tm.crowd).toFixed(1),mesh:+(tm.end-tm.geo).toFixed(1)},bkStage:o.night?'night':o.dusk?'sunset':'day',signs,n,P,ext,z0:zN,mir:null,fans:inst.length/12}}
function s3Free(st){if(!st)return;st.group.parent&&st.group.parent.remove(st.group);const seen=new Set();for(const x of st.own){if(!x||seen.has(x))continue;seen.add(x);if(x.dispose)x.dispose()}st.own.length=0}
/* ---------- the cache: get or build, attach to the env's group, set the light-stage look ---------- */
function s3Attach(n,o,E,tx){if(G3.R&&!G3.R.localClippingEnabled)G3.R.localClippingEnabled=true;
  const h=o.host,key=[h.id,h.c1,h.c2,h.name,h.city,t3Venue(),o.away.c1,o.away.c2,n.sh,n.dF,n.dN,n.L,n.R,n.bd,n.bs,n.ft.join(','),JSON.stringify(n.sc),n.cap,n.rf?1:0,n.el,G3.fontOk?1:0].join('|');
  let st=S3.cache.get(key);
  if(st){S3.cache.delete(key);S3.cache.set(key,st);st.hit=(st.hit||0)+1}
  else{const t0=performance.now();st=s3Build(n,o,tx);st.ms=+(performance.now()-t0).toFixed(1);S3.ms=st.ms;S3.cache.set(key,st);
    while(S3.cache.size>S3.max){const [k,v]=S3.cache.entries().next().value;S3.cache.delete(k);if(v!==st)s3Free(v)}}
  E.add(st.group);s3Light(st,o,tx);st.mir=null;return st}
function s3Light(st,o,tx){const M=st.mats,N=o.night,D=o.dusk,stg=N?'night':D?'sunset':'day';
  if(M.rib.map!==tx.rib){M.rib.map=M.rib.emissiveMap=tx.rib;M.rib.needsUpdate=true}if(M.board&&M.board.map!==tx.board){M.board.map=tx.board;M.board.needsUpdate=true}
  M.rib.emissiveIntensity=N?1.25:.45;M.st.color.setScalar(N?.28:1);M.seat.color.setScalar(N?.24:1);M.glass.emissiveIntensity=N?.85:.15;M.lp.emissiveIntensity=N||D?2.2:.05;
  if(M.ws)M.ws.emissiveIntensity=N?1.25:.45;if(M.water)M.water.color.set(N?'#08121c':D?'#4a5a70':'#2c5872');if(M.dome)M.dome.emissiveIntensity=N?.12:.32;
  if(st.glow){const op=st.n.rf?.6:N?.95:D?.45:0;st.glow.material.uniforms.uOp.value=op;st.glow.visible=op>0}
  if(st.bkStage!==stg){s3Backdrop(st.bkCv,st.n,stg,st.P);st.bkT.needsUpdate=true;st.bkStage=stg}st.flip=[tx.rib,tx.board,...st.signs]}
/* every frame: mirror with possession (the ends stay with their teams' goals, as in 2D), cut the near stands away in the TV
   shots, burn the pyro */
function s3Frame(env){const st=env&&env.std3;if(!st)return;const now=performance.now();
  const m=typeof uOff==='function'&&!uOff();if(m!==st.mir){st.mir=m;st.group.scale.x=m?-1:1;st.group.position.x=m?120:0;
    for(const t of st.flip){if(!t)continue;t.repeat.x=m?-Math.abs(t.repeat.x||1):Math.abs(t.repeat.x||1);t.offset.x=m&&t.wrapS!==THREE.RepeatWrapping?1:0}}
  const tv=(G3.mode==='tv'||G3.mode==='st')&&!G3.est,z0=st.z0+.2;if(st.near)st.near.visible=!tv;S3.clipA.constant=tv?z0:1e6;S3.clipB.constant=tv?(4-.5*z0)/Math.hypot(1,.5):1e6;
  const cut=st.crowd.material.uniforms.uCut;if(cut)cut.value.set(tv?1:0,z0,4);if(st.glow)st.glow.material.uniforms.uCut.value.set(tv?1:0,z0,4);
  if(st.fire){const on=S3.pyro>now;st.fire.visible=on;if(on){const u=st.fire.material.uniforms;u.uT.value=now/1000;u.uOp.value=Math.min(1,(S3.pyro-now)/600)}}}
function s3Pyro(ms){const st=G3.env&&G3.env.std3;if(st&&st.fire)S3.pyro=performance.now()+(ms||2600)}
if(typeof onFx==='function'){onFx('td',e=>{if(e&&e.team&&typeof hostT==='function'&&e.team===hostT())s3Pyro(2800)});onFx('kickoff',e=>{if(e&&e.why==='Opening kickoff')s3Pyro(2200)})}
/* QA / Settings readout */
function s3Info(){const st=G3.env&&G3.env.std3;return st?{ms:st.ms,fans:st.fans,cached:S3.cache.size,hit:st.hit||0,sh:st.n.sh,rows:Math.round(st.P.Rs),tm:st.tm,ext:{x:Math.round(st.ext.x),z:Math.round(st.ext.z),h:Math.round(st.ext.h)}}:null}
SETTINGS_EXTRA.push({card:'Broadcast',key:'estShot',label:'Stadium flyover',opts:[[1,'On'],[0,'Off']],def:1,bool:true,note:'3D: an aerial shot of the stadium with its name before kickoff, and a short beauty shot at halftime and after the final whistle. Tap to skip.'});
