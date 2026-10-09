/* =========================================================
   07 · Synthesized audio + broadcast HUD
   ========================================================= */
let AC=null,muted=false,NB=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();const n=AC.sampleRate*2;NB=AC.createBuffer(1,n,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1}catch(e){AC=null}}if(AC&&AC.state==='suspended')AC.resume()}
function noise(dur,freq,q,gain,type,delay){const t=AC.currentTime+(delay||0),s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=NB;f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+Math.min(.25,dur*.2));g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(AC.destination);s.start(t);s.stop(t+dur+.05)}
function tone(f,t0,d,type,g){const o=AC.createOscillator(),gn=AC.createGain();o.type=type||'square';o.frequency.value=f;const t=AC.currentTime+t0;gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(g||.05,t+.02);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn).connect(AC.destination);o.start(t);o.stop(t+d+.02)}
function sfx(k){if(!AC||muted)return;try{const t=AC.currentTime;
  if(k==='whistle'){const o=AC.createOscillator(),l=AC.createOscillator(),lg=AC.createGain(),g=AC.createGain();o.frequency.value=2850;l.frequency.value=32;lg.gain.value=140;l.connect(lg).connect(o.frequency);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.02);g.gain.setValueAtTime(.05,t+.3);g.gain.exponentialRampToValueAtTime(.0001,t+.42);o.connect(g).connect(AC.destination);o.start(t);l.start(t);o.stop(t+.45);l.stop(t+.45)}
  else if(k==='hike')noise(.12,900,1.5,.25);else if(k==='thump')noise(.18,180,1,.5,'lowpass');else if(k==='zip')noise(.15,2400,2,.2);else if(k==='cut')noise(.08,1400,2,.12);
  else if(k==='roar')noise(2.6,700,.6,.35);else if(k==='groan')noise(1.2,350,.8,.18);
  else if(k==='tap'){tone(1200,0,.03,'sine',.02)}
  else if(k==='fight'){const n=[392,523,659,784,659,784,880,784];n.forEach((f,i)=>{tone(f,.15+i*.14,.13,'square',.035);tone(f/2,.15+i*.14,.13,'triangle',.03)})}
}catch(e){}}

let toastT=null,lastScore=[0,0];
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1600)}
function banner(m,c,sub){const b=$('#banner');b.style.setProperty('--bc',c);b.style.setProperty('--btc',String(c).startsWith('#')?inkOn(c):'#fff');b.querySelector('span').textContent=m;b.querySelector('em').textContent=sub||'';b.querySelector('em').hidden=!sub;b.classList.remove('on');void b.offsetWidth;b.classList.add('on')}
function hint(m){const h=$('#hint');if(!m){h.hidden=true;return}h.textContent=m;h.hidden=false}
const ord=n=>['1st','2nd','3rd','4th'][n-1]||n+'th';
function spotLabelFor(x,side){const yd=Math.round(x-10);if(yd===50)return '50';const own=side==='away'?S.away:S.home,oth=side==='away'?S.home:S.away;return yd<50?`${own.abbr} ${Math.max(1,yd)}`:`${oth.abbr} ${Math.max(1,100-yd)}`}
function spotLabel(x){return spotLabelFor(x,S.poss)}
function ddText(){if(S.conv)return '2-pt try';const g=S.firstDownX>=110;return `${ord(S.down)} & ${g?'Goal':Math.max(1,Math.round(S.firstDownX-S.los))}`}
function fmtClock(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
const qName=q=>q>4?'OT':['1ST','2ND','3RD','4TH'][q-1];
function hud(){
  if(!S.home)return;const h=$('#tmH'),a=$('#tmA');
  h.style.setProperty('--c',S.home.c1);a.style.setProperty('--c',S.away.c1);
  h.querySelector('.ab').textContent=S.home.abbr;a.querySelector('.ab').textContent=S.away.abbr;
  h.querySelector('.rk').textContent=rankOf(S.home.id)||'';a.querySelector('.rk').textContent=rankOf(S.away.id)||'';
  h.querySelector('.rec').textContent=recStr(S.home);a.querySelector('.rec').textContent=recStr(S.away);
  const tos=n=>S.ot?'':[0,1,2].map(i=>`<i class="${i<n?'':'u'}"></i>`).join('');h.querySelector('.tos').innerHTML=tos(S.to[0]);a.querySelector('.tos').innerHTML=tos(S.to[1]);
  [h,a].forEach((el,i)=>{const s=el.querySelector('.sc');if(+s.dataset.v!==S.score[i]){const from=+s.dataset.v||0;s.dataset.v=S.score[i];if(S.score[i]>lastScore[i]){countUp(s,from,S.score[i]);flyout(el,'+'+(S.score[i]-lastScore[i]));s.classList.remove('bump');void s.offsetWidth;s.classList.add('bump')}else s.textContent=S.score[i]}});
  lastScore=S.score.slice();h.classList.toggle('has',S.poss==='home');a.classList.toggle('has',S.poss==='away');
  $('#qtr').textContent=S.ot?(S.otRound>1?S.otRound:'')+'OT':qName(S.q);$('#gclk').textContent=S.ot?'—':fmtClock(S.clock);
  const pc=$('#pclk'),show=S.phase==='presnap'&&!S.conv&&uOff();pc.textContent=show?':'+String(Math.ceil(S.playClock)).padStart(2,'0'):':--';pc.classList.toggle('low',show&&S.playClock<6);
  $('#dd').textContent=ddText();$('#spot').textContent=S.conv?'Conversion':spotLabel(S.los);
  $('#gclk').classList.toggle('run',!!S.clockRun&&!S.ot);$('#toBtn').hidden=!(S.phase==='presnap'&&S.clockRun&&!S.ot&&S.to[0]>0&&S.clock>0);
  if(typeof BC!=='undefined')BC.hud();
  const st=teamStamina();const se=$('#stam');se.textContent='STA '+Math.round(st*100)+'%';se.style.color=st>.85?'var(--ok)':st>.75?'var(--warn)':'var(--hot)';
  $('#wxs').innerHTML=windHTML();
}

/* score bug: count the new score up and float the points scored */
function countUp(el,from,to){const t0=performance.now(),d=650;const f=now=>{const k=Math.min(1,(now-t0)/d);el.textContent=Math.round(from+(to-from)*k);if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function flyout(el,txt){const f=document.createElement('span');f.className='fly';f.textContent=txt;el.appendChild(f);setTimeout(()=>f.remove(),1400)}
