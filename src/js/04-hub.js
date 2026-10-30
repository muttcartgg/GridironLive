/* =========================================================
   04 · Hub UI: save slots, team picker, dynasty hub, offseason
   ========================================================= */
let TAB='home',SETUP=null,ROSTER_FILTER='All';
/* team badge: the generated shield, or the imported logo on a light shield once it loads (02c-packs.js) */
const badge=(t,cls='')=>{const u=typeof teamLogoURL==='function'?teamLogoURL(t):'';return `<span class="badge ${cls}${u?' hl':''}" style="--c1:${t.c1};--c2:${t.c2};--bt:${inkOn(t.c1)}">${u?`<img src="${esc(u)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('ok')" onerror="this.remove()"><span class="ab">${esc(t.abbr)}</span>`:esc(t.abbr)}</span>`};
const recStr=t=>`${t.rec.w}–${t.rec.l}`;
const tcell=(t,label)=>`<div class="tname" data-team="${t.id}" style="cursor:pointer">${badge(t,'sm')}<span>${esc(label||rankTag(t.id)+t.city)}</span></div>`;
function applyTeamTheme(t){const r=document.documentElement.style;r.setProperty('--team',t.c1);r.setProperty('--team2',t.c2);r.setProperty('--btn-ink',inkOn(t.c1))}
function applyStyle(){document.documentElement.dataset.style=(LG&&LG.settings.style)||'modern'}
let saveTimer=null;
function saveNow(now){if(!LG||!SLOT)return;clearTimeout(saveTimer);saveTimer=null;if(now){Saves.save(SLOT,LG);return}saveTimer=setTimeout(()=>{saveTimer=null;Saves.save(SLOT,LG)},700)}
function flushSave(){if(saveTimer){clearTimeout(saveTimer);saveTimer=null;Saves.save(SLOT,LG)}}
function hideAll(){['#hub','#setup','#post','#modal','#card','#pausem','#call','#opt','#kick','#sb','#pauseBtn','#toBtn','#bulletBtn','#snapBar','#actBar','#celebBtn','#celebSheet','#replayBtn','#replayBar','#hotBar','#photoBar','#wm','#pauseInfo','#ticker','#wpG','#dbm','#studio'].forEach(s=>$(s).hidden=true);$('#lower').classList.remove('on');document.documentElement.classList.remove('ticker');hint('')}
function openModal(html,wide){$('#modalBody').className='panel'+(wide?' wide':'');$('#modalBody').innerHTML=html;$('#modal').hidden=false;$('#modal').scrollTop=0}
const closeModal=()=>{$('#modal').hidden=true};
const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};
/* pregame odds for team a (homeEdge: 1 home, 0 neutral, -1 road) from the point-spread model in 05w-winprob.js */
const winProb=(a,b,homeEdge)=>winProbPre(a,b,homeEdge||0);

/* ---------- shared menu helpers (title, team select, hub, pregame) ---------- */
const deepC=t=>lum(t.c1)>.6&&lum(t.c2)<lum(t.c1)?t.c2:t.c1;   /* the darker team color, for gradients behind white text */
const starsHTML=n=>{n=clamp(Math.round(n||0),0,5);return `<span class="stars" role="img" aria-label="Prestige ${n} of 5">${'★'.repeat(n)}<i>${'★'.repeat(5-n)}</i></span>`};
const fitOf=t=>{const o=tOvr99(teamOvr(t)),p=t.prestige;return o>=92||p>=5?['gold','Contender']:o>=86||p>=4?['blue','Top 25']:o<70||p<=1?['hot','Rebuild']:p<=2&&o>=78?['ok','Sleeper']:['','Build-up']};
const cfpOf=id=>{const i=(LG.cfpRank||[]).indexOf(id);return i>=0&&i<25?i+1:null};
const ordinal=n=>n+(['st','nd','rd'][((n+90)%100-10)%10-1]||'th');
const KICK={Noon:'12:00 PM',Afternoon:'3:30 PM',Primetime:'7:30 PM'};
/* forecast high for a game (same curve the broadcast uses on game day, without the random part) */
const fcTemp=(g,wk)=>{const b=84-(wk||0)*3.2-(g.slot==='Primetime'?7:g.slot==='Noon'?-3:0);return Math.round(g.wx==='Snow'?27:g.wx==='Rain'?Math.max(38,b-6):Math.max(30,b))};
const lineStr=(a,b,s)=>{const v=Math.round(Math.abs(s)*2)/2;return v<.5?'Pick ’em':`${(s>0?a:b).abbr} −${v}`};
const ICO={play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  code:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
/* the slot meta keeps the imported logo (if any) so the title screen can show it without opening the save */
if(!Saves._lg){const t0=Saves.touch;Saves._lg=1;Saves.touch=function(slot,L){t0.call(this,slot,L);try{const u=L.teams[L.user],lg=typeof teamLogoURL==='function'?teamLogoURL(u):'';if(lg){const m=this.meta();if(m.slots[slot]){m.slots[slot].logo=lg;this.writeMeta(m)}}}catch(e){}}}

/* title screen backdrop: two light towers, sweeping beams and drifting haze on a tiny canvas the CSS scales up (soft for free).
   ~30 fps, stops as soon as the title screen is hidden; one still frame with reduced motion. */
const Stage={raf:0,
  run(){const cv=$('#stageCv'),sc=$('#setup');if(!cv||this.raf)return;const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;let last=-99;
    const loop=t=>{this.raf=0;if(sc.hidden||!sc.classList.contains('title'))return;if(t-last>=32){last=t;this.draw(cv,t/1000)}if(!rm)this.raf=requestAnimationFrame(loop)};
    this.raf=requestAnimationFrame(loop)},
  draw(cv,t){
    const W=220,H=clamp(Math.round(W*innerHeight/Math.max(1,innerWidth)),90,520);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}
    const x=cv.getContext('2d');x.clearRect(0,0,W,H);x.globalCompositeOperation='lighter';
    const port=H>W,ty=H*(port?.075:.13),len=Math.hypot(W,H)*1.15;
    for(const [tx,s] of [[W*.1,1],[W*.9,-1]]){
      for(let i=0;i<3;i++){
        const a=Math.PI/2-s*((port?.28:.62)+i*(port?.17:.24))+Math.sin(t*.32+i*1.9+s*.7)*.045,sp=.075+i*.012,fl=.85+.15*Math.sin(t*1.7+i*2.3+s);
        const g=x.createLinearGradient(tx,ty,tx+Math.cos(a)*len*.8,ty+Math.sin(a)*len*.8);
        g.addColorStop(0,`rgba(255,246,222,${.2*fl})`);g.addColorStop(.45,`rgba(205,220,255,${.07*fl})`);g.addColorStop(1,'rgba(205,220,255,0)');
        x.fillStyle=g;x.beginPath();x.moveTo(tx,ty);x.lineTo(tx+Math.cos(a-sp)*len,ty+Math.sin(a-sp)*len);x.lineTo(tx+Math.cos(a+sp)*len,ty+Math.sin(a+sp)*len);x.closePath();x.fill();
      }
      const gl=x.createRadialGradient(tx,ty,0,tx,ty,W*.16);gl.addColorStop(0,'rgba(255,250,235,.9)');gl.addColorStop(.18,'rgba(255,240,205,.32)');gl.addColorStop(1,'rgba(255,240,205,0)');
      x.fillStyle=gl;x.fillRect(tx-W*.16,ty-W*.16,W*.32,W*.32);
      x.fillStyle='rgba(255,255,250,.95)';for(let r=0;r<2;r++)for(let c=0;c<4;c++)x.fillRect(tx-6+c*3.4,ty-3+r*3.2,2,2);
    }
    for(const [cx,cy,r,c] of [[.32+.12*Math.sin(t*.07),.5,.75,'rgba(90,130,210,.07)'],[.7+.1*Math.cos(t*.05),.68,.6,'rgba(120,150,220,.06)'],[.5,.98,.7,'rgba(70,170,110,.08)']]){
      const h=x.createRadialGradient(cx*W,cy*H,0,cx*W,cy*H,r*Math.max(W,H*.6));h.addColorStop(0,c);h.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=h;x.fillRect(0,0,W,H)}
    x.globalCompositeOperation='source-over';
  }};
addEventListener('resize',()=>{const sc=$('#setup');if(sc&&!sc.hidden&&sc.classList.contains('title'))Stage.run()});

const WHATS_NEW=[
  ['112-play playbook','12 formations with real RPO and option reads: the QB gives, keeps, pulls or throws off the read defender.'],
  ['New play calling','Category tabs, formation chips, route art, three Coach’s picks, and a snap bar with audibles, motion, hard counts and hot routes.'],
  ['Smarter defense and CPU','6 fronts × 13 coverages and blitzes; the CPU calls by situation, runs a two-minute drill and goes for it by the numbers.'],
  ['2026 rules','Penalties called during plays, targeting with replay review, the college clock and current NCAA overtime.'],
  ['Live turnovers','Loose balls bounce, players dive for them, and pick-sixes and scoop-and-scores happen naturally.'],
  ['Special teams you play','Kickoffs, squibs and onside kicks, punts with gunners and muffs, blocked kicks and the fair catch kick.'],
  ['Passing and coverage','Accuracy, arm strength, tipped balls, contested catches, press jams and pattern-matching zones.'],
  ['TV broadcast package','A new score bug, big-moment graphics, win probability with swing callouts, and rebuilt pregame and halftime shows.'],
  ['Rankings that feel real','An AP poll that moves like voters, CFP committee rankings from Week 10 and the 12-team playoff.'],
  ['Gameday look','New stadium, crowds, player models, animations, field markings, lighting by kickoff time and a 7-person officiating crew.'],
  ['Real rosters (optional)','Import 2026 rosters and logos for every FBS and FCS program from a file.']];

/* ---------- title screen + save slots ---------- */
function showSlots(){
  hideAll();S.phase='menu';LG=null;SLOT=null;document.documentElement.dataset.style='modern';
  const m=Saves.meta();$('#setup').classList.add('title');
  const card=n=>{const s=m.slots[n];
    if(!s)return `<button class="slot empty" id="slotNew-${n}"><span class="sl-plus" aria-hidden="true">+</span><span class="h2">New dynasty</span><span class="note">Slot ${n} · empty</span></button>`;
    const t={abbr:s.abbr,c1:s.c1,c2:s.c2,logo:s.logo},wk=/^Week (\d+)$/.exec(s.label||''),bak=KV.get('gl3.bak'+n);
    return `<div class="slot full" style="--c1:${s.c1};--c2:${s.c2};--d:${deepC(t)}">
      <div class="sl-head"><span class="sl-wm" aria-hidden="true">${esc(s.abbr)}</span>${badge(t,'lg')}<div class="sl-id"><small>Slot ${n}${s.live?' · <i class="sl-live">Game in progress</i>':''}</small><b>${esc(s.team)}</b><span>${esc(s.coach)} · ${esc(s.name)}</span></div></div>
      <div class="sl-stats"><div><em>Record</em><b>${esc(s.rec)}</b></div><div><em>Season</em><b>${s.season}</b></div><div><em>Week</em><b class="${wk?'':'sm'}">${esc(wk?wk[1]:s.label||'—')}</b></div><div><em>Titles</em><b>${s.titles||0}</b></div></div>
      <div class="sl-foot"><span>Last played ${timeAgo(s.updated)}</span>${s.titles?`<span class="tag gold">${s.titles}× champion</span>`:''}</div>
      <div class="btns"><button class="btn" id="slotGo-${n}">${s.live?'Resume':'Continue'}</button><button class="btn ghost sm" id="slotDel-${n}">Delete</button>${bak?`<button class="btn ghost sm" id="slotBak-${n}">Restore backup · ${timeAgo(+KV.get('gl3.bakt'+n))}</button>`:''}</div>
      <div id="slotConf-${n}" class="sl-conf" hidden><p class="note" style="color:#FF8A96">Delete this dynasty for good?</p><div class="btns"><button class="btn danger sm" id="slotYes-${n}">Delete</button><button class="btn ghost sm" id="slotNo-${n}">Keep</button></div></div></div>`};
  $('#setupBody').innerHTML=`
    <header class="ttl"><div class="ttl-net"><span class="gln">GLN</span><span>College football dynasty</span></div>
      <h1 class="ttl-word" aria-label="Gridiron Live"><span class="g">Gridiron</span><span class="l"><i></i>Live</span></h1>
      <div class="ttl-sub"><span>265 programs</span><span>2026 season</span></div>
      <button class="ttl-new" id="whatsNew"><i></i>What’s new in version 7</button></header>
    <div class="eyebrow ttl-h">Your dynasties</div>
    <div class="slots">${SLOTS.map(card).join('')}</div>
    <div class="grid2 ttl-more">
      <div class="card ttl-act"><span class="ta-ic">${ICO.play}</span><div><div class="h2">Quick play</div><p class="note">Any two programs, one game, nothing saved.</p></div><button class="btn" id="quickPlay">Play</button></div>
      <div class="card ttl-act"><span class="ta-ic">${ICO.code}</span><div><div class="h2">Have a save code?</div><p class="note">Restore a dynasty from Settings › Export save.</p></div><button class="btn ghost" id="importCode">Import</button></div></div>`;
  on('quickPlay',()=>{ac();openQuickPlay()});
  on('whatsNew',()=>{openModal(`<div class="eyebrow">Gridiron Live 7</div><div class="h2">What’s new</div><ul class="wn">${WHATS_NEW.map(([h,d])=>`<li><b>${h}</b><span>${d}</span></li>`).join('')}</ul><button class="btn light wide" id="wnX">Let’s play</button>`);on('wnX',closeModal)});
  for(const n of SLOTS){
    on('slotNew-'+n,()=>showSetup(n));
    on('slotBak-'+n,()=>{openModal(`<div class="h2">Restore the backup?</div><p class="note">Slot ${n} goes back to the version saved ${timeAgo(+KV.get('gl3.bakt'+n))}. Anything after that is lost.</p><div class="btns"><button class="btn" id="bakYes">Restore</button><button class="btn ghost" id="bakNo">Cancel</button></div>`);on('bakNo',closeModal);on('bakYes',()=>{closeModal();toast(restoreBackup(n)?'Backup restored':'Backup could not be read');showSlots()})});
    on('slotGo-'+n,()=>{flushSave();const L=Saves.load(n);if(!L){toast('That save could not be opened');return}LG=L;SLOT=n;bumpUID(LG);muted=!!LG.settings.muted;applyStyle();showHub('home')});
    on('slotDel-'+n,()=>{$('#slotConf-'+n).hidden=false});on('slotNo-'+n,()=>{$('#slotConf-'+n).hidden=true});on('slotYes-'+n,()=>{Saves.del(n);showSlots()});
  }
  on('importCode',()=>{
    openModal(`<div class="eyebrow">Import save</div><div class="h2">Paste your save code</div><textarea id="codeIn" placeholder="GL3:…"></textarea>
      <div class="setrow"><span class="eyebrow">Into slot</span><div class="seg" id="codeSlot">${SLOTS.map(n=>`<button data-v="${n}" aria-pressed="${n===1}">${n}${m.slots[n]?' (replace)':''}</button>`).join('')}</div></div>
      <p class="note" id="codeErr"></p><div class="btns"><button class="btn light" id="codeGo">Import</button><button class="btn ghost" id="codeX">Cancel</button></div>`);
    let slot=1;document.querySelectorAll('#codeSlot button').forEach(b=>b.onclick=()=>{slot=+b.dataset.v;document.querySelectorAll('#codeSlot button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    on('codeX',closeModal);
    on('codeGo',()=>{try{const L=Saves.importCode($('#codeIn').value);if(!L)throw 0;Saves.save(slot,L);closeModal();showSlots();toast('Save imported')}catch(e){$('#codeErr').textContent='That code could not be read. Make sure you copied all of it.'}});
  });
  $('#setup').hidden=false;$('#setup .scroll').scrollTop=0;Stage.run();
}

/* ---------- new dynasty: team picker ---------- */
function showSetup(slot){
  hideAll();S.phase='menu';$('#setup').classList.remove('title');
  SETUP={L:genNCAALeague(),slot,coach:'',name:'',diff:1,conf:'all',div:'FBS',sort:'prestige',q:'',league:'ncaa'};if(typeof packAutoApply==='function')packAutoApply(SETUP.L);
  renderSetup();$('#setup').hidden=false;$('#setup .scroll').scrollTop=0;
}
/* the schools that pass the division / conference / search filters, in the chosen order */
function setupTeams(){
  const st=SETUP,L=st.L,q=st.q.trim().toLowerCase();let teams=L.teams.slice();
  if(st.div!=='all')teams=teams.filter(t=>t.div===st.div);
  if(st.conf!=='all')teams=teams.filter(t=>t.conf===+st.conf);
  if(q)teams=teams.filter(t=>teamName(t).toLowerCase().includes(q)||t.abbr.toLowerCase().includes(q)||(t.stadium||'').toLowerCase().includes(q));
  return teams.sort(st.sort==='ovr'?(a,b)=>teamOvr(b)-teamOvr(a):st.sort==='name'?(a,b)=>a.city.localeCompare(b.city):(a,b)=>b.prestige-a.prestige||teamOvr(b)-teamOvr(a));
}
function renderTeamGrid(){
  const L=SETUP.L,teams=setupTeams(),g=$('#teamGrid');if(!g)return;
  g.innerHTML=teams.map(t=>{const [fc,fl]=fitOf(t);return `<button class="tp" id="tp-${t.id}" style="--c1:${t.c1};--c2:${t.c2}">${badge(t,'lg')}<span class="meta"><b>${esc(t.city)}</b><small>${esc(t.name)} · ${esc(confName(t.conf,L))}</small>${starsHTML(t.prestige)}<small class="st">${esc(t.stadium||'')}${t.cap?` · ${Math.round(t.cap/1000)}K`:''}</small></span><span class="rt"><span class="o">${tOvr99(teamOvr(t))}<small>OVR</small></span><span class="od"><i>OFF <b>${tOvr99(offOvr(t))}</b></i><i>DEF <b>${tOvr99(defOvr(t))}</b></i></span>${fl?`<span class="tag ${fc}">${fl}</span>`:''}</span></button>`}).join('')||'<p class="note">No schools match that search.</p>';
  $('#teamCount').textContent=`${teams.length} ${teams.length===1?'program':'programs'}`;
  g.querySelectorAll('.tp').forEach(b=>b.onclick=()=>openTeamDetail(+b.id.slice(3)));
}
function renderSetup(){
  const st=SETUP,L=st.L;invalidate();
  const confs=L.confs.map((c,i)=>[c,i]).filter(([c])=>st.div==='all'||c.div===st.div);
  $('#setupBody').innerHTML=`
    <div class="su-head"><div><div class="eyebrow">New dynasty · slot ${st.slot}</div><div class="h1">Pick your program</div></div><button class="btn ghost sm" id="setBack">‹ Saves</button></div>
    <div class="card su-opts"><div class="grid2 su-names">
      <div class="field-row"><label for="coachName">Coach name</label><input type="text" id="coachName" maxlength="24" placeholder="Coach Merchant" value="${esc(st.coach)}"></div>
      <div class="field-row"><label for="dynName">Dynasty name</label><input type="text" id="dynName" maxlength="28" placeholder="My Dynasty" value="${esc(st.name)}"></div></div>
      <div class="setrow"><span class="eyebrow">Difficulty</span><div class="seg" id="setDiff">${[[0,'Rookie'],[1,'Varsity'],[2,'All-American'],[3,'Heisman']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${v===st.diff}">${l}</button>`).join('')}</div></div></div>
    <div class="card"><div class="setrow"><span class="eyebrow">League</span><div class="seg" id="leagueSeg">${[['ncaa','All FBS & FCS'],['original','Original schools'],['pack','Load a team pack']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${st.league===v}">${l}</button>`).join('')}</div></div>
      <p class="note">${st.league==='ncaa'?`All ${L.teams.length} Division I programs: ${L.teams.filter(t=>t.div==='FBS').length} FBS and ${L.teams.filter(isFCS).length} FCS, in their ${L.confs.length} conferences for 2026, with team colors, real rivalries and strength based on recent results. Badges use abbreviations, not official logos. ${st.L.pack?`Rosters from ${esc(st.L.pack.name)}.`:'Players are generated; import real rosters any time.'}`:st.league==='pack'?'Your team pack is loaded.':'Thirty-two original schools you can rename and recolor.'}</p>${typeof packSetupHTML==='function'?packSetupHTML(st):''}</div>
    <div class="su-filter">
      <div class="su-q"><input type="search" id="teamQ" placeholder="Search schools, mascots, stadiums" value="${esc(st.q)}" autocomplete="off" aria-label="Search schools"></div>
      ${L.teams.some(isFCS)?`<div class="chips" id="divChips">${[['FBS','FBS'],['FCS','FCS'],['all','All Division I']].map(([v,l])=>`<button class="chipbtn" data-v="${v}" aria-pressed="${st.div===v}">${l}</button>`).join('')}</div>`:''}
      <div class="chips scrollx" id="confChips"><button class="chipbtn" data-v="all" aria-pressed="${st.conf==='all'}">All conferences</button>${confs.map(([c,i])=>`<button class="chipbtn" data-v="${i}" aria-pressed="${String(i)===st.conf}">${esc(c.name)}</button>`).join('')}</div>
      <div class="setrow"><span class="eyebrow" id="teamCount"></span><div class="seg" id="sortSeg">${[['prestige','Prestige'],['ovr','Overall'],['name','A–Z']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${st.sort===v}">${l}</button>`).join('')}</div></div></div>
    <div class="teampick" id="teamGrid"></div>
    <button class="btn ghost wide" id="customProg">Build a custom program from scratch</button>`;
  renderTeamGrid();
  on('setBack',showSlots);
  $('#coachName').oninput=e=>st.coach=e.target.value;$('#dynName').oninput=e=>st.name=e.target.value;
  document.querySelectorAll('#setDiff button').forEach(b=>b.onclick=()=>{st.diff=+b.dataset.v;renderSetupKeep()});
  document.querySelectorAll('#leagueSeg button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;
    if(v==='original'){st.L=genLeague();st.league=v;st.conf='all';st.div='all';renderSetupKeep()}
    else if(v==='ncaa'){st.L=genNCAALeague();if(typeof packAutoApply==='function')packAutoApply(st.L);st.league=v;st.conf='all';st.div='FBS';renderSetupKeep()}
    else openPackImport(st.L,()=>{st.league='pack';renderSetupKeep()},true)});
  document.querySelectorAll('#divChips button').forEach(b=>b.onclick=()=>{st.div=b.dataset.v;st.conf='all';renderSetupKeep()});
  document.querySelectorAll('#confChips button').forEach(b=>b.onclick=()=>{st.conf=b.dataset.v;renderSetupKeep()});
  document.querySelectorAll('#sortSeg button').forEach(b=>b.onclick=()=>{st.sort=b.dataset.v;renderSetupKeep()});
  $('#teamQ').oninput=e=>{st.q=e.target.value;renderTeamGrid()};
  const ac2=$('#confChips [aria-pressed="true"]');if(ac2&&st.conf!=='all'){const r=$('#confChips');r.scrollLeft=ac2.offsetLeft-r.offsetLeft-16}
  on('customProg',openCustomProgram);if(typeof packSetupBind==='function')packSetupBind(st);
}
function renderSetupKeep(){const y=$('#setup .scroll').scrollTop;renderSetup();$('#setup .scroll').scrollTop=y}
function openTeamDetail(id){
  const L=SETUP.L,t=L.teams[id];applyTeamTheme(t);
  const top=t.roster.slice().sort((a,b)=>ovr(b)-ovr(a)).slice(0,5);const riv=t.rival!=null?L.teams[t.rival]:null;const [fc,fl]=fitOf(t);
  const kp=(l,v)=>{const o=tOvr99(v);return `<div><em>${l}</em><b>${o}</b>${meterHTML((o-40)/59*100,t.c1)}</div>`};
  openModal(`<div class="td-hero" style="--c1:${t.c1};--c2:${t.c2};--d:${deepC(t)}"><span class="td-wm" aria-hidden="true">${esc(t.abbr)}</span>${badge(t,'xl')}<div class="td-id"><div class="eyebrow">${esc(confName(t.conf,L))} · ${t.div}</div><div class="h2">${esc(t.city)}</div><div class="td-m">${esc(t.name)}</div><div class="td-tags">${starsHTML(t.prestige)}${fl?`<span class="tag ${fc}">${fl}</span>`:''}</div></div></div>
    <div class="kpis td-k">${kp('Overall',teamOvr(t))}${kp('Offense',offOvr(t))}${kp('Defense',defOvr(t))}</div>
    <div class="list">
      <div class="lrow"><span class="note">Stadium</span><span>${esc(t.stadium)} · ${(t.cap/1000).toFixed(0)}K seats</span></div>
      <div class="lrow"><span class="note">Rival</span><span>${riv?esc(riv.city)+' · '+esc(t.trophy):'None'}</span></div>
      <div class="lrow"><span class="note">AD expectation</span><span>${adTarget(t)}+ wins a season</span></div>
    </div>
    <div><div class="eyebrow" style="margin-bottom:4px">Best players</div><div class="list">${top.map(p=>`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span>${esc(fullName(p))} · ${yrStr(p)}</span></span>${ovrTag(p)}</div>`).join('')}</div></div>
    <div class="btns cta"><button class="btn" id="coachHere">Coach here</button><button class="btn ghost" id="tdEdit">Edit look</button><button class="btn ghost" id="tdX">Back</button></div>`);
  on('tdX',closeModal);on('tdEdit',()=>openEditor(id,()=>openTeamDetail(id),SETUP.L));
  on('coachHere',()=>startDynasty(id));
}
function openCustomProgram(){
  const L=SETUP.L;
  openModal(`<div class="eyebrow">Build from scratch</div><div class="h2">Create your program</div><p class="note">Your new school starts at one-star prestige with a thin roster. It takes a spot in the conference you choose.</p>
    <div class="field-row"><label for="cpCity">School</label><input type="text" id="cpCity" maxlength="22" placeholder="Riverside State"></div>
    <div class="field-row"><label for="cpName">Mascot</label><input type="text" id="cpName" maxlength="16" placeholder="Thunder"></div>
    <div class="field-row"><label for="cpAbbr">Abbreviation</label><input type="text" id="cpAbbr" maxlength="4" placeholder="RSU" style="text-transform:uppercase"></div>
    <div class="colors"><div class="field-row"><label for="cpC1">Primary</label><input type="color" id="cpC1" value="#6A1B9A"></div><div class="field-row"><label for="cpC2">Secondary</label><input type="color" id="cpC2" value="#F2C230"></div></div>
    <div class="field-row"><label for="cpConf">Conference</label><select id="cpConf">${L.confs.map((c,i)=>c.ind?'':`<option value="${i}">${esc(c.name)} · ${c.div}</option>`).join('')}</select></div>
    <p class="note" id="cpErr"></p>
    <div class="btns"><button class="btn" id="cpGo">Create &amp; coach</button><button class="btn ghost" id="cpX">Cancel</button></div>`);

  on('cpX',closeModal);
  on('cpGo',()=>{
    const city=$('#cpCity').value.trim(),name=$('#cpName').value.trim();if(!city||!name){$('#cpErr').textContent='Give your school a name and a mascot.';return}
    const conf=+$('#cpConf').value;const slotT=L.teams.filter(t=>t.conf===conf).sort((a,b)=>qOf(a)-qOf(b))[0];
    const fresh=genTeam(slotT.id,city,name,$('#cpC1').value,1,conf,{exact:true,div:slotT.div,q:slotT.div==='FCS'?1.2:1.7});
    if(slotT.rival!=null){const r=L.teams[slotT.rival];r.rival=null;slotT.rival=null}
    Object.assign(slotT,{city,name,abbr:($('#cpAbbr').value.trim()||city.slice(0,3)).toUpperCase().slice(0,4),c1:$('#cpC1').value,c2:$('#cpC2').value,prestige:1,q:fresh.q,roster:fresh.roster,stadium:city+' Stadium',cap:22000});
    invalidate();resetRecords(L);buildSchedule(L);updateRankings(L);startDynasty(slotT.id);
  });
}
function startDynasty(id){
  const st=SETUP,L=st.L;closeModal();
  L.user=id;L.coach.name=st.coach.trim()||'Coach';L.name=st.name.trim()||`${L.teams[id].city} Dynasty`;L.settings.diff=st.diff;L.coach.schools=[id];
  const t=L.teams[id];L.fac={stadium:clamp(t.prestige-1,1,5),training:clamp(t.prestige-1,1,5),rehab:clamp(t.prestige-2,1,5)};
  L.captains=t.roster.filter(p=>p.yr>=3).sort((a,b)=>ovr(b)-ovr(a)).slice(0,2).map(p=>p.id);
  L.nil=300+t.prestige*120;setHomecoming(L);seedRecords(L);
  L.news=[{t:`${L.coach.name} is introduced as head coach of ${teamName(t)}. The AD expects ${adTarget(t)}+ wins.`,good:true}];
  LG=L;SLOT=st.slot;SETUP=null;applyStyle();saveNow(true);showHub('home');
}

/* ---------- hub ---------- */
const TABS=[['home','Home'],['schedule','Schedule'],['rankings','Rankings'],['playoff','Playoff'],['feed','Feed'],['team','Roster'],['program','Program'],['stats','Stats'],['league','League'],['settings','Settings']];
function showHub(tab){
  const prev=TAB,wasHidden=$('#hub').hidden;
  invalidate();hideAll();if(tab)TAB=tab;S.phase='hub';applyStyle();
  const u=T(LG.user);applyTeamTheme(u);
  const ap=rankOf(u.id),cfp=u.div==='FBS'?cfpOf(u.id):null,top=$('#hubTop');top.style.setProperty('--hd',deepC(u));
  top.innerHTML=`<span class="ht-wm" aria-hidden="true">${esc(u.abbr)}</span>${badge(u,'lg')}<div class="who"><small>${LG.season} · ${esc(weekLabel(LG))} · ${esc(confName(u.conf))}</small><b>${esc(u.city)} <span>${esc(u.name)}</span></b><small>${esc(LG.coach.name)}</small></div>
    <div class="ht-stats"><div><em>Record</em><b>${recStr(u)}</b></div><div><em>Conf</em><b>${u.rec.cw}–${u.rec.cl}</b></div><div class="${ap?'g':''}"><em>${u.div==='FCS'?'FCS':'AP'}</em><b>${ap?'#'+ap:'NR'}</b></div>${cfp?`<div class="g"><em>CFP</em><b>#${cfp}</b></div>`:''}</div>
    <div class="pills"><span class="pill" title="Coaching credits">${LG.credits} CC</span><span class="pill" title="NIL collective">${money(LG.nil)} NIL</span></div>`;
  $('#tabs').innerHTML=TABS.map(([k,l])=>`<button role="tab" id="tab-${k}" aria-selected="${TAB===k}">${k==='home'&&LG.phase==='offseason'?'Offseason':l}${k==='home'&&LG.event?'<span class="dot"></span>':''}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{showHub(b.id.slice(4));$('#hubScroll').scrollTop=0});
  const hb=$('#hubBody');
  hb.innerHTML=({home:hubHome,schedule:hubSchedule,rankings:hubRankings,playoff:hubPlayoff,feed:hubFeed,team:hubTeam,program:hubProgram,stats:hubStats,league:hubLeague,settings:hubSettings})[TAB]();
  bindHub();$('#hub').hidden=false;applyAccess();
  const nav=$('#tabs'),tb=$('#tab-'+TAB);if(tb)nav.scrollLeft=tb.offsetLeft-nav.offsetLeft-(nav.clientWidth-tb.offsetWidth)/2;
  /* tab changes slide in from the side they come from; same-tab refreshes (settings toggles, upgrades) don't animate */
  hb.classList.remove('fade','fwd','back');
  if(wasHidden||prev!==TAB){const d=TABS.findIndex(x=>x[0]===TAB)-TABS.findIndex(x=>x[0]===prev);void hb.offsetWidth;hb.classList.add('fade');if(!wasHidden&&d)hb.classList.add(d>0?'fwd':'back')}
  if(TAB==='home'&&LG.event&&$('#modal').hidden)openEvent();
}
function rerender(){const y=$('#hubScroll').scrollTop;showHub();$('#hubScroll').scrollTop=y}

/* next-game card, split in both teams' colors: ranks, records, line, win odds, kickoff, forecast (home tab + pregame) */
function gameHero(g,wi,extra,link){
  const u=T(LG.user),opp=T(g.h===LG.user?g.a:g.h),home=g.h===LG.user&&!g.neutral,site=home?1:g.neutral?0:-1,w=LG.weeks[wi];
  const wp=winProb(u,opp,site),sp=pointSpread(u,opp,site),venue=g.neutral?'Neutral site':(home?u:opp).stadium;
  const side=(t,c)=>{const r=rankOf(t.id);return `<div class="ng-t ${c}"${link?` data-team="${t.id}"`:''}>${badge(t,'xl')}<div class="tx"><small>${r?`<i>#${r}</i> · `:''}${recStr(t)} · ${t.rec.cw}–${t.rec.cl} ${esc(confName(t.conf))}</small><b>${esc(t.city)}</b><em>${esc(t.name)} · OVR ${tOvr99(teamOvr(t))}</em></div></div>`};
  return `<div class="card ng" style="--a:${deepC(u)};--b:${deepC(opp)};--a1:${u.c1};--b1:${opp.c1}">
    <div class="ng-bar"><span class="gln">GLN</span><span class="ng-wk">${esc(w?w.label:'')} · ${g.neutral?'Neutral':home?'Home':'Away'}</span><span class="ng-ko">${esc(KICK[g.slot]||g.slot||'')} <small>ET</small></span></div>
    <div class="ng-mu">${side(u,'a')}<div class="ng-mid"><span class="at">${home||g.neutral?'VS':'AT'}</span><span class="ln">${esc(lineStr(u,opp,sp))}</span></div>${side(opp,'b')}</div>
    <div class="ng-wp" style="--w:${(wp*100).toFixed(1)}%"><b>${pct(wp)}</b><span class="bar"><i></i><i></i></span><b>${pct(1-wp)}</b><em>Win odds</em></div>
    <div class="ng-meta"><span>${WX_ICON[g.wx]||''} ${esc(g.wx||'Clear')} · ${fcTemp(g,wi)}°</span><span>${esc(venue||'')}</span>${gameFlags(LG,g,wi).map(([c,l])=>`<span class="tag ${c}">${esc(l)}</span>`).join('')}</div>
    ${extra||''}</div>`;
}
function hubHome(){
  if(LG.phase==='offseason')return hubOffseason();
  const u=T(LG.user),w=LG.weeks[LG.week],g=userGameThisWeek();
  let main='';
  if(LG.live&&g){const o=T(LG.live.opp);main+=`<div class="card hero lvc"><div class="eyebrow"><i class="onair"></i>Game in progress · ${esc(w?w.label:'')}</div>
    <div class="lvs">${badge(u,'lg')}<b>${LG.live.score[0]}</b><span>${LG.live.ot?'OT':qName(LG.live.q)+' · '+fmtClock(LG.live.clock)}</span><b>${LG.live.score[1]}</b>${badge(o,'lg')}</div>
    <div class="lvn"><span>${esc(u.city)}</span><span>${esc(o.city)}</span></div>
    <div class="btns"><button class="btn" id="resumeGame">Resume game</button><button class="btn ghost" id="abandonGame">Sim the rest</button></div></div>`}
  else if(g)main+=gameHero(g,LG.week,`<div class="btns ng-act"><button class="btn" id="playGame">${ICO.play}Play game</button><button class="btn ghost" id="simGame">Sim game</button></div>`,true);
  else if(w){
    main+=`<div class="card bye"><div class="eyebrow">${esc(w.label)}</div><div class="h2">${LG.week>=LG.R?'Your season is over. The postseason goes on.':'Bye week'}</div><div class="list">${w.games.slice(0,10).map(x=>`<div class="lrow"><span class="l">${tcell(T(x.h))} <span class="note">vs</span> ${tcell(T(x.a))}</span><span class="note">${esc(x.tag||'')}</span></div>`).join('')}</div><button class="btn" id="advWeek">Sim ${esc(w.label)}</button></div>`;
  }
  const tgt=adTarget(u),sec=LG.coach.security,R=LG.R||13;
  const cs=confStandings(LG,u.conf),cpos=cs.findIndex(t=>t.id===LG.user)+1,ap=rankOf(u.id),cfp=u.div==='FBS'?cfpOf(u.id):null;
  const track=LG.weeks.slice(0,R).map((wk,i)=>{const x=wk.games.find(z=>z.h===LG.user||z.a===LG.user);const c=!x?'bye':x.hs==null?'':((x.h===LG.user?x.hs>x.as:x.as>x.hs)?'w':'l');return `<i class="${c}${i===LG.week?' now':''}"></i>`}).join('');
  const season=`<div class="card sp"><div class="sp-top"><div><div class="eyebrow">${LG.season} season</div><div class="sp-wk">${LG.week<R?`Week ${LG.week+1}<small>of ${R}</small>`:esc(w?w.label:'Postseason')}</div></div>
    <div class="sp-k"><div><em>Record</em><b>${recStr(u)}</b></div>${cpos?`<div><em>${esc(confName(u.conf))}</em><b>${ordinal(cpos)}</b></div>`:''}<div class="${ap?'g':''}"><em>${u.div==='FCS'?'FCS':'AP'}</em><b>${ap?'#'+ap:'NR'}</b></div>${cfp?`<div class="g"><em>CFP</em><b>#${cfp}</b></div>`:''}</div></div>
    <div class="sp-track" aria-hidden="true">${track}</div><div class="sp-foot"><span>${u.rec.cw}–${u.rec.cl} in conference</span><span>AD expects ${tgt}+ wins</span></div></div>`;
  const ad=`<div class="card"><div class="eyebrow">Athletic director</div><div class="kv"><span>Expectation</span><b>${tgt}+ wins</b></div><div class="kv"><span>Job security</span><b class="${sec<30?'res-l':''}">${sec<25?'Hot seat':sec<50?'Uneasy':sec<80?'Stable':'Untouchable'}</b></div>${meterHTML(sec)}
    <div class="kv"><span>Fan approval</span><b>${Math.round(LG.fan)}%</b></div>${meterHTML(LG.fan)}<div class="kv"><span>Locker room</span><b>${Math.round(LG.morale)}%</b></div>${meterHTML(LG.morale)}</div>`;
  const heis=LG.heismanWatch&&LG.heismanWatch.length?`<div class="card"><div class="eyebrow">Heisman watch</div><div class="list">${LG.heismanWatch.map((h,i)=>`<div class="lrow"><span class="l"><span class="rank">${i+1}</span>${badge(T(h.team),'sm')}<span><b>${esc(h.name)}</b> <span class="note">${h.pos}</span><br><small class="note">${esc(h.line)}</small></span></span></div>`).join('')}</div></div>`:'';
  const potw=LG.potw?`<div class="card"><div class="eyebrow">${confName(u.conf)} player of the week</div><div class="tname">${badge(T(LG.potw.team))}<span><b>${esc(LG.potw.name)}</b> · ${LG.potw.pos} · ${esc(T(LG.potw.team).city)}</span></div></div>`:'';
  const lw=LG.lastWeek?`<div class="card"><div class="eyebrow">Around the league · ${esc(LG.lastWeek.label)}</div><div class="list">${LG.lastWeek.games.filter(x=>x.h===LG.user||x.a===LG.user||(x.tag&&!/First Round|Second Round/.test(x.tag))||x.upset||((x.rh||x.ra)&&T(x.h).div===u.div)||T(x.h).conf===u.conf).sort((a,b)=>((b.h===LG.user||b.a===LG.user)-(a.h===LG.user||a.a===LG.user))||(!!(b.rh||b.ra)-!!(a.rh||a.ra))).slice(0,14).map(x=>{const hw=x.hs>x.as;return `<div class="lrow"><span class="l">${tcell(T(x.h),(x.rh?'#'+x.rh+' ':'')+T(x.h).city)}<b class="${hw?'res-w':''}">${x.hs}</b><span class="note">–</span><b class="${!hw?'res-w':''}">${x.as}</b>${tcell(T(x.a),(x.ra?'#'+x.ra+' ':'')+T(x.a).city)}</span>${x.upset?'<span class="tag hot">Upset</span>':x.tag?`<span class="note">${esc(x.tag)}</span>`:''}</div>`}).join('')}</div></div>`:'';
  const news=LG.news.length?`<div class="card news"><div class="eyebrow">Top news</div><div class="list">${LG.news.slice(0,4).map((n,i)=>`<div class="lrow${i?'':' lead'}"><span>${n.good?'<span class="tag ok">Program</span> ':''}${esc(n.t)}</span></div>`).join('')}</div></div>`:'';
  const conf=`<div class="card"><div class="eyebrow">${confName(u.conf)} standings</div><div class="tw"><table><thead><tr><th>Team</th><th class="n">Conf</th><th class="n">All</th></tr></thead><tbody>${cs.map(t=>`<tr class="${t.id===LG.user?'me':''}"><td>${tcell(t)}</td><td class="n">${t.rec.cw}–${t.rec.cl}</td><td class="n">${recStr(t)}</td></tr>`).join('')}</tbody></table></div></div>`;
  return main+`<div class="grid2">${season}${news||conf}</div>`+gameOfWeek()+`<div class="grid2">${ad}${heis||potw}</div>${lw||news?`<div class="grid2">${lw}${news?conf:''}</div>`:''}${potw&&heis?`<div class="grid2">${potw}</div>`:''}`;
}
function hubSchedule(){
  const rows=LG.weeks.map((w,i)=>{const g=w.games.find(x=>x.h===LG.user||x.a===LG.user);if(!g)return w.kind==='reg'?`<tr class="${i===LG.week?'me':''}"><td>Wk ${i+1}</td><td class="note">Bye week</td><td></td></tr>`:'';const home=g.h===LG.user,opp=T(home?g.a:g.h);
    let res='';if(g.hs!=null){const us=home?g.hs:g.as,them=home?g.as:g.hs;res=`<span class="${us>them?'res-w':'res-l'}">${us>them?'W':'L'} ${us}–${them}</span>`}else res=i===LG.week?'<span class="tag blue">Next</span>':`<span class="note">${WX_ICON[g.wx]}</span>`;
    const fl=gameFlags(LG,g,i).filter(f=>f[1]!=='Conference game').map(([c,l])=>`<span class="tag ${c}">${esc(l)}</span>`).join(' ');
    return `<tr class="${i===LG.week?'me':''}"><td>${esc(w.kind==='reg'?'Wk '+(i+1):'Post')}</td><td><div class="tname">${g.neutral?'vs':home?'vs':'at'} ${badge(opp,'sm')}<span>${esc(rankTag(opp.id)+teamName(opp))}</span></div>${fl?`<div class="tags" style="margin-top:4px">${fl}</div>`:''}</td><td class="n">${res}</td></tr>`}).join('');
  return `<div class="card"><div class="h2">${LG.season} schedule</div><p class="note">Twelve games with a bye, conference games late and Rivalry Week to finish. Conference title games, bowls and the playoffs follow (12-team CFP for FBS, 24-team bracket for FCS).</p><div class="tw"><table><thead><tr><th>Week</th><th>Opponent</th><th class="n">Result</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
let RANK_DIV=null;
let RANK_MODE='top',RES_WEEK=null,RES_FILTER='all';
/* résumé hint against one poll: record vs that poll's Top 25 and the best win */
function rankHint(id,list,pre){
  const pos={};list.slice(0,25).forEach((x,i)=>pos[x]=i+1);const pw=LG.power||{};let w=0,l=0,best=null;
  for(const wk of LG.weeks)for(const g of wk.games){if(g.hs==null||(g.h!==id&&g.a!==id))continue;const o=g.h===id?g.a:g.h,won=winner(g)===id;
    if(pos[o]){if(won)w++;else l++}
    if(won&&(best==null||(pos[o]||99)<(pos[best]||99)||((pos[o]||99)===(pos[best]||99)&&(pw[o]||0)>(pw[best]||0))))best=o}
  const bw=best==null?'':`beat ${pos[best]?'#'+pos[best]+' ':''}${esc(T(best).abbr)}`;
  return w+l?`${w}–${l} vs ${pre}Top 25${bw?' · '+bw:''}`:bw?bw[0].toUpperCase()+bw.slice(1):(T(id).rec.l?'No wins yet':'');
}
function hubRankings(){
  const u=T(LG.user),hasF=LG.teams.some(isFCS),cfp=RANK_MODE==='cfp',pdiv=RANK_DIV||u.div,div=cfp?'FBS':pdiv;const list=(div==='FCS'?LG.rankF:LG.rank)||[];
  const toggle=hasF&&!cfp?`<div class="chips" id="rankDiv">${['FBS','FCS'].map(d=>`<button class="chipbtn" data-v="${d}" aria-pressed="${div===d}">${d}</button>`).join('')}</div>`:'';
  const modes=`<div class="seg" id="rankMode">${[['top',pdiv==='FCS'?'FCS Top 25':'AP Top 25'],['cfp','CFP'],['all','All teams'],['res','Results']].map(([k,l])=>`<button data-v="${k}" aria-pressed="${RANK_MODE===k}">${l}</button>`).join('')}</div>`;
  const ri=id=>(LG.rinfo||{})[id]||{};
  const bestTxt=id=>{const r=ri(id);if(r.best==null)return '—';const o=T(r.best),rk=rankOf(r.best);return `${rk?'#'+rk+' ':''}${esc(o.abbr)} (+${r.bestM})`};
  const worstTxt=id=>{const r=ri(id);if(r.worst==null)return '—';const o=T(r.worst),rk=rankOf(r.worst);return `${rk?'#'+rk+' ':''}${esc(o.abbr)} (${r.worstM})`};
  const pw=r=>r.pow!=null?(r.pow>0?'+':'')+r.pow:'—';
  const row=(id,i,full)=>{const t=T(id),r=ri(id);return `<tr class="${id===LG.user?'me':''}"><td class="n">${i+1}${i<25?rankMove(id,i,div):''}</td><td>${tcell(t,teamName(t))}</td><td class="n">${recStr(t)}</td><td class="n">${r.vr?r.vr[0]+'–'+r.vr[1]:'—'}</td><td class="note hide-s">${bestTxt(id)}</td>${full?`<td class="note hide-s">${worstTxt(id)}</td>`:''}<td class="n">${r.sos||'—'}</td><td class="n">${pw(r)}</td></tr>`};
  const head=full=>`<thead><tr><th class="n">#</th><th>Team</th><th class="n">Rec</th><th class="n">vs Top 25</th><th class="hide-s">Best win</th>${full?'<th class="hide-s">Worst loss</th>':''}<th class="n">SOS</th><th class="n">Power</th></tr></thead>`;
  /* AP / CFP Top 25 metrics: rank (+movement) and team stay pinned while the résumé columns scroll sideways on a phone.
     SOS rank, best win, worst loss and power come from L.rinfo; one pass over the season's games adds the scores, the record
     against this poll's own Top 25, and an opponent-quality pick when rinfo has none yet. */
  const pollTab=(lst,prevL,pre)=>{
    const top=lst.slice(0,25),pos={},M={},pwr=LG.power||{},seeds=pre&&LG.cfp&&LG.cfp.seeds||[],cfpV=seeds.length>0;
    top.forEach((id,i)=>{pos[id]=i+1;M[id]={v:[0,0],b:null,w:null}});
    const qual=o=>pwr[o]!=null?+pwr[o]:ri(o).pow!=null?ri(o).pow:-(pos[o]||99);
    for(const wk of LG.weeks)for(const g of wk.games){if(g.hs==null)continue;
      for(const [id,o,f,a] of [[g.h,g.a,g.hs,g.as],[g.a,g.h,g.as,g.hs]]){const m=M[id];if(!m)continue;const r=ri(id),x={o,f,a};
        if(f>a){if(pos[o])m.v[0]++;if(r.best!=null?o===r.best&&(!m.b||f-a===r.bestM):!m.b||qual(o)>qual(m.b.o))m.b=x}
        else{if(pos[o])m.v[1]++;if(r.worst!=null?o===r.worst&&(!m.w||f-a===r.worstM):!m.w||qual(o)<qual(m.w.o))m.w=x}}}
    const opp=x=>`<b>${pos[x.o]?'#'+pos[x.o]+' ':''}${esc(T(x.o).abbr)}</b> ${x.f}–${x.a}`,pg=(n,gp)=>gp?(n/gp).toFixed(1):'—';
    const rows=top.map((id,i)=>{const t=T(id),r=ri(id),m=M[id],gp=t.rec.w+t.rec.l,sd=seeds.indexOf(id)+1,pv=r.pow!=null?r.pow:pwr[id]!=null?+(+pwr[id]).toFixed(1):null;
      return `<tr class="${id===LG.user?'me':''}"><td class="n mrk">${i+1}${rankMove(id,i,div,prevL)}</td><td class="mtm"><div class="tname" data-team="${t.id}" style="cursor:pointer" title="${esc(teamName(t))}">${badge(t,'sm')}<span class="mab">${esc(t.abbr)}</span><span class="mct">${esc(t.city)}</span></div></td>`
        +(cfpV?`<td class="n">${sd?`<span class="tag ${sd<=4?'gold':'blue'}">${sd}</span>`:''}</td>`:'')
        +`<td class="n">${recStr(t)}</td><td class="n">${isInd(LG,t)?'—':t.rec.cw+'–'+t.rec.cl}</td><td class="n">${r.sos||'—'}</td><td>${m.b?opp(m.b):'—'}</td><td>${m.w?opp(m.w):'—'}</td>`
        +`<td class="n">${gp?m.v[0]+'–'+m.v[1]:'—'}</td><td class="n">${pv!=null?(pv>0?'+':'')+(+pv).toFixed(1):'—'}</td><td class="n">${pg(t.rec.pf,gp)}</td><td class="n">${pg(t.rec.pa,gp)}</td></tr>`}).join('');
    return `<p class="note mswipe">Swipe the table sideways for conference record, SOS, best win, worst loss, power and scoring.</p><div class="tw mtw"><table class="rtab mtab"><thead><tr><th class="n mrk">#</th><th class="mtm">Team</th>${cfpV?'<th class="n">Seed</th>':''}<th class="n">Rec</th><th class="n">Conf</th><th class="n">SOS</th><th>Best win</th><th>Worst loss</th><th class="n">vs Top 25</th><th class="n">Power</th><th class="n">PF/G</th><th class="n">PA/G</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  const last=LG.week>0&&LG.weeks[LG.week-1]?LG.weeks[LG.week-1].label:'';
  let body='';
  if(RANK_MODE==='top'){
    const others=list.slice(25,35).map(id=>`${esc(T(id).city)} ${recStr(T(id))}`).join(' · ');
    body=`<div class="card"><div class="setrow"><div><div class="eyebrow">${LG.week===0&&LG.phase==='regular'?'Before Week 1':'After '+esc(last)}</div><div class="h2">${pollName(LG,div)}</div></div>${toggle}</div>${pollTab(list,null,'')}
      ${others?`<p class="note"><b>Others receiving votes:</b> ${others}</p>`:''}
      <p class="note">Voted like the media poll: each week starts from last week's ballot. A win holds a team's spot or moves it up (more for ranked, top-10 and road wins), a loss drops it by how good the opponent was and the margin, and a bye holds. A ranked team that wins falls at most two spots, and a team that beat a team with the same or a worse record is always ranked ahead of it. SOS is a rank; Power is points better than an average team; PF/G and PA/G are points scored and allowed per game.</p></div>`;
  }else if(cfp){
    const c=ensureCFP(LG),fin=LG.week>LG.R||LG.phase==='offseason';
    body=!c.length?`<div class="card"><div class="eyebrow">College Football Playoff</div><div class="h2">CFP rankings</div><p class="note">${LG.phase==='offseason'?'No CFP rankings were kept for this season.':`Not released yet — first rankings after Week ${cfpFrom(LG)}. Until then the playoff projection uses the AP Top 25.`}</p></div>`
      :`<div class="card"><div class="eyebrow">${fin?'Final rankings · selection day':'Selection committee · after '+esc(last)}</div><div class="h2">CFP Top 25</div>${pollTab(c,LG.cfpPrev||[],'CFP ')}
      <p class="note">The committee ranks résumés, not reputations, and starts fresh every week: record, strength of schedule, wins over CFP-ranked teams, bad losses, head-to-head and common opponents${fin?', plus conference titles':''}. Its final rankings pick and seed the 12-team playoff.</p></div>`;
  }else if(RANK_MODE==='all'){
    body=`<div class="card"><div class="setrow"><div class="h2">All ${div} teams · ${list.length}</div>${toggle}</div><div class="tw"><table class="rtab">${head(true)}<tbody>${list.map((id,i)=>row(id,i,true)).join('')}</tbody></table></div></div>`;
  }else{
    const done=LG.weeks.map((w,i)=>({w,i})).filter(x=>x.w.games.some(g=>g.hs!=null));const cur=RES_WEEK!=null&&LG.weeks[RES_WEEK]?RES_WEEK:(done.length?done[done.length-1].i:0);
    const wk=LG.weeks[cur];let games=wk?wk.games.slice():[];
    if(RES_FILTER==='top')games=games.filter(g=>rankOf(g.h)||rankOf(g.a));if(RES_FILTER==='conf')games=games.filter(g=>T(g.h).conf===u.conf||T(g.a).conf===u.conf);if(RES_FILTER==='div')games=games.filter(g=>T(g.h).div===div||T(g.a).div===div);
    games.sort((a,b)=>Math.min(rankOf(a.h)||99,rankOf(a.a)||99)-Math.min(rankOf(b.h)||99,rankOf(b.a)||99));
    const gl=g=>{const H=T(g.h),A=T(g.a),done=g.hs!=null,hw=done&&g.hs>g.as;return `<div class="res-g ${g.h===LG.user||g.a===LG.user?'me':''}"><div class="rt ${done&&!hw?'w':''}" data-team="${A.id}">${badge(A,'sm')}<span>${rankTag(A.id)}${esc(A.city)}</span><b>${done?g.as:''}</b></div><div class="rt ${hw?'w':''}" data-team="${H.id}">${badge(H,'sm')}<span>${rankTag(H.id)}${esc(H.city)}</span><b>${done?g.hs:''}</b></div><small class="note">${done?'Final':'Upcoming'}${g.tag?' · '+esc(g.tag):''}${g.upset?' · <span style="color:var(--hot)">Upset</span>':''}</small></div>`};
    body=`<div class="card"><div class="setrow"><div class="h2">Results · ${esc(wk?wk.label:'')}</div>${toggle}</div>
      <div class="chips" id="resWeeks">${LG.weeks.map((w,i)=>`<button class="chipbtn" data-v="${i}" aria-pressed="${i===cur}">${esc(w.label.replace('Week ','Wk '))}</button>`).join('')}</div>
      <div class="chips" id="resFilter">${[['all','All games'],['top','Top 25'],['conf','My conference'],['div',div+' only']].map(([k,l])=>`<button class="chipbtn" data-v="${k}" aria-pressed="${RES_FILTER===k}">${l}</button>`).join('')}</div>
      <div class="res-grid">${games.map(gl).join('')||'<p class="note">No games.</p>'}</div><p class="note">${games.length} games. Tap a team to open its page.</p></div>`;
  }
  return modes+body;
}
/* ---------- College Football Playoff bracket (live, or projected from today's rankings) ---------- */
function projectCFP(L){
  const champs=[];L.confs.forEach((c,i)=>{if(c.div==='FBS'&&!c.ind){const st=confStandings(L,i);if(st[0])champs.push(st[0].id)}});
  const src=ensureCFP(L).length?'cfp':'ap',s=cfpSelect(L,selOrder(L),champs);
  return {seeds:s.seeds,champs,auto:s.auto,src,projected:true,r1:[],qf:[],sf:[],final:null};
}
/* projected field plus the first teams out, ranked by the order the projection uses (CFP once released, else AP) */
function cfpBubble(L,c){
  if(L.week<L.R-6||L.phase!=='regular')return '';const ord=selOrder(L),pos={};ord.forEach((id,i)=>pos[id]=i+1);const out=ord.filter(id=>!c.seeds.includes(id)).slice(0,6);
  const row=(id,sd)=>`<div class="lrow"><span class="l">${badge(T(id),'sm')} ${pos[id]<=25?'#'+pos[id]+' ':''}${esc(T(id).city)}</span><small class="note">${sd?'Seed '+sd+' · ':''}${recStr(T(id))}</small></div>`;
  return `<div class="inout"><div class="col"><div class="eyebrow" style="color:var(--ok)">In (projected)</div>${c.seeds.map((id,i)=>row(id,i+1)).join('')}</div><div class="col"><div class="eyebrow" style="color:var(--warn)">First teams out</div>${out.map(id=>row(id)).join('')}</div></div>`;
}
function hubPlayoff(){
  const u=T(LG.user);
  if(u.div==='FCS'&&!RANK_DIV&&LG.fcsp)return fcsBracket();
  const c=LG.cfp||projectCFP(LG),s=c.seeds;if(!s||s.length<12)return '<div class="card"><p class="note">The bracket appears once the season has rankings.</p></div>';
  const champSet=new Set(LG.cfp?LG.teams.filter(t=>t.cc&&!isFCS(t)).map(t=>t.id):c.champs);
  const team=(id,sc,win,lose,seed)=>{if(id==null)return `<div class="bt tbd"><span class="sd"></span><span class="nm">TBD</span></div>`;const t=T(id);return `<div class="bt ${win?'w':''} ${lose?'l':''} ${id===LG.user?'me':''}" data-team="${id}" style="--c1:${t.c1}"><span class="sd">${seed||''}</span>${badge(t,'sm')}<span class="nm">${esc(t.city)}${champSet.has(id)?'<i class="cc" title="Conference champion">★</i>':''}</span><b>${sc==null?'':sc}</b></div>`};
  const seedOf=id=>s.indexOf(id)+1||'';
  const game=(g,a,b,lab)=>{const done=g&&g.hs!=null,ha=g?g.h:a,hb=g?g.a:b;const sa=done?(ha===g.h?g.hs:g.as):null,sb=done?(hb===g.h?g.hs:g.as):null;const wa=done&&sa>sb,wb=done&&sb>sa;
    return `<div class="bmatch">${lab?`<div class="blab">${esc(lab)}</div>`:''}${team(ha,sa,wa,done&&!wa,seedOf(ha))}${team(hb,sb,wb,done&&!wb,seedOf(hb))}</div>`};
  const W=g=>g&&g.hs!=null?winner(g):null;
  /* bracket order top to bottom: QF0 (1 vs 8/9), QF3 (4 vs 5/12), QF1 (2 vs 7/10), QF2 (3 vs 6/11) */
  const r1=[3,0,2,1].map(k=>c.r1[k]?game(c.r1[k],null,null,`#${5+k} vs #${12-k}`):game(null,s[4+k],s[11-k],`#${5+k} vs #${12-k} · on campus`));
  const qf=[0,3,1,2].map(k=>c.qf[k]?game(c.qf[k],null,null,CFP_QF[k]):game(null,s[k],W(c.r1[[3,2,1,0][k]]),CFP_QF[k]));
  const sf=[0,1].map(k=>c.sf[k]?game(c.sf[k],null,null,CFP_SF[k]):game(null,W(c.qf[k===0?0:1]),W(c.qf[k===0?3:2]),CFP_SF[k]));
  const fin=c.final?game(c.final,null,null,'National Championship'):game(null,W(c.sf[0]),W(c.sf[1]),'National Championship');
  const champ=LG.champ!=null&&LG.cfp?T(LG.champ):null;
  const bw=LG.weeks[LG.R+1]?LG.weeks[LG.R+1].games.filter(g=>g.bowl):[];
  return `<div class="card cfp"><div class="setrow"><div><div class="eyebrow">${c.projected?(c.src==='cfp'?'Projected · from this week’s CFP rankings':'Projected · from the AP Top 25 (CFP rankings start after Week '+cfpFrom(LG)+')'):LG.season+' College Football Playoff'}</div><div class="h2">College Football Playoff</div></div>${champ?`<div class="champ" style="--c1:${champ.c1}">${badge(champ,'lg')}<div><small>National champion</small><b>${esc(champ.city)}</b></div></div>`:''}</div>
    <div class="bracket2"><div class="bcol"><div class="bhead">First round</div><div class="bms">${r1.join('')}</div></div><div class="bcol"><div class="bhead">Quarterfinals</div><div class="bms">${qf.join('')}</div></div><div class="bcol"><div class="bhead">Semifinals</div><div class="bms">${sf.join('')}</div></div><div class="bcol fin"><div class="bhead">Championship</div><div class="bms">${fin}</div></div></div>
    <p class="note">Twelve teams picked from the final CFP rankings: ${p4Set(LG).size>=LG.confs.filter(x=>x.div==='FBS'&&!x.ind).length?'every conference champion gets an automatic bid':'each Power 4 champion and the highest-ranked Group of 5 champion get automatic bids, Notre Dame is in if ranked in the top 12,'} and the highest-ranked teams left fill the field (★ conference champion). Straight seeding by ranking: seeds 1–4 get byes and seeds 5–8 host first-round games on campus. Swipe sideways to see the whole bracket.</p></div>
    ${c.projected?`<div class="card"><div class="h2">Bubble watch</div>${cfpBubble(LG,c)||'<p class="note">Bubble watch starts in November.</p>'}</div>`:''}
    ${bw.length?`<div class="card"><div class="h2">Bowl season · ${bw.length} games</div><div class="res-grid">${bw.map(g=>{const H=T(g.h),A=T(g.a),done=g.hs!=null;return `<div class="res-g"><div class="rt ${done&&g.as>g.hs?'w':''}" data-team="${A.id}">${badge(A,'sm')}<span>${esc(A.city)}</span><b>${done?g.as:''}</b></div><div class="rt ${done&&g.hs>g.as?'w':''}" data-team="${H.id}">${badge(H,'sm')}<span>${esc(H.city)}</span><b>${done?g.hs:''}</b></div><small class="note">${esc(g.tag)}</small></div>`}).join('')}</div></div>`:''}
    ${LG.fcsp?fcsBracket():''}`;
}
function fcsBracket(){
  const c=LG.fcsp;if(!c)return '';const m=(g,lab)=>g?`<div class="bmatch">${lab?`<div class="blab">${esc(lab)}</div>`:''}${[g.a,g.h].map(id=>{const t=T(id),done=g.hs!=null,sc=done?(id===g.h?g.hs:g.as):'';const w=done&&winner(g)===id;return `<div class="bt ${w?'w':''} ${done&&!w?'l':''} ${id===LG.user?'me':''}" data-team="${id}" style="--c1:${t.c1}"><span class="sd">${c.seeds.indexOf(id)+1||''}</span>${badge(t,'sm')}<span class="nm">${esc(t.city)}</span><b>${sc}</b></div>`}).join('')}</div>`:'';
  const col=(lab,arr)=>`<div class="bcol"><div class="bhead">${lab}</div><div class="bms">${(arr||[]).filter(Boolean).map(g=>m(g)).join('')||'<div class="bmatch"><div class="bt tbd"><span class="nm">TBD</span></div></div>'}</div></div>`;
  return `<div class="card cfp"><div class="h2">FCS Playoffs</div><div class="bracket2 fcs">${col('First round',c.r1)}${col('Second round',c.r2)}${col('Quarterfinals',c.qf)}${col('Semifinals',c.sf)}<div class="bcol fin"><div class="bhead">Championship</div><div class="bms">${m(c.final,'FCS National Championship')}</div></div></div>${LG.champF!=null?`<p class="note">Champion: <b>${esc(T(LG.champF).city)}</b></p>`:''}</div>`;
}
function hubTeam(){
  const u=T(LG.user);const pos=ROSTER_FILTER==='All'?POS_ORDER:[ROSTER_FILTER];
  const inj=u.roster.filter(p=>p.inj>0);
  return `<div class="card"><div class="setrow"><div class="h2">Roster · ${u.roster.length}/${ROSTER_CAP} scholarships</div><span class="pill">${LG.credits} CC</span></div>
    <p class="note">Tap a player to upgrade ratings with coaching credits, set the depth chart, redshirt, or name captains. ${inj.length?`<b style="color:var(--hot)">${inj.length} unavailable this week.</b>`:''}</p>
    <div class="chips" id="rosChips">${['All',...POS_ORDER].map(p=>`<button class="chipbtn" data-v="${p}" aria-pressed="${ROSTER_FILTER===p}">${p}</button>`).join('')}</div></div>
  ${pos.map(ps=>`<div class="card"><div class="eyebrow">${POS_NAME[ps]} · ${STARTERS[ps]} starting</div><div>${depth(u,ps).map((p,i)=>`<button class="rrow" id="pl-${p.id}"><span class="num">${p.num}</span><span class="meta"><b>${esc(fullName(p))} <small>${yrStr(p)}${i<STARTERS[ps]&&p.inj<=0&&!p.redshirt?' · Starter':''}${LG.captains.includes(p.id)?' · C':''}</small> ${p.inj>0?`<span class="tag hot">${esc(p.injWhy||'Injured')} · ${p.inj} wk</span>`:''}${p.redshirt?'<span class="tag blue">Redshirt</span>':''}</b><span class="attrs">${PATTR[p.pos].map(k=>`<span>${attrShort(p.pos,k)} ${`<span class="ovr">${a99(p[k])}</span>`}</span>`).join('')}</span><span style="display:grid;grid-template-columns:auto 1fr auto 1fr;gap:6px;align-items:center;font-size:10.5px;color:var(--mute)"><span>COND</span>${meterHTML(p.cond)}<span>XP</span>${meterHTML(p.xp,'var(--los)')}</span></span>${ovrTag(p)}</button>`).join('')}</div></div>`).join('')}`;
}
function hubProgram(){
  const c=LG.coach,u=T(LG.user),f=LG.fac;
  const FAC={stadium:['Stadium','More coaching credits from home games, plus a bonus when fan approval is above 70%.'],training:['Training facility','+20% XP per level for every player.'],rehab:['Rehab center','Faster condition recovery each week and shorter injuries.']};
  const FOCUS={balanced:['Balanced','No special boost.'],passing:['Passing','Tighter QB accuracy and surer hands this week.'],running:['Running','Ball carriers break more tackles; the line blocks longer.'],conditioning:['Conditioning','Players tire 30% slower this week.'],film:['Film study','Your defense reads their offense better this week.']};
  const staffCard=(k,s)=>`<div class="lrow"><span class="l"><span class="tag">${k.toUpperCase()}</span><span><b>${esc(s.name)}</b> ${`<span class="ovr">${tOvr99(s.r)}</span>`}<br><small class="note">${esc(s.trait)}: ${(k==='oc'?OC_TRAITS:DC_TRAITS)[s.trait]}</small></span></span></div>`;
  return trophyCase()+`<div class="grid2">
    <div class="card"><div class="eyebrow">Head coach</div><div class="h2">${esc(c.name)}</div>
      <div class="kv"><span>Career record</span><b>${c.w}–${c.l}</b></div><div class="kv"><span>Seasons</span><b>${c.seasons}</b></div>
      <div class="kv"><span>National titles</span><b>${c.natties}</b></div><div class="kv"><span>Conference titles</span><b>${c.confs}</b></div><div class="kv"><span>Bowl wins</span><b>${c.bowls}</b></div><div class="kv"><span>Playoff trips</span><b>${c.playoffs}</b></div><div class="kv"><span>Coach of the Year</span><b>${c.coy}</b></div>
      <div class="kv"><span>Job security</span><b>${Math.round(c.security)}%</b></div>${meterHTML(c.security)}</div>
    <div class="card"><div class="eyebrow">Program pulse</div>
      <div class="kv"><span>Fan approval</span><b>${Math.round(LG.fan)}%</b></div>${meterHTML(LG.fan)}
      <div class="kv"><span>Locker room morale</span><b>${Math.round(LG.morale)}%</b></div>${meterHTML(LG.morale)}
      <p class="note">Morale nudges player speed on game day. Fan approval drives coaching credits and recruiting.</p>
      <div class="kv"><span>Captains</span><b>${LG.captains.map(id=>{const p=u.roster.find(x=>x.id===id);return p?esc(p.last):''}).filter(Boolean).join(', ')||'None'}</b></div>
      <div class="kv"><span>NIL collective</span><b>${money(LG.nil)}</b></div><p class="note">NIL money signs transfer-portal players and boosts recruiting in the offseason.</p></div></div>
  <div class="card"><div class="h2">This week's practice</div>
    <div class="seg" id="focusSeg">${Object.entries(FOCUS).map(([k,[l]])=>`<button data-v="${k}" aria-pressed="${LG.focus===k}">${l}</button>`).join('')}</div><p class="note">${FOCUS[LG.focus][1]}</p>
    <div class="setrow"><span class="eyebrow">Training regime</span><div class="seg" id="regSeg">${Object.entries(REGIMES).map(([k,r])=>`<button data-v="${k}" aria-pressed="${LG.regime===k}">${r.label}</button>`).join('')}</div></div>
    <p class="note">${LG.regime==='light'?'Less XP, but players stay fresher and get hurt less.':LG.regime==='hard'?'35% more XP, but players wear down faster and get hurt more.':'Standard XP, wear and injury risk.'}</p></div>
  <div class="card"><div class="h2">Facilities</div>${Object.entries(FAC).map(([k,[n,d]])=>`<div class="setrow"><div style="min-width:0;flex:1"><b>${n}</b><div class="pips">${[1,2,3,4,5].map(i=>`<i class="${i<=f[k]?'on':''}"></i>`).join('')}</div><p class="note">${d}</p></div>${f[k]<5?`<button class="btn sm" id="fac-${k}" ${LG.credits<f[k]*6?'disabled':''}>Upgrade · ${f[k]*6} CC</button>`:'<span class="tag gold">Maxed</span>'}</div>`).join('')}</div>
  <div class="card"><div class="h2">Coordinators</div><div class="list">${staffCard('oc',LG.staff.oc)}${staffCard('dc',LG.staff.dc)}</div>
    <div class="eyebrow">Available to hire</div><div class="list">${['oc','dc'].flatMap(k=>LG.pool[k].map((s,i)=>`<div class="lrow"><span class="l"><span class="tag">${k.toUpperCase()}</span><span><b>${esc(s.name)}</b> ${`<span class="ovr">${tOvr99(s.r)}</span>`}<br><small class="note">${esc(s.trait)}: ${(k==='oc'?OC_TRAITS:DC_TRAITS)[s.trait]}</small></span></span><button class="btn sm" id="hire-${k}-${i}" ${LG.credits<staffCost(s)?'disabled':''}>Hire · ${staffCost(s)} CC</button></div>`)).join('')}</div>
    <p class="note">Offensive coordinator stars help receivers get open. Defensive coordinator stars make your simulated defense stronger.</p></div>
  <div class="card"><div class="h2">Trophy case</div><div class="grid3">
    <div class="kpis"><div><em>National titles</em><b>${u.titles}</b></div></div><div class="kpis"><div><em>Conference titles</em><b>${u.ccTitles}</b></div></div><div class="kpis"><div><em>Bowl wins</em><b>${u.bowlWins}</b></div></div><div class="kpis"><div><em>Playoff trips</em><b>${u.playoffApps||0}</b></div></div></div>
    <div class="kv"><span>${esc(u.trophy)} vs ${esc(T(u.rival).city)}</span><b>${u.holder===u.id?'In your case':'Held by '+esc(T(u.rival).city)}</b></div></div>`;
}
function hubStats(){
  const u=T(LG.user),ts=LG.ts,g=Math.max(1,ts.g);
  const lead=(lab,k,fmt)=>{const p=u.roster.slice().sort((a,b)=>b.ss[k]-a.ss[k])[0];return p&&p.ss[k]>0?`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span>${lab}: <b>${esc(fullName(p))}</b></span></span><span>${fmt(p)}</span></div>`:''};
  const recs=Object.values(LG.records);
  return `${nationalLeaders()}<div class="card"><div class="h2">${LG.season} team stats</div><div class="kpis">
    <div><em>Points / game</em><b>${(ts.pf/g).toFixed(1)}</b></div><div><em>Allowed / game</em><b>${(ts.pa/g).toFixed(1)}</b></div><div><em>Pass yds / game</em><b>${Math.round(ts.py/g)}</b></div><div><em>Rush yds / game</em><b>${Math.round(ts.ry/g)}</b></div>
    <div><em>3rd down</em><b>${ts.thirdA?pct(ts.thirdC/ts.thirdA):'—'}</b></div><div><em>Red zone TD</em><b>${ts.rzA?pct(ts.rzTD/ts.rzA):'—'}</b></div><div><em>Turnovers</em><b>${ts.to}</b></div><div><em>Penalties</em><b>${ts.pen}</b></div></div>
    <p class="note">Third-down, red-zone and penalty numbers count games you play yourself.</p></div>
  <div class="grid2"><div class="card"><div class="h2">Team leaders</div><div class="list">
    ${lead('Passing','py',p=>`${p.ss.py} yds · ${p.ss.ptd} TD`)}${lead('Rushing','ry',p=>`${p.ss.ry} yds · ${p.ss.rtd} TD`)}${lead('Receiving','recy',p=>`${p.ss.recy} yds · ${p.ss.rectd} TD`)}${lead('Tackles','tkl',p=>p.ss.tkl)}${lead('Sacks','sck',p=>p.ss.sck)}${lead('Interceptions','dint',p=>p.ss.dint)}</div></div>
  <div class="card"><div class="h2">School records</div>${recs.length?`<div class="list">${recs.map(r=>`<div class="lrow"><span class="l"><span>${esc(r.label)}: <b>${esc(r.who)}</b> <small class="note">${r.season}${r.extra?' · '+esc(r.extra):''}</small></span></span><b>${r.v}</b></div>`).join('')}</div>`:'<p class="note">Records are set when you play games.</p>'}</div></div>
  ${LG.awards.length?`<div class="card"><div class="h2">Awards</div><div class="list">${LG.awards.map(a=>{const mine=[...a.allAm.filter(x=>x.team===LG.user).map(x=>x.name+' (All-American)'),...a.allConf.filter(x=>x.team===LG.user).map(x=>x.name+' (All-Conference)'),...a.frosh.filter(x=>x.team===LG.user).map(x=>x.name+' (Freshman All-American)')];return `<div class="lrow"><span><b>${a.season}</b> · Heisman: ${a.heisman?esc(a.heisman.name)+' ('+esc(T(a.heisman.team).city)+')':'—'} · Coach of the Year: ${esc(T(a.coy).city)}${mine.length?`<br><small class="note">Your honorees: ${esc(mine.join(', '))}</small>`:''}</span></div>`}).join('')}</div></div>`:''}
  ${LG.history.length?`<div class="card"><div class="h2">Program history</div><div class="tw"><table><thead><tr><th>Season</th><th>School</th><th class="n">Record</th><th class="n">Rank</th><th>Postseason</th></tr></thead><tbody>${LG.history.slice().reverse().map(h=>`<tr><td>${h.season}</td><td>${esc(T(h.team!=null?h.team:LG.user).city)}</td><td class="n">${h.w}–${h.l}</td><td class="n">${h.rank?'#'+h.rank:'—'}</td><td>${h.champ?'National champions':h.madePO?'Playoff (#'+h.seed+' seed)':h.bowl?esc(h.bowl.name)+(h.bowl.won?' win':' loss'):h.cc?'Conference champions':'—'}</td></tr>`).join('')}</tbody></table></div></div>`:''}`;
}
let LEAGUE_CONF=null;
function hubLeague(){
  const u=T(LG.user);const c=LEAGUE_CONF!=null&&LG.confs[LEAGUE_CONF]?LEAGUE_CONF:u.conf;
  const groups=['FBS','FCS'].map(d=>{const cs=LG.confs.map((x,i)=>[x,i]).filter(([x])=>x.div===d);return cs.length?`<optgroup label="${d}">${cs.map(([x,i])=>`<option value="${i}" ${i===c?'selected':''}>${esc(x.name)} (${LG.teams.filter(t=>t.conf===i).length})</option>`).join('')}</optgroup>`:''}).join('');
  return `<div class="card"><div class="h2">League</div><p class="note">${LG.teams.length} programs in ${LG.confs.length} conferences. Pick a conference to see its standings. Tap Edit to change any school's name, abbreviation or colors.</p>
    <div class="field-row"><label for="leagueConf">Conference</label><select id="leagueConf">${groups}</select></div></div>
  <div class="card"><div class="eyebrow">${esc(confName(c))}${LG.confs[c].ind?'':' standings'}</div><div class="tw"><table><thead><tr><th>Team</th><th class="n">Conf</th><th class="n">All</th><th class="n">OVR</th><th></th></tr></thead><tbody>${confStandings(LG,c).map(t=>`<tr class="${t.id===LG.user?'me':''}"><td>${tcell(t,rankTag(t.id)+teamName(t))}</td><td class="n">${LG.confs[c].ind?'—':t.rec.cw+'–'+t.rec.cl}</td><td class="n">${recStr(t)}</td><td class="n">${tOvr99(teamOvr(t))}</td><td class="n"><button class="linkbtn" id="edit-${t.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="h2">Team pack</div><p class="note">Rename and recolor the whole league at once, or paste real rosters. Export the current list, edit it, then import it back. Teams are matched by their order in the list.</p>
    <div class="btns"><button class="btn ghost" id="packExport">Export team pack</button><button class="btn ghost" id="packImport">Import team pack</button></div></div>`;
}
/* v7 settings registry: any module can add a setting or a button to the Settings tab without editing hubSettings.
   SETTINGS_EXTRA.push({card:'Realism',key:'penalties',label:'Penalties',opts:[['normal','Normal'],['low','Fewer'],['off','Off']],def:'normal'})
     → stored in LG.settings[key]; numbers and the strings '1'/'0' are converted back (opts values 1/0 become true/false when bool:true)
   SETTINGS_EXTRA.push({card:'Rosters & data',button:'Import rosters (JSON)',id:'impRosters',note:'optional help text',onClick:()=>openRosterImport(LG)})
   Entries render in the order pushed, grouped into cards by `card`, just above the Program card. */
const SETTINGS_EXTRA=[];
function settingsExtraHTML(){
  const s=LG.settings,cards=[];const by={};
  for(const e of SETTINGS_EXTRA){if(e.when&&!e.when())continue;if(!by[e.card]){by[e.card]=[];cards.push(e.card)}by[e.card].push(e)}
  const seg=(id,opts,val)=>`<div class="seg" id="${id}">${opts.map(([v,l])=>`<button data-v="${v}" aria-pressed="${String(v)===String(val)}">${l}</button>`).join('')}</div>`;
  return cards.map(c=>`<div class="card"><div class="h2">${esc(c)}</div>${by[c].map(e=>e.button?`<div class="setrow"><span class="eyebrow">${esc(e.label||'')}</span><button class="btn sm ghost" id="sx-${e.id}">${esc(e.button)}</button></div>${e.note?`<p class="note">${e.note}</p>`:''}`:`<div class="setrow"><span class="eyebrow">${esc(e.label)}</span>${seg('sx-'+e.key,e.opts,(()=>{const v=s[e.key]==null?e.def:s[e.key];return e.bool?(v?1:0):v})())}</div>${e.note?`<p class="note">${e.note}</p>`:''}`).join('')}</div>`).join('');
}
function bindSettingsExtra(seg){
  for(const e of SETTINGS_EXTRA){
    if(e.button){on('sx-'+e.id,()=>{try{e.onClick()}catch(err){console.error(err);toast('Something went wrong')}});continue}
    seg('sx-'+e.key,v=>{const o=e.opts.find(([x])=>String(x)===v);let val=o?o[0]:v;if(e.bool)val=String(val)==='1';LG.settings[e.key]=val;if(e.after)e.after(val)});
  }
}
function hubSettings(){
  const s=LG.settings;const seg=(id,opts,val)=>`<div class="seg" id="${id}">${opts.map(([v,l])=>`<button data-v="${v}" aria-pressed="${v==val}">${l}</button>`).join('')}</div>`;
  return `<div class="card"><div class="h2">Game settings</div>
    <div class="setrow"><span class="eyebrow">Art style</span>${seg('setS',[['modern','Modern HD'],['retro','Retro pixel']],s.style)}</div>
    <div class="setrow"><span class="eyebrow">Quarter length</span>${seg('setQ',[[120,'2 min'],[180,'3 min'],[300,'5 min']],s.qlen)}</div>
    <div class="setrow"><span class="eyebrow">Difficulty</span>${seg('setD',[[0,'Rookie'],[1,'Varsity'],[2,'All-American'],[3,'Heisman']],s.diff)}</div>
    <div class="setrow"><span class="eyebrow">Sound</span>${seg('setM',[[0,'On'],[1,'Off']],s.muted?1:0)}</div>
    <div class="setrow"><span class="eyebrow">Opponent drives</span>${seg('setDef',[['ask','Ask each time'],['play','Play defense'],['sim','Sim them']],s.defMode||'ask')}</div>
    <div class="setrow"><span class="eyebrow">Default defender</span>${seg('setDP',[['LB0','Linebacker'],['S0','Safety'],['CB0','Cornerback'],['DL1','D-line']],s.defPlayer||'LB0')}</div>
    <div class="setrow"><span class="eyebrow">Play clock</span>${seg('setPC',[[25,'25 s'],[40,'40 s'],[90,'Relaxed']],s.pclock||25)}</div>
    <div class="setrow"><span class="eyebrow">Camera zoom</span>${seg('setZ',[[.85,'Wide'],[1,'Normal'],[1.15,'Close']],s.zoom||1)}</div>
    <div class="setrow"><span class="eyebrow">Coin toss</span>${seg('setCoin',[[1,'Call it'],[0,'Automatic']],s.coin===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">In-game injuries</span>${seg('setInj',[[1,'On'],[0,'Off']],s.injuries===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Haptics</span>${seg('setHap',[[1,'On'],[0,'Off']],s.haptics===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Menu tap sounds</span>${seg('setTap',[[1,'On'],[0,'Off']],s.uiSounds===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Celebration button</span>${seg('setCel',[[1,'On'],[0,'Off']],s.celebrate===false?0:1)}</div></div>
  <div class="card"><div class="h2">Gameplay sliders</div><p class="note">Fine-tune the game on top of difficulty.</p>
    ${[['acc','Your QB accuracy'],['run','Your run blocking'],['cov','CPU pass coverage'],['tkl','CPU tackling'],['inj','Injury frequency']].map(([k,l])=>`<div class="setrow"><span class="eyebrow">${l}</span>${seg('sl-'+k,[[.8,'Low'],[1,'Normal'],[1.25,'High']],(s.sl&&s.sl[k])||1)}</div>`).join('')}</div>
  <div class="card"><div class="h2">Accessibility</div>
    <div class="setrow"><span class="eyebrow">Larger text</span>${seg('setBig',[[1,'On'],[0,'Off']],s.bigText?1:0)}</div>
    <div class="setrow"><span class="eyebrow">Color-blind friendly colors</span>${seg('setCB',[[1,'On'],[0,'Off']],s.cb?1:0)}</div></div>
  <div class="card"><div class="h2">Broadcast</div>
    <div class="setrow"><span class="eyebrow">Pregame show</span>${seg('setPre',[[1,'On'],[0,'Off']],s.pregame===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Halftime show</span>${seg('setHalf',[[1,'On'],[0,'Off']],s.halftime===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Score ticker</span>${seg('setTk',[[1,'On'],[0,'Off']],s.ticker===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Broadcast package</span>${seg('setPkg',[['auto','Auto'],['national','National'],['regional','Regional'],['stream','Streaming']],s.pkg||'auto')}</div>
    <div class="setrow"><span class="eyebrow">Broadcast graphics</span>${seg('setGfx',[[1,'On'],[0,'Off']],s.gfx===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Replays</span>${seg('setRp',[['ask','Button'],['auto','Automatic'],['off','Off']],s.replay||'ask')}</div>
    <div class="setrow"><span class="eyebrow">Player cards</span>${seg('setLow',[[1,'On'],[0,'Off']],s.lower===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Win probability</span>${seg('setWP',[['key','Key moments'],['always','Always'],[0,'Off']],s.wp===false?0:s.wp==='always'?'always':'key')}</div>
    <div class="setrow"><span class="eyebrow">Decibel meter</span>${seg('setDB',[[1,'On'],[0,'Off']],s.db===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Score bug position</span>${seg('setBug',[['top','Top'],['bottom','Bottom']],s.bugPos||'top')}</div>
    <div class="setrow"><span class="eyebrow">Score bug size</span>${seg('setBS',[['s','Small'],['m','Medium'],['l','Large']],s.bugSize||'m')}</div>
    <div class="setrow"><span class="eyebrow">Score bug opacity</span>${seg('setBA',[[1,'Solid'],[.8,'80%'],[.6,'60%']],s.hudAlpha!=null?s.hudAlpha:1)}</div></div>
  <div class="card"><div class="h2">Stadium</div>
    <div class="setrow"><span class="eyebrow">Crowd</span>${seg('setCr',[['low','Sparse'],['normal','Normal'],['high','Rowdy']],s.crowd||'normal')}</div>
    <div class="setrow"><span class="eyebrow">Student section</span>${seg('setSt',[['auto','Auto'],['white','White-out'],['black','Blackout'],['stripe','Stripe-out'],['neon','Neon'],['none','None']],s.studentTheme||'auto')}</div>
    <div class="setrow"><span class="eyebrow">Sideline (cheer, mascot, chains)</span>${seg('setSide',[[1,'On'],[0,'Off']],s.sideline===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Fireworks</span>${seg('setPy',[[1,'On'],[0,'Off']],s.pyro===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Star icons under elite players</span>${seg('setStar',[[1,'On'],[0,'Off']],s.stars===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Route lines</span>${seg('setRt',[[1,'On'],[0,'Off']],s.routes===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Joystick ring</span>${seg('setStk',[[1,'On'],[0,'Off']],s.stickUI===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Signature turf colors</span>${seg('setTurf',[[1,'On'],[0,'Off']],s.specialTurf===false?0:1)}</div>
    <div class="setrow"><span class="eyebrow">Camera shake</span>${seg('setShk',[[1,'On'],[0,'Off']],s.shake===false?0:1)}</div></div>
  <div class="card"><div class="h2">Stadium sounds</div><p class="note">Pick a sound for each moment, or upload your own clip (MP3/M4A/WAV under 600 KB).</p>
    ${AUD_EVENTS.map(([k,l])=>`<div class="setrow"><span class="eyebrow">${l}</span><span style="display:flex;gap:6px;align-items:center"><select id="aud-${k}">${AUD_SOUNDS.map(([v,n])=>`<option value="${v}" ${((s.audioMap||{})[k]||'default')===v?'selected':''}>${n}</option>`).join('')}</select><label class="btn sm ghost" style="cursor:pointer">Upload<input type="file" accept="audio/*" id="audf-${k}" hidden></label></span></div>`).join('')}
  </div>${settingsExtraHTML()}<div class="card"><div class="h2">Program</div>
    <div class="setrow"><span class="eyebrow">Your program</span><button class="btn sm ghost" id="edit-${LG.user}">Edit name &amp; colors</button></div></div>
  <div class="card"><div class="h2">Saves</div><p class="note">Slot ${SLOT} · autosaves after every snap and every menu action.</p>
    <div class="field-row"><label for="dynRename">Dynasty name</label><input type="text" id="dynRename" maxlength="28" value="${esc(LG.name)}"></div>
    <div class="btns"><button class="btn ghost" id="exportSave">Export save code</button><button class="btn ghost" id="toSlots">Switch save slot</button></div></div>
  <div class="card"><div class="h2">How to play</div><p class="note">
    <b>Play calling:</b> pick a play from the 50-play book (Pass, Run, Special, or Coach's pick), then tap SNAP. Flip mirrors the play.<br>
    <b>Pass:</b> after the snap, drag backward from anywhere and release. The circle shows how accurate the throw will be. A second finger or Bullet throws a fast, low ball. Tap RUN to scramble.<br>
    <b>Run:</b> put a finger down anywhere and drag: it's a floating joystick. Use JUKE, SPIN, TRUCK, HURDLE and DIVE. Jukes keep your speed. A quick flick also jukes or dives.<br>
    <b>Defense:</b> choose a coverage, then drag to move your player (gold ring). TACKLE dives at the ball carrier, or goes for the ball when it's in the air. SWITCH jumps to the defender nearest the ball. Before the snap you can tap any defender to control him.<br>
    <b>Kick:</b> tap once to lock the direction, then again to lock the power.<br>
    <b>Clock:</b> college rules. The clock keeps running after in-bounds tackles and stops on incompletions, out of bounds, scores and changes of possession. Inside two minutes of each half it stops briefly on first downs. Use TIMEOUT before the snap.</p></div>`;
}
function bindHub(){
  on('playGame',()=>{ac();openPregame(userGameThisWeek())});
  on('simGame',()=>{simUserGame(userGameThisWeek())});
  on('resumeGame',()=>{ac();resumeGame()});
  on('abandonGame',()=>{resumeGame(true)});
  on('advWeek',()=>{finishWeek(LG);saveNow();showHub('home')});
  document.querySelectorAll('#rankDiv button').forEach(b=>b.onclick=()=>{RANK_DIV=b.dataset.v;rerender()});
  document.querySelectorAll('#rankMode button').forEach(b=>b.onclick=()=>{RANK_MODE=b.dataset.v;rerender()});document.querySelectorAll('#resWeeks button').forEach(b=>b.onclick=()=>{RES_WEEK=+b.dataset.v;rerender()});document.querySelectorAll('#resFilter button').forEach(b=>b.onclick=()=>{RES_FILTER=b.dataset.v;rerender()});
  const lc=$('#leagueConf');if(lc)lc.onchange=()=>{LEAGUE_CONF=+lc.value;rerender()};
  document.querySelectorAll('#rosChips button').forEach(b=>b.onclick=()=>{ROSTER_FILTER=b.dataset.v;rerender()});
  document.querySelectorAll('[id^="pl-"]').forEach(b=>b.onclick=()=>openPlayer(+b.id.slice(3)));
  document.querySelectorAll('[id^="edit-"]').forEach(b=>b.onclick=()=>openEditor(+b.id.slice(5),()=>{saveNow();rerender()}));
  const seg=(id,f)=>{const e=document.getElementById(id);if(!e)return;e.querySelectorAll('button').forEach(b=>b.onclick=()=>{f(b.dataset.v);saveNow();rerender()})};
  seg('setQ',v=>LG.settings.qlen=+v);seg('setD',v=>LG.settings.diff=+v);seg('setM',v=>{LG.settings.muted=v==='1';muted=LG.settings.muted});seg('setS',v=>{LG.settings.style=v;applyStyle()});
  const S2=(id,k,f)=>seg(id,v=>{LG.settings[k]=f?f(v):v});const B=v=>v==='1';
  S2('setDef','defMode');S2('setDP','defPlayer');S2('setPC','pclock',v=>+v);S2('setZ','zoom',v=>+v);S2('setCel','celebrate',B);S2('setPre','pregame',B);S2('setHalf','halftime',B);S2('setTk','ticker',B);S2('setPkg','pkg');S2('setGfx','gfx',B);S2('setCoin','coin',B);S2('setInj','injuries',B);S2('setHap','haptics',B);S2('setTap','uiSounds',B);S2('setBig','bigText',B);S2('setCB','cb',B);
  for(const k of ['acc','run','cov','tkl','inj'])seg('sl-'+k,v=>{LG.settings.sl=LG.settings.sl||{};LG.settings.sl[k]=+v});S2('setRp','replay');S2('setLow','lower',B);S2('setWP','wp',v=>v==='0'?false:v);S2('setDB','db',B);S2('setBug','bugPos');S2('setBS','bugSize');S2('setBA','hudAlpha',v=>+v);S2('setCr','crowd');S2('setSt','studentTheme');S2('setSide','sideline',B);S2('setPy','pyro',B);S2('setStar','stars',B);S2('setRt','routes',B);S2('setStk','stickUI',B);S2('setTurf','specialTurf',B);S2('setShk','shake',B);
  for(const [k] of (typeof AUD_EVENTS!=='undefined'?AUD_EVENTS:[])){const sel=document.getElementById('aud-'+k);if(sel)sel.onchange=()=>{LG.settings.audioMap=LG.settings.audioMap||{};LG.settings.audioMap[k]=sel.value;saveNow();ac();BC.sound(k)};
    const f=document.getElementById('audf-'+k);if(f)f.onchange=()=>{const file=f.files[0];if(!file)return;if(file.size>600000){toast('That clip is too big (600 KB max)');return}const rd=new FileReader();rd.onload=()=>{try{KV.set('gl.aud.'+k,rd.result);LG.settings.audioMap=LG.settings.audioMap||{};LG.settings.audioMap[k]='custom';saveNow();toast('Sound saved');rerender()}catch(e){toast('Could not store that clip')}};rd.readAsDataURL(file)}}
  bindSettingsExtra(seg);
  seg('focusSeg',v=>LG.focus=v);seg('regSeg',v=>LG.regime=v);
  for(const k of ['stadium','training','rehab'])on('fac-'+k,()=>{const c=LG.fac[k]*6;if(LG.credits>=c&&LG.fac[k]<5){LG.credits-=c;LG.fac[k]++;saveNow();rerender();toast('Upgraded')}});
  for(const k of ['oc','dc'])LG.pool[k].forEach((s,i)=>on(`hire-${k}-${i}`,()=>{if(LG.credits<staffCost(s))return;LG.credits-=staffCost(s);const old=LG.staff[k];LG.staff[k]=s;LG.pool[k][i]=old;saveNow();rerender();toast(`${s.name} hired`)}));
  const dr=$('#dynRename');if(dr)dr.onchange=()=>{LG.name=dr.value.trim()||LG.name;saveNow()};
  on('exportSave',()=>{const code=Saves.exportCode(LG);openModal(`<div class="eyebrow">Export save</div><div class="h2">Your save code</div><p class="note">Copy this code and keep it somewhere safe. Paste it into Import save code on the start screen to restore this dynasty, even on another device.</p><textarea id="codeOut" readonly>${esc(code)}</textarea><div class="btns"><button class="btn light" id="codeCopy">Copy</button><button class="btn ghost" id="codeX">Done</button></div>`);
    on('codeX',closeModal);on('codeCopy',()=>{const ta=$('#codeOut');navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(ta.value).then(()=>toast('Copied'),()=>{ta.select();toast('Select all and copy')}):(ta.select(),toast('Select all and copy'))})});
  on('toSlots',()=>{saveNow(true);showSlots()});
  on('packExport',()=>{const pack={conferences:LG.confs.map(c=>c.name),teams:LG.teams.map(t=>({school:t.city,mascot:t.name,abbr:t.abbr,primary:t.c1,secondary:t.c2,prestige:t.prestige,stadium:t.stadium}))};openModal(`<div class="eyebrow">Team pack</div><div class="h2">Export</div><textarea readonly id="packOut">${esc(JSON.stringify(pack,null,1))}</textarea><div class="btns"><button class="btn light" id="packCopy">Copy</button><button class="btn ghost" id="packX">Done</button></div>`);on('packX',closeModal);on('packCopy',()=>{const ta=$('#packOut');ta.select();try{navigator.clipboard.writeText(ta.value).then(()=>toast('Copied'),()=>{})}catch(e){}})});
  on('packImport',()=>openPackImport(LG,()=>{saveNow();showHub();toast('Team pack applied')}));
  // offseason controls
  bindOffseason();
}

/* ---------- modals ---------- */
function openPlayer(id){
  const u=T(LG.user),p=u.roster.find(x=>x.id===id);if(!p)return;
  const render=()=>{
    const s=p.ss,isCap=LG.captains.includes(p.id),startIdx=depth(u,p.pos).indexOf(p);
    openModal(`<div class="eyebrow">${POS_NAME[p.pos]} · #${p.num} · ${yrStr(p)} · ${esc(p.home)}</div><div class="h2" style="font-size:26px">${esc(fullName(p))}</div>
    <div class="setrow"><span>Overall ${ovrTag(p)}</span>${p.inj>0?`<span class="tag hot">${esc(p.injWhy)} · out ${p.inj} wk</span>`:''}</div>
    ${PATTR[p.pos].map(k=>{const c=Math.ceil(p[k])+1;return `<div class="setrow"><span>${attrName(p.pos,k)} ${`<span class="ovr">${a99(p[k])}</span>`}</span>${p[k]<4.95?`<button class="btn sm" id="up-${k}" ${LG.credits<c?'disabled':''}>+${a99(Math.min(5,p[k]+.5))-a99(p[k])} · ${c} CC</button>`:'<span class="tag gold">Max</span>'}</div>`}).join('')}
    <div class="kv"><span>Condition</span><b>${Math.round(p.cond)}%</b></div>${meterHTML(p.cond)}<div class="kv"><span>XP to next upgrade</span><b>${Math.round(p.xp)}/100</b></div>${meterHTML(p.xp,'var(--los)')}
    <div class="kv"><span>Season</span><b>${esc(statLine(p))}</b></div>
    <div class="btns">${startIdx>0?`<button class="btn sm ghost" id="mkStart">Move to top of depth chart</button>`:''}
      ${p.yr<4&&!p.rs&&s.gp<=4?`<button class="btn sm ghost" id="rsTog">${p.redshirt?'Remove redshirt':'Redshirt this season'}</button>`:''}
      <button class="btn sm ghost" id="capTog">${isCap?'Remove captain':'Name captain'}</button></div>
    <p class="note">Redshirted players sit out but keep a year of eligibility if they play four games or fewer. Captains steady the locker room after losses.</p>
    <button class="btn light wide" id="closeP">Done</button>`);
    PATTR[p.pos].forEach(k=>on('up-'+k,()=>{const c=Math.ceil(p[k])+1;if(LG.credits>=c&&p[k]<4.95){LG.credits-=c;p[k]=r1(p[k]+.5);invalidate();saveNow();render()}}));
    on('mkStart',()=>{u.dco=u.dco||{};const ids=depth(u,p.pos).map(x=>x.id).filter(x=>x!==p.id);u.dco[p.pos]=[p.id,...ids];saveNow();render()});
    on('rsTog',()=>{p.redshirt=!p.redshirt;saveNow();render()});
    on('capTog',()=>{if(isCap)LG.captains=LG.captains.filter(x=>x!==p.id);else{LG.captains.push(p.id);if(LG.captains.length>2)LG.captains.shift()}saveNow();render()});
    on('closeP',()=>{closeModal();rerender()});
  };
  render();
}
function openEditor(id,done,L){
  L=L||LG;const t=L.teams[id];
  openModal(`<div class="eyebrow">Edit program</div><div style="display:flex;gap:12px;align-items:center" id="edPrev">${badge(t,'lg')}<b class="h2">${esc(teamName(t))}</b></div>
    <div class="field-row"><label for="edCity">School</label><input type="text" id="edCity" maxlength="22" value="${esc(t.city)}"></div>
    <div class="field-row"><label for="edName">Mascot</label><input type="text" id="edName" maxlength="16" value="${esc(t.name)}"></div>
    <div class="field-row"><label for="edAbbr">Abbreviation (2–4 letters)</label><input type="text" id="edAbbr" maxlength="4" value="${esc(t.abbr)}" style="text-transform:uppercase"></div>
    <div class="field-row"><label for="edStad">Stadium</label><input type="text" id="edStad" maxlength="30" value="${esc(t.stadium)}"></div>
    <div class="colors"><div class="field-row"><label for="edC1">Primary</label><input type="color" id="edC1" value="${t.c1}"></div><div class="field-row"><label for="edC2">Secondary</label><input type="color" id="edC2" value="${t.c2}"></div></div>
    <div class="btns"><button class="btn light" id="edSave">Save</button><button class="btn ghost" id="edCancel">Cancel</button></div>`);
  const prev=()=>{const tmp={...t,city:$('#edCity').value||t.city,name:$('#edName').value||t.name,abbr:($('#edAbbr').value||t.abbr).toUpperCase(),c1:$('#edC1').value,c2:$('#edC2').value};$('#edPrev').innerHTML=`${badge(tmp,'lg')}<b class="h2">${esc(teamName(tmp))}</b>`};
  ['edCity','edName','edAbbr','edC1','edC2'].forEach(i=>$('#'+i).oninput=prev);
  on('edSave',()=>{t.city=$('#edCity').value.trim()||t.city;t.name=$('#edName').value.trim()||t.name;t.abbr=($('#edAbbr').value.trim()||t.abbr).toUpperCase().slice(0,4);t.stadium=$('#edStad').value.trim()||t.stadium;t.c1=$('#edC1').value;t.c2=$('#edC2').value;closeModal();done&&done()});
  on('edCancel',()=>{closeModal();done&&done()});
}
function openEvent(){
  const e=LG.event;if(!e)return;const ev=EVENTS[e.k],p=T(LG.user).roster.find(x=>x.id===e.pid);if(!p){LG.event=null;return}
  openModal(`<div class="eyebrow">Front office · decision</div><div class="h2">${esc(ev.text(p))}</div><div class="btns">${ev.opts.map((o,i)=>`<button class="btn ${i?'ghost':''}" id="evo-${i}">${esc(o[0])}</button>`).join('')}</div>`);
  ev.opts.forEach((o,i)=>on('evo-'+i,()=>{const msg=o[1](LG,p);LG.fan=clamp(LG.fan,0,100);LG.morale=clamp(LG.morale,0,100);LG.event=null;saveNow();
    openModal(`<div class="eyebrow">Decision made</div><div class="h2">${esc(o[0])}</div><p class="note">${esc(msg)}</p><button class="btn light wide" id="evX">Back to the hub</button>`);on('evX',()=>{closeModal();rerender()})}));
}
function openPregame(g){
  if(!g)return;const u=T(LG.user),opp=T(g.h===LG.user?g.a:g.h),home=g.h===LG.user&&!g.neutral;
  const keys=[];const ol=unitOvr(u,['OL']),odl=unitOvr(opp,['DL']),wr=unitOvr(u,['WR']),ocb=unitOvr(opp,['CB']),olb=unitOvr(opp,['LB']);
  if(odl>ol+.3)keys.push('Their front four can get home. Get the ball out quickly and use bullet passes.');else keys.push('Your line should hold up. Let routes develop and look deep.');
  if(wr>ocb+.2)keys.push('Your receivers have the edge on their corners. Take shots downfield.');else keys.push('Their secondary is sticky. Lead receivers carefully and hit them in stride.');
  if(olb>3.6)keys.push('Their linebackers tackle well. Attack the edges and juke in space.');
  if(g.wx==='Rain')keys.push('Rain makes the ball slick: shorter throws, and protect it.');if(g.wx==='Wind')keys.push('The wind will push deep balls and kicks off line.');if(g.wx==='Snow')keys.push('Snow slows everyone down a step. Lean on the run.');
  if(g.rival)keys.push(`${u.trophy} is on the line.`);
  const watch=[...starters(opp,'QB'),...starters(opp,'WR').slice(0,1),...starters(opp,'DL').slice(0,4).sort((a,b)=>ovr(b)-ovr(a)).slice(0,1)];
  openModal(`<div class="pg-head"><span class="eyebrow">Pregame show</span><span class="eyebrow">${esc(g.neutral?'Neutral site':home?u.stadium:opp.stadium)}</span>${!home&&!g.neutral?'<span class="tag hot">Hostile crowd</span>':''}</div>
    ${gameHero(g,LG.week)}
    <div class="grid2 pg-grid"><div class="card"><div class="eyebrow">Keys to the game</div><ol class="pg-keys">${keys.slice(0,3).map(k=>`<li>${esc(k)}</li>`).join('')}</ol></div>
    <div class="card"><div class="eyebrow">Players to watch · ${esc(opp.abbr)}</div><div class="list">${watch.map(p=>`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span>${esc(fullName(p))} <small class="note">#${p.num} · ${yrStr(p)}</small></span></span>${ovrTag(p)}</div>`).join('')}</div></div></div>
    <div class="setrow pg-uni"><span class="eyebrow">Uniform</span><div class="seg" id="uniSeg">${UNI_STYLES.map(([k,l])=>`<button data-v="${k}" aria-pressed="${(LG.settings.uniform||'auto')===k}">${l}</button>`).join('')}</div></div>
    <div class="btns cta"><button class="btn" id="kickoff">${ICO.play}Kick off</button><button class="btn ghost" id="pgX">Back</button></div>`,true);
  document.querySelectorAll('#uniSeg button').forEach(b=>b.onclick=()=>{LG.settings.uniform=b.dataset.v;document.querySelectorAll('#uniSeg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));saveNow()});
  on('pgX',closeModal);on('kickoff',()=>{closeModal();startUserGame(g)});
}
function simUserGame(g){
  const [hs,as]=simScore(g.h,g.a,g.neutral);g.hs=hs;g.as=as;recordGame(LG,g);const home=g.h===LG.user;const us=home?hs:as,them=home?as:hs;
  const rep=processUserGame(LG,g,{us,them,won:us>them,simmed:true});
  finishWeek(LG);saveNow();showHub('home');toast(`${us>them?'Won':'Lost'} ${us}–${them} · +${rep.cc} CC`);
}

/* ---------- offseason ---------- */
function hubOffseason(){
  const o=LG.off,u=T(LG.user),h=LG.history[LG.history.length-1];
  const steps=['recap','departures','carousel','portal','recruit','signing'];const names={recap:'Season recap',departures:'Departures & draft',carousel:'Coaching carousel',portal:'Transfer portal',recruit:'Recruiting',signing:'Signing day'};
  const prog=`<div class="chips">${steps.map(s=>`<span class="chipbtn" aria-pressed="${o.stage===s}">${names[s]}</span>`).join('')}</div>`;
  if(o.stage==='recap'){
    const a=LG.awards[0];const mine=k=>a[k].filter(x=>x.team===LG.user);
    return `${prog}<div class="card hero"><div class="eyebrow">${h.season} season recap</div><div class="h1">${h.w}–${h.l}</div>
      <div class="tags">${h.rank?`<span class="tag gold">Final rank #${h.rank}</span>`:''}${h.cc?'<span class="tag gold">Conference champions</span>':''}${h.madePO?`<span class="tag gold">Playoff · #${h.seed} seed</span>`:''}${h.bowl?`<span class="tag">${esc(h.bowl.name)} ${h.bowl.won?'win':'loss'}</span>`:''}${h.champ?'<span class="tag gold">National champions</span>':''}</div>
      <p class="note">CFP champion: ${esc(h.champName)}${h.champFName?'. FCS champion: '+esc(h.champFName):''}. Heisman Trophy: ${esc(h.heisman||'—')}${LG.fcsPoy?'. FCS Player of the Year: '+esc(LG.fcsPoy.name):''}.</p></div>
    <div class="grid2"><div class="card"><div class="eyebrow">Athletic director review</div><div class="kv"><span>Expectation</span><b>${o.target}+ wins</b></div><div class="kv"><span>Change in job security</span><b class="${o.delta>=0?'res-w':'res-l'}">${o.delta>=0?'+':''}${o.delta}</b></div>${meterHTML(LG.coach.security)}<p class="note">${LG.coach.security<=10?'The AD has seen enough. Expect to be let go.':LG.coach.security<30?'You are on the hot seat next season.':'Your job is safe.'}</p></div>
      <div class="card"><div class="eyebrow">Your award winners</div><div class="list">${[...mine('allAm').map(x=>[x,'All-American']),...mine('allConf').map(x=>[x,'All-Conference']),...mine('frosh').map(x=>[x,'Freshman All-American'])].map(([x,l])=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span><span class="tag gold">${l}</span></div>`).join('')||'<p class="note">No honorees this year.</p>'}${a.coy===LG.user?'<div class="lrow"><span>You were named Coach of the Year.</span><span class="tag gold">COY</span></div>':''}</div></div></div>
    <button class="btn wide" id="offNext">Continue to departures</button>`;
  }
  if(o.stage==='departures'){const d=o.dep;const li=(arr,f)=>arr.length?arr.map(f).join(''):'<p class="note">None.</p>';
    return `${prog}<div class="grid2"><div class="card"><div class="h2">Graduating seniors</div><div class="list">${li(d.grads,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span>${`<span class="ovr">${tOvr99(x.ovr)}</span>`}</div>`)}</div></div>
    <div class="card"><div class="h2">Early NFL declarations</div><div class="list">${li(d.declares,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span>${`<span class="ovr">${tOvr99(x.ovr)}</span>`}</div>`)}</div></div></div>
    <div class="grid2"><div class="card"><div class="h2">Pro draft picks</div><div class="list">${li(d.drafted,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span><span class="tag ${x.round===1?'gold':''}">Round ${x.round} · pick ${x.pick}</span></div>`)}</div><p class="note">Draft picks boost your program's reputation with recruits.</p></div>
    <div class="card"><div class="h2">Entered the transfer portal</div><div class="list">${li(d.portalOut,x=>`<div class="lrow"><span class="l"><span class="num">${x.pos}</span><span>${esc(x.name)}</span></span>${`<span class="ovr">${tOvr99(x.ovr)}</span>`}</div>`)}</div><p class="note">Backups who don't get snaps may leave. Higher morale keeps more of them.</p></div></div>
    <button class="btn wide" id="offNext">Continue</button>`}
  if(o.stage==='carousel'){
    return `${prog}<div class="card hero"><div class="eyebrow">Coaching carousel</div><div class="h2">${o.fired?'You have been fired. These programs want to talk.':'Other programs want to hire you.'}</div><div class="list">${o.offers.map(id=>{const t=T(id);return `<div class="lrow"><span class="l">${badge(t)}<span><b>${esc(teamName(t))}</b><br><small class="note">${confName(t.conf)} · ${`Prestige ${t.prestige}/5`} · OVR ${tOvr99(teamOvr(t))}</small></span></span><button class="btn sm" id="offer-${id}">Take the job</button></div>`}).join('')}</div>${o.fired?'':'<button class="btn ghost" id="stayPut">Stay at '+esc(u.city)+'</button>'}</div>`;
  }
  if(o.stage==='portal'){
    return `${prog}<div class="card"><div class="setrow"><div class="h2">Transfer portal</div><span class="pill gold">${money(LG.nil)} NIL available</span></div><p class="note">Sign experienced players using your NIL collective. Transfers keep their class year. Roster: ${u.roster.length}/${ROSTER_CAP}.</p>
    <div class="list">${o.portal.map((p,i)=>`<button class="rrow ${p.signed?'sel':''}" id="tp-${i}"><span class="num">${p.pos}</span><span class="meta"><b>${esc(fullName(p))} <small>${yrStr(p)} · from ${esc(T(p.from).city)}</small></b><span class="attrs">${PATTR[p.pos].map(k=>`<span>${attrShort(p.pos,k)} ${`<span class="ovr">${a99(p[k])}</span>`}</span>`).join('')}</span></span><span class="pill">${p.signed?'Signed':money(portalCost(p))}</span></button>`).join('')}</div>
    <button class="btn wide" id="offNext">Continue to recruiting</button></div>`;
  }
  if(o.stage==='recruit'){
    const spent=sum(o.recruits.filter(r=>r.offered).map(recruitCost)),left=o.rp+o.nilBoost-spent,visits=o.recruits.filter(r=>r.visit).length;
    return `${prog}<div class="card"><div class="setrow"><div class="h2">Recruiting board</div><div class="pills"><span class="pill gold">${left} points left</span><span class="pill">${visits}/3 official visits</span></div></div>
    <p class="note">Offer scholarships with recruiting points (two per star, minus one). Interest is each recruit's chance of signing with you on Signing Day; an official visit adds 20%. Prestige, fan approval and titles raise interest.</p>
    <div class="setrow"><span class="note">Boost your budget with NIL: ${money(150)} per point (${o.nilBoost}/5 used)</span><button class="btn sm ghost" id="nilBoost" ${LG.nil<150||o.nilBoost>=5?'disabled':''}>+1 point</button></div>
    <div class="list">${o.recruits.map((r,i)=>`<div class="rrow ${r.offered?'sel':''}"><span class="num">${r.pos}</span><span class="meta"><b>${esc(fullName(r))} ${starStr(r.stars)}</b><small>${esc(r.home)} · ${PATTR[r.pos].map(k=>attrShort(r.pos,k)+' '+a99(r[k])).join(' · ')}</small><span style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:11px;color:var(--mute)"><span>Interest</span>${meterHTML(r.interest+(r.visit?20:0))}<b>${Math.min(99,r.interest+(r.visit?20:0))}%</b></span></span>
      <span class="btns" style="flex-direction:column;gap:6px"><button class="btn sm ${r.offered?'ghost':''}" id="rof-${i}">${r.offered?'Withdraw':'Offer · '+recruitCost(r)}</button>${r.offered?`<button class="btn sm ghost" id="rvi-${i}" ${!r.visit&&visits>=3?'disabled':''}>${r.visit?'Cancel visit':'Official visit'}</button>`:''}</span></div>`).join('')}</div>
    <button class="btn wide" id="offNext">Go to Signing Day</button></div>`;
  }
  if(o.stage==='signing'){const s=o.signing;
    return `${prog}<div class="card hero"><div class="eyebrow">National Signing Day</div><div class="h1">Class rank #${s.classRank}</div><div class="list">${s.res.map(r=>`<div class="lrow"><span class="l"><span class="num">${r.pos}</span><span>${esc(r.name)} ${starStr(r.stars)}</span></span><span class="tag ${r.ok?'ok':'hot'}">${r.ok?'Signed':'Chose another school'}</span></div>`).join('')||'<p class="note">You made no offers.</p>'}</div>
    <p class="note">Top classes: ${s.top.map(id=>esc(T(id).city)).join(', ')}. Open roster spots will be filled with walk-ons.</p><button class="btn wide" id="offNext">Start the ${LG.season+1} season</button></div>`;
  }
  return '';
}
function bindOffseason(){
  if(LG.phase!=='offseason')return;const o=LG.off;
  on('offNext',()=>{
    if(o.stage==='recap'){departures(LG);o.stage='departures'}
    else if(o.stage==='departures'){jobOffers(LG);if(o.offers.length)o.stage='carousel';else{buildPortal(LG);o.stage='portal'}}
    else if(o.stage==='portal'){buildRecruits(LG);o.stage='recruit'}
    else if(o.stage==='recruit'){signingDay(LG);o.stage='signing'}
    else if(o.stage==='signing'){const camp=startNewSeason(LG);saveNow();showHub('home');$('#hubScroll').scrollTop=0;banner(LG.season+' season','var(--team)');toast(`Camp: ${camp.length} rating upgrades`);return}
    saveNow();showHub('home');$('#hubScroll').scrollTop=0;
  });
  if(o.stage==='carousel'){o.offers.forEach(id=>on('offer-'+id,()=>{takeJob(LG,id);buildPortal(LG);o.stage='portal';saveNow();showHub('home')}));on('stayPut',()=>{buildPortal(LG);o.stage='portal';saveNow();showHub('home')})}
  if(o.stage==='portal')o.portal.forEach((p,i)=>on('tp-'+i,()=>{const u=T(LG.user);const c=portalCost(p);
    if(p.signed){p.signed=false;LG.nil+=c;u.roster=u.roster.filter(x=>x.id!==p.id);const src=T(p.from);if(!src.roster.some(x=>x.id===p.id)&&p.from!==LG.user)src.roster.push(stripPortal(p))}
    else{if(LG.nil<c){toast('Not enough NIL');return}if(u.roster.length>=ROSTER_CAP){toast('Roster is full');return}p.signed=true;LG.nil-=c;const src=T(p.from);src.roster=src.roster.filter(x=>x.id!==p.id);u.roster.push(stripPortal(p));assignNumbers(u)}
    saveNow();rerender()}));
  if(o.stage==='recruit'){
    on('nilBoost',()=>{if(LG.nil>=150&&o.nilBoost<5){LG.nil-=150;o.nilBoost++;saveNow();rerender()}});
    o.recruits.forEach((r,i)=>{on('rof-'+i,()=>{const spent=sum(o.recruits.filter(x=>x.offered).map(recruitCost));if(r.offered){r.offered=false;r.visit=false}else if(spent+recruitCost(r)<=o.rp+o.nilBoost)r.offered=true;else{toast('Not enough points');return}saveNow();rerender()});
      on('rvi-'+i,()=>{const v=o.recruits.filter(x=>x.visit).length;if(r.visit)r.visit=false;else if(v<3)r.visit=true;saveNow();rerender()})});
  }
}
function stripPortal(p){const q={...p};delete q.from;delete q.signed;q.num=0;q.ss=newSS();q.cond=100;q.inj=0;return q}

/* openPackImport lives in 02c-packs.js */

/* ---------- v5: social feed, team pages ---------- */
function hubFeed(){
  const f=(LG.feed||[]);
  return `<div class="card"><div class="h2">The Feed</div><p class="note">Reactions from around college football. All accounts are fictional.</p>
    ${f.length?f.slice(0,60).map(x=>`<div class="post"><span class="av" style="background:${x.c}">${esc(x.n.split(' ').map(w=>w[0]).join('').slice(0,2))}</span><div><div class="h">${esc(x.n)} <small>${esc(x.h)} · ${x.s} wk ${x.wk}</small></div><p>${esc(x.t)}</p><div class="eng">♥ ${x.likes.toLocaleString()} · ↻ ${Math.round(x.likes/7).toLocaleString()}${x.team!=null&&T(x.team)?` · <span data-team="${x.team}" style="color:var(--fg);text-decoration:underline">${esc(T(x.team).abbr)}</span>`:''}</div></div></div>`).join(''):'<p class="note">Play a week and the feed fills up.</p>'}</div>`;
}
function openTeamPage(id){
  const t=T(id);if(!t)return;const L=LG;let tab='overview';
  const games=[];L.weeks.forEach((w,wi)=>w.games.forEach(g=>{if(g.h===id||g.a===id)games.push({g,wi,w})}));
  const render=()=>{
    const rk=rankOf(id),pw=L.power&&L.power[id]!=null?L.power[id]:null;
    const top=POS_ORDER.flatMap(pos=>starters(t,pos)).sort((a,b)=>ovr99(b)-ovr99(a));
    let body='';
    if(tab==='overview'){const ts=t.rec,g=ts.w+ts.l;body=`<div class="kpis"><div><em>Record</em><b>${recStr(t)}</b></div><div><em>Conference</em><b>${ts.cw}–${ts.cl}</b></div><div><em>Overall</em><b>${tOvr99(teamOvr(t))}</b></div><div><em>Offense</em><b>${tOvr99(offOvr(t))}</b></div><div><em>Defense</em><b>${tOvr99(defOvr(t))}</b></div><div><em>Scheme</em><b>${esc(schemeOf(t))}</b></div><div><em>Points / game</em><b>${g?(ts.pf/g).toFixed(1):'—'}</b></div><div><em>Allowed / game</em><b>${g?(ts.pa/g).toFixed(1):'—'}</b></div><div><em>Power rating</em><b>${pw!=null?(pw>0?'+':'')+pw.toFixed(1):'—'}</b></div></div>
      ${t.trophy&&T(t.rival)?`<p class="note">Rivalry: ${esc(t.trophy)} vs ${esc(T(t.rival).city)}. ${esc(seriesText(t,T(t.rival)).replace(t.trophy+'. ',''))}</p>`:''}
      <div class="eyebrow">Top players</div><div class="list">${top.slice(0,8).map(p=>`<div class="lrow"><span class="l"><span class="num">${p.pos}</span><span><b>${esc(fullName(p))}</b> <small class="note">#${p.num} · ${['Fr','So','Jr','Sr'][p.yr-1]||''}</small></span></span><span>${ovrTag(p)}</span></div>`).join('')}</div>`}
    else if(tab==='roster'){body=POS_ORDER.map(pos=>`<div class="eyebrow" style="margin-top:6px">${pos}</div><div class="list">${depth(t,pos).map(p=>`<div class="lrow"><span class="l"><span class="num">${p.num}</span><span>${esc(fullName(p))} <small class="note">${['Fr','So','Jr','Sr'][p.yr-1]||''}${p.inj>0?' · injured':''}</small></span></span><span><small class="note">${esc(statLine(p))}</small> ${ovrTag(p)}</span></div>`).join('')}</div>`).join('')}
    else{body=`<div class="list">${games.map(({g,w})=>{const home=g.h===id,o=T(home?g.a:g.h),done=g.hs!=null,us=home?g.hs:g.as,them=home?g.as:g.hs;return `<div class="lrow"><span class="l"><small class="note" style="min-width:64px">${esc(w.label)}</small>${home?'vs':'@'} ${badge(o,'sm')} ${rankTag(o.id)}${esc(o.city)}</span><span class="${done?(us>them?'res-w':'res-l'):'note'}">${done?(us>them?'W ':'L ')+us+'–'+them:esc(g.tag||'')}</span></div>`}).join('')||'<p class="note">No games yet.</p>'}</div>`}
    openModal(`<div style="display:flex;gap:14px;align-items:center">${badge(t,'xl')}<div style="min-width:0"><div class="eyebrow">${esc(confName(t.conf,L))} · ${t.div}${rk?' · #'+rk:''}</div><div class="h2" style="font-size:24px">${esc(teamName(t))}</div><div class="note">${esc(t.stadium||'')}</div></div></div>
      <div class="seg" id="tpTabs">${[['overview','Overview'],['roster','Roster'],['schedule','Schedule']].map(([k,l])=>`<button data-v="${k}" aria-pressed="${k===tab}">${l}</button>`).join('')}</div>${body}<button class="btn ghost" id="tpClose">Close</button>`,true);
    $('#tpTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{tab=b.dataset.v;render()});on('tpClose',closeModal);
  };render();
}
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-team]');if(!el||!LG)return;if(!$('#hub').hidden||!$('#modal').hidden){e.stopPropagation();openTeamPage(+el.dataset.team)}},true);
