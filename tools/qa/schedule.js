/* Validates the 2026 schedule builder and postseason on freshly generated NCAA leagues (plus the original 32-team league):
   games per team (every FBS team 12, FCS 11–12, Ivy 10), league games vs each conference's count, Rivalry Week, byes,
   FCS opponents, home games, divisions and flex week; then sims one full season and checks the title games (top two /
   division winners), bowls (eligibility, tie-ins, no same-conference games), the CFP sites and the FCS bracket, and the next
   season's schedule.   NODE_PATH=$(npm root -g) node tools/qa/schedule.js [web/index.html] [leagues=6] [seasons=3]   */
const Q=require('./_boot');
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);
await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(400);
const r=await p.evaluate(([N,SIMS])=>{
  const dist=a=>{const d={};for(const v of a)d[v]=(d[v]||0)+1;return d},out={fail:[],leagues:[]};
  const regGames=L=>L.weeks.filter(w=>w.kind==='reg').flatMap((w,wi)=>w.games.map(g=>({...g,wi})));
  const check=(L,label)=>{const t0=performance.now();const gs=regGames(L),TT=L.teams,n={},lgN={},fcsOpp={},home={},rep={};
    for(const t of TT){n[t.id]=0;lgN[t.id]=0;fcsOpp[t.id]=0;home[t.id]=0}
    let dup=0,rivOff=0,flex=0;const seen=new Map();
    for(const g of gs){n[g.h]++;n[g.a]++;home[g.h]++;const A=TT[g.h],B=TT[g.a];
      if(A.conf===B.conf&&!g.nc&&!L.confs[A.conf].ind){lgN[g.h]++;lgN[g.a]++}
      if(A.div!==B.div){fcsOpp[A.div==='FBS'?g.h:g.a]++}
      const k=Math.min(g.h,g.a)+'-'+Math.max(g.h,g.a);if(seen.has(k)&&!/Flex/.test(g.tag||'')&&!/Flex/.test(seen.get(k)))dup++;seen.set(k,g.tag||'');
      if(g.rival&&g.wi!==L.R-1)rivOff++;if(/Flex/.test(g.tag||''))flex++}
    const fbs=TT.filter(t=>t.div==='FBS'),fcs=TT.filter(t=>t.div==='FCS');
    const bad12=fbs.filter(t=>n[t.id]!==12).map(t=>t.abbr+':'+n[t.id]);
    const badF=fcs.filter(t=>{const c=L.confs[t.conf];const mn=c.games||11,mx=c.games||12;return n[t.id]<mn||n[t.id]>mx}).map(t=>t.abbr+':'+n[t.id]);
    const lgMiss=[];L.confs.forEach((c,ci)=>{if(c.ind)return;const ids=TT.filter(t=>t.conf===ci);for(const t of ids){const want=Math.min(ids.length-1,c.cg-((c.less||[]).includes(t.id)?1:0));if(lgN[t.id]!==want)lgMiss.push(c.name+' '+t.abbr+' '+lgN[t.id]+'/'+want)}});
    const rivPairs=TT.filter(t=>t.rival!=null&&t.id<t.rival&&TT[t.rival].rival===t.id).length,rivPlayed=gs.filter(g=>g.rival).length;
    const div={};L.confs.forEach((c,ci)=>{if(!c.dv)return;const dv={};c.dv.forEach((d,k)=>d.ids.forEach(id=>dv[id]=k));const cross={};
      for(const g of gs)if(TT[g.h].conf===ci&&TT[g.a].conf===ci&&!g.nc&&dv[g.h]!==dv[g.a]){cross[g.h]=(cross[g.h]||0)+1;cross[g.a]=(cross[g.a]||0)+1}
      div[c.name]=dist(TT.filter(t=>t.conf===ci).map(t=>cross[t.id]||0))});
    const p4=['SEC','Big Ten','Big 12','ACC'],fcsBy={};for(const c of [...p4,'G6']){const ts=fbs.filter(t=>{const nm=L.confs[t.conf].name;return c==='G6'?!p4.includes(nm)&&!L.confs[t.conf].ind:nm===c});fcsBy[c]=Math.round(100*ts.filter(t=>fcsOpp[t.id]>0).length/Math.max(1,ts.length))+'%'}
    const an=gs.find(g=>[TT[g.h].abbr,TT[g.a].abbr].sort().join()==='ARMY,NAVY');
    const fb=gs.filter(g=>TT[g.h].div==='FBS'||TT[g.a].div==='FBS'),isLg=g=>TT[g.h].conf===TT[g.a].conf&&!g.nc&&!L.confs[TT[g.h].conf].ind;
    const early=a=>Math.round(100*a.filter(g=>g.wi<=3).length/Math.max(1,a.length))+'%',nonLg=fb.filter(g=>!isLg(g)&&!g.rival&&!/Flex/.test(g.tag||''));
    const res={label,teams:TT.length,fbs:fbs.length,fcs:fcs.length,weeks:L.R,gamesFBS:dist(fbs.map(t=>n[t.id])),gamesFCS:dist(fcs.map(t=>n[t.id])),byesFBS:dist(fbs.map(t=>L.R-n[t.id])),
      homeFBS:dist(fbs.map(t=>home[t.id])),fcsOppPerFBS:dist(fbs.map(t=>fcsOpp[t.id])),fbsWithFcsOpp:fcsBy,leagueMismatch:lgMiss.length,leagueMismatchList:lgMiss.slice(0,6),
      rivalry:rivPlayed+'/'+rivPairs+' played, '+rivOff+' outside Rivalry Week',dupMeetings:dup,flexGames:flex,crossDivision:div,armyNavy:an?(an.nc?'non-conference':'COUNTS AS LEAGUE')+' wk '+(an.wi+1):'n/a',
      notND_FCS:fbs.filter(t=>t.abbr==='ND'&&fcsOpp[t.id]).length===0,inWeeks1to4:{nonConference:early(nonLg),league:early(fb.filter(isLg))}};
    if(bad12.length)out.fail.push(label+' FBS not 12: '+bad12.join(' '));if(badF.length)out.fail.push(label+' FCS out of range: '+badF.join(' '));
    if(rivOff||rivPlayed!==rivPairs)out.fail.push(label+' rivalry '+res.rivalry);if(dup)out.fail.push(label+' duplicate meetings '+dup);
    if(lgMiss.length>2)out.fail.push(label+' league-game mismatches '+lgMiss.length);
    return res};
  for(let i=0;i<N;i++){const t0=performance.now();const L=genNCAALeague('V'+i);const ms=Math.round(performance.now()-t0);const r=check(L,'ncaa#'+(i+1));r.genMs=ms;out.leagues.push(r)}
  for(let i=0;i<3;i++){const L=genLeague('O'+i);const r=check(L,'original#'+(i+1));out.leagues.push({label:r.label,gamesFBS:r.gamesFBS,rivalry:r.rivalry,dup:r.dupMeetings})}
  /* full seasons, start to finish, then the next season's schedule (details printed for the first) */
  out.sims=0;for(let si=0;si<SIMS;si++){out.sims++;
  const L=genNCAALeague('Sim');L.user=L.teams.find(t=>t.abbr==='UGA').id;LG=L;const S={};
  try{
    while(L.phase==='regular'){
      if(L.week===L.R){/* title games vs standings */const bad=[];
        for(const g of L.weeks[L.week].games.filter(g=>g.ccg)){const c=L.confs[g.conf],s=confStandings(L,g.conf);let want=[s[0].id,s[1].id];
          if(c.dv)want=c.dv.map(d=>confStandings(L,g.conf,s.filter(t=>d.ids.includes(t.id)))[0].id);if(![g.h,g.a].every(id=>want.includes(id)))bad.push(c.name)}
        /* two-team ties between teams that met: the head-to-head winner must be ahead */
        let h2hBad=0,h2hTies=0;L.confs.forEach((c,ci)=>{if(c.ind)return;const s=confStandings(L,ci),pc=t=>t.rec.cw/Math.max(1,t.rec.cw+t.rec.cl);
          for(let i=0;i+1<s.length;i++){const a=s[i],b=s[i+1];if(pc(a)!==pc(b)||s.filter(t=>pc(t)===pc(a)).length!==2)continue;
            const g=L.weeks.flatMap(w=>w.games).find(g=>!g.post&&!g.nc&&g.hs!=null&&((g.h===a.id&&g.a===b.id)||(g.h===b.id&&g.a===a.id)));if(!g)continue;h2hTies++;if(winner(g)!==a.id)h2hBad++}});
        S.tiebreak={twoTeamTiesDecidedByH2H:h2hTies,wrong:h2hBad};if(h2hBad)out.fail.push('head-to-head tiebreak wrong '+h2hBad);
        S.ccg={games:L.weeks[L.week].games.filter(g=>g.ccg).map(g=>`${g.tag}: ${L.teams[g.h].abbr} ${L.teams[g.h].rec.cw}-${L.teams[g.h].rec.cl} vs ${L.teams[g.a].abbr} ${L.teams[g.a].rec.cw}-${L.teams[g.a].rec.cl}${g.neutral?' @ '+g.site:' (home)'}`),notTopTwo:bad}}
      if(L.week===L.R+1){const w=L.weeks[L.week],bw=w.games.filter(g=>g.bowl&&!isFCS(L.teams[g.h]));const TT=L.teams;
        const cn=id=>isND(L,TT[id])?'ACC':confName(TT[id].conf,L);let tie=0,sides=0;
        for(const g of bw){const b=BOWLS26.find(x=>x[0]===g.tag);if(!b)continue;for(const id of [g.h,g.a]){sides++;if([b[3],b[4]].some(t=>t.split('/').includes(cn(id))))tie++}}
        const elig=TT.filter(t=>t.div==='FBS'&&t.rec.w>=6&&!L.cfp.seeds.includes(t.id)).length;
        S.bowls={count:bw.length,eligible6:elig,teamsWithLosingRec:bw.flatMap(g=>[g.h,g.a]).filter(id=>TT[id].rec.w<6).map(id=>TT[id].abbr+' '+TT[id].rec.w+'-'+TT[id].rec.l),
          sameConf:bw.filter(g=>TT[g.h].conf===TT[g.a].conf).map(g=>g.tag),tieInSides:tie+'/'+sides,
          inDateOrder:w.games.every((g,i,a)=>!i||dayKey(a[i-1].date)<=dayKey(g.date)),sample:bw.slice(0,4).concat(bw.slice(-3)).map(g=>`${g.date} ${g.tag}: ${TT[g.a].abbr} (${cn(g.a)}) vs ${TT[g.h].abbr} (${cn(g.h)})`),
          cfpR1:L.cfp.r1.map(g=>`${g.tag} at ${TT[g.h].stadium}`),celebration:w.games.filter(g=>g.tag==='Celebration Bowl').map(g=>TT[g.a].abbr+' vs '+TT[g.h].abbr).join()};
        S.fcs={field:L.fcsp.seeds.length,autoBids:L.fcsp.seeds.filter(id=>TT[id].cc&&L.confs[TT[id].conf].auto).length}}
      if(L.week===L.R+2)S.qf=L.weeks[L.week].games.filter(g=>g.cfp).map(g=>`${g.tag} (${g.date}, ${g.site}): #${L.cfp.seeds.indexOf(g.h)+1} ${L.teams[g.h].abbr} [${confName(L.teams[g.h].conf,L)}]`);
      if(L.week===L.R+3)S.sf=L.weeks[L.week].games.filter(g=>g.cfp).map(g=>`${g.tag} (${g.date}, ${g.site})`);
      if(L.week===L.R+4)S.final=L.weeks[L.week].games.map(g=>`${g.tag} (${g.date}, ${g.site})`);
      finishWeek(L);
    }
    S.champ=L.teams[L.champ].abbr;S.phase=L.phase;
    startNewSeason(L);const r2=check(L,'next season');S.next={season:L.season,gamesFBS:r2.gamesFBS,gamesFCS:r2.gamesFCS,leagueMismatch:r2.leagueMismatch};
  }catch(e){out.fail.push('season sim: '+e.message+' '+(e.stack||'').split('\n')[1])}
  if(!si)out.season=S;if(S.ccg&&S.ccg.notTopTwo.length)out.fail.push('title games not top two: '+S.ccg.notTopTwo);
  if(S.bowls&&(S.bowls.sameConf.length||!S.bowls.inDateOrder))out.fail.push('bowls: same-conference '+S.bowls.sameConf+' / date order '+S.bowls.inDateOrder);
  if(S.next&&(Object.keys(S.next.gamesFBS).join()!=='12'||S.next.leagueMismatch))out.fail.push('next season schedule '+JSON.stringify(S.next))}
  return out},[+(process.argv[3]||6),+(process.argv[4]||3)]);
for(const l of r.leagues)console.log(JSON.stringify(l));
console.log('SEASON (1 of '+r.sims+' simulated)',JSON.stringify(r.season,null,1));
console.log('FAILURES',r.fail.length?r.fail:'none');
console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(r.fail.length||errs.length?1:0)})();
