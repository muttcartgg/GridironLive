/* =========================================================
   10c · Uniform & team builder: four uniform sets per team (Home, Away, Alternate, Throwback), game-day
   rotation, a live preview, a badge designer, stadium style, create-a-school and share codes.
   Everything is drawn from shapes, letters and colors the user picks: never a real logo or trademarked uniform.
   Storage (every key optional; missing → the generated look from the team colors, so old saves load as before):
     t.uni  = {H:{..},A:{..},L:{..},T:{..}  only the fields that differ from the generated set
               rot:{hm,rd,rv,pt,po}  set for home / road / rivalry / primetime / postseason ('' = no override)
               ask:1  pick before each game in the pregame show}
       set fields: h helmet · hf finish m|g|c · m facemask · d decal L(etter) N(umber) S(tar) B(olt) M(onogram shield)
                   G(imported logo) X(none) · dc decal color · hs helmet stripes 0-3 · hc stripe color · j jersey ·
                   n numbers · no number outline ('' auto) · sl sleeve stripes 0-3 · sc sleeve stripe color · p pants ·
                   ps pants stripes 0-3 · pc pants stripe color · k socks
     t.bdg  = {sh shield|circle|diamond|hex, tx letters, bg, rim, fg, dec none|stars|stripe|stripes|ring, dc}
     t.stad = {s1,s2 seat colors, ez solid|diag|check end zones, turf color ('' natural), mid 0 hides the midfield badge}
   uniStyle / uniColors (10-features) pick the set for a game and run the clash check; 08d draws it.
   ========================================================= */
const UNI_SETS=[['H','Home'],['A','Away'],['L','Alternate'],['T','Throwback']],UNI_IDS=['H','A','L','T'];
const UNI_KEYS=['h','hf','m','d','dc','hs','hc','j','n','no','sl','sc','p','ps','pc','k'];
const UNI_ROT0={hm:'H',rd:'A',rv:'',pt:'',po:''},UNI_LEGACY={color:'H',white:'A',alt:'L',rush:'T'};
let UNI_VER=1;   /* bumped on every uniform / badge / stadium change: the player, field and stadium caches compare it */
const uniHex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toUpperCase():null;
const uniRot=t=>Object.assign({},UNI_ROT0,t&&t.uni&&t.uni.rot);
/* one generated set: trims follow the old look (numbers / stripes contrast with what they sit on) */
function uniMk(t,j,tr,p,h,k,m,x){
  const c1=t.c1||'#33415E',c2=t.c2||'#FFFFFF',n=contrasty(tr,j)?tr:inkOn(j),hc=contrasty(tr,h)?tr:contrasty(c2,h)?c2:inkOn(h),pc=contrasty(tr,p)?tr:contrasty(c1,p)?c1:inkOn(p);
  const id=t.id|0,dk=id%5,d=typeof teamLogoURL==='function'&&teamLogoURL(t)?'G':dk===3?'S':dk===4?'B':'L';
  return Object.assign({h,hf:id%3===0?'m':'g',m,d,dc:hc,hs:1,hc,j,n,no:'',sl:0,sc:n,p,ps:1,pc,k},x);
}
function uniGen(t){
  const c1=t.c1||'#33415E',c2=t.c2||'#FFFFFF',ct=contrasty(c1,c2),rj=lum(c2)>.85?shade(c1,-.35):c2;
  return {H:uniMk(t,c1,ct?c2:'#FFFFFF',ct?c2:'#E6E6E6',c1,ct?c2:'#FFFFFF','#C7CCD4'),
    A:uniMk(t,'#F1F2F4',c1,'#D7DAE0',c1,c1,'#C7CCD4'),
    L:uniMk(t,'#17191F',c1,'#17191F','#17191F','#17191F',c1),
    T:uniMk(t,rj,c1,'#EDE6D6',rj,c1,'#C7CCD4',{hf:'m',d:'N',sl:3,ps:2})};
}
/* the resolved set k for team t (stored edits over the generated look) + the old field names (t trim, s socks, mask) */
const uniAl=s=>{s.t=s.n;s.s=s.k;s.mask=s.m;return s};
function uniSet(t,k){const g=uniGen(t),s=g[k]||g.H,o=t&&t.uni&&t.uni[k];if(o)for(const f of UNI_KEYS)if(o[f]!=null)s[f]=o[f];s.set=k;return uniAl(s)}
function uniClean(f,v){
  if(f==='hf')return ['m','g','c'].includes(v)?v:null;
  if(f==='d')return typeof v==='string'&&v.length===1&&'LNSBMGX'.includes(v)?v:null;
  if(f==='hs'||f==='sl'||f==='ps'){v=+v;return v>=0&&v<=3?v|0:null}
  if(f==='no'&&v==='')return '';
  return uniHex(v);
}
/* uniColors cached per team for the current matchup / pick / edits (retro sprites ask every frame) */
const UNI_CC=new Map();
function uniColorsC(team){const o=team===S.home?S.away:S.home,k=uniStyle(team)+UNI_VER+'|'+(o?o.id:'')+'|'+hostT().id+(S.game?S.game.uni:'')+team.c1+team.c2;let e=UNI_CC.get(team);if(e&&e.k===k)return e.u;const u=uniColors(team);UNI_CC.set(team,{k,u});return u}
const uniArr=U=>UNI_KEYS.map(f=>U[f]);
function uniFromArr(a){if(!Array.isArray(a))return null;const o={};UNI_KEYS.forEach((f,i)=>{const v=uniClean(f,a[i]);if(v!=null)o[f]=v});return Object.keys(o).length?o:null}
function uniRotClean(r){const o={};if(r&&typeof r==='object')for(const k in UNI_ROT0){const v=r[k];if(v===''&&(k!=='hm'&&k!=='rd'))o[k]='';else if(UNI_IDS.includes(v))o[k]=v}return o}
/* store only what differs from the generated look */
function uniCommit(t,sets,rot,ask){
  const gen=uniGen(t),u={};
  for(const k of UNI_IDS){const d={};for(const f of UNI_KEYS){const a=sets[k][f],b=gen[k][f];if(String(a).toUpperCase()!==String(b).toUpperCase())d[f]=a}if(Object.keys(d).length)u[k]=d}
  const r={};for(const x in UNI_ROT0)if(rot[x]!==UNI_ROT0[x])r[x]=rot[x];if(Object.keys(r).length)u.rot=r;if(ask)u.ask=1;
  if(Object.keys(u).length)t.uni=u;else delete t.uni;UNI_VER++;
}

/* ---------- share codes (LZString, like save codes) ---------- */
const uniEnc=(tag,o)=>tag+':'+LZString.compressToEncodedURIComponent(JSON.stringify(o));
function uniDec(code){const m=/^(GLU1|GLS1):(.+)$/.exec(String(code||'').trim().replace(/\s+/g,''));if(!m)return null;
  try{const o=JSON.parse(LZString.decompressFromEncodedURIComponent(m[2]));return o?{kind:m[1],o}:null}catch(e){return null}}
const uniStr=(v,n)=>String(v==null?'':v).replace(/[<>]/g,'').trim().slice(0,n);
function schoolCode(t){return uniEnc('GLS1',{c:t.city,n:t.name,a:t.abbr,c1:t.c1,c2:t.c2,st:t.stadium,b:t.bdg||null,s:t.stad||null,u:Object.fromEntries(UNI_IDS.map(k=>[k,uniArr(uniSet(t,k))])),r:t.uni&&t.uni.rot||null,k:t.uni&&t.uni.ask?1:0})}
function schoolFromCode(o){
  if(!o||typeof o!=='object')return null;const c1=uniHex(o.c1),c2=uniHex(o.c2);if(!c1||!c2||!uniStr(o.c,22))return null;
  const sets={};if(o.u&&typeof o.u==='object')for(const k of UNI_IDS){const s=uniFromArr(o.u[k]);if(s)sets[k]=s}
  return {city:uniStr(o.c,22),name:uniStr(o.n,16)||'Tigers',abbr:uniStr(o.a,4).toUpperCase()||uniStr(o.c,3).toUpperCase(),c1,c2,stadium:uniStr(o.st,30),bdg:bdgClean(o.b),stad:stadClean(o.s),sets,rot:uniRotClean(o.r),ask:!!o.k};
}

/* ---------- badge designer: an original generated mark (shape + letters + stars / stripes) ---------- */
const BDG_SH=[['shield','Shield'],['circle','Circle'],['diamond','Diamond'],['hex','Hexagon']],BDG_DEC=[['none','None'],['stars','Stars'],['stripe','Stripe'],['stripes','Pinstripes'],['ring','Ring']];
function bdgClean(b){if(!b||typeof b!=='object')return null;const o={};
  if(BDG_SH.some(([k])=>k===b.sh))o.sh=b.sh;if(BDG_DEC.some(([k])=>k===b.dec))o.dec=b.dec;if(b.tx!=null)o.tx=uniStr(b.tx,4).toUpperCase().replace(/[^A-Z0-9&]/g,'');
  for(const k of ['bg','rim','fg','dc']){const v=uniHex(b[k]);if(v)o[k]=v}return o}
function bdgOf(t){const b=t.bdg||{},c1=t.c1||'#33415E',c2=t.c2||'#FFFFFF',ink=contrasty(c1,c2)?c2:inkOn(c1);
  return {sh:b.sh||'shield',tx:(b.tx!=null&&b.tx!==''?b.tx:String(t.abbr||'').toUpperCase()).slice(0,4),bg:b.bg||c1,rim:b.rim||c2,fg:b.fg||ink,dec:b.dec||'stars',dc:b.dc||ink}}
/* path of a badge shape in a w × 1.1w box, scaled k around its center */
function bdgPath(g,sh,w,k){const cx=w*.5,cy=w*.55,P=(x,y)=>[cx+(x*w-cx)*k,cy+(y*w-cy)*k];g.beginPath();
  if(sh==='circle'){g.arc(cx,cy,w*.47*k,0,TAU2);return}
  if(sh==='diamond'){for(const [x,y] of [[.5,.03],[.97,.55],[.5,1.07],[.03,.55]])g.lineTo(...P(x,y));g.closePath();return}
  if(sh==='hex'){for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;g.lineTo(...P(.5+Math.cos(a)*.48,.55+Math.sin(a)*.5))}g.closePath();return}
  g.moveTo(...P(.07,.1));g.quadraticCurveTo(...P(.5,-.01),...P(.93,.1));g.lineTo(...P(.93,.56));g.quadraticCurveTo(...P(.91,.93),...P(.5,1.08));g.quadraticCurveTo(...P(.09,.93),...P(.07,.56));g.closePath();
}
function bdgPaint(g,b,w,txt){
  const sh=b.sh,cy=sh==='shield'?.6:.57;g.save();g.lineJoin='round';
  bdgPath(g,sh,w,1);g.fillStyle=b.rim;g.fill();
  bdgPath(g,sh,w,.84);g.fillStyle=b.bg;g.fill();g.save();g.clip();
  g.fillStyle=b.dc;g.strokeStyle=b.dc;
  if(b.dec==='stars')for(const [x,y] of sh==='shield'?[[.3,.26],[.5,.21],[.7,.26]]:[[.32,.3],[.5,.24],[.68,.3]])starPath(g,x*w,y*w,w*.06);
  else if(b.dec==='stripe'){g.globalAlpha=.9;g.fillRect(w*.44,0,w*.12,w*1.1)}
  else if(b.dec==='stripes'){g.globalAlpha=.85;g.fillRect(w*.27,0,w*.05,w*1.1);g.fillRect(w*.68,0,w*.05,w*1.1)}
  else if(b.dec==='ring'){g.lineWidth=w*.035;bdgPath(g,sh,w,.68);g.stroke()}
  g.globalAlpha=1;
  const gr=g.createLinearGradient(0,0,0,w*.7);gr.addColorStop(0,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,w*.6);g.restore();
  const s=txt!=null?txt:b.tx,n=s.length||1;let fs=w*(n<=1?.5:n===2?.42:n===3?.32:.26);g.font=`italic 900 ${fs}px ${FFONT}`;const mw=g.measureText(s).width,mx=w*.64;if(mw>mx){fs*=mx/mw;g.font=`italic 900 ${fs}px ${FFONT}`}
  g.textAlign='center';g.textBaseline='middle';g.lineWidth=fs*.12;g.strokeStyle=lum(b.fg)>.5?shade(b.bg,-.6):'rgba(255,255,255,.9)';
  const y=w*(cy+(b.dec==='stars'?.05:0));if(s){g.strokeText(s,w*.5,y);g.fillStyle=b.fg;g.fillText(s,w*.5,y)}
  g.restore();
}
const BDG_CV=new Map();
/* cached canvas (w × 1.1w) of a team's badge; mono: one or two letters (helmet decal size) */
function bdgCanvas(t,w,mono){const b=bdgOf(t),tx=mono?(b.tx.length>2&&typeof monoOf==='function'?monoOf(t):b.tx.slice(0,2)):b.tx,k=JSON.stringify(b)+w+tx;let cv=BDG_CV.get(k);if(cv)return cv;
  if(BDG_CV.size>48)BDG_CV.clear();cv=document.createElement('canvas');cv.width=w;cv.height=Math.ceil(w*1.1);bdgPaint(cv.getContext('2d'),b,w,tx);BDG_CV.set(k,cv);return cv}
const BDG_URL=new Map();
/* object URL of the badge picture for the HTML badge() (short URLs keep long lists light) */
function bdgURL(t){const k=JSON.stringify(bdgOf(t));let u=BDG_URL.get(k);if(u)return u;
  try{const d=bdgCanvas(t,120).toDataURL('image/png'),bin=atob(d.split(',')[1]),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);u=URL.createObjectURL(new Blob([a],{type:'image/png'}))}catch(e){u=bdgCanvas(t,120).toDataURL()}
  if(BDG_URL.size>60){for(const v of BDG_URL.values())if(String(v).startsWith('blob:'))try{URL.revokeObjectURL(v)}catch(_){}BDG_URL.clear()}BDG_URL.set(k,u);return u}

/* ---------- stadium style ---------- */
const STAD_EZ=[['solid','Solid'],['diag','Stripes'],['check','Checker']];
function stadClean(s){if(!s||typeof s!=='object')return null;const o={};for(const k of ['s1','s2','turf']){const v=uniHex(s[k]);if(v)o[k]=v}if(STAD_EZ.some(([k])=>k===s.ez))o.ez=s.ez;if(s.mid===0)o.mid=0;return o}
const stadOf=t=>(t&&t.stad)||{};

/* ---------- preview renderer: a front / back view that turns, plus the in-game helmet in profile ---------- */
const UNI_SKIN='#B98457';
function uniFig(g,U,team,cx,base,s,th,num){
  const co=Math.cos(th),sx=Math.max(.05,Math.abs(co)),back=co<0,gl=lum(U.j)>.8?team.c1:contrasty(U.n,U.j)?U.n:inkOn(U.j);
  const poly=(a,col)=>{g.fillStyle=col;g.beginPath();for(let i=0;i<a.length;i+=2)g.lineTo(a[i],a[i+1]);g.closePath();g.fill()};
  const rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)},ell=(x,y,rx,ry,col)=>{g.fillStyle=col;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU2);g.fill()};
  const lp=(P,Q,t)=>[P[0]+(Q[0]-P[0])*t,P[1]+(Q[1]-P[1])*t];
  g.save();g.translate(cx,base);ell(0,0,s*.21,s*.03,'rgba(0,0,0,.3)');g.scale(sx*s,s);
  rect(-.118,-.255,.078,.24,U.k);rect(.04,-.255,.078,.24,U.k);rect(-.118,-.255,.078,.03,shade(U.k,-.18));rect(.04,-.255,.078,.03,shade(U.k,-.18));
  ell(-.08,-.014,.056,.022,'#14161b');ell(.08,-.014,.056,.022,'#14161b');
  poly([-.155,-.5,.155,-.5,.162,-.238,.03,-.238,0,-.34,-.03,-.238,-.162,-.238],U.p);rect(-.155,-.507,.31,.022,shade(U.p,-.3));
  for(let i=0;i<(U.ps|0);i++){const o=.008+i*.02;rect(-.16+o,-.485,.011,.245,U.pc);rect(.149-o,-.485,.011,.245,U.pc)}
  g.lineCap='round';for(const d of [-1,1]){g.strokeStyle=UNI_SKIN;g.lineWidth=.05;g.beginPath();g.moveTo(d*.272,-.66);g.lineTo(d*.292,-.5);g.stroke();ell(d*.294,-.477,.034,.037,gl)}
  for(const d of [-1,1]){const A=[d*.19,-.818],B=[d*.31,-.7],C=[d*.265,-.624],D=[d*.168,-.703];poly([...A,...B,...C,...D],U.j);
    for(let i=0;i<(U.sl|0);i++){const t0=.52+i*.15,t1=t0+.085;poly([...lp(A,B,t0),...lp(A,B,t1),...lp(D,C,t1),...lp(D,C,t0)],U.sc)}}
  poly([-.2,-.818,.2,-.818,.152,-.49,-.152,-.49],U.j);ell(0,-.812,.214,.042,U.j);poly([.07,-.83,.2,-.818,.152,-.49,.06,-.49],'rgba(0,0,0,.12)');
  if(!back){rect(-.036,-.88,.072,.075,UNI_SKIN);poly([-.055,-.836,.055,-.836,0,-.79],shade(U.j,-.32))}else rect(-.04,-.875,.08,.06,UNI_SKIN);
  {g.save();g.scale(1/s,1/s);const t=String(num==null?'':num),fs=(back?.2:.14)*s;g.font=`900 ${fs}px ${FFONT}`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=fs*.14;
    g.strokeStyle=U.no||(lum(U.n)>.55?'rgba(0,0,0,.55)':'rgba(255,255,255,.65)');const y=(back?-.665:-.655)*s;g.strokeText(t,0,y);g.fillStyle=U.n;g.fillText(t,0,y);g.restore()}
  g.save();g.beginPath();g.ellipse(0,-.935,.098,.106,0,0,TAU2);g.fillStyle=U.h;g.fill();g.clip();
  const hs=U.hs|0;if(hs===1)rect(-.019,-1.05,.038,.26,U.hc);else if(hs===2){rect(-.036,-1.05,.017,.26,U.hc);rect(.019,-1.05,.017,.26,U.hc)}else if(hs===3){rect(-.013,-1.05,.026,.26,U.hc);rect(-.045,-1.05,.01,.26,U.hc);rect(.035,-1.05,.01,.26,U.hc)}
  if(U.hf==='c'){ell(-.02,-.975,.085,.03,'rgba(255,255,255,.42)');ell(.01,-.875,.09,.024,'rgba(0,0,0,.22)')}
  ell(-.035,-.99,.036,.02,`rgba(255,255,255,${U.hf==='m'?.14:U.hf==='c'?.85:.48})`);rect(-.11,-.86,.22,.04,'rgba(0,0,0,.18)');g.restore();
  if(!back){ell(0,-.893,.052,.05,UNI_SKIN);g.strokeStyle=U.m;g.lineWidth=.012;g.beginPath();g.moveTo(-.066,-.905);g.lineTo(.066,-.905);g.moveTo(-.058,-.872);g.lineTo(.058,-.872);g.moveTo(0,-.93);g.lineTo(0,-.85);g.moveTo(-.066,-.905);g.lineTo(-.05,-.85);g.lineTo(.05,-.85);g.lineTo(.066,-.905);g.stroke()}
  g.restore();
}
function uniHelmetSide(g,U,team,x,y,r,num,e){const sv=ATH.glow;e=e||athMake(team,U,h=>h);ATH.glow='';ATJ.nx=x;ATJ.ny=y;g.lineCap='round';g.lineJoin='round';
  try{athHelmet(g,r/.138,e,UNI_SKIN,team,false,1,num)}finally{ATH.glow=sv}}
/* still picture of a set (thumbnails): front view + helmet */
function uniThumb(cv,team,U,num){if(!cv)return;const dpr=Math.min(3,window.devicePixelRatio||1),w=cv.clientWidth||cv.width,h=cv.clientHeight||cv.height;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);uniFig(g,U,team,w*.36,h*.95,h*.88,.35,num);uniHelmetSide(g,U,team,w*.76,h*.3,Math.min(w*.17,h*.2),num)}
const uniNum=t=>{const q=(t.roster||[]).filter(p=>p.pos==='QB').sort((a,b)=>(b.ovr||0)-(a.ovr||0))[0];return q&&q.num!=null?q.num:7};

/* ---------- touch controls: swatches + segmented buttons ---------- */
const UNI_PAL=['#FFFFFF','#F1F2F4','#17191F','#6B7280','#C7CCD4','#C9A227','#EDE6D6'];
const SCHOOL_PAL=['#9E1B32','#BA0C2F','#E35205','#F2C230','#FFC72C','#154733','#00843D','#002855','#0033A0','#4B9CD3','#4F2683','#6A1B9A','#5B2C14','#17191F','#FFFFFF','#A2AAAD'];
const uePal=t=>[...new Set([t.c1,t.c2||'#FFFFFF',shade(t.c1,-.45),...UNI_PAL].map(x=>String(x).toUpperCase()))];
function swHTML(f,val,pal,auto){const v=String(val||'').toUpperCase(),has=pal.includes(v);
  return `<div class="ue-sw" data-f="${f}" role="group">${auto?`<button data-v="" class="auto" aria-pressed="${!v}">${auto}</button>`:''}${pal.map(c=>`<button data-v="${c}" style="--c:${c}" aria-pressed="${c===v}" aria-label="Color ${c}"></button>`).join('')}<label class="cust" style="${v&&!has?'--c:'+v:''}" aria-pressed="${!!v&&!has}" title="Custom color"><input type="color" data-f="${f}" value="${uniHex(v)||'#FFFFFF'}" aria-label="Custom color"></label></div>`}
const segHTML=(f,val,opts,num)=>`<div class="seg ue-seg" data-f="${f}"${num?' data-n="1"':''}>${opts.map(([v,l])=>`<button data-v="${v}" aria-pressed="${String(v)===String(val)}">${l}</button>`).join('')}</div>`;
const rowHTML=(l,c)=>`<div class="ue-row"><span class="eyebrow">${l}</span>${c}</div>`;
/* one delegated handler for every swatch row, custom color and segmented control under root; set(field,value) */
function swBind(root,set){
  root.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b||!root.contains(b))return;const row=b.parentNode;if(!row.classList.contains('ue-sw')&&!row.classList.contains('ue-seg'))return;
    const f=row.dataset.f;let v=b.dataset.v;if(row.dataset.n)v=+v;row.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const cu=row.querySelector('.cust');if(cu){cu.setAttribute('aria-pressed','false');cu.style.removeProperty('--c')}set(f,v)});
  root.addEventListener('input',e=>{const i=e.target;if(!i.matches('input[type=color][data-f]'))return;const v=i.value.toUpperCase(),row=i.closest('.ue-sw');
    if(row){row.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));const cu=row.querySelector('.cust');cu.setAttribute('aria-pressed','true');cu.style.setProperty('--c',v)}set(i.dataset.f,v)});
}
function copyCode(ta){ta.value=ta.value||'';ta.focus();ta.select();try{navigator.clipboard.writeText(ta.value).then(()=>toast('Code copied'),()=>toast('Select all and copy'))}catch(e){toast('Select all and copy')}}

/* ---------- uniform editor ---------- */
const UE={raf:0,t:null,L:null,W:null,cur:'H',rot:null,ask:false,view:'rot',num:7,sig:'',e:null,done:null};
const UE_DEC=t=>[['L','Letter'],['N','Number'],['S','Star'],['B','Bolt'],['M','Shield'],...(typeof teamLogoURL==='function'&&teamLogoURL(t)?[['G','Logo']]:[]),['X','None']];
const UE_N=[[0,'None'],[1,'Single'],[2,'Double'],[3,'Triple']];
function ueCtlHTML(){const t=UE.t,U=UE.W[UE.cur],P=uePal(t);
  return `<div class="ue-sec"><div class="h3">Helmet</div>${rowHTML('Shell',swHTML('h',U.h,P))}${rowHTML('Finish',segHTML('hf',U.hf,[['m','Matte'],['g','Gloss'],['c','Chrome']]))}${rowHTML('Facemask',swHTML('m',U.m,P))}
    ${rowHTML('Decal',segHTML('d',U.d,UE_DEC(t)))}${rowHTML('Decal color',swHTML('dc',U.dc,P))}${rowHTML('Stripes',segHTML('hs',U.hs,UE_N,1))}${rowHTML('Stripe color',swHTML('hc',U.hc,P))}</div>
  <div class="ue-sec"><div class="h3">Jersey</div>${rowHTML('Jersey',swHTML('j',U.j,P))}${rowHTML('Numbers',swHTML('n',U.n,P))}${rowHTML('Number outline',swHTML('no',U.no,P,'Auto'))}
    ${rowHTML('Sleeve stripes',segHTML('sl',U.sl,[[0,'None'],[1,'1'],[2,'2'],[3,'3']],1))}${rowHTML('Sleeve stripe color',swHTML('sc',U.sc,P))}</div>
  <div class="ue-sec"><div class="h3">Pants &amp; socks</div>${rowHTML('Pants',swHTML('p',U.p,P))}${rowHTML('Pants stripe',segHTML('ps',U.ps,UE_N,1))}${rowHTML('Stripe color',swHTML('pc',U.pc,P))}${rowHTML('Socks',swHTML('k',U.k,P))}</div>
  <div class="btns"><button class="btn sm ghost" id="ueReset">Reset ${UNI_SETS.find(x=>x[0]===UE.cur)[1]} to default</button></div>`}
function ueRotHTML(){const r=UE.rot,S4=UNI_SETS.map(([k,l])=>[k,l]),opt=[['','Normal'],...S4];
  return `<div class="card ue-rotc"><div class="h2">Game-day rotation</div>
    ${rowHTML('How to choose',segHTML('ask',UE.ask?1:0,[[0,'Automatic'],[1,'Pick before each game']],1))}
    ${rowHTML('Home games',segHTML('r:hm',r.hm,S4))}${rowHTML('Road games',segHTML('r:rd',r.rd,S4))}
    ${rowHTML('Rivalry games',segHTML('r:rv',r.rv,opt))}${rowHTML('Primetime',segHTML('r:pt',r.pt,opt))}${rowHTML('Bowls &amp; playoff',segHTML('r:po',r.po,opt))}
    <p class="note">Bowls and the playoff come first, then rivalry, then primetime, then home or road. ${UE.t.id===(UE.L&&UE.L.user)?'With "Pick before each game" the pregame show asks which set to wear. ':''}If both teams would look alike, the road team switches to a set that reads clearly.</p></div>`}
function openUniEditor(id,done,L){
  L=L||LG;const t=L.teams[id];if(!t)return;
  Object.assign(UE,{t,L,cur:'H',view:'rot',sig:'',e:null,done,num:uniNum(t),rot:uniRot(t),ask:!!(t.uni&&t.uni.ask),W:Object.fromEntries(UNI_IDS.map(k=>[k,uniSet(t,k)]))});
  openModal(`<div class="ue" id="ueRoot"><div class="ue-head">${badge(t,'')}<div style="min-width:0"><div class="eyebrow">Uniform editor</div><div class="h2">${esc(teamName(t))}</div></div></div>
    <div class="seg ue-tabs" id="ueSets">${UNI_SETS.map(([k,l])=>`<button data-k="${k}" aria-pressed="${k===UE.cur}">${l}</button>`).join('')}</div>
    <div class="ue-grid"><div class="ue-prev"><canvas id="uePrev" aria-label="Uniform preview"></canvas><div class="seg" id="ueView">${[['rot','Turn'],['front','Front'],['back','Back']].map(([k,l])=>`<button data-k="${k}" aria-pressed="${k==='rot'}">${l}</button>`).join('')}</div></div>
      <div class="ue-ctl" id="ueCtl">${ueCtlHTML()}</div></div>
    ${ueRotHTML()}
    <div class="card"><div class="h2">Share codes</div><p class="note">A set code carries one uniform; a school code carries the whole look (name, colors, badge, stadium and all four sets). Paste either one here to wear it.</p>
      <div class="btns"><button class="btn sm ghost" id="ueCopySet">Copy set code</button><button class="btn sm ghost" id="ueCopyAll">Copy school code</button><button class="btn sm ghost" id="uePaste">Paste a code</button></div>
      <div id="ueShare" hidden><textarea id="ueCode" rows="3" spellcheck="false" placeholder="GLU1:… or GLS1:…"></textarea><div class="btns"><button class="btn sm" id="ueApply">Apply code</button></div><p class="note" id="ueMsg"></p></div></div>
    <div class="btns cta"><button class="btn" id="ueSave">Save uniforms</button><button class="btn ghost" id="ueX">Cancel</button></div></div>`,true);
  const root=$('#ueRoot');
  swBind(root,(f,v)=>{if(f==='ask'){UE.ask=!!v;return}if(f.startsWith('r:')){UE.rot[f.slice(2)]=v;return}UE.W[UE.cur][f]=v});
  const tabs=(sel,k,fn)=>$(sel).querySelectorAll('button').forEach(b=>b.onclick=()=>{$(sel).querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));fn(b.dataset[k])});
  const ctl=()=>{$('#ueCtl').innerHTML=ueCtlHTML();on('ueReset',()=>{UE.W[UE.cur]=uniGen(UE.t)[UE.cur];ctl()})};ctl();
  tabs('#ueSets','k',k=>{UE.cur=k;ctl()});tabs('#ueView','k',k=>{UE.view=k});
  const share=(code,msg)=>{$('#ueShare').hidden=false;const ta=$('#ueCode');ta.value=code||'';$('#ueMsg').textContent=msg||'';if(code)copyCode(ta);else ta.focus()};
  on('ueCopySet',()=>share(uniEnc('GLU1',uniArr(UE.W[UE.cur])),UNI_SETS.find(x=>x[0]===UE.cur)[1]+' set code. Copy it and paste it into any team’s uniform editor.'));
  on('ueCopyAll',()=>{const tmp={...UE.t};uniCommit(tmp,UE.W,UE.rot,UE.ask);share(schoolCode(tmp),'School code: paste it in Create a school (League tab or a new dynasty).')});
  on('uePaste',()=>share('','Paste a set code (GLU1:) or a school code (GLS1:), then Apply.'));
  on('ueApply',()=>{const r=uniDec($('#ueCode').value);if(!r){$('#ueMsg').textContent='That code could not be read.';return}
    if(r.kind==='GLU1'){const s=uniFromArr(r.o);if(!s){$('#ueMsg').textContent='That set code is empty.';return}Object.assign(UE.W[UE.cur],s);toast('Set applied to '+UNI_SETS.find(x=>x[0]===UE.cur)[1])}
    else{const sc=schoolFromCode(r.o);if(!sc){$('#ueMsg').textContent='That school code could not be read.';return}for(const k of UNI_IDS)if(sc.sets[k])Object.assign(UE.W[k],sc.sets[k]);Object.assign(UE.rot,sc.rot);UE.ask=sc.ask;$('.ue-rotc').outerHTML=ueRotHTML();toast('Uniforms from '+sc.city+' applied')}
    ctl()});
  on('ueSave',()=>{uniCommit(UE.t,UE.W,UE.rot,UE.ask);closeModal();if(UE.L===LG&&typeof saveNow==='function')saveNow();toast('Uniforms saved');UE.done&&UE.done()});
  on('ueX',()=>{closeModal();UE.done&&UE.done()});
  const cv=$('#uePrev'),fit=()=>{const tall=innerHeight>innerWidth,ar=tall?.62:.74,maxH=Math.max(150,innerHeight*(tall?.3:.48)),w=Math.round(Math.max(180,Math.min(cv.parentNode.clientWidth-16||300,380,maxH/ar))),h=Math.round(w*ar),dpr=Math.min(3,window.devicePixelRatio||1);cv.style.width=w+'px';cv.style.height=h+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv._dpr=dpr};
  fit();cancelAnimationFrame(UE.raf);const loop=now=>{if(!cv.isConnected||$('#modal').hidden){UE.raf=0;return}ueDraw(cv,now);UE.raf=requestAnimationFrame(loop)};UE.raf=requestAnimationFrame(loop);
}
function ueDraw(cv,now){
  const g=cv.getContext('2d'),dpr=cv._dpr||1,w=cv.width/dpr,h=cv.height/dpr,t=UE.t,U=UE.W[UE.cur],sig=JSON.stringify(U);
  if(UE.sig!==sig){UE.sig=sig;UE.e=athMake(t,U,x=>x)}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  const th=UE.view==='front'?0:UE.view==='back'?Math.PI:now/1150;
  uniFig(g,U,t,w*.33,h*.95,h*.86,th,UE.num);
  uniHelmetSide(g,U,t,w*.75,h*.4,Math.min(w*.16,h*.24),UE.num,UE.e);
  g.font=`700 11px ${FFONT}`;g.textAlign='center';g.fillStyle='rgba(220,230,245,.6)';g.fillText(UNI_SETS.find(x=>x[0]===UE.cur)[1].toUpperCase()+' · '+({m:'MATTE',g:'GLOSS',c:'CHROME'}[U.hf]||''),w*.75,h*.74);
}

/* ---------- school builder: create a school or edit one (name, colors, badge, stadium, league slot) ---------- */
const SB={st:null,L:null,t:null,mode:'edit'};
function sbTeam(){const s=SB.st,b=SB.t;return {...(b||{}),id:b?b.id:997,city:s.city||'Your School',name:s.name||'Mascots',abbr:(s.abbr||s.city.slice(0,3)||'YOU').toUpperCase(),c1:s.c1,c2:s.c2,bdg:s.bdg||{},stad:s.stad,stadium:s.stadium,logo:'',logoDark:''}}
function sbHTML(){
  const s=SB.st,create=SB.mode==='create',L=SB.L,tm=sbTeam(),b=bdgOf(tm),P=uePal(tm),st=s.stad||{};
  const confs=L.confs.map((c,i)=>c.ind?'':`<option value="${i}" ${i===s.conf?'selected':''}>${esc(c.name)} · ${c.div}</option>`).join('');
  const reps=create?L.teams.filter(x=>x.conf===s.conf&&!(LG&&L===LG&&x.id===L.user)).sort((a,b)=>qOf(a)-qOf(b)).map(x=>`<option value="${x.id}" ${x.id===s.rep?'selected':''}>${esc(teamName(x))}</option>`).join(''):'';
  return `<div class="sb" id="sbRoot"><div class="eyebrow">${create?'Build from scratch':'Edit school'}</div><div class="h2">${create?'Create a school':esc(teamName(SB.t))}</div>
    <div class="sb-top"><canvas id="sbBadge" width="120" height="132" aria-label="Badge preview"></canvas><div class="sb-id">
      <div class="field-row"><label for="sbCity">School</label><input type="text" id="sbCity" data-k="city" maxlength="22" value="${esc(s.city)}" placeholder="Riverside State"></div>
      <div class="field-row"><label for="sbName">Mascot</label><input type="text" id="sbName" data-k="name" maxlength="16" value="${esc(s.name)}" placeholder="Thunder"></div>
      <div class="colors"><div class="field-row"><label for="sbAbbr">Abbreviation</label><input type="text" id="sbAbbr" data-k="abbr" maxlength="4" value="${esc(s.abbr)}" placeholder="RSU" style="text-transform:uppercase;width:92px"></div>
      <div class="field-row" style="flex:1;min-width:150px"><label for="sbStad">Stadium</label><input type="text" id="sbStad" data-k="stadium" maxlength="30" value="${esc(s.stadium)}" placeholder="Riverside Stadium"></div></div></div></div>
    <div class="card"><div class="h2">Colors</div>${rowHTML('Primary',swHTML('t:c1',s.c1,SCHOOL_PAL))}${rowHTML('Secondary',swHTML('t:c2',s.c2,SCHOOL_PAL))}</div>
    <div class="card"><div class="h2">Badge</div><p class="note">Your badge shows on every schedule, ranking and team page, at midfield and as the Shield helmet decal.</p>
      ${rowHTML('Shape',segHTML('b:sh',b.sh,BDG_SH))}<div class="ue-row"><span class="eyebrow">Letters</span><input type="text" id="sbTx" maxlength="4" value="${esc(s.bdg&&s.bdg.tx!=null?s.bdg.tx:'')}" placeholder="${esc(tm.abbr)}" style="text-transform:uppercase;max-width:140px"></div>
      ${rowHTML('Background',swHTML('b:bg',b.bg,P))}${rowHTML('Rim',swHTML('b:rim',b.rim,P))}${rowHTML('Letters color',swHTML('b:fg',b.fg,P))}${rowHTML('Decoration',segHTML('b:dec',b.dec,BDG_DEC))}${rowHTML('Decoration color',swHTML('b:dc',b.dc,P))}
      ${!create&&s.bdg?'<div class="btns"><button class="btn sm ghost" id="sbClassic">Use the classic badge</button></div>':''}</div>
    <div class="card"><div class="h2">Stadium</div><canvas id="sbField" aria-label="Field preview"></canvas>
      ${rowHTML('Seats',swHTML('s:s1',st.s1||'',P,'Auto'))}${rowHTML('Seat accent',swHTML('s:s2',st.s2||'',P,'Auto'))}${rowHTML('End zones',segHTML('s:ez',st.ez||'solid',STAD_EZ))}
      ${rowHTML('Turf',swHTML('s:turf',st.turf||'',['#3A8A3D','#1D4FB0','#B3262D','#6D6F76','#1B8F8C','#4F2D7F','#2B2D33'],'Natural'))}${rowHTML('Midfield badge',segHTML('s:mid',st.mid===0?0:1,[[1,'On'],[0,'Off']],1))}</div>
    ${create?`<div class="card"><div class="h2">Join the league</div><div class="field-row"><label for="sbConf">Conference</label><select id="sbConf">${confs}</select></div>
      <div class="field-row"><label for="sbRep">Takes the place of</label><select id="sbRep">${reps}</select></div>
      ${LG&&L===LG?`${rowHTML('Roster',segHTML('x:keep',s.keep?1:0,[[1,'Keep their players'],[0,'New 1-star roster']],1))}<p class="note">The schedule stays as it is: your school plays the games already on that team's calendar, and its record so far carries over.</p>`:'<p class="note">Your school starts at one-star prestige with a thin roster.</p>'}</div>`:''}
    <div class="card"><div class="h2">Share</div><p class="note">${create?'Paste a school code (GLS1:) to start from someone else’s design.':'Copy a school code to rebuild this look in another dynasty.'}</p>
      <div class="btns">${create?'':'<button class="btn sm ghost" id="sbCopy">Copy school code</button>'}<button class="btn sm ghost" id="sbPaste">Paste a school code</button></div>
      <div id="sbShare" hidden><textarea id="sbCode" rows="3" spellcheck="false" placeholder="GLS1:…"></textarea><div class="btns"><button class="btn sm" id="sbApply">Apply code</button></div></div></div>
    <p class="note" id="sbErr"></p>
    <div class="btns cta"><button class="btn" id="sbGo">${create?(LG&&L===LG?'Add to league':'Create &amp; coach'):'Save'}</button>${!create&&L===LG?'<button class="btn ghost" id="sbUni">Uniforms</button>':''}<button class="btn ghost" id="sbX">Cancel</button></div></div>`;
}
function sbDraw(){
  const tm=sbTeam(),cb=$('#sbBadge');if(cb){const g=cb.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,120,132);bdgPaint(g,bdgOf(tm),120)}
  const cf=$('#sbField');if(!cf)return;const w=Math.max(220,cf.parentNode.clientWidth-2||300),h=Math.round(w*.3),dpr=Math.min(3,window.devicePixelRatio||1);if(cf.width!==Math.round(w*dpr)){cf.style.width=w+'px';cf.style.height=h+'px';cf.width=Math.round(w*dpr);cf.height=Math.round(h*dpr)}
  const g=cf.getContext('2d'),st=tm.stad||{},seat=h*.2,fy=seat+2,fh=h-fy,ez=w*.09,turf=st.turf||'#3A8A3D';g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  for(let i=0;i<20;i++){g.fillStyle=i%2?(st.s2||(lum(tm.c2)>.8?'#555b66':shade(tm.c2,-.45))):(st.s1||shade(tm.c1,-.5));g.fillRect(i*w/20,0,w/20+1,seat)}
  for(let i=0;i<20;i++){g.fillStyle=i%2?shade(turf,-.1):turf;g.fillRect(ez+i*(w-2*ez)/20,fy,(w-2*ez)/20+1,fh)}
  for(const x of [0,w-ez]){g.fillStyle=tm.c1;g.fillRect(x,fy,ez,fh);const lt=contrasty(tm.c1,tm.c2)?tm.c2:inkOn(tm.c1);g.save();g.beginPath();g.rect(x,fy,ez,fh);g.clip();
    if(st.ez==='check'){g.fillStyle=lt;for(let i=0;i<3;i++)for(let j=0;j<8;j++)if((i+j)%2)g.fillRect(x+i*ez/3,fy+j*fh/8,ez/3,fh/8)}
    else if(st.ez==='diag'){g.fillStyle=shade(tm.c1,-.25);for(let k=-fh;k<fh*2;k+=fh/6){g.beginPath();g.moveTo(x,fy+k);g.lineTo(x+ez,fy+k-ez*.6);g.lineTo(x+ez,fy+k-ez*.6+fh/14);g.lineTo(x,fy+k+fh/14);g.fill()}}
    g.translate(x+ez/2,fy+fh/2);g.rotate(x?Math.PI/2:-Math.PI/2);g.font=`italic 900 ${Math.min(ez*.7,fh*.9/Math.max(4,tm.city.length)*1.5)}px ${FFONT}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=lt;g.fillText(tm.city.toUpperCase(),0,0);g.restore()}
  g.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<=10;i++)g.fillRect(ez+i*(w-2*ez)/10-.5,fy,1,fh);
  if(st.mid!==0){const bh=fh*.62,bw=bh/1.1;g.drawImage(bdgCanvas(tm,128),w/2-bw/2,fy+fh/2-bh/2,bw,bh)}
}
function openSchoolBuilder(o){
  const L=o.L||LG,t=o.id!=null?L.teams[o.id]:null,create=o.mode==='create';
  const conf0=create?(t?t.conf:L.confs.findIndex(c=>!c.ind)):0;
  SB.L=L;SB.t=t;SB.mode=create?'create':'edit';
  SB.st=create?{city:'',name:'',abbr:'',stadium:'',c1:'#6A1B9A',c2:'#F2C230',bdg:{},stad:{},conf:conf0,rep:null,keep:1,sets:null,rot:null,ask:false}
    :{city:t.city,name:t.name,abbr:t.abbr,stadium:t.stadium||'',c1:String(t.c1).toUpperCase(),c2:String(t.c2).toUpperCase(),bdg:t.bdg?{...t.bdg}:null,stad:{...(t.stad||{})},sets:null,rot:null,ask:false};
  const repFor=()=>{const c=L.teams.filter(x=>x.conf===SB.st.conf&&!(LG&&L===LG&&x.id===L.user)).sort((a,b)=>qOf(a)-qOf(b))[0];SB.st.rep=c?c.id:null};if(create)repFor();
  const render=()=>{const y=$('#modal').scrollTop;openModal(sbHTML(),true);$('#modal').scrollTop=y;bind();sbDraw()};
  const bind=()=>{
    const root=$('#sbRoot'),s=SB.st;
    swBind(root,(f,v)=>{const [ns,k]=f.split(':');if(ns==='t'){s[k]=v;sbDraw();return}if(ns==='b'){(s.bdg||(s.bdg={}))[k]=v;sbDraw();return}
      if(ns==='s'){if(v===''||(k==='mid'&&v===1))delete s.stad[k];else s.stad[k]=v;sbDraw();return}if(ns==='x')s[k]=v});
    root.querySelectorAll('input[type=text][data-k]').forEach(i=>i.oninput=()=>{s[i.dataset.k]=i.value;sbDraw()});
    const tx=$('#sbTx');tx.oninput=()=>{(s.bdg||(s.bdg={})).tx=tx.value.toUpperCase().replace(/[^A-Z0-9&]/g,'').slice(0,4);if(!s.bdg.tx)delete s.bdg.tx;sbDraw()};
    on('sbClassic',()=>{s.bdg=null;render()});
    const cs=$('#sbConf');if(cs)cs.onchange=()=>{s.conf=+cs.value;repFor();render()};const rs=$('#sbRep');if(rs)rs.onchange=()=>{s.rep=+rs.value};
    on('sbCopy',()=>{$('#sbShare').hidden=false;const ta=$('#sbCode');const tmp={...t,...sbApplyTo({...t})};ta.value=schoolCode(tmp);copyCode(ta)});
    on('sbPaste',()=>{$('#sbShare').hidden=false;$('#sbCode').value='';$('#sbCode').focus()});
    on('sbApply',()=>{const r=uniDec($('#sbCode').value),sc=r&&r.kind==='GLS1'?schoolFromCode(r.o):null;if(!sc){$('#sbErr').textContent='That school code could not be read.';return}
      Object.assign(s,{city:sc.city,name:sc.name,abbr:sc.abbr,c1:sc.c1,c2:sc.c2,stadium:sc.stadium||s.stadium,bdg:sc.bdg||{},stad:sc.stad||{},sets:sc.sets,rot:sc.rot,ask:sc.ask});toast(sc.city+' loaded');render()});
    on('sbX',()=>{closeModal();o.done&&o.done()});
    on('sbUni',()=>{closeModal();openUniEditor(t.id,o.done,L)});
    on('sbGo',()=>{const city=s.city.trim(),name=s.name.trim();if(!city||!name){$('#sbErr').textContent='Give your school a name and a mascot.';return}
      if(create)sbCreate(o);else{sbApplyTo(t);UNI_VER++;closeModal();if(L===LG&&typeof saveNow==='function')saveNow();if(LG&&t.id===LG.user&&L===LG)applyTeamTheme(t);o.done&&o.done()}});
  };
  render();
}
/* write the builder's identity, badge and stadium onto team x (returns x) */
function sbApplyTo(x){const s=SB.st,city=s.city.trim()||x.city,ab=(s.abbr.trim()||city.replace(/[^A-Za-z]/g,'').slice(0,3)).toUpperCase().slice(0,4);
  Object.assign(x,{city,name:s.name.trim()||x.name,abbr:ab,c1:s.c1,c2:s.c2,stadium:s.stadium.trim()||x.stadium||city+' Stadium'});
  if(s.bdg)x.bdg=bdgClean(s.bdg)||{};else delete x.bdg;const st=stadClean(s.stad);if(st&&Object.keys(st).length)x.stad=st;else delete x.stad;
  if(s.sets){const all=Object.fromEntries(UNI_IDS.map(k=>[k,Object.assign(uniSet(x,k),s.sets[k]||{})]));uniCommit(x,all,Object.assign({},UNI_ROT0,s.rot||{}),s.ask)}
  return x}
function sbCreate(o){
  const s=SB.st,L=SB.L,slotT=L.teams[s.rep];if(!slotT){$('#sbErr').textContent='Pick a team to replace.';return}
  const inDyn=!!(LG&&L===LG),conf=slotT.conf,keep=inDyn&&s.keep;
  if(slotT.rival!=null){const r=L.teams[slotT.rival],tro=slotT.trophy;if(r&&r.rival===slotT.id){r.rival=null;r.trophy=''}slotT.rival=null;slotT.trophy='';
    /* games still to play stop being trophy games (finished ones keep their history) */
    if(inDyn)for(const w of L.weeks)for(const g of w.games)if(g.hs==null&&g.rival&&(g.h===slotT.id||g.a===slotT.id)){g.rival=false;if(g.tag===tro)g.tag=null}}
  delete slotT.logo;delete slotT.logoDark;delete slotT.uni;
  if(!keep){const fresh=genTeam(slotT.id,s.city.trim(),s.name.trim(),s.c1,1,conf,{exact:true,div:slotT.div,q:slotT.div==='FCS'?1.2:1.7});Object.assign(slotT,{prestige:1,q:fresh.q,roster:fresh.roster,cap:22000});if(inDyn)for(const p of slotT.roster)p.ss=newSS()}
  sbApplyTo(slotT);slotT.custom=1;UNI_VER++;invalidate();
  if(inDyn){try{updateRankings(L)}catch(e){console.error(e)}closeModal();saveNow&&saveNow();toast(teamName(slotT)+' joins '+confName(conf));o.done&&o.done();return}
  resetRecords(L);buildSchedule(L);updateRankings(L);startDynasty(slotT.id);
}

/* ---------- hub pieces ---------- */
/* Program tab card: thumbnails of the four sets + buttons */
function uniCardHTML(t){return `<div class="card uni-card"><div class="setrow"><div class="h2">Uniforms &amp; school</div><div class="btns" style="flex:0 1 auto"><button class="btn sm" id="uniOpen">Uniform editor</button><button class="btn sm ghost" id="uniSchool">School &amp; badge</button></div></div>
  <div class="uni-thumbs">${UNI_SETS.map(([k,l])=>`<button class="uni-th" data-k="${k}"><canvas data-k="${k}"></canvas><small>${l}</small></button>`).join('')}</div>
  <p class="note">${t.uni&&t.uni.ask?'You pick a set in the pregame show before each game.':'Sets rotate automatically: home, road, rivalry, primetime and postseason rules live in the editor.'}</p></div>`}
function bindUniCard(){const t=T(LG.user),re=()=>{showHub('program')};
  on('uniOpen',()=>openUniEditor(t.id,re));on('uniSchool',()=>openEditor(t.id,re));
  document.querySelectorAll('.uni-th').forEach(b=>{b.onclick=()=>{openUniEditor(t.id,re);const s=b.dataset.k;const x=document.querySelector(`#ueSets [data-k="${s}"]`);if(x)x.click()};uniThumb(b.querySelector('canvas'),t,uniSet(t,b.dataset.k),uniNum(t))});
}
/* pregame: the set this game (uniStyle with a game context) and the opponent's after the clash check */
function uniGameCtx(g){const u=T(LG.user),o=T(g.h===LG.user?g.a:g.h);const host=g.neutral?u:(g.h===LG.user?u:o);return {g,a:u,b:o,host,slot:g.slot||'Afternoon'}}
function uniPregameHTML(g){const u=T(LG.user),ask=!!(u.uni&&u.uni.ask),x=uniGameCtx(g),cur=g.uni&&UNI_IDS.includes(g.uni)?g.uni:(ask?uniStyle(u,{...x,g:{...g,uni:null}}):'auto');
  const opts=ask?UNI_SETS:[['auto','Auto'],...UNI_SETS];
  return `<div class="card pg-uni"><div class="setrow"><span class="eyebrow">Uniform${ask?' · pick one for this game':''}</span><div class="seg" id="uniSeg">${opts.map(([k,l])=>`<button data-v="${k}" aria-pressed="${cur===k}">${l}</button>`).join('')}</div></div>
    <div class="pg-unis"><figure><canvas id="pgUniU"></canvas><figcaption>${esc(u.abbr)}</figcaption></figure><span class="vs">VS</span><figure><canvas id="pgUniO"></canvas><figcaption>${esc(x.b.abbr)}</figcaption></figure></div></div>`}
function bindPregameUni(g){const u=T(LG.user),ask=!!(u.uni&&u.uni.ask);
  if(ask&&!g.uni){const x=uniGameCtx(g);g.uni=uniStyle(u,{...x,g:{...g,uni:null}})}
  const draw=()=>{const x=uniGameCtx(g);uniThumb($('#pgUniU'),u,uniColors(u,x),uniNum(u));uniThumb($('#pgUniO'),x.b,uniColors(x.b,x),uniNum(x.b))};
  document.querySelectorAll('#uniSeg button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;g.uni=v==='auto'?null:v;if(!g.uni)delete g.uni;LG.settings.uniform='auto';UNI_VER++;
    document.querySelectorAll('#uniSeg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();saveNow()});
  draw();
}
