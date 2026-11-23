/* ---------- CFP rankings as a selection show (Season › Rankings › CFP) ----------
   An original studio board: the 25 with big rank numerals, team marks, record and conference, the 12-team field cut
   by a rule, byes (seeds 1–4) and automatic bids flagged, first four out and next four out.
   The reveal plays once per release (each weekly drop and Selection Day): #25 up to #1, a tap brings the next team,
   Skip shows the lot; on Selection Day it ends with the bracket (byes, first-round games, quarterfinal paths).
   No network or playoff marks: the type, rules and colours are the game's own. */
const CFPS={t:0,i:0,d:null,stage:''};
function cfpData(){
  const c=ensureCFP(LG);if(!c||!c.length)return null;
  const sel=!!LG.cfp,fin=sel||LG.week>LG.R||LG.phase==='offseason',P=LG.cfp||projectCFP(LG),seeds=(P.seeds||[]).slice(0,12);
  const last=LG.week>0&&LG.weeks[LG.week-1]?LG.weeks[LG.week-1].label:'',out=c.filter(id=>!seeds.includes(id));
  return {list:c.slice(0,25),seeds,auto:new Set(P.auto||[]),sel,fin,label:fin?'Final':last||'This week',key:LG.season+':'+(sel?'sel':'w'+LG.week),
    out1:out.slice(0,4),out2:out.slice(4,8),prev:LG.cfpPrev||[],pos:id=>c.indexOf(id)+1};
}
const cfpUnseen=()=>{const d=LG&&!LG.rtg&&LG.phase!=='offseason'?cfpData():null;return d&&LG.cfpSeen!==d.key?d:null};
function cfpMark(t,sz){const lg=typeof logoHTML==='function'?logoHTML(t,sz||40,'cfpr-lg'):'';return lg||`<span class="cfpr-mono" style="--c:${t.c1};--k:${inkOn(t.c1)}">${esc(t.abbr)}</span>`}
function cfpRow(d,id,i,link){
  const t=T(id),sd=d.seeds.indexOf(id)+1,au=d.auto.has(id),pv=d.prev.indexOf(id);
  const mv=!d.prev.length?'':pv<0?'<i class="nw">New</i>':pv>i?`<i class="up">Up ${pv-i}</i>`:pv<i?`<i class="dn">Down ${i-pv}</i>`:'';
  const tags=(sd&&sd<=4?'<span class="cft bye">Bye</span>':'')+(sd?`<span class="cft sd">Seed ${sd}</span>`:'')+(au?'<span class="cft au">Auto bid</span>':'')+(!sd&&i<12?'<span class="cft out">Out</span>':'');
  return `<div class="cfpr${sd?' in':''}${sd&&sd<=4?' bye':''}${id===LG.user?' me':''}" data-r="${i+1}"${link?` data-team="${id}"`:''} style="--c1:${t.c1}">`
    +`<b class="cfpr-n">${i+1}</b><span class="cfpr-m">${cfpMark(t)}</span><span class="cfpr-t"><b>${esc(t.city)}</b><small>${recStr(t)} · ${esc(confName(t.conf))}${mv?' '+mv:''}</small></span><span class="cfpr-x">${tags}</span></div>`;
}
function cfpLock(d,big){
  return `<div class="cfpb-lock${big?' big':''}"><span class="k">College Football Playoff</span><span class="r">Rankings</span><span class="w">${esc(d.label)}</span></div>`;
}
function cfpListHTML(d,link){
  const rows=d.list.map((id,i)=>cfpRow(d,id,i,link));
  rows.splice(Math.min(12,rows.length),0,`<div class="cfpb-cut" aria-hidden="true"><span>${d.sel?'Playoff field above this line':'Projected field above this line'}</span></div>`);
  return `<div class="cfpb-list">${rows.join('')}</div>`;
}
function cfpOutHTML(d){
  const col=(h,ids)=>ids.length?`<div class="cfpo"><div class="cfpo-h">${h}</div>${ids.map(id=>{const t=T(id);return `<div class="cfpo-r" data-team="${id}"><b>${d.pos(id)}</b>${cfpMark(t,24)}<span>${esc(t.city)}</span><small>${recStr(t)}</small></div>`}).join('')}</div>`:'';
  return `<div class="cfpb-outs">${col('First four out',d.out1)}${col('Next four out',d.out2)}</div>`;
}
/* the bracket a Selection Day show ends on, by seed: the bye team, the first-round game it waits on, the quarterfinal */
function cfpBracketHTML(d){
  const s=d.seeds;if(s.length<12)return '';const B=LG.cfp&&LG.cfp.bw||(typeof cfpBowls==='function'?cfpBowls(LG,s):{qf:[]});
  const tm=id=>{const t=T(id);return `<span class="cfb-t" style="--c1:${t.c1}"><i>${s.indexOf(id)+1}</i>${cfpMark(t,28)}<b>${esc(t.city)}</b></span>`};
  return `<div class="cfb"><div class="cfb-h">The bracket</div>${[0,1,2,3].map(k=>{const j=3-k,hi=s[4+j],lo=s[11-j],q=B.qf&&B.qf[k];
    return `<div class="cfb-path" data-k="${k}"><div class="cfb-bye"><small>Bye</small>${tm(s[k])}</div><div class="cfb-r1"><small>First round at ${esc(T(hi).stadium||T(hi).city)}</small>${tm(hi)}${tm(lo)}</div><div class="cfb-qf"><small>Quarterfinal</small><b>${esc(q&&q.n||'Quarterfinal')}</b>${q&&q.d?`<small>${esc(q.d)}</small>`:''}</div></div>`}).join('')}</div>`;
}
/* the CFP tab: the board, plus the replay button */
function cfpBoardHTML(){
  const d=cfpData();
  if(!d)return `<div class="card"><div class="h2">CFP rankings</div><p class="note">${LG.phase==='offseason'?'No CFP rankings were kept for this season.':`The first rankings come out after Week ${cfpFrom(LG)}. Until then the playoff projection uses the AP Top 25.`}</p></div>`;
  return `<section class="cfpb">${cfpLock(d)}<div class="cfpb-act"><button class="btn ghost sm" id="cfpReplay">Replay show</button></div>${cfpListHTML(d,true)}${cfpOutHTML(d)}${d.sel?cfpBracketHTML(d):''}
    <p class="note cfpb-note">The committee ranks résumés and starts fresh every week. ${d.sel?'These final rankings pick and seed the 12-team field.':'The field shown is the projection if the season ended today: five conference champions get automatic bids, and seeds 1–4 get byes.'}</p></section>`;
}
function cfpBind(){
  on('cfpReplay',()=>cfpShow(true));
  const d=cfpUnseen();if(d)setTimeout(()=>{if(TAB==='rankings'&&RANK_MODE==='cfp'&&!$('#hub').hidden&&!$('#cfpShow'))cfpShow()},120);
}
/* the reveal */
function cfpShow(){
  const d=cfpData();if(!d)return;cfpClose(true);CFPS.d=d;CFPS.i=d.list.length;CFPS.stage='list';
  const el=document.createElement('section');el.id='cfpShow';el.className='cfps';el.setAttribute('role','dialog');el.setAttribute('aria-label','College Football Playoff rankings reveal');
  el.innerHTML=`<div class="cfps-top">${cfpLock(d,true)}<button class="btn ghost sm" id="cfpSkip">Skip</button></div>
    <div class="cfps-body" id="cfpsBody">${cfpListHTML(d,false)}${d.sel?'<div class="cfps-br" hidden></div>':''}</div>
    <div class="cfps-foot"><span id="cfpsHint">Tap for the next team</span><b id="cfpsN"></b></div>`;
  el.querySelectorAll('.cfpr').forEach(r=>r.classList.add('pre'));el.querySelector('.cfpb-cut').classList.add('pre');
  $('#hub').appendChild(el);
  el.addEventListener('click',e=>{if(e.target.closest('#cfpSkip'))return;cfpNext()});
  $('#cfpSkip').onclick=()=>{if(CFPS.stage==='done')cfpClose();else cfpAll()};
  const b=$('#cfpsBody');b.scrollTop=b.scrollHeight;CFPS.t=setTimeout(cfpNext,500);
}
function cfpNext(){
  const el=$('#cfpShow'),d=CFPS.d;if(!el||!d)return;clearTimeout(CFPS.t);
  if(CFPS.stage==='list'&&CFPS.i>0){
    CFPS.i--;const r=el.querySelector(`.cfpr[data-r="${CFPS.i+1}"]`);if(r){r.classList.remove('pre');void r.offsetWidth;r.classList.add('rv');r.scrollIntoView({block:'nearest'})}
    if(CFPS.i===11){const c=el.querySelector('.cfpb-cut');if(c){c.classList.remove('pre');c.classList.add('rv')}}
    $('#cfpsN').textContent=`#${CFPS.i+1}`;
    if(CFPS.i>0){CFPS.t=setTimeout(cfpNext,CFPS.i>12?700:CFPS.i>4?1000:1500);return}
    if(d.sel){CFPS.stage='br0';$('#cfpsHint').textContent='Tap for the bracket';CFPS.t=setTimeout(cfpNext,1800);return}
    return cfpDone();
  }
  if(CFPS.stage==='br0'){const br=el.querySelector('.cfps-br');CFPS.stage='br';br.innerHTML=cfpBracketHTML(d);br.hidden=false;el.classList.add('brk');
    br.querySelectorAll('.cfb-path').forEach(p=>p.classList.add('pre'));CFPS.i=0;$('#cfpsN').textContent='';}
  if(CFPS.stage==='br'){const p=el.querySelectorAll('.cfb-path')[CFPS.i];if(p){p.classList.remove('pre');p.classList.add('rv');p.scrollIntoView({block:'nearest'});CFPS.i++;$('#cfpsHint').textContent=CFPS.i<4?'Tap for the next path':'';
      if(CFPS.i<4){CFPS.t=setTimeout(cfpNext,1600);return}}
    return cfpDone();
  }
}
function cfpAll(){
  const el=$('#cfpShow'),d=CFPS.d;if(!el||!d)return;clearTimeout(CFPS.t);
  el.querySelectorAll('.pre').forEach(r=>r.classList.remove('pre'));
  if(d.sel){const br=el.querySelector('.cfps-br');if(br.hidden){br.innerHTML=cfpBracketHTML(d);br.hidden=false}el.classList.add('brk')}
  $('#cfpsBody').scrollTop=0;cfpDone();
}
function cfpDone(){CFPS.stage='done';const el=$('#cfpShow');if(!el)return;$('#cfpsHint').textContent=CFPS.d.sel?'The field is set':`${CFPS.d.label} rankings`;$('#cfpsN').textContent='';$('#cfpSkip').textContent='Done';
  if(LG&&CFPS.d&&LG.cfpSeen!==CFPS.d.key){LG.cfpSeen=CFPS.d.key;if(typeof saveNow==='function')saveNow()}}
function cfpClose(quiet){clearTimeout(CFPS.t);const el=$('#cfpShow');if(el)el.remove();if(!quiet&&CFPS.d){if(LG&&LG.cfpSeen!==CFPS.d.key){LG.cfpSeen=CFPS.d.key;saveNow()}CFPS.d=null;if(!$('#hub').hidden)rerender()}}
/* Home: a short line when a release has not been watched yet */
function cfpHomeHTML(){const d=cfpUnseen();if(!d)return '';
  return `<div class="card cfp-new"><div class="cfpn-t"><b>${d.sel?'Selection Day':'New CFP rankings'}</b><span class="note">${d.sel?'The 12-team field and the bracket are out.':`The committee’s ${esc(d.label)} rankings are out.`}</span></div><button class="btn sm" id="cfpWatch">Watch the reveal</button></div>`}
function cfpHomeBind(){on('cfpWatch',()=>{RANK_MODE='cfp';showHub('rankings');$('#hubScroll').scrollTop=0})}
