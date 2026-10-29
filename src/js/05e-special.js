/* =========================================================
   05e · Special teams + live turnovers (v8)
   simulate() hands every open-field phase to stSim() once play.st is set: kickoffs (deep / squib / onside, the
   free kick after a safety), punts (snap, rare blocks, coffin corner and rugby style, gunners vs jammers, fair
   catches, muffs, downing, touchbacks), kick + punt returns, interception returns and loose balls (fumbles, strip
   sacks, muffs, onside kicks, blocked punts) with bounce physics, dives and scoop-and-score.
   Coordinates never flip mid-play: S.poss keeps its meaning (side 'o' attacks +x) and a carrier on side 'd' runs
   toward x=10. Kick plays are set up with S.poss = the RECEIVING team (the kick travels toward -x, the returner
   attacks +x), so the field art never mirrors mid-play. stEnd() turns the dead ball into a result (sk = td /
   safety / tb / koob / fc / spot..., side = who has the ball, x in current coordinates); stApply() into score
   and possession. play.st = {kind:'ko'|'punt'|'int'|'fum', phase:'set'|'air'|'loose'|'ret', ...}.
   Team stats (S.stats / S.ostats, a missing key reads as 0): kr krYds krTD pr prYds prTD punts puntYds puntTB
   koN koTB fc fga fgm xpa xpm blk ff fr fumLost intYds intTD fumTD.
   fx emitted here: kickoff punt intercept fumble recover fairCatch touchback turnover td safety tackle dead.
   ========================================================= */
const STK={g:10.7,koTB:35,ptTB:30,koOOB:45};
const tStat=t=>t===S.home?S.stats:S.ostats;
function sAdd(t,k,n){const s=tStat(t);if(s)s[k]=(s[k]||0)+(n==null?1:n)}
/* punter / kickoff man = the K with the best leg (thr); field-goal kicker = the most accurate (acc) */
function bestK(t,k){const l=((S.dc&&dcOf(t).K)||[]).filter(Boolean);return l.reduce((a,b)=>!a||b[k]>a[k]?b:a,null)}
/* kick units: backups first (a starter, per 02 STARTERS, costs 2.5 points of the unit score), returners may be starters */
function stPick(t,poss,n,f,used,st){const c=[],v=new Map();for(const pos of poss)(dcOf(t)[pos]||[]).forEach((p,i)=>{if(p&&!used.has(p.id)&&!v.has(p.id)&&!isOut(p)){c.push(p);v.set(p.id,f(p)-(!st&&i<(STARTERS[pos]||1)?2.5:0))}});c.sort((a,b)=>v.get(b.id)-v.get(a.id));
  const out=[];for(const p of c){if(out.length>=n)break;if(!used.has(p.id)){used.add(p.id);out.push(p)}}return out}
const retF=p=>1.5*p.spd+p.agi+.6*p.car,covF=p=>1.2*p.spd+p.tkl+.5*p.awr,blkF=p=>p.blk+.6*p.str+.4*p.spd;
function stAdd(side,pl,x,y,t,job,key){const p=add(side,SPD[pl.pos]?pl.pos:'LB',clamp(x,-2,122),clamp(y,1,FW-1),pl,t,key);p.stj=job;p.recCD=0;p.react=0;return p}
function ballLoose(x,y,vx,vy,vz,h){ball={state:'air',loose:true,pitch:true,x,y,h:h||0,vx,vy,vz,z:0,fx:x,fy:y,tx:x,ty:y,t:0,T:.5,spin:0};ball.z=(ball.h+.15-1.6)/.9;if(play)play.carrier=null}
const stWind=()=>S.wind?-windX()*S.wind.mph:0;   // tail wind (mph) for a kick toward -x
const stDir=c=>c.side==='o'?1:-1;
function stClear(){for(const p of P){p.engBy=null;p.eng=null;p.engaged=false;p.tgt=null;p.claim=null;p.route=null;p.recCD=p.recCD||0;p.armTried=false;p.react=0}}
function stPrep(recv,name){
  S.poss=recv;S.conv=false;S.rzActive=false;S.clockRun=false;hideActs();['#call','#opt','#snapBar','#kick'].forEach(s=>$(s).hidden=true);$('#toBtn').hidden=true;
  P=[];OFF=[];DEF=[];Q=null;RB=null;KP={};aim=null;touch=null;stick=null;S.bullet=false;S.celebrate=null;S.ctrl=null;S.pc=null;
  play=newPlay({name,cat:'st'});play.type='st';play.carrier=null;
}
function stGo(why){S.phase='live';S.toDB=[0,0];play.fouls=[];play.pend=[];stCtrlInit();if(typeof recStart==='function')recStart();showActs()}

/* ---------- kickoffs: from the 35 (x=45 in the kicking team's coordinates); after a safety from the 20 ---------- */
function stKickoff(recv,sub,from,why){
  from=from||45;stPrep(recv,sub==='onside'?'Onside kick':sub==='squib'?'Squib kick':'Kickoff');
  const rt=offT(),kt=defT(),spot=120-from,used=new Set(),ons=sub==='onside',sd=Math.random()<.5?1:-1,ki=kt===S.home?0:1;
  const alert=!S.ot&&S.q===4&&S.clock<=S.qlen*.3&&S.score[ki]<S.score[1-ki];   // receiving team shows the hands team
  const K=bestK(kt,'thr');used.add(K.id);const kp=stAdd('d',K,spot+6,CEN,kt,'K','K');
  stPick(kt,['LB','S','CB','RB','WR','TE','DL'],10,covF,used).forEach((pl,i)=>stAdd('d',pl,spot+(ons?.8:1.2),ons?clamp(CEN+sd*((i<7?i:i-11)*3.4+1.5),2,FW-2):3+i*(FW-6)/9,kt,'cov','C'+i));
  const R=stPick(rt,['RB','WR','CB','S'],2,retF,used,1),B=stPick(rt,['TE','LB','RB','WR','S','OL','DL','CB'],9,blkF,used);
  if(alert){[7,14,21,32,39,46].forEach((y,i)=>B[i]&&stAdd('o',B[i],spot-11.5,y,rt,'hands','B'+i));[12,CEN,41].forEach((y,i)=>B[6+i]&&stAdd('o',B[6+i],spot-17,y,rt,'blk','B'+(6+i)));
    if(R[1])stAdd('o',R[1],spot-30,CEN,rt,'ret','R1');if(R[0])stAdd('o',R[0],spot-45,CEN,rt,'ret','R0')}
  else{[7,17,CEN,36,46].forEach((y,i)=>B[i]&&stAdd('o',B[i],spot-12,y,rt,'blk','B'+i));[11,21,32,42].forEach((y,i)=>B[5+i]&&stAdd('o',B[5+i],spot-24,y,rt,'blk','B'+(5+i)));
    if(R[0])stAdd('o',R[0],Math.max(12,spot-61),CEN-5,rt,'ret','R0');if(R[1])stAdd('o',R[1],Math.max(14,spot-58),CEN+5,rt,'ret','R1')}
  ballLoose(spot,CEN,0,0,0,0);
  play.st={kind:'ko',sub,phase:'set',t:0,spot,kt,rt,kicker:kp,alert,sd,imp:'d',lastSide:'d',ck:S.ctrlKey,why};
  S.los=spot;S.ballY=CEN;S.down=1;S.firstDownX=Math.min(110,spot+10);
  sAdd(kt,'koN');fx('kickoff',{side:recv,why,sub});stGo();
  hint(rt===S.home?(ons?'Onside kick! Drag to move · tap to dive on the ball':'Tap or FAIR CATCH to signal · drag to steer after the catch'):'You cover · drag to move · TACKLE to dive · SWITCH');
}
function stKoKick(){
  const pl=play,st=pl.st,k=st.kicker,kpl=k.pl,w=stWind();setAnim(k,'kick');sfx('thump');
  for(const p of P)if(p.side==='o'&&!st.alert&&st.sub==='onside'&&p.stj==='blk')p.react=.5;   // a surprise: the front line has already turned to block
  if(st.sub==='onside'){const tx=st.spot-R(11,14),ty=clamp(CEN+st.sd*R(7,15),3,FW-3);
    if(Math.random()<.35){st.pop=true;stLaunch(tx,ty,R(.85,1.05),1.3,-1.5)}else{ballLoose(st.spot-.4,CEN,(tx-st.spot)*R(1.05,1.25),(ty-CEN)*R(.9,1.2),R(1,3.5),.1);st.phase='loose';st.t=0;stCtrlInit();return}}
  else if(st.sub==='squib')stLaunch(st.spot-R(26,34),clamp(CEN+R(-14,14),4,FW-4),R(.75,1),.7,-1.5);
  else{let ty=CEN+R(-1,1)*R(0,15);if(Math.random()<.015)ty=Math.random()<.5?-2:FW+2;stLaunch(st.spot-(50+3.6*kpl.thr+R(-5,5)+w*.22),ty,3.4+.16*kpl.thr+R(-.25,.25),6.5,-1.5)}
}
function stLaunch(tx,ty,T,h,z0){const b=ball;ball={state:'air',kick:true,fx:b.x,fy:b.y,x:b.x,y:b.y,z:z0||0,z0:z0||0,h,tx,ty,t:0,T,spin:0};const st=play.st;st.phase='air';st.t=0;st.decided=false;stAssignFielder();stCtrlInit();showActs()}
function stAssignFielder(){const st=play.st;let best=null,bt=1e9;for(const p of P){if(p.side!=='o')continue;const t=hyp(p.x-ball.tx,p.y-ball.ty)/p.spd-(p.stj==='ret'?.7:0);if(t<bt){bt=t;best=p}}st.fielder=best}

/* ---------- punts: snap, protection, gunners vs jammers, coffin corner / rugby by situation ---------- */
function stPunt(kSide){
  const L=S.los,ltg=S.firstDownX,by=clamp(S.ballY,HASH1,HASH2);dres('Punt');
  stPrep(kSide==='home'?'away':'home','Punt');
  const rt=offT(),kt=defT(),spot=120-L,used=new Set(),Kp=bestK(kt,'thr');used.add(Kp.id);
  const pp=stAdd('d',Kp,spot+14,by,kt,'P','P'),ol=dcOf(kt).OL||[],lsP=ol.find((p,i)=>i>=5&&!used.has(p.id))||ol[0];used.add(lsP.id);
  stAdd('d',lsP,spot+.7,by,kt,'line','LS');
  stPick(kt,['TE','LB','OL','DL'],6,blkF,used).forEach((pl,i)=>{const s=i%2?1:-1,k=1+(i>>1);stAdd('d',pl,spot+.7+(k===3?.8:0),by+s*k*1.2,kt,'line','L'+i)});
  const G=stPick(kt,['CB','WR','S'],2,p=>2*p.spd+p.tkl,used).map((pl,i)=>stAdd('d',pl,spot+.7,i?FW-3:3,kt,'gun','G'+i));
  stPick(kt,['S','LB','RB'],1,p=>p.blk+p.str+p.awr,used).forEach(pl=>stAdd('d',pl,spot+5.5,by,kt,'line','PP'));
  const R=stPick(rt,['RB','WR','CB','S'],1,retF,used,1)[0],ret=stAdd('o',R,clamp(spot-(41+2.6*(Kp.thr-3)),13,spot-25),by,rt,'ret','R0');
  stPick(rt,['CB','S'],2,p=>p.cov+.5*p.str+.5*p.spd,used).forEach((pl,i)=>{const j=stAdd('o',pl,spot-1.6,i?FW-3.6:3.6,rt,'jam','J'+i);j.tgt=G[i];j.jam=true});
  stPick(rt,['LB','DL','S','TE','RB','CB','WR','OL'],8,p=>.5*(p.str+p.spd+p.blk),used).forEach((pl,i)=>i<6?stAdd('o',pl,spot-1,by+(i%2?1:-1)*(1.6+1.6*(i>>1)),rt,i<2?'rush':'hold','H'+i):stAdd('o',pl,spot-13,by+(i%2?6:-6),rt,'blk','H'+i));
  ballLoose(spot,by,0,0,0,0);
  play.st={kind:'punt',phase:'set',t:0,spot,kt,rt,kicker:pp,ret,ltg:120-ltg,L,imp:'d',lastSide:'d',ck:S.ctrlKey};
  S.los=spot;S.ballY=by;S.down=1;S.firstDownX=Math.min(110,spot+10);stGo();
  hint(rt===S.home?'Punt return · tap or FAIR CATCH to signal · drag to steer after the catch':'Punt coverage · drag to move · TACKLE to dive · SWITCH');
}
function stPuntKick(){
  const pl=play,st=pl.st,k=st.kicker,kp=k.pl;setAnim(k,'punt');sfx('thump');sAdd(st.kt,'punts');
  const avg=(l,f)=>l.length?l.reduce((a,p)=>a+f(p.pl),0)/l.length:3,line=P.filter(p=>p.stj==='line'),rush=P.filter(p=>p.stj==='rush'||p.stj==='hold');
  if(Math.random()<clamp(.004+.005*(avg(rush,q=>(q.shd+q.str)/2)-avg(line,q=>q.blk)),.0015,.02)){
    st.blocked=true;const [r]=nearest(rush,k.x,k.y);if(r)setAnim(r,'swat');sAdd(st.rt,'blk');banner('Punt blocked!',st.rt.c1);slowMo(.7);S.shake=.3;
    ballLoose(k.x-1.2,k.y,R(1,7),R(-4,4),R(2,5),1.2);st.phase='loose';st.t=0;st.lt=0;stCtrlInit();showActs();return}
  const toGoal=st.spot-10;let dist=38+2.6*kp.thr+R(-6,6)+stWind()*.25,T=3.5+.22*(kp.thr-3)+R(-.3,.3),h=7,ty=k.y+R(-9,9);st.style='normal';
  if(dist>toGoal-6){st.style='coffin';dist=clamp(toGoal-R(2,12),12,dist);T=Math.min(T,2.6+dist*.025);h=5.5;ty=CEN+(Math.random()<.5?1:-1)*(CEN-R(-2,5))}
  else if(Math.random()<.15){st.style='rugby';dist*=.88;T*=.72;h=3.4}
  ball={state:'air',kick:true,fx:k.x-.4,fy:k.y,x:k.x-.4,y:k.y,z:-.6,z0:-.6,tx:st.spot-dist,ty:clamp(ty,-3,FW+3),t:0,T,h,spin:0};
  st.phase='air';st.t=0;st.decided=false;stAssignFielder();stCtrlInit();showActs();
  fx('punt',{x:ball.tx,y:ball.ty,dist:Math.round(dist),team:st.kt,style:st.style});rulesPuntKick(k);
}

/* ---------- live interception / fumble entry points (from 05d pickOff and 05c tackled / strip sack) ---------- */
function stInt(d){
  const pl=play;if(S.conv)return endPlay('int');
  pl.st={kind:'int',phase:'ret',t:0,poss0:S.poss,chg:true,imp:'o',gx:d.x,rx:d.x,lastSide:'d',ck:S.ctrlKey};stClear();
  ball={state:'held',x:d.x,y:d.y,z:0};pl.carrier=d;tstat().int++;ps(Q).int++;dres('INT');S.rzActive=false;
  fx('intercept',{kind:'int',p:d,qb:Q,x:d.x,y:d.y,team:offT()});fx('turnover',{team:defT(),kind:'int'});
  banner('Intercepted',defT().c1);sfx(uOff()?'groan':'roar');slowMo(.45);haptic(d.user?'success':'heavy');
  stCtrlInit();showActs();hint(d.user?'Pick! Drag to bring it back · JUKE / SPIN / TRUCK':'Picked off! Chase him · drag to steer · TACKLE to dive');
}
function stScrimYds(c,x){const g=Math.round(x-S.los),st=tstat();
  if(play.caught){st.passYds+=g;const yac=Math.max(0,Math.round(x-play.catchX));st.yac+=yac;if(play.rec){play.rec.yds=g;play.rec.yac=yac}ps(Q).py+=g;ps(c).recy+=g}
  else{st.rushYds+=g;ps(c).ry+=g}if(g>=20)st.bigPlays++}
function stFumble(c,d,msg){
  const pl=play;if(!pl||pl.ended||S.phase!=='live')return;if(S.conv&&!pl.st){pl.fumbler=c;pl.forcer=d;return endPlay('fum',msg)}
  if(!pl.st){pl.st={kind:'fum',t:0,poss0:S.poss,chg:false,ck:S.ctrlKey};stClear();if(c.side==='o')stScrimYds(c,Math.min(109.9,c.x+.45))}
  const st=pl.st;Object.assign(st,{phase:'loose',lt:0,still:0,imp:c.side,lastSide:c.side,fumBy:c,recd:false,t:0});
  sAdd(c.team,'fum');if(d){sAdd(d.team,'ff');credit(d,'ff',1,12)}
  pl.fumbler=c;pl.forcer=d;c.stun=Math.max(c.stun||0,.45);c.fallen=true;if(d){d.stun=Math.max(d.stun||0,.6);d.fallen=true}
  ballLoose(c.x+stDir(c)*.5,c.y,c.vx*.3+R(-2.5,2.5),c.vy*.3+R(-2.5,2.5),R(1.5,3.5),.9);
  toast(msg&&msg!=='Fumble'?msg+'!':'Fumble! Ball is loose!');slowMo(.6);sfx('cut');S.shake=.3;haptic('heavy');stCtrlInit();showActs();
  hint('Loose ball! Drag to go after it · tap to dive on it');
}

/* ---------- the open-field step ---------- */
function stSim(dt){
  const pl=play,st=pl.st;st.t+=dt;
  if(!S.ot&&!(st.kind==='ko'&&!st.touched))S.clock=Math.max(0,S.clock-dt*CLK.play);   // a kickoff starts the clock when it is touched
  for(const p of P){p.engaged=false;p.claim=null}
  if(st.phase==='set')stSetTick(dt);else if(st.phase==='air')stAirTick(dt);else if(st.phase==='loose')stBallTick(dt);
  if(pl.ended)return;
  const c=pl.carrier;
  for(const p of P){
    if(st.phase==='ret'&&p===c){stRunner(p,dt);if(pl.ended)return;continue}
    if(stPre(p,dt))continue;
    if(st.phase==='set')stSetAI(p,dt);else if(st.phase==='air')(p.side==='d'?stCover(p,dt):stRecvAir(p,dt));else if(st.phase==='loose')stLooseAI(p,dt);else if(c)(p.side===c.side?stBlock(p,dt,c,stDir(c)):stChase(p,dt,c));
  }
  for(const p of P){p.x+=p.vx*dt;p.y+=p.vy*dt;p.face=p.vx>1.2?1:p.vx<-1.2?-1:p.face}
  for(let i=0;i<P.length;i++){const a=P[i];if(a===c||a.fallen)continue;for(let j=i+1;j<P.length;j++){const b=P[j];if(b===c||b.fallen)continue;const ddx=b.x-a.x,ddy=b.y-a.y,d=hyp(ddx,ddy);if(d<.95&&d>1e-4){const o=(.95-d)*.5;a.x-=ddx/d*o;a.y-=ddy/d*o;b.x+=ddx/d*o;b.y+=ddy/d*o}}}
  if(st.phase==='ret'&&c){
    const dir=stDir(c),bx=c.x+dir*.45;
    if(dir>0?bx>=110:bx<=10)return stEnd('td');
    if(c.y<0||c.y>FW||c.x<-.3||c.x>120.3)return stEnd('oob');
    stTackleCheck(c);
  }else if(st.phase==='loose')stRecoverCheck();
  if(ball.state==='held'&&pl.carrier){ball.x=pl.carrier.x;ball.y=pl.carrier.y;ball.z=0}
}
/* stun, dives and timers shared by everybody */
function stPre(p,dt){
  p.lungeCD-=dt;if(p.freeT>0)p.freeT-=dt;if(p.recCD>0)p.recCD-=dt;
  if(p.stun>0){p.stun-=dt;steer(p,p.x,p.y,0,dt,4);if(p.fallen&&p.stun<.5&&p.anim!=='getup'&&!play.ended)setAnim(p,'getup');if(p.stun<=0)p.fallen=false;return true}
  if(p.lunge>0){p.lunge-=dt;steer(p,p.lx,p.ly,p.spd*1.6,dt,18);if(p.lunge<=0&&!play.ended){p.stun=p.userLunge?.55:.75;p.userLunge=false;p.fallen=true;spawnTurf(p.x,p.y,5)}return true}
  if(p.react>0){p.react-=dt;steer(p,p.x+3*(p.side==='o'?-1:1),p.y,p.spd*.6,dt);return true}
  return false;
}
function stSetTick(dt){
  const st=play.st,b=ball,k=st.kicker;
  if(st.kind==='ko'){if(hyp(k.x-b.x,k.y-b.y)<.75||st.t>1.9)stKoKick();return}
  if(!st.snapped&&st.t>.3){st.snapped=true;ball={state:'air',pitch:true,fx:b.x,fy:b.y,x:b.x,y:b.y,z:-1.4,tx:k.x-.4,ty:k.y,t:0,T:.66,h:.25,spin:0};sfx('hike')}
  if(st.snapped&&!st.held){b.t+=dt;const p=Math.min(1,b.t/b.T);b.x=lerp(b.fx,b.tx,p);b.y=lerp(b.fy,b.ty,p);b.z=-1.4*(1-p)+4*b.h*p*(1-p)-.6*p;b.spin+=dt*18;if(p>=1){st.held=true;st.kAt=st.t+R(.5,.68)}}
  if(st.held){b.x=k.x-.4;b.y=k.y;b.z=-.6;b.spin=0;if(st.t>=st.kAt)stPuntKick()}
}
function stSetAI(p,dt){
  const st=play.st;
  if(st.kind==='ko'){if(p===st.kicker)return steer(p,st.spot+.35,CEN,p.spd*.85,dt);if(p.side==='d')return steer(p,st.spot+.6,p.homeY,p.spd*.5,dt);return steer(p,p.homeX,p.homeY,p.spd,dt)}
  const k=st.kicker;
  if(p.stj==='gun'&&st.t>.3)return stCover(p,dt);
  if(p.stj==='jam')return stBlock(p,dt,st.ret,1);
  if(p.stj==='rush')return steer(p,k.x,k.y,p.spd*.7,dt);
  steer(p,p.homeX,p.homeY,p.spd,dt);
}
/* kicking team downfield in lanes; the kicker / punter stays back as the safety */
function stCover(p,dt){
  const st=play.st,c=play.carrier,lx=c?c.x:st.phase==='air'?ball.tx:ball.x,ly=c?c.y:st.phase==='air'?ball.ty:ball.y;
  if(p.engBy){const b=p.engBy;if(b.eng!==p||b.stun>0||hyp(b.x-p.x,b.y-p.y)>1.9)p.engBy=null;else{p.engaged=true;steer(p,lx,ly,p.spd*.16,dt,6);return}}
  if(p===S.ctrl&&stick&&stick.m>12)return steer(p,p.x+stick.dx*3,p.y+stick.dy*3,p.spd,dt,12.5);
  if(p.stj==='K'||p.stj==='P')return steer(p,lerp(st.spot,lx,.6),lerp(p.y,ly,.6),p.spd*.75,dt);
  const prog=clamp(1-(p.x-lx)/45,0,1);steer(p,lx+1.2,lerp(p.homeY,ly,.3+.6*prog),p.spd,dt);
}
/* the return team: the returner gets under it, the other deep man leads, everybody else drops into the wall */
function stRecvAir(p,dt){
  const st=play.st,lx=ball.tx,ly=ball.ty;
  if(p===st.fielder){if(st.noCatch)return steer(p,lx+6,ly+(p.y<ly?-4:4),p.spd*.7,dt);if(p===S.ctrl&&stick&&stick.m>12)return steer(p,p.x+stick.dx*3,p.y+stick.dy*3,p.spd,dt,12.5);return steer(p,lx,ly,p.spd,dt)}
  if(p.stj==='ret')return steer(p,lx+4,ly+(p.y<ly?-2.5:2.5),p.spd,dt);
  const g={x:lx,y:ly,side:'o'};
  if(p.eng||p.jam)return stBlock(p,dt,g,1);
  for(const o of P)if(o.side==='d'&&hyp(o.x-p.x,o.y-p.y)<7&&(o.x-lx)>-2)return stBlock(p,dt,g,1);
  steer(p,lx+(st.kind==='ko'?(p.stj==='hands'||p.homeX>st.spot-15?13:8):10),lerp(p.homeY,ly,.35),p.spd*.92,dt);
}
/* blocking in space: get between your man and the ball, engage, hold him until he sheds */
function stBlock(b,dt,g,dir){
  const d=b.eng;
  if(d){if(d.engBy!==b||d.stun>0||d.fallen||hyp(d.x-b.x,d.y-b.y)>1.9){b.eng=null;if(d.engBy===b)d.engBy=null}
    else{b.engaged=d.engaged=true;const ux=g.x-d.x,uy=g.y-d.y,n=hyp(ux,uy)||1;steer(b,d.x+ux/n*.95,d.y+uy/n*.95,b.spd,dt,18);
      const lam=clamp(.35+.22*((d.pl.shd+.5*d.pl.str)-(b.pl.blk+.5*b.pl.str))+(b.jam?.25*((d.pl.spd+d.pl.agi)/2-3):0)+(d.force?.9:0),.08,1.4);d.force=false;
      if(Math.random()<lam*dt){b.eng=null;d.engBy=null;d.freeT=.6;b.stun=.35;b.fallen=Math.random()<.3;b.jam=false;setAnim(d,d.pl.str>d.pl.agi?'rip':'swim')}
      return}}
  let t=b.tgt;
  if(!t||t.stun>0||t.engBy&&t.engBy!==b||hyp(t.x-b.x,t.y-b.y)>12){t=null;let bs=1e9;b.jam=false;
    for(const o of P){if(o.side===b.side||o.stun>0||o.engBy&&o.engBy!==b||o===play.carrier)continue;const dg=hyp(o.x-g.x,o.y-g.y),db=hyp(o.x-b.x,o.y-b.y);if(dg>16&&db>8)continue;
      const s=dg+db*.6+(o.claim&&o.claim!==b?5:0)+((o.x-g.x)*dir<-2?6:0);if(s<bs){bs=s;t=o}}
    b.tgt=t}
  if(t){t.claim=b;const ux=g.x-t.x,uy=g.y-t.y,n=hyp(ux,uy)||1;steer(b,t.x+ux/n*.9,t.y+uy/n*.9,b.spd,dt);
    if(t.freeT<=0&&!(t.lunge>0)&&!t.engBy&&hyp(t.x-b.x,t.y-b.y)<1.15){t.engBy=b;b.eng=t;b.engaged=t.engaged=true;setAnim(b,'block',1)}}
  else steer(b,g.x+dir*6,clamp(b.y,2,FW-2),b.spd*.8,dt);
}
/* pursuit: angle to the meeting point, dive when close; blocked men only lean */
function stChase(d,dt,c){
  if(d.engBy){const b=d.engBy;if(b.eng!==d||b.stun>0||hyp(b.x-d.x,b.y-d.y)>1.9)d.engBy=null;else{d.engaged=true;steer(d,c.x,c.y,d.spd*.16,dt,6);if(d===S.ctrl&&stick&&stick.m>12){d.vx+=stick.dx*4*dt;d.vy+=stick.dy*4*dt}return}}
  if(d===S.ctrl&&stick&&stick.m>12)return steer(d,d.x+stick.dx*3,d.y+stick.dy*3,d.spd,dt,12.5);
  const [tx,ty]=intercept(d,c,d.spd),n=hyp(c.x-d.x,c.y-d.y);
  if(n<2.2&&n>1.05&&d.lungeCD<=0&&d!==S.ctrl&&Math.random()<dt*5){d.lunge=.28;d.lungeCD=1.5;d.lx=c.x+c.vx*.26;d.ly=c.y+c.vy*.26;return}
  steer(d,tx,ty,d.spd*(d.freeT>0?1.08:1),dt);
}
/* the ball carrier on a return: the user's stick (straight upfield by default) or the CPU's lane search */
function stRunner(c,dt){
  const pl=play,st=pl.st,dir=stDir(c);
  if(st.ezT!=null){st.ezT-=dt;if(stick&&stick.m>12)st.ezT=null;else{steer(c,c.x,c.y,0,dt);if(st.ezT<=0){st.ezT=null;return stEnd('tb','Touchback')}return}}
  if(c.user){const spd=c.spd*moveMul();let dxv=dir,dyv=0;if(stick&&stick.m>12){dxv=stick.dx;dyv=stick.dy}
    if(pl.jukeT>0){dyv+=pl.jukeDir*1.1;dxv=dir*Math.max(dxv*dir,.5)}
    const n=hyp(dxv,dyv)||1;let vx=dxv/n*spd,vy=dyv/n*spd;if(pl.dive>0){vy*=.3;vx=dir*Math.max(vx*dir,spd*.9)}
    phyMove(c,vx,vy,dt,pl.jukeT>0?2.6:pl.spinT>0?1.8:PHY.user)}
  else{let best=-1e9,bh=0;const rh=c.rh||0;
    for(let a=-1.3;a<=1.31;a+=.26){const hx=Math.cos(a)*dir,hy=Math.sin(a);let sc=Math.cos(a)*1.5+(Math.abs(a-rh)<.2?.35:0);
      for(const d of P){if(d.side===c.side||d.stun>0)continue;const rx=d.x-c.x,ry=d.y-c.y,dist=hyp(rx,ry)||.1;if(dist>10)continue;const proj=(rx*hx+ry*hy)/dist;if(proj<=.15)continue;sc-=proj*proj*(10-dist)/10*(d.engaged?.35:1.7)}
      const ny=c.y+hy*4;if(ny<1.5||ny>FW-1.5)sc-=2;if(sc>best){best=sc;bh=a}}
    c.rh=bh;let tx=c.x+Math.cos(bh)*5*dir,ty=c.y+Math.sin(bh)*5;if(pl.jukeT>0){ty+=pl.jukeDir*3.5;tx-=dir}
    steer(c,tx,ty,c.spd*moveMul(),dt,pl.jukeT>0?24:10);
    if(pl.jukeCD<=0&&pl.dive<=0&&pl.hurdle<=0){let d=null,dd=2.5;for(const o of P){if(o.side===c.side||o.stun>0||o.engaged||(o.x-c.x)*dir<-1.5)continue;const k=hyp(o.x-c.x,o.y-c.y);if(k<dd){dd=k;d=o}}if(d&&Math.random()<dt*1.5*(.35+.1*c.pl.car))aiRunMove(c,d)}}
  if(pl.hurdle>0){pl.hurdle-=dt;const t=1-pl.hurdle/.5;c.z=Math.max(0,Math.sin(t*Math.PI)*.95)}else if(pl.dive<=0)c.z=0;
  if(pl.dive>0){pl.dive-=dt;c.z=Math.max(0,Math.sin((1-pl.dive/.38)*Math.PI)*.35);if(pl.dive<=0){c.z=0;c.fallen=true;c.x+=.8*dir;spawnTurf(c.x,c.y,8);return stEnd('tackle','Dive')}}
  c.stiff=Math.max(0,c.stiff-dt);
}
/* tackling in either direction (05c geometry, break and evade odds) */
function stTackleCheck(c){
  const pl=play;
  for(const d of P){
    if(d.side===c.side||d.stun>0)continue;const dist=hyp(d.x-c.x,d.y-c.y),reach=d.lunge>0?(d.userLunge?1.55:1.3):1.05;if(dist>=reach)continue;
    let arm=false;if(d.engaged){if(d.armTried||dist>.85)continue;d.armTried=true;if(Math.random()>.12)continue;arm=true}
    tkGeo(c,d);if(arm){TK.head=false;TK.behind=true}
    if(pl.hurdle>0&&c.z>.25){if(d.evadeId===pl.moveId)continue;d.evadeId=pl.moveId;if(Math.random()<clamp((d.lunge>0?.62:.3)+.08*(c.pl.agi-3)-.06*(d.pl.tkl-3),.08,.9)){d.stun=1;evaded(c,d,'hurdle');continue}return stTackled(c,d)}
    if((pl.jukeT>0||pl.spinT>0)&&d.evadeId!==pl.moveId&&!arm){d.evadeId=pl.moveId;const k=pl.spinT>0?'spin':'juke';if(Math.random()<evadeP(c,d,k)){evaded(c,d,k);continue}}
    let gang=false,near=false;for(const o of P){if(o===d||o.side!==d.side||o.stun>0)continue;const k=hyp(o.x-c.x,o.y-c.y);if(k<1.4&&!o.engaged)gang=true;if(k<3.5)near=true}
    let q=breakP(c,d)+(arm?.1:0);if(gang)q*=PHY.gang;else if(!near&&!arm)q+=PHY.open;
    if(Math.random()<clamp(q,.02,.7)){brokenTackle(c,d,arm);continue}
    return stTackled(c,d);
  }
}
function stTackled(c,d){
  const pl=play,dir=stDir(c);c.fallen=true;d.fallen=true;dirty(c);dirty(d);setAnim(c,'tackled');setAnim(d,'tackle');pl.tackler=d;
  const big=hyp(d.vx-c.vx,d.vy-c.vy)>9&&Math.random()<(d.pl.tkl>=4||d.pl.str>=4?.6:.25);
  fx('tackle',{c,d,big});S.shake=.12+d.pl.str*.05+(big?.25:0);spawnTurf(c.x,c.y,big?16:10);credit(d,'tkl',1,big?6:3);haptic(big?'heavy':'medium');injuryCheck(c,d,big);
  const md=d.mass||230,pc=(c.mass||210)*Math.max(0,c.vx*dir)*(.7+.08*c.pl.str),pd=(md*Math.max(0,-d.vx*dir)+md*(TK.behind?1.2:TK.head?2.6:1.8))*(.78+.075*d.pl.str);
  const fp=clamp((pc-pd)/700+R(-.25,.25),-1.2,1.4);pl.fp=Math.max(0,fp);c.pile=d.pile=.4;c.pileV=d.pileV=dir*pl.fp/.4;
  if(big){slowMo(.4);toast('BIG HIT!');sfx('thump');pl.bigHit=true}
  if(Math.random()<Math.max(.004,PHY.fum*.9+(big?.03:0)+.005*(3-c.pl.car)))return stFumble(c,d,'Fumble');
  stEnd('tackle');
}

/* ---------- kick in the air: CPU fair catch / let it bounce, the catch, muffs ---------- */
function stAirTick(dt){
  const st=play.st,b=ball;b.t+=dt;const p=Math.min(1,b.t/b.T);b.x=lerp(b.fx,b.tx,p);b.y=lerp(b.fy,b.ty,p);b.z=4*b.h*p*(1-p)+(b.z0||0)*(1-p);b.spin+=dt*16;
  if(!st.decided&&b.T-b.t<.7)stDecide();
  if(p<1)return;
  const lx=b.tx,ly=b.ty;
  if(ly<0||ly>FW)return st.kind==='ko'?stEnd('koob','Kickoff out of bounds',{side:'o',x:STK.koOOB,y:clamp(ly,0,FW)}):lx<10?stEnd('tb','Touchback',{side:'o',x:5,y:clamp(ly,0,FW)}):stEnd('oob','Out of bounds',{side:'o',x:lx,y:clamp(ly,0,FW)});
  if(lx<0)return stEnd('tb','Touchback',{side:'o',x:5,y:ly});
  const f=st.fielder;
  if(f&&!st.noCatch&&f.stun<=0&&hyp(f.x-lx,f.y-ly)<1.5){
    if(st.sub==='onside'){if(Math.random()<(st.alert?.6:.45)){st.touched=true;ball={state:'held',x:f.x,y:f.y,z:0};play.carrier=f;st.gx=st.rx=f.x;setAnim(f,'catch');return stEnd('down','Onside kick recovered')}st.touched=true;st.lastSide='o'}
    else return stCatch(f);
  }
  if(lx<10&&!st.touched)return stEnd('tb','Touchback',{side:'o',x:5,y:ly});
  const vx=(b.tx-b.fx)/b.T,vy=(b.ty-b.fy)/b.T,k=st.sub==='squib'?.7:st.style==='rugby'?.55:.32;
  ballLoose(lx,ly,vx*k,vy*k,-R(5,7),1.4);st.phase='loose';st.lt=0;st.still=0;stCtrlInit();showActs();
}
function stDecide(){
  const st=play.st;st.decided=true;const f=st.fielder;if(!f||st.sub==='onside')return;
  const lx=ball.tx,ly=ball.ty,[,kd]=nearest(P,lx,ly,p=>p.side==='d'&&p.stun<=0);
  if(st.kind==='punt'&&lx<18&&!st.fair){st.noCatch=true;if(f.user)toast('Letting it bounce');return}   // never field a punt inside the 8
  if(f.user)return;
  if(st.kind==='punt'?kd<7:(lx<35&&kd<5))st.fair=true;
  if(st.fair)toast(`${f.team.abbr} signals for a fair catch`);
}
function stCatch(f){
  const pl=play,st=pl.st;st.touched=true;st.lastSide='o';
  const mp=st.kind==='punt'?.012+(S.wx==='Rain'||S.wx==='Snow'?.025:0)+.006*(3-f.pl.cat)+(st.style==='rugby'?.01:0):.004;
  if(Math.random()<Math.max(.002,mp)*(st.fair?.6:1)){st.muff=true;toast('Muffed!');slowMo(.6);setAnim(f,'catch');f.recCD=.5;ballLoose(ball.tx,ball.ty,R(-3,3),R(-3,3),R(1,3),1.2);st.phase='loose';st.lt=0;st.still=0;stCtrlInit();showActs();return}
  ball={state:'held',x:f.x,y:f.y,z:0};pl.carrier=f;st.gx=st.rx=f.x;setAnim(f,'catch');f.vx*=.3;f.vy*=.3;
  if(st.fair){fx('fairCatch',{p:f});return stEnd('fc','Fair catch')}
  if(st.kind==='ko'&&f.x<10){if(!f.user){if(f.x<6.5||Math.random()<.5)return stEnd('tb','Touchback')}else st.ezT=.5}
  st.phase='ret';st.t=0;stCtrlInit();showActs();
  if(f.user)hint(st.ezT!=null?'In the end zone · hold still to take a knee · drag to run it out':'Drag to steer · JUKE / SPIN / TRUCK');
}

/* ---------- loose ball: bounces, scrambles, recoveries ---------- */
function stBallTick(dt){
  const st=play.st,b=ball;b.vz-=STK.g*dt;b.h+=b.vz*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;const sp=hyp(b.vx,b.vy);b.spin+=dt*(3+sp*3);
  if(b.h<=0){b.h=0;if(b.vz<-1.2){const a=Math.atan2(b.vy,b.vx)+R(-1,1)*(st.kind==='punt'&&!st.muff?.7:1.1),k=R(.5,.9);b.vx=Math.cos(a)*sp*k;b.vy=Math.sin(a)*sp*k;b.vz=-b.vz*R(.25,.6)*(Math.random()<.12?1.7:1)}
    else{b.vz=0;const ns=Math.max(0,sp-6.5*dt);if(sp>0){b.vx*=ns/sp;b.vy*=ns/sp}}}
  b.z=(b.h+.15-1.6)/.9;b.fx=b.x;b.fy=b.y;b.tx=b.x+b.vx*.35;b.ty=b.y+b.vy*.35;st.lt=(st.lt||0)+dt;
  if(b.y<0||b.y>FW||b.x<0||b.x>120)return stLooseOut();
  const kick=(st.kind==='ko'||st.kind==='punt')&&!st.blocked&&!st.fumBy;
  if(kick&&b.x<10&&!st.touched)return stEnd('tb','Touchback',{side:'o',x:5,y:b.y});
  if(sp<.25&&b.h<.05){st.still=(st.still||0)+dt;if(st.still>.7)return stLooseStop()}else st.still=0;
  if(st.lt>7)stLooseStop();
}
function stLooseOut(){
  const st=play.st,b=ball,x=clamp(b.x,0,120),y=clamp(b.y,0,FW),kick=(st.kind==='ko'||st.kind==='punt')&&!st.blocked&&!st.fumBy;
  if(kick&&!st.touched)return st.kind==='ko'?stEnd('koob','Kickoff out of bounds',{side:'o',x:STK.koOOB,y}):x<10?stEnd('tb','Touchback',{side:'o',x:5,y}):stEnd('oob','Out of bounds',{side:'o',x,y});
  const side=kick?'o':st.lastSide||'o';   // a fumble out of bounds stays with the team that fumbled it
  if(side==='o'?x>=110:x<=10)return stEnd('tb','Through the end zone · touchback',{side:side==='o'?'d':'o',x,y});
  stEnd('oob','Out of bounds',{side,x,y});
}
function stLooseStop(){
  const st=play.st,b=ball;
  if((st.kind==='punt'||st.kind==='ko')&&!st.touched&&!st.blocked&&!st.fumBy)return stEnd('down','Downed',{side:'o',x:b.x,y:b.y});
  const [p]=nearest(P,b.x,b.y,q=>stCanRec(q));if(p)return stRecover(p,true);stEnd('down','',{side:st.lastSide||'o',x:b.x,y:b.y});
}
function stCanRec(p){const st=play.st;if(p.stun>0&&!(p.lunge>0))return false;
  if(st.kind==='ko'&&p.side==='d'&&!st.touched&&ball.x>st.spot-10)return false;   // a free kick must go 10 yards first
  if(st.kind==='punt'&&!st.touched&&!st.blocked&&!st.fumBy)return false;
  return true}
function stLooseAI(p,dt){
  const st=play.st,b=ball,px=b.x+b.vx*.35,py=b.y+b.vy*.35,n=hyp(px-p.x,py-p.y);
  if(p===S.ctrl&&stick&&stick.m>12)return steer(p,p.x+stick.dx*3,p.y+stick.dy*3,p.spd,dt,12.5);
  if(st.kind==='punt'&&!st.touched&&!st.blocked&&p.side==='o'){if(n<4){const ax=p.x-px,ay=p.y-py,m=hyp(ax,ay)||1;return steer(p,p.x+ax/m*3,p.y+ay/m*3,p.spd*.7,dt)}return steer(p,p.x,p.y,0,dt)}   // stay away from a bouncing punt
  const can=stCanRec(p);if(!can&&n<2.6)return steer(p,p.x,p.y,0,dt);
  if(can&&n<2.4&&n>.9&&b.h<.9&&p.recCD<=0&&p.lungeCD<=0&&p!==S.ctrl&&Math.random()<dt*3.5){p.lunge=.3;p.lungeCD=1.3;p.lx=px;p.ly=py;setAnim(p,'dive');return}
  steer(p,px,py,p.spd*(n>22?.75:1),dt);
}
function stRecoverCheck(){
  const st=play.st,b=ball;if(b.h>1.7)return;
  if(st.kind==='punt'&&!st.touched&&!st.blocked&&!st.fumBy){   // the cover team downs a rolling punt
    if(b.h<1&&(hyp(b.vx,b.vy)<5||b.x<16))for(const p of P)if(p.side==='d'&&p.stun<=0&&hyp(p.x-b.x,p.y-b.y)<1)return stEnd('down','Downed',{side:'o',x:b.x,y:b.y});return}
  let best=null,bd=9;for(const p of P){if(p.recCD>0||!stCanRec(p))continue;const k=hyp(p.x-b.x,p.y-b.y);if(k<(p.lunge>0?1.35:1)&&k<bd){bd=k;best=p}}
  if(!best)return;const p=best;p.recCD=.45;
  let pr=.3+.1*(p.pl.car-3)+.08*(p.pl.awr-3)-.25*Math.max(0,b.h-.35)-.03*hyp(b.vx,b.vy)+(p.lunge>0?.12:0);
  if(st.sub==='onside'&&p.side==='o')pr+=st.alert?.02:-.05;if(st.fumBy&&p.side===st.fumBy.side)pr+=.03;
  if(Math.random()<clamp(pr,.06,.82))return stRecover(p,p.lunge>0||P.some(o=>o.side!==p.side&&o.stun<=0&&hyp(o.x-p.x,o.y-p.y)<1.8));
  if(p.side==='o'&&(st.kind==='ko'||st.kind==='punt')){st.touched=true;st.lastSide='o'}
  const a=R(0,6.283),sp=R(1.5,4.5);b.vx=b.vx*.3+Math.cos(a)*sp;b.vy=b.vy*.3+Math.sin(a)*sp;b.vz=R(.8,2.8);b.h=Math.max(b.h,.2);fx('deflect',{p,x:b.x,y:b.y});
}
function stRecover(p,down){
  const pl=play,st=pl.st;ball={state:'held',x:p.x,y:p.y,z:0};pl.carrier=p;p.lunge=0;p.stun=0;st.recd=true;
  if(st.fumBy){sAdd(p.team,'fr');if(p.team!==st.fumBy.team){sAdd(st.fumBy.team,'fumLost');credit(p,'xp',20,0)}}
  fx('recover',{p,team:p.team});if(p.side==='d')st.chg=true;
  st.gx=st.rx=p.x;st.lastSide=p.side;st.touched=st.touched||p.side==='o';
  const kickRec=(st.kind==='ko'||st.kind==='punt')&&p.side==='d'&&!st.blocked&&!st.fumBy;   // the kicking team may not advance a recovered kick
  if(kickRec||down){setAnim(p,'dive');p.fallen=true;return stEnd('down',kickRec?'Recovered by the kicking team':'Recovered')}
  st.phase='ret';st.t=0;toast(`${p.team.abbr} scoops it up!`);stCtrlInit();showActs();
  if(p.user)hint('Scoop! Drag to run · JUKE / SPIN / TRUCK');
}

/* ---------- user control: who the stick drives, taps, the action bar ---------- */
function stCtrlInit(){
  const pl=play,st=pl&&pl.st;if(!st)return;const c=pl.carrier;
  if(c&&c.user){S.ctrl=c;return}
  if(st.phase==='set'||st.phase==='air'){if(st.kt===S.home){const ly=st.phase==='air'?ball.ty:CEN;let b=null,bd=1e9;for(const p of P){if(!p.user||p.stj==='K'||p.stj==='P')continue;const d=Math.abs(p.y-ly)+(p.stj==='gun'?-3:0);if(d<bd){bd=d;b=p}}S.ctrl=b}else S.ctrl=null;return}
  const fx0=c?c.x:ball.x,fy0=c?c.y:ball.y;let best=null,bd=1e9;for(const p of P){if(!p.user||p.stun>0||p===c)continue;const d=hyp(p.x-fx0,p.y-fy0);if(d<bd){bd=d;best=p}}S.ctrl=best;
}
function stFair(){const st=play&&play.st;if(!st||play.ended||st.fair||st.rt!==S.home||(st.phase!=='air'&&st.phase!=='set')||st.sub==='onside')return;st.fair=true;st.noCatch=false;toast('Fair catch signaled');haptic('light');showActs()}
function stTap(){
  const pl=play,st=pl&&pl.st;if(!st||pl.ended)return true;
  if((st.phase==='air'||st.phase==='set')&&st.rt===S.home){if(st.sub!=='onside')stFair();return true}
  const c=pl.carrier;if(c&&c.user)return true;
  if(st.phase==='loose'){const d=S.ctrl;if(d&&d.lungeCD<=0&&d.stun<=0&&!(d.lunge>0)&&hyp(ball.x-d.x,ball.y-d.y)<3.6){d.lunge=.3;d.lungeCD=1.1;d.lx=ball.x+ball.vx*.25;d.ly=ball.y+ball.vy*.25;d.userLunge=true;setAnim(d,'dive');sfx('cut')}return true}
  return false;   // chasing: the normal TACKLE lunge on S.ctrl
}
function stSwitch(t){
  const st=play.st;if((st.phase==='air'||st.phase==='set')&&st.rt===S.home)return stTap();
  if(t&&t.user&&t!==play.carrier){S.ctrl=t;sfx('cut');return}
  const c=play.carrier,fx0=c?c.x:ball.x,fy0=c?c.y:ball.y;let best=null,bd=1e9;for(const p of P){if(!p.user||p===S.ctrl||p===c||p.stun>0)continue;const d=hyp(p.x-fx0,p.y-fy0);if(d<bd){bd=d;best=p}}if(best){S.ctrl=best;sfx('cut')}
}
function stActs(){
  const a=$('#actBar');if(!a||!play)return;const st=play.st,c=play.carrier;let h='';
  if(!play.ended){
    if(c&&c.user&&st.phase==='ret')h='<button data-a="juke-1">JUKE ▲</button><button data-a="juke1">JUKE ▼</button><button data-a="spin">SPIN</button><button data-a="truck">TRUCK</button><button data-a="hurdle">HURDLE</button><button data-a="dive">DIVE</button>';
    else if((st.phase==='air'||st.phase==='set')&&st.rt===S.home){if(!st.fair&&st.sub!=='onside')h='<button data-a="fair" class="big">FAIR CATCH</button>'}
    else if(P.some(p=>p.user))h=`<button data-a="tackle" class="big">${st.phase==='loose'?'DIVE':'TACKLE'}</button><button data-a="switch">SWITCH</button>`}
  a.innerHTML=h;a.hidden=!h;
  a.querySelectorAll('[data-a]').forEach(b=>b.onpointerdown=e=>{e.preventDefault();e.stopPropagation();ac();const k=b.dataset.a;
    if(k==='fair')return stFair();if(k==='tackle')return userTackle();if(k==='switch')return switchDefender();if(!isRunner())return;
    if(k==='juke-1')doJuke(-1);else if(k==='juke1')doJuke(1);else if(k==='spin')doSpin();else if(k==='truck')doTruck();else if(k==='hurdle')doHurdle();else if(k==='dive')doDive()});
}
/* touches during special plays: claim the pointer before 06-input (registered first) so the stick drives the
   right man: 'stick' when the user has the ball (swipes juke / dive), 'dstick' otherwise (tap = fair catch / dive) */
$('#field').addEventListener('pointerdown',e=>{
  if(S.paused||S.phase!=='live'||!play||!play.st||play.ended||touch)return;
  const c=play.carrier,m=c&&c.user&&play.st.phase==='ret'?'stick':'dstick';
  if(m==='dstick'&&(play.st.phase==='ret'||play.st.phase==='loose')){const fx0=c?c.x:ball.x,fy0=c?c.y:ball.y,[n,nd]=nearest(P,fx0,fy0,p=>p.user&&p!==c&&p.stun<=0);if(n&&(!S.ctrl||hyp(S.ctrl.x-fx0,S.ctrl.y-fy0)>nd+4))S.ctrl=n}
  try{e.target.setPointerCapture(e.pointerId)}catch(_){}
  touch={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,ox:e.clientX,oy:e.clientY,t0:performance.now(),moved:0,mode:m};
});

/* ---------- dead ball: rules → result, stats, the broadcast ---------- */
function stEnd(kind,msg,o){
  const pl=play,st=pl.st;if(pl.ended)return;o=o||{};
  pl.ended=true;S.phase='dead';hint('');touch=null;aim=null;stick=null;hideActs();
  const c=pl.carrier;let side=o.side||(c?c.side:st.lastSide||'o'),x=o.x,y=o.y!=null?o.y:c?c.y:ball.y,sk=kind;
  if(x==null){if(c){const dir=stDir(c);x=c.x+dir*.45+(kind==='tackle'?dir*(pl.fp||0):0)}else x=ball.x}
  const dir=side==='o'?1:-1;
  if(!['td','tb','koob','safety'].includes(sk)){
    if(c&&(dir>0?x>=110:x<=10))sk='td';
    else if(dir>0?x<=10:x>=110){const gx=st.gx!=null?st.gx:x,gin=dir>0?gx<=10:gx>=110,near=dir>0?gx<=15:gx>=105;   // own end zone
      if(st.imp===side)sk='safety';else if(gin)sk='tb';else if(near){x=gx;sk='spot'}else sk='safety'}}
  /* a blocked punt the punting team keeps short of the line to gain = turnover on downs */
  if(st.kind==='punt'&&st.blocked&&side==='d'&&!['td','safety'].includes(sk)&&120-x<st.ltg){side='o';msg='Turnover on downs'}
  x=clamp(x,0,120);
  const team=side==='o'?offT():defT(),ret=c&&st.rx!=null?c:null,yds=ret?Math.round((clamp(x,10,110)-st.rx)*stDir(ret)):0;
  pl.result={kind:'st',sk,x,y:clamp(y,0,FW),side,msg,team};
  deadT=sk==='td'?2.8:st.kind==='int'||st.fumBy||st.muff||st.blocked?2.2:1.6;
  /* stats */
  if(ret&&!st.fumBy&&['tackle','oob','td','down','spot'].includes(sk)){
    if(st.kind==='ko'&&ret.side==='o'){sAdd(ret.team,'kr');sAdd(ret.team,'krYds',yds);if(sk==='td')sAdd(ret.team,'krTD')}
    else if(st.kind==='punt'&&ret.side==='o'&&!st.blocked){sAdd(ret.team,'pr');sAdd(ret.team,'prYds',yds);if(sk==='td')sAdd(ret.team,'prTD')}
    else if(st.kind==='int'&&ret.side==='d'){sAdd(ret.team,'intYds',yds);if(sk==='td')sAdd(ret.team,'intTD')}}
  if(st.fumBy&&sk==='td')sAdd(team,'fumTD');
  if(sk==='fc')sAdd(team,'fc');
  if(sk==='tb'){fx('touchback',{});if(st.kind==='ko')sAdd(st.kt,'koTB');else if(st.kind==='punt'&&!st.touched)sAdd(st.kt,'puntTB')}
  if(st.kind==='punt'&&!st.blocked)sAdd(st.kt,'puntYds',Math.round(st.spot-(sk==='tb'&&!st.touched?10:st.gx!=null?st.gx:x)));
  /* the call */
  const nm=p=>p&&p.pl?p.pl.last:'',newX=side==='o'?x:120-x,lab=sk==='tb'?(st.kind==='ko'?'25':'20'):sk==='koob'?'35':spotLabelFor(clamp(newX,10,110),team===S.home?'home':'away');
  const head={ko:st.sub==='onside'?'ONSIDE KICK':'KICKOFF',punt:st.blocked?'BLOCKED PUNT':'PUNT',int:'INTERCEPTION',fum:'FUMBLE'}[st.kind];
  let line=sk==='td'?'Touchdown':sk==='safety'?'Safety':sk==='tb'?'Touchback':sk==='fc'?'Fair catch':sk==='koob'?'Out of bounds':ret&&yds?`${nm(ret)} · ${yds} yd return`:msg||'Down';
  if(sk==='td'){const big={ko:'Kick return touchdown!',punt:st.blocked?'Blocked punt touchdown!':'Punt return touchdown!',int:'Pick six!',fum:'Scoop and score!'}[st.kind];
    banner(st.fumBy&&st.kind!=='fum'?'Fumble return touchdown!':big,team.c1,`${nm(c)} · ${team.abbr}`);fx('td',{p:c,team});sfx(team===S.home?'roar':'groan');slowMo(.5);
    if(c&&c.user){sfx('fight');S.celebrate=c;spawnConfetti(c.x,c.y);showCelebrate()}}
  else if(sk==='safety'){banner('Safety',(team===S.home?S.away:S.home).c1)}
  else{const lost=st.fumBy&&team!==st.fumBy.team;if(lost||st.muff&&side==='d'||st.kind==='ko'&&st.sub==='onside'&&side==='d'){banner(st.kind==='ko'?'Onside kick recovered!':'Turnover!',team.c1);sfx(team===S.home?'roar':'groan');fx('turnover',{team,kind:st.kind})}else sfx('whistle')}
  if(typeof BC!=='undefined'){
    if(st.kind==='int')BC.play({kind:'int',x,y},0);
    else if(st.kind==='fum'&&!st.chg&&side==='o'&&sk!=='td'&&sk!=='safety')BC.play({kind:'fum',x,y,defRec:false},Math.round(x-S.los));
    else if(sk!=='td')BC.card(head,line,`${team.abbr} ball${sk==='safety'?'':' at the '+lab}`,team.c1,sk==='td'||st.blocked||st.muff);
    if(sk==='td'||yds>=30||st.blocked||st.muff&&side==='d'||st.fumBy&&team!==st.fumBy.team)stReplay()}
  if(st.fumBy){play.result.defRec=team!==st.fumBy.team;fx('fumble',{p:st.fumBy,x:ball.x,y:ball.y,team:st.fumBy.team})}
  logPBP(`${head}: ${line}${sk!=='td'&&sk!=='safety'?` · ${team.abbr} ball at the ${lab}`:''}`,sk==='td'||st.kind==='int'||st.fumBy?'big':'');
  fx('dead',{kind:sk,p:c,x:S.los+(ret?yds:0)*(ret&&ret.side==='d'?-1:1),y,team:ret?ret.team:team,msg});
  if(st.kind==='int'||st.kind==='fum')fatSave();   // kick units are fresh legs: only scrimmage snaps count toward fatigue
}
function stReplay(){if(LG.settings.replay==='off'||typeof REC==='undefined'||REC.length<=20)return;if(LG.settings.replay==='auto'){deadT+=.3;setTimeout(()=>{if(S.phase==='dead')startReplay()},700)}else{$('#replayBtn').hidden=false;deadT=Math.max(deadT,3.2);setTimeout(()=>$('#replayBtn').hidden=true,3200)}}
function stOTOver(){S.phase='wait';setTimeout(()=>{if(S.score[0]!==S.score[1])gameOver();else{S.otRound++;startOT()}},900)}
function stApply(){
  const r=play.result,st=play.st;
  if(S.celebFlag){S.celebFlag=false;flagMsg(`Unsportsmanlike conduct · ${S.home.abbr} · 15 yards on the kickoff`);penStat(S.home,'usc',15);S.kickPen=true}
  S.celebrate=null;S.celebPose=null;S.clockRun=false;S.clockHold=0;S.ctrl=null;if(st.ck)S.ctrlKey=st.ck;
  const team=r.side==='o'?offT():defT(),ui=team===S.home?0:1,p0=st.poss0==='away'?S.away:S.home;
  /* booth review: fumble or down by contact? (the engine's call is the truth: the ruling stands) */
  if(st.kind==='fum'&&team!==p0&&!play.revDone&&r.sk!=='td'&&Math.random()<.6){play.revDone=1;return reviewBeat('Fumble · was he down by contact?','confirmed',`Fumble · ${team.abbr} ball`,()=>stApply())}
  if(r.sk==='td'){S.score[ui]+=6;if(st.kind!=='ko'&&st.kind!=='punt')dres(team===p0?'TD':st.kind==='int'?'INT':'Fumble');if(S.ot&&(team!==p0||S.otPos===1&&S.score[ui]>S.score[1-ui]))return stOTOver();
    if(ui===0){S.poss='home';S.phase='pat';return setTimeout(showPAT,500)}S.poss='away';S.phase='wait';return aiPAT()}
  if(r.sk==='safety'){S.score[1-ui]+=2;fx('safety',{team:ui?S.home:S.away});if(st.kind==='fum'&&team===p0)dres('Safety');if(S.ot)return stOTOver();return boundary(()=>stKickoff(ui?'home':'away','deep',30,'Free kick after the safety'))}
  let x=r.side==='o'?r.x:120-r.x;
  if(r.sk==='tb')x=st.kind==='ko'?STK.koTB:STK.ptTB;else if(r.sk==='koob')x=STK.koOOB;else if(r.sk==='fc'&&st.kind==='ko')x=Math.max(STK.koTB,x);
  x=Math.round(clamp(x,11,109)*2)/2;S.ballY=clamp(r.y,HASH1,HASH2);
  if(st.kind==='fum'&&!st.chg&&team===p0){   // the offense fell on its own fumble: the series goes on
    S.clockRun=r.sk!=='oob'||!inside2();S.clockHold=r.sk==='oob'&&S.clockRun?2.5:0;const ts=tstat();
    if(x>=S.firstDownX){S.los=x;S.down=1;S.firstDownX=Math.min(110,x+10);ts.firstDowns++;toast('First down');if(S.clockRun&&inside2())S.clockHold=Math.max(S.clockHold,2.2);return nextSnap()}
    if(S.down===4)return turnoverDowns(x);S.down++;S.los=x;return nextSnap()}
  if(st.kind==='fum'||st.kind==='int'){if(team!==p0&&st.kind==='fum')dres('Fumble');S.rzActive=false}
  if(S.ot)return otNext(st.poss0||'home');
  if(r.sk==='fc'&&stFCK(team,x))return;
  const why={ko:st.sub==='onside'?'Onside kick':'Kick return',punt:'Punt',int:'Interception',fum:'Fumble recovery'}[st.kind];
  return team===S.home?toUser(x,why):toOpp(110-x,why);
}
/* 2026 NCAA fair catch kick: a free kick from the spot of the fair catch for 3 (distance = 120 - x) */
function stFCK(team,x){
  const dist=Math.round(120-x);
  if(team===S.home){if(dist>60)return false;S.phase='wait';
    showOpt(`<b>Fair catch</b> · ${esc(spotLabelFor(x,'home'))} · the free kick option`,[{t:'Fair catch kick',s:`${dist} yd free kick · 3 points`,f:()=>{S.poss='home';S.los=x;S.ballY=CEN;S.conv=false;startKick(dist,'fck')}},{t:'Offense',s:'1st & 10 from the spot',cls:'alt',f:()=>toUser(x,'Fair catch')}]);return true}
  const k=bestK(S.away,'acc');if(!k||!(S.q===2||S.q===4)||S.ot||S.clock>S.qlen*.06||dist>maxFG(k)-4)return false;
  const good=Math.random()<clamp(1.21-dist*.0125-(5-k.thr)*.03,.1,.985);sAdd(S.away,'fga');if(good)sAdd(S.away,'fgm');S.phase='wait';
  toast(`${S.away.abbr} lines up a ${dist}-yd fair catch kick`);logPBP(`${S.away.abbr} ${dist}-yard fair catch kick is ${good?'good':'no good'}.`);
  setTimeout(()=>{if(good){S.score[1]+=3;banner(`${S.away.abbr} fair catch kick · ${dist} yd`,S.away.c1);sfx('groan')}else{banner('Fair catch kick is no good',S.home.c1);sfx('roar')}
    setTimeout(()=>{if(good)return boundary(()=>kickoffTo('home','Kickoff'));toUser(Math.max(30,120-x),'Missed fair catch kick')},1200)},700);
  return true;
}
/* field goals / extra points: rare blocks, likelier behind a weak line */
function stBlockP(kind,dist,kt){const ol=(dcOf(kt).OL||[]).slice(0,5),avg=ol.length?ol.reduce((a,p)=>a+p.blk,0)/ol.length:3;return clamp((kind==='xp'?.006:.012+.0003*Math.max(0,dist-30))*(1+.4*(3-avg)),.002,.05)}
