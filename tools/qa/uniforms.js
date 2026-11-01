/* Uniform & team builder: editor + preview (landscape and portrait), share codes, badge designer, create-a-school
   in a running dynasty (schedule stays valid), old-save defaults, pregame picker and an in-game shot in a custom set.
   NODE_PATH=$(npm root -g) node tools/qa/uniforms.js [web/index.html] [outdir]   (default outdir: /tmp/gl-uni) */
const Q=require('./_boot');const fs=require('fs');
(async()=>{const OUT=process.argv[3]||'/tmp/gl-uni';fs.mkdirSync(OUT,{recursive:true});const b=await Q.launch();const errs=[],fails=[];
const ok=(c,m)=>{if(!c)fails.push(m)};
for(const [w,h,tag] of [[844,390,'L'],[390,844,'P']]){
  const p=await Q.newPage(b,w,h,errs,2);await p.goto(Q.pageURL(process.argv[2]));await p.waitForTimeout(2200);
  const shot=async n=>{await p.screenshot({path:`${OUT}/${tag}-${n}.png`})};
  if(tag==='L')await Q.startDynasty(p,'UGA');
  else{/* portrait: create-a-school from the new-dynasty setup screen (badge + stadium designed in the builder) */
    await p.waitForSelector('#slotNew-1',{timeout:15000});await p.click('#slotNew-1');await p.waitForTimeout(300);
    await p.evaluate(()=>{openCustomProgram();const s=SB.st;s.city='Riverside State';s.name='Thunder';s.abbr='RSU';s.c1='#0B6E8A';s.c2='#F2C230';s.bdg={sh:'circle',dec:'stars'};s.stad={ez:'diag',turf:'#6D6F76'};sbDraw()});
    await p.waitForTimeout(200);await shot('00-create-school');
    await p.evaluate(()=>document.querySelector('#sbGo').click());await p.waitForTimeout(500);
    await p.evaluate(()=>{for(let i=0;i<5;i++){const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else closeModal()}}});
    ok(await p.evaluate(()=>{const u=T(LG.user);return u.city==='Riverside State'&&u.custom===1&&u.bdg.sh==='circle'&&u.stad.ez==='diag'&&!u.logo&&LG.weeks.every(w=>w.games.every(g=>LG.teams[g.h]&&LG.teams[g.a]))}),'create a school (setup)');
  }
  await p.waitForTimeout(300);
  /* old saves: no t.uni anywhere → generated sets; a save round trip keeps edits */
  ok(await p.evaluate(()=>LG.teams.every(t=>!t.uni)&&UNI_IDS.every(k=>/^#[0-9A-F]{6}$/i.test(uniSet(T(LG.user),k).j))),'generated sets');
  await p.evaluate(()=>showHub('program'));await p.waitForTimeout(300);
  await p.evaluate(()=>document.querySelector('.uni-card').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await shot('01-program-card');
  await p.evaluate(()=>openUniEditor(LG.user,()=>showHub('program')));await p.waitForTimeout(400);
  /* design a custom Home set through the controls */
  await p.evaluate(()=>{const c=(f,v)=>{const b=document.querySelector(`#ueCtl [data-f="${f}"] [data-v="${v}"]`);if(!b)throw new Error('no control '+f+'='+v);b.click()};
    c('hf','c');c('hs',3);c('d','S');c('sl',2);c('ps',3);c('h','#17191F');c('j','#17191F');c('n','#C9A227');c('p','#C9A227');c('k','#17191F');c('m','#C9A227');c('hc','#C9A227');c('dc','#C9A227');c('sc','#C9A227');c('pc','#17191F');c('no','#FFFFFF');
    const i=document.querySelector('#ueCtl input[type=color][data-f="j"]');i.value='#1a1f2b';i.dispatchEvent(new Event('input',{bubbles:true}))});
  await p.waitForTimeout(900);await shot('02-editor');
  await p.evaluate(()=>{document.querySelector('#ueView [data-k="back"]').click()});await p.waitForTimeout(250);
  await p.evaluate(()=>document.querySelector('.ue-rotc').scrollIntoView({block:'end'}));await p.waitForTimeout(300);await shot('03-editor-rotation');
  /* share codes: set + school round trip */
  const sc=await p.evaluate(()=>{const s=UE.W.H,code=uniEnc('GLU1',uniArr(s)),r=uniDec(code),back=uniFromArr(r.o);const sch=schoolCode(T(LG.user)),r2=uniDec(sch),o2=schoolFromCode(r2.o);
    return {len:code.length,same:UNI_KEYS.every(f=>String(back[f])===String(s[f])),slen:sch.length,school:!!o2&&o2.city===T(LG.user).city}});
  ok(sc.same&&sc.len<220,'set code round trip '+JSON.stringify(sc));ok(sc.school,'school code');
  await p.evaluate(()=>{document.querySelector('[data-f="r:rv"] [data-v="T"]').click();document.querySelector('#ueSave').click()});await p.waitForTimeout(300);
  const st=await p.evaluate(()=>{const u=T(LG.user);const raw=pack(LG),L2=migrate(unpack(raw)),u2=L2.teams[LG.user];return {uni:u.uni,keep:JSON.stringify(u2.uni)===JSON.stringify(u.uni),hf:uniSet(u,'H').hf}});
  ok(st.uni&&st.uni.H&&st.uni.rot&&st.uni.rot.rv==='T'&&st.keep&&st.hf==='c','saved compactly + survives save '+JSON.stringify(st));
  if(tag==='L')console.log('stored t.uni',JSON.stringify(st.uni).length,'chars, set code',sc.len,'chars, school code',sc.slen,'chars');
  /* badge designer + stadium */
  await p.evaluate(()=>openEditor(LG.user,()=>showHub('program')));await p.waitForTimeout(300);
  await p.evaluate(()=>{const c=(f,v)=>document.querySelector(`#sbRoot [data-f="${f}"] [data-v="${v}"]`).click();c('b:sh','hex');c('b:dec','ring');c('s:ez','check');c('s:turf','#1D4FB0');c('s:s1','#17191F')});
  await p.waitForTimeout(200);await shot('04-school-builder');
  await p.evaluate(()=>document.querySelector('#sbField').scrollIntoView({block:'center'}));await p.waitForTimeout(200);await shot('05-stadium');
  await p.evaluate(()=>document.querySelector('#sbGo').click());await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!T(LG.user).bdg&&T(LG.user).bdg.sh==='hex'&&badge(T(LG.user)).includes('badge bd')&&T(LG.user).stad.ez==='check'),'badge + stadium saved');
  if(tag==='L'){
    /* create a school in the running dynasty: replaces a CPU team, schedule stays valid */
    const cr=await p.evaluate(()=>{showHub('league');document.querySelector('#newSchool').click();const s=SB.st;s.city='Harbor Point';s.name='Gulls';s.abbr='HPU';s.c1='#0B6E8A';s.c2='#F5F1E6';
      const rep=s.rep,n=LG.teams.length;document.querySelector('#sbGo').click();const t=LG.teams[rep];
      const valid=LG.weeks.every(w=>w.games.every(g=>LG.teams[g.h]&&LG.teams[g.a]));return {city:t.city,custom:t.custom,n:LG.teams.length===n,valid,user:rep!==LG.user}});
    ok(cr.city==='Harbor Point'&&cr.custom&&cr.n&&cr.valid&&cr.user,'create a school '+JSON.stringify(cr));
    /* pregame picker + kickoff in the custom Home set */
    await p.evaluate(()=>showHub('home'));await Q.toUserGame(p);
    await p.evaluate(()=>{const b=document.querySelector('#uniSeg [data-v="H"]');if(b)b.click();document.querySelector('.pg-uni').scrollIntoView({block:'center'})});await p.waitForTimeout(300);await shot('06-pregame');
    await p.evaluate(()=>{LG.settings.pregame=false});const kb=await p.$('#kickoff');if(kb)await kb.click();await p.waitForTimeout(2400);
    await p.evaluate(async()=>{const vis=s=>{const e=document.querySelector(s);return e&&!e.hidden};
      for(let n=0;n<3000;n++){
        if(vis('#studio')&&document.querySelector('#studioGo')){document.querySelector('#studioGo').click();await new Promise(r=>setTimeout(r,60));continue}
        if(vis('#opt')){const bs=[...document.querySelectorAll('#optRow button')];if(bs[0])bs[0].click();await new Promise(r=>setTimeout(r,60));continue}
        if(S.phase==='presnap'&&uOff()&&vis('#call'))break;
        if(S.phase==='presnap'&&!uOff()&&vis('#call')){const a=document.querySelector('[data-dc="auto"]');if(a)a.click()}
        if(S.phase==='kick'&&kick){kick.ang=0;if(kick.stage==='aim')kickTap();else if(kick.stage==='power'){kick.pow=.97;kickTap()}}
        await new Promise(r=>setTimeout(r,16));}});
    await p.evaluate(()=>{pickPlay(PLAYBOOK.find(x=>x.cat==='pass'&&!x.hail)||PLAYBOOK[0])});await p.waitForTimeout(700);
    ok(await p.evaluate(()=>{const e=athCols(S.home);return e.fin==='c'&&e.hn===3&&e.sl===2&&e.pn===3}),'game uses the custom set');
    await p.evaluate(()=>{LG.settings.zoom=1.15});await p.waitForTimeout(900);await shot('07-ingame');
    await p.evaluate(()=>{startPlay(S.pc)});await p.waitForTimeout(1300);await shot('08-ingame-play');
  }
  await p.close()}
console.log('saved to',OUT);console.log('CHECKS',fails.length?fails:'all passed');console.log('ERRORS',errs.length?errs.slice(0,15):'none');await b.close();process.exit(errs.length||fails.length?1:0)})();
