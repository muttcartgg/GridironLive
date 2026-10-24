/* =========================================================
   07 · Synthesized audio + broadcast HUD
   Audio is all synth (Web Audio): one looping crowd bed whose level follows BC.hype, plus one-shot
   effects. Everything respects `muted`. The score bug (#sb) is filled by hud() ten times a second.
   ========================================================= */
let AC=null,muted=false,NB=null,CB=null,AMB=null,hornAt=0;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();const n=AC.sampleRate*2;NB=AC.createBuffer(1,n,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1}catch(e){AC=null}}if(AC&&AC.state==='suspended')AC.resume()}
function noise(dur,freq,q,gain,type,delay){const t=AC.currentTime+(delay||0),s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NB;f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+Math.min(.25,dur*.2));g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(AC.destination);s.start(t);s.stop(t+dur+.05)}
function tone(f,t0,d,type,g){const o=AC.createOscillator(),gn=AC.createGain();o.type=type||'square';o.frequency.value=f;const t=AC.currentTime+t0;gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g||.05,t+.02);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn).connect(AC.destination);o.start(t);o.stop(t+d+.02)}
/* pitched hit with a downward sweep (toms, bass drum, pad thump) */
function drop(f0,f1,t0,d,g,type){const o=AC.createOscillator(),gn=AC.createGain(),t=AC.currentTime+t0;o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+d*.8);gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g,t+.006);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn).connect(AC.destination);o.start(t);o.stop(t+d+.02)}
function sfx(k){if(!AC||muted)return;try{const t=AC.currentTime;
  if(k==='whistle'){/* pea whistle: two close partials, fast trill, breath noise, short and bright */
    const o=AC.createOscillator(),o2=AC.createOscillator(),tr=AC.createGain(),am=AC.createOscillator(),amg=AC.createGain(),g=AC.createGain();
    o.frequency.setValueAtTime(3180,t);o.frequency.linearRampToValueAtTime(3060,t+.34);o2.frequency.setValueAtTime(3290,t);o2.frequency.linearRampToValueAtTime(3170,t+.34);
    tr.gain.value=.55;am.frequency.value=46;amg.gain.value=.45;am.connect(amg).connect(tr.gain);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.008);g.gain.setValueAtTime(.055,t+.3);g.gain.exponentialRampToValueAtTime(.0001,t+.37);
    o.connect(tr);o2.connect(tr);tr.connect(g).connect(AC.destination);[o,o2,am].forEach(x=>{x.start(t);x.stop(t+.4)});noise(.34,3600,4,.025,'bandpass')}
  else if(k==='hike')noise(.12,900,1.5,.25);else if(k==='thump')noise(.18,180,1,.5,'lowpass');else if(k==='zip')noise(.15,2400,2,.2);else if(k==='cut')noise(.08,1400,2,.12);
  else if(k==='hit'){drop(118,36,0,.34,.42);noise(.07,1300,1.2,.16);noise(.16,240,1,.3,'lowpass')}
  else if(k==='roar'){noise(2.8,650,.5,.3);noise(2.4,1500,.8,.12,'bandpass',.05);if(typeof BC!=='undefined')BC.hype=Math.min(1,BC.hype+.25)}
  else if(k==='groan')noise(1.2,350,.8,.18);
  else if(k==='tap'){tone(1200,0,.03,'sine',.02)}
  else if(k==='fight'){const d0=performance.now()-hornAt<900?1.5:0;const n=[392,523,659,784,659,784,880,784];n.forEach((f,i)=>{tone(f,d0+.15+i*.14,.13,'square',.03);tone(f/2,d0+.15+i*.14,.13,'triangle',.03)})}
}catch(e){}}
/* stadium horn: detuned sawtooth chord through an opening low-pass */
function stadHorn(){if(!AC||muted)return;try{hornAt=performance.now();const t=AC.currentTime+.03,lp=AC.createBiquadFilter(),g=AC.createGain();lp.type='lowpass';lp.Q.value=1.2;lp.frequency.setValueAtTime(300,t);lp.frequency.linearRampToValueAtTime(1500,t+.22);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.075,t+.1);g.gain.setValueAtTime(.075,t+1.25);g.gain.exponentialRampToValueAtTime(.0001,t+1.85);lp.connect(g).connect(AC.destination);
  [110,138.6,164.8,110.6].forEach((f,i)=>{const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=(i-1.5)*7;o.connect(lp);o.start(t);o.stop(t+1.9)})}catch(e){}}
/* drumline cadence (original pattern): snare, tenors, bass; 16th notes at ~116 bpm. full = two bars + a unison hit */
function drumline(full){if(!AC||muted)return;try{
  const st=60/116/4,S='x.xxx.x.x.xxx.x.x.xxx.x.xxxxxxxx',Tn='....x..x....x.......x..x..x.x...',B='x.......x..x....x.......x.x.....',n=full?32:16,tt=[330,270,215];let ti=0;
  for(let i=0;i<n;i++){const t0=.05+i*st;
    if(S[i]==='x'){const acc=i%4===0?1:.65;noise(.09,1900,.8,.13*acc,'bandpass',t0);tone(190,t0,.06,'triangle',.04*acc)}
    if(Tn[i]==='x'){const f=tt[ti++%3];drop(f,f*.78,t0,.14,.09,'sine')}
    if(B[i]==='x')drop(72,44,t0,.24,.22)}
  if(full){const t0=.05+n*st;drop(72,40,t0,.4,.28);noise(.25,1900,.7,.15,'bandpass',t0);drop(270,200,t0,.2,.1);noise(.6,6000,.6,.04,'highpass',t0)}
}catch(e){}}
/* crowd bed: 5 s of noise with a slow built-in murmur, looped, band-passed; level and brightness follow the crowd */
function ambStart(){if(!AC||AMB)return;try{
  if(!CB){const sr=AC.sampleRate,n=sr*5;CB=AC.createBuffer(1,n,sr);const d=CB.getChannelData(0);const ph=[0,0,0].map(()=>Math.random()*6.28);let b=0;
    for(let i=0;i<n;i++){const x=i/sr,env=.72+.14*Math.sin(x*2*Math.PI*.4+ph[0])+.09*Math.sin(x*2*Math.PI*1.2+ph[1])+.05*Math.sin(x*2*Math.PI*3.4+ph[2]);b=b*.6+(Math.random()*2-1)*.4;d[i]=b*env}
    const f=Math.floor(sr*.25);for(let i=0;i<f;i++){const k=i/f;d[n-f+i]=d[n-f+i]*(1-k)+d[i]*k}}
  const s=AC.createBufferSource(),bp=AC.createBiquadFilter(),g=AC.createGain();s.buffer=CB;s.loop=true;bp.type='bandpass';bp.frequency.value=600;bp.Q.value=.45;g.gain.value=.0001;
  s.connect(bp).connect(g).connect(AC.destination);s.start();AMB={s,bp,g,lv:-1}}catch(e){AMB=null}}
function ambSet(level){if(!AMB||!AC)return;const v=muted?.0001:Math.max(.0001,level);if(Math.abs(v-AMB.lv)<.002)return;AMB.lv=v;try{const t=AC.currentTime;AMB.g.gain.setTargetAtTime(v,t,.5);AMB.bp.frequency.setTargetAtTime(480+Math.min(1,level*8)*900,t,.7)}catch(e){}}
function ambStop(){if(!AMB)return;const a=AMB;AMB=null;try{a.g.gain.setTargetAtTime(.0001,AC.currentTime,.25);setTimeout(()=>{try{a.s.stop()}catch(e){}},1500)}catch(e){}}

let toastT=null,lastScore=[0,0],bannerAt=0,hintT=null;const hintSeen={};
function toast(m){if(m==='First down'&&typeof BC!=='undefined'&&LG&&LG.settings.gfx!==false&&S.phase!=='hub')return;const t=$('#toast');t.textContent=m;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1700)}
/* big-moment graphics: the engine calls banner(text,color,sub); the kind is read from the text */
function bannerKind(m){const s=String(m).toLowerCase();
  if(/two-point good/.test(s))return 'two';if(/touchdown|pick six/.test(s))return 'td';if(/^safety/.test(s))return 'safety';
  if(/intercept/.test(s))return 'int';if(/fumble · turnover/.test(s))return 'fum';if(/turnover on downs/.test(s))return 'downs';
  if(/no good/.test(s))return 'miss';if(/it's good/.test(s))return typeof kick!=='undefined'&&kick&&kick.kind==='xp'?'xp':'fg';if(/field goal/.test(s))return 'fg';return 'gen'}
function bannerTeam(c){if(!S.home)return null;if(c===S.home.c1)return S.home;if(c===S.away.c1)return S.away;return null}
function banner(m,c,sub){
  const b=$('#banner'),k=S&&S.home?bannerKind(m):'gen';let t=k==='gen'?null:bannerTeam(c);
  if(k==='downs')t=typeof defT==='function'?defT():null;
  if(k==='xp'&&typeof BC!=='undefined'&&LG.settings.gfx!==false){BC.chip('EXTRA POINT GOOD',c,`${S.home.abbr} ${S.score[0]+1} · ${S.away.abbr} ${S.score[1]}`);return}
  const kicker={td:/pick six/i.test(m)?'Touchdown':t?t.city:'',two:'Conversion',safety:'Defense scores',int:'Turnover',fum:'Turnover',downs:'Turnover',fg:"It's good",miss:typeof kick!=='undefined'&&kick&&kick.kind==='xp'?'Extra point':'Field goal'}[k]||'';
  const title={td:/pick six/i.test(m)?'Pick six':'Touchdown',two:'Two-point good',safety:'Safety',int:'Interception',fum:'Fumble',downs:'On downs',fg:'Field goal',miss:'No good'}[k]||String(m).replace(/!$/,'');
  let su=sub||'';if(!su){const dm=String(m).match(/(\d+)[- ]yd/);if(k==='fg'||k==='miss')su=dm?dm[1]+' yards':typeof kick!=='undefined'&&kick&&kick.dist?Math.round(kick.dist)+' yards':'';else if(/kick return/i.test(m))su='Kick return';else if(k==='fum'||k==='downs'||k==='int')su=t?t.abbr+' ball':''}
  const pts={td:'+6',two:'+2',safety:'+2',fg:'+3'}[k]||'';
  const col=k==='miss'?'#2A313C':c||'#2A313C';
  b.className='k-'+k;b.style.setProperty('--bc',col);b.style.setProperty('--btc',k==='miss'?'#fff':String(col).startsWith('#')?inkOn(col):'#fff');if(t){b.style.setProperty('--b2',t.c2||'#fff')}else b.style.removeProperty('--b2');
  b.querySelector('.bl').innerHTML=k==='miss'?'<i class="x">✕</i>':t?tvLogo(t,'b'):'';b.querySelector('.bl').hidden=!t&&k!=='miss';
  b.querySelector('.ki').textContent=kicker;b.querySelector('.ki').hidden=!kicker;b.querySelector('.ti').textContent=title;
  b.querySelector('.su').textContent=su;b.querySelector('.su').hidden=!su;const p=b.querySelector('.pt');p.textContent=pts;p.hidden=!pts;
  b.classList.remove('on');void b.offsetWidth;b.classList.add('on');bannerAt=performance.now();clearTimeout(banner.t);banner.t=setTimeout(()=>b.classList.remove('on'),k==='td'||k==='two'?2700:2300);
}
/* hints: short tips that fade; the same tip is shown at most four times per session */
function hint(m){const h=$('#hint');clearTimeout(hintT);if(!m){h.classList.remove('on');hintT=setTimeout(()=>{h.hidden=true},260);return}
  const parts=String(m).split(' · ');let s=parts[0];if(parts[1]&&(s+' · '+parts[1]).length<=46)s+=' · '+parts[1];
  hintSeen[s]=(hintSeen[s]||0)+1;if(hintSeen[s]>4&&!/Get set/.test(s)){h.classList.remove('on');h.hidden=true;return}
  h.textContent=s;h.hidden=false;h.classList.remove('on');void h.offsetWidth;h.classList.add('on');hintT=setTimeout(()=>h.classList.remove('on'),3400)}
const ord=n=>['1st','2nd','3rd','4th'][n-1]||n+'th';
function spotLabelFor(x,side){const yd=Math.round(x-10);if(yd===50)return '50';const own=side==='away'?S.away:S.home,oth=side==='away'?S.home:S.away;return yd<50?`${own.abbr} ${Math.max(1,yd)}`:`${oth.abbr} ${Math.max(1,100-yd)}`}
function spotLabel(x){return spotLabelFor(x,S.poss)}
function ddText(){if(S.conv)return '2-pt try';const g=S.firstDownX>=110;return `${ord(S.down)} & ${g?'Goal':Math.max(1,Math.round(S.firstDownX-S.los))}`}
function fmtClock(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
const qName=q=>q>4?'OT':['1ST','2ND','3RD','4TH'][q-1];
/* team mark for broadcast graphics: imported logo when there is one, else a monogram chip in team colors */
/* a team color that reads on dark glass (black or navy primaries fall back to the secondary color) */
const tvCol=t=>{const c=t.c1||'#59636f';if(lum(c)>=.07)return c;return t.c2&&lum(t.c2)>lum(c)+.1?t.c2:'#8D99A9'};
function monoOf(t){const w=String(t.city||t.abbr||'?').replace(/[^A-Za-z&\s]/g,' ').split(/\s+/).filter(x=>x&&!/^(of|the|at)$/i.test(x));return (w.length>1?w[0][0]+w[1][0]:(w[0]||t.abbr||'?').slice(0,1)).toUpperCase()}
function tvLogo(t,cls){const u=typeof teamLogoURL==='function'?teamLogoURL(t,true):'';return `<span class="tvl ${cls||''}${u?' hl':''}" style="--c:${t.c1};--c2:${t.c2||'#fff'};--k:${inkOn(t.c1)}"><i>${esc(monoOf(t))}</i>${u?`<img src="${esc(u)}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`:''}</span>`}
function hud(){
  if(!S.home)return;const h=$('#tmH'),a=$('#tmA'),sb=$('#sb');
  sb.classList.toggle('uv',!S.userHome&&!S.neutral);
  [[h,S.home],[a,S.away]].forEach(([el,t])=>{if(el.dataset.t!==t.abbr+t.c1){el.dataset.t=t.abbr+t.c1;el.style.setProperty('--c',t.c1);el.style.setProperty('--c2',t.c2||'#fff');el.style.setProperty('--k',inkOn(t.c1));el.querySelector('.mono').textContent=monoOf(t);el.querySelector('.ab').textContent=t.abbr}});
  if(typeof teamLogoURL==='function')[[h,S.home],[a,S.away]].forEach(([el,t])=>{const im=el.querySelector('.lg');if(!im)return;const u=teamLogoURL(t,true);if(im.dataset.u!==u){im.dataset.u=u;if(u){im.hidden=false;im.src=u}else{im.hidden=true;im.removeAttribute('src')}}el.classList.toggle('haslg',!!u&&!im.hidden)});
  h.querySelector('.rk').textContent=rankOf(S.home.id)||'';a.querySelector('.rk').textContent=rankOf(S.away.id)||'';
  h.querySelector('.rec').textContent=recStr(S.home);a.querySelector('.rec').textContent=recStr(S.away);
  const tos=n=>S.ot?'':[0,1,2].map(i=>`<i class="${i<n?'':'u'}"></i>`).join('');[[h,S.to[0]],[a,S.to[1]]].forEach(([el,n])=>{const k=S.ot?'ot':String(n);const e=el.querySelector('.tos');if(e.dataset.n!==k){e.dataset.n=k;e.innerHTML=tos(n)}});
  [h,a].forEach((el,i)=>{const s=el.querySelector('.sc');if(+s.dataset.v!==S.score[i]){const from=+s.dataset.v||0;s.dataset.v=S.score[i];if(S.score[i]>lastScore[i]){countUp(s,from,S.score[i]);flyout(el,'+'+(S.score[i]-lastScore[i]))}else s.textContent=S.score[i]}});
  lastScore=S.score.slice();h.classList.toggle('has',S.poss==='home');a.classList.toggle('has',S.poss==='away');
  $('#qtr').textContent=S.ot?(S.otRound>1?S.otRound:'')+'OT':qName(S.q);$('#gclk').textContent=S.ot?'—':fmtClock(S.clock);
  const pc=$('#pclk'),show=S.phase==='presnap'&&!S.conv&&uOff();pc.textContent=show?':'+String(Math.ceil(S.playClock)).padStart(2,'0'):':--';pc.classList.toggle('low',show&&S.playClock<6);pc.classList.toggle('off',!show);
  $('#dd').textContent=ddText();$('#spot').textContent=S.conv?'Conversion':spotLabel(S.los);sb.classList.toggle('rz',!S.conv&&S.los>=90&&S.phase!=='over');
  $('#gclk').classList.toggle('run',!!S.clockRun&&!S.ot);$('#toBtn').hidden=!(S.phase==='presnap'&&S.clockRun&&!S.ot&&S.to[0]>0&&S.clock>0);
  if(typeof BC!=='undefined')BC.hud();
  const st=teamStamina();const se=$('#stam');se.textContent='STA '+Math.round(st*100)+'%';se.style.color=st>.85?'var(--ok)':st>.75?'var(--warn)':'var(--hot)';
  const wx=windHTML();if($('#wxs').dataset.w!==wx){$('#wxs').dataset.w=wx;$('#wxs').innerHTML=wx}
}

/* score bug: count the new score up and slide the points scored over the team's cell */
function countUp(el,from,to){const t0=performance.now(),d=650;const f=now=>{const k=Math.min(1,(now-t0)/d);el.textContent=Math.round(from+(to-from)*k);if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function flyout(el,txt){el.querySelectorAll('.fly').forEach(x=>x.remove());const f=document.createElement('span');f.className='fly';f.textContent=txt;el.appendChild(f);el.classList.remove('scored');void el.offsetWidth;el.classList.add('scored');setTimeout(()=>{f.remove();el.classList.remove('scored')},1700)}
