/* =========================================================
   08f · Broadcast field (modern style): cached turf + paint, light grade, TV lines, goal posts, sceneLight()
   The whole surface (mow stripes, grain, markings, end zones, midfield badge, light baked for the time slot and
   weather) is drawn once into an offscreen canvas in world space (x FLD.x0..x1, y FLD.y0..y1, pre-squashed by VY)
   and blitted through the camera every frame. fieldKey() decides when to rebuild (host, colors, turf setting,
   weather, light stage, scale/DPR, an imported logo finishing loading); rebuilds wait for a dead ball.
   A low-res layer on top adds wear between the hashes (grows over the game, muddier in rain) or snow cover.
   sceneLight() → {sx,sy,len,a,n,tint,glow}: shadow direction (unit vector, screen space), shadow length per unit
   of player height, shadow alpha, shadow count (n>1 under night light towers: rotate (sx,sy) by i·2π/n),
   rgba tint for players or '', glow 0–1. The same object is returned until the light changes; don't mutate it.
   ========================================================= */
const FLD={cv:null,key:'',ppy:0,x0:-7,y0:-6,x1:127,y1:FW+10,out:'#1d4a25',surf:null,surfKey:'',wk:'dry',art:false,grade:null,gradeKey:'',light:null,lightKey:'',chk:0,grain:null};
const EZ_STYLE={TENN:'check',PSU:'diag',OKST:'diag',ORE:'diag',UTAH:'diag'};
/* block athletic numerals on a 4×6 grid (only the digits yard numbers use) */
const DIG={0:[[.9,0,3.1,0,4,.9,4,5.1,3.1,6,.9,6,0,5.1,0,.9],[1.45,1.2,2.55,1.2,2.8,1.45,2.8,4.55,2.55,4.8,1.45,4.8,1.2,4.55,1.2,1.45]],
  1:[[1.2,.6,2.35,0,3.6,0,3.6,6,2.4,6,2.4,1.3,1.2,1.9]],
  2:[[0,.9,.9,0,3.1,0,4,.9,4,2.7,1.6,4.8,4,4.8,4,6,0,6,0,4.7,2.8,2.3,2.8,1.2,1.2,1.2,1.2,1.9,0,1.9]],
  3:[[0,0,3.1,0,4,.9,4,2.4,3.5,3,4,3.6,4,5.1,3.1,6,0,6,0,4.8,2.8,4.8,2.8,3.6,1,3.6,1,2.4,2.8,2.4,2.8,1.2,0,1.2]],
  4:[[0,0,1.2,0,1.2,2.4,2.4,2.4,2.4,0,3.6,0,3.6,2.4,4,2.4,4,3.6,3.6,3.6,3.6,6,2.4,6,2.4,3.6,0,3.6]],
  5:[[0,0,4,0,4,1.2,1.2,1.2,1.2,2.4,3.1,2.4,4,3.3,4,5.1,3.1,6,0,6,0,4.8,2.8,4.8,2.8,3.6,0,3.6]]};
const FFONT='-apple-system,system-ui,"Helvetica Neue",Arial,sans-serif';
function fRng(seed){let a=seed>>>0||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function lightStage(){if(S.slot==='Primetime')return 'night';if(S.slot==='Afternoon'){const p=progress();return p>.66?'night':p>.35?'sunset':'late'}return 'day'}
const wxKind=()=>S.wx==='Rain'?'wet':S.wx==='Snow'?'snow':'dry';
function sceneLight(){
  const st=lightStage(),wk=wxKind(),k=st+wk;if(FLD.lightKey===k&&FLD.light)return FLD.light;
  const L=st==='night'?{sx:.6,sy:.8,len:.55,a:.16,n:4,tint:'rgba(110,140,255,.08)',glow:.7}:st==='sunset'?{sx:.97,sy:.24,len:1.6,a:.3,n:1,tint:'rgba(255,140,60,.12)',glow:.3}
    :st==='late'?{sx:.88,sy:.47,len:.9,a:.3,n:1,tint:'rgba(255,205,150,.05)',glow:.1}:{sx:.55,sy:.83,len:.42,a:.34,n:1,tint:'',glow:0};
  if(wk!=='dry'){L.a*=.55;L.len=Math.min(L.len,.5);if(st!=='night')L.tint='rgba(140,150,168,.12)'}
  FLD.lightKey=k;FLD.light=L;return L;
}
const fieldPPY=()=>Math.min(Math.floor(4096/(FLD.x1-FLD.x0)),Math.max(8,Math.ceil(sc*1.2*DPR)));
function fieldKey(){const t=hostT(),lg=typeof teamLogo==='function'&&teamLogo(t)?1:0;
  return [t.id,t.abbr,t.city,t.c1,t.c2,S.home.id,S.away.id,LG.settings.specialTurf!==false?1:0,wxKind(),lightStage(),fieldPPY(),lg].join('|')}
function ensureField(){if(FLD.cv&&(++FLD.chk%10))return;if(FLD.cv&&S.phase==='live')return;const k=fieldKey();if(k!==FLD.key){FLD.key=k;buildField()}}
function grainTile(){
  if(FLD.grain)return FLD.grain;const n=document.createElement('canvas');n.width=n.height=256;const g=n.getContext('2d'),r=fRng(99);
  for(let i=0;i<7000;i++){g.fillStyle=r()<.45?`rgba(255,255,225,${(.04+r()*.07).toFixed(3)})`:`rgba(0,22,0,${(.05+r()*.09).toFixed(3)})`;g.fillRect(r()*256|0,r()*256|0,1,r()<.5?2:1)}
  return FLD.grain=n;
}
function fieldDigits(g,ds){/* two-digit yard number centered on 0,0 in yards, 2 yd tall; the yard line runs between the digits */
  g.beginPath();for(let i=0;i<ds.length;i++){const ox=i?.3:-1.633;for(const poly of DIG[ds[i]]){for(let k=0;k<poly.length;k+=2){const px=ox+poly[k]/3,py=-1+poly[k+1]/3;if(k)g.lineTo(px,py);else g.moveTo(px,py)}g.closePath()}}g.fill('evenodd');
}
function buildField(){
  const t=hostT(),{x0,y0,x1,y1}=FLD,ppy=fieldPPY(),pv=ppy*VY,Wc=Math.ceil((x1-x0)*ppy),Hc=Math.ceil((y1-y0)*pv);
  const cv=FLD.cv||(FLD.cv=document.createElement('canvas'));if(cv.width!==Wc||cv.height!==Hc){cv.width=Wc;cv.height=Hc}
  const g=cv.getContext('2d'),st=lightStage(),wk=wxKind(),night=st==='night',art=!!(LG.settings.specialTurf!==false&&SPECIAL_TURF[t.abbr]),tf=turfColors(false),r=fRng(t.id*7919+17);
  FLD.ppy=ppy;FLD.art=art;
  const WS=()=>g.setTransform(ppy,0,0,pv,-x0*ppy,-y0*pv),PX=(x,y)=>g.setTransform(1,0,0,VY,(x-x0)*ppy,(y-y0)*pv);
  g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,Wc,Hc);WS();
  /* grass: surround, 5-yard mow stripes, faint crosswise cut, soft color variation */
  FLD.out=shade(tf[1],-.2);g.fillStyle=FLD.out;g.fillRect(x0,y0,x1-x0,y1-y0);
  for(let i=0;i<20;i++){g.fillStyle=tf[i%2?0:1];g.fillRect(10+i*5,0,5,FW)}
  g.fillStyle='rgba(255,255,255,.03)';for(let j=0;j<10;j+=2)g.fillRect(10,j*FW/10,100,FW/10);
  for(let i=0;i<46;i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0),rr=3+r()*8,c=r()<.5?'255,250,190,':'0,25,0,',gr=g.createRadialGradient(x,y,0,x,y,rr);gr.addColorStop(0,`rgba(${c}${r()<.5?.05:.07})`);gr.addColorStop(1,`rgba(${c}0)`);g.fillStyle=gr;g.fillRect(x-rr,y-rr,2*rr,2*rr)}
  /* team areas behind the sidelines */
  g.globalAlpha=.3;g.fillStyle=S.home.c1;g.fillRect(35,FW+2,50,5);g.fillStyle=S.away.c1;g.fillRect(35,-6,50,4);g.globalAlpha=1;
  /* end zones in the host's colors */
  const ez=EZ_STYLE[t.abbr]||'',lt=contrasty(t.c1,t.c2)?t.c2:inkOn(t.c1),ol=lum(lt)>.5?shade(t.c1,-.55):'#FFFFFF',name=String(t.city||t.name||t.abbr).toUpperCase();
  for(const ex of [0,110]){
    WS();g.fillStyle=t.c1;g.fillRect(ex,0,10,FW);
    if(ez==='check'){g.fillStyle=lt;for(let i=0;i<3;i++)for(let j=0;j<16;j++)if((i+j)%2)g.fillRect(ex+i*10/3,j*FW/16,10/3,FW/16)}
    else if(ez==='diag'){g.save();g.beginPath();g.rect(ex,0,10,FW);g.clip();g.fillStyle=shade(t.c1,-.2);for(let k=-12;k<FW+12;k+=3.2){g.beginPath();g.moveTo(ex,k);g.lineTo(ex+10,k-6);g.lineTo(ex+10,k-4.4);g.lineTo(ex,k+1.6);g.closePath();g.fill()}g.restore()}
    else{g.fillStyle='rgba(255,255,255,.035)';for(let k=0;k<FW;k+=4)g.fillRect(ex,k,10,2)}
    /* lettering reads from the field of play: rotated so the letters' feet face the goal line */
    PX(ex+5,CEN);g.rotate((ex?1:-1)*Math.PI/2);let fs=6.2*ppy;g.font=`italic 900 ${fs}px ${FFONT}`;const cond=.84,maxw=(FW-9)*ppy;let mw=g.measureText(name).width*cond;if(mw>maxw){fs*=maxw/mw;mw=maxw;g.font=`italic 900 ${fs}px ${FFONT}`}
    if(ez==='check'){g.fillStyle=t.c1;g.fillRect(-mw/2-ppy*1.2,-ppy*3.4,mw+ppy*2.4,ppy*6.8);g.fillStyle=lt;g.fillRect(-mw/2-ppy*1.2,-ppy*3.4,mw+ppy*2.4,ppy*.25);g.fillRect(-mw/2-ppy*1.2,ppy*3.15,mw+ppy*2.4,ppy*.25)}
    g.scale(cond,1);g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=fs*.07;g.strokeStyle=ol;g.strokeText(name,0,fs*.04);g.fillStyle=lt;g.fillText(name,0,fs*.04);
    WS();g.fillStyle=lt;g.globalAlpha=.85;const a=.7,w=.18;g.fillRect(ex+a,a,10-2*a,w);g.fillRect(ex+a,FW-a-w,10-2*a,w);g.fillRect(ex+a,a,w,FW-2*a);g.fillRect(ex+10-a-w,a,w,FW-2*a);g.globalAlpha=1;
  }
  bakeLight(g,st,wk,Wc,Hc);
  /* paint: 6-ft border, goal lines, yard lines, yard ticks at the sidelines and hashes, PAT marks, numbers + arrows */
  WS();g.fillStyle=night?'rgba(255,255,255,.9)':'rgba(255,255,255,.94)';
  g.fillRect(-2,-2,124,2);g.fillRect(-2,FW,124,2);g.fillRect(-2,0,2,FW);g.fillRect(120,0,2,FW);
  const lw=Math.max(.11,1.5/ppy),gl=Math.max(.22,2.4/ppy);
  for(let x=10;x<=110;x+=5){const w=x===10||x===110?gl:lw;g.fillRect(x-w/2,0,w,FW)}
  for(let x=11;x<110;x++){if(x%5===0)continue;for(const a of [.11,HASH1-.33,HASH2-.33,FW-.78])g.fillRect(x-lw/2,a,lw,.67)}
  for(let x=15;x<110;x+=5)for(const hy of [HASH1,HASH2])g.fillRect(x-.36,hy-lw/2,.72,lw);
  for(const px of [13,107])g.fillRect(px-lw/2,CEN-.5,lw,1);
  for(let x=20;x<=100;x+=10){const ds=String(x<=60?x-10:110-x);
    for(const far of [0,1]){const yy=far?8:FW-8;g.setTransform(ppy,0,0,pv,(x-x0)*ppy,(yy-y0)*pv);if(far)g.rotate(Math.PI);fieldDigits(g,ds);
      if(x!==60){WS();const d=x<60?-1:1,bx=x+d*1.9,cy=far?yy+.45:yy-.45;g.beginPath();g.moveTo(bx,cy-.42);g.lineTo(bx,cy+.42);g.lineTo(bx+d*.72,cy);g.closePath();g.fill()}}}
  WS();for(const sx of [35,85]){g.fillStyle='rgba(255,255,255,.85)';starPath(g,sx,CEN,1.25);g.fillStyle=t.c1;starPath(g,sx,CEN,.95)}
  if(night){g.globalCompositeOperation='lighter';g.fillStyle='rgba(255,255,255,.045)';for(let x=10;x<=110;x+=5)g.fillRect(x-.35,0,.7,FW);g.globalCompositeOperation='source-over'}
  fieldBadge(g,t);
  /* grain over everything (paint included, so the paint reads as painted on grass) */
  g.setTransform(1,0,0,1,0,0);g.fillStyle=g.createPattern(grainTile(),'repeat');g.globalAlpha=night?.7:.9;g.fillRect(0,0,Wc,Hc);g.scale(1.37,1.37);g.globalAlpha=.55;g.fillRect(0,0,Wc/1.37+1,Hc/1.37+1);
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
  buildSurf(t,wk,art);
}
function bakeLight(g,st,wk,Wc,Hc){
  const {x0,y0,ppy}=FLD,pv=ppy*VY,fx=x=>(x-x0)*ppy,fy=y=>(y-y0)*pv;g.setTransform(1,0,0,1,0,0);
  const op=(o,col,a)=>{g.globalCompositeOperation=o;g.globalAlpha=a==null?1:a;g.fillStyle=col;g.fillRect(0,0,Wc,Hc);g.globalAlpha=1};
  const glow=(pts,col,sx)=>{for(const [lx,ly,rr,a] of pts){const cx=fx(lx),cy=fy(ly),R=rr*ppy,gr=g.createRadialGradient(0,0,0,0,0,R);gr.addColorStop(0,`rgba(${col},${a})`);gr.addColorStop(1,`rgba(${col},0)`);g.setTransform(sx||1,0,0,1,cx,cy);g.fillStyle=gr;g.fillRect(-R,-R,2*R,2*R)}g.setTransform(1,0,0,1,0,0)};
  if(wk!=='dry')op('saturation','#808080',wk==='wet'?.28:.38);
  if(wk==='wet')op('multiply','#b4bec4');else if(wk==='snow')op('multiply','#dfe4ea');
  if(st==='late')op('multiply','#fff0da');
  if(st==='sunset'){op('multiply','#ffd3a8');g.globalCompositeOperation='source-over';const gr=g.createLinearGradient(0,fy(-6),0,fy(20));gr.addColorStop(0,'rgba(30,14,40,.42)');gr.addColorStop(.7,'rgba(30,14,40,.26)');gr.addColorStop(1,'rgba(30,14,40,0)');g.fillStyle=gr;g.fillRect(0,0,Wc,fy(20))}
  if(st==='night'){op('multiply','#6f7b96');g.globalCompositeOperation='lighter';glow([[22,-9,44,.17],[98,-9,44,.17],[22,FW+9,44,.17],[98,FW+9,44,.17],[60,CEN,50,.09]],'255,244,222')}
  if(wk==='wet'){g.globalCompositeOperation='screen';glow([[30,7,13,.13],[90,7,13,.13],[60,FW-11,15,.11],[18,FW-6,10,.1],[102,FW-6,10,.1]],'205,220,240',2.6)}
  g.globalCompositeOperation='source-over';g.globalAlpha=1;
}
function fieldBadge(g,t){
  const {x0,y0,ppy}=FLD,pv=ppy*VY,img=typeof teamLogo==='function'?teamLogo(t):null;
  g.setTransform(ppy,0,0,pv,(60-x0)*ppy,(CEN-y0)*pv);
  if(img){try{const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height,k=Math.min(11/iw,8.5/ih);g.globalAlpha=.95;g.drawImage(img,-iw*k/2,-ih*k/2,iw*k,ih*k);g.globalAlpha=1;return}catch(e){g.globalAlpha=1}}
  /* generated monogram shield (never a real logo) */
  const r=4.1,sh=k=>{g.beginPath();g.moveTo(-r*k,-r*.9*k);g.quadraticCurveTo(0,-r*1.1*k,r*k,-r*.9*k);g.lineTo(r*k,r*.15*k);g.quadraticCurveTo(r*.92*k,r*.82*k,0,r*1.18*k);g.quadraticCurveTo(-r*.92*k,r*.82*k,-r*k,r*.15*k);g.closePath()};
  g.globalAlpha=.95;g.fillStyle='#FFFFFF';sh(1.08);g.fill();g.fillStyle=t.c2;sh(1);g.fill();g.fillStyle=t.c1;sh(.86);g.fill();
  g.fillStyle=contrasty(t.c1,t.c2)?t.c2:inkOn(t.c1);g.globalAlpha=.9;starPath(g,-r*.55,-r*.58,r*.12);starPath(g,0,-r*.66,r*.12);starPath(g,r*.55,-r*.58,r*.12);
  g.setTransform(1,0,0,VY,(60-x0)*ppy,(CEN-y0)*pv);g.globalAlpha=1;
  const ab=String(t.abbr||'').slice(0,4),n=ab.length;let fs=ppy*r*(n<=2?1.15:n===3?.9:.72);g.font=`italic 900 ${fs}px ${FFONT}`;const mw=g.measureText(ab).width,maxw=ppy*r*1.55;if(mw>maxw){fs*=maxw/mw;g.font=`italic 900 ${fs}px ${FFONT}`}
  const ink=contrasty(t.c1,t.c2)?t.c2:inkOn(t.c1);g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=fs*.1;g.strokeStyle=lum(ink)>.5?shade(t.c1,-.55):'#FFFFFF';
  g.strokeText(ab,0,ppy*r*.12);g.fillStyle=ink;g.fillText(ab,0,ppy*r*.12);
}
function buildSurf(t,wk,art){
  const k=t.id+wk+art;if(FLD.surfKey===k&&FLD.surf)return;FLD.surfKey=k;FLD.wk=wk;
  const q=3,{x0,y0,x1,y1}=FLD,n=FLD.surf||(FLD.surf=document.createElement('canvas'));n.width=Math.ceil((x1-x0)*q);n.height=Math.ceil((y1-y0)*q*VY);
  const g=n.getContext('2d'),r=fRng(t.id*31+(wk==='snow'?7:wk==='wet'?3:1));g.setTransform(q,0,0,q*VY,-x0*q,-y0*q*VY);
  const blob=(x,y,rx,ry,col)=>{g.fillStyle=col;g.beginPath();g.ellipse(x,y,rx,ry,0,0,7);g.fill()};
  if(wk==='snow'){g.fillStyle='rgba(236,240,246,.66)';g.fillRect(x0,y0,x1-x0,y1-y0);for(let i=0;i<1300;i++)blob(x0+r()*(x1-x0),y0+r()*(y1-y0),.3+r()*1.1,.25+r()*.8,`rgba(250,252,255,${(.08+r()*.2).toFixed(2)})`);
    g.globalCompositeOperation='destination-out';for(let i=0;i<600;i++)blob(12+r()*96,CEN+(r()-.5)*(HASH2-HASH1+14)*(.5+.7*r()),.3+r()*1.1,.25+r()*.7,`rgba(0,0,0,${(.08+r()*.2).toFixed(2)})`);g.globalCompositeOperation='source-over'}
  else{const col=wk==='wet'&&!art?'70,48,26':'118,98,58';
    for(let i=0;i<1500;i++){const x=11+r()*98,c=1-Math.abs(x-60)/52;if(r()>c*c*.9+.12)continue;blob(x,CEN+(r()-.5)*(HASH2-HASH1+9)*(.55+.7*r()),.3+r()*1.2,.25+r()*.9,`rgba(${col},${(.1+r()*.26).toFixed(2)})`)}
    for(const gx of [13,107])for(let i=0;i<160;i++)blob(gx+(r()-.5)*7,CEN+(r()-.5)*9,.3+r(),.25+r()*.7,`rgba(${col},${(.1+r()*.25).toFixed(2)})`)}
}
/* blit the cached field (only the visible part), then wear/snow and scuffs */
function drawField(c,s,now){
  ensureField();const {x0,y0,x1,y1}=FLD,hw=W/2/s,m=midY(),q=FLD.ppy,qv=q*VY;
  const xa=Math.max(x0,cam.x-hw-1),xb=Math.min(x1,cam.x+hw+1),ya=Math.max(y0,cam.y-m/(s*VY)-1),yb=Math.min(y1,cam.y+(H-m)/(s*VY)+1);
  if(xa>cam.x-hw-1||xb<cam.x+hw+1||yb<cam.y+(H-m)/(s*VY)+1){c.fillStyle=FLD.out;fieldPath(c,-80,y0,200,FW+120)}
  if(xb>xa&&yb>ya)c.drawImage(FLD.cv,(xa-x0)*q,(ya-y0)*qv,(xb-xa)*q,(yb-ya)*qv,X(xa),Y(ya),(xb-xa)*s,(yb-ya)*s*VY);
  if(FLD.surf){const p=progress(),wk=FLD.wk;let a=wk==='snow'?.3+p*.55:wk==='wet'?.3+p*.7:p*.9;if(FLD.art&&wk!=='snow')a*=.35;
    if(a>.02){c.save();c.globalAlpha=Math.min(1,a);if(!uOff()){c.translate(2*X(60),0);c.scale(-1,1)}c.drawImage(FLD.surf,X(x0),Y(y0),(x1-x0)*s,(y1-y0)*s*VY);c.restore()}}
  drawWear(c,s);
}
/* TV-style line painted under the players: soft halo + solid core + bright center */
function tvLine(c,x,col,s){
  const px=X(x);if(px<-30||px>W+30)return;const t=Y(0),h=Y(FW)-t,w=Math.max(2,s*.24),gl=sceneLight().glow;
  c.fillStyle=col;c.globalAlpha=.16+.14*gl;c.fillRect(px-w*1.7,t,w*3.4,h);c.globalAlpha=.92;c.fillRect(px-w/2,t,w,h);c.fillStyle='#FFFFFF';c.globalAlpha=.3;c.fillRect(px-w*.14,t,w*.28,h);c.globalAlpha=1;
}
/* 2.5D goal posts: padded base behind the end line, gooseneck, crossbar slanted in depth, tall uprights, wind ribbons */
function drawGoalposts(c,s,now){
  const L=sceneLight(),wm=S.wind?clamp(S.wind.mph/16,0,1):0,wxv=typeof windX==='function'?windX():0,wyv=typeof windY==='function'?windY()*VY:0,hgt=s*4.1,up=s*7.2,lw=Math.max(2,s*.2);
  c.save();c.lineCap='round';c.lineJoin='round';
  for(const gx of [0,120]){const px=X(gx);if(px<-s*14||px>W+s*14)continue;
    const d=gx?1:-1,r0=clamp((px-W/2)/(W*.5),-1,1),rel=Math.abs(r0)<.6?(r0<0?-.6:.6):r0,ox=yy=>(yy-CEN)*rel*s*.8;
    const gy=Y(CEN),cx=px,bx=X(gx+d*1.3),ay=Y(CEN-3.08),by=Y(CEN+3.08),a={x:px+ox(CEN-3.08),y:ay-hgt},b={x:px+ox(CEN+3.08),y:by-hgt};
    if(L.n===1){const k=L.len*.8,sx=L.sx*k,sy=L.sy*k;c.strokeStyle=`rgba(0,0,0,${(L.a*.6).toFixed(3)})`;c.lineWidth=lw;c.beginPath();
      c.moveTo(bx,gy);c.lineTo(cx+sx*hgt,gy+sy*hgt);c.moveTo(a.x+sx*hgt,ay+sy*hgt);c.lineTo(b.x+sx*hgt,by+sy*hgt);
      c.moveTo(a.x+sx*hgt,ay+sy*hgt);c.lineTo(a.x+sx*(hgt+up),ay+sy*(hgt+up));c.moveTo(b.x+sx*hgt,by+sy*hgt);c.lineTo(b.x+sx*(hgt+up),by+sy*(hgt+up));c.stroke()}
    const pw=Math.max(3,s*.42),ph=s*1.6;c.fillStyle=hostT().c1;c.fillRect(bx-pw/2,gy-ph,pw,ph);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(bx-pw/2,gy-ph,pw*.3,ph);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(bx+pw*.2,gy-ph,pw*.3,ph);
    const path=o=>{c.beginPath();c.moveTo(bx+o,gy-ph*.9);c.lineTo(bx+o,gy-hgt*.72);c.quadraticCurveTo(bx+o,gy-hgt+o,cx,gy-hgt+o);c.moveTo(a.x+o,a.y);c.lineTo(b.x+o,b.y);c.moveTo(a.x+o,a.y);c.lineTo(a.x+o,a.y-up);c.moveTo(b.x+o,b.y);c.lineTo(b.x+o,b.y-up)};
    path(0);if(L.glow>.5){c.strokeStyle='rgba(242,194,48,.16)';c.lineWidth=lw*3.2;c.stroke()}
    c.strokeStyle='#8a6a12';c.lineWidth=lw+2;c.stroke();c.strokeStyle='#F2C230';c.lineWidth=lw;c.stroke();
    path(-lw*.25);c.strokeStyle='rgba(255,241,170,.8)';c.lineWidth=Math.max(1,lw*.3);c.stroke();
    c.strokeStyle='#E8442B';c.lineWidth=Math.max(1.5,s*.13);
    for(let i=0;i<2;i++){const p=i?b:a,tx=p.x,ty=p.y-up,fl=Math.sin(now/110+i*1.7+gx),ang=Math.atan2(lerp(1,wyv,wm),lerp(0,wxv,wm))+fl*.3*(.3+wm),ln=s*(.9+.35*wm);
      c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(tx+Math.cos(ang+fl*.35)*ln*.55,ty+Math.sin(ang+fl*.35)*ln*.55,tx+Math.cos(ang)*ln,ty+Math.sin(ang)*ln);c.stroke()}
  }
  c.restore();
}
/* full-screen color grade: tint + fog/haze + vignette in one cached layer (one blit per frame) */
function drawGrade(c){
  const st=lightStage(),wk=wxKind(),k=st+wk;if(FLD.gradeKey!==k||!FLD.grade){FLD.gradeKey=k;FLD.grade=buildGrade(st,wk)}
  let a=1;if(st==='sunset')a=.55+.45*Math.sin(clamp((progress()-.35)/.31,0,1)*Math.PI);
  c.globalAlpha=a;c.drawImage(FLD.grade,0,0,W,H);c.globalAlpha=1;
}
function buildGrade(st,wk){
  const n=FLD.grade||document.createElement('canvas'),Z=192;n.width=n.height=Z;const g=n.getContext('2d');g.clearRect(0,0,Z,Z);
  const tint={day:'',late:'rgba(255,196,130,.05)',sunset:'rgba(255,128,48,.12)',night:'rgba(24,40,96,.12)'}[st];if(tint){g.fillStyle=tint;g.fillRect(0,0,Z,Z)}
  if(wk==='wet'){g.fillStyle='rgba(20,30,45,.12)';g.fillRect(0,0,Z,Z)}
  if(wk!=='dry'){const fg=g.createLinearGradient(0,0,0,Z),fc=wk==='snow'?'228,232,240':'150,160,176';fg.addColorStop(0,`rgba(${fc},.34)`);fg.addColorStop(.45,`rgba(${fc},.08)`);fg.addColorStop(1,`rgba(${fc},0)`);g.fillStyle=fg;g.fillRect(0,0,Z,Z)}
  if(st==='sunset'){const sg=g.createRadialGradient(Z*.88,0,0,Z*.88,0,Z*.8);sg.addColorStop(0,'rgba(255,170,90,.24)');sg.addColorStop(1,'rgba(255,170,90,0)');g.fillStyle=sg;g.fillRect(0,0,Z,Z)}
  const va={day:.28,late:.32,sunset:.38,night:.55}[st]+(wk==='dry'?0:.06),vg=g.createRadialGradient(Z/2,Z*.54,Z*.26,Z/2,Z*.54,Z*.76);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${va})`);g.fillStyle=vg;g.fillRect(0,0,Z,Z);
  return n;
}
