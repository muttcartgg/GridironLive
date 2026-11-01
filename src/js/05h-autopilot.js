/* =========================================================
   05h · Autopilot, Coach mode and Key moments (v7.4)

   AUTOPILOT: the AI plays the user's team (S.home) with the very code the CPU team runs: the QB's progression
   reads, throwaways and scrambles (05d aiQB / aiThrow, at a skill from the user's roster), the ball carrier's lane
   search and moves (aiRunner; 05e stRunner's CPU branch on returns), all eleven defenders including the one the user
   normally drives (defAI with S.ctrl cleared at the snap), fair catch / touchback calls (05e stDecide) and kicks by
   the kicker's rating (autoKick). Play calls come from apChoosePlay (aiPickPlay + the CPU's clock and 4th-down logic).
   API
     autoOn() / autoOff()        the AI plays (or stops playing) the user's team; safe at any time, applied to the
                                 live play at once (autoSync)
     S.auto                      true while the autopilot drives the user's team
     AUTO.exempt = <player id>   one of the user's players the autopilot never drives (career mode): that player keeps
                                 the stick / aim / action buttons, everyone else is AI. null = autopilot drives all
     userCtl(p)                  true when sprite p answers to the user's input right now
     autoSprite()                the exempt player's sprite on the field, or null
     apChoosePlay()              the AI's offensive call for the user ({special:'punt'|'fg'|'kneel'|'spike'} or a play)
     AUTO.speed = 1|2 · autoSkip()   live-play speed / run the current play to its whistle
   PLAY STYLES (LG.settings.playStyle): 'full' (default) · 'coach' (you call every play, the autopilot plays it) ·
     'km' Key moments: S.ff fast-forwards the real engine (both teams on autopilot, no rendering, a play-by-play
     overlay) and hands you the game at high-leverage moments (kmWhy), then resumes once that drive is over.
   ========================================================= */
const AUTO={exempt:null,speed:1,m0:false,shown:false};
const playStyle=()=>(LG&&LG.settings&&LG.settings.playStyle)||'full';
const STYLE_N={full:'Full control',coach:'Coach mode',km:'Key moments'};
function autoSprite(){if(AUTO.exempt==null)return null;for(const p of P)if(p.user&&p.pl&&p.pl.id===AUTO.exempt)return p;return null}
const userCtl=p=>!!p&&!!p.user&&(!S.auto||AUTO.exempt!=null&&!!p.pl&&p.pl.id===AUTO.exempt);
function autoOn(){S.auto=true;autoSync()}
function autoOff(){S.auto=false;AUTO.speed=1;autoSync()}
/* apply the autopilot state to the play on the field: who the stick drives, the action buttons */
function autoSync(){
  if(S.auto){const ex=autoSprite();touch=null;stick=null;aim=null;
    if(S.phase==='live'||S.phase==='dead'){S.ctrl=ex&&(play&&play.st||ex.side==='d')?ex:null;if(ex)showActs();else hideActs()}}
  else if(S.phase==='live'&&play){if(!uOff()&&!S.ctrl&&!play.st)switchDefender();if(play.st&&typeof stCtrlInit==='function')stCtrlInit();showActs()}
  apBarTick(true);
}
/* at the snap: the autopilot's defenders are all AI (the exempt player keeps the stick) */
function autoSnapCtl(){if(!S.auto)return;const ex=autoSprite();if(!uOff())S.ctrl=ex&&ex.side==='d'?ex:null}
/* the CPU QB's read speed and judgment, at the user's roster strength */
const apSkill=()=>clamp(.45+(teamOvr(S.home)-3)*.13+(LG.settings.diff-1)*.04,.2,.97);
function autoQB(dt){const sk=S.aiSkill;if(uOff())S.aiSkill=apSkill();try{aiQB(dt)}finally{S.aiSkill=sk}}
const autoQBOn=()=>S.auto&&uOff()&&!userCtl(Q);

/* ---------- AI decisions for the user's team ---------- */
/* aiFourth from either side's point of view (the same expected-points call the CPU makes) */
function fourthFor(team){
  const home=team===S.home,opp=home?S.away:S.home,togo=S.firstDownX-S.los,fgd=fgDist(),late=S.q>=4&&S.clock<S.qlen*.3&&!S.ot,
    diff=home?S.score[0]-S.score[1]:S.score[1]-S.score[0],k=home?kicker():oppKicker(),inRange=fgd<=maxFG(k)-2;
  if(S.ot)return inRange&&togo>3?'fg':'go';
  if(late&&diff<0){if(diff>=-3&&inRange)return 'fg';return diff>=-8||S.clock<S.qlen*.2?'go':S.los<45&&togo>4?'punt':'go'}
  if(late&&S.clock<S.qlen*.1&&diff<=0)return inRange?'fg':'go';
  const ytg=110-S.los,id=identityOf(team),pc=clamp(convChance()+(id.opt?.06:0),.05,.92);
  const evGo=pc*(ytg-togo<=0?6.2:expPoints(ytg-togo,1,Math.min(10,ytg-togo)))-(1-pc)*expPoints(100-ytg,1,10);
  const pFG=inRange?clamp(1.18-fgd*.0125-(5-k.thr)*.03,.15,.985):0,evFG=inRange?pFG*(3-expPoints(75,1,10))-(1-pFG)*expPoints(Math.min(80,93-ytg),1,10):-9;
  const evPunt=ytg<=38?-9:-expPoints(ytg<=50?85:Math.min(95,140-ytg),1,10);
  const safe=late&&diff>0?.6:0,bias=.35-(id.opt?.2:0)-clamp((offOvr(team)-defOvr(opp))*.15,-.1,.2)+safe;
  if(evGo-bias>Math.max(evFG,evPunt))return 'go';
  return evFG>=evPunt?'fg':'punt';
}
/* the user's offense, called by the AI: kneel / spike / 4th down exactly as the CPU does, else aiPickPlay */
function apChoosePlay(){
  const sit=sitInfo(),H=S.home,m=sit.margin;
  if(S.conv)return aiPickPlay(H,{...sit,toGo:3,down:3,redzone:true});
  const n=5-S.down,dto=S.to[1],kneel=S.clock<=Math.max(0,n-dto)*40+Math.min(n,dto)*5+1;
  if(!S.ot&&S.q===4&&m>0&&S.down<4&&kneel)return {special:'kneel'};
  if(!S.ot&&S.q===2&&m>=0&&S.los<45&&S.clock<S.qlen*.07&&S.down<4&&S.clockRun)return {special:'kneel'};
  if(S.down===4){const d=fourthFor(H);if(d!=='go'&&!(d==='punt'&&S.ot))return {special:d}}
  if(sit.twoMin&&S.clockRun&&S.down<3&&S.to[0]===0&&S.clock<S.qlen*.1&&S.clock>4&&(S.q===4||S.los>=60))return {special:'spike'};
  return aiPickPlay(H,sit);
}
/* the try after the user's touchdown (aiPAT's chart, from the user's side) */
function apGoTwo(){const d=S.score[0]-S.score[1];
  return (S.ot&&S.otRound>=2)||(!S.ot&&S.q===4&&S.clock<S.qlen*.55&&[-2,-5,-9,-10,-12,-16,1,5,12].includes(d))||(!S.ot&&S.q===3&&S.clock<S.qlen*.5&&[-2,-10].includes(d))}
/* the user's kickoff: onside when the CPU would (trailing by 9-16 late, or by one score at the very end) */
function apOnside(){const d=S.score[0]-S.score[1];return !S.ot&&S.q===4&&((S.clock<=S.qlen*.25&&d<=-9&&d>=-16)||(S.clock<=S.qlen*.1&&d<0&&d>=-8))}
/* field goals and extra points by the kicker's rating (the CPU's make chance), shown through the normal kick flight */
function autoKick(){
  const k=kick;if(!k||S.phase!=='kick'||k.stage==='flight')return;
  const p=k.kind==='xp'?.965:clamp(1.18-k.dist*.0125-(5-k.k.thr)*.03,.15,.985)*(S.wx==='Rain'||S.wx==='Snow'?.96:1),good=Math.random()<p,
    short=!good&&k.dist>=45&&Math.random()<.5,a=!good&&!short?(Math.random()<.5?-1:1)*k.width*R(1.1,1.5):R(-.6,.6)*k.width;
  k.lockA=a-k.drift;k.stage='power';k.pow=short?k.need*R(.82,.97):Math.min(1,k.need+R(.02,.12));kickTap();
}
/* Coach mode: the play you picked is snapped for you after a beat (Change / Adjust on the snap bar still work) */
function coachSnap(pc){setTimeout(()=>{if(S.auto&&!S.ff&&S.phase==='presnap'&&S.pc===pc&&!S.paused&&$('#adjMenu').hidden&&uOff()){$('#snapBar').hidden=true;startPlay(pc)}},850)}

/* ---------- speed bar while the autopilot plays ---------- */
function autoSkip(){if(!play||S.phase!=='live')return;for(let i=0;i<6000&&S.phase==='live';i++)simulate(1/120);if(S.phase==='dead')deadT=Math.min(deadT,.45)}
function apBarTick(force){
  const b=$('#apBar');if(!b)return;const show=!!S.auto&&!S.ff&&!S.paused&&(S.phase==='live'||S.phase==='dead')&&!!play;
  if(show===AUTO.shown&&!force)return;AUTO.shown=show;b.hidden=!show;
  if(show)b.querySelectorAll('[data-sp]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.sp===String(AUTO.speed))));
}
$('#apBar').querySelectorAll('[data-sp]').forEach(b=>b.onclick=e=>{e.stopPropagation();ac();const v=b.dataset.sp;if(v==='skip')return autoSkip();AUTO.speed=+v;apBarTick(true)});
/* the mode tag on the call sheet header */
function modeTag(){const st=playStyle(),t=st==='km'?(S.km?'Key moment · '+S.km.why:'Key moments'):STYLE_N[st]||'Full control';return ` · <span class="tag ap-mode ap-${st}">${esc(t)}</span>`}

/* ---------- play style: game start, switching mid-game ---------- */
function styleInit(){S.km=null;S.kmTake=false;S.ff=false;AUTO.speed=1;const st=playStyle();S.auto=st!=='full';if(st==='km')kmResume()}
function setPlayStyle(v){
  LG.settings.playStyle=v;if(typeof saveNow==='function')saveNow();
  if(!S.home||['hub','over','boot','menu'].includes(S.phase))return;
  if(S.ff)kmStopFF();S.km=null;S.kmTake=false;AUTO.speed=1;S.auto=v!=='full';
  /* Key moments picks up at the next snap: simming starts there unless it is a key moment itself */
  if(v==='km')S.kmArm=true;
  autoSync();if(S.phase==='presnap'&&!S.paused)toPresnap();
}
function pauseModeHTML(){const st=playStyle(),dm=LG.settings.defMode||'ask',seg=(id,o,v)=>`<div class="seg" id="${id}">${o.map(([k,l])=>`<button data-v="${k}" aria-pressed="${k===v}">${l}</button>`).join('')}</div>`;
  return `<div class="setrow"><span class="eyebrow">Play style</span>${seg('pmStyle',[['full','Full control'],['coach','Coach'],['km','Key moments']],st)}</div><div class="setrow"><span class="eyebrow">Opponent drives</span>${seg('pmDef',[['ask','Ask'],['play','Play D'],['sim','Sim']],dm)}</div>`}
function pauseModeRender(){const box=$('#pmMode');if(!box||!LG)return;box.innerHTML=pauseModeHTML();
  box.querySelectorAll('#pmStyle [data-v]').forEach(b=>b.onclick=()=>{ac();const v=b.dataset.v;S.paused=false;setPlayStyle(v);S.paused=true;pauseModeRender();toast(STYLE_N[v])});
  box.querySelectorAll('#pmDef [data-v]').forEach(b=>b.onclick=()=>{ac();LG.settings.defMode=b.dataset.v;if(typeof saveNow==='function')saveNow();pauseModeRender()})}

/* ---------- KEY MOMENTS ---------- */
/* how much one possession can move the user's win probability (05w): the swing of a touchdown for the offense */
function kmLeverage(){
  if(!S.home||S.ot)return 1;const oi=offIdx(),w0=winProbState();S.score[oi]+=7;const w1=winProbState();S.score[oi]-=7;return Math.abs(w1-w0)}
const kmTwoMin=()=>(S.q===2||S.q===4)&&!S.ot&&S.clock<=Math.max(lateThr(),S.qlen*.28);
/* why this snap is a key moment (null = keep simming). pc = the CPU's call when it has the ball */
function kmWhy(pc){
  if(S.kmTake){S.kmTake=false;return 'You took over'}
  const uo=uOff();if(!uo&&(LG.settings.defMode||'ask')==='sim')return null;   // "Sim them": you only play offense
  if(S.ot)return 'Overtime';
  const m=S.score[0]-S.score[1],am=Math.abs(m),tg=S.firstDownX-S.los;
  if(S.q===4&&kmTwoMin()&&am<=16)return 'Two-minute drill';
  if(S.q===2&&kmTwoMin()&&(uo||S.los>=50))return 'Two-minute drill · end of the half';
  if(S.q===4&&am<=8)return '4th quarter · one-score game';
  if(S.conv)return null;
  if(uo&&S.los>=90)return 'Red zone';
  if(!uo&&S.los>=100&&!(pc&&pc.special))return 'Goal-line stand';
  const lev=kmLeverage();
  if(S.down===4&&(uo?tg<=3&&S.los>=55||lev>=.2:pc&&!pc.special&&(S.los>=50||lev>=.2)))return uo?'Big 4th down':'4th-down stop';
  if(lev>=.32)return 'High leverage · '+Math.round(lev*100)+'% win-probability swing';
  return null;
}
/* called by toPresnap in Key moments: drop the user in, keep control through the drive, or resume simming */
function kmCheck(pc){
  if(playStyle()!=='km'||!S.home)return;
  if(S.kmArm){S.kmArm=false;const w=kmWhy(pc);if(w)return kmStart(w);return kmResume()}
  if(S.ff){const w=kmWhy(pc);if(w)kmStart(w);return}
  if(S.km&&!kmOver())return;
  const w=kmWhy(pc);if(w)kmStart(w);else kmResume();
}
/* the moment lasts for the rest of the drive (a try after a touchdown stays with it) */
function kmOver(){const k=S.km;if(!k)return true;if(S.conv&&S.poss===k.poss)return false;
  return S.poss!==k.poss||S.score[0]+S.score[1]!==k.pts||(S.q<=2?1:S.q<=4?2:3)!==k.half||S.otRound!==k.otR}
function kmStart(why){
  const was=S.ff;kmStopFF();S.auto=false;AUTO.speed=1;
  S.km={why,poss:S.poss,pts:S.score[0]+S.score[1],half:S.q<=2?1:S.q<=4?2:3,otR:S.otRound};
  const m=S.score[0]-S.score[1],mt=m>0?'up '+m:m<0?'down '+(-m):'tied',dd=S.conv?'2-pt try':`${ord(S.down)} & ${S.firstDownX>=110?'Goal':Math.max(1,Math.round(S.firstDownX-S.los))}`;
  const line=`${dd} · ${mt} · ${S.ot?'OT':fmtClock(S.clock)+' left'+(S.q===2?' in the half':'')}`;
  logPBP(`Key moment: ${why} (${line})`,'big');
  const b=$('#kmBan');b.innerHTML=`<b>KEY MOMENT</b><span>${esc(line)}</span><small>${esc(why)} · ${uOff()?'your ball':'your defense'}</small>`;b.hidden=false;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
  clearTimeout(kmStart.t);kmStart.t=setTimeout(()=>{b.classList.remove('show');setTimeout(()=>{b.hidden=true},400)},was?4200:3200);
  sfx('whistle');haptic('medium');
}
function kmResume(){
  S.km=null;S.auto=true;if(S.ff)return;S.ff=true;AUTO.m0=muted;muted=true;document.body.classList.add('ff');
  ['#call','#opt','#snapBar','#kick','#celebBtn','#celebSheet','#toBtn','#bulletBtn','#apBar','#kmBan'].forEach(s=>{const e=$(s);if(e)e.hidden=true});hideActs();hint('');
  $('#kmOv').hidden=false;AUTO.pbpN=-1;kmOverlay();
}
function kmStopFF(){if(!S.ff)return;S.ff=false;muted=AUTO.m0;document.body.classList.remove('ff');$('#kmOv').hidden=true}
/* one fast-forward step of the real engine (the smoke test's loop, with the AI answering for the user) */
function ffStep(){
  const dt=1/60,vis=s=>{const e=$(s);return e&&!e.hidden};
  if(vis('#studio')){const g=$('#studioGo');if(g){g.click();return true}}
  if(vis('#card')&&cardNext){cardNext();return true}
  switch(S.phase){
    case 'presnap':return ffPresnap();
    case 'kick':if(kick&&kick.stage!=='flight'){autoKick();return true}if(kick&&!kick.done){updateKick(dt);return true}return false;
    case 'replay':if(typeof endReplay==='function')endReplay();return true;
    case 'live':case 'dead':if(!play)return false;simulate(dt/2);if(S.phase==='live'||S.phase==='dead')simulate(dt/2);
      if(S.phase==='dead'){deadT-=dt;if(deadT<=0)applyResult()}return true;
  }
  return false;
}
/* the between-play clock for the user's offense while simming (the CPU's own rule: hurry up when chasing, bleed it when ahead) */
function ffRunoff(){
  if(!S.clockRun||S.ot||S.conv)return false;const sit=sitInfo(),want=sit.leadingLate?24:sit.trailingLate||sit.twoMin?3:sit.margin>=17&&S.q>=4?20:13;
  let extra=Math.max(0,want-S.preRun);if(tmoPending()&&S.clock>lateThr())extra=Math.min(extra,S.clock-lateThr());S.clock=Math.max(0,S.clock-extra);S.preRun+=extra;
  if(S.clock<=0){S.phase='wait';boundary(()=>toPresnap());return true}return false}
function ffPresnap(){
  if(uOff()){
    if(!S.pc){const c=apChoosePlay();if(ffRunoff())return true;
      if(c.special){if(c.special==='kneel'&&S.clockRun&&!S.ot)S.clock=Math.max(0,S.clock-Math.min(S.clock,26));callSpecial(c.special);return true}
      pickPlay(c)}
    if(S.phase==='presnap'&&S.pc){$('#snapBar').hidden=true;startPlay(S.pc)}return true}
  $('#call').hidden=true;aiSnapT=0;if(S.aiPlay&&!S.aiPlay.special)startPlay(S.aiPlay);return true;
}
function kmPump(real){
  const t0=performance.now();
  while(S.ff&&!S.paused&&performance.now()-t0<11){if(!ffStep())break}
  if(typeof BC!=='undefined')BC.tick(real);
  kmOverlay();
}
function kmOverlay(){
  if(!S.ff||!S.home)return;const ov=$('#kmOv');
  $('#kmSc').innerHTML=`<div>${badge(S.home)}<b>${esc(S.home.abbr)}</b><strong>${S.score[0]}</strong></div><span>${S.ot?'OT':ordQ(S.q)+' · '+fmtClock(S.clock)}<small>${S.poss==='home'?esc(S.home.abbr):esc(S.away.abbr)} ball${['presnap','live','dead'].includes(S.phase)?' · '+esc(spotLabelFor(S.los,S.poss)):''}</small></span><div><strong>${S.score[1]}</strong><b>${esc(S.away.abbr)}</b>${badge(S.away)}</div>`;
  const pb=S.pbp||[];if(pb.length===AUTO.pbpN&&ov.dataset.n===String(pb.length))return;AUTO.pbpN=pb.length;ov.dataset.n=pb.length;
  $('#kmPbp').innerHTML=pb.slice(-7).map(e=>`<div class="${e.cls||''}"><em>${esc(e.q)} ${esc(e.c||'')} · ${esc(e.tm||'')}</em>${esc(e.t)}</div>`).join('');
}
$('#kmTake').onclick=()=>{ac();if(!S.ff)return;S.kmTake=true;$('#kmTake').textContent='Taking over at the next snap…'};
/* off the field (post-game, hub): no overlay or speed bar left behind */
function autoIdle(){if(S.ff&&!S.paused)kmStopFF();if(AUTO.shown)apBarTick(true);const t=$('#kmTake');if(t)t.textContent='Take over now'}

/* the speed-up: while simming, the engine's between-beat timers (score banners, kicks, possession changes) collapse */
{const st0=window.setTimeout.bind(window);window.setTimeout=(f,d,...a)=>st0(f,(S&&S.ff&&d>16)?16:d,...a)}

SETTINGS_EXTRA.push({card:'Gameplay',key:'playStyle',label:'Play style',opts:[['full','Full control'],['coach','Coach mode'],['km','Key moments']],def:'full',
  note:'<b>Full control</b>: you play every snap. <b>Coach mode</b>: you call every play on offense and defense (and make every decision: 4th downs, tries, kickoffs, penalties) while the AI plays it out; 1×, 2× or skip to the result. <b>Key moments</b>: normal drives are simmed in seconds with a live play-by-play, and you are dropped in for the red zone, two-minute drills, one-score fourth quarters, overtime, goal-line stands and big 4th downs. Opponent drives (Game settings) still decides whether you play defense. Switch any time from the pause menu.'});
