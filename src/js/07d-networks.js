/* =========================================================
   07d · TV networks: four fictional broadcast packages, each with its own score bug (98-networks.css), and the
   postseason dress (bowl, playoff, title game, conference championship) that any of them can wear.
     GLN        Gridiron Live Network, the flagship: big games, primetime, the playoff and the title game
     PYLON      the national Saturday-afternoon window: ranked teams, major bowls, conference title games
     CHALK      the conference network: league games, the noon window, Group-of-Five title games
     hashmark+  streaming: FCS, FBS vs FCS and the small nonconference games
   netFor(g)    which network carries a game, deterministic from the matchup (both ranked or a rivalry → GLN),
                the time slot, the conferences (power or not) and the postseason tag, like a real TV contract.
                Settings › Broadcast › Scorebug (LG.settings.pkg) can force one package for every game.
   netEvent(g)  the postseason dress: 'title' | 'cfp' | 'bowl' | 'ccg' | ''
   netApply()   at kickoff: data-net / data-ev on <html>, the wordmark in the bug, the corner tag (wordmark, the
                conference and week from 07c sbTag, LIVE), the event tab
   sbFit()      mascot script (and the long names) shrink to fit their cell, never clip; reruns on resize, a new
                design or new teams (07c sbPlace calls it through BC.hud)
   Wordmarks are set in type (no artwork): GLN white tile + red dot, PYLON italic caps beside an orange goal-line
   pylon, CHALK spaced caps over a dashed chalk line, hashmark+ lowercase with a lime plus.
   ========================================================= */
const NETS={
  gln:{name:'GLN',full:'Gridiron Live Network',wm:'<b>GLN</b><i></i>'},
  pyl:{name:'PYLON',full:'PYLON',wm:'<i></i><b>PYLON</b>'},
  chk:{name:'CHALK',full:'CHALK Network',wm:'<b>CHALK</b><i></i>'},
  hm:{name:'hashmark+',full:'hashmark+',wm:'<b>hashmark</b><i>+</i>'}
};
const NET_IDS=['gln','pyl','chk','hm'];
const NET_OLD={national:'gln',regional:'chk',stream:'hm'};   // the old three "broadcast packages" in saves
const netWM=(id,cls)=>{const n=NETS[id]||NETS.gln;return `<span class="nwm nw-${NETS[id]?id:'gln'}${cls?' '+cls:''}" role="img" aria-label="${esc(n.name)}">${n.wm}</span>`};
function netForced(){const s=typeof LG!=='undefined'&&LG&&LG.settings?LG.settings.pkg:null,v=NET_OLD[s]||s;return NETS[v]?v:null}
function netEvent(g){
  if(!g)return '';const t=String(g.tag||'');
  if((g.cfp||g.fcsp)&&/national championship/i.test(t))return 'title';
  if(g.cfp||g.fcsp||/^(CFP|FCS Playoffs)/i.test(t))return 'cfp';
  if(g.bowl||(g.post&&/\bbowl\b|classic$/i.test(t)))return 'bowl';
  if(g.ccg||(g.post&&/championship$/i.test(t)))return 'ccg';
  return '';
}
/* the strip over the bug: [kicker, label] */
function netEvLabel(g,ev){
  const t=String((g&&g.tag)||'');
  if(ev==='title')return [/^FCS/i.test(t)?'FCS':'CFP','National Championship'];
  if(ev==='cfp'){if(/^FCS/i.test(t))return ['FCS Playoffs',t.replace(/^FCS Playoffs\s*·\s*/i,'').replace(/\s*·\s*#\d+ seed$/i,'')];
    return ['CFP',t.replace(/^CFP\s*/i,'').replace(/\s*·\s*#\d+\s*vs\s*#\d+$/i,'')]}
  if(ev==='bowl')return ['Bowl season',t||'Bowl game'];
  if(ev==='ccg')return ['Title game',t];
  return ['',''];
}
function netP4(L){if(netP4.L!==L||netP4.s0!==L.season){netP4.L=L;netP4.s0=L.season;try{netP4.s=p4Set(L)}catch(e){netP4.s=new Set()}}return netP4.s}
function netFor(g,L){
  L=L||(typeof LG!=='undefined'?LG:null);const f=netForced();if(f)return f;
  if(!g||!L||!L.teams)return 'gln';const H=L.teams[g.h],A=L.teams[g.a];if(!H||!A)return 'gln';
  const ev=netEvent(g),tag=String(g.tag||''),hs=(((g.h+1)*2654435761)^((g.a+1)*40503)^((L.season||0)*97))>>>0;
  const rk=t=>{try{const i=rankList(L,t).indexOf(t.id);return i>=0&&i<25?i+1:0}catch(e){return 0}};
  const rH=rk(H),rA=rk(A),fH=isFCS(H),fA=isFCS(A),p=netP4(L),pw=t=>p.has(t.conf)||(typeof isND==='function'&&isND(L,t));
  if(ev==='title')return fH?'pyl':'gln';
  if(ev==='cfp')return g.fcsp||fH?(/semifinal/i.test(tag)?'pyl':'hm'):'gln';
  if(ev==='bowl'){if(fH||fA)return 'pyl';if(rH&&rA)return 'gln';if(rH||rA||(pw(H)&&pw(A)))return hs%3?'pyl':'gln';return hs%2?'chk':'hm'}
  if(ev==='ccg'){if(fH)return 'hm';return pw(H)?(rH&&rA&&rH+rA<=12?'gln':'pyl'):'chk'}
  if(fH&&fA)return 'hm';
  if(fH||fA)return (rH||rA)&&g.slot!=='Noon'?'chk':'hm';   // an FBS team's buy game: streaming, unless a ranked team draws the conference network
  const slot=g.slot||'Afternoon',conf=H.conf===A.conf&&!g.nc&&!isInd(L,H);
  if((rH&&rA)||(g.rival&&(pw(H)||pw(A)||rH||rA)))return 'gln';   // both ranked or a rivalry: the flagship
  if(slot==='Primetime'&&(rH||rA||(pw(H)&&pw(A))))return 'gln';
  if(rH||rA)return slot==='Noon'&&conf?'chk':'pyl';
  if(pw(H)&&pw(A))return conf?(slot==='Afternoon'&&hs%3===0?'pyl':'chk'):'pyl';
  if(pw(H)||pw(A))return hs%2?'chk':'hm';
  return conf&&hs%3===0?'chk':'hm';
}
/* mascot colours: the secondary colour where it reads on the team colour, else the colour's own ink; on a light
   card the darker of the two; on dark glass the brighter one */
function msCols(t){
  const c1=t.c1||'#59636f',c2=t.c2||'#FFFFFF',l1=lum(c1),l2=lum(c2),ok=Math.abs(l1-l2)>=.26;
  const onC=ok?c2:(l1>.55?'#0B0E14':'#FFFFFF');
  const onL=l1<.5?c1:l2<.5?c2:'#14161A';
  const onD=l2>.3&&l2>l1?c2:l1>.22?c1:l2>.22?c2:'#ECE9E2';
  const sh=!ok&&l2<l1&&l2<.2?c2:'rgba(0,0,0,.6)';   // white script on the team colour: the dark secondary becomes its drop shadow
  return [onC,onL,onD,sh];
}
function netApply(){
  const g=(typeof S!=='undefined'&&S.game)||null,id=netFor(g),ev=netEvent(g),r=document.documentElement;
  r.dataset.net=id;r.dataset.pkg=id;if(ev)r.dataset.ev=ev;else delete r.dataset.ev;
  const n=$('#sbNet');if(n)n.innerHTML=netWM(id);
  const wm=$('#wm');if(wm)wm.innerHTML=netWM(id,'sm')+'<i class="wk"></i><b>LIVE</b>';
  const e=$('#sbEv');if(e){const [k,l]=netEvLabel(g,ev);e.hidden=!ev;e.innerHTML=ev?`<i class="ek">${esc(k)}</i><b class="el">${esc(l)}</b>`:''}
  try{if(typeof sbTag==='function')sbTag()}catch(e){}   // the conference and week ride in the corner tag
  sbFit.k='';
  return id;
}
/* mascot and long-name fit: measured at the design's own size, then scaled down (55% floor; past that the cell's
   font shrinks with transform so nothing is ever cut) */
function sbFit(force){
  const sb=$('#sb');if(!sb||sb.hidden)return;const R=document.documentElement;
  const k=[innerWidth,innerHeight,R.dataset.net,R.dataset.ev||'',R.dataset.bugsize,R.dataset.bug,S.home&&S.home.abbr,S.away&&S.away.abbr].join('|');
  if(!force&&sbFit.k===k)return;sbFit.k=k;
  sb.querySelectorAll('.ms,.sb-ev .el').forEach(e=>{e.style.removeProperty('--fk');e.style.removeProperty('--fx')});
  sb.querySelectorAll('.ab').forEach(e=>{e.style.fontSize=''});
  sb.querySelectorAll('.ab').forEach(e=>sbFitFont(e,.6));
  sb.querySelectorAll('.ms,.sb-ev .el').forEach(e=>{
    const w=e.clientWidth,n=e.scrollWidth;if(!(w>0)||n<=w+.5)return;let f=(w-1)/n;
    if(f>=.55){e.style.setProperty('--fk',f.toFixed(3));return}
    e.style.setProperty('--fk','.55');e.style.setProperty('--fx',Math.max(.4,f/.55).toFixed(3));
  });
}
/* one element's font scaled down until its text fits its box (the touchdown mascot, long abbreviations) */
function sbFitFont(e,floor){if(!e)return;e.style.fontSize='';const w=e.clientWidth,n=e.scrollWidth;if(w>0&&n>w+.5)e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*Math.max(floor||.5,(w-1)/n)).toFixed(1)+'px'}
try{if(document.fonts&&document.fonts.load)Promise.all(['20px "Kaushan Script"','20px "Graduate"'].map(f=>document.fonts.load(f))).then(()=>{sbFit.k=''}).catch(()=>{})}catch(e){}
