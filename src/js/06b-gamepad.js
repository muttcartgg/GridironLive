/* =========================================================
   06b · Bluetooth controllers (Xbox, PlayStation, MFi). Polled once per frame (09-main) from the Web Gamepad API; the
   iOS shell also forwards GCController state as window.__NATIVE_PAD__ = {b:[17 buttons, standard order], a:[lx,ly,rx,ry]},
   used only when the web API shows no pad (so a controller never counts twice).
   Left stick moves the runner / defender (like the floating joystick). A snap / select / tackle / hurdle, B juke / switch /
   back, X spin / bullet, Y truck / lob, RB / LB pick the target receiver (A throws, a right-stick flick throws that way),
   Start pauses, the d-pad moves a focus ring through the play-call sheet and every menu.
   ========================================================= */
const PB={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,SEL:8,START:9,UP:12,DOWN:13,LEFT:14,RIGHT:15};
const PAD={on:false,prev:[],target:null,focus:null,layer:null,used:0,flick:false,jd:1,rep:0,repT:0};
function padState(){
  let gp=null;try{const l=navigator.getGamepads?navigator.getGamepads():[];for(const g of l||[])if(g&&g.connected!==false&&g.buttons&&g.buttons.length){gp=g;break}}catch(e){}
  if(gp)return {b:Array.from({length:17},(_,i)=>{const x=gp.buttons[i];return x&&(x.pressed||x.value>.5)?1:0}),a:[0,1,2,3].map(i=>+gp.axes[i]||0)};
  const n=window.__NATIVE_PAD__;if(n&&Array.isArray(n.b))return {b:n.b.map(v=>v?1:0),a:Array.isArray(n.a)?n.a.map(v=>+v||0):[0,0,0,0]};
  return null;
}
const PAD_LAYERS=['#modal','#pausem','#celebSheet','#opt','#adjMenu','#call','#snapBar','#card','#post','#studio','#hub','#setup'];
const padVis=e=>!!e&&!e.hidden&&e.getClientRects().length>0;
function padLayer(){for(const s of PAD_LAYERS){const e=$(s);if(padVis(e))return e}return null}
function padEls(L){return [...L.querySelectorAll('button,select,input[type=text],input[type=search],[data-pid],.tp')].filter(e=>!e.disabled&&!e.closest('[hidden]')&&(e.offsetWidth||e.offsetHeight))}
function padFocus(e){if(PAD.focus)PAD.focus.classList.remove('padfocus');PAD.focus=e||null;if(e){e.classList.add('padfocus');try{e.scrollIntoView({block:'nearest',inline:'nearest'})}catch(_){}}}
/* the button a menu should start on */
function padDefault(L){const pref={'call':'#callRow .cp,#callRow [data-coach],#callRow [data-dc]','snapBar':'#snapGo','pausem':'#resume','opt':'#optRow button','post':'#postGo'}[L.id];
  const els=padEls(L);if(pref){const e=L.querySelector(pref);if(e&&els.includes(e))return e}return els[0]||null}
/* d-pad: the nearest button in that direction (straight lines favoured), dir 0 up 1 down 2 left 3 right */
function padMove(dir){
  const L=padLayer();if(!L)return;const els=padEls(L);if(!els.length)return;
  const cur=PAD.focus&&els.includes(PAD.focus)?PAD.focus:null;if(!cur)return padFocus(padDefault(L));
  const r=cur.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bs=1e9;
  for(const e of els){if(e===cur)continue;const q=e.getBoundingClientRect(),dx=q.left+q.width/2-cx,dy=q.top+q.height/2-cy;
    const main=dir===0?-dy:dir===1?dy:dir===2?-dx:dx,off=dir<2?Math.abs(dx):Math.abs(dy);if(main<=4)continue;const s=main+off*2.2;if(s<bs){bs=s;best=e}}
  if(best)padFocus(best);
}
/* eligible receivers for the QB, top of the screen to the bottom */
const padRecs=()=>OFF.filter(o=>eligible(o)&&!o.blocker&&o!==Q).sort((a,b)=>a.y-b.y);
const padQB=()=>!!(play&&uOff()&&S.phase==='live'&&!play.st&&play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q&&!!Q);
function padOpen(){let best=null,bs=-1;for(const r of padRecs()){const [,dd]=nearest(DEF,r.x,r.y);if(dd>bs){bs=dd;best=r}}return best}
function padThrow(r){
  if(!r||!padQB())return;const bullet=!!S.bullet,lob=!!S.lob&&!bullet,thr=Q.pl.thr;let tx=r.x,ty=r.y,T=flightT(hyp(r.x-Q.x,r.y-Q.y),bullet,lob,thr);
  for(let i=0;i<2;i++){tx=r.x+(r.vx||0)*T*.92;ty=r.y+(r.vy||0)*T*.92;T=flightT(hyp(tx-Q.x,ty-Q.y),bullet,lob,thr)}
  const mr=maxRange(),d=hyp(tx-Q.x,ty-Q.y);if(d>mr){tx=Q.x+(tx-Q.x)*mr/d;ty=Q.y+(ty-Q.y)*mr/d}
  PAD.target=null;throwBall(Math.min(tx,119),clamp(ty,.8,FW-.8),bullet,r,lob);
}
function padScramble(){if(!padQB())return;play.scramble=true;play.scrT=play.t;if(!S.conv){tstat().rushAtt++;ps(Q).ra++}$('#bulletBtn').hidden=true;aim=null;hideActs();showActs()}
function padCycle(d){const l=padRecs();if(!l.length)return;let i=l.indexOf(PAD.target);i=i<0?(d>0?0:l.length-1):(i+d+l.length)%l.length;PAD.target=l[i];try{haptic('light')}catch(e){}}
function padPoll(){
  const st=padState();
  if(!st){if(PAD.on){PAD.on=false;padFocus(null);PAD.layer=null;if(stick&&stick.pad)stick=null}return}
  if(!PAD.on){PAD.on=true;PAD.prev=st.b.slice();try{toast('Controller connected')}catch(e){}}
  const b=st.b,pr=PAD.prev,dn=i=>!!b[i]&&!pr[i],now=performance.now();PAD.prev=b.slice();
  const [lx,ly,rx,ry]=st.a,lm=hyp(lx,ly),rm=hyp(rx,ry);
  if(b.some(v=>v)||lm>.3||rm>.3)PAD.used=now;
  if(dn(PB.START)){if(S.paused&&padVis($('#pausem')))$('#resume').click();else if(padVis($('#pauseBtn')))$('#pauseBtn').click();return}
  /* menus: whichever layer is on top gets the d-pad (held directions repeat), A clicks, B backs out */
  const L=(S.phase==='live'&&!S.paused)?null:padLayer();
  if(L!==PAD.layer){PAD.layer=L;padFocus(L&&now-PAD.used<60000?padDefault(L):null)}
  if(L){
    const dirs=[PB.UP,PB.DOWN,PB.LEFT,PB.RIGHT];let held=-1;dirs.forEach((k,i)=>{if(b[k])held=i});
    if(held<0&&lm>.6&&!(S.phase==='presnap'&&!uOff()))held=Math.abs(ly)>Math.abs(lx)?(ly<0?0:1):(lx<0?2:3);
    if(held>=0){if(held!==PAD.rep){PAD.rep=held;PAD.repT=now+380;padMove(held)}else if(now>PAD.repT){PAD.repT=now+130;padMove(held)}}else PAD.rep=-1;
    if(dn(PB.A)){if(PAD.focus&&PAD.focus.isConnected&&padVis(L)){const f=PAD.focus;f.click();if(f.matches('input'))f.focus()}else padFocus(padDefault(L))}
    if(dn(PB.B)){if(L.id==='modal')closeModal();else if(L.id==='snapBar'||L.id==='adjMenu')$('#snapBack').click();else if(L.id==='hub'&&typeof TAB!=='undefined'&&TAB!=='home')showHub('home')}
    if(L.id==='call'&&(dn(PB.LB)||dn(PB.RB))){const t=[...document.querySelectorAll('#callRow [data-tab]')],i=t.findIndex(x=>x.getAttribute('aria-pressed')==='true');const n=t[(i+(dn(PB.RB)?1:t.length-1))%t.length];if(n){n.click();padFocus(padDefault($('#call')))}}
    if(L.id==='snapBar'&&dn(PB.Y))$('#snapAdj').click();
    return;   // a press a menu used (A on SNAP) must not also act in the play it starts
  }
  if(S.paused)return;
  if(S.phase==='kick'&&dn(PB.A)){kickTap();return}
  if(S.phase==='presnap'&&!uOff()&&dn(PB.B)&&!padVis($('#call')))switchDefender();
  /* live play: left stick = joystick (unless a finger is on the field) */
  if(S.phase==='live'&&play&&!touch){
    if(lm>.22){const m=Math.min(1,(lm-.22)/.7),wy=ly/VY,n=hyp(lx,wy)||1;stick={dx:lx/n,dy:wy/n,m:14+56*m,pad:true}}else if(stick&&stick.pad)stick=null;
  }else if(stick&&stick.pad&&S.phase!=='live')stick=null;
  if(S.phase!=='live'||!play)return;
  if(padQB()){
    if(PAD.target&&(!OFF.includes(PAD.target)||PAD.target.blocker))PAD.target=null;
    if(dn(PB.RB))padCycle(1);if(dn(PB.LB))padCycle(-1);
    if(dn(PB.X)||dn(PB.Y)){if(dn(PB.X)){S.bullet=!S.bullet;S.lob=false}else{S.lob=!S.lob;S.bullet=false}$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet));showActs()}
    if(dn(PB.A))padThrow(PAD.target||padOpen());
    else if(rm>.75&&!PAD.flick){PAD.flick=true;const ang=Math.atan2(ry,rx);let best=null,bs=1e9;
      for(const r of padRecs()){const a=Math.atan2((r.y-Q.y)*VY,r.x-Q.x);let d=Math.abs(a-ang);if(d>Math.PI)d=2*Math.PI-d;if(d<bs){bs=d;best=r}}if(best&&bs<1.1)padThrow(best)}
    else if(dn(PB.B))padScramble();
    if(rm<.4)PAD.flick=false;return}
  PAD.target=null;
  if(!uOff()||(play.st&&!isRunner())){if(dn(PB.A)||dn(PB.RT))userTackle();if(dn(PB.B)||dn(PB.LB))switchDefender();return}
  if(isRunner()){
    if(dn(PB.B)){const d=ly<-.3?-1:ly>.3?1:(PAD.jd=-PAD.jd);doJuke(d)}
    if(dn(PB.X))doSpin();if(dn(PB.Y))doTruck();if(dn(PB.A))doHurdle();if(dn(PB.RB)||dn(PB.RT))doDive();
    if(dn(PB.LB)&&play.pitchMan&&!play.pitched&&typeof doPitch==='function'){doPitch();showActs()}
  }
}
/* the receiver RB / LB picked: a gold ring under him while the QB holds the ball */
function padDraw(c){
  const t=PAD.target;if(!PAD.on||!t||!padQB())return;const x=X(t.x),y=Y(t.y),r=scE()*1.15;
  c.save();c.strokeStyle='#FFD23F';c.lineWidth=3;c.globalAlpha=.9;c.beginPath();c.ellipse(x,y,r,r*VY,0,0,6.283);c.stroke();c.restore();
}
