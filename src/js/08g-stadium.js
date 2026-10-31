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
   ========================================================= */
const ST={wall:1,loN:8,loH:.55,club:1.3,upN:7,upH:.48,rim:.4,press:2.4,tile:24,x0:-12,ck:3,ez:7.6};
const SK=(()=>{const loB=ST.wall,loT=loB+ST.loN*ST.loH,clT=loT+ST.club,upT=clT+ST.upN*ST.upH;return {loB,loT,clT,upT,rimT:upT+ST.rim}})();
const STAD={key:'',chk:0,ppu:0,T:null,roar:0,hush:0,flashT:0,waveX:-99,msg:'',msgT:0,rb:{},jump:new Map(),lt:0,dots:null};
const TOWERS=[-6,36,84,126];
const stadHi=()=>!(LG&&LG.settings.gfxQ==='saver');
const stadPPU=()=>clamp(Math.round(sc*zoomMul()*DPR),8,44);
const stadStunt=()=>!!(S.game&&(S.game.rival||S.slot==='Primetime'));
const stadAway=()=>hostT()===S.home?S.away:S.home;
const stadAlt=t=>contrasty(t.c1,t.c2)?t.c2:lum(t.c1)>.5?'#1d2129':'#F2F3F5';
const stadCv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c};
const stadH01=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)};
function stadKey(){const h=hostT(),a=stadAway();return [h.id,h.c1,h.c2,h.city,a.id,a.c1,a.c2,crowdTheme(),Math.round(crowdEmpty()*10),lightStage(),wxKind(),stadPPU(),stadStunt()?1:0,uniColors(S.home).j,uniColors(S.away).j].join('|')}
function ensureStadium(){if(STAD.T&&(++STAD.chk%15))return;if(STAD.T&&S.phase==='live')return;const k=stadKey();if(k!==STAD.key||!STAD.T){STAD.key=k;buildStadium()}}
function buildStadium(){
  STAD.ppu=stadPPU();const T={},lit=sceneLight().glow>.25,r=fRng(hostT().id*31+7);
  T.lo0=crowdTile('lo','main',0);T.lo1=crowdTile('lo','main',1);T.su0=crowdTile('lo','stu',0);T.su1=crowdTile('lo','stu',1);
  T.up0=crowdTile('up','up',0);T.up1=crowdTile('up','up',1);T.vi0=crowdTile('up','vis',0);T.vi1=crowdTile('up','vis',1);
  T.club=clubTile();T.press=pressTile();T.tow=towerTile(lit);T.glow=STAD.T&&STAD.T.glow||glowTile();T.end=endTile(false);T.band=endTile(true);
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
  const P=STAD.ppu,lo=deck==='lo',n=lo?ST.loN:ST.upN,rh=(lo?ST.loH:ST.upH)*P,hr=.6*P,W0=Math.round(ST.tile*P),H0=Math.ceil(n*rh+hr),cv=stadCv(W0,H0),g=cv.getContext('2d');
  const h=hostT(),a=stadAway(),r=fRng(h.id*131+a.id*7+(lo?11:23)+mode.length*101),th=crowdTheme(),em=crowdEmpty(),st=lightStage(),night=st==='night',sw=.6*P,alt=stadAlt(h);
  if(lo&&mode==='main'&&stadStunt())mode='stunt';
  const sA=shade(h.c1,-.5),sB=lum(h.c2)>.8?'#555b66':shade(h.c2,-.45),con=night?'#232a35':'#646b76',conD=night?'#141921':'#40464f';
  const mix=[h.c1,h.c1,h.c1,h.c1,h.c1,h.c2,alt,'#F2F3F5','#F2F3F5','#23272f','#2f3541','#6b7380',a.c1,'#3b5b8a','#8a3b3b','#c9b48a'],neon=['#39ff88','#ff3cac','#2de2ff',h.c1],tones=[...TONES,'#5C3A21'];
  const pickC=(b,q,j)=>mode==='vis'?(b<.55?a.c1:b<.75?stadAlt(a):mix[b*16|0])
    :mode==='stu'?(th==='white'?(b<.93?'#F2F3F5':h.c1):th==='black'?(b<.93?'#121418':h.c1):th==='stripe'?(b<.92?(j%2?h.c1:alt):'#F2F3F5'):th==='neon'?neon[b*4|0]:(b<.8?h.c1:alt))
    :mode==='stunt'?(b<.88?(q%2?alt:h.c1):mix[b*16|0]):mix[b*16|0];
  for(let j=0;j<n;j++){const y0=hr+j*rh;
    g.fillStyle=conD;g.fillRect(0,y0,W0,rh);g.fillStyle=con;g.fillRect(0,y0+rh*.72,W0,rh*.28);
    for(let q=0;q<4;q++){g.fillStyle=q%2?sB:sA;g.fillRect(q*10*sw+sw,y0+rh*.42,9*sw,rh*.3)}
    for(let i=0;i<40;i++){const v0=r(),v1=r(),v2=r(),v3=r(),v4=r(),v5=r();if(i%10===0)continue;const q=i/10|0;
      if(v0<.025+em*(mode==='stu'?.45:1))continue;
      const stand=up?(v5<.85?(v5<.6?1:2):0):(mode==='stu'&&v5<.6)||v5<.03?2:0;
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
function pressTile(){
  const P=STAD.ppu,W0=Math.round(36*P),H0=Math.ceil(ST.press*P),cv=stadCv(W0,H0),g=cv.getContext('2d'),h=hostT(),night=lightStage()==='night';
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
function glowTile(){const n=stadCv(128,128),g=n.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,248,225,.85)');gr.addColorStop(.16,'rgba(255,240,200,.42)');gr.addColorStop(.5,'rgba(200,215,255,.1)');gr.addColorStop(1,'rgba(200,215,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return n}
/* end-zone stands: tile x = rows going back from the field, tile y = along the end line (pre-squashed by VY) */
function bandie(g,x,y,P,h,alt,k,j){const bw=.34*P,top=y-.42*P;g.fillStyle=h.c1;g.fillRect(x-bw/2,top,bw,.42*P);g.fillStyle='#F2F3F5';g.fillRect(x-.03*P,top,.06*P,.42*P);g.fillStyle=TONES[(k+j)%4];g.beginPath();g.arc(x,top-.08*P,.09*P,0,7);g.fill();
  g.fillStyle=alt;g.fillRect(x-.09*P,top-.36*P,.18*P,.24*P);g.fillStyle='#F2F3F5';g.fillRect(x-.03*P,top-.5*P,.06*P,.16*P);if((k+j)%3===0){g.fillStyle=k%2?'#E8C547':'#D9DDE3';g.fillRect(x+bw*.4,top+.05*P,.17*P,.1*P)}}
function endTile(band){
  const P=STAD.ppu,rows=9,rw=.9*P,hr=.65*P,W0=Math.ceil(rows*rw),H0=Math.ceil(ST.tile*P*VY+hr),cv=stadCv(W0,H0),g=cv.getContext('2d');
  const h=hostT(),a=stadAway(),r=fRng(h.id*17+(band?3:9)),night=lightStage()==='night',em=crowdEmpty(),con=night?'#232a35':'#646b76',conD=night?'#141921':'#40464f',sp=.6*P*VY,alt=stadAlt(h);
  const mix=[h.c1,h.c1,h.c1,h.c2,alt,'#F2F3F5','#23272f','#6b7380',a.c1,'#8a3b3b'],tones=[...TONES,'#5C3A21'];
  for(let j=rows-1;j>=0;j--){const x0=j*rw;g.fillStyle=conD;g.fillRect(x0,hr,rw,H0-hr);g.fillStyle=con;g.fillRect(x0,hr,rw*.22,H0-hr);if(!band){g.fillStyle=j%2?shade(h.c1,-.5):'#3a3f48';g.fillRect(x0+rw*.3,hr,rw*.12,H0-hr)}
    for(let k=0;k<ST.tile/.6;k++){const v0=r(),v1=r(),v2=r(),v3=r(),x=x0+rw*.6,y=hr+(k+.9)*sp;
      if(band){if(k%10===9)continue;bandie(g,x,y,P,h,alt,k,j);continue}
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
onFx('td',e=>{const h=e.team===hostT();stadReact(h?1:-.9,h?'TOUCHDOWN':'');if(e.team)STAD.jump.set(e.team,3)});
onFx('intercept',e=>{const b=stadDef(e),h=b===hostT();stadReact(h?.95:-.7,h?'INTERCEPTION':'');STAD.jump.set(b,2.2)});
onFx('fumble',e=>{const rec=!!(play&&play.result&&play.result.defRec),b=rec?stadDef(e):e.team,h=b===hostT();if(rec){stadReact(h?.85:-.5,h?'FUMBLE · TURNOVER':'');STAD.jump.set(b,2)}else stadReact(h?.3:.4,'')});
onFx('sack',e=>{const h=stadDef(e)===hostT();stadReact(h?.75:-.3,h?'SACK':'')});
onFx('firstDown',e=>{if(e.team===hostT())stadReact(.35,'FIRST DOWN',3)});
onFx('tackle',e=>{if(e.big&&e.d&&e.d.team===hostT())stadReact(.55,'BIG HIT',2.5)});
onFx('dead',e=>{if(e.kind==='td'||e.x==null||S.los==null)return;if(e.x-S.los>=20){const h=e.team===hostT();stadReact(h?.8:-.4,h?'BIG PLAY':'');if(h)STAD.jump.set(e.team,1.5)}});
onFx('kickoff',()=>{STAD.roar=Math.max(STAD.roar,.5)});
function stadTick(now){
  const dt=clamp((now-(STAD.lt||now))/1000,0,.1);STAD.lt=now;STAD.roar=Math.max(0,STAD.roar-dt*.28);STAD.hush=Math.max(0,STAD.hush-dt*.2);STAD.flashT-=dt;STAD.msgT-=dt;
  for(const [k,v] of STAD.jump){if(v<=0)STAD.jump.delete(k);else STAD.jump.set(k,v-dt)}
  if(STAD.waveX>-60){STAD.waveX+=dt*20;if(STAD.waveX>150)STAD.waveX=-99}else if(stadHi()&&S.phase==='presnap'&&STAD.roar<.1&&Math.random()<dt*.012)STAD.waveX=-40;
}
const stadEx=()=>{const hy=typeof BC!=='undefined'?BC.noise():.3;return clamp(Math.max(STAD.roar,(hy-.42)*1.25)*(1-STAD.hush*.85),0,1)};
/* ---------- far stands ---------- */
function drawDeck(c,s,now,lo,yb,ex,hi){
  const T=STAD.T,P=STAD.ppu,k=s/P,xl=cam.x-W/2/s-1,xr=cam.x+W/2/s+1,t0=Math.floor((xl-ST.x0)/ST.tile),t1=Math.floor((xr-ST.x0)/ST.tile),uo=uOff();
  for(let ti=t0;ti<=t1;ti++){const pi=uo?ti:5-ti,sp=lo?pi>=4:pi<=0,a=lo?(sp?T.su0:T.lo0):(sp?T.vi0:T.up0),b=lo?(sp?T.su1:T.lo1):(sp?T.vi1:T.up1),x0=ST.x0+ti*ST.tile,y=yb-a.height*k;
    if(!hi){c.drawImage(ex>.5||(sp&&!lo&&STAD.hush>.2)?b:a,X(x0),y,ST.tile*s,a.height*k);continue}
    for(let q=0;q<8;q++){const xc=x0+q*ST.ck;if(xc+ST.ck<xl||xc>xr)continue;const id=ti*8+q+(lo?0:500),h=stadH01(id),wv=Math.abs(xc+1.5-STAD.waveX)<3.5;
      const up=wv||(ex>.2&&h<ex*1.2)||(!lo&&sp&&STAD.hush>.2)||(!lo&&h>.985);const amp=up?(wv?.28:.05+ex*.16+(sp?STAD.hush*.12:0))*s:0,bob=amp*Math.max(0,Math.sin(now*(.0095+.004*h)+id*1.7));
      c.drawImage(up?b:a,q*ST.ck*P,0,ST.ck*P,a.height,X(xc)-.3,y-bob,ST.ck*s+.6,a.height*k)}}
}
function drawStands(c,s,now){
  const T=STAD.T;if(!T)return;stadTick(now);const B=Y(-6);if(B<=0)return;
  const k=s/STAD.ppu,hi=stadHi(),h=hostT(),L=sceneLight(),st=lightStage(),wet=wxKind()!=='dry',yu=u=>B-u*s,ex=stadEx(),night=st==='night';
  /* sky */
  const sb=yu(SK.rimT)+1;if(sb>0){const C={day:['#4f7fbf','#a8c4e2'],late:['#5d7fb0','#e2c9a2'],sunset:['#23305c','#ee8a4e'],night:['#02040a','#0f1830']}[st],Cw={day:['#5d6672','#a5adb7'],late:['#5d6672','#a5adb7'],sunset:['#3a3f4f','#9d8577'],night:['#04060a','#151b25']}[st],cc=wet?Cw:C;
    const gr=c.createLinearGradient(0,sb-16*s,0,sb);gr.addColorStop(0,cc[0]);gr.addColorStop(1,cc[1]);c.fillStyle=gr;c.fillRect(0,0,W,sb)}
  /* light towers, rim, press box */
  if(yu(SK.rimT)>0){const lit=L.glow>.25;c.fillStyle=lit?'#151a21':'#3a4049';
    for(const tx of TOWERS){const px=X(tx);if(px<-3*s||px>W+3*s)continue;c.fillRect(px-.16*s,yu(13.4),.32*s,(13.4-SK.rimT)*s);c.fillRect(px-1.1*s,yu(13.5),2.2*s,.14*s);c.drawImage(T.tow,px-2*s,yu(15),4*s,1.6*s)}
    c.fillStyle=night?'#151920':'#4c535d';c.fillRect(0,yu(SK.rimT),W,ST.rim*s);c.fillStyle=h.c1;c.fillRect(0,yu(SK.rimT)+ST.rim*s*.5,W,ST.rim*s*.28);
    const px=X(42);if(px<W&&px+36*s>0&&yu(SK.rimT+ST.press)<B)c.drawImage(T.press,px,yu(SK.rimT+ST.press),36*s,ST.press*s)}
  /* upper deck, club band + ribbon, lower deck, padded wall + main ribbon */
  if(yu(SK.clT)>0)drawDeck(c,s,now,false,yu(SK.clT)+.08*s,ex,hi);
  if(yu(SK.loT)>0){const xl=cam.x-W/2/s-1,t0=Math.floor((xl-ST.x0)/ST.tile);for(let x=ST.x0+t0*ST.tile;X(x)<W;x+=ST.tile)c.drawImage(T.club,X(x)-.3,yu(SK.clT),ST.tile*s+.6,ST.club*s);
    drawRibbon(c,'club',stadMsg(false),yu(SK.clT)+.05*s,.42*s,shade(h.c1,-.55),'#ffffff',.012,now)}
  drawDeck(c,s,now,true,yu(SK.loB)+.06*s,ex,hi);
  const flash=STAD.msgT>0&&STAD.roar>.6&&hi&&Math.floor(now/260)%2,bg=flash?stadAlt(h):shade(h.c1,-.35),fg=flash?inkOn(stadAlt(h)):inkOn(shade(h.c1,-.35));
  c.fillStyle='#0d1016';c.fillRect(0,yu(SK.loB),W,SK.loB*s);drawRibbon(c,'main',stadMsg(true),yu(.86),.68*s,bg,fg,.04,now);c.fillStyle='rgba(225,230,238,.85)';c.fillRect(0,yu(SK.loB),W,Math.max(1,.07*s));
  /* phone flashlights at night on big moments, light-tower glow */
  if(hi&&night&&STAD.dots&&(ex>.45||STAD.flashT>0)){const amt=Math.max(ex,STAD.flashT>0?.85:0),xl=cam.x-W/2/s,xr=cam.x+W/2/s,t0=Math.floor((xl-ST.x0)/ST.tile),t1=Math.floor((xr-ST.x0)/ST.tile),z=Math.max(1.2,s*.09);
    c.fillStyle='rgba(255,252,236,.92)';c.beginPath();for(let ti=t0;ti<=t1;ti++){const bx=ST.x0+ti*ST.tile;for(const d of STAD.dots){if(d.p>amt||Math.sin(now*.004*d.f+d.ph+ti)<.15)continue;const x=X(bx+d.u);if(x<0||x>W)continue;c.rect(x,d.up?yu(SK.clT+d.v*ST.upN*ST.upH):yu(SK.loB+d.v*ST.loN*ST.loH),z,z)}}c.fill()}
  if(L.glow>.05&&yu(13)>-6*s){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,L.glow*1.1);for(const tx of TOWERS){const px=X(tx);if(px<-7*s||px>W+7*s)continue;c.drawImage(T.glow,px-7*s,yu(14.2)-5*s,14*s,10*s)}c.globalAlpha=1;c.globalCompositeOperation='source-over'}
}
/* ---------- end-zone stands (after the field, before the goal posts) ---------- */
function drawEndStands(c,s,now){
  const T=STAD.T;if(!T)return;const k=s/STAD.ppu,bandL=uOff(),hi=stadHi(),ex=stadEx(),h=hostT(),y0=Y(-6),y1=Y(FW+10);
  for(const sd of [-1,1]){const px=X(sd<0?-ST.ez:120+ST.ez);if(sd<0?px<=0:px>=W)continue;
    c.fillStyle=shade(h.c1,-.35);c.fillRect(sd<0?px-.45*s:px,y0-.5*s,.45*s,y1-y0+.5*s);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(sd<0?px-.45*s:px+.35*s,y0-.5*s,.1*s,y1-y0+.5*s);
    const bob=hi?ex*.12*s*Math.max(0,Math.sin(now/105)):0;
    for(let q=0;q<3;q++){const band=q===1&&(sd<0)===bandL,tl=band?T.band:T.end,b=band&&hi?Math.abs(Math.sin(now/240))*.1*s+ex*.1*s:bob;
      c.save();c.transform(sd*k,-.5*k,0,k,px,Y(-6+q*ST.tile)-tl.hr*k-b);c.drawImage(tl,0,0);c.restore()}}
}
SETTINGS_EXTRA.push({card:'Graphics',key:'gfxQ',label:'Graphics quality',opts:[['high','High'],['saver','Battery saver']],def:'high',note:'Battery saver keeps the crowd still and drops phone lights, flashbulbs and other stadium extras.',after:()=>{STAD.key=''}});
