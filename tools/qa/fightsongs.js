/* Fight songs: imports the fight-songs file through the real UI (Settings › Rosters & data), checks matching and the
   Settings › Fight songs card, then in a live game fires a touchdown for a public-domain team (synth band), a team with
   no melody (original generic march), a team with an uploaded recording (decoded WAV), the final whistle, mute and Off.
   NODE_PATH=$(npm root -g) node tools/qa/fightsongs.js [fight-songs.json] [web/index.html] [TEAM]                 */
const Q=require('./_boot');const fs=require('fs');const os=require('os');const path=require('path');
const FILE=process.argv[2]||'/home/claude/packs/gridiron-live-2026-fight-songs.json',PAGE=process.argv[3]||'web/index.html',TEAM=process.argv[4]||'MICH';
/* a 1.5 s 440 Hz WAV for the upload test */
function wav(){const sr=8000,n=sr*1.5,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/sr*2*Math.PI*440)*9000),44+i*2);
  const f=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'glfs-')),'my-song.wav');fs.writeFileSync(f,b);return f}
(async()=>{const b=await Q.launch();const errs=[];const p=await Q.newPage(b,844,390,errs);const out={};let fail=0;const ok=(k,v,good)=>{out[k]=v;if(!good){fail++;console.log('FAIL',k,JSON.stringify(v))}};
await p.goto(Q.pageURL(PAGE));await Q.startDynasty(p,TEAM);
await p.evaluate(()=>{LG.settings.pregame=false;LG.settings.halftime=false;LG.settings.defMode='sim'});
/* import through Settings › Rosters & data */
await p.evaluate(()=>{showHub('settings');document.querySelector('#sx-impRosters').click()});await p.waitForSelector('#riFile',{state:'attached'});
await p.setInputFiles('#riFile',FILE);await p.waitForSelector('#riGo',{timeout:30000});
const prev=await p.evaluate(()=>document.querySelector('.ri-prev').innerText.replace(/\s+/g,' '));ok('preview',prev,/Fight songs 13\d\/138/i.test(prev)&&/With a melody 1\d/i.test(prev));
await p.click('#riGo');await p.waitForFunction(()=>document.querySelector('#modal').hidden,null,{timeout:30000});await p.waitForTimeout(200);
const lib=await p.evaluate(t=>{const u=LG.teams.find(x=>x.abbr===t);const e=fsFor(u);return {saved:fsLib().length,kvKB:Math.round((KV.get('gl.fs')||'').length/1024),title:e&&e.title,melody:!!(e&&e.melody),
  card:!!document.querySelector('#sx-fightSongs')&&!!document.querySelector('#sx-fsManage'),pack:LG.pack||null,
  matched:LG.teams.filter(x=>fsFor(x)).length,withMel:LG.teams.filter(x=>fsFor(x)&&fsFor(x).melody).length}},TEAM);
ok('library',lib,lib.saved===138&&lib.melody&&lib.card&&!lib.pack&&lib.matched>=130);
/* merged into a roster pack: the importer accepts it and counts the songs */
const merged=await p.evaluate(t=>{const pk={format:'gridiron-live-pack',version:2,teams:[{school:'Alabama',abbr:'ALA'}],fightSongs:JSON.parse(t).songs};const pv=packPreview(LG,pk);return {fs:pv.fs&&pv.fs.teams,fsOnly:pv.fsOnly}},fs.readFileSync(FILE,'utf8'));
ok('merged preview',merged,merged.fs>=130&&!merged.fsOnly);
/* upload a recording for the opponent-to-be through Settings › Fight songs */
const W=wav();await p.evaluate(()=>{showHub('settings');document.querySelector('#sx-fsManage').click()});await p.waitForSelector('#fsList');
const upTeam=await p.evaluate(()=>{const t=LG.teams.find(x=>x.abbr==='KENN')||LG.teams.find(x=>!fsFor(x)&&x.id!==LG.user);document.querySelector('#fsQ').value=t.city;document.querySelector('#fsQ').dispatchEvent(new Event('input'));return t.id});
await p.setInputFiles(`[data-fsu="${upTeam}"]`,W);await p.waitForTimeout(400);
const up=await p.evaluate(id=>{const t=T(id);return {has:fsHasAudio(t),status:fsStatus(t),row:document.querySelector('#fsList').innerText.replace(/\s+/g,' ').slice(0,120)}},upTeam);ok('upload',up,up.has&&/Your recording/.test(up.status));
await p.evaluate(()=>{closeModal();showHub('home')});
/* a live game */
await Q.toUserGame(p);
const phase=await p.evaluate(async()=>{const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
  for(let n=0;n<400&&!['kick','live','presnap'].includes(S.phase);n++){if(vis('#studio')&&document.querySelector('#studioGo'))document.querySelector('#studioGo').click();
    if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click()}const k=document.querySelector('#kickoff');if(k&&k.offsetParent)k.click();await new Promise(r=>setTimeout(r,50))}
  return {phase:S.phase,intro:FS.cur?{kind:FS.cur.kind,mode:FS.cur.mode,team:FS.cur.team.abbr}:null,host:hostT().abbr,neutral:S.neutral}});
ok('in game + opening-kickoff intro',phase,phase.phase!=='hub'&&(phase.neutral||phase.intro&&phase.intro.mode==='intro'&&phase.intro.team===phase.host));
const probe=async(fn,arg,wait)=>{await p.evaluate(fn,arg);await p.waitForTimeout(wait||1700);return p.evaluate(()=>{const c=FS.cur;return c?{kind:c.kind,mode:c.mode,song:c.song||null,team:c.team.abbr,nodes:c.src.length,ac:AC&&AC.state,t:+(AC.currentTime-c.t0).toFixed(2)}:null})};
await p.evaluate(()=>{ac();muted=false;LG.settings.muted=false});
const td=await probe(()=>{S.conv=false;fx('td',{team:S.home})});ok('td pd team (synth)',td,td&&td.kind==='synth'&&td.mode==='td'&&td.nodes>10&&td.team===TEAM);
await p.waitForTimeout(2500);const td2=await p.evaluate(()=>FS.cur&&{nodes:FS.cur.src.length,t:+(AC.currentTime-FS.cur.t0).toFixed(2)});ok('synth keeps playing',td2,td2&&td2.t>2);
const gen=await probe(()=>{const t=LG.teams.find(x=>x.id!==LG.user&&!fsFor(x)?.melody&&!fsHasAudio(x));fsPlay(t,'td')},null,900);ok('generic march',gen,gen&&gen.kind==='generic'&&gen.nodes>5);
const cus=await probe(id=>fsPlay(T(id),'td'),upTeam,900);ok('custom recording',cus,cus&&cus.kind==='custom'&&cus.nodes===1);
const fin=await probe(()=>{S.score=[24,17];fx('final',{won:true})},null,1300);ok('final whistle',fin,fin&&fin.mode==='win');
const mute=await probe(()=>{muted=true},null,500);ok('mute stops',mute,mute===null);
const off=await p.evaluate(()=>{muted=false;LG.settings.fightSongs=false;const r=fsPlay(S.home,'td');const riff=fsTakesFight();LG.settings.fightSongs=true;return {started:r,riffStepsAside:riff}});ok('off',off,!off.started&&!off.riffStepsAside);
/* a real touchdown through the engine path (sfx fight is skipped, the band starts) */
const real=await probe(()=>{fsStop(.01);sfx('fight');return 1},null,300);ok('old riff silent while on',real,real===null);
console.log('RESULTS',JSON.stringify(out,null,1));
console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length||fail?1:0)})();
