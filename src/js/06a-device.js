/* =========================================================
   06a · Device fit: which iPhone this is, its safe areas, and the camera scale (px per yard) that keeps players a
   consistent size on every phone. The iOS shell injects window.__DEVICE__ = {id:'iPhone17,1', w, h, scale, isPad,
   safe:{t,r,b,l}} (safe insets are refreshed on rotation); browsers fall back to the screen size and CSS env() insets.
   ========================================================= */
const IPHONE_IDS={'iPhone8,1':'iPhone 6s','iPhone8,2':'iPhone 6s Plus','iPhone8,4':'iPhone SE',
  'iPhone9,1':'iPhone 7','iPhone9,3':'iPhone 7','iPhone9,2':'iPhone 7 Plus','iPhone9,4':'iPhone 7 Plus',
  'iPhone10,1':'iPhone 8','iPhone10,4':'iPhone 8','iPhone10,2':'iPhone 8 Plus','iPhone10,5':'iPhone 8 Plus','iPhone10,3':'iPhone X','iPhone10,6':'iPhone X',
  'iPhone11,2':'iPhone XS','iPhone11,4':'iPhone XS Max','iPhone11,6':'iPhone XS Max','iPhone11,8':'iPhone XR',
  'iPhone12,1':'iPhone 11','iPhone12,3':'iPhone 11 Pro','iPhone12,5':'iPhone 11 Pro Max','iPhone12,8':'iPhone SE (2nd gen)',
  'iPhone13,1':'iPhone 12 mini','iPhone13,2':'iPhone 12','iPhone13,3':'iPhone 12 Pro','iPhone13,4':'iPhone 12 Pro Max',
  'iPhone14,4':'iPhone 13 mini','iPhone14,5':'iPhone 13','iPhone14,2':'iPhone 13 Pro','iPhone14,3':'iPhone 13 Pro Max','iPhone14,6':'iPhone SE (3rd gen)',
  'iPhone14,7':'iPhone 14','iPhone14,8':'iPhone 14 Plus','iPhone15,2':'iPhone 14 Pro','iPhone15,3':'iPhone 14 Pro Max',
  'iPhone15,4':'iPhone 15','iPhone15,5':'iPhone 15 Plus','iPhone16,1':'iPhone 15 Pro','iPhone16,2':'iPhone 15 Pro Max',
  'iPhone17,3':'iPhone 16','iPhone17,4':'iPhone 16 Plus','iPhone17,1':'iPhone 16 Pro','iPhone17,2':'iPhone 16 Pro Max','iPhone17,5':'iPhone 16e',
  'iPhone18,3':'iPhone 17','iPhone18,1':'iPhone 17 Pro','iPhone18,2':'iPhone 17 Pro Max','iPhone18,4':'iPhone Air'};
/* unknown identifiers (newer phones, simulators, browsers): the screen size in points, portrait */
const IPHONE_SIZES=[[375,667,'iPhone SE'],[414,736,'iPhone Plus'],[375,812,'iPhone mini'],[414,896,'iPhone 11'],[390,844,'iPhone 14'],[393,852,'iPhone 16'],
  [402,874,'iPhone 17'],[420,912,'iPhone Air'],[428,926,'iPhone 14 Plus'],[430,932,'iPhone 16 Plus'],[440,956,'iPhone 17 Pro Max']];
let DEV_CACHE=null;
function devInfo(){
  if(DEV_CACHE)return DEV_CACHE;
  const D=window.__DEVICE__||null,id=D&&typeof D.id==='string'?D.id:'';
  const sw=D&&D.w?+D.w:(screen.width||innerWidth),sh=D&&D.h?+D.h:(screen.height||innerHeight),a=Math.min(sw,sh),b=Math.max(sw,sh);
  const ios=!!D||/iPhone|iPad|iPod/.test(navigator.userAgent||''),pad=D?!!D.isPad||/^iPad/.test(id):/iPad/.test(navigator.userAgent||'');
  let name=IPHONE_IDS[id]||'',how=name?'id':'';
  if(!name&&/^iPad/.test(id)){name='iPad';how='id'}
  if(!name&&ios&&!pad){let best=null,bd=1e9;for(const s of IPHONE_SIZES){const d=Math.abs(s[0]-a)+Math.abs(s[1]-b);if(d<bd){bd=d;best=s}}if(best&&bd<=24){name=best[2];how='size'}}
  if(!name&&pad){name='iPad';how='size'}
  return DEV_CACHE={id,name,how,ios,pad,w:a,h:b,scale:D&&D.scale?+D.scale:(window.devicePixelRatio||1)};
}
/* "Optimized for iPhone 16 Pro" (or this screen's size in a browser) */
const devLabel=()=>{const d=devInfo();return d.name?d.name:`this screen (${Math.round(Math.min(innerWidth,innerHeight))}×${Math.round(Math.max(innerWidth,innerHeight))})`};
/* safe-area insets in CSS px: the shell's numbers when they match the current orientation, otherwise CSS env() */
let safeProbe=null;
function safeInsets(){
  const D=window.__DEVICE__,land=innerWidth>innerHeight;
  if(D&&D.safe&&D.w&&D.h&&(+D.w>+D.h)===land){const s=D.safe;return {t:+s.t||0,r:+s.r||0,b:+s.b||0,l:+s.l||0}}
  try{if(!safeProbe){safeProbe=document.createElement('div');safeProbe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.appendChild(safeProbe)}
    const cs=getComputedStyle(safeProbe);return {t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0}}
  catch(e){return {t:0,r:0,b:0,l:0}}
}
let SAFE={t:0,r:0,b:0,l:0};
/* Settings › Camera zoom: 'auto' (the fit itself, default) or Wide .85 / Normal 1 / Close 1.15 on top of the fit */
const zoomMul=()=>{const z=LG&&LG.settings&&LG.settings.zoom;return typeof z==='number'&&z>0?z:1};
/* The fit: a target size in points per yard (a player stands about two yards tall), bounded by how much field must show.
   Landscape: 32–40 yards across the safe width (more on bigger phones, same player size). Portrait: sideline to sideline
   top to bottom plus 20–26 yards of depth. Retro pixel art keeps its fixed grid. */
const FIT={L:{pt:22,min:32,max:40},P:{pt:17,min:20,max:26,fw:8}};
function fitScale(av,retro){
  const port=H>W*1.2;
  if(retro)return Math.min(W/30,Math.max(av/(60*VY),W/72));
  const ins=SAFE,uw=Math.max(240,W-ins.l-ins.r);
  if(port){const full=Math.max(60,av-ins.b)/((FW+FIT.P.fw)*VY);return Math.max(6,Math.min(full,clamp(FIT.P.pt,uw/FIT.P.max,uw/FIT.P.min)))}
  const mx=devInfo().pad||uw>1000?48:FIT.L.max;
  return clamp(FIT.L.pt,uw/mx,uw/FIT.L.min);
}
