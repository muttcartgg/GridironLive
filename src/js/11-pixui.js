/* ---------- Pixel UI helpers (data-style="retro"; styles in src/css/95-pixel.css) ----------
   Pixel fonts are only crisp when one font pixel covers whole device pixels. Silkscreen and Tiny5 are both
   8 pixels per em, so a crisp size is a multiple of 8/devicePixelRatio CSS px (2.667px on 3x, 4px on 2x).
   - <html data-dpr> picks the --t1..--t9 size tokens in 95-pixel.css.
   - PixUI.snap moves every other text size in the UI onto that grid (rounding up from a quarter step),
     for new DOM as it's added; leaving Pixel restores the original sizes. */
const PixUI={
  dpr(){return Math.max(1,Math.min(3,Math.round(window.devicePixelRatio||1)))},
  on(){return document.documentElement.dataset.style==='retro'},
  q:new Set(),raf:0,
  queue(n){if(n&&n.nodeType===1){this.q.add(n);if(!this.raf)this.raf=requestAnimationFrame(()=>this.flush())}},
  flush(){this.raf=0;const roots=[...this.q];this.q.clear();if(!this.on())return;const d=this.dpr();if(d<2)return;const g=8/d;
    const els=[];for(const r of roots){if(!r.isConnected)continue;els.push(r);const all=r.getElementsByTagName('*');for(let i=0;i<all.length;i++)els.push(all[i])}
    const set=[];
    for(const e of els){if(!(e instanceof HTMLElement)||e.tagName==='CANVAS'||e.tagName==='IMG'||e.tagName==='svg')continue;
      const fs=parseFloat(getComputedStyle(e).fontSize);if(!fs)continue;
      const p=e.parentElement;
      if(p&&p!==document.body&&parseFloat(getComputedStyle(p).fontSize)===fs&&!e.style.fontSize)continue;   // inherits: follows its parent
      const k=Math.max(4,Math.ceil(fs/g-.25)),t=k*g;if(Math.abs(t-fs)>.02)set.push([e,t])}
    for(const [e,t] of set){if(!('pxs' in e.dataset))e.dataset.pxs=e.style.fontSize;e.style.fontSize=t.toFixed(4)+'px'}},
  unsnap(){document.querySelectorAll('[data-pxs]').forEach(e=>{e.style.fontSize=e.dataset.pxs;delete e.dataset.pxs})},
  init(){const root=document.documentElement,app=document.getElementById('app')||document.body;
    const setD=()=>{root.dataset.dpr=String(this.dpr())};setD();addEventListener('resize',setD);
    let was=this.on();
    new MutationObserver(()=>{const now=this.on();if(now===was)return;was=now;if(now){this.queue(app);const t=document.getElementById('ctlTip');if(t)this.queue(t)}else this.unsnap()}).observe(root,{attributes:true,attributeFilter:['data-style']});
    new MutationObserver(ms=>{if(!this.on())return;for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)this.queue(n.parentElement&&n.parentElement.closest('#app')?n.parentElement:n)}).observe(document.body,{childList:true,subtree:true});
    if(was)this.queue(app)}
};
PixUI.init();
