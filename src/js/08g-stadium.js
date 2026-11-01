/* =========================================================
   08g · Stadium & crowd (modern style)
   Far stands rise above the far sideline as a stack measured in s (screen px per yard) up from Y(-6):
   padded wall + LED ribbon board, lower deck, club band (ribbon + suites), upper deck, rim, press box at
   midfield and four light towers (lit to match sceneLight().glow). End-zone stands sit beyond the end lines,
   sheared so the fans stay upright; the band plays in one of them. Team benches (players in uniform, coaches
   with headsets) stand behind both sidelines and are drawn from 08c drawSideline.
   Everything static lives in offscreen canvases (STAD.T), rebuilt only when host/colors/light/scale/crowd
   change and never during a live play. Per frame the decks are blitted in 3-yard chunks, each picking a
   seated or standing copy of the same fans plus a small bounce: that is the whole crowd animation (roars,
   the wave, the visitors' pocket cheering alone). fx events drive reactions and ribbon messages.
   Graphics quality (gfxQ) 'saver': whole-tile blits, no bounce, no phone lights or flashbulbs.
   Real stadium designs (t.std from an imported stadiums file, 02c): STAD.G holds the far-stand geometry (decks and rows from the
   design and capacity); the camera sits across from the press box, so the press-box stands are the far stands and t.std L/R are
   the ends on screen (mirrored while the user defends, see stdEnd). Non-bowl stands stop at the corners where an end is not a full
   deck, showing the sky/backdrop strip (mountains, skyline, trees, water: one cached parallax tile) and the landmark. End codes draw
   large/medium/small end stands, a grass hill, a building or nothing; features add hedges, checkerboard end zones (08f), colored
   turf, card stunts, pyro, a dome roof, a canopy, arches and the video board. No t.std (or the setting off): the generic stadium.
   ========================================================= */
const ST={wall:1,loN:8,loH:.55,club:1.3,upN:7,upH:.48,rim:.4,press:2.4,tile:24,x0:-12,ck:3,ez:7.6};
const SK=(()=>{const loB=ST.wall,loT=loB+ST.loN*ST.loH,clT=loT+ST.club,upT=clT+ST.upN*ST.upH;return {loB,loT,clT,upT,rimT:upT+ST.rim}})();
const STAD={key:'',chk:0,ppu:0,T:null,G:null,sd:null,roar:0,hush:0,flashT:0,waveX:-99,msg:'',msgT:0,rb:{},jump:new Map(),lt:0,dots:null,pyroT:0,brdKey:'',bandReal:-1,lmReal:1};
const TOWERS=[-6,36,84,126];
const stadHi=()=>!(LG&&LG.settings.gfxQ==='saver');
const stadPPU=()=>clamp(Math.round(sc*zoomMul()*DPR),8,44);
const stadStunt=()=>!!(S.game&&(S.game.rival||S.slot==='Primetime'));
const stadAway=()=>hostT()===S.home?S.away:S.home;
const stadAlt=t=>contrasty(t.c1,t.c2)?t.c2:lum(t.c1)>.5?'#1d2129':'#F2F3F5';
const stadCv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c};
const stadH01=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
/* ---------- real stadium designs ---------- */
function stdOf(t){t=t||(S.home?hostT():null);return t&&t.std&&t.std.v===1&&!S.neutral&&!(typeof LG!=='undefined'&&LG&&LG.settings&&LG.settings.realStadiums===false)?t.std:null}
function stdHas(sd,f){return !!(sd&&sd.ft&&sd.ft.indexOf(f)>=0)}
function stdIndoor(){const sd=S.home?stdOf():null;return !!(sd&&sd.rf)}
/* end code on screen side -1 (left) / 1 (right): the picture is mirrored while the user defends */
function stdEnd(sd,side){return (uOff()?side:-side)<0?sd.L:sd.R}
const stdSeated=c=>c==='L'||c==='M'||c==='S',STD_ROWS={L:14,M:9,S:4};
function stadGeo(sd){
  if(!sd)return {loN:ST.loN,upN:ST.upN,d:2,loB:SK.loB,loT:SK.loT,clT:SK.clT,mdT:0,c2T:0,upT:SK.upT,rimT:SK.rimT,pw:36};
  const cap=sd.cap||40000,d=sd.d,loN=d===1?clamp(Math.round(6+cap/9000),7,16):clamp(Math.round(5+cap/25000),6,10),upN=clamp(Math.round(3+cap/14000),4,10);
  const loB=ST.wall,loT=loB+loN*ST.loH;let clT=loT,mdT=0,c2T=0,upT=loT;
  if(d>=2){clT=loT+ST.club;upT=clT+upN*ST.upH}
  if(d===3){mdT=upT;c2T=mdT+ST.club*.85;upT=c2T+upN*ST.upH}
  return {loN,upN,d,loB,loT,clT,mdT,c2T,upT,rimT:upT+ST.rim,pw:cap<26000?24:cap<45000?30:36};
}
function stadKey(){const h=hostT(),a=stadAway(),sd=stdOf(h);return [h.id,h.c1,h.c2,h.city,a.id,a.c1,a.c2,crowdTheme(),Math.round(crowdEmpty()*10),lightStage(),wxKind(),stadPPU(),stadStunt()?1:0,uniColors(S.home).j,uniColors(S.away).j,UNI_VER,sd?JSON.stringify(sd):''].join('|')}
function ensureStadium(){if(STAD.T&&(++STAD.chk%15))return;if(STAD.T&&S.phase==='live')return;const k=stadKey();if(k!==STAD.key||!STAD.T){STAD.key=k;buildStadium()}}
function buildStadium(){
  STAD.ppu=stadPPU();const sd=STAD.sd=stdOf(),G=STAD.G=stadGeo(sd),T={},lit=sceneLight().glow>.25,r=fRng(hostT().id*31+7);
  T.lo0=crowdTile('lo','main',0);T.lo1=crowdTile('lo','main',1);T.su0=crowdTile('lo','stu',0);T.su1=crowdTile('lo','stu',1);
  T.up0=crowdTile('up','up',0);T.up1=crowdTile('up','up',1);T.vi0=crowdTile('up','vis',0);T.vi1=crowdTile('up','vis',1);
  T.club=clubTile();T.press=pressTile(G.pw);T.tow=towerTile(lit);T.glow=STAD.T&&STAD.T.glow||glowTile();
  if(!sd){T.end=endTile(false);T.band=endTile(true)}
  else{/* the band sits in a seated end (left first), end tiles only for the codes this stadium uses */
    STAD.bandReal=stdSeated(sd.L)?-1:stdSeated(sd.R)?1:0;
    for(const c of [sd.L,sd.R]){const n='e'+c;if(T[n])continue;if(stdSeated(c))T[n]=endTile(false,STD_ROWS[c]);else if(c==='B')T[n]=endTile(false,8,'berm');else if(c==='X')T[n]=endTile(false,6,'bldg')}
    if(STAD.bandReal)T.band=endTile(true,STD_ROWS[STAD.bandReal<0?sd.L:sd.R]);
    const op=[sd.L,sd.R].map(c=>c==='O'||c==='B');STAD.lmReal=op[0]?-1:op[1]?1:sd.bd==='R'?-1:1;
    T.bk=backdropTile(sd,G);if(stdHas(sd,'tower'))T.lm=landmarkTile(G);if(stdHas(sd,'arches'))T.arch=archTile();
    if(sd.rf)T.roof=roofTile();if(stdHas(sd,'hedges'))T.hedge=hedgeTile();if(stdHas(sd,'pyro'))T.flame=flameTile();STAD.brdKey=''}
  T.bn=benchTile(S.home,true);T.bf=benchTile(S.away,false);
  STAD.dots=Array.from({length:44},()=>({u:r()*ST.tile,v:.12+r()*.8,up:r()<.45,ph:r()*6.28,f:.6+r()*.9,p:r()}));
  STAD.T=T;STAD.rb={};
}
/* one fan, x,y = seat level; up: 0 seated, 1 standing arms up, 2 standing clapping */
function stadFan(g,x,y,P,sh,sk,hat,up){
  const bw=.4*P,hr=.11*P,top=y-.3*P-(up?.14*P:0),sy=top+bw*.25;
  g.fillStyle=sh;g.fillRect(x-bw/2,sy,bw,y-sy);g.beginPath();g.ellipse(x,sy,bw/2,bw*.25,0,Math.PI,0);g.fill();
  g.fillStyle='rgba(0,0,0,.2)';g.fillRect(x+bw*.18,sy,bw*.32,y-sy);
  if(up===1){g.strokeStyle=sh;g.lineWidth=.08*P;g.lineCap='round';g.beginPath();g.moveTo(x-bw*.36,sy+.03*P);g.lineTo(x-bw*.62,top-.2*P);g.moveTo(x+bw*.36,sy+.03*P);g.lineTo(x+bw*.62,top-.2*P);g.stroke()}
  else if(up===2){g.fillStyle=sk;g.fillRect(x-.05*P,sy+.05*P,.1*P,.08*P)}
  g.fillStyle=sk;g.beginPath();g.arc(x,top-hr*.6,hr,0,6.283);g.fill();
  if(hat){g.fillStyle=hat;g.fillRect(x-hr*1.1,top-hr*1.55,hr*2.2,hr*.8)}
}
/* a 24-yard crowd tile (40 seat columns, an aisle every 10th); variant up=1 stands the same fans up */
function crowdTile(deck,mode,up){
  const G=STAD.G||stadGeo(null),P=STAD.ppu,lo=deck==='lo',n=lo?G.loN:G.upN,rh=(lo?ST.loH:ST.upH)*P,hr=.6*P,W0=Math.round(ST.tile*P),H0=Math.ceil(n*rh+hr),cv=stadCv(W0,H0),g=cv.getContext('2d');
  const h=hostT(),a=stadAway(),r=fRng(h.id*131+a.id*7+(lo?11:23)+mode.length*101),th=crowdTheme(),em=crowdEmpty(),st=lightStage(),night=st==='night',sw=.6*P,alt=stadAlt(h),sd=STAD.sd;
  if(lo&&mode==='main'&&stadStunt())mode='stunt';if(mode==='stu'&&stdHas(sd,'cards'))mode='cards';
  const ss=sd&&sd.sc,sq=Array.isArray(ss)?ss:ss==='metal'?['#9aa2ac','#848c96']:ss==='primary'?[shade(h.c1,-.25),shade(h.c1,-.4)]:null;
  const hs=h.stad||{},sA=hs.s1||(sq&&sq[0])||shade(h.c1,-.5),sB=hs.s2||(sq&&sq[1])||(lum(h.c2)>.8?'#555b66':shade(h.c2,-.45)),con=night?'#232a35':'#646b76',conD=night?'#141921':'#40464f';
  const mix=[h.c1,h.c1,h.c1,h.c1,h.c1,h.c2,alt,'#F2F3F5','#F2F3F5','#23272f','#2f3541','#6b7380',a.c1,'#3b5b8a','#8a3b3b','#c9b48a'],neon=['#39ff88','#ff3cac','#2de2ff',h.c1],tones=[...TONES,'#5C3A21'];
  const pickC=(b,q,j)=>mode==='vis'?(b<.55?a.c1:b<.75?stadAlt(a):mix[b*16|0])
    :mode==='stu'?(th==='white'?(b<.93?'#F2F3F5':h.c1):th==='black'?(b<.93?'#121418':h.c1):th==='stripe'?(b<.92?(j%2?h.c1:alt):'#F2F3F5'):th==='neon'?neon[b*4|0]:(b<.8?h.c1:alt))
    :mode==='stunt'?(b<.88?(q%2?alt:h.c1):mix[b*16|0])
    :mode==='cards'?(b<.95?((((q*10+j)>>2)+(j>>1))%2?alt:h.c1):'#F2F3F5'):mix[b*16|0];
  for(let j=0;j<n;j++){const y0=hr+j*rh;
    g.fillStyle=conD;g.fillRect(0,y0,W0,rh);g.fillStyle=con;g.fillRect(0,y0+rh*.72,W0,rh*.28);
    for(let q=0;q<4;q++){g.fillStyle=q%2?sB:sA;g.fillRect(q*10*sw+sw,y0+rh*.42,9*sw,rh*.3)}
    for(let i=0;i<40;i++){const v0=r(),v1=r(),v2=r(),v3=r(),v4=r(),v5=r();if(i%10===0)continue;const q=i/10|0;
      if(v0<.025+em*(mode==='stu'?.45:1))continue;
      const stand=mode==='cards'?2:up?(v5<.85?(v5<.6?1:2):0):(mode==='stu'&&v5<.6)||v5<.03?2:0;
      stadFan(g,(i+.5)*sw+(j%2?.07:-.07)*P+(v4-.5)*.04*P,y0+rh*.8,P*(lo?1:.92),pickC(v1,q,j),tones[v2*5|0],v3<.16?(v3<.08?h.c1:'#23272f'):null,stand)}}
  /* aisles: stairs with yellow nosings and a center handrail; front rail */
  const ln=Math.max(1,.03*P);
  for(let q=0;q<4;q++){const x=q*10*sw+.1*P,aw=sw-.2*P;g.fillStyle=con;g.fillRect(x,hr,aw,H0-hr);
    for(let j=0;j<n;j++){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,hr+j*rh,aw,Math.max(1,rh*.14));g.fillStyle='rgba(235,200,60,.65)';g.fillRect(x,hr+(j+1)*rh-Math.max(1,rh*.08),aw,Math.max(1,rh*.06))}
    g.fillStyle='rgba(225,230,238,.75)';g.fillRect(x+aw/2-ln/2,hr-.12*P,ln,H0-hr+.12*P)}
  g.fillStyle='rgba(225,230,238,.7)';g.fillRect(0,H0-ln*1.6,W0,ln);
  /* light: overhang shadow by day, field-light falloff at night, distance haze, wet haze */
  g.globalCompositeOperation='source-atop';const lg=g.createLinearGradient(0,hr,0,H0);
  if(night){lg.addColorStop(0,`rgba(3,6,14,${lo?.58:.7})`);lg.addColorStop(1,`rgba(3,6,14,${lo?.1:.34})`)}else{lg.addColorStop(0,`rgba(0,0,0,${lo?.42:.34})`);lg.addColorStop(.45,'rgba(0,0,0,0)');lg.addColorStop(1,'rgba(0,0,0,0)')}
  g.fillStyle=lg;g.fillRect(0,0,W0,H0);
  if(st==='sunset'){g.fillStyle='rgba(255,140,70,.1)';g.fillRect(0,0,W0,H0)}
  if(!lo&&!night){g.fillStyle='rgba(150,170,200,.08)';g.fillRect(0,0,W0,H0)}
  if(wxKind()!=='dry'){g.fillStyle='rgba(120,130,148,.14)';g.fillRect(0,0,W0,H0)}
  g.globalCompositeOperation='source-over';cv.hr=hr;return cv;
}
/* club level: ribbon-board housing on top, suite glass (people inside, lit at night), host-color trim */
function clubTile(){
  const P=STAD.ppu,W0=Math.round(ST.tile*P),H0=Math.ceil(ST.club*P),cv=stadCv(W0,H0),g=cv.getContext('2d'),h=hostT(),night=lightStage()==='night',r=fRng(h.id+5);
  const wy=.51*P,wh=H0-wy-.16*P;g.fillStyle='#0b0e13';g.fillRect(0,0,W0,H0);
  const gg=g.createLinearGradient(0,wy,0,wy+wh);if(night){gg.addColorStop(0,'#6b5636');gg.addColorStop(1,'#e2bf80')}else{gg.addColorStop(0,'#1c2532');gg.addColorStop(1,'#4a5e74')}g.fillStyle=gg;g.fillRect(0,wy,W0,wh);
  g.fillStyle=night?'rgba(46,32,18,.6)':'rgba(10,14,20,.4)';for(let i=0;i<50;i++){if(r()<.3)continue;const x=r()*W0,hh=wh*(.38+r()*.25);g.fillRect(x,wy+wh-hh,.16*P,hh);g.beginPath();g.arc(x+.08*P,wy+wh-hh-.05*P,.07*P,0,7);g.fill()}
  g.fillStyle='#0b0e13';for(let x=0;x<W0;x+=1.2*P)g.fillRect(x,wy,Math.max(1,.06*P),wh);
  if(!night){g.fillStyle='rgba(255,255,255,.09)';for(let x=0;x<W0;x+=4.8*P){g.beginPath();g.moveTo(x,wy+wh);g.lineTo(x+.8*P,wy);g.lineTo(x+1.4*P,wy);g.lineTo(x+.6*P,wy+wh);g.fill()}}
  g.fillStyle=h.c1;g.fillRect(0,H0-.16*P,W0,.16*P);g.fillStyle='rgba(255,255,255,.2)';g.fillRect(0,H0-.16*P,W0,Math.max(1,.03*P));
  return cv;
}
function pressTile(pw){
  const P=STAD.ppu,W0=Math.round((pw||36)*P),H0=Math.ceil(ST.press*P),cv=stadCv(W0,H0),g=cv.getContext('2d'),h=hostT(),night=lightStage()==='night';
  g.fillStyle=night?'#2a303a':'#aeb4bd';g.fillRect(2*P,.25*P,W0-4*P,H0-.25*P);g.fillStyle=night?'#1d222a':'#8d939c';g.fillRect(0,.6*P,2.2*P,H0-.6*P);g.fillRect(W0-2.2*P,.6*P,2.2*P,H0-.6*P);
  g.fillStyle=shade(h.c1,-.15);g.fillRect(2*P,.25*P,W0-4*P,.55*P);g.fillStyle=inkOn(h.c1);g.font=`900 italic ${Math.round(.42*P)}px ${FFONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(h.city||h.name).toUpperCase(),W0/2,.54*P,W0-6*P);
  for(let k=0;k<2;k++){const y=.95*P+k*.7*P,gg=g.createLinearGradient(0,y,0,y+.5*P);if(night){gg.addColorStop(0,'#f3d9a0');gg.addColorStop(1,'#b48a4e')}else{gg.addColorStop(0,'#2a3a4c');gg.addColorStop(1,'#56708a')}g.fillStyle=gg;g.fillRect(2.3*P,y,W0-4.6*P,.5*P);
    g.fillStyle=night?'#2a303a':'#7d838c';for(let x=2.3*P;x<W0-2.3*P;x+=1.1*P)g.fillRect(x,y,Math.max(1,.05*P),.5*P)}
  return cv;
}
function towerTile(lit){
  const P=STAD.ppu,W0=Math.ceil(4*P),H0=Math.ceil(1.6*P),cv=stadCv(W0,H0),g=cv.getContext('2d');g.fillStyle='#2b3038';g.fillRect(0,0,W0,H0);
  for(let j=0;j<3;j++)for(let i=0;i<7;i++){const x=(i+.5)*W0/7,y=(j+.5)*H0/3;g.fillStyle=lit?'#fff3cf':'#8d96a1';g.beginPath();g.arc(x,y,.2*P,0,7);g.fill();if(lit){g.fillStyle='#ffffff';g.beginPath();g.arc(x,y,.1*P,0,7);g.fill()}}
  return cv;
}
/* ---------- real-stadium pieces (built with the stadium; the backdrop/roof at half resolution: they are far away) ---------- */
/* backdrop strip 96 yd wide, horizon at the bottom; ridges are integer-period sines and trees wrap, so it tiles seamlessly */
function backdropTile(sd,G){
  const f=['mountains','skyline','trees','water'].filter(x=>stdHas(sd,x)),open=sd.sh!=='bowl'&&(sd.L!=='L'||sd.R!=='L');
  if(!f.length&&!open)return null;if(!f.length)f.push('trees');
  const q=Math.max(4,Math.round(STAD.ppu*.5)),WY=96,mh=Math.max(8,G.rimT+5),top=f.includes('mountains')?mh:f.includes('skyline')?G.rimT+4:5,HY=Math.ceil(Math.max(6,top+1));
  const cv=stadCv(WY*q,HY*q),g=cv.getContext('2d'),st=lightStage(),night=st==='night',sun=st==='sunset',r=fRng(hostT().id*53+11),B=HY*q,yy=v=>B-v*q,tau=Math.PI*2;
  const ridge=(amp,base,col,ph)=>{g.fillStyle=col;g.beginPath();g.moveTo(0,B);for(let x=0;x<=WY;x+=.5){const v=base+amp*(.5*Math.sin(tau*2*x/WY+ph)+.28*Math.sin(tau*5*x/WY+ph*2.3)+.14*Math.sin(tau*11*x/WY+ph*1.7)+.08*Math.sin(tau*23*x/WY+ph*.6));g.lineTo(x*q,yy(v))}g.lineTo(WY*q,B);g.closePath();g.fill()};
  if(f.includes('mountains')){const c1=night?'#121a29':sun?'#6c5873':st==='late'?'#8d97ad':'#8ea2bc',c2=night?'#0b111c':sun?'#4a3d57':st==='late'?'#68748c':'#647a95';
    ridge(mh*.42,mh*.56,c1,r()*6);if(sd.el>=4500&&!night){g.save();g.globalCompositeOperation='source-atop';g.fillStyle='rgba(240,245,252,.85)';g.fillRect(0,0,WY*q,yy(mh*.84));g.restore()}
    ridge(mh*.24,mh*.3,c2,r()*6)}
  if(f.includes('skyline'))for(let i=0;i<26;i++){const dx=(r()-.5)*36*(.4+r()*.6),x=WY/2+dx,w=1.4+r()*2.6,ht=(2.5+r()*(G.rimT+3))*(1-Math.abs(dx)/26);
    g.fillStyle=night?(i%2?'#151b27':'#1b2231'):sun?(i%2?'#4e4660':'#5a5270'):(i%2?'#6f7d93':'#7d8ba1');g.fillRect((x-w/2)*q,yy(ht),w*q,ht*q);
    g.fillStyle=night?'rgba(255,220,140,.75)':'rgba(255,255,255,.18)';for(let wy=.6;wy<ht-.4;wy+=.7)for(let wx=.3;wx<w-.3;wx+=.55)if(r()<(night?.45:.3))g.fillRect((x-w/2+wx)*q,yy(ht-wy),Math.max(1,.22*q),Math.max(1,.22*q))}
  const wb=f.includes('water')?1.3:0,tr=f.includes('trees');
  if(tr||wb){const n=Math.round(WY*1.6);for(let i=0;i<n;i++){const x=(i/n)*WY+(r()-.5)*.8,ht=(tr?2.2+r()*1.8:.8+r()*.9)+wb,rr=.7+r()*.8;
    g.fillStyle=night?(i%2?'#0c160f':'#101c12'):sun?(i%2?'#2c3a2a':'#344530'):(i%3?'#2f5a34':i%2?'#3a6a3d':'#264b2b');
    for(const o of x<3?[0,WY]:x>WY-3?[0,-WY]:[0]){g.beginPath();g.arc((x+o)*q,yy(ht-rr*.5),rr*q,0,7);g.fill();g.fillRect((x+o-rr*.8)*q,yy(ht-rr*.5),rr*1.6*q,(ht-rr*.5)*q)}}}
  if(wb){const gr=g.createLinearGradient(0,yy(wb),0,B);gr.addColorStop(0,night?'#0e1a2c':sun?'#7a5a7a':'#5b8fbf');gr.addColorStop(1,night?'#081221':sun?'#5a3f5c':'#3c6f9e');g.fillStyle=gr;g.fillRect(0,yy(wb),WY*q,wb*q);
    g.fillStyle=night?'rgba(255,230,170,.25)':'rgba(255,255,255,.35)';for(let i=0;i<70;i++)g.fillRect(r()*WY*q,yy(wb*r()),(.6+r()*1.6)*q,Math.max(1,.08*q))}
  cv.q=q;return cv;
}
/* campus landmark beyond an end: a stylized bell tower, tall enough to clear the rim */
function landmarkTile(G){
  const P=Math.max(4,Math.round(STAD.ppu*.6)),hy=Math.max(9,G.rimT+3.5),wy=3.2,cv=stadCv(wy*P,(hy+1)*P),g=cv.getContext('2d'),night=lightStage()==='night',stone=night?'#2b2f38':'#d8d0bf',dk=night?'#1d2027':'#b5ab97';
  const x0=wy*P/2,yb=(hy+1)*P,sw=1.5*P,by=yb-hy*P*.7;
  g.fillStyle=stone;g.fillRect(x0-sw/2,by,sw,hy*P*.7);g.fillStyle=dk;g.fillRect(x0+sw*.15,by,sw*.35,hy*P*.7);
  g.fillStyle=stone;g.fillRect(x0-sw*.62,by-1.4*P,sw*1.24,1.4*P);g.fillStyle=night?'#f3d9a0':'#3a4049';
  for(let i=0;i<2;i++){const ax=x0-sw*.3+i*sw*.6;g.beginPath();g.moveTo(ax-.22*P,by-.2*P);g.lineTo(ax-.22*P,by-.95*P);g.arc(ax,by-.95*P,.22*P,Math.PI,0);g.lineTo(ax+.22*P,by-.2*P);g.fill()}
  g.fillStyle=night?'#1a2a26':'#5f8f7d';g.beginPath();g.moveTo(x0-sw*.7,by-1.4*P);g.lineTo(x0,by-1.4*P-hy*P*.18);g.lineTo(x0+sw*.7,by-1.4*P);g.closePath();g.fill();
  g.fillStyle=night?'#ffe9b0':'#f4f1ea';g.beginPath();g.arc(x0,by+.8*P,.4*P,0,7);g.fill();
  cv.q=P;cv.wy=wy;cv.hy=hy+1;return cv;
}
/* a colonnade of arches with a torch (stands behind one end stand) */
function archTile(){
  const P=Math.max(4,Math.round(STAD.ppu*.6)),wy=14,hy=6.5,cv=stadCv(wy*P,hy*P),g=cv.getContext('2d'),night=lightStage()==='night',stone=night?'#30343d':'#d9cfb8';
  g.fillStyle=stone;g.fillRect(0,1.4*P,wy*P,(hy-1.4)*P);g.globalCompositeOperation='destination-out';
  for(let i=0;i<7;i++){const ax=(1+i*2)*P,aw=1.3*P,t=2.4*P;g.beginPath();g.moveTo(ax-aw/2,hy*P);g.lineTo(ax-aw/2,t+aw/2);g.arc(ax,t+aw/2,aw/2,Math.PI,0);g.lineTo(ax+aw/2,hy*P);g.fill()}
  g.globalCompositeOperation='source-over';g.fillStyle=night?'#23262e':'#c4b89c';g.fillRect(0,1.4*P,wy*P,.35*P);
  g.fillStyle=stone;g.fillRect(wy*P/2-.5*P,.5*P,P,.9*P);g.fillStyle='#ff9a2e';g.beginPath();g.ellipse(wy*P/2,.4*P,.35*P,.45*P,0,0,7);g.fill();
  cv.q=P;cv.wy=wy;cv.hy=hy;return cv;
}
function roofTile(){
  const q=Math.max(4,Math.round(STAD.ppu*.5)),wy=48,hy=24,cv=stadCv(wy*q,hy*q),g=cv.getContext('2d'),gr=g.createLinearGradient(0,0,0,hy*q);
  gr.addColorStop(0,'#0d1016');gr.addColorStop(1,'#2a313c');g.fillStyle=gr;g.fillRect(0,0,wy*q,hy*q);g.strokeStyle='rgba(150,165,185,.35)';g.lineWidth=Math.max(1,.12*q);
  for(let x=0;x<wy;x+=6){g.beginPath();g.moveTo(x*q,0);g.lineTo((x+3)*q,hy*q);g.lineTo((x+6)*q,0);g.stroke()}
  for(let y=4;y<hy;y+=5){g.beginPath();g.moveTo(0,y*q);g.lineTo(wy*q,y*q);g.stroke()}
  g.fillStyle='rgba(255,246,220,.9)';for(let x=1.5;x<wy;x+=3)for(const y of [hy-3,hy-8])g.fillRect(x*q,y*q,.5*q,.25*q);
  cv.q=q;return cv;
}
function hedgeTile(){const P=STAD.ppu,wy=12,hy=1.3,cv=stadCv(wy*P,hy*P),g=cv.getContext('2d'),r=fRng(77),night=lightStage()==='night';
  g.fillStyle=night?'#12301a':'#24572b';g.fillRect(0,.25*P,wy*P,(hy-.25)*P);
  for(let i=0;i<420;i++){const x=r()*wy*P,y=.15*P+r()*(hy-.2)*P;g.fillStyle=night?(r()<.5?'#1a4024':'#0e2615'):(r()<.5?'#2f6d35':r()<.5?'#3d8043':'#1c4a22');g.beginPath();g.arc(x,y,(.08+r()*.12)*P,0,7);g.fill()}
  return cv}
function flameTile(){const P=Math.max(6,Math.round(STAD.ppu*.6)),w=1.2*P,h=3.2*P,cv=stadCv(w,h),g=cv.getContext('2d'),gr=g.createRadialGradient(w/2,h*.8,0,w/2,h*.7,h*.75);
  gr.addColorStop(0,'rgba(255,250,210,1)');gr.addColorStop(.25,'rgba(255,190,60,.95)');gr.addColorStop(.6,'rgba(240,80,20,.6)');gr.addColorStop(1,'rgba(200,30,10,0)');
  g.fillStyle=gr;g.beginPath();g.moveTo(w/2,0);g.quadraticCurveTo(w,h*.6,w/2,h);g.quadraticCurveTo(0,h*.6,w/2,0);g.fill();return cv}
/* video board: host colors and the score (redrawn only when the score changes) */
function stdBoard(){
  const T=STAD.T,h=hostT(),v=stadAway(),hi=h===S.home?0:1,k=[h.id,v.id,S.score[hi],S.score[1-hi],lightStage()].join('|');if(STAD.brdKey===k&&T.brd)return T.brd;STAD.brdKey=k;
  const P=Math.max(6,Math.round(STAD.ppu*.55)),wy=9,hy=5,cv=T.brd||stadCv(wy*P,hy*P),g=cv.getContext('2d'),U=x=>String(x).toUpperCase();cv.width=wy*P;cv.height=hy*P;
  g.fillStyle='#0b0e13';g.fillRect(0,0,wy*P,hy*P);const gr=g.createLinearGradient(0,0,0,hy*P);gr.addColorStop(0,shade(h.c1,.05));gr.addColorStop(1,shade(h.c1,-.45));g.fillStyle=gr;g.fillRect(.25*P,.25*P,(wy-.5)*P,(hy-.5)*P);
  g.fillStyle=inkOn(h.c1);g.textAlign='center';g.textBaseline='middle';g.font=`900 italic ${Math.round(1.05*P)}px ${FFONT}`;g.fillText(U(h.city||h.abbr),wy*P/2,1.05*P,(wy-1)*P);
  g.font=`900 ${Math.round(1.15*P)}px ${FFONT}`;g.fillText(`${U(h.abbr)} ${S.score[hi]}`,wy*P/2,2.45*P,(wy-1)*P);g.fillText(`${U(v.abbr)} ${S.score[1-hi]}`,wy*P/2,3.75*P,(wy-1)*P);
  g.fillStyle='rgba(0,0,0,.24)';const d=Math.max(2,Math.round(P/5));for(let y=0;y<hy*P;y+=d)g.fillRect(0,y,wy*P,1);
  cv.q=P;cv.wy=wy;cv.hy=hy;return T.brd=cv;
}
/* board on two posts, base at screen y yb, centered at x (sk: a little skew so it reads as facing the field) */
function stdBoardAt(c,x,yb,s,lift,sk){const b=stdBoard(),w=b.wy*s,hh=b.hy*s,y=yb-lift*s-hh;c.fillStyle='#1b1f26';c.fillRect(x-w*.3,y+hh,.35*s,lift*s);c.fillRect(x+w*.3-.35*s,y+hh,.35*s,lift*s);
  c.save();c.transform(1,sk||0,0,1,x-w/2,y);c.drawImage(b,0,0,w,hh);c.restore()}
function glowTile(){const n=stadCv(128,128),g=n.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,248,225,.85)');gr.addColorStop(.16,'rgba(255,240,200,.42)');gr.addColorStop(.5,'rgba(200,215,255,.1)');gr.addColorStop(1,'rgba(200,215,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return n}
/* end-zone stands: tile x = rows going back from the field, tile y = along the end line (pre-squashed by VY) */
function bandie(g,x,y,P,h,alt,k,j){const bw=.34*P,top=y-.42*P;g.fillStyle=h.c1;g.fillRect(x-bw/2,top,bw,.42*P);g.fillStyle='#F2F3F5';g.fillRect(x-.03*P,top,.06*P,.42*P);g.fillStyle=TONES[(k+j)%4];g.beginPath();g.arc(x,top-.08*P,.09*P,0,7);g.fill();
  g.fillStyle=alt;g.fillRect(x-.09*P,top-.36*P,.18*P,.24*P);g.fillStyle='#F2F3F5';g.fillRect(x-.03*P,top-.5*P,.06*P,.16*P);if((k+j)%3===0){g.fillStyle=k%2?'#E8C547':'#D9DDE3';g.fillRect(x+bw*.4,top+.05*P,.17*P,.1*P)}}
function endTile(band,rows,kind){
  rows=rows||9;const P=STAD.ppu,rw=.9*P,hr=.65*P,W0=Math.ceil(rows*rw),H0=Math.ceil(ST.tile*P*VY+hr),cv=stadCv(W0,H0),g=cv.getContext('2d');
  const h=hostT(),a=stadAway(),r=fRng(h.id*17+(band?3:9)+rows),night=lightStage()==='night',em=crowdEmpty(),con=night?'#232a35':'#646b76',conD=night?'#141921':'#40464f',sp=.6*P*VY,alt=stadAlt(h);
  const mix=[h.c1,h.c1,h.c1,h.c2,alt,'#F2F3F5','#23272f','#6b7380',a.c1,'#8a3b3b'],tones=[...TONES,'#5C3A21'],ss=STAD.sd&&STAD.sd.sc,seat=ss==='metal'?'#8a929c':Array.isArray(ss)?ss[0]:null;
  if(kind==='bldg'){/* end-zone building: glass floors stepping back, host trim, a few people at the windows */
    for(let j=rows-1;j>=0;j--){const x0=j*rw;g.fillStyle=j%2?'#2b3038':'#3a4049';g.fillRect(x0,hr,rw,H0-hr);g.fillStyle=night?(j%2?'#e2bf80':'#c9a86a'):(j%2?'#4a5e74':'#3a4c60');g.fillRect(x0+rw*.18,hr+.2*P,rw*.64,H0-hr-.4*P);
      g.fillStyle=night?'rgba(70,48,24,.55)':'rgba(10,14,20,.45)';for(let k=0;k<ST.tile/.6;k++){if(r()<.75)continue;g.fillRect(x0+rw*.3,hr+(k+.4)*sp,rw*.3,sp*.6)}
      g.fillStyle='#14181f';for(let y=hr;y<H0;y+=1.6*P*VY)g.fillRect(x0+rw*.18,y,rw*.64,Math.max(1,.07*P))}
    g.fillStyle=h.c1;g.fillRect(W0-rw*.25,hr,rw*.25,H0-hr);cv.hr=hr;return cv}
  for(let j=rows-1;j>=0;j--){const x0=j*rw;
    if(kind==='berm'){g.fillStyle=night?(j%2?'#1c3a20':'#183420'):(j%2?'#4a8a3f':'#427f38');g.fillRect(x0,hr,rw+1,H0-hr)}
    else{g.fillStyle=conD;g.fillRect(x0,hr,rw,H0-hr);g.fillStyle=con;g.fillRect(x0,hr,rw*.22,H0-hr);if(!band){g.fillStyle=seat||(j%2?shade(h.c1,-.5):'#3a3f48');g.fillRect(x0+rw*.3,hr,rw*.12,H0-hr)}}
    for(let k=0;k<ST.tile/.6;k++){const v0=r(),v1=r(),v2=r(),v3=r(),x=x0+rw*.6,y=hr+(k+.9)*sp;
      if(band){if(k%10===9)continue;bandie(g,x,y,P,h,alt,k,j);continue}
      if(kind==='berm'){if(v0<.5+em)continue;stadFan(g,x+(v3-.5)*rw*.6,y,P*.86,mix[v1*10|0],tones[v2*5|0],null,v3>.85?2:0);continue}
      if(k%10===0||v0<.03+em)continue;stadFan(g,x,y,P*.9,mix[v1*10|0],tones[v2*5|0],v3<.12?h.c1:null,v3>.9?2:0)}}
  g.globalCompositeOperation='source-atop';const lg=g.createLinearGradient(0,0,W0,0);lg.addColorStop(0,`rgba(3,6,14,${night?.05:0})`);lg.addColorStop(1,`rgba(3,6,14,${night?.4:.24})`);g.fillStyle=lg;g.fillRect(0,0,W0,H0);g.globalCompositeOperation='source-over';
  cv.hr=hr;return cv;
}
/* team area: players in uniform (helmets on or in hand), coaches with headsets, benches, coolers */
function benchPlayer(g,x,y,P,U,near,o){
  const s=P*(.94+o.f*.12),l=(o.f-.5)*.08*s;
  g.fillStyle='#15171c';g.fillRect(x-.2*s,y-.1*s,.17*s,.1*s);g.fillRect(x+.03*s,y-.1*s,.17*s,.1*s);
  g.fillStyle=U.p;g.fillRect(x-.19*s,y-.82*s,.16*s,.74*s);g.fillRect(x+.03*s,y-.82*s,.16*s,.74*s);
  g.fillStyle=U.j;g.fillRect(x-.27*s+l,y-1.32*s,.54*s,.56*s);g.fillRect(x-.37*s+l,y-1.44*s,.74*s,.22*s);g.fillRect(x-.45*s+l,y-1.4*s,.12*s,.48*s);g.fillRect(x+.33*s+l,y-1.4*s,.12*s,.48*s);
  g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+.08*s+l,y-1.32*s,.19*s,.56*s);
  g.fillStyle=U.t;g.fillRect(x-.45*s+l,y-1.12*s,.12*s,.05*s);g.fillRect(x+.33*s+l,y-1.12*s,.12*s,.05*s);g.font=`800 ${Math.round((near?.34:.24)*s)}px ${FFONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(o.num),x+l,y-(near?1.08:1.14)*s);
  const hx=x+l,hy=y-1.6*s;
  if(o.hm<.62){g.fillStyle=U.h;g.beginPath();g.arc(hx,hy,.19*s,0,7);g.fill();g.fillStyle=U.s||U.t;g.fillRect(hx-.025*s,hy-.19*s,.05*s,.19*s);if(!near){g.fillStyle=U.mask;g.fillRect(hx-.14*s,hy+.02*s,.28*s,.05*s);g.fillRect(hx-.12*s,hy+.1*s,.24*s,.04*s)}}
  else{g.fillStyle=TONES[o.num%4];g.beginPath();g.arc(hx,hy+.03*s,.15*s,0,7);g.fill();g.fillStyle='#1a1410';g.beginPath();g.arc(hx,hy-.01*s,.15*s,Math.PI,0);g.fill();g.fillStyle=U.h;g.beginPath();g.arc(x+.44*s+l,y-.92*s,.15*s,0,7);g.fill()}
}
function benchCoach(g,x,y,P,team,f){
  const s=P;g.fillStyle='#14161b';g.fillRect(x-.18*s,y-.08*s,.36*s,.08*s);g.fillStyle=f<.5?'#b9a57e':'#2b2f36';g.fillRect(x-.17*s,y-.8*s,.15*s,.72*s);g.fillRect(x+.02*s,y-.8*s,.15*s,.72*s);
  g.fillStyle=f<.6?team.c1:'#1d2129';g.fillRect(x-.23*s,y-1.36*s,.46*s,.6*s);g.fillRect(x-.33*s,y-1.32*s,.1*s,.36*s);g.fillRect(x+.23*s,y-1.32*s,.1*s,.36*s);
  if(f>.3){g.fillStyle='#e9ecef';g.fillRect(x+.1*s,y-1.14*s,.24*s,.3*s)}
  g.fillStyle=TONES[f*4|0];g.beginPath();g.arc(x,y-1.52*s,.15*s,0,7);g.fill();g.fillStyle=team.c1;g.fillRect(x-.17*s,y-1.7*s,.34*s,.1*s);g.fillRect(x,y-1.66*s,.24*s,.05*s);
  g.strokeStyle='#0d0f12';g.lineWidth=Math.max(1,.045*s);g.beginPath();g.arc(x,y-1.54*s,.18*s,Math.PI*1.05,Math.PI*1.95);g.stroke();g.fillStyle='#0d0f12';g.fillRect(x-.21*s,y-1.6*s,.08*s,.13*s);g.beginPath();g.moveTo(x-.17*s,y-1.5*s);g.lineTo(x-.03*s,y-1.42*s);g.stroke();
}
function benchTile(team,near){
  const P=STAD.ppu,len=50,d0=near?FW+3:-5.9,d1=near?FW+6.2:-3,hr=2.4*P,W0=Math.ceil(len*P),H0=Math.ceil((d1-d0)*P*VY+hr+.3*P),cv=stadCv(W0,H0),g=cv.getContext('2d'),r=fRng(team.id*977+(near?1:2)),U=uniColors(team),py=y=>hr+(y-d0)*P*VY;
  const by=near?d0+2.4:d0+.55;g.fillStyle='#2b3038';g.fillRect(2*P,py(by)-.42*P,(len-4)*P,.16*P);g.fillStyle='#1b1f26';g.fillRect(2*P,py(by)-.26*P,(len-4)*P,.26*P);
  const gap=near?[12,18.5]:[31.5,38.5],ppl=[];
  for(let i=0;i<32;i++){const x=1+r()*(len-2),y=d0+.3+r()*(d1-d0-.6),num=1+(r()*98|0),f=r(),hm=r();if(x>gap[0]&&x<gap[1])continue;ppl.push({x,y,num,f,hm,c:0})}
  for(let i=0;i<2;i++)ppl.push({x:6+i*36+r()*4,y:d0+.25,c:1,f:r()});for(const x of [3,47])ppl.push({x,y:d0+.6,c:2});
  ppl.sort((a,b)=>a.y-b.y);
  for(const o of ppl){const x=o.x*P,y=py(o.y);if(o.c===2){g.fillStyle=team.c1;g.fillRect(x-.3*P,y-.75*P,.6*P,.75*P);g.fillStyle='#F2F3F5';g.fillRect(x-.33*P,y-.84*P,.66*P,.14*P);continue}
    if(o.c===1)benchCoach(g,x,y,P,team,o.f);else benchPlayer(g,x,y,P,U,near,o)}
  cv.hr=hr;cv.d0=d0;return cv;
}
function drawBench(c,s,near){
  const T=STAD.T;if(!T)return;const tl=near?T.bn:T.bf,team=near?S.home:S.away,P=STAD.ppu,k=s/P,x=X(35),y=Y(tl.d0)-tl.hr*k,w=50*s;if(x>W||x+w<0||y>H)return;
  if((STAD.jump.get(team)||0)>0&&stadHi()){const now=performance.now();for(let q=0;q<5;q++){const b=Math.abs(Math.sin(now/115+q*1.3))*.3*s;c.drawImage(tl,q*10*P,0,10*P,tl.height,x+q*10*s-.3,y-b,10*s+.6,tl.height*k)}}
  else c.drawImage(tl,x,y,w,tl.height*k);
}
/* ---------- LED ribbon boards ---------- */
function stadRibbon(key,txt,hp,bg,fg){
  const e=STAD.rb[key];if(e&&e.txt===txt&&e.h===hp&&e.bg===bg)return e.cv;
  const font=`900 italic ${Math.round(hp*.68)}px ${FFONT}`,m=stadCv(1,1).getContext('2d');m.font=font;const w=Math.ceil(m.measureText(txt).width)+2,cv=stadCv(w,hp),g=cv.getContext('2d');
  g.fillStyle=bg;g.fillRect(0,0,w,hp);g.font=font;g.fillStyle=fg;g.textBaseline='middle';g.fillText(txt,0,hp*.54);
  g.fillStyle='rgba(0,0,0,.3)';const d=Math.max(2,Math.round(hp/8));for(let y=0;y<hp;y+=d)g.fillRect(0,y,w,1);for(let x=0;x<w;x+=d)g.fillRect(x,0,1,hp);
  STAD.rb[key]={txt,h:hp,bg,cv};return cv;
}
function drawRibbon(c,key,txt,y,hgt,bg,fg,speed,now,x0,x1){
  const cv=stadRibbon(key,txt,Math.max(6,Math.round(hgt*DPR)),bg,fg),tw=cv.width/DPR;x0=x0||0;x1=x1==null?W:x1;
  c.fillStyle=bg;c.fillRect(x0,y,x1-x0,hgt);let o=((-cam.x*scE()-now*speed)%tw+tw)%tw;for(let x=o-tw;x<x1;x+=tw)if(x+tw>x0)c.drawImage(cv,x,y,tw,hgt);
}
function stadMsg(main){
  const h=hostT(),v=stadAway(),hi=h===S.home?0:1,hs=S.score[hi],vs=S.score[1-hi],U=x=>String(x).toUpperCase();
  if(main){if(STAD.msgT>0)return STAD.msg;const b=typeof BC!=='undefined'&&BC.ribbon();if(b)return b;
    if(S.phase==='presnap'&&!S.conv&&defT()===h){if(S.down===3)return '3RD DOWN · MAKE SOME NOISE · ';if(S.down===4)return '4TH DOWN · GET LOUD · '}
    return `${U(h.city||h.name)} · ${U(v.abbr)} ${vs} · ${U(h.abbr)} ${hs} · `}
  return `${U(h.abbr)} ${hs}   ${U(v.abbr)} ${vs}   ${S.q>4?'OT':(['1ST','2ND','3RD','4TH'][S.q-1]||'1ST')+' QTR'}   ·   `;
}
/* ---------- crowd reactions (fx) ---------- */
function stadReact(v,msg,t){if(v>0){STAD.roar=Math.max(STAD.roar,v);STAD.hush=Math.max(0,STAD.hush-.5);if(v>=.7&&isNight())STAD.flashT=Math.max(STAD.flashT,4.5)}else STAD.hush=Math.max(STAD.hush,-v);if(msg){STAD.msg=msg+' · '+msg+' · ';STAD.msgT=t||4.5}}
const stadDef=e=>e.team===S.home?S.away:S.home;
onFx('td',e=>{const h=e.team===hostT();stadReact(h?1:-.9,h?'TOUCHDOWN':'');if(e.team)STAD.jump.set(e.team,3);if(h&&stdHas(STAD.sd,'pyro'))STAD.pyroT=2.4});
onFx('intercept',e=>{const b=stadDef(e),h=b===hostT();stadReact(h?.95:-.7,h?'INTERCEPTION':'');STAD.jump.set(b,2.2)});
onFx('fumble',e=>{const rec=!!(play&&play.result&&play.result.defRec),b=rec?stadDef(e):e.team,h=b===hostT();if(rec){stadReact(h?.85:-.5,h?'FUMBLE · TURNOVER':'');STAD.jump.set(b,2)}else stadReact(h?.3:.4,'')});
onFx('sack',e=>{const h=stadDef(e)===hostT();stadReact(h?.75:-.3,h?'SACK':'')});
onFx('firstDown',e=>{if(e.team===hostT())stadReact(.35,'FIRST DOWN',3)});
onFx('tackle',e=>{if(e.big&&e.d&&e.d.team===hostT())stadReact(.55,'BIG HIT',2.5)});
onFx('dead',e=>{if(e.kind==='td'||e.x==null||S.los==null)return;if(e.x-S.los>=20){const h=e.team===hostT();stadReact(h?.8:-.4,h?'BIG PLAY':'');if(h)STAD.jump.set(e.team,1.5)}});
onFx('kickoff',()=>{STAD.roar=Math.max(STAD.roar,.5);if(stdHas(STAD.sd,'pyro')&&stadHi())STAD.pyroT=2});
function stadTick(now){
  const dt=clamp((now-(STAD.lt||now))/1000,0,.1);STAD.lt=now;STAD.roar=Math.max(0,STAD.roar-dt*.28);STAD.hush=Math.max(0,STAD.hush-dt*.2);STAD.flashT-=dt;STAD.msgT-=dt;STAD.pyroT=Math.max(0,STAD.pyroT-dt);
  for(const [k,v] of STAD.jump){if(v<=0)STAD.jump.delete(k);else STAD.jump.set(k,v-dt)}
  if(STAD.waveX>-60){STAD.waveX+=dt*20;if(STAD.waveX>150)STAD.waveX=-99}else if(stadHi()&&S.phase==='presnap'&&STAD.roar<.1&&Math.random()<dt*.012)STAD.waveX=-40;
}
const stadEx=()=>{const hy=typeof BC!=='undefined'?BC.noise():.3;return clamp(Math.max(STAD.roar,(hy-.42)*1.25)*(1-STAD.hush*.85),0,1)};
/* ---------- far stands ---------- */
function drawDeck(c,s,now,lo,yb,ex,hi,mid){
  const T=STAD.T,P=STAD.ppu,k=s/P,xl=cam.x-W/2/s-1,xr=cam.x+W/2/s+1,t0=Math.floor((xl-ST.x0)/ST.tile),t1=Math.floor((xr-ST.x0)/ST.tile),uo=uOff();
  for(let ti=t0;ti<=t1;ti++){const pi=uo?ti:5-ti,sp=lo?pi>=4:!mid&&pi<=0,a=lo?(sp?T.su0:T.lo0):(sp?T.vi0:T.up0),b=lo?(sp?T.su1:T.lo1):(sp?T.vi1:T.up1),x0=ST.x0+ti*ST.tile,y=yb-a.height*k;
    if(!hi){c.drawImage(ex>.5||(sp&&!lo&&STAD.hush>.2)?b:a,X(x0),y,ST.tile*s,a.height*k);continue}
    for(let q=0;q<8;q++){const xc=x0+q*ST.ck;if(xc+ST.ck<xl||xc>xr)continue;const id=ti*8+q+(lo?0:500),h=stadH01(id),wv=Math.abs(xc+1.5-STAD.waveX)<3.5;
      const up=wv||(ex>.2&&h<ex*1.2)||(!lo&&sp&&STAD.hush>.2)||(!lo&&h>.985);const amp=up?(wv?.28:.05+ex*.16+(sp?STAD.hush*.12:0))*s:0,bob=amp*Math.max(0,Math.sin(now*(.0095+.004*h)+id*1.7));
      c.drawImage(up?b:a,q*ST.ck*P,0,ST.ck*P,a.height,X(xc)-.3,y-bob,ST.ck*s+.6,a.height*k)}}
}
const STAD_SKY={day:['#4f7fbf','#a8c4e2'],late:['#5d7fb0','#e2c9a2'],sunset:['#23305c','#ee8a4e'],night:['#02040a','#0f1830']},STAD_SKYW={day:['#5d6672','#a5adb7'],late:['#5d6672','#a5adb7'],sunset:['#3a3f4f','#9d8577'],night:['#04060a','#151b25']};
/* real stadium: sky (or dome roof) down to the horizon, the parallax backdrop strip and the landmark, all behind the far stands */
function stdSky(c,s,now,sd,B,G){
  const T=STAD.T,st=lightStage(),yu=u=>B-u*s;
  if(sd.rf){const R=T.roof,q=R.q,tw=R.width/q*s,th=R.height/q*s,yb=yu(G.rimT)+1;c.fillStyle='#0d1016';c.fillRect(0,0,W,Math.max(0,yb-th));let o=((-cam.x*s*.5)%tw+tw)%tw-tw;for(let x=o;x<W;x+=tw)c.drawImage(R,x,yb-th,tw+.5,th);return}
  const cc=(wxKind()!=='dry'?STAD_SKYW:STAD_SKY)[st],gr=c.createLinearGradient(0,B-26*s,0,B);gr.addColorStop(0,cc[0]);gr.addColorStop(1,cc[1]);c.fillStyle=gr;c.fillRect(0,0,W,B);
  if(T.bk){const q=T.bk.q,tw=T.bk.width/q*s,th=T.bk.height/q*s;let o=((-cam.x*s*.3)%tw+tw)%tw-tw;for(let x=o;x<W;x+=tw)c.drawImage(T.bk,x,B-th+1,tw+.5,th)}
  if(T.lm){const side=uOff()?STAD.lmReal:-STAD.lmReal,lx=X(side<0?-15:135),w=T.lm.wy*s;if(lx>-w&&lx<W+w)c.drawImage(T.lm,lx-w/2,B-T.lm.hy*s+.5*s,w,T.lm.hy*s)}
}
function drawStands(c,s,now){
  const T=STAD.T;if(!T)return;stadTick(now);const B=Y(-6);if(B<=0)return;
  const G=STAD.G,sd=STAD.sd,k=s/STAD.ppu,hi=stadHi(),h=hostT(),L=sceneLight(),st=lightStage(),wet=wxKind()!=='dry',yu=u=>B-u*s,ex=stadEx(),night=st==='night';
  /* sky (real stadiums: down to the horizon, with the backdrop; non-bowl stands stop at corners without a full end deck) */
  let pa=-10,pb=W+10;
  if(sd){const cut=v=>sd.sh!=='bowl'&&v!=='L';if(cut(stdEnd(sd,-1)))pa=X(-8.2);if(cut(stdEnd(sd,1)))pb=X(128.2);stdSky(c,s,now,sd,B,G)}
  else{const sb=yu(G.rimT)+1;if(sb>0){const cc=(wet?STAD_SKYW:STAD_SKY)[st],gr=c.createLinearGradient(0,sb-16*s,0,sb);gr.addColorStop(0,cc[0]);gr.addColorStop(1,cc[1]);c.fillStyle=gr;c.fillRect(0,0,W,sb)}}
  if(pb<=0||pa>=W)return drawStdFront(c,s,now,sd,B,G,pa,pb);
  const clip=pa>-10||pb<W+10;if(clip){c.save();c.beginPath();c.rect(pa,0,pb-pa,H);c.clip()}
  /* light towers (rim light banks on big bowls, none under a dome), rim, canopy, press box */
  const rimLt=!!(sd&&!sd.rf&&sd.sh==='bowl'&&sd.d>=2&&sd.cap>=55000),poles=!(sd&&(sd.rf||rimLt));
  if(yu(G.rimT)>0){const lit=L.glow>.25;c.fillStyle=lit?'#151a21':'#3a4049';const tt=Math.max(13.4,G.rimT+2.9);
    if(poles)for(const tx of TOWERS){const px=X(tx);if(px<-3*s||px>W+3*s)continue;c.fillRect(px-.16*s,yu(tt),.32*s,(tt-G.rimT)*s);c.fillRect(px-1.1*s,yu(tt+.1),2.2*s,.14*s);c.drawImage(T.tow,px-2*s,yu(tt+1.6),4*s,1.6*s)}
    else if(rimLt)for(const tx of TOWERS){const px=X(tx);if(px<-3*s||px>W+3*s)continue;c.drawImage(T.tow,px-2*s,yu(G.rimT+1.5),4*s,1.4*s)}
    c.fillStyle=night?'#151920':'#4c535d';c.fillRect(0,yu(G.rimT),W,ST.rim*s);c.fillStyle=h.c1;c.fillRect(0,yu(G.rimT)+ST.rim*s*.5,W,ST.rim*s*.28);
    if(stdHas(sd,'canopy')){c.fillStyle=night?'#0f1218':'#2c323b';c.fillRect(0,yu(G.rimT+1.1),W,.7*s);c.fillStyle=night?'#1d222a':'#e8ebef';c.fillRect(0,yu(G.rimT+1.1),W,.16*s);c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,yu(G.rimT+.4),W,.9*s)}
    const pw=G.pw,px=X(60-pw/2);if(px<W&&px+pw*s>0&&yu(G.rimT+ST.press)<B)c.drawImage(T.press,px,yu(G.rimT+ST.press),pw*s,ST.press*s)}
  /* decks top to bottom: upper (and a second club band + middle deck on three-deck sides), club band + ribbon, lower deck */
  const xl=cam.x-W/2/s-1,t0=Math.floor((xl-ST.x0)/ST.tile),band=(y0,hh)=>{for(let x=ST.x0+t0*ST.tile;X(x)<W;x+=ST.tile)c.drawImage(T.club,X(x)-.3,y0,ST.tile*s+.6,hh)};
  if(G.d===3){if(yu(G.c2T)>0)drawDeck(c,s,now,false,yu(G.c2T)+.08*s,ex,hi);if(yu(G.mdT)>0){band(yu(G.c2T),(G.c2T-G.mdT)*s);drawDeck(c,s,now,false,yu(G.clT)+.08*s,ex,hi,true)}}
  else if(G.d===2&&yu(G.clT)>0)drawDeck(c,s,now,false,yu(G.clT)+.08*s,ex,hi);
  if(G.d>=2&&yu(G.loT)>0){band(yu(G.clT),ST.club*s);drawRibbon(c,'club',stadMsg(false),yu(G.clT)+.05*s,.42*s,shade(h.c1,-.55),'#ffffff',.012,now)}
  drawDeck(c,s,now,true,yu(G.loB)+.06*s,ex,hi);
  drawStdFront(c,s,now,sd,B,G,pa,pb,clip);
  /* phone flashlights at night on big moments, light-tower glow */
  if(hi&&night&&STAD.dots&&(ex>.45||STAD.flashT>0)){const amt=Math.max(ex,STAD.flashT>0?.85:0),xl=cam.x-W/2/s,xr=cam.x+W/2/s,t0=Math.floor((xl-ST.x0)/ST.tile),t1=Math.floor((xr-ST.x0)/ST.tile),z=Math.max(1.2,s*.09),uT=G.d>=2?G.clT:G.loB;
    c.fillStyle='rgba(255,252,236,.92)';c.beginPath();for(let ti=t0;ti<=t1;ti++){const bx=ST.x0+ti*ST.tile;for(const d of STAD.dots){if(d.p>amt||Math.sin(now*.004*d.f+d.ph+ti)<.15)continue;const x=X(bx+d.u);if(x<pa||x>pb||x<0||x>W)continue;c.rect(x,d.up&&G.d>=2?yu(uT+d.v*G.upN*ST.upH):yu(G.loB+d.v*G.loN*ST.loH),z,z)}}c.fill()}
  if(L.glow>.05&&!(sd&&sd.rf)){const gy=poles?Math.max(14.2,G.rimT+3.7):G.rimT+.8;if(yu(gy-1)>-6*s){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,L.glow*1.1);for(const tx of TOWERS){const px=X(tx);if(px<-7*s||px>W+7*s)continue;c.drawImage(T.glow,px-7*s,yu(gy)-5*s,14*s,10*s)}c.globalAlpha=1;c.globalCompositeOperation='source-over'}}
}
/* padded wall + main ribbon (inside the clip), then the stand ends, hedges and pyro (outside it) */
function drawStdFront(c,s,now,sd,B,G,pa,pb,clip){
  const h=hostT(),hi=stadHi(),yu=u=>B-u*s;
  if(clip!==undefined){const flash=STAD.msgT>0&&STAD.roar>.6&&hi&&Math.floor(now/260)%2,bg=flash?stadAlt(h):shade(h.c1,-.35),fg=flash?inkOn(stadAlt(h)):inkOn(shade(h.c1,-.35));
    c.fillStyle='#0d1016';c.fillRect(0,yu(G.loB),W,G.loB*s);drawRibbon(c,'main',stadMsg(true),yu(.86),.68*s,bg,fg,.04,now);c.fillStyle='rgba(225,230,238,.85)';c.fillRect(0,yu(G.loB),W,Math.max(1,.07*s));
    if(clip)c.restore()}
  if(!sd)return;const night=lightStage()==='night',top=yu(G.rimT);
  /* the cut ends of the far stands: a concrete edge with a soft shadow */
  for(const [x,d] of [[pa,-1],[pb,1]]){if(x<=-10||x>=W+10)continue;c.fillStyle=night?'#1a1f27':'#59606b';c.fillRect(d<0?x:x-.45*s,top,.45*s,B-top);c.fillStyle='rgba(0,0,0,.22)';c.fillRect(d<0?x-.6*s:x,top+.5*s,.6*s,B-top-.5*s)}
  if(STAD.T.hedge){const T=STAD.T,tw=12*s,x0=Math.max(X(-ST.ez),-tw),x1=Math.min(X(120+ST.ez),W+tw);for(let x=x0+((X(-ST.ez)-x0)%tw);x<x1;x+=tw)c.drawImage(T.hedge,x-.3,B-1.05*s,tw+.6,1.3*s)}
  if(STAD.pyroT>0&&STAD.T.flame){const fl=STAD.T.flame,a=Math.min(1,STAD.pyroT/.6);c.globalCompositeOperation='lighter';c.globalAlpha=a;
    for(let x=10;x<=110;x+=20){const px=X(x),f=.75+.35*Math.abs(Math.sin(now/70+x));if(px<-2*s||px>W+2*s)continue;c.drawImage(fl,px-.6*s*f,B-.3*s-3.2*s*f,1.2*s*f,3.2*s*f)}
    c.globalCompositeOperation='source-over';c.globalAlpha=a*.35;c.fillStyle=night?'#6b6f78':'#d9dde3';for(let x=10;x<=110;x+=20){const px=X(x),up=(2.4-STAD.pyroT)*2.2;if(px<-3*s||px>W+3*s)continue;for(let i=0;i<3;i++){c.beginPath();c.arc(px+(i-1)*.7*s,B-(3.4+up+i*.8)*s,(.9+i*.3+up*.2)*s,0,7);c.fill()}}c.globalAlpha=1}
}
/* ---------- end-zone stands (after the field, before the goal posts) ---------- */
function drawEndStands(c,s,now){
  const T=STAD.T;if(!T)return;if(STAD.sd)return drawEndStd(c,s,now,STAD.sd);const k=s/STAD.ppu,bandL=uOff(),hi=stadHi(),ex=stadEx(),h=hostT(),y0=Y(-6),y1=Y(FW+10);
  for(const sd of [-1,1]){const px=X(sd<0?-ST.ez:120+ST.ez);if(sd<0?px<=0:px>=W)continue;
    c.fillStyle=shade(h.c1,-.35);c.fillRect(sd<0?px-.45*s:px,y0-.5*s,.45*s,y1-y0+.5*s);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(sd<0?px-.45*s:px+.35*s,y0-.5*s,.1*s,y1-y0+.5*s);
    const bob=hi?ex*.12*s*Math.max(0,Math.sin(now/105)):0;
    for(let q=0;q<3;q++){const band=q===1&&(sd<0)===bandL,tl=band?T.band:T.end,b=band&&hi?Math.abs(Math.sin(now/240))*.1*s+ex*.1*s:bob;
      c.save();c.transform(sd*k,-.5*k,0,k,px,Y(-6+q*ST.tile)-tl.hr*k-b);c.drawImage(tl,0,0);c.restore()}}
}
/* real stadium ends: large/medium/small stands, a grass hill, a building or open; hedges, arches and the video board */
function drawEndStd(c,s,now,sd){
  const T=STAD.T,k=s/STAD.ppu,hi=stadHi(),ex=stadEx(),h=hostT(),y0=Y(-6),y1=Y(FW+10),night=lightStage()==='night';
  for(const side of [-1,1]){const px=X(side<0?-ST.ez:120+ST.ez),code=stdEnd(sd,side),real=uOff()?side:-side,tl0=T['e'+code];if(side<0?px<=-14*s:px>=W+14*s)continue;
    const wx=side<0?px-.45*s:px;
    if(T.hedge){c.fillStyle=night?'#12301a':'#24572b';c.fillRect(side<0?px-.9*s:px,y0-1.1*s,.9*s,y1-y0+1.1*s);c.fillStyle=night?'#1a4024':'#3d8043';c.fillRect(side<0?px-.9*s:px,y0-1.1*s,.9*s,.25*s)}
    else if(code==='O'||code==='B'){c.fillStyle=shade(h.c1,-.35);c.fillRect(wx,y0-.25*s,.45*s,y1-y0+.25*s)}
    else{c.fillStyle=shade(h.c1,-.35);c.fillRect(wx,y0-.5*s,.45*s,y1-y0+.5*s);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(side<0?px-.45*s:px+.35*s,y0-.5*s,.1*s,y1-y0+.5*s)}
    let W0=0;
    if(tl0){W0=tl0.width;const bob=hi&&code!=='X'?ex*.12*s*Math.max(0,Math.sin(now/105)):0;
      for(let q=0;q<3;q++){const band=q===1&&T.band&&real===STAD.bandReal,tl=band?T.band:tl0,b=band&&hi?Math.abs(Math.sin(now/240))*.1*s+ex*.1*s:bob;
        c.save();c.transform(side*k,-.5*k,0,k,px,Y(-6+q*ST.tile)-tl.hr*k-b);c.drawImage(tl,0,0);c.restore()}}
    /* back edge of the end stand at world y: (px + side*W0*k, Y(y) - W0*k/2) */
    const bx=px+side*(W0*k+(W0?.6*s:5*s)),by=yy=>Y(yy)-W0*k/2;
    if(T.arch&&real===(sd.L==='M'?-1:sd.R==='M'?1:-1)){const a=T.arch,w=a.wy*s;c.drawImage(a,bx-w/2+side*w*.3,by(CEN-4)-a.hy*s,w,a.hy*s)}
    if(sd.bd&&real===(sd.bd==='L'?-1:1))stdBoardAt(c,bx+side*1.5*s,W0?by(4):Y(-3),s,W0?1.2:2.6,-side*.06)}
}
/* kick view (08-render drawKick) for a real stadium: the end being kicked at, by its code, over the sky/roof and backdrop */
function stdKick(g,w,h,hz,good,now,host){
  const T=STAD.T,G=STAD.G,sd=STAD.sd,P=STAD.ppu,st=lightStage(),night=st==='night',code=stdEnd(sd,1),real=uOff()?1:-1,L=sceneLight(),u=h*.021,ex=good?1:0;
  if(sd.rf){const R=T.roof,k2=h*.36/R.height,rw=R.width*k2;g.fillStyle='#0d1016';g.fillRect(0,0,w,hz);for(let x=-((now*.01)%rw);x<w;x+=rw)g.drawImage(R,x,0,rw+1,R.height*k2)}
  else{const cc=(wxKind()!=='dry'?STAD_SKYW:STAD_SKY)[st]||STAD_SKY.day,sky=g.createLinearGradient(0,0,0,hz);sky.addColorStop(0,cc[0]);sky.addColorStop(1,cc[1]);g.fillStyle=sky;g.fillRect(0,0,w,hz)}
  if(T.bk){const bk=T.bk,bw=bk.width/bk.q*u,bh=bk.height/bk.q*u;for(let x=-((now*.003)%bw);x<w;x+=bw)g.drawImage(bk,x,hz-bh+2,bw+1,bh)}
  if(T.lm&&STAD.lmReal===real){const m=T.lm;g.drawImage(m,w*.3-m.wy*u/2,hz-m.hy*u,m.wy*u,m.hy*u)}
  const lb=h*.42,tw=ST.tile*P,lo=ex?T.lo1:T.lo0,top={L:h*.075,M:h*.2,S:h*.31,B:h*.3,X:h*.22,O:hz}[code]||h*.2;
  if(code==='L'||code==='M'||code==='S'){
    const f=(lb-(code==='L'?h*.27:top))/(lo.height),up=ex?T.up1:T.up0;
    if(code==='L'){const fu=(h*.255-h*.105)/up.height;g.fillStyle=night?'#151920':'#4c535d';g.fillRect(0,h*.075,w,h*.03);g.fillStyle=host.c1;g.fillRect(0,h*.095,w,h*.008);
      for(let x=-((now*.01)%1);x<w;x+=tw*fu){const b=ex?Math.abs(Math.sin(now/120+x))*6:0;g.drawImage(up,x,h*.255-up.height*fu-b,tw*fu+1,up.height*fu)}
      for(let x=0;x<w;x+=tw*f)g.drawImage(T.club,x,h*.255-2,tw*f+1,(h*.27-h*.255)+4)}
    else{g.fillStyle=night?'#151920':'#4c535d';g.fillRect(0,top-h*.02,w,h*.02);g.fillStyle=host.c1;g.fillRect(0,top-h*.008,w,h*.006)}
    for(let x=0;x<w;x+=tw*f){const b=ex?Math.abs(Math.sin(now/110+x*.01))*8:0;g.drawImage(lo,x,lb-lo.height*f-b,tw*f+1,lo.height*f)}}
  else if(code==='B'){const gr=g.createLinearGradient(0,top,0,hz);gr.addColorStop(0,night?'#1c3a20':'#4f9244');gr.addColorStop(1,night?'#142a17':'#3a7532');g.fillStyle=gr;g.beginPath();g.moveTo(0,hz);g.lineTo(0,top+h*.03);g.quadraticCurveTo(w/2,top-h*.03,w,top+h*.03);g.lineTo(w,hz);g.fill();
    const r=fRng(host.id*7+3),cols=[host.c1,host.c1,stadAlt(host),'#F2F3F5','#23272f',host.c2];for(let i=0;i<70;i++){const x=r()*w,y=top+h*.04+r()*(hz-top-h*.07),z=h*.012*(.7+(y-top)/(hz-top));stadFan(g,x,y,z*2.6,cols[r()*6|0],TONES[r()*4|0],null,ex&&r()<.6?1:0)}}
  else if(code==='X'){g.fillStyle=night?'#1d222a':'#3a4049';g.fillRect(0,top,w,hz-top);g.fillStyle=night?'#e2bf80':'#4a5e74';for(let y=top+h*.02;y<hz-h*.03;y+=h*.045)g.fillRect(0,y,w,h*.026);g.fillStyle='#14181f';for(let x=0;x<w;x+=w/24)g.fillRect(x,top,2,hz-top);g.fillStyle=host.c1;g.fillRect(0,top,w,h*.012)}
  if(code==='O'||code==='B'){g.fillStyle=shade(host.c1,-.35);g.fillRect(0,hz-h*.018,w,h*.018)}
  else{const rh=h*.04;g.fillStyle=shade(host.c1,-.35);g.fillRect(0,lb,w,hz-lb);const msg=good?'IT\'S GOOD · ':(kick&&kick.kind==='xp'?'EXTRA POINT · ':'FIELD GOAL · ')+String(host.city||host.name).toUpperCase()+' · ';
    const rc=stadRibbon('kick',msg,Math.round(rh),shade(host.c1,-.35),inkOn(shade(host.c1,-.35)));for(let x=-((now*.06)%rc.width);x<w;x+=rc.width)g.drawImage(rc,x,lb+(hz-lb-rh)/2)}
  if(T.hedge){g.fillStyle=night?'#12301a':'#24572b';g.fillRect(0,hz-h*.03,w,h*.03)}
  if(sd.bd&&(sd.bd==='L'?-1:1)===real){const b=stdBoard(),bw=w*.26,bh=bw*b.hy/b.wy,by=Math.max(h*.01,(code==='O'?hz-h*.06:top)-bh-h*.01);g.fillStyle='#1b1f26';g.fillRect(w/2-bw*.3,by+bh,6,Math.max(0,hz-by-bh));g.fillRect(w/2+bw*.3-6,by+bh,6,Math.max(0,hz-by-bh));g.drawImage(b,w/2-bw/2,by,bw,bh)}
  if(!sd.rf)for(const tx of [w*.07,w*.93]){g.fillStyle=L.glow>.25?'#151a21':'#3a4049';g.fillRect(tx-4,h*.03,8,h*.06);g.drawImage(T.tow,tx-46,0,92,h*.065);
    if(L.glow>.05){g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(1,L.glow*1.2);g.drawImage(T.glow,tx-160,-100,320,230);g.globalAlpha=1;g.globalCompositeOperation='source-over'}}
}
SETTINGS_EXTRA.push({card:'Graphics',key:'gfxQ',label:'Graphics quality',opts:[['high','High'],['saver','Battery saver']],def:'high',note:'Battery saver keeps the crowd still and drops phone lights, flashbulbs and other stadium extras.',after:()=>{STAD.key=''}});
