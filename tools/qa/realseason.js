/* Real 2026 season mode: saves a roster pack that carries season data, picks "Real 2026 · week N" on the setup screen, starts a
   dynasty, checks the replayed weeks against the pack's final scores (every FBS record, the week, polls, team points), then sims
   the rest of the real schedule, the title games, bowls and the Playoff to the national championship, and prints a summary.
   NODE_PATH=$(npm root -g) node tools/qa/realseason.js [pack.json] [web/index.html] [TEAM]                                   */
const Q=require('./_boot');const fs=require('fs');
const PACK=process.argv[2]||'/home/claude/packs/gridiron-live-2026-rosters.json',TEAM=process.argv[4]||'MIA';
(async()=>{
const txt=fs.readFileSync(PACK,'utf8'),S=JSON.parse(txt).schedule;
if(!S){console.log('this pack has no schedule');process.exit(1)}
/* real records from the pack: weeks 1..through, every final, both sides (schools outside the game count for their opponent) */
const exp={};for(const g of S.games){if(g[0]>S.through||!(g[5]&4))continue;for(const [a,pf,pa] of [[g[1],g[3],g[4]],[g[2],g[4],g[3]]]){const r=exp[a]||(exp[a]=[0,0]);r[pf>pa?0:1]++}}
const b=await Q.launch();const errs=[];
const p=await Q.newPage(b,844,390,errs);{const push=errs.push.bind(errs);errs.push=(...a)=>push(...a.filter(m=>!/Failed to load resource: net::/.test(m)))}
await p.goto(Q.pageURL(process.argv[3]));await p.waitForSelector('#slotNew-1',{timeout:15000});
await p.evaluate(t=>{packSave(JSON.parse(t))},txt);
await p.click('#slotNew-1');await p.waitForTimeout(200);
const opt=await p.evaluate(()=>{const b=document.querySelector('#realSeg button[data-v="1"]');return b?b.textContent:null});
if(!opt)errs.push('no real-season option on the setup screen');else{await p.click('#realSeg button[data-v="1"]');await p.waitForTimeout(100)}
const note=await p.evaluate(()=>([...document.querySelectorAll('#setupBody .note')].map(x=>x.textContent).find(t=>/real 2026 season/i.test(t))||null));
const t0=Date.now();
await p.evaluate(a=>{const t=SETUP.L.teams.find(t=>t.abbr===a)||SETUP.L.teams[0];openTeamDetail(t.id)},TEAM);await p.waitForTimeout(150);
await p.click('#coachHere');await p.waitForFunction(()=>typeof LG!=='undefined'&&LG&&LG.realSeason&&!document.querySelector('#hub').hidden,null,{timeout:60000});const startMs=Date.now()-t0;
const chk=await p.evaluate(exp=>{
  const out={week:LG.week,label:weekLabel(LG),realSeason:LG.realSeason,bad:[]};
  for(const t of LG.teams){if(t.div!=='FBS')continue;const e=exp[t.abbr]||[0,0];if(t.rec.w!==e[0]||t.rec.l!==e[1])out.bad.push(`${t.abbr} ${t.rec.w}-${t.rec.l} (real ${e.join('-')})`)}
  out.ap=LG.rank.slice(0,25).map((id,i)=>`${i+1} ${LG.teams[id].abbr} ${recStr(LG.teams[id])}`).join(', ');
  const u=T(LG.user);out.user=`${u.abbr} ${recStr(u)} (conf ${u.rec.cw}-${u.rec.cl}), next: `+(LG.weeks[LG.week]||{games:[]}).games.filter(g=>g.h===LG.user||g.a===LG.user).map(g=>`${T(g.a).abbr} at ${T(g.h).abbr}`).join(' / ');
  out.weekGames=LG.weeks.map(w=>w.games.length).join(' ');
  const c={};for(const w of LG.weeks)for(const g of w.games){c[g.h]=(c[g.h]||0)+1;c[g.a]=(c[g.a]||0)+1}
  const fc=LG.teams.filter(isFCS).map(t=>c[t.id]||0),fb=LG.teams.filter(t=>!isFCS(t)).map(t=>c[t.id]||0);
  out.games={fbsMin:Math.min(...fb),fbsMax:Math.max(...fb),fcsMin:Math.min(...fc),fcsMax:Math.max(...fc)};
  out.points=['MIA','OSU','UGA','IU','ND'].map(a=>{const t=LG.teams.find(x=>x.abbr===a);return `${a} ${recStr(t)} ${t.rec.pf}-${t.rec.pa}`}).join(', ');
  out.heismanWatch=(LG.heismanWatch||[]).slice(0,3).map(h=>`${h.name} (${LG.teams[h.team].abbr}) ${h.line}`);
  out.late=(LG.lateGames||[]).map(g=>`${T(g.a).abbr} vs ${T(g.h).abbr}`).join(', ');
  out.news=(LG.news[0]||{}).t;
  return out},exp);
const r=await p.evaluate(async()=>{const out={weeks:0,errs:[],post:{}};
  const modal=()=>{const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else closeModal();return true}return false};
  const lbl=g=>`${T(g.a).abbr} ${g.as}-${g.hs} ${T(g.h).abbr}`;
  for(let n=0;n<400;n++){
    if(modal())continue;
    if(LG.phase==='offseason')break;
    const w=LG.weeks[LG.week];
    if(w&&w.kind==='post0'&&!out.post.ccg){out.post.ccg=w.games.filter(g=>g.ccg).map(g=>`${T(g.a).abbr} vs ${T(g.h).abbr} (${g.tag})`);out.post.armyNavy=w.games.filter(g=>!g.post).map(g=>`${T(g.a).abbr} vs ${T(g.h).abbr}`);
      out.post.cfpTop12=(LG.cfpRank||[]).slice(0,12).map((id,i)=>`${i+1} ${T(id).abbr} ${recStr(T(id))}`).join(', ')}
    if(w&&w.kind==='post1'&&!out.post.seeds){out.post.seeds=LG.cfp.seeds.map((id,i)=>`${i+1} ${T(id).abbr}`).join(', ');out.post.bowls=w.games.filter(g=>g.bowl).length;out.post.ccgResults=(LG.weeks[LG.R].games||[]).filter(g=>g.ccg).map(lbl)}
    const b=document.querySelector('#simGame')||document.querySelector('#advWeek');if(!b){out.errs.push('stuck at week '+LG.week+' phase '+LG.phase);break}
    b.click();out.weeks++;await new Promise(r=>setTimeout(r,3));
  }
  const fin=LG.cfp&&LG.cfp.final;out.final=fin?lbl(fin):null;out.champ=LG.champ!=null?T(LG.champ).abbr:null;out.phase=LG.phase;
  const u=T(LG.user);out.user=`${u.abbr} ${recStr(u)}`;out.saveKB=Math.round((KV.get('gl3.slot'+SLOT)||'').length/1024);
  return out});
console.log('OPTION',JSON.stringify(opt),'|',note);
console.log('START',`${startMs} ms`,JSON.stringify(chk.realSeason),'week',chk.week,chk.label);
console.log('RECORDS',chk.bad.length?`${chk.bad.length} FBS records differ from the pack: ${chk.bad.slice(0,8).join('; ')}`:'every FBS record matches the real results');
console.log('POINTS',chk.points);console.log('AP',chk.ap);console.log('USER',chk.user);console.log('GAMES/WEEK',chk.weekGames,JSON.stringify(chk.games),'late:',chk.late);
console.log('HEISMAN WATCH',JSON.stringify(chk.heismanWatch));console.log('NEWS',chk.news);
console.log('POST',JSON.stringify(r.post,null,1));console.log('END',JSON.stringify({weeks:r.weeks,final:r.final,champ:r.champ,phase:r.phase,user:r.user,saveKB:r.saveKB,errs:r.errs}));
const fail=chk.bad.length||r.errs.length||!opt||chk.week!==S.through||r.phase!=='offseason';
console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(fail||errs.length?1:0)})();
