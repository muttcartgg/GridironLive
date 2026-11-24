/* =========================================================
   04f · The menus as a TV graphics package (styles: 97-broadcast.css)
   hubBackdrop  a night-game stadium painted once per team in 2D (bowl, lights, ribbon board in team colours, turf with
                the school's midfield mark), darkened, kept as a JPEG data URL and reused as the hub's backdrop.
                Nothing renders behind the menus while they are up.
   hubTicker    the bottom ticker on the hub: last week's finals (yours, ranked teams and your conference first),
                this week's ranked games, Heisman watch and the top 5
   renameCoach  the header's "Add your name" for a dynasty that started without one
   ========================================================= */
function hubBackdrop(u){
  const k=[u.id,u.c1,u.c2,u.city].join('|');if(hubBackdrop.k===k)return hubBackdrop.u;
  let url='';
  try{
    const W=720,H=440,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
    let seed=(u.id||1)*9301+49297;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#04060A');sky.addColorStop(.5,'#0A0D13');sky.addColorStop(1,'#050608');g.fillStyle=sky;g.fillRect(0,0,W,H);
    /* the bowl: a curved upper rim, the crowd as specks in the school's colours */
    const rim=x=>96-58*(1-Math.pow((x-W/2)/(W/2),2)),rail=236;
    g.fillStyle='#0F1117';g.beginPath();g.moveTo(0,rim(0));for(let x=0;x<=W;x+=24)g.lineTo(x,rim(x));g.lineTo(W,rail);g.lineTo(0,rail);g.closePath();g.fill();
    const cols=[u.c1,u.c1,u.c2||'#ffffff','#D9DCE2','#4A505C'];
    for(let i=0;i<4200;i++){const x=rnd()*W,y0=rim(x),y=y0+6+rnd()*(rail-y0-18);g.globalAlpha=.16+rnd()*.3;g.fillStyle=cols[(rnd()*cols.length)|0];g.fillRect(x,y,2.2,2.6)}
    g.globalAlpha=1;
    /* light towers and their glow */
    for(const fx of [.1,.34,.66,.9]){const x=W*fx,y=rim(x)-26,rg=g.createRadialGradient(x,y,0,x,y,190);rg.addColorStop(0,'rgba(255,247,224,.5)');rg.addColorStop(.1,'rgba(255,244,214,.16)');rg.addColorStop(1,'rgba(255,244,214,0)');g.fillStyle=rg;g.fillRect(0,0,W,H);
      g.fillStyle='rgba(255,252,240,.9)';g.fillRect(x-14,y-5,28,7)}
    /* ribbon board in team colour with the school name */
    const rb=g.createLinearGradient(0,rail-15,0,rail);rb.addColorStop(0,u.c1);rb.addColorStop(1,'#000');g.fillStyle=rb;g.globalAlpha=.85;g.fillRect(0,rail-15,W,15);g.globalAlpha=.7;
    g.fillStyle=typeof inkOn==='function'?inkOn(u.c1):'#fff';g.font='400 12px "League Gothic",sans-serif';g.textBaseline='middle';
    const word=(u.city+' '+u.name).toUpperCase()+'   ·   ';let x=-30;while(x<W){g.fillText(word,x,rail-7.5);x+=g.measureText(word).width}
    g.globalAlpha=1;
    /* turf: mowing stripes in perspective, yard lines converging, the midfield mark */
    const vx=W/2,vy=rail-150;
    for(let i=0;i<9;i++){const t0=i/9,t1=(i+1)/9,y0=rail+(H-rail)*t0*t0,y1=rail+(H-rail)*t1*t1;g.fillStyle=i%2?'#173B22':'#1B4428';g.fillRect(0,y0,W,y1-y0+1)}
    g.strokeStyle='rgba(255,255,255,.34)';g.lineWidth=1.4;
    for(let i=-6;i<=6;i++){const bx=vx+i*130;g.beginPath();g.moveTo(vx+(bx-vx)*.18,rail+2);g.lineTo(bx,H+40);g.stroke()}
    g.save();g.translate(vx,rail+(H-rail)*.62);g.scale(1,.32);g.beginPath();g.arc(0,0,74,0,Math.PI*2);g.fillStyle=u.c1;g.globalAlpha=.55;g.fill();g.lineWidth=7;g.strokeStyle=u.c2||'#fff';g.globalAlpha=.45;g.stroke();g.restore();
    g.globalAlpha=1;
    /* broadcast grade: darker toward the bottom, a team-colour wash from the left, a vignette */
    const dk=g.createLinearGradient(0,0,0,H);dk.addColorStop(0,'rgba(0,0,0,.25)');dk.addColorStop(.55,'rgba(0,0,0,.45)');dk.addColorStop(1,'rgba(0,0,0,.82)');g.fillStyle=dk;g.fillRect(0,0,W,H);
    const tw=g.createLinearGradient(0,0,W,0);tw.addColorStop(0,u.c1);tw.addColorStop(.55,'rgba(0,0,0,0)');g.globalAlpha=.32;g.fillStyle=tw;g.fillRect(0,0,W,H);g.globalAlpha=1;
    const vg=g.createRadialGradient(W/2,H*.45,H*.2,W/2,H*.45,W*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=vg;g.fillRect(0,0,W,H);
    url=c.toDataURL('image/jpeg',.8);
  }catch(e){url=''}
  hubBackdrop.k=k;hubBackdrop.u=url;return url;
}
function hubTicker(){
  const el=$('#hubTick');if(!el)return;const L=LG;
  if(!L||!L.weeks||L.rtg&&!L.weeks.length){el.hidden=true;return}
  const key=[L.season,L.week,L.phase,L.user].join('|');if(el.dataset.k===key){el.hidden=!el.querySelector('.run').childElementCount;return}el.dataset.k=key;
  const me=T(L.user),mark=t=>{const l=typeof logoHTML==='function'?logoHTML(t,16):'';return l||`<i class="dot" style="background:${t.c1}"></i>`};
  const side=(t,sc,w)=>{const r=rankOf(t.id);return `<span class="tt${w?' w':''}">${mark(t)}${r?`<sup>${r}</sup>`:''}${esc(t.abbr)}${sc!=null?` <b>${sc}</b>`:''}</span>`};
  const pri=g=>(g.h===L.user||g.a===L.user?200:0)+(rankOf(g.h)?30-rankOf(g.h):0)+(rankOf(g.a)?30-rankOf(g.a):0)+(T(g.h).conf===me.conf||T(g.a).conf===me.conf?10:0);
  const items=[],last=L.weeks[L.week-1],now=L.weeks[L.week];
  if(last)(last.games||[]).filter(g=>g.hs!=null).sort((a,b)=>pri(b)-pri(a)).slice(0,14).forEach(g=>items.push(`<span class="tk">${side(T(g.a),g.as,g.as>g.hs)}${side(T(g.h),g.hs,g.hs>g.as)}<em>Final</em></span>`));
  if(now&&L.phase!=='offseason')(now.games||[]).filter(g=>g.hs==null&&(rankOf(g.h)||rankOf(g.a)||g.h===L.user||g.a===L.user)).sort((a,b)=>pri(b)-pri(a)).slice(0,8)
    .forEach(g=>items.push(`<span class="tk">${side(T(g.a))}${side(T(g.h))}<em>${esc(KICK[g.slot]||g.slot||'Saturday')}</em></span>`));
  if(typeof BC!=='undefined'&&BC.headlines)try{items.push(...BC.headlines())}catch(e){}
  const run=el.querySelector('.run');run.innerHTML=items.join('<i class="sep"></i>');run.style.animationDuration=Math.max(36,items.length*6)+'s';el.hidden=!items.length;
}
function renameCoach(){
  openModal(`<div class="h2">Head coach</div><p class="note">Your name goes in the header, on the awards and in the coaching carousel.</p>
    <div class="field-row"><label for="cnIn">Name</label><input type="text" id="cnIn" maxlength="28" autocomplete="off" spellcheck="false" placeholder="First and last name" value="${esc(LG.coach.name==='Coach'?'':LG.coach.name||'')}"></div>
    <div class="btns"><button class="btn ghost" id="cnX">Cancel</button><button class="btn" id="cnGo">Save</button></div>`);
  on('cnX',closeModal);
  on('cnGo',()=>{const v=($('#cnIn').value||'').trim().replace(/\s+/g,' ').slice(0,28);if(v){LG.coach.name=v;saveNow(true)}closeModal();rerender()});
  setTimeout(()=>{const i=$('#cnIn');if(i)i.focus()},80);
}
