/* Sims a whole dynasty season (regular season, conference title games, bowls, CFP), the full offseason
   and the first weeks of the next season, then prints a summary and any errors.
   NODE_PATH=$(npm root -g) node tools/qa/season.js [web/index.html] [TEAM]            */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
await Q.startDynasty(p,process.argv[3]||'UGA');
const r=await p.evaluate(async()=>{const out={weeks:0,maxStepMs:0,stages:[],errs:[]};const t0=performance.now();
  const modal=()=>{const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else closeModal();return true}return false};
  const season0=LG.season;
  for(let n=0;n<900;n++){
    if(modal())continue;
    if(LG.season>season0&&LG.phase==='regular'&&LG.week>=3)break;
    if(LG.phase==='offseason'){const st=LG.off&&LG.off.stage;if(out.stages[out.stages.length-1]!==st)out.stages.push(st);
      const stay=document.querySelector('#stayPut');if(stay){stay.click();continue}
      const nx=document.querySelector('#offNext');if(!nx){out.errs.push('no offNext at '+st);break}const t=performance.now();nx.click();out.maxStepMs=Math.max(out.maxStepMs,performance.now()-t);await new Promise(r=>setTimeout(r,5));continue}
    const b=document.querySelector('#simGame')||document.querySelector('#advWeek');if(!b){out.errs.push('stuck at week '+LG.week+' phase '+LG.phase);break}
    const t=performance.now();b.click();out.maxStepMs=Math.max(out.maxStepMs,performance.now()-t);out.weeks++;await new Promise(r=>setTimeout(r,3));
  }
  const h=LG.history[LG.history.length-1]||{};const u=T(LG.user);
  out.totalMs=Math.round(performance.now()-t0);out.season=LG.season;out.week=LG.week;out.phase=LG.phase;
  out.last={rec:h.w+'-'+h.l,rank:h.rank,champ:h.champName,heisman:h.heisman};out.roster=u.roster.length;
  out.top5=LG.rank.slice(0,5).map(i=>LG.teams[i].abbr);out.saveKB=Math.round((KV.get('gl3.slot'+SLOT)||'').length/1024);
  return out});
console.log(JSON.stringify(r,null,1));
console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(r.errs.length||errs.length?1:0)})();
