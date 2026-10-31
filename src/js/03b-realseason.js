/* =========================================================
   03b · Real season mode: a new NCAA dynasty that starts inside the real 2026 season.
   A roster pack may carry "schedule" (docs/PACKS.md): every real game with an FBS team, final scores through week `through`.
   realSeasonStart lays the real schedule over the league (FCS-only games aren't in the data: the generated schedule's FCS vs
   FCS games fill those weeks, moved where a real game took the slot), then replays the finished weeks with the normal
   weekly flow (finishWeek with each real final score pre-set as g.pre), so records, standings, team points, player stat
   lines, rivalry trophies, news and the AP voter model's weekly polls all come from the real results. The dynasty then
   starts in the next week; the rest of the real schedule is played or simulated, then title games, bowls and the CFP
   from the normal postseason. Games after Rivalry Week (Army–Navy) are played in Championship Week (L.lateGames).
   ========================================================= */
const REAL_KEY='gl.packSeason';
const realSchedOK=s=>!!(s&&typeof s==='object'&&Array.isArray(s.games)&&s.games.length>0&&s.through>=0);
/* the small summary packSave keeps beside the saved pack: {season,through,n} (null when the saved pack has no season data) */
function realSeasonSummary(){try{if(!KV.get(PACK_KEY))return null;const v=KV.get(REAL_KEY);if(!v)return null;const j=JSON.parse(v);return j&&j.n>0?j:null}catch(e){return null}}
const realStartWeek=s=>(s.through|0)>=13?'Championship Week':'week '+((s.through|0)+1);
function realSeasonNote(s){s=s||realSeasonSummary();return s?`Start from the real ${s.season||2026} season (${realStartWeek(s)})`:''}

/* L: a fresh NCAA league with the pack applied and the user's team set (startDynasty). pk: the pack (default: the saved one) */
function realSeasonStart(L,pk){
  pk=pk||packLoadSaved();const S=pk&&pk.schedule;if(!L||!realSchedOK(S))return false;
  const {pairs}=packMatch(L,pk),ids={};for(const [t,e] of pairs)if(e.abbr)ids[String(e.abbr).toUpperCase()]=t.id;
  const tid=k=>{if(typeof k!=='string'||!k||k[0]==='?')return null;const v=ids[k.toUpperCase()];if(v!=null)return v;const t=packTeamFor(L,k);return t?t.id:null};
  buildSchedule(L);
  const R=L.R,through=clamp(S.through|0,0,R),TT=L.teams;
  const weeks=L.weeks.map(w=>({label:w.label,kind:'reg',games:[]})),busy=weeks.map(()=>new Set());
  const put=(g,w)=>{weeks[w].games.push(g);busy[w].add(g.h);busy[w].add(g.a)};
  const free=(a,b,from)=>{for(let k=from;k<R;k++)if(!busy[k].has(a)&&!busy[k].has(b))return k;return -1};
  const late=[],ghost=[];let real=0,skipped=0;
  for(const r of S.games){if(!Array.isArray(r))continue;
    const w=(parseInt(r[0])||0)-1,h=tid(r[1]),a=tid(r[2]),hs=parseInt(r[3]),as=parseInt(r[4]),fl=parseInt(r[5])||0;
    const done=w<through&&(fl&4||r[3]!=null)&&hs>=0&&as>=0&&hs!==as;
    if(h==null||a==null||h===a){if(done&&(h!=null)!==(a!=null))ghost.push({w,id:h!=null?h:a,pf:h!=null?hs:as,pa:h!=null?as:hs});else skipped++;continue}
    if(w<0){skipped++;continue}
    const H=TT[h],A=TT[a],rival=H.rival===a&&A.rival===h,tag=typeof r[7]==='string'&&r[7]?r[7].slice(0,44):null;
    const g={h,a,hs:null,as:null,wx:done?'Clear':weatherFor(Math.min(w,R-1)),slot:pick(['Noon','Afternoon','Afternoon','Primetime']),tag:rival?(H.trophy||A.trophy||tag):tag,rival};
    if(fl&1)g.neutral=true;
    if(H.conf===A.conf&&!isInd(L,H)&&(!(fl&2)||NC_RIVAL.has(H.abbr+'|'+A.abbr)))g.nc=true;   /* same league in the game but not a league game (Army–Navy never counts) */
    if(done)g.pre={hs,as};
    if(w>=R){late.push(g);continue}
    /* a future week where one of them already plays (a moved game): the first week ahead both have open */
    let wk=w;if(w>=through&&(busy[w].has(h)||busy[w].has(a))){const k=free(h,a,through);if(k>=0)wk=k}
    put(g,wk);real++}
  /* the generated schedule's FCS vs FCS games: their week when both teams are open, else the nearest open week */
  let fcsG=0;
  for(let w0=0;w0<R;w0++)for(const g of L.weeks[w0].games){if(!isFCS(TT[g.h])||!isFCS(TT[g.a]))continue;
    let wk=!busy[w0].has(g.h)&&!busy[w0].has(g.a)?w0:-1;
    for(let d=1;wk<0&&d<R;d++)for(const k of [w0+d,w0-d])if(wk<0&&k>=0&&k<R&&!busy[k].has(g.h)&&!busy[k].has(g.a))wk=k;
    if(wk<0)continue;put(Object.assign({},g,{hs:null,as:null,wx:weatherFor(wk)}),wk);fcsG++}
  /* FCS teams that lost generated FBS games: extra FCS non-league games up to their usual count where a week is open */
  const cnt={},met=new Set(),mk=(a,b)=>a<b?a+'-'+b:b+'-'+a;for(const w of weeks)for(const g of w.games){cnt[g.h]=(cnt[g.h]||0)+1;cnt[g.a]=(cnt[g.a]||0)+1;met.add(mk(g.h,g.a))}
  const fcs=TT.filter(isFCS),tgt=t=>Math.min(11,(L.confs[t.conf]&&L.confs[t.conf].games)||11);
  for(const t of shuffle(fcs.slice())){
    for(const o of shuffle(fcs.slice())){if((cnt[t.id]||0)>=tgt(t))break;if(o===t||(cnt[o.id]||0)>=tgt(o)||met.has(mk(t.id,o.id))||(o.conf===t.conf&&!isInd(L,t)))continue;
      const k=free(t.id,o.id,0);if(k<0)continue;const [h,a]=Math.random()<.5?[t.id,o.id]:[o.id,t.id];
      put({h,a,hs:null,as:null,wx:weatherFor(k),slot:pick(['Noon','Afternoon']),tag:null,rival:false,nc:false},k);cnt[h]=(cnt[h]||0)+1;cnt[a]=(cnt[a]||0)+1;met.add(mk(h,a));fcsG++}}
  for(const w of weeks)for(const g of w.games)if(!g.nc)delete g.nc;
  L.weeks=weeks;L.lateGames=late.length?late:null;L.week=0;
  /* homecoming: a home game still to come */
  if(L.user!=null){const ws=[];weeks.forEach((w,i)=>{if(i>=through&&i<R-1&&w.games.some(g=>g.h===L.user&&!g.neutral))ws.push(i)});L.hcWeek=ws.length?pick(ws):null}
  /* replay the finished weeks: the real final scores, and simulated results for the generated FCS games */
  for(let w=0;w<through;w++){
    for(const x of ghost)if(x.w===w){const t=TT[x.id];t.rec.pf+=x.pf;t.rec.pa+=x.pa;if(x.pf>x.pa)t.rec.w++;else t.rec.l++}
    finishWeek(L)}
  L.event=null;
  L.realSeason={season:S.season||2026,through,games:real,fcs:fcsG,updated:String(S.updated||'').slice(0,10)};
  const u=L.user!=null?TT[L.user]:null;
  if(u&&Array.isArray(L.news))L.news.unshift({t:`The real ${L.realSeason.season} season: ${through?`results through week ${through} are in the books and ${teamName(u)} ${u.rec.w+u.rec.l?`is ${recStr(u)}`:'has not played yet'}`:'nothing has been played yet'}. Your season picks up in ${weekLabel(L)}.`,good:true});
  return true;
}
