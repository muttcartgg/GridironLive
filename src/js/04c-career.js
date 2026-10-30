/* =========================================================
   04c · Coaching staffs and careers, signature traits, NIL / revenue-sharing budget, transfer portal
   Every team has a head coach, OC and DC: {name, age, r (rating 1–5), traits[1–2], yrs (contract years left), sal ($K a year)}.
   Your team: LG.coach is you (skill-tree perks), LG.staff.oc/dc are your coordinators. The game only makes up names;
   real coaches come from an imported pack (teams[].coaches, docs/PACKS.md).
   coachMod(team,key) = 1 + the team staff's summed trait effects for key (head coach traits count 70%, scaled by rating).
   Portal (NCAA rules from 2026): one window, Jan 2–16; after a head-coaching change players get their own 15-day
   window five days after the hire; the two title-game teams get Jan 20–24.
   ========================================================= */
const TRAITS={
  TO:{n:'Turnover Specialist',d:'His defense picks off more passes and forces more fumbles',s:'d',fx:{int:.3,fum:.4,to:.3}},
  DM:{n:'Defensive Mastermind',d:'Opponents score less often',s:'d',fx:{def:1.8,stop:.035}},
  PR:{n:'Pass Rush Guru',d:'More sacks and more pressure',s:'d',fx:{sack:.4,rush:.05,def:.5}},
  QBW:{n:'QB Whisperer',d:'Quarterbacks develop faster and throw more accurately',s:'o',fx:{qbxp:.3,acc:.07,cmp:.04}},
  GURU:{n:'Offensive Guru',d:'Receivers get open sooner; the offense scores more',s:'o',fx:{sep:.03,off:1.6}},
  AIR:{n:'Air Raid',d:'Pass-first: more passing yards, quicker receivers',s:'o',fx:{pass:.18,sep:.02,off:.6,run:-.08}},
  RUN:{n:'Run Game Architect',d:'Backs run harder; more rushing yards',s:'o',fx:{run:.2,brk:.04,off:.6}},
  ST:{n:'Special Teams Ace',d:'Surer kickers and sharper coverage units',s:'a',fx:{fg:.5,off:.3}},
  REC:{n:'Recruiter',d:'More recruiting hours and more pull with prospects',s:'a',fx:{rec:.08,hrs:6}},
  PK:{n:'Portal King',d:'Transfers are more interested in his program',s:'a',fx:{portal:10}},
  DEV:{n:'Developer',d:'Players earn more XP and grow more in the offseason',s:'a',fx:{xp:.12,grow:.2}},
  MOT:{n:'Motivator',d:'Morale drops half as much after losses',s:'a',fx:{mor:.5}},
  CLK:{n:'Clock Manager',d:'Wins more of the close games',s:'a',fx:{close:.06}},
  DIS:{n:'Disciplinarian',d:'Fewer penalties and calmer dilemmas',s:'a',fx:{pen:-.3}},
  HLT:{n:'Health First',d:'Half as many injuries',s:'a',fx:{inj:-.45}}};
const OLD_TRAIT={'Play Caller':'GURU','QB Guru':'QBW','Talent Spotter':'REC','Motivator':'MOT','Physio':'HLT','Ball Hawk':'TO','Run Stopper':'DM','Disciplinarian':'DIS'};
const COACH_POOL={hc:['CLK','MOT','REC','PK','DEV','DIS','GURU','DM','QBW','TO','AIR','RUN','PR'],oc:['QBW','GURU','AIR','RUN','REC','DEV','MOT','PK','ST'],dc:['TO','DM','PR','DIS','REC','DEV','HLT','ST','MOT']};
const PERKS=[
  {id:'r1',b:'Recruiting',t:1,n:'Silver Tongue',d:'+4 recruiting hours a week',fx:{hrs:4}},
  {id:'r2',b:'Recruiting',t:2,n:'Portal Closer',d:'+10 interest from transfers',fx:{portal:10},req:'r1'},
  {id:'r3',b:'Recruiting',t:3,n:'Booster Whisperer',d:'+10% collective money every year',fx:{nil:.1},req:'r2'},
  {id:'d1',b:'Development',t:1,n:'Film Junkie',d:'+10% XP for every player',fx:{xp:.1}},
  {id:'d2',b:'Development',t:2,n:'Strength Program',d:'25% fewer injuries',fx:{inj:-.25},req:'d1'},
  {id:'d3',b:'Development',t:3,n:'Player Developer',d:'More rating growth every offseason',fx:{grow:.25},req:'d2'},
  {id:'g1',b:'Game day',t:1,n:'Fiery Speeches',d:'Losses cost less morale',fx:{mor:.3}},
  {id:'g2',b:'Game day',t:2,n:'Situational Master',d:'Wins more close sims; fewer penalties',fx:{close:.05,pen:-.15},req:'g1'},
  {id:'g3',b:'Game day',t:3,n:'Takeaway Culture',d:'Your defense forces more turnovers',fx:{int:.15,fum:.15,to:.15},req:'g2'}];
const PERK_BY=Object.fromEntries(PERKS.map(p=>[p.id,p]));
const coachSalary=(role,r,t)=>{const f=t&&isFCS(t),p=t?t.prestige:3;return Math.round((role==='hc'?(f?120+r*60:p>=3?900+p*r*400:400+p*r*160):(f?50+r*25:150+r*r*(p>=3?85:40)))/10)*10};
function genCoach(role,q,o){o=o||{};const r=o.r||clamp(Math.round((q||3)+R(-.9,.9)),1,5),pool=COACH_POOL[role]||COACH_POOL.hc,tr=[pick(pool)];
  if(Math.random()<.2+.1*r){const x=pick(pool);if(x!==tr[0])tr.push(x)}
  return Object.assign({name:pick(FIRST)+' '+pick(LAST),age:rint(role==='hc'?36:30,role==='hc'?66:60),r,traits:tr,yrs:rint(2,5),sal:coachSalary(role,r,o.t)},role==='hc'?{ten:o.ten||0,sec:rint(45,80)}:{})}
const staffQ=t=>.9+t.prestige*.72-(isFCS(t)?.7:0);
const genTeamStaff=t=>({hc:genCoach('hc',staffQ(t),{t,ten:rint(0,9)}),oc:genCoach('oc',staffQ(t)-.3,{t}),dc:genCoach('dc',staffQ(t)-.3,{t})});
const staffOf=(t,L)=>{L=L||LG;if(!t)return null;return L&&t.id===L.user&&L.staff?{hc:L.coach,oc:L.staff.oc,dc:L.staff.dc}:t.staff||null};
function perkFx(key,L){L=L||LG;let v=0;const c=L&&L.coach;if(c&&c.perks)for(const id of c.perks){const p=PERK_BY[id];if(p&&p.fx[key]!=null)v+=p.fx[key]}return v}
function coachMod(t,key){
  if(!t||!LG)return 1;const s=staffOf(t);let v=0;
  if(s)for(const role of ['hc','oc','dc']){const c=s[role];if(!c||!c.traits)continue;const w=(role==='hc'?.7:1)*(.8+.1*(c.r||3));
    for(const k of c.traits){const X=TRAITS[k];if(X&&X.fx[key]!=null&&(X.s==='a'||role==='hc'||(X.s==='o')===(role==='oc')))v+=X.fx[key]*w}}
  if(t.id===LG.user)v+=perkFx(key);
  return 1+v;
}
/* old saves and new leagues: staffs for every team, old {name,r,trait} coordinators → traits, career fields, budget */
function ensureCareer(L){
  if(!L||!L.teams)return L;
  if(L.car!==1){
    for(const t of L.teams)if(!t.staff||!t.staff.hc)t.staff=genTeamStaff(t);
    const fix=(s,k)=>{if(s&&!s.traits){s.traits=[OLD_TRAIT[s.trait]||pick(COACH_POOL[k])];delete s.trait;s.age=s.age||rint(33,58);s.yrs=s.yrs||rint(2,4);s.sal=s.sal||coachSalary(k,s.r||2)}};
    if(L.staff){fix(L.staff.oc,'oc');fix(L.staff.dc,'dc')}
    if(L.pool)for(const k of ['oc','dc'])(L.pool[k]||[]).forEach(s=>fix(s,k));
    L.car=1;
  }
  const c=L.coach;if(c&&c.perks==null)Object.assign(c,{xp:0,lvl:1,sp:1,perks:[],traits:[],age:rint(38,47),yrs:5,sal:0});
  if(L.user!=null&&L.teams[L.user]){if(c&&!c.sal)c.sal=coachSalary('hc',3,L.teams[L.user]);if(!L.budget)setBudget(L,true)}
  return L;
}
const traitTags=c=>(c.traits||[]).map(k=>TRAITS[k]?`<span class="tag ${k==='TO'?'gold':''}" title="${esc(TRAITS[k].d)}">${esc(TRAITS[k].n)}</span>`:'').join('');
const coachRow=(role,c,extra)=>`<div class="lrow"><span class="l"><span class="tag">${role.toUpperCase()}</span><span><b>${esc(c.name)}</b> <span class="ovr">${tOvr99(c.r)}</span> <small class="note">age ${c.age} · ${c.yrs} yr${c.yrs===1?'':'s'} · ${money(c.sal)}/yr</small><br>${traitTags(c)}<br><small class="note">${(c.traits||[]).map(k=>TRAITS[k]?TRAITS[k].d:'').join('. ')}</small></span></span>${extra||''}</div>`;

/* ---------- NIL & revenue sharing: one yearly player-payment budget ($K) ----------
   revenue sharing (House settlement cap: $20.5M in 2025-26, +4% a year; ~75% goes to football) scaled by prestige and fan
   base, plus the booster collective (prestige, fans, success, facilities). Pays retention deals, transfers and NIL pitches. */
const revCap=L=>Math.round(20500*Math.pow(1.04,Math.max(0,(L.season||2026)-2025))*.75);
function teamBudget(L,t){const f=isFCS(t),pr=(t.prestige-1)/4,fans=clamp((t.cap||40000)/100000,0,1.1),g=t.rec?t.rec.w+t.rec.l:0,wp=g?t.rec.w/g:.5;
  return {rev:Math.round(revCap(L)*(f?.012+.02*pr:clamp(.05+.75*pr*pr+.2*fans,.05,1))),col:Math.round((f?120+300*pr:700+6500*pr*pr)*(.7+.3*fans)*(.8+.4*wp))}}
const teamPow=(L,t)=>{const b=teamBudget(L,t);return clamp((b.rev+b.col)/27000,0,1)*.45+(t.prestige-1)/4*.4+clamp((qOf(t)-1.5)/3.2,0,1)*.15};
function setBudget(L,mode){
  const u=L.teams[L.user];if(!u)return;const b=teamBudget(L,u),h=(L.history||[])[(L.history||[]).length-1]||{},fresh=mode===true,f=L.fac||{};
  const succ=fresh||mode==='move'?0:(h.champ?2000:0)+(h.madePO?1000:0)+(h.cc?500:0)+Math.max(0,(h.w||0)-7)*120;
  const col=Math.max(0,Math.round((b.col+succ+((L.fan||60)-60)*30+((f.stadium||1)+(f.training||1)+(f.rehab||1)-3)*200)*(1+perkFx('nil',L))));
  const carry=fresh||mode==='move'?0:Math.round(Math.max(0,L.nil||0)*.1);
  L.budget={yr:L.season+(L.phase==='offseason'?1:0),rev:b.rev,col,carry,total:b.rev+col+carry,ret:0,portal:0,rec:0};L.nil=L.budget.total;
}
const nilPower=L=>clamp((L.nil||0)/20000,0,1);
const spendNIL=(L,k,v)=>{L.nil-=v;if(L.budget)L.budget[k]=(L.budget[k]||0)+v};
/* an NIL pitch to a prospect (04b): paid from the budget, half again as strong */
function nilPitch(L,P){const st=typeof rcStars==='function'?rcStars(P.c):3,c=[0,10,25,60,180,450][st]||60;if((L.nil||0)<c)return 1;spendNIL(L,'rec',c);return 1.5}

/* ---------- coach XP, levels and the skill tree ---------- */
const lvlNeed=l=>100+50*l;
function coachXP(L,x){const c=L.coach;if(!c||c.perks==null)return;c.xp+=Math.round(x);while(c.xp>=lvlNeed(c.lvl)){c.xp-=lvlNeed(c.lvl);c.lvl++;c.sp++;L.news.unshift({t:`${c.name} reaches coach level ${c.lvl}: a skill point to spend on the Program tab.`,good:true})}}
function buyPerk(L,id,cc){const c=L.coach,p=PERK_BY[id];if(!p||c.perks.includes(id))return 'Already learned';if(p.req&&!c.perks.includes(p.req))return 'Learn the one before it first';
  if(cc){if(L.credits<p.t*12)return 'Not enough coaching credits';L.credits-=p.t*12}else{if(c.sp<p.t)return 'Not enough skill points';c.sp-=p.t}c.perks.push(id);return null}
const hotSeat=s=>s<15?['Scorching','hot']:s<30?['Hot','hot']:s<50?['Warm','warn']:s<80?['Cool','ok']:['Untouchable','gold'];
const tenureAt=L=>{let n=0;const h=L.history||[];for(let i=h.length-1;i>=0&&h[i].team===L.user;i--)n++;return n};

/* ---------- coaching carousel: reviews, firings, retirements, the coaching ladder, poached coordinators ---------- */
const jobLvl=t=>(isFCS(t)?0:.3)+.14*t.prestige+.1*clamp((t.cap||40000)/100000,0,1);
function runCarousel(L){
  const o=L.off;if(o.car)return o.car;ensureCareer(L);
  const u=L.teams[L.user],car={fired:[],retired:[],hired:[],poached:[],free:[],you:{}},open=[];
  for(const t of L.teams){if(t.id===L.user)continue;const s=t.staff,c=s.hc;
    for(const k of ['oc','dc']){const x=s[k];x.age++;x.yrs--;if(x.yrs<=0){x.yrs=rint(2,3);x.sal=Math.round(x.sal*1.08)}}
    c.age++;c.ten=(c.ten||0)+1;c.yrs=(c.yrs||3)-1;
    const d=t.rec.w-adTarget(t)+(t.cc?1.5:0)+(L.champ===t.id||L.champF===t.id?3:0);
    c.sec=clamp((c.sec==null?60:c.sec)+d*9+(c.ten<=1?6:0),0,100);c.hot=d>=2;
    if(d>=2&&c.r<5&&Math.random()<.35)c.r++;else if(d<=-3&&c.r>1&&Math.random()<.25)c.r--;
    if(c.yrs<=0&&c.sec>=40){c.yrs=rint(3,5);c.sal=Math.round(c.sal*1.15)}
    let why=null;if(c.age>=67&&Math.random()<.3+(c.age-67)*.12)why='retired';
    else if(c.ten>=2&&(c.sec<12||c.yrs<=0||(c.sec<25&&Math.random()<.35)))why='fired';
    if(why){(why==='fired'?car.fired:car.retired).push({t:t.id,name:c.name,rec:`${t.rec.w}–${t.rec.l}`});if(why==='fired'&&c.r>=3&&c.age<64)car.free.push(c);s.hc=null;open.push(t)}
  }
  /* you: contract, extension or dismissal, then job offers (open jobs first) */
  const lc=L.coach,ten=tenureAt(L),sec=lc.security,h=L.history[L.history.length-1]||{},Y=car.you;lc.age=(lc.age||40)+1;lc.yrs=(lc.yrs||5)-1;
  const fired=(sec<=10&&ten>=2)||(lc.yrs<=0&&sec<40);
  if(!fired&&lc.yrs<=0){lc.yrs=3;Y.ext=`Your contract is renewed for 3 years at ${money(lc.sal)} a year.`}
  else if(!fired&&sec>=72&&lc.yrs<=2){lc.yrs+=3;lc.sal=Math.round(lc.sal*1.25/10)*10;Y.ext=`The AD rewards you with a 3-year extension and a raise to ${money(lc.sal)} a year.`}
  const ul=jobLvl(u);let pool;
  if(fired)pool=L.teams.filter(t=>t.id!==L.user&&jobLvl(t)<ul&&t.prestige<=Math.max(2,u.prestige-1));
  else if(h.w>=o.target+2||o.champ||o.madePO){const up=t=>t.id!==L.user&&qOf(t)>qOf(u)+.2&&qOf(t)<qOf(u)+1.6;pool=open.filter(up);if(pool.length<2)pool=pool.concat(shuffle(L.teams.filter(t=>up(t)&&!pool.includes(t))).slice(0,2))}
  else pool=[];
  const offers=shuffle(pool.slice()).sort((a,b)=>open.includes(b)-open.includes(a)).slice(0,fired?3:rint(1,3));
  o.fired=fired;o.offers=offers.map(t=>t.id);o.hold=offers.filter(t=>open.includes(t)).map(t=>t.id);
  /* your coordinators: successful ones get head-coaching offers */
  const good=(h.w||0)>=o.target+1||o.madePO||o.champ;
  for(const k of ['oc','dc']){const x=L.staff[k];x.age++;x.yrs--;if(x.yrs<=0){x.yrs=2;x.sal=Math.round(x.sal*1.1)}
    const job=open.filter(t=>!o.hold.includes(t.id)&&jobLvl(t)<=ul+.05&&!car.poached.some(p=>p.to===t.id)).sort((a,b)=>jobLvl(b)-jobLvl(a))[0];
    if(job&&x.r>=3&&Math.random()<(x.r-2)*.13+(good?.15:0)){const nx=genCoach(k,Math.max(1,x.r-1.5),{t:u});nx.name+=' (interim)';car.poached.push({role:k,name:x.name,to:job.id,repl:nx.name});
      hireHC(L,job,Object.assign(x,{ten:0,sec:65}),car,{role:k,from:u.id});open.splice(open.indexOf(job),1);L.staff[k]=nx}}
  fillJobs(L,open.filter(t=>!o.hold.includes(t.id)),car);
  refreshStaffPool(L);for(const k of ['oc','dc'])if(L.pool[k].every(c=>c.r<3))L.pool[k][0]=genCoach(k,3.6,{t:u});
  o.car=car;return car;
}
function hireHC(L,t,c,car,src){
  Object.assign(c,{ten:0,yrs:rint(4,6),sec:65,sal:coachSalary('hc',c.r,t)});delete c.hot;t.staff.hc=c;t.newHC=L.season;
  if(Math.random()<.5)t.staff.oc=genCoach('oc',staffQ(t)-.3,{t});if(Math.random()<.5)t.staff.dc=genCoach('dc',staffQ(t)-.3,{t});
  car.hired.push({t:t.id,name:c.name,from:src&&src.from!=null?src.from:null,role:src?src.role:'new'});
}
/* open jobs, best first; a head coach who moves up opens his old job (the ladder); coordinators and fired coaches get chances too */
function fillJobs(L,list,car){
  list=list.slice();let guard=0;
  while(list.length&&guard++<300){
    list.sort((a,b)=>jobLvl(b)-jobLvl(a));const t=list.shift(),want=jobLvl(t);let best=null;
    const cand=(c,sc,from,role)=>{if(!best||sc>best.sc)best={c,sc,from,role}};
    for(const x of L.teams){if(x.id===t.id||x.id===L.user||!x.staff)continue;const s=x.staff,lx=jobLvl(x);
      if(s.hc&&s.hc.hot&&s.hc.ten>=2&&lx<want-.1&&lx>=want-.45&&!list.includes(x))cand(s.hc,s.hc.r+.8+R(0,1.4)-(want-lx)*2,x,'hc');   /* one rung up the ladder at a time */
      for(const k of ['oc','dc'])if(s[k]&&s[k].r>=4&&lx>=want-.3&&lx>=want-.05+(s[k].r===5?-.2:0))cand(s[k],s[k].r-.5+R(0,1.4),x,k)}
    for(const c of car.free)if(c.r>=3&&!c.taken)cand(c,c.r-1.2+R(0,1.2)-(want>.9?1:0),null,'free');
    const gen=genCoach('hc',1+want*3.6,{t});cand(gen,gen.r-.6+R(0,1.2),null,'new');
    const {c,from,role}=best;
    if(role==='hc'){from.staff.hc=null;list.push(from)}
    else if(role==='oc'||role==='dc')from.staff[role]=genCoach(role,staffQ(from)-.3,{t:from});
    else if(role==='free')c.taken=true;
    hireHC(L,t,c,car,{role,from:from?from.id:null});
  }
}
/* after you take a job or stay put: the open jobs held for you get filled, your old job too */
function finishCarousel(L,take){
  const o=L.off,car=o.car||{fired:[],retired:[],hired:[],poached:[],free:[],you:{}};o.car=car;const old=L.user,rest=[];
  if(take!=null){takeJob(L,take);rest.push(L.teams[old]);car.you.moved=take}
  for(const id of (o.hold||[]))if(id!==L.user)rest.push(L.teams[id]);
  for(const t of rest)if(t.staff)t.staff.hc=null;
  fillJobs(L,rest.filter(t=>t.staff),car);o.hold=[];
  for(const t of L.teams)if(t.staff&&t.staff.hc){delete t.staff.hc.hot;delete t.staff.hc.taken}
  car.free=[];
  const big=[...car.fired.map(x=>({...x,k:'f'})),...car.hired.map(x=>({...x,k:'h'}))].filter(x=>L.teams[x.t]&&!isFCS(L.teams[x.t])).sort((a,b)=>L.teams[b.t].prestige-L.teams[a.t].prestige).slice(0,4);
  for(const x of big.reverse())L.news.unshift({t:x.k==='f'?`${L.teams[x.t].city} fires ${x.name} after a ${x.rec} season.`:`${L.teams[x.t].city} hires ${x.name}${x.from!=null&&L.teams[x.from]?` from ${L.teams[x.from].city}${x.role==='oc'||x.role==='dc'?' ('+x.role.toUpperCase()+')':''}`:''} as head coach.`});
  for(const p of car.poached)L.news.unshift({t:`Your ${p.role.toUpperCase()} ${p.name} leaves to become head coach at ${L.teams[p.to].city}. ${p.repl} takes over for now; hire a replacement on the Program tab.`});
  portalStart(L);o.stage='portal';
}

/* ---------- transfer portal ---------- */
const PORTAL_RULE='One NCAA transfer window: Jan 2–16 (15 days). After a head-coaching change, players get their own 15-day window starting five days after the hire; the two title-game teams get Jan 20–24.';
let PORTAL_POS='All';
const pStars=p=>{const o=ovr99(p);return o>=86?5:o>=79?4:o>=70?3:o>=60?2:1};
const PASK=[0,15,40,150,550,1600],PPOS={QB:1.9,RB:.8,WR:1,TE:.75,OL:1,DL:1.15,LB:.8,CB:.95,S:.75,K:.25};
function portalAsk(p,st){const s=p.ss||{};const prod=clamp((s.py||0)/3000+(s.ry||0)/1000+(s.recy||0)/900+(s.tkl||0)/80+(s.sck||0)/8+(s.dint||0)/4,0,1)*.5;return Math.round(PASK[st]*(PPOS[p.pos]||1)*(1+prod)*R(.85,1.15)/5)*5}
const startQ=(t,pos)=>{const s=starters(t,pos);return s.length>=STARTERS[pos]?ovr(s[s.length-1]):1};
function pEntry(p,t,why){const st=pStars(p);return {...p,from:t.id,why,st,ask:portalAsk(p,st),line:p.ss&&p.ss.gp?statLine(p):'Did not play last season',gp:(p.ss&&p.ss.gp)||0,off:0,su:[]}}
function pClean(e,L){const q={...e};for(const k of ['from','why','st','ask','line','gp','off','su','to','signed'])delete q[k];return Object.assign(q,{num:0,ss:newSS(),cond:100,inj:0,injWhy:'',redshirt:false,tr:L.season})}
/* who enters: playing time, morale, NIL power, a coaching change (its own window), stars at programs that can't pay them */
function portalStart(L){
  const o=L.off;if(o.pool)return;ensureCareer(L);o.pool=[];o.risk=[];
  const u=L.user;
  for(const p of (o.portalPool||[]))if(L.teams[p.from])o.pool.push(pEntry(p,L.teams[p.from],'Fresh start'));delete o.portalPool;
  for(const t of L.teams){
    const pw=teamPow(L,t),ch=t.newHC===L.season,user=t.id===u,g=t.rec.w+t.rec.l;
    const mor=user?(72-L.morale)/100*.3:g?(.5-t.rec.w/g)*.12:0,sq={},st=new Set();
    for(const pos of POS_ORDER){sq[pos]=startQ(t,pos);for(const p of starters(t,pos))st.add(p.id)}
    const keep=[];
    for(const p of t.roster){
      const s=st.has(p.id),o9=ovr99(p),pt=!s&&ovr(p)>=sq[p.pos]-.25,star=o9>=80&&pw<.45;
      let pe=(s?.025:.06)+(pt?.14:0)+(!s&&p.ss.gp<3?.04:0)+(star?.16:0)+mor;
      pe*=(ch?1.9:1)*(1.15-.3*pw)*(p.redshirt?.5:1);
      if(Math.random()<clamp(pe,0,.6)){
        const why=ch?'Coaching change':star?'NIL':pt?'Playing time':mor>.06?'Morale':'Fresh start';
        if(user&&(s||o9>=68)){o.risk.push({id:p.id,why,ask:Math.round(portalAsk(p,pStars(p))*.7/5)*5,keep:0});keep.push(p)}
        else o.pool.push(pEntry(p,t,why));
      }else keep.push(p);
    }
    if(keep.length!==t.roster.length){t.roster=keep;if(t.dco)for(const pos in t.dco)t.dco[pos]=t.dco[pos].filter(id=>keep.some(p=>p.id===id))}
  }
  L.captains=L.captains.filter(id=>L.teams[u].roster.some(p=>p.id===id));
  o.pw='ret';if(!o.risk.length)portalOpen(L);
}
/* the window opens: players you didn't keep leave, every entry gets suitors */
function portalOpen(L){
  const o=L.off,u=L.teams[L.user];
  for(const r of o.risk){if(r.keep)continue;const p=u.roster.find(x=>x.id===r.id);if(!p)continue;u.roster=u.roster.filter(x=>x!==p);o.pool.push(pEntry(p,u,r.why))}
  L.captains=L.captains.filter(id=>u.roster.some(p=>p.id===id));
  const pw={},cnt={},ids=L.teams.map(t=>t.id).filter(id=>id!==L.user);
  for(const t of L.teams){pw[t.id]=teamPow(L,t);const c={};for(const p of t.roster)c[p.pos]=(c[p.pos]||0)+1;cnt[t.id]=c}
  for(const e of o.pool){const lv=e.st/5,sc=[];
    for(let k=0;k<45;k++){const id=pick(ids);if(id===e.from)continue;const p=pw[id];if(p<lv*.75-.2)continue;const need=Math.max(0,POS_COUNTS[e.pos]+1-(cnt[id][e.pos]||0));if(!need)continue;sc.push([id,p+need*.08+(coachMod(L.teams[id],'portal')-1)/50+R(0,.25)])}
    e.su=[...new Map(sc.sort((a,b)=>b[1]-a[1])).keys()].slice(0,3)}
  o.pw='open';
}
function pInt(L,e){const u=L.teams[L.user];if(e.from===L.user)return 0;const lv=e.st/5,sq=startQ(u,e.pos),pt=ovr(e)>=sq?18:ovr(e)>=sq-.3?6:-12;
  return clamp(Math.round(52+(teamPow(L,u)-lv)*55+pt+(coachMod(u,'portal')-1)+((L.fan||60)-60)/5),2,97)}
const pChance=(L,e)=>e.from===L.user?0:clamp(pInt(L,e)-e.su.length*4+(e.off?8:0),2,95);
function portalOffer(L,e){if(e.off){L.nil+=e.off;if(L.budget)L.budget.portal-=e.off;e.off=0;return null}
  if(L.nil<e.ask)return 'Not enough NIL budget';if(L.teams[L.user].roster.length+L.off.pool.filter(x=>x.off).length>=ROSTER_CAP)return 'No roster spots left';spendNIL(L,'portal',e.ask);e.off=e.ask;return null}
/* the window closes: your offers first, then every other school by need and pull */
function portalResolve(L){
  const o=L.off,u=L.teams[L.user],res={n:o.pool.length,moved:0,un:0,mine:[],lost:[],top:[]},cnt={},touched=new Set([u]);
  for(const t of L.teams){const c={};for(const p of t.roster)c[p.pos]=(c[p.pos]||0)+1;cnt[t.id]=c}
  const put=(e,t)=>{t.roster.push(pClean(e,L));e.to=t.id;cnt[t.id][e.pos]=(cnt[t.id][e.pos]||0)+1;touched.add(t);res.moved++};
  for(const e of o.pool){if(!e.off)continue;const ok=Math.random()*100<pChance(L,e)&&u.roster.length<ROSTER_CAP;
    if(ok)put(e,u);else{L.nil+=e.off;if(L.budget)L.budget.portal-=e.off}res.mine.push({name:fullName(e),pos:e.pos,st:e.st,ok,ask:e.off,from:e.from})}
  const fits=(t,e,lim)=>t.id!==L.user&&t.id!==e.from&&t.roster.length<ROSTER_CAP&&(cnt[t.id][e.pos]||0)<POS_COUNTS[e.pos]+lim;
  for(const e of o.pool.filter(e=>e.to==null).sort((a,b)=>b.st-a.st||ovr(b)-ovr(a))){
    if(Math.random()<[0,.55,.3,.1,.03,0][e.st]){res.un++;continue}   /* no scholarship offer: lower divisions or done with football */
    let dest=null;for(const id of e.su){const t=L.teams[id];if(fits(t,e,1)){dest=t;break}}
    for(let k=0;k<30&&!dest;k++){const t=pick(L.teams);if(fits(t,e,0)&&teamPow(L,t)<=e.st/5+.15)dest=t}   /* many find no school */
    if(dest)put(e,dest);else res.un++}
  for(const t of touched){assignNumbers(t);t.dco=t.id===L.user?t.dco:null}invalidate();
  for(const e of o.pool)if(e.from===L.user)res.lost.push({name:fullName(e),pos:e.pos,st:e.st,to:e.to==null?null:e.to});
  res.top=o.pool.filter(e=>e.to!=null&&e.st>=4).sort((a,b)=>b.st-a.st||ovr(b)-ovr(a)).slice(0,8).map(e=>({name:fullName(e),pos:e.pos,st:e.st,from:e.from,to:e.to}));
  const got=res.mine.filter(x=>x.ok).length;
  L.news.unshift({t:`Transfer portal closes: ${res.n} players entered, ${res.moved} found new schools. You signed ${got} and lost ${res.lost.length}.`,good:got>=res.lost.length});
  if(res.top[0]){const x=res.top[0];L.news.unshift({t:`Portal splash: ${x.st}★ ${x.pos} ${x.name} moves from ${L.teams[x.from].city} to ${L.teams[x.to].city}.`})}
  o.pres=res;delete o.pool;o.pw='done';
}

/* ---------- UI: Program tab cards ---------- */
function careerCoachHTML(){
  const c=LG.coach,u=T(LG.user),[hs,hc]=hotSeat(c.security),tgt=adTarget(u),g=u.rec.w+u.rec.l;
  const pace=LG.phase==='regular'&&g?Math.round(u.rec.w/g*12):null;
  return `<div class="card"><div class="eyebrow">Head coach · level ${c.lvl}</div><div class="h2">${esc(c.name)}</div>
    <div class="kv"><span>Career record</span><b>${c.w}–${c.l}</b></div><div class="kv"><span>Seasons · here</span><b>${c.seasons} · ${tenureAt(LG)}</b></div>
    <div class="kv"><span>Titles · conf · bowls</span><b>${c.natties} · ${c.confs} · ${c.bowls}</b></div><div class="kv"><span>Playoff trips · COY</span><b>${c.playoffs} · ${c.coy}</b></div>
    <div class="kv"><span>Contract</span><b>${c.yrs} yr${c.yrs===1?'':'s'} left · ${money(c.sal)}/yr</b></div>
    <div class="kv"><span>AD expectation</span><b>${tgt}+ wins${pace!=null?` · on pace for ${pace}`:''}</b></div>
    <div class="kv"><span>Hot seat</span><b class="${hc==='hot'?'res-l':''}">${hs} · ${Math.round(100-c.security)}°</b></div>${meterHTML(100-c.security,hc==='hot'?'var(--hot)':hc==='warn'?'var(--warn)':'var(--ok)')}
    <p class="note">Security ${Math.round(c.security)}%. Each win above or below the target moves it about 7 points; playoffs and titles add more. Below 10% after two years here (or an expired contract under 40%) gets you fired.</p>
    <div class="kv"><span>Coach XP</span><b>${c.xp}/${lvlNeed(c.lvl)}</b></div>${meterHTML(c.xp/lvlNeed(c.lvl)*100,'var(--los)')}</div>`;
}
function careerBudgetHTML(){
  const b=LG.budget||{rev:0,col:0,carry:0,total:LG.nil,ret:0,portal:0,rec:0},used=b.total?clamp((b.total-LG.nil)/b.total*100,0,100):0;
  return `<div class="card"><div class="setrow"><div class="h2">NIL &amp; revenue sharing</div><span class="pill gold">${money(LG.nil)} left</span></div>
    <div class="kv"><span>Revenue sharing</span><b>${money(b.rev)}</b></div><div class="kv"><span>Collective</span><b>${money(b.col)}</b></div>${b.carry?`<div class="kv"><span>Carried over</span><b>${money(b.carry)}</b></div>`:''}
    <div class="kv"><span>${b.yr||LG.season} player budget</span><b>${money(b.total)}</b></div>${meterHTML(100-used,'var(--ok)')}
    <div class="kv"><span>Spent</span><b>${money(b.ret+b.portal+b.rec)}</b></div><p class="note">Retention ${money(b.ret)} · transfers ${money(b.portal)} · recruit pitches ${money(b.rec)}</p>
    <p class="note">Set every offseason from your school's revenue-sharing share (the 2025-26 cap was $20.5M, rising 4% a year), plus a collective that grows with prestige, fan approval, results and facilities. It pays retention deals, transfers and NIL pitches to recruits; 10% of what's left carries over.</p></div>`;
}
function careerStaffHTML(){
  return `<div class="card"><div class="h2">Coordinators</div><div class="list">${coachRow('oc',LG.staff.oc)}${coachRow('dc',LG.staff.dc)}</div>
    <div class="eyebrow">Available to hire</div><div class="list">${['oc','dc'].flatMap(k=>LG.pool[k].map((s,i)=>coachRow(k,s,`<button class="btn sm" id="hire-${k}-${i}" ${LG.credits<staffCost(s)?'disabled':''}>Hire · ${staffCost(s)} CC</button>`))).join('')}</div>
    <p class="note">Signature traits work in your games, in simulated games and over the season. Coordinator ratings help receivers get open (OC) and your simulated defense (DC). Coordinators who win get head-coaching offers.</p></div>`;
}
function careerTreeHTML(){
  const c=LG.coach,br=[...new Set(PERKS.map(p=>p.b))];
  return `<div class="card"><div class="setrow"><div class="h2">Coaching skill tree</div><span class="pill">${c.sp} skill point${c.sp===1?'':'s'}</span></div>
    <p class="note">Earn coach XP from wins, bowls, titles and playoff trips. Each level gives a skill point; tier 2 and 3 perks cost 2 and 3 points, or 12 coaching credits a point.</p>
    <div>${br.map(b=>`<div><div class="eyebrow">${b}</div><div class="list">${PERKS.filter(p=>p.b===b).map(p=>{const has=c.perks.includes(p.id),lock=p.req&&!c.perks.includes(p.req);
      return `<div class="lrow"><span style="min-width:0"><b>${esc(p.n)}</b> <small class="note">T${p.t}</small><br><small class="note">${esc(p.d)}</small></span>${has?'<span class="tag gold">Learned</span>':`<span style="display:flex;gap:6px;flex:none"><button class="btn sm" id="perk-${p.id}" ${lock||c.sp<p.t?'disabled':''}>${p.t} pt</button><button class="btn sm ghost" id="perkcc-${p.id}" ${lock||LG.credits<p.t*12?'disabled':''}>${p.t*12} CC</button></span>`}</div>`}).join('')}</div></div>`).join('')}</div></div>`;
}
function bindCareer(){PERKS.forEach(p=>{const go=cc=>{const e=buyPerk(LG,p.id,cc);if(e){toast(e);return}saveNow();rerender();toast(p.n+' learned')};on('perk-'+p.id,()=>go(false));on('perkcc-'+p.id,()=>go(true))})}

/* ---------- UI: offseason carousel and portal ---------- */
function carouselHTML(prog){
  const o=LG.off,car=o.car,u=T(LG.user),c=LG.coach,nm=id=>esc(T(id).city);
  const offers=o.offers.map(id=>{const t=T(id);return `<div class="lrow"><span class="l">${badge(t)}<span><b>${esc(teamName(t))}</b><br><small class="note">${confName(t.conf)} · Prestige ${t.prestige}/5 · OVR ${tOvr99(teamOvr(t))} · ${money(coachSalary('hc',3,t))}/yr${(o.hold||[]).includes(id)?' · open job':''}</small></span></span><button class="btn sm" id="offer-${id}">Take the job</button></div>`}).join('');
  const you=`<div class="card hero"><div class="eyebrow">Coaching carousel · your review</div><div class="h2">${o.fired?'You have been fired.':o.offers.length?'Other programs want to hire you.':'You are staying put.'}</div>
    <p class="note">${car&&car.you.ext?esc(car.you.ext)+' ':''}Contract: ${c.yrs} year${c.yrs===1?'':'s'} left at ${money(c.sal)}. Hot seat: ${hotSeat(c.security)[0]} (security ${Math.round(c.security)}%).</p>
    ${offers?`<div class="list">${offers}</div>`:''}${o.fired?(o.offers.length?`<button class="btn wide" id="offNext">Take the ${nm(o.offers[0])} job</button>`:''):o.offers.length?`<button class="btn ghost" id="stayPut">Stay at ${esc(u.city)}</button>`:`<button class="btn wide" id="offNext">Continue to the transfer portal</button>`}</div>`;
  if(!car)return prog+you;
  const li=(a,f)=>a.length?a.slice(0,14).map(f).join('')+(a.length>14?`<p class="note">…and ${a.length-14} more.</p>`:''):'<p class="note">None.</p>';
  const poach=car.poached.length?`<div class="card"><div class="h2">Your staff</div><div class="list">${car.poached.map(p=>`<div class="lrow"><span><b>${esc(p.name)}</b> (${p.role.toUpperCase()}) is the new head coach at ${nm(p.to)}.<br><small class="note">${esc(p.repl)} takes over; hire a replacement on the Program tab.</small></span></div>`).join('')}</div></div>`:'';
  return prog+you+poach+`<div class="grid2"><div class="card"><div class="h2">Fired &amp; retired · ${car.fired.length+car.retired.length}</div><div class="list">${li([...car.fired,...car.retired.map(x=>({...x,ret:1}))].sort((a,b)=>T(b.t).prestige-T(a.t).prestige),x=>`<div class="lrow"><span class="l">${badge(T(x.t),'sm')}<span>${esc(x.name)} <small class="note">${nm(x.t)} · ${x.ret?'retired':x.rec}</small></span></span></div>`)}</div></div>
    <div class="card"><div class="h2">New head coaches · ${car.hired.length}</div><div class="list">${li(car.hired.slice().sort((a,b)=>T(b.t).prestige-T(a.t).prestige),x=>`<div class="lrow"><span class="l">${badge(T(x.t),'sm')}<span>${esc(x.name)} <small class="note">${nm(x.t)}${x.from!=null&&T(x.from)?' · from '+nm(x.from)+(x.role==='hc'?'':' '+String(x.role).toUpperCase()):''}</small></span></span></div>`)}</div><p class="note">Hires wait for your decision on jobs that want you.</p></div></div>`;
}
function bindCarousel(){
  const o=LG.off,go=id=>{finishCarousel(LG,id);saveNow();showHub('home');$('#hubScroll').scrollTop=0};
  o.offers.forEach(id=>on('offer-'+id,()=>go(id)));on('stayPut',()=>go(null));
  on('offNext',()=>go(o.fired&&o.offers.length?o.offers[0]:null));
}
function portalHTML(prog){
  const o=LG.off,u=T(LG.user),nm=id=>esc(T(id).city);
  const head=`<div class="card"><div class="setrow"><div class="h2">Transfer portal</div><span class="pill gold">${money(LG.nil)} NIL left</span></div><p class="note">${PORTAL_RULE}</p></div>`;
  if(o.pw==='ret')return prog+head+`<div class="card"><div class="h2">Retention · before the window opens</div><p class="note">These players are thinking about entering the portal. Pay a retention deal from your NIL budget to keep one; anyone you don't keep enters when the window opens. Roster ${u.roster.length}/${ROSTER_CAP}.</p>
    <div class="list">${o.risk.map((r,i)=>{const p=u.roster.find(x=>x.id===r.id);if(!p)return '';return `<div class="rrow ${r.keep?'sel':''}"><span class="num">${p.pos}</span><span class="meta"><b>${esc(fullName(p))} ${starStr(pStars(p))} <small>${yrStr(p)}</small></b><small>${esc(statLine(p))}</small><span class="tags"><span class="tag ${r.why==='Coaching change'?'hot':''}">${r.why}</span></span></span><span class="btns" style="flex-direction:column;gap:6px">${ovrTag(p)}${r.keep?'<span class="tag ok">Kept</span>':`<button class="btn sm" id="ret-${i}" ${LG.nil<r.ask?'disabled':''}>Keep · ${money(r.ask)}</button>`}</span></div>`}).join('')}</div>
    <button class="btn wide" id="offNext">Open the portal window</button></div>`;
  if(o.pw==='open'){
    const mine=o.pool.filter(e=>e.from===LG.user),list=o.pool.map((e,i)=>[e,i]).filter(([e])=>e.from!==LG.user&&(PORTAL_POS==='All'||e.pos===PORTAL_POS)).sort((a,b)=>b[0].st-a[0].st||ovr(b[0])-ovr(a[0])).slice(0,40);
    const offers=o.pool.filter(e=>e.off);
    return prog+head+`<div class="card"><div class="setrow"><div class="h2">Window open · ${o.pool.length} players</div><span class="pill">${offers.length} offer${offers.length===1?'':'s'} out</span></div>
      <p class="note">Offer a player his asking NIL to make your pitch; the money comes back if he picks another school. Chance shows how he leans: interest in your program (level, playing time, fans, Portal King) against the schools courting him. Roster ${u.roster.length}/${ROSTER_CAP}.</p>
      <div class="chips" id="poChips">${['All',...POS_ORDER].map(p=>`<button class="chipbtn" data-v="${p}" aria-pressed="${PORTAL_POS===p}">${p}</button>`).join('')}</div>
      <div class="list">${list.map(([e,i])=>{const ch=pChance(LG,e);return `<div class="rrow ${e.off?'sel':''}"><span class="num">${e.pos}</span><span class="meta"><b>${esc(fullName(e))} ${starStr(e.st)} <small>${yrStr(e)} · ${nm(e.from)} · ${esc(e.why)}</small></b><small>${esc(e.line)}${e.gp?` · ${e.gp} games`:''}</small>
        <span style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:11px;color:var(--mute)"><span>Chance</span>${meterHTML(ch)}<b>${ch}%</b></span><small class="note">${e.su.length?'Also courting: '+e.su.map(nm).join(', '):'No other offers yet'}</small></span>
        <span class="btns" style="flex-direction:column;gap:6px">${ovrTag(e)}<button class="btn sm ${e.off?'ghost':''}" id="po-${i}" ${!e.off&&LG.nil<e.ask?'disabled':''}>${e.off?'Withdraw':'Offer · '+money(e.ask)}</button></span></div>`}).join('')||'<p class="note">Nobody at this position.</p>'}</div>
      ${mine.length?`<div class="eyebrow">Left your program · ${mine.length}</div><div class="list">${mine.map(e=>`<div class="lrow"><span class="l"><span class="num">${e.pos}</span><span>${esc(fullName(e))} ${starStr(e.st)} <small class="note">${esc(e.why)}</small></span></span>${ovrTag(e)}</div>`).join('')}</div>`:''}
      <button class="btn wide" id="offNext">Close the window</button></div>`;
  }
  const r=o.pres||{n:0,moved:0,un:0,mine:[],lost:[],top:[]};
  return prog+head+`<div class="card hero"><div class="eyebrow">Portal results</div><div class="h2">${r.mine.filter(x=>x.ok).length} signed · ${r.lost.length} lost</div><p class="note">${r.n} players entered, ${r.moved} transferred, ${r.un} found no school.</p>
    <div class="list">${r.mine.map(x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)} ${starStr(x.st)} <small class="note">from ${nm(x.from)}</small></span></span><span class="tag ${x.ok?'ok':'hot'}">${x.ok?'Signed · '+money(x.ask):'Went elsewhere'}</span></div>`).join('')||'<p class="note">You made no portal offers.</p>'}</div></div>
    <div class="grid2"><div class="card"><div class="h2">Your departures</div><div class="list">${r.lost.map(x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)} ${starStr(x.st)}</span></span><small class="note">${x.to!=null?'→ '+nm(x.to):'unsigned'}</small></div>`).join('')||'<p class="note">Nobody left.</p>'}</div></div>
    <div class="card"><div class="h2">Biggest moves</div><div class="list">${r.top.map(x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)} ${starStr(x.st)}<br><small class="note">${nm(x.from)} → ${nm(x.to)}</small></span></span></div>`).join('')||'<p class="note">No four- or five-star moves.</p>'}</div></div></div>
    <button class="btn wide" id="offNext">Continue to class review</button>`;
}
function bindPortal(){
  const o=LG.off;
  if(o.pw==='ret')o.risk.forEach((r,i)=>on('ret-'+i,()=>{if(LG.nil<r.ask){toast('Not enough NIL');return}spendNIL(LG,'ret',r.ask);r.keep=1;const p=T(LG.user).roster.find(x=>x.id===r.id);if(p)p.nil=r.ask;LG.morale=clamp(LG.morale+1,0,100);saveNow();rerender()}));
  if(o.pw==='open'){o.pool.forEach((e,i)=>on('po-'+i,()=>{const m=portalOffer(LG,e);if(m)toast(m);saveNow();rerender()}));
    document.querySelectorAll('#poChips button').forEach(b=>b.onclick=()=>{PORTAL_POS=b.dataset.v;rerender()})}
}
