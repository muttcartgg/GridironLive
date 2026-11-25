/* =========================================================
   07c · Score bug: the TV scoreboard bar (markup index.html #sb, styles 96-scorebug.css).
   sbPlace    landscape → bottom centre (Settings › Score bug in landscape: Bottom | Top); portrait → top, always
   sbMeasure  the bug's footprint for everything that stacks against it: --sbB (its bottom edge, top mode) and
              --sbT (viewport bottom → its top edge, bottom mode); the 3D camera reads the rect itself (08t-view)
   sbTag      the game tag on the far left: conference in text (or CFP / FCS / bowl) over the week
   sbScore    the score flip (old number turns away, new one turns in) with a flash of the team colour
   SBUG       takeovers inside the bar, each 150-250 ms in, ease-out: msg (over the state + down modules),
              td (team-colour wipe across the bar with the logo), flag (yellow slide-out with the foul)
   ========================================================= */
function sbPlace(){
  const r=document.documentElement,port=innerHeight>innerWidth,pos=typeof LG!=='undefined'&&LG&&LG.settings?LG.settings.bugPos:null;
  const v=port||pos==='top'?'top':'bottom';if(r.dataset.bug!==v){r.dataset.bug=v;sbMeasure.b=sbMeasure.t=null}return v}
function sbMeasure(){
  const sb=$('#sb');if(!sb||sb.hidden)return;const r=sb.getBoundingClientRect();if(!r.height)return;const R=document.documentElement.style;
  const b=Math.round(r.bottom),t=Math.round(innerHeight-r.top);
  if(b!==sbMeasure.b){sbMeasure.b=b;R.setProperty('--sbB',b+'px')}
  if(t!==sbMeasure.t){sbMeasure.t=t;R.setProperty('--sbT',t+'px')}
}
const SB_CONF={'SEC':'SEC','Big Ten':'Big Ten','Big 12':'Big 12','ACC':'ACC','American':'AAC','Sun Belt':'Sun Belt','Pac-12':'Pac-12','Mountain West':'MWC','Conference USA':'C-USA','MAC':'MAC',
  'FBS Independents':'Ind','Big Sky':'Big Sky','CAA':'CAA','Patriot':'Patriot','Ivy League':'Ivy','Missouri Valley':'MVFC','Southern':'SoCon','Southland':'SLC','Ohio Valley':'OVC',
  'United Athletic':'UAC','Pioneer':'PFL','Northeast':'NEC','MEAC':'MEAC','SWAC':'SWAC','FCS Independents':'Ind'};
const sbConf=c=>{const n=confName(c);return SB_CONF[n]||(n.length<=9?n:n.split(/\s+/).map(w=>w[0]).join(''))};
function sbTagText(){
  const g=S.game||{},tag=String(g.tag||''),rd=s=>/national championship|final$/i.test(s)?'Title':/semifinal/i.test(s)?'Semis':/quarterfinal/i.test(s)?'Quarters':/second round/i.test(s)?'Rd 2':/first round/i.test(s)?'Rd 1':'';
  if(/^CFP/i.test(tag)||/national championship/i.test(tag))return ['CFP',rd(tag)];
  if(/^FCS Playoffs/i.test(tag))return ['FCS',rd(tag)];
  if(/championship$/i.test(tag)&&S.home)return [sbConf(S.home.conf),'Title'];
  if(g.post||/bowl/i.test(tag))return ['Bowl',''];
  const wk=typeof LG!=='undefined'&&LG&&LG.phase!=='offseason'?'Wk '+(LG.week+1):'';
  let conf='';try{conf=S.home&&S.away&&g.h!=null&&isConfGame(g)?sbConf(T(g.h).conf):''}catch(e){conf=''}
  return conf?[conf,wk]:[wk||'Live',''];
}
/* ordinals as smaller caps on the baseline (2ND, 4TH & 2): escaped text with the suffix wrapped in .o (96-scorebug) */
const sbOrd=s=>esc(s).replace(/(\d)(st|nd|rd|th)\b/gi,'$1<small class="o">$2</small>');
/* set markup only when it changed (hud runs every frame); true when it did */
function sbSet(el,h){if(!el||el._h===h)return false;el._h=h;el.innerHTML=h;return true}
function sbTag(){const el=$('#sbTag');if(!el)return;const [a,b]=sbTagText();el.querySelector(':scope>b').textContent=a;el.querySelector(':scope>small').textContent=b}
/* score cell: flip on a new score (anim), else just set it. Under the touchdown wipe the old number stays and flips
   when the wipe leaves. */
function sbScore(el,v,anim){
  const sc=el.querySelector('.sc');if(sc.dataset.v===String(v))return;const first=sc.dataset.v==null;sc.dataset.v=v;sc.classList.toggle('w3',String(v).length>2);
  if(first||!anim||document.hidden){sc.innerHTML=`<span class="sv">${v}</span>`;return}
  if(SBUG.tdOn){SBUG.pend.add(el);return}
  sbFlip(el,v);
}
function sbFlip(el,v){
  const sc=el.querySelector('.sc');sc.querySelectorAll('.sv.out').forEach(x=>x.remove());
  const old=sc.querySelector('.sv');if(old){old.className='sv out';setTimeout(()=>old.remove(),140)}
  const n=document.createElement('span');n.className='sv in';n.textContent=v;sc.appendChild(n);setTimeout(()=>n.classList.remove('in'),280);
  el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');clearTimeout(el._ft);el._ft=setTimeout(()=>el.classList.remove('flash'),520);
}
const sbTile=t=>t===S.home?$('#tmH'):$('#tmA');
const SBUG={
  tdOn:false,pend:new Set(),
  on(){return typeof LG!=='undefined'&&LG&&LG.settings.gfx!==false&&!$('#sb').hidden},
  /* the state + down modules give way to a message: o.dd = the down module only, o.team = logo on the right */
  msg(title,sub,bg,ms,o){
    if(!this.on())return;o=o||{};const el=$('#sbMsg');clearTimeout(this.mT);clearTimeout(this.mT2);
    const ink=String(bg||'').startsWith('#')?inkOn(bg):'#fff';
    el.className='sb-msg'+(o.dd?' dd':'')+(String(title).length>14?' long':'');el.style.setProperty('--mc',bg||'#24262B');el.style.setProperty('--mk',ink);
    el.innerHTML=`<b>${sbOrd(title)}</b>${sub?`<small>${esc(sub)}</small>`:''}${o.team&&!o.dd?tvLogo(o.team,'xs'):''}`;
    void el.offsetWidth;el.classList.add('on');
    this.mT=setTimeout(()=>{el.classList.remove('on');el.classList.add('off');this.mT2=setTimeout(()=>{el.className='sb-msg'+(o.dd?' dd':'')},180)},ms||2200);
  },
  /* touchdown: the scoring team's colour wipes across the bar with its logo, then the new score flips in */
  td(t,sub,pts){
    if(!this.on()||!t)return;const el=$('#sbTD');clearTimeout(this.tT);clearTimeout(this.tT2);
    el.className='sb-td';el.style.setProperty('--c',t.c1);el.style.setProperty('--c2',t.c2||'#fff');el.style.setProperty('--k',inkOn(t.c1));el.style.setProperty('--msc',msCols(t)[0]);
    el.innerHTML=`${tvLogo(t,'')}<span class="tt"><b>Touchdown</b><small>${esc(sub||t.city+' '+t.name)}</small></span><em class="tms">${esc(t.name||'')}</em>${pts?`<span class="pts">${esc(pts)}</span>`:''}`;
    void el.offsetWidth;sbFitFont(el.querySelector('.tms'),.5);el.classList.add('on');this.tdOn=true;this.pend.add(sbTile(t));
    this.tT=setTimeout(()=>{el.classList.remove('on');el.classList.add('off');
      this.tT2=setTimeout(()=>{el.className='sb-td';this.tdOn=false;this.pend.forEach(x=>sbFlip(x,+x.querySelector('.sc').dataset.v));this.pend.clear()},210)},2500);
  },
  /* a yellow flag slides out of the bar's inner edge with the foul */
  flag(m){
    if(!this.on())return false;const el=$('#sbTab'),parts=String(m).split(' · ');clearTimeout(this.fT);
    el.innerHTML=`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 15V1.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3.8 2h9.4l-2.3 3.4 2.3 3.4H3.8z" fill="currentColor"/></svg><b>Flag</b><span>${esc(parts.join(' · '))}</span>`;
    el.hidden=false;el.classList.remove('in');void el.offsetWidth;el.classList.add('in');sbMeasure();
    this.fT=setTimeout(()=>{el.hidden=true;el.classList.remove('in');sbMeasure()},3600);return true;
  },
  clear(){clearTimeout(this.mT);clearTimeout(this.mT2);clearTimeout(this.tT);clearTimeout(this.tT2);clearTimeout(this.fT);
    $('#sbMsg').className='sb-msg';$('#sbTD').className='sb-td';this.tdOn=false;this.pend.forEach(x=>{const sc=x.querySelector('.sc');sc.innerHTML=`<span class="sv">${sc.dataset.v}</span>`});this.pend.clear();const f=$('#sbTab');f.hidden=true;f.classList.remove('in');sbMeasure()},
  /* QA: every takeover on demand (tools/qa and the capture scripts) */
  demo(k,a){
    const u=S.home,o=S.away,off=typeof offT==='function'?offT():u,def=typeof defT==='function'?defT():o;
    if(k==='score'){S.score[0]+=3;hud();return}
    if(k==='td'){S.score[0]+=6;this.td(u,'',' +6');hud();return}
    if(k==='first'){BC.firstDown({team:off,x:S.los+12});return}
    if(k==='flag'){this.flag(a||'Holding · Offense · 10 yards');return}
    if(k==='timeout'){S.to[0]=Math.max(0,S.to[0]-1);hud();BC.say('timeout',{t:u});return}
    if(k==='twomin'){S.q=4;S.clock=118;hud();BC.twoMin();return}
    if(k==='endq'){BC.quarterCard(2);return}
    if(k==='turnover'){S.poss=S.poss==='home'?'away':'home';hud();banner('Interception!',def.c1);return}
    if(k==='review'){this.review('Touchdown · did the ball break the plane?');setTimeout(()=>this.review(null,'Confirmed','Touchdown'),900);return}
  },
  review(what,call,res){if(what)this.msg('Replay review',what,'#2B3A5C',4000);else this.msg(call==='Overturned'?'Call overturned':call==='Confirmed'?'Call confirmed':'Ruling stands',res||'','#2B3A5C',1800)}
};
