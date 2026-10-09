/* =========================================================
   05 · Game engine (v5)
   Offense always attacks +x in engine coordinates. S.poss says who has the ball:
   'home' = the user's team (S.home), 'away' = the opponent (S.away).
   ========================================================= */
const FW=53.33,CEN=FW/2,HASH1=23.58,HASH2=29.75,VY=.62;
const SPD={QB:6.7,RB:8.2,WR:8.45,TE:7.3,OL:5.0,DL:5.9,LB:7.1,CB:8.15,S:7.85,K:6};
const ACC={QB:9,RB:12,WR:11,TE:9,OL:6,DL:7,LB:8,CB:8,S:7.5,K:6};
const DIFF=[.93,1,1.05,1.1];
/* game-clock speed: seconds of game clock per real second during a play / between plays */
const CLK={play:2,pre:2,preCap:22};
const S={phase:'boot',home:null,away:null,game:null,score:[0,0],q:1,qlen:180,clock:180,playClock:25,los:35,ballY:CEN,down:1,firstDownX:45,conv:false,poss:'home',stats:null,ostats:null,pst:{},opst:{},dxp:{},diffMul:1,ot:false,otRound:0,dc:null,to:[3,3],clockRun:false,clockHold:0,preRun:0,wx:'Clear',slot:'Afternoon',ts:1,slowT:0,shake:0,bullet:false,paused:false,flip:1,pc:null,aiPlay:null,defCall:'auto',ctrlKey:'LB0',ctrl:null,dirt:{},wear:[]};
let P=[],OFF=[],DEF=[],Q=null,RB=null,KP={},play=null,ball={state:'held',x:35,y:CEN,z:0},deadT=0,aim=null,touch=null,stick=null,kick=null,cardNext=null,particles=[],tickTimer=null,aiSnapT=0;
const newGameStats=()=>({att:0,comp:0,passYds:0,passTD:0,int:0,sacks:0,rushAtt:0,rushYds:0,rushTD:0,yac:0,passes:[],plays:0,firstDowns:0,thirdA:0,thirdC:0,rzA:0,rzTD:0,pen:0,penYds:0,fum:0,bigPlays:0});
const focus=k=>!!(LG&&LG.focus===k);
const uOff=()=>S.poss==='home';
const offT=()=>uOff()?S.home:S.away, defT=()=>uOff()?S.away:S.home, offIdx=()=>uOff()?0:1;
const dcOf=t=>t===S.home?S.dc.u:S.dc.a;
const tstat=()=>uOff()?S.stats:S.ostats;
const ps=p=>{const m=p.user?S.pst:(S.opst||(S.opst={}));return m[p.pl.id]||(m[p.pl.id]={pa:0,pc:0,py:0,ptd:0,int:0,ra:0,ry:0,rtd:0,rec:0,recy:0,rectd:0})};
const dx=(pl,k,n)=>{const d=S.dxp[pl.id]||(S.dxp[pl.id]={xp:0,tkl:0,sck:0,dint:0});d[k]=(d[k]||0)+n};
const credit=(d,k,n,xp)=>{if(d&&d.user){dx(d.pl,k,n);if(xp)dx(d.pl,'xp',xp)}};
const spotOf=c=>c.x+.45;

/* stamina: linear drain over the game; endurance slows it; conditioning practice slows it more */
const progress=()=>S.ot?1:clamp(((S.q-1)*S.qlen+(S.qlen-S.clock))/(4*S.qlen),0,1);
const stamina=(pl,user)=>1-(.32-.05*pl.end)*(user&&focus('conditioning')?.7:1)*progress();
const condF=(pl,user)=>user?.88+.12*(pl.cond/100):1;
const moraleF=user=>user?.97+.06*(LG.morale/100):1;
function speedOf(role,pl,user){return SPD[role]*(.8+.065*pl.spd)*stamina(pl,user)*condF(pl,user)*moraleF(user)*(user?1:S.diffMul)*(S.wx==='Snow'?.95:S.wx==='Rain'?.98:1)}

/* ---------- game start / resume / autosave ---------- */
function startUserGame(g,snap){
  hideAll();
  const u=T(LG.user),opp=T(g.h===LG.user?g.a:g.h);
  const rk=rankOf(opp.id),boost=rk?(rk<=5?1.05:rk<=10?1.035:1.02):1;
  Object.assign(S,{game:g,home:u,away:opp,userHome:g.h===LG.user&&!g.neutral,neutral:!!g.neutral,qlen:LG.settings.qlen,diffMul:(DIFF[LG.settings.diff]||1)*boost,
    aiSkill:clamp(.45+(teamOvr(opp)-3)*.2+(boost-1)*4+(LG.settings.diff-1)*.08,.2,.97),wx:g.wx||'Clear',slot:g.slot||'Afternoon',ts:1,slowT:0,shake:0,paused:false,simmed:false,celebrate:null,defCall:'auto',ctrlKey:LG.settings.defPlayer||'LB0'});
  muted=!!LG.settings.muted;
  S.dc={u:{},a:{}};for(const pos of POS_ORDER){S.dc.u[pos]=depth(u,pos);S.dc.a[pos]=depth(opp,pos)}
  if(snap)Object.assign(S,JSON.parse(JSON.stringify(snap.S)));
  else Object.assign(S,{score:[0,0],q:1,clock:LG.settings.qlen,ot:false,otRound:0,to:[3,3],stats:newGameStats(),ostats:newGameStats(),pst:{},opst:{},dxp:{},clockRun:false,rzActive:false,poss:'home',dirt:{},wear:[],recv2:'away'});
  if(!snap){S.injured=[];S.pbp=[];S.drives=[];S.drive=null;initWind()}if(!S.wind)initWind();applyInjuredDepth();
  if(!S.ostats)S.ostats=newGameStats();if(!S.opst)S.opst={};if(!S.dirt)S.dirt={};if(!S.wear)S.wear=[];
  lastScore=S.score.slice();resetRenderCaches();particles=[];
  document.documentElement.style.setProperty('--opp',opp.c1);
  $('#sb').hidden=false;$('#pauseBtn').hidden=false;
  if(typeof BC!=='undefined')BC.gameStart(!!snap);
  if(snap){if(snap.pat){S.phase='pat';showPAT()}else toPresnap();toast('Game resumed');return}
  const kickoff=()=>{if(typeof BC!=='undefined')BC.intro();setTimeout(()=>coinToss(u,opp),1800)};
  if(typeof BC!=='undefined'&&LG.settings.pregame!==false){S.phase='wait';BC.pregame(kickoff)}else kickoff();
}
function resumeGame(simRest){const g=userGameThisWeek();if(!g||!LG.live){LG.live=null;return showHub('home')}startUserGame(g,LG.live);if(simRest)setTimeout(simToFinal,50)}
function snapshot(pat){
  if(!LG||!S.home)return;
  LG.live={wk:LG.week,opp:S.away.id,score:S.score.slice(),q:S.q,clock:S.clock,ot:S.ot,pat:!!pat,
    S:{score:S.score,q:S.q,clock:S.clock,los:S.los,ballY:S.ballY,down:S.down,firstDownX:S.firstDownX,conv:S.conv,ot:S.ot,otRound:S.otRound,to:S.to,stats:S.stats,ostats:S.ostats,pst:S.pst,opst:S.opst,dxp:S.dxp,rzActive:S.rzActive,poss:S.poss,clockRun:S.clockRun,recv2:S.recv2,dirt:S.dirt,wear:S.wear.slice(-40),wind:S.wind,injured:S.injured,drives:S.drives,line:S.line,lineLast:S.lineLast}};
  Saves.saveLive(SLOT,LG);
}

/* ---------- possessions, kickoffs, quarters ---------- */
function startDrive(x,why){S.poss='home';if(typeof BC!=='undefined')BC.newDrive();S.los=x;S.ballY=CEN;S.down=1;S.firstDownX=Math.min(110,x+10);S.conv=false;S.rzActive=false;S.clockRun=false;if(why&&typeof BC!=='undefined')BC.say('drive',{why});toPresnap()}
function startDefDrive(los,why){S.poss='away';if(typeof BC!=='undefined')BC.newDrive();S.los=clamp(los,11,109);S.ballY=CEN;S.down=1;S.firstDownX=Math.min(110,S.los+10);S.conv=false;S.rzActive=false;S.clockRun=false;if(why)toast(why);toPresnap()}
/* opponent gets the ball; dist = yards from the user's goal line */
function oppPossession(dist,why){
  S.phase='wait';S.rzActive=false;S.clockRun=false;S.poss='away';hideActs();
  const mode=LG.settings.defMode||'ask',go=m=>m==='play'?startDefDrive(110-dist,why):oppDrive(dist,why);
  if(mode==='ask')showOpt(`<b>${esc(S.away.abbr)} ball</b>${why?' · '+esc(why):''} · ${esc(spotLabelFor(110-dist,'away'))}`,[{t:'Play defense',s:'Control a defender',f:()=>go('play')},{t:'Sim the drive',s:'Play-by-play ticker',cls:'alt',f:()=>go('sim')}]);
  else go(mode);
}
function kickoffTo(side,why){
  S.clockRun=false;
  if(side==='home'){const tb=Math.random()<.55;const x=tb?35:clamp(10+R(16,36),20,60);if(!tb&&Math.random()<.012){S.score[0]+=6;banner('Kick return touchdown!',S.home.c1);sfx('roar');S.phase='pat';return setTimeout(showPAT,900)}toast(tb?'Touchback':`Kickoff returned to the ${spotLabel(x)}`);return startDrive(x,why)}
  const tb=Math.random()<.55;let x=tb?35:clamp(10+R(16,36),20,60);if(S.kickPen){x+=15;S.kickPen=false}oppPossession(110-x,why+(tb?' · touchback':''));
}
/* called whenever a play or possession ends and the clock may have run out */
function boundary(cont){
  if(S.ot||S.clock>0)return cont();
  if(S.q===1||S.q===3){toast(`End of the ${qName(S.q).toLowerCase()} quarter`);S.q++;S.clock=S.qlen;S.clockRun=false;if(typeof BC!=='undefined'){BC.quarterCard(S.q);if(S.q===4)BC.fourth()}return cont()}
  if(S.q===2)return halftime();
  return endRegulation();
}
function halftime(){
  S.phase='wait';S.q=3;S.clock=S.qlen;S.to=[3,3];S.clockRun=false;hideActs();['#call','#opt','#snapBar'].forEach(s=>$(s).hidden=true);
  const go=()=>kickoffTo(S.recv2||'away','Second-half kickoff');
  if(typeof BC!=='undefined'&&LG.settings.halftime!==false)BC.halftime(go);else go();
}
function presnapExpire(){['#call','#opt','#snapBar'].forEach(s=>$(s).hidden=true);S.phase='wait';boundary(()=>toPresnap())}

function toPresnap(){
  S.phase='presnap';S.playClock=LG.settings.pclock||25;S.preRun=0;play=null;aim=null;touch=null;stick=null;S.bullet=false;S.celebrate=null;S.pc=null;
  S.lob=false;S.hurry=false;$('#bulletBtn').hidden=true;$('#bulletBtn').setAttribute('aria-pressed','false');$('#snapBar').hidden=true;hideActs();
  if(!S.conv&&!S.rzActive&&S.los>=90){S.rzActive=true;tstat().rzA++}
  S.motion=null;$('#hotBar').hidden=true;S.flip=Math.random()<.5?1:-1;CALL_TAB=S.down===4&&!S.conv?'special':CALL_TAB==='special'?'pass':CALL_TAB;
  if(uOff()){setupFormation(null,S.flip);showCall()}
  else{const pc=aiChoosePlay();S.aiPlay=pc;if(pc.special){S.phase='wait';return aiSpecial(pc.special)}setupFormation(pc,S.flip);showDefCall()}
  snapshot();
  $('#toBtn').hidden=!(S.clockRun&&!S.ot&&S.to[0]>0&&S.clock>0);
}

function add(side,role,x,y,pl,team,key){
  const user=team===S.home;
  const p={side,role,key,team,user,x,y,vx:0,vy:0,z:0,pl,num:pl.num,spd:speedOf(role,pl,user),acc:ACC[role],route:null,rpath:null,cont:null,wi:0,stop:false,stun:0,bt:0,immune:false,shed:0,cov:null,homeX:x,homeY:y,blocker:false,face:side==='o'?1:-1,phase:Math.random()*6.28,fallen:false,fallP:0,lunge:0,lungeCD:0,stiff:0,throwT:0,react:0,engaged:false,eng:null,tgt:null,dirt:(S.dirt&&S.dirt[pl.id])||0,ovr:ovr99(pl),settle:0};
  if(!user&&side==='d'&&uOff()&&role!=='DL')p.spd*=Math.sqrt(SL('cov'));
  if(user&&side==='o'&&LG.staff){const oc=LG.staff.oc;if(['WR','TE','RB'].includes(role))p.spd*=1+.01*(oc.r-3)+(oc.trait==='Play Caller'?.03:0)}
  P.push(p);(side==='o'?OFF:DEF).push(p);return p;
}
function setRoute(p,name,inD){
  const r=ROUTES[name];if(!r)return;
  p.stop=!!r.stop;p.wi=0;p.settle=0;p.rname=name;p.route=r.w.map(([a,b])=>[Math.min(119.4,p.x+a),clamp(p.y+b*inD,1,FW-1)]);
  const pts=[[p.x,p.y],...p.route];const a=pts[pts.length-2],z=pts[pts.length-1];const ddx=z[0]-a[0],ddy=z[1]-a[1],d=hyp(ddx,ddy)||1;
  p.cont=p.stop?null:[clamp(z[0]+ddx/d*40,0,119.4),clamp(z[1]+ddy/d*40,1.2,FW-1.2)];p.rpath=pts;
}
function setupFormation(pc,flip){
  const L=S.los,b=S.ballY,ot=offT(),dtm=defT(),o=dcOf(ot),d=dcOf(dtm);P=[];OFF=[];DEF=[];flip=flip||1;
  const fname=(pc&&pc.form)||'Gun Doubles',form=FORMS[fname],fb=fname==='I-Form';
  [-2.2,-1.1,0,1.1,2.2].forEach((dy,i)=>add('o','OL',L-.7,b+dy,o.OL[i]||o.OL[0],ot,'OL'+i));
  const who={QB:o.QB[0],R:o.RB[0],X:o.WR[0],Z:o.WR[1],H:fb?(o.RB[1]||o.TE[1]||o.WR[2]):o.WR[2],Y:o.TE[0]};
  const role={QB:'QB',R:'RB',X:'WR',Z:'WR',H:fb?'RB':'WR',Y:'TE'};
  KP={};for(const k of ['QB','R','X','H','Y','Z']){const [fx,fy]=form[k];KP[k]=add('o',role[k],L+fx,clamp(b+fy*flip,2.5,FW-2.5),who[k],ot,k)}
  Q=KP.QB;RB=KP.R;
  if(pc&&pc.r)for(const k in pc.r){const p=KP[k];if(!p)continue;const rt=pc.r[k];if(rt==='block'){p.blocker=true;continue}const inD=Math.abs(p.y-b)<.6?-flip:(p.y<b?1:-1);setRoute(p,rt,inD)}
  /* defense: 4 DL, 2 LB, 3 CB, 2 S */
  const cov=uOff()?aiPickCoverage(dtm,sitInfo()):(S.defCall==='auto'?aiPickCoverage(dtm,sitInfo()):S.defCall);S.cov=cov;
  const D={};[-3.3,-1.1,1.1,3.3].forEach((dy,i)=>D['DL'+i]=add('d','DL',Math.min(119,L+1),b+dy,d.DL[i]||d.DL[0],dtm,'DL'+i));
  D.LB0=add('d','LB',Math.min(119,L+4.6),b-3.8,d.LB[0],dtm,'LB0');D.LB1=add('d','LB',Math.min(119,L+4.6),b+3.8,d.LB[1]||d.LB[0],dtm,'LB1');
  const third=KP.H.role==='WR'?KP.H:KP.Y,press=cov==='man'||cov==='blitz';
  [KP.X,KP.Z,third].forEach((w,i)=>D['CB'+i]=add('d','CB',Math.min(119,L+(press?R(1.6,2.6):R(5.5,7.5))),w.y,d.CB[i]||d.CB[0],dtm,'CB'+i));
  const deepS=cov==='prevent'?20:cov==='cover4'||cov==='cover2'?13:11;
  D.S0=add('d','S',Math.min(119,L+deepS),clamp(b-9,4,FW-4),d.S[0],dtm,'S0');D.S1=add('d','S',Math.min(119,L+deepS),clamp(b+9,4,FW-4),d.S[1]||d.S[0],dtm,'S1');
  assignCoverage(cov,D,KP);
  S.ctrl=null;if(!uOff()){S.ctrl=D[S.ctrlKey]||D.LB0}
  ball={state:'held',x:L,y:b,z:0};
}
function assignCoverage(cov,D,K){
  const L=S.los,b=S.ballY,sX=K.X.y<b?-1:1,hS=K.H.y<b?-1:1;
  const yS=(side,off)=>side<0?off:FW-off;
  const Z=(x,y,deep)=>({type:'zone',x:Math.min(L+x,deep?117:114),y:clamp(y,2,FW-2),deep:!!deep});
  const M=t=>({type:'man',tgt:t}),rush={type:'rush'};
  for(const k in D)if(k.startsWith('DL'))D[k].cov=rush;
  const third=K.H.role==='WR'?K.H:K.Y,te=K.H.role==='WR'?K.Y:K.H;
  switch(cov){
    case 'man':D.CB0.cov=M(K.X);D.CB1.cov=M(K.Z);D.CB2.cov=M(third);D.LB0.cov=M(te);D.LB1.cov=M(K.R);D.S0.cov=Z(16,CEN,1);D.S1.cov=Z(9,b,0);break;
    case 'blitz':D.CB0.cov=M(K.X);D.CB1.cov=M(K.Z);D.CB2.cov=M(third);D.S1.cov=M(te);D.S0.cov=M(K.R);D.LB0.cov=rush;D.LB1.cov=rush;break;
    case 'cover2':D.CB0.cov=Z(4.5,yS(sX,9));D.CB1.cov=Z(4.5,yS(-sX,9));D.CB2.cov=Z(7,b+hS*9);D.LB0.cov=Z(7,b-4);D.LB1.cov=Z(7,b+4);D.S0.cov=Z(17,yS(-1,14),1);D.S1.cov=Z(17,yS(1,14),1);break;
    case 'cover4':D.CB0.cov=Z(14,yS(sX,8),1);D.CB1.cov=Z(14,yS(-sX,8),1);D.S0.cov=Z(15,yS(-1,20),1);D.S1.cov=Z(15,yS(1,20),1);D.CB2.cov=Z(5,yS(hS,12));D.LB0.cov=Z(7,b-4);D.LB1.cov=Z(7,b+4);break;
    case 'prevent':D.CB0.cov=Z(22,yS(sX,10),1);D.CB1.cov=Z(22,yS(-sX,10),1);D.S0.cov=Z(27,yS(-1,20),1);D.S1.cov=Z(27,yS(1,20),1);D.CB2.cov=Z(11,CEN);D.LB0.cov=Z(9,b-7);D.LB1.cov=Z(9,b+7);break;
    default:D.CB0.cov=Z(15,yS(sX,9),1);D.CB1.cov=Z(15,yS(-sX,9),1);D.S0.cov=Z(18,CEN,1);D.CB2.cov=Z(6,yS(hS,13));D.S1.cov=Z(6,yS(-hS,13));D.LB0.cov=Z(7,b-4.5);D.LB1.cov=Z(7,b+4.5);
  }
}
function sitInfo(){
  const togo=S.firstDownX-S.los,late=S.q>=4&&S.clock<S.qlen*.3&&!S.ot,diff=S.score[offIdx()]-S.score[1-offIdx()];
  return {toGo:togo,down:S.down,redzone:S.los>=90,trailingLate:late&&diff<0,leadingLate:late&&diff>0,lastPlay:!S.ot&&(S.q===2||S.q===4)&&S.clock<10&&S.los>=55,prevent:late&&diff<0&&!uOff()?false:late&&diff>0&&diff<=8&&S.clock<S.qlen*.12};
}
const teamStamina=()=>{const l=OFF.filter(p=>p.user).map(p=>stamina(p.pl,true)*condF(p.pl,true));return l.length?sum(l)/l.length:1};
const kicker=()=>S.dc.u.K[0],oppKicker=()=>S.dc.a.K[0];
const maxFG=k=>45+4*(k||kicker()).thr;
const fgDist=()=>Math.round(110-S.los+17);
const maxRange=()=>44+5*(Q?Q.pl.thr:3);
function convChance(){const togo=S.firstDownX-S.los;return clamp(.74-togo*.055+(offOvr(offT())-defOvr(defT()))*.09,.05,.95)}

/* ---------- play calling (user offense) ---------- */
let CALL_TAB='pass';
function showCall(){
  const late=!S.ot&&S.q>=4&&S.clock<=S.qlen*.25&&S.score[0]>S.score[1];
  const fourth=S.down===4&&!S.conv;
  const head=`<b>${esc(ddText())}</b> · ${S.conv?'from the 3':esc(spotLabel(S.los))} · QB ${esc(Q.pl.last)} <span class="ovr">${Q.ovr}</span>${S.wx!=='Clear'?' · '+WX_ICON[S.wx]+' '+S.wx:''}${fourth?` · <span class="tag gold">Go-for-it chance ${Math.round(convChance()*100)}%</span>`:''}`;
  $('#callHead').innerHTML=head;
  const specials=[];
  if(fourth){if(!S.ot)specials.push(['punt','Punt','Flip the field'],['fakepunt','Fake punt','Catch them napping']);const fd=fgDist();if(fd<=maxFG()+3)specials.push(['fg','Field goal',fd+' yd attempt'],['fakefg','Fake FG','Surprise run'])}
  if(late&&!S.conv)specials.push(['kneel','Kneel','Run clock · −1 yd']);
  if(!S.conv&&S.clockRun&&!S.ot&&S.down<4)specials.push(['spike','Spike','Stop the clock · uses a down']);
  if(!fourth&&CALL_TAB==='special'&&!specials.length)CALL_TAB='pass';
  const tabs=[['pass','Pass'],['run','Run']];if(specials.length)tabs.push(['special','Special']);
  const row=$('#callRow');
  let body='';
  if(CALL_TAB==='special')body=specials.map(([k,t,s])=>`<button class="play ${k.startsWith('fake')?'warn':'alt'}" data-sp="${k}"><b>${t}</b><small>${s}</small></button>`).join('');
  else body=PLAYBOOK.filter(p=>p.cat===CALL_TAB&&!(S.conv&&p.hail)).map(p=>`<button class="pcard" data-pid="${p.id}">${playSVG(p)}<b>${esc(p.name)}</b><small>${esc(p.form)}</small></button>`).join('');
  row.innerHTML=`<div class="pbtabs">${tabs.map(([k,l])=>`<button data-tab="${k}" aria-pressed="${k===CALL_TAB}">${l}</button>`).join('')}${S.lastPc&&!S.conv&&S.down<4?`<button class="coach nh" data-nh="1">No huddle · ${esc(S.lastPc.name)}</button>`:''}<button class="coach" data-coach="1">Coach's pick</button></div><div class="pbgrid ${CALL_TAB==='special'?'sp':''}">${body}</div>`;
  row.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ac();CALL_TAB=b.dataset.tab;showCall()});
  const nh=row.querySelector('[data-nh]');if(nh)nh.onclick=()=>{ac();S.hurry=true;pickPlay(S.lastPc);setTimeout(()=>{if(S.phase==='presnap'&&S.pc){$('#snapBar').hidden=true;startPlay(S.pc)}},420)};
  row.querySelector('[data-coach]').onclick=()=>{ac();const p=aiPickPlay(S.home,sitInfo());pickPlay(p)};
  row.querySelectorAll('[data-pid]').forEach(b=>b.onclick=()=>{ac();pickPlay(PLAYBOOK[+b.dataset.pid])});
  row.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{ac();callSpecial(b.dataset.sp)});
  $('#call').hidden=false;
}
function pickPlay(pc){
  if(S.phase!=='presnap')return;S.pc=pc;$('#call').hidden=true;
  setupFormation(pc,S.flip);
  $('#snapName').textContent=pc.name;$('#snapBar').hidden=false;if(typeof BC!=='undefined')BC.presnap();
  hint(pc.cat==='run'?'Tap SNAP · then drag anywhere to steer':'Tap SNAP · drag back from anywhere to aim, release to throw');
}
$('#snapGo').onclick=()=>{ac();if(S.phase==='presnap'&&S.pc){$('#snapBar').hidden=true;startPlay(S.pc)}};
$('#snapFlip').onclick=()=>{ac();if(S.phase==='presnap'&&S.pc){S.flip*=-1;setupFormation(S.pc,S.flip)}};
$('#snapBack').onclick=()=>{ac();if(S.phase==='presnap'){$('#snapBar').hidden=true;S.pc=null;setupFormation(null,S.flip);showCall()}};
function showOpt(head,opts){
  $('#optHead').innerHTML=head;const row=$('#optRow');row.innerHTML='';
  opts.forEach(o=>{const b=document.createElement('button');b.className='play '+(o.cls||'');b.innerHTML=`<b>${o.t}</b><small>${o.s||''}</small>`;b.onclick=()=>{ac();$('#opt').hidden=true;o.f()};row.appendChild(b)});
  $('#opt').hidden=false;
}
function flagMsg(m){logPBP('Flag: '+m);if(typeof BC!=='undefined'&&BC.flagCard(m)){sfx('whistle');BC.say('flag',{m});return}const f=$('#flag');f.textContent='🚩 '+m;f.classList.add('show');clearTimeout(flagMsg.t);flagMsg.t=setTimeout(()=>f.classList.remove('show'),2600);sfx('whistle');if(typeof BC!=='undefined')BC.say('flag',{m})}
function callSpecial(k){
  if(S.phase!=='presnap')return;$('#call').hidden=true;$('#toBtn').hidden=true;
  if(k==='punt')return doPunt();
  if(k==='fg')return startKick(fgDist(),'fg');
  if(k==='kneel'){setupFormation(playByName('QB Sneak'),S.flip);S.phase='live';play=newPlay(playByName('QB Sneak'));S.phase='dead';deadT=.9;play.result={kind:'kneel',x:S.los-1,y:S.ballY};Q.fallen=true;sfx('whistle');return}
  if(k==='spike'){setupFormation(playByName('Spacing'),S.flip);play=newPlay(playByName('Spacing'));S.phase='dead';deadT=.7;play.result={kind:'spike',x:S.los,y:S.ballY};sfx('whistle');toast('Spiked to stop the clock');return}
  if(k==='fakepunt'||k==='fakefg'){const pc=playByName('Power');setupFormation(pc,S.flip);startPlay(pc,{fake:k})}
}
function newPlay(pc,o){
  o=o||{};const b=S.ballY;
  return {pc,name:pc.name,type:pc.cat==='run'?'run':'pass',t:0,carrier:Q,thrown:false,scramble:false,handed:false,pa:!!pc.pa,flea:!!pc.flea,fleaHold:false,screen:pc.screen||null,screenGo:false,run:pc.run||null,
    fake:o.fake||null,jukeT:0,jukeCD:0,jukeDir:1,spinT:0,truckT:0,slowT:0,dive:0,hurdle:0,hurdleOK:false,moveId:0,ended:false,fakes:0,caught:false,catchX:0,gapY:pc.run?clamp(b+pc.run.gap*S.flip,3,FW-3):b,
    result:null,ballT0:0,rec:null,contested:false,tipped:new Set(),startDown:S.down,readT:0,nextRead:0,intended:null,swat:0};
}
function startPlay(pc,o){
  if(S.phase!=='presnap')return;$('#call').hidden=true;$('#toBtn').hidden=true;$('#snapBar').hidden=true;
  /* false start: crowd noise matters when the visiting offense snaps */
  const visitorOff=uOff()?(!S.userHome&&!S.neutral):S.userHome;
  const fsP=(visitorOff?.02:.006)*(uOff()?(hasTrait('dc','Disciplinarian')?.6:1)*(1.2-LG.morale/250):1);
  if(!S.conv&&Math.random()<fsP){flagMsg(`False start · ${offT().abbr} offense · 5 yards${visitorOff?' · crowd noise':''}`);tstat().pen++;tstat().penYds+=5;S.los=Math.max(11,S.los-5);S.firstDownX=Math.min(110,Math.max(S.firstDownX,S.los+1));S.clockRun=false;return setTimeout(toPresnap,700)}
  if(S.clockRun&&!S.ot&&!uOff()){const sit=sitInfo(),want=sit.leadingLate?24:sit.trailingLate?3:13;const extra=Math.max(0,want-S.preRun);S.clock=Math.max(0,S.clock-extra);if(S.clock<=0){S.phase='wait';return boundary(()=>toPresnap())}}
  if(uOff()&&!o)S.lastPc=pc;applyMotion();play=newPlay(pc,o);const pl=play;
  OFF.forEach(p=>{if(p.role==='OL')p.blocker=true});
  if(pl.type==='run'){
    const ck=pl.run.carrier;pl.ckey=ck;
    for(const p of OFF)if(p.key!==ck&&p.key!=='QB'&&p.role!=='OL'){p.route=null;p.rpath=null;p.blocker=true;if(pl.run.lead===p.key)p.lead=true}
    if(ck==='QB'){pl.qbCarry=true}
    if(pl.run.jet||pl.run.reverse){const c=KP[ck];const side=Math.sign(c.y-S.ballY)||1;pl.gapY=clamp(S.ballY-side*10,3,FW-3);if(pl.run.jet){c.x=Q.x+1.2;c.y=S.ballY+side*3.2;c.vy=-side*c.spd*.9}}
    if(pl.run.option)pl.pitchMan=ck==='QB'?RB:null;
    assignRunBlocks(ck);
    if(!S.conv){tstat().rushAtt++}
  }
  if(pl.fake){for(const d of DEF){if(d.role==='CB'||d.role==='S')d.x=Math.min(119,d.x+8);if(d.role==='LB')d.x=Math.min(119,d.x+3);d.react=.7}toast(pl.fake==='fakepunt'?'Fake punt!':'Fake field goal!')}
  if(pl.run&&(pl.run.reverse||pl.run.counter||pl.run.trap)){pl.fakeY=clamp(2*S.ballY-pl.gapY,4,FW-4);for(const d of DEF)if(d.role!=='DL')d.react=pl.run.reverse?1.05:.6;else if(pl.run.trap)d.react=.4}
  if(pl.pa||pl.flea)for(const d of DEF)if(d.role==='LB'||d.role==='S')d.react=(d.react||0)+.25*(1.2-S.aiSkill*.4);
  S.phase='live';sfx('hike');$('#sit').classList.remove('on');if(!S.conv)tstat().plays++;if(S.down===3&&!S.conv)tstat().thirdA++;
  S.wasThird=S.down===3&&!S.conv;
  if(typeof BC!=='undefined'){BC.snap();recStart()}
  showActs();
  if(uOff())hint(pl.type==='pass'?'Drag back to aim · release to throw · tap the field to scramble':'Drag to steer · use the buttons to juke, spin or truck');
  else hint(`You are #${S.ctrl.num} ${S.ctrl.pl.last} · drag to move · TACKLE to dive · SWITCH for the nearest man`);
}
function delayOfGame(){if(!uOff())return;flagMsg('Delay of game · offense · 5 yards');S.los=Math.max(11,S.los-5);S.playClock=LG.settings.pclock||25;tstat().pen++;S.clockRun=false;$('#snapBar').hidden=true;setupFormation(null,S.flip);showCall()}
$('#toBtn').onclick=()=>{if(S.phase!=='presnap'||S.to[0]<=0||!S.clockRun)return;S.clockRun=false;S.to[0]--;S.playClock=LG.settings.pclock||25;$('#toBtn').hidden=true;toast(`Timeout ${S.home.abbr} · ${S.to[0]} left`);sfx('whistle');if(typeof BC!=='undefined')BC.say('timeout',{t:S.home});snapshot()};
$('#bulletBtn').onclick=()=>{S.bullet=!S.bullet;$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet))};

/* ---------- defense (user) ---------- */
function showDefCall(){
  const pc=S.aiPlay;
  const pers=pc?(pc.form==='I-Form'?'21 personnel':pc.form==='Gun Empty'?'10 personnel':pc.form==='Gun Trips'?'11 personnel · trips':'11 personnel'):'';
  $('#callHead').innerHTML=`<b>${esc(S.away.abbr)} ball</b> · ${esc(ddText())} · ${esc(spotLabelFor(S.los,'away'))} · <span class="tag">${esc(pc?pc.form:'')} · ${pers}</span> · you control <b>#${S.ctrl.num} ${esc(S.ctrl.pl.last)}</b> <span class="ovr">${S.ctrl.ovr}</span> · tap a defender to switch`;
  const row=$('#callRow');
  row.innerHTML=`<div class="pbgrid sp">${[['auto','Coach\'s call','Let the DC pick'],...DEF_CALLS].map(([k,t,s])=>`<button class="play ${k===S.defCall?'sel':''}" data-dc="${k}"><b>${t}</b><small>${s}</small></button>`).join('')}<button class="play alt" data-dc="sim"><b>Sim the drive</b><small>Skip to the result</small></button></div>`;
  row.querySelectorAll('[data-dc]').forEach(b=>b.onclick=()=>{ac();const k=b.dataset.dc;
    if(k==='sim'){$('#call').hidden=true;S.phase='wait';return oppDrive(110-S.los,'Drive continues')}
    S.defCall=k;setupFormation(S.aiPlay,S.flip);$('#call').hidden=true;S.phase='presnap';aiSnapT=1.3;if(typeof BC!=='undefined')BC.presnap();hint('Get set…')});
  $('#call').hidden=false;
}
function switchDefender(target){
  if(uOff())return;let best=target||null;
  if(!best){const fx=ball.state==='air'?ball.tx:(play&&play.carrier?play.carrier.x:S.los),fy=ball.state==='air'?ball.ty:(play&&play.carrier?play.carrier.y:S.ballY);let bd=1e9;for(const d of DEF){if(d===S.ctrl)continue;const dd=hyp(d.x-fx,d.y-fy);if(dd<bd){bd=dd;best=d}}}
  if(best){S.ctrl=best;S.ctrlKey=best.key;sfx('cut');if(S.phase==='presnap'&&!$('#call').hidden)showDefCall()}
}
function userTackle(){
  const d=S.ctrl;if(!d||!play||d.stun>0||d.lunge>0||d.lungeCD>0)return;
  if(ball.state==='air'){const dd=hyp(ball.tx-d.x,ball.ty-d.y);if(dd<3.2){play.swat=.6;d.z=.5;toast('Going for the ball!');return}}
  const c=play.carrier;let tx,ty;
  if(c&&hyp(c.x-d.x,c.y-d.y)<3.4){tx=c.x+c.vx*.25;ty=c.y+c.vy*.25}else{const s=stick&&stick.m>12?stick:null;tx=d.x+(s?s.dx:-1)*2.4;ty=d.y+(s?s.dy:0)*2.4}
  d.lunge=.32;d.lungeCD=1.1;d.lx=tx;d.ly=ty;d.userLunge=true;sfx('cut');
}

/* ---------- kicking: tap for direction, tap for power ---------- */
function doPunt(){
  const k=kicker();let net=33+k.thr*2.4+R(-5,5)+(S.wx==='Wind'?R(-6,6):0);const land=S.los+net;
  dres('Punt');logPBP(`${S.home.abbr} punts ${Math.round(net)} yards.`);if(typeof BC!=='undefined')BC.card('PUNT',`${esc(k.last)} · ${Math.round(net)} yds`,land>=110?'Touchback':`Downed at the ${spotLabelFor(120-land,'away')}`,S.home.c1);sfx('thump');toast(`Punt · ${Math.round(net)} yds`);if(!S.ot)S.clock=Math.max(0,S.clock-6);S.phase='wait';S.clockRun=false;
  setTimeout(()=>toOpp(land>=110?80:land-10,land>=110?'Punt · touchback':'Punt'),900);
}
function startKick(dist,kind){
  S.phase='kick';const k=kicker();const iced=kind==='fg'&&tryIce();
  kick={dist,kind,stage:'aim',t:0,ang:0,pow:0,lockA:0,lockP:0,flight:0,good:null,
    width:clamp(.34-(dist-20)*.0055,.09,.34)*(.8+.1*k.acc)*(kind==='xp'?1.25:1)*(iced?.9:1),
    need:clamp(dist/maxFG(),.22,1.02)*(S.wx==='Rain'||S.wx==='Snow'?1.05:1),drift:S.wind&&S.wind.mph>6?clamp(windY()*S.wind.mph/120,-.14,.14)*(Math.random()<.5?1:-1)*R(.5,1):0,aSpeed:1.3+dist*.018,k};
  $('#kickHead').innerHTML=`<b>${kind==='xp'?'Extra point':'Field goal'} · ${dist} yd</b> · K ${esc(k.last)} <span class="ovr">${ovr99(k)}</span>${S.wx==='Wind'?' · wind':''}`;
  $('#kickBtn').textContent='Tap to aim';$('#kickBtn').disabled=false;$('#kick').hidden=false;hint('Tap once to lock direction, again to lock power');
}
function kickTap(){
  if(!kick)return;
  if(kick.stage==='aim'){kick.lockA=kick.ang;kick.stage='power';kick.t=0;$('#kickBtn').textContent='Tap for power';return}
  if(kick.stage==='power'){kick.lockP=kick.pow;kick.stage='flight';kick.flight=0;const a=kick.lockA+kick.drift;kick.aimF=a;kick.good=Math.abs(a)<kick.width&&kick.lockP>=kick.need;$('#kickBtn').disabled=true;sfx('thump')}
}
function updateKick(dt){
  if(!kick)return;kick.t+=dt;
  if(kick.stage==='aim')kick.ang=Math.sin(kick.t*kick.aSpeed);
  if(kick.stage==='power'){const p=(kick.t*1.15)%2;kick.pow=p<1?p:2-p}
  if(kick.stage==='flight'){kick.flight+=dt;if(kick.flight>=1.05&&!kick.done){kick.done=true;finishKick()}}
}
function finishKick(){
  const k=kick,good=k.good;
  setTimeout(()=>{
    $('#kick').hidden=true;hint('');
    if(k.kind==='fg'){dres(good?'FG':'Missed FG');if(good&&typeof BC!=='undefined')BC.scoringDrive(S.home)}logPBP(`${k.k.last} ${k.dist}-yard ${k.kind==='xp'?'extra point':'field goal'} is ${good?'good':'no good'}.`);if(good){haptic('success');banner("It's good",S.home.c1);sfx('roar');S.score[0]+=k.kind==='xp'?1:3;if(typeof BC!=='undefined')BC.say(k.kind==='xp'?'xp':'fg',{good:true,dist:k.dist})}else{banner('No good','#5B6672');sfx('groan');if(typeof BC!=='undefined')BC.say('fg',{good:false,dist:k.dist})}
    kick=null;S.clockRun=false;if(k.kind==='fg'&&!S.ot)S.clock=Math.max(0,S.clock-5);
    setTimeout(()=>{if(k.kind==='xp'||good){if(S.ot)return otNext('home');return boundary(afterScoreKickoff)}toOpp(Math.min(S.los-10,80),'Missed field goal')},1300);
  },250);
}
$('#kickBtn').onclick=()=>{ac();kickTap()};
function showPAT(){
  const two=S.ot&&S.otRound>=2;S.phase='pat';S.poss='home';snapshot(true);
  showOpt(two?'<b>Overtime rule:</b> you must go for two':'Point after touchdown',[...(two?[]:[{t:'Extra point',s:'Kick · 33 yd',f:()=>startKick(33,'xp')}]),{t:'Go for two',s:'One play from the 3',cls:'alt',f:()=>{S.conv=true;S.los=107;S.ballY=CEN;S.down=1;S.firstDownX=110;toPresnap()}}]);
}
function afterScoreKickoff(){
  S.phase='wait';S.clockRun=false;
  showOpt('Kickoff',[{t:'Kick deep',s:'Usually a touchback',f:()=>kickoffTo('away','Kickoff')},{t:'Squib kick',s:'Shorter, no big return',cls:'alt',f:()=>oppPossession(110-clamp(10+R(28,40),30,52),'Squib kick')},{t:'Onside kick',s:'Risky · about 1 in 7',cls:'warn',f:()=>{
    const ok=Math.random()<.13+(S.q>=4&&S.score[0]<S.score[1]?.05:0);if(!S.ot)S.clock=Math.max(0,S.clock-3);
    if(ok){banner('Onside recovered!',S.home.c1);sfx('roar');setTimeout(()=>startDrive(R(55,58)),900)}else{toast('They recover the onside kick');oppPossession(R(43,47),'Onside kick')}}}]);
}

/* ---------- AI offense: play choice, 4th down, special teams ---------- */
function aiChoosePlay(){
  const sit=sitInfo(),A=S.away;
  if(S.conv)return aiPickPlay(A,{...sit,toGo:3,redzone:true});
  if(!S.ot&&S.q>=4&&sit.leadingLate&&S.clock<40&&S.down<4)return {special:'kneel'};
  if(S.down===4){const dec=aiFourth();if(dec!=='go')return {special:dec}}
  return aiPickPlay(A,sit);
}
function aiFourth(){
  const togo=S.firstDownX-S.los,fgd=fgDist(),late=S.q>=4&&S.clock<S.qlen*.3&&!S.ot,diff=S.score[1]-S.score[0],k=oppKicker(),inRange=fgd<=maxFG(k)-2;
  if(S.ot)return inRange&&togo>3?'fg':'go';
  if(late&&diff<0){if(diff>=-3&&inRange)return 'fg';return 'go'}
  if(late&&S.clock<S.qlen*.1&&diff<=0)return inRange?'fg':'go';
  const agg=schemeOf(S.away)==='Option'?1.5:1;
  if(togo<=1*agg&&S.los>=50)return 'go';
  if(togo<=2*agg&&S.los>=70&&!inRange)return 'go';
  if(inRange)return 'fg';
  if(S.los>=68&&togo<=4)return 'go';
  return 'punt';
}
function aiSpecial(k){
  hideActs();
  if(k==='kneel'){toast(`${S.away.abbr} kneels`);if(!S.ot&&S.clockRun)S.clock=Math.max(0,S.clock-Math.min(S.clock,40));S.los=Math.max(11,S.los-1);S.down++;S.clockRun=true;if(S.down>4)return toUser(Math.max(11,120-S.los),'Turnover on downs');return boundary(toPresnap)}
  if(k==='punt'){dres('Punt');const kk=oppKicker(),net=33+kk.thr*2.4+R(-5,5),land=S.los+net;logPBP(`${S.away.abbr} punts ${Math.round(net)} yards.`);if(typeof BC!=='undefined')BC.card('PUNT',`${esc(kk.last)} · ${Math.round(net)} yds`,land>=110?'Touchback':'',S.away.c1);sfx('thump');toast(`${S.away.abbr} punts · ${Math.round(net)} yds`);if(!S.ot)S.clock=Math.max(0,S.clock-6);S.clockRun=false;
    setTimeout(()=>toUser(land>=110?30:clamp(120-land,11,99),land>=110?'Punt · touchback':'Punt'),900);return}
  if(k==='fg'){const dist=fgDist(),kk=oppKicker(),p=clamp(1.18-dist*.0125-(5-kk.thr)*.03,.15,.985);const good=Math.random()<p;S.clockRun=false;if(!S.ot)S.clock=Math.max(0,S.clock-5);
    dres(good?'FG':'Missed FG');if(good&&typeof BC!=='undefined')BC.scoringDrive(S.away);logPBP(`${S.away.abbr} ${dist}-yard field goal is ${good?'good':'no good'}.`);setTimeout(()=>{if(good){S.score[1]+=3;banner(`${S.away.abbr} field goal · ${dist} yd`,S.away.c1);sfx('groan')}else{banner(`${dist}-yd attempt is no good`,S.home.c1);sfx('roar')}if(typeof BC!=='undefined')BC.say('ofg',{good,dist});
      setTimeout(()=>{if(S.ot)return otNext('away');if(good)return boundary(()=>kickoffTo('home','Kickoff'));toUser(Math.max(30,120-S.los),'Missed field goal')},1300)},500);return}
}
function aiPAT(){
  const diff=S.score[1]-S.score[0];
  const goTwo=(S.ot&&S.otRound>=2)||(!S.ot&&S.q===4&&S.clock<S.qlen*.4&&[-2,-5,-10,1,5,-9,-12].includes(diff));
  if(goTwo){toast(`${S.away.abbr} goes for two`);S.conv=true;S.los=107;S.ballY=CEN;S.down=1;S.firstDownX=110;return setTimeout(toPresnap,700)}
  const good=Math.random()<.965;if(good)S.score[1]+=1;toast(good?`${S.away.abbr} extra point is good`:'Extra point is no good!');
  setTimeout(()=>{if(S.ot)return otNext('away');boundary(()=>kickoffTo('home','Kickoff'))},900);
}

/* ---------- simulation helpers ---------- */
function steer(p,tx,ty,spd,dt,acc){const ddx=tx-p.x,ddy=ty-p.y,d=hyp(ddx,ddy);let vx=0,vy=0;if(d>.05){const s=spd*Math.min(1,d/1.1);vx=ddx/d*s;vy=ddy/d*s}const k=Math.min(1,(acc||p.acc)*dt);p.vx+=(vx-p.vx)*k;p.vy+=(vy-p.vy)*k}
const eligible=p=>p.side==='o'&&(p.role==='WR'||p.role==='TE'||p.role==='RB');
function isRunner(){if(!play||!play.carrier||play.carrier.side!=='o'||play.fleaHold)return false;const c=play.carrier;if(c===Q)return play.scramble||(play.type==='run'&&play.handed);return play.type==='pass'?play.caught:play.handed}
function nearest(list,x,y,f){let b=null,bd=1e9;for(const o of list){if(f&&!f(o))continue;const d=hyp(o.x-x,o.y-y);if(d<bd){bd=d;b=o}}return [b,bd]}
function claimFree(p,list){let b=null,bd=1e9;for(const d of list){const dd=hyp(d.x-p.x,d.y-p.y)+(d.claim&&d.claim!==p?3.5:0);if(dd<bd){bd=dd;b=d}}if(b)b.claim=p;return b}
function assignRunBlocks(ck){
  const front=DEF.filter(d=>d.role==='DL'||d.role==='LB'),back=DEF.filter(d=>d.role==='CB'||d.role==='S');
  const line=OFF.filter(p=>p.blocker&&(p.role==='OL'||p.key==='Y')&&!p.lead).sort((a,b)=>a.y-b.y),taken=new Set();
  const pairs=[];for(const o of line)for(const d of front)pairs.push([Math.abs(d.y-o.y)+(d.role==='LB'?2.4:0)+Math.abs(d.x-o.x)*.25,o,d]);pairs.sort((a,b)=>a[0]-b[0]);
  for(const [,o,d] of pairs){if(o.tgt||taken.has(d))continue;taken.add(d);o.tgt=d;d.claim=o}
  for(const o of OFF.filter(p=>p.lead)){let best=null,bd=1e9;for(const d of front.concat(back)){if(taken.has(d))continue;const dd=hyp(d.x-S.los,d.y-play.gapY);if(dd<bd){bd=dd;best=d}}if(best){taken.add(best);o.tgt=best;best.claim=o}}
  for(const o of OFF.filter(p=>p.blocker&&!p.tgt&&p.key!==ck&&p.role!=='QB')){let best=null,bd=1e9;for(const d of back.concat(front)){if(taken.has(d))continue;const dd=hyp(d.x-o.x,d.y-o.y);if(dd<bd){bd=dd;best=d}}if(best){taken.add(best);o.tgt=best;best.claim=o}}
}
function blockCheck(d,dt){
  d.engaged=false;if(d.immune||d.stun>0)return false;
  for(const o of OFF){if(!o.blocker||o===play.carrier||o.stun>0||o.fallen)continue;if(o.role!=='OL'&&o.tgt!==d&&o.key!=='Y')continue;
    if(hyp(o.x-d.x,o.y-d.y)<1.25){if(o.role==='WR'||o.role==='RB'&&!o.lead){d.shed=d.shed||R(.4,1)}d.engBy=o;d.bt+=dt;if(!d.shed)d.shed=Math.max(.5,(d.role==='DL'?(play.type==='pass'?R(1.3,2.9):R(1.7,3.2)):R(.7,1.5))+(o.pl.str-d.pl.str)*.3+(play.type==='run'?.55:0)+(o.user&&play.type==='run'?.35+(focus('running')?.4:0)+(SL('run')-1)*2:0)-(d.user?0:(S.diffMul-1)*3)+(o.user?0:(S.diffMul-1)*3));
      if(d.bt>d.shed){d.immune=true;return false}d.engaged=true;o.engaged=true;o.eng=d;
      /* run blocks turn defenders sideways to open a lane (never driven backwards) */
      if(play.type==='run'&&!play.handed||play.type==='run'&&play.carrier&&play.carrier.x<S.los+3){const side=Math.sign(d.y-play.gapY)||1;d.y+=side*Math.max(.4,1.5+(o.pl.str-d.pl.str)*.4)*dt}
      return true}}
  return false;
}
function blockAI(p,dt){
  const pl=play;
  if(p.eng&&p.eng.engaged&&!p.eng.immune){const d=p.eng,g=(pl.handed||pl.caught)&&pl.carrier?pl.carrier:pl.type==='run'?{x:S.los,y:pl.gapY}:Q;const ddx=g.x-d.x,ddy=g.y-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n*.95,d.y+ddy/n*.95,p.spd*.9,dt);return}
  p.eng=null;
  const passPro=(pl.type==='pass'&&!pl.thrown&&!pl.scramble&&pl.carrier===Q&&!pl.screenGo)||(pl.run&&pl.run.delay&&pl.t<pl.run.delay+.25);
  if(passPro&&(p.role==='OL'||p.role==='TE'||p.role==='RB')){
    if(!p.tgt||p.tgt.immune||p.tgt.stun>0)p.tgt=claimFree(p,DEF.filter(d=>d.cov&&d.cov.type==='rush'&&!d.immune&&d.stun<=0));
    const d=p.tgt;if(d){const ddx=Q.x-d.x,ddy=Q.y-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n,d.y+ddy/n,5.4,dt)}else steer(p,p.homeX-1.4,p.homeY,3,dt);return;
  }
  const c=pl.carrier||Q,pre=pl.type==='run'&&!pl.handed;let gx=pre||c.x<S.los?S.los+.5:c.x,gy=pre?pl.gapY:c.y;
  if(pre&&p.tgt&&Math.sign(p.tgt.y-S.ballY)!==Math.sign(pl.gapY-S.ballY)){const ck=KP[pl.ckey]||Q;gx=ck.x;gy=ck.y}
  if(!p.tgt||p.tgt.immune||p.tgt.stun>0||(pl.handed||pl.caught)&&(hyp(p.tgt.x-gx,p.tgt.y-gy)>16||p.tgt.x<c.x-3))p.tgt=claimFree(p,DEF.filter(d=>!d.immune&&d.stun<=0&&d.x>Math.min(p.x,c.x)-1&&hyp(d.x-gx,d.y-gy)<(p.lead?10:13)));
  const d=p.tgt;if(d){const ddx=gx-d.x,ddy=gy-d.y,n=hyp(ddx,ddy)||1;steer(p,d.x+ddx/n*.9,d.y+ddy/n*.9,p.spd*(p.lead?1:.97),dt)}else steer(p,c.x+4,c.y+(p.homeY>c.y?3:-3),p.spd*.8,dt);
}
function runRoute(p,dt){
  if(play.scramble){const dirY=Math.sign(Q.vy)||1;steer(p,Math.max(p.x,S.los+3)+1.5,clamp(p.y+dirY*3,2,FW-2),p.spd*.8,dt);return}
  let t=p.wi<p.route.length?p.route[p.wi]:null;
  if(t&&hyp(t[0]-p.x,t[1]-p.y)<.9){p.wi++;t=p.wi<p.route.length?p.route[p.wi]:null}
  if(t){steer(p,t[0],t[1],p.spd,dt);return}
  if(p.cont&&!p.stop&&hyp(p.cont[0]-p.x,p.cont[1]-p.y)>1.5){steer(p,p.cont[0],p.cont[1],p.spd,dt);return}
  /* route finished: settle, then work back to open grass instead of standing still */
  p.settle+=dt;if(p.settle<.6){steer(p,p.x,p.y,0,dt);return}
  const [d,dd]=nearest(DEF,p.x,p.y,o=>o.stun<=0);
  if(d&&dd<4){const ax=p.x-d.x,ay=p.y-d.y,n=hyp(ax,ay)||1;steer(p,clamp(p.x+ax/n*2+.4,S.los+1,118),clamp(p.y+ay/n*3,2,FW-2),p.spd*.55,dt)}
  else steer(p,p.x+.3,p.y+(Q.y-p.y)*.04,p.spd*.22,dt);
}
/* pursuit angle: aim at the point where the defender can actually meet the ball carrier */
function intercept(d,c,s){const rx=c.x-d.x,ry=c.y-d.y,vx=c.vx,vy=c.vy;s=Math.max(1,s||d.spd);const a=vx*vx+vy*vy-s*s,b=2*(rx*vx+ry*vy),cc=rx*rx+ry*ry;let t=2.5;
  if(Math.abs(a)<1e-3){if(b<0)t=-cc/b}else{const disc=b*b-4*a*cc;if(disc>=0){const q=Math.sqrt(disc),ts=[(-b-q)/(2*a),(-b+q)/(2*a)].filter(x=>x>0);if(ts.length)t=Math.min(...ts)}}
  t=clamp(t,0,2.5);return [c.x+vx*t,clamp(c.y+vy*t,-1,FW+1)]}
function zoneAI(d,cv){
  const L=S.los,zx=cv.x,zy=cv.y,R0=cv.deep?11:10;let thr=null,td=1e9;
  for(const o of OFF){if(!eligible(o)||o.blocker)continue;if(cv.deep&&o.x<L+7)continue;const dist=hyp((o.x-zx)*1.2,(o.y-zy)*.75);if(dist>R0)continue;if(dist<td){td=dist;thr=o}}
  if(thr){if(cv.deep)return [Math.max(zx-3,thr.x+2.2+thr.vx*.3),lerp(zy,thr.y,.7)];return [clamp(thr.x+thr.vx*.3-.4,L+2,zx+4),lerp(zy,thr.y+thr.vy*.3,.7)]}
  return [zx,lerp(zy,Q?Q.y:CEN,.12)];
}
function defAI(d,dt){
  d.lungeCD-=dt;
  if(d.stun>0){d.stun-=dt;steer(d,d.x,d.y,0,dt,4);if(d.stun<=0)d.fallen=false;return}
  if(d.lunge>0){d.lunge-=dt;steer(d,d.lx,d.ly,d.spd*1.6,dt,18);if(d.lunge<=0&&!play.ended){d.stun=d.userLunge?.55:.75;d.userLunge=false;d.fallen=true;spawnTurf(d.x,d.y,5)}return}
  const eng=blockCheck(d,dt);
  if(d===S.ctrl&&stick&&stick.m>12){const s=d.spd*(eng?(d.role==='DL'?.2:.3):1);steer(d,d.x+stick.dx*3,d.y+stick.dy*3,s,dt,14);return}
  let spd=d.spd;if(eng)spd*=d.engBy&&(d.engBy.role==='WR'||d.engBy.role==='RB'&&!d.engBy.lead)?.45:d.role==='DL'?.14:.16;
  if(d.react>0&&play.t<d.react){if(play.fakeY!=null&&d.role!=='DL'&&!eng){steer(d,d.x-.2,play.fakeY,d.spd*.55,dt);return}spd*=.35}
  const L=S.los,c=play.carrier,runner=isRunner();let tx,ty;
  if(ball.state==='air'&&!ball.pitch){const rem=ball.T-ball.t,dd=hyp(ball.tx-d.x,ball.ty-d.y),rt=d.role==='DL'?99:d.role==='LB'?.4:.25+(1-S.aiSkill)*.15;if(play.t-play.ballT0>rt&&dd/d.spd<rem+.7){tx=ball.tx;ty=ball.ty}}
  if(tx===undefined){
    let pursue=runner;
    if(play.type==='run'&&!play.fleaHold)pursue=play.t>({DL:0,LB:.5,CB:.85,S:.65})[d.role]||(d.cov&&d.cov.type==='rush');
    if(play.scramble&&play.t-play.scrT<.35&&d.role!=='DL')pursue=false;
    if(pursue&&c&&play.type==='run'&&d.role!=='DL'&&c.x<L+.3&&!(d.cov&&d.cov.type==='rush')){tx=L+2.4;ty=lerp(c.y,play.gapY,.6)}
    else if(pursue&&c){
      const n=hyp(c.x-d.x,c.y-d.y);[tx,ty]=intercept(d,c,spd);
      if(runner&&n<2.2&&n>1.05&&d.lungeCD<=0&&!eng&&d!==S.ctrl){d.lunge=.28;d.lungeCD=1.5;d.lx=c.x+c.vx*.26;d.ly=c.y+c.vy*.26}
    }else{
      const cv=d.cov||{type:'rush'};
      if(cv.type==='rush'){const t=c||Q;tx=t.x;ty=t.y}
      else if((play.pa||play.fleaHold)&&play.t<.65&&(d.role==='LB'||d.role==='S')){tx=L+1.5;ty=d.y}
      else if(cv.type==='man'){const a=cv.tgt;if(a.blocker&&!a.route){tx=L+5;ty=lerp(d.y,a.y,.5)}else{const cush=Math.max(.35,(d.role==='CB'?1.5:1.1)-play.t*.8);tx=a.x+a.vx*.35+cush;ty=a.y+a.vy*.35+(a.y<CEN?.45:-.45)}}
      else [tx,ty]=zoneAI(d,cv);
    }
  }
  steer(d,tx,ty,spd,dt);
}

/* ---------- ball carrier: user joystick control + AI running ---------- */
function moveMul(){const pl=play;return (pl.jukeT>0?1.12:1)*(pl.spinT>0?.95:1)*(pl.truckT>0?.92:1)*(pl.slowT>0?.78:1)*(pl.dive>0?1.25:1)}
function controlRunner(c,dt){
  const pl=play,spd=c.spd*moveMul();let dxv=1,dyv=0;
  if(stick&&stick.m>12){dxv=stick.dx;dyv=stick.dy}
  else if(pl.type==='run'&&c.x<S.los+1&&!pl.caught){const gx=S.los+1.5,gy=pl.gapY,n=hyp(gx-c.x,gy-c.y)||1;dxv=(gx-c.x)/n;dyv=(gy-c.y)/n}
  if(pl.jukeT>0){dyv+=pl.jukeDir*.95;dxv=Math.max(dxv,.55)}
  const n=hyp(dxv,dyv)||1;let vx=dxv/n*spd,vy=dyv/n*spd;
  if(pl.dive>0){vy*=.3;vx=Math.max(vx,spd*.9)}
  const k=Math.min(1,(pl.jukeT>0?24:15)*dt);c.vx+=(vx-c.vx)*k;c.vy+=(vy-c.vy)*k;
  carrierAnim(c,dt);
}
function aiRunner(c,dt){
  const pl=play;let tx,ty;
  if(pl.type==='run'&&!pl.caught&&c.x<S.los+.6){tx=S.los+2;ty=pl.gapY}
  else{let best=-1e9,bh=0;for(let a=-1.25;a<=1.26;a+=.25){const hx=Math.cos(a),hy=Math.sin(a);let sc=hx*1.5;
      for(const d of DEF){if(d.stun>0)continue;const rx=d.x-c.x,ry=d.y-c.y,dist=hyp(rx,ry)||.1;if(dist>9)continue;const proj=(rx*hx+ry*hy)/dist;if(proj<=.15)continue;sc-=proj*proj*(9-dist)/9*(d.engaged?.35:1.7)}
      const ny=c.y+hy*4;if(ny<1.5||ny>FW-1.5)sc-=2;if(sc>best){best=sc;bh=a}}
    tx=c.x+Math.cos(bh)*5;ty=c.y+Math.sin(bh)*5}
  steer(c,tx,ty,c.spd*moveMul(),dt,13);
  if(pl.jukeCD<=0&&pl.dive<=0){const [d,dd]=nearest(DEF,c.x,c.y,o=>o.stun<=0&&o.x>c.x-.3);if(d&&dd<2.3&&Math.random()<dt*1.3*(.35+c.pl.spd*.1)){if(c.pl.str>=4&&Math.random()<.4)doTruck();else if(Math.random()<.3)doSpin();else doJuke(Math.sign(c.y-d.y)||1)}}
  /* option pitch */
  if(pl.pitchMan&&c===Q&&!pl.pitched){const [d,dd]=nearest(DEF,c.x,c.y,o=>o.stun<=0&&!o.engaged);if(d&&dd<3.2)doPitch()}
  carrierAnim(c,dt);
}
function carrierAnim(c,dt){
  const pl=play;
  if(pl.hurdle>0){pl.hurdle-=dt;const t=1-pl.hurdle/.5;c.z=Math.max(0,Math.sin(t*Math.PI)*.95)}else if(pl.dive<=0)c.z=0;
  if(pl.dive>0){pl.dive-=dt;c.z=Math.max(0,Math.sin((1-pl.dive/.38)*Math.PI)*.35);if(pl.dive<=0){c.z=0;c.fallen=true;c.x+=.8;spawnTurf(c.x,c.y,8);endPlay('tackle','Dive')}}
  c.stiff=Math.max(0,c.stiff-dt);
}
function doJuke(dir){if(!play||play.jukeCD>0||play.dive>0)return;play.jukeT=.36;play.jukeCD=.75;play.jukeDir=dir;play.moveId++;play.move='juke';spawnTurf(play.carrier.x,play.carrier.y,5);sfx('cut')}
function doSpin(){if(!play||play.jukeCD>0||play.dive>0)return;play.spinT=.45;play.jukeCD=.95;play.moveId++;play.move='spin';sfx('cut')}
function doTruck(){if(!play||play.jukeCD>0||play.dive>0)return;play.truckT=.55;play.jukeCD=.9;play.moveId++;play.move='truck';play.carrier.stiff=.5}
function doHurdle(){const c=play&&play.carrier;if(!c||play.hurdle>0||play.dive>0)return;play.hurdle=.5;play.moveId++;play.hurdleOK=Math.random()<.45+(c.pl.spd-3)*.08+(c.pl.str-3)*.03}
function doDive(){if(!play||play.dive>0||play.hurdle>0)return;play.dive=.38}
function doPitch(){const pl=play;if(!pl||pl.pitched||!pl.pitchMan||pl.carrier!==Q)return;pl.pitched=true;const r=pl.pitchMan;ballTo(Q,r.x+r.vx*.3,r.y+r.vy*.3,.3,r);sfx('cut')}
function ballTo(from,tx,ty,T,to){ball={state:'air',pitch:true,to,fx:from.x,fy:from.y,x:from.x,y:from.y,z:0,tx,ty,t:0,T,h:.35,spin:0};play.carrier=null;play.handed=false}

/* ---------- QB (user = drag-to-aim; AI = progression reads) ---------- */
function qbMove(dt){
  const pl=play,L=S.los,b=S.ballY;
  if(pl.thrown||pl.fleaHold&&pl.carrier!==Q){steer(Q,Q.x,Q.y,0,dt);return}
  if(pl.type==='pass'){
    if(pl.flea&&!pl.fleaDone){if(pl.t<.3)steer(Q,L-3,b,4,dt);else steer(Q,L-6.5,b,3,dt);return}
    if(pl.pa&&pl.t<.55){steer(Q,L-3.4,lerp(b,RB.y,.6),3.4,dt);return}
    let tx=L-7,ty=b;
    if(!uOff()){const [d,dd]=nearest(DEF,Q.x,Q.y,o=>!o.engaged&&o.stun<=0);if(d&&dd<4){ty=clamp(Q.y-Math.sign(d.y-Q.y)*2,b-4,b+4);tx=L-5.5}}
    steer(Q,tx,ty,5.4,dt);return;
  }
  /* run plays: mesh, then carry out the fake */
  const ck=KP[pl.ckey];
  if(!pl.handed&&pl.run&&(pl.run.jet||pl.run.reverse)){steer(Q,L-(Q.x<L-3?4.5:2),b,3,dt);return}
  if(!pl.handed&&ck&&ck!==Q){steer(Q,L-2.4,lerp(b,ck.y,.5),5,dt);return}
  if(pl.handed&&!pl.qbCarry)steer(Q,Q.x-1,Q.y-Math.sign(pl.gapY-b||1)*2,3,dt);
}
function aiQB(dt){
  const pl=play;if(pl.thrown||pl.scramble||pl.carrier!==Q||pl.fleaHold)return;
  const sk=S.aiSkill,readStart=(pl.screen?.75:pl.pa?1.4:1.15)+(pl.flea?1.2:0);
  if(pl.t<readStart||pl.t<pl.nextRead)return;pl.nextRead=pl.t+.18;
  const pressure=DEF.some(d=>!d.engaged&&d.stun<=0&&hyp(d.x-Q.x,d.y-Q.y)<2.6);
  let best=null,bs=-1e9,bo=0;
  for(const r of OFF){if(!eligible(r)||r.blocker||r.fallen)continue;
    const px=r.x+r.vx*.55,py=r.y+r.vy*.55;const [,dd]=nearest(DEF,px,py,o=>o.stun<=0);const depth=px-S.los;
    let s=dd*1.1+Math.min(Math.max(depth,0),25)*.16+(px>=S.firstDownX?1.4:0)-(depth<-1?1.6:0)+R(-1,1)*(1-sk);
    if(pl.screen&&r.key===pl.screen)s+=pl.t<1.6?6:-2;
    if(S.down>=3&&px<S.firstDownX&&!pl.screen)s-=1.2;
    if(s>bs){bs=s;best=r;bo=dd}}
  const need=3.1-(pl.t-readStart)*.7-(pressure?1:0);
  if(best&&(bo>=need||pl.t>4.3)){aiThrow(best);return}
  if(pressure&&pl.t>2.3){if(Q.pl.spd>=4&&Math.random()<.45){pl.scramble=true;pl.scrT=pl.t;if(!S.conv){tstat().rushAtt++;ps(Q).ra++}return}if(Math.random()<.35){throwAway();return}}
  if(pl.t>5.2)throwAway();
}
function aiThrow(r){
  const d=hyp(r.x-Q.x,r.y-Q.y),v=17.5+1.8*Q.pl.thr,T=Math.max(.3,d/(v+d*.18));
  let tx=r.x+r.vx*T*.92,ty=r.y+r.vy*T*.92;tx=Math.min(tx,119);ty=clamp(ty,.8,FW-.8);
  throwBall(tx,ty,d<15&&Math.random()<.6,r);
}
function throwAway(){throwBall(Q.x+10,Q.y<CEN?-4:FW+4,false,null);play.throwAway=true}
function throwBall(tx,ty,bullet,intended){
  const qb=Q,d=hyp(tx-qb.x,ty-qb.y),thr=qb.pl.thr;
  const lob=!bullet&&!!(qb.user&&S.lob);const er=aimError(d,bullet)*(lob?.9:1);
  const ux=(tx-qb.x)/(d||1),uy=(ty-qb.y)/(d||1),a=Math.random()*Math.PI*2,r=er*Math.sqrt(Math.random());
  const along=Math.cos(a)*r*.55,perp=Math.sin(a)*r;tx+=ux*along-uy*perp;ty+=uy*along+ux*perp;
  const v=(17.5+1.8*thr)*(bullet?1.45:lob?.8:1),T=Math.max(.3,d/(v+d*.18));
  if(S.wind&&S.wind.mph>3){const k=S.wind.mph/20*.55*T*(lob?1.5:bullet?.4:1);tx+=windX()*k;ty+=windY()*k}
  ball={state:'air',fx:qb.x,fy:qb.y,x:qb.x,y:qb.y,z:0,tx,ty,t:0,T,h:bullet?d*.03+.45:lob?d*.18+1.3:d*.11+.5,bullet,lob,spin:0};haptic('light');
  if(!intended){const [n,nd]=nearest(OFF,tx,ty,o=>eligible(o)&&!o.blocker);intended=nd<8?n:null}
  play.intended=intended;play.thrown=true;play.ballT0=play.t;play.carrier=null;qb.throwT=.35;if(!S.conv){tstat().att++;ps(qb).pa++}sfx(bullet?'zip':'thump');hint('');$('#bulletBtn').hidden=true;hideActs();showActs();
}
function aimError(d,bullet){
  const qb=Q;if(!qb)return 1;const pressure=DEF.some(o=>!o.engaged&&o.stun<=0&&hyp(o.x-qb.x,o.y-qb.y)<2.4);
  const wx=S.wx==='Rain'?1.2:S.wx==='Snow'?1.15:S.wx==='Wind'&&d>20?1.3:1,moving=hyp(qb.vx,qb.vy)>3.2?1.25:1;
  return (.45+d*.009*(6.4-qb.pl.acc))*(bullet?1.2:1)*(pressure?1.3:1)*wx*moving*(qb.user&&focus('passing')?.8:1)*(qb.user?1/SL('acc'):1.08-S.aiSkill*.16);
}
function logPass(res){if(S.conv)return null;const r={depth:ball.tx-S.los,y:ball.ty,res,yds:0,yac:0};if(uOff())S.stats.passes.push(r);return r}

/* ---------- main simulation step ---------- */
function simulate(dt){
  for(const p of P){p.fallP=lerp(p.fallP,p.fallen?1:0,Math.min(1,dt*9));const sp=hyp(p.vx,p.vy);p.phase+=sp*dt*1.85;p.throwT=Math.max(0,p.throwT-dt)}
  if(S.phase==='dead'){for(const p of P){if(p===S.celebrate)continue;steer(p,p.x,p.y,0,dt,4);p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.z>0)p.z=Math.max(0,p.z-dt*3)}if(S.celebrate&&typeof animCelebrate==='function')animCelebrate(dt);return}
  const pl=play;pl.t+=dt;pl.jukeT=Math.max(0,pl.jukeT-dt);pl.spinT=Math.max(0,pl.spinT-dt);pl.truckT=Math.max(0,pl.truckT-dt);pl.jukeCD-=dt;pl.slowT-=dt;pl.swat=Math.max(0,pl.swat-dt);
  if(!S.ot&&!S.conv)S.clock=Math.max(0,S.clock-dt*CLK.play);
  runMech(dt);
  const runner=isRunner(),L=S.los;
  for(const p of OFF){
    p.engaged=false;
    if(p===pl.carrier&&runner){if(uOff())controlRunner(p,dt);else aiRunner(p,dt);continue}
    if(p===Q){qbMove(dt);continue}
    if(pl.type==='run'&&p.key===pl.ckey&&!pl.handed){carrierPre(p,dt);continue}
    if(pl.flea&&p===RB&&!pl.fleaDone){steer(p,L-1.8,p.y,5.5,dt);continue}
    if(pl.pitchMan===p&&!pl.pitched){steer(p,Q.x-1.6,Q.y+Math.sign(pl.gapY-S.ballY||1)*3.6,p.spd*.85,dt);continue}
    if(p.blocker)blockAI(p,dt);else if(p.route&&(p!==RB||pl.t>.4))runRoute(p,dt);else steer(p,p.x,p.y,0,dt);
    if(ball.state==='air'&&!ball.pitch&&eligible(p)&&!p.blocker&&ball.t/ball.T>.2&&(p===pl.intended||hyp(p.x-ball.tx,p.y-ball.ty)<6))steer(p,ball.tx,ball.ty,p.spd,dt,13);
  }
  if(!uOff()&&pl.type==='pass')aiQB(dt);
  if(pl.screen&&!pl.screenGo&&pl.t>.9){pl.screenGo=true;for(const o of OFF)if(o.role==='OL'){o.tgt=null;o.eng=null}for(const d of DEF)if(d.role==='DL'){d.immune=true}}
  for(const d of DEF)defAI(d,dt);
  for(const p of P){p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.side==='d')p.face=p.vx>2.8?1:p.vx<-.3||Math.abs(p.vx)<2.8?-1:p.face;else p.face=p.vx<-2.8?-1:1;}
  /* collisions: blockers give way, defenders are not shoved backwards */
  const hold=pl.carrier;
  for(let i=0;i<P.length;i++){const a=P[i];if(a===hold||a.fallen)continue;for(let j=i+1;j<P.length;j++){const c=P[j];if(c===hold||c.fallen)continue;const ddx=c.x-a.x,ddy=c.y-a.y,d=hyp(ddx,ddy);if(d<.95&&d>1e-4){const o=(.95-d);let wa=.5,wc=.5;if(a.side!==c.side){if(a.side==='d'){wa=.2;wc=.8}else{wa=.8;wc=.2}}a.x-=ddx/d*o*wa;a.y-=ddy/d*o*wa;c.x+=ddx/d*o*wc;c.y+=ddy/d*o*wc}}}
  const c=pl.carrier;
  if(c&&!pl.ended){
    if(runner||(pl.type==='run'&&!pl.handed&&c===Q&&pl.t>.15)){
      if(runner&&spotOf(c)>=110)return endPlay('td');
      if(c.y<0||c.y>FW)return endPlay('oob');
      tackleCheck(c);
    }else if(c===Q&&pl.type==='pass'&&!pl.thrown){
      for(const d of DEF){if(d.stun>0||d.engaged)continue;if(hyp(d.x-Q.x,d.y-Q.y)<(d.lunge>0?1.3:.95)){
        if(Math.random()<.04+Q.pl.spd*.012-(d.userLunge?.04:0)){d.stun=.7;d.fallen=true;toast('Escaped!')}
        else{Q.fallen=true;d.fallen=true;S.shake=.35;spawnTurf(Q.x,Q.y,10);credit(d,'sck',1,15);credit(d,'tkl',1,0);dirty(Q);
          if(Math.random()<.06){play.fumbler=Q;return endPlay('fum','Strip sack')}return endPlay('sack')}}}
    }
  }
  if(ball.state==='held'){const h=pl.carrier||Q;ball.x=h.x;ball.y=h.y;ball.z=0}
  else if(ball.state==='air'){
    ball.t+=dt;const p=Math.min(1,ball.t/ball.T);ball.x=lerp(ball.fx,ball.tx,p);ball.y=lerp(ball.fy,ball.ty,p);ball.z=4*ball.h*p*(1-p);ball.spin+=dt*20;
    if(ball.pitch){if(p>=1){const to=ball.to;if(Math.random()<.01&&!pl.flea){ball.state='held';pl.carrier=to;pl.fumbler=to;return endPlay('fum','Bad pitch')}ball.state='held';pl.carrier=to;if(pl.flea&&to===Q){pl.fleaDone=true;pl.fleaHold=false}else{pl.handed=true}}return}
    if(ball.bullet&&p>.12&&p<.86&&ball.z<1.5){for(const d of DEF){if(pl.tipped.has(d)||d.stun>0)continue;if(hyp(d.x-ball.x,d.y-ball.y)<.8){pl.tipped.add(d);if(Math.random()<.3+(d.pl.cat-3)*.06){if(Math.random()<.3){logPass('I');pl.carrier=d;credit(d,'dint',1,25);return endPlay('int')}logPass('X');return endPlay('inc','Tipped at the line')}}}}
    if(p>=1)resolveCatch();
  }
}
/* designed-run mechanics: handoffs, toss, jet, reverse, option, read option, flea flicker */
function runMech(dt){
  const pl=play,L=S.los,b=S.ballY;
  if(pl.flea){if(!pl.fleaHold&&!pl.fleaDone&&pl.t>.3&&pl.carrier===Q){pl.fleaHold=true;pl.carrier=RB}if(pl.fleaHold&&pl.carrier===RB&&pl.t>1.05&&ball.state==='held'){ballTo(RB,Q.x,Q.y,.32,Q)}return}
  if(pl.type!=='run'||pl.handed)return;
  const r=pl.run,ck=KP[pl.ckey];
  if(pl.qbCarry){if(pl.t>(r.delay||.15)){pl.handed=true;pl.carrier=Q;if(!S.conv)ps(Q).ra++}return}
  if(r.read&&!pl.readDone&&pl.t>.42){pl.readDone=true;const side=Math.sign(pl.gapY-b)||1;const [edge]=nearest(DEF.filter(d=>d.role==='DL'),b+side*5,L,()=>true);const crash=edge&&Math.abs(edge.y-pl.gapY)<2.6;
    if(crash){pl.qbCarry=true;pl.gapY=clamp(b-side*5.5,3,FW-3);pl.handed=true;pl.carrier=Q;if(!S.conv)ps(Q).ra++;toast('QB keeps it!');return}}
  if(r.toss&&pl.t>.12&&!pl.tossed){pl.tossed=true;ballTo(Q,ck.x+2,ck.y+Math.sign(pl.gapY-b||1)*1.5,.32,ck);if(!S.conv)ps(ck).ra++;return}
  if(ball.pitch)return;
  const meshT=(r.delay||0)+(r.quick?.3:r.jet?.45:r.reverse?.8:.55);
  if(ck&&hyp(Q.x-ck.x,Q.y-ck.y)<1.7&&pl.t>meshT*.5||pl.t>meshT+(r.jet||r.reverse?1.2:.35)&&ck&&hyp(Q.x-ck.x,Q.y-ck.y)<4){pl.handed=true;pl.carrier=ck;if(!S.conv)ps(ck).ra++}
}
function carrierPre(p,dt){
  const pl=play,L=S.los,b=S.ballY,r=pl.run;
  if(r.delay&&pl.t<r.delay){steer(p,p.x,p.y,0,dt);return}
  if(r.counter&&pl.t<.3){steer(p,p.x+.3,p.y-(pl.gapY-b)*.4,4,dt);return}
  if(r.jet){steer(p,Q.x+.9,Q.y,p.spd,dt);return}
  if(r.reverse){steer(p,Q.x-.9,Q.y,p.spd,dt);return}
  if(r.toss){steer(p,p.x+1,p.y+Math.sign(pl.gapY-b||1)*3,p.spd*.9,dt);return}
  steer(p,Math.min(L-1,Q.x+1.2),lerp(p.y,pl.gapY,.45),p.spd*.85,dt);
}

/* ---------- contact: tackles, broken tackles, big hits, fumbles ---------- */
function tackleCheck(c){
  const pl=play;
  for(const d of DEF){
    if(d.stun>0)continue;const reach=d.lunge>0?(d.userLunge?1.55:1.2):.95;if(hyp(d.x-c.x,d.y-c.y)>=reach)continue;
    if(d.engaged){if(d.armTried||hyp(d.x-c.x,d.y-c.y)>.8)continue;d.armTried=true;if(Math.random()>.12)continue}
    if(pl.hurdle>0&&c.z>.25){if(pl.hurdleOK){d.stun=1;d.fallen=true;if(++pl.fakes===1)toast('Hurdle!');continue}else{c.fallen=true;return tackled(c,d)}}
    if((pl.jukeT>0||pl.spinT>0)&&d.evadeId!==pl.moveId){d.evadeId=pl.moveId;
      const ok=Math.random()<clamp((pl.spinT>0?.55:.62)+(c.pl.spd-d.pl.spd)*.07+(c.user?0:(S.aiSkill-.5)*.1)-(d.userLunge?.12:0),.3,.9);
      if(ok){d.stun=.9;d.fallen=true;pl.fakes++;toast(pl.spinT>0?'Spin move!':'Juke!');if(typeof BC!=='undefined')BC.say('juke',{p:c});continue}}
    const gang=DEF.some(o=>o!==d&&o.stun<=0&&hyp(o.x-c.x,o.y-c.y)<1.35);
    const behind=d.x<c.x-.25;
    let ch=.09+(c.pl.str-d.pl.tkl)*.055+(c.role==='RB'?.06:0)+(c.user?.03+(focus('running')?.05:0):0)+(pl.truckT>0?.26:0)+(behind?.07:0)+(c.user?0:(S.aiSkill-.5)*.08)-(d.user?0:(S.diffMul-1)*1.5)-(d.userLunge?.06:0);
    if(c.user)ch*=2-SL('tkl');if(gang)ch*=.4;ch=clamp(ch,.03,.55);
    if(Math.random()<ch){d.stun=1;d.fallen=true;c.stiff=.45;pl.slowT=.25;toast(pl.truckT>0?'Trucked him!':'Broken tackle!');S.shake=.22;spawnTurf(d.x,d.y,6);if(typeof BC!=='undefined')BC.say('broken',{p:c});continue}
    return tackled(c,d);
  }
}
function tackled(c,d){
  const pl=play;c.fallen=true;d.fallen=true;dirty(c);dirty(d);
  const closing=hyp(d.vx-c.vx,d.vy-c.vy);const big=closing>9&&Math.random()<(d.pl.tkl>=4||d.pl.str>=4?.6:.25);
  S.shake=.12+d.pl.str*.05+(big?.25:0);spawnTurf(c.x,c.y,big?16:10);credit(d,'tkl',1,big?6:3);haptic(big?'heavy':'medium');injuryCheck(c,d,big);
  /* falling forward: momentum carries the ball a little further */
  if(c.vx>2)c.x+=(c.pl.str>=d.pl.tkl?R(.5,1.5):R(.1,.8));
  if(big){slowMo(.4);toast('BIG HIT!');sfx('thump');pl.bigHit=true;if(typeof BC!=='undefined')BC.say('bighit',{d,c})}
  const fumP=.003+(big?.025:0)+(5-c.pl.str)*.001+(S.wx==='Rain'?.005:0);
  if(Math.random()<fumP&&spotOf(c)<110){pl.fumbler=c;pl.forcer=d;return endPlay('fum')}
  endPlay('tackle');
}
function dirty(p){if(!p||!p.pl)return;const k=p.pl.id;S.dirt[k]=Math.min(1,(S.dirt[k]||0)+.06+(S.wx==='Rain'||S.wx==='Snow'?.08:0));p.dirt=S.dirt[k]}

/* ---------- catch resolution ---------- */
function resolveCatch(){
  const tx=ball.tx,ty=ball.ty,pl=play;
  const [rec,dr]=nearest(OFF,tx,ty,o=>eligible(o)&&!o.blocker),[df,dd]=nearest(DEF,tx,ty,d=>d.stun<=0);
  const inb=ty>=0&&ty<=FW&&tx<=120;const cr=rec?1.55+rec.pl.cat*.1:0;
  pl.passDepth=tx-S.los;
  const userSwat=df&&df===S.ctrl&&pl.swat>0;
  if(rec&&dr<cr&&inb&&!pl.throwAway){
    const contested=dd<2.1;pl.contested=contested;pl.cover=df;
    const ballSk=df?(df.pl.cat+df.pl.spd)/2:3;
    if(contested&&dd<dr&&Math.random()<.06+(ballSk-3)*.03+(userSwat?.15:0)){logPass('I');pl.carrier=df;credit(df,'dint',1,25);return endPlay('int')}
    const cat=rec.pl.cat,wxC=S.wx==='Rain'?-.06:S.wx==='Snow'?-.04:0;
    const pc=(contested?clamp(.15+dd*.2+(cat-3)*.07,.1,.66):.58+.05*cat)+wxC+(rec.user&&focus('passing')?.03:0)-(ball.bullet&&cat<4?.05:0)-(userSwat?.18:0)+(rec.user?0:(S.aiSkill-.5)*.08);
    if(Math.random()<pc){
      ball.state='held';pl.carrier=rec;pl.caught=true;rec.route=null;if(!S.conv){tstat().comp++;ps(Q).pc++;ps(rec).rec++}
      pl.rec=logPass('C');
      OFF.forEach(o=>{if(o!==rec&&o!==Q){o.blocker=true;o.tgt=null}});
      if(dr>.3){rec.x=lerp(rec.x,tx,.6);rec.y=lerp(rec.y,ty,.6)}
      pl.catchX=rec.x;if(contested){toast('Contested catch!');slowMo(.3)}
      if(rec.user)hint('Drag to steer · JUKE / SPIN / TRUCK buttons');showActs();
      if(typeof BC!=='undefined')BC.say('catch',{p:rec,contested});return;
    }
    logPass('X');if(contested&&df)credit(df,'xp',6,0);return endPlay('inc',contested?(userSwat?'Swatted away!':'Broken up'):'Dropped');
  }
  if(df&&dd<1.2&&inb&&!pl.throwAway&&Math.random()<.1+((df.pl.cat+df.pl.spd)/2-3)*.05+(userSwat?.15:0)){logPass('I');pl.carrier=df;credit(df,'dint',1,25);return endPlay('int')}
  logPass('X');endPlay('inc',pl.throwAway?'Thrown away':df&&dd<1.7?'Pass defended':'Incomplete');
}

/* ---------- end of play ---------- */
function endPlay(kind,msg){
  if(play.ended)return;{const cc=play.carrier;if(kind==='tackle'&&cc&&cc.side==='o'&&isRunner()&&spotOf(cc)>=110)kind='td'}play.ended=true;S.phase='dead';hint('');touch=null;aim=null;stick=null;$('#bulletBtn').hidden=true;hideActs();
  deadT=kind==='td'?2.8:kind==='int'||kind==='fum'?2.1:1.35;
  const c=play.carrier||Q;let x=kind==='inc'?S.los:kind==='td'?110:spotOf(c);
  if(kind!=='td'&&kind!=='inc'&&kind!=='int')x=Math.min(x,109.9);
  play.result={kind,x,y:clamp(c.y,0,FW),msg};
  const gain=Math.round(x-S.los),uo=uOff(),st=tstat();
  if(kind==='fum'){const f=play.fumbler||c;play.result.x=Math.min(109.9,spotOf(f));play.result.defRec=Math.random()<(play.bigHit?.6:.5);st.fum++;if(play.result.defRec)st.fumLost=(st.fumLost||0)+1;banner(play.result.defRec?'Fumble · turnover!':'Fumble · recovered by the offense',play.result.defRec?defT().c1:offT().c1);sfx('whistle');if(play.result.defRec){if(play.forcer)credit(play.forcer,'xp',20,0);slowMo(.4);uo?sfx('groan'):sfx('roar')}}
  else if(kind==='td'){const us=uo;{const oi=offIdx(),pre=S.score[oi]-S.score[1-oi];if(!S.ot&&S.q===4&&S.clock<S.qlen*.2&&pre<=0&&pre>-6){slowMo(1.3);setTimeout(()=>typeof BC!=='undefined'&&BC.chip('GO-AHEAD SCORE',offT().c1,fmtClock(S.clock)+' left'),2600)}}banner(S.conv?'Two-point good':'Touchdown',offT().c1,S.conv?'':`${c.pl.last} · ${offT().abbr} ${S.score[offIdx()]+6}, ${defT().abbr} ${S.score[1-offIdx()]}`);sfx(us?'roar':'groan');if(us){sfx('fight');S.celebrate=c;spawnConfetti(c.x,c.y)}slowMo(.5);if(us&&!S.conv)showCelebrate()}
  else if(kind==='int'){banner('Intercepted',defT().c1);sfx(uo?'groan':'roar');sfx('whistle');slowMo(.4)}
  else{sfx('whistle');if(LG.settings.gfx===false){if(kind==='inc')toast(msg||'Incomplete');else if(kind==='sack')toast(`Sacked · ${gain} yds`);else toast(`${msg?msg+' · ':''}${gain>=0?'+':''}${gain} yds${kind==='oob'?' · out of bounds':''}`)}}
  if(!S.conv&&kind!=='fum'||kind==='fum'&&!S.conv){
    if(kind==='tackle'||kind==='oob'||kind==='td'||kind==='fum'){
      const g=kind==='fum'?Math.round(play.result.x-S.los):gain;
      if(play.caught){st.passYds+=g;const yac=Math.max(0,Math.round(play.result.x-play.catchX));st.yac+=yac;if(play.rec){play.rec.yds=g;play.rec.yac=yac}ps(Q).py+=g;ps(c).recy+=g;if(kind==='td'){st.passTD++;ps(Q).ptd++;ps(c).rectd++}}
      else if(c.side==='o'){st.rushYds+=g;if(play.scramble&&c===Q&&!play.qbCarry){}ps(c).ry+=g;if(kind==='td'){st.rushTD++;ps(c).rtd++}}
      if(g>=20)st.bigPlays++;
    }
    if(kind==='sack')st.sacks++;if(kind==='int'){st.int++;ps(Q).int++}
  }
  logPlay(play.result,gain);
  if(S.wear){S.wear.push([uOff()?play.result.x:120-play.result.x,play.result.y]);if(S.wear.length>80)S.wear.shift()}
  if(typeof BC!=='undefined')BC.play(play.result,gain);
}
function showCelebrate(){if(LG.settings.celebrate===false)return;const b=$('#celebBtn');b.hidden=false;clearTimeout(showCelebrate.t);showCelebrate.t=setTimeout(()=>{b.hidden=true},2400)}
$('#celebBtn').onclick=()=>{ac();$('#celebBtn').hidden=true;deadT=Math.max(deadT,30);
  const poses=[['point','Point to the sky'],['heisman','Heisman pose'],['flex','Flex'],['spike','Spike it'],['leap','Leap into the stands'],['salute','Salute'],['bow','Take a bow'],['huddle','Team huddle'],['taunt','Taunt the defense']];
  $('#celebRow').innerHTML=poses.map(([k,t])=>`<button class="chip" data-c="${k}">${t}</button>`).join('');$('#celebSheet').hidden=false;
  $('#celebRow').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ac();$('#celebSheet').hidden=true;S.celebPose=b.dataset.c;S.celebT=0;deadT=2.2;if(b.dataset.c==='taunt'&&Math.random()<.55)S.celebFlag=true;if(typeof BC!=='undefined')BC.say('celebrate',{k:b.dataset.c})});
};

/* ---------- penalties (both sides; the offended team takes the better result) ---------- */
function rollPenalty(r){
  if(['kneel','spike','fum'].includes(r.kind)||S.conv)return null;
  const off=offT(),def=defT(),gain=r.x-S.los,disc=t=>t===S.home&&hasTrait('dc','Disciplinarian')?.7:1;
  if((r.kind==='tackle'||r.kind==='oob')&&gain>=4&&Math.random()<.016*disc(off))return {name:`Holding · ${off.abbr} offense · 10 yards, replay the down`,type:'ohold',on:'o'};
  if(r.kind==='td'&&gain>=8&&Math.random()<.006*disc(off))return {name:`Holding · ${off.abbr} offense · touchdown comes back`,type:'ohold',on:'o'};
  if(r.kind==='inc'&&play.contested&&play.passDepth>6&&play.cover&&Math.random()<.22)return {name:`Pass interference · ${def.abbr} defense · automatic first down`,type:'dpi',on:'d'};
  if(r.kind==='inc'&&Math.random()<.007*disc(def))return {name:`Holding · ${def.abbr} defense · 5 yards, automatic first down`,type:'dhold',on:'d'};
  if(play.thrown&&Math.random()<.004)return {name:`Roughing the passer · ${def.abbr} · 15 yards, automatic first down`,type:'add15',on:'d'};
  if(r.kind==='tackle'&&Math.random()<.005)return {name:`Face mask · ${def.abbr} defense · 15 yards`,type:'add15',on:'d'};
  if(Math.random()<.008*disc(def)&&gain<5&&r.kind!=='td'&&r.kind!=='int')return {name:`Offside · ${def.abbr} defense · 5 yards`,type:'off5',on:'d'};
  return null;
}
function penaltyStat(on,y){const st=on==='o'?tstat():(uOff()?S.ostats:S.stats);st.pen++;st.penYds+=y}
function applyResult(){
  const r=play.result,st=tstat();
  if(S.celebFlag){S.celebFlag=false;flagMsg(`Unsportsmanlike conduct · ${S.home.abbr} · 15 yards on the kickoff`);S.kickPen=true}
  S.celebrate=null;S.celebPose=null;
  if(r.kind==='spike'){S.down++;S.clockRun=false;if(S.down>4)return turnoverDowns(S.los);return nextSnap()}
  if(S.conv){const oi=offIdx();if(r.kind==='td')S.score[oi]+=2;else toast('Conversion failed');S.conv=false;S.clockRun=false;
    if(!uOff()){if(S.ot)return otNext('away');return boundary(()=>kickoffTo('home','Kickoff'))}
    if(S.ot)return otNext('home');return boundary(afterScoreKickoff)}
  const pen=rollPenalty(r);
  if(pen){
    flagMsg(pen.name);penaltyStat(pen.on,pen.type==='ohold'?10:pen.type==='off5'||pen.type==='dhold'?5:15);S.clockRun=false;
    if(pen.type==='ohold'){S.los=Math.max(11,S.los-10);if(S.wasThird)st.thirdA--;return nextSnap()}
    if(pen.type==='dpi'){S.los=Math.min(109,Math.max(S.los+1,Math.min(S.los+15,Math.round(ball.tx))));S.down=1;S.firstDownX=Math.min(110,S.los+10);if(S.wasThird){st.thirdA--}return nextSnap()}
    if(pen.type==='dhold'){S.los=Math.min(109,S.los+5);S.down=1;S.firstDownX=Math.min(110,S.los+10);if(S.wasThird)st.thirdA--;return nextSnap()}
    if(pen.type==='off5'){S.los=Math.min(109,S.los+5);if(S.wasThird)st.thirdA--;return nextSnap()}
  }
  /* clock: keeps running after an in-bounds tackle; stops on incompletions, out of bounds, scores and changes of possession */
  S.clockRun=['tackle','sack','kneel'].includes(r.kind)||(r.kind==='fum'&&!r.defRec);S.clockHold=0;
  const wasThird=S.wasThird;
  if(r.kind==='td'){dres('TD');if(wasThird)st.thirdC++;if(S.rzActive)st.rzTD++;S.clockRun=false;
    if(uOff()){S.score[0]+=6;S.phase='pat';hint('');return showPAT()}
    S.score[1]+=6;S.phase='wait';return aiPAT()}
  if(r.kind==='int'){dres('INT');S.rzActive=false;S.clockRun=false;
    const ret=Math.random()<.08?999:Math.round(R(0,22));
    if(uOff()){if(ret===999){S.score[1]+=7;banner('Pick six',S.away.c1);if(S.ot)return otNext('home');return boundary(()=>kickoffTo('home','Kickoff'))}return toOpp(clamp(r.x-10-ret,1,99),'Interception')}
    if(ret===999){S.score[0]+=6;banner('Pick six!',S.home.c1);sfx('roar');if(S.ot)return otNext('away');S.phase='pat';return setTimeout(showPAT,900)}
    return toUser(clamp(120-r.x+ret,11,99),'Interception')}
  if(r.kind==='fum'&&r.defRec){dres('Fumble');S.rzActive=false;S.clockRun=false;
    if(uOff())return toOpp(clamp(r.x-10,1,99),'Fumble');return toUser(clamp(120-r.x,11,99),'Fumble recovery')}
  let nx=r.kind==='inc'?S.los:r.x;
  if(pen&&pen.type==='add15'){nx=Math.min(109,nx+15);S.down=3;S.firstDownX=nx}
  if(r.kind!=='inc')S.ballY=clamp(r.y,HASH1,HASH2);
  if(nx<=10){dres('Safety');S.clockRun=false;if(uOff()){S.score[1]+=2;banner('Safety',S.away.c1);return boundary(()=>oppPossession(R(55,62),'Free kick after the safety'))}S.score[0]+=2;banner('Safety!',S.home.c1);sfx('roar');return boundary(()=>startDrive(R(40,48),'Free kick after the safety'))}
  if(nx>=S.firstDownX){if(wasThird)st.thirdC++;S.los=nx;S.down=1;S.firstDownX=Math.min(110,nx+10);st.firstDowns++;if(!pen)toast('First down');if(S.clockRun&&(S.q===2||S.q===4)&&S.clock<120*S.qlen/900+10)S.clockHold=2.2;if(typeof BC!=='undefined')BC.say('first',{});return nextSnap()}
  if(S.down===4)return turnoverDowns(nx);
  S.down++;S.los=nx;nextSnap();
}
function turnoverDowns(nx){dres('Downs');banner('Turnover on downs','#5B6672');S.rzActive=false;S.clockRun=false;if(uOff())return toOpp(clamp(nx-10,1,99),'Turnover on downs');return toUser(clamp(120-nx,11,99),'Turnover on downs')}
function aiWantsTO(){
  if(S.to[1]<=0||S.ot||!S.clockRun||S.clock<=0)return false;
  const diff=S.score[1]-S.score[0],late4=S.q===4&&S.clock<=S.qlen*.33+10,late2=S.q===2&&S.clock<=S.qlen*.15+5;
  if(late4&&diff<0&&diff>=-16)return true;
  if(late2&&!uOff()&&S.los>=40)return true;
  if(late2&&uOff()&&S.down>=3&&diff>=-7)return Math.random()<.5;
  return false;
}
function nextSnap(){
  if(aiWantsTO()){S.to[1]--;S.clockRun=false;toast(`Timeout ${S.away.abbr} · ${S.to[1]} left`);if(typeof BC!=='undefined')BC.say('timeout',{t:S.away})}
  boundary(toPresnap);
}
function afterPossessionChange(dist,why){toOpp(dist,why)}
function toOpp(dist,why){if(S.ot)return otNext('home');boundary(()=>oppPossession(dist,why))}
function toUser(x,why){if(S.ot)return otNext('away');boundary(()=>startDrive(x,why))}
function endRegulation(){
  if(S.score[0]===S.score[1]){
    S.ot=true;S.otRound=1;S.q=5;S.clock=0;S.clockRun=false;
    showTicker({eye:'End of regulation',team:S.home,lines:[{dd:'Overtime',t:'College rules: each team gets a possession from the 25. From the second overtime you must go for two after a touchdown. From the third, it’s alternating two-point plays.'}],res:'Overtime',good:true,chips:[['Ball','You go first']],btn:'Take the field',next:startOT});return;
  }
  gameOver();
}
function startOT(){
  S.poss='home';
  if(S.otRound>=3){S.conv=true;S.los=107;S.ballY=CEN;S.down=1;S.firstDownX=110;toPresnap();banner(S.otRound+'OT · two-point play',S.home.c1);return}
  S.los=85;S.ballY=CEN;S.down=1;S.firstDownX=95;S.conv=false;toPresnap();banner((S.otRound>1?S.otRound:'')+'OT',S.home.c1);
}
/* after a possession in overtime: who = the team that just had the ball */
function otNext(who){
  if(who==='home'){S.phase='wait';const mode=LG.settings.defMode||'ask';
    const live=()=>{S.poss='away';if(S.otRound>=3){S.conv=true;S.los=107;S.ballY=CEN;S.down=1;S.firstDownX=110}else{S.los=85;S.ballY=CEN;S.down=1;S.firstDownX=95;S.conv=false}toPresnap()};
    if(mode==='sim')return oppOT();if(mode==='play')return live();
    return showOpt(`<b>${esc(S.away.abbr)} overtime possession</b>`,[{t:'Play defense',s:'Control a defender',f:live},{t:'Sim it',s:'See the result',cls:'alt',f:oppOT}]);}
  const done=S.score[0]!==S.score[1];setTimeout(()=>{if(done)gameOver();else{S.otRound++;startOT()}},900);
}
function oppRating(){return clamp(.5+(offOvr(S.away)-defOvr(S.home))*.22+(S.diffMul-1)*2-(LG.staff.dc.r-3)*.03-(hasTrait('dc','Run Stopper')?.04:0)-(focus('film')?.04:0),.1,.92)}
function oppOT(){
  S.phase='drive';S.poss='away';hint('');
  const r=oppRating();let res,pts=0;const lines=[];const A=S.away,aq=starters(A,'QB')[0],ar=starters(A,'RB')[0],aw=starters(A,'WR')[0];
  if(S.otRound>=3){const ok=Math.random()<.36+.25*r;pts=ok?2:0;res=ok?'Two-point good':'Two-point stopped';lines.push({dd:'2-pt try',t:ok?`${aq.last} finds ${aw.last} in the end zone.`:`${aq.last}'s pass falls incomplete.`,cls:ok?'bad big':'good big'})}
  else{const roll=Math.random();
    if(roll<.3+.3*r){const two=S.otRound>=2;const ok2=Math.random()<.45;pts=6+(two?(ok2?2:0):1);res='Touchdown';lines.push({dd:'1st & 10 · '+S.away.abbr+' 25',t:`${ar.last} runs for ${rint(4,9)}.`},{dd:'2nd & 3',t:`${aq.last} to ${aw.last}, touchdown!`,cls:'bad big'},{dd:'Try',t:two?(ok2?'Two-point conversion is good.':'Two-point try fails!'):'Extra point is good.'})}
    else if(roll<.55+.3*r){pts=3;res='Field goal';lines.push({dd:'1st & 10',t:`${ar.last} gains ${rint(2,6)}.`},{dd:'3rd & 6',t:`${aq.last} incomplete.`},{dd:'4th & 6',t:`Field goal from ${rint(33,42)} yards is good.`,cls:'bad'})}
    else{res=pick(['Stopped on downs','Missed field goal','Interception']);const db=pick(starters(S.home,'CB'));if(res==='Interception'){dx(db,'dint',1);dx(db,'xp',25)}lines.push({dd:'1st & 10',t:`${ar.last} stuffed for no gain.`,cls:'good'},{dd:'3rd & 10',t:res==='Interception'?`INTERCEPTED by #${db.num} ${db.last}!`:`${aq.last} sacked!`,cls:'good big'})}}
  S.score[1]+=pts;if(pts)sfx('groan');
  const done=S.score[0]!==S.score[1];
  showTicker({eye:`${S.otRound>1?S.otRound:''}OT · ${S.away.city} possession`,team:S.away,lines,res,good:!pts,chips:[['From',S.otRound>=3?'the 3':S.away.abbr+' 25']],from:S.otRound>=3?3:25,to:pts>=6?0:pts===2?0:pts===3?8:20,btn:done?'Final':'Next overtime',next:()=>{if(done)gameOver();else{S.otRound++;startOT()}}});
}
/* simulated opponent possession, told as a play-by-play ticker */
function oppDrive(startDist,why){
  S.phase='drive';S.poss='away';hint('');S.clockRun=false;hideActs();
  const d=clamp(startDist,1,99),r=oppRating(),close=1-d/100;
  const pTD=.08+.44*r*close+(d<20?.18:0),pFG=.16+.15*close,pTO=.15-.06*r+(hasTrait('dc','Ball Hawk')?.05:0);
  const roll=Math.random();let res=roll<pTD?'TD':roll<pTD+pFG?'FG':roll<pTD+pFG+pTO?'TO':'PUNT';
  if(res==='PUNT'&&d<33)res='FG';
  let time=R(45,130)*(S.qlen/180);time=Math.min(time,S.clock+S.qlen-10);
  let endsHalf=false;
  if(time>=S.clock&&(S.q===2||S.q>=4)){time=S.clock;endsHalf=true;if(res!=='TD'||Math.random()<.5)res=(d<45&&Math.random()<.6)?'FG':'CLOCK'}
  S.clock-=time;if(!endsHalf&&S.clock<=0&&(S.q===1||S.q===3)){S.q++;S.clock+=S.qlen}if(endsHalf)S.clock=0;
  let yds,ourX,label,defTD=false;
  if(res==='TD'){yds=d;S.score[1]+=7;label='Touchdown';ourX=35}
  else if(res==='FG'){yds=Math.round(clamp(d-R(12,30),0,d));S.score[1]+=3;label='Field goal';ourX=35}
  else if(res==='TO'){yds=Math.round(R(0,d*.5));label=pick(['Interception','Fumble recovered']);ourX=10+(d-yds);if(Math.random()<.16){defTD=true;S.score[0]+=7;label=label==='Interception'?'Pick six!':'Scoop and score!'}}
  else if(res==='PUNT'){yds=Math.round(R(4,Math.max(5,Math.min(30,d-35))));const spot=d-yds-40;label='Punt';ourX=spot<=0?30:10+Math.max(3,spot)}
  else{yds=Math.round(R(5,Math.min(25,d)));label=S.q>=4?'Clock runs out':'End of half'}
  if(res==='TD'||res==='FG')sfx('groan');
  const plays=Math.max(3,Math.round(time/(25*S.qlen/180)));
  const lines=driveLines(d,res,yds,plays,label,defTD);simDriveLog(d,yds,plays,label,time,lines);
  showTicker({eye:`${S.away.city} possession${why?' · '+why:''}`,team:S.away,lines,res:label,good:res==='TO'||res==='PUNT'||res==='CLOCK',
    chips:[['Plays',plays],['Yards',yds],['Time',fmtClock(time)],['Started',spotLabel(10+d)]],from:d,to:d-yds,
    btn:endsHalf?(S.q>=4?'Final whistle':'Halftime'):defTD?'Kick off':'Take the field',
    next:()=>{if(endsHalf){if(S.q===2)return halftime();return endRegulation()}if(defTD)return afterScoreKickoff();startDrive(clamp(ourX,11,95))}});
}
function driveLines(d,res,yds,plays,label,defTD){
  const A=S.away,H=S.home,aq=starters(A,'QB')[0],ar=starters(A,'RB')[0],rcv=[...starters(A,'WR'),...starters(A,'TE')];
  const myD=[...starters(H,'DL'),...starters(H,'LB'),...starters(H,'CB'),...starters(H,'S')];const dl=starters(H,'DL'),db=[...starters(H,'CB'),...starters(H,'S')],lb=starters(H,'LB');
  const nm=p=>`#${p.num} ${p.last}`;
  /* simulated drives feed the opponent's box score so halftime and post-game stats are complete */
  const os=S.ostats,qs=ps({pl:aq,user:false}),rs=ps({pl:ar,user:false});
  const ost=(k,g,rc)=>{if(k==='sack')os.sacks++;else if(k==='inc'){os.att++;qs.pa++}else if(k==='run'){os.rushAtt++;os.rushYds+=g;rs.ra++;rs.ry+=g}
    else if(k==='comp'||k==='ptd'){os.att++;os.comp++;os.passYds+=g;qs.pa++;qs.pc++;qs.py+=g;const r=ps({pl:rc,user:false});r.rec++;r.recy+=g;if(k==='ptd'){os.passTD++;qs.ptd++;r.rectd++}}
    else if(k==='rtd'){os.rushAtt++;os.rushYds+=g;os.rushTD++;rs.ra++;rs.ry+=g;rs.rtd++}else if(k==='int'){os.att++;os.int++;qs.pa++;qs.int++}else if(k==='fum'){os.fum++;os.fumLost=(os.fumLost||0)+1}};
  os.plays+=plays;
  const out=[];let spot=d,down=1,togo=Math.min(10,d);
  const n=Math.max(1,plays-1);let finalGain=res==='TD'?Math.min(d,rint(1,Math.min(30,d))):0;let pool=Math.max(0,res==='TD'?d-finalGain:yds);
  const w=Array.from({length:n},()=>Math.random()**1.5+.05),sw=sum(w);const gains=w.map(x=>Math.round(pool*x/sw));gains[0]+=pool-sum(gains);
  for(let i=0;i<n-1;i++)if(Math.random()<.14){const k=rint(3,8);gains[i]-=k;gains[i+1]+=k}
  for(const g of gains){
    let t,cls='';const tk=pick(myD);
    if(g<0&&Math.random()<.7){ost('sack',g);const s=pick(dl);t=`SACK! ${nm(s)} drops ${aq.last} for a loss of ${-g}.`;cls='good';dx(s,'sck',1);dx(s,'xp',15)}
    else if(g<=0){if(Math.random()<.55){ost('inc');const c=pick(db);t=`${aq.last}'s pass is broken up by ${nm(c)}.`;cls='good';dx(c,'xp',5)}else{ost('run',g);const s=pick([...dl,...lb]);t=`${ar.last} stuffed by ${nm(s)}${g<0?' for a loss of '+(-g):''}.`;cls='good';dx(s,'tkl',1);dx(s,'xp',4)}}
    else if(Math.random()<.55){const rc=pick(rcv);ost('comp',g,rc);t=`${aq.last} to ${rc.last} for ${g}. ${g>=20?'Big play.':''} Tackle by ${nm(tk)}.`;if(g>=20)cls='bad';dx(tk,'tkl',1);dx(tk,'xp',3)}
    else{ost('run',g);t=`${ar.last} runs for ${g}. Tackle by ${nm(tk)}.`;if(g>=15)cls='bad';dx(tk,'tkl',1);dx(tk,'xp',3)}
    out.push({dd:`${ord(down)} & ${togo>=spot?'Goal':Math.max(1,Math.round(togo))} · ${spotLabel(10+spot)}`,t,cls});
    spot-=g;togo-=g;if(togo<=0){os.firstDowns++;down=1;togo=Math.min(10,Math.max(1,Math.round(spot)))}else{down++;if(down>3){out.push({dd:`4th & ${Math.max(1,Math.round(togo))} · ${spotLabel(10+spot)}`,t:`${pick([aq.last+' sneaks',ar.last+' bulls ahead'])} for the first down. They go for it and convert.`,cls:'bad'});down=1;togo=Math.min(10,Math.max(1,Math.round(spot)))}}
  }
  const ddT=`${ord(Math.min(4,down))} & ${Math.max(1,Math.round(togo))} · ${spotLabel(10+spot)}`;
  if(res==='TD'){const rc=pick(rcv),pt=Math.random()<.55;ost(pt?'ptd':'rtd',finalGain,rc);if(finalGain>=1)os.firstDowns++;out.push({dd:ddT,t:pt?`${aq.last} hits ${rc.last} for a ${finalGain}-yard TOUCHDOWN.`:`${ar.last} breaks free for a ${finalGain}-yard TOUCHDOWN.`,cls:'bad big'})}
  else if(res==='FG')out.push({dd:'4th down · '+spotLabel(10+spot),t:`Field goal from ${Math.round(spot+17)} yards is good.`,cls:'bad'});
  else if(res==='PUNT')out.push({dd:'4th down · '+spotLabel(10+spot),t:`${S.away.abbr} punts. Your defense gets off the field.`,cls:'good'});
  else if(res==='TO'){ost(label==='Interception'||label==='Pick six!'?'int':'fum');const c=pick(label.includes('ick')||label==='Interception'?db:[...lb,...dl]);dx(c,label.includes('ick')||label==='Interception'?'dint':'tkl',1);dx(c,'xp',defTD?40:25);out.push({dd:ddT,t:(label==='Interception'||label==='Pick six!')?`INTERCEPTED by ${nm(c)}!${defTD?' He takes it all the way back for a touchdown!':''}`:`FUMBLE! Recovered by ${nm(c)}!${defTD?' Scoop and score!':''}`,cls:'good big'})}
  else out.push({dd:'Clock',t:'They run out the clock.'});
  return out;
}
function showTicker(o){
  clearInterval(tickTimer);
  $('#card').hidden=false;['#call','#opt','#toBtn','#bulletBtn','#snapBar'].forEach(s=>$(s).hidden=true);hideActs();
  $('#dcEye').textContent=o.eye;$('#dcTeam').innerHTML=`${badge(o.team)}<b>${esc(teamName(o.team))}</b>`;
  const tk=$('#dcTicker');tk.innerHTML='';const res=$('#dcRes');res.hidden=true;res.textContent=o.res;res.style.setProperty('--c',o.good?S.home.c1:o.team.c1);
  $('#dcChips').innerHTML='';const tr=$('#dcTrack');tr.hidden=true;
  const scoreHTML=()=>`<div><small>${esc(S.home.abbr)}</small><strong>${S.score[0]}</strong></div><span class="mid">${S.ot?'OT':qName(S.q)+' · '+fmtClock(S.clock)}</span><div><small>${esc(S.away.abbr)}</small><strong>${S.score[1]}</strong></div>`;
  $('#dcScore').innerHTML=scoreHTML();
  let i=0,done=false;const btn=$('#dcGo');btn.textContent='Skip';
  const add=l=>{const e=document.createElement('div');e.className='tick '+(l.cls||'');e.innerHTML=`<span class="dd">${esc(l.dd)}</span><span>${esc(l.t)}</span>`;tk.appendChild(e);tk.scrollTop=tk.scrollHeight;if(l.cls&&l.cls.includes('big'))sfx(l.cls.includes('good')?'roar':'groan')};
  const finish=()=>{if(done)return;done=true;clearInterval(tickTimer);while(i<o.lines.length)add(o.lines[i++]);res.hidden=false;
    $('#dcChips').innerHTML=(o.chips||[]).map(([k,v])=>`<span><em>${esc(k)}</em>${esc(v)}</span>`).join('');
    if(o.from!=null){tr.hidden=false;const ez=tr.querySelectorAll('.ez');ez[0].style.background=S.home.c1;ez[1].style.background=S.away.c1;const f=tr.querySelector('.fill');f.style.setProperty('--c',o.team.c1);const pc=d=>6+clamp(d,0,100)*.88;f.style.left=pc(o.from)+'%';f.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{const a=pc(Math.max(0,o.to)),b=pc(o.from);f.style.left=a+'%';f.style.width=Math.max(0,b-a)+'%'}))}
    btn.textContent=o.btn;};
  cardNext=()=>{if(!done)return finish();$('#card').hidden=true;o.next&&o.next()};
  tickTimer=setInterval(()=>{if(S.paused)return;if(i<o.lines.length)add(o.lines[i++]);else finish()},420);
}
$('#dcGo').onclick=()=>{ac();cardNext&&cardNext()};

/* pause + sim to final */
$('#pauseBtn').onclick=()=>{if(['presnap','live','dead','pat','kick','wait','drive','replay'].includes(S.phase)){S.paused=true;$('#pausem').hidden=false}};
$('#resume').onclick=()=>{S.paused=false;$('#pausem').hidden=true};
$('#quitHub').onclick=()=>{S.paused=false;$('#pausem').hidden=true;clearInterval(tickTimer);if(typeof BC!=='undefined')BC.stop();if(LG.quick){LG=null;return showSlots()}if(!LG.live)snapshot();saveNow(true);showHub('home')};
$('#simRest').onclick=()=>{S.paused=false;$('#pausem').hidden=true;simToFinal()};
function simToFinal(){
  clearInterval(tickTimer);['#call','#opt','#kick','#card','#snapBar','#celebSheet'].forEach(s=>$(s).hidden=true);kick=null;hideActs();
  const f=1-progress(),m=(offOvr(S.home)-defOvr(S.away))-(offOvr(S.away)-defOvr(S.home));
  const pts=x=>{x=Math.max(0,x);const td=Math.max(0,Math.round(x/7*.85+R(-.5,.5)));return td*7+Math.max(0,Math.round((x-td*7)/3))*3};
  if(!S.ot){S.score[0]+=pts(f*(26+m*4)+R(-6,6));S.score[1]+=pts(f*(26-m*4)*S.diffMul+R(-6,6))}
  if(S.score[0]===S.score[1]){if(Math.random()<.5+m/10)S.score[0]+=pick([6,7,8]);else S.score[1]+=pick([6,7,8])}
  S.simmed=true;gameOver();
}
function slowMo(d){S.slowT=Math.max(S.slowT,d);S.ts=.32}
function hideActs(){const a=$('#actBar');if(a)a.hidden=true}
function showActs(){
  const a=$('#actBar');if(!a||!play)return;
  const userRunner=uOff()&&isRunner()&&play.carrier.user,userQB=uOff()&&!play.thrown&&play.type==='pass'&&!play.scramble;
  let html='';
  if(!uOff())html=`<button data-a="tackle" class="big">TACKLE</button><button data-a="switch">SWITCH</button>`;
  else if(userQB)html=`<button data-a="bullet" aria-pressed="${!!S.bullet}">BULLET</button><button data-a="lob" aria-pressed="${!!S.lob}">LOB</button><button data-a="scramble" class="big">RUN</button>`;
  else if(play.type==='run'&&!play.handed&&!play.caught)html='';
  if(uOff()&&(userRunner||play.type==='run')){html=`<button data-a="juke-1">JUKE ▲</button><button data-a="juke1">JUKE ▼</button><button data-a="spin">SPIN</button><button data-a="truck">TRUCK</button><button data-a="hurdle">HURDLE</button><button data-a="dive">DIVE</button>${play.pitchMan&&!play.pitched?'<button data-a="pitch" class="big">PITCH</button>':''}`}
  a.innerHTML=html;a.hidden=!html;
  a.querySelectorAll('[data-a]').forEach(b=>b.onpointerdown=e=>{e.preventDefault();e.stopPropagation();ac();const k=b.dataset.a;
    if(k==='bullet'||k==='lob'){if(k==='bullet'){S.bullet=!S.bullet;S.lob=false}else{S.lob=!S.lob;S.bullet=false}haptic('light');updateAim();showActs();return}
    if(k==='tackle')userTackle();else if(k==='switch')switchDefender();else if(k==='scramble'){if(play&&!play.thrown&&!play.scramble){play.scramble=true;play.scrT=play.t;if(!S.conv){tstat().rushAtt++;ps(Q).ra++}hideActs();showActs()}}
    else if(!isRunner()&&k!=='pitch')return;else if(k==='juke-1')doJuke(-1);else if(k==='juke1')doJuke(1);else if(k==='spin')doSpin();else if(k==='truck')doTruck();else if(k==='hurdle')doHurdle();else if(k==='dive')doDive();else if(k==='pitch'){doPitch();showActs()}});
}

/* ---------- post-game ---------- */
const ncaaRating=s=>s.att?((8.4*s.passYds)+(330*s.passTD)+(100*s.comp)-(200*s.int))/s.att:0;
function gameOver(){
  S.phase='over';hint('');clearInterval(tickTimer);hideActs();['#sb','#pauseBtn','#toBtn','#bulletBtn','#call','#opt','#kick','#card','#snapBar','#celebSheet','#celebBtn'].forEach(s=>$(s).hidden=true);
  if(typeof BC!=='undefined')BC.stop();
  const g=S.game,[us,them]=S.score,won=us>them,s=S.stats,os=S.ostats||newGameStats(),rate=ncaaRating(s),u=S.home,opp=S.away;
  const storm=won&&S.userHome&&rankOf(opp.id)&&rankOf(opp.id)<=10&&(!rankOf(u.id)||rankOf(u.id)>rankOf(opp.id)+5);
  if(S.userHome){g.hs=us;g.as=them}else{g.hs=them;g.as=us}
  settleInjuries();closeDrive();recordGame(LG,g);
  const info={us,them,won,pst:S.pst,dxp:S.dxp,stats:s,storm,simmed:false};
  const rep=processUserGame(LG,g,info);LG.live=null;
  if(typeof feedUserGame==='function')feedUserGame(LG,g,info,u,opp);
  finishWeek(LG);
  let pog=null,best=-1;for(const p of u.roster){const sc=gameXP(S.pst[p.id])+((S.dxp[p.id]&&S.dxp[p.id].xp)||0);if(sc>best){best=sc;pog=p}}
  if(pog)LG.lastUserPOG=pog.id;
  const DEP=[['Deep 20+',20,99],['Mid 10–19',10,20],['Short 0–9',0,10],['Behind',-99,0]],LAT=[['Left',0,FW/3],['Middle',FW/3,FW*2/3],['Right',FW*2/3,99]];const zones={};
  for(const p of s.passes){const di=DEP.findIndex(([,a,b])=>p.depth>=a&&p.depth<b),li=LAT.findIndex(([,a,b])=>p.y>=a&&p.y<b);const k=di+'-'+Math.max(0,li);(zones[k]=zones[k]||{a:0,c:0,y:0}).a++;if(p.res==='C'){zones[k].c++;zones[k].y+=p.yds}}
  const hc=v=>v<.5?`color-mix(in srgb,var(--hot) ${Math.round((1-v*2)*100)}%,#E6B33C)`:`color-mix(in srgb,var(--ok) ${Math.round((v-.5)*200)}%,#E6B33C)`;
  const heat=DEP.map(([lab],di)=>`<span class="lab">${lab}</span>${LAT.map((l,li)=>{const z=zones[di+'-'+li];if(!z)return `<div class="cell"><small>—</small></div>`;const v=z.c/z.a;return `<div class="cell" style="background:color-mix(in srgb,${hc(v)} ${Math.round(25+Math.min(1,z.a/4)*45)}%,transparent);color:#fff"><b>${z.c}/${z.a}</b><small>${Math.round(v*100)}% · ${z.y} yds</small></div>`}).join('')}${di===2?'<span></span><div class="losl"></div>':''}`).join('');
  const top=Object.entries(S.pst).map(([id,st])=>({p:u.roster.find(x=>x.id==id),st})).filter(x=>x.p);
  const tline=(lab,k,fmt)=>{const b=top.slice().sort((a,c)=>c.st[k]-a.st[k])[0];return b&&b.st[k]?`<div class="lrow"><span class="l"><span class="num">${b.p.pos}</span><span>${lab}: <b>${esc(fullName(b.p))}</b></span></span><span>${fmt(b.st)}</span></div>`:''};
  const dtop=Object.entries(S.dxp).map(([id,d])=>({p:u.roster.find(x=>x.id==id),d})).filter(x=>x.p&&(x.d.tkl||x.d.sck||x.d.dint)).sort((a,b)=>(b.d.tkl+b.d.sck*3+b.d.dint*4)-(a.d.tkl+a.d.sck*3+a.d.dint*4)).slice(0,4);
  const stam=OFF.filter(p=>p.user&&['QB','RB','WR','TE'].includes(p.role)).map(p=>{const v=stamina(p.pl,true)*condF(p.pl,true);return `<div class="stamrow"><span>${p.role} ${esc(p.pl.last)} <span class="ovr">${p.ovr}</span></span>${meterHTML(v*100,v>.85?'var(--ok)':v>.75?'var(--warn)':'var(--hot)')}<span>${Math.round(v*100)}%</span></div>`}).join('');
  const trophy=g.rival&&won&&u.trophy;
  $('#postBody').innerHTML=`
    ${storm?'<div class="storm">Fans storm the field!</div>':''}
    ${trophy?`<div class="card hero trophy"><div class="tro">🏆</div><div><div class="eyebrow">Rivalry trophy</div><div class="h2">${esc(u.trophy)} stays in ${esc(u.city)}</div><p class="note">The team hoists the trophy at midfield.</p></div></div>`:''}
    <div class="card hero"><div class="eyebrow">Final${S.ot?' · '+(S.otRound>1?S.otRound:'')+'OT':''}${g.tag?' · '+esc(g.tag):''}${S.simmed?' · simulated finish':''}</div>
      <div class="final"><div class="side">${badge(u,'lg')}<small>${esc(teamName(u))}</small><strong style="color:${u.c1}">${us}</strong></div><span class="eyebrow">–</span><div class="side">${badge(opp,'lg')}<small>${esc(teamName(opp))}</small><strong style="color:${opp.c1}">${them}</strong></div></div>
      <div class="result" style="color:${won?'var(--ok)':'var(--hot)'}">${won?'Victory':'Defeat'}</div>
      <div class="tags" style="justify-content:center"><span class="tag">+${rep.cc} CC</span><span class="tag ${rep.fan>=0?'ok':'hot'}">Fans ${rep.fan>=0?'+':''}${rep.fan}</span><span class="tag ${rep.mor>=0?'ok':'hot'}">Morale ${rep.mor>=0?'+':''}${rep.mor}</span>${g.rival&&won?`<span class="tag gold">${esc(u.trophy)} is yours</span>`:''}${(info.records||[]).map(r=>`<span class="tag gold">School record: ${esc(r)}</span>`).join('')}</div>
      ${pog?`<div class="lrow"><span class="l"><span class="tag gold">Player of the game</span><b>${esc(fullName(pog))}</b> · ${pog.pos}</span></div>`:''}</div>
    <div class="grid2"><div class="card"><div class="h2">Your offense</div><div class="kpis">
        <div><em>QB rating</em><b>${rate.toFixed(1)}</b></div><div><em>Comp / Att</em><b>${s.comp}/${s.att}</b></div><div><em>Pass yds</em><b>${s.passYds}</b></div>
        <div><em>TD / INT</em><b>${s.passTD}/${s.int}</b></div><div><em>Yds after catch</em><b>${s.yac}</b></div><div><em>Rush yds</em><b>${s.rushYds}</b></div>
        <div><em>Yds / carry</em><b>${s.rushAtt?(s.rushYds/s.rushAtt).toFixed(1):'0.0'}</b></div><div><em>Sacks taken</em><b>${s.sacks}</b></div><div><em>Fumbles</em><b>${s.fum}</b></div>
        <div><em>3rd down</em><b>${s.thirdC}/${s.thirdA}</b></div><div><em>Red zone TD</em><b>${s.rzTD}/${s.rzA}</b></div><div><em>Penalties</em><b>${s.pen}-${s.penYds}</b></div></div>
        <p class="note">QB rating uses the college passer-efficiency formula: about 130 is average and 160+ is elite.</p></div>
      <div class="card"><div class="h2">Completion heatmap</div><div class="heat"><span></span>${LAT.map(l=>`<span class="col">${l[0]}</span>`).join('')}${heat}</div><div class="legend">0%<i></i>100% completion · blue line is the line of scrimmage</div></div></div>
    <div class="grid2"><div class="card"><div class="h2">Top performers</div><div class="list">${tline('Passing','py',x=>`${x.pc}/${x.pa} · ${x.py} yds · ${x.ptd} TD`)}${tline('Rushing','ry',x=>`${x.ra} car · ${x.ry} yds`)}${tline('Receiving','recy',x=>`${x.rec} rec · ${x.recy} yds`)}
        ${dtop.map(x=>`<div class="lrow"><span class="l"><span class="num">${x.p.pos}</span><span>Defense: <b>${esc(fullName(x.p))}</b></span></span><span>${x.d.tkl||0} tkl${x.d.sck?' · '+x.d.sck+' sck':''}${x.d.dint?' · '+x.d.dint+' INT':''}</span></div>`).join('')}</div>
        ${os.plays?`<p class="note">Live defense vs ${esc(opp.abbr)}: ${os.comp}/${os.att} passing for ${os.passYds} yds, ${os.rushYds} rush yds on ${os.rushAtt} carries, ${os.int} INT, ${os.sacks} sacks.</p>`:''}</div>
      <div class="card"><div class="h2">Player development</div><div class="list">${rep.lev.slice(0,8).map(l=>`<div class="lrow"><span class="l"><span class="num">${l.pos}</span><span>${esc(l.name)}</span></span><span class="tag ok">${esc(l.attr)} up</span></div>`).join('')||'<p class="note">No upgrades this week. Players earn XP from playing time and production.</p>'}
        ${rep.inj.map(i=>`<div class="lrow"><span class="l"><span class="num">${i.pos}</span><span>${esc(i.name)}</span></span><span class="tag hot">${esc(i.why)} · ${i.wk} wk</span></div>`).join('')}</div></div></div>
    <div class="grid2">${playerGrades()}<div class="card"><div class="h2">Box score</div>${boxScoreHTML()}</div></div>
    ${driveChartHTML()}
    ${stam?`<div class="card"><div class="h2">Stamina at the final whistle</div><p class="note">Speed drops steadily through a game. Higher stamina means less drop-off; condition carries over week to week.</p>${stam}</div>`:''}
    <button class="btn wide" id="postGo">Continue</button>`;
  const show=()=>{$('#post').hidden=false;$('#post .scroll').scrollTop=0;if(won)sfx('roar');if(storm){for(let i=0;i<6;i++)setTimeout(()=>sfx('roar'),i*300)}};
  const fin=()=>{if((storm||trophy)&&!S.simmed&&typeof startStorm==='function'){startStorm(storm,trophy);setTimeout(show,storm?3600:2600)}else show()};
  if(!S.simmed&&typeof finalGraphic==='function'&&LG.settings.gfx!==false){finalGraphic(won,pog,g);setTimeout(fin,3000)}else fin();
  $('#postGo').onclick=()=>{S.simmed=false;S.stormT=0;if(LG.quick){LG=null;return showSlots()}showHub('home')};
  saveNow(true);
}
