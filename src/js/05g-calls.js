/* =========================================================
   05g · Play calling: offense/defense call sheets, coach's picks, the pre-snap Adjust menu
   (audibles, flip, hot routes, motion, hard count, slide protection), option/RPO reads,
   the double pass, defensive fronts and the talent-gap compression of ratings.
   ========================================================= */

/* ---------- talent gap: in-game ratings are compressed toward this game's mean at each position, so a
   blue blood still beats an FCS team by 35 but the box score looks like football (diminishing returns
   on huge rating gaps; even matchups are almost untouched). The roster objects are never modified. ---------- */
const GAP={knee:.5,k:.42};
function gameMeans(){
  if(!S.dc)return;const m={};
  for(const pos in STARTERS){const l=[...(S.dc.u[pos]||[]).slice(0,STARTERS[pos]),...(S.dc.a[pos]||[]).slice(0,STARTERS[pos])];if(!l.length)continue;
    const o={};for(const k of ATTR_KEYS)o[k]=sum(l.map(p=>+p[k]||0))/l.length;m[pos]=o}
  S.gm=m;
}
function gview(pl){
  const m=S.gm&&S.gm[pl.pos];if(!m)return pl;const v=Object.create(pl);
  for(const k of ATTR_KEYS){const x=pl[k];if(typeof x!=='number')continue;const d=x-m[k],a=Math.abs(d);if(a>GAP.knee)v[k]=m[k]+Math.sign(d)*(GAP.knee+(a-GAP.knee)*GAP.k)}
  return v;
}

/* ---------- defensive fronts: re-align the re-staffed slots (05 setupFormation) ---------- */
function alignFront(fk,cov,D,K){
  const F=FRONTS[fk];if(!F||fk==='nickel')return;const L=S.los,b=S.ballY,str=K.Y.y>b?1:-1,set=(p,x,y)=>{if(p){p.x=p.homeX=Math.min(119,x);p.y=p.homeY=clamp(y,1.5,FW-1.5)}};
  const Z=(k,x,y)=>Object.assign({type:'zone',k,x:Math.min(L+x,117),y:clamp(y,2,FW-2)},ZK[k]),press=['blitz','agap','firezone','cblitz'].includes(cov);
  if(F.odd){set(D.DL0,L+1,b-2.7);set(D.DL1,L+1,b);set(D.DL2,L+1,b+2.7)}
  if(fk==='34'){set(D.DL3,L+1.2,b-str*5.8)}
  if(fk==='335'){set(D.DL3,L+4.4,b);if(!press)D.DL3.cov=Z('hook',8.5,b)}
  if(fk==='43'&&D.CB2.cov.type!=='man')set(D.CB2,L+4.3,lerp(D.CB2.y,b,.4));
  if(fk==='goal'){set(D.CB2,L+1,b+str*5.3);D.CB2.cov={type:'rush'};set(D.LB0,L+3.4,b-2.3);set(D.LB1,L+3.4,b+1);set(D.S1,L+3.8,b+str*3.4);if(D.S1.cov.type==='zone')D.S1.cov=Z('hook',6,b+str*3);set(D.S0,L+6.5,b-str*3)}
}

/* ---------- designed runs: pullers, read keys (left unblocked), RPO conflict defenders ---------- */
function crashRoll(d,base){const cv=d.cov||{};let p=base-.06*((d.pl.awr||3)-3);if(cv.type==='rush'&&d.role!=='DL')p+=.2;if(cv.type==='spy')p-=.35;if(S.cov==='blitz'||S.cov==='agap')p+=.15;return Math.random()<clamp(p,.12,.88)?'crash':'home'}
function runSnap(pl){
  const r=pl.run,L=S.los,b=S.ballY,side=Math.sign(pl.gapY-b)||1;
  if(r.pull){const ol=OFF.filter(p=>p.role==='OL').sort((a,c)=>(a.y-c.y)*side);for(let i=0;i<Math.min(2,r.pull);i++){const g=ol[i===0?1:0];if(g){g.lead=true;g.pull=true}}}
  const keyBy=f=>{let best=null,bv=-1e9;for(const d of DEF){if(d.x>L+3.6||(d.role==='CB'||d.role==='S')&&d.x>L+2.6)continue;const v=f(d);if(v>bv){bv=v;best=d}}return bv>-1e8?best:null};
  let key=null;
  if(r.read)key=r.midline?keyBy(d=>d.role==='DL'&&(d.y-b)*side>.3?-Math.abs(d.y-b):-1e9):r.inv?keyBy(d=>(d.y-b)*side):keyBy(d=>(d.y-b)*-side);
  else if(r.triple){key=keyBy(d=>d.role==='DL'&&(d.y-b)*side>1.4?-Math.abs(d.y-b):-1e9);const pm=KP[r.triple];if(pm&&pm!==KP[pl.ckey]){pl.pitchMan=pm;pm.blocker=false}}
  else if(r.rpo){const rec=KP[r.rpo[0]];if(rec){const px=L+4,py=(rec.y+b)/2;let bd=1e9;for(const d of DEF){if(d.role==='DL')continue;const dd=hyp(d.x-px,d.y-py);if(dd<bd){bd=dd;key=d}}}}
  if(key){key.rdKey=true;key.rdMode=crashRoll(key,r.rpo?.45:.5);pl.rdKeyP=key}
}
/* the read key before the decision: crash the mesh, or squeeze and stay square to the QB */
function rdMove(d,dt){
  const pl=play,L=S.los,ck=KP[pl.ckey];if(pl.decided&&pl.t>pl.decT+.3)return false;
  if(d.rdMode==='crash'){steer(d,ck?ck.x+.8:L,ck?ck.y:pl.gapY,d.spd,dt);return true}
  if(pl.run&&pl.run.rpo)return false;
  steer(d,Math.max(L+.3,d.x-.15),lerp(d.y,Q.y,.12),d.spd*.42,dt);return true;
}
/* the QB's read at the mesh: give, keep, or pull and throw (awr = fewer misreads) */
function optTick(pl){
  const r=pl.run;if(!(r.read||r.triple||r.rpo)||pl.decided)return false;
  const L=S.los,b=S.ballY,side=Math.sign(pl.gapY-b)||1,decT=(r.delay||0)+(r.quick?.32:.44);if(pl.t<decT)return false;
  pl.decided=true;pl.decT=pl.t;const k=pl.rdKeyP,miss=Math.random()<clamp(.2-.04*((Q.pl.awr||3)-1),.03,.18);
  if(r.rpo){
    const box=DEF.filter(d=>d.x<L+5.5&&Math.abs(d.y-b)<6.5&&d.stun<=0).length,blk=OFF.filter(p=>p.blocker&&p.role!=='QB'&&p.key!==pl.ckey&&Math.abs(p.y-b)<6.5).length;
    let thr=!!(k&&(k.rdMode==='crash'||k.cov&&k.cov.type==='rush'))||box>blk+1,best=null,bs=-1;
    for(const key of r.rpo){const p=KP[key];if(!p||p.fallen)continue;const [,dd]=nearest(DEF,p.x,p.y,o=>o.stun<=0);if(dd>bs){bs=dd;best=p}}
    if(bs<1.5)thr=false;if(miss)thr=!thr;
    if(thr&&best){rpoThrow(pl,best);return true}
    return false;
  }
  let keep=k?k.rdMode==='crash':Math.random()<.5;if(r.inv)keep=!keep;if(miss)keep=!keep;
  if(!keep)return false;
  pl.qbCarry=true;pl.handed=true;pl.carrier=Q;if(!S.conv)ps(Q).ra++;
  pl.gapY=clamp(r.midline?b+side*3.5:r.inv?b+side*2:r.triple?b+side*6.5:b-side*6,3,FW-3);
  const ck=KP[pl.ckey];if(ck&&ck!==Q){ck.blocker=true;ck.route=null}
  toast(r.triple?'QB pulls it · pitch man trailing':'QB keeps it!');if(uOff())showActs();
  return true;
}
function rpoThrow(pl,rec){
  pl.type='pass';pl.rpoThrown=true;pl.handed=false;pl.carrier=Q;const ck=KP[pl.ckey];if(ck&&ck!==Q){ck.blocker=true;ck.route=null}
  if(!S.conv)tstat().rushAtt=Math.max(0,tstat().rushAtt-1);
  toast('RPO · pulled and thrown');aiThrow(rec);
}
/* double pass / HB pass: a lateral behind the line, then that man throws (he becomes the passer) */
function dblTick(pl){
  const h=KP[pl.dbl];if(!h||pl.thrown)return;
  if(!pl.dblPitched&&pl.t>.4&&pl.carrier===Q&&ball.state==='held'){pl.dblPitched=true;ballTo(Q,h.x+h.vx*.25,h.y+h.vy*.25,.34,h);return}
  if(pl.dblPitched&&!pl.dblDone&&ball.state==='held'&&pl.carrier===h){pl.dblDone=true;pl.handed=false;h.route=null;h.rpath=null;h.cont=null;h.blocker=true;Q=h;pl.nextRead=0;pl.hold=.25;if(uOff())hint('Now throw it · drag back to aim');showActs()}
}
/* pass protection slide: the line turns toward one side (those rushers start the rep losing) */
function slideSnap(pl){if(!uOff()||!S.slide||pl.type!=='pass')return;for(const d of DEF)if(d.cov&&d.cov.type==='rush'&&Math.sign(d.y-S.ballY)===S.slide)d.rep=-.5}
/* hard count: sometimes draws the CPU defense offside; rarely your own line jumps */
function hardCount(){
  S.hard=false;if(typeof penMul==='function'&&!penMul())return false;
  const p=clamp(.12*(typeof discOf==='function'?2-discOf(defT()):1)+(S.firstDownX-S.los<=2?.05:0),.05,.24);
  if(Math.random()<p){penPre({k:Math.random()<.5?'offs':'nzi',side:'d'},' · drawn by the hard count');return true}
  if(Math.random()<.035){penPre({k:'fs',side:'o'},' · jumped on the hard count');return true}
  if(S.clockRun&&!S.ot)S.clock=Math.max(0,S.clock-1.5);toast('No one bit on the hard count');return false;
}

/* ---------- coach's picks ---------- */
const CALL_TABS=[['pass','Pass'],['run','Run'],['rpo','RPO/Option'],['pa','Play-action'],['screen','Screens'],['trick','Trick'],['goal','Goal line']];
const ddShort=()=>S.conv?'2-pt try':`${ord(S.down)} & ${S.firstDownX>=110?'Goal':Math.max(1,Math.round(S.firstDownX-S.los))}`;
function readCov(){
  if(S.readCov)return S.readCov;let top='cover3';
  if(typeof covWeights==='function'){const w=covWeights(defT(),sitInfo());let bv=-1;for(const k in w)if(w[k]>bv){bv=w[k];top=k}}
  return S.readCov=Math.random()<.7&&S.cov?S.cov:top;
}
function coachPicks(n,filter){
  const sit=sitInfo(),cov=readCov(),last=(S.uHist||[]).slice(-2).map(h=>h.id),out=[],tabs={};
  const list=PLAYBOOK.filter(p=>!(S.conv&&p.hail)&&(!filter||filter(p))).map(p=>{const [s,why]=rateCall(p,sit,S.home,cov);return {p,s:s*(last.includes(p.id)?.35:1)*(1+((p.id*37)%11)/60),why}}).filter(x=>x.s>0).sort((a,c)=>c.s-a.s);
  for(const x of list){if(out.length>=n)break;if((tabs[x.p.tab]||0)>=2)continue;if(out.length===n-1&&out.every(o=>o.p.cat===x.p.cat)&&list.some(y=>y.p.cat!==x.p.cat&&y.s>x.s*.5&&!out.includes(y)))continue;tabs[x.p.tab]=(tabs[x.p.tab]||0)+1;out.push(x)}
  return out.map(x=>({p:x.p,why:`${ddShort()} · ${x.why}`}));
}

/* ---------- offense call sheet ---------- */
function renderCall(){
  const late=!S.ot&&S.q>=4&&S.clock<=S.qlen*.25&&S.score[0]>S.score[1],fourth=S.down===4&&!S.conv;
  $('#callHead').innerHTML=`<span class="cs-sb">${esc(S.home.abbr)} ${S.score[0]}–${S.score[1]} ${esc(S.away.abbr)} · ${S.ot?'OT':ordQ(S.q)+' '+fmtClock(S.clock)} · </span><b>${esc(ddText())}</b> · ${S.conv?'from the 3':esc(spotLabel(S.los))} · QB ${esc(Q.pl.last)} <span class="ovr">${Q.ovr}</span>${S.wx!=='Clear'?' · '+WX_ICON[S.wx]+' '+S.wx:''}${fourth?` · <span class="tag gold">Go-for-it ${Math.round(convChance()*100)}%</span>`:''}`;
  const specials=[];
  if(fourth){if(!S.ot)specials.push(['punt','Punt','Flip the field'],['fakepunt','Fake punt','Catch them napping']);const fd=fgDist();if(fd<=maxFG()+3)specials.push(['fg','Field goal',fd+' yd attempt'],['fakefg','Fake FG','Surprise run'])}
  if(late&&!S.conv)specials.push(['kneel','Kneel','Run clock · −1 yd']);
  if(!S.conv&&S.clockRun&&!S.ot&&S.down<4)specials.push(['spike','Spike','Stop the clock · uses a down']);
  if(CALL_TAB==='special'&&!specials.length)CALL_TAB='pass';
  const tabs=CALL_TABS.concat(specials.length?[['special','Special']]:[]);
  let body='',chips='';
  if(CALL_TAB==='special')body=specials.map(([k,t,s])=>`<button class="play ${k.startsWith('fake')?'warn':'alt'}" data-sp="${k}"><b>${t}</b><small>${s}</small></button>`).join('');
  else{const list=PLAYBOOK.filter(p=>p.tab===CALL_TAB&&!(S.conv&&p.hail)),fams=[...new Set(list.map(p=>FORMS[p.form].g))];if(CALL_FORM&&!fams.includes(CALL_FORM))CALL_FORM='';
    if(fams.length>1)chips=`<button class="chip" data-fm="" aria-pressed="${!CALL_FORM}">All</button>`+fams.map(f=>`<button class="chip" data-fm="${f}" aria-pressed="${CALL_FORM===f}">${f}</button>`).join('');
    body=list.filter(p=>!CALL_FORM||FORMS[p.form].g===CALL_FORM).map(p=>`<button class="pcard" data-pid="${p.id}">${playSVG(p)}<b>${esc(p.name)}</b><small>${esc(p.form)}${p.run&&p.run.rpo?' · RPO':p.run&&(p.run.read||p.run.triple||p.run.option)?' · option':p.two?' · 2-min':''}</small></button>`).join('')}
  const picks=coachPicks(3),nh=S.lastPc&&!S.conv&&S.down<4;
  $('#callRow').innerHTML=`<div class="cs-bar"><div class="cs-tabs">${tabs.map(([k,l])=>`<button data-tab="${k}" aria-pressed="${k===CALL_TAB}">${l}</button>`).join('')}</div><div class="cs-quick">${nh?`<button class="cs-q nh" data-nh="1" title="Repeat the last play at the line">No huddle<small>${esc(S.lastPc.name)}</small></button>`:''}<button class="cs-q coach" data-coach="1">Coach's pick<small>${esc(picks[0]?picks[0].p.name:'')}</small></button></div></div>`+
    (chips?`<div class="cs-chips">${chips}</div>`:'')+
    `<div class="cs-scroll"><div class="cs-picks">${picks.map(x=>`<button class="cp" data-pid="${x.p.id}"><em>Coach's pick</em><b>${esc(x.p.name)}</b><small>${esc(x.why)}</small></button>`).join('')}</div><div class="pbgrid ${CALL_TAB==='special'?'sp':''}">${body}</div></div><div class="cs-more" aria-hidden="true">Swipe up · more plays ▾</div>`;
  const row=$('#callRow');
  row.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ac();CALL_TAB=b.dataset.tab;CALL_FORM='';renderCall()});
  row.querySelectorAll('[data-fm]').forEach(b=>b.onclick=()=>{ac();CALL_FORM=b.dataset.fm;renderCall()});
  const nb=row.querySelector('[data-nh]');if(nb)nb.onclick=()=>{ac();S.hurry=true;pickPlay(S.lastPc);setTimeout(()=>{if(S.phase==='presnap'&&S.pc){$('#snapBar').hidden=true;startPlay(S.pc)}},420)};
  row.querySelector('[data-coach]').onclick=()=>{ac();const p=picks[0]?picks[0].p:aiPickPlay(S.home,sitInfo());pickPlay(p)};
  row.querySelectorAll('[data-pid]').forEach(b=>b.onclick=()=>{ac();pickPlay(PLAYBOOK[+b.dataset.pid])});
  row.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{ac();callSpecial(b.dataset.sp)});
  scrollHint(row);$('#call').hidden=false;
}
/* the "more below" pill fades once the list is scrolled to the end (or fits) */
function scrollHint(row){const sc=row.querySelector('.cs-scroll'),m=row.querySelector('.cs-more');if(!sc||!m)return;
  const upd=()=>{const end=sc.scrollTop+sc.clientHeight>=sc.scrollHeight-8;m.classList.toggle('off',end);sc.classList.toggle('end',end)};sc.onscroll=upd;requestAnimationFrame(upd)}

/* ---------- defense call sheet: fronts × coverages ---------- */
function defHead(){
  const pc=S.aiPlay,f=pc&&FORMS[pc.form];
  $('#callHead').innerHTML=`<span class="cs-sb">${esc(S.home.abbr)} ${S.score[0]}–${S.score[1]} ${esc(S.away.abbr)} · ${S.ot?'OT':ordQ(S.q)+' '+fmtClock(S.clock)} · </span><b>${esc(S.away.abbr)} ball</b> · ${esc(ddText())} · ${esc(spotLabelFor(S.los,'away'))} · <span class="tag">${esc(pc?pc.form:'')} · ${f?f.pers:'11'} personnel</span> · you control <b>#${S.ctrl.num} ${esc(S.ctrl.pl.last)}</b> <span class="ovr">${S.ctrl.ovr}</span>`;
}
function renderDefCall(){
  defHead();const sit=sitInfo(),pc=S.aiPlay;
  if(!S.dcPick)S.dcPick=[aiPickFront(S.home,sit,pc),aiPickCoverage(S.home,sit)];
  const [pf,pv]=S.dcPick,f=pc&&FORMS[pc.form],why=`${ddShort()} · ${f?f.pers:'11'} personnel${sit.toGo>=8?' · pass down':sit.toGo<=2?' · run down':''}`;
  const fr=S.defFront||'auto';
  const fronts=[['auto','Auto'],...Object.entries(FRONTS).map(([k,v])=>[k,v.n])].map(([k,l])=>`<button class="chip" data-fr="${k}" aria-pressed="${fr===k}">${l}</button>`).join('');
  $('#callRow').innerHTML=`<div class="cs-bar"><div class="cs-tabs cs-fronts"><span class="cs-lbl">Front</span>${fronts}</div></div>`+
    `<div class="cs-scroll"><div class="cs-picks one"><button class="cp" data-dc="auto"><em>Coach's call</em><b>${esc(FRONTS[pf].n)} · ${esc(COVS[pv].n)}</b><small>${esc(why)}</small></button></div>`+
    `<div class="pbgrid sp">${DEF_CALLS.map(([k,t,s])=>`<button class="play dcard ${k===S.defCall?'sel':''}" data-dc="${k}"><b>${t}</b><small>${s}</small><i class="shell s${COVS[k].shell}">${COVS[k].shell==='1'?'1-high':'2-high'}${COV_FAM[k].includes('b')?' · pressure':''}</i></button>`).join('')}<button class="play alt" data-dc="sim"><b>Sim the drive</b><small>Skip to the result</small></button></div></div><div class="cs-more" aria-hidden="true">Swipe up · more calls ▾</div>`;
  const row=$('#callRow');
  row.querySelectorAll('[data-fr]').forEach(b=>b.onclick=()=>{ac();S.defFront=b.dataset.fr;renderDefCall()});
  row.querySelectorAll('[data-dc]').forEach(b=>b.onclick=()=>{ac();const k=b.dataset.dc;
    if(k==='sim'){$('#call').hidden=true;S.phase='wait';return oppDrive(110-S.los,'Drive continues')}
    S.defCall=k;if(k==='auto'&&S.defFront&&S.defFront!=='auto')S.dcPick=[S.defFront,S.dcPick[1]];setupFormation(S.aiPlay,S.flip);$('#call').hidden=true;S.phase='presnap';aiSnapT=1.3+.8*crowdNoise();if(typeof BC!=='undefined')BC.presnap();hint(crowdNoise()>.5?'Get set… it is loud in here':'Get set…')});
  scrollHint(row);$('#call').hidden=false;
}

/* ---------- pre-snap Adjust menu (one button on the snap bar) ---------- */
function adjClose(){const m=$('#adjMenu');if(m)m.hidden=true;const b=$('#snapAdj');if(b)b.setAttribute('aria-expanded','false')}
function adjToggle(){const m=$('#adjMenu');if(!m.hidden)return adjClose();adjRender();m.hidden=false;$('#snapAdj').setAttribute('aria-expanded','true')}
function adjRender(){
  const pc=S.pc,m=$('#adjMenu');if(!pc)return;const g=FORMS[pc.form].g;
  const aud=coachPicks(4,p=>p.id!==pc.id&&FORMS[p.form].g===g&&!p.hail&&p.tab!=='trick');
  const recs=OFF.filter(p=>eligible(p)&&p!==Q);
  m.innerHTML=`<div class="adj-h">Audible <small>${esc(pc.form)} · same personnel</small></div><div class="adj-aud">${aud.map(x=>`<button data-au="${x.p.id}"><b>${esc(x.p.name)}</b><small>${esc(x.why.split(' · ').slice(1).join(' · '))}</small></button>`).join('')||'<small class="adj-none">No other plays from this set</small>'}</div>`+
    `<div class="adj-h">Tools</div><div class="adj-tools"><button data-t="flip">Flip</button><button data-t="motion"${S.motion?' disabled':''}>Motion</button><button data-t="hard" aria-pressed="${!!S.hard}">Hard count</button>`+
    (pc.cat==='pass'?`<button data-t="slide" aria-pressed="${!!S.slide}">Slide ${S.slide<0?'left':S.slide>0?'right':'off'}</button>`:'')+`</div>`+
    (pc.cat==='pass'||pc.run&&pc.run.rpo?`<div class="adj-h">Hot route <small>or tap a receiver on the field</small></div><div class="adj-tools">${recs.map(p=>`<button data-hr="${p.key}">${p.key==='R'?'RB':p.key} · ${esc(p.pl.last)}</button>`).join('')}</div>`:'');
  m.querySelectorAll('[data-au]').forEach(b=>b.onclick=()=>{ac();haptic('light');pickPlay(PLAYBOOK[+b.dataset.au]);toast('Audible · '+S.pc.name)});
  m.querySelectorAll('[data-hr]').forEach(b=>b.onclick=()=>{ac();const p=KP[b.dataset.hr];adjClose();if(p)showHot(p)});
  m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ac();const t=b.dataset.t;
    if(t==='flip'){S.flip*=-1;setupFormation(S.pc,S.flip)}
    else if(t==='motion'){adjClose();return startMotion()}
    else if(t==='hard'){S.hard=!S.hard;toast(S.hard?'Hard count on this snap':'Normal cadence')}
    else if(t==='slide'){S.slide=S.slide===0?-1:S.slide<0?1:0;toast(S.slide?`Slide protection ${S.slide<0?'left':'right'}`:'Base protection')}
    haptic('light');adjRender()});
}
