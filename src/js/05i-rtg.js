/* =========================================================
   05i · Road to Glory (v7.5): a player career inside a normal league.
   SETUP  "Road to Glory" on the new-dynasty screen: create a recruit (name, position, archetype, 2–5 stars, home state),
          a senior-year recap, 5–8 offers from real schools in the league (04b's recruiting model: recruiting power vs
          his level, need at his position, fit, distance from home), up to 3 official visits, commit.
   SEASON the league runs as normal with a CPU head coach (events off, recruiting/portal/carousel automated). LG.user is
          his school. In his games the autopilot (05h) plays everyone but him (AUTO.exempt): snaps he's on the field for
          are live, every other snap (and all special teams) is fast-forwarded with a sideline overlay (rtgCheck).
   CAREER per-game grade (A+…F, rtgQ) from his plays (fx listeners: targets, drops, broken / missed tackles, coverage),
          weekly practice evaluation, coach trust → his spot on the depth chart (rtgDepth sets t.dco for his position),
          XP → skill points (+1 rating step each), goals, NIL deals that unlock with his profile, draft projection,
          declare-or-return after his junior year, the draft result (03 departures → rtgDrafted), a career summary.
   LG.rtg = {pid,pos,arch,stars,st,team,trust,sp,xp,depth,grades[],last,prac,nil{cash,deals,offer,got},hist[],goals[],
             decl,result,moves[],stage:'college'|'done',pl (snapshot when he leaves),proj}
   ========================================================= */
const RTG_POS=['QB','RB','WR','TE','LB','CB','S'];
const RTG_ARCH={QB:[['Pocket passer',{thr:.45,acc:.4,spd:-.3}],['Dual threat',{spd:.5,agi:.45,acc:-.2}],['Field general',{awr:.55,acc:.35,thr:-.15}]],
  RB:[['Power back',{str:.5,car:.45,agi:-.2}],['Elusive back',{agi:.5,spd:.4,str:-.25}],['Receiving back',{cat:.5,rte:.45,str:-.2}]],
  WR:[['Deep threat',{spd:.55,agi:.3,str:-.2}],['Possession',{cat:.5,rte:.4,spd:-.15}],['Slot',{agi:.5,rte:.4,str:-.25}]],
  TE:[['Vertical threat',{spd:.45,cat:.4,blk:-.3}],['Blocker',{blk:.55,str:.4,rte:-.25}],['Possession',{cat:.45,rte:.4,spd:-.15}]],
  LB:[['Run stopper',{tkl:.5,str:.4,cov:-.25}],['Coverage',{cov:.5,spd:.35,str:-.2}],['Pass rusher',{shd:.5,spd:.35,cov:-.25}]],
  CB:[['Man cover',{cov:.5,spd:.35,tkl:-.2}],['Zone',{awr:.5,cov:.35,spd:-.15}],['Ball hawk',{cat:.55,awr:.3,tkl:-.2}]],
  S:[['Enforcer',{tkl:.5,str:.4,cov:-.2}],['Center fielder',{cov:.5,spd:.35,str:-.2}],['Box safety',{tkl:.4,awr:.4,spd:-.15}]]};
const RTG_LVL={2:2.0,3:2.8,4:3.55,5:4.2},RTG_COMP={2:7850,3:8450,4:9350,5:9870};
const RTG_GR=['F','D','C-','C','C+','B-','B','B+','A-','A','A+'];
const RTG_E={QB:12,RB:12,WR:10,TE:8,LB:6.5,CB:5,S:5.5};
const RTG_NIL=[[16,'Hometown pizza place',3],[28,'Local car dealership',10],[40,'Regional sports drink',25],[52,'Trading card deal',50],[64,'National shoe brand',120],[78,'National apparel campaign',300]];
const RTG_G={ev:null,snapAt:0,alw:null};
const rtgOffP=pos=>['QB','RB','WR','TE'].includes(pos);
function rtgMe(L){L=L||LG;const r=L&&L.rtg;if(!r||L.user==null)return null;const t=L.teams[L.user];return t&&t.roster.find(p=>p.id===r.pid)||null}
const rtgMine=p=>!!p&&!!S.auto&&AUTO.exempt!=null&&!!p.user&&!!p.pl&&p.pl.id===AUTO.exempt;
const rtgCost=v=>v>=4.5?3:v>=4?2:1;
const rtgStarter=(r,me)=>r.depth!=null&&r.depth<STARTERS[me.pos]&&me.inj<=0;

/* ---------- the recruit ---------- */
const rtgBase=(o,k)=>RTG_LVL[o.stars]+((BIAS[o.pos]||{})[k]||0)*.6+((RTG_ARCH[o.pos][o.arch]||RTG_ARCH[o.pos][0])[1][k]||0)+(k==='awr'?-.35:0);
function rtgMakePlayer(o){
  const p=genPlayer(o.pos,RTG_LVL[o.stars],1),S0=RC_STATES[o.st]||RC_STATES[0];
  for(const k of ATTR_KEYS)p[k]=r1(rtgBase(o,k)+R(-.2,.2));
  Object.assign(p,{first:o.first,last:o.last,home:S0.c[o.ci||0]+', '+S0.st,xp:0,num:0,redshirt:false,rs:false});return sizeFor(p);
}
/* senior year at his high school: a stat line by position and stars */
function rtgHS(o){const f=.55+o.stars*.22,n=v=>Math.round(v*f).toLocaleString(),w=Math.min(14,Math.round(7+o.stars*1.3+R(-1,1)));
  const line={QB:`${n(2300)} pass yds · ${n(22)} TD · ${Math.max(2,Math.round(11/f))} INT · ${n(380)} rush yds`,RB:`${n(1250)} rush yds · ${n(15)} TD · ${n(22)} catches`,
    WR:`${n(58)} catches · ${n(950)} yds · ${n(11)} TD`,TE:`${n(41)} catches · ${n(560)} yds · ${n(7)} TD`,LB:`${n(92)} tackles · ${n(6)} sacks · ${n(9)} TFL`,
    CB:`${n(4)} INT · ${n(12)} pass breakups · ${n(38)} tackles`,S:`${n(71)} tackles · ${n(4)} INT · ${n(7)} pass breakups`}[o.pos];
  const hon=o.stars>=5?['All-American Bowl','All-State first team','State Player of the Year finalist']:o.stars>=4?['All-State first team','Elite camp MVP']:o.stars>=3?['All-Region','All-District first team']:['All-District'];
  const rk=o.stars>=5?rint(1,32):o.stars>=4?rint(33,360):o.stars>=3?rint(361,1450):rint(1451,1600);
  return {line,hon,rec:`${w}–${14-w>0?Math.max(0,14-w-rint(0,2)):0}`,rk,team:RC_STATES[o.st].c[o.ci||0]+' High'}}
/* offers: schools whose recruiting power is near his level, by fit, need at his position and distance (04b rcCtx) */
function rtgOffers(L,o){
  const C=rcCtx(L,true),pi=POS_ORDER.indexOf(o.pos),P={c:RTG_COMP[o.stars],p:pi,st:o.st,pr:'433343333'},lvl=clamp((P.c/1e4-.7)/.3,0,1);
  const me=rtgMakePlayer(o),mo=ovr(me),sc=[];
  for(const t of L.teams){const i=t.id;if(o.stars>=4&&isFCS(t))continue;const gap=C.rp[i]-lvl,need=Math.min(1,C.np[i][pi]/2),prox=rcProx(o.st,C.st[i]);
    sc.push([i,rcFit(P,i,C)*.6+need*.35+prox*.5-(gap>0?gap*2.4:-gap*1.3)+Math.random()*.35,need,prox])}
  sc.sort((a,b)=>b[1]-a[1]);
  return sc.slice(0,rint(5,8)).map(([i,s,need,prox])=>{const t=L.teams[i],ahead=t.roster.filter(p=>p.pos===o.pos&&ovr(p)>mo).length;
    const pit=[[rcScore(P,i,C,0),'Playing time'],[C.s[i][1],'Contender'],[C.s[i][2],'Pro potential'],[C.s[i][3],'NIL'],[prox,'Close to home'],[C.s[i][7],'Brand exposure']].sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);
    return {t:i,int:clamp(Math.round(48+s*24+R(-6,6)),30,98),dep:ahead+1,pit,nil:Math.max(2,Math.round((4+o.stars*o.stars*3.5)*(.35+C.s[i][3]))),v:0,need:Math.round(need*100)}}).sort((a,b)=>b.int-a.int);
}
function rtgStartCareer(off){
  const st=SETUP,L=st.L,o=st.rtg,t=L.teams[off.t],p=rtgMakePlayer(o);
  if(t.roster.length>=ROSTER_CAP){const same=t.roster.filter(x=>x.pos===o.pos).sort((a,b)=>ovr(a)-ovr(b)),pool=same.length>POS_COUNTS[o.pos]?same:t.roster.slice().sort((a,b)=>ovr(a)-ovr(b));t.roster=t.roster.filter(x=>x!==pool[0])}
  t.roster.push(p);assignNumbers(t);L.user=t.id;
  L.rtg={v:1,pid:p.id,pos:o.pos,arch:o.arch,stars:o.stars,st:o.st,team:t.id,trust:26+o.stars*3+(off.v?8:0),sp:2,xp:0,depth:null,grades:[],last:null,prac:null,
    nil:{cash:off.nil,deals:[{n:teamName(t)+' collective',amt:off.nil,season:L.season}],offer:null,got:[]},hist:[],goals:[],decl:null,result:null,moves:[],stage:'college',hs:o.hs,proj:null};
  st.coach=(t.staff&&t.staff.hc&&t.staff.hc.name)||'Head coach';if(!st.name.trim())st.name=`${fullName(p)} · Road to Glory`;
  rtgDepth(L,true);rtgGoals(L);
  startDynasty(t.id);
  LG.settings.recAuto=true;LG.news.unshift({t:`${o.stars}★ ${o.pos} ${fullName(p)} (${p.home}) signs with ${teamName(t)} and opens fall camp #${LG.rtg.depth+1} on the depth chart.`,good:true});
  saveNow(true);showHub('home');
}

/* ---------- setup screen: create a recruit, senior year, offers, visits, commit ---------- */
function rtgCreateHTML(st){
  const o=st.rtg||(st.rtg={first:'',last:'',pos:'WR',arch:0,stars:4,st:0,ci:0});
  return `<div class="card rtg-new"><div class="eyebrow">Road to Glory · create your recruit</div><div class="h2">One player, one career</div>
    <p class="note">You play only your player. The head coach calls the plays and sets the depth chart; earn his trust in practice and on Saturdays, climb from backup to starter, chase the Heisman and the NFL Draft.</p>
    <div class="grid2 su-names"><div class="field-row"><label for="rtgFirst">First name</label><input type="text" id="rtgFirst" maxlength="14" placeholder="Jaxson" value="${esc(o.first)}"></div>
      <div class="field-row"><label for="rtgLast">Last name</label><input type="text" id="rtgLast" maxlength="16" placeholder="Merchant" value="${esc(o.last)}"></div></div>
    <div class="setrow"><span class="eyebrow">Position</span><div class="seg" id="rtgPos">${RTG_POS.map(p=>`<button data-v="${p}" aria-pressed="${o.pos===p}">${p}</button>`).join('')}</div></div>
    <div class="setrow"><span class="eyebrow">Archetype</span><div class="seg" id="rtgArch">${RTG_ARCH[o.pos].map(([n],i)=>`<button data-v="${i}" aria-pressed="${o.arch===i}">${n}</button>`).join('')}</div></div>
    <div class="setrow"><span class="eyebrow">Recruit rating</span><div class="seg" id="rtgStars">${[2,3,4,5].map(s=>`<button data-v="${s}" aria-pressed="${o.stars===s}">${s}★</button>`).join('')}</div></div>
    <div class="field-row"><label for="rtgState">Home state</label><select id="rtgState">${RC_STATES.map((s,i)=>`<option value="${i}" ${i===o.st?'selected':''}>${s.st} · ${esc(s.c[0])}</option>`).join('')}</select></div>
    <div class="rtg-attrs">${PATTR[o.pos].map(k=>`<div class="rtg-at"><span>${attrName(o.pos,k)}</span><b>${a99(rtgBase(o,k))}</b></div>`).join('')}</div>
    <p class="note">${o.stars>=5?'Five stars: blue-blood offers and a real shot at playing as a freshman.':o.stars>=4?'Four stars: Power-conference offers; expect to compete for snaps.':o.stars>=3?'Three stars: solid programs; you will have to earn the job.':'Two stars: smaller schools and FCS programs. The long road.'}</p>
    <button class="btn wide" id="rtgGo">Play your senior season · see your offers</button></div>`;
}
function rtgSetupBind(st){
  const o=st.rtg,rd=()=>{o.first=$('#rtgFirst').value.trim();o.last=$('#rtgLast').value.trim();o.st=+$('#rtgState').value};
  const seg=(id,f)=>document.querySelectorAll(id+' button').forEach(b=>b.onclick=()=>{rd();f(b.dataset.v);renderSetupKeep()});
  seg('#rtgPos',v=>{o.pos=v;o.arch=0});seg('#rtgArch',v=>o.arch=+v);seg('#rtgStars',v=>o.stars=+v);
  $('#rtgState').onchange=()=>rd();
  on('rtgGo',()=>{rd();if(!o.first)o.first=pick(FIRST);if(!o.last)o.last=pick(LAST);o.ci=rint(0,RC_STATES[o.st].c.length-1);o.hs=rtgHS(o);o.offers=rtgOffers(st.L,o);rtgOffersModal(st)});
}
function rtgOffersModal(st){
  const o=st.rtg,L=st.L,h=o.hs,vis=o.offers.filter(x=>x.v).length;
  openModal(`<div class="eyebrow">Senior season · ${esc(h.team)} · ${esc(RC_STATES[o.st].c[o.ci||0])}, ${RC_STATES[o.st].st}</div><div class="h2">${esc(o.first)} ${esc(o.last)} · ${starStr(o.stars)}</div>
    <p class="note"><b>${h.rec}</b> · ${esc(h.line)}. National rank #${h.rk} · ${o.pos} · ${esc(RTG_ARCH[o.pos][o.arch][0])}.</p><div class="tags">${h.hon.map(x=>`<span class="tag gold">${esc(x)}</span>`).join('')}</div>
    <div class="setrow"><div class="h2">Scholarship offers · ${o.offers.length}</div><span class="pill">${vis}/3 official visits</span></div>
    <p class="note">An official visit shows you the depth chart and the NIL offer, and gives you a head start with that staff (coach trust). Commit when you are ready.</p>
    <div class="list">${o.offers.map((f,i)=>{const t=L.teams[f.t],dc=f.v?t.roster.filter(p=>p.pos===o.pos).sort((a,b)=>ovr(b)-ovr(a)).slice(0,3).map(p=>`${esc(p.last)} ${ovr99(p)}`).join(' · '):'';
      return `<div class="rrow rtg-off ${f.v?'sel':''}" style="--c1:${t.c1}">${badge(t)}<span class="meta"><b>${esc(teamName(t))} ${starStr(t.prestige)}</b><small>${esc(confName(t.conf,L))} · OVR ${tOvr99(teamOvr(t))} · projected #${f.dep} ${o.pos}${f.v?` · NIL ${money(f.nil)}`:''}</small>
        <span style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:11px;color:var(--mute)"><span>Interest</span>${meterHTML(f.int)}<b>${f.int}%</b></span>
        <span class="tags">${f.pit.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</span>${f.v?`<small class="note">Depth chart: ${dc||'wide open'}</small>`:''}</span>
        <span class="btns" style="flex-direction:column;gap:6px"><button class="btn sm" id="rtgCom-${i}">Commit</button>${f.v?'<span class="tag ok">Visited</span>':`<button class="btn sm ghost" id="rtgVis-${i}" ${vis>=3?'disabled':''}>Visit</button>`}</span></div>`}).join('')}</div>
    <button class="btn ghost wide" id="rtgBack">Back</button>`,true);
  on('rtgBack',closeModal);
  o.offers.forEach((f,i)=>{on('rtgVis-'+i,()=>{if(o.offers.filter(x=>x.v).length>=3)return;f.v=1;f.int=Math.min(99,f.int+rint(4,10));rtgOffersModal(st)});on('rtgCom-'+i,()=>{closeModal();rtgStartCareer(f)})});
}

/* ---------- depth chart, practice, XP, goals, NIL ---------- */
/* he sits on his position's depth chart by rating plus coach trust (±0.4 of a rating point); the CPU coach orders the rest */
function rtgDepth(L,quiet){
  const r=L.rtg,t=L.teams[L.user],me=rtgMe(L);if(!me)return null;
  const others=t.roster.filter(p=>p.pos===me.pos&&p!==me).sort((a,b)=>ovr(b)-ovr(a)),eff=ovr(me)+(r.trust-50)/50*.4;
  let i=others.findIndex(p=>ovr(p)<eff);if(i<0)i=others.length;
  const ord=others.map(p=>p.id);ord.splice(i,0,me.id);t.dco=t.dco||{};t.dco[me.pos]=ord;
  if(me.inj>0||me.redshirt)return r.depth;
  const di=depth(t,me.pos).indexOf(me);
  if(r.depth!=null&&di!==r.depth&&!quiet){r.moves.push({s:L.season,w:L.week,from:r.depth,to:di});const up=di<r.depth,ns=STARTERS[me.pos];
    L.news.unshift({t:`Depth chart: ${fullName(me)} moves ${up?'up':'down'} to #${di+1} ${me.pos}${up&&di<ns&&r.depth>=ns?' and into the starting lineup':!up&&di>=ns&&r.depth<ns?' and loses his starting job':''}.`,good:up})}
  r.depth=di;return di;
}
function rtgPractice(L,me){const r=L.rtg,d=Math.round(clamp((me.awr-3)*1.6+(me.end-3)*.8+R(-2.5,4.5),-4,7));
  const notes=d>=5?['Lit up the scout team all week','Coaches singled him out in the film room','Best practice week of the season']:d>=2?['Sharp and assignment-sound','A good week of reps','Coaches like his preparation']:d>=0?['A quiet, steady week','Solid but unspectacular']:['Missed assignments in walkthrough','Coaches want more consistency','A sloppy week of practice'];
  r.prac={s:L.season,w:L.week,d,t:pick(notes)};r.trust=clamp(r.trust+d,0,100);r.xp+=10+Math.max(0,d)*3}
function rtgSPtick(r){let n=0;while(r.xp>=100&&n<20){r.xp-=100;r.sp++;n++}}
function rtgSpend(k){const r=LG.rtg,me=rtgMe();if(!me||!PATTR[me.pos].includes(k))return false;const c=rtgCost(me[k]);if(r.sp<c||me[k]>=4.95)return false;
  r.sp-=c;me[k]=r1(Math.min(5,me[k]+.1));invalidate();r.proj=null;return true}
function rtgGoals(L){const r=L.rtg,me=rtgMe(L);if(!me)return;const st=rtgStarter(r,me);
  const tg={QB:[['py',st?2400:500,'passing yards'],['ptd',st?20:4,'passing TDs']],RB:[['ry',st?900:250,'rushing yards'],['rtd',st?8:2,'rushing TDs']],WR:[['recy',st?700:200,'receiving yards'],['rectd',st?6:2,'receiving TDs']],
    TE:[['recy',st?450:120,'receiving yards'],['rec',st?35:10,'catches']],LB:[['tkl',st?70:20,'tackles'],['sck',st?4:1,'sacks']],CB:[['tkl',st?40:12,'tackles'],['dint',st?3:1,'interceptions']],S:[['tkl',st?55:15,'tackles'],['dint',st?2:1,'interceptions']]}[me.pos];
  r.goals=[{k:'start',t:st?'Keep your starting job':'Earn a starting job'},...tg.map(([k,v,l])=>({k,v,t:`${v.toLocaleString()} ${l}`})),{k:'grade',v:6,t:'Average a B or better'}]}
function rtgGoalDone(L,g){const r=L.rtg,me=rtgMe(L);if(!me)return false;if(g.k==='start')return rtgStarter(r,me);if(g.k==='grade')return rtgAvg(r)>=g.v;return (me.ss[g.k]||0)>=g.v}
const rtgAvg=r=>{const l=r.grades.filter(x=>x.q!=null);return l.length?sum(l.map(x=>x.q))/l.length:-1};
const rtgAvgL=r=>{const a=rtgAvg(r);return a<0?'—':RTG_GR[clamp(Math.round(a),0,10)]};
function rtgProfile(L,me){const r=L.rtg,t=L.teams[L.user];let v=r.stars*6+t.prestige*3+(rtgStarter(r,me)?14:0)+Math.min(30,prodScore(me)*.35)+(me.hon||[]).length*8;
  const hw=(L.heismanWatch||[]).findIndex(h=>h.pid===me.id);if(hw>=0)v+=20-hw*2;if(rankOf(t.id))v+=6;return clamp(Math.round(v),0,100)}
function rtgNil(L,me){const n=L.rtg.nil;n.got=n.got||[];if(n.offer)return;const pf=rtgProfile(L,me),i=RTG_NIL.findIndex((x,j)=>pf>=x[0]&&!n.got.includes(j));if(i<0)return;
  n.got.push(i);n.offer={i,n:RTG_NIL[i][1],amt:Math.round(RTG_NIL[i][2]*(1+.15*(me.yr-1)))}}
function rtgNilAns(yes){const r=LG.rtg,n=r.nil,o=n.offer;if(!o)return;n.offer=null;
  if(yes){n.cash+=o.amt;n.deals.push({n:o.n,amt:o.amt,season:LG.season});LG.morale=clamp(LG.morale+1,0,100);toast(`Signed: ${o.n} · ${money(o.amt)}`)}
  else{r.trust=clamp(r.trust+1,0,100);toast('Declined · the coaches like your focus')}saveNow();rerender()}
/* draft stock: his draft grade (04d) against every draft-eligible player in the country (about 45% of them enter) */
function rtgProj(){const r=LG.rtg,me=rtgMe();if(!me)return {txt:'—',short:'—',note:''};const k=LG.season+':'+LG.week+':'+ovr(me);if(r.proj&&r.proj.k===k)return r.proj;
  const g=draftGrade(me);let n=0;for(const t of LG.teams)for(const p of t.roster)if(p!==me&&draftEligible(p)&&draftGrade(p)>g)n++;
  const pick=Math.round(n*.45)+1,rd=Math.floor((pick-1)/32)+1,ud=pick>224;
  return r.proj={k,pick,rd:ud?0:rd,txt:ud?'Undrafted free agent':`Round ${rd}${rd===1?' · pick ~'+pick:''}`,short:ud?'UDFA':'Rd '+rd,
    note:me.yr>=4?'Senior: you enter the draft after this season.':draftEligible(me)||me.yr>=3?'Eligible after this season: declare or return.':'Draft eligible after your junior season.'}}

/* ---------- the week and the game grade (03 finishWeek / processUserGame call these) ---------- */
function rtgWeek(L,w){const r=L.rtg;if(!r||r.stage!=='college')return;const me=rtgMe(L);if(!me)return;
  rtgPractice(L,me);rtgSPtick(r);rtgDepth(L);rtgNil(L,me);r.proj=null}
function rtgSS(L){const me=rtgMe(L);return me?{...me.ss}:null}
function rtgPts(pos,d,ev,snaps){const g=k=>d[k]||0,e=k=>(ev&&ev[k])||0;
  if(pos==='QB')return g('py')/20+g('ptd')*4-g('int')*5+g('ry')/10+g('rtd')*5+(g('pa')?(g('pc')/g('pa')-.6)*12:0)-e('sk')*.6-e('fum')*4;
  if(pos==='RB')return g('ry')/8+g('rtd')*5+g('rec')+g('recy')/10+g('rectd')*5+e('bt')*.8-e('fum')*5+snaps*.05;
  if(pos==='WR'||pos==='TE')return g('rec')*1.2+g('recy')/9+g('rectd')*5-e('drops')*3-e('fum')*5+e('bt')*.5+snaps*.1;
  return g('tkl')*1.1+g('sck')*4+g('dint')*6+e('pd')*2.5-e('mt')*2-e('alw')*1.3-e('tda')*3+snaps*(pos==='LB'?.04:.09)}
/* per 30 snaps against the position's B-level output; 10 pseudo-snaps of C-level play pull small samples toward a C */
function rtgQ(pos,d,ev,snaps,live){const E=RTG_E[pos],s=rtgPts(pos,d,ev,snaps)+(live?0:R(-1.5,2.5)),r=(s+10*.55*E/30)/(snaps+10)*30/E,cut=[.25,.38,.5,.65,.8,.95,1.15,1.35,1.6,2];let i=0;while(i<cut.length&&r>=cut[i])i++;return i}
function rtgLine(pos,d,ev){const g=k=>d[k]||0,e=k=>(ev&&ev[k])||0;
  if(pos==='QB')return `${g('pc')}/${g('pa')} · ${g('py')} yds · ${g('ptd')} TD · ${g('int')} INT${g('ry')?` · ${g('ry')} rush`:''}`;
  if(pos==='RB')return `${g('ry')} rush yds · ${g('rtd')} TD · ${g('rec')} rec${e('bt')?` · ${e('bt')} broken tackles`:''}`;
  if(pos==='WR'||pos==='TE')return `${g('rec')} rec · ${g('recy')} yds · ${g('rectd')} TD${ev?` · ${e('tgt')} targets${e('drops')?` · ${e('drops')} drop${e('drops')>1?'s':''}`:''}`:''}`;
  return `${g('tkl')} tkl${g('sck')?` · ${g('sck')} sck`:''}${g('dint')?` · ${g('dint')} INT`:''}${e('pd')?` · ${e('pd')} PBU`:''}${ev&&(e('mt')||e('alw'))?` · ${e('mt')} missed · ${e('alw')} allowed`:''}`}
function rtgGameDone(L,g,info,before){
  const r=L.rtg,me=rtgMe(L);if(!r||r.stage!=='college'||!me||!before)return;
  const d={};for(const k in me.ss)d[k]=(me.ss[k]||0)-(before[k]||0);
  const live=!info.simmed&&!!RTG_G.ev&&S.game===g,ev=live?RTG_G.ev:null,st=rtgStarter(r,me);
  const snaps=live?ev.snaps:(me.inj>0||me.redshirt?0:st?rint(45,62):(d.rec||d.ra||d.tkl||d.pa)||r.depth-STARTERS[me.pos]<2?rint(8,22):rint(0,8));
  if(live&&snaps>0&&!d.gp){me.ss.gp++;d.gp=1}
  const ent={s:L.season,w:L.week,opp:g.h===L.user?g.a:g.h,snaps,line:rtgLine(me.pos,d,ev),live,q:null,g:'DNP'};
  if(snaps>=3){ent.q=rtgQ(me.pos,d,ev,snaps,live);ent.g=RTG_GR[ent.q];r.trust=clamp(r.trust+[-6,-4,-2,-1,0,1,2,3,5,7,9][ent.q],0,100);r.xp+=20+ent.q*8+Math.min(30,snaps*.5)}else r.xp+=8;
  r.grades.push(ent);r.last=ent;rtgSPtick(r);
}

/* ---------- in the game: who's on the field, sideline fast-forward, the snap ---------- */
const rtgOn=()=>!!(LG&&LG.rtg&&S.home&&RTG_G.ev&&playStyle()==='rtg');
function rtgGameInit(){AUTO.exempt=LG.rtg.pid;S.rtgSwap=null;RTG_G.ev={snaps:0,tgt:0,drops:0,bt:0,mt:0,alw:0,pd:0,fum:0,tda:0,sk:0};RTG_G.alw=null;rtgFF(rtgSideTxt())}
function rtgSideTxt(){const me=rtgMe(),r=LG.rtg;if(!me)return 'On the sideline';if(me.inj>0)return `Injured · ${me.injWhy||'out this week'}`;
  if(rtgOffP(me.pos)!==uOff())return `${uOff()?'Offense':'Defense'} on the field · you're on the sideline`;
  return `On the sideline · #${(r.depth==null?0:r.depth)+1} on the ${me.pos} depth chart`}
function rtgFF(txt){kmResume();const e=$('#kmOv .km-eye');if(e)e.innerHTML='<i></i>'+esc(txt);const t=$('#kmTake');if(t)t.hidden=true}
function rtgLive(){const was=S.ff;kmStopFF();S.auto=true;S.km=null;AUTO.speed=1;
  if(was){const me=rtgMe(),b=$('#kmBan');if(!me||!b)return;b.innerHTML=`<b>YOU'RE IN</b><span>#${me.num} ${esc(me.last)} · ${me.pos}</span><small>${S.ot?'Overtime':ordQ(S.q)+' · '+fmtClock(S.clock)} · ${S.score[0]}–${S.score[1]}</small>`;
    b.hidden=false;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');clearTimeout(rtgLive.t);rtgLive.t=setTimeout(()=>{b.classList.remove('show');setTimeout(()=>{b.hidden=true},400)},2200);haptic('light')}}
/* toPresnap → kmCheck → here: line up the call (the AI's for both sides) and see whether he is in the formation */
function rtgCheck(pc){
  if(!S.home)return;S.rtgCall=null;let on=false,spec=false;rtgUnswap();
  const me=rtgMe(),side=me&&rtgOffP(me.pos)===uOff();if(side&&rtgRot(me))rtgSwap(me);
  if(uOff()){const c=apChoosePlay();S.rtgCall=c;spec=!!c.special;if(!spec){setupFormation(c,S.flip);on=!!autoSprite()}}
  else if(pc){spec=!!pc.special;if(!spec){setupFormation(pc,S.flip);on=!!autoSprite();S.dcPick=[S.front,S.cov]}}
  if(!on)rtgUnswap();
  if(on)rtgLive();else rtgFF(spec?'Special teams · simmed':rtgSideTxt());
}
/* the CPU coach rotates backups in: the next man up a good share of snaps, deeper backups now and then, everyone in a
   blowout; for that snap he swaps places with the last starter on the game's depth list (S.dc.u) */
function rtgRot(me){const r=LG.rtg,ns=STARTERS[me.pos],di=r.depth;if(di==null||di<ns||me.inj>0||me.redshirt)return false;
  const m=Math.abs(S.score[0]-S.score[1]),bl=!S.ot&&(m>=21&&S.q>=4||m>=28&&S.q>=3),base=me.pos==='QB'?.02:[.32,.18,.09][di-ns]||.03;
  return Math.random()<(bl?.6:base*(.7+r.trust/100*.6))}
function rtgSwap(me){const l=S.dc&&S.dc.u[me.pos];if(!l)return;const i=l.indexOf(me),j=rint(0,STARTERS[me.pos]-1);if(i<=j||j<0)return;const o=l[j];l[j]=me;l[i]=o;S.rtgSwap=[me.pos,me,o]}
function rtgUnswap(){const w=S.rtgSwap;if(!w)return;S.rtgSwap=null;const l=S.dc&&S.dc.u[w[0]],i=l?l.indexOf(w[1]):-1,j=l?l.indexOf(w[2]):-1;if(i>=0&&j>=0&&i<j){l[i]=w[2];l[j]=w[1]}}
const rtgHint=me=>me.side==='d'?`You are #${me.num} ${me.pl.last} · drag to move · tap to dive at the ball carrier`:me===Q?'Drag back to aim · release to throw · tap the field to scramble':
  me.role==='RB'?'Take the handoff · drag to steer · swipe to juke':'Drag to adjust your route · the QB reads the field · catch it and run';
/* the snap when he is on the field: no call sheets, the AI's call goes in and snaps on its own */
function rtgSnap(){
  $('#toBtn').hidden=true;$('#call').hidden=true;
  if(uOff()){const c=S.rtgCall;S.rtgCall=null;if(!c||c.special)return rtgFF('Special teams · simmed');pickPlay(c);$('#snapBar').hidden=true;RTG_G.snapAt=performance.now()}
  else{S.defCall='auto';S.defFront='auto';aiSnapT=1.4;const ex=autoSprite();if(ex){S.ctrl=ex;S.ctrlKey=ex.key}if(typeof BC!=='undefined')BC.presnap()}
  const me=autoSprite();hint(me?rtgHint(me):'');
}
/* every live frame (09): kicks and returns are simmed; a stalled snap goes anyway */
function rtgFrame(){
  if(playStyle()!=='rtg')return;
  if(S.phase==='kick'||(S.phase==='live'&&play&&play.st))return rtgFF('Special teams · simmed');
  if(S.phase==='presnap'&&uOff()&&S.pc&&performance.now()-RTG_G.snapAt>2600){$('#snapBar').hidden=true;startPlay(S.pc)}
}
/* his plays, from the fx bus (01b) */
onFx('snap',()=>{if(rtgOn()&&autoSprite())RTG_G.ev.snaps++});
onFx('drop',e=>{if(rtgOn()&&rtgMine(e.p))RTG_G.ev.drops++});
onFx('deflect',e=>{if(rtgOn()&&rtgMine(e.p))RTG_G.ev.pd++});
onFx('brokenTackle',e=>{if(!rtgOn())return;if(rtgMine(e.d))RTG_G.ev.mt++;if(rtgMine(e.c))RTG_G.ev.bt++});
onFx('catch',e=>{if(!rtgOn()||!e.p||e.p.user)return;const me=autoSprite();if(!me||me.side!=='d')return;const [n,nd]=nearest(DEF,e.p.x,e.p.y);if(n===me&&nd<4){RTG_G.ev.alw++;RTG_G.alw=play}});
onFx('dead',e=>{if(!rtgOn())return;const me=autoSprite();if(!me)return;const ev=RTG_G.ev;if(play&&play.intended===me)ev.tgt++;if(e.kind==='fum'&&e.p===me)ev.fum++;if(e.kind==='sack'&&me===Q)ev.sk++;if(e.kind==='td'&&RTG_G.alw&&RTG_G.alw===play)ev.tda++});
/* the post-game screen: his grade on top */
function rtgPost(){const r=LG&&LG.rtg,l=r&&r.last,me=rtgMe();if(!l||!me||l.s!==LG.season)return;const pb=$('#postBody');if(!pb)return;
  const c=l.q==null?'n':l.q>=8?'a':l.q>=5?'b':l.q>=3?'c':'f';
  pb.insertAdjacentHTML('afterbegin',`<div class="card hero rtg-post"><span class="rtg-g big g${c}">${l.g}</span><div><div class="eyebrow">Your game · #${me.num} ${esc(fullName(me))}</div><div class="h2">${esc(l.line)}</div>
    <p class="note">${l.snaps} snaps · coach trust ${Math.round(r.trust)} · #${(r.depth==null?0:r.depth)+1} on the ${me.pos} depth chart · ${r.sp} skill point${r.sp===1?'':'s'} to spend</p></div></div>`)}

/* ---------- career hub ---------- */
const rtgGC=l=>l.q==null?'n':l.q>=8?'a':l.q>=5?'b':l.q>=3?'c':'f';
function rtgHome(){
  const r=LG.rtg;if(r.stage==='done')return rtgSummaryHTML();
  if(LG.phase==='offseason')return rtgOffHTML();
  const u=T(LG.user),me=rtgMe();if(!me)return '<div class="card"><p class="note">Your player is no longer on the roster.</p></div>';
  const w=LG.weeks[LG.week],g=userGameThisWeek();let main='';
  if(LG.live&&g){const o=T(LG.live.opp);main=`<div class="card hero lvc"><div class="eyebrow"><i class="onair"></i>Game in progress · ${esc(w?w.label:'')}</div><div class="lvs">${badge(u,'lg')}<b>${LG.live.score[0]}</b><span>${LG.live.ot?'OT':qName(LG.live.q)+' · '+fmtClock(LG.live.clock)}</span><b>${LG.live.score[1]}</b>${badge(o,'lg')}</div>
    <div class="btns"><button class="btn" id="resumeGame">Resume game</button><button class="btn ghost" id="abandonGame">Sim the rest</button></div></div>`}
  else if(g)main=gameHero(g,LG.week,`<div class="btns ng-act"><button class="btn" id="playGame">${ICO.play}Play game</button><button class="btn ghost" id="simGame">Sim game</button></div>`,true);
  else if(w)main=`<div class="card bye"><div class="eyebrow">${esc(w.label)}</div><div class="h2">${LG.week>=LG.R?`${esc(u.city)}'s season is over. The postseason goes on.`:'Bye week'}</div><button class="btn" id="advWeek">Sim ${esc(w.label)}</button></div>`;
  return rtgCardHTML(me,u)+main+`<div class="grid2">${rtgWeekHTML(me)}${rtgGoalsHTML()}</div><div class="grid2">${rtgStatsHTML(me)}${rtgNilHTML(me)}</div>`;
}
function rtgCardHTML(me,u){
  const r=LG.rtg,di=r.depth==null?0:r.depth,pj=rtgProj(),stt=me.inj>0?`<span class="tag hot">${esc(me.injWhy||'Injured')} · ${me.inj} wk</span>`:rtgStarter(r,me)?'<span class="tag ok">Starter</span>':'<span class="tag">Backup</span>';
  return `<div class="card hero rtg-card" style="--c1:${u.c1};--c2:${u.c2}"><div class="rtg-id">${photoHTML(me,92,'',u,true)}<div class="rtg-nm"><div class="eyebrow">${esc(u.city)} ${esc(u.name)} · #${me.num} · ${yrStr(me)} · ${esc(me.home||'')}</div><div class="h1">${esc(fullName(me))}</div>
    <div class="tags"><span class="tag gold">${me.pos} · ${esc((RTG_ARCH[me.pos][r.arch]||RTG_ARCH[me.pos][0])[0])}</span>${starStr(r.stars)}${stt}</div></div><div class="rtg-ovr"><b>${ovr99(me)}</b><small>OVR</small></div></div>
    <div class="kpis"><div><em>Depth chart</em><b>#${di+1} ${me.pos}</b></div><div><em>Coach trust</em><b>${Math.round(r.trust)}</b></div><div><em>Season grade</em><b>${rtgAvgL(r)}</b></div><div><em>Skill points</em><b>${r.sp}</b></div><div><em>Draft stock</em><b>${pj.short}</b></div><div><em>NIL earned</em><b>${money(r.nil.cash)}</b></div></div>
    <div class="kv"><span>Coach trust</span><b>${Math.round(r.trust)}/100</b></div>${meterHTML(r.trust,'var(--ok)')}
    <div class="rtg-attrs">${PATTR[me.pos].map(k=>`<div class="rtg-at"><span>${attrName(me.pos,k)}</span><b>${a99(me[k])}</b>${me[k]<4.95?`<button class="btn sm ${r.sp>=rtgCost(me[k])?'':'ghost'}" id="rtgUp-${k}" ${r.sp>=rtgCost(me[k])?'':'disabled'}>+ ${rtgCost(me[k])} SP</button>`:'<span class="tag gold">Max</span>'}</div>`).join('')}</div>
    <div class="kv"><span>XP to the next skill point</span><b>${Math.round(r.xp)}/100</b></div>${meterHTML(r.xp,'var(--los)')}</div>`;
}
function rtgWeekHTML(me){const r=LG.rtg,l=r.last&&r.last.s===LG.season?r.last:null,p=r.prac&&r.prac.s===LG.season?r.prac:null,mv=r.moves.filter(m=>m.s===LG.season).slice(-1)[0],pj=rtgProj();
  return `<div class="card"><div class="eyebrow">This week</div><div class="list">
    ${l?`<div class="lrow"><span class="l"><span class="rtg-g g${rtgGC(l)}">${l.g}</span><span>Last game vs ${esc(T(l.opp).city)}<br><small class="note">${esc(l.line)} · ${l.snaps} snaps</small></span></span></div>`:'<p class="note">No games yet this season.</p>'}
    ${p?`<div class="lrow"><span><b>Practice</b> · ${esc(p.t)}<br><small class="note">Coach trust ${p.d>=0?'+':''}${p.d}</small></span></div>`:''}
    ${mv?`<div class="lrow"><span><b>Depth chart</b> · moved ${mv.to<mv.from?'up':'down'} to #${mv.to+1} ${me.pos}<br><small class="note">Week ${mv.w+1} · from #${mv.from+1}</small></span></div>`:''}
    <div class="lrow"><span><b>Draft projection</b> · ${esc(pj.txt)}<br><small class="note">${esc(pj.note)}</small></span></div></div></div>`}
function rtgGoalsHTML(){const r=LG.rtg;return `<div class="card"><div class="eyebrow">${LG.season} goals · +1 skill point each</div><div class="list">${r.goals.map(g=>{const ok=rtgGoalDone(LG,g);return `<div class="lrow"><span>${esc(g.t)}</span><span class="tag ${ok?'ok':''}">${ok?'Done':'Open'}</span></div>`}).join('')}</div></div>`}
function rtgStatsHTML(me){const r=LG.rtg,gs=r.grades.filter(x=>x.s===LG.season).slice(-6).reverse(),hw=(LG.heismanWatch||[]).findIndex(h=>h.pid===me.id);
  return `<div class="card"><div class="eyebrow">${LG.season} season · ${me.ss.gp} game${me.ss.gp===1?'':'s'}</div><div class="h2">${esc(statLine(me))}</div>${hw>=0?`<span class="tag gold">Heisman watch #${hw+1}</span>`:''}
    <div class="list">${gs.map(x=>`<div class="lrow"><span class="l"><span class="rtg-g g${rtgGC(x)}">${x.g}</span><span>${x.w>=LG.R?'Postseason':'Week '+(x.w+1)} · vs ${esc(T(x.opp).city)}<br><small class="note">${esc(x.line)}</small></span></span><small class="note">${x.live?'played':'simmed'}</small></div>`).join('')||'<p class="note">Game grades show up here.</p>'}</div></div>`}
function rtgNilHTML(me){const n=LG.rtg.nil,o=n.offer;return `<div class="card"><div class="setrow"><div class="eyebrow">NIL · profile ${rtgProfile(LG,me)}/100</div><span class="pill gold">${money(n.cash)}</span></div>
  ${o?`<div class="lrow rtg-nil"><span><b>${esc(o.n)}</b> wants you · ${money(o.amt)}<br><small class="note">Deals unlock as your profile grows: starting, stats, awards, Heisman buzz.</small></span><span class="btns"><button class="btn sm" id="rtgNilY">Sign</button><button class="btn sm ghost" id="rtgNilN">Pass</button></span></div>`:''}
  <div class="list">${n.deals.slice().reverse().slice(0,5).map(d=>`<div class="lrow"><span>${esc(d.n)} <small class="note">${d.season}</small></span><b>${money(d.amt)}</b></div>`).join('')}</div>
  ${o?'':'<p class="note">The next deal unlocks with a bigger profile.</p>'}</div>`}
function rtgBind(){
  if(!LG||!LG.rtg)return;const me=rtgMe();
  if(me)PATTR[me.pos].forEach(k=>on('rtgUp-'+k,()=>{if(rtgSpend(k)){saveNow();rerender();toast(`${attrName(me.pos,k)} ${a99(me[k])}`)}}));
  on('rtgNilY',()=>rtgNilAns(true));on('rtgNilN',()=>rtgNilAns(false));
  on('rtgNext',rtgOffNext);on('rtgSlots',()=>{saveNow(true);showSlots()});
  document.querySelectorAll('#rtgDecl button').forEach(b=>b.onclick=()=>{LG.rtg.decl=b.dataset.v;saveNow();rerender()});
}
function rtgOpenPlayer(id){const u=T(LG.user),p=u.roster.find(x=>x.id===id);if(!p)return;
  openModal(`<div class="pl-hd">${photoHTML(p,84,'',u,true)}<div><div class="eyebrow">${POS_NAME[p.pos]} · #${p.num} · ${yrStr(p)} · ${esc(p.home||'')}</div><div class="h2" style="font-size:26px">${esc(fullName(p))}${p.id===LG.rtg.pid?' <span class="tag gold">You</span>':''}</div></div></div>
    <div class="setrow"><span>Overall ${ovrTag(p)}</span>${p.inj>0?`<span class="tag hot">${esc(p.injWhy)} · out ${p.inj} wk</span>`:''}</div>
    ${PATTR[p.pos].map(k=>`<div class="kv"><span>${attrName(p.pos,k)}</span><b>${a99(p[k])}</b></div>`).join('')}
    <div class="kv"><span>Season</span><b>${esc(statLine(p))}</b></div><p class="note">Road to Glory: the head coach sets the depth chart and makes the roster moves.</p><button class="btn light wide" id="closeP">Done</button>`);
  on('closeP',closeModal)}

/* ---------- offseason: recap, declare or return, then the CPU runs the program's offseason ---------- */
function rtgArchive(){const r=LG.rtg,me=rtgMe();if(!me||r.archS===LG.season)return;r.archS=LG.season;
  const done=r.goals.filter(g=>rtgGoalDone(LG,g)).length;r.sp+=done;
  r.hist.push({s:LG.season,yr:yrStr(me),gp:me.ss.gp,line:statLine(me),g:rtgAvgL(r),depth:r.depth,rec:recStr(T(LG.user)),goals:done,hon:(me.hon||[]).filter(x=>x.startsWith(LG.season+' ')).map(x=>x.slice(5)),heis:!!(LG.heisman&&LG.heisman.pid===me.id)})}
const rtgLeaves=me=>me.yr>=4&&!(me.ss.gp<=4&&!me.rs);
function rtgOffHTML(){
  rtgArchive();const r=LG.rtg,me=rtgMe(),u=T(LG.user),h=LG.history[LG.history.length-1]||{},e=r.hist[r.hist.length-1]||{},pj=rtgProj();
  if(!me)return rtgSummaryHTML();
  const senior=rtgLeaves(me),elig=!senior&&draftEligible(me);
  return `<div class="card hero"><div class="eyebrow">${LG.season} season recap · ${esc(u.city)} ${h.w}–${h.l}${h.rank?' · final #'+h.rank:''}</div><div class="h1">${esc(e.line||statLine(me))}</div>
    <div class="tags"><span class="tag gold">Season grade ${esc(e.g||'—')}</span><span class="tag">${e.gp||0} games · ${e.yr||yrStr(me)}</span><span class="tag">#${(r.depth||0)+1} ${me.pos}</span>${(e.hon||[]).map(x=>`<span class="tag gold">${esc(x)}</span>`).join('')}${e.heis?'<span class="tag gold">Heisman Trophy</span>':''}</div>
    <p class="note">Goals met: ${e.goals||0} (+${e.goals||0} skill point${e.goals===1?'':'s'}). Heisman: ${esc(h.heisman||'—')}. National champion: ${esc(h.champName||'—')}.</p></div>
    ${elig?`<div class="card"><div class="h2">The NFL Draft</div><p class="note">You are draft eligible. Projection: <b>${esc(pj.txt)}</b>. Declare now, or come back for another season and raise your stock.</p>
      <div class="seg" id="rtgDecl"><button data-v="return" aria-pressed="${r.decl!=='declare'}">Return to school</button><button data-v="declare" aria-pressed="${r.decl==='declare'}">Declare for the draft</button></div></div>`:''}
    ${senior?`<div class="card"><div class="h2">Your last college season is in the books</div><p class="note">Projection: <b>${esc(pj.txt)}</b>. The draft decides where the road goes next.</p></div>`:''}
    <button class="btn wide" id="rtgNext">${senior||r.decl==='declare'?'Go to the NFL Draft':`On to the ${LG.season+1} season`}</button>`;
}
function rtgOffNext(){
  const L=LG,o=L.off,r=L.rtg;if(!o||L.phase!=='offseason')return;rtgArchive();
  if(o.stage==='recap'){L.coach.security=Math.max(L.coach.security||0,70);departures(L);o.stage='departures'}
  if(!rtgMe(L)){r.stage='done';const x=r.result;L.news.unshift({t:x&&!x.undrafted?`${r.pl?fullName(r.pl):'Your player'} is taken in round ${x.round} (No. ${x.overall}) of the NFL Draft.`:'Your player goes undrafted.',good:!!x&&!x.undrafted});saveNow(true);showHub('home');return}
  if(o.stage==='departures'){runCarousel(L);o.stage='carousel';finishCarousel(L,null)}   /* the CPU head coach stays put */
  if(o.stage==='portal'){if(o.pw==='ret'){for(const x of o.risk)x.keep=1;portalOpen(L)}if(o.pw==='open')portalResolve(L);rcEnsure(L);o.stage='recruit'}
  if(o.stage==='recruit'){if(o.recruits){signingDay(L);L.recruit=null}else rcSigningDay(L);o.stage='signing'}
  if(o.stage==='signing'){startNewSeason(L);rtgNewSeason(L);banner(L.season+' season','var(--team)')}
  saveNow(true);showHub('home');$('#hubScroll').scrollTop=0;
}
function rtgNewSeason(L){const r=L.rtg,me=rtgMe(L);if(!me)return;me.redshirt=false;r.grades=[];r.last=null;r.prac=null;r.decl=null;r.proj=null;r.trust=clamp(r.trust*.8+12,0,100);
  rtgDepth(L);rtgGoals(L);L.news.unshift({t:`${fullName(me)} opens his ${yrStr(me)} season #${r.depth+1} on the ${me.pos} depth chart.`,good:true})}
/* 03 departures: he left (graduated or declared); the draft result */
function rtgDrafted(L,pool,dr){const r=L.rtg;if(!r)return;const x=pool.find(x=>x.p.id===r.pid);if(!x)return;r.pl=JSON.parse(JSON.stringify(x.p));
  const d=dr&&dr.find(d=>d.x.p.id===r.pid);r.result=d?{round:d.round,pick:d.pick,overall:d.overall,early:!!x.declare,season:L.season}:{undrafted:true,early:!!x.declare,season:L.season}}
function rtgSummaryHTML(){
  const r=LG.rtg,p=r.pl||rtgMe()||{first:'',last:'',pos:r.pos,ss:{},cs:{}},u=T(r.team),x=r.result,c=p.cs||{},g=k=>(c[k]||0).toLocaleString();
  const head=x&&!x.undrafted?`Round ${x.round} · pick ${x.pick} (No. ${x.overall})`:x?'Undrafted free agent':'Career complete';
  const tot=rtgOffP(p.pos)?(p.pos==='QB'?`${g('py')} pass yds · ${g('ptd')} TD · ${g('int')} INT`:p.pos==='RB'?`${g('ry')} rush yds · ${g('rtd')} TD`:`${g('rec')} rec · ${g('recy')} yds · ${g('rectd')} TD`):`${g('tkl')} tackles · ${g('sck')} sacks · ${g('dint')} INT`;
  return `<div class="card hero rtg-card" style="--c1:${u.c1};--c2:${u.c2}"><div class="eyebrow">Road to Glory · career summary</div><div class="rtg-id">${photoHTML(p,92,'',u,true)}<div class="rtg-nm"><div class="h1">${esc(fullName(p))}</div>
    <div class="tags"><span class="tag gold">${p.pos}</span>${starStr(r.stars)}<span class="tag">${esc(teamName(u))}</span></div></div></div>
    <div class="h2">${esc(head)}${x&&x.early?' · early entry':''}</div><p class="note">${esc(tot)} · NIL earned ${money(r.nil.cash)} · ${r.moves.length} depth-chart move${r.moves.length===1?'':'s'}</p>
    <div class="tags">${(p.hon||[]).map(h=>`<span class="tag gold">${esc(h)}</span>`).join('')}</div></div>
    <div class="card"><div class="h2">Season by season</div><div class="tw"><table><thead><tr><th>Season</th><th>Class</th><th class="n">GP</th><th>Stats</th><th class="n">Grade</th><th class="n">Depth</th></tr></thead><tbody>
    ${r.hist.map(h=>`<tr><td>${h.s}</td><td>${esc(h.yr)}</td><td class="n">${h.gp}</td><td>${esc(h.line)}${h.hon.length?' · '+esc(h.hon.join(', ')):''}</td><td class="n">${esc(h.g)}</td><td class="n">#${(h.depth||0)+1}</td></tr>`).join('')}</tbody></table></div></div>
    <button class="btn wide" id="rtgSlots">Back to your saves</button>`;
}
