/* =========================================================
   08p · Pixel style: hand-authored pixel-art athletes (string grids + palette keys), recoloured per uniform and cached.
   A frame is put together from authored parts (legs, torso, arms, head) at whole-pixel offsets, then outlined in
   #141A26 and cut to a canvas. Three builds (big OL/DL, medium QB/RB/TE/LB, lean WR/DB/K/P) use their own torso and
   leg widths. Faces right; the renderer mirrors for facing left.
   Palette keys:  H helmet  h helmet shade  i highlight  Y helmet stripe  D decal  M facemask
                  S skin  s skin shade  J jersey  j jersey shade  N sleeve trim  P pants  p pants shade  T pants stripe
                  K socks  k sock shade  C cleats  G gloves  g glove shade  Q cap (officials)  o outline
   ========================================================= */
const PXO='#141A26';
const PXP={};   // parts: {g:[rows], x,y: pivot}
function pxPart(name,px,py,rows){PXP[name]={g:rows,x:px,y:py,w:Math.max(...rows.map(r=>r.length)),h:rows.length}}
/* head: neck pivot at the bottom (between jaw and pads) */
pxPart('head',4,7,[
  "...YYYY...",
  ".HHiiHHHH.",
  ".HiHHHHHHH",
  "HHHHHHHHHM",
  "HHDDHHHSSM",
  "HHHHHHHSMM",
  "hHHHHHhSSM",
  ".hhhhhhMMM"]);
pxPart('cap',4,7,[
  "..........",
  "...QQQQ...",
  "..QQQQQQ..",
  "..QQQQQQQQ",
  "..SSSSSSS.",
  "..sSSSSSS.",
  "..sSSSSS..",
  "...sSSS..."]);
/* torsos: pivot = waist (bottom centre); shoulder points sn (near) / sf (far); neck point nk */
const PXT={};
function pxTorso(name,px,py,sn,sf,nk,rows){pxPart(name,px,py,rows);PXT[name]={sn,sf,nk}}
pxTorso('tM',5,6,[6,2],[3,2],[5,0],[
  "..jJJJJJ..",
  ".jJJJJJJJ.",
  "jJJJJJJJJJ",
  "jJJJJJJJJJ",
  ".jJJJJJJJ.",
  ".jJJJJJJJ.",
  ".pPPPPPPP."]);
pxTorso('tB',6,6,[7,2],[3,2],[6,0],[
  "..jJJJJJJJ..",
  ".jJJJJJJJJJ.",
  "jJJJJJJJJJJJ",
  "jJJJJJJJJJJJ",
  "jJJJJJJJJJJJ",
  ".jJJJJJJJJJ.",
  ".pPPPPPPPPP."]);
pxTorso('tL',4,6,[5,2],[3,2],[4,0],[
  "..jJJJJ..",
  ".jJJJJJJ.",
  "jJJJJJJJJ",
  "jJJJJJJJ.",
  ".jJJJJJJ.",
  ".jJJJJJJ.",
  ".pPPPPPP."]);
/* legs: pivot = hip (top centre); the waist row of the torso sits right above row 0 */
pxPart('lIdle',4,0,[
  "pPPPPTPP",
  "pppPPTPP",
  "ppp.PTPP",
  "ppp.PTP.",
  "kkk.KKK.",
  "kkk.KKK.",
  "kkk.KKK.",
  "kkk.KKK.",
  "CCC.CCCC"]);
pxPart('lIdleB',5,0,[
  "pPPPPPTPPP",
  "ppppPPTPPP",
  "pppp.PTPPP",
  "pppp.PTPP.",
  "kkkk.KKKK.",
  "kkkk.KKKK.",
  "kkkk.KKKK.",
  "kkkk.KKKK.",
  "CCCC.CCCCC"]);
pxPart('lR1',6,0,[
  "...pPPPTP...",
  "..pppPPTPP..",
  ".ppp...PTPP.",
  "ppp.....PTP.",
  "kk.......KKK",
  "kk.......KKK",
  "kk......KKK.",
  "Ck......KKK.",
  "C.......CCCC"]);
pxPart('lR2',5,0,[
  "..pPPPTP...",
  "..pPPPTPpp.",
  "..pPPTP.ppp",
  "...PTPP..kk",
  "...KKK..kk.",
  "...KKK.kk..",
  "...KKKkC...",
  "...KKK.....",
  "...CCCC...."]);
pxPart('lR3',5,0,[
  "..pPPPTP...",
  "..ppPPTPP..",
  ".ppp.PTPP..",
  ".pp...PTPP.",
  "kk.....KKK.",
  "kk.....KKK.",
  "k.....KKK..",
  "C.....KKK..",
  "C.....CCCC."]);
pxPart('lBP1',4,0,[
  ".pPPPTPP",
  "ppPPPTPP",
  "pp..PTPP",
  "pp..PTP.",
  "kk...KKK",
  "kk...KKK",
  "kk..KKK.",
  "kk..KKK.",
  "CCC.CCCC"]);
pxPart('lBP2',4,0,[
  ".pPPPTPP",
  ".ppPPTPP",
  ".ppPPTP.",
  "..pPPTP.",
  "..kKKK..",
  "..kKKK..",
  ".kkKKK..",
  "kk.KKK..",
  "CC.CCCC."]);
pxPart('lCrouch',5,0,[
  ".pPPPPTPPP",
  "pppPP..PTPP",
  "ppp.....PTP",
  "kkk.....KKK",
  "kkk.....KKK",
  "kkk.....KKK",
  "CCC.....CCCC"]);
pxPart('lWide',6,0,[
  "...pPPPTPP..",
  "..pppP.PTPP.",
  ".ppp....PTPP",
  ".kkk.....KKK",
  "kkk......KKK",
  "kkk......KKK",
  "kkk......KKK",
  "kk.......KKK",
  "CCC......CCCC"]);
pxPart('lKneel',4,0,[
  "pPPPPTPP...",
  "ppPPPPTPPPP",
  "pp.....KKKP",
  "kk.....KKK.",
  "kk.....KKK.",
  "kkkkk..KKK.",
  "CC.....CCCC"]);
pxPart('lTuck',5,0,[
  "..pPPPTP...",
  ".ppPPPTPPPP",
  "pppp..PPPPP",
  "kkkk..KKKK.",
  ".kkCC..KKCC"]);
pxPart('lKickB',5,0,[
  "..pPPPTP..",
  ".ppPPPTP..",
  "pppp.PTP..",
  "kkk..PTP..",
  "kk...KKK..",
  "Ck...KKK..",
  "C....KKK..",
  ".....KKK..",
  ".....CCCC."]);
pxPart('lKickU',4,0,[
  "..pPPPTPPP...CC",
  "..pPPPTPPPKKKKC",
  "..ppp..PPKKK...",
  "..ppp..........",
  "..kkk..........",
  "..kkk..........",
  "..kkk..........",
  "..kkk..........",
  "..CCCC........."]);
pxPart('lSt3',6,0,[
  "...pPPPPTP..",
  "..pppPPPPTP.",
  ".ppp....PTPP",
  "kkk.......KKK",
  "kkk......KKK.",
  "kkk......KKK.",
  "CCC......CCCC"]);
/* arms: pivot = shoulder; drawn far (shaded) and near */
pxPart('aDown',0,0,["JJ","NN","SS","SS","GG"]);
pxPart('aFwd',0,0,["JJ..","NN..","SSS.",".SSG"]);
pxPart('aBack',1,0,[".JJ","NN.","SS.","G.."]);
pxPart('aUp',0,5,[".G",".S","SS","S.","N.","J."]);
pxPart('aUpF',0,4,["...G","..SS",".NS.","JJ..","J..."]);
pxPart('aOut',0,0,["JJNSSSG","JJNSSSG"]);
pxPart('aPush',0,0,["JJNSSG",".JNSSG"]);
pxPart('aThrow',2,3,["G..","SS.",".SN","..J"]);
pxPart('aRel',0,3,["...G","..SS",".NS.","JJ.."]);
pxPart('aFol',0,0,["JJ..",".NS.","..SS","...G"]);
pxPart('aGround',0,0,["JJ","NN","SS","SS","SS","GG"]);
pxPart('aWrap',0,0,["JJN..","..SSS","....G"]);
pxPart('aHold',0,0,["JJ.","NNS",".SG"]);
pxPart('aSnap',0,0,["JJ","NN",".S","..S","..G"]);
/* ---------- frames ----------
   L legs, k torso shear (px per row, forward lean), y torso drop, a far arm, b near arm, hx/hy head nudge, rx: rotate (lying / dive)
   ball: carry point offset from the near shoulder ([dx,dy]); w: whole-frame shear  */
const PXF={
  idle:{L:'lIdle'},
  st3:{L:'lSt3',k:1,y:2,a:'aGround',b:'aGround',hx:1,hy:1},
  st2:{L:'lCrouch',k:.4,y:1,a:'aFwd',b:'aFwd'},
  sh1:{L:'lWide',k:.3,y:1,a:'aFwd',b:'aFwd'},
  sh2:{L:'lCrouch',k:.3,y:1,a:'aFwd',b:'aFwd'},
  r1:{L:'lR1',k:.34,a:'aBack',b:'aFwd'},
  r2:{L:'lR3',k:.34,y:-1,a:'aBack',b:'aFwd'},
  r3:{L:'lR2',k:.34,a:'aFwd',b:'aBack'},
  bp1:{L:'lBP1',k:-.2,a:'aFwd',b:'aFwd'},
  bp2:{L:'lBP2',k:-.2,a:'aFwd',b:'aFwd'},
  hold:{L:'lIdle',a:'aHold',b:'aHold',ball:[2,2]},
  t1:{L:'lWide',k:-.2,a:'aFwd',b:'aThrow',ball:[-2,-3]},
  t2:{L:'lWide',k:.2,a:'aBack',b:'aRel'},
  t3:{L:'lR1',k:.5,a:'aBack',b:'aFol'},
  reach:{L:'lIdle',a:'aUp',b:'aUpF',hy:0},
  blk1:{L:'lWide',k:.6,y:1,a:'aPush',b:'aPush'},
  blk2:{L:'lWide',k:.5,y:1,a:'aPush',b:'aOut'},
  wrap:{L:'lR1',k:.8,y:1,a:'aWrap',b:'aWrap'},
  kneel:{L:'lKneel',k:.2,y:0,a:'aDown',b:'aFwd'},
  hurdle:{L:'lTuck',k:.3,a:'aBack',b:'aFwd'},
  juke:{L:'lWide',k:-.35,a:'aOut',b:'aBack'},
  stiff:{L:'lR1',k:.34,a:'aBack',b:'aOut'},
  cel1:{L:'lIdle',a:'aUp',b:'aUp'},
  cel2:{L:'lWide',a:'aDown',b:'aUpF'},
  k1:{L:'lKickB',k:-.2,a:'aOut',b:'aBack'},
  k2:{L:'lKickU',k:-.45,a:'aOut',b:'aBack'},
  snap:{L:'lSt3',k:1,y:2,a:'aGround',b:'aSnap',hx:1,hy:1},
  fall1:{src:'idle',w:.45},
  fall2:{src:'idle',w:.75},
  lie:{src:'idle',rot:1},
  dive:{src:'reach',rot:1},
  spinB:{L:'lIdle',back:1,a:'aHold',b:'aHold'}
};
/* run cycle: three authored strides, then the same strides with the near / far legs (and arms) trading shades */
const PX_RUN=['r1','r2','r3','r1s','r2s','r3s'],PX_BACK=['bp1','bp2','bp1s','bp2s'];
for(const k of ['r1','r2','r3','bp1','bp2'])PXF[k+'s']={src:k,swap:1};
for(const k of PX_RUN)PXF[k+'L']={src:k,w:.3};   // sprint lean
const PX_BUILD={B:{t:'tB',l:{lIdle:'lIdleB'}},M:{t:'tM',l:{}},L:{t:'tL',l:{}}};
const pxBuildOf=p=>{const r=p.role;return r==='OL'||r==='DL'?'B':r==='WR'||r==='CB'||r==='S'||r==='K'||r==='P'||p.ref?'L':'M'};
/* compose a frame into a key grid: returns {g:Map 'x,y'->key, ax, ay} with the anchor (feet) at ax,ay */
function pxStamp(G,part,x0,y0,map,front){const P0=PXP[part];if(!P0)return;
  for(let r=0;r<P0.h;r++){const row=P0.g[r];for(let c=0;c<row.length;c++){let ch=row[c];if(ch==='.')continue;if(map)ch=map[ch]||ch;const k=(x0+c)+','+(y0+r);if(!front&&G.has(k))continue;G.set(k,ch)}}}
const PX_FAR={S:'s',G:'g',J:'j',N:'j',P:'p',K:'k',T:'p'};
const PX_NEAR={J:'A',N:'n',S:'E',G:'F'},PX_ARM=new Set(['A','n','E','F']);   // near-arm sleeve / trim / skin / glove (same colours, own keys)
function pxCompose(name,bd){
  const F=PXF[name];if(!F)return pxCompose('idle',bd);
  if(F.src){const B=pxCompose(F.src,bd),G=new Map();let ax=B.ax,ay=B.ay;
    for(const [k,ch] of B.g){let [x,y]=k.split(',').map(Number),c=ch;
      if(F.swap){c={P:'p',p:'P',K:'k',k:'K',S:'s',s:'S',G:'g',g:'G',T:'p'}[ch]||ch;if(ch==='T')c='p';if(ch==='P'&&y>=B.hip)c='p'}
      if(F.w){x+=Math.round((B.ay-y)*F.w)}
      if(F.rot){const nx=B.ay-y,ny=x-B.ax;x=nx;y=ny}
      G.set(x+','+y,c)}
    if(F.swap){/* the near leg gets its stripe back */for(const [k,ch] of G){const [x,y]=k.split(',').map(Number);if(ch==='P'&&y>=B.hip&&G.get((x+1)+','+y)==='P'&&G.get((x-1)+','+y)==='P'&&(x%3===0))G.set(k,'T')}}
    if(F.rot){let mx=-1e9,my=-1e9,mnx=1e9;for(const k of G.keys()){const [x,y]=k.split(',').map(Number);if(y>my)my=y;if(x>mx)mx=x;if(x<mnx)mnx=x}ax=Math.round((mx+mnx)/2);ay=my}
    return {g:G,ax,ay,hip:B.hip,sn:B.sn}}
  const bu=PX_BUILD[bd]||PX_BUILD.M,Ln=bu.l[F.L]||F.L,L=PXP[Ln],tn=bu.t,T=PXP[tn],TT=PXT[tn],G=new Map();
  /* feet on row 0 (anchor), legs above, torso on the legs, head on the neck */
  const ay=0,hipY=ay-L.h+(F.y||0),lx=-L.x;
  const k=F.k||0,ty=hipY-T.h,tx=-T.x;   // torso waist row sits just above the hips
  const shear=r=>Math.round((T.h-1-r)*k);
  const tor=new Map();for(let r=0;r<T.h;r++){const row=T.g[r];for(let c=0;c<row.length;c++){const ch=row[c];if(ch!=='.')tor.set((tx+c+shear(r))+','+(ty+r),F.back&&ch==='J'?'J':ch)}}
  const sp=(pt)=>[tx+pt[0]+shear(pt[1]),ty+pt[1]];
  const sn=sp(TT.sn),sf=sp(TT.sf),nk=sp(TT.nk);
  const hd=PXP.head,hx=nk[0]-hd.x+(F.hx||0)+1,hy=nk[1]-hd.y+(F.hy||0);
  /* far arm, legs, torso, head, near arm */
  if(F.a){const A=PXP[F.a];pxStamp(G,F.a,sf[0]-A.x,sf[1]-A.y,PX_FAR,true)}
  pxStamp(G,Ln,lx,hipY,null,true);
  for(const [kk,ch] of tor)G.set(kk,ch);
  pxStamp(G,'head',hx,hy,null,true);
  if(F.b){const A=PXP[F.b];pxStamp(G,F.b,sn[0]-A.x,sn[1]-A.y,PX_NEAR,true);
    /* a dark contour where the near arm crosses the body, so it reads in front of the torso */
    for(const [kk,ch] of [...G]){if(!PX_ARM.has(ch))continue;const [x,y]=kk.split(',').map(Number);for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(x+a)+','+(y+b),c=G.get(q);if(c&&!PX_ARM.has(c)&&'JjPpTN'.includes(c))G.set(q,c==='J'||c==='N'?'j':c==='P'||c==='T'?'p':'o')}}}
  return {g:G,ax:0,ay:0,hip:hipY,sn,head:[hx,hy],ball:F.ball?[sn[0]+F.ball[0],sn[1]+F.ball[1]]:[sn[0]+2,sn[1]+3]};
}
/* colours for one uniform (U = 10c resolved set) */
function pxShade(h,a){return athHex(shade(athHex(h),a))}
function pxPal(team,U,ref,tone){const sk=TONES[tone|0]||TONES[1],sks=pxShade(sk,-.22);
  if(ref)return {H:'#1C2230',h:'#141A26',i:'#3A4256',Y:'#1C2230',D:'#1C2230',M:'#5A6272',J:'#F4F1E8',j:'#C9C6BE',N:'#C9C6BE',P:'#1E2432',p:'#151A26',T:'#1E2432',K:'#1E2432',k:'#151A26',C:'#141A26',G:'#F4F1E8',g:'#C9C6BE',Q:ref==='R'?'#F4F1E8':'#1E2432',S:sk,s:sks,E:sk,A:'#F4F1E8',n:'#141A26',F:'#F4F1E8'};
  const j=athHex(U.j),n=athHex(U.n),h=athHex(U.h),p=athHex(U.p),k=athHex(U.k||U.p);
  const gl=lum(j)>.8?athHex(team.c1):n;
  const m0=athHex(U.m||'#C9CED6'),mk=contrasty(m0,h)?m0:(lum(h)<.4?'#C9CED6':'#2A3142');
  return {H:h,h:pxShade(h,-.32),i:pxShade(h,lum(h)<.2?.9:.45),Y:U.hs?athHex(U.hc):h,D:athHex(U.dc||U.hc||n),M:mk,J:j,j:pxShade(j,-.26),N:U.sl?athHex(U.sc):pxShade(j,-.26),
    P:p,p:pxShade(p,-.24),T:U.ps?athHex(U.pc):p,K:k,k:pxShade(k,-.24),C:'#232836',G:gl,g:pxShade(gl,-.3),num:n,numO:pxShade(j,lum(j)>.5?-.45:.4),Q:h,S:sk,s:sks,E:sk,A:j,n:U.sl?athHex(U.sc):j,F:gl}}
/* 3×5 digits */
const PXD={0:[7,5,5,5,7],1:[2,6,2,2,7],2:[7,1,7,4,7],3:[7,1,3,1,7],4:[5,5,7,1,1],5:[7,4,7,1,7],6:[7,4,7,5,7],7:[7,1,1,2,2],8:[7,5,7,5,7],9:[7,5,7,1,7]};
const PXC=new Map();let PXC_N=0;
/* the cached canvas for (palette, build, frame, number); returns {cv, ax, ay, ball:[x,y]} with the anchor in canvas px */
function pxSprite(pal,pk,bd,frame,num,ref,tone){
  const key=pk+'|'+bd+'|'+frame+'|'+(num==null?'':num)+(ref?'|r'+ref:'')+'|'+(tone|0);let e=PXC.get(key);if(e)return e;
  if(PXC.size>2400){PXC.clear()}
  const F=pxCompose(frame,bd),G=F.g;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  if(ref){/* officials: cap instead of a helmet, black-and-white stripes */for(const [k,ch] of G){if('HhiYDM'.includes(ch))G.delete(k)}
    if(F.head){const hd=PXP.cap;for(let r=0;r<hd.h;r++)for(let c=0;c<hd.g[r].length;c++){const ch=hd.g[r][c];if(ch!=='.')G.set((F.head[0]+c)+','+(F.head[1]+r),ch)}}}
  for(const k of G.keys()){const [x,y]=k.split(',').map(Number);if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  const w=x1-x0+3,h=y1-y0+3,cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
  const id=g.createImageData(w,h),D=id.data,rgb={};const P2=Object.assign({},pal,{S:TONES[tone|0]||TONES[1],s:pxShade(TONES[tone|0]||TONES[1],-.22),E:TONES[tone|0]||TONES[1]});pal=P2;const col=c=>{let v=rgb[c];if(!v){const hx=athHex(pal[c]||PXO),n=parseInt(hx.slice(1),16);v=rgb[c]=[n>>16,n>>8&255,n&255]}return v};
  const put=(x,y,c)=>{const i=(y*w+x)*4,v=col(c);D[i]=v[0];D[i+1]=v[1];D[i+2]=v[2];D[i+3]=255};
  /* outline: every empty pixel touching the figure (4-neighbourhood) */
  for(const k of G.keys()){const [x,y]=k.split(',').map(Number);for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(x+a)+','+(y+b);if(!G.has(q))put(x+a-x0+1,y+b-y0+1,'o')}}
  for(const [k,ch] of G){const [x,y]=k.split(',').map(Number);let c=ch;
    if(ref&&(ch==='J'||ch==='j'||ch==='N'||ch==='A'||ch==='n'))c=((x-x0)%2)?'o':(ch==='j'?'j':'J');
    put(x-x0+1,y-y0+1,c==='o'?'o':c)}
  /* jersey number (3×5) on the back half of the torso when it fits */
  if(num!=null&&!ref&&!(PXF[frame]||PXF.idle).rot){const s=String(num).slice(-2),nw=s.length*4-1;
    let bx0=1e9,bx1=-1e9,by0=1e9,cnt=0;for(const [k,ch] of G){if(ch!=='J')continue;const [x,y]=k.split(',').map(Number);if(y<by0)by0=y}
    const rows=[];for(let r=0;r<5;r++){let a=1e9,b=-1e9;for(const [k,ch] of G){if(ch!=='J'&&ch!=='j')continue;const [x,y]=k.split(',').map(Number);if(y!==by0+1+r)continue;if(x<a)a=x;if(x>b)b=x}rows.push([a,b])}
    for(const [a,b] of rows){if(a<bx0)bx0=a;if(b>bx1)bx1=b;if(b-a+1>=nw+1)cnt++}
    if(cnt>=4){const nx=Math.round(Math.max(...rows.map(r=>r[0]))+(Math.min(...rows.map(r=>r[1]))-Math.max(...rows.map(r=>r[0]))+1-nw)/2)-(s.length>1?1:0),ny=by0+1;
      const nc=contrasty(pal.num,pal.J)?'num':'numO';
      for(let i=0;i<s.length;i++){const gl=PXD[s[i]];for(let r=0;r<5;r++)for(let b=0;b<3;b++)if(gl[r]&(4>>b)){const x=nx+i*4+b,y=ny+r,q=G.get(x+','+y);if(q==='J'||q==='j'||q==='N')put(x-x0+1,y-y0+1,nc)}}}}
  g.putImageData(id,0,0);
  e={cv,ax:F.ax-x0+1,ay:F.ay-y0+1,ball:F.ball?[F.ball[0]-x0+1,F.ball[1]-y0+1]:null,w,h};PXC.set(key,e);PXC_N++;return e;
}
const PX_PAL=new Map();
/* palette for a team (cached on the resolved uniform) */
function pxTeamPal(team){const U=uniColorsC(team),k=team.id+'|'+[U.h,U.hs,U.hc,U.dc,U.m,U.j,U.n,U.sl,U.sc,U.p,U.ps,U.pc,U.k].join(',');let e=PX_PAL.get(team);if(e&&e.k===k)return e;e={k,pal:pxPal(team,U),pk:'t'+team.id+'.'+(PX_PAL.size+1)+'.'+k.length};PX_PAL.set(team,e);return e}
