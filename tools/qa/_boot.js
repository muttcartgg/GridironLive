/* shared helpers for the QA scripts. Usage from a script:  const Q=require('./_boot'); */
const path=require('path');
let chromium;try{({chromium}=require('playwright'))}catch(e){console.error('Run with NODE_PATH=$(npm root -g)');process.exit(1)}
const ROOT=path.resolve(__dirname,'..','..');
const pageURL=(arg)=>'file://'+path.resolve(ROOT,arg||'web/index.html');
async function launch(){return chromium.launch()}
async function newPage(b,w,h,errs,dpr){const p=await b.newPage({viewport:{width:w||844,height:h||390},deviceScaleFactor:dpr||1});
  p.on('pageerror',e=>errs.push('PAGE '+e.message+' | '+(e.stack||'').split('\n').slice(1,3).join(' | ')));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});return p}
/* start a new dynasty in slot 1 coaching `abbr` and land on the hub */
async function startDynasty(p,abbr){
  await p.waitForSelector('#slotNew-1',{timeout:15000});await p.click('#slotNew-1');await p.waitForTimeout(150);
  await p.evaluate(a=>{const t=SETUP.L.teams.find(t=>t.abbr===a)||SETUP.L.teams[0];openTeamDetail(t.id)},abbr||'UGA');await p.waitForTimeout(150);
  await p.click('#coachHere');await p.waitForTimeout(300);
  await p.evaluate(()=>{for(let i=0;i<5;i++){const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else if(typeof closeModal==='function')closeModal()}}});
}
/* advance (simming weeks) until the user has a game this week, then open the pregame screen */
async function toUserGame(p){
  for(let i=0;i<20;i++){
    const st=await p.evaluate(()=>{const m=document.querySelector('#modal');if(m&&!m.hidden){const o=document.querySelector('#evo-0');if(o)o.click();const x=document.querySelector('#evX');if(x)x.click();else closeModal();return 'modal'}
      if(document.querySelector('#playGame'))return 'game';const a=document.querySelector('#advWeek');if(a){a.click();return 'adv'}return 'none'});
    if(st==='game')break;await p.waitForTimeout(80);
  }
  await p.click('#playGame');await p.waitForTimeout(250);
}
module.exports={launch,newPage,startDynasty,toUserGame,pageURL,ROOT};
