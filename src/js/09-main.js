/* =========================================================
   09 · Main loop + boot
   ========================================================= */
let last=performance.now(),hudAcc=0,lastSbHidden=null;
function frame(now){
  const real=Math.min(.05,(now-last)/1000);last=now;
  if(S.photo){draw(now);requestAnimationFrame(frame);return}
  if(lastSbHidden!==$('#sb').hidden){lastSbHidden=$('#sb').hidden;resize()}
  if(S.slowT>0){S.slowT-=real;S.ts=.32}else S.ts=Math.min(1,S.ts+real*2.5);
  const dt=real*S.ts;
  const active=!S.paused&&!['hub','boot','over','menu'].includes(S.phase);
  if(active){
    if(S.phase==='presnap'){
      if(uOff()&&!S.conv){S.playClock-=real;if(S.playClock<=0)delayOfGame()}
      /* running game clock between plays (capped so thinking about a call can't burn a whole quarter) */
      if(S.clockRun&&!S.ot&&!S.conv&&S.preRun<CLK.preCap){if(S.clockHold>0)S.clockHold-=real;else{const d=Math.min(real*CLK.pre,CLK.preCap-S.preRun);S.clock=Math.max(0,S.clock-d);S.preRun+=d;if(S.clock<=0)presnapExpire()}}
      if(!uOff()&&aiSnapT>0){aiSnapT-=real;if(aiSnapT<=0&&S.phase==='presnap'){aiSnapT=0;startPlay(S.aiPlay)}}
      for(const p of P){p.fallP=lerp(p.fallP,0,.12);p.z=Math.max(0,(p.z||0)-real*3)}
      motionTick(real);
    }
    else if(S.phase==='kick'){updateKick(real);drawKick()}
    else if(S.phase==='replay'){if(typeof updateReplay==='function')updateReplay(real)}
    else if((S.phase==='live'||S.phase==='dead')&&play){
      const n=dt>.02?3:2;for(let i=0;i<n;i++)simulate(dt/n);
      if(S.phase==='live'&&typeof recFrame==='function')recFrame(dt);
      if(S.phase==='dead'){deadT-=real;if(deadT<=0)applyResult()}
    }
    else for(const p of P){p.fallP=lerp(p.fallP,p.fallen?1:0,.12);p.z=Math.max(0,(p.z||0)-real*3)}
    if(typeof BC!=='undefined')BC.tick(real);
    updateParticles(dt);updateWeather(real);updateCam(real);draw(now);
    hudAcc+=real;if(hudAcc>.1){hudAcc=0;hud()}
  }else if(S.phase==='over'&&S.stormT>0){S.stormT-=real;updateParticles(real);draw(now)}
  requestAnimationFrame(frame);
}
addEventListener('pagehide',()=>flushSave());
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushSave()});
function boot(){resize();importLegacy();showSlots();requestAnimationFrame(t=>{last=t;frame(t)})}
boot();
