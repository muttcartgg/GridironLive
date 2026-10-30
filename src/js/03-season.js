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

/* ---------- 2026 scheduler ----------
   Rivalry Week first (each protected rivalry; the Pac-12 flex week pairs its other teams for a non-conference game), then every
   conference's league schedule (its game count with per-team exceptions such as the ACC's 8-game teams; Sun Belt and SWAC
   divisions: round robin plus cross-division games), an FCS opponent for most FBS teams (Big Ten less often, Notre Dame never),
   non-conference games until every FBS team has exactly 12 (FCS 11–12, Ivy League 10), home/away balance (FBS hosts FCS, a
   Power 4 team usually hosts a Group of 6 team), then 13 weeks by edge colouring with Kempe-chain repairs: non-conference
   games early, league games late, one bye each. */
const NC_RIVAL=new Set(['ARMY|NAVY','NAVY|ARMY']);   /* same-conference rivals whose game doesn't count in the standings */
const FCS_OPP={SEC:.85,ACC:.8,'Big 12':.85,'Big Ten':.4};   /* chance a team schedules an FCS opponent (others .7) */
/* adds games among ids until each has need[id] more or no legal partner is left: highest need first, partner by need +
   preference + noise; then repairs by swapping out a game this call added (a and b stuck: c–d becomes a–c and b–d) */
function pairUp(ids,need,ok,pref,add,drop){
  const mine=[];
  for(;;){const open=shuffle(ids.filter(id=>need[id]>0)).sort((x,y)=>need[y]-need[x]);let a=null,b=null;
    for(const x of open){let bs=-1e9;for(const y of open)if(y!==x&&ok(x,y)){const s=need[y]+(pref?pref(x,y):0)+Math.random()*1.5;if(s>bs){bs=s;b=y}}if(b!=null){a=x;break}}
    if(a==null)break;mine.push(add(a,b));need[a]--;need[b]--}
  for(let it=0;it<300;it++){const open=ids.filter(id=>need[id]>0);if(!open.length)break;
    const a=pick(open),o=open.filter(x=>x!==a),b=o.length?pick(o):need[a]>1?a:null;if(b==null)continue;
    for(const g of shuffle(mine.filter(g=>!g.dead))){const c=g.h,d=g.a;if(c===a||c===b||d===a||d===b)continue;
      const xy=[[c,d],[d,c]].find(([x,y])=>ok(a,x)&&ok(b,y));if(!xy)continue;
      drop(g);mine.push(add(a,xy[0]),add(b,xy[1]));need[a]--;need[b]--;break}}
}
/* frees week a at v for game g (u–v) by swapping an a/b alternating path that starts at v (fails if it reaches u or a fixed game) */
function kempe(S,g,u,v,R,put,lift){
  const fu=[],fv=[];for(let k=0;k<R;k++){if(!S[u][k])fu.push(k);if(!S[v][k])fv.push(k)}
  for(const a of shuffle(fu))for(const b of shuffle(fv)){if(a===b)continue;const path=[];let x=v,c=a,bad=false;
    for(let s=0;s<300;s++){const e=S[x][c];if(!e)break;if(e.fix){bad=true;break}path.push(e);x=e.h===x?e.a:e.h;if(x===u){bad=true;break}c=c===a?b:a}
    if(bad)continue;const ws=path.map(e=>e.w);path.forEach(lift);path.forEach((e,i)=>put(e,ws[i]===a?b:a));put(g,a);return true}
  return false;
}
function buildSchedule(L){
  const TT=L.teams,n=TT.length,C=L.confs,games=[],deg=new Array(n).fill(0),cnt=new Map();
  const key=(a,b)=>a<b?a*8192+b:b*8192+a,met=(a,b)=>cnt.get(key(a,b))||0;
  const add=(a,b,x)=>{const g=Object.assign({h:a,a:b},x);games.push(g);cnt.set(key(a,b),met(a,b)+1);deg[a]++;deg[b]++;return g};
  const drop=g=>{g.dead=true;cnt.set(key(g.h,g.a),met(g.h,g.a)-1);deg[g.h]--;deg[g.a]--};
  const cf=t=>C[t.conf]||{},ind=t=>!!cf(t).ind,fcs=t=>t.div==='FCS',P=p4Set(L);
  const maxG=t=>fcs(t)?cf(t).games||12:12,minG=t=>fcs(t)?cf(t).games||11:12,tier=t=>fcs(t)?0:P.has(t.conf)||isND(L,t)?2:1;
  /* Rivalry Week: protected rivalries (a same-conference rivalry is a league game unless it's Army–Navy) */
  for(const t of TT){const r=TT[t.rival];if(r&&t.id<r.id&&r.rival===t.id)add(t.id,r.id,{rival:true,tag:t.trophy,fix:true,lg:t.conf===r.conf&&!ind(t)&&!NC_RIVAL.has(t.abbr+'|'+r.abbr)})}
  /* league schedules */
  C.forEach((c,ci)=>{if(c.ind)return;const ids=TT.filter(t=>t.conf===ci).map(t=>t.id),m=ids.length;if(m<2)return;
    const lg={};for(const id of ids)lg[id]=0;for(const g of games)if(g.lg&&lg[g.h]!=null){lg[g.h]++;lg[g.a]++}
    const addL=(a,b)=>add(a,b,{lg:true});let ok=(a,b)=>!met(a,b);
    if(c.dv&&c.dv.length===2){const dv={};c.dv.forEach((d,k)=>d.ids.forEach(id=>dv[id]=k));for(const id of ids)if(dv[id]==null)dv[id]=0;
      for(let i=0;i<m;i++)for(let j=i+1;j<m;j++){const a=ids[i],b=ids[j];if(dv[a]===dv[b]&&!met(a,b)){addL(a,b);lg[a]++;lg[b]++}}
      ok=(a,b)=>dv[a]!==dv[b]&&!met(a,b)}
    const need={};for(const id of ids)need[id]=Math.max(0,Math.min(m-1,(c.cg||0)-((c.less||[]).includes(id)?1:0))-lg[id]);
    pairUp(ids,need,ok,null,addL,drop);
    /* flex week: a rematch, so the league meeting goes early in the season and the flex game is at the other stadium */
    if(c.flex){const fl=shuffle(ids.filter(id=>!games.some(g=>g.fix&&!g.dead&&(g.h===id||g.a===id))));
      for(let k=0;k+1<fl.length;k+=2){const [a,b]=[fl[k],fl[k+1]],x=games.find(g=>g.lg&&!g.dead&&(g.h===a||g.a===a)&&(g.h===b||g.a===b));if(x)x.early=true;add(a,b,{fix:true,tag:c.name+' Flex Week',rm:x})}}});
  /* an FCS opponent for most FBS teams (an FCS team plays at most two FBS teams; the Ivy League doesn't) */
  const pool=TT.filter(t=>fcs(t)&&maxG(t)>=11),fbsG={};
  for(const t of shuffle(TT.filter(t=>!fcs(t)))){if(deg[t.id]>=12||isND(L,t)||Math.random()>=(FCS_OPP[cf(t).name]||.7))continue;
    const c=pool.filter(f=>deg[f.id]<maxG(f)&&!met(t.id,f.id)),c1=c.filter(f=>!fbsG[f.id]),pk=c1.length?c1:c.filter(f=>fbsG[f.id]<2);
    if(pk.length){const f=pick(pk);add(t.id,f.id,{});fbsG[f.id]=(fbsG[f.id]||0)+1}}
  /* non-conference games until every FBS team has 12 (Notre Dame mostly plays Power 4 teams) */
  const fbs=TT.filter(t=>!fcs(t)).map(t=>t.id),nd={};for(const id of fbs)nd[id]=Math.max(0,12-deg[id]);
  pairUp(fbs,nd,(a,b)=>!met(a,b)&&(TT[a].conf!==TT[b].conf||ind(TT[a])),(a,b)=>{const x=TT[a],y=TT[b];return (tier(x)===tier(y)?.6:0)+(isND(L,x)||isND(L,y)?(Math.min(tier(x),tier(y))===2?1.5:-1):0)},(a,b)=>add(a,b,{}),drop);
  /* leftovers: an FCS team (one with no FBS game first), else a non-league game with a league rival that still needs one */
  for(const a of fbs)for(let k=0;nd[a]>0&&k<12;k++){const c=pool.filter(f=>deg[f.id]<maxG(f)&&!met(a,f.id)),c1=c.filter(f=>!fbsG[f.id]);
    if(c.length){const f=pick(c1.length?c1:c);add(a,f.id,{});fbsG[f.id]=(fbsG[f.id]||0)+1;nd[a]--;continue}
    const o=fbs.filter(b=>b!==a&&nd[b]>0&&!met(a,b));if(!o.length)break;const b=pick(o);add(a,b,{});nd[a]--;nd[b]--}
  /* FCS non-conference games: 12 where the calendar allows, at least 11 (Ivy League 10) */
  const fc=TT.filter(fcs).map(t=>t.id),nf={};for(const id of fc)nf[id]=Math.max(0,maxG(TT[id])-deg[id]);
  pairUp(fc,nf,(a,b)=>!met(a,b)&&(TT[a].conf!==TT[b].conf||ind(TT[a])),null,(a,b)=>add(a,b,{}),drop);
  for(const a of fc)for(let k=0;deg[a]<minG(TT[a])&&k<4;k++){const o=fc.filter(b=>b!==a&&deg[b]<maxG(TT[b])&&!met(a,b));if(!o.length)break;add(a,pick(o),{})}
  /* home and away */
  const gs=games.filter(g=>!g.dead),home=new Array(n).fill(0);
  for(const g of shuffle(gs.slice())){const x=TT[g.h],y=TT[g.a],tx=tier(x),ty=tier(y);let h;
    if(tx!==ty&&!g.fix&&Math.random()<(Math.min(tx,ty)===0?1:.85))h=tx>ty?g.h:g.a;
    else h=home[g.h]!==home[g.a]?(home[g.h]<home[g.a]?g.h:g.a):pick([g.h,g.a]);
    if(h!==g.h){g.a=g.h;g.h=h}home[h]++}
  for(const g of gs)if(g.rm&&g.rm.h===g.h){g.h=g.a;g.a=g.rm.h}
  /* weeks: Rivalry Week fixed, non-conference games take the earliest open week, league games the latest */
  const R=13,up=[...Array(R).keys()],down=up.slice().reverse();let left=[];
  for(let at=0;at<12;at++){
    const S=Array.from({length:n},()=>new Array(R).fill(null)),put=(g,w)=>{g.w=w;S[g.h][w]=S[g.a][w]=g},lift=g=>{S[g.h][g.w]=S[g.a][g.w]=null;g.w=-1};
    for(const g of gs){g.w=-1;if(g.fix)put(g,R-1)}
    const q=shuffle(gs.filter(g=>!g.fix&&!g.lg)).concat(shuffle(gs.filter(g=>!g.fix&&g.lg)));
    for(let step=0;q.length&&step<30000;step++){const g=q.shift(),wk=g.lg&&!g.early?down:up;
      const w=wk.find(k=>!S[g.h][k]&&!S[g.a][k]);if(w!=null){put(g,w);continue}
      if(kempe(S,g,g.h,g.a,R,put,lift)||kempe(S,g,g.a,g.h,R,put,lift))continue;
      const fv=up.filter(k=>!S[g.a][k]&&S[g.h][k]&&!S[g.h][k].fix);if(!fv.length){q.push(g);continue}
      const e=S[g.h][pick(fv)],k=e.w;lift(e);put(g,k);q.push(e)}
    left=q;if(!q.length)break}
  L.R=R;
  L.weeks=Array.from({length:R},(_,i)=>({label:i===R-1?'Rivalry Week':'Week '+(i+1),kind:'reg',games:[]}));
  for(const g of gs)if(g.w>=0&&!left.includes(g)){const nc=TT[g.h].conf===TT[g.a].conf&&!ind(TT[g.h])&&!g.lg;
    L.weeks[g.w].games.push(Object.assign({h:g.h,a:g.a,hs:null,as:null,wx:weatherFor(g.w),slot:pick(['Noon','Afternoon','Afternoon','Primetime']),tag:g.tag||null,rival:!!g.rival},nc?{nc:true}:null))}
  L.cfp=null;L.fcsp=null;L.champ=null;L.champF=null;
  if(L.user!=null)setHomecoming(L);
}
function setHomecoming(L){const ws=[];L.weeks.forEach((w,i)=>{if(i>=1&&i<L.R-3&&w.games.some(g=>g.h===L.user))ws.push(i)});L.hcWeek=ws.length?pick(ws):null}
function seniorDayWeek(L){let last=null;L.weeks.forEach((w,i)=>{if(w.kind==='reg'&&w.games.some(g=>g.h===L.user))last=i});return last}
const isConfGame=g=>{const a=T(g.h),b=T(g.a);return a.conf===b.conf&&!g.post&&!g.nc&&!isInd(LG,a)};
function gameFlags(L,g,wi){
  const f=[];const u=L.user;const home=g.h===u&&!g.neutral;
  if(g.rival)f.push(['gold','Rivalry · '+g.tag]);
  else if(g.tag)f.push(['gold',g.tag]);
  if(home&&wi===L.hcWeek)f.push(['blue','Homecoming']);
  if(home&&wi===seniorDayWeek(L)&&L.weeks[wi].kind==='reg')f.push(['blue','Senior Day']);
  if(!g.post&&isConfGame(g))f.push(['','Conference game']);
  if(!g.post&&T(g.h).div!==T(g.a).div)f.push(['','FBS vs FCS']);
  if(g.post&&g.date)f.push(['',g.date+(g.neutral&&g.site?' · '+g.site:'')]);
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
  const H=L.teams[g.h],A=L.teams[g.a];const conf=!g.post&&!g.nc&&H.conf===A.conf&&!isInd(L,H);
  H.rec.pf+=g.hs;H.rec.pa+=g.as;A.rec.pf+=g.as;A.rec.pa+=g.hs;
  if(g.hs>g.as){H.rec.w++;A.rec.l++;if(conf){H.rec.cw++;A.rec.cl++}}else{A.rec.w++;H.rec.l++;if(conf){A.rec.cw++;H.rec.cl++}}
}
const winner=g=>g.hs>g.as?g.h:g.a, loser=g=>g.hs>g.as?g.a:g.h;

/* ---------- rankings ----------
   AP Top 25 (FBS and FCS polled separately), voted like the media poll: a preseason poll from program prestige, roster
   strength and last season's final poll; then each week voters start from last week's ballot and move teams by result
   (a win holds or climbs, more for ranked, top-10 and road wins; a loss drops a team by opponent and margin; byes hold),
   re-read résumés a little more as the season goes (record tiers: fewer losses first unless the quality gap is large),
   and keep two hard rules: a ranked team that won or was idle falls at most two spots, and a team that beat a team with
   the same or a worse record is ranked ahead of it.
   CFP committee rankings (FBS, L.cfpRank): from the week closest to early November through conference championship
   weekend, résumé-first and redone every week (little inertia). */
const P4_NAMES=['SEC','Big Ten','Big 12','ACC'];
function p4Set(L){const fbs=L.confs.map((c,i)=>i).filter(i=>L.confs[i].div==='FBS'&&!L.confs[i].ind);let s=fbs.filter(i=>P4_NAMES.includes(L.confs[i].name));
  if(s.length<4){const avg=i=>{const ts=L.teams.filter(t=>t.conf===i);return ts.length?sum(ts.map(qOf))/ts.length:0};s=fbs.length>5?fbs.slice().sort((a,b)=>avg(b)-avg(a)).slice(0,4):fbs}
  return new Set(s)}
const isND=(L,t)=>!isFCS(t)&&isInd(L,t)&&(t.abbr==='ND'||t.city==='Notre Dame');
const cfpFrom=L=>clamp(Math.min(10,(L.R||13)-3),2,10);   /* first CFP rankings come out after this regular-season week (week 10, early November) */
const rkQ=x=>1/(1+Math.exp(-(x-2)/6));
function rankCtx(L){
  const G={};for(const t of L.teams)G[t.id]=[];
  L.weeks.forEach((w,wi)=>{for(const g of w.games)if(g.hs!=null){const n=g.neutral?0:1;G[g.h].push({o:g.a,m:g.hs-g.as,loc:n,wi});G[g.a].push({o:g.h,m:g.as-g.hs,loc:-n,wi})}});
  /* opponent-adjusted power rating (margin capped at 24, the preseason prior fades over ~3 games) */
  const prior=t=>(qOf(t)-3)*7+(isFCS(t)?-12:0)+(teamOvr(t)-3)*3;let r={};for(const t of L.teams)r[t.id]=prior(t);
  for(let it=0;it<12;it++){const n={};for(const t of L.teams){const gs=G[t.id];let s=0;for(const g of gs)s+=clamp(g.m,-24,24)+r[g.o];n[t.id]=(s+3*prior(t))/(gs.length+3)}r=n}
  return {G,r,P:p4Set(L)};
}
/* merit: record first (each loss costs a tier; a Group of 5 team starts nearly a tier back), then wins over
   teams ranked in the reference order (top 10 / top 25 / 26-50), road wins over ranked teams, bad losses, a close loss to a
   top-10 team, strength of schedule and a little "eye test" power */
const MERIT_AP={loss:3.2,sos:.08,pow:.06,g5:2.8},MERIT_CFP={loss:3.6,sos:.1,pow:.05,g5:3};
function meritScore(L,C,t,pos,w){const gs=C.G[t.id],fcs=isFCS(t),qw=[];let s=-w.loss*t.rec.l+.3*t.rec.w,so=0;
  for(const g of gs){const o=L.teams[g.o],ofcs=isFCS(o),rk=pos[g.o]||999;so+=C.r[g.o];
    if(g.m>0){if(ofcs===fcs)qw.push((rk<=10?1.6:rk<=25?1:rk<=50?.4:0)+(g.loc<0&&rk<=25?.25:0));else if(fcs)qw.push(1.5)}
    else if(ofcs&&!fcs)s-=3;else if(ofcs===fcs){if(rk>50)s-=1.5;else if(rk<=10&&g.m>-8)s+=.6}}
  qw.sort((a,b)=>b-a).forEach((v,i)=>s+=v*.8**i);   /* each extra quality win counts a little less */
  if(gs.length)s+=w.sos*so/gs.length;
  if(w.g5&&!fcs&&!C.P.has(t.conf)&&!isND(L,t))s-=w.g5;
  return s+w.pow*C.r[t.id]}
const h2hNet=(C,a,b)=>{let n=0;for(const g of C.G[a])if(g.o===b)n+=g.m>0?1:-1;return n};
const h2hOver=(L,C,a,b)=>L.teams[a].rec.l<=L.teams[b].rec.l&&h2hNet(C,a,b)>0;   /* a must rank ahead of b */
/* Final order from a value order (best first). Head-to-head is a hard rule: a team that beat a team with the same or a worse
   record (every meeting counts, a split counts as none) is placed ahead of it; claims inside a cycle (A beat B, B beat C,
   C beat A) can't all be honoured and are left out. hard[id]: a ranked team that won or was idle is placed by last week's
   spot + 2. soft[id]: a team that must wait for teams that beat it waits at most until then, and after that they are moved
   up next to it (so a loser and the team that beat it meet in the middle). fix: ids placed first, in order. */
function orderPoll(L,C,list,hard,soft,fix){
  fix=fix||[];const done=new Set(fix),all=list.filter(id=>!done.has(id)),inG=(id,i)=>i<60||hard[id]!=null;
  const rest=all.filter(inG),tail=all.filter((id,i)=>!inG(id,i)),n=rest.length,pre=rest.map(()=>[]);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j&&h2hOver(L,C,rest[j],rest[i]))pre[i].push(j);
  const D=rest.map(()=>new Uint8Array(n));pre.forEach((ps,i)=>ps.forEach(j=>D[j][i]=1));
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)if(D[i][k])for(let j=0;j<n;j++)if(D[k][j])D[i][j]=1;
  for(let i=0;i<n;i++)pre[i]=pre[i].filter(j=>!D[i][j]);   /* j beat i, but i also reaches j: a cycle */
  /* a capped team's spot also caps the teams that beat it (they must stay ahead of it) */
  const hd=rest.map(id=>hard[id]!=null?hard[id]:null),q=hd.map((h,i)=>i).filter(i=>hd[i]!=null);
  while(q.length){const i=q.shift();for(const j of pre[i])if(hd[j]==null||hd[j]>hd[i]-1){hd[j]=Math.max(0,hd[i]-1);q.push(j)}}
  const placed=new Uint8Array(n),out=fix.slice(),open=i=>pre[i].every(j=>placed[j]);
  const lead=i=>{for(let g=0;g<n;g++){const u=pre[i].filter(j=>!placed[j]);if(!u.length)return i;i=Math.min(...u)}return i};
  const find=f=>{for(let i=0;i<n;i++)if(!placed[i]&&f(rest[i],i))return i;return -1};
  for(let c=0;c<n;c++){const pos=out.length;
    let k=find((id,i)=>hd[i]!=null&&hd[i]<=pos);if(k<0)k=find(id=>soft[id]!=null&&soft[id]<=pos);
    k=k>=0?lead(k):find((id,i)=>open(i));if(k<0)k=lead(find(()=>true));
    placed[k]=1;out.push(rest[k])}
  /* repair cascades: a capped team placed too late moves back up, never past a team with a head-to-head claim over it */
  const ix={};rest.forEach((id,i)=>ix[id]=i);
  for(const id of rest.filter(id=>hard[id]!=null).sort((a,b)=>hard[a]-hard[b])){const ni=out.indexOf(id),cap=Math.max(fix.length,hard[id]);if(ni<=cap)continue;
    let to=cap;for(let k=ni-1;k>=cap;k--)if(pre[ix[id]].includes(ix[out[k]])){to=k+1;break}
    if(to<ni){out.splice(ni,1);out.splice(to,0,id)}}
  return out.concat(tail)}
/* how far one result moves a team on a voter's ballot, in poll spots (p = last week's spot, 0-based; rk = last week's rank) */
function apDelta(L,C,t,g,rk,p){
  const o=L.teams[g.o],m=g.m,cross=isFCS(o)!==isFCS(t),or=cross?null:rk(g.o);
  if(m>0){if(cross)return isFCS(t)?3+3*rkQ(C.r[g.o]):.15;
    let d;if(or&&or<=10)d=(4.5+(11-or)*.35)*(g.loc<0?1.2:1);else if(or)d=(2.5+(26-or)*.1)*(g.loc<0?1.2:1);else d=.45+Math.min(m,28)/60+(g.loc<0?.15:0)-(m<=3?.9:0);
    return d>0?d*clamp(((p+1)/14)**1.1,.15,1.3):d}   /* teams near the top have less room to climb */
  if(cross)return isFCS(t)?-.3-Math.min(-m,42)/120:-22;
  let d;if(or&&or<=10)d=.8+or*.1+Math.max(0,Math.min(-m,35)-7)*.12;else if(or)d=4+(or-10)*.15+Math.min(-m,28)*.08;else d=7.5+Math.min(-m,28)*.12;
  return -d*(g.loc>0?1.1:g.loc<0?.92:1)*(1+.2*Math.max(0,t.rec.l-1))}   /* a second or third loss costs more */
function apPoll(L,C,div,wk){
  const ids=L.teams.filter(t=>(t.div||'FBS')===div).map(t=>t.id);if(!ids.length)return [];
  const prev=((div==='FCS'?L.rankF:L.rank)||[]).filter(id=>L.teams[id]&&(L.teams[id].div||'FBS')===div);
  if(wk<0){const pp={};prev.slice(0,25).forEach((id,i)=>pp[id]=(25-i)/25);const sc={};
    for(const id of ids){const t=L.teams[id];sc[id]=t.prestige*.9+qOf(t)*.6+teamOvr(t)*2.2+(pp[id]||0)*2+Math.random()*.3}
    return ids.sort((a,b)=>sc[b]-sc[a])}
  const pos={};prev.forEach((id,i)=>pos[id]=i+1);const rk=id=>pos[id]<=25?pos[id]:null;
  const M={};for(const id of ids)M[id]=meritScore(L,C,L.teams[id],pos,MERIT_AP);
  const byM=ids.slice().sort((a,b)=>M[b]-M[a]),mp={};byM.forEach((id,i)=>mp[id]=i);
  const seen=new Set(prev.slice(0,35)),base=prev.slice(0,35).concat(byM.filter(id=>!seen.has(id)));
  /* each voter starts from last week's ballot, moves teams by result and re-reads résumés a little more as the season goes */
  const V=p=>25-p,alpha=clamp(.1+(wk+1)*.025,.1,.4),val={},lost={};
  base.forEach((id,p)=>{const g=C.G[id].find(x=>x.wi===wk);let d=0;if(g){d=apDelta(L,C,L.teams[id],g,rk,p);if(g.m<0)lost[id]=1}
    val[id]=V(p)+d+(p<35?clamp(alpha*(V(mp[id])-V(p)),-1.25,4):.55*(V(mp[id])-V(p)))});
  const list=base.slice().sort((a,b)=>val[b]-val[a]),soft={},hard={};list.forEach((id,i)=>soft[id]=i+6);
  for(let pi=0;pi<25&&pi<prev.length;pi++)if(!lost[prev[pi]])hard[prev[pi]]=pi+2;   /* a ranked team that won or was idle falls at most two spots */
  /* final poll: the national champion is No. 1 and the runner-up No. 2 */
  const fin=div==='FCS'?L.fcsp&&L.fcsp.final:L.cfp&&L.cfp.final;
  return orderPoll(L,C,list,hard,soft,wk===L.R+4&&fin&&fin.hs!=null?[winner(fin),loser(fin)]:[]);
}
function cfpPoll(L,C,wk){
  const ids=L.teams.filter(t=>!isFCS(t)).map(t=>t.id),fin=wk>=L.R,pp={};(L.cfpRank||[]).slice(0,25).forEach((id,i)=>pp[id]=i);
  const score=ref=>{const pos={};ref.forEach((id,i)=>pos[id]=i+1);const sc={};for(const id of ids){const t=L.teams[id];let s=meritScore(L,C,t,pos,MERIT_CFP);
      if(fin&&t.cc)s+=C.P.has(t.conf)?1:.5;              /* conference titles count in the final rankings */
      if(pp[id]!=null)s+=(25-pp[id])*.012;sc[id]=s}return sc};
  /* first read against this week's AP order, then again against the committee's own order (wins over CFP-ranked teams) */
  let sc=score(L.rank||[]),order=ids.slice().sort((a,b)=>sc[b]-sc[a]);sc=score(order);order=ids.slice().sort((a,b)=>sc[b]-sc[a]);
  /* common opponents: neighbours with the same record, close résumés and no head-to-head */
  for(let i=0;i<Math.min(40,order.length-1);i++){const a=order[i],b=order[i+1];if(L.teams[a].rec.l!==L.teams[b].rec.l||sc[a]-sc[b]>.6||h2hNet(C,a,b))continue;
    const ra={};for(const g of C.G[a])ra[g.o]=(ra[g.o]||0)+Math.sign(g.m)*10+clamp(g.m,-21,21)/3;let d=0,n=0;
    for(const g of C.G[b])if(ra[g.o]!=null){d+=Math.sign(g.m)*10+clamp(g.m,-21,21)/3-ra[g.o];n++}
    if(n&&d>4){order[i]=b;order[i+1]=a;i++}}
  const soft={};order.forEach((id,i)=>soft[id]=i+6);return orderPoll(L,C,order,{},soft);
}
/* résumé card for every team (vs the AP poll): strength-of-schedule rank, best win, worst loss, record vs ranked, power */
function resumeCard(L,C){
  const rk={};L.rank.forEach((id,i)=>rk[id]=i+1);(L.rankF||[]).forEach((id,i)=>rk[id]=i+1);
  const sos={};for(const t of L.teams){const gs=C.G[t.id];sos[t.id]=gs.length?gs.reduce((s,g)=>s+C.r[g.o],0)/gs.length:(qOf(t)-3)*7}
  const sosRank={};for(const div of ['FBS','FCS'])L.teams.filter(t=>(t.div||'FBS')===div).map(t=>t.id).sort((a,b)=>sos[b]-sos[a]).forEach((id,i)=>sosRank[id]=i+1);
  L.rinfo={};
  for(const t of L.teams){let best=null,worst=null;const vr=[0,0];for(const g of C.G[t.id]){const orank=rk[g.o];if(g.m>0){if(!best||C.r[g.o]>C.r[best.o])best=g}else if(!worst||C.r[g.o]<C.r[worst.o])worst=g;if(orank&&orank<=25&&L.teams[g.o].div===t.div)vr[g.m>0?0:1]++}
    L.rinfo[t.id]={sos:sosRank[t.id],best:best?best.o:null,bestM:best?best.m:0,worst:worst?worst.o:null,worstM:worst?worst.m:0,vr,pow:+C.r[t.id].toFixed(1)}}
}
function updateRankings(L){
  const C=rankCtx(L);L.power=C.r;const W=L.weeks[L.week],wk=W&&W.games.some(g=>g.hs!=null)?L.week:-1,pre=wk<0&&!L.weeks.some(w=>w.games.some(g=>g.hs!=null));
  if(wk>=0||pre){L.rank=apPoll(L,C,'FBS',wk);L.rankF=apPoll(L,C,'FCS',wk)}   /* a mid-week re-run (roster import) keeps the polls */
  if(pre){L.cfpRank=[];L.cfpPrev=[]}
  else if(wk+1>=cfpFrom(L)&&wk<=L.R){L.cfpPrev=(L.cfpRank||[]).slice(0,25);L.cfpRank=cfpPoll(L,C,wk)}
  resumeCard(L,C);
}
/* CFP rankings for an old save that reached November before they existed */
function ensureCFP(L){if(!L.cfpRank)L.cfpRank=[];if(!L.cfpRank.length&&L.phase==='regular'&&L.week>=cfpFrom(L)){L.cfpRank=cfpPoll(L,rankCtx(L),Math.min(L.week-1,L.R));L.cfpPrev=[]}return L.cfpRank}
const rankList=(L,t)=>isFCS(t)?(L.rankF||[]):L.rank;
const rankOf=id=>{const t=LG.teams[id];const i=rankList(LG,t).indexOf(id);return i>=0&&i<25?i+1:null};
const rankTag=id=>{const r=rankOf(id);return r?`#${r} `:''};
const pollName=(L,div)=>{const n=div==='FCS'?'FCS Top 25':'AP Top 25';return L.phase==='offseason'||L.week>L.R+4?'Final '+n:L.week===0?'Preseason '+n:n};
/* ranking used by tiebreakers: CFP rankings (FBS, once out), else the AP poll, else the power rating */
const crk=(L,id)=>{const t=L.teams[id];let i=!isFCS(t)&&L.cfpRank&&L.cfpRank.length?L.cfpRank.indexOf(id):-1;if(i<0)i=rankList(L,t).indexOf(id);return i<0?999-((L.power&&L.power[id])||0):i};
/* conference standings: league winning % (so the ACC's 8- and 9-game teams compare fairly), ties broken the usual way:
   head-to-head among the tied teams (combined record when they all played each other, otherwise a team that beat, or lost
   to, every other tied team), then record vs common league opponents, then the ranking above; once a team is separated the
   rest start over. Non-league games between league members (Army–Navy, the Pac-12 flex week) don't count. `sub`: a division. */
function confStandings(L,c,sub){
  const all=L.teams.filter(t=>t.conf===c),ts=sub||all;
  if(L.confs[c]&&L.confs[c].ind)return ts.slice().sort((a,b)=>(b.rec.w-b.rec.l)-(a.rec.w-a.rec.l)||crk(L,a.id)-crk(L,b.id));
  const res={};for(const t of all)res[t.id]={};
  for(const w of L.weeks)for(const g of w.games)if(g.hs!=null&&!g.post&&!g.nc&&res[g.h]&&res[g.a])for(const [p,o,won] of [[g.h,g.a,g.hs>g.as],[g.a,g.h,g.as>g.hs]]){const r=res[p][o]||(res[p][o]=[0,0]);r[won?0:1]++}
  const met=(a,b)=>!!res[a][b],beat=(a,b)=>met(a,b)&&res[a][b][0]>res[a][b][1];
  const pc=(id,os,d)=>{let w=0,l=0;for(const o of os){const r=res[id][o];if(r){w+=r[0];l+=r[1]}}return w+l?w/(w+l):d};
  const brk=g=>{if(g.length<2)return g;let r;
    const split=f=>{const s={};for(const id of g)s[id]=f(id);const v=[...new Set(g.map(id=>s[id]))].sort((a,b)=>b-a);return v.length<2?null:v.flatMap(x=>brk(g.filter(id=>s[id]===x)))};
    if(g.every(a=>g.every(b=>a===b||met(a,b)))){if((r=split(id=>pc(id,g,.5))))return r}
    else{const top=g.find(a=>g.every(b=>a===b||beat(a,b)));if(top!=null)return [top,...brk(g.filter(x=>x!==top))];
      const bot=g.find(a=>g.every(b=>a===b||beat(b,a)));if(bot!=null)return [...brk(g.filter(x=>x!==bot)),bot]}
    const com=all.map(t=>t.id).filter(o=>!g.includes(o)&&g.every(id=>met(id,o)));
    if(com.length&&(r=split(id=>pc(id,com,0))))return r;
    return g.slice().sort((a,b)=>crk(L,a)-crk(L,b))};
  const by=new Map();for(const t of ts){const k=t.rec.cw+t.rec.cl?t.rec.cw/(t.rec.cw+t.rec.cl):0;if(!by.has(k))by.set(k,[]);by.get(k).push(t.id)}
  return [...by.keys()].sort((a,b)=>b-a).flatMap(k=>brk(by.get(k))).map(id=>L.teams[id]);
}
/* title game: the top two (division winners for the Sun Belt and SWAC, the better league record hosting) at the conference's
   neutral site, or at the top seed's stadium (American, Pac-12, Mountain West, C-USA, Sun Belt, SWAC) */
function ccgGame(L,i){const c=L.confs[i],s=confStandings(L,i);if(s.length<2)return null;let [a,b]=s;
  if(c.dv&&c.dv.length===2){const w=c.dv.map(d=>confStandings(L,i,s.filter(t=>d.ids.includes(t.id)))[0]);if(w[0]&&w[1])[a,b]=s.indexOf(w[0])<s.indexOf(w[1])?w:[w[1],w[0]]}
  const site=c.site!=null?c.site:L.kind==='ncaa'&&typeof NCAA!=='undefined'?(NCAA.find(x=>x.name===c.name)||{}).site||'':'';   /* a save from before 2026 formats */
  return postGame(a.id,b.id,{tag:c.name+' Championship',ccg:true,conf:i,neutral:!!site,site,date:L.kind==='ncaa'?'Dec 4–5':'',wx:site?'Clear':weatherFor(12)})}

/* ---------- postseason: title games, 12-team CFP, bowls, 24-team FCS playoff, Celebration Bowl ---------- */
/* 12-team CFP field (2026 format) from the final CFP rankings (the AP poll if they don't exist): each Power 4 champion and the
   highest-ranked Group of 5 champion get automatic bids, Notre Dame is in if it's ranked in the top 12, and the highest-ranked
   teams left fill the field. Straight seeding by ranking: seeds 1-4 get byes, seeds 5-8 host first-round games. */
const selOrder=L=>((L.cfpRank&&L.cfpRank.length?L.cfpRank:L.rank)||[]).filter(id=>!isFCS(L.teams[id]));
function cfpSelect(L,order,champs){
  const P=p4Set(L),pos={};order.forEach((id,i)=>pos[id]=i);const at=id=>pos[id]!=null?pos[id]:999;
  champs=champs.filter(id=>!isFCS(L.teams[id])).sort((a,b)=>at(a)-at(b));
  const p4=champs.filter(id=>P.has(L.teams[id].conf)),auto=p4.concat(champs.filter(id=>!P.has(L.teams[id].conf)).slice(0,Math.max(0,5-p4.length)));
  const field=auto.slice(),nd=order.find(id=>isND(L,L.teams[id]));if(nd!=null&&at(nd)<12&&!field.includes(nd))field.push(nd);
  for(const id of order){if(field.length>=12)break;if(!field.includes(id))field.push(id)}
  return {seeds:field.sort((a,b)=>at(a)-at(b)),auto};
}
function postGame(h,a,extra){return Object.assign({h,a,hs:null,as:null,post:true,neutral:true,wx:'Clear',slot:'Primetime'},extra)}
const WIN=g=>g&&g.hs!=null?winner(g):null;
const dayKey=s=>{const m=/^(\w+) (\d+)/.exec(s||'');return m?({Nov:-30,Dec:0,Jan:31}[m[1]]||0)+ +m[2]:0};
/* CFP sites: seeds 1–4 are placed in the quarterfinal bowls by preference (Big Ten → Rose, SEC/ACC → Peach, Big 12 → Cotton,
   others → Fiesta first), the 1/4 half of the bracket plays its semifinal in the Orange Bowl, the 2/3 half in the Sugar Bowl */
function cfpBowls(L,seeds){
  if(L.kind!=='ncaa')return {qf:CFP_QF.map(n=>({n})),sf:CFP_SF.map(n=>({n})),fin:{n:'National Championship'}};
  const mk=([n,d,s])=>({n,d,s}),left=CFP26.qf.slice(),qf=[];
  for(let k=0;k<4;k++){const t=L.teams[seeds[k]],pr=((t&&CFP26.pref[confName(t.conf,L)])||'Fiesta Cotton Peach Rose').split(' ');
    const b=pr.map(p=>left.find(x=>x[0].startsWith(p))).find(Boolean)||left[0];left.splice(left.indexOf(b),1);qf.push(mk(b))}
  return {qf,sf:CFP26.sf.map(mk),fin:mk(CFP26.fin)};
}
/* bowls: 6+ wins (a team moving up from FCS also needs five wins over FBS teams), topped up with 5–7 teams by ranking when
   there are too few; bowls choose in tier order (Citrus, ReliaQuest, Alamo and Pop-Tarts first), each side taking the
   best-ranked team left from its tie-in conferences (Notre Dame counts for ACC slots), else an at-large team, preferring
   conferences with teams to spare; no same-conference matchups or regular-season rematches when it can be helped */
const MOVING_UP=['NDSU','SAC'];
function pickBowls(L,taken){
  const TS=L.teams,ord=L.rank.filter(id=>!isFCS(TS[id])&&!taken.has(id)),pos={};ord.forEach((id,i)=>pos[id]=i);
  const reg=[];for(const w of L.weeks)if(w.kind==='reg')reg.push(...w.games);
  const fbsW=id=>reg.filter(g=>g.hs!=null&&winner(g)===id&&!isFCS(TS[loser(g)])).length,ew=id=>Math.min(reg.filter(g=>g.hs!=null&&winner(g)===id).length,fbsW(id)+1);   /* regular-season wins, one FCS win counts */
  const lineup=L.kind==='ncaa'?BOWLS26:BOWLS.map(n=>[n,'','','*','*',3]);
  let el=ord.filter(id=>ew(id)>=6&&(!MOVING_UP.includes(TS[id].abbr)||fbsW(id)>=5));
  if(el.length<lineup.length*2)el=el.concat(ord.filter(id=>ew(id)===5&&!el.includes(id)&&!MOVING_UP.includes(TS[id].abbr)));
  el=el.slice(0,lineup.length*2);if(el.length%2)el.pop();
  const cn=id=>isND(L,TS[id])?'ACC':confName(TS[id].conf,L),fits=(id,tie)=>tie==='*'||tie.split('/').includes(cn(id));
  const bowls=lineup.map((b,i)=>({b,i})).sort((x,y)=>x.b[5]-y.b[5]||x.i-y.i).slice(0,el.length/2),left=new Set(el),out=[];
  const side=(tie,bi,vs)=>{const pool=[...left].sort((a,b)=>pos[a]-pos[b]),seen=new Set();
    if(vs!=null)for(const g of reg)if(g.h===vs||g.a===vs)seen.add(g.h===vs?g.a:g.h);
    const good=pool.filter(id=>vs==null||(cn(id)!==cn(vs)&&!seen.has(id)));let c=good.filter(id=>fits(id,tie));if(c.length)return c[0];
    const dem={},av={};for(let k=bi+1;k<bowls.length;k++)for(const t of [bowls[k].b[3],bowls[k].b[4]])if(t!=='*')for(const x of t.split('/'))dem[x]=(dem[x]||0)+1;
    for(const id of left)av[cn(id)]=(av[cn(id)]||0)+1;c=good.length?good:pool;const sp=c.filter(id=>av[cn(id)]>(dem[cn(id)]||0));return (sp.length?sp:c)[0]};
  bowls.forEach(({b,i},bi)=>{if(left.size<2)return;const a=side(b[3],bi,null);left.delete(a);const h=side(b[4],bi,a);left.delete(h);out.push({b,i,t:[a,h]})});
  /* the last picks can be left with a same-conference pair or a rematch: swap a team with another bowl to fix it */
  const pk=new Set(reg.map(g=>Math.min(g.h,g.a)*8192+Math.max(g.h,g.a))),bad=(x,y)=>cn(x)===cn(y)||pk.has(Math.min(x,y)*8192+Math.max(x,y));
  for(const P of out)if(bad(...P.t))for(const Q of out){if(Q===P)continue;const k=[0,1].find(k=>!bad(P.t[0],Q.t[k])&&!bad(Q.t[1-k],P.t[1]));if(k!=null){[P.t[1],Q.t[k]]=[Q.t[k],P.t[1]];break}}
  return out.map(({b,i,t:[a,h]})=>{const [x,y]=pos[a]<pos[h]?[a,h]:[h,a];return postGame(x,y,{bowl:true,tag:b[0],date:b[1],site:b[2],bi:i})}).sort((x,y)=>x.bi-y.bi);
}
function buildPost(L){
  const k=L.week-L.R,cs=L.confs.map((c,i)=>[c,i]),games=[],nc=L.kind==='ncaa',F=nc?FCS26:{};
  if(k===0){
    for(const [c,i] of cs)if(c.ccg&&!c.ind){const g=ccgGame(L,i);if(g)games.push(g)}
    for(const [c,i] of cs)if(c.div==='FCS'&&!c.ccg&&!c.ind){const s=confStandings(L,i);if(s[0]){s[0].cc=true;s[0].ccTitles++}}
    const fcs=L.teams.filter(isFCS);
    if(fcs.length>=16){
      /* 24 teams: the 11 automatic qualifiers plus 13 at-large; 16 seeds, 1–8 get byes, 9–16 host first-round games */
      const field=fcs.filter(t=>t.cc&&L.confs[t.conf].auto).map(t=>t.id);
      for(const id of L.rankF){if(field.length>=24)break;const t=L.teams[id];if(!field.includes(id)&&!L.confs[t.conf].celebration)field.push(id)}
      const seeds=field.sort((a,b)=>L.rankF.indexOf(a)-L.rankF.indexOf(b));
      L.fcsp={seeds,r1:[],r2:[],qf:[],sf:[],final:null};for(const id of seeds)L.teams[id].playoffApps++;
      for(let j=0;j<8;j++){const hi=seeds[8+j],lo=seeds[23-j];if(hi==null||lo==null){L.fcsp.r1.push(null);continue}const g=postGame(hi,lo,{fcsp:true,neutral:false,tag:`FCS Playoffs · First Round · #${9+j} vs #${24-j}`,date:F.r1,wx:weatherFor(12),slot:'Afternoon'});L.fcsp.r1.push(g);games.push(g)}
    }
    L.weeks[L.week]={label:WEEK_NAMES[0],kind:'post0',games};
  }
  if(k===1){
    const sel=cfpSelect(L,selOrder(L),L.teams.filter(t=>!isFCS(t)&&t.cc).map(t=>t.id)),seeds=sel.seeds;
    L.cfp={seeds,auto:sel.auto,bw:cfpBowls(L,seeds),r1:[],qf:[],sf:[],final:null};for(const id of seeds)L.teams[id].playoffApps++;
    for(let j=0;j<4;j++){const g=postGame(seeds[4+j],seeds[11-j],{cfp:true,neutral:false,tag:`CFP First Round · #${5+j} vs #${12-j}`,date:nc?(j?'Dec 19':'Dec 18'):'',wx:weatherFor(13)});L.cfp.r1.push(g);games.push(g)}
    games.push(...pickBowls(L,new Set(seeds)));
    const cel=cs.filter(([c])=>c.celebration).map(([c,i])=>L.teams.find(t=>t.conf===i&&t.cc)||confStandings(L,i)[0]).filter(Boolean);
    if(cel.length===2)games.push(postGame(cel[0].id,cel[1].id,{bowl:true,tag:'Celebration Bowl',date:nc?FCS26.cel[0]:'',site:nc?FCS26.cel[1]:''}));
    if(L.fcsp){const s=L.fcsp.seeds;for(let sd=1;sd<=8;sd++){const opp=WIN(L.fcsp.r1[8-sd]);if(s[sd-1]==null||opp==null){L.fcsp.r2.push(null);continue}const g=postGame(s[sd-1],opp,{fcsp:true,neutral:false,tag:`FCS Playoffs · Second Round · #${sd} seed`,date:F.r2,slot:'Afternoon'});L.fcsp.r2.push(g);games.push(g)}}
    games.sort((x,y)=>dayKey(x.date)-dayKey(y.date));
    L.weeks[L.week]={label:WEEK_NAMES[1],kind:'post1',games};
  }
  const B=L.cfp&&(L.cfp.bw||cfpBowls(L,L.cfp.seeds)),at=b=>b?{date:b.d,site:b.s}:{};
  if(k===2){
    const s=L.cfp.seeds,r=L.cfp.r1.map(WIN);L.cfp.qf=[[s[0],r[3]],[s[1],r[2]],[s[2],r[1]],[s[3],r[0]]].map(([a,b],j)=>postGame(a,b,{cfp:true,tag:`CFP Quarterfinal · ${B.qf[j].n}`,...at(B.qf[j])}));games.push(...L.cfp.qf);
    if(L.fcsp){const r2=L.fcsp.r2.map(WIN);L.fcsp.qf=[[0,7],[1,6],[2,5],[3,4]].map(([a,b])=>r2[a]!=null&&r2[b]!=null?postGame(r2[a],r2[b],{fcsp:true,neutral:false,tag:'FCS Playoffs · Quarterfinal',date:F.qf,slot:'Afternoon'}):null);games.push(...L.fcsp.qf.filter(Boolean))}
    games.sort((x,y)=>dayKey(x.date)-dayKey(y.date));
    L.weeks[L.week]={label:WEEK_NAMES[2],kind:'post2',games};
  }
  if(k===3){
    const q=L.cfp.qf.map(WIN);L.cfp.sf=[postGame(q[0],q[3],{cfp:true,tag:'CFP Semifinal · '+B.sf[0].n,...at(B.sf[0])}),postGame(q[1],q[2],{cfp:true,tag:'CFP Semifinal · '+B.sf[1].n,...at(B.sf[1])})];games.push(...L.cfp.sf);
    if(L.fcsp){const f=L.fcsp.qf.map(WIN);L.fcsp.sf=[[0,3],[1,2]].map(([a,b])=>f[a]!=null&&f[b]!=null?postGame(f[a],f[b],{fcsp:true,neutral:false,tag:'FCS Playoffs · Semifinal',date:F.sf,slot:'Afternoon'}):null);games.push(...L.fcsp.sf.filter(Boolean))}
    games.sort((x,y)=>dayKey(x.date)-dayKey(y.date));
    L.weeks[L.week]={label:WEEK_NAMES[3],kind:'post3',games};
  }
  if(k===4){
    const f=L.cfp.sf.map(WIN);L.cfp.final=postGame(f[0],f[1],{cfp:true,tag:'CFP National Championship',...at(B.fin)});games.push(L.cfp.final);
    if(L.fcsp){const g=L.fcsp.sf.map(WIN);if(g[0]!=null&&g[1]!=null){L.fcsp.final=postGame(g[0],g[1],{fcsp:true,tag:'FCS National Championship',date:nc?F.fin[0]:'',site:nc?F.fin[1]:''});games.unshift(L.fcsp.final)}}
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
  if(typeof rcOnWeek==='function')try{rcOnWeek(L,w)}catch(e){console.error(e)}   /* season-long recruiting (04b) */
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
function addXP(p,x,list){p.xp+=x;let n=0;while(p.xp>=100&&n<4){n++;p.xp-=100;const ks=PATTR[p.pos].filter(k=>p[k]<5);if(!ks.length){p.xp=0;break}ks.sort((a,b)=>p[a]-p[b]);const k=Math.random()<.6?ks[0]:pick(ks);p[k]=r1(p[k]+R(.25,.45));list&&list.push({id:p.id,name:fullName(p),pos:p.pos,attr:attrName(p.pos,k),to:a99(p[k])})}}
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
  L.off.recruits=Array.from({length:22},()=>{const pos=pick(need);const st=clamp(Math.round(R(1,3.4)+u.prestige*.35),1,5);const p=genPlayer(pos,st+.3,1);if(spot){const k=PATTR[pos][0];p[k]=r1(p[k]+.6)}return {...p,stars:st,interest:recruitInterest(L,st),offered:false,visit:false}}).sort((a,b)=>b.stars-a.stars);
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
  if(typeof rcArrive==='function')try{rcArrive(L)}catch(e){console.error(e);L.recruit=null}   /* signees join as freshmen (60-man limit, by need) */
  for(const t of L.teams){
    const g=t.rec.w;
    if(t.id===L.user){const h=L.history[L.history.length-1];if(h.champ||g>=10||h.madePO)t.prestige=Math.min(5,t.prestige+1);else if(g<=4)t.prestige=Math.max(1,t.prestige-1)}
    else if(Math.random()<.35)t.prestige=clamp(t.prestige+(g>=9?1:g<=3?-1:0),1,5);
    t.q=lerp(qOf(t),(t.div==='FCS'?.3:1.1)+t.prestige*.62,.2);
    for(const p of t.roster){
      if(p.isNew){delete p.isNew;continue}
      if(p.redshirt&&p.ss.gp<=4&&!p.rs){p.rs=true}else p.yr=Math.min(4,p.yr+1);
      p.redshirt=false;
      const ch=[0,.35,.25,.15,.08][p.yr-1]||.08,dv=[1,1.3,1.65,2.1][p.dev|0];for(const k of PATTR[p.pos])if(Math.random()<ch*1.6*dv)p[k]=r1(p[k]+R(.15,.5)*(dv>1.5?1.15:1));   /* development trait */
      p.cond=100;p.inj=0;p.injWhy='';
    }
    /* walk-ons fill what recruiting didn't (classes now come from the prospect pool, by prestige, need and success) */
    const wl=t.id===L.user?Math.min(qOf(t)-.9,3.3):Math.min(qOf(t)-.55,3.6);
    for(const pos of POS_ORDER){let have=t.roster.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){t.roster.push(genPlayer(pos,wl,1));have++}}
    assignNumbers(t);
  }
  for(const p of u.roster)addXP(p,20*trainM,camp);
  const h=L.history[L.history.length-1];
  L.nil+=300+u.prestige*150+L.fan*4+(h.champ?400:0)+(h.madePO?200:0);
  if(!L.captains.length)L.captains=u.roster.filter(p=>p.yr>=3).sort((a,b)=>ovr(b)-ovr(a)).slice(0,2).map(p=>p.id);
  L.season++;L.week=0;L.phase='regular';L.off=null;L.lastWeek=null;L.heisman=null;L.fcsPoy=null;L.heismanWatch=null;L.potw=null;L.event=null;invalidate();
  if(L.kind==='ncaa'&&typeof syncNCAAConfs==='function')syncNCAAConfs(L);   /* current conference alignment and formats */
  refreshStaffPool(L);resetRecords(L);buildSchedule(L);updateRankings(L);
  if(typeof rcEnsure==='function')try{rcEnsure(L)}catch(e){console.error(e)}   /* next year's prospect pool */
  L.news.unshift({t:`Fall camp is done. ${camp.length} rating upgrades from spring practice and camp.`,good:true});
  return camp;
}
