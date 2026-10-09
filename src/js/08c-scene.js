/* =========================================================
   08c · Stadium scene: sideline (cheerleaders, mascot, coaches, chain crew),
         turf wear and snow, time of day, fireworks, field storming, poses
   ========================================================= */
const hostT=()=>S.neutral?S.home:(S.userHome?S.home:S.away);
const isNight=()=>S.slot==='Primetime'||(S.slot==='Afternoon'&&progress()>.66);
const SPECIAL_TURF={BOIS:['#1d4fb0','#1a46a0'],EWU:['#b3262d','#9e2127'],CCU:['#1b8f8c','#177d7a'],UCA:['#6d6f76','#4f2d7f']};
function turfColors(night){const t=hostT(),sp=LG.settings.specialTurf!==false&&SPECIAL_TURF[t.abbr];if(sp)return night?[shade(sp[0],-.15),shade(sp[1],-.15)]:sp;return night?['#2a7131','#24652b']:['#2f7c36','#29702f']}
function crowdTheme(){const t=LG.settings.studentTheme||'auto';if(t!=='auto')return t;const g=S.game;if(!g)return 'none';if(g.rival)return 'stripe';if(S.slot==='Primetime')return (hostT().id%2)?'black':'white';return 'none'}
function crowdEmpty(){
  const dens=LG.settings.crowd==='low'?.25:0;let e=dens;if(!S.home||S.ot)return e;
  const diff=Math.abs(S.score[0]-S.score[1]),hostLosing=(hostT()===S.home?S.score[0]-S.score[1]:S.score[1]-S.score[0])<0;
  if(S.q>=4&&diff>=24)e+=hostLosing?.45:.25;else if(S.q>=4&&diff>=17&&hostLosing)e+=.2;
  if(S.wx==='Rain'||S.wx==='Snow')e+=.08*Math.min(4,S.q);
  if(S.game&&S.game.rival)e*=.4;return clamp(e,0,.7);
}
function starPath(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fill()}
const POSE_ARM={point:'point',heisman:'heisman',flex:'flex',spike:'spikeA',salute:'salute',bow:'bowA',leap:'celebrate',huddle:'celebrate',taunt:'point'};
function animCelebrate(dt){
  const c=S.celebrate;if(!c)return;S.celebT=(S.celebT||0)+dt;const k=S.celebPose;
  if(k==='leap'){c.y=Math.max(-1.5,c.y-dt*5);c.z=Math.max(0,Math.sin(S.celebT*3)*1.4)}
  else if(k==='huddle'){for(const o of OFF)if(o!==c){const a=Math.atan2(o.y-c.y,o.x-c.x);steer(o,c.x+Math.cos(a)*1.4,c.y+Math.sin(a)*1.4,6,dt);o.x+=o.vx*dt;o.y+=o.vy*dt}c.z=Math.abs(Math.sin(S.celebT*7))*.35}
  else if(k==='spike'){c.z=0;if(S.celebT<.2)spawnTurf(c.x+.5,c.y,2)}
  else if(!k)c.z=Math.abs(Math.sin(performance.now()/160))*.5;
  else c.z=0;
}

/* turf wear: scuffed patches where plays end, fading paint, snow building up */
function drawWear(c,s){
  if(!S.wear||!S.wear.length)return;const snow=S.wx==='Snow',mud=S.wx==='Rain';
  c.save();for(const [ax,y] of S.wear){const x=uOff()?ax:120-ax,px=X(x),py=Y(y);if(px<-40||px>W+40)continue;c.fillStyle=snow?'rgba(60,80,60,.22)':mud?'rgba(70,48,24,.32)':'rgba(92,72,40,.2)';c.beginPath();c.ellipse(px,py,s*1.5,s*1.5*VY*.8,0,0,7);c.fill()}c.restore();
  if(snow){const a=Math.min(.38,progress()*.45);c.fillStyle=`rgba(240,244,250,${a})`;c.fillRect(X(0),Y(0),X(120)-X(0),Y(FW)-Y(0))}
}
/* little sideline people: drawn behind players (top sideline) or in front (bottom) */
function fig(c,x,y,s,o){
  const h=s*1.9*(o.scale||1),b=o.bounce||0,yy=y-b;c.save();
  c.strokeStyle=o.legs||'#222';c.lineWidth=Math.max(1,h*.09);c.lineCap='round';
  c.beginPath();c.moveTo(x,yy-h*.42);c.lineTo(x-h*.1,yy);c.moveTo(x,yy-h*.42);c.lineTo(x+h*.1,yy);c.stroke();
  c.fillStyle=o.body;c.fillRect(x-h*.13,yy-h*.82,h*.26,h*.42);
  const arm=o.arms||'side';c.strokeStyle=o.body;c.lineWidth=Math.max(1,h*.08);c.beginPath();
  if(arm==='up'){c.moveTo(x-h*.12,yy-h*.78);c.lineTo(x-h*.28,yy-h*1.12);c.moveTo(x+h*.12,yy-h*.78);c.lineTo(x+h*.28,yy-h*1.12)}
  else if(arm==='slam'){c.moveTo(x+h*.12,yy-h*.78);c.lineTo(x+h*.32,yy-h*(o.t>0?.5:1.05))}
  else{c.moveTo(x-h*.12,yy-h*.78);c.lineTo(x-h*.18,yy-h*.45);c.moveTo(x+h*.12,yy-h*.78);c.lineTo(x+h*.18,yy-h*.45)}c.stroke();
  if(o.pom&&arm==='up'){c.fillStyle=o.pom;for(const sx of [-1,1]){c.beginPath();c.arc(x+sx*h*.3,yy-h*1.14,h*.09,0,7);c.fill()}}
  c.fillStyle=o.head||'#C68A5A';c.beginPath();c.arc(x,yy-h*.92,h*.1,0,7);c.fill();
  if(o.hat){c.fillStyle=o.hat;c.fillRect(x-h*.12,yy-h*1.04,h*.24,h*.06)}
  c.restore();
}
let SCENE={chainA:null,chainB:null,mascotX:105,pushT:0,pushN:0,coach:{},fw:[]};
function sceneEvent(k,d){
  if(k==='td'){const who=d.team===S.home?'home':'away';SCENE.coach[who]={kind:'cheer',t:2.5};SCENE.coach[who==='home'?'away':'home']={kind:'slam',t:1.6};if(d.team===hostT()){SCENE.pushT=3;SCENE.pushN=(d.team===S.home?S.score[0]:S.score[1]);if(isNight()&&LG.settings.pyro!==false)fireworks(8)}}
  if(k==='turnover'){const who=d.team===S.home?'home':'away';SCENE.coach[who]={kind:'slam',t:1.6}}
  if(k==='flag'){SCENE.coach[uOff()?'home':'away']={kind:'slam',t:1.2}}
  if(k==='big'){const who=d.team===S.home?'home':'away';SCENE.coach[who]={kind:'cheer',t:1.4}}
}
function drawSideline(c,s,now,front){
  if(!S.home||LG.settings.sideline===false)return;const host=hostT(),vis=host===S.home?S.away:S.home,dt=1/60;
  const yTop=-2.6,yBot=FW+2.6;
  if(!front){
    /* coach on the far sideline (visitors) */
    const cv=SCENE.coach.away;const ca=cv&&cv.t>0?cv:null;if(ca)ca.t-=dt;
    const vx=70+(ca&&ca.kind==='pace'?Math.sin(now/400)*2:0);fig(c,X(vx),Y(yTop),s,{body:'#1b1e24',legs:'#777',hat:S.away.c1,arms:ca?(ca.kind==='cheer'?'up':'slam'):'side',t:ca?ca.t%0.5-.25:0});
    /* cheerleaders by the end zones on the far sideline */
    const hype=typeof BC!=='undefined'?BC.noise():.3;
    if(LG.settings.cheer!==false)for(let i=0;i<6;i++){const x=(i<3?14+i*2.2:99+(i-3)*2.2),b=Math.max(0,Math.sin(now/(150-hype*40)+i))*s*(.25+hype*.5);fig(c,X(x),Y(yTop-.6),s,{body:host.c1,legs:'#f1f1f1',head:TONES[i%4],arms:Math.sin(now/300+i)>-.2?'up':'side',pom:host.c2==='#FFFFFF'?'#ffffff':host.c2,bounce:b,scale:.85})}
    return;
  }
  /* chain crew runs to the new marks */
  if(['presnap','live','dead'].includes(S.phase)&&!S.conv){const ta=S.los,tb=Math.min(110,S.firstDownX);SCENE.chainA=SCENE.chainA==null?ta:lerp(SCENE.chainA,ta,.05);SCENE.chainB=SCENE.chainB==null?tb:lerp(SCENE.chainB,tb,.05);
    const ya=Y(yBot-1.2),xa=X(SCENE.chainA),xb=X(SCENE.chainB);c.save();c.strokeStyle='rgba(30,30,30,.8)';c.lineWidth=1.5;c.beginPath();c.moveTo(xa,ya-s*1.6);c.lineTo(xb,ya-s*1.6);c.stroke();
    for(const px of [xa,xb]){c.strokeStyle='#E8E8E8';c.lineWidth=2;c.beginPath();c.moveTo(px,ya);c.lineTo(px,ya-s*2.2);c.stroke();c.fillStyle='#FF6A13';c.fillRect(px-s*.3,ya-s*2.6,s*.6,s*.5);fig(c,px+s*.4,ya+s*.3,s,{body:'#111',legs:'#111',hat:'#fff',scale:.75})}
    const dm=X(S.los);c.fillStyle='#FF6A13';c.fillRect(dm-s*.45,ya-s*3,s*.9,s*.8);c.fillStyle='#111';c.font=`900 ${Math.max(8,s*.7)}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(String(S.down),dm,ya-s*2.6);c.restore()}
  /* home head coach + mascot on the near sideline */
  const ch=SCENE.coach.home;const cm=ch&&ch.t>0?ch:null;if(cm)cm.t-=dt;
  fig(c,X(50+(S.q>=4&&Math.abs(S.score[0]-S.score[1])<=8?Math.sin(now/500)*2.5:0)),Y(yBot+.8),s,{body:'#1b1e24',legs:'#888',hat:S.home.c1,arms:cm?(cm.kind==='cheer'?'up':'slam'):'side',t:cm?cm.t%0.5-.25:0,scale:1.05});
  if(LG.settings.mascot!==false){SCENE.mascotX+=Math.sin(now/2600)*.02;let b=0,arms='side';
    if(SCENE.pushT>0){SCENE.pushT-=dt;b=-Math.abs(Math.sin(now/120))*s*.5;arms='up'}
    const mx=X(SCENE.mascotX),my=Y(yBot+.4);fig(c,mx,my,s,{body:host.c1,legs:host.c2,head:host.c2,arms,bounce:-b,scale:1.25});
    c.save();c.fillStyle=host.c2;c.beginPath();c.arc(mx,my-s*2.65,s*.42,0,7);c.fill();c.fillStyle=inkOn(host.c2);c.font=`900 ${s*.38}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(host.abbr.slice(0,3),mx,my-s*2.62);c.restore()}
}
function drawStick(c){
  if(!stick||stick.key||stick.ox==null||LG.settings.stickUI===false)return;
  c.save();c.globalAlpha=.32;c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(stick.ox,stick.oy,70,0,7);c.stroke();c.globalAlpha=.55;c.fillStyle='#fff';c.beginPath();c.arc(stick.x,stick.y,22,0,7);c.fill();c.restore();
}
/* sky tint as an afternoon game rolls into dusk and night; fireworks over the stands */
function drawSky(c,now){
  if(S.slot==='Afternoon'){const p=progress();if(p>.35&&p<.8){const a=Math.sin((p-.35)/.45*Math.PI)*.16;c.fillStyle=`rgba(255,140,60,${a})`;c.fillRect(0,0,W,H)}}
  if(SCENE.fw.length){c.save();c.globalCompositeOperation='lighter';for(const f of SCENE.fw){f.t+=1/60;f.x+=f.vx/60;f.y+=f.vy/60;f.vy+=30/60;const a=clamp(1-f.t/f.life,0,1);c.fillStyle=f.c;c.globalAlpha=a;c.beginPath();c.arc(f.x,f.y,2.2,0,7);c.fill()}c.restore();SCENE.fw=SCENE.fw.filter(f=>f.t<f.life)}
  drawFlashbulbs(c);
  if(S.stormT>0)drawStormers(c,now);
}
function fireworks(n){const host=hostT(),cols=[host.c1,host.c2,'#ffffff','#FFD23F'];for(let k=0;k<n;k++){setTimeout(()=>{const cx=R(.1,.9)*W,cy=R(.08,.3)*H,col=pick(cols);for(let i=0;i<46;i++){const a=i/46*6.283,v=R(60,140);SCENE.fw.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,life:R(1,1.6),c:col})}if(!muted&&AC)noise(.4,120,1,.25,'lowpass')},k*260)}}
let STORMERS=[];
function startStorm(storm,trophy){
  S.stormT=storm?3.6:2.6;STORMERS=[];const host=hostT();
  if(storm){for(let i=0;i<160;i++)STORMERS.push({x:R(-.1,1.1)*W,y:i%2?-20-R(0,200):H+20+R(0,200),tx:R(.15,.85)*W,ty:R(.35,.8)*H,c:pick([host.c1,host.c1,host.c2,'#e8e8e8']),sp:R(140,260),ph:R(0,6)})}
  banner(storm?'Fans storm the field!':(trophy+'!'),host.c1);sfx('roar');sfx('fight');if(isNight())fireworks(10);
  for(let i=0;i<3;i++)setTimeout(()=>spawnConfetti(cam.x+R(-8,8),cam.y+R(-6,6)),i*400);
}
function drawStormers(c,now){
  for(const f of STORMERS){const dx=f.tx-f.x,dy=f.ty-f.y,d=hyp(dx,dy);if(d>4){f.x+=dx/d*f.sp/60;f.y+=dy/d*f.sp/60}else{f.y+=Math.sin(now/120+f.ph)*.6}
    c.fillStyle=f.c;c.fillRect(f.x-3,f.y-9,6,9);c.fillStyle=TONES[(f.ph*10|0)%4];c.beginPath();c.arc(f.x,f.y-11,2.6,0,7);c.fill();if(Math.sin(now/200+f.ph)>.3){c.strokeStyle=f.c;c.lineWidth=2;c.beginPath();c.moveTo(f.x-3,f.y-8);c.lineTo(f.x-6,f.y-15);c.moveTo(f.x+3,f.y-8);c.lineTo(f.x+6,f.y-15);c.stroke()}}
}

/* ---------- v6 broadcast field graphics ---------- */
function drawFieldGfx(c,s,now){
  if(LG.settings.gfx===false||S.phase!=='presnap'&&S.phase!=='live')return;
  const top=Y(0),bot=Y(FW);
  /* line to gain: distance tag riding on the yellow line */
  if(!S.conv&&S.firstDownX<110){const x=X(S.firstDownX),togo=Math.max(1,Math.round(S.firstDownX-S.los));c.save();c.fillStyle='#FFD23F';c.font=`800 ${Math.max(10,s*.7)}px -apple-system,system-ui,sans-serif`;const t=`${togo}`;const w=c.measureText(t).width+s*.8;c.fillRect(x-w/2,top+s*.3,w,s*1.05);c.fillStyle='#141414';c.textAlign='center';c.textBaseline='middle';c.fillText(t,x,top+s*.83);c.restore()}
  /* down & distance painted on the turf next to the ball */
  if(S.phase==='presnap'){const x=X(S.los-4.5),y=Y(FW-5.5),txt=ddText().toUpperCase();c.save();c.translate(x,y);c.scale(1,VY);c.globalAlpha=.75;c.fillStyle='rgba(8,11,17,.75)';c.font=`900 italic ${s*1.25}px -apple-system,system-ui,sans-serif`;const w=c.measureText(txt).width+s*1.2;c.fillRect(-w/2,-s*1,w,s*2);c.fillStyle='#FFD23F';c.fillRect(-w/2,-s*1,s*.35,s*2);c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,s*.15,0);c.restore()}
  /* field goal range */
  if(uOff()&&!S.conv&&!S.ot||uOff()&&S.ot){const k=kicker();if(k){const xr=127-maxFG(k);if(xr>S.los&&xr<110){const x=X(xr);c.save();c.setLineDash([s*.5,s*.5]);c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=Math.max(1.5,s*.12);c.beginPath();c.moveTo(x,top);c.lineTo(x,bot);c.stroke();c.setLineDash([]);c.fillStyle='rgba(255,255,255,.75)';c.font=`800 ${Math.max(9,s*.55)}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.fillText('FG RANGE',x,bot-s*.4);c.restore()}
      else if(xr<=S.los&&S.phase==='presnap'){c.save();c.fillStyle='rgba(59,217,138,.9)';c.font=`800 ${Math.max(9,s*.55)}px -apple-system,system-ui,sans-serif`;c.textAlign='center';c.fillText(`IN FG RANGE · ${fgDist()} YD`,X(S.los),bot-s*.4);c.restore()}}}
}
function drawPylons(c,s){
  const pyl=(x,y)=>{const px=X(x),py=Y(y);if(px<-20||px>W+20)return;c.fillStyle='#FF6A13';c.fillRect(px-s*.18,py-s*.75,s*.36,s*.75);c.fillStyle='rgba(255,255,255,.6)';c.fillRect(px-s*.18,py-s*.75,s*.36,s*.1)};
  for(const x of [0,10,110,120])for(const y of [0,FW])pyl(x,y);
}
function drawBallTrail(c,s){
  const n=10;for(let k=1;k<=n;k++){const t=Math.max(0,ball.t/ball.T-k*.025);const x=lerp(ball.fx,ball.tx,t),y=lerp(ball.fy,ball.ty,t),z=4*ball.h*t*(1-t);c.fillStyle=`rgba(255,255,255,${.22*(1-k/n)})`;c.beginPath();c.arc(X(x),Y(y)-z*s*.9-s*1.6,Math.max(1,s*.12*(1-k/n)),0,7);c.fill()}
}
/* camera flashes in the stands at night on big moments */
function drawFlashbulbs(c){
  if(!isNight()||typeof BC==='undefined'||BC.noise()<.6)return;const standBot=Y(-6);if(standBot<=0)return;
  const n=Math.round((BC.noise()-.6)*40);c.save();c.fillStyle='#fff';for(let i=0;i<n;i++){if(Math.random()<.7)continue;const x=Math.random()*W,y=Math.random()*standBot*.9;c.globalAlpha=R(.4,1);c.beginPath();c.arc(x,y,R(1,2.4),0,7);c.fill()}c.restore();
}

function covName(){return {man:'Cover 1',cover2:'Cover 2',cover3:'Cover 3',cover4:'Quarters',blitz:'Blitz',prevent:'Prevent'}[S.cov]||'zone'}
/* final score graphic, then championship celebrations */
function finalGraphic(won,pog,g){
  STORMERS=[];S.stormT=Math.max(S.stormT||0,3.2);const el=$('#qcard');el.innerHTML=`<div class="eyebrow fin">FINAL${S.ot?' · '+(S.otRound>1?S.otRound:'')+'OT':''}${g.tag?' · '+esc(g.tag):''}</div>${BC.linescore()}${pog?`<div class="pog"><span class="tag gold">Player of the game</span> <b>${esc(fullName(pog))}</b> <small class="note">${pog.pos} · ${esc(S.home.abbr)}</small></div>`:''}`;
  el.classList.remove('on');void el.offsetWidth;el.classList.add('on');setTimeout(()=>el.classList.remove('on'),2900);
  const title=won&&g.post&&/Championship|Bowl|Semifinal|National/.test(g.tag||'');
  if(title){banner(/National|Final/.test(g.tag)?'National champions':`${g.tag} champions`,S.home.c1,S.home.city);fireworks(12);for(let i=0;i<4;i++)setTimeout(()=>spawnConfetti(cam.x+R(-8,8),cam.y+R(-6,6)),i*350);sfx('fight')}
}
