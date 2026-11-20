/* =========================================================
   08p · Pixel style renderer (the default art style). Everything on the field is drawn at native art resolution into
   the low-res buffer `low` (08) and blown up nearest-neighbour by a whole number of device pixels (PDS: 6 on a 3×
   iPhone), so every art pixel is a crisp square. The camera is snapped to whole art pixels (PCX/PCY) and never zooms.
   Field + paint are cached in world space; the stands, crowd, benches, players, ball, overlays and weather are drawn
   per frame. Settings › Art style: Pixel (stored as 'retro') | Modern.
   ========================================================= */
function isPix(){return !LG||!LG.settings||LG.settings.style!=='modern'}
const PXR={fk:'',fcv:null,fx0:-14,fy0:-14,ck:'',crowd:null,wall:null,fx:[],lastPix:null,bench:null,benchK:''};
const PXU={navy:'#10182B',panel:'#1C2A45',text:'#F4F1E8',red:'#E8413A',green:'#3BD16F',los:'#4DA3FF',fd:'#FFD23F',line:'#F4F1E8'};
const pxH=h=>athHex(h);
const pxMix=(a,b,t)=>{const A=parseInt(pxH(a).slice(1),16),B=parseInt(pxH(b).slice(1),16),f=(x,y)=>Math.round(x+(y-x)*t);return '#'+((1<<24)+(f(A>>16,B>>16)<<16)+(f(A>>8&255,B>>8&255)<<8)+f(A&255,B&255)).toString(16).slice(1)};
const pxHash=(a,b)=>{let h=(a*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296};
/* ---------- palette by light ---------- */
function pxLight(){const st=typeof lightStage==='function'?lightStage():'day';return st}
function pxTurf(){const night=pxLight()==='night',tc=typeof turfColors==='function'?turfColors(false):['#3a8a3d','#2e7633'];
  /* brighten the stadium's turf into the bright pixel range, then two flat mowing tones */
  let a=pxMix(tc[0],'#5BC24F',.55),b=pxMix(tc[1],'#4AAE45',.55);const snow=typeof wxKind==='function'&&wxKind()==='snow';if(snow){a=pxMix(a,'#DCE6EC',.22);b=pxMix(b,'#DCE6EC',.22)}if(night){a=pxMix(a,'#16264A',.42);b=pxMix(b,'#16264A',.42)}
  return {a,b,apron:pxMix(b,'#14233A',.3),line:night?'#DCE3F0':PXU.line,lineD:night?'#AEB6C6':'#CFD3C8',night}}
/* ---------- world → art pixels (camera snapped to whole pixels) ---------- */
function pxCam(){PCX=Math.round(cam.x*A)-(LW>>1);PCY=Math.round(cam.y*A*VY)-Math.round(midY()/PXS)}
const pxX=x=>Math.round(x*A),pxY=y=>Math.round(y*A*VY);
/* ---------- field cache (turf, paint, end zones, numbers) ---------- */
function pxField(){
  const h=hostT(),wx=typeof wxKind==='function'?wxKind():'',T=pxTurf(),k=[h.id,h.c1,h.c2,h.abbr,A,T.a,T.b,wx,pxLight(),UNI_VER].join('|');if(PXR.fk===k&&PXR.fcv)return PXR.fcv;
  const x0=PXR.fx0,y0=PXR.fy0,w=pxX(134)-pxX(x0),hh=pxY(FW+14)-pxY(y0),cv=document.createElement('canvas');cv.width=w;cv.height=hh;const g=cv.getContext('2d');
  const X0=x=>pxX(x)-pxX(x0),Y0=y=>pxY(y)-pxY(y0),fr=(x,y,ww,hh2,c)=>{g.fillStyle=c;g.fillRect(x,y,ww,hh2)};
  fr(0,0,w,hh,T.apron);
  const t0=Y0(0),t1=Y0(FW);
  /* mowing stripes every 5 yards across the playing field and the end zones' apron */
  for(let i=-2;i<26;i++){const a=X0(i*5),b=X0(i*5+5);fr(a,Y0(-5),b-a,Y0(FW+5)-Y0(-5),i%2?T.b:T.a)}
  /* apron beyond the sidelines a touch darker (flat) */
  fr(0,0,w,t0-3,T.apron);fr(0,t1+3,w,hh-t1-3,T.apron);
  if(wx==='snow'){g.fillStyle='#F2F6FA';for(let y=0;y<hh;y++)for(let x=(y*7)%3;x<w;x+=3)if(pxHash(x,y)<.2)g.fillRect(x,y,pxHash(y,x)<.3?2:1,1)}
  /* end zones in the host's colours with the abbreviation in big pixel letters */
  const ec=pxH(h.c1),ed=pxShade(ec,-.18),ink=contrasty(h.c1,h.c2)?pxH(h.c2):inkOn(h.c1);
  for(const ex of [0,110]){const a=X0(ex),b=X0(ex+10);fr(a,t0,b-a,t1-t0,ec);
    for(let y=t0;y<t1;y++)for(let x=a+((y-t0)%6);x<b;x+=6)if(((x-a)+(y-t0))%6===0)fr(x,y,1,1,ed);   // fine diagonal weave
    const ab=String(h.abbr||'').toUpperCase().slice(0,4),n=ab.length,s=Math.max(2,Math.min(6,Math.floor((t1-t0-24)/(n*6)),Math.floor((b-a-16)/3)));
    {const fc=pxMix(ink,ec,.45);fr(a+4,t0+4,b-a-8,1,fc);fr(a+4,t1-5,b-a-8,1,fc);fr(a+4,t0+4,1,t1-t0-8,fc);fr(b-5,t0+4,1,t1-t0-8,fc)}
    const tx=Math.round((a+b)/2-1.5*s),ty=Math.round((t0+t1)/2-(n*6*s-s)/2);
    for(let i=0;i<n;i++){const ch=ex?ab[i]:ab[i];pxText(g,ch,tx+s,ty+i*6*s+s,s,pxShade(ec,-.4));pxText(g,ch,tx,ty+i*6*s,s,ink)}}
  /* yard lines, goal lines, end lines, sidelines */
  for(let x=0;x<=120;x+=5){const a=X0(x),wd=(x===10||x===110||x===0||x===120)?2:1;fr(a,t0,wd,t1-t0,T.line)}
  fr(X0(0),t0-2,X0(120)-X0(0)+2,3,T.line);fr(X0(0),t1,X0(120)-X0(0)+2,3,T.line);
  /* hash marks: every yard at both sidelines and both hashes */
  for(let x=11;x<110;x++){if(x%5===0)continue;const a=X0(x);for(const y of [1,HASH1,HASH2,FW-1])fr(a,Y0(y)-1,1,2,T.line)}
  /* yard numbers (both sides, upright) with direction arrows; the 2-point try marks */
  for(let x=20;x<=100;x+=10){const n=String(x<=60?x-10:110-x),s=2,wd=pxW(n,s),cx=X0(x);
    for(const yy of [12,FW-12]){const y=Y0(yy)-5;pxText(g,n,cx-Math.round(wd/2)-1,y,s,T.line);
      if(x!==60){const dir=x<60?-1:1,ax=dir<0?cx-Math.round(wd/2)-5:cx+Math.round(wd/2)+3;g.fillStyle=T.line;g.fillRect(ax,y+4,1,2);g.fillRect(ax+(dir<0?1:-1),y+3,1,4)}}}
  for(const x of [13,107])fr(X0(x),Y0(CEN),2,1,T.line);
  /* midfield: the host's abbreviation in a flat tone between team colour and turf */
  {const ab=String(h.abbr||'').toUpperCase().slice(0,4),s=Math.max(2,Math.round(A*.34)),wd=pxW(ab,s),base=lum(h.c1)<.12?h.c2:h.c1,c1=pxMix(base,T.a,.45),c2=pxMix(pxShade(base,-.5),T.a,.55);
    const x=X0(60)-Math.round(wd/2),y=Y0(CEN)-Math.round(2.5*s);pxText(g,ab,x+1,y+1,s,c2);pxText(g,ab,x,y,s,c1)}
  PXR.fk=k;PXR.fcv=cv;return cv;
}
/* ---------- crowd tiles (rest + standing), the wall ---------- */
function pxCrowd(){
  const h=hostT(),a=h===S.home?S.away:S.home,night=pxLight()==='night',k=[h.id,a.id,h.c1,h.c2,a.c1,night,typeof crowdTheme==='function'?crowdTheme():''].join('|');if(PXR.ck===k&&PXR.crowd)return PXR.crowd;
  const W0=160,rows=24,rh=5,H0=rows*rh+2,mk=()=>{const c=document.createElement('canvas');c.width=W0;c.height=H0;return c};
  const seat=night?'#1A2236':'#2B3550',seat2=night?'#141B2C':'#222A41',cols=[h.c1,h.c1,h.c1,h.c2,'#F4F1E8',h.c1,pxShade(h.c1,-.25),'#3C4A66'],vis=[a.c1,a.c1,a.c2,'#F4F1E8'];
  const tiles=[mk(),mk()];
  for(let ti=0;ti<2;ti++){const g=tiles[ti].getContext('2d');g.fillStyle=seat;g.fillRect(0,0,W0,H0);
    for(let r=0;r<rows;r++){const y=r*rh;g.fillStyle=seat2;g.fillRect(0,y+rh-1,W0,1);
      for(let x=(r%2)*2;x<W0;x+=4){const q=pxHash(x+r*977,r);if(q<.06)continue;const away=x>W0*.78;const sh=pxH((away?vis:cols)[Math.floor(pxHash(x,r+31)*(away?vis:cols).length)]);
        const up=ti&&pxHash(x*3,r*7)<.75?1:0,arms=ti&&pxHash(x*5,r*3)<.4;const tone=TONES[Math.floor(pxHash(r,x)*4)];
        g.fillStyle=pxShade(sh,night?-.3:0);g.fillRect(x,y+2-up,3,2+up);g.fillStyle=night?pxShade(tone,-.25):tone;g.fillRect(x+1,y+0-up,2,2);
        if(arms){g.fillRect(x,y-2,1,2);g.fillRect(x+3,y-2,1,2)}}}}
  PXR.crowd=tiles;PXR.ck=k;PXR.crowdRows=rows;PXR.crowdRH=rh;return tiles;
}
/* far / near stands: the wall at the edge of the apron, crowd rows above (far) or below (near), a rim, then sky + lights */
function pxStands(c,now){
  const h=hostT(),tiles=pxCrowd(),T=tiles[0].width,H0=tiles[0].height,night=pxLight()==='night',ex=stadEx(),wav=STAD.waveX;
  const wallC=pxShade(h.c1,-.45),wallH=pxShade(h.c1,-.25),fWall=pxY(-7)-PCY,nWall=pxY(FW+7)-PCY;
  /* sky band above the far stands */
  const top=fWall-6-H0;
  if(top>0){const sky=night?['#0B1222','#111A30','#16223D']:pxLight()==='sunset'?['#3B2F5E','#7A4A6A','#D8855A']:['#4C8FE0','#5FA0EA','#76B2F0'];
    c.fillStyle=sky[0];c.fillRect(0,0,LW,top);const b1=Math.max(0,top-26),b2=Math.max(0,top-10);c.fillStyle=sky[1];c.fillRect(0,b1,LW,top-b1);c.fillStyle=sky[2];c.fillRect(0,b2,LW,top-b2);
    if(night)for(let i=0;i<40;i++){const sx=Math.floor(pxHash(i,7)*LW),sy=Math.floor(pxHash(i,9)*Math.max(1,b1));c.fillStyle=i%3?'#3A4A70':'#AFC0E8';c.fillRect(sx,sy,1,1)}
    /* stadium rim + light towers (world-anchored) */
    c.fillStyle=night?'#1B2338':'#3A4560';c.fillRect(0,top-4,LW,4);c.fillStyle=night?'#2A3552':'#56627E';c.fillRect(0,top-4,LW,1);
    for(let x=-20;x<=140;x+=30){const sx=pxX(x)-PCX;if(sx<-20||sx>LW+20)continue;const ty=top-4;c.fillStyle='#2B3346';c.fillRect(sx,ty-30,2,30);
      c.fillStyle=PXO;c.fillRect(sx-7,ty-38,16,9);const lamp=night||pxLight()!=='day'?'#FFF6C8':'#C9D2E0';for(let r=0;r<2;r++)for(let q=0;q<5;q++){c.fillStyle=lamp;c.fillRect(sx-6+q*3,ty-37+r*4,2,3)}
      if(night){c.fillStyle='#FFE89A';for(let q=0;q<5;q++)c.fillRect(sx-6+q*3,ty-39,2,1)}}}
  else{c.fillStyle=night?'#0B1222':'#4C8FE0';c.fillRect(0,0,LW,Math.max(0,fWall))}
  /* crowd strips: 8-px sections hop when the crowd is up; the wave rolls through */
  const drawCrowd=(y0,flip)=>{if(y0>LH||y0+H0<0)return;const off=((-PCX)%T+T)%T;
    for(let sx=-T+off;sx<LW;sx+=T)for(let s=0;s<T;s+=8){const X1=sx+s;if(X1+8<0||X1>LW)continue;const wx=(X1+PCX)/A,sec=Math.floor((X1+PCX)/8);
      let up=0;if(ex>.32){const q=Math.sin(now/95+sec*1.7);up=q>.1?(ex>.7?2:1):0}if(Math.abs(wx-wav)<3.5)up=2;
      c.drawImage(tiles[up?1:0],s,0,8,H0,X1,y0-up,8,H0)}};
  drawCrowd(top,false);
  /* far wall: padded wall in the host's colour with a lettered band */
  c.fillStyle=wallC;c.fillRect(0,fWall-6,LW,6);c.fillStyle=wallH;c.fillRect(0,fWall-6,LW,1);c.fillStyle=PXO;c.fillRect(0,fWall,LW,1);
  {const msg=(String(h.city||h.abbr||'').toUpperCase()+' ').replace(/[^A-Z0-9 .'-]/g,''),step=pxW(msg,1)+12,ink=contrasty(h.c1,h.c2)?pxH(h.c2):inkOn(h.c1);const o=((-PCX)%step+step)%step;
    for(let x=o-step;x<LW;x+=step)pxText(c,msg,x,fWall-5,1,pxMix(ink,wallC,.15))}
  /* near side: wall, then the front rows of the near stands */
  if(nWall<LH){c.fillStyle=wallC;c.fillRect(0,nWall,LW,6);c.fillStyle=wallH;c.fillRect(0,nWall,LW,1);c.fillStyle=PXO;c.fillRect(0,nWall-1,LW,1);drawCrowd(nWall+7,true);
    if(nWall+7+H0<LH){c.fillStyle=night?'#0B1222':'#2B3550';c.fillRect(0,nWall+7+H0,LW,LH-nWall-7-H0)}}
}
/* ---------- sideline benches: teammates standing along both sidelines ---------- */
function pxBench(c,team,yy,front,now){
  if(!team||LG.settings.sideline===false)return;const P0=pxTeamPal(team),cheer=(STAD.jump.get(team)||0)>0,y=pxY(yy)-PCY;if(y<-30||y>LH+30)return;
  /* bench */
  const bx0=pxX(38)-PCX,bx1=pxX(82)-PCX,by=y-(front?-3:5);if(bx1>0&&bx0<LW){c.fillStyle=PXO;c.fillRect(bx0,by,bx1-bx0,4);c.fillStyle=pxShade(team.c1,-.2);c.fillRect(bx0+1,by+1,bx1-bx0-2,2)}
  for(let i=0;i<15;i++){const x=36+i*3.2+pxHash(i,team.id)*1.6,sx=pxX(x)-PCX;if(sx<-16||sx>LW+16)continue;const tone=Math.floor(pxHash(team.id,i)*4),bd=pxHash(i,3)<.3?'B':pxHash(i,5)<.5?'M':'L';
    const fr=cheer?((Math.floor(now/180)+i)%2?'cel1':'idle'):(pxHash(i,9)<.25?'hold':'idle'),e=pxSprite(P0.pal,P0.pk,bd,fr,null,null,tone),mir=pxHash(i,11)<.5;
    const hop=cheer&&(Math.floor(now/180)+i)%2?2:0,yy2=y+Math.round((pxHash(i,13)-.5)*4);pxBlit(c,e,sx,yy2-hop,mir)}
}
/* draw a cached sprite with its anchor at (x,y), mirrored when facing left */
function pxBlit(c,e,x,y,mir){if(mir){if(!e.m){const m=document.createElement('canvas');m.width=e.w;m.height=e.h;const g=m.getContext('2d');g.translate(e.w,0);g.scale(-1,1);g.drawImage(e.cv,0,0);e.m=m}c.drawImage(e.m,x-(e.w-1-e.ax),y-e.ay)}else c.drawImage(e.cv,x-e.ax,y-e.ay)}
/* ---------- which frame a figure shows (the 08d state selection, quantised) ---------- */
function pxRun(p,sp){const i=((Math.floor((p.phase||0)/TAU2*6)%6)+6)%6;return PX_RUN[i]+(sp>7.2?'L':'')}
function pxStanceF(p){const r=p.role,L=S.los;
  if(r==='OL'||r==='DL')return 'st3';if(r==='QB')return L-p.x<2.2?'st2':'hold';if(r==='TE'&&L-p.x<1.4&&Math.abs(p.y-S.ballY)<5)return 'st3';
  if(r==='RB'||r==='WR'||r==='TE'||r==='LB')return 'st2';if(r==='CB')return Math.abs(p.x-L)<3?'st2':'idle';return 'idle'}
function pxFrame(p,now){
  const ph=S.phase,pre=ph==='presnap',rp=ph==='replay',pl=play,vx=p.vx||0,vy=p.vy||0,sp=Math.hypot(vx,vy),face=p.face||1,vf=vx*face,car=ATH.car===p&&!pre;
  if(p.ref){if(p.sig&&now<p.sigEnd){const m=p.sig;return m==='up'?'cel1':m==='wave'?(Math.floor(now/260)%2?'cel1':'cel2'):m==='fwd'?'stiff':m==='flagT'?'t2':'hold'}
    if(sp>.45)return vf<-.4?PX_BACK[((Math.floor((p.phase||0)/TAU2*4)%4)+4)%4]:pxRun(p,sp);return pre&&(p.ref==='HL'||p.ref==='LJ'||p.ref==='U')?'st2':'idle'}
  /* down, falling, getting up */
  const fe=pre?0:athFall(p,now);
  if(S.celebrate===p){const k=S.celebPose;if(k==='bow')return 'kneel';if(k==='point'||k==='taunt'||k==='salute')return 'cel2';if(k==='heisman')return 'stiff';if(k==='spike')return 'k2';if(k==='flex')return Math.floor(now/300)%2?'cel1':'cel2';return 'cel1'}
  if(ATH.gu>0&&ATH.gu<1&&fe<.5)return ATH.gu<.6?'kneel':'st2';
  if(fe>.02)return fe<.35?'fall1':fe<.7?'fall2':'lie';
  if(!pre&&!rp&&p.lunge>0)return p.lunge>.18?'wrap':'dive';
  const an=!rp&&p.anim&&(p.animT==null||p.animT>0)?p.anim:'',u=an&&p.animT!=null?1-clamp(p.animT/(ANIM_DUR[an]||.5),0,1):.5;
  if(an){switch(an){case 'throw':return u<.34?'t1':u<.67?'t2':'t3';case 'catch':return u<.6?'reach':'hold';case 'dive':return 'dive';case 'tackle':return 'wrap';
    case 'tackled':return u<.5?'fall1':'fall2';case 'stiff':return 'stiff';case 'juke':return 'juke';case 'spin':return Math.floor(u*4)%2?'spinB':'hold';case 'truck':return 'blk1';
    case 'hurdle':return 'hurdle';case 'slide':return 'lie';case 'swim':case 'rip':return 'blk2';case 'swat':return 'reach';case 'kick':case 'punt':return u<.3?'k1':u<.75?'k2':'idle';
    case 'snap':return 'snap';case 'kneel':return 'kneel';case 'spike':return 't2';case 'celebrate':return 'cel1';case 'getup':return 'kneel'}}
  if(!pre&&p===Q&&pl){const thr=rp?0:(p.throwT||0);if(thr>0){const q=1-thr/.35;return q<.3?'t1':q<.7?'t2':'t3'}
    if(car&&pl.type==='pass'&&!pl.scramble){if(aim&&ph==='live')return 't1';if(sp>.8&&vf<-.4)return PX_BACK[((Math.floor((p.phase||0)/TAU2*4)%4)+4)%4];return sp>.8?pxRun(p,sp):'hold'}}
  if(car&&pl&&!rp){if(pl.dive>0)return 'dive';if(pl.hurdle>0&&p.z>.05)return 'hurdle';if(pl.jukeT>0)return 'juke';if(pl.spinT>0)return Math.floor(pl.spinT/.08)%2?'spinB':'hold';
    if(pl.truckT>0)return 'blk1';if(p.stiff>0)return 'stiff';if(pl.caught&&ball.T&&pl.t-pl.ballT0-ball.T<.28)return 'hold'}
  if(!pre&&!car&&ball&&ball.state==='air'&&!ball.pitch&&ball.T>0&&ball.t/ball.T>.45){const d=Math.abs(p.x-ball.tx)+Math.abs(p.y-ball.ty);if(d<(p.side==='o'?3.2:2.6)&&(p.side==='d'||eligible(p)))return 'reach'}
  if(!pre&&!rp&&pl&&p===S.ctrl&&pl.swat>0)return 'reach';
  if(!pre&&!rp&&!car&&p.engaged)return sp<.6?(Math.floor(now/220+p.num)%2?'blk1':'blk2'):'blk1';
  if(pre&&p._gx==null&&sp<.6)return pxStanceF(p);
  if(!car&&!pre&&p.role==='OL'&&pl&&pl.type==='pass'&&!pl.thrown)return sp<.6?'sh2':(Math.floor((p.phase||0)/Math.PI)%2?'sh1':'sh2');
  const backOK=(p.side==='d'||p.role==='OL'||p===Q)&&sp>.8&&vf<-.6&&!p.engaged;
  if(backOK)return PX_BACK[((Math.floor((p.phase||0)/TAU2*4)%4)+4)%4];
  if(sp>.6){if(!car&&Math.abs(vx)<sp*.35&&sp<4.5)return Math.floor((p.phase||0)/Math.PI)%2?'sh1':'sh2';return pxRun(p,sp)}
  return p.side==='d'&&!pre&&pl&&!pl.ended?'st2':'idle';
}
/* ---------- small pixel pieces ---------- */
function pxDot(c,x,y,col){c.fillStyle=col;c.fillRect(x,y,1,1)}
/* a flat pixel ellipse outline (no anti-aliasing): midpoint walk */
function pxEll(c,cx,cy,rx,ry,col,th){c.fillStyle=col;rx=Math.max(1,Math.round(rx));ry=Math.max(1,Math.round(ry));const pts=new Set();
  for(let x=-rx;x<=rx;x++){const y=Math.round(ry*Math.sqrt(Math.max(0,1-(x*x)/(rx*rx))));pts.add(x+','+y);pts.add(x+','+(-y))}
  for(let y=-ry;y<=ry;y++){const x=Math.round(rx*Math.sqrt(Math.max(0,1-(y*y)/(ry*ry))));pts.add(x+','+y);pts.add((-x)+','+y)}
  for(const k of pts){const [x,y]=k.split(',').map(Number);c.fillRect(cx+x,cy+y,th||1,1)}}
/* the football: 3 spin frames (side with laces, three-quarter, end-on), outlined */
const PX_BALL=[[".obbbo.","obBBBbo","obLLLbo","obBBBbo",".obbbo."],["..obo..",".obBbo.",".bBLBb.",".obBbo.","..obo.."],[".obo.","obBbo","oBLBo","obBbo",".obo."]];
const PX_BALLC={o:'#141A26',b:'#6E3A16',B:'#9A5527',L:'#F4F1E8'};
function pxBall(c,x,y,f){const G=PX_BALL[f%3],w=G[0].length,h=G.length;for(let r=0;r<h;r++)for(let q=0;q<w;q++){const ch=G[r][q];if(ch==='.')continue;c.fillStyle=PX_BALLC[ch];c.fillRect(x-(w>>1)+q,y-(h>>1)+r,1,1)}}
/* a tiny carried ball (held against the body) */
function pxBallHeld(c,x,y,mir){c.fillStyle=PXO;c.fillRect(x-2,y-1,5,3);c.fillStyle='#9A5527';c.fillRect(x-1,y-1,3,2);c.fillStyle='#6E3A16';c.fillRect(x-1,y,3,1);c.fillStyle='#F4F1E8';c.fillRect(x,y-1,1,1)}
/* pixel triangle pointing down (markers) */
function pxTri(c,x,y,w,col){const hw=w>>1;for(let r=0;r<=hw;r++){c.fillStyle=PXO;c.fillRect(x-hw+r-1,y+r,(hw-r)*2+3,1);c.fillStyle=col;c.fillRect(x-hw+r,y+r,(hw-r)*2+1,1)}c.fillStyle=PXO;c.fillRect(x-1,y+hw+1,3,1);c.fillRect(x-hw-1,y-1,w+2,1)}
/* dotted pixel line from (x0,y0) to (x1,y1): every `gap` px, phase ph */
function pxDots(c,x0,y0,x1,y1,gap,col,ph){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));c.fillStyle=col;for(let i=0;i<=n;i++){if((i+(ph||0))%gap)continue;const t=n?i/n:0;c.fillRect(Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),1,1)}}
/* pixel digits tag: dark plate, coloured border, white number */
function pxTag(c,cx,cy,txt,col,hi){const s=String(txt),w=pxW(s,1)+4,h=9,x=cx-(w>>1),y=cy-(h>>1);c.fillStyle=PXO;c.fillRect(x-1,y-1,w+2,h+2);c.fillStyle=col;c.fillRect(x,y,w,h);c.fillStyle=hi?col:PXU.navy;c.fillRect(x+1,y+1,w-2,h-2);pxText(c,s,x+2,y+2,1,hi?PXO:PXU.text);
  c.fillStyle=PXO;c.fillRect(cx-1,y+h+1,3,1);c.fillStyle=col;c.fillRect(cx,y+h,1,2)}
/* effects (dust, sparks, confetti) live in PXR.fx */
function pxFx(kind,x,y,n){if(!isPix())return;for(let i=0;i<(n||1);i++)PXR.fx.push({k:kind,x,y,t:0,T:kind==='spark'?.22:kind==='dust'?.4:2.6,vx:R(-1,1),vy:R(-1,1),z:kind==='conf'?R(2,5):0,vz:kind==='conf'?R(3,8):0,c:i})}
onFx('tackle',e=>{if(!isPix())return;const c=e.c||(play&&play.carrier);if(!c)return;pxFx('dust',c.x,c.y,1);if(e.big){pxFx('spark',(c.x+(e.d?e.d.x:c.x))/2,(c.y+(e.d?e.d.y:c.y))/2,1)}});
onFx('sack',()=>{if(isPix()&&Q)pxFx('spark',Q.x,Q.y,1)});
onFx('td',e=>{if(!isPix())return;const c=play&&play.carrier;if(!c&&!ball)return;const x=c?c.x:ball.x,y=c?c.y:ball.y;pxFx('conf',x,y,70)});
function pxFxDraw(c,dt,team){const cols=[team.c1,team.c2,'#F4F1E8','#FFD23F'];
  for(const f of PXR.fx){f.t+=dt;const x=pxX(f.x)-PCX,y=pxY(f.y)-PCY;
    if(f.k==='dust'){const r=Math.floor(f.t/f.T*3);c.fillStyle=f.t<f.T*.6?'#E8DDC0':'#C8BC9C';if(r===0){c.fillRect(x-2,y-1,5,2)}else if(r===1){c.fillRect(x-4,y-2,2,2);c.fillRect(x+3,y-2,2,2);c.fillRect(x-1,y-3,3,2)}else{c.fillRect(x-6,y-1,2,1);c.fillRect(x+5,y-1,2,1);c.fillRect(x-2,y-5,1,1);c.fillRect(x+2,y-5,1,1)}}
    else if(f.k==='spark'){const r=f.t<.1?4:7,yy=y-14;c.fillStyle='#FFFFFF';c.fillRect(x-1,yy-1,3,3);c.fillStyle='#FFD23F';for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){for(let i=2;i<r;i++)c.fillRect(x+a*i,yy+b*i,1,1)}if(f.t>=.1){c.fillStyle='#FFFFFF';for(const [a,b] of [[1,1],[-1,1],[1,-1],[-1,-1]])c.fillRect(x+a*3,yy+b*3,1,1)}}
    else if(f.k==='conf'){f.x+=f.vx*dt*4;f.y+=f.vy*dt*4;f.z+=f.vz*dt;f.vz=Math.max(-1.6,f.vz-6*dt);if(f.z<0)f.z=0;const yy=y-Math.round(f.z*A*.9);c.fillStyle=pxH(cols[f.c%4]);c.fillRect(x,yy,((f.t*10+f.c)|0)%3?2:1,1)}}
  PXR.fx=PXR.fx.filter(f=>f.t<f.T)}
/* ---------- weather (pixel particles in screen space) ---------- */
function pxWeather(c,dt,now){
  const k=S.wx;if(!k||k==='Clear'||k==='Wind'){PXR.wx=null;return}const rain=k==='Rain',wm=S.wind?Math.min(1.4,S.wind.mph/14):0,wd=typeof windX==='function'?windX()*wm:0;
  if(!PXR.wx||PXR.wx.k!==k||PXR.wx.w!==LW){PXR.wx={k,w:LW,p:Array.from({length:rain?120:110},(_,i)=>({x:Math.random()*LW,y:Math.random()*LH,v:R(.7,1.3),d:i%3===0}))}}
  for(const p of PXR.wx.p){if(rain){p.y+=(300+160*p.d)*p.v*dt;p.x+=(-40-wd*60)*p.v*dt}else{p.y+=(14+12*p.d)*p.v*dt;p.x+=(Math.sin(now/900+p.v*9)*6+wd*16)*dt}
    if(p.y>LH+4){p.y=-6;p.x=Math.random()*(LW+40)-20}if(p.x<-10)p.x+=LW+20;else if(p.x>LW+10)p.x-=LW+20;
    const x=Math.round(p.x),y=Math.round(p.y);
    if(rain){c.fillStyle=p.d?'#C9DAF0':'#8FA9CC';const sx=wd>.2?1:wd<-.2?-1:-1;c.fillRect(x,y,1,2);c.fillRect(x+sx,y-2,1,2);if(p.d)c.fillRect(x+sx*2,y-4,1,1)}
    else{c.fillStyle='#F4F7FC';if(p.d)c.fillRect(x,y,2,2);else c.fillRect(x,y,1,1)}}
  if(rain){/* puddle splashes on the turf */const t0=Math.max(0,pxY(0)-PCY),t1=Math.min(LH,pxY(FW)-PCY);if(t1>t0)for(let i=0;i<10;i++){const q=(now/260+i*.37)%1,sx=Math.floor(pxHash(i,Math.floor(now/260+i*.37))*LW),sy=t0+Math.floor(pxHash(i+9,Math.floor(now/260+i*.37))*(t1-t0));c.fillStyle='#C9DAF0';if(q<.5){c.fillRect(sx,sy,1,1)}else if(q<.8){c.fillRect(sx-1,sy,1,1);c.fillRect(sx+1,sy,1,1)}}}
}
/* ---------- overlays: routes, aim arc, badges ---------- */
function pxRoutes(c,now){
  if(!(uOff()&&LG.settings.routes!==false&&(S.phase==='presnap'||(S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble))))return;
  const col=pxH(tvCol(S.home)),dim=S.phase!=='presnap',ph=Math.floor(now/90)%3;
  const rp=S.phase==='presnap'&&S.pc&&S.pc.run,cr=rp&&KP[rp.carrier==='QB'?'QB':rp.carrier];
  const seg=(pts,arrow)=>{for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];pxDots(c,pxX(a[0])-PCX,pxY(a[1])-PCY,pxX(b[0])-PCX,pxY(b[1])-PCY,dim?4:3,col,ph)}
    if(arrow&&pts.length>1){const e=pts[pts.length-1],f=pts[pts.length-2],ex=pxX(e[0])-PCX,ey=pxY(e[1])-PCY,dx=Math.sign(Math.round((e[0]-f[0])*10)),dy=Math.abs(e[1]-f[1])>Math.abs(e[0]-f[0])*.6?Math.sign(e[1]-f[1]):0;
      c.fillStyle=PXO;c.fillRect(ex-2,ey-2,5,5);c.fillStyle=col;c.fillRect(ex-1,ey-1,3,3);if(dx||dy){c.fillStyle=col;c.fillRect(ex+dx*2,ey+dy*2,1,1)}}};
  if(cr){const L=S.los,gy=clamp(S.ballY+rp.gap*S.flip,3,FW-3);seg([[cr.x,cr.y],[L+1.2,gy],[L+5.5,gy]],true)}
  for(const p of OFF){if(!p.rpath||(play&&play.type==='run'))continue;const pts=p.rpath.slice();if(p.cont){const a=pts[pts.length-1],b=p.cont,d=hyp(b[0]-a[0],b[1]-a[1])||1;pts.push([a[0]+(b[0]-a[0])/d*5,a[1]+(b[1]-a[1])/d*5])}seg(pts,true)}
}
function pxAim(c,now){
  if(!(aim&&S.phase==='live'&&Q))return;const d=hyp(aim.x-Q.x,aim.y-Q.y),h=aim.bullet?d*.03+.45:aim.lob?d*.18+1.3:d*.11+.5,col=aim.bullet?'#FF8A2A':aim.lob?'#7FD4FF':'#FFFFFF';
  const n=Math.max(10,Math.round(d*2.2)),ph=Math.floor(now/70)%3;
  for(let k=0;k<=n;k++){if((k+ph)%3)continue;const t=k/n,z=4*h*t*(1-t),x=pxX(lerp(Q.x,aim.x,t))-PCX,y=pxY(lerp(Q.y,aim.y,t))-PCY-Math.round(z*A*.9)-14;c.fillStyle=PXO;c.fillRect(x-1,y-1,3,3);c.fillStyle=col;c.fillRect(x,y,1,1)}
  const ax=pxX(aim.x)-PCX,ay=pxY(aim.y)-PCY;let rc=col;
  {const T=typeof flightT==='function'?flightT(d,aim.bullet,aim.lob,Q.pl.thr):d/22;let r=null,rd=7;for(const o of OFF){if(o===Q||o.blocker||!eligible(o))continue;const lx=o.x+(o.vx||0)*T,ly=o.y+(o.vy||0)*T,dd=hyp(lx-aim.x,ly-aim.y);if(dd<rd){rd=dd;r=o}}
    if(r&&rd<=Math.max(1.3,aim.err+.7))rc=PXU.green}
  pxEll(c,ax,ay,Math.max(3,aim.err*A),Math.max(2,aim.err*A*VY),PXO);pxEll(c,ax,ay-1,Math.max(3,aim.err*A),Math.max(2,aim.err*A*VY),rc);
  /* landing X */
  for(let i=-2;i<=2;i++){c.fillStyle=PXO;c.fillRect(ax+i-1,ay+i,3,1);c.fillRect(ax-i-1,ay+i,3,1)}for(let i=-2;i<=2;i++){c.fillStyle=rc===PXU.green?PXU.green:PXU.fd;c.fillRect(ax+i,ay+i,1,1);c.fillRect(ax-i,ay+i,1,1)}
  const lab=String(Math.round(d));const lw=pxW(lab,1);c.fillStyle=PXO;c.fillRect(ax-(lw>>1)-2,ay-Math.max(2,Math.round(aim.err*A*VY))-11,lw+4,9);pxText(c,lab,ax-(lw>>1),ay-Math.max(2,Math.round(aim.err*A*VY))-9,1,PXU.text);
}
/* the Arcade receiver tags: where each sits (art px) — arcBadge (06c) maps it back to CSS px for taps */
function pxBadgeAt(o){return [pxX(o.x)-PCX,pxY(o.y)-PCY-35]}
function pxBadges(c){
  if(!(typeof arcade==='function'&&arcade()&&S.phase==='live'&&play&&!play.st&&arcQB()))return;
  for(const o of arcRcvs()){const [,nd]=nearest(DEF,o.x,o.y,d=>d.stun<=0),col=pxH(openCol(nd));let [bx,by]=pxBadgeAt(o);const off=bx<7||bx>LW-7;bx=clamp(bx,8,LW-8);by=clamp(by,8,LH-8);
    pxTag(c,bx,by,o.num!=null?o.num:'',col,aim&&aim.r===o);if(off){const dir=bx>LW/2?1:-1,ax=bx+dir*9;c.fillStyle=col;for(let i=0;i<3;i++)c.fillRect(ax+dir*i,by-2+i,1,5-i*2)}}
  const t=touch;if(t&&t.arc==='sling'&&aim)pxDots(c,Math.round(t.sx/PXS),Math.round(t.sy/PXS),Math.round(t.x/PXS),Math.round(t.y/PXS),3,'#FFFFFF',0);
}
/* ---------- the frame ---------- */
function drawPix(now){
  const c=lx;c.imageSmoothingEnabled=false;const dt=clamp((now-(PXR.t||now))/1000,0,.05);PXR.t=now;
  c.fillStyle=PXU.navy;c.fillRect(0,0,LW,LH);
  if(!S.home){pxPresent();return}
  pxCam();
  {const sh=S.shake>0?shakeXY(now):[0,0];PCX-=Math.round(sh[0]/PXS*.8);PCY-=Math.round(sh[1]/PXS*.6)}
  if(typeof stadTick==='function')stadTick(now);
  const host=hostT(),vis=host===S.home?S.away:S.home;
  /* stands, field, paint */
  pxStands(c,now);
  const F=pxField();c.drawImage(F,pxX(PXR.fx0)-PCX,pxY(PXR.fy0)-PCY);
  const inGame=['presnap','live','dead','pat','kick','wait','drive'].includes(S.phase),t0=pxY(0)-PCY,t1=pxY(FW)-PCY;
  if(inGame){const bar=(x,col)=>{const ax=pxX(x)-PCX;if(ax<-3||ax>LW+3)return;c.fillStyle=pxShade(col,-.35);c.fillRect(ax-1,t0,1,t1-t0);c.fillStyle=col;c.fillRect(ax,t0,2,t1-t0)};
    bar(S.los,PXU.los);if(!S.conv&&S.firstDownX<110&&S.phase!=='pat')bar(S.firstDownX,PXU.fd)}
  /* pylons + goal posts (the posts stand at the end lines) */
  for(const gx of [0,10,110,120])for(const gy of [0,FW]){const x=pxX(gx)-PCX,y=pxY(gy)-PCY;if(x<-4||x>LW+4)continue;c.fillStyle=PXO;c.fillRect(x-1,y-5,4,6);c.fillStyle='#FF7A1A';c.fillRect(x,y-4,2,4)}
  /* far bench + sideline */
  pxBench(c,vis,-3.6,false,now);
  /* sorted figures: players + officials */
  const list=P.slice();if(LG.settings.officials!==false&&typeof offiFrame==='function'&&P.length&&inGame){const o=offiFrame(now);if(o)for(const x of o)list.push(x)}
  list.sort((a,b)=>a.y-b.y);
  athFrame(ctx,now);pxRoutes(c,now);
  const passLive=uOff()&&S.phase==='live'&&play&&play.type==='pass'&&!play.thrown&&!play.scramble;
  /* goal post bases behind everything near the far side */
  const post=(gx)=>{const x=pxX(gx)-PCX;if(x<-6||x>LW+6)return;const yb=pxY(CEN)-PCY,ya=pxY(CEN-3.1)-PCY,yc=pxY(CEN+3.1)-PCY,hb=Math.round(3.3*A),hu=Math.round(5.5*A),Y='#F2C230',Yd='#B8901C';
    c.fillStyle=PXO;c.fillRect(x-2,yb-hb-1,5,hb+2);c.fillStyle=Yd;c.fillRect(x-1,yb-hb,3,hb);c.fillStyle=Y;c.fillRect(x-1,yb-hb,2,hb);
    c.fillStyle=PXO;c.fillRect(x-2,ya-hb-hu-1,5,yc-ya+hu+2);c.fillStyle=Y;c.fillRect(x-1,ya-hb-hu,2,yc-ya+hu);c.fillStyle=Yd;c.fillRect(x+1,ya-hb-hu,1,yc-ya+hu);
    c.fillStyle='#E8413A';c.fillRect(x-1,ya-hb-hu-4,2,3)};
  post(0);post(120);
  for(const p of list){
    const x=pxX(p.x)-PCX,y=pxY(p.y)-PCY;if(x<-24||x>LW+24||y<-10||y>LH+40)continue;
    const z=Math.round((p.z||0)*A*.9),fr=pxFrame(p,now),ref=!!p.ref;
    let e;if(ref){e=pxSprite(pxPal(null,null,p.ref==='R'?'R':'O'),'ref'+(p.ref==='R'?'R':'O'),'L',fr,null,p.ref==='R'?'R':'O',(p.id||0)%4)}
    else{athBody(p);const team=p.team||(p.side==='o'?offT():defT()),P0=pxTeamPal(team);e=pxSprite(P0.pal,P0.pk,pxBuildOf(p),fr,p.num,null,p.pl?p.pl.tone:1)}
    const mir=(p.face||1)<0;
    /* shadow */
    {const sw=Math.max(6,Math.round(e.w*.6)-(z>3?2:0));c.fillStyle='rgba(8,20,12,.32)';c.fillRect(x-(sw>>1)+1,y-1,sw-2,1);c.fillRect(x-(sw>>1),y,sw,2);c.fillRect(x-(sw>>1)+1,y+2,sw-2,1)}
    if(!ref){
      if(passLive&&eligible(p)&&!(typeof arcade==='function'&&arcade())){const [,nd]=nearest(DEF,p.x,p.y);pxEll(c,x,y+1,8,3,pxH(openCol(nd)))}
      if(((p===S.ctrl&&ctrlRing(p))||(typeof rtgMine==='function'&&rtgMine(p)&&p.side==='o'))&&S.phase!=='dead'){pxEll(c,x,y+2,9,4,PXO);pxEll(c,x,y+1,9,4,PXU.fd)}}
    const blink=p.stun>0&&!p.fallen&&Math.floor(now/90)%2;
    if(blink)c.globalAlpha=.55;pxBlit(c,e,x,y-z,mir);c.globalAlpha=1;
    /* the ball in his hands */
    if(!ref&&inGame&&ball&&ball.state==='held'&&ATH.car===p&&S.phase!=='presnap'&&e.ball&&!['lie','fall2','dive','t2','t3'].includes(fr)){const bx=mir?x+(e.w-1-e.ball[0])-(e.w-1-e.ax):x+e.ball[0]-e.ax,by=y-z+e.ball[1]-e.ay;pxBallHeld(c,bx+(mir?-1:1),by+1,mir)}
    else if(!ref&&inGame&&ball&&ball.state==='held'&&ATH.car===p&&S.phase!=='presnap'&&(fr==='lie'||fr==='fall2'||fr==='dive'))pxBallHeld(c,x+(mir?-6:6),y-z-4,mir);
    if(!ref){
      if((p===S.ctrl&&ctrlRing(p))&&S.phase!=='dead'){const b=Math.floor(now/180)%2;pxTri(c,x,y-z-e.ay-9-b,7,PXU.fd)}
      else if(play&&p===play.carrier&&isRunner()&&S.phase==='live'&&p.side===(uOff()?'o':'d')){const b=Math.floor(now/200)%2;pxTri(c,x,y-z-e.ay-7-b,5,'#FFFFFF')}}
  }
  /* near bench in front */
  pxBench(c,S.home===vis?S.away:S.home,FW+4.2,true,now);
  /* penalty flag */
  {const f=typeof OFFI!=='undefined'&&OFFI.flag;if(f&&f.t>=0){const q=clamp(f.t/f.T,0,1),x=pxX(lerp(f.x0,f.x1,q))-PCX,y=pxY(lerp(f.y0,f.y1,q))-PCY-Math.round((q<1?(1-q)*2.1+q*(1-q)*6.4:0)*A*.9);c.fillStyle=PXO;c.fillRect(x-2,y-2,5,4);c.fillStyle='#FFD21F';c.fillRect(x-1,y-1,3,2)}}
  /* the ball */
  if(inGame&&ball){
    if(ball.state==='air'){const bx=pxX(ball.x)-PCX,by=pxY(ball.y)-PCY,yy=by-Math.round(ball.z*A*.9)-12;c.fillStyle='rgba(8,20,12,.38)';c.fillRect(bx-2,by,5,1);c.fillRect(bx-1,by+1,3,1);pxBall(c,bx,yy,Math.floor(now/70))}
    else if(S.phase==='presnap'||(play&&play.result&&play.result.kind==='inc')||ball.state==='loose'||ball.state==='dead'&&!ATH.car){const bx=pxX(ball.x)-PCX,by=pxY(ball.y)-PCY;pxBall(c,bx,by-2,0)}}
  /* particles (turf kicks) + effects */
  for(const q of particles){if(q.kind==='conf')continue;const px=pxX(q.x)-PCX,py=pxY(q.y)-PCY-Math.round(q.z*A*.9);c.fillStyle=q.c;c.fillRect(px,py,1,1)}
  pxFxDraw(c,dt,host);
  pxAim(c,now);pxBadges(c);
  pxWeather(c,dt,now);
  /* the floating stick (Simulation controls) as a pixel ring + knob */
  if(stick&&!stick.key&&stick.ox!=null&&LG.settings.stickUI!==false){const ox=Math.round(stick.ox/PXS),oy=Math.round(stick.oy/PXS),kx=Math.round(stick.x/PXS),ky=Math.round(stick.y/PXS),r=Math.round(70/PXS);
    c.globalAlpha=.55;pxEll(c,ox,oy+1,r,r,PXO);pxEll(c,ox,oy,r,r,PXU.text);c.globalAlpha=.7;for(let y=-5;y<=5;y++){const w=Math.round(Math.sqrt(30-y*y));c.fillStyle=PXU.text;c.fillRect(kx-w,ky+y,w*2+1,1)}c.globalAlpha=1}
  pxPresent();
  ctx.setTransform(DPR,0,0,DPR,0,0);if(typeof padDraw==='function')padDraw(ctx);
}
/* blow the art buffer up by a whole number of device pixels */
function pxPresent(){ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(low,0,0,LW,LH,0,0,LW*PDS,LH*PDS)}
