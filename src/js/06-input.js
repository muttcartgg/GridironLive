/* =========================================================
   06 · Canvas, camera transform, touch & keyboard input
   Runners and defenders use a floating joystick: put a finger down anywhere and drag.
   ========================================================= */
const cv=$('#field'),ctx=cv.getContext('2d');
let W=0,H=0,DPR=1,sc=12,topY=80,cam={x:45,y:CEN,z:1};
const scE=()=>sc*cam.z*((LG&&LG.settings&&LG.settings.zoom)||1);
const midY=()=>topY+(H-topY)/2;
const X=x=>(x-cam.x)*scE()+W/2, Y=y=>(y-cam.y)*scE()*VY+midY();
const toWorld=(sx,sy)=>[(sx-W/2)/scE()+cam.x,(sy-midY())/(scE()*VY)+cam.y];
function resize(){
  DPR=Math.min(3,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';
  const sb=$('#sb'),bottomBug=document.documentElement.dataset.bug==='bottom';
  topY=(sb.hidden||bottomBug?20:sb.getBoundingClientRect().bottom)+6;
  const av=H-topY-(bottomBug&&!sb.hidden?70:0);sc=Math.min(W/30,Math.max(av/(60*VY),W/72));if(H>W*1.2&&!(LG&&LG.settings&&LG.settings.style==='retro'))sc=Math.min(W/24,av/((FW+10)*VY));
  resizeRetro();
}
addEventListener('resize',resize);
const aimScale=()=>maxRange()/(Math.min(W,H)*.55);
function updateAim(){
  if(!touch||touch.mode!=='aim'||!play||play.thrown||S.phase!=='live'){aim=null;return}
  const k=aimScale(),mr=maxRange();let ax=(touch.sx-touch.x)*k,ay=(touch.sy-touch.y)*k/VY;const d=hyp(ax,ay);if(d>mr){ax*=mr/d;ay*=mr/d}
  const dd=Math.min(d,mr);aim={x:Q.x+ax,y:Q.y+ay,err:aimError(dd,S.bullet)*(S.lob&&!S.bullet?.9:1),bullet:S.bullet,lob:S.lob&&!S.bullet};
}
function updateStick(t){
  let dxs=t.x-t.ox,dys=t.y-t.oy,m=hyp(dxs,dys);const R0=70;
  if(m>R0){t.ox=t.x-dxs/m*R0;t.oy=t.y-dys/m*R0;dxs=t.x-t.ox;dys=t.y-t.oy;m=R0}
  const wy=dys/VY,n=hyp(dxs,wy)||1;stick={dx:dxs/n,dy:wy/n,m,ox:t.ox,oy:t.oy,x:t.x,y:t.y};
}
function defenderAt(sx,sy){const [wx,wy]=toWorld(sx,sy);let b=null,bd=2.6;for(const d of DEF){const dd=hyp(d.x-wx,(d.y-wy)*.8);if(dd<bd){bd=dd;b=d}}return b}
['touchstart','touchmove','gesturestart','contextmenu','selectstart','dblclick'].forEach(ev=>cv.addEventListener(ev,e=>{if(e.cancelable)e.preventDefault()},{passive:false}));
cv.addEventListener('pointerdown',e=>{
  ac();if(S.paused)return;
  if(S.phase==='kick'){kickTap();return}
  if(S.phase==='replay'){if(typeof teleDown==='function')teleDown(e);return}
  if(S.phase==='presnap'&&!uOff()){const d=defenderAt(e.clientX,e.clientY);if(d)switchDefender(d);return}
  if(S.phase==='presnap'&&hotRouteAt(e.clientX,e.clientY))return;
  if(S.phase!=='live'||!play)return;
  if(touch&&touch.mode==='aim'&&e.pointerId!==touch.id){S.bullet=!S.bullet;$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet));updateAim();return}
  if(touch)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const t={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,ox:e.clientX,oy:e.clientY,t0:performance.now(),moved:0};
  if(!uOff())t.mode='dstick';
  else if(play.type==='pass'&&!play.thrown&&!play.scramble&&play.carrier===Q)t.mode='aim?';
  else if(isRunner())t.mode='stick';else return;
  touch=t;
});
cv.addEventListener('pointermove',e=>{
  if(S.phase==='replay'&&typeof teleMove==='function'){teleMove(e);return}
  if(!touch||e.pointerId!==touch.id)return;
  touch.x=e.clientX;touch.y=e.clientY;touch.moved=Math.max(touch.moved,hyp(touch.x-touch.sx,touch.y-touch.sy));
  if(touch.mode==='aim?'&&touch.moved>10)touch.mode='aim';
  if(touch.mode==='aim')updateAim();
  if(touch.mode==='stick'||touch.mode==='dstick')updateStick(touch);
});
function up(e){
  if(S.phase==='replay'&&typeof teleUp==='function'){teleUp(e);return}
  if(!touch||e.pointerId!==touch.id)return;const t=touch;touch=null;stick=null;
  if(S.phase!=='live'||!play){aim=null;return}
  if(t.mode==='aim'&&aim&&!play.thrown){if(hyp(aim.x-Q.x,aim.y-Q.y)>2.5)throwBall(aim.x,aim.y,S.bullet);aim=null;return}
  if(t.mode==='aim?'&&!play.thrown){play.scramble=true;play.scrT=play.t;if(!S.conv){tstat().rushAtt++;ps(Q).ra++}hint('Scramble! Drag to steer · JUKE / SPIN / TRUCK');$('#bulletBtn').hidden=true;aim=null;hideActs();showActs();return}
  const dtm=performance.now()-t.t0,ddx=t.x-t.sx,ddy=t.y-t.sy;
  if(t.mode==='stick'&&isRunner()&&dtm<230&&t.moved>34){if(Math.abs(ddx)>Math.abs(ddy)&&ddx>0)doDive();else if(Math.abs(ddy)>=Math.abs(ddx))doJuke(Math.sign(ddy)||1)}
  if(t.mode==='dstick'&&dtm<220&&t.moved<12){const d=defenderAt(t.x,t.y);if(d&&d!==S.ctrl)switchDefender(d);else userTackle()}
}
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
/* keyboard (for testing on a computer) */
const KEYS={};
function keyStick(){const x=(KEYS.ArrowRight?1:0)-(KEYS.ArrowLeft?1:0),y=(KEYS.ArrowDown?1:0)-(KEYS.ArrowUp?1:0);if(!x&&!y){if(stick&&stick.key)stick=null;return}const n=hyp(x,y);stick={dx:x/n,dy:y/n,m:60,key:true}}
addEventListener('keydown',e=>{
  if(S.phase==='kick'&&(e.key===' '||e.key==='Enter')){e.preventDefault();kickTap();return}
  if(S.phase==='presnap'&&(e.key===' '||e.key==='Enter')&&!$('#snapBar').hidden){e.preventDefault();$('#snapGo').click();return}
  if(e.key.startsWith('Arrow')){KEYS[e.key]=true;if(S.phase==='live')keyStick()}
  if(S.phase==='live'&&play){
    if(e.key==='b'&&!play.thrown){S.bullet=!S.bullet;$('#bulletBtn').setAttribute('aria-pressed',String(S.bullet))}
    if(isRunner()&&uOff()){if(e.key==='j')doJuke(-1);if(e.key==='k')doJuke(1);if(e.key==='s')doSpin();if(e.key==='t')doTruck();if(e.key==='d')doDive();if(e.key===' '){e.preventDefault();doHurdle()}}
    if(!uOff()){if(e.key===' '){e.preventDefault();userTackle()}if(e.key==='x')switchDefender()}
  }
});
addEventListener('keyup',e=>{if(e.key.startsWith('Arrow')){KEYS[e.key]=false;keyStick()}});
