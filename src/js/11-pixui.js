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
  /* Larger text (html.bigtext) in Pixel: instead of the ×1.14 zoom, every size in these surfaces goes up one crisp step */
  BIG:'.screen,.modal,.sheet,#rcard,#hint',
  flush(){this.raf=0;const roots=[...this.q];this.q.clear();if(!this.on())return;const d=this.dpr();if(d<2)return;
    const g=8/d,big=document.documentElement.classList.contains('bigtext');
    const els=[];for(const r of roots){if(!r.isConnected)continue;els.push(r);const all=r.getElementsByTagName('*');for(let i=0;i<all.length;i++)els.push(all[i])}
    const size=e=>parseFloat(getComputedStyle(e).fontSize),step=(e,fs)=>(Math.max(4,Math.ceil(fs/g-.25))+(big&&e.closest(this.BIG)?1:0))*g;
    const put=(e,t)=>{if(!('pxs' in e.dataset))e.dataset.pxs=e.style.fontSize;e.style.fontSize=t.toFixed(4)+'px'};
    const set=[],inh=[];
    for(const e of els){if(!(e instanceof HTMLElement)||e.tagName==='CANVAS'||e.tagName==='IMG'||'pxs' in e.dataset)continue;   // snapped once: never stepped twice
      const fs=size(e);if(!fs)continue;const p=e.parentElement;
      if(p&&p!==document.body&&size(p)===fs&&!e.style.fontSize&&!(big&&e.matches(this.BIG))){inh.push([e,fs]);continue}   // same size as its parent: usually inherited (re-checked below)
      const t=step(e,fs);if(Math.abs(t-fs)>.02)set.push([e,t])}
    for(const [e,t] of set)put(e,t);
    /* a size that didn't follow its parent's new size was declared, not inherited: snap / step it as well.
       Checked one tree level at a time (reads, then writes) so a page costs a few style recalcs, not one per element. */
    if(set.length&&inh.length){const lv=new Map(),depth=e=>{let n=0;for(let x=e;x;x=x.parentElement)n++;return n};
      for(const it of inh){const k=depth(it[0]);if(!lv.has(k))lv.set(k,[]);lv.get(k).push(it)}
      for(const k of [...lv.keys()].sort((a,b)=>a-b)){const w=[];
        for(const [e,fs] of lv.get(k)){if(size(e)!==fs||size(e.parentElement)===fs)continue;const t=step(e,fs);if(Math.abs(t-fs)>.02)w.push([e,t])}
        for(const [e,t] of w)put(e,t)}}},
  unsnap(){document.querySelectorAll('[data-pxs]').forEach(e=>{e.style.fontSize=e.dataset.pxs;delete e.dataset.pxs})},
  init(){const root=document.documentElement,app=document.getElementById('app')||document.body;
    const setD=()=>{root.dataset.dpr=String(this.dpr())};setD();addEventListener('resize',setD);
    let was=this.on(),wb=root.classList.contains('bigtext');
    new MutationObserver(()=>{const now=this.on(),nb=root.classList.contains('bigtext');if(now===was&&nb===wb)return;
      const re=now&&was;was=now;wb=nb;
      if(now){if(re)this.unsnap();this.queue(app);const t=document.getElementById('ctlTip');if(t)this.queue(t)}else this.unsnap()}).observe(root,{attributes:true,attributeFilter:['data-style','class']});
    new MutationObserver(ms=>{if(!this.on())return;for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)this.queue(n.parentElement&&n.parentElement.closest('#app')?n.parentElement:n)}).observe(document.body,{childList:true,subtree:true});
    if(was)this.queue(app)}
};
PixUI.init();
