/* 3D broadcast style (08t): switches a new dynasty to Settings › Art style › 3D broadcast, plays a kickoff, a pass
   thrown with the Arcade slingshot through real pointer events (screenToField / g3Aim), a run and a field goal in the
   behind-the-kicker view, then night + snow; checks the WebGL canvas is not blank and captures landscape 844×390 and
   portrait 390×844 frames. The main loop is paused and the engine stepped here (software WebGL is slow), with a few
   rendered frames before each capture so the camera springs settle.
   NODE_PATH=$(npm root -g) node tools/qa/threed.js [web/index.html] [outdir]            */
const Q=require('./_boot'),fs=require('fs'),path=require('path');
const OUT=process.argv[3]||path.join(Q.ROOT,'tools','qa','out-3d');fs.mkdirSync(OUT,{recursive:true});
const DRIVER=()=>{window.__T3={t:0,
  vis:s=>{const e=document.querySelector(s);return e&&!e.hidden},
  render(n){for(let i=0;i<(n||1);i++){this.t=Math.max(this.t+100,(G3.last||0)+100);updateCam(.1);updateParticles(.05);draw(this.t)}},
  blank(){const t=document.createElement('canvas');t.width=48;t.height=24;const g=t.getContext('2d');this.render(1);g.drawImage(G3.cv,0,0,48,24);const d=g.getImageData(0,0,48,24).data;let m=0,v=0,n=d.length/4;
    for(let i=0;i<d.length;i+=4)m+=d[i]+d[i+1]+d[i+2];m/=n;for(let i=0;i<d.length;i+=4){const q=d[i]+d[i+1]+d[i+2]-m;v+=q*q}return {mean:+(m/3).toFixed(1),sd:+Math.sqrt(v/n).toFixed(1)}},
  ui(want){const vis=this.vis;
    if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();return 1}
    if(vis('#card')&&document.querySelector('#dcGo')){document.querySelector('#dcGo').click();return 1}
    if(vis('#celebSheet')){const c=document.querySelector('#celebRow [data-c]');if(c)c.click();return 1}
    if(vis('#opt')){const b=document.querySelector('#optRow button');if(b)b.click();return 1}
    if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="auto"]')||document.querySelector('#call [data-dc]');if(a)a.click();return 1}
    if(S.phase==='presnap'&&uOff()&&vis('#call')&&!want){if(S.down===4&&!S.conv){if(fgDist()<=45)callSpecial('fg');else callSpecial('punt')}else{const pool=PLAYBOOK.filter(x=>!x.hail&&!x.special&&x.cat==='run');pickPlay(pool[0]||PLAYBOOK[0])}return 1}
    if(S.phase==='presnap'&&uOff()&&vis('#snapBar')&&!want){startPlay(S.pc);return 1}
    if(S.phase==='kick'&&kick&&!want){if(kick.stage==='aim'&&Math.abs(kick.ang)<.05)kickTap();else if(kick.stage==='power'&&kick.pow>.95)kickTap()}
    if(S.phase==='live'&&uOff()&&play&&play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q&&play.t>1.6&&!want){let best=null,bs=-1;for(const r of OFF){if(!eligible(r)||r.blocker)continue;const [,dd]=nearest(DEF,r.x,r.y);const s=dd+Math.max(0,r.x-S.los)*.05;if(s>bs){bs=s;best=r}}if(best)aiThrow(best)}
    return 0},
  step(){const real=1/60;
    if(S.phase==='presnap'){if(!uOff()&&aiSnapT>0){aiSnapT-=real;if(aiSnapT<=0){aiSnapT=0;startPlay(S.aiPlay)}}}
    else if(S.phase==='kick'){updateKick(real)}
    else if(S.phase==='replay'){if(typeof endReplay==='function')endReplay()}
    else if((S.phase==='live'||S.phase==='dead')&&play){simulate(real/2);simulate(real/2);if(S.phase==='live'&&typeof recFrame==='function')recFrame(real);if(S.phase==='dead'){deadT-=real;if(deadT<=0)applyResult()}}
    if(typeof BC!=='undefined'&&BC.tick)BC.tick(real);updateParticles(real)},
  /* step until cond() (or n seconds); want=true leaves the user's own calls to the caller */
  async until(cond,sec,want){for(let i=0;i<sec*60;i++){if(cond())return true;if(S.phase==='over')return false;if(this.ui(want))continue;this.step();const idle=['wait','hub','drive','pat'].includes(S.phase)||S.phase==='kick'&&(!kick||kick.done);if(i%240===0||idle)await new Promise(r=>setTimeout(r,idle?25:0))}return cond()},
  ptr(type,x,y){const e=new PointerEvent(type,{clientX:x,clientY:y,pointerId:7,bubbles:true,cancelable:true,isPrimary:true});cv.dispatchEvent(e)}
}};
async function shot(p,name){await p.screenshot({path:path.join(OUT,name+'.png')});}
async function run(b,w,h,tag,errs,full){
  const p=await Q.newPage(b,w,h,errs,1);await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
  await Q.startDynasty(p,'UGA');
  await p.evaluate(()=>{LG.settings.defMode='play';LG.settings.pregame=false;LG.settings.halftime=false;LG.settings.style='3d';applyStyle()});
  const ok=await p.evaluate(()=>({ok:G3.ok,isPix:isPix(),ds:document.documentElement.dataset.style,dr:document.documentElement.dataset.render}));
  console.log(tag,'style',JSON.stringify(ok));if(!ok.ok||ok.isPix||ok.ds!=='modern'||ok.dr!=='3d')errs.push(tag+' 3D style did not switch on');
  await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(300);
  await p.evaluate(DRIVER);await p.evaluate(()=>{S.paused=true});
  const log=[];const note=(k,v)=>log.push(k+'='+JSON.stringify(v));
  /* kickoff in the air */
  if(full){const got=await p.evaluate(()=>__T3.until(()=>S.phase==='live'&&play&&play.st&&ball.state==='air'&&ball.z>4,40));
    if(got){await p.evaluate(()=>__T3.render(4));await shot(p,tag+'-kickoff');note('kickoff',true)}}
  /* to the user's offense, presnap */
  const off=async()=>p.evaluate(()=>__T3.until(()=>S.phase==='presnap'&&uOff()&&__T3.vis('#call')&&S.down<4,900,true));
  if(!await off()){errs.push(tag+' never reached an offensive snap');return p}
  /* PASS: call a pass, presnap frame, snap, slingshot through pointer events */
  await p.evaluate(()=>{const pl=PLAYBOOK.find(x=>x.cat==='pass'&&!x.hail&&!x.special&&/Flood|Smash|Mesh|Verts|Four|Curl|Slant/i.test(x.name))||PLAYBOOK.find(x=>x.cat==='pass'&&!x.special);pickPlay(pl)});
  await p.evaluate(()=>__T3.render(6));await shot(p,tag+'-presnap');
  const bl=await p.evaluate(()=>__T3.blank());note('canvas',bl);if(bl.sd<6)errs.push(tag+' WebGL canvas looks blank '+JSON.stringify(bl));
  await p.evaluate(()=>{startPlay(S.pc)});
  await p.evaluate(()=>__T3.until(()=>play&&play.t>1.25||S.phase!=='live',8,true));
  const aimRes=await p.evaluate(()=>{if(S.phase!=='live'||!arcQB())return {skip:S.phase};const q=fieldToScreen(Q.x,Q.y,1),sx=Math.min(W*.5,q[0]+40),sy=q[1];S.paused=false;__T3.ptr('pointerdown',sx,sy);
    /* pull back toward the lower left: the throw goes up-field to the right */
    for(let i=1;i<=6;i++)__T3.ptr('pointermove',sx-i*Math.min(W,H)*.045,sy+i*Math.min(W,H)*.012);S.paused=true;return {aim:aim?{x:+aim.x.toFixed(1),y:+aim.y.toFixed(1),r:aim.r?aim.r.num:null}:null,qx:+Q.x.toFixed(1),qy:+Q.y.toFixed(1)}});
  note('aim',aimRes);if(!aimRes.skip&&(!aimRes.aim||aimRes.aim.x<=aimRes.qx))errs.push(tag+' slingshot did not aim downfield '+JSON.stringify(aimRes));
  await p.evaluate(()=>__T3.render(5));await shot(p,tag+'-pass-aim');
  const thr=await p.evaluate(()=>{if(!touch)return 'no touch';S.paused=false;__T3.ptr('pointerup',touch.x,touch.y);S.paused=true;return play&&play.thrown?'thrown':'not thrown'});note('throw',thr);
  if(full){await p.evaluate(()=>__T3.until(()=>ball.state!=='air'||ball.z>3.5,4,true));await p.evaluate(()=>__T3.render(3));await shot(p,tag+'-pass-air')}
  await p.evaluate(()=>__T3.until(()=>S.phase==='dead',12,true));
  if(full){const rp=await p.evaluate(()=>{if(typeof startReplay!=='function'||!REC.length)return 0;startReplay();updateReplay(1.2);__T3.render(4);return S.phase});if(rp==='replay'){await shot(p,tag+'-replay');await p.evaluate(()=>{endReplay()})}}
  /* RUN */
  if(!await off()){errs.push(tag+' no second snap');return p}
  await p.evaluate(()=>{const pl=PLAYBOOK.find(x=>x.cat==='run'&&!x.special&&/Inside|Zone|Power|Dive/i.test(x.name))||PLAYBOOK.find(x=>x.cat==='run');pickPlay(pl);startPlay(S.pc)});
  await p.evaluate(()=>__T3.until(()=>play&&play.t>1.5||S.phase!=='live',6,true));
  const st=await p.evaluate(()=>{if(S.phase!=='live'||!isRunner())return 'skip';const c=play.carrier,s=fieldToScreen(c.x,c.y,1);S.paused=false;__T3.ptr('pointerdown',s[0],s[1]);__T3.ptr('pointermove',s[0]+10,s[1]-40);const r=stick?{dx:+stick.dx.toFixed(2),dy:+stick.dy.toFixed(2)}:null;__T3.ptr('pointerup',s[0]+10,s[1]-40);S.paused=true;return r});
  note('steer',st);if(st&&st!=='skip'&&!(st.dy<0))errs.push(tag+' steering up did not move toward the far side '+JSON.stringify(st));
  await p.evaluate(()=>__T3.render(4));await shot(p,tag+'-run');
  await p.evaluate(()=>__T3.until(()=>S.phase==='dead',10,true));
  /* FIELD GOAL: behind-the-kicker camera, meter on the overlay */
  if(!await off()){errs.push(tag+' no third snap');return p}
  await p.evaluate(()=>{callSpecial('fg')});
  await p.evaluate(()=>{for(let i=0;i<40;i++)updateKick(1/60);__T3.render(5)});await shot(p,tag+'-kick-aim');
  const kk=await p.evaluate(()=>{kickTap();if(kick&&kick.stage==='power'){for(let i=0;i<30;i++)updateKick(1/60);kickTap()}for(let i=0;i<36;i++)updateKick(1/60);__T3.render(3);return kick?{st:kick.stage,good:kick.good,bz:+ball.z.toFixed(2)}:null});
  note('kick',kk);if(!kk||kk.st!=='flight')errs.push(tag+' kick did not fly '+JSON.stringify(kk));await shot(p,tag+'-kick-flight');
  await p.evaluate(()=>{for(let i=0;i<40;i++)updateKick(1/60);__T3.render(2)});
  await p.evaluate(()=>__T3.until(()=>S.phase!=='kick'&&S.phase!=='wait',30,true));
  /* NIGHT + SNOW */
  if(full){await p.evaluate(()=>{S.slot='Primetime';S.wx='Clear'});if(await off()){await p.evaluate(()=>{const pl=PLAYBOOK.find(x=>x.cat==='pass'&&!x.special);pickPlay(pl);__T3.render(8)});await shot(p,tag+'-night');note('night',await p.evaluate(()=>G3.env.stage));
    await p.evaluate(()=>{S.slot='Noon';S.wx='Snow';__T3.render(8)});await shot(p,tag+'-snow');
    await p.evaluate(()=>{S.slot='Afternoon';S.wx='Rain';__T3.render(6)});await shot(p,tag+'-rain')}}
  await p.evaluate(()=>{if(S.phase==='kick')return;__T3.render(2)});const mp=await p.evaluate(()=>{if(G3.mode!=='tv')return {skip:G3.mode};const up=g3ScreenVec(0,-40,W/2,H/2),rt=g3ScreenVec(40,0,W/2,H/2),f=screenToField(W/2,H/2,0),s=fieldToScreen(f[0],f[1],0);return {up:up.map(v=>+v.toFixed(2)),rt:rt.map(v=>+v.toFixed(2)),round:+Math.hypot(s[0]-W/2,s[1]-H/2).toFixed(3)}});
  note('map',mp);if(!mp.skip&&!(mp.up[1]<-.9&&mp.rt[0]>.9&&mp.round<.5))errs.push(tag+' screen/field mapping off '+JSON.stringify(mp));
  const stats=await p.evaluate(()=>g3Stats());note('perf',stats);
  console.log(tag,log.join(' | '));return p;
}
(async()=>{const b=await Q.launch(),errs=[];
  try{await run(b,844,390,'land',errs,true);await run(b,390,844,'port',errs,false)}catch(e){errs.push('SCRIPT '+e.message)}
  console.log('frames in',OUT);console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length?1:0)})();
