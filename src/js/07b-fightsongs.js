/* =========================================================
   07b · Fight songs (v7): a brass-band synth, per-team recordings and the fight-songs file.
   File (docs/PACKS.md): {"format":"gridiron-live-fight-songs","version":1,"songs":[{team,school,espnId,title,year,
     composer,pd,alt:{title,year,composer,pd},melody:{song,tempo,meter,pickup,key,notes:[[midi,beats]…]}}]} on its own,
     or as "fightSongs" inside a roster pack. Imported through Settings › Rosters & data (02c calls fsList/fsPreview/fsSave).
   No real music ships with the app: melodies come only from the imported file, and the game plays a melody only for a
   song the file marks public domain ("pd"). Any other song plays from the user's own recording (Settings › Graphics & sound › Team songs,
   stored per team in KV like the custom stadium sounds) or, with neither, an ORIGINAL generic march written for this game.
   When it plays: the scoring team's song after a touchdown (fx td), a short intro of the host's song at the opening
   kickoff (fx kickoff), the winner's song at the final whistle (fx final). Respects `muted` and LG.settings.fightSongs.
   ========================================================= */
const FS_KEY='gl.fs',FS_AUD='gl.fsa.',FS_MAX=600000;
const FS={lib:null,ver:0,mapL:null,mapV:-1,map:null,cur:null,buf:{},seq:0};
const fsList=pk=>{if(!pk||typeof pk!=='object'||Array.isArray(pk))return null;const l=pk.format==='gridiron-live-fight-songs'?pk.songs:pk.fightSongs;return Array.isArray(l)&&l.length?l:null};
const fsIsFile=pk=>!!(fsList(pk)&&!(Array.isArray(pk.teams)&&pk.teams.length)&&!(Array.isArray(pk.players)&&pk.players.length)&&!(typeof stdList==='function'&&stdList(pk)));
const fsStr=(v,n)=>v==null||v===''?undefined:String(v).slice(0,n);
const fsMeta=e=>e&&typeof e==='object'&&e.title?{title:fsStr(e.title,70),year:parseInt(e.year)>1800?parseInt(e.year):undefined,composer:fsStr(e.composer,120),pd:e.pd===true}:null;
/* a melody is kept only for a song marked public domain; notes are clamped to sane values */
function fsMel(m,e,alt){
  if(!m||typeof m!=='object'||!Array.isArray(m.notes))return null;const of=alt&&alt.title===m.song?alt:e;if(!of||of.pd!==true)return null;
  const notes=m.notes.slice(0,800).filter(n=>Array.isArray(n)&&n.length>=2).map(([p,b])=>[clamp(parseInt(p)||0,0,108),clamp(+b||.5,.0625,16)]);if(notes.length<4)return null;
  return {song:fsStr(m.song,70)||of.title,tempo:clamp(+m.tempo||120,40,280),meter:m.meter==='4/4'||m.meter==='3/4'?m.meter:'2/4',pickup:clamp(+m.pickup||0,0,4),key:fsStr(m.key,3)||'C',notes};
}
function fsClean(list){return (list||[]).filter(e=>e&&typeof e==='object'&&(e.team||e.abbr||e.school||e.espnId)).slice(0,400).map(e=>{const m=fsMeta(e)||{title:'Fight song',pd:false},alt=fsMeta(e.alt);
  const o={team:fsStr(e.team||e.abbr,8),school:fsStr(e.school,40),espnId:e.espnId!=null?String(e.espnId).slice(0,14):undefined,...m};if(alt)o.alt=alt;const mel=fsMel(e.melody,m,alt);if(mel)o.melody=mel;return o})}
function fsLib(){if(FS.lib)return FS.lib;try{const raw=KV.get(FS_KEY);const l=raw?JSON.parse(raw):null;FS.lib=Array.isArray(l)?l:[]}catch(e){console.error(e);FS.lib=[]}return FS.lib}
/* the song library is kept on this device for every dynasty (it is small: about 30 KB) */
function fsSave(list){const c=fsClean(list);KV.set(FS_KEY,JSON.stringify(c));FS.lib=c;FS.ver++;return c.length}
function fsClear(){KV.set(FS_KEY,null);FS.lib=[];FS.ver++}
const fsMatch=(L,list)=>packMatch(L,{teams:list.map(e=>({...e,abbr:e.abbr||e.team}))});
function fsFor(t){
  if(!t||typeof LG==='undefined'||!LG)return null;const lib=fsLib();if(!lib.length)return null;
  if(FS.mapL!==LG||FS.mapV!==FS.ver||!FS.map){FS.map=new Map();try{for(const [x,e] of fsMatch(LG,lib).pairs)FS.map.set(x.id,e)}catch(err){console.error(err)}FS.mapL=LG;FS.mapV=FS.ver}
  return FS.map.get(t.id)||null;
}
function fsPreview(L,pk){const l=fsList(pk);if(!l)return null;const c=fsClean(l),m=fsMatch(L,c);return {teams:m.pairs.length,total:c.length,mel:m.pairs.filter(([,e])=>e.melody).length,miss:m.miss}}
const fsKpi=p=>p&&p.fs?`<div><em>Fight songs</em><b>${p.fs.teams}<small>/${p.fs.total}</small></b></div>`:'';
function fsPrevHTML(p){const f=p.fs;return `<div class="ri-prev"><div class="kpis">${fsKpi(p)}<div><em>With a melody</em><b>${f.mel}</b></div></div>
  <p class="note">Fight-song titles for each school. Public-domain songs (published before 1929) come with a melody the band plays; for any other song, add your own recording in Settings › Graphics &amp; sound › Team songs. Kept on this device for every dynasty.</p>
  ${f.miss.length?`<p class="note">Not in this league (skipped): ${esc(f.miss.slice(0,8).join(', '))}${f.miss.length>8?` and ${f.miss.length-8} more`:''}</p>`:''}</div>`}
/* per-team recordings (data: URLs under 600 KB, lazy KV keys like gl.aud.*) */
const fsKey=t=>FS_AUD+(t.espnId?'e'+t.espnId:'a'+String(t.abbr||t.id).toUpperCase());
const fsHasAudio=t=>!!t&&KV.has(fsKey(t));
const fsOn=()=>typeof LG!=='undefined'&&LG&&LG.settings&&LG.settings.fightSongs!==false;
/* the old one-shot riff (sfx 'fight') steps aside while fight songs are on: the fx listeners below play the real thing */
const fsTakesFight=()=>fsOn();
function fsSongName(t){const e=fsFor(t);if(fsHasAudio(t))return (e&&e.title)||'Fight song';if(e&&e.melody)return e.melody.song;return e?e.title:''}

/* ---------- player ---------- */
const FS_LEN={intro:8,td:20,win:25,preview:25};
function fsStop(fade){const c=FS.cur;FS.cur=null;if(!c)return;clearInterval(c.timer);try{const t=AC.currentTime;c.bus.gain.cancelScheduledValues(t);c.bus.gain.setValueAtTime(Math.max(.0001,c.bus.gain.value),t);c.bus.gain.exponentialRampToValueAtTime(.0001,t+(fade||.4))}catch(e){}
  setTimeout(()=>{try{c.src.forEach(s=>{try{s.stop()}catch(_){}});c.bus.disconnect()}catch(e){}},((fade||.4)+.1)*1000)}
function fsBus(level){const g=AC.createGain(),cp=AC.createDynamicsCompressor();cp.threshold.value=-14;cp.ratio.value=4;g.gain.value=level;g.connect(cp).connect(AC.destination);return g}
/* t: team; mode intro|td|win|preview; opts {visitor} → true when something started */
function fsPlay(t,mode,opts){
  if(!t||!AC||muted||(!fsOn()&&mode!=='preview'))return false;opts=opts||{};
  const vol=(+((LG&&LG.settings.fsVol)||1)||1)*(opts.visitor?.55:1),bus=fsBus(.0001),c={bus,src:[],timer:0,team:t,mode,id:++FS.seq,t0:AC.currentTime+.06,len:FS_LEN[mode]||20};
  fsStop(.25);FS.cur=c;bus.gain.setValueAtTime(.0001,AC.currentTime);bus.gain.exponentialRampToValueAtTime(Math.min(1.6,.9*vol),AC.currentTime+.08);
  if(fsHasAudio(t)){c.kind='custom';fsCustom(c,t);return true}
  const e=fsFor(t);c.kind=e&&e.melody?'synth':'generic';c.song=e&&e.melody?e.melody.song:(e&&e.title)||'Fight song';
  fsSynth(c,e&&e.melody?e.melody:fsGeneric(t),mode);return true;
}
/* recorded audio: decoded once per team, played through the band bus, faded out at the mode's length */
function fsCustom(c,t){
  const k=fsKey(t),go=b=>{if(FS.cur!==c)return;const s=AC.createBufferSource();s.buffer=b;s.connect(c.bus);s.start(c.t0);c.src.push(s);const end=Math.min(b.duration,c.len);
    c.bus.gain.setValueAtTime(c.bus.gain.value||.9,c.t0+Math.max(0,end-1.2));c.bus.gain.exponentialRampToValueAtTime(.0001,c.t0+end);c.timer=setInterval(()=>{if(FS.cur!==c)return clearInterval(c.timer);if(muted||AC.currentTime>c.t0+end+.2)fsStop(.2)},250)};
  const fail=()=>{if(FS.cur!==c)return;const e=fsFor(t);c.kind=e&&e.melody?'synth':'generic';fsSynth(c,e&&e.melody?e.melody:fsGeneric(t),c.mode)};
  if(FS.buf[k])return go(FS.buf[k]);
  KV.need([k]).then(()=>{const u=KV.get(k);if(!u||!/^data:/.test(u))return fail();try{const bin=atob(u.slice(u.indexOf(',')+1)),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
    const ok=b=>{FS.buf[k]=b;go(b)};const p=AC.decodeAudioData(a.buffer,ok,()=>fail());if(p&&p.catch)p.catch(()=>{})}catch(e){console.error(e);fail()}});
}
/* an ORIGINAL generic march (written for this game, not any school's song): key and tempo vary by team */
const FS_GEN=[[67,.5],[72,.5],[76,1],[74,.5],[72,.5],[69,1],[67,.5],[69,.5],[71,.5],[72,.5],[74,2],[76,.5],[74,.5],[72,1],[69,.5],[71,.5],[72,1],[74,.5],[71,.5],[67,.5],[71,.5],[72,2],
  [72,.5],[76,.5],[79,1],[77,.5],[76,.5],[74,1],[72,.5],[74,.5],[76,.5],[77,.5],[79,2],[81,.5],[79,.5],[77,.5],[76,.5],[74,1],[67,1],[72,.5],[74,.5],[76,.5],[74,.5],[72,2]];
function fsGeneric(t){const h=(t&&(t.id|0))||0;return {song:'Fight song',tempo:184+(h%4)*8,meter:'2/4',pickup:0,key:'C',tr:[-2,0,3,-4][h%4],notes:FS_GEN}}
/* chord per half bar (4/4) or bar (2/4) from the melody: I, IV, V, vi, ii of the song's key; the last one is I */
function fsChords(mel,tonic){
  const per=mel.meter==='4/4'?2:mel.meter==='3/4'?3:2,C=[[0,[0,4,7]],[7,[7,11,2,5]],[5,[5,9,0]],[9,[9,0,4]],[2,[2,5,9]]],out=[];let t=-(mel.pickup||0);
  const spans={};for(const [p,b] of mel.notes){const s=Math.floor(Math.max(0,t)/per);if(p)(spans[s]=spans[s]||[]).push([(p-tonic+120)%12,b,t>=0&&Math.abs(t-s*per)<.01]);t+=b}
  const n=Math.ceil(Math.max(0,t)/per);for(let s=0;s<n;s++){const L=spans[s]||[];let best=out.length?out[out.length-1]:0,bs=-1;
    C.forEach(([r,tones],i)=>{let sc=-i*.05;for(const [pc,b,down] of L)if(tones.includes(pc))sc+=b+(down?1:0);if(sc>bs){bs=sc;best=r}});out.push(L.length?best:out.length?out[out.length-1]:0)}
  if(out.length)out[out.length-1]=0;return {per,roots:out};
}
const FS_TONIC={C:0,'C#':1,Db:1,D:2,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,Ab:8,A:9,Bb:10,B:11};
function fsSynth(c,mel,mode){
  const spb=60/mel.tempo,tr=mel.tr||0,tonic=((FS_TONIC[mel.key]!=null?FS_TONIC[mel.key]:0)+tr+120)%12,len=c.len,ev=[];
  /* melody events (beats from the first bar line; the pickup starts before it) */
  let b=-(mel.pickup||0);for(const [p,d] of mel.notes){if(p)ev.push({k:'m',b,d,p:p+tr});b+=d}
  const total=b,ch=fsChords(mel,tonic);
  for(let s=0;s<ch.roots.length;s++){const r=ch.roots[s],b0=s*ch.per;if(b0>=total)break;let bass=36+((tonic+r)%12);if(bass>45)bass-=12;
    ev.push({k:'tuba',b:b0,d:Math.min(1,ch.per)*.85,p:bass});ev.push({k:'tuba',b:b0+(ch.per>=2?ch.per/2:.5),d:.8,p:bass+7});
    for(let q=0;q<ch.per;q++){ev.push({k:q%2?'snare':'kick',b:b0+q,acc:q===0});ev.push({k:'snare',b:b0+q+.5,soft:true});
      /* "pah" chords on the off-beats (horns) */ev.push({k:'pah',b:b0+q+.5,p:[r,(r+4+(r===7?0:0)+(r===9||r===2?-1:0))%12,(r+7)%12].map(x=>60+((tonic+x)%12))})}
    if(s%8===7)for(let i=0;i<4;i++)ev.push({k:'snare',b:b0+ch.per-1+i*.25,roll:true})}
  ev.push({k:'crash',b:0});ev.push({k:'crash',b:Math.max(0,total-((mel.notes[mel.notes.length-1]||[0,1])[1]))});
  /* the intro is the opening phrase only */
  const lim=Math.min(len/spb,mode==='intro'?Math.min(total,16):total);ev.sort((a,b)=>a.b-b.b);
  const t0=c.t0+(mel.pickup||0)*spb,endT=t0+lim*spb;let i=0;c.endT=endT;
  const tick=()=>{if(FS.cur!==c)return clearInterval(c.timer);if(muted){fsStop(.2);return}const now=AC.currentTime;
    while(i<ev.length&&t0+ev[i].b*spb<now+.45){const e=ev[i++],at=t0+e.b*spb;if(at<now-.05||e.b>=lim)continue;try{fsVoice(c,e,Math.max(at,now),spb)}catch(err){}}
    if(i>=ev.length||t0+ev[Math.min(i,ev.length-1)].b*spb>=endT){if(now>endT+.6){fsStop(.3)}else if(!c.fading&&lim<total){c.fading=1;try{c.bus.gain.setValueAtTime(c.bus.gain.value,Math.max(now,endT-1.2));c.bus.gain.exponentialRampToValueAtTime(.0001,endT+.3)}catch(_){}}}};
  tick();c.timer=setInterval(tick,120);
}
const fsHz=m=>440*Math.pow(2,(m-69)/12);
/* brass: two detuned saws through a low-pass whose cutoff blooms on the attack; tuba: triangle; drums from the noise buffer */
function fsVoice(c,e,at,spb){
  const A=AC,add=s=>{c.src.push(s);if(c.src.length>400)c.src.splice(0,200)};
  if(e.k==='m'||e.k==='pah'||e.k==='tuba'){
    const ps=e.k==='pah'?e.p:[e.p],d=e.k==='pah'?spb*.32:Math.max(.08,e.d*spb*(e.d<=.5?.78:.9)),g=A.createGain(),f=A.createBiquadFilter();f.type='lowpass';
    const peak=e.k==='m'?.11:e.k==='pah'?.035:.13;f.frequency.setValueAtTime(e.k==='tuba'?300:500,at);f.frequency.exponentialRampToValueAtTime(e.k==='tuba'?700:e.k==='m'?3200:1600,at+.04);f.frequency.exponentialRampToValueAtTime(e.k==='tuba'?450:1800,at+Math.max(.06,d*.7));f.Q.value=1.4;
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(peak,at+.025);g.gain.setValueAtTime(peak*.8,at+Math.max(.03,d-.04));g.gain.exponentialRampToValueAtTime(.0001,at+d+.06);f.connect(g).connect(c.bus);
    for(const p of ps){const n=e.k==='m'?[-7,6]:[0];for(const dt of n){const o=A.createOscillator();o.type=e.k==='tuba'?'triangle':'sawtooth';o.frequency.value=fsHz(p);o.detune.value=dt;o.connect(f);o.start(at);o.stop(at+d+.1);add(o)}
      if(e.k==='m'){const o=A.createOscillator(),og=A.createGain();o.type='sawtooth';o.frequency.value=fsHz(p-12);og.gain.value=.45;o.connect(og).connect(f);o.start(at);o.stop(at+d+.1);add(o)}}
    return}
  if(!NB)return;const s=A.createBufferSource(),f=A.createBiquadFilter(),g=A.createGain();s.buffer=NB;let dur=.12,gain=.12;
  if(e.k==='kick'){f.type='lowpass';f.frequency.value=160;dur=.22;gain=e.acc?.5:.36;const o=A.createOscillator(),og=A.createGain();o.frequency.setValueAtTime(90,at);o.frequency.exponentialRampToValueAtTime(45,at+.18);og.gain.setValueAtTime(.0001,at);og.gain.exponentialRampToValueAtTime(e.acc?.32:.22,at+.006);og.gain.exponentialRampToValueAtTime(.0001,at+.24);o.connect(og).connect(c.bus);o.start(at);o.stop(at+.26);add(o)}
  else if(e.k==='snare'){f.type='bandpass';f.frequency.value=1900;f.Q.value=.8;dur=e.roll?.07:.1;gain=e.soft?.045:e.roll?.07:.11}
  else{f.type='highpass';f.frequency.value=5200;dur=1.3;gain=.07}
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+dur);s.connect(f).connect(g).connect(c.bus);s.start(at,Math.random()*1.5);s.stop(at+dur+.02);add(s);
}

/* ---------- when the band plays ---------- */
const fsHost=()=>typeof hostT==='function'?hostT():S.home;
const fsBusy=()=>!S||!S.home||S.ff||S.simmed||S.phase==='hub';
if(typeof onFx==='function'){
  onFx('td',e=>{if(S.conv||fsBusy()||!fsOn())return;const t=e.team||(typeof offT==='function'?offT():null);if(!t)return;const v=!S.neutral&&t!==fsHost()&&t!==S.home;setTimeout(()=>{if(S.home&&!S.ff)fsPlay(t,'td',{visitor:v})},1400)});
  onFx('kickoff',e=>{if(e.why==='Opening kickoff'&&!S.neutral&&!fsBusy()&&fsOn())fsPlay(fsHost(),'intro')});
  onFx('final',e=>{if(!fsOn()||!S.home)return;const w=S.score[0]===S.score[1]?null:S.score[0]>S.score[1]?S.home:S.away;if(w)setTimeout(()=>fsPlay(w,'win',{visitor:!S.neutral&&w!==fsHost()&&w!==S.home}),900);else fsStop(.6)});
}

/* ---------- Settings › Graphics & sound (fight-song rows after Crowd) ---------- */
function fsStatus(t){const e=fsFor(t);return fsHasAudio(t)?'Your recording':e&&e.melody?'Band melody · public domain':e?'Generic march · add your recording':'Generic march'}
function fsOpenManager(){
  let q='';const T0=LG.teams,me=T(LG.user),g=typeof userGameThisWeek==='function'?userGameThisWeek():null,opp=g?T(g.h===LG.user?g.a:g.h):null;
  const rows=()=>{const ql=packNorm(q);let L=T0.filter(t=>!ql||packNorm(t.city+' '+t.name+' '+t.abbr+' '+(fsSongName(t)||'')).includes(ql));
    const rank=t=>t===me?0:t===opp?1:fsHasAudio(t)?2:fsFor(t)?3:4;L=L.slice().sort((a,b)=>rank(a)-rank(b)||String(a.city).localeCompare(b.city)).slice(0,60);
    return L.map(t=>{const e=fsFor(t),nm=fsSongName(t);return `<div class="setrow"><span class="eyebrow" style="display:flex;gap:8px;align-items:center;min-width:0">${tvLogo(t,'xs')}<span style="min-width:0"><b>${esc(t.city)}</b>${t===me?' · you':''}<br><small class="note">${esc(nm||'No song imported')}${e&&e.year?' ('+e.year+')':''} · ${fsStatus(t)}</small></span></span>
      <span style="display:flex;gap:6px;align-items:center"><button class="btn sm ghost" data-fsp="${t.id}" aria-label="Play">▶</button><label class="btn sm ghost" style="cursor:pointer">Upload<input type="file" accept="audio/*" data-fsu="${t.id}" hidden></label>${fsHasAudio(t)?`<button class="btn sm ghost" data-fsx="${t.id}" aria-label="Remove recording">✕</button>`:''}</span></div>`}).join('')||'<p class="note">No team matches.</p>'};
  const bind=()=>{
    document.querySelectorAll('[data-fsp]').forEach(b=>b.onclick=()=>{ac();const t=T(+b.dataset.fsp);if(FS.cur&&FS.cur.team===t){fsStop(.3);return}fsPlay(t,'preview')});
    document.querySelectorAll('[data-fsx]').forEach(b=>b.onclick=()=>{const t=T(+b.dataset.fsx);KV.set(fsKey(t),null);delete FS.buf[fsKey(t)];paint();toast('Recording removed')});
    document.querySelectorAll('[data-fsu]').forEach(f=>f.onchange=()=>{const file=f.files&&f.files[0],t=T(+f.dataset.fsu);if(!file||!t)return;if(file.size>FS_MAX){toast('That clip is too big (600 KB max)');return}
      const rd=new FileReader();rd.onload=()=>{try{KV.set(fsKey(t),rd.result);delete FS.buf[fsKey(t)];paint();toast(`Fight song saved for ${t.city}`)}catch(e){toast('Could not store that clip')}};rd.readAsDataURL(file)})};
  const paint=()=>{const l=$('#fsList');if(l){l.innerHTML=rows();bind()}};
  openModal(`<div class="eyebrow">Fight songs</div><div class="h2">Team fight songs</div>
    <p class="note">Upload a recording (MP3/M4A/WAV under 600 KB) for any team: it plays instead of the band. Songs from an imported fight-songs file show their title; public-domain ones come with a melody.</p>
    <input type="search" id="fsQ" placeholder="Search teams or songs" style="width:100%"><div id="fsList" style="max-height:52vh;overflow:auto">${rows()}</div>
    <div class="btns"><button class="btn ghost" id="fsX">Done</button></div>`);
  bind();const s=$('#fsQ');if(s)s.oninput=()=>{q=s.value;paint()};on('fsX',()=>{fsStop(.3);closeModal()});
}
if(typeof SETTINGS_EXTRA!=='undefined')SETTINGS_EXTRA.unshift(
  {card:'Fight songs',key:'fightSongs',label:'Fight songs',opts:[[1,'On'],[0,'Off']],def:1,bool:true,after:v=>{if(!v)fsStop(.3)},
    note:'The band plays the scoring team’s fight song after touchdowns, the host’s at the opening kickoff and the winner’s at the final whistle. Melodies come from an imported fight-songs file (public-domain songs only); add your own recording for any other team.'},
  {card:'Fight songs',key:'fsVol',label:'Band volume',opts:[[.6,'Soft'],[1,'Normal'],[1.5,'Loud']],def:1},
  {card:'Fight songs',label:'Team songs',button:'Play & upload…',id:'fsManage',onClick:()=>fsOpenManager()});
