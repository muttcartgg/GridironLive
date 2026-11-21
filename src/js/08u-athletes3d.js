/* =========================================================
   08u · 3D athletes (CFB27 style): skinned football players, officials, the ball and the penalty flag for the
   three.js scene (THREE r170 global). World: 1 unit = 1 yd, X = field x, Z = field y, Y = up (= engine z).
   ath3dFrame(group,now,dt)  creates (lazily) and updates every player in P, every official (08e), the thrown flag
     and the ball as children of `group`; adds no lights. ath3dReset() disposes everything (game over / new teams).
   FIGURE  a SkinnedMesh body (jersey over shoulder pads, sleeves, pants with stripes, socks + tape, cleats, gloves,
     skin) with one per-team material + atlas, a small skinned number mesh (front/back numbers, alpha-tested digit
     atlas, no shadow) and a rigid helmet (shell, stripes, decal, thin-bar facemask, optional visor, chin strap;
     per-team clearcoat material) → 3 draw calls (+2 shadow). Officials: one draw call (striped shirt, cap).
     15 bones: pelvis, waist, chest, neck, head, upper arm + forearm ×2, thigh + shin + foot ×2. Shapes are lofted
     elliptical cross-sections (sculpted profiles: quads, calves, deltoids, pads, glutes), weights blend across
     every joint. Body geometry is shared per (build, skin tone); width = BUILD × weight, height = pl.ht.
   ANIMATION  the 2D puppet's state machine (08d athPose / athPoseRef: stances, run cycle by distance travelled,
     backpedal, QB drop/aim/throw, catch, juke, spin, stiff arm, truck, hurdle, dive, blocks, swim/rip, tackles,
     falls, get-ups, celebrations, kicks, snaps, officials' signals) gives sagittal joint targets with the same
     lower/upper-body crossfades; 3D adds yaw from velocity (backpedal and shuffles keep the facing), roll into
     cuts from lateral acceleration, torso/hip counter-twist from the arm swing and stride, stance width, two-bone
     IK for legs (planted feet, full stride restored from the side-view foreshortening) and arms (hands converge on
     the ball, reach toward an arriving pass), the carrier's ball in the sideline-side arm, falls in the direction
     of the hit (prone or supine) lying on the turf. Per-figure state lives on p._a3-style records keyed by the
     roster player, so the 2D renderer's own animation state is untouched.
   ========================================================= */
const A3_H0=2.056,A3_TAU=Math.PI*2,A3_AT=512;
const A3_PEL=0,A3_WST=1,A3_CHE=2,A3_NCK=3,A3_HED=4,A3_UAL=5,A3_FAL=6,A3_UAR=7,A3_FAR=8,A3_THL=9,A3_SHL=10,A3_FTL=11,A3_THR=12,A3_SHR=13,A3_FTR=14,A3_NB=15;
const A3={dp:null,da:0,g:null,figs:new Map(),teams:new Map(),geo:new Map(),res:new Set(),ref:null,ball:null,flag:null,fr:0,now:-1,bp:null,bv:null,spin:0,carH:null};
const A3_RG={JER:[0,0,256,192],SLV:[256,0,128,64],CAP:[384,0,128,64],SHO:[256,64,256,128],PAN:[0,192,256,128],SOK:[256,192,128,128],CLT:[384,192,128,64],GLV:[384,256,128,64],
  HTW:[384,256,64,64],HTB:[448,256,64,64],SHL:[0,0,256,192],FM:[0,192,64,64],VIS:[64,192,64,64],CS:[128,192,64,64],BL:[0,0,256,128]};
const a3SKA=i=>[i*128+4,324,56,56],a3SKF=i=>[i*128+64,320,64,64];
const a3S=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const a3W=x=>{while(x>Math.PI)x-=A3_TAU;while(x<-Math.PI)x+=A3_TAU;return x};
const A3WS=[0,0,0];
const a3w=(b0,b1,t)=>{A3WS[0]=b0;A3WS[1]=b1;A3WS[2]=t;return A3WS};

/* ---------- geometry builder: lofted elliptical rings and tubes, smooth normals, auto winding, 2-bone weights ---------- */
function a3Buf(){return {p:[],n:[],u:[],si:[],sw:[],ix:[]}}
function a3Loft(B,o){
  const R=o.r,nr=R.length,n=o.n||12,c=o.c||[0,0,0],X=o.ax==='x',mir=o.mir?-1:1,rg=o.uv,AT=o.at||A3_AT,AH=o.ah||AT,b0=B.p.length/3,N1=n+1;
  const P=new Float64Array(nr*N1*3),C=new Float64Array(nr*3),UV=new Float64Array(nr*N1*2),h0=o.vr?o.vr[0]:R[0][0],h1=o.vr?o.vr[1]:R[nr-1][0];
  const full=!(o.a1!=null||R[0].length>5);
  for(let i=0;i<nr;i++){const q=R[i],h=q[0],ra=q[1],rb=q[2],oa=q[3]||0,ob=(q[4]||0)*mir,a0=q.length>5?q[5]:(o.a0||0),a1=q.length>6?q[6]:(o.a1!=null?o.a1:a0+A3_TAU);
    if(X){C[i*3]=c[0]+h;C[i*3+1]=c[1]+oa;C[i*3+2]=c[2]+ob}else{C[i*3]=c[0]+oa;C[i*3+1]=c[1]+h;C[i*3+2]=c[2]+ob}
    const v=(h-h0)/((h1-h0)||1);
    for(let j=0;j<=n;j++){const an=a0+(a1-a0)*j/n,am=an*mir,ca=Math.cos(am),sa=Math.sin(am),k=(i*N1+j)*3;
      if(X){P[k]=C[i*3];P[k+1]=C[i*3+1]+ra*ca;P[k+2]=C[i*3+2]+rb*sa;if(o.flat!=null&&P[k+1]<o.flat)P[k+1]=o.flat+(P[k+1]-o.flat)*.08}
      else{P[k]=C[i*3]+ra*ca;P[k+1]=C[i*3+1];P[k+2]=C[i*3+2]+rb*sa}
      const u=o.ua?(an-o.ua[0])/(o.ua[1]-o.ua[0]):j/n,vv=o.vf?1-v:v;UV[(i*N1+j)*2]=(rg[0]+rg[2]*u)/AT;UV[(i*N1+j)*2+1]=1-(rg[1]+rg[3]*vv)/AH}}
  const Nn=new Float64Array(P.length),g=(i,j,d)=>P[(i*N1+j)*3+d];
  for(let i=0;i<nr;i++)for(let j=0;j<=n;j++){
    const jp=j<n?j+1:(full?1:n),jm=j>0?j-1:(full?n-1:0),ip=Math.min(i+1,nr-1),im=Math.max(i-1,0);
    const ax=g(i,jp,0)-g(i,jm,0),ay=g(i,jp,1)-g(i,jm,1),az=g(i,jp,2)-g(i,jm,2),tx=g(ip,j,0)-g(im,j,0),ty=g(ip,j,1)-g(im,j,1),tz=g(ip,j,2)-g(im,j,2);
    let nx=ay*tz-az*ty,ny=az*tx-ax*tz,nz=ax*ty-ay*tx;const ci=(i===0&&nr>1)?1:(i===nr-1&&nr>1)?nr-2:i,k=(i*N1+j)*3;
    const dx=P[k]-C[ci*3],dy=P[k+1]-C[ci*3+1],dz=P[k+2]-C[ci*3+2];if(nx*dx+ny*dy+nz*dz<0){nx=-nx;ny=-ny;nz=-nz}
    let l=Math.hypot(nx,ny,nz);if(l<1e-12){nx=dx;ny=dy;nz=dz;l=Math.hypot(nx,ny,nz)||1}Nn[k]=nx/l;Nn[k+1]=ny/l;Nn[k+2]=nz/l}
  for(let q=0;q<nr*N1;q++){const x=P[q*3],y=P[q*3+1],z=P[q*3+2];B.p.push(x,y,z);B.n.push(Nn[q*3],Nn[q*3+1],Nn[q*3+2]);B.u.push(UV[q*2],UV[q*2+1]);
    const w=o.w(x,y,z);B.si.push(w[0],w[1],0,0);B.sw.push(1-w[2],w[2],0,0)}
  /* winding from a middle quad vs its outward normal */
  const mi=Math.max(0,Math.min(nr-2,(nr-1)>>1)),mj=n>>1,A=(mi*N1+mj)*3,Bq=(mi*N1+mj+1)*3,Cq=((mi+1)*N1+mj)*3;
  const e1x=P[Bq]-P[A],e1y=P[Bq+1]-P[A+1],e1z=P[Bq+2]-P[A+2],e2x=P[Cq]-P[A],e2y=P[Cq+1]-P[A+1],e2z=P[Cq+2]-P[A+2];
  const fx=e1y*e2z-e1z*e2y,fy=e1z*e2x-e1x*e2z,fz=e1x*e2y-e1y*e2x,ccw=fx*Nn[A]+fy*Nn[A+1]+fz*Nn[A+2]>0;
  for(let i=0;i<nr-1;i++)for(let j=0;j<n;j++){const a=b0+i*N1+j,b=a+1,cc=a+N1,d=cc+1;if(ccw)B.ix.push(a,b,cc,b,d,cc);else B.ix.push(a,cc,b,b,cc,d)}
}
function a3Tube(B,pts,r,n,rg,w,AT){
  const b0=B.p.length/3,N1=n+1,m=pts.length;AT=AT||256;
  for(let i=0;i<m;i++){const P0=pts[Math.max(0,i-1)],P1=pts[Math.min(m-1,i+1)],p=pts[i];let tx=P1[0]-P0[0],ty=P1[1]-P0[1],tz=P1[2]-P0[2];const tl=Math.hypot(tx,ty,tz)||1;tx/=tl;ty/=tl;tz/=tl;
    let ux=0,uy=1,uz=0;if(Math.abs(ty)>.9){ux=1;uy=0}let sx=ty*uz-tz*uy,sy=tz*ux-tx*uz,sz=tx*uy-ty*ux;const sl=Math.hypot(sx,sy,sz)||1;sx/=sl;sy/=sl;sz/=sl;
    ux=sy*tz-sz*ty;uy=sz*tx-sx*tz;uz=sx*ty-sy*tx;
    for(let j=0;j<=n;j++){const a=j/n*A3_TAU,ca=Math.cos(a),sa=Math.sin(a),nx=ux*ca+sx*sa,ny=uy*ca+sy*sa,nz=uz*ca+sz*sa;
      B.p.push(p[0]+nx*r,p[1]+ny*r,p[2]+nz*r);B.n.push(nx,ny,nz);B.u.push((rg[0]+rg[2]*(.2+.6*j/n))/AT,1-(rg[1]+rg[3]*(.2+.6*i/(m-1||1)))/AT);B.si.push(w,w,0,0);B.sw.push(1,0,0,0)}}
  const A=b0*3;for(let i=0;i<m-1;i++)for(let j=0;j<n;j++){const a=b0+i*N1+j,b=a+1,c=a+N1,d=c+1;
    const pa=a*3,pb=b*3,pc=c*3,e1x=B.p[pb]-B.p[pa],e1y=B.p[pb+1]-B.p[pa+1],e1z=B.p[pb+2]-B.p[pa+2],e2x=B.p[pc]-B.p[pa],e2y=B.p[pc+1]-B.p[pa+1],e2z=B.p[pc+2]-B.p[pa+2];
    const ok=(e1y*e2z-e1z*e2y)*B.n[pa]+(e1z*e2x-e1x*e2z)*B.n[pa+1]+(e1x*e2y-e1y*e2x)*B.n[pa+2]>0;if(ok)B.ix.push(a,b,c,b,d,c);else B.ix.push(a,c,b,b,c,d)}
  return A}
function a3Geo(B,skin){
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.Float32BufferAttribute(B.p,3));G.setAttribute('normal',new THREE.Float32BufferAttribute(B.n,3));
  G.setAttribute('uv',new THREE.Float32BufferAttribute(B.u,2));if(skin){G.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(B.si,4));G.setAttribute('skinWeight',new THREE.Float32BufferAttribute(B.sw,4))}
  G.setIndex(B.p.length/3>65535?new THREE.Uint32BufferAttribute(B.ix,1):new THREE.Uint16BufferAttribute(B.ix,1));G.computeBoundingSphere();A3.res.add(G);return G}

/* ---------- body builds (height units: 1 = standing height; rest pose: limbs straight down, facing +x, right = +z) ---------- */
function a3Dims(g,ref){const SW=ref?.112:.158*g-.045,HW=.082*Math.sqrt(g),J=new Float64Array(A3_NB*3);
  const S=(i,x,y,z)=>{J[i*3]=x;J[i*3+1]=y;J[i*3+2]=z};S(A3_PEL,0,.52,0);S(A3_WST,0,.61,0);S(A3_CHE,0,.71,0);S(A3_NCK,0,.815,0);S(A3_HED,0,.885,0);
  S(A3_UAL,0,.805,-SW);S(A3_FAL,0,.633,-SW);S(A3_UAR,0,.805,SW);S(A3_FAR,0,.633,SW);S(A3_THL,0,.52,-HW);S(A3_SHL,0,.275,-HW);S(A3_FTL,0,.04,-HW);S(A3_THR,0,.52,HW);S(A3_SHR,0,.275,HW);S(A3_FTR,0,.04,HW);
  const wz=g,wx=Math.pow(g,.85),bel=Math.max(0,g-1.1)*.22,sq=Math.sqrt;
  const TR=ref?[[.575,.074,.104,0],[.62,.078,.108,.004],[.67,.084,.115,.008],[.72,.09,.123,.01],[.765,.092,.13,.008],[.80,.088,.128,.004],[.826,.074,.108,0],[.845,.058,.074,0],[.858,.045,.052,0],[.864,.036,.042,0]]
    :[[.575,.073*wx,.106*wz,0],[.62,(.077+bel)*wx,.11*wz,.004+bel*.7],[.67,(.085+bel*.7)*wx,.121*wz,.008+bel*.4],[.72,.093*wx,.136*wz,.01],[.765,.099*wx,.15*wz,.008],
      [.80,.097*wx,.158*wz,.004],[.83,.087*wx,.14*wz,0],[.848,.066*wx,.09*wz,0],[.858,.05*sq(wx),.058*sq(wz),0],[.864,.04*sq(wx),.046*sq(wz),0]];
  return {g,ref,SW,HW,J,TR}}
const a3TW=y=>y<.63?a3w(A3_PEL,A3_WST,a3S(.565,.65,y)):a3w(A3_WST,A3_CHE,a3S(.665,.75,y));
function a3Body(kind,g,tone,capW){
  const ref=kind==='r',d=a3Dims(g,ref),B=a3Buf(),RG=A3_RG,tl=ref?1:Math.pow(g,1.15),ta=ref?.95:Math.pow(g,1.25),HW=d.HW,SW=d.SW,ska=a3SKA(tone),skf=a3SKF(tone);
  /* torso (jersey / striped shirt) */
  a3Loft(B,{r:d.TR.map(q=>[q[0],q[1],q[2],q[3]]),n:20,a0:Math.PI,uv:RG.JER,vf:1,w:(x,y)=>a3TW(y)});
  /* pants top with belt + glutes; its lower edge follows the thighs */
  const wz=ref?.96:g,sh=[[.432,.02,.03,0],[.44,.05,.07*wz,0],[.455,.07,.1*wz,-.002],[.485,.082,.12*wz,-.006],[.52,.088,.13*wz,-.01],[.56,.086,.124*wz,-.006],[.60,.081,.117*wz,0],[.618,.08,.115*wz,.004]];
  a3Loft(B,{r:sh.map(q=>[q[0],q[1]*(ref?1:Math.pow(g,.85)),q[2],q[3]]),n:20,a0:Math.PI,uv:RG.SHO,vf:1,w:(x,y,z)=>a3w(A3_PEL,z>0?A3_THR:A3_THL,a3S(.535,.445,y)*Math.min(1,Math.abs(z)/.06)*.85)});
  for(let s=-1;s<=1;s+=2){const L=s<0,TH=L?A3_THL:A3_THR,SH=L?A3_SHL:A3_SHR,FT=L?A3_FTL:A3_FTR,UA=L?A3_UAL:A3_UAR,FA=L?A3_FAL:A3_FAR,mir=L;
    /* thigh (pants, stripe on the outer side) */
    const th=[[.553,.08,.07,-.004,-.026],[.51,.088,.076,0,-.02],[.46,.085,.075,.006,-.012],[.41,.077,.068,.008,-.006],[.36,.067,.06,.007,0],[.315,.057,.052,.005,0],[.285,.054,.05,.008,0],[.255,.05,.047,.004,0],[.245,.046,.044,0,0]];
    if(ref)th.push([.2,.046,.044,0,0],[.12,.044,.042,0,0],[.06,.042,.041,0,0],[.05,.04,.04,0,0]);
    a3Loft(B,{r:th.map(q=>[q[0],q[1]*tl,q[2]*tl,q[3],q[4]]),n:14,c:[0,0,s*HW],mir,uv:RG.PAN,vr:[.553,ref?.05:.245],w:(x,y)=>y>.45?a3w(A3_PEL,TH,a3S(.57,.47,y)):y>.2||!ref?a3w(TH,SH,a3S(.31,.25,y)):a3w(SH,FT,a3S(.075,.04,y))});
    /* shin + calf (sock, tape at the ankle) */
    if(!ref){const sk=[[.30,.046,.044,0],[.26,.05,.046,-.006],[.22,.052,.045,-.012],[.18,.047,.041,-.01],[.14,.038,.035,-.004],[.10,.031,.029,0],[.07,.029,.028,0],[.05,.031,.03,.002],[.04,.022,.022,.002]];
      a3Loft(B,{r:sk.map(q=>[q[0],q[1]*tl,q[2]*tl,q[3]]),n:12,c:[0,0,s*HW],mir,uv:RG.SOK,vr:[.30,.04],w:(x,y)=>y>.2?a3w(TH,SH,a3S(.31,.25,y)):a3w(SH,FT,a3S(.075,.04,y))})}
    /* cleat / shoe: flat sole */
    const ft=[[-.052,.01,.014,.02],[-.044,.022,.026,.027],[-.028,.031,.031,.034],[0,.036,.033,.037],[.03,.029,.035,.03],[.06,.022,.035,.023,.003],[.085,.017,.03,.018,.004],[.104,.011,.021,.013,.002],[.112,.003,.006,.012,0]];
    const fk=ref?.95:Math.pow(g,.5);
    a3Loft(B,{ax:'x',r:ft.map(q=>[q[0]*fk,q[1]*fk,q[2]*fk,q[3]*fk,(q[4]||0)*fk]),n:14,c:[0,0,s*HW],mir,flat:.004,uv:RG.CLT,w:(x,y)=>a3w(SH,FT,a3S(.075,.045,y))});
    /* upper arm (skin), deltoid under the pad */
    const ua=[[.835,.054,.054,0],[.80,.064,.06,0],[.76,.06,.054,.006],[.72,.054,.048,.006],[.68,.046,.042,.002],[.645,.04,.037,0],[.62,.036,.035,0]];
    a3Loft(B,{r:ua.map(q=>[q[0],q[1]*ta,q[2]*ta,q[3]]),n:12,c:[0,0,s*SW],mir,uv:ska,vf:1,w:(x,y)=>y>.75?a3w(A3_CHE,UA,a3S(.85,.79,y)):a3w(UA,FA,a3S(.655,.615,y))});
    /* sleeve (jersey) */
    const sl=ref?[[.862,.05,.046],[.835,.064,.062],[.79,.064,.062],[.745,.06,.058],[.72,.059,.057],[.715,.053,.051]]:[[.866,.06,.055],[.835,.074,.072],[.79,.072,.069],[.755,.067,.064],[.735,.066,.063],[.73,.058,.056]];
    a3Loft(B,{r:sl.map(q=>[q[0],q[1]*ta,q[2]*ta]),n:12,c:[0,0,s*SW],mir,uv:RG.SLV,w:(x,y)=>a3w(A3_CHE,UA,a3S(.87,.775,y))});
    /* shoulder pad cap */
    if(!ref){const cp=[[.772,.074,.052],[.80,.09,.064],[.822,.085,.06],[.838,.066,.046],[.847,.036,.026],[.851,.006,.005]],kk=Math.pow(g,.9);
      a3Loft(B,{r:cp.map(q=>[q[0],q[1]*kk,q[2]*kk,0,.004]),n:14,c:[0,0,s*SW],mir,uv:RG.CAP,vf:1,w:()=>a3w(A3_CHE,A3_CHE,0)})}
    /* forearm (skin) and glove / hand */
    const fa=[[.645,.038,.036,0],[.61,.043,.04,.003],[.575,.04,.036,.002],[.54,.033,.031,0],[.51,.027,.026,0],[.49,.025,.025,0]],tf=Math.pow(ta,.9);
    a3Loft(B,{r:fa.map(q=>[q[0],q[1]*tf,q[2]*tf,q[3]]),n:12,c:[0,0,s*SW],mir,uv:ska,vf:1,w:(x,y)=>a3w(UA,FA,a3S(.655,.615,y))});
    const hd=[[.505,.025,.023,0,0],[.482,.028,.019,.002,-.002],[.46,.032,.018,.004,-.003],[.438,.032,.016,.005,-.004],[.418,.027,.014,.007,-.005],[.405,.018,.011,.008,-.006],[.4,.006,.005,.008,-.006]];
    a3Loft(B,{r:hd.map(q=>[q[0],q[1]*tf,q[2]*tf,q[3],q[4]]),n:10,c:[0,0,s*SW],mir,uv:ref?ska:RG.GLV,vf:1,w:()=>a3w(FA,FA,0)});
    const tb=[[.475,.012,.011,.03,-.012],[.45,.011,.01,.036,-.014],[.425,.006,.006,.038,-.014]];
    a3Loft(B,{r:tb.map(q=>[q[0],q[1]*tf,q[2]*tf,q[3],q[4]]),n:8,c:[0,0,s*SW],mir,uv:ref?ska:RG.GLV,vf:1,w:()=>a3w(FA,FA,0)})}
  /* neck + head */
  const nk=ref?1:Math.pow(g,1.4);
  a3Loft(B,{r:[[.80,.05*nk,.052*nk,0],[.84,.048*nk,.05*nk,0],[.87,.045*nk,.046*nk,.004],[.9,.043,.044,.006]],n:12,uv:ska,vf:1,w:(x,y)=>y<.86?a3w(A3_CHE,A3_NCK,a3S(.80,.85,y)):a3w(A3_NCK,A3_HED,a3S(.875,.905,y))});
  const hdR=[[.862,.034,.03,.018],[.875,.05,.046,.014],[.9,.058,.053,.01],[.93,.062,.057,.006],[.955,.061,.058,.003],[.975,.052,.051,.001],[.99,.032,.032,0],[.997,.006,.006,0]];
  a3Loft(B,{r:hdR,n:16,a0:Math.PI,uv:skf,vf:1,w:()=>a3w(A3_HED,A3_HED,0)});
  if(ref){/* ears, cap (crown + bill) */
    for(let s=-1;s<=1;s+=2)a3Loft(B,{r:[[.912,.004,.003],[.922,.014,.008],[.94,.015,.009],[.952,.006,.004]],n:8,c:[-.004,0,s*.056],uv:ska,w:()=>a3w(A3_HED,A3_HED,0)});
    const cr=capW?RG.HTW:RG.HTB;a3Loft(B,{r:[[.948,.066,.062,.002],[.962,.067,.063,.002],[.982,.058,.055,0],[.998,.036,.034,-.002],[1.008,.008,.008,-.002]],n:16,uv:cr,w:()=>a3w(A3_HED,A3_HED,0)});
    a3Loft(B,{r:[[.95,.004,.04,.04],[.951,.04,.05,.055],[.952,.004,.044,.075]].map(q=>[q[0],q[1],q[2],q[3]]),n:12,a0:-1.35,a1:1.35,uv:cr,w:()=>a3w(A3_HED,A3_HED,0)})}
  return {d,geo:a3Geo(B,true)}}
/* jersey numbers: conforming patches on the torso (front + back), digit atlas UVs, same skin weights as the torso */
function a3Num(d,num){
  const t=String(num==null?'':num).replace(/[^0-9]/g,'').slice(0,2);if(!t)return null;const B=a3Buf(),TR=d.TR;
  const at=y=>{let i=0;while(i<TR.length-2&&y>TR[i+1][0])i++;const a=TR[i],b=TR[i+1],w=clamp((y-a[0])/(b[0]-a[0]),0,1);return [a[1]+(b[1]-a[1])*w,a[2]+(b[2]-a[2])*w,a[3]+(b[3]-a[3])*w]};
  const put=(yc,hh,wd,back)=>{const n=t.length,gap=wd*.06,dw=(wd-gap*(n-1))/n,C=5,Rr=4;
    for(let k=0;k<n;k++){const dg=+t[k],b0=B.p.length/3,s0=-wd/2+k*(dw+gap);
      for(let ri=0;ri<=Rr;ri++)for(let ci=0;ci<=C;ci++){const y=yc+hh/2-hh*ri/Rr,[rx,rz,cx]=at(y),s=s0+dw*ci/C,a=back?Math.PI-s/rz:-s/rz,ca=Math.cos(a),sa=Math.sin(a);
        let nx=ca/rx,nz=sa/rz;const l=Math.hypot(nx,nz);nx/=l;nz/=l;B.p.push(cx+rx*ca+nx*.004,y,rz*sa+nz*.004);B.n.push(nx,0,nz);
        B.u.push((dg*51+4+43*ci/C)/512,1-(6+116*ri/Rr)/128);const w=a3TW(y);B.si.push(w[0],w[1],0,0);B.sw.push(1-w[2],w[2],0,0)}
      for(let ri=0;ri<Rr;ri++)for(let ci=0;ci<C;ci++){const a=b0+ri*(C+1)+ci,b=a+1,c=a+C+1,e=c+1;
        const pa=a*3,pb=b*3,pc=c*3,e1x=B.p[pb]-B.p[pa],e1y=B.p[pb+1]-B.p[pa+1],e1z=B.p[pb+2]-B.p[pa+2],e2x=B.p[pc]-B.p[pa],e2y=B.p[pc+1]-B.p[pa+1],e2z=B.p[pc+2]-B.p[pa+2];
        if((e1y*e2z-e1z*e2y)*B.n[pa]+(e1x*e2y-e1y*e2x)*B.n[pa+2]>0)B.ix.push(a,b,c,b,e,c);else B.ix.push(a,c,b,b,c,e)}}};
  put(.712,.1,t.length>1?.118:.062,false);put(.72,.125,t.length>1?.142:.076,true);
  return a3Geo(B,true)}
/* helmet: shell lofted along x (stripe stays an even width over the crown), face opening, jaw guards, facemask bars, visor, chin strap */
function a3Helm(big,vis){
  const B=a3Buf(),RG=A3_RG,HW0=()=>a3w(A3_HED,A3_HED,0),c=[.004,.935,0],UA=[2.55,-2.55],VR=[-.094,.1];
  const sh=[[-.094,.012,.012,-.004,0,2.5,-2.5],[-.084,.044,.042,-.008,0,2.48,-2.48],[-.066,.064,.06,-.011,0,2.42,-2.42],[-.04,.074,.07,-.012,0,2.36,-2.36],[-.012,.078,.074,-.011,0,2.3,-2.3],
    [.014,.078,.074,-.007,0,2.12,-2.12],[.036,.074,.071,-.003,0,1.32,-1.32],[.058,.066,.064,.003,0,1.1,-1.1],[.076,.052,.053,.008,0,1.02,-1.02],[.09,.031,.036,.013,0,1,-1],[.097,.008,.012,.016,0,1,-1]];
  a3Loft(B,{ax:'x',r:sh,n:22,c,uv:RG.SHL,at:256,ua:UA,vr:VR,w:HW0});
  for(let s=-1;s<=1;s+=2){const jg=[[.0,.078,.074,-.008,0,2.02,2.34],[.03,.075,.072,-.005,0,1.86,2.34],[.055,.069,.066,-.002,0,1.84,2.28],[.075,.058,.055,0,0,1.9,2.2]].map(q=>s>0?q:[q[0],q[1],q[2],q[3],q[4],-q[5],-q[6]]);
    a3Loft(B,{ax:'x',r:jg,n:5,c,uv:RG.SHL,at:256,ua:UA,vr:VR,w:HW0})}
  const arc=(y,R,th,x0,dy)=>{const p=[];for(let i=0;i<=10;i++){const t=-th+2*th*i/10;p.push([x0+R*Math.cos(t),y+(dy||0)*(1-Math.cos(t)),R*.97*Math.sin(t)])}return p};
  const r=.0055,FM=RG.FM;
  a3Tube(B,arc(.913,.083,1.12,.02,.01),r,6,FM,A3_HED);a3Tube(B,arc(.884,.074,1.02,.022,.012),r,6,FM,A3_HED);
  a3Tube(B,[[.096,.942,0],[.103,.925,0],[.103,.905,0],[.096,.884,0],[.086,.872,0]],r,6,FM,A3_HED);
  for(let s=-1;s<=1;s+=2){a3Tube(B,[[.02+.083*Math.cos(.62),.913+.01*(1-Math.cos(.62)),s*.083*.97*Math.sin(.62)],[.022+.074*Math.cos(.6),.884+.012*(1-Math.cos(.6)),s*.074*.97*Math.sin(.6)]],r,6,FM,A3_HED);
    a3Tube(B,[[.044,.945,s*.066],[.06,.928,s*.075],[.064,.913,s*.07]],r*.9,6,FM,A3_HED)}
  if(big){a3Tube(B,arc(.898,.08,1.05,.02,.01),r,6,FM,A3_HED);for(let s=-1;s<=1;s+=2)a3Tube(B,[[.02+.083*Math.cos(.3),.917,s*.083*.97*Math.sin(.3)],[.022+.074*Math.cos(.3),.885,s*.074*.97*Math.sin(.3)]],r,6,FM,A3_HED)}
  /* chin strap */
  a3Tube(B,[[.03,.878,-.062],[.06,.866,-.04],[.078,.86,0],[.06,.866,.04],[.03,.878,.062]],.0045,5,RG.CS,A3_HED);
  if(vis)a3Loft(B,{r:[[.918,.087,.085],[.95,.085,.083]],n:12,c:[.012,0,0],a0:-1.0,a1:1.0,uv:RG.VIS,at:256,w:HW0});
  return a3Geo(B,false)}
function a3BallGeo(){const B=a3Buf(),L=.153*1.12,R=.097*1.12,rs=[];for(let i=0;i<=14;i++){const x=-L+2*L*i/14,t=x/L,r=R*Math.pow(Math.max(0,1-t*t),.72)+.003;rs.push([x,r,r])}
  a3Loft(B,{ax:'x',r:rs,n:18,a0:-Math.PI,uv:[0,0,256,128],at:256,ah:128,w:()=>a3w(0,0,0)});return a3Geo(B,false)}
function a3FlagGeo(){const B=a3Buf(),W=()=>a3w(0,0,0);
  a3Loft(B,{r:[[-.03,.004,.004],[-.02,.03,.03],[0,.04,.04],[.02,.03,.03],[.03,.004,.004]],n:10,uv:[0,0,64,64],at:64,w:W});
  a3Loft(B,{ax:'x',r:[[.01,.004,.05],[.08,.014,.075,0,.01],[.16,.012,.07,-.005,-.01],[.22,.008,.05,-.01,0],[.24,.002,.02,-.01,0]],n:8,uv:[0,0,64,64],at:64,w:W});return a3Geo(B,false)}

/* ---------- textures (generated once per team / uniform) ---------- */
function a3Cv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')]}
function a3Grain(g,r,a,n){const [x,y,w,h]=r;for(let i=0;i<n;i++){g.fillStyle=(i&1)?`rgba(0,0,0,${a})`:`rgba(255,255,255,${a})`;g.fillRect(x+Math.random()*w,y+Math.random()*h,1,1)}}
function a3Tex(cv){const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;A3.res.add(t);return t}
const a3Fill=(g,c,r)=>{g.fillStyle=c;g.fillRect(r[0],r[1],r[2],r[3])};
function a3Skin(g){for(let i=0;i<4;i++){const t=athHex((typeof TONES!=='undefined'&&TONES[i])||'#A8693A'),a=[i*128,320,64,64],f=a3SKF(i),dk=shade(t,-.3);
  const gr=g.createLinearGradient(0,320,0,384);gr.addColorStop(0,shade(t,.06));gr.addColorStop(1,shade(t,-.08));g.fillStyle=gr;g.fillRect(a[0],a[1],a[2],a[3]);a3Grain(g,a,.05,260);
  a3Fill(g,t,f);const X=u=>f[0]+u*64,Y=v=>f[1]+v*64;
  g.fillStyle=shade(t,-.12);g.fillRect(X(0),Y(0),64,Y(.3)-Y(0));/* forehead shade (helmet) */
  g.fillStyle=dk;g.fillRect(X(.43),Y(.47),X(.57)-X(.43),Y(.62)-Y(.47));/* nose */
  g.fillStyle='#16110d';for(const u of [.44,.56]){g.beginPath();g.ellipse(X(u),Y(.44),2.6,1.5,0,0,A3_TAU);g.fill()}
  g.fillStyle='rgba(10,8,6,.85)';for(const u of [.425,.575]){g.fillRect(X(u)-4,Y(.5),8,2.2)}/* eye black */
  g.fillStyle=shade(t,-.45);for(const u of [.44,.56])g.fillRect(X(u)-3,Y(.385),6,1.4);
  g.fillStyle=shade(t,-.38);g.fillRect(X(.46),Y(.72),X(.54)-X(.46),1.6)}}
function a3TeamTex(team,U){
  const [cv,g]=a3Cv(512,512),RG=A3_RG,J=athHex(U.j),N=athHex(U.n),Pn=athHex(U.p),PC=athHex(U.pc),K=athHex(U.k),SC=athHex(U.sc||U.n),jl=lum(J);
  const trim=contrasty(SC,J)?SC:contrasty(N,J)?N:inkOn(J),gl=athHex(jl>.8?team.c1:contrasty(N,J)?N:inkOn(J)),tape=lum(K)<.45?'#f1f1ee':'#1c1d21';
  /* jersey: side panels, V-neck collar, fabric mesh */
  const R=RG.JER;a3Fill(g,J,R);g.fillStyle=shade(J,jl>.7?-.07:-.13);for(const u of [.25,.75])g.fillRect(R[0]+(u-.055)*256,R[1]+30,.11*256,R[3]-30);
  g.fillStyle=trim;g.fillRect(R[0],R[1],256,9);g.beginPath();g.moveTo(R[0]+128-26,R[1]);g.lineTo(R[0]+128,R[1]+34);g.lineTo(R[0]+128+26,R[1]);g.lineTo(R[0]+128+17,R[1]);g.lineTo(R[0]+128,R[1]+22);g.lineTo(R[0]+128-17,R[1]);g.fill();
  g.fillStyle=jl>.5?'rgba(0,0,0,.045)':'rgba(255,255,255,.045)';for(let y=12;y<192;y+=3)for(let x=(y%6?0:1.5);x<256;x+=3)g.fillRect(x,y,1,1);a3Grain(g,R,.05,1400);
  /* sleeves with stripes at the hem */
  const S=RG.SLV;a3Fill(g,J,S);const ns=U.sl|0;g.fillStyle=athHex(U.sc||trim);for(let i=0;i<Math.min(3,ns);i++)g.fillRect(S[0],S[1]+40-i*8,128,ns>2?4:5);g.fillStyle=shade(J,-.2);g.fillRect(S[0],S[1]+58,128,6);
  a3Fill(g,J,RG.CAP);a3Grain(g,RG.CAP,.05,300);
  /* pants top (belt) and thighs (side stripes) */
  const stripes=(r,us,vt)=>{const n=U.ps|0;if(!n)return;for(const u of us){const cx=r[0]+u*r[2];if(n===1){g.fillStyle=PC;g.fillRect(cx-5,r[1]+vt,10,r[3]-vt)}
    else{g.fillStyle=PC;for(let i=0;i<Math.min(3,n);i++){const x=cx+(i-(Math.min(3,n)-1)/2)*7;g.fillRect(x-2.5,r[1]+vt,5,r[3]-vt)}}}};
  const H=RG.SHO;a3Fill(g,Pn,H);stripes(H,[.25,.75],18);g.fillStyle=lum(Pn)>.6?'#26272b':shade(Pn,-.5);g.fillRect(H[0],H[1],256,16);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(H[0],H[1]+16,256,2);
  const Pp=RG.PAN;a3Fill(g,Pn,Pp);stripes(Pp,[.25],0);g.fillStyle=shade(Pn,-.12);g.fillRect(Pp[0],Pp[1]+118,256,10);a3Grain(g,H,.035,500);a3Grain(g,Pp,.035,500);
  /* socks + tape */
  const So=RG.SOK;a3Fill(g,K,So);if(lum(K)>.75&&U.j){g.fillStyle=athHex(team.c1);g.fillRect(So[0],So[1]+22,128,6)}g.fillStyle=tape;g.fillRect(So[0],So[1]+86,128,42);g.fillStyle='rgba(0,0,0,.12)';for(let y=90;y<128;y+=7)g.fillRect(So[0],So[1]+y,128,1);
  /* cleats: sole band, side accent */
  const Cl=RG.CLT;a3Fill(g,tape,Cl);g.fillStyle=lum(tape)>.5?'#9a9ca0':'#0c0c0e';g.fillRect(Cl[0]+.36*128,Cl[1],.28*128,64);g.fillStyle=athHex(team.c1);g.fillRect(Cl[0]+.2*128,Cl[1]+22,10,26);g.fillRect(Cl[0]+.8*128-10,Cl[1]+22,10,26);
  const Gv=RG.GLV;a3Fill(g,gl,Gv);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(Gv[0],Gv[1]+52,128,12);
  a3Skin(g);
  /* digits (transparent background) */
  const [dc,dg]=a3Cv(512,128),ol=U.no||(lum(N)>.55?shade(J,-.45):'rgba(255,255,255,.75)');dg.textAlign='center';dg.textBaseline='middle';dg.lineJoin='round';
  for(let i=0;i<10;i++){dg.save();dg.translate(i*51+25.5,66);dg.scale(.62,1);dg.font='900 118px "Futura-CondensedExtraBold","Arial Black","Helvetica Neue",Arial,sans-serif';
    dg.lineWidth=12;dg.strokeStyle=ol;dg.strokeText(String(i),0,0);dg.fillStyle=N;dg.fillText(String(i),0,0);dg.restore()}
  /* helmet: shell + stripes + side decals, facemask, visor, chin strap */
  const [hc,hg]=a3Cv(256,256),Hh=athHex(U.h),hs=U.hs|0,hcol=athHex(U.hc||'#ffffff');a3Fill(hg,Hh,RG.SHL);
  if(hs){const w=hs===1?12:hs===2?6:5,us=hs===1?[.5]:hs===2?[.47,.53]:[.455,.5,.545];hg.fillStyle=hcol;for(const u of us)hg.fillRect(u*256-w/2,0,w,192);if(hs===1){hg.fillStyle=shade(hcol,-.35);hg.fillRect(128-8,0,2,192);hg.fillRect(128+6,0,2,192)}}
  const dk=U.d||'L';if(dk!=='X'){const dcol=athHex(U.dc||hcol);let bd=null;if(dk==='M'&&typeof bdgCanvas==='function'){try{bd=bdgCanvas(team,64,true)}catch(e){bd=null}}
    for(const side of [1,-1]){hg.save();hg.translate((side>0?.2:.8)*256,.47*192);hg.rotate(side*Math.PI/2);
      if(bd)hg.drawImage(bd,-24,-27,48,54);
      else{hg.fillStyle=dcol;hg.strokeStyle=shade(Hh,-.45);hg.lineWidth=4;hg.lineJoin='round';
        if(dk==='S'){hg.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?9:22;hg.lineTo(Math.cos(a)*r,Math.sin(a)*r)}hg.closePath();hg.stroke();hg.fill()}
        else if(dk==='B'){hg.beginPath();const P=[[6,-24],[-14,3],[-1,3],[-6,24],[15,-5],[2,-5]];P.forEach((q,i)=>i?hg.lineTo(q[0],q[1]):hg.moveTo(q[0],q[1]));hg.closePath();hg.stroke();hg.fill()}
        else{hg.font='900 46px -apple-system,"Helvetica Neue",Arial,sans-serif';hg.textAlign='center';hg.textBaseline='middle';const t=String(team.abbr||'U')[0];hg.strokeText(t,0,2);hg.fillText(t,0,2)}}
      hg.restore()}}
  a3Fill(hg,athHex(U.m||'#888888'),RG.FM);const vg=hg.createLinearGradient(0,192,0,256);vg.addColorStop(0,'#3a4452');vg.addColorStop(1,'#101318');hg.fillStyle=vg;hg.fillRect(64,192,64,64);
  a3Fill(hg,lum(Hh)>.7?'#2a2b2f':'#ececec',RG.CS);
  return {body:a3Tex(cv),dig:a3Tex(dc),helm:a3Tex(hc)}}
function a3Team(team){
  const U=uniColorsC(team);let e=A3.teams.get(team);if(e&&e.U===U)return e;if(e)for(const k of ['mb','mn','mh'])e[k].dispose();
  const T=a3TeamTex(team,U),hf=U.hf||'g';
  e={U,mb:new THREE.MeshStandardMaterial({map:T.body,roughness:.74,metalness:0}),
    mn:new THREE.MeshStandardMaterial({map:T.dig,alphaTest:.5,roughness:.6,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),
    mh:new THREE.MeshPhysicalMaterial({map:T.helm,roughness:hf==='m'?.52:hf==='c'?.18:.26,metalness:hf==='c'?.75:.04,clearcoat:hf==='m'?0:1,clearcoatRoughness:.06,side:THREE.DoubleSide})};
  for(const k of ['mb','mn','mh'])A3.res.add(e[k]);A3.teams.set(team,e);return e}
function a3RefMat(){if(A3.ref)return A3.ref;const [cv,g]=a3Cv(512,512),RG=A3_RG;
  const stripe=(r,w)=>{a3Fill(g,'#f4f4f2',r);g.fillStyle='#121214';for(let x=0;x<r[2];x+=w*2)g.fillRect(r[0]+x,r[1],w,r[3])};
  stripe(RG.JER,8);g.fillStyle='#121214';g.fillRect(0,0,256,10);stripe(RG.SLV,8);g.fillStyle='#121214';g.fillRect(256,56,128,8);
  a3Fill(g,'#141416',RG.SHO);g.fillStyle='#050506';g.fillRect(256,64,256,14);a3Fill(g,'#18181b',RG.PAN);a3Grain(g,RG.PAN,.04,500);a3Fill(g,'#0d0d0f',RG.CLT);a3Fill(g,'#f6f6f4',RG.HTW);a3Fill(g,'#141416',RG.HTB);
  g.fillStyle='rgba(0,0,0,.25)';g.fillRect(384,256,128,6);a3Grain(g,RG.JER,.04,700);a3Skin(g);
  for(let i=0;i<4;i++){const f=a3SKF(i);g.fillStyle='#231a14';g.fillRect(f[0],f[1]+10,14,20);g.fillRect(f[0]+50,f[1]+10,14,20);g.fillStyle='rgba(0,0,0,.0)'}
  A3.ref=new THREE.MeshStandardMaterial({map:a3Tex(cv),roughness:.8,metalness:0});A3.res.add(A3.ref);return A3.ref}

/* ---------- figures ---------- */
function a3An(){return {o:new Float32Array(17),s:new Float32Array(17),kL:-1,kU:-1,bL:1,bU:1,ph:Math.random(),px:0,py:0,f:-1,kf:1,tv:1,sp:0,acc:0,car:0,ball:0,fq:0,kL2:1,kU2:1,kxs:0,back:false,pl:0,
  S:null,Se:null,SR:0,Sg:0,fx:new Float32Array(4),yaw:0,yi:false,ax:0,ay:0,vx0:0,vy0:0,roll:0,fall:0,fy:0,fs:1,look:0,zs:.09}}
function a3Fig(p,team){
  const ref=!!p.ref,pl=p.pl||{},sz=(typeof SIZE!=='undefined'&&SIZE[pl.pos])||null,Bd=(typeof BUILD!=='undefined'&&BUILD[p.role])||[1,1];
  const ht=pl.ht||(sz?sz[0]:73),wt=pl.wt||(sz?sz[2]:205),aw=sz?sz[2]:wt,g=ref?.98:Math.round(Bd[0]*clamp(1+(wt-aw)/aw*.85,.9,1.14)*25)/25,tone=((ref?p.tone:pl.tone)|0)&3;
  const cap=ref&&p.ref==='R',key=ref?'r'+tone+(cap?'w':'b'):'p'+g+'_'+tone;
  let bg=A3.geo.get(key);if(!bg){bg=a3Body(ref?'r':'p',g,tone,cap);A3.geo.set(key,bg)}
  const bones=[];for(let i=0;i<A3_NB;i++)bones.push(new THREE.Bone());const sk=new THREE.Skeleton(bones);sk.update=function(){if(this.boneTexture)this.boneTexture.needsUpdate=true};
  const mk=(geo,mat)=>{const m=new THREE.SkinnedMesh(geo,mat);m.bindMode=THREE.DetachedBindMode;m.bind(sk,new THREE.Matrix4());m.castShadow=true;m.receiveShadow=true;m.frustumCulled=true;A3.g.add(m);return m};
  const tm=ref?null:a3Team(team),body=mk(bg.geo,ref?a3RefMat():tm.mb),bs=new THREE.Sphere(new THREE.Vector3(p.x,1,p.y),1.6*clamp(ht/74,.9,1.12));body.boundingSphere=bs;
  const f={p,ref,team,tm,sk,body,num:null,helm:null,H:A3_H0*clamp(ht/74,.88,1.12),d:bg.d,a:a3An(),bs,seen:0,n:null};
  if(!ref){const nk='n'+g+'_'+p.num;let ng=A3.geo.get(nk);if(ng===undefined){ng=a3Num(bg.d,p.num);A3.geo.set(nk,ng)}
    if(ng){f.num=mk(ng,tm.mn);f.num.castShadow=false;f.num.receiveShadow=true;f.num.boundingSphere=bs}
    const big=p.role==='OL'||p.role==='DL',vis=!!((p._acc||((pl.id|0)*2654435761>>>0))&4)&&!big,hk='h'+(big?1:0)+(vis?1:0);let hg=A3.geo.get(hk);if(!hg){hg=a3Helm(big,vis);A3.geo.set(hk,hg)}
    f.helm=new THREE.Mesh(hg,tm.mh);f.helm.matrixAutoUpdate=false;f.helm.castShadow=true;f.helm.receiveShadow=true;A3.g.add(f.helm)}
  return f}
function a3Drop(f){for(const m of [f.body,f.num,f.helm])if(m){if(m.parent)m.parent.remove(m)}if(f.sk.boneTexture)f.sk.boneTexture.dispose()}
const A3T=new Float32Array(17),A3O=new Float32Array(17);
function a3Eval(p,a,now,dt){
  const T=A3T;let dd=Math.hypot(p.x-a.px,p.y-a.py);a.px=p.x;a.py=p.y;if(dd>1.6)dd=0;
  const sp=Math.hypot(p.vx||0,p.vy||0),cad=2.3+.27*sp,D=sp>.25?2*sp/cad:1.2;a.ph=(a.ph+dd/D)%1;
  ATH.gu=0;if(p.ref)athPoseRef(p,a,now,T);else athPose(p,a,now,T);
  const first=a.kL<0,o=a.o,s=a.s,dL=.15,dU=.13;
  if(a.kL2!==a.kL){if(!first)for(const i of ATH_LO)s[i]=o[i];a.kL=a.kL2;a.bL=first?1:0}
  if(a.kU2!==a.kU){if(!first)for(const i of ATH_UP)s[i]=o[i];a.kU=a.kU2;a.bU=first?1:0}
  a.bL=Math.min(1,a.bL+(dt||(first?1:0))/dL);a.bU=Math.min(1,a.bU+(dt||(first?1:0))/dU);const wL=athE(a.bL),wU=athE(a.bU);
  for(const i of ATH_LO)o[i]=wL>=1?T[i]:s[i]+(T[i]-s[i])*wL;
  for(const i of ATH_UP){if(wU>=1){o[i]=T[i];continue}let d=T[i]-s[i];if(i>=10){while(d>Math.PI)d-=A3_TAU;while(d<-Math.PI)d+=A3_TAU}o[i]=s[i]+d*wU}}

/* ---------- 3D solve: sagittal pose → bone matrices (group space) ---------- */
const A3F=new Float64Array(A3_NB*12),A3M=new Float64Array(9),A3R=new Float64Array(9),A3K=new Float64Array(9),A3Q=new Float64Array(12);
function a3RYZ(m,yaw,pit){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit);m[0]=cp*cy;m[1]=-sp;m[2]=-cp*sy;m[3]=sp*cy;m[4]=cp;m[5]=-sp*sy;m[6]=sy;m[7]=0;m[8]=cy}
function a3Bas(m,yx,yy,yz,zx,zy,zz){let l=Math.hypot(yx,yy,yz)||1;yx/=l;yy/=l;yz/=l;const d=zx*yx+zy*yy+zz*yz;zx-=d*yx;zy-=d*yy;zz-=d*yz;l=Math.hypot(zx,zy,zz);if(l<1e-9){zx=0;zy=0;zz=1;l=1}zx/=l;zy/=l;zz/=l;
  m[0]=yy*zz-yz*zy;m[1]=yz*zx-yx*zz;m[2]=yx*zy-yy*zx;m[3]=yx;m[4]=yy;m[5]=yz;m[6]=zx;m[7]=zy;m[8]=zz}
const a3Set=(i,m,x,y,z)=>{const k=i*12;for(let j=0;j<9;j++)A3F[k+j]=m[j];A3F[k+9]=x;A3F[k+10]=y;A3F[k+11]=z};
const a3P=(i,d)=>A3F[i*12+9+d];
/* bone i's local point (x,y,z) relative to its joint → out[k..k+2] (figure-local) */
function a3Pt(i,x,y,z,out,k){const b=i*12;out[k]=A3F[b+9]+A3F[b]*x+A3F[b+3]*y+A3F[b+6]*z;out[k+1]=A3F[b+10]+A3F[b+1]*x+A3F[b+4]*y+A3F[b+7]*z;out[k+2]=A3F[b+11]+A3F[b+2]*x+A3F[b+5]*y+A3F[b+8]*z}
function a3IK(sx,sy,sz,tx,ty,tz,l1,l2,bx,by,bz,out){let dx=tx-sx,dy=ty-sy,dz=tz-sz,d=Math.hypot(dx,dy,dz);const mx=(l1+l2)*.999,mn=Math.abs(l1-l2)+.01;
  if(d<1e-6){dx=0;dy=-1e-6;dz=0;d=1e-6}const dd=clamp(d,mn,mx);dx/=d;dy/=d;dz/=d;const a=(l1*l1+dd*dd-l2*l2)/(2*dd),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  const pd=bx*dx+by*dy+bz*dz;let px=bx-pd*dx,py=by-pd*dy,pz=bz-pd*dz,pl=Math.hypot(px,py,pz);if(pl<1e-6){px=1;py=0;pz=0;pl=1}px/=pl;py/=pl;pz/=pl;
  out[0]=sx+dx*a+px*h;out[1]=sy+dy*a+py*h;out[2]=sz+dz*a+pz*h;out[3]=sx+dx*dd;out[4]=sy+dy*dd;out[5]=sz+dz*dd;out[6]=px;out[7]=py;out[8]=pz;out[9]=dx;out[10]=dy;out[11]=dz}
function a3Near(p,r){const opp=p.side==='o'?DEF:OFF;let bd=r*r,q=null;for(const o of opp){const d2=(o.x-p.x)**2+(o.y-p.y)**2;if(d2<bd){bd=d2;q=o}}return q}
function a3Solve(f,now,dt){
  const p=f.p,a=f.a,ref=f.ref,ph=S.phase,pre=ph==='presnap',H=f.H,d=f.d,SW=d.SW,HW=d.HW,g=d.g,pl=play;
  const vx=p.vx||0,vy=p.vy||0,sp=Math.hypot(vx,vy),face=p.face||1,car=!ref&&ATH.car===p&&!pre;
  if(dt>0){const k=Math.min(1,dt*8);a.ax+=(clamp((vx-a.vx0)/dt,-40,40)-a.ax)*k;a.ay+=(clamp((vy-a.vy0)/dt,-40,40)-a.ay)*k}a.vx0=vx;a.vy0=vy;
  /* fall direction: own momentum plus the tackler's; supine when driven backwards */
  const fe=ref?0:(p.fallP||0);
  if(fe>.05&&!a.fall){a.fall=1;let fx=vx,fy=vy;const q=a3Near(p,2.6);if(q){fx+=(q.vx||0)*.8;fy+=(q.vy||0)*.8}
    const fa=Math.hypot(fx,fy)>.8?Math.atan2(fy,fx):a.yaw,bk=Math.cos(fa-a.yaw)<-.3;a.fs=bk?-1:1;a.fy=bk?a3W(fa+Math.PI):fa}else if(fe<.02&&a.fall&&!(p.anim==='tackled'&&p.animT>0))a.fall=0;
  /* heading */
  let tg=a.yaw,rate=9;
  if(ref){if(p.sig==='fwd'&&now<p.sigEnd)tg=0;else if(sp>1.4)tg=Math.atan2(vy,vx);else tg=Math.atan2(ball.y-p.y,ball.x-p.x);rate=sp>1.4?8:4}
  else if(pre){tg=face>0?0:Math.PI;rate=sp>.6?8:0}
  else if(a.fall){tg=a.fy;rate=7}
  else if(a.fq){let tx=p.x+face*10,ty=p.y;if(ball.state==='air'&&ball.tx!=null){tx=ball.tx;ty=ball.ty}else if(aim&&aim.x!=null){tx=aim.x;ty=aim.y}else if(pl&&pl.intended){tx=pl.intended.x;ty=pl.intended.y}tg=Math.atan2(ty-p.y,tx-p.x);rate=12}
  else if(a.kL2===2&&sp>.5)tg=Math.atan2(-vy,-vx);
  else if(p.engaged){const q=a3Near(p,2.4);if(q)tg=Math.atan2(q.y-p.y,q.x-p.x);rate=6}
  else if(sp>1.6){tg=Math.atan2(vy,vx);rate=sp>6?7:10}
  else if(pl&&!pl.ended&&p.side==='d'){tg=Math.atan2(ball.y-p.y,ball.x-p.x);rate=3}
  if(!a.yi||rate===0){a.yaw=tg;a.yi=true}else if(dt>0)a.yaw=a3W(a.yaw+a3W(tg-a.yaw)*Math.min(1,dt*rate));
  /* spin move: one full turn */
  let yo=0;if(!ref&&pl&&ph!=='replay'){let q=-1;if(car&&pl.spinT>0)q=1-pl.spinT/.45;else if(p.anim==='spin'&&p.animT>0)q=1-p.animT/.45;if(q>=0)yo=athE(clamp(q,0,1))*A3_TAU*(p.y<CEN?1:-1)}
  const yaw=a.yaw+yo;
  /* pose copy (carrier's ball arm on the sideline side: swap arms when the 2D near arm is the wrong one) */
  const o=A3O;for(let i=0;i<17;i++)o[i]=a.o[i];let carry=a.car,bh=a.ball,swp=false;
  if(!ref&&(carry||bh)&&carry&&Math.cos(yaw)<0){swp=true;let t=o[10];o[10]=o[12];o[12]=t;t=o[11];o[11]=o[13];o[13]=t;carry=carry===1?2:1}
  const lie=Math.abs(o[14])>.6,rot=o[14]*(a.fall?a.fs:1);
  /* lean into cuts (lateral acceleration) */
  let rl=0;if(!pre&&!a.fall&&sp>1.5&&!lie){const lat=(vx*a.ay-vy*a.ax)/sp;rl=clamp(Math.atan(lat/10.7)*.85,-.38,.38)*Math.min(1,sp/4)}if(dt>0)a.roll+=(rl-a.roll)*Math.min(1,dt*10);
  /* head look */
  let lk=0;if(!lie&&!car&&ball){let bx=ball.x,by=ball.y;if(ball.state==='held'&&ATH.car&&ATH.car!==p){bx=ATH.car.x;by=ATH.car.y}if(ref||pre||sp<5||ball.state==='air')lk=clamp(a3W(Math.atan2(by-p.y,bx-p.x)-yaw),-1.15,1.15)*(sp>5?.5:1)}
  if(dt>0)a.look+=(lk-a.look)*Math.min(1,dt*6);else a.look=lk;
  /* ---- local skeleton (height units; x forward, y up, z right) ---- */
  const hx=o[0],hy=o[1],spn=o[2],hd=o[3],twC=lie?0:clamp((o[12]-o[10])*.1,-.45,.45),twH=lie?0:clamp((o[6]-o[4])*.5,-.25,.25)-twC*.25;
  const M=A3M;a3RYZ(M,twH,spn*.62);a3Set(A3_PEL,M,hx,hy,0);
  a3RYZ(M,(twH+twC)*.5,spn*.95);a3Set(A3_WST,M,hx+A3F[3]*.09,hy+A3F[4]*.09,A3F[5]*.09);
  a3RYZ(M,twC,Math.min(1.58,spn*1.22));a3Set(A3_CHE,M,a3P(A3_WST,0)+A3F[A3_WST*12+3]*.1,a3P(A3_WST,1)+A3F[A3_WST*12+4]*.1,a3P(A3_WST,2)+A3F[A3_WST*12+5]*.1);
  const an=hd*.6+spn*.4,Q=A3Q;a3Pt(A3_CHE,0,.105,0,Q,0);a3RYZ(M,twC+a.look*.4,an*.85);a3Set(A3_NCK,M,Q[0],Q[1],Q[2]);
  a3Pt(A3_NCK,0,.07,0,Q,0);a3RYZ(M,twC+a.look,an*.4);a3Set(A3_HED,M,Q[0],Q[1],Q[2]);
  /* legs: stride restored to 3D length along the motion direction relative to the body (shuffles, backpedal) */
  const wl=athE(clamp(sp/1.4,0,1)),kx=sp>.25?Math.max(.3,Math.abs(vx*face)/sp):1,fS=1+((PL_H*(p._bh||1))/(H)/kx-1)*wl*(lie?0:1);
  let phi=0;if(sp>.8&&!lie)phi=a3W((a.kL2===2?Math.atan2(-vy,-vx):Math.atan2(vy,vx))-a.yaw);const cph=Math.cos(phi),sph=Math.sin(phi);
  const kl=a.kL2;let zs=.1-.055*wl;if(kl===10||kl===11)zs=.13+.02*(g-1);else if(kl>=12&&kl<=17)zs=kl===15?.075:.112;else if(kl===7)zs=.13;else if(lie)zs=.1;else if(ref)zs=.09-.045*wl;
  if(dt>0)a.zs+=(zs-a.zs)*Math.min(1,dt*8);else a.zs=zs;
  const K=A3K,IK=new Float64Array(12);
  for(let s=-1;s<=1;s+=2){const L=s<0,TH=L?A3_THL:A3_THR,SH=L?A3_SHL:A3_SHR,FT=L?A3_FTL:A3_FTR,fx=o[L?4:6],fy=o[L?5:7],pt=o[L?8:9];
    const dx=(fx-hx)*fS,ax=hx+dx*cph,az=s*a.zs+dx*sph;a3Pt(A3_PEL,0,0,s*HW,Q,0);
    const cb=Math.cos(twH),sb=Math.sin(twH),bx=cb+s*.12*sb,bz=-sb+s*.12*cb;
    a3IK(Q[0],Q[1],Q[2],ax,fy,az,.245,.235,bx,0,bz,IK);
    const hzx=IK[10]*IK[8]-IK[11]*IK[7],hzy=IK[11]*IK[6]-IK[9]*IK[8],hzz=IK[9]*IK[7]-IK[10]*IK[6];
    a3Bas(M,Q[0]-IK[0],Q[1]-IK[1],Q[2]-IK[2],hzx,hzy,hzz);a3Set(TH,M,Q[0],Q[1],Q[2]);
    a3Bas(M,IK[0]-IK[3],IK[1]-IK[4],IK[2]-IK[5],hzx,hzy,hzz);a3Set(SH,M,IK[0],IK[1],IK[2]);
    let Fx=IK[6],Fz=IK[8];const fl=Math.hypot(Fx,Fz);if(fl<.2){Fx=bx;Fz=bz}else{Fx/=fl;Fz/=fl}const toe=s*.1,ct=Math.cos(toe),st=Math.sin(toe),Gx=Fx*ct+Fz*st,Gz=-Fx*st+Fz*ct;
    const cp=Math.cos(pt),spp=Math.sin(pt);a3Bas(M,spp*Gx,cp,spp*Gz,-Gz,0,Gx);a3Set(FT,M,IK[3],IK[4],IK[5])}
  /* arms: 2D FK gives the reach; IK to hand targets with lateral placement, convergence and ball reach */
  const ku=a.kU2,two=bh===1||ku===14||ku===12&&!carry||ku===37||kl===12&&pre,push=ku===16||ku===17;let reach=0,bl=null;
  if(!ref&&ball&&ball.state==='air'&&!ball.pitch&&(ku===14||ku===30)){const R2=Math.hypot(ball.x-p.x,ball.y-p.y,(ball.z||0)-1.3*H/A3_H0);if(R2<2.4){reach=Math.pow(1-R2/2.4,1.5);bl=[ball.x,ball.z||0,ball.y]}}
  /* root: yaw · roll · (offset) · fall/dive pitch, scaled by height */
  const th=-yaw,cy=Math.cos(th),sy=Math.sin(th),ca=Math.cos(a.roll),sa=Math.sin(a.roll),cr=Math.cos(rot),sr=Math.sin(rot),Rr=A3R;
  {const m1=[cr,-sr*ca,-sr*sa,sr,cr*ca,cr*sa,0,-sa,ca];for(let c=0;c<3;c++){const x=m1[c*3],y=m1[c*3+1],z=m1[c*3+2];Rr[c*3]=x*cy+z*sy;Rr[c*3+1]=y;Rr[c*3+2]=-x*sy+z*cy}}
  const lift=o[15]+.085*Math.abs(Math.sin(rot)),rxo=o[16],ox=rxo,oy=lift*ca,oz=lift*sa,Tx=p.x+H*(ox*cy+oz*sy),Ty=(p.z||0)+H*oy,Tz=p.y+H*(-ox*sy+oz*cy);
  let blx=0,bly=0,blz=0;if(bl){const wx=(bl[0]-Tx)/H,wy=(bl[1]-Ty)/H,wz=(bl[2]-Tz)/H;blx=Rr[0]*wx+Rr[1]*wy+Rr[2]*wz;bly=Rr[3]*wx+Rr[4]*wy+Rr[5]*wz;blz=Rr[6]*wx+Rr[7]*wy+Rr[8]*wz}
  const wave=ref&&p.sig==='wave'&&now<p.sigEnd,ctw=Math.cos(twC),stw=Math.sin(twC);
  for(let s=-1;s<=1;s+=2){const L=s<0,UA=L?A3_UAL:A3_UAR,FA=L?A3_FAL:A3_FAR,u=o[L?10:12],e=o[L?11:13];a3Pt(A3_CHE,0,.095,s*SW,Q,0);
    const ex=Math.sin(u)*.172,ey=-Math.cos(u)*.172,fa=u+e,wx0=ex+Math.sin(fa)*.148,wy0=ey-Math.cos(fa)*.148;
    let lat=s*(.032+.03*g),cv=two?.86:push?.4:0;if(carry===(L?2:1))cv=.25;
    let lz=lat+(s*.045-Q[2]-lat)*cv,wx=wx0*ctw+lz*stw,wy=wy0,wz=-wx0*stw+lz*ctw;
    if(wave){const q=(now/260)%2,w=athE(q<1?q:2-q),c2=L?w:1-w;wx=.2;wy=-.03;wz=s*(.3*c2-.05)-Q[2]*.0}
    let tx=Q[0]+wx,ty=Q[1]+wy,tz=Q[2]+wz;
    if(reach>0){tx+=(blx-tx-.05)*reach;ty+=(bly-ty)*reach;tz+=(blz+s*.045-tz)*reach}
    const pxo=ex-.05,pzo=s*.1;a3IK(Q[0],Q[1],Q[2],tx,ty,tz,.172,.148,pxo*ctw+pzo*stw,ey,-pxo*stw+pzo*ctw,IK);
    const hzx=IK[7]*IK[11]-IK[8]*IK[10],hzy=IK[8]*IK[9]-IK[6]*IK[11],hzz=IK[6]*IK[10]-IK[7]*IK[9];
    a3Bas(M,Q[0]-IK[0],Q[1]-IK[1],Q[2]-IK[2],hzx,hzy,hzz);a3Set(UA,M,Q[0],Q[1],Q[2]);
    a3Bas(M,IK[0]-IK[3],IK[1]-IK[4],IK[2]-IK[5],hzx,hzy,hzz);a3Set(FA,M,IK[0],IK[1],IK[2])}
  /* write bone matrices: M_i = [H·Rr·R_i | T + H·Rr·(P_i − R_i·J_i)] */
  const bm=f.sk.boneMatrices,J=d.J;
  for(let i=0;i<A3_NB;i++){const k=i*12,o16=i*16;
    for(let c=0;c<3;c++){const x=A3F[k+c*3],y=A3F[k+c*3+1],z=A3F[k+c*3+2];bm[o16+c*4]=H*(Rr[0]*x+Rr[3]*y+Rr[6]*z);bm[o16+c*4+1]=H*(Rr[1]*x+Rr[4]*y+Rr[7]*z);bm[o16+c*4+2]=H*(Rr[2]*x+Rr[5]*y+Rr[8]*z);bm[o16+c*4+3]=0}
    const jx=J[i*3],jy=J[i*3+1],jz=J[i*3+2],lx=A3F[k+9]-(A3F[k]*jx+A3F[k+3]*jy+A3F[k+6]*jz),ly=A3F[k+10]-(A3F[k+1]*jx+A3F[k+4]*jy+A3F[k+7]*jz),lz=A3F[k+11]-(A3F[k+2]*jx+A3F[k+5]*jy+A3F[k+8]*jz);
    bm[o16+12]=Tx+H*(Rr[0]*lx+Rr[3]*ly+Rr[6]*lz);bm[o16+13]=Ty+H*(Rr[1]*lx+Rr[4]*ly+Rr[7]*lz);bm[o16+14]=Tz+H*(Rr[2]*lx+Rr[5]*ly+Rr[8]*lz);bm[o16+15]=1}
  if(f.sk.boneTexture)f.sk.boneTexture.needsUpdate=true;
  if(f.helm){f.helm.matrix.fromArray(bm,A3_HED*16);f.helm.matrixWorldNeedsUpdate=true}
  const pk=A3_PEL*12;f.bs.center.set(Tx+H*(Rr[0]*A3F[pk+9]+Rr[3]*A3F[pk+10]+Rr[6]*A3F[pk+11]),Ty+H*(Rr[1]*A3F[pk+9]+Rr[4]*A3F[pk+10]+Rr[7]*A3F[pk+11]),Tz+H*(Rr[2]*A3F[pk+9]+Rr[5]*A3F[pk+10]+Rr[8]*A3F[pk+11]));
  /* ball in hand (world): carry arm, both hands, cocked to throw, dive */
  if(car){const toW=(i,x,y,z,out)=>{a3Pt(i,x,y,z,Q,0);out[0]=Tx+H*(Rr[0]*Q[0]+Rr[3]*Q[1]+Rr[6]*Q[2]);out[1]=Ty+H*(Rr[1]*Q[0]+Rr[4]*Q[1]+Rr[7]*Q[2]);out[2]=Tz+H*(Rr[2]*Q[0]+Rr[5]*Q[1]+Rr[8]*Q[2])};
    const B=A3.carH||(A3.carH={p:[0,0,0],q:[0,0,0],t:[0,0,0],m:0});const FAr=A3_FAR,FAl=A3_FAL;B.m=1;
    if(bh===1){toW(FAl,.01,-.155,0,B.p);toW(FAr,.01,-.155,0,B.q);for(let i=0;i<3;i++)B.p[i]=(B.p[i]+B.q[i])/2;toW(A3_CHE,.3,.05,0,B.t)}
    else if(bh===2||bh===3){toW(FAr,.02,-.17,0,B.p);toW(FAr,.02,-.4,0,B.t)}
    else if(carry){const FAc=carry===1?FAr:FAl,sd=carry===1?1:-1;toW(FAc,.03,-.13,-sd*.035,B.p);toW(FAc,.06,-.42,-sd*.05,B.t)}
    else{toW(FAr,.02,-.16,0,B.p);toW(FAr,.02,-.4,0,B.t)}
    for(let i=0;i<3;i++)B.t[i]-=B.p[i]}
}

/* ---------- ball + flag ---------- */
function a3BallMesh(){if(A3.ball)return A3.ball;const [cv,g]=a3Cv(256,128);g.fillStyle='#6f3515';g.fillRect(0,0,256,128);
  const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(0,0,0,.35)');gr.addColorStop(.2,'rgba(0,0,0,0)');gr.addColorStop(.8,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=gr;g.fillRect(0,0,256,128);
  a3Grain(g,[0,0,256,128],.12,3500);g.fillStyle='#3b1a08';for(const u of [0,.25,.5,.75])g.fillRect(u*256-1,0,2,128);
  g.fillStyle='#f2efe8';g.fillRect(64,16,128,9);g.fillRect(64,103,128,9);
  g.fillStyle='#f6f3ec';g.fillRect(124,40,8,48);for(let i=0;i<8;i++)g.fillRect(117,43+i*6,22,3);
  const m=new THREE.Mesh(a3BallGeo(),new THREE.MeshStandardMaterial({map:a3Tex(cv),roughness:.55,metalness:0}));A3.res.add(m.material);m.castShadow=true;m.matrixAutoUpdate=false;A3.g.add(m);A3.ball=m;return m}
let A3BX=null,A3BY=null,A3BZ=null,A3UP=null;
function a3BallFrame(dt){
  if(!A3BX){A3BX=new THREE.Vector3();A3BY=new THREE.Vector3();A3BZ=new THREE.Vector3();A3UP=new THREE.Vector3(0,1,0)}
  const m=a3BallMesh(),b=ball;if(!b||!P.length){m.visible=false;return}m.visible=true;const H=A3.carH;let px,py,pz,ax=1,ay=0,az=0,spin=false;
  if(b.state==='held'&&H&&H.m){px=H.p[0];py=H.p[1];pz=H.p[2];ax=H.t[0];ay=H.t[1];az=H.t[2]}
  else{px=b.x;py=Math.max(.11,b.z||0);pz=b.y;
    if(b.state==='air'){const v=A3.bp;if(v){const dx=px-v[0],dy=py-v[1],dz=pz-v[2],l=Math.hypot(dx,dy,dz);if(l>1e-4){const bv=A3.bv||(A3.bv=[dx/l,dy/l,dz/l]);for(const [i,q] of [[0,dx],[1,dy],[2,dz]])bv[i]+=(q/l-bv[i])*.5}}
      if(A3.bv){ax=A3.bv[0];ay=A3.bv[1];az=A3.bv[2]}spin=true;
      const w=(typeof athWob==='function'&&!b.pitch)?(b._wob===undefined?(b._wob=athWob()):b._wob):0;if(w>0){const t=A3.spin*.07;ay+=Math.sin(t*6)*.5*w;az+=Math.cos(t*6)*.5*w}}
    else{A3.bv=null;ax=1;ay=0;az=0}}
  A3.bp=A3.bp||[0,0,0];A3.bp[0]=px;A3.bp[1]=py;A3.bp[2]=pz;if(spin)A3.spin+=dt*34;
  A3BX.set(ax,ay,az).normalize();A3BZ.crossVectors(A3BX,A3UP);if(A3BZ.lengthSq()<1e-6)A3BZ.set(0,0,1);A3BZ.normalize();A3BY.crossVectors(A3BZ,A3BX);
  const s=spin?A3.spin:0,cs=Math.cos(s),ss=Math.sin(s),yx=A3BY.x*cs+A3BZ.x*ss,yy=A3BY.y*cs+A3BZ.y*ss,yz=A3BY.z*cs+A3BZ.z*ss;A3BZ.set(A3BZ.x*cs-A3BY.x*ss,A3BZ.y*cs-A3BY.y*ss,A3BZ.z*cs-A3BY.z*ss);A3BY.set(yx,yy,yz);
  m.matrix.makeBasis(A3BX,A3BY,A3BZ).setPosition(px,py,pz);m.matrixWorldNeedsUpdate=true}
function a3FlagFrame(){
  const f=(typeof OFFI!=='undefined')?OFFI.flag:null;let m=A3.flag;
  if(!f||f.t<0){if(m)m.visible=false;return}
  if(!m){const mt=new THREE.MeshStandardMaterial({color:0xffd21f,roughness:.8,emissive:0x3a2c00,side:THREE.DoubleSide});A3.res.add(mt);m=A3.flag=new THREE.Mesh(a3FlagGeo(),mt);m.castShadow=true;A3.g.add(m)}
  m.visible=true;const q=clamp(f.t/f.T,0,1),x=f.x0+(f.x1-f.x0)*q,y=f.y0+(f.y1-f.y0)*q,h=1.75*(1-q)+3.2*q*(1-q);m.position.set(x,Math.max(.045,h),y);
  if(q<1)m.rotation.set(q*9+f.rot,f.rot+q*4,q*5);else m.rotation.set(0,f.rot,0)}

/* ---------- public API ---------- */
function ath3dFrame(group,now,dt){
  if(typeof THREE==='undefined'||!group)return;if(A3.g!==group){if(A3.g)ath3dReset();A3.g=group}
  if(now==null)now=performance.now();if(dt==null)dt=A3.now<0?0:(now-A3.now)/1000;A3.now=now;dt=clamp(dt||0,0,.05);if(S.photo||S.paused)dt=0;
  if(S.phase==='dead'&&play&&A3.dp!==play){A3.dp=play;A3.da=now}
  let car=null;if(play&&ball&&ball.state==='held'){if(S.phase!=='replay')car=play.carrier;else{let bd=1.3;for(const p of P){const dd=Math.abs(p.x-ball.x)+Math.abs(p.y-ball.y);if(dd<bd){bd=dd;car=p}}}}
  /* 08d/08e read ATH.car / ATH.dt / ATH.deadAt: use this renderer's clock while evaluating, then restore */
  const c0=ATH.car,d0=ATH.dt,a0=ATH.deadAt,p0=ATH.deadPlay;ATH.car=car;ATH.dt=dt;if(A3.dp){ATH.deadAt=A3.da;ATH.deadPlay=A3.dp}A3.fr++;if(A3.carH)A3.carH.m=0;
  const run=(p,team)=>{athBody(p);const k=p.pl||p;let f=A3.figs.get(k);
    if(f&&!f.ref&&(f.team!==team||f.tm!==a3Team(team)||f.p.num!==p.num)){a3Drop(f);A3.figs.delete(k);f=null}
    if(!f){f=a3Fig(p,team);A3.figs.set(k,f)}
    if(f.p!==p){f.p=p;f.a.px=p.x;f.a.py=p.y;f.a.kL=-1;f.a.kU=-1;f.a.yi=false;f.a.fall=0}
    if(f.seen!==A3.fr-1&&f.seen!==A3.fr){f.a.px=p.x;f.a.py=p.y;f.a.yi=false}
    f.seen=A3.fr;a3Eval(p,f.a,now,dt);a3Solve(f,now,dt);f.body.visible=true;if(f.num)f.num.visible=true;if(f.helm)f.helm.visible=true};
  try{
    if(S.home)for(const p of P)run(p,p.team||(p.side==='o'?offT():defT()));
    if(S.home&&P.length&&typeof offiFrame==='function'&&LG.settings.officials!==false){const L=offiFrame(now);if(L)for(const o of L)run(o,null)}
  }finally{ATH.car=c0;ATH.dt=d0;ATH.deadAt=a0;ATH.deadPlay=p0}
  for(const [k,f] of A3.figs){if(f.seen===A3.fr)continue;f.body.visible=false;if(f.num)f.num.visible=false;if(f.helm)f.helm.visible=false;if(A3.fr-f.seen>900){a3Drop(f);A3.figs.delete(k)}}
  a3BallFrame(dt);a3FlagFrame();
}
function ath3dReset(){
  for(const f of A3.figs.values())a3Drop(f);A3.figs.clear();
  for(const m of [A3.ball,A3.flag])if(m&&m.parent)m.parent.remove(m);
  for(const r of A3.res)try{r.dispose()}catch(e){}
  A3.res.clear();A3.teams.clear();A3.geo.clear();A3.ref=null;A3.ball=null;A3.flag=null;A3.bp=null;A3.bv=null;A3.carH=null;A3.now=-1;A3.g=null;A3.dp=null}
