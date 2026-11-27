/* =========================================================
   08t · 3D broadcast style, part 1c: stadium models v3 (schema v3, kept in KV by 02c, t.std.mk names it)
   s3NormM turns a model into the generator's terms: the four compass sides become F (the press side, across from the TV
   camera), N, L and R (the ends as seen from the camera, like v:2), each with its real tier list (rows, rake, the band
   before it, the overhang), suite levels, a canopy, a board and a type (stand, open, hill, building, plaza); corners
   full / lower / none; the plan (oval, rect, rounded); lights, roof, the facade style and colours, seat colours and
   pattern, the field, a track, surroundings and landmarks. s3Plan3 lays out the inner edge, lofts one section per side
   (s3Prof3: same 16 points as v:2, so corners still blend side into end) and scales every tier's rows by one factor so
   the seat estimate lands on the capacity. The rest (facade and seat canvases, boards, ground, water, campus, landmarks)
   is built here into the accumulators of s3Build (08t-stadium3d), which keeps the draw calls of v:2 plus the facade.
   ========================================================= */
const S3CW={N:'E',E:'S',S:'W',W:'N'},S3CCW={N:'W',W:'S',S:'E',E:'N'},S3OPP={N:'S',S:'N',E:'W',W:'E'};
const s3Cor=(a,b)=>a==='N'||a==='S'?a+b:b+a;
const S3FAC=['brick-arches','brick','concrete','precast','glass','steel','stone','berm'];
const S3SUR=['campus','trees','river','lake','mountains','city','hills','parking','desert','ocean'];
const S3LM=['rotunda','tower','hedges','bridge','statues','arch','bell','skyline','hill-letter','boathouse'];
function s3NormM(m){if(!m||typeof m!=='object')return null;
  const hx=/^#[0-9a-f]{6}$/i,col=(c,d)=>typeof c==='string'&&hx.test(c)?c:d,num=(x,d,a,b)=>{const v=typeof x==='number'?x:typeof x==='string'&&x.trim()?+x:NaN;return isFinite(v)?clamp(v,a,b):d};
  const ax=m.axis==='EW'?'EW':'NS';let ps=m.pressSide;if(!['N','E','S','W'].includes(ps)||(ps==='E'||ps==='W')!==(ax==='NS'))ps=ax==='NS'?'W':'S';
  const map={F:ps,N:S3OPP[ps],L:S3CCW[ps],R:S3CW[ps]},ST=m.stands&&typeof m.stands==='object'?m.stands:{},sd={};
  for(const k of ['F','N','L','R']){const s=ST[map[k]]&&typeof ST[map[k]]==='object'?ST[map[k]]:{},side=k==='F'||k==='N';
    let T=(Array.isArray(s.tiers)?s.tiers:[]).filter(t=>t&&num(t.rows,0,0,300)>0).map(t=>({rows:num(t.rows,30,2,110),rake:num(t.rake,.5,.3,.85),gap:num(t.gap,-1,0,24),oh:num(t.overhang,0,0,30)}));
    while(T.length>3){const b=T.pop(),a=T[T.length-1];a.rake=(a.rake*a.rows+b.rake*b.rows)/(a.rows+b.rows);a.rows+=b.rows}
    let type=['stand','open','hill','building','plaza'].includes(s.type)?s.type:T.length||side?'stand':'open';
    if(side&&(type==='building'||type==='plaza'))type=T.length?'stand':'open';
    if(type==='stand'&&!T.length)T=[{rows:side?40:24,rake:.5,gap:-1,oh:0}];
    const su=[0,0,0,0];for(const x of Array.isArray(s.suites)?s.suites:[]){const a=num(x&&x.afterTier,0,0,9)|0;if(a>=1&&T.length)su[Math.min(a,T.length)]=num(x.levels,1,1,6)|0}
    const b=s.board&&typeof s.board==='object'&&num(s.board.w,0,0,200)>0?{w:num(s.board.w,30,8,90),h:num(s.board.h,0,0,45)}:null;if(b&&b.h<3)b.h=b.w*.45;
    sd[k]={k,c:map[k],type,T:type==='stand'||type==='building'?T:[],su,press:k==='F'&&s.pressBox!==false,canopy:!!s.canopy,ht:num(s.height,0,0,70),bd:b}}
  const C=m.corners&&typeof m.corners==='object'?m.corners:{},cor={};
  for(const [k,a,b] of [['FL','F','L'],['FR','F','R'],['NL','N','L'],['NR','N','R']]){let v=C[s3Cor(map[a],map[b])];
    if(!['full','lower','none'].includes(v))v=sd[a].type==='stand'&&sd[b].type==='stand'?'full':'none';if(sd[a].type!=='stand')v='none';cor[k]=v}
  const ex=m.exterior||{},se=m.seats||{},fe=m.field||{},arr=(x,ok)=>Array.isArray(x)?[...new Set(x.filter(v=>ok.includes(v)))]:[];
  const roof=['open','canopy','dome','retractable'].includes(m.roof)?m.roof:'open';
  if(roof==='canopy'&&!Object.values(sd).some(s=>s.canopy))for(const k of ['F','N'])if(sd[k].type==='stand')sd[k].canopy=true;
  const st4=['F','N','L','R'].filter(k=>sd[k].type==='stand'),sunk=st4.length===4&&st4.every(k=>sd[k].T.length===1)&&Math.max(...st4.map(k=>sd[k].T[0].rows))>=85&&Object.values(cor).every(v=>v==='full');
  return {ps,map,sd,cor,berm:ex.style==='berm'?.14:sunk?.4:0,plan:['oval','rect','rounded'].includes(m.plan)?m.plan:'rounded',rib:num(m.ribbons,1,0,2)|0,
    lights:['towers','rim','canopy','poles','dome'].includes(m.lights)?m.lights:'',roof,
    ext:{st:S3FAC.includes(ex.style)?ex.style:'concrete',c:col(ex.color,'#a4a7ab'),t:col(ex.trim,'#e6e4de')},
    seats:{c:(Array.isArray(se.colors)?se.colors:[]).filter(c=>typeof c==='string'&&hx.test(c)).slice(0,4),p:['solid','stripes','sections','checker','letters'].includes(se.pattern)?se.pattern:'solid',
      l:String(se.letters||'').toUpperCase().replace(/[^A-Z0-9 &'.!-]/g,'').trim().slice(0,18)},
    field:{gr:fe.surface==='grass'?1:fe.surface==='turf'?0:-1,c:col(fe.color,''),ez:['name','checker','diagonal','solid'].includes(fe.endzones)?fe.endzones:'name',ezc:col(fe.ezColor,'')},
    track:!!m.track,sur:arr(m.surround,S3SUR),lm:arr(m.landmarks,S3LM),approx:!!m.approx}}
/* v:2 end codes for the code paths shared with v:2 (students, pyro, the tower) */
function s3Code3(s){if(s.type==='hill')return 'B';if(s.type==='building')return 'X';if(s.type!=='stand')return 'O';const r=s.T.reduce((a,t)=>a+t.rows,0);return r>=45?'L':r>=20?'M':'S'}
/* ---------- the section of one side: v:2's 16 points from the real tiers (lo: the first tier only) ---------- */
function s3Prof3(s,f,lo,berm){/* berm: 0, or the share of the height that stays a wall above the earth */const T=s.T,P=[[0,0],[0,2.2],[1.2,2.2]];let d=1.2,h=2.2;const R=[0,0,0],nt=lo?Math.min(1,T.length):T.length;
  for(let k=0;k<3;k++){const t=k<nt?T[k]:null,nr=t?t.rows*f:0;
    if(k>0){if(nr>0){const su=s.su[k],gH=su?Math.max(t.gap>0?t.gap:0,su*4.2):t.gap>=0?Math.max(1,t.gap):2.6,oh=Math.min(t.oh,R[k-1]*S3RD*.7);
        P.push([d,h+gH],[d-oh,h+gH]);d-=oh;h+=gH;P.push([d,h+1.2]);h+=1.2}else P.push([d,h],[d,h],[d,h])}
    if(nr>0){d+=nr*S3RD;h+=nr*S3RD*t.rake}P.push([d,h]);R[k]=nr}
  const top=lo?0:s.su[nt]||0,bh=top?top*4.2:2.4;P.push([d,h+bh]);h+=bh;P.push([d+1.6,h]);d+=1.6;
  /* a berm: a short wall in the facade under the rim, then the earth slopes down to the ground */
  if(berm){const hw=h*(1-berm);P.push([d+.5,hw]);P.push([d+.5+hw*1.1,0]);d+=.5+hw*1.1}else{P.push([d,h*.42]);P.push([d,0])}
  return {P,R,D:d,H:h}}
function s3Segs3(s,cl,M,lo){const g=k=>s.su[k]?['glass',null,S3IN]:['st',cl.band,S3IN],rb=i=>M.rib>=i?['rib',null,S3IN]:['st',cl.fas,S3IN],berm=M.berm>0;
  const top=!lo&&s.su[s.T.length]?['glass',null,S3IN]:['st',cl.dark,S3IN],fa=['fac',null,S3OUT];
  return [['rib',null,S3IN],['st',cl.conc,S3UP],['seat',0,S3IU],g(1),['st',cl.under,S3DN],rb(1),['seat',1,S3IU],g(2),['st',cl.under,S3DN],rb(2),['seat',2,S3IU],top,['st',cl.trim,S3UP],fa,berm?['st',cl.berm,[-1,1]]:fa]}
/* ---------- the plan ---------- */
function s3Plan3(n){const M=n.m,S=M.sd,cap=n.cap,cz=CEN,stand=k=>S[k].type==='stand',trk=M.track,berm=M.berm;
  let hz=CEN+(cap<25000?10.5:cap<50000?12:13.5);const e0=k=>S[k].type==='open'?14:S[k].type==='plaza'?12:S[k].type==='hill'?11:cap<25000?9:10.5;
  let xL=60+e0('L'),xR=60+e0('R');if(trk){hz=Math.max(hz,CEN+25);xL=Math.max(xL,97);xR=Math.max(xR,97)}
  const aL=60-xL,aR=60+xR,zF=cz-hz,zN=cz+hz,R0=trk||M.plan==='oval'?hz*.94:M.plan==='rect'?6:cap<40000?12:cap<70000?16:20,r={};
  for(const k of ['FL','FR','NL','NR'])r[k]=M.cor[k]==='none'?0:R0;
  const hw=e=>stand(e)?32:34,ez=(e,f,nn)=>[r[f]?zF+r[f]:cz-hw(e),r[nn]?zN-r[nn]:cz+hw(e)];
  const [lz0,lz1]=ez('L','FL','NL'),[rz0,rz1]=ez('R','FR','NR'),sx0=k=>r[k]?aL+r[k]:aL+3,sx1=k=>r[k]?aR-r[k]:aR-3;
  const profs=f=>{const o={};for(const k of ['F','N','L','R'])if(stand(k)){o[k]=s3Prof3(S[k],f,0,berm);o[k+'lo']=s3Prof3(S[k],f,1,berm);o[k+'tp']=s3Prof3(S[k],f*.5,1,berm)}return o};
  /* each corner: the profiles at its two ends (side first, then end) */
  const pair=(c,sk,ek,pf)=>{const v=M.cor[c];if(v==='none'||!pf[sk])return null;const A=v==='full'?pf[sk]:pf[sk+'lo'],B=stand(ek)?(v==='full'?pf[ek]:pf[ek+'lo']):pf[sk+'tp'];return [A,B]};
  const rows=p=>p?p.R[0]+p.R[1]+p.R[2]:0;
  const est=f=>{const pf=profs(f);let s=0;if(pf.F)s+=(sx1('FR')-sx0('FL'))*rows(pf.F);if(pf.N)s+=(sx1('NR')-sx0('NL'))*rows(pf.N);if(pf.L)s+=(lz1-lz0)*rows(pf.L);if(pf.R)s+=(rz1-rz0)*rows(pf.R);
    for(const [c,sk,ek] of [['FL','F','L'],['FR','F','R'],['NL','N','L'],['NR','N','R']]){const q=pair(c,sk,ek,pf);if(q)s+=(r[c]+(q[0].D+q[1].D)/4)*Math.PI/2*(rows(q[0])+rows(q[1]))/2}
    for(const e of ['L','R'])if(S[e].type==='hill')s+=(e==='L'?lz1-lz0:rz1-rz0)*14;return s/.55*.92};
  let f=1;for(let i=0;i<6;i++)f=clamp(f*cap/Math.max(1,est(f)),.45,2.2);
  const pf=profs(f),pr={FL:pair('FL','F','L',pf),FR:pair('FR','F','R',pf),NL:pair('NL','N','L',pf),NR:pair('NR','N','R',pf)};
  const nil=s3Prof3({T:[],su:[0,0,0,0]},1,1,false);pf.F=pf.F||nil;pf.N=pf.N||nil;
  return {n,hz,xL,xR,aL,aR,zF,zN,r,pf,pr,Rs:f,seats:Math.round(est(f)),lz:[lz0,lz1],rz:[rz0,rz1],fx:[sx0('FL'),sx1('FR')],nx:[sx0('NL'),sx1('NR')]}}
/* ---------- canvases: the facade (one 18 × 12 yd tile: three bays, two storeys), seats (eight rows) and letters ---------- */
const S3FT={w:18,h:12};
function s3FacCv(M){const W=512,H=256,cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d'),e=M.ext,st=e.st,c=e.c,t=e.t,r=t3Rng(st.length*31+parseInt(c.slice(1),16)%997),bw=W/3,sh=H/2;
  const dark='#1b1f25',glass='#33414f',rect=(x,y,w,h,f)=>{g.fillStyle=f;g.fillRect(x,y,w,h)};
  const arch=(cx,yb,w,h,f)=>{g.fillStyle=f;g.beginPath();g.moveTo(cx-w/2,yb);g.lineTo(cx-w/2,yb-h+w/2);g.arc(cx,yb-h+w/2,w/2,Math.PI,0);g.lineTo(cx+w/2,yb);g.closePath();g.fill()};
  /* brickwork from one small tile (a pattern fill), then a few darker and lighter bricks */
  const bricks=(base)=>{const tc=document.createElement('canvas');tc.width=28;tc.height=12;const q=tc.getContext('2d');q.fillStyle=base;q.fillRect(0,0,28,12);q.fillStyle='rgba(40,20,10,.1)';q.fillRect(1,1,13,5);q.fillStyle='rgba(255,240,220,.07)';q.fillRect(8,7,13,5);
    q.fillStyle='rgba(235,225,210,.24)';q.fillRect(0,0,28,1);q.fillRect(0,6,28,1);q.fillRect(0,0,1,6);q.fillRect(14,0,1,6);q.fillRect(7,6,1,6);q.fillRect(21,6,1,6);g.fillStyle=g.createPattern(tc,'repeat');g.fillRect(0,0,W,H);
    g.fillStyle='rgba(40,18,8,.12)';for(let i=0;i<90;i++)g.fillRect((r()*36|0)*14+((r()*2|0)*7),(r()*43|0)*6+1,12,4)};
  const noise=(n,a)=>{for(const f of ['rgba(255,255,255,','rgba(0,0,0,']){g.fillStyle=f+a+')';for(let i=0;i<n/2;i++)g.fillRect(r()*W|0,r()*H|0,2+r()*6|0,1+r()*3|0)}};
  if(st==='brick-arches'||st==='brick'||st==='berm'){bricks(c);
    for(let i=0;i<3;i++){const x0=i*bw,cx=x0+bw/2;rect(x0,0,7,H,shade(c,-.14));rect(x0+bw-7,0,7,H,shade(c,-.14));
      if(st==='brick-arches'){arch(cx,H-6,bw*.56+8,sh*.86+6,t);arch(cx,H-6,bw*.56,sh*.86,dark);arch(cx,sh-14,bw*.44+6,sh*.66+5,t);arch(cx,sh-14,bw*.44,sh*.66,glass);
        g.fillStyle='rgba(200,215,230,.25)';g.fillRect(cx-1,sh-14-sh*.66,2,sh*.66)}
      else{for(const s of [0,1])for(const dx of [-.22,.22]){const wx=cx+dx*bw-bw*.12,wy=s*sh+sh*.24;rect(wx-3,wy-6,bw*.24+6,6,t);rect(wx,wy,bw*.24,sh*.52,glass);g.fillStyle='rgba(210,225,240,.18)';g.fillRect(wx,wy,bw*.24,4)}}}
    rect(0,0,W,9,t);rect(0,sh-4,W,7,t);rect(0,H-6,W,6,shade(c,-.3))}
  else if(st==='stone'){rect(0,0,W,H,c);g.strokeStyle='rgba(60,50,40,.18)';g.lineWidth=1;for(let y=0;y<H;y+=16){g.beginPath();g.moveTo(0,y+.5);g.lineTo(W,y+.5);g.stroke();for(let x=(y/16%2)*20;x<W;x+=40){g.beginPath();g.moveTo(x+.5,y);g.lineTo(x+.5,y+16);g.stroke()}}
    noise(500,.06);for(let i=0;i<3;i++){const cx=i*bw+bw/2;rect(i*bw,0,10,H,shade(c,.06));arch(cx,H-8,bw*.42,sh*.8,dark);arch(cx,sh-10,bw*.36,sh*.7,glass)}rect(0,0,W,12,t);rect(0,sh-5,W,8,t)}
  else if(st==='glass'){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,shade(c,.25));gr.addColorStop(.55,c);gr.addColorStop(1,shade(c,-.35));rect(0,0,W,H,gr);
    for(let i=0;i<14;i++){g.fillStyle=`rgba(255,255,255,${(.03+r()*.08).toFixed(3)})`;g.fillRect(r()*W,0,10+r()*40,H)}
    g.fillStyle=t;for(let x=0;x<W;x+=W/12)g.fillRect(x,0,3,H);for(let y=0;y<H;y+=H/4)g.fillRect(0,y,W,y%sh?3:9)}
  else if(st==='steel'){/* the exposed frame: raker beams under the seats, columns, floor slabs, ramps and bracing */
    const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,shade(c,-.42));gr.addColorStop(1,shade(c,-.25));rect(0,0,W,H,gr);g.lineCap='butt';
    for(let i=0;i<3;i++){const x0=i*bw;g.strokeStyle=shade(c,-.05);g.lineWidth=18;g.beginPath();g.moveTo(x0,H);g.lineTo(x0+bw,0);g.stroke();
      g.strokeStyle=shade(c,.1);g.lineWidth=4;g.beginPath();g.moveTo(x0+16,sh+10);g.lineTo(x0+bw,H-6);g.moveTo(x0+bw,sh+10);g.lineTo(x0+16,H-6);g.stroke();rect(x0,0,16,H,c)}
    rect(0,sh-6,W,12,shade(c,.12));rect(0,H-8,W,8,shade(c,.05));rect(0,0,W,7,t)}
  else{/* concrete, precast (and the berm's retaining band) */const pc=st==='precast';rect(0,0,W,H,c);noise(900,.05);
    if(pc){g.fillStyle='rgba(0,0,0,.13)';for(let x=0;x<W;x+=W/6)g.fillRect(x,0,3,H);for(const s of [0,1]){rect(0,s*sh+sh*.3,W,sh*.26,'#2b333c');g.fillStyle='rgba(190,205,220,.22)';g.fillRect(0,s*sh+sh*.3,W,5)}rect(0,0,W,10,t);rect(0,sh-3,W,6,t)}
    else{for(let i=0;i<3;i++){rect(i*bw,0,14,H,shade(c,-.1));for(const s of [0,1])rect(i*bw+30,s*sh+sh*.36,bw-60,sh*.2,'#22272e')}rect(0,0,W,8,shade(c,.08));rect(0,sh-3,W,6,shade(c,-.15))}}
  return cv}
function s3SeatCv3(M,h){const cv=document.createElement('canvas');cv.width=128;cv.height=128;const g=cv.getContext('2d'),p=M.seats.p;
  let C=M.seats.c.slice();if(!C.length)C=[h.c1];if(C.length<2)C.push(p==='solid'||p==='letters'?C[0]:shade(C[0],lum(C[0])>.5?-.35:.4));
  for(let row=0;row<8;row++)for(let half=0;half<2;half++){const i=p==='sections'?half:p==='stripes'?(row>>2):p==='checker'?(half+(row>>2))%2:0;g.fillStyle=C[i%C.length];g.fillRect(half*64,row*16,64,16)}
  for(let row=0;row<8;row++){const y=row*16;g.fillStyle='rgba(255,255,255,.16)';g.fillRect(0,y+1,128,2);g.fillStyle='rgba(10,12,16,.5)';g.fillRect(0,y+10,128,6)}
  g.fillStyle='rgba(20,22,26,.8)';g.fillRect(0,0,3,128);g.fillRect(64,0,3,128);return cv}
/* letters spelled in the seats of one deck: the canvas (rows × columns of seats) and the mask the crowd reads */
function s3Letters(M,h,cols,rows){const cv=document.createElement('canvas'),W=Math.max(64,Math.min(1024,Math.round(cols))),Hh=Math.max(4,Math.round(rows));cv.width=W;cv.height=Hh*4;
  const g=cv.getContext('2d'),C=M.seats.c.length?M.seats.c:[h.c1,'#ffffff'],c0=C[0],c1=C[1]||(lum(c0)>.5?'#1a1a1a':'#f4f4f4');
  const mk=document.createElement('canvas');mk.width=W;mk.height=Hh;const q=mk.getContext('2d');q.fillStyle='#000';q.fillRect(0,0,W,Hh);q.fillStyle='#fff';
  const txt=M.seats.l,fs=Hh*.82;q.font=`700 ${fs}px "League Gothic",Impact,sans-serif`;q.textAlign='center';q.textBaseline='middle';const tw=q.measureText(txt).width||1;
  q.save();q.translate(W/2,Hh/2);q.scale(Math.min(W*.86/tw,2.4),1);q.fillText(txt,0,fs*.04);q.restore();
  const md=q.getImageData(0,0,W,Hh).data,mask=new Uint8Array(W*Hh);for(let i=0;i<W*Hh;i++)mask[i]=md[i*4]>110?1:0;
  /* canvas row 0 is the back row (v = 1 at the top) */
  for(let y=0;y<Hh;y++)for(let x=0;x<W;){const on=mask[y*W+x];let x1=x;while(x1<W&&mask[y*W+x1]===on)x1++;g.fillStyle=on?c1:c0;g.fillRect(x,y*4,x1-x,4);x=x1}
  g.fillStyle='rgba(255,255,255,.14)';for(let y=0;y<Hh;y++)g.fillRect(0,y*4,W,1);g.fillStyle='rgba(10,12,16,.4)';for(let y=0;y<Hh;y++)g.fillRect(0,y*4+3,W,1);
  return {cv,c0:t3Col(c0),c1:t3Col(c1),at:(u,row,nr)=>{const x=Math.min(W-1,Math.max(0,u*W|0)),y=Math.min(Hh-1,Math.max(0,Hh-1-Math.floor(row/Math.max(1,nr)*Hh)));return mask[y*W+x]}}}
/* ---------- the pieces: sides, corners (full / lower), ends of every type ---------- */
function s3Pieces3(X){const {B,P,n,cl,add,lerpP,endInfo}=X,M=n.m,S=M.sd,pf=P.pf,pr=P.pr,{aL,aR,zF,zN,r:rc}=P,cz=CEN,PI=Math.PI,co=M.cor,st=k=>S[k].type==='stand';
  const sg=k=>X.segs[k]||(X.segs[k]=s3Segs3(S[k[0]],cl,M,k.length>1)),cs=(c,s)=>co[c]==='full'?sg(s):sg(s+'lo');
  /* the letters deck: the side across from the press box (where real schools spell them, facing the main camera) */
  const ls=M.seats.p==='letters'&&M.seats.l?(st('N')?'N':st('F')?'F':''):'';
  for(const k of ['F','N']){const pc=k==='F'?s3Line(P.fx[0],zF,P.fx[1],zF,0,-1):s3Line(P.nx[1],zN,P.nx[0],zN,0,1),ca=k==='F'?co.FL!=='full':co.NR!=='full',cb=k==='F'?co.FR!=='full':co.NL!=='full';
    if(st(k)){let segs=sg(k);if(ls===k){const R=pf[k].R,dk=R.indexOf(Math.max(...R)),si=2+4*dk,dm=(pf[k].P[si][0]+pf[k].P[si+1][0])/2;segs=segs.slice();segs[si]=['seatL',dk,S3IU];
        X.lt=Object.assign(s3Letters(M,X.h,pc.L(dm)/.55/2,R[dk]),{id:k,k:dk,rec:[]})}add(k,pc,()=>pf[k],segs,ca,cb)}
    else s3Low3(X,k,pc,S[k])}
  const capEnd=e=>!st(e);
  if(pr.FR)add('FR',s3Arc(aR-rc.FR,zF+rc.FR,rc.FR,-PI/2,0),lerpP(pr.FR[0],pr.FR[1]),cs('FR','F'),0,capEnd('R'));
  if(pr.NR)add('NR',s3Arc(aR-rc.NR,zN-rc.NR,rc.NR,0,PI/2),lerpP(pr.NR[1],pr.NR[0]),cs('NR','N'),capEnd('R'),0);
  if(pr.NL)add('NL',s3Arc(aL+rc.NL,zN-rc.NL,rc.NL,PI/2,PI),lerpP(pr.NL[0],pr.NL[1]),cs('NL','N'),0,capEnd('L'));
  if(pr.FL)add('FL',s3Arc(aL+rc.FL,zF+rc.FL,rc.FL,PI,PI*1.5),lerpP(pr.FL[1],pr.FL[0]),cs('FL','F'),capEnd('L'),0);
  for(const e of ['L','R']){const s=e==='L'?-1:1,x=e==='L'?aL:aR,[z0,z1]=e==='L'?P.lz:P.rz,pc=e==='L'?s3Line(x,z1,x,z0,-1,0):s3Line(x,z0,x,z1,1,0),E=S[e],
      ca=e==='L'?co.NL!=='full':co.FR!=='full',cb=e==='L'?co.FL!=='full':co.NR!=='full';endInfo[e]={x,s,c:n[e],D:1,H:1.4,z0,z1,type:E.type};
    if(E.type==='stand'){if(Math.abs(z1-z0)>.4)add(e,pc,()=>pf[e],sg(e),ca,cb);endInfo[e].D=pf[e].D;endInfo[e].H=pf[e].H}
    else if(E.type==='building'){/* a facility: its rows in front (if any), then the building with a glass face and the facade round the back */
      const rows=E.T.length?E.T[0].rows*Math.min(1.2,P.Rs):6,lp=s3Prof3({T:[{rows,rake:E.T.length?E.T[0].rake:.45,gap:-1,oh:0}],su:[0,0,0,0]},1,1,false),wz=Math.abs(z1-z0)+6,bh=E.ht||(n.cap>=60000?24:16),bd=Math.max(14,bh*.7);
      add(e,pc,()=>lp,sg('F').map((q,i)=>i>=11?(i===11?['st',cl.dark,S3IN]:i===12?q:['st',cl.fac,S3OUT]):q),1,1);
      const bx=x+s*(lp.D+bd/2+.5);s3Geo(B.fac,new THREE.BoxGeometry(bd,bh,wz),t3M(bx,bh/2,cz),B.white,wz/S3FT.w,bh/S3FT.h);s3Geo(B.st,new THREE.BoxGeometry(bd+1.4,1,wz+1.4),t3M(bx,bh+.5,cz),cl.trim);
      const gx=x+s*(lp.D+.45);s3Geo(B.glass,new THREE.PlaneGeometry(wz-2,bh-4),t3M(gx,bh/2+1,cz,0,-s*PI/2,0),B.white,(wz-2)/8,Math.max(1,Math.round((bh-4)/4.2)));endInfo[e].D=lp.D+bd+1;endInfo[e].H=bh}
    else s3Low3(X,e,pc,E,endInfo[e])}}
/* an end (or side) without a stand: open (the wall), hill (a grass berm fans sit on), plaza (a raised concourse) */
function s3Low3(X,id,pc,E,info){const {B,cl,fan,r}=X,ht=E.ht;
  if(E.type==='hill'){const k=clamp((ht||10)/10.2,.5,2.2),kd=Math.max(1,k*.9),hp={P:[[0,0],[0,1.1],[1.2,1.1],[27*kd,9.5*k],[32*kd,10.2*k],[42*kd,0]],R:[0,0,0]};
    s3Loft(B,pc,()=>hp,[['rib',null,S3IN],['st',cl.conc,S3UP],['st',cl.grass,S3IU],['st',cl.grass,S3UP],['st',t3Col('#3f6f31'),[-1,1]]],1,1,cl.grass);if(info){info.D=42*kd;info.H=10.2*k}
    const L=pc.L(0);for(let d=3;d<26*kd;d+=1.5)for(let j=0;j<L/1.15;j++){if(r()>.5)continue;const u=(j+r())/(L/1.15),q=pc.at(Math.min(1,u),d),hh=1.1+(d-1.2)/(27*kd-1.2)*8.4*k;fan(q[0],hh-.25,q[1],Math.atan2(q[2],-q[3]),0,id,0,0,u)}}
  else if(E.type==='plaza'){const y=clamp(ht||3,1.5,8),pp={P:[[0,0],[0,1.4],[.6,1.4],[.6,y],[16,y],[16,y+1.1],[16.4,y+1.1],[16.4,0]],R:[0,0,0]};
    s3Loft(B,pc,()=>pp,[['rib',null,S3IN],['st',cl.conc,S3UP],['st',cl.dark,S3IN],['st',cl.conc,S3UP],['st',cl.trim,S3IN],['st',cl.trim,S3UP],['fac',null,S3OUT]],1,1,cl.fac);if(info){info.D=16.4;info.H=y+1.1}
    const L=pc.L(0);for(let j=0;j<L*1.1;j++){const u=r(),d=2+r()*13,q=pc.at(u,d);fan(q[0],y,q[1],Math.atan2(q[2],-q[3])+(r()-.5),0,id,0,0,u)}}
  else{const wp={P:[[0,0],[0,1.4],[.6,1.4],[.6,0]],R:[0,0,0]};s3Loft(B,pc,()=>wp,[['rib',null,S3IN],['st',cl.conc,S3UP],['st',cl.dark,S3OUT]],1,1,cl.dark)}}
/* ---------- video boards: on or above each stand that has one (any number), the frames and legs into the structure ---------- */
function s3Boards3(X){const {B,n,P,endInfo,cl,pb}=X,S=n.m.sd,cz=CEN,PI=Math.PI,out=[];
  for(const k of ['L','R','N','F']){const b=S[k].bd;if(!b)continue;const bw=b.w,bh=b.h;let x,y,z,ry,legs=0;
    if(k==='L'||k==='R'){const E=endInfo[k],sx=E.s,free=E.type!=='stand';x=E.x+sx*(free?(E.type==='open'?9:E.D+3):E.D+1.5);y=(free?(E.type==='building'?E.H+2:E.type==='hill'?E.H+3:7):E.H+1)+bh/2;z=cz;ry=-sx*PI/2;legs=free&&E.type!=='building'?1:2}
    else if(k==='N'){const p=P.pf.N;x=60;z=P.zN+p.D+1.5;y=p.H+1+bh/2;ry=PI;legs=2}
    else{const p=P.pf.F;x=60;z=P.zF-p.D-1.5;y=Math.max(p.H,pb?pb.top:0)+2+bh/2;ry=0;legs=2}
    const fx=Math.sin(ry),fz=Math.cos(ry);s3Geo(B.board,new THREE.PlaneGeometry(bw,bh),t3M(x,y,z,0,ry,0),B.white);
    s3Geo(B.st,new THREE.BoxGeometry(bw+2,bh+2,1.4),t3M(x-fx*.8,y,z-fz*.8,0,ry,0),t3Col('#1b1f26'));
    const y0=legs===1?0:y-bh/2-7;for(const dd of [-bw*.3,bw*.3])s3Geo(B.st,new THREE.BoxGeometry(1.2,y-bh/2-y0,1.2),t3M(x-fx*1.6+Math.cos(ry)*dd,(y-bh/2+y0)/2,z-fz*1.6-Math.sin(ry)*dd),cl.pole);
    out.push(y+bh/2)}
  return out}
/* ---------- the ground round the stadium, surroundings and landmarks ---------- */
function s3Ground3(X){const {B,n,ext,r,endInfo,grp,keep,mats}=X,M=n.m,A=B.st,cz=CEN,PI=Math.PI,has=k=>M.sur.includes(k),lm=k=>M.lm.includes(k),des=has('desert');
  const cols=des?[t3Col('#9b968c'),t3Col('#b59c74'),t3Col('#a68b62')]:[t3Col('#7f838a'),t3Col('#55823f'),t3Col('#4a7139')];
  const f=th=>{const c=Math.cos(th),s=Math.sin(th);return Math.pow(Math.pow(Math.abs(c)/(ext.x+14),4)+Math.pow(Math.abs(s)/(ext.z+14),4),-.25)};
  for(let i=0;i<64;i++){const t0=i/64*PI*2,t1=(i+1)/64*PI*2;for(let j=0;j<3;j++){const p=(t,k)=>{const rr=k===0?0:k===1?f(t):k===2?f(t)*1.35:900;return [60+Math.cos(t)*rr,-.04,cz+Math.sin(t)*rr]};s3Quad(A,p(t0,j),p(t1,j),p(t1,j+1),p(t0,j+1),cols[j],null,null,null,null,[0,1,0])}}
  /* which way the water lies: an open end, else the smaller end */
  /* the landmark end: across from a single board end, else an open / hill / plaza end, else the smaller end */
  const S=M.sd,low=e=>['open','hill','plaza'].includes(S[e].type),bd=S.L.bd&&!S.R.bd?'L':S.R.bd&&!S.L.bd?'R':'',small=bd?(bd==='L'?'R':'L'):low('L')?'L':low('R')?'R':endInfo.L.H<=endInfo.R.H?'L':'R';
  const wEnd=S.L.type==='open'?'L':S.R.type==='open'?'R':small,wd=wEnd==='L'?-1:1,wat=has('lake')||has('ocean'),riv=has('river');
  const free=(x,z)=>!(wat&&(x-60)*wd>ext.x+20)&&!(riv&&z<cz-ext.z-62&&z>cz-ext.z-135);
  /* parking: lots with cars */
  let cars=0;const lots=(has('parking')?9:3)+(r()*3|0),carC=['#d9d9d9','#2b2f36','#7d828a','#9b1c1c','#1f3b70','#efefef','#4a4f57'].map(t3Col);
  for(let i=0;i<lots;i++){const th=r()*PI*2,d=f(th)*1.5+28+r()*70,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d;if(!free(x,z))continue;const lw=46+r()*40,ld=28+r()*20;
    s3Box(A,x,-.01,z,lw,.05,ld,-th,t3Col('#4f5359'),1);
    if(has('parking')&&cars<420){const c=Math.cos(-th),s=Math.sin(-th);for(let a=-lw/2+2;a<lw/2-2;a+=2.6)for(const b of [-ld/2+3,-ld/2+6,ld/2-6,ld/2-3])if(r()<.7){cars++;s3Box(A,x+a*c+b*s,.6,z-a*s+b*c,1.9,.8,1.1,-th,carC[r()*carC.length|0],1)}}}
  /* campus: low buildings in brick and limestone with window bands */
  if(has('campus')){const bc=['#8a4a35','#9b5a40','#c9bea6','#b9a98a','#7a3f30','#d4cdbd'].map(t3Col),roofC=t3Col('#4b4f55'),win=t3Col('#2a3038');
    for(let i=0;i<22;i++){const th=r()*PI*2,d=f(th)*1.45+22+r()*90,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d;if(!free(x,z))continue;const w=22+r()*30,dp=14+r()*14,hh=8+r()*10,ry=-th+(r()<.5?0:PI/2);
      s3Box(A,x,hh/2,z,w,hh,dp,ry,bc[r()*bc.length|0]);s3Box(A,x,hh+.4,z,w+.8,.8,dp+.8,ry,roofC);
      for(let fl=1;fl<hh/4;fl++)s3Box(A,x,fl*4-1.6,z,w+.2,1.4,dp+.2,ry,win,2)}}
  /* trees (desert: low scrub) */
  const ntr=des?40:has('trees')?120:has('campus')?70:45,tA=t3Col(des?'#6f7a4a':'#2f5a2a'),tB=t3Col(des?'#857f52':'#3b6a30');
  for(let i=0;i<ntr;i++){const th=r()*PI*2,d=f(th)*(1.38+r()*(has('trees')?1.7:2.6))+12,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d;if(!free(x,z))continue;const tr=des?1+r()*1.4:2.5+r()*3.5;s3Geo(A,s3Tpl('ico'),s3MS(x,tr*1.1,z,tr,tr*(des?.7:1.15),tr,r()*6),r()<.5?tA:tB)}
  /* a city: towers behind the far side */
  if(has('city')||lm('skyline'))for(let i=0;i<40;i++){const th=-PI/2+(r()-.5)*1.2,d=240+r()*190,x=60+Math.cos(th)*d,z=cz+Math.sin(th)*d,bh=24+r()*r()*120,bw=10+r()*18;s3Geo(B.glass,s3Tpl('box'),s3MS(x,bh/2,z,bw,bh,bw,r()*PI),B.white,bw/6,bh/5)}
  /* water: a lake or the ocean past one end, a river behind the far side */
  if(wat||riv){const wm=keep(new THREE.MeshStandardMaterial({color:'#2c5872',roughness:.16,metalness:.25}));mats.water=wm;const W=s3Acc(false),wc=t3Col('#ffffff');
    if(wat){const big=has('ocean')?3000:900,x0=60+wd*(ext.x+26),x1=x0+wd*big;s3Quad(W,[x0,-.02,cz-big*.7],[x1,-.02,cz-big*.7],[x1,-.02,cz+big*.7],[x0,-.02,cz+big*.7],wc,null,null,null,null,[0,1,0])}
    if(riv){const z0=cz-ext.z-70,z1=z0-55;s3Quad(W,[-700,-.02,z0],[820,-.02,z0],[820,-.02,z1],[-700,-.02,z1],wc,null,null,null,null,[0,1,0])}
    const wmesh=s3Mesh(W,wm);if(wmesh){keep(wmesh.geometry);grp.add(wmesh)}}
  /* landmarks */
  const E=endInfo[small],stone=t3Col('#ddd3bd'),bronze=t3Col('#5a4a2e');
  if(lm('rotunda')){const far=low(small),x=far?60+E.s*(ext.x+70):E.x+E.s*(E.D+15),z=far?cz+48:cz;s3Geo(A,new THREE.CylinderGeometry(15,15,18,20),t3M(x,9,z),stone);s3Geo(A,new THREE.SphereGeometry(15.5,20,8,0,PI*2,0,PI/2),t3M(x,18,z),t3Col('#e9e6dd'));
    s3Geo(A,new THREE.BoxGeometry(12,2,26),t3M(x-E.s*15,15,z),stone);for(let i=0;i<6;i++)s3Geo(A,s3Tpl('cyl'),s3MS(x-E.s*19,7,z-10+i*4,.8,14,.8),t3Col('#f4f1e8'));s3Geo(A,new THREE.ConeGeometry(14,4,4),t3M(x-E.s*15,17.6,z,0,PI/4,0),stone)}
  if(lm('bridge')){/* a bridge across the smaller end, just behind its top rows, fans along the rail */const y=Math.max(8,E.H*.7),bx=E.x+E.s*(E.D+7);s3Geo(A,new THREE.BoxGeometry(9,1.6,180),t3M(bx,y,cz),t3Col('#b8b2a5'));
    for(const dz of [-80,-40,0,40,80])s3Geo(A,new THREE.BoxGeometry(5,y,4),t3M(bx,y/2,cz+dz),t3Col('#a49e92'));for(const s of [-1,1])s3Geo(A,new THREE.BoxGeometry(.4,1.1,180),t3M(bx+s*4.3,y+1.3,cz),t3Col('#6b6f75'));
    for(let i=0;i<220;i++){const z=cz-88+r()*176;X.fan(bx+(r()-.5)*6,y+.8,z,E.s>0?-PI/2:PI/2,0,'B',0,0,0)}}
  if(lm('statues')){const zz=cz+ext.z+10;for(let i=0;i<8;i++){const x=60-42+i*12;s3Geo(A,new THREE.BoxGeometry(2.6,2.4,2.6),t3M(x,1.2,zz),stone);s3Geo(A,new THREE.CylinderGeometry(.45,.6,2.6,8),t3M(x,3.7,zz),bronze);s3Geo(A,new THREE.SphereGeometry(.42,8,6),t3M(x,5.3,zz),bronze)}}
  if(lm('bell')){const x=60-E.s*(ext.x-6),z=cz+ext.z+14;for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])s3Geo(A,s3Tpl('box'),s3MS(x+dx,4,z+dz,.7,8,.7),t3Col('#efeae0'));
    s3Geo(A,new THREE.ConeGeometry(4,3,4),t3M(x,9.4,z,0,PI/4,0),t3Col('#3d4a3f'));s3Geo(A,new THREE.CylinderGeometry(.9,1.7,2.4,10),t3M(x,6.2,z),t3Col('#a8873e'));s3Geo(A,new THREE.BoxGeometry(6,.8,6),t3M(x,.4,z),stone)}
  if(lm('boathouse')){const x=60+wd*(ext.x+22),z=cz+(riv&&!wat?-ext.z-64:30);s3Geo(B.fac,new THREE.BoxGeometry(14,9,34),t3M(x,4.5,z),B.white,2,.75);s3Geo(A,new THREE.ConeGeometry(25,7,4),t3M(x,12.5,z,0,PI/4,0).multiply(new THREE.Matrix4().makeScale(.42,1,1)),t3Col('#3f4a52'));
    for(let i=0;i<5;i++)s3Geo(A,s3Tpl('box'),s3MS(x+wd*(12+i*3.4),.15,z-10+i*5,1,.35,20,0),t3Col(i%2?'#e8e2d0':'#b33a2a'))}
  if(lm('arch')&&!n.has('arches')){const x=60+E.s*(ext.x+18);s3Geo(A,new THREE.TorusGeometry(10,1.6,6,14,PI),t3M(x,0,cz,0,PI/2,0),stone)}}
/* a box straight into an accumulator, no bottom (k 1: the top only, 2: the sides only), turned ry about y like three.js */
function s3Box(A,x,y,z,sx,sy,sz,ry,col,k){const c=Math.cos(ry||0),s=Math.sin(ry||0),hx=sx/2,hz=sz/2,y0=y-sy/2,y1=y+sy/2,q=[[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]].map(([a,b])=>[x+a*c+b*s,z-a*s+b*c]);
  if(k!==2)s3Quad(A,[q[0][0],y1,q[0][1]],[q[1][0],y1,q[1][1]],[q[2][0],y1,q[2][1]],[q[3][0],y1,q[3][1]],col,null,null,null,null,[0,1,0]);
  if(k!==1)for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];s3Quad(A,[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]],col,null,null,null,null,[(a[0]+b[0])/2-x,0,(a[1]+b[1])/2-z])}}
/* ---------- a running track round the field (and the grass inside it) ---------- */
function s3Track3(B){const A=B.st,cz=CEN,PI=Math.PI,red=t3Col('#a4523d'),wl=t3Col('#e9e2d6'),gr=t3Col('#3f7432'),S=46,N=24;
  const at=(t,rr)=>{/* t 0..1 round a stadium shape: straights x 60±S, half circles of radius rr */const L=4*S+2*PI*rr,s=t*L;
    if(s<2*S)return [60-S+s,cz-rr];if(s<2*S+PI*rr){const a=-PI/2+(s-2*S)/rr;return [60+S+Math.cos(a)*rr,cz+Math.sin(a)*rr]}if(s<4*S+PI*rr)return [60+S-(s-2*S-PI*rr),cz+rr];const a=PI/2+(s-4*S-PI*rr)/rr;return [60-S+Math.cos(a)*rr,cz+Math.sin(a)*rr]};
  const ring=(r0,r1,y,c,n)=>{for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,a=at(t0,r0),b=at(t1,r0),c2=at(t1,r1),d=at(t0,r1);s3Quad(A,[a[0],y,a[1]],[b[0],y,b[1]],[c2[0],y,c2[1]],[d[0],y,d[1]],c,null,null,null,null,[0,1,0])}};
  ring(0,40,-.03,gr,4*N);ring(40,50,.04,red,8*N);for(const rr of [42.5,45,47.5])ring(rr-.06,rr+.06,.05,wl,8*N)}
