/* =========================================================
   01b · fx event bus (v7)
   The engine announces what happens on the field; presentation code (renderer, broadcast graphics,
   audio, haptics) listens. Neither side depends on the other: unknown events are ignored and a
   failing listener never breaks the engine.
     engine:        fx('tackle',{c:carrier,d:tackler,big:true})
     presentation:  onFx('tackle',e=>{ ... })
   Standard events (data fields in braces; p/c/d are on-field player objects, x/y engine coordinates):
     snap{} · handoff{p} · pitch{from,to} · throw{qb,to,x,y,bullet,lob} · catch{p,contested} · drop{p}
     deflect{p,x,y} · intercept{p} · tackle{c,d,big} · brokenTackle{c,d} · juke{p} · spin{p} · truck{p,d}
     stiffArm{p,d} · hurdle{p} · dive{p} · slide{p} · fumble{p,x,y} · recover{p,team} · sack{qb,d}
     td{p,team} · safety{team} · fg{good,dist,team} · xp{good,team} · twoPt{good,team} · punt{x,y,dist}
     kickoff{} · touchback{} · fairCatch{p} · flag{x,y,on} · penalty{name,yards,on,team,accepted}
     firstDown{x} · turnover{team,kind} · timeout{team} · twoMinute{} · quarterEnd{q} · halftime{}
     final{} · injury{p} · bigPlay{yards,p} · redZone{} · review{call} · celebrate{p,pose}
   ========================================================= */
const FX_SUBS={};
function onFx(name,fn){(FX_SUBS[name]||(FX_SUBS[name]=[])).push(fn)}
function fx(name,data){const l=FX_SUBS[name];if(!l)return;for(const f of l){try{f(data||{})}catch(e){console.error('fx '+name,e)}}}
