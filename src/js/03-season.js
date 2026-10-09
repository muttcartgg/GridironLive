/* =========================================================
   03 · Season: schedule, sims, polls, postseason, awards,
        weekly program upkeep, dilemmas, offseason, career
   ========================================================= */
let LG=null,SLOT=null;
const T=id=>LG.teams[id];
const WEEK_NAMES=['Championship Week','Bowls & Playoffs','Playoff Quarterfinals','Playoff Semifinals','National Championships'];
function weekLabel(L){if(L.phase==='offseason')return 'Offseason';const w=L.weeks[L.week];return w?w.label:'Season complete'}
function weatherFor(i){const r=Math.random();if(i>=8&&r<.13)return 'Snow';if(r<.2)return 'Rain';if(r<.32)return 'Wind';return 'Clear'}
const WX_ICON={Clear:'☀︎',Rain:'☂︎',Snow:'❄︎',Wind:'⚑'};
const isInd=(L,t)=>!!(L.confs[t.conf]&&L.confs[t.conf].ind);

/* General scheduler: rivalry games, conference games (circulant graph per conference so every
   team gets the same number), non-conference fill to 12 games, then weeks by greedy edge colouring. */
function buildSchedule(L){
  const TT=L.teams,n=TT.length,games=[],played=new Set(),deg=new Array(n).fill(0);
  const key=(a,b)=>a<b?a+'-'+b:b+'-'+a;
  const addG=(a,b,extra)=>{const h=Math.random()<.5?a:b;const g=Object.assign({h,a:h===a?b:a},extra||{});games.push(g);played.add(key(a,b));deg[a]++;deg[b]++;return g};
  const rivalGames=[];
  for(const t of TT)if(t.rival!=null&&t.id<t.rival&&TT[t.rival]&&TT[t.rival].rival===t.id)rivalGames.push(addG(t.id,t.rival,{rival:true,tag:t.trophy}));
  L.confs.forEach((c,ci)=>{if(c.ind)return;const ids=shuffle(TT.filter(t=>t.conf===ci).map(t=>t.id)),m=ids.length;if(m<2)return;
    const ord=[],used=new Set();for(const id of ids){if(used.has(id))continue;ord.push(id);used.add(id);const r=TT[id].rival;if(r!=null&&ids.includes(r)&&!used.has(r)){ord.push(r);used.add(r)}}
    const d=Math.min(c.cg,m-1),h=Math.floor(d/2);
    for(let i=0;i<m;i++)for(let j=i+1;j<m;j++){const dist=Math.min(j-i,m-(j-i));const want=d>=m-1||(dist<=h)||(d%2===1&&m%2===0&&dist===m/2);if(want&&!played.has(key(ord[i],ord[j])))addG(ord[i],ord[j])}});
  const TARGET=12;
  for(let pass=0;pass<4;pass++){
    const need=shuffle(TT.filter(t=>deg[t.id]<TARGET).map(t=>t.id));
    for(const a of need){
      while(deg[a]<TARGET){const ta=TT[a];
        let c=need.filter(b=>b!==a&&deg[b]<TARGET&&(pass>=3||TT[b].conf!==ta.conf||isInd(L,ta))&&!played.has(key(a,b)));
        if(!c.length)break;
        const same=c.filter(b=>TT[b].div===ta.div);const pool=same.length&&Math.random()<.86?same:c;addG(a,pick(pool));
      }
    }
  }
  let R=13,assign=null;
  for(let attempt=0;attempt<30;attempt++){
    if(attempt===12)R=14;
    const busy=Array.from({length:n},()=>new Set()),as=new Map();let fail=0;
    for(const g of rivalGames){busy[g.h].add(R-1);busy[g.a].add(R-1);as.set(g,R-1)}
    const rg=new Set(rivalGames);
    const others=shuffle(games.filter(g=>!rg.has(g))).sort((x,y)=>(TT[x.h].conf===TT[x.a].conf)-(TT[y.h].conf===TT[y.a].conf));
    for(const g of others){const conf=TT[g.h].conf===TT[g.a].conf;let w=-1;
      if(conf){for(let k=R-2;k>=0;k--)if(!busy[g.h].has(k)&&!busy[g.a].has(k)){w=k;break}}
      else{for(let k=0;k<R-1;k++)if(!busy[g.h].has(k)&&!busy[g.a].has(k)){w=k;break}}
      if(w<0){fail++;continue}busy[g.h].add(w);busy[g.a].add(w);as.set(g,w)}
    assign=as;if(!fail)break;
  }
  L.R=R;
  L.weeks=Array.from({length:R},(_,i)=>({label:i===R-1?'Rivalry Week':'Week '+(i+1),kind:'reg',games:[]}));
  for(const [g,w] of assign)L.weeks[w].games.push({h:g.h,a:g.a,hs:null,as:null,wx:weatherFor(w),slot:pick(['Noon','Afternoon','Afternoon','Primetime']),tag:g.rival?g.tag:null,rival:!!g.rival});
  L.cfp=null;L.fcsp=null;L.champ=null;L.champF=null;
  if(L.user!=null)setHomecoming(L);
}
function setHomecoming(L){const ws=[];L.weeks.forEach((w,i)=>{if(i>=1&&i<L.R-3&&w.games.some(g=>g.h===L.user))ws.push(i)});L.hcWeek=ws.length?pick(ws):null}
function seniorDayWeek(L){let last=null;L.weeks.forEach((w,i)=>{if(w.kind==='reg'&&w.games.some(g=>g.h===L.user))last=i});return last}
const isConfGame=g=>{const a=T(g.h),b=T(g.a);return a.conf===b.conf&&!g.post&&!isInd(LG,a)};
function gameFlags(L,g,wi){
  const f=[];const u=L.user;const home=g.h===u&&!g.neutral;
  if(g.rival)f.push(['gold','Rivalry · '+g.tag]);
  else if(g.tag)f.push(['gold',g.tag]);
  if(home&&wi===L.hcWeek)f.push(['blue','Homecoming']);
  if(home&&wi===seniorDayWeek(L)&&L.weeks[wi].kind==='reg')f.push(['blue','Senior Day']);
  if(!g.post&&isConfGame(g))f.push(['','Conference game']);
  if(!g.post&&T(g.h).div!==T(g.a).div)f.push(['','FBS vs FCS']);
  if(g.slot==='Primetime')f.push(['hot','Primetime']);
  return f;
}

/* ---------- CPU sims + player stat lines ---------- */
function simScore(h,a,neutral){
  const rh=teamOvr(T(h)),ra=teamOvr(T(a));const edge=neutral?0:2.5;const m=(rh-ra)*9+edge;
  const pts=x=>{x=Math.max(0,x);const td=Math.max(0,Math.round(x/7*.85+R(-.6,.6)));const fg=Math.max(0,Math.round((x-td*7)/3));return td*7+fg*3};
  let hs=pts(24+m/2+R(-11,11)),as=pts(24-m/2+R(-11,11));
  if(hs===as){if(Math.random()<.5+m/40)hs+=pick([3,6,7,8]);else as+=pick([3,6,7,8])}
  return [hs,as];
}
function simStats(t,pts){
  const qb=starters(t,'QB')[0],rb=starters(t,'RB')[0],wr=starters(t,'WR'),te=starters(t,'TE')[0],k=starters(t,'K')[0];
  if(!qb||!rb)return;
  const tds=Math.floor(pts/7),ptd=Math.round(tds*R(.45,.7)),rtd=Math.max(0,tds-ptd);
  const scm=typeof schemeOf==='function'?schemeOf(t):'Spread',pm={'Option':.45,'Air Raid':1.25,'Power':.85,'Pro':1,'Spread':1.05}[scm]||1,rm={'Option':1.75,'Air Raid':.72,'Power':1.25,'Pro':1,'Spread':1}[scm]||1;
  const py=Math.max(40,Math.round((R(85,150)+pts*3.2+(qb.thr+qb.acc-6)*14)*pm)),att=Math.round(py/R(6.5,9));
  Object.assign(qb.ss,{gp:qb.ss.gp+1,pa:qb.ss.pa+att,pc:qb.ss.pc+Math.round(att*R(.52,.72)),py:qb.ss.py+py,ptd:qb.ss.ptd+ptd,int:qb.ss.int+(Math.random()<.45?rint(1,2):0)});
  const ry=Math.round((R(40,125)+(rb.spd+rb.str-6)*10)*rm);if(scm==='Option'||qb.spd>=4){const qy=Math.round(R(10,60)*(scm==='Option'?2:1));qb.ss.ry+=qy;qb.ss.ra+=Math.round(qy/5);if(Math.random()<(scm==='Option'?.5:.2))qb.ss.rtd++}rb.ss.gp++;rb.ss.ra+=Math.round(ry/R(3.8,5.6));rb.ss.ry+=ry;rb.ss.rtd+=rtd;
  const recs=[...wr,te].filter(Boolean),sh=[.36,.26,.18,.2];
  recs.forEach((r,i)=>{r.ss.gp++;const y=Math.round(py*sh[i]*R(.7,1.3));r.ss.recy+=y;r.ss.rec+=Math.max(0,Math.round(y/R(9,15)))});
  for(let i=0;i<ptd;i++){const r=recs[Math.min(recs.length-1,Math.floor(Math.random()**1.4*recs.length))];r.ss.rectd++}
  for(const p of starters(t,'LB'))p.ss.tkl+=rint(4,9);for(const p of starters(t,'S'))p.ss.tkl+=rint(2,6);for(const p of starters(t,'CB'))p.ss.tkl+=rint(1,4);
  for(const p of starters(t,'DL')){p.ss.tkl+=rint(1,4);if(Math.random()<.22)p.ss.sck++}
  if(Math.random()<.35){const db=pick([...starters(t,'CB'),...starters(t,'S')]);if(db)db.ss.dint++}
  if(k){const fga=Math.round((pts%7)/3)+(Math.random()<.3?1:0);k.ss.fga+=fga;k.ss.fgm+=Math.max(0,fga-(Math.random()<.25?1:0))}
  for(const p of [...starters(t,'OL'),...starters(t,'DL')])p.ss.gp++;
}
function recordGame(L,g){
  const H=L.teams[g.h],A=L.teams[g.a];const conf=!g.post&&H.conf===A.conf&&!isInd(L,H);
  H.rec.pf+=g.hs;H.rec.pa+=g.as;A.rec.pf+=g.as;A.rec.pa+=g.hs;
  if(g.hs>g.as){H.rec.w++;A.rec.l++;if(conf){H.rec.cw++;A.rec.cl++}}else{A.rec.w++;H.rec.l++;if(conf){A.rec.cw++;H.rec.cl++}}
}
const winner=g=>g.hs>g.as?g.h:g.a, loser=g=>g.hs>g.as?g.a:g.h;

/* ---------- polls (FBS and FCS ranked separately) ---------- */
function updateRankings(L){
  const winp=t=>{const g=t.rec.w+t.rec.l;return g?t.rec.w/g:.5};
  const opps={};L.teams.forEach(t=>opps[t.id]=[]);
  for(const w of L.weeks)for(const g of w.games)if(g.hs!=null){opps[g.h].push(g.a);opps[g.a].push(g.h)}
  const sos=t=>{const o=opps[t.id];return o.length?o.reduce((s,id)=>{const ot=L.teams[id];return s+winp(ot)*(ot.div!==t.div&&ot.div==='FCS'?.4:1)},0)/o.length:.5};
  /* resume + analytics: an opponent-adjusted power rating (margin capped, preseason prior fades after ~3 games)
     plus a resume score where who you beat matters, bad losses hurt more, and big wins move you without overranking */
  const G={};L.teams.forEach(t=>G[t.id]=[]);for(const w of L.weeks)for(const g of w.games)if(g.hs!=null){G[g.h].push({o:g.a,m:g.hs-g.as});G[g.a].push({o:g.h,m:g.as-g.hs})}
  const prior=t=>(qOf(t)-3)*7+(isFCS(t)?-12:0)+(teamOvr(t)-3)*3;let r={};L.teams.forEach(t=>r[t.id]=prior(t));
  for(let it=0;it<12;it++){const n={};for(const t of L.teams){const gs=G[t.id];let s=0;for(const g of gs)s+=clamp(g.m,-24,24)+r[g.o];n[t.id]=(s+3*prior(t))/(gs.length+3)}r=n}
  const Qv=x=>1/(1+Math.exp(-(x-2)/6));L.power=r;
  const sc={};for(const t of L.teams){let res=0;for(const g of G[t.id]){const o=L.teams[g.o];const q=Qv(r[g.o])*(isFCS(o)&&!isFCS(t)?.3:1);
      if(g.m>0)res+=.55+1.5*q+Math.min(g.m,21)/70;else{const close=g.m>-8;res-=(.35+(1-q)*1.5)*(close?.6:1)+(close?0:Math.min(-g.m,28)/120)}}
    /* poll inertia: last week's ranking carries over, so a loss to a good team is a dip, not a collapse */
    const pl=isFCS(t)?(L.rankF||[]):(L.rank||[]),pi=pl.indexOf(t.id),inert=pi>=0&&pi<30?(30-pi)*.11:0;
    sc[t.id]=res+r[t.id]*.16+(t.cc?1:0)+inert+Math.random()*.001;void winp;void sos}
  let ids=L.teams.map(t=>t.id).sort((a,b)=>sc[b]-sc[a]);
  ids=pollAdjust(L,ids,sc,G,r,Qv);
  L.rank=ids.filter(id=>!isFCS(L.teams[id]));L.rankF=ids.filter(id=>isFCS(L.teams[id]));
}
const rankList=(L,t)=>isFCS(t)?(L.rankF||[]):L.rank;
const rankOf=id=>{const t=LG.teams[id];const i=rankList(LG,t).indexOf(id);return i>=0&&i<25?i+1:null};
const rankTag=id=>{const r=rankOf(id);return r?`#${r} `:''};
const pollName=(L,div)=>div==='FCS'?(L.phase==='offseason'?'FCS final poll':'FCS poll'):L.phase==='offseason'?'Final poll':L.week===0?'Preseason poll':L.week>=L.R-5?'CFP rankings':'Media poll';
function h2h(L,a,b){for(const w of L.weeks)for(const g of w.games)if(g.hs!=null&&!g.post&&((g.h===a&&g.a===b)||(g.h===b&&g.a===a)))return winner(g)===a?-1:1;return 0}
function confStandings(L,c){
  const ri=id=>{const t=L.teams[id];const i=rankList(L,t).indexOf(id);return i<0?999:i};
  return L.teams.filter(t=>t.conf===c).sort((a,b)=>(b.rec.cw-b.rec.cl)-(a.rec.cw-a.rec.cl)||h2h(L,a.id,b.id)||(b.rec.w-b.rec.l)-(a.rec.w-a.rec.l)||ri(a.id)-ri(b.id));
}

/* ---------- postseason: title games, 12-team CFP, bowls, 24-team FCS playoff, Celebration Bowl ---------- */
function postGame(h,a,extra){return Object.assign({h,a,hs:null,as:null,post:true,neutral:true,wx:'Clear',slot:'Primetime'},extra)}
const WIN=g=>g&&g.hs!=null?winner(g):null;
function buildPost(L){
  const k=L.week-L.R,cs=L.confs.map((c,i)=>[c,i]),games=[];
  if(k===0){
    for(const [c,i] of cs)if(c.ccg&&!c.ind){const s=confStandings(L,i);if(s.length>=2)games.push(postGame(s[0].id,s[1].id,{tag:c.name+' Championship',ccg:true,conf:i}))}
    for(const [c,i] of cs)if(c.div==='FCS'&&!c.ccg&&!c.ind){const s=confStandings(L,i);if(s[0]){s[0].cc=true;s[0].ccTitles++}}
    const fcs=L.teams.filter(isFCS);
    if(fcs.length>=16){
      const field=fcs.filter(t=>t.cc&&L.confs[t.conf].auto).map(t=>t.id);
      for(const id of L.rankF){if(field.length>=24)break;const t=L.teams[id];if(!field.includes(id)&&!L.confs[t.conf].celebration)field.push(id)}
      const seeds=field.sort((a,b)=>L.rankF.indexOf(a)-L.rankF.indexOf(b));
      L.fcsp={seeds,r1:[],r2:[],qf:[],sf:[],final:null};for(const id of seeds)L.teams[id].playoffApps++;
      for(let j=0;j<8;j++){const hi=seeds[8+j],lo=seeds[23-j];if(hi==null||lo==null){L.fcsp.r1.push(null);continue}const g=postGame(hi,lo,{fcsp:true,neutral:false,tag:`FCS Playoffs · First Round · #${9+j} vs #${24-j}`,wx:weatherFor(12),slot:'Afternoon'});L.fcsp.r1.push(g);games.push(g)}
    }
    L.weeks[L.week]={label:WEEK_NAMES[0],kind:'post0',games};
  }
  if(k===1){
    const champs=L.teams.filter(t=>!isFCS(t)&&t.cc).map(t=>t.id).sort((a,b)=>L.rank.indexOf(a)-L.rank.indexOf(b));
    const field=champs.slice(0,5);for(const id of L.rank){if(field.length>=12)break;if(!field.includes(id))field.push(id)}
    const seeds=field.sort((a,b)=>L.rank.indexOf(a)-L.rank.indexOf(b));
    L.cfp={seeds,r1:[],qf:[],sf:[],final:null};for(const id of seeds)L.teams[id].playoffApps++;
    for(let j=0;j<4;j++){const g=postGame(seeds[4+j],seeds[11-j],{cfp:true,neutral:false,tag:`CFP First Round · #${5+j} vs #${12-j}`,wx:weatherFor(13)});L.cfp.r1.push(g);games.push(g)}
    const elig=L.rank.filter(id=>!seeds.includes(id)&&L.teams[id].rec.w>=6),names=shuffle(BOWLS.slice());
    for(let j=0;j+1<elig.length&&j/2<names.length;j+=2)games.push(postGame(elig[j],elig[j+1],{bowl:true,tag:names[j/2]}));
    const cel=cs.filter(([c])=>c.celebration).map(([c,i])=>L.teams.find(t=>t.conf===i&&t.cc)||confStandings(L,i)[0]).filter(Boolean);
    if(cel.length===2)games.push(postGame(cel[0].id,cel[1].id,{bowl:true,tag:'Celebration Bowl'}));
    if(L.fcsp){const s=L.fcsp.seeds;for(let sd=1;sd<=8;sd++){const opp=WIN(L.fcsp.r1[8-sd]);if(s[sd-1]==null||opp==null){L.fcsp.r2.push(null);continue}const g=postGame(s[sd-1],opp,{fcsp:true,neutral:false,tag:`FCS Playoffs · Second Round · #${sd} seed`,slot:'Afternoon'});L.fcsp.r2.push(g);games.push(g)}}
    L.weeks[L.week]={label:WEEK_NAMES[1],kind:'post1',games};
  }
  if(k===2){
    const s=L.cfp.seeds,r=L.cfp.r1.map(WIN);L.cfp.qf=[[s[0],r[3]],[s[1],r[2]],[s[2],r[1]],[s[3],r[0]]].map(([a,b],j)=>postGame(a,b,{cfp:true,tag:`CFP Quarterfinal · ${CFP_QF[j]}`}));games.push(...L.cfp.qf);
    if(L.fcsp){const r2=L.fcsp.r2.map(WIN);L.fcsp.qf=[[0,7],[1,6],[2,5],[3,4]].map(([a,b])=>r2[a]!=null&&r2[b]!=null?postGame(r2[a],r2[b],{fcsp:true,neutral:false,tag:'FCS Playoffs · Quarterfinal',slot:'Afternoon'}):null);games.push(...L.fcsp.qf.filter(Boolean))}
    L.weeks[L.week]={label:WEEK_NAMES[2],kind:'post2',games};
  }
  if(k===3){
    const q=L.cfp.qf.map(WIN);L.cfp.sf=[postGame(q[0],q[3],{cfp:true,tag:'CFP Semifinal · '+CFP_SF[0]}),postGame(q[1],q[2],{cfp:true,tag:'CFP Semifinal · '+CFP_SF[1]})];games.push(...L.cfp.sf);
    if(L.fcsp){const f=L.fcsp.qf.map(WIN);L.fcsp.sf=[[0,3],[1,2]].map(([a,b])=>f[a]!=null&&f[b]!=null?postGame(f[a],f[b],{fcsp:true,neutral:false,tag:'FCS Playoffs · Semifinal',slot:'Afternoon'}):null);games.push(...L.fcsp.sf.filter(Boolean))}
    L.weeks[L.week]={label:WEEK_NAMES[3],kind:'post3',games};
  }
  if(k===4){
    const f=L.cfp.sf.map(WIN);L.cfp.final=postGame(f[0],f[1],{cfp:true,tag:'CFP National Championship'});games.push(L.cfp.final);
    if(L.fcsp){const g=L.fcsp.sf.map(WIN);if(g[0]!=null&&g[1]!=null){L.fcsp.final=postGame(g[0],g[1],{fcsp:true,tag:'FCS National Championship'});games.push(L.fcsp.final)}}
    L.weeks[L.week]={label:WEEK_NAMES[4],kind:'post4',games};
  }
}
function userGameThisWeek(){const w=LG.weeks[LG.week];if(!w||LG.phase!=='regular')return null;return w.games.find(g=>(g.h===LG.user||g.a===LG.user)&&g.hs==null)||null}

/* ---------- Heisman + awards ---------- */
function prodScore(p){const s=p.ss;if(p.pos==='QB')return s.py/26+s.ptd*4.2-s.int*3.5+s.ry/9+s.rtd*6;if(p.pos==='RB')return s.ry/10+s.rtd*5.5+s.recy/12+s.rectd*4;if(p.pos==='WR'||p.pos==='TE')return s.recy/10+s.rectd*5.5;return s.py/25+s.ptd*4-s.int*3+s.ry/10+s.rtd*6+s.recy/11+s.rectd*5+s.tkl*.25+s.sck*3+s.dint*5}
function heismanScore(L,t,p){if(!['QB','RB','WR','TE'].includes(p.pos))return 0;const g=t.rec.w+t.rec.l;const wp=g?t.rec.w/g:.5;const rk=rankOf?(rankList(L,t).indexOf(t.id)):-1;const big=rk>=0&&rk<10?1.1:rk>=0&&rk<25?1.04:.94;return prodScore(p)*(.5+wp*.75)*big+ovr(p)*4+(p.real?3:0)}
function heismanTop(L,n,div){div=div||'FBS';const all=[];for(const t of L.teams){if(t.div!==div)continue;for(const p of t.roster){const s=heismanScore(L,t,p);if(s>0)all.push({p,t,s})}}return all.sort((a,b)=>b.s-a.s).slice(0,n)}
const statLine=p=>{const s=p.ss;if(p.pos==='QB')return `${s.py} pass yds · ${s.ptd} TD · ${s.int} INT`;if(p.pos==='RB')return `${s.ry} rush yds · ${s.rtd} TD`;if(p.pos==='WR'||p.pos==='TE')return `${s.rec} rec · ${s.recy} yds · ${s.rectd} TD`;if(p.pos==='K')return `${s.fgm}/${s.fga} FG`;return `${s.tkl} tackles · ${s.sck} sacks · ${s.dint} INT`};
function awardHeisman(L){
  const f=heismanTop(L,1,'FCS')[0];if(f){L.fcsPoy={season:L.season,name:fullName(f.p),pos:f.p.pos,team:f.t.id,line:statLine(f.p)};if(f.t.id===L.user){L.fan=clamp(L.fan+8,0,100);L.news.unshift({t:`${fullName(f.p)} is named FCS Player of the Year!`,good:true})}}
  const top=heismanTop(L,3);if(!top.length)return;const w=top[0];
  L.heisman={season:L.season,pid:w.p.id,name:fullName(w.p),pos:w.p.pos,team:w.t.id,line:statLine(w.p),finalists:top.map(x=>({name:fullName(x.p),team:x.t.id,pos:x.p.pos}))};
  if(w.t.id===L.user){L.fan=clamp(L.fan+10,0,100);L.morale=clamp(L.morale+8,0,100);L.news.unshift({t:`${fullName(w.p)} wins the Heisman Trophy! Recruits across the country noticed.`,good:true});w.p.heisman=(w.p.heisman||0)+1}
  else L.news.unshift({t:`${fullName(w.p)} (${w.t.city}) wins the Heisman Trophy.`});
}
function computeAwards(L){
  const score=(t,p)=>ovr(p)*10+prodScore(p)*.6;
  const team=(teams,filter)=>{const out=[];for(const pos of POS_ORDER){const c=[];for(const t of teams)for(const p of t.roster)if(p.pos===pos&&(!filter||filter(p)))c.push({p,t,s:score(t,p)});c.sort((a,b)=>b.s-a.s).slice(0,STARTERS[pos]).forEach(x=>out.push({pid:x.p.id,name:fullName(x.p),pos,team:x.t.id}))}return out};
  const u=L.teams[L.user],div=L.teams.filter(t=>t.div===u.div);
  const allAm=team(div),allConf=team(L.teams.filter(t=>t.conf===u.conf)),frosh=team(div,p=>p.yr===1);
  let coy=null,best=-99;for(const t of div){const exp=3.5+t.prestige*1.4;const d=t.rec.w-exp+(t.cc?1:0)+(L.champ===t.id||L.champF===t.id?2:0);if(d>best){best=d;coy=t.id}}
  if(coy===L.user)L.coach.coy++;
  return {allAm,allConf,frosh,coy,heisman:L.heisman};
}

/* ---------- weekly flow ---------- */
function weeklyUpkeep(L){
  const u=L.teams[L.user];const rec=12+6*L.fac.rehab;
  for(const p of u.roster){p.cond=Math.min(100,p.cond+rec);if(p.inj>0){if(p.injNew)p.injNew=false;else{p.inj--;if(p.inj<=0){p.inj=0;p.injWhy=''}}}}
  L.morale=clamp(L.morale+(65-L.morale)*.08+(captainsHealthy(L)?1:0),0,100);
}
const captainsHealthy=L=>L.captains.length>0&&L.captains.every(id=>{const p=L.teams[L.user].roster.find(x=>x.id===id);return p&&p.inj<=0});
function finishWeek(L){
  invalidate();
  const w=L.weeks[L.week];const preF=L.rank.slice(0,25),preC=(L.rankF||[]).slice(0,25);const rk=id=>{const l=isFCS(L.teams[id])?preC:preF;const i=l.indexOf(id);return i>=0?i+1:null};
  for(const g of w.games){
    if(g.hs==null){const [hs,as]=g.pre?[g.pre.hs,g.pre.as]:simScore(g.h,g.a,g.neutral);delete g.pre;g.hs=hs;g.as=as;recordGame(L,g);simStats(L.teams[g.h],hs);simStats(L.teams[g.a],as)}
    const wi=winner(g),lo=loser(g);if(rk(lo)&&L.teams[wi].div===L.teams[lo].div&&(!rk(wi)||rk(wi)-rk(lo)>=8))g.upset=true;if(!rk(wi)&&isFCS(L.teams[wi])&&!isFCS(L.teams[lo]))g.upset=true;
    if(g.rival){const t1=L.teams[g.h],t2=L.teams[g.a];t1.holder=t2.holder=wi}
    if(g.bowl)L.teams[wi].bowlWins++;
    if(g.ccg){L.teams[wi].cc=true;L.teams[wi].ccTitles++}
  }
  if(w.kind==='post4'){if(L.cfp&&L.cfp.final){const c=winner(L.cfp.final);L.teams[c].titles++;L.champ=c}if(L.fcsp&&L.fcsp.final){const c=winner(L.fcsp.final);L.teams[c].titles++;L.champF=c}}
  weeklyUpkeep(L);
  L.prevRank=preF;L.prevRankF=preC;invalidate();updateRankings(L);if(typeof feedWeek==='function'&&w.kind!=='post4')try{feedWeek(L,preF)}catch(e){}
  L.lastWeek={label:w.label,games:w.games.map(g=>({h:g.h,a:g.a,hs:g.hs,as:g.as,tag:g.tag,upset:g.upset,rh:rk(g.h),ra:rk(g.a)}))};
  pickPOTW(L,w);
  L.heismanWatch=heismanTop(L,5).map(x=>({pid:x.p.id,name:fullName(x.p),pos:x.p.pos,team:x.t.id,line:statLine(x.p)}));
  if(w.kind==='post0')awardHeisman(L);
  for(const g of w.games)if(g.upset&&L.news.length<40){const wt=L.teams[winner(g)],lt=L.teams[loser(g)];L.news.unshift({t:`Upset: ${wt.city} beats ${rk(lt.id)?'#'+rk(lt.id)+' ':''}${lt.city}, ${Math.max(g.hs,g.as)}–${Math.min(g.hs,g.as)}.`})}
  L.news=L.news.slice(0,30);
  L.week++;
  if(L.week>=L.R&&L.week<=L.R+4)buildPost(L);
  if(L.week>L.R+4)return startOffseason(L);
  if(L.week<L.R&&Math.random()<.4)L.event=genEvent(L);
}
function pickPOTW(L,w){
  const u=L.teams[L.user];const conf=u.conf;let best=null;
  for(const g of w.games){if(g.post)continue;const t=L.teams[winner(g)];if(t.conf!==conf)continue;for(const pos of ['QB','RB','WR']){const p=starters(t,pos)[0];if(!p)continue;const s=ovr(p)+Math.random()*2+(t.id===L.user&&L.lastUserPOG===p.id?3:0);if(!best||s>best.s)best={p,t,s}}}
  if(best){L.potw={name:fullName(best.p),pos:best.p.pos,team:best.t.id,week:w.label};if(best.t.id===L.user){L.morale=clamp(L.morale+2,0,100);best.p.xp+=10}}
}

/* ---------- dilemma events (front office) ---------- */
const EVENTS=[
  {text:p=>`${fullName(p)} (${p.pos}) skipped film study this week.`,opts:[['Discipline him',(L,p)=>{L.morale-=hasTrait('dc','Disciplinarian')?0:2;p.xp=Math.max(0,p.xp-15);return 'He loses 15 XP. The team sees you hold the line.'}],['Let it slide',(L,p)=>{L.morale+=2;L.fan-=2;return 'Players like the leeway. Some fans grumble (−2 fan approval).'}]]},
  {text:p=>`Local TV wants a sit-down interview with ${fullName(p)}.`,opts:[['Do the interview',(L,p)=>{L.fan+=6;p.cond=Math.max(20,p.cond-5);return 'Fans love it (+6 fan approval).'}],['Keep the focus on football',(L,p)=>{L.morale+=2;return 'The locker room appreciates it (+2 morale).'}]]},
  {text:()=>`A booster offers a donation, but wants more say in the depth chart.`,opts:[['Take the money',L=>{L.credits+=5;L.morale-=4;return '+5 coaching credits. Players are uneasy (−4 morale).'}],['Decline politely',L=>{L.morale+=3;L.fan+=1;return 'The team rallies around you (+3 morale).'}]]},
  {text:p=>`${fullName(p)} asks for extra reps after practice.`,opts:[['Approve',(L,p)=>{p.xp+=30;p.cond=Math.max(20,p.cond-15);return '+30 XP, but he’s more tired this week.'}],['Make him rest',(L,p)=>{p.cond=Math.min(100,p.cond+15);return 'Fresh legs for Saturday.'}]]},
  {text:()=>`The seniors want to host a team dinner.`,opts:[['Pay for it (2 CC)',L=>{if(L.credits<2){L.morale-=2;return 'You can’t cover it right now (−2 morale).'}L.credits-=2;L.morale+=8;return 'Great night for team chemistry (+8 morale).'}],['Not this week',L=>{L.morale-=3;return 'Disappointed seniors (−3 morale).'}]]},
  {text:p=>`${fullName(p)} posted something controversial online.`,opts:[['Suspend him one game',(L,p)=>{p.inj=1;p.injNew=true;p.injWhy='Suspended';L.fan+=3;L.morale-=2;return 'He sits out the next game.'}],['Back him publicly',L=>{L.morale+=4;L.fan-=6;return 'The team appreciates it. The press doesn’t (−6 fan approval).'}]]},
  {text:()=>`The student section is petitioning for a blackout night game.`,opts:[['Make it happen (1 CC)',L=>{if(L.credits<1)return 'Not enough credits this week.';L.credits-=1;L.fan+=7;return 'Electric atmosphere next home game (+7 fan approval).'}],['Not this season',L=>{L.fan-=2;return 'Students are let down (−2 fan approval).'}]]},
  {text:p=>`Trainers flag fatigue in ${fullName(p)}.`,opts:[['Sit him a week',(L,p)=>{p.inj=1;p.injNew=true;p.injWhy='Rest';p.cond=100;return 'He’ll be fully fresh after a week off.'}],['Play through it',(L,p)=>{p.cond=Math.max(20,p.cond-10);return 'He plays, but at reduced condition.'}]]},
  {text:()=>`A rival coach took a shot at your program in a press conference.`,opts:[['Fire back',L=>{L.fan+=5;L.morale+=3;return 'Fans love the fire (+5 fan, +3 morale).'}],['Stay classy',L=>{L.morale+=1;return 'You keep the high road.'}]]},
  {text:p=>`${fullName(p)} is falling behind in class and needs a tutor.`,opts:[['Hire a tutor (3 CC)',(L,p)=>{if(L.credits<3){p.inj=1;p.injNew=true;p.injWhy='Academic';return 'Not enough credits. He’s academically ineligible for a week.'}L.credits-=3;p.xp+=10;L.morale+=3;return 'He stays eligible (+3 morale).'}],['He’ll figure it out',(L,p)=>{p.inj=1;p.injNew=true;p.injWhy='Academic';L.morale-=2;return 'He’s ineligible for the next game.'}]]},
];
function genEvent(L){const u=L.teams[L.user];const pool=POS_ORDER.flatMap(pos=>starters(u,pos)).filter(p=>p.inj<=0);if(!pool.length)return null;return {k:rint(0,EVENTS.length-1),pid:pick(pool).id}}

/* ---------- user game bookkeeping: credits, morale, XP, injuries, records ---------- */
const REGIMES={light:{x:.75,c:-4,i:.6,label:'Light'},normal:{x:1,c:0,i:1,label:'Normal'},hard:{x:1.35,c:5,i:1.5,label:'Hard'}};
function addXP(p,x,list){p.xp+=x;let n=0;while(p.xp>=100&&n<4){n++;p.xp-=100;const ks=PATTR[p.pos].filter(k=>p[k]<5);if(!ks.length){p.xp=0;break}ks.sort((a,b)=>p[a]-p[b]);const k=Math.random()<.6?ks[0]:pick(ks);p[k]++;list&&list.push({id:p.id,name:fullName(p),pos:p.pos,attr:attrName(p.pos,k),to:p[k]})}}
const gameXP=s=>s?Math.min(80,s.py/8+s.ptd*12+s.ry/5+s.rtd*12+s.recy/5+s.rectd*12+s.rec*2):0;
function processUserGame(L,g,info){
  const u=L.teams[L.user],opp=L.teams[g.h===L.user?g.a:g.h],home=g.h===L.user&&!g.neutral,wi=L.week;
  let cc=info.won?3:1;if(home)cc+=L.fac.stadium-1+(L.fan>70?1:0);if(info.won&&rankOf(opp.id))cc+=1;L.credits+=cc;
  let fan=info.won?4:-5;if(info.won&&rankOf(opp.id)&&rankOf(opp.id)<=10)fan+=4;if(g.rival)fan+=info.won?6:-6;if(home&&wi===L.hcWeek)fan+=info.won?3:-2;if(info.storm)fan+=8;L.fan=clamp(L.fan+fan,0,100);
  let mor=info.won?5:-(hasTrait('oc','Motivator')?3:6);if(captainsHealthy(L))mor+=info.won?1:2;L.morale=clamp(L.morale+mor,0,100);
  if(info.won)L.coach.w++;else L.coach.l++;
  if(info.simmed)simStats(u,info.us);
  else{const pst=info.pst||{};for(const p of u.roster){const s=pst[p.id];if(!s)continue;p.ss.gp++;for(const k in s)if(k in p.ss)p.ss[k]+=s[k]}}
  simStats(opp,info.them);
  const dxp=info.dxp||{};for(const p of u.roster){const d=dxp[p.id];if(d){p.ss.tkl+=d.tkl||0;p.ss.sck+=d.sck||0;p.ss.dint+=d.dint||0}}
  const reg=REGIMES[L.regime],trainM=1+.2*(L.fac.training-1),lev=[],inj=[];
  const st=POS_ORDER.flatMap(pos=>starters(u,pos));const sd=home&&wi===seniorDayWeek(L)&&L.weeks[wi]&&L.weeks[wi].kind==='reg';
  for(const p of st){let x=12+gameXP((info.pst||{})[p.id])+((dxp[p.id]&&dxp[p.id].xp)||0);if(info.simmed)x+=8;if(p.pos==='QB'&&hasTrait('oc','QB Guru'))x*=1.25;if(sd&&p.yr===4)x+=15;addXP(p,x*reg.x*trainM,lev)}
  for(const p of u.roster)if(!st.includes(p))addXP(p,4*trainM,lev);
  for(const p of st){if(p.pos==='K')continue;p.cond=clamp(p.cond-(R(8,14)+reg.c),20,100);if(Math.random()<.028*reg.i*(hasTrait('dc','Physio')?.5:1)){p.inj=Math.max(1,rint(1,5)-Math.floor(L.fac.rehab/2));p.injNew=true;p.injWhy=pick(['Ankle sprain','Hamstring','Shoulder','Concussion protocol','Knee bruise','Wrist']);inj.push({name:fullName(p),pos:p.pos,wk:p.inj,why:p.injWhy})}}
  const ts=L.ts,s=info.stats||{};ts.g++;ts.pf+=info.us;ts.pa+=info.them;ts.py+=s.passYds||0;ts.ry+=s.rushYds||0;ts.thirdA+=s.thirdA||0;ts.thirdC+=s.thirdC||0;ts.rzA+=s.rzA||0;ts.rzTD+=s.rzTD||0;ts.to+=(s.int||0);ts.pen+=s.pen||0;
  updateGameRecords(L,info,opp);
  return {cc,fan,mor,lev,inj};
}
function seedRecords(L){
  const yr=()=>L.season-rint(3,40),nm=()=>pick(FIRST)+' '+pick(LAST);
  L.records={gPass:{label:'Passing yards, game',v:rint(390,520),who:nm(),season:yr()},gRush:{label:'Rushing yards, game',v:rint(215,300),who:nm(),season:yr()},gRec:{label:'Receiving yards, game',v:rint(200,270),who:nm(),season:yr()},gPts:{label:'Points, game',v:rint(56,70),who:L.teams[L.user].city,season:yr()},
    sPass:{label:'Passing yards, season',v:rint(3300,4600),who:nm(),season:yr()},sRush:{label:'Rushing yards, season',v:rint(1450,2050),who:nm(),season:yr()},sRec:{label:'Receiving yards, season',v:rint(1250,1700),who:nm(),season:yr()},sTD:{label:'Total TDs, season',v:rint(24,38),who:nm(),season:yr()},sWins:{label:'Wins, season',v:rint(12,14),who:L.teams[L.user].city,season:yr()}};
}
function setRecord(L,key,label,v,who,extra){const r=L.records[key];if(!r||v>r.v){L.records[key]={label,v,who,season:L.season,extra};return true}return false}
function updateGameRecords(L,info,opp){
  if(info.simmed)return;const u=L.teams[L.user],pst=info.pst||{};const out=[];
  for(const p of u.roster){const s=pst[p.id];if(!s)continue;
    if(s.py&&setRecord(L,'gPass','Passing yards, game',s.py,fullName(p),'vs '+opp.city))out.push('passing yards in a game');
    if(s.ry&&setRecord(L,'gRush','Rushing yards, game',s.ry,fullName(p),'vs '+opp.city))out.push('rushing yards in a game');
    if(s.recy&&setRecord(L,'gRec','Receiving yards, game',s.recy,fullName(p),'vs '+opp.city))out.push('receiving yards in a game')}
  if(setRecord(L,'gPts','Points, game',info.us,u.city,'vs '+opp.city))out.push('points in a game');
  info.records=out;
}
function updateSeasonRecords(L){const u=L.teams[L.user];for(const p of u.roster){const s=p.ss;setRecord(L,'sPass','Passing yards, season',s.py,fullName(p));setRecord(L,'sRush','Rushing yards, season',s.ry,fullName(p));setRecord(L,'sRec','Receiving yards, season',s.recy,fullName(p));setRecord(L,'sTD','Total TDs, season',s.ptd+s.rtd+s.rectd,fullName(p))}setRecord(L,'sWins','Wins, season',u.rec.w,u.city)}

/* ---------- offseason ---------- */
const adTarget=t=>Math.round((t.div==='FCS'?4.5:3.5)+t.prestige*1.4);
function startOffseason(L){
  L.phase='offseason';L.event=null;const u=L.teams[L.user];L.coach.seasons++;
  const madePO=!!((L.cfp&&L.cfp.seeds.includes(L.user))||(L.fcsp&&L.fcsp.seeds.includes(L.user))),champ=L.champ===L.user||L.champF===L.user;
  let bowl=null;for(const w of L.weeks)for(const g of w.games)if(g.bowl&&(g.h===L.user||g.a===L.user))bowl={name:g.tag,won:winner(g)===L.user};
  if(madePO)L.coach.playoffs++;if(champ)L.coach.natties++;if(u.cc)L.coach.confs++;if(bowl&&bowl.won)L.coach.bowls++;
  const target=adTarget(u);const delta=Math.round((u.rec.w-target)*7+(madePO?8:0)+(champ?20:0)+(u.cc?6:0));L.coach.security=clamp(L.coach.security+delta,0,100);
  const aw=computeAwards(L);L.awards.unshift({season:L.season,...aw});L.awards=L.awards.slice(0,10);
  updateSeasonRecords(L);
  L.history.push({season:L.season,w:u.rec.w,l:u.rec.l,rank:rankOf(L.user),cc:u.cc,champ,madePO,seed:madePO?((L.cfp&&L.cfp.seeds.includes(L.user))?L.cfp.seeds:L.fcsp.seeds).indexOf(L.user)+1:null,bowl,champName:L.champ!=null?teamName(L.teams[L.champ]):'—',champFName:L.champF!=null?teamName(L.teams[L.champF]):null,heisman:L.heisman&&L.heisman.name,team:L.user});
  L.off={stage:'recap',target,delta,madePO,champ,bowl};
}
function departures(L){
  const draftPool=[],user=L.teams[L.user],out={grads:[],declares:[],portalOut:[],drafted:[]};L.off.portalPool=[];
  for(const t of L.teams){
    const keep=[];
    for(const p of t.roster){
      const leave=p.yr>=4&&!(p.redshirt&&p.ss.gp<=4&&!p.rs);
      const declare=!leave&&p.yr===3&&ovr(p)>=4.2&&Math.random()<.55;
      const portal=!leave&&!declare&&p.ss.gp<3&&ovr(p)>=(t.id===L.user?3.2:2.9)&&Math.random()<(t.id===L.user?(L.morale>75?.15:.3):.12);
      if(leave||declare){draftPool.push({p,t,declare});if(t.id===L.user)(declare?out.declares:out.grads).push({name:fullName(p),pos:p.pos,ovr:ovr(p)})}
      else if(portal){if(t.id===L.user)out.portalOut.push({name:fullName(p),pos:p.pos,ovr:ovr(p)});L.off.portalPool.push({...p,from:t.id})}
      else keep.push(p);
    }
    t.roster=keep;
    if(t.dco)for(const pos in t.dco)t.dco[pos]=t.dco[pos].filter(id=>keep.some(p=>p.id===id));
  }
  draftPool.sort((a,b)=>ovr(b.p)-ovr(a.p));
  draftPool.slice(0,7*32).forEach((x,i)=>{if(x.t.id===L.user)out.drafted.push({name:fullName(x.p),pos:x.p.pos,round:Math.floor(i/32)+1,pick:i+1})});
  L.captains=L.captains.filter(id=>user.roster.some(p=>p.id===id));
  L.off.dep=out;
}
function jobOffers(L){
  const u=L.teams[L.user],o=L.off;const fired=L.coach.security<=10&&L.coach.seasons>=2;
  let pool;
  if(fired)pool=L.teams.filter(t=>t.id!==L.user&&qOf(t)<qOf(u)&&t.prestige<=2);
  else if(u.rec.w>=o.target+2||o.champ||o.madePO)pool=L.teams.filter(t=>t.id!==L.user&&qOf(t)>qOf(u)+.2&&qOf(t)<qOf(u)+1.6);
  else pool=[];
  o.fired=fired;o.offers=shuffle(pool.slice()).slice(0,fired?3:rint(1,3)).map(t=>t.id);
}
function takeJob(L,id){
  const old=L.user;L.teams[old].dco=null;L.user=id;L.coach.schools.push(id);L.coach.security=65;
  const t=L.teams[id];L.fac={stadium:clamp(t.prestige-1,1,5),training:clamp(t.prestige-1,1,5),rehab:clamp(t.prestige-2,1,5)};L.captains=[];L.fan=55;L.morale=65;
  L.news.unshift({t:`You are the new head coach of ${teamName(t)}.`,good:true});seedRecords(L);
}
const portalCost=p=>[0,40,90,180,320,520][clamp(Math.round(ovr(p)),1,5)];
function buildPortal(L){
  const pool=(L.off.portalPool||[]).filter(p=>p.from!==L.user);
  while(pool.length<14){const t=pick(L.teams.filter(x=>x.id!==L.user));const pos=pick(POS_ORDER.filter(p=>p!=='K'));const p=genPlayer(pos,qOf(t)-.2,rint(1,3));pool.push({...p,from:t.id})}
  L.off.portal=pool.sort((a,b)=>ovr(b)-ovr(a)).slice(0,16).map(p=>({...p,signed:false}));
}
function recruitInterest(L,stars){const u=L.teams[L.user];return clamp(Math.round(48+u.prestige*11-stars*10+(L.fan-50)/4+(L.coach.natties?6:0)+R(-14,14)),5,96)}
function buildRecruits(L){
  const u=L.teams[L.user];const need=POS_ORDER.flatMap(p=>Array(POS_COUNTS[p]).fill(p));
  const spot=hasTrait('oc','Talent Spotter');
  L.off.recruits=Array.from({length:22},()=>{const pos=pick(need);const st=clamp(Math.round(R(1,3.4)+u.prestige*.35),1,5);const p=genPlayer(pos,st+.3,1);if(spot){const k=PATTR[pos][0];p[k]=Math.min(5,p[k]+1)}return {...p,stars:st,interest:recruitInterest(L,st),offered:false,visit:false}}).sort((a,b)=>b.stars-a.stars);
  const ph=L.history[L.history.length-1]||{};
  L.off.rp=10+u.prestige*2+(ph.madePO?3:0)+(ph.champ?3:0)+(L.heisman&&L.heisman.team===L.user?2:0);L.off.nilBoost=0;
}
const recruitCost=p=>p.stars*2-1;
function signingDay(L){
  const u=L.teams[L.user];const res=[];
  for(const r of L.off.recruits){if(!r.offered)continue;const ch=r.interest+(r.visit?20:0);const ok=Math.random()*100<ch;res.push({name:fullName(r),pos:r.pos,stars:r.stars,ok});
    if(ok&&u.roster.length<ROSTER_CAP){const p={...r};['stars','interest','offered','visit'].forEach(k=>delete p[k]);p.isNew=true;p.ss=newSS();u.roster.push(p)}}
  const classes=L.teams.map(t=>({id:t.id,s:t.id===L.user?sum(res.filter(r=>r.ok).map(r=>r.stars**1.5)):t.prestige*R(5,9)+R(0,8)})).sort((a,b)=>b.s-a.s);
  L.off.signing={res,classRank:classes.findIndex(c=>c.id===L.user)+1,top:classes.slice(0,5).map(c=>c.id)};
}
function startNewSeason(L){
  const u=L.teams[L.user];const camp=[];const trainM=1+.2*(L.fac.training-1);
  for(const t of L.teams){
    const g=t.rec.w;
    if(t.id===L.user){const h=L.history[L.history.length-1];if(h.champ||g>=10||h.madePO)t.prestige=Math.min(5,t.prestige+1);else if(g<=4)t.prestige=Math.max(1,t.prestige-1)}
    else if(Math.random()<.35)t.prestige=clamp(t.prestige+(g>=9?1:g<=3?-1:0),1,5);
    t.q=lerp(qOf(t),(t.div==='FCS'?.3:1.1)+t.prestige*.62,.2);
    for(const p of t.roster){
      if(p.isNew){delete p.isNew;continue}
      if(p.redshirt&&p.ss.gp<=4&&!p.rs){p.rs=true}else p.yr=Math.min(4,p.yr+1);
      p.redshirt=false;
      const ch=[0,.35,.25,.15,.08][p.yr-1]||.08;for(const k of PATTR[p.pos])if(Math.random()<ch)p[k]=Math.min(5,p[k]+1);
      p.cond=100;p.inj=0;p.injWhy='';
    }
    for(const pos of POS_ORDER){let have=t.roster.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){t.roster.push(genPlayer(pos,t.id===L.user?qOf(t)-.9:qOf(t)-.3,1));have++}}
    assignNumbers(t);
  }
  for(const p of u.roster)addXP(p,20*trainM,camp);
  const h=L.history[L.history.length-1];
  L.nil+=300+u.prestige*150+L.fan*4+(h.champ?400:0)+(h.madePO?200:0);
  if(!L.captains.length)L.captains=u.roster.filter(p=>p.yr>=3).sort((a,b)=>ovr(b)-ovr(a)).slice(0,2).map(p=>p.id);
  L.season++;L.week=0;L.phase='regular';L.off=null;L.lastWeek=null;L.heisman=null;L.fcsPoy=null;L.heismanWatch=null;L.potw=null;L.event=null;invalidate();
  refreshStaffPool(L);resetRecords(L);buildSchedule(L);updateRankings(L);
  L.news.unshift({t:`Fall camp is done. ${camp.length} rating upgrades from spring practice and camp.`,good:true});
  return camp;
}

/* Poll adjustments that make the order read like a real poll:
   1) a ranked team that wins does not fall more than two spots,
   2) head-to-head: a team directly behind someone it beat (with no worse record) moves ahead,
   3) a resume card for every team (strength of schedule rank, best win, worst loss, record vs ranked). */
function pollAdjust(L,ids,sc,G,r,Qv){
  const lastRes={};for(const t of L.teams){const gs=G[t.id];lastRes[t.id]=gs.length?gs[gs.length-1].m>0:null}
  for(const div of ['FBS','FCS']){
    let list=ids.filter(id=>(L.teams[id].div||'FBS')===div);const prev=div==='FCS'?(L.rankF||[]):(L.rank||[]);
    if(prev.length&&L.week>0){
      for(let pi=0;pi<25&&pi<prev.length;pi++){const id=prev[pi];if(lastRes[id]!==true)continue;const ni=list.indexOf(id);const cap=pi+2;
        if(ni>cap){list.splice(ni,1);list.splice(cap,0,id)}}
    }
    for(let pass=0;pass<3;pass++)for(let i=0;i<Math.min(40,list.length-1);i++){const a=list[i],b=list[i+1];const ta=L.teams[a],tb=L.teams[b];
      if(h2h(L,b,a)===-1&&tb.rec.l<=ta.rec.l){list[i]=b;list[i+1]=a}}
    let k=0;ids=ids.map(id=>(L.teams[id].div||'FBS')===div?list[k++]:id);
  }
  /* resume card */
  const rk={};for(const div of ['FBS','FCS']){ids.filter(id=>(L.teams[id].div||'FBS')===div).forEach((id,i)=>rk[id]=i+1)}
  const sos={};for(const t of L.teams){const gs=G[t.id];sos[t.id]=gs.length?gs.reduce((s,g)=>s+r[g.o],0)/gs.length:(qOf(t)-3)*7}
  const sosRank={};for(const div of ['FBS','FCS']){L.teams.filter(t=>(t.div||'FBS')===div).map(t=>t.id).sort((a,b)=>sos[b]-sos[a]).forEach((id,i)=>sosRank[id]=i+1)}
  L.rinfo={};
  for(const t of L.teams){let best=null,worst=null,vr=[0,0];for(const g of G[t.id]){const orank=rk[g.o];if(g.m>0){if(!best||r[g.o]>r[best.o])best=g}else{if(!worst||r[g.o]<r[worst.o])worst=g}if(orank&&orank<=25&&L.teams[g.o].div===t.div){if(g.m>0)vr[0]++;else vr[1]++}}
    L.rinfo[t.id]={sos:sosRank[t.id],best:best?best.o:null,bestM:best?best.m:0,worst:worst?worst.o:null,worstM:worst?worst.m:0,vr,pow:+r[t.id].toFixed(1)}}
  return ids;
}
