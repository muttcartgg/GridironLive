/* =========================================================
   04d · Player development, targeting suspensions, awards, NFL draft, Hall of Fame, record book, program history
   ========================================================= */

/* ---------- development ----------
   In season (devGame, after every game): players who play get small, rare +0.1 gains on their position's key ratings; starters
   and young players more, scaled by dev trait (Normal/Impact/Star/Elite), hidden potential and the Developer trait; nothing
   while injured. Offseason (progressPlayer): growth by class year × dev trait × potential × coach (Developer; QB Whisperer for
   quarterbacks) × your training (facility, regime, practice focus) × injuries (weeks hurt slow it), spent on key ratings with
   diminishing returns near the top. Declines are rare: lingering injuries, the odd senior losing a step. */
const DEV_F=[1,1.25,1.55,1.9],FOCUS_POS={passing:['QB','WR','TE'],running:['RB','OL'],conditioning:['RB','WR','CB','S'],film:['LB','CB','S','DL']};
const potOf=p=>.8+(((p.id|0)*2654435761>>>0)%1000)/2500;   /* hidden potential 0.8–1.2 */
function devGame(t,played,D){
  const gm=coachMod(t,'grow'),st=new Set();if(D)for(const pos of POS_ORDER)for(const p of D[pos].slice(0,STARTERS[pos]))st.add(p);
  for(const p of played){if(p.inj>0&&!/Suspend/.test(p.injWhy||''))continue;
    const ch=(st.size?(st.has(p)?.07:.035):.06)*[1.5,1.2,.9,.65][clamp(p.yr|0,1,4)-1]*DEV_F[p.dev|0]*gm*potOf(p);
    if(Math.random()<ch){const ks=PATTR[p.pos].filter(k=>p[k]<5);if(ks.length){const k=wpick(ks,ks.map(k=>(W8[p.pos][k]||.05)+.05));p[k]=r1(p[k]+.1)}}}
}
function progressPlayer(L,t,p,gm){
  const y=clamp(p.yr|0,1,4);let f=DEV_F[p.dev|0]*potOf(p)*gm*(p.pos==='QB'?coachMod(t,'qbxp'):1)*(1-Math.min(.45,(p.injW||0)*.04))*R(.6,1.4);
  if(t.id===L.user)f*=1+.06*(((L.fac&&L.fac.training)||1)-1)+(L.regime==='hard'?.08:L.regime==='light'?-.06:0)+((FOCUS_POS[L.focus]||[]).includes(p.pos)?.08:0);
  const ks=PATTR[p.pos],w=ks.map(k=>(W8[p.pos][k]||.05)+.08),steps=Math.round([1.25,.95,.65,.4][y-1]*f*10);
  for(let i=0;i<steps;i++){const k=wpick(ks,w.map((x,j)=>x*Math.max(.05,5-p[ks[j]])));if(p[k]<5)p[k]=r1(p[k]+.1)}
  if(Math.random()<((p.injW||0)>=4?.18:y>=4?.05:.02)){const k=pick(['spd','agi']);p[k]=r1(p[k]-R(.1,.25))}
  delete p.injW;
}
/* freshmen buried on the depth chart sit out to keep the year (CPU teams always; yours unless switched off in the Team tab) */
function autoRedshirt(L,t){
  if(t.id===L.user&&L.settings.autoRS===false)return 0;let n=0;
  for(const pos of POS_ORDER){const ps=t.roster.filter(p=>p.pos===pos).sort((a,b)=>ovr(b)-ovr(a)),keep=STARTERS[pos]+(pos==='OL'||pos==='DL'?3:2);
    ps.forEach((p,i)=>{if(p.yr===1&&!p.rs&&!p.redshirt&&i>=keep){p.redshirt=true;n++}})}
  return n;
}

/* ---------- injuries for CPU teams, targeting (2026 rule) ----------
   A targeting ejection counts for the season: after the first the player may play the next game; after the second he sits the
   first half of the next game (sus 1: half his snaps in a sim, out until halftime in a game you play); after the third he
   misses the next game (out one week, like an injury). */
const INJ_WHY=['Ankle sprain','Hamstring','Shoulder','Concussion protocol','Knee bruise','Wrist'];
function targetFoul(L,t,p){
  p.tg=(p.tg||0)+1;let what='may play next week';
  if(p.tg===2){p.sus=1;what='sits the first half of the next game'}else if(p.tg>=3){p.inj=Math.max(p.inj|0,1);p.injNew=true;p.injWhy='Suspended (targeting)';what='is suspended for the next game'}
  if(t.id===L.user&&L.news)L.news.unshift({t:`${fullName(p)} was ejected for targeting (${ordn(p.tg)} this season) and ${what}.`});
}
function simTargeting(L,g){
  for(const t of [L.teams[g.h],L.teams[g.a]]){if(!t)continue;
    if(t.id!==L.user)for(const pos of POS_ORDER){if(pos==='K')continue;for(const p of starters(t,pos))if(Math.random()<.009){p.inj=rint(1,4);p.injNew=true;p.injWhy=pick(INJ_WHY)}}
    if(Math.random()<.045){const d=pick([...starters(t,'LB'),...starters(t,'S'),...starters(t,'CB'),...starters(t,'DL')]);if(d)targetFoul(L,t,d)}}
}
function cpuUpkeep(L){
  for(const t of L.teams){if(t.id===L.user)continue;for(const p of t.roster)if(p.inj>0){if(!/Suspend/.test(p.injWhy||''))p.injW=(p.injW||0)+1;if(p.injNew)p.injNew=false;else if(--p.inj<=0){p.inj=0;p.injWhy=''}}}
}
/* games you play: half-game suspensions sit until halftime (hooks in 05-engine); ejections are counted after the final whistle */
function suspKick(){if(!S.home||!S.away)return;S.susp=[];for(const t of [S.home,S.away])for(const p of t.roster)if(p.sus===1){S.susp.push(p.id);(S.ejected||(S.ejected=[])).push(p.id)}}
function suspHalf(){const sp=S.susp||[];if(!sp.length||!S.dc)return;S.ejected=(S.ejected||[]).filter(id=>!sp.includes(id));S.susp=[];
  for(const [side,t] of [['u',S.home],['a',S.away]])for(const pos of POS_ORDER)S.dc[side][pos]=depth(t,pos);applyInjuredDepth();ejectDepth()}
function gameTargeting(L,u,opp){
  const sp=new Set((typeof S!=='undefined'&&S.susp)||[]),ej=((typeof S!=='undefined'&&S.ejected)||[]).filter(id=>!sp.has(id));
  for(const t of [u,opp])for(const p of t.roster){if(p.sus===1)delete p.sus;if(ej.includes(p.id))targetFoul(L,t,p)}
  if(typeof S!=='undefined')S.susp=[];
}

/* ---------- awards ----------
   National awards for the user's division (FBS or FCS): Heisman (finalists and a ceremony at championship week), Maxwell, Walter
   Camp, Davey O'Brien, Doak Walker, Biletnikoff, Mackey, Outland, Rimington, Bednarik, Nagurski, Butkus, Thorpe, Lou Groza, Ray
   Guy, Broyles (assistant coach), Coach of the Year; All-American first and second teams, Freshman All-Americans; every
   conference's offensive and defensive player of the year and your conference's all-conference team. */
const AA_SLOTS={QB:1,RB:2,WR:3,TE:1,OL:5,DL:4,LB:3,CB:2,S:2,K:1};
const TROPHIES=[['max','Maxwell Award','Best all-around player','QB RB WR TE','poy'],['wc','Walter Camp Award','Player of the year','QB RB WR TE DL LB CB S','poy'],
  ['dob',"Davey O'Brien Award",'Best quarterback','QB'],['dw','Doak Walker Award','Best running back','RB'],['bil','Biletnikoff Award','Best receiver','WR TE'],
  ['mac','John Mackey Award','Best tight end','TE'],['out','Outland Trophy','Best interior lineman','OL DL','line'],['rim','Rimington Trophy','Best center','OL','ctr'],
  ['bed','Chuck Bednarik Award','Defensive player of the year','DL LB CB S'],['nag','Bronko Nagurski Trophy','Best defensive player','DL LB CB S','prod'],
  ['but','Dick Butkus Award','Best linebacker','LB'],['tho','Jim Thorpe Award','Best defensive back','CB S'],['grz','Lou Groza Award','Best place-kicker','K'],['guy','Ray Guy Award','Best punter','K','punt']];
function awProd(p,s){s=s||p.ss;const g=k=>s[k]||0;switch(p.pos){
  case 'QB':return g('py')/40+g('ptd')*2.4-g('int')*2.2+g('ry')/18+g('rtd')*2.2;case 'RB':return g('ry')/14+g('rtd')*2.6+g('recy')/22+g('rectd')*2;
  case 'WR':case 'TE':return g('recy')/12+g('rectd')*2.6+g('rec')*.12;case 'DL':return g('sck')*4.5+g('tkl')*.25+g('ff')*2.5;
  case 'LB':return g('tkl')*.32+g('sck')*3+g('dint')*4+g('ff')*2;case 'CB':case 'S':return g('dint')*6+g('tkl')*.18+g('ff')*2;
  case 'K':return g('fgm')*2+(g('fga')?g('fgm')/g('fga')*12:0)}return 0}
const teamF=(L,t)=>{const g=t.rec.w+t.rec.l,r=rankList(L,t).indexOf(t.id);return (g?t.rec.w/g:.5)*12+(r>=0&&r<25?4:0)};
function awScore(L,x,kind){const p=x.p,o=x.o;if((p.ss.gp||0)<6)return o*.3;
  if(kind==='punt')return a99(p.thr)+o*.25;if(kind==='ctr')return o+a99(p.awr)*.4+x.tf;if(kind==='line')return o+x.pr*.5+x.tf*.5;
  if(kind==='prod')return x.pr*1.3+o*.4+x.tf*.5;if(kind==='poy')return x.pr*1.2+o*.5+x.tf;return o*.7+x.pr+x.tf*.6}
const awEntry=x=>({pid:x.p.id,name:fullName(x.p),pos:x.p.pos,team:x.t.id,yr:yrStr(x.p),line:statLine(x.p)});
function seasonAwards(L){
  const u=L.teams[L.user],div=u.div,C=[];
  for(const t of L.teams){if(t.div!==div)continue;const tf=teamF(L,t);for(const p of t.roster)C.push({p,t,o:ovr99(p),pr:awProd(p),tf})}
  const by={};for(const x of C)(by[x.p.pos]||(by[x.p.pos]=[])).push(x);
  const top=(pos,kind,f)=>{const l=[];for(const ps of pos.split(' '))for(const x of by[ps]||[])if(!f||f(x))l.push(x);let b=null,bs=-1e9;for(const x of l){const s=awScore(L,x,kind);if(s>bs){bs=s;b=x}}return b};
  const tro=[];for(const [k,n,d,pos,kind] of TROPHIES){const x=top(pos,kind);if(x)tro.push({k,n,d,...awEntry(x)})}
  const team=(f,slots)=>{const a=[],b=[];for(const pos of POS_ORDER){const l=(by[pos]||[]).filter(x=>!f||f(x)).map(x=>[x,awScore(L,x)]).sort((p,q)=>q[1]-p[1]),n=slots[pos]||0;
    l.slice(0,n).forEach(([x])=>a.push(awEntry(x)));l.slice(n,2*n).forEach(([x])=>b.push(awEntry(x)))}return [a,b]};
  const [aa1,aa2]=team(null,AA_SLOTS),[frosh]=team(x=>x.p.yr===1&&!x.p.rs,AA_SLOTS),[allConf,allConf2]=team(x=>x.t.conf===u.conf,AA_SLOTS);
  /* conference players of the year: every conference in your division */
  const cpoy=[];L.confs.forEach((c,ci)=>{if(c.div&&c.div!==div)return;if(!L.teams.some(t=>t.conf===ci&&t.div===div))return;const inC=x=>x.t.conf===ci;
    const o=top('QB RB WR TE','poy',inC),d=top('DL LB CB S','prod',inC);if(o||d)cpoy.push({c:ci,o:o&&awEntry(o),d:d&&awEntry(d)})});
  /* Broyles Award: the assistant whose unit beat expectations most */
  let br=null,bb=-1e9;for(const t of L.teams){if(t.div!==div)continue;const g=t.rec.w+t.rec.l;if(!g)continue;const s=staffOf(t);if(!s)continue;const wp=t.rec.w/g;
    for(const [r,v] of [['oc',t.rec.pf/g-27],['dc',27-t.rec.pa/g]]){const c=s[r];if(!c||!c.name)continue;const sc=v+wp*8+(t.cc?2:0)+(L.champ===t.id||L.champF===t.id?4:0)+Math.random();if(sc>bb){bb=sc;br={name:c.name,role:r==='oc'?'Offensive coordinator':'Defensive coordinator',team:t.id}}}}
  return {aa1,aa2,allConf,allConf2,frosh,tro,cpoy,broyles:br};
}
/* the award winners' honours stay with the player (Hall of Fame) */
function tagHonors(L,a){
  const mark=(x,h)=>{if(!x||x.team!==L.user)return;const p=L.teams[L.user].roster.find(q=>q.id===x.pid);if(p)(p.hon||(p.hon=[])).push(a.season+' '+h)};
  if(a.heisman)mark({pid:a.heisman.pid,team:a.heisman.team},'Heisman Trophy');(a.tro||[]).forEach(x=>mark(x,x.n));(a.allAm||[]).forEach(x=>mark(x,'All-American'));(a.aa2||[]).forEach(x=>mark(x,'All-American (2nd)'));
  (a.allConf||[]).forEach(x=>mark(x,'All-Conference'));(a.cpoy||[]).forEach(c=>{mark(c.o,confName(c.c)+' Offensive POY');mark(c.d,confName(c.c)+' Defensive POY')});
}
const heisVotes=list=>{const w=R(1900,2700),t=list[0]&&list[0].s||1;return list.map((x,i)=>Math.round(w*Math.pow(x.s/t,i?4:1)*(i?R(.75,.95):1)))};

/* ---------- NFL draft ----------
   Draft grade: overall + position value + production + upside for underclassmen. Juniors and redshirt sophomores declare early
   when their stock is high; every departing FBS and FCS player is in the 7-round, 224-pick draft. Picks build a program's
   draft index (t.dp, fades by half each year), which feeds the 'pro potential' recruiting pitch (04b). */
const POS_VAL={QB:6,RB:-2,WR:2,TE:-1,OL:2,DL:4,LB:0,CB:3,S:0,K:-14};
const draftGrade=p=>ovr99(p)+(POS_VAL[p.pos]||0)+(p.yr<4?1.5:0)+Math.min(4,awProd(p)/25)+(['OL','DL','TE'].includes(p.pos)&&p.ht>=76?1:0);
const draftEligible=p=>p.yr>=3||(p.yr===2&&p.rs);
/* only juniors with a real draft grade leave early: ~110 early entrants a year league-wide, ~4–7 at the deepest programs (was ~400, up to 16 a team) */
const declareOdds=p=>(p.yr===3||(p.yr===2&&p.rs))?clamp((draftGrade(p)-92)/8,0,.85):0;
function mockBoard(L){const all=[];for(const t of L.teams)for(const p of t.roster)if(draftEligible(p))all.push({p,t,g:draftGrade(p)});return all.sort((a,b)=>b.g-a.g).slice(0,32)}
function runDraft(L,pool){
  const ord=pool.map(x=>({...x,g:draftGrade(x.p)+R(-2.5,2.5)})).sort((a,b)=>b.g-a.g).slice(0,224),cnt={},first={};
  const picks=ord.map((x,i)=>{cnt[x.t.id]=(cnt[x.t.id]||0)+1;if(i<32)first[x.t.id]=(first[x.t.id]||0)+1;return [fullName(x.p),x.p.pos,x.t.id,ovr99(x.p),yrStr(x.p),x.declare?1:0]});
  for(const t of L.teams){t.dp=Math.round(((t.dp||0)*.5+(cnt[t.id]||0)+(first[t.id]||0)*.5)*10)/10;if(cnt[t.id])t.nfl=(t.nfl||0)+cnt[t.id]}
  L.draft={season:L.season,picks};
  L.draftHist=[{season:L.season,top:Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,n])=>[+id,n,first[id]||0]),u:cnt[L.user]||0,u1:first[L.user]||0},...(L.draftHist||[])].slice(0,10);
  const h=L.history[L.history.length-1];if(h&&h.season===L.season)h.dp=cnt[L.user]||0;
  return ord.map((x,i)=>({x,round:Math.floor(i/32)+1,pick:i%32+1,overall:i+1}));
}

/* ---------- careers, Hall of Fame, record book ---------- */
function careerAdd(L){
  const u=L.teams[L.user];
  for(const p of u.roster){if(!p.ss||!p.ss.gp)continue;const c=p.cs||(p.cs={});for(const k in p.ss)if(p.ss[k]&&Number.isInteger(p.ss[k]))c[k]=(c[k]||0)+p.ss[k];p.cy=(p.cy||0)+1}
  const cr=(k,label,f)=>{for(const p of u.roster)if(p.cs){const v=f(p.cs);if(v>0)setRecord(L,k,label,v,fullName(p),'career')}};
  cr('cPass','Passing yards, career',c=>c.py||0);cr('cRush','Rushing yards, career',c=>c.ry||0);cr('cRec','Receiving yards, career',c=>c.recy||0);
  cr('cTD','Total TDs, career',c=>(c.ptd||0)+(c.rtd||0)+(c.rectd||0));cr('cTkl','Tackles, career',c=>c.tkl||0);cr('cSck','Sacks, career',c=>c.sck||0);cr('cInt','Interceptions, career',c=>c.dint||0);
}
const careerLine=p=>{const c=p.cs||{},g=k=>c[k]||0;if(p.pos==='QB')return `${g('py').toLocaleString()} pass yds · ${g('ptd')} TD`;if(p.pos==='RB')return `${g('ry').toLocaleString()} rush yds · ${g('rtd')} TD`;
  if(p.pos==='WR'||p.pos==='TE')return `${g('rec')} rec · ${g('recy').toLocaleString()} yds · ${g('rectd')} TD`;if(p.pos==='K')return `${g('fgm')}/${g('fga')} FG`;if(p.pos==='OL')return `${g('gp')} games`;
  return `${g('tkl')} tackles · ${g('sck')} sacks · ${g('dint')} INT`};
function hofCheck(L,p){
  const hon=p.hon||[],w=h=>/Heisman/.test(h)?45:/All-American \(2nd\)/.test(h)?6:/All-American/.test(h)?12:/All-Conference/.test(h)?3:/POY/.test(h)?6:15;
  const sc=sum(hon.map(w))+awProd(p,p.cs||{})/(p.pos==='OL'?1:4)+(p.cy||0)*2+(p.pos==='OL'?(p.cs&&p.cs.gp||0)*.4:0);
  if(sc<40)return false;
  (L.hof||(L.hof=[])).unshift({n:fullName(p),pos:p.pos,s:L.season,y:p.cy||1,line:careerLine(p),hon:hon.slice(-6),sc:Math.round(sc),t:L.user});L.hof=L.hof.sort((a,b)=>b.s-a.s||b.sc-a.sc).slice(0,60);
  return true;
}
const REC_EXTRA={sSck:['Sacks, season',[9,16]],sTkl:['Tackles, season',[110,150]],sInt:['Interceptions, season',[6,10]]};
function seedExtraRecords(L){if(!L.records)L.records={};for(const k in REC_EXTRA)if(!L.records[k])L.records[k]={label:REC_EXTRA[k][0],v:rint(...REC_EXTRA[k][1]),who:pick(FIRST)+' '+pick(LAST),season:L.season-rint(3,40)}}

/* ---------- screens ---------- */
const tmA=id=>{const t=LG.teams[id];return t?esc(t.abbr||t.city):''};
const awRow=(x,tag)=>x?`<div class="lrow ${x.team===LG.user?'me':''}"><span class="l"><span class="num">${x.pos}</span><span><b>${esc(x.name)}</b> <small class="note">${tmA(x.team)}${x.yr?' · '+esc(x.yr):''}</small>${x.line?`<br><small class="note">${esc(x.line)}</small>`:''}</span></span>${tag?`<span class="tag gold">${esc(tag)}</span>`:''}</div>`:'';
function heisCeremonyHTML(h){if(!h)return '';const f=h.finalists||[];
  return `<div class="card aw-heis"><div class="eyebrow">${h.season} Heisman Trophy ceremony · New York</div><div class="aw-win">${badge(T(h.team),'lg')}<div><b>${esc(h.name)}</b><small>${esc(h.pos)} · ${esc(T(h.team).city)}</small><small class="note">${esc(h.line||'')}</small></div></div>
  ${f.length?`<div class="list">${f.map((x,i)=>`<div class="lrow ${x.team===LG.user?'me':''}"><span class="l"><span class="num">${i+1}</span><span>${esc(x.name)} <small class="note">${esc(x.pos)} · ${tmA(x.team)}</small></span></span><b>${x.pts?x.pts.toLocaleString()+' pts':''}</b></div>`).join('')}</div>`:''}</div>`}
function awardsHTML(a){
  if(!a)return '<p class="note">No awards yet.</p>';
  const tbl=(l,h)=>l&&l.length?`<div class="card"><div class="h2">${h}</div><div class="list">${l.map(x=>awRow(x)).join('')}</div></div>`:'';
  return `<div class="eyebrow">${a.season} season</div><div class="h2">Awards</div>${heisCeremonyHTML(a.heisman)}
  <div class="aw-grid">${(a.tro||[]).map(x=>`<div class="aw-t ${x.team===LG.user?'me':''}"><em>${esc(x.n)}</em><b>${esc(x.name)}</b><small>${esc(x.pos)} · ${tmA(x.team)}</small></div>`).join('')}
    ${a.broyles?`<div class="aw-t ${a.broyles.team===LG.user?'me':''}"><em>Broyles Award</em><b>${esc(a.broyles.name)}</b><small>${esc(a.broyles.role)} · ${tmA(a.broyles.team)}</small></div>`:''}
    ${a.coy!=null?`<div class="aw-t ${a.coy===LG.user?'me':''}"><em>Coach of the Year</em><b>${a.coy===LG.user?esc(LG.coach.name):esc(((T(a.coy).staff||{}).hc||{}).name||'Head coach')}</b><small>${tmA(a.coy)}</small></div>`:''}</div>
  ${a.cpoy&&a.cpoy.length?`<div class="card"><div class="h2">Conference players of the year</div><div class="tw"><table><thead><tr><th>Conference</th><th>Offense</th><th>Defense</th></tr></thead><tbody>${a.cpoy.map(c=>`<tr><td>${esc(confName(c.c))}</td><td>${c.o?esc(c.o.name)+' <small class="note">'+c.o.pos+' · '+tmA(c.o.team)+'</small>':'—'}</td><td>${c.d?esc(c.d.name)+' <small class="note">'+c.d.pos+' · '+tmA(c.d.team)+'</small>':'—'}</td></tr>`).join('')}</tbody></table></div></div>`:''}
  <div class="grid2">${tbl(a.allAm,'All-America · first team')}${tbl(a.aa2,'All-America · second team')}</div>
  <div class="grid2">${tbl(a.allConf,'All-'+esc(confName(T(LG.user).conf))+' · first team')}${tbl(a.frosh,'Freshman All-America')}</div>`;
}
function openAwards(i){const a=(LG.awards||[])[i||0];openModal(awardsHTML(a)+'<button class="btn light wide" id="awX">Done</button>',true);on('awX',closeModal)}
function mockHTML(){
  if(LG.phase!=='regular')return '';const b=mockBoard(LG);if(!b.length)return '';
  return `<div class="card"><div class="setrow"><div class="h2">Mock draft · round 1</div><span class="pill">${LG.season+1} NFL Draft</span></div><div class="list mock">${b.map((x,i)=>`<div class="lrow ${x.t.id===LG.user?'me':''}"><span class="l"><span class="num">${i+1}</span><span data-team="${x.t.id}"><b>${esc(fullName(x.p))}</b> <small class="note">${x.p.pos} · ${yrStr(x.p)} · ${tmA(x.t.id)}</small></span></span>${ovrTag(x.p)}</div>`).join('')}</div><p class="note">Juniors and redshirt sophomores high on the board may declare early.</p></div>`;
}
function draftHTML(){
  const d=LG.draft;if(!d||d.season!==LG.season)return '';const mine=d.picks.map((x,i)=>[x,i]).filter(([x])=>x[2]===LG.user),h=(LG.draftHist||[])[0];
  const row=([x,i])=>`<div class="lrow ${x[2]===LG.user?'me':''}"><span class="l"><span class="num">${i+1}</span><span><b>${esc(x[0])}</b> <small class="note">${x[1]} · ${tmA(x[2])}${x[5]?' · early entry':''}</small></span></span><span class="tag ${i<32?'gold':''}">Rd ${Math.floor(i/32)+1} · ${i%32+1}</span></div>`;
  return `<div class="grid2"><div class="card"><div class="h2">${d.season+1} NFL Draft · first round</div><div class="list">${d.picks.slice(0,32).map((x,i)=>row([x,i])).join('')}</div></div>
    <div class="card"><div class="h2">Your draft picks · ${mine.length}</div><div class="list">${mine.map(row).join('')||'<p class="note">No players drafted.</p>'}</div>
    ${h?`<div class="eyebrow" style="margin-top:12px">Most players drafted</div><div class="list">${h.top.map(([id,n,f])=>`<div class="lrow ${id===LG.user?'me':''}"><span class="l">${badge(T(id),'sm')}<span>${esc(T(id).city)}</span></span><b>${n}${f?` <small class="note">(${f} in Rd 1)</small>`:''}</b></div>`).join('')}</div>`:''}
    <p class="note">224 picks over 7 rounds. Draft picks raise your program's pull with recruits who care about pro potential.</p></div></div>`;
}
function recordBookHTML(){
  const R0=LG.records||{},ks=Object.keys(R0),grp=[['Game',k=>k[0]==='g'],['Season',k=>k[0]==='s'],['Career',k=>k[0]==='c']];
  return `<div class="card"><div class="h2">Record book</div>${ks.length?grp.map(([g,f])=>{const l=ks.filter(f);return l.length?`<div class="eyebrow" style="margin-top:8px">${g}</div><div class="list">${l.map(k=>{const r=R0[k];return `<div class="lrow"><span class="l"><span>${esc(r.label)}: <b>${esc(r.who)}</b> <small class="note">${r.season}${r.extra&&r.extra!=='career'?' · '+esc(r.extra):''}</small></span></span><b>${(+r.v).toLocaleString()}</b></div>`}).join('')}</div>`:''}).join(''):'<p class="note">Records are set when you play games.</p>'}</div>`;
}
function hofHTML(){const H=LG.hof||[];
  return `<div class="card"><div class="h2">Hall of Fame</div>${H.length?`<div class="list">${H.map(h=>`<div class="lrow"><span class="l"><span class="num">${h.pos}</span><span><b>${esc(h.n)}</b> <small class="note">${esc(T(h.t!=null?h.t:LG.user).abbr)} · class of ${h.s} · ${h.y} season${h.y===1?'':'s'}</small><br><small class="note">${esc(h.line)}${h.hon.length?' · '+esc(h.hon.slice(-3).join(', ')):''}</small></span></span></div>`).join('')}</div>`:'<p class="note">Players with great careers (big numbers, All-America teams, national awards) are inducted when they leave.</p>'}</div>`}
function timelineHTML(){const H=LG.history.slice().reverse();if(!H.length)return '';
  return `<div class="card"><div class="h2">Program history</div><ol class="tl">${H.map(h=>{const tg=[h.champ?'National champions':'',h.cc?'Conference champions':'',h.madePO?`CFP #${h.seed} seed`:'',h.bowl?`${h.bowl.name} ${h.bowl.won?'win':'loss'}`:'',h.coy?'Coach of the Year':''].filter(Boolean);
    return `<li class="${h.champ?'gold':''}"><span class="tl-y">${h.season}</span><div><b>${h.w}–${h.l}${h.rank?` · #${h.rank}`:''}</b> <small class="note">${esc(T(h.team!=null?h.team:LG.user).city)}</small><div class="tags">${tg.map(x=>`<span class="tag ${/champ/i.test(x)?'gold':''}">${esc(x)}</span>`).join('')}${(h.tro||[]).map(x=>`<span class="tag blue">${esc(x)}</span>`).join('')}${h.aa?`<span class="tag">${h.aa} All-American${h.aa>1?'s':''}</span>`:''}${h.dp?`<span class="tag">${h.dp} drafted</span>`:''}</div></div></li>`}).join('')}</ol></div>`}
