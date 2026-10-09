/* =========================================================
   10 · v6 features: sliders, haptics, wind, coin toss, icing, in-game injuries,
        pre-snap motion, hot routes, no-huddle, throw types, play-by-play,
        box score, drive chart, player grades, uniforms, body builds,
        photo mode, quick play, save backups, accessibility
   ========================================================= */
/* gameplay sliders (Settings → Gameplay sliders) */
function SL(k){const s=LG&&LG.settings&&LG.settings.sl;return s&&s[k]!=null?s[k]:1}

/* haptics: native Taptic Engine through the iOS bridge, vibration elsewhere */
function haptic(k){
  if(!LG||LG.settings.haptics===false)return;
  try{const h=window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.haptic;if(h){h.postMessage(k);return}
    if(navigator.vibrate)navigator.vibrate(k==='heavy'?40:k==='medium'?22:k==='success'?[30,40,30]:k==='error'?[60,30,60]:10)}catch(e){}
}

/* wind: speed and direction for the whole game; pushes passes and kicks */
function initWind(){S.wind={mph:S.wx==='Wind'?Math.round(R(12,24)):Math.round(R(0,8)),ang:R(0,Math.PI*2)}}
const windX=()=>S.wind?Math.cos(S.wind.ang)*(uOff()?1:-1):0,windY=()=>S.wind?Math.sin(S.wind.ang):0;
function windHTML(){
  const w=S.wind;if(!w||w.mph<4)return `${WX_ICON[S.wx]} ${S.wx}`;
  const deg=Math.atan2(windY()*VY,windX())*180/Math.PI;
  return `${WX_ICON[S.wx]} ${w.mph} MPH <i class="warr" style="transform:rotate(${deg.toFixed(0)}deg)">➜</i>`;
}

/* coin toss: call it, then receive or defer */
function coinToss(u,opp){
  S.phase='wait';const res=Math.random()<.5?'Heads':'Tails';
  const go=recv=>{S.recv2=recv==='home'?'away':'home';kickoffTo(recv,'Opening kickoff')};
  const after=won=>{
    if(won)return showOpt(`<b>You won the toss</b> · it's ${res.toLowerCase()}`,[{t:'Receive',s:'Ball first',f:()=>go('home')},{t:'Defer',s:'Ball to open the second half',cls:'alt',f:()=>go('away')}]);
    const defer=Math.random()<.65;toast(`${res}. ${opp.abbr} wins the toss and ${defer?'defers':'will receive'}`);setTimeout(()=>go(defer?'home':'away'),1400);
  };
  if(LG.settings.coin===false)return after(Math.random()<.5);
  showOpt('<b>Coin toss</b> · call it in the air',[{t:'Heads',s:'Call heads',f:()=>{haptic('light');after(res==='Heads')}},{t:'Tails',s:'Call tails',cls:'alt',f:()=>{haptic('light');after(res==='Tails')}}]);
}

/* icing the kicker: the opponent burns a timeout before a late, close field goal */
function tryIce(){
  if(S.to[1]<=0)return false;const diff=S.score[0]-S.score[1];
  const late=S.ot||(S.q===4&&S.clock<S.qlen*.2);if(!late||diff>0||diff<-3||Math.random()>.65)return false;
  S.to[1]--;toast(`${S.away.abbr} calls timeout to ice the kicker`);if(typeof BC!=='undefined')BC.chip('ICING THE KICKER',S.away.c1,`${S.to[1]} timeouts left`);logPBP(`${S.away.abbr} timeout to ice the kicker.`);return true;
}

/* in-game injuries: the player leaves the game and the next man up plays */
function injuryCheck(c,d,big){
  if(LG.settings.injuries===false)return;
  const p=(.005+(big?.03:0))*SL('inj');if(Math.random()>p)return;
  const v=Math.random()<.6?c:d;S.injured=S.injured||[];if(S.injured.includes(v.pl.id))return;
  S.injured.push(v.pl.id);applyInjuredDepth();
  const msg=`#${v.num} ${v.pl.last} (${v.team.abbr}) is hurt and leaves the game`;toast(msg);logPBP('Injury: '+msg,'big');
  if(typeof BC!=='undefined')setTimeout(()=>BC.chip('INJURY',v.team.c1,`${v.pl.pos} ${fullName(v.pl)} · next man up`),1500);
}
function applyInjuredDepth(){
  const bad=new Set(S.injured||[]);if(!bad.size||!S.dc)return;
  for(const side of ['u','a'])for(const pos in S.dc[side]){const l=S.dc[side][pos];S.dc[side][pos]=l.filter(p=>!bad.has(p.id)).concat(l.filter(p=>bad.has(p.id)))}
}
function settleInjuries(){
  for(const id of S.injured||[]){for(const t of [S.home,S.away]){const p=t.roster.find(x=>x.id===id);if(p){p.inj=Math.max(p.inj||0,rint(1,3));p.injWhy='Injured in game';p.injNew=true}}}
}

/* pre-snap motion: the slot (or flanker) runs across the formation before the snap */
function startMotion(){
  if(!S.pc||S.phase!=='presnap'||S.motion)return;
  const cand=[KP.H,KP.Z,KP.X].find(p=>p&&p.role==='WR'&&!p.blocker);if(!cand)return;
  const b=S.ballY,side=Math.sign(cand.y-b)||1;
  S.motion={p:cand,ty:clamp(b-side*Math.max(4,Math.abs(cand.y-b)*.45),3,FW-3),name:cand.rname,def:DEF.find(d=>d.cov&&d.cov.type==='man'&&d.cov.tgt===cand)};
  cand.rpath=null;cand.cont=null;haptic('light');hint('Motion · tap SNAP while he is moving');
}
function motionTick(dt){
  const m=S.motion;if(!m||m.done)return;const p=m.p,dy=m.ty-p.y;
  if(Math.abs(dy)<.3){m.done=true;p.vy=0;return}
  const v=Math.sign(dy)*Math.min(5.8,Math.abs(dy)*4+1);p.y+=v*dt;p.vy=v;p.phase+=Math.abs(v)*dt*1.85;p.face=1;
  if(m.def)m.def.y+=(p.y-m.def.y)*Math.min(1,dt*3);
}
function applyMotion(){
  const m=S.motion;if(!m)return;const p=m.p;
  if(m.name&&ROUTES[m.name]){const inD=p.y<S.ballY?1:-1;setRoute(p,m.name,inD)}
  p.vx=m.done?0:2.5;
}

/* hot routes: tap a receiver after picking a play */
const HOT=[['go','Go'],['slant','Slant'],['out','Out'],['curl','Curl'],['drag','Drag'],['post','Post'],['corner','Corner'],['flat','Flat'],['block','Block']];
function hotRouteAt(sx,sy){
  if(!uOff()||S.phase!=='presnap'||!S.pc)return false;
  const [wx,wy]=toWorld(sx,sy);let b=null,bd=2.6;for(const p of OFF){if(!eligible(p))continue;const d=hyp(p.x-wx,(p.y-wy)*.8);if(d<bd){bd=d;b=p}}
  if(!b)return false;showHot(b);return true;
}
function showHot(p){
  const bar=$('#hotBar');
  bar.innerHTML=`<b>Hot route · #${p.num} ${esc(p.pl.last)}</b><div>${HOT.map(([k,l])=>`<button data-r="${k}" aria-pressed="${p.rname===k||(k==='block'&&p.blocker)}">${l}</button>`).join('')}</div>`;
  bar.hidden=false;
  bar.querySelectorAll('[data-r]').forEach(btn=>btn.onclick=()=>{ac();const k=btn.dataset.r;
    if(k==='block'){p.blocker=true;p.route=null;p.rpath=null;p.cont=null;p.rname='block'}
    else{p.blocker=false;const inD=Math.abs(p.y-S.ballY)<.6?-S.flip:(p.y<S.ballY?1:-1);setRoute(p,k,inD)}
    bar.hidden=true;haptic('light')});
}

/* play-by-play log + drive chart */
function logPBP(t,cls){if(!S.home)return;S.pbp=S.pbp||[];S.pbp.push({q:S.ot?'OT':ordQ(S.q),c:S.ot?'':fmtClock(S.clock),tm:offT().abbr,t,cls:cls||''});if(S.pbp.length>400)S.pbp.shift()}
function logPlay(r,gain){
  const nm=x=>x&&x.pl?x.pl.last:'',c=play.carrier||Q;
  const dd=S.conv?'2-pt try':`${ord(S.down)} & ${S.firstDownX>=110?'Goal':Math.max(1,Math.round(S.firstDownX-S.los))} at ${spotLabel(S.los)}`;let t='';
  switch(r.kind){
    case 'td':t=play.caught?`${nm(Q)} pass to ${nm(c)}, TOUCHDOWN`:`${nm(c)} run, TOUCHDOWN`;break;
    case 'int':t=`${nm(Q)} pass INTERCEPTED by ${nm(c)}`;break;
    case 'fum':t=`FUMBLE by ${nm(play.fumbler||c)}, recovered by ${r.defRec?defT().abbr:offT().abbr}`;break;
    case 'sack':t=`${nm(Q)} sacked for ${gain}`;break;
    case 'inc':t=`${nm(Q)} pass incomplete${play.intended?' intended for '+nm(play.intended):''}${r.msg&&r.msg!=='Incomplete'?' ('+r.msg.toLowerCase()+')':''}`;break;
    case 'kneel':t=`${nm(Q)} kneels`;break;case 'spike':t=`${nm(Q)} spikes the ball`;break;
    default:t=play.caught?`${nm(Q)} pass to ${nm(c)} for ${gain}`:`${nm(c)} run for ${gain}`;if(r.kind==='oob')t+=', out of bounds';
  }
  logPBP(`${dd} · ${play.name}: ${t}`,['td','int','fum'].includes(r.kind)?'big':'');
}
function dres(r){if(S.drive&&!S.drive.res)S.drive.res=r}
function closeDrive(){const d=S.drive;if(d&&(d.plays||d.res)){S.drives=S.drives||[];S.drives.push({team:d.team,start:d.start!=null?d.start:0,end:d.end!=null?d.end:(d.start||0),plays:d.plays,yds:d.yds,res:d.res||'End of half',q:d.q})}S.drive=null}
function simDriveLog(d,yds,plays,label,time){
  logPBP(`${S.away.abbr} drive (simulated): ${plays} plays, ${yds} yards, ${fmtClock(time)} · ${label}`,'sim');
  closeDrive();(S.drives=S.drives||[]).push({team:'away',start:100-d,end:Math.min(100,100-d+yds),plays,yds,res:label,sim:true,q:S.q});
}
function driveChartHTML(){
  const ds=S.drives||[];if(!ds.length)return '';
  return `<div class="card"><div class="h2">Drive chart</div><div class="dchart">${ds.map(d=>{const t=d.team==='home'?S.home:S.away,a=clamp(d.start,0,100),b=clamp(d.end,0,100),good=/TD|FG/.test(d.res)&&!/Missed/.test(d.res);
    return `<div class="drow"><span class="ab">${esc(t.abbr)}</span><div class="lane"><i style="left:${Math.min(a,b)}%;width:${Math.max(1.5,Math.abs(b-a))}%;background:${t.c1}"></i></div><span class="res ${good?'ok':''}">${esc(d.res)}${d.sim?' *':''}</span></div>`}).join('')}</div><p class="note">Bars run from own goal line (left) to the opponent's (right). * simulated drive.</p></div>`;
}

/* box score for the pause menu and the post-game screen */
function boxScoreHTML(){
  const s=S.stats,o=S.ostats||newGameStats(),u=S.home,a=S.away;
  const row=(lab,x,y)=>`<tr><td>${lab}</td><td class="n">${x}</td><td class="n">${y}</td></tr>`;
  const lead=(t,m)=>{const out=[];const best=k=>{let b=null,bv=0;for(const id in m){if(m[id][k]>bv){bv=m[id][k];b=id}}return b};const f=id=>{const p=t.roster.find(x=>x.id==id);return p?p.last:'?'};
    const q=best('pa'),r=best('ra'),w=best('recy');if(q)out.push(`${f(q)} ${m[q].pc}/${m[q].pa}, ${m[q].py} yds, ${m[q].ptd} TD`);if(r)out.push(`${f(r)} ${m[r].ra} car, ${m[r].ry} yds`);if(w)out.push(`${f(w)} ${m[w].rec} rec, ${m[w].recy} yds`);return out.join(' · ')||'No live plays yet'};
  return `${typeof BC!=='undefined'?BC.linescore():''}
    <table class="box"><thead><tr><th></th><th class="n">${esc(u.abbr)}</th><th class="n">${esc(a.abbr)}</th></tr></thead><tbody>
    ${row('Total yards',s.passYds+s.rushYds,o.passYds+o.rushYds)}${row('Passing',`${s.comp}/${s.att} · ${s.passYds}`,`${o.comp}/${o.att} · ${o.passYds}`)}${row('Rushing',`${s.rushAtt} · ${s.rushYds}`,`${o.rushAtt} · ${o.rushYds}`)}
    ${row('First downs',s.firstDowns,o.firstDowns)}${row('3rd down',`${s.thirdC}/${s.thirdA}`,`${o.thirdC}/${o.thirdA}`)}${row('Turnovers',s.int+s.fum,o.int+o.fum)}${row('Sacks taken',s.sacks,o.sacks)}${row('Penalties',`${s.pen}-${s.penYds}`,`${o.pen}-${o.penYds}`)}</tbody></table>
    <p class="note"><b>${esc(u.abbr)}:</b> ${esc(lead(u,S.pst))}<br><b>${esc(a.abbr)}:</b> ${esc(lead(a,S.opst||{}))}</p>
    <p class="note">Opponent columns count drives you played on defense.</p>`;
}
function pbpHTML(){const l=(S.pbp||[]).slice().reverse();return l.length?`<div class="pbp">${l.map(e=>`<div class="pe ${e.cls}"><span class="q">${e.q} ${e.c}</span><span class="tm">${esc(e.tm)}</span><span>${esc(e.t)}</span></div>`).join('')}</div>`:'<p class="note">No plays yet.</p>'}

/* post-game player grades (A+ to F) from what each player did */
function playerGrades(){
  const u=S.home,out=[];
  const letter=v=>v>=95?'A+':v>=90?'A':v>=85?'A-':v>=80?'B+':v>=75?'B':v>=70?'B-':v>=65?'C+':v>=60?'C':v>=55?'C-':v>=50?'D':'F';
  for(const id in S.pst){const p=u.roster.find(x=>x.id==id);if(!p)continue;const s=S.pst[id];let v=null,line='';
    if(s.pa>=4){const r=((8.4*s.py)+(330*s.ptd)+(100*s.pc)-(200*s.int))/s.pa;v=clamp(40+(r-80)*.42,25,99);line=`${s.pc}/${s.pa}, ${s.py} yds, ${s.ptd} TD, ${s.int} INT`}
    else if(s.ra>=4){const ypc=s.ry/s.ra;v=clamp(48+ypc*7+s.rtd*6,25,99);line=`${s.ra} car, ${s.ry} yds, ${s.rtd} TD`}
    else if(s.rec>=2){v=clamp(52+s.recy/3+s.rectd*7,25,99);line=`${s.rec} rec, ${s.recy} yds, ${s.rectd} TD`}
    if(v!=null)out.push({p,v,line})}
  for(const id in S.dxp){const p=u.roster.find(x=>x.id==id);const d=S.dxp[id];if(!p||!(d.tkl||d.sck||d.dint))continue;const v=clamp(55+d.tkl*4+d.sck*10+d.dint*14,25,99);out.push({p,v,line:`${d.tkl||0} tkl${d.sck?', '+d.sck+' sck':''}${d.dint?', '+d.dint+' INT':''}`})}
  out.sort((a,b)=>b.v-a.v);
  if(!out.length)return '';
  return `<div class="card"><div class="h2">Player grades</div><div class="list">${out.slice(0,10).map(x=>`<div class="lrow"><span class="l"><span class="grade g${letter(x.v)[0]}">${letter(x.v)}</span><span><b>${esc(fullName(x.p))}</b> <small class="note">${x.p.pos} · ${esc(x.line)}</small></span></span></div>`).join('')}</div></div>`;
}

/* pause menu panels */
function pausePanel(k){
  const box=$('#pauseInfo');
  if(!k||box.dataset.k===k){box.hidden=true;box.dataset.k='';return}
  box.dataset.k=k;box.innerHTML=k==='box'?boxScoreHTML():k==='pbp'?pbpHTML():driveChartHTML()||'<p class="note">No completed drives yet.</p>';box.hidden=false;
}

/* uniforms: the host wears colors and the visitor white, unless you pick something else */
const UNI_STYLES=[['auto','Traditional'],['color','Home colors'],['white','Road whites'],['alt','Alternate dark'],['rush','Color rush']];
function uniStyle(team){
  const pick=(LG.settings.uniform||'auto');
  const userStyle=pick==='auto'?(hostT()===S.home?'color':'white'):pick;
  if(team===S.home)return userStyle;
  return userStyle==='white'?'color':'white';
}
function uniColors(team){
  const st=uniStyle(team),c1=team.c1,c2=team.c2,ct=contrasty(c1,c2);
  if(st==='white')return {j:'#F1F2F4',t:c1,p:'#D7DAE0',h:c1,s:c1,mask:'#C7CCD4'};
  if(st==='alt')return {j:'#17191f',t:c1,p:'#17191f',h:'#17191f',s:'#17191f',mask:c1};
  if(st==='rush'){const j=lum(c2)>.85?shade(c1,-.35):c2;return {j,t:c1,p:j,h:j,s:j,mask:c1}}
  return {j:c1,t:ct?c2:'#FFFFFF',p:ct?c2:'#E6E6E6',h:c1,s:ct?c2:'#FFFFFF',mask:'#C7CCD4'};
}
/* body types by position */
const BUILD={OL:[1.22,1.02],DL:[1.17,1.02],LB:[1.08,1],TE:[1.08,1.01],RB:[1.03,.97],WR:[.92,1.01],CB:[.92,.99],S:[.96,1],QB:[1,1.01],K:[.9,.97]};

/* photo mode */
let PHOTO_DRAG=null;
function enterPhoto(){
  S.photo=true;$('#pausem').hidden=true;document.documentElement.classList.add('photo');$('#photoBar').hidden=false;$('#phZoom').value=String(cam.z);
}
function exitPhoto(){S.photo=false;S.paused=false;document.documentElement.classList.remove('photo');$('#photoBar').hidden=true;cv.style.filter=''}
$('#phDone').onclick=()=>{ac();exitPhoto()};
$('#phZoom').oninput=e=>{cam.z=+e.target.value};
$('#phFilter').onchange=e=>{cv.style.filter={none:'',film:'sepia(.35) contrast(1.1) saturate(.85)',bw:'grayscale(1) contrast(1.15)',vivid:'saturate(1.45) contrast(1.08)',night:'brightness(.75) contrast(1.2) hue-rotate(-10deg)'}[e.target.value]||''};
cv.addEventListener('pointerdown',e=>{if(S.photo){PHOTO_DRAG={x:e.clientX,y:e.clientY};e.stopImmediatePropagation()}},true);
cv.addEventListener('pointermove',e=>{if(S.photo&&PHOTO_DRAG){cam.x-=(e.clientX-PHOTO_DRAG.x)/scE();cam.y-=(e.clientY-PHOTO_DRAG.y)/(scE()*VY);PHOTO_DRAG={x:e.clientX,y:e.clientY};e.stopImmediatePropagation()}},true);
addEventListener('pointerup',()=>{PHOTO_DRAG=null});

/* quick play: any two programs, nothing saved */
function openQuickPlay(){
  const L=genNCAALeague('Quick play');L.quick=true;const opts=L.teams.slice().sort((a,b)=>a.city.localeCompare(b.city)).map(t=>`<option value="${t.id}">${esc(t.city)} ${esc(t.name)}</option>`).join('');
  const top=L.rank.slice(0,2);
  openModal(`<div class="eyebrow">Quick play</div><div class="h2">Pick any two teams</div><p class="note">An exhibition game. Nothing is saved to your dynasties.</p>
    <div class="field-row"><label for="qpH">You (home)</label><select id="qpH">${opts}</select></div>
    <div class="field-row"><label for="qpA">Opponent</label><select id="qpA">${opts}</select></div>
    <div class="field-row"><label for="qpW">Weather</label><select id="qpW">${['Clear','Rain','Wind','Snow'].map(w=>`<option>${w}</option>`).join('')}</select></div>
    <div class="field-row"><label for="qpS">Kickoff</label><select id="qpS">${['Noon','Afternoon','Primetime'].map(w=>`<option ${w==='Primetime'?'selected':''}>${w}</option>`).join('')}</select></div>
    <div class="field-row"><label for="qpQ">Quarter length</label><select id="qpQ"><option value="120">2 min</option><option value="180" selected>3 min</option><option value="300">5 min</option></select></div>
    <div class="btns"><button class="btn" id="qpGo">Play</button><button class="btn ghost" id="qpX">Back</button></div>`);
  $('#qpH').value=String(top[0]);$('#qpA').value=String(top[1]);
  on('qpX',closeModal);
  on('qpGo',()=>{const h=+$('#qpH').value,a=+$('#qpA').value;if(h===a){toast('Pick two different teams');return}
    L.user=h;L.coach.name='Coach';L.settings.qlen=+$('#qpQ').value;LG=L;SLOT=null;applyStyle();closeModal();
    const g={h,a,hs:null,as:null,wx:$('#qpW').value,slot:$('#qpS').value,tag:'Exhibition'};
    const wk=L.weeks[L.week];wk.games=wk.games.filter(x=>x.h!==h&&x.a!==h&&x.h!==a&&x.a!==a);wk.games.push(g);
    applyTeamTheme(T(h));startUserGame(g)});
}

/* save backups: the previous version of each slot is kept (at most every 10 minutes) */
function backupBeforeSave(slot){
  try{const prev=KV.get('gl3.slot'+slot);const bt=+(KV.get('gl3.bakt'+slot)||0);if(prev&&Date.now()-bt>10*60e3){KV.set('gl3.bak'+slot,prev);KV.set('gl3.bakt'+slot,String(Date.now()))}}catch(e){}
}
function restoreBackup(slot){
  const raw=KV.get('gl3.bak'+slot);if(!raw)return false;
  try{const L=migrate(unpack(raw));if(!L)return false;KV.set('gl3.slot'+slot,raw);KV.set('gl3.live'+slot,null);Saves.touch(slot,L);return true}catch(e){return false}
}

/* accessibility */
function applyAccess(){const r=document.documentElement;r.classList.toggle('bigtext',!!(LG&&LG.settings.bigText));r.classList.toggle('cb',!!(LG&&LG.settings.cb))}
function openCol(nd){const cb=LG&&LG.settings.cb;return nd>3?(cb?'#4EA3FF':'#3BD98A'):nd>1.6?(cb?'#F5F5F5':'#F2B33D'):(cb?'#FF9F1C':'#FF4D5E')}

/* rankings movement, national leaders, trophy case, game of the week */
function rankMove(id,i,div){
  const prev=div==='FCS'?LG.prevRankF:LG.prevRank;if(!prev||!LG.week)return '';
  const p=prev.indexOf(id);if(p<0||p>=25)return '<span class="mv new">NEW</span>';
  const d=p-i;return d>0?`<span class="mv up">▲${d}</span>`:d<0?`<span class="mv dn">▼${-d}</span>`:'<span class="mv">–</span>';
}
function nationalLeaders(){
  const u=T(LG.user),div=u.div,cats=[['Passing yards','py',p=>p.ss.py],['Rushing yards','ry',p=>p.ss.ry],['Receiving yards','recy',p=>p.ss.recy],['Total TDs','td',p=>p.ss.ptd+p.ss.rtd+p.ss.rectd],['Tackles','tkl',p=>p.ss.tkl],['Sacks','sck',p=>p.ss.sck],['Interceptions','dint',p=>p.ss.dint]];
  const all=[];for(const t of LG.teams){if(t.div!==div)continue;for(const p of t.roster)all.push({p,t})}
  return `<div class="card"><div class="h2">${div} national leaders</div><div class="leaders">${cats.map(([lab,k,f])=>{const top=all.filter(x=>f(x.p)>0).sort((a,b)=>f(b.p)-f(a.p)).slice(0,5);
    return `<div><div class="eyebrow">${lab}</div><div class="list">${top.map((x,i)=>`<div class="lrow ${x.t.id===LG.user?'me':''}"><span class="l"><span class="num">${i+1}</span><span data-team="${x.t.id}">${esc(fullName(x.p))} <small class="note">${esc(x.t.abbr)}</small></span></span><b>${f(x.p)}</b></div>`).join('')||'<p class="note">No stats yet.</p>'}</div></div>`}).join('')}</div></div>`;
}
function trophyCase(){
  const u=T(LG.user),held=LG.teams.filter(t=>t.rival===u.id&&u.holder===u.id).map(()=>u.trophy).filter(Boolean);
  const heis=(LG.awards||[]).filter(a=>a.heisman&&a.heisman.team===LG.user).length+(u.roster.filter(p=>p.heisman).length?0:0);
  const tiles=[['🏆','National titles',u.titles||0],['🥇','Conference titles',u.ccTitles||0],['🏈','Bowl wins',u.bowlWins||0],['🎖️','Heisman winners',heis],['⭐','Coach of the Year',LG.coach.coy||0],['🔔','Rivalry trophy',u.trophy?(u.holder===u.id?'Held':'Not held'):'—']];
  return `<div class="card"><div class="h2">Trophy case</div><div class="tcase">${tiles.map(([i,l,v])=>`<div class="tile"><span class="ic">${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}</div>${u.trophy?`<p class="note">${esc(u.trophy)} vs ${esc(T(u.rival).city)}.</p>`:''}</div>`;
}
function gameOfWeek(){
  const w=LG.weeks[LG.week];if(!w||LG.phase!=='regular')return '';
  let best=null,bs=1e9;for(const g of w.games){if(g.hs!=null||g.h===LG.user||g.a===LG.user)continue;const a=rankOf(g.h)||40,b=rankOf(g.a)||40;const s=a+b-(g.rival?10:0);if(s<bs){bs=s;best=g}}
  if(!best||bs>=70)return '';const H=T(best.h),A=T(best.a),wp=winProb(H,A,best.neutral?0:1);
  return `<div class="card gotw"><div class="eyebrow">Game of the week${best.tag?' · '+esc(best.tag):''}</div><div class="matchup"><div class="side" data-team="${A.id}">${badge(A,'lg')}<b>${rankTag(A.id)}${esc(A.city)}</b><small>${recStr(A)}</small></div><span class="vs">${best.neutral?'VS':'AT'}</span><div class="side" data-team="${H.id}">${badge(H,'lg')}<b>${rankTag(H.id)}${esc(H.city)}</b><small>${recStr(H)}</small></div></div><div class="tags" style="justify-content:center"><span class="tag">${esc(H.abbr)} ${pct(wp)} to win</span><span class="tag">${WX_ICON[best.wx||'Clear']} ${best.slot||''}</span></div></div>`;
}

/* wiring for buttons that live in the page shell */
$('#pmBox').onclick=()=>{ac();pausePanel('box')};$('#pmPbp').onclick=()=>{ac();pausePanel('pbp')};$('#pmDrv').onclick=()=>{ac();pausePanel('drv')};
$('#pmPhoto').onclick=()=>{ac();$('#pauseInfo').hidden=true;enterPhoto()};
/* menu tap feedback */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(!b)return;if(LG&&LG.settings.uiSounds===false)return;sfx('tap');haptic('light')},true);
setTimeout(()=>{const sp=$('#splash');if(sp)sp.remove()},2200);
