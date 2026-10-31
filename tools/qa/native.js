/* The iOS shell's bridges, emulated in Chromium: lazy save loading (only small keys + the last slot injected, the rest served by
   messageHandlers.kvget), Back up to Files (messageHandlers.export) and Restore from file (file chooser), and a controller through
   window.__NATIVE_PAD__ (play-call focus ring, snap, RB target + A throw).
   NODE_PATH=$(npm root -g) node tools/qa/native.js [web/index.html]                                                            */
const Q=require('./_boot');
(async()=>{
const b=await Q.launch();const errs=[],fails=[];const ok=(c,m)=>{if(!c)fails.push(m);console.log((c?'ok   ':'FAIL ')+m)};
{const push=errs.push.bind(errs);errs.push=(...a)=>push(...a.filter(m=>!/Failed to load resource: net::/.test(m)))}
/* 1. browser path: dynasties in slots 1 and 2, then take the stored keys as the "UserDefaults" of the emulated app */
let p=await Q.newPage(b,844,390,errs);await p.goto(Q.pageURL(process.argv[2]));
await Q.startDynasty(p,'UGA');await p.evaluate(()=>{saveNow(true);showSlots()});
await p.click('#slotNew-2');await p.waitForTimeout(150);await p.evaluate(()=>{const t=SETUP.L.teams.find(t=>t.abbr==='TEX');openTeamDetail(t.id)});await p.waitForTimeout(150);
await p.click('#coachHere');await p.waitForTimeout(300);await p.evaluate(()=>{for(let i=0;i<5;i++){const m=document.querySelector('#modal');if(m&&!m.hidden){const x=document.querySelector('#evX');if(x)x.click();else closeModal()}}saveNow(true);showSlots()});
const store=await p.evaluate(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k)}return o});
ok(store['gl3.slot1']&&store['gl3.slot2']&&JSON.parse(store['gl3.meta']).last===2,'two dynasties stored, slot 2 played last');
await p.close();
/* 2. emulated app: localStorage empty, the shell injects small keys + slot 2 and answers kvget after a delay */
p=await Q.newPage(b,844,390,errs);
await p.addInitScript(st=>{try{localStorage.clear()}catch(e){}
  const S=JSON.parse(st),meta=JSON.parse(S['gl3.meta']||'{}'),eager=new Set(['gl3.slot'+meta.last,'gl3.live'+meta.last]),inj={},lazy=[];
  for(const k in S){if(S[k].length<=16384||eager.has(k))inj[k]=S[k];else lazy.push(k)}
  window.__NATIVE_KV__=inj;window.__NATIVE_KV_LAZY__=lazy;window.__DEVICE__={id:'iPhone17,1',w:874,h:402,scale:3,isPad:false,safe:{t:0,r:62,b:21,l:62}};
  window.__store=S;window.__gets=[];
  window.webkit={messageHandlers:{kv:{postMessage(m){if(m.v)S[m.k]=m.v;else delete S[m.k]}},kvget:{postMessage(m){window.__gets.push(m.keys.join());setTimeout(()=>window.__kvReply(m.id,Object.fromEntries(m.keys.map(k=>[k,S[k]||'']))),120)}},
    export:{postMessage(m){window.__exported=m}},device:{postMessage(){}},haptic:{postMessage(){}}}};
},JSON.stringify(store));
await p.goto(Q.pageURL(process.argv[2]));await p.waitForSelector('#slotGo-1');
const st0=await p.evaluate(()=>({lazy:[...KV.lazy],has1:KV.has('gl3.slot1'),get1:KV.get('gl3.slot1'),get2:!!KV.get('gl3.slot2'),dev:devLabel()}));
ok(st0.lazy.includes('gl3.slot1')&&!st0.lazy.includes('gl3.slot2')&&st0.has1&&st0.get1===null&&st0.get2,`launch injects slot 2 only; slot 1 is listed and lazy (${st0.lazy.join(', ')})`);
ok(st0.dev==='iPhone 16 Pro','iPhone17,1 detected as iPhone 16 Pro');
await p.click('#slotGo-1');const lbl=await p.evaluate(()=>{const e=document.querySelector('#slotGo-1');return e&&e.textContent});
await p.waitForFunction(()=>SLOT===1&&LG,null,{timeout:5000}).catch(()=>{});
const in1=await p.evaluate(()=>({slot:SLOT,abbr:LG&&T(LG.user).abbr}));ok(in1.slot===1&&in1.abbr==='UGA',`Continue on a lazy slot loads it on demand (button said "${lbl}")`);
await p.evaluate(()=>{saveNow(true);showSlots()});await p.waitForTimeout(2500);
const st1=await p.evaluate(()=>({lazy:KV.lazy.size,gets:window.__gets.length}));ok(st1.lazy===0,`background prefetch filled every key (${st1.gets} requests)`);
/* 3. Back up to Files (all slots) through the export bridge, then Restore from file into slot 3 through the file chooser */
await p.click('#slotGo-2');await p.waitForFunction(()=>SLOT===2&&LG,null,{timeout:5000});await p.evaluate(()=>showHub('settings'));
await p.click('#backupFiles');await p.click('#bkAll');await p.waitForFunction(()=>window.__exported,null,{timeout:5000}).catch(()=>{});
const ex=await p.evaluate(()=>{const e=window.__exported;if(!e)return null;const j=JSON.parse(e.data);return {name:e.name,fmt:j.format,slots:j.slots.map(s=>s.slot+':'+(s.meta&&s.meta.abbr)),data:e.data}});
ok(ex&&ex.fmt==='gridiron-live-backup'&&ex.slots.join()==='1:UGA,2:TEX'&&/^GridironLive-all-slots-\d{4}-\d\d-\d\d\.json$/.test(ex.name),`backup file ${ex&&ex.name}: ${ex&&ex.slots}`);
await p.evaluate(()=>{showHub('settings')});await p.click('#toSlots');await p.waitForSelector('#restoreFile');
const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:5000}),p.click('#restoreFile')]);
await fc.setFiles({name:ex.name,mimeType:'application/json',buffer:Buffer.from(ex.data)});await p.waitForSelector('#rfOne-1',{timeout:5000});
await p.click('#rfOne-1');await p.click('#rfSlot button[data-v="3"]');const to=await p.evaluate(()=>$('#rfTo').textContent);await p.click('#rfGo');await p.waitForTimeout(500);
const r3=await p.evaluate(()=>{const L=Saves.load(3);return {abbr:L&&T.call?L.teams[L.user].abbr:L&&L.teams[L.user].abbr,meta:Saves.meta().slots[3]&&Saves.meta().slots[3].abbr,card:!!document.querySelector('#slotGo-3'),native:!!window.__store['gl3.slot3']}});
ok(r3.abbr==='TEX'&&r3.meta==='TEX'&&r3.card&&r3.native,`restored TEX into empty slot 3 ("${to}")`);
/* 4. controller: A on the play-call sheet (focus ring on Coach's pick), A snaps, RB picks a receiver, A throws */
await p.click('#slotGo-2');await p.waitForFunction(()=>SLOT===2&&LG,null,{timeout:5000});await p.evaluate(()=>{LG.settings.pregame=false;LG.settings.halftime=false});
await Q.toUserGame(p);const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(1200);
const got=await p.evaluate(async()=>{const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
  for(let n=0;n<6000;n++){if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();await new Promise(r=>setTimeout(r,60));continue}
    if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click();await new Promise(r=>setTimeout(r,60));continue}
    if(S.phase==='presnap'&&uOff()&&vis('#call'))return 'call';if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="sim"]');if(a)a.click()}
    if(S.phase==='kick'&&kick){kick.ang=0;if(kick.stage==='aim')kickTap();else if(kick.stage==='power'){kick.pow=.97;kickTap()}}await new Promise(r=>setTimeout(r,16))}return 'timeout'});
ok(got==='call','reached the play-call sheet');
const press=async(i,ms)=>{await p.evaluate(i=>{const b=new Array(17).fill(0);if(i>=0)b[i]=1;window.__NATIVE_PAD__={b,a:[0,0,0,0]}},i);await p.waitForTimeout(ms||120);await p.evaluate(()=>{window.__NATIVE_PAD__={b:new Array(17).fill(0),a:[0,0,0,0]}});await p.waitForTimeout(120)};
await press(-1,200);await p.evaluate(()=>{CALL_TAB='pass';renderCall()});await p.waitForTimeout(150);
await press(13);await press(12);const foc=await p.evaluate(()=>document.querySelector('.padfocus')&&document.querySelector('.padfocus').className);ok(!!foc,`d-pad focus ring on the call sheet (${foc})`);
await p.evaluate(()=>{const e=document.querySelector('#callRow .pbgrid [data-pid]');padFocus(e)});await press(0);
const sb=await p.evaluate(()=>({snap:!$('#snapBar').hidden,pc:S.pc&&S.pc.cat}));ok(sb.snap,`A picks the focused play (${sb.pc}) and shows the snap bar`);
await press(0);await p.waitForTimeout(900);const live=await p.evaluate(()=>({ph:S.phase,qb:padQB()}));ok(live.ph==='live',`A snaps (${JSON.stringify(live)})`);
if(live.qb){await press(5);const tg=await p.evaluate(()=>PAD.target&&PAD.target.key);await press(0);const th=await p.evaluate(()=>!!(play&&play.thrown));ok(!!tg&&th,`RB targets ${tg}, A throws`)}
else console.log('     (run play from Coach\'s pick: throw check skipped)');
await press(9);ok(await p.evaluate(()=>S.paused&&!$('#pausem').hidden),'Start pauses');await press(9);ok(await p.evaluate(()=>!S.paused),'Start resumes');
console.log('FAILED',fails.length?fails:'none');console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length||fails.length?1:0)})();
