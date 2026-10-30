/* =========================================================
   08b · Broadcast presentation (graphics only, no commentators): score bug packages,
   play result cards, situation chips, big-moment banners (07), drive tracker, linescore,
   kickoff intro, quarter / two-minute / final cards, pregame and halftime studio shows,
   out-of-town ticker, lower thirds, win probability (bar + sparkline + swing callout),
   decibel meter, ribbon board prompts, custom stadium sounds, crowd bed + drumline,
   instant replay with slow-mo, dot tracking and a telestrator, social feed.
   ========================================================= */
const AUD_EVENTS=[['td','Touchdown'],['third','Third down'],['sack','Sack'],['int','Interception'],['fg','Field goal'],['first','First down']];
const AUD_SOUNDS=[['default','Default'],['horn','Stadium horn'],['organ','Organ riff'],['drum','Drumline'],['cannon','Cannon'],['air','Air horn'],['none','Silent'],['custom','My upload']];
const BC={
  pkg:'regional',hype:.25,lowT:0,shown:new Set(),tickT:0,league:[],ribbonMsg:'',ribbonT:0,lateShown:{},rzShown:false,
  wpT:0,wpPend:false,wpKey:'',wpSwing:0,wpScore:'',ambT:0,dbOn:false,hudN:0,sbB:0,lastQ:1,
  set(){return LG.settings},
  wpMode(){const v=LG&&LG.settings.wp;return v===false||v==='off'?'off':v==='always'?'always':'key'},
  gameStart(resumed){
    const g=S.game,hr=rankOf(S.home.id),ar=rankOf(S.away.id),big=(hr&&ar)||g.rival||g.post||S.slot==='Primetime'||(hr&&hr<=10)||(ar&&ar<=10);
    const mid=hr||ar||isConfGame(g);
    this.pkg=this.set().pkg&&this.set().pkg!=='auto'?this.set().pkg:big?'national':mid?'regional':'stream';
    const r=document.documentElement;r.dataset.pkg=this.pkg;r.dataset.bug=this.set().bugPos||'top';r.dataset.bugsize=this.set().bugSize||'m';
    $('#sb').style.opacity=this.set().hudAlpha!=null?this.set().hudAlpha:1;
    this.shown=new Set();this.lateShown={};this.rzShown=false;if(!resumed){S.line=[[0,0,0,0,0],[0,0,0,0,0]];S.lineLast=[0,0]}this.hype=S.userHome||!S.neutral?.35:.25;SCENE.fw=[];SCENE.coach={};SCENE.chainA=SCENE.chainB=null;
    this.buildLeague();if(!resumed||S.temp==null)this.conditions();
    r.classList.toggle('ticker',this.set().ticker!==false);$('#ticker').hidden=this.set().ticker===false;this.updTicker();
    $('#wm').hidden=false;applyAccess();
    const wm=this.wpMode(),wg=$('#wpG');wg.hidden=wm==='off';wg.classList.toggle('always',wm==='always');wg.classList.remove('on');this.wpT=0;this.wpKey='';this.wpSwing=0;
    $('#dbm').hidden=this.set().db===false||S.neutral;$('#dbm').classList.remove('on');this.dbOn=false;
    {const w0=winProbLive(),p0=progress();S.wpH=isFinite(w0)&&isFinite(p0)?[[p0,w0]]:[]}this.wpPend=false;this.wpScore=S.score.join('-');this.lastQ=S.q;this.sbB=0;
    if(AC)ambStart();
    if(!resumed)this.say('open',{});
  },
  stop(){$('#wm').hidden=true;['#rcard','#sit','#qcard','#wpG','#dbm'].forEach(x=>$(x).classList.remove('on'));$('#lower').classList.remove('on');$('#ticker').hidden=true;$('#wpG').hidden=true;$('#dbm').hidden=true;$('#replayBtn').hidden=true;$('#replayBar').hidden=true;document.documentElement.classList.remove('ticker');ambStop()},
  /* out-of-town games: pre-simulated at kickoff so the ticker, halftime show and final standings agree */
  buildLeague(){
    const w=LG.weeks[LG.week];this.league=[];if(!w)return;
    for(const g of w.games){if(g===S.game||g.h===LG.user||g.a===LG.user)continue;
      if(g.hs==null&&!g.pre){const [hs,as]=simScore(g.h,g.a,g.neutral);g.pre={hs,as,ev:scoreEvents(hs,as),off:+R(-.45,.3).toFixed(3)}}
      if(g.pre)this.league.push(g)}
    const rk=id=>rankOf(id)||99;this.league.sort((a,b)=>Math.min(rk(a.h),rk(a.a))-Math.min(rk(b.h),rk(b.a)));this.league=this.league.slice(0,40);
  },
  /* each out-of-town game kicks off at its own time, so the ticker shows a real mix of upcoming, live and final games */
  gameF(g,f){const off=g.pre&&g.pre.off!=null?g.pre.off:0;return f+off},
  partial(g,f){
    if(g.hs!=null&&!g.pre)return [g.hs,g.as,'FINAL'];
    const fg=this.gameF(g,f);let h=0,a=0;for(const e of g.pre.ev){if(e.t>fg)break;if(e.h)h+=e.p;else a+=e.p}
    if(fg>=1)return [g.pre.hs,g.pre.as,'FINAL'];
    if(fg<=0){const mins=Math.round(-fg*210/5)*5;const base={Noon:12*60,Afternoon:15*60+30,Primetime:19*60+30}[S.slot]||15*60+30;const t=base+mins;return [0,0,`${((Math.floor(t/60)+11)%12)+1}:${String(t%60).padStart(2,'0')} ${Math.floor(t/60)>=12?'PM':'AM'}`]}
    if(fg>.485&&fg<.515)return [h,a,'HALF'];
    const q=Math.min(4,Math.floor(fg*4)+1),rem=(1-((fg*4)%1))*15;return [h,a,`${ordQ(q)} ${Math.floor(rem)}:${String(Math.floor((rem%1)*60)).padStart(2,'0')}`];
  },
  tickItem(g,f){
    const [h,a,st]=this.partial(g,f),H=T(g.h),A=T(g.a),rh=rankOf(g.h),ra=rankOf(g.a),fin=st==='FINAL',pre=/AM|PM/.test(st),live=!fin&&!pre;
    const up=live&&this.gameF(g,f)>.45&&((rh||99)<(ra||99)&&a-h>=7&&rh||(ra||99)<(rh||99)&&h-a>=7&&ra);
    /* imported team logos (02c logoHTML) when a pack has them; the colour dot otherwise, or if the image fails to load */
    const mark=t=>{const l=typeof logoHTML==='function'?logoHTML(t,16):'',dot=`<i class="dot" style="background:${t.c1}${l?';display:none':''}"></i>`;return l?l.replace(`this.style.display='none'`,`this.style.display='none';this.nextElementSibling.style.display=''`)+dot:dot};
    const side=(t,r,sc,win)=>`<span class="tt ${win?'w':''}">${mark(t)}${r?`<sup>${r}</sup>`:''}${esc(t.abbr)}${pre?'':` <b>${sc}</b>`}</span>`;
    return `<span class="tk ${live?'live':''}">${up?'<b class="ua">UPSET ALERT</b>':''}${side(A,ra,a,fin&&a>h)}${side(H,rh,h,fin&&h>a)}<em>${st}</em></span>`;
  },
  updTicker(){
    if(this.set().ticker===false||!this.league.length)return;
    const f=progress();const parts=this.league.slice(0,24).map(g=>this.tickItem(g,f));
    parts.push(...this.headlines());
    const html=parts.join('<i class="sep"></i>');const run=$('#ticker .run');if(run.dataset.h===html)return;run.dataset.h=html;run.innerHTML=html;run.style.animationDuration=Math.max(40,parts.length*6)+'s';
  },
  tick(dt){
    this.hype=lerp(this.hype,this.base(),dt*.6);
    this.lowT-=dt;if(this.lowT<=0)$('#lower').classList.remove('on');
    this.ribbonT-=dt;this.tickT+=dt;if(this.tickT>6){this.tickT=0;this.updTicker()}
    if(this.hype>.85&&LG.settings.shake!==false&&S.phase==='presnap'&&!uOff()&&hostT()===S.home)S.shake=Math.max(S.shake,.05);
    if(this.wpT>0){this.wpT-=dt;if(this.wpT<=0){$('#wpG').classList.remove('on');this.wpSwing=0}}
    this.ambT-=dt;if(this.ambT<=0){this.ambT=.25;if(AC&&!AMB)ambStart();ambSet(S.phase==='replay'?.008:.014+this.hype*.085);
      const want=this.set().db!==false&&!S.neutral&&['presnap','live'].includes(S.phase)&&this.hype>(this.dbOn?.5:.58);if(want!==this.dbOn){this.dbOn=want;$('#dbm').classList.toggle('on',want)}}
  },
  base(){
    if(!S.home)return .2;let b=.3;const hostDef=defT()===hostT(),late=S.q>=4&&Math.abs(S.score[0]-S.score[1])<=8;
    if(S.phase==='presnap'&&hostDef){b+=.25;if(S.down===3)b+=.3;if(S.down===4)b+=.35}
    if(late)b+=.15;if(S.game&&S.game.rival)b+=.1;b*=1-crowdEmpty()*.9;if(S.neutral)b*=.75;if(LG.settings.crowd==='high')b*=1.2;return clamp(b,0,1);
  },
  noise(){return this.hype},
  ribbon(){if(this.ribbonT>0)return this.ribbonMsg;return ''},
  setRibbon(m,t){this.ribbonMsg=m+' · '+m+' · ';this.ribbonT=t||4},
  hud(){
    const mode=this.wpMode();this.hudN++;
    if(S.score.join('-')!==this.wpScore){this.wpScore=S.score.join('-');this.wpPend=true}
    if(this.wpPend&&(S.phase==='presnap'||S.phase==='pat'))this.wpSample();
    if(mode!=='off'&&(mode==='always'||this.wpT>0))this.wpRender();
    this.trackScore();const dt=$('#drv');if(dt){const t=this.driveText();if(dt.textContent!==t)dt.textContent=t;dt.hidden=!t||LG.settings.gfx===false}
    if(this.dbOn){const d=$('#dbm'),v=Math.round(this.hype*100);if(+d.dataset.v!==v){d.dataset.v=v;d.querySelector('i').style.transform=`scaleY(${this.hype.toFixed(2)})`;d.querySelector('span').textContent=Math.round(78+this.hype*42)+' dB'}}
    if(this.lastQ!==S.q){if(this.lastQ===2&&S.q===3&&$('#studio').hidden)this.quarterCard(3);this.lastQ=S.q}
    if(this.hudN%5===0){const sb=$('#sb');const b=sb.hidden?0:Math.round(sb.getBoundingClientRect().bottom);if(b!==this.sbB){this.sbB=b;document.documentElement.style.setProperty('--sbB',b+'px')}}
  },
  /* ---------- win probability: bar, sparkline of the game, swing callout ---------- */
  wpSample(){
    this.wpPend=false;const w=winProbLive(),H=S.wpH||(S.wpH=[]),prev=H.length?H[H.length-1][1]:null;if(!isFinite(w))return;H.push([progress(),w]);if(H.length>160)H.splice(1,1);
    if(prev!=null&&Math.abs(w-prev)>=.1){this.wpSwing=w-prev;this.wpShow(5)}
  },
  wpShow(sec){if(this.wpMode()==='off'||!S.home)return;this.wpKey='';this.wpT=Math.max(this.wpT,sec||4.5);this.wpRender();$('#wpG').classList.add('on')},
  wpInner(big){
    let w=winProbLive();if(!isFinite(w))w=.5;const u=S.home,o=S.away,pc=Math.round(w*100),H=(S.wpH||[]).concat([[progress(),w]]).filter(([x,v])=>isFinite(x)&&isFinite(v));
    const pts=H.map(([x,v])=>`${(x*100).toFixed(1)},${(2+(1-v)*20).toFixed(1)}`).join(' ');
    const d=this.wpSwing,g=d>0?u:o,sw=Math.abs(d)>=.1?`<em class="sw" style="--g:${g.c1}">${esc(g.abbr)} +${Math.round(Math.abs(d)*100)}% WP</em>`:'';
    return `<div class="wh"><span>${big?'Win probability · '+(S.ot?'OT':qName(S.q)+' '+fmtClock(S.clock)):'Win prob'}</span>${sw}</div><div class="wr"><b>${tvLogo(u,'xs')}${esc(u.abbr)}<em>${pc}%</em></b><b class="r"><em>${100-pc}%</em>${esc(o.abbr)}${tvLogo(o,'xs')}</b></div><div class="bar" style="--u:${tvCol(u)};--o:${tvCol(o)}"><i style="transform:scaleX(${w.toFixed(3)})"></i></div><svg class="spk" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="12" x2="100" y2="12"/><polyline points="${pts}" style="stroke:${tvCol(u)}"/><polyline class="hi" points="${pts}"/></svg>`;
  },
  wpRender(){const el=$('#wpG'),w=winProbLive(),k=Math.round(w*100)+'|'+(S.wpH||[]).length+'|'+Math.round(this.wpSwing*100)+'|'+S.home.abbr;if(k===this.wpKey)return;this.wpKey=k;el.innerHTML=this.wpInner(false)},
  pauseWP(){
    const panel=$('#pausem .panel');if(!panel||!S.home)return;let el=$('#pmWP');
    if(this.wpMode()==='off'||!['presnap','live','dead','pat','kick','wait','drive','replay'].includes(S.phase)){if(el)el.remove();return}
    if(!el){el=document.createElement('div');el.id='pmWP';el.className='wpcard';const h=panel.querySelector('.h1');h?h.after(el):panel.prepend(el)}
    el.innerHTML=this.wpInner(true);
  },
  /* ---------- broadcast graphics (no commentators) ---------- */
  cap(){},pbp(){},an(){},
  say(k,d){
    switch(k){
      case 'open':this.setRibbon('WELCOME TO '+hostT().city.toUpperCase(),6);break;
      case 'quarter':break;
      case 'flag':sceneEvent('flag',{});this.sound('flag');break;
      case 'timeout':this.chip(`TIMEOUT · ${d.t.abbr}`,d.t.c1,`${d.t===S.home?S.to[0]:S.to[1]} left`);drumline(false);break;
      case 'fg':if(d.good){this.sound('fg');this.hype=Math.min(1,this.hype+.3)}break;
      case 'first':if(Math.random()<.25)this.sound('first');break;
      case 'bighit':this.hype=Math.min(1,this.hype+.35);sceneEvent('big',{team:d.d.team});break;
    }
  },
  /* result card: play type, who, yards, what's next */
  card(kind,main,sub,color,big){
    if(LG.settings.gfx===false)return false;
    const el=$('#rcard');el.style.setProperty('--rc',color);el.classList.toggle('big',!!big);el.classList.remove('flag');
    el.innerHTML=`<span class="k">${esc(kind)}</span><b>${main}</b>${sub?`<small>${esc(sub)}</small>`:''}`;
    $('#lower').classList.remove('on');el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(this.cardT);this.cardT=setTimeout(()=>el.classList.remove('on'),big?2800:2200);return true;
  },
  chip(text,color,sub,cls){if(LG.settings.gfx===false)return;const el=$('#sit');el.className=cls||'';el.style.setProperty('--sc',color||'var(--gold)');el.style.setProperty('--sk',String(color||'').startsWith('#')?inkOn(color):'#fff');el.innerHTML=`<b>${esc(text)}</b>${sub?`<small>${esc(sub)}</small>`:''}`;void el.offsetWidth;el.classList.add('on');clearTimeout(this.chipT);this.chipT=setTimeout(()=>el.classList.remove('on'),2400)},
  firstDown(e){if(!e||!e.team||S.conv)return;this.chip('First down',e.team.c1,e.x!=null?spotLabelFor(Math.min(109,e.x),S.poss):'','fd')},
  bannerSub(t){const b=$('#banner');if(!b.classList.contains('on'))return;const s=b.querySelector('.su');s.textContent=t;s.hidden=!t},
  snap(){
    const hostDef=defT()===hostT();
    if(S.down===3&&!S.conv){if(hostDef){this.setRibbon('3RD DOWN · MAKE SOME NOISE',5);this.sound('third');this.setRibbon('DE-FENSE · DE-FENSE',5)}else this.setRibbon('3RD DOWN',3)}
    if(S.down===4&&!S.conv)this.setRibbon('4TH DOWN',4);
    if(LG.settings.lower!==false&&Math.random()<.4){const cands=OFF.concat(DEF).filter(p=>p.ovr>=84&&!this.shown.has(p.pl.id)&&['QB','RB','WR','TE','CB','S','LB','DL'].includes(p.role));if(cands.length){const p=cands.sort((a,b)=>b.ovr-a.ovr)[0];this.shown.add(p.pl.id);this.lower(p)}}
  },
  /* situation graphic before the snap: 3rd/4th down odds, red zone, goal to go, late-half clock */
  presnap(){
    if(S.conv){this.chip('2-point try',offT().c1,'',null);return}
    const togo=S.firstDownX-S.los,goal=S.firstDownX>=110;
    if(!S.ot&&(S.q===2||S.q===4)&&S.clock<=Math.max(30,S.qlen*.17)&&S.clock>0&&!this.lateShown[S.q]){this.lateShown[S.q]=true;this.twoMin();return}
    if(S.down>=3){const p=convChance();this.chip(`${ord(S.down)} & ${goal?'Goal':Math.max(1,Math.round(togo))}`,offT().c1,`${offT().abbr} converts ${Math.round(p*100)}% from here`,S.down===4?'d4':'');return}
    if(S.los>=90&&!this.rzShown){this.rzShown=true;this.chip(goal?'Goal to go':'Red zone','#E5383B',`${offT().abbr} red zone: ${offT()===S.home?S.stats.rzTD+'/'+S.stats.rzA:S.ostats.rzTD+'/'+S.ostats.rzA} TD`,'rz');return}
  },
  chant(t){this.setRibbon(t,4)},
  lower(p){
    const pl=p.pl,t=p.team,hw=(LG.heismanWatch||[]).findIndex(h=>h.pid===pl.id),el=$('#lower');
    el.style.setProperty('--lc',t.c1);el.style.setProperty('--lt',inkOn(t.c1));
    el.querySelector('.num').textContent=pl.num;
    el.querySelector('.txt').innerHTML=`<b>${esc(fullName(pl))}${hw>=0?`<i class="hw">Heisman #${hw+1}</i>`:''}</b><small>${esc(t.abbr)} ${pl.pos} · ${['Fr','So','Jr','Sr'][pl.yr-1]||''} · OVR ${p.ovr}</small><span class="st">${esc(statLine(pl))}</span>`;
    el.classList.add('on');this.lowT=3.6;
  },
  play(r,gain){
    const off=offT(),def=defT(),c=play.carrier||Q,nm=x=>x?(x.pl?x.pl.last:x.last):'',ours=t=>t===hostT()||t===S.home;
    const hostOff=off===hostT();const dr=S.drive;if(dr&&!S.conv){dr.plays++;if(['tackle','oob','td','sack'].includes(r.kind)||r.kind==='fum')dr.yds+=Math.round(Math.min(110,r.x)-S.los)}
    const yd=g=>g===0?'No gain':g>0?`${g} yd${g===1?'':'s'}`:`Loss of ${-g}`;
    const next=()=>{const nx=r.x;if(r.kind==='inc')return S.down<4?`${ord(S.down+1)} & ${Math.max(1,Math.round(S.firstDownX-S.los))} next`:'Turnover on downs';if(nx>=S.firstDownX)return 'First down';if(S.down>=4)return 'Turnover on downs';return `${ord(S.down+1)} & ${Math.max(1,Math.round(S.firstDownX-nx))} next`};
    if(r.kind==='td'){this.hype=hostOff?1:.15;sceneEvent('td',{team:off});this.setRibbon(hostOff?'TOUCHDOWN '+off.name.toUpperCase():'',6);if(hostOff)setTimeout(()=>this.setRibbon('♪ FIGHT SONG ♪',4),1500);
      setTimeout(()=>this.scoringDrive(off),3300);if(performance.now()-bannerAt>900)this.card('TOUCHDOWN',`${esc(nm(c))} · ${Math.round(110-S.los)} yds`,play.caught?`Pass from ${nm(Q)}`:'Rush',off.c1,true)}
    else if(r.kind==='int'){setTimeout(()=>this.toChip(def),2600);this.hype=def===hostT()?1:.2;sceneEvent('turnover',{team:off});if(ours(def))this.sound('int');if(def===hostT())this.setRibbon('TURNOVER',5);
      if(performance.now()-bannerAt<900)this.bannerSub(`${nm(c)} picks it off · ${def.abbr} ball`);else this.card('INTERCEPTION',`${esc(nm(c))}`,`${def.abbr} ball`,def.c1,true)}
    else if(r.kind==='fum'){if(r.defRec){setTimeout(()=>this.toChip(def),2600);sceneEvent('turnover',{team:off});this.hype=def===hostT()?1:.2}
      if(r.defRec&&performance.now()-bannerAt<900)this.bannerSub(`${def.abbr} recovers`);else this.card('FUMBLE',r.defRec?`${esc(def.abbr)} recovers`:`${esc(off.abbr)} keeps it`,r.defRec?'Turnover':next(),r.defRec?def.c1:off.c1,r.defRec)}
    else if(r.kind==='sack'){if(ours(def))this.sound('sack');if(def===hostT())this.hype=Math.min(1,this.hype+.4);this.card('SACK',`${esc(nm(Q))} · ${yd(gain)}`,next(),def.c1)}
    else if(r.kind==='inc')this.card('INCOMPLETE',esc(r.msg||'Incomplete'),next()+(uOff()?' · vs '+covName():''),'#59636f');
    else if(r.kind==='tackle'||r.kind==='oob'){const big=gain>=20;if(gain>=15)this.hype=Math.min(1,this.hype+(hostOff?.4:.1));
      this.card(big?'BIG PLAY':play.caught?'PASS':'RUSH',`${play.caught?esc(nm(Q))+' → ':''}${esc(nm(c))} · ${yd(gain)}`,(r.kind==='oob'?'Out of bounds · ':'')+next()+(play.caught&&uOff()?' · vs '+covName():''),off.c1,big);if(gain>=15&&c&&c.pl)setTimeout(()=>this.gameLine(c),2700)}
    const big=r.kind==='td'||r.kind==='int'||(r.kind==='fum'&&r.defRec)||gain>=18||play.bigHit||play.fakes>=2||(r.kind==='sack'&&Math.random()<.4)||(play.contested&&play.caught);
    if(big&&LG.settings.replay!=='off'&&REC.length>20){if(LG.settings.replay==='auto'&&r.kind!=='td'){deadT+=.3;setTimeout(()=>{if(S.phase==='dead')startReplay()},700)}else{$('#replayBtn').hidden=false;deadT=Math.max(deadT,3.2);clearTimeout(this.rbT);this.rbT=setTimeout(()=>$('#replayBtn').hidden=true,3200)}}
  },
  /* linescore + drive tracker */
  newDrive(){S.drive={plays:0,yds:0,clk:S.clock,q:S.q,team:S.poss};this.rzShown=false},
  driveText(){const d=S.drive;if(!d||d.team!==S.poss||S.ot||!d.plays)return '';const t=(Math.min(S.q,4)-Math.min(d.q,4))*S.qlen+d.clk-S.clock;return `DRIVE ${d.plays} PL · ${d.yds} YDS · ${fmtClock(Math.max(0,t))}`},
  trackScore(){S.line=S.line||[[0,0,0,0,0],[0,0,0,0,0]];S.lineLast=S.lineLast||[0,0];for(const i of [0,1]){const d=S.score[i]-S.lineLast[i];if(d>0){S.line[i][Math.min(S.q,5)-1]+=d}S.lineLast[i]=S.score[i]}},
  /* visitor first, like every TV linescore */
  sides(){const uv=!S.userHome&&!S.neutral;return uv?[[S.home,0],[S.away,1]]:[[S.away,1],[S.home,0]]},
  linescore(fin){const L=S.line||[[0,0,0,0,0],[0,0,0,0,0]],ot=S.ot||L[0][4]||L[1][4];const qs=ot?['1','2','3','4','OT']:['1','2','3','4'];const win=fin?(S.score[0]>S.score[1]?0:S.score[1]>S.score[0]?1:-1):-1;
    const row=(t,i)=>`<tr class="${win===i?'w':win>=0?'l':''}" style="--c:${tvCol(t)}"><td><span class="ln">${tvLogo(t,'sm')}<b>${esc(t.abbr)}</b><small>${recStr(t)}</small></span></td>${qs.map((_,k)=>`<td>${k<S.q||k===4&&ot||fin?L[i][k]:'–'}</td>`).join('')}<td class="tot">${S.score[i]}</td></tr>`;
    return `<table class="lscore"><thead><tr><th></th>${qs.map(q=>`<th>${q}</th>`).join('')}<th>T</th></tr></thead><tbody>${this.sides().map(([t,i])=>row(t,i)).join('')}</tbody></table>`},
  cardHead(title,sub){return `<div class="qh"><span class="net">GLN</span><b>${title}</b>${sub?`<small>${sub}</small>`:''}</div>`},
  showQ(html,cls,ms){const el=$('#qcard');el.className=cls||'';el.innerHTML=html;void el.offsetWidth;el.classList.add('on');clearTimeout(this.qT);this.qT=setTimeout(()=>el.classList.remove('on'),ms||3400)},
  statRow(lab,a,b,fmt,base){base=base||0;const tot=a+b-2*base,p=tot>0?clamp((a-base)/tot*100,4,96):50,[L]=this.sides();const la=L[1]===0?a:b,lb=L[1]===0?b:a,pl=L[1]===0?p:100-p;return `<div class="tvs"><b>${fmt?fmt(la):la}</b><div class="tvb"><i style="--w:${pl}%;background:${tvCol(L[0])}"></i></div><em>${lab}</em><div class="tvb r"><i style="--w:${100-pl}%;background:${tvCol(this.sides()[1][0])}"></i></div><b>${fmt?fmt(lb):lb}</b></div>`},
  quarterCard(q){
    if(LG.settings.gfx===false)return;const st=S.stats,os=S.ostats,half=q===3;
    this.showQ(`${this.cardHead(half?'Halftime':`End of ${ordQ(q-1).toLowerCase()} quarter`,esc(hostT().stadium||hostT().city))}${this.linescore()}<div class="qstats">${this.statRow('Total yards',st.passYds+st.rushYds,os.passYds+os.rushYds)}${this.statRow('Win prob',Math.round(winProbLive()*100),100-Math.round(winProbLive()*100),v=>v+'%')}</div>`,'',3400);
    drumline(true);this.wpShow(4.5);
  },
  twoMin(){
    if(LG.settings.gfx===false)return;const tos=n=>[0,1,2].map(i=>`<i class="${i<n?'':'u'}"></i>`).join('');
    const row=([t,i])=>`<div class="tmr" style="--c:${t.c1}">${tvLogo(t,'sm')}<b>${esc(t.abbr)}</b><span class="pips">${tos(S.to[i])}</span><strong>${S.score[i]}</strong></div>`;
    this.showQ(`${this.cardHead('Two-minute timeout',`${fmtClock(S.clock)} left · ${S.q===4?'4th quarter':'end of the half'}`)}<div class="tmrs">${this.sides().map(row).join('')}</div>${this.statRow('Win prob',Math.round(winProbLive()*100),100-Math.round(winProbLive()*100),v=>v+'%')}`,'mini',2800);
    drumline(true);
  },
  intro(){
    if(LG.settings.gfx===false)return;const g=S.game;const side=t=>`<div class="it" style="--c:${t.c1}">${tvLogo(t,'lg')}<div><b>${rankTag(t.id)}${esc(t.city)}</b><small>${esc(t.name)} · ${recStr(t)}</small></div></div>`;
    const [[a],[h]]=this.sides();
    this.showQ(`${this.cardHead(esc(g.tag||(isConfGame(g)?confName(hostT().conf)+' matchup':'Nonconference')),esc(hostT().stadium||hostT().city))}<div class="intro">${side(a)}<span class="at">${S.neutral?'VS':'AT'}</span>${side(h)}</div><div class="qfoot">${WX_ICON[S.wx]} ${esc(S.wx)} · ${S.temp}°F${S.wind&&S.wind.mph>3?' · wind '+S.wind.mph+' mph':''} · ${esc(S.slot)} · Att. ${S.att.toLocaleString()}</div>`,'intro',3600);
  },
  /* final score graphic (called by finalGraphic in 08c) */
  finalCard(won,pog,g){
    const tops=t=>this.leaders(t).slice(0,2).map(x=>`<span><em>${x[0]}</em> ${esc(x[1])} <small>${esc(x[2])}</small></span>`).join('');
    const tl=([t,i])=>`<div class="fl" style="--c:${t.c1}"><b>${esc(t.abbr)}</b>${tops(t)||'<span><small>—</small></span>'}</div>`;
    this.showQ(`${this.cardHead(`Final${S.ot?' · '+(S.otRound>1?S.otRound:'')+'OT':''}`,g.tag?esc(g.tag):esc(hostT().stadium||hostT().city))}${this.linescore(true)}<div class="flead">${this.sides().map(tl).join('')}</div>${pog?`<div class="pog"><span class="tag gold">Player of the game</span><b>${esc(fullName(pog))}</b><small>${pog.pos} · ${esc(S.home.abbr)}</small></div>`:''}`,'qfin',2900);
  },
  leaders(t){const ps=(t===S.home?S.pst:S.opst)||{},ros=t.roster||[];const best=k=>{let b=null,v=0;for(const id in ps){if((ps[id][k]||0)>v){const p=ros.find(x=>x.id==id);if(p){b=p;v=ps[id][k]}}}return b};
    const q=best('py'),r=best('ry'),w=best('recy'),out=[];if(q)out.push(['PASS',q.last,`${ps[q.id].pc}/${ps[q.id].pa} · ${ps[q.id].py} yds${ps[q.id].ptd?' · '+ps[q.id].ptd+' TD':''}`]);if(r)out.push(['RUSH',r.last,`${ps[r.id].ra} car · ${ps[r.id].ry} yds${ps[r.id].rtd?' · '+ps[r.id].rtd+' TD':''}`]);if(w)out.push(['REC',w.last,`${ps[w.id].rec} rec · ${ps[w.id].recy} yds`]);return out},
  conditions(){
    const wk=LG.week||0,base=84-wk*3.2-(S.slot==='Primetime'?7:S.slot==='Noon'?-3:0)+R(-6,6);
    S.temp=Math.round(S.wx==='Snow'?R(18,31):S.wx==='Rain'?Math.max(38,base-6):base);
    const host=hostT(),cap=host.div==='FCS'?R(9000,24000):Math.round(30000+host.prestige*15000+R(-4000,6000));
    S.att=Math.round(cap*(S.game.rival?1.03:1)*(1-crowdEmpty()*.4)*(S.neutral?.9:1));
  },
  flagCard(m){if(LG.settings.gfx===false)return false;const parts=m.split(' · ');this.card('FLAG',esc(parts[0]),parts.slice(1).join(' · '),'#E8B500',false);$('#rcard').classList.add('flag');return true},
  scoringDrive(t){const d=S.drive;if(!d||!d.plays)return;const tm=(Math.min(S.q,4)-Math.min(d.q,4))*S.qlen+d.clk-S.clock;this.chip('Scoring drive',t.c1,`${d.plays} plays · ${d.yds} yds · ${fmtClock(Math.max(0,tm))}`)},
  toChip(t){const s=S.stats,o=S.ostats,m=(o.int+(o.fumLost||0))-(s.int+(s.fumLost||0));this.chip('Turnover',t.c1,`${S.home.abbr} turnover margin ${m>0?'+':''}${m}`,'to');this.wpShow(4.5)},
  gameLine(p){if(LG.settings.lower===false)return;const m=p.user?S.pst:S.opst||{},st=m[p.pl.id];if(!st)return;const el=$('#lower');el.style.setProperty('--lc',p.team.c1);el.style.setProperty('--lt',inkOn(p.team.c1));el.querySelector('.num').textContent=p.num;
    const line=st.rec?`${st.rec} rec · ${st.recy} yds${st.rectd?' · '+st.rectd+' TD':''}`:st.ra?`${st.ra} car · ${st.ry} yds${st.rtd?' · '+st.rtd+' TD':''}`:`${st.pc}/${st.pa} · ${st.py} yds`;
    el.querySelector('.txt').innerHTML=`<b>${esc(fullName(p.pl))}</b><small>Today · ${esc(p.team.abbr)} ${p.pl.pos}</small><span class="st">${esc(line)}</span>`;el.classList.add('on');this.lowT=3.4},
  fourth(){this.setRibbon('4TH QUARTER · HOLD UP YOUR FINGERS',8);this.hype=Math.min(1,this.hype+.3);setTimeout(()=>this.chip('Fourth quarter',hostT().c1,`${S.away.abbr} ${S.score[1]} · ${S.home.abbr} ${S.score[0]}`),3500)},
  headlines(){const out=[];const hw=(LG.heismanWatch||[])[0];if(hw)out.push(`<span class="tk hl"><em>HEISMAN WATCH</em>${esc(hw.name)} · ${esc(T(hw.team).abbr)} · ${esc(hw.line)}</span>`);
    const r=(LG.rank||[]).slice(0,5);if(r.length)out.push(`<span class="tk hl"><em>TOP 5</em>${r.map((id,i)=>`${i+1}. ${esc(T(id).abbr)}`).join(' · ')}</span>`);return out},
  /* ---------- custom stadium audio ---------- */
  sound(ev){
    const m=(LG.settings.audioMap||{})[ev]||'default';if(muted||!AC)return;
    if(m==='none')return;if(m==='custom'){const u=KV.get('gl.aud.'+ev);if(u){try{const a=new Audio(u);a.volume=.8;a.play()}catch(e){}}return}
    const t=m==='default'?({td:'horn',third:'drum',sack:'cannon',int:'horn',fg:'horn',first:'none',flag:'none'}[ev]||'none'):m;synthSound(t);
  },
  /* ---------- studio shows (TV package: matchup slab, tale of the tape, keys, top performers) ---------- */
  pregame(next){this.studio('pre',next)},
  halftime(next){this.studio('half',next)},
  studio(kind,next){
    const u=S.home,o=S.away,w=winProbLive(),half=kind==='half',[[A,ai],[Hm,hi]]=this.sides(),wA=ai===0?w:1-w;
    const spot=matchup(u,o),ser=seriesText(u,o),bubble=playoffBubble(LG);
    const lg=this.league.slice(0,10).map(g=>{const [h,a,st]=this.partial(g,half?.5:0);const H=T(g.h),Av=T(g.a);return `<div class="lrow"><span class="l">${tvLogo(Av,'xs')} ${rankTag(Av.id)}${esc(Av.city)} <b>${half?a:''}</b></span><span class="tag">${half?st:(g.slot||'TBD')}</span><span class="l" style="justify-content:flex-end"><b>${half?h:''}</b> ${rankTag(H.id)}${esc(H.city)} ${tvLogo(H,'xs')}</span></div>`}).join('');
    const hz=(LG.heismanWatch||[]).slice(0,5).map((h,i)=>`<div class="lrow"><span class="l"><span class="num">${i+1}</span><span><b>${esc(h.name)}</b> · ${h.pos} · ${esc(T(h.team).abbr)}</span></span><small class="note">${esc(h.line)}</small></div>`).join('');
    const pg=t=>t.rec.w+t.rec.l?+(t.rec.pf/(t.rec.w+t.rec.l)).toFixed(1):0,pa=t=>t.rec.w+t.rec.l?+(t.rec.pa/(t.rec.w+t.rec.l)).toFixed(1):0;
    /* rows are [label, user value, opponent value]; statRow puts the visitor on the left */
    const row=(lab,uv,ov,fmt,base)=>this.statRow(lab,uv,ov,fmt,base);const st=S.stats,os=S.ostats;
    const side=(t,cls)=>`<div class="sd ${cls}" style="--c:${t.c1};--c2:${t.c2||'#fff'};--k:${inkOn(t.c1)}">${tvLogo(t,'xl')}<div class="tx"><small>${rankTag(t.id)}${recStr(t)}</small><b>${esc(t.city)}</b><em>${esc(t.name)}</em></div></div>`;
    const keys=[[u,keyToGame(u,o)],[o,keyToGame(o,u)]];
    const perf=t=>{const l=this.leaders(t);return `<div class="perf" style="--c:${t.c1}"><div class="ph">${tvLogo(t,'xs')}<b>${esc(t.abbr)}</b></div>${l.length?l.map(x=>`<div class="pr"><em>${x[0]}</em><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join(''):'<p class="note">No leaders yet.</p>'}</div>`};
    $('#studioBody').innerHTML=`<div class="stv-head" style="--a:${A.c1};--b:${Hm.c1}">
        <div class="stv-bar"><span class="net">GLN</span><b>${half?'Halftime report':'Pregame show'}</b><span class="ven">${esc(hostT().stadium||hostT().city)}</span></div>
        <div class="stv-mu">${side(A,'a')}<div class="mid">${half?`<b class="hs">${S.score[ai]}<i>–</i>${S.score[hi]}</b><small>Halftime</small>`:`<b class="at">${S.neutral?'VS':'AT'}</b><small>${esc(S.slot||'')}</small>`}</div>${side(Hm,'b')}</div>
        <div class="stv-wp"><span>${esc(A.abbr)} ${Math.round(wA*100)}%</span><div class="bar"><i style="--w:${(wA*100).toFixed(1)}%;background:${tvCol(A)}"></i><i style="background:${tvCol(Hm)}"></i></div><span>${Math.round((1-wA)*100)}% ${esc(Hm.abbr)}</span><em>Win probability</em></div></div>
      ${half?`<div class="stv-grid"><div class="card stv-card"><div class="eyebrow">Linescore</div>${this.linescore()}</div>
        <div class="card stv-card"><div class="eyebrow">First-half stats</div><div class="tape">${row('Total yards',st.passYds+st.rushYds,os.passYds+os.rushYds)}${row('Passing',st.passYds,os.passYds)}${row('Rushing',st.rushYds,os.rushYds)}${row('First downs',st.firstDowns,os.firstDowns)}${row('Turnovers',st.int+st.fum,os.int+os.fum)}</div></div></div>
        <div class="card stv-card"><div class="eyebrow">Top performers</div><div class="perfs">${perf(A)}${perf(Hm)}</div></div>`
      :`<div class="stv-grid"><div class="card stv-card"><div class="eyebrow">Tale of the tape</div><div class="tape">${row('Overall',tOvr99(teamOvr(u)),tOvr99(teamOvr(o)),null,45)}${row('Offense',tOvr99(offOvr(u)),tOvr99(offOvr(o)),null,45)}${row('Defense',tOvr99(defOvr(u)),tOvr99(defOvr(o)),null,45)}${row('Points / game',pg(u),pg(o))}${row('Allowed / game',pa(u),pa(o))}</div><p class="note">Schemes: ${esc(schemeOf(A))} vs ${esc(schemeOf(Hm))}</p></div>
        <div class="card stv-card"><div class="eyebrow">Keys to the game</div><div class="keys2">${keys.map(([t,k])=>`<div class="key" style="--c:${t.c1}">${tvLogo(t,'xs')}<p><b>${esc(t.abbr)}</b> ${esc(k)}</p></div>`).join('')}</div></div></div>`}
      ${spot&&!half?`<div class="card stv-card"><div class="eyebrow">Matchup spotlight</div><div class="vs"><div><b>${esc(fullName(spot.a))}</b><div class="note">${spot.a.pos} · ${esc(u.abbr)} · ${ovrTag(spot.a)}</div></div><div class="mid">vs</div><div><b>${esc(fullName(spot.b))}</b><div class="note">${spot.b.pos} · ${esc(o.abbr)} · ${ovrTag(spot.b)}</div></div></div>${spot.rows.map(r=>`<div class="mbar"><span>${r[0]}</span><div class="b"><i style="width:${r[1]/(r[1]+r[2])*100}%"></i></div><span>${r[2]}</span></div>`).join('')}</div>`:''}
      ${ser&&!half?`<div class="card stv-card"><div class="eyebrow">Series</div><p>${esc(ser)}</p></div>`:''}
      ${lg?`<div class="card stv-card"><div class="eyebrow">${half?'Around the country · halftime':'Also on the slate today'}</div><div class="list">${lg}</div></div>`:''}
      ${hz||bubble?`<div class="grid2">${hz?`<div class="card stv-card"><div class="eyebrow">Heisman tracker</div><div class="list">${hz}</div></div>`:''}${bubble?`<div class="card stv-card"><div class="eyebrow">Playoff picture</div>${bubble}</div>`:''}</div>`:''}
      <button class="btn wide" id="studioGo">${half?'Start the second half':'Kick it off'}</button>`;
    $('#studio').hidden=false;$('#studio').scrollTop=0;drumline(true);
    $('#studioGo').onclick=()=>{ac();$('#studio').hidden=true;next()};
  }
};
/* listeners: the engine announces, the broadcast reacts (sound, chips, win-probability samples) */
onFx('tackle',e=>{if(e.big)sfx('hit')});
onFx('sack',()=>sfx('hit'));
onFx('td',e=>{if(e.team&&(e.team===hostT()||e.team===S.home))BC.sound('td')});
onFx('firstDown',e=>BC.firstDown(e));
['dead','punt','kickoff'].forEach(n=>onFx(n,()=>{BC.wpPend=true}));
new MutationObserver(()=>{const pm=$('#pausem');if(!pm.hidden){BC.pauseWP();ambSet(.006)}}).observe($('#pausem'),{attributes:true,attributeFilter:['hidden']});
const ordQ=q=>['1ST','2ND','3RD','4TH'][q-1]||'OT';
function scoreEvents(hs,as){const ev=[];const split=(n,h)=>{let left=n;while(left>0){const p=left>=7&&(left-7)%3!==1&&Math.random()<.7?7:left>=3?3:left;if(left-p===1||left-p===2&&p===7){ev.push({t:Math.random(),h,p:left});left=0;break}ev.push({t:Math.random(),h,p});left-=p}};split(hs,true);split(as,false);return ev.sort((a,b)=>a.t-b.t)}
function winProbLive(){return winProbState()}
function hometown(p){if(p.home)return p.home;const pl=(typeof PLACES!=='undefined'&&PLACES.length)?PLACES[(p.id*31)%PLACES.length]:'Hometown';const st=['TX','FL','GA','CA','OH','AL','LA','PA','NC','MI','TN','VA','SC','MS','NJ','AZ','MD','IL'];return `${pl}, ${st[(p.id*17)%st.length]}`}
function recruitStars(p){return p.stars||clamp(Math.round((ovr99(p)-55)/9),2,5)}
function seriesKey(a,b){return a.id<b.id?a.id+'-'+b.id:b.id+'-'+a.id}
/* series records are tracked from games played in this dynasty (no invented history) */
function seriesRec(a,b){LG.series=LG.series||{};const k=seriesKey(a,b);return LG.series[k]||(LG.series[k]={lo:Math.min(a.id,b.id),w:0,l:0,t:0,last:0})}
function seriesText(a,b){const s=seriesRec(a,b),aw=s.lo===a.id?s.w:s.l,bw=s.lo===a.id?s.l:s.w,riv=a.rival===b.id&&a.trophy?`${a.trophy}. `:'';if(!aw&&!bw)return riv?`${riv}First meeting in this dynasty.`:'';const lead=aw>=bw?a:b;return `${riv}${aw===bw?'Series tied':lead.city+' leads'} ${Math.max(aw,bw)}–${Math.min(aw,bw)} in this dynasty${s.last?`, last met in ${s.last}`:''}.`}
function seriesUpdate(L,a,b,aWon){const s=seriesRec(a,b);if((s.lo===a.id)===aWon)s.w++;else s.l++;s.last=L.season}
function matchup(u,o){
  const best=(t,pos)=>starters(t,pos).slice().sort((a,b)=>ovr99(b)-ovr99(a))[0];
  const wr=best(u,'WR'),cb=best(o,'CB'),qb=best(u,'QB'),pr=best(o,'DL');if(!wr||!cb)return null;
  const pickWR=ovr99(wr)+ovr99(cb)>=(qb&&pr?ovr99(qb)+ovr99(pr):0);const a=pickWR?wr:qb,b=pickWR?cb:pr;
  const rows=pickWR?[['Speed',wr.spd,cb.spd],['Hands vs ball skills',wr.cat,cb.cat],['Strength vs tackling',wr.str,cb.tkl]]:[['Arm vs strength',qb.thr,pr.str],['Accuracy vs pass rush',qb.acc,pr.tkl],['Mobility vs speed',qb.spd,pr.spd]];
  return {a,b,rows:rows.map(r=>[r[0]+' '+tOvr99(r[1]),tOvr99(r[1]),tOvr99(r[2])]),lab:pickWR?`${wr.last} against ${cb.last} on the outside could decide this one.`:`Can ${pr.last} get to ${qb.last}?`};
}
function keyToGame(t,opp){const sc=schemeOf(t);const o=offOvr(t)-defOvr(opp);return {'Option':`${t.city} has to stay patient with the option and win time of possession.`,'Air Raid':`${t.city} lives and dies with the quick passing game. Protect the quarterback.`,'Power':`${t.city} wants to lean on people up front and run the football.`,'Pro':`${t.city} needs the play-action game working off the run.`,'Spread':`${t.city} has to win in space and create explosive plays.`}[sc]+(o>.3?' They have the edge on paper.':o<-.3?' On paper this is an uphill climb.':'')}
function playoffBubble(L){
  if(L.week<L.R-6||L.phase!=='regular')return '';const r=(L.rank||[]).slice(0,18);if(r.length<12)return '';
  const row=id=>`<div class="lrow"><span class="l">${badge(T(id),'sm')} ${rankTag(id)}${esc(T(id).city)}</span><small class="note">${recStr(T(id))}</small></div>`;
  return `<div class="inout"><div class="col"><div class="eyebrow" style="color:var(--ok)">In (projected)</div>${r.slice(0,12).map(row).join('')}</div><div class="col"><div class="eyebrow" style="color:var(--warn)">On the bubble</div>${r.slice(12,18).map(row).join('')}</div></div>`;
}
function synthSound(t){if(!AC||muted)return;try{
  if(t==='horn')stadHorn();
  else if(t==='air'){tone(440,0,.6,'sawtooth',.07);tone(554,0,.6,'sawtooth',.05)}
  else if(t==='organ'){[523,659,784,1047,784,1047].forEach((f,i)=>{tone(f,i*.12,.12,'triangle',.05);tone(f/2,i*.12,.12,'sine',.04)})}
  else if(t==='drum')drumline(false);
  else if(t==='cannon'){drop(90,28,0,.9,.5);noise(.9,90,.8,.5,'lowpass')}
}catch(e){}}

/* ---------- instant replay: recorder, slow-mo playback, dot tracking, telestrator ---------- */
let REC=[],recAcc=0,RP=null;
function recStart(){REC=[];recAcc=0;$('#replayBtn').hidden=true}
function recFrame(dt){recAcc+=dt;if(recAcc<1/30||REC.length>900)return;recAcc=0;REC.push({p:P.map(p=>[p.x,p.y,p.z||0,p.fallP,p.phase,p.face,p.vx,p.vy]),b:[ball.x,ball.y,ball.z,ball.state]})}
function startReplay(){
  if(!REC.length||S.phase!=='dead')return;$('#replayBtn').hidden=true;
  RP={i:0,t:0,slow:true,dots:false,draw:false,strokes:[],cur:null,save:{p:P.map(p=>[p.x,p.y,p.z,p.fallP,p.phase,p.face,p.vx,p.vy]),b:{...ball},cel:S.celebrate,deadT}};
  S.celebrate=null;S.phase='replay';$('#replayBar').hidden=false;['rpSlow','rpDots','rpDraw'].forEach(id=>$('#'+id).setAttribute('aria-pressed',String(id==='rpSlow')));
}
function applyFrame(f){f.p.forEach((a,i)=>{const p=P[i];if(!p)return;[p.x,p.y,p.z,p.fallP,p.phase,p.face,p.vx,p.vy]=a});ball.x=f.b[0];ball.y=f.b[1];ball.z=f.b[2];ball.state=f.b[3]}
function updateReplay(real){if(!RP)return;RP.t+=real*(RP.slow?.4:1)*30;RP.i=Math.min(REC.length-1,Math.floor(RP.t));applyFrame(REC[RP.i]);if(RP.i>=REC.length-1&&RP.t>REC.length+40)RP.t=0}
function endReplay(){if(!RP)return;const s=RP.save;s.p.forEach((a,i)=>{const p=P[i];if(p)[p.x,p.y,p.z,p.fallP,p.phase,p.face,p.vx,p.vy]=a});ball=s.b;S.celebrate=s.cel;RP=null;S.phase='dead';deadT=.5;$('#replayBar').hidden=true}
$('#replayBtn').onclick=()=>{ac();startReplay()};
$('#rpSlow').onclick=()=>{RP.slow=!RP.slow;$('#rpSlow').setAttribute('aria-pressed',String(RP.slow))};
$('#rpDots').onclick=()=>{RP.dots=!RP.dots;$('#rpDots').setAttribute('aria-pressed',String(RP.dots))};
$('#rpDraw').onclick=()=>{RP.draw=!RP.draw;$('#rpDraw').setAttribute('aria-pressed',String(RP.draw))};
$('#rpClear').onclick=()=>{RP.strokes=[]};
$('#rpDone').onclick=()=>{ac();endReplay()};
function teleDown(e){if(!RP||!RP.draw)return;RP.cur=[[e.clientX,e.clientY]];RP.strokes.push(RP.cur)}
function teleMove(e){if(RP&&RP.cur)RP.cur.push([e.clientX,e.clientY])}
function teleUp(){if(RP)RP.cur=null}
function drawOverlay(now){
  if(S.phase!=='replay'||!RP)return;const c=ctx;c.setTransform(DPR,0,0,DPR,0,0);
  if(RP.dots){c.fillStyle='rgba(4,10,20,.72)';c.fillRect(0,0,W,H);c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=1;for(let x=10;x<=110;x+=10){c.beginPath();c.moveTo(X(x),Y(0));c.lineTo(X(x),Y(FW));c.stroke()}
    P.forEach((p,i)=>{const col=p.side==='o'?offT().c1:defT().c1;c.strokeStyle=col;c.globalAlpha=.6;c.lineWidth=2;c.beginPath();for(let k=0;k<=RP.i;k+=2){const f=REC[k].p[i];if(!f)continue;k?c.lineTo(X(f[0]),Y(f[1])):c.moveTo(X(f[0]),Y(f[1]))}c.stroke();c.globalAlpha=1;c.fillStyle=col;c.beginPath();c.arc(X(p.x),Y(p.y),6,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();c.fillStyle='#fff';c.font='700 9px system-ui';c.textAlign='center';c.fillText(p.num,X(p.x),Y(p.y)-9)});
    const b=REC[RP.i].b;c.fillStyle='#B5642E';c.beginPath();c.arc(X(b[0]),Y(b[1]),4,0,7);c.fill();
    const car=P.find(p=>hyp(p.x-b[0],p.y-b[1])<.8);if(car){const mph=hyp(car.vx,car.vy)*2.045;c.fillStyle='#FFD23F';c.font='800 12px system-ui';c.fillText(`#${car.num} · ${mph.toFixed(1)} MPH`,X(car.x),Y(car.y)+20)}}
  c.strokeStyle='#FFD23F';c.lineWidth=4;c.lineCap='round';c.lineJoin='round';c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=4;for(const s of RP.strokes){c.beginPath();s.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}c.shadowBlur=0;
  c.fillStyle='rgba(8,11,17,.9)';c.fillRect(14,H*.2,96,26);c.fillStyle='#FFD23F';c.font='900 13px system-ui';c.textAlign='left';c.textBaseline='middle';c.fillText(RP.slow?'▶ REPLAY · SLOW':'▶ REPLAY',22,H*.2+13);
}

/* ---------- social feed (invented accounts) ---------- */
const FEED_ACC=[['CFB Pulse','@CFBPulseHQ','#3a6df0'],['Gridiron Data Lab','@GridironDataLab','#1f9d6b'],['Saturday Hot Takes','@SatHotTakes','#d2433b'],['Poll Watcher','@PollWatcher','#b07a1c'],['Bracketology Bot','@BracketBot','#7a4bd1']];
function feedPost(L,acc,text,team){L.feed=L.feed||[];L.feed.unshift({n:acc[0],h:acc[1],c:acc[2],t:text,wk:L.week,s:L.season,team:team!=null?team:null,likes:rint(80,9000)});L.feed=L.feed.slice(0,90)}
function teamAcc(t){return [`${t.city} Insider`,`@${t.abbr}Insider`,t.c1]}
function feedUserGame(L,g,info,u,opp){
  const ur=rankOf(u.id),or=rankOf(opp.id);seriesUpdate(L,u,opp,info.won);
  feedPost(L,teamAcc(u),info.won?pick([`${u.city} takes care of business, ${info.us}–${info.them}. ${or?'That\'s a ranked win.':''}`,`FINAL: ${u.abbr} ${info.us}, ${opp.abbr} ${info.them}. Good day to be a ${u.name} fan.`]):pick([`Tough one. ${u.abbr} falls ${info.them}–${info.us} to ${opp.city}.`,`${u.city} drops this one. Plenty to clean up before next week.`]),u.id);
  if(info.won&&or&&(!ur||ur>or))feedPost(L,FEED_ACC[2],`${u.city} just knocked off #${or} ${opp.city}. Statement win. Move them up.`,u.id);
  if(!info.won&&ur&&(!or||or>ur+8))feedPost(L,FEED_ACC[2],`#${ur} ${u.city} lost to ${opp.city}?? Upset alert went off and nobody listened.`,u.id);
  const s=info.stats;if(s&&s.passYds>=300)feedPost(L,FEED_ACC[1],`${u.abbr} threw for ${s.passYds} yards today. Efficiency rating: ${ncaaRating(s).toFixed(1)}.`,u.id);
  if(s&&s.rushYds>=200)feedPost(L,FEED_ACC[1],`${u.abbr} ran for ${s.rushYds} yards at ${s.rushAtt?(s.rushYds/s.rushAtt).toFixed(1):0} per carry.`,u.id);
}
function feedWeek(L,prevRank){
  const r=L.rank||[];
  for(let i=0;i<25&&i<r.length;i++){const id=r[i],p=prevRank.indexOf(id);if(p<0||p>=25){if(Math.random()<.6)feedPost(L,FEED_ACC[3],`New in the poll: ${T(id).city} enters at #${i+1}.`,id)}else if(p-i>=6)feedPost(L,FEED_ACC[3],`${T(id).city} vaults from #${p+1} to #${i+1} after a big win.`,id)}
  for(let i=0;i<25&&i<prevRank.length;i++){const id=prevRank[i],n=r.indexOf(id);if(i<10&&(n<0||n>=25))feedPost(L,FEED_ACC[3],`${T(id).city} falls out of the poll after being #${i+1}.`,id)}
  const hw=(L.heismanWatch||[])[0];if(hw&&L.week<L.R&&L.lastHeisLeader!==hw.pid){L.lastHeisLeader=hw.pid;feedPost(L,FEED_ACC[0],`New Heisman frontrunner: ${hw.name} (${T(hw.team).abbr}) · ${hw.line}.`,hw.team)}
  if(L.week>=L.R-5&&L.week<L.R&&L.phase==='regular'&&r.length>12){const k=r[11]+'-'+r[12];if(L.lastBubble!==k){L.lastBubble=k;feedPost(L,FEED_ACC[4],`Projected CFP bubble: last in #12 ${T(r[11]).city}, first out #13 ${T(r[12]).city}.`,r[11])}}
  if(L.week>=L.R){for(const g of (L.weeks[L.week]||{games:[]}).games)if(g.hs!=null&&(g.tag||'').match(/Championship|Semifinal|Quarterfinal|Bowl/)&&Math.random()<.5){const w=T(winner(g)),lo=T(loser(g));feedPost(L,FEED_ACC[0],`${w.city} wins the ${g.tag}, ${Math.max(g.hs,g.as)}–${Math.min(g.hs,g.as)} over ${lo.city}.`,w.id)}}
}
