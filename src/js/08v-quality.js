/* =========================================================
   08v · Graphics quality for the 3D broadcast view (08t). Settings › Graphics › Quality (LG.settings.gq3d, the row
   is registered in 04-hub's SETTINGS_EXTRA): Auto (default) · Performance · Balanced · Ultra.
   PRESETS (Performance / Balanced / Ultra)
     resolution   up to 2 / up to 2 / the phone's full native pixel ratio (3 on Pro iPhones)
     anti-alias   4× MSAA in a WebGL2 render target (all three; the canvas itself has none)
     sun shadow   2048 PCF / 2048 soft PCF / 4096 soft PCF, on a light-space box fitted to the visible field
     textures     anisotropic filtering 4 / 8 / the GPU maximum (16), every scene and athlete texture
     bloom        off / quarter res / half res, on lights and specular highlights
     AO           off / off / GTAO at half res (normals rebuilt from the resolved MSAA depth, no extra scene pass)
     athletes     08u detail level 0 / 1 / 2 (segments, interpolated rings, 2× atlases, sheen, alpha-to-coverage)
     Auto picks the tier from window.__DEVICE__'s model id (A16 and newer → Ultra, A14/A15 → Balanced, older →
     Performance), else from the screen size and DPR, then adapts like any preset.
   PIPELINE (THREE.Addons, vendored in 00-three): EffectComposer → RenderPass into a 4× MSAA RGBA8 target →
     GTAOPass (output off: it only fills its half-res AO map) → bloom (UnrealBloomPass's high-pass, 5-mip blur and
     composite, without its full-res blend) → OutputPass to the canvas with the broadcast grade folded into its
     shader: AO, bloom, white balance, a filmic S-curve, saturation and black level per light stage (day, late
     afternoon, sunset, night; softer in rain and snow), a light lens vignette, dither. One full-res pass after the
     MSAA resolve.
     Colour: the scene target is flagged as an XR target, so three keeps ACES tone mapping and the sRGB encode inside
     every material, exactly as when drawing straight to the canvas: toneMapped:false art (first-down line, routes,
     rings, video board, signs) keeps its exact colours and blending stays in display space. The OutputPass is held
     at no tone mapping / linear output, so it is a pass-through plus the grade: nothing is tone-mapped or
     gamma-encoded twice. If any of this fails the renderer falls back to drawing straight to an antialiased canvas.
   ADAPTIVE each preset has a ladder: render scale 1 → .9 → .8 → .7, then AO off, bloom off, the 4096 shadow map to
     2048, then .6 / .5 (never under one device pixel per CSS pixel). Sustained missed frames step down one rung (at
     most one change every 2.5 s); a long clean stretch with CPU headroom steps back up, and a rung that misses again
     right after a step-up waits twice as long before the next try, so it never oscillates.
   ========================================================= */
const GQPRE={
  perf:{id:'perf',name:'Performance',top:2,msaa:4,shadow:2048,soft:false,aniso:4,bloom:0,ao:false,det:0},
  bal:{id:'bal',name:'Balanced',top:2,msaa:4,shadow:2048,soft:true,aniso:8,bloom:.5,ao:false,det:1},
  ultra:{id:'ultra',name:'Ultra',top:3,msaa:4,shadow:4096,soft:true,aniso:16,bloom:1,ao:true,det:2}};
const GQ={P:null,id:'',auto:true,tier:'',L:[],i:0,cur:null,hold:false,ad:null,fail:{},px:0,fit:{ha:0,hb:0,v:null},stage:''};
/* broadcast grade per light stage, in display space: white balance, S-curve amount, saturation, black lift, vignette,
   bloom threshold (display luminance) and bloom amount */
const GQGR={day:{wb:[1.012,1,.986],con:.16,sat:1.08,lift:.004,vig:.1,th:.93,bs:.06},   // white jerseys and lines sit at .86-.92: only clipped highlights bloom
  late:{wb:[1.026,1,.968],con:.16,sat:1.09,lift:.004,vig:.12,th:.92,bs:.07},
  sunset:{wb:[1.035,.996,.955],con:.17,sat:1.1,lift:.006,vig:.06,th:.89,bs:.1},
  night:{wb:[.99,1,1.022],con:.2,sat:1.07,lift:0,vig:0,th:.84,bs:.15}};

/* ---------- presets ---------- */
function g3qTier(){
  const d=typeof devInfo==='function'?devInfo():{id:'',ios:false,w:innerWidth,h:innerHeight},id=d.id||'';
  let m=/^iPhone(\d+),/.exec(id);if(m){const a=+m[1];return a>=15?'ultra':a>=13?'bal':'perf'}   // A16+ · A14/A15 · A13 and older
  m=/^iPad(\d+),/.exec(id);if(m){const a=+m[1];return a>=14?'ultra':a>=8?'bal':'perf'}
  const dpr=window.devicePixelRatio||1,lg=Math.max(d.w||0,d.h||0);
  if(d.ios)return dpr>=3&&lg>=852?'ultra':dpr>=3||lg>=900?'bal':'perf';
  return (navigator.hardwareConcurrency||4)>=8?'ultra':'bal'}
function g3qWant(){const v=LG&&LG.settings?LG.settings.gq3d:'auto';return GQPRE[v]?v:'auto'}
function g3qTop(P){return Math.max(1,Math.min(window.devicePixelRatio||1,P.top))}
function g3qLadder(P){
  const L=[{scale:1,msaa:P.msaa,shadow:P.shadow,bloom:P.bloom,ao:P.ao}],add=o=>L.push(Object.assign({},L[L.length-1],o)),top=g3qTop(P);
  for(const s of [.9,.8,.7])add({scale:s});if(P.ao)add({ao:false});if(P.bloom)add({bloom:0});if(P.shadow>2048)add({shadow:2048});for(const s of [.6,.5])add({scale:s});
  for(const e of L)e.px=Math.max(1,Math.round(top*e.scale*20)/20);
  return L.filter((e,i)=>{if(!i)return true;const p=L[i-1];return e.px!==p.px||e.ao!==p.ao||e.bloom!==p.bloom||e.shadow!==p.shadow||e.msaa!==p.msaa})}
/* (re)apply the chosen preset: Settings, startup, QA */
function g3qSet(){
  const want=g3qWant(),auto=want==='auto',id=auto?(GQ.tier||(GQ.tier=g3qTier())):want,P=GQPRE[id];
  GQ.auto=auto;GQ.want=want;if(!G3.R){GQ.P=P;GQ.id=id;return}
  const R=G3.R,an=Math.min(P.aniso,R.capabilities.getMaxAnisotropy()||1),soft=P.soft?THREE.PCFSoftShadowMap:THREE.PCFShadowMap,first=!GQ.P;
  const re=first||GQ.P.id!==id;GQ.P=P;GQ.id=id;GQ.L=g3qLadder(P);GQ.fail={};GQ.ad=null;G3.aniso=an;
  if(R.shadowMap.type!==soft){R.shadowMap.type=soft;if(!first)G3.scene.traverse(o=>{const ms=o.material?[].concat(o.material):[];for(const m of ms)if(m)m.needsUpdate=true})}
  if(!first)g3qAniso(G3.scene,an);
  if(typeof ath3dDetail==='function'&&ath3dDetail(P.det,an,P.msaa>0)&&!first)G3.warm=-1;
  g3qApply(0,re)}
/* one rung of the ladder */
function g3qApply(i,force){
  const e=GQ.L[Math.max(0,Math.min(GQ.L.length-1,i))];if(!e||!G3.R)return;GQ.i=GQ.L.indexOf(e);const prev=GQ.cur;GQ.cur=e;const R=G3.R;
  if(force||!prev||Math.abs(R.getPixelRatio()-e.px)>.001){R.setPixelRatio(e.px);R.setSize(G3.w||W||innerWidth,G3.h||H||innerHeight,true);if(GQPP.ok)GQPP.comp.setPixelRatio(e.px)}
  const sh=G3.sun&&G3.sun.shadow;if(sh&&sh.mapSize.x!==e.shadow){sh.mapSize.set(e.shadow,e.shadow);if(sh.map){sh.map.dispose();sh.map=null}}if(typeof G3SH!=='undefined')G3SH.map=e.shadow;
  if(GQPP.ok)g3pRung(e)}
/* QA / console: g3Quality('ultra',{hold:true}) pins a preset with adaptation off; g3Quality() goes back to the setting */
function g3Quality(id,o){if(id&&LG&&LG.settings)LG.settings.gq3d=id;GQ.hold=!!(o&&o.hold);g3qSet();return g3qStats()}

/* ---------- the post-processing pipeline ---------- */
const GQPP={ok:false,err:'',comp:null,rt:null,rp:null,ao:null,bl:null,bf:null,out:null,u:null,blk:null,wht:null};
const GQGLSL=`
uniform sampler2D tBloom, tAO;
uniform float uBloom, uAO, uCon, uSat, uLift, uVig, uDith;
uniform vec3 uWB;
void g3Grade( inout vec4 c ) {
	vec3 g = c.rgb;
	g *= mix( 1.0, texture2D( tAO, vUv ).r, uAO );
	g += texture2D( tBloom, vUv ).rgb * uBloom;
	g = clamp( g * uWB, 0.0, 1.0 );
	g = mix( g, g * g * ( 3.0 - 2.0 * g ), uCon );
	float l = dot( g, vec3( 0.2126, 0.7152, 0.0722 ) );
	g = clamp( mix( vec3( l ), g, uSat ), 0.0, 1.0 );
	g = uLift + g * ( 1.0 - uLift );
	vec2 d = vUv - 0.5;
	g *= 1.0 - uVig * dot( d, d ) * 2.0;
	g += ( fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5 ) * uDith;
	c = vec4( g, 1.0 );
}
`;
function g3pTex(v){const t=new THREE.DataTexture(new Uint8Array([v,v,v,255]),1,1);t.needsUpdate=true;return t}
function g3pInit(){
  if(GQPP.ok||GQPP.err)return GQPP.ok;const A=THREE.Addons,R=G3.R;
  try{
    if(!A||!A.EffectComposer||!A.OutputPass)throw new Error('post-processing addons missing');
    const rt=new THREE.WebGLRenderTarget(4,4,{samples:4,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
    rt.texture.internalFormat='RGBA8';rt.texture.colorSpace=THREE.SRGBColorSpace;rt.texture.name='g3.scene';rt.isXRRenderTarget=true;   // see the header: tone map + sRGB stay in the materials
    const comp=new A.EffectComposer(R,rt),fl=R.extensions.has('EXT_color_buffer_float')||R.extensions.has('EXT_color_buffer_half_float');
    const rp=new A.RenderPass(G3.scene,G3.cam);comp.addPass(rp);
    const ao=new A.GTAOPass(G3.scene,G3.cam,4,4);ao.output=A.GTAOPass.OUTPUT.Off;ao.needsSwap=false;ao.enabled=false;
    const aoSize=ao.setSize.bind(ao);ao.setSize=(w,h)=>aoSize(Math.max(2,Math.round(w/2)),Math.max(2,Math.round(h/2)));
    ao.updateGtaoMaterial({radius:.45,distanceExponent:1.2,thickness:1.5,scale:1,samples:12,distanceFallOff:1,screenSpaceRadius:false});
    ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:4,radiusExponent:1,rings:2,samples:12});
    comp.addPass(ao);
    const bl=new A.UnrealBloomPass(new THREE.Vector2(8,8),1,.55,.86);bl.highPassUniforms.smoothWidth.value=.07;
    if(!fl)for(const t of [bl.renderTargetBright,...bl.renderTargetsHorizontal,...bl.renderTargetsVertical,ao.gtaoRenderTarget,ao.pdRenderTarget])t.texture.type=THREE.UnsignedByteType;
    const bf={enabled:false,needsSwap:false,clear:false,renderToScreen:false,k:1,w:8,h:8,setSize(w,h){this.w=w;this.h=h;bl.setSize(Math.max(8,Math.round(w*this.k)),Math.max(8,Math.round(h*this.k)))},render:(r,w,rb)=>g3pBloom(r,bl,rb),dispose(){}};
    comp.addPass(bf);
    const out=new A.OutputPass();out.needsSwap=false;g3pGrade(out);comp.addPass(out);
    Object.assign(GQPP,{ok:true,comp,rt,rp,ao,bl,bf,out,u:out.uniforms,blk:g3pTex(0),wht:g3pTex(255)});
    out.uniforms.tBloom.value=GQPP.blk;out.uniforms.tAO.value=GQPP.wht;
    comp.setPixelRatio(R.getPixelRatio());comp.setSize(G3.w||W||innerWidth,G3.h||H||innerHeight);R.info.autoReset=false;
  }catch(e){console.warn('3D post-processing unavailable:',e&&e.message);GQPP.err=String(e&&e.message||e);GQPP.ok=false}
  return GQPP.ok}
/* the OutputPass shader with the grade spliced in after its texture read; its tone mapping / colour-space defines
   are held empty (the scene target already carries tone-mapped sRGB) */
function g3pGrade(out){
  const m=out.material,U=out.uniforms,hook='gl_FragColor = texture2D( tDiffuse, vUv );',fs=m.fragmentShader;
  if(fs.indexOf(hook)<0||fs.indexOf('void main() {')<0)throw new Error('OutputShader layout changed');
  Object.assign(U,{tBloom:{value:null},tAO:{value:null},uBloom:{value:0},uAO:{value:0},uWB:{value:new THREE.Vector3(1,1,1)},uCon:{value:0},uSat:{value:1},uLift:{value:0},uVig:{value:0},uDith:{value:1/255}});
  m.uniforms=U;m.fragmentShader=fs.replace('void main() {',GQGLSL+'\nvoid main() {').replace(hook,hook+'\n\tg3Grade( gl_FragColor );');g3pLock(out)}
function g3pLock(out){const R=G3.R;if(out._toneMapping!==R.toneMapping||out._outputColorSpace!==R.outputColorSpace){out._toneMapping=R.toneMapping;out._outputColorSpace=R.outputColorSpace;out.material.defines={};out.material.needsUpdate=true}}
/* UnrealBloomPass's own steps 1-3 (high-pass, blur the mips, composite) from the scene texture; the result stays in
   renderTargetsHorizontal[0] for the output pass to add (its own full-res blend is skipped) */
function g3pBloom(R,b,rb){
  R.getClearColor(b._oldClearColor);const oa=R.getClearAlpha(),oc=R.autoClear,U=THREE.Addons.UnrealBloomPass;R.autoClear=false;R.setClearColor(b.clearColor,0);
  b.highPassUniforms.tDiffuse.value=rb.texture;b.highPassUniforms.luminosityThreshold.value=b.threshold;b.fsQuad.material=b.materialHighPassFilter;R.setRenderTarget(b.renderTargetBright);R.clear();b.fsQuad.render(R);
  let inp=b.renderTargetBright;
  for(let i=0;i<b.nMips;i++){const m=b.separableBlurMaterials[i];b.fsQuad.material=m;
    m.uniforms.colorTexture.value=inp.texture;m.uniforms.direction.value=U.BlurDirectionX;R.setRenderTarget(b.renderTargetsHorizontal[i]);R.clear();b.fsQuad.render(R);
    m.uniforms.colorTexture.value=b.renderTargetsHorizontal[i].texture;m.uniforms.direction.value=U.BlurDirectionY;R.setRenderTarget(b.renderTargetsVertical[i]);R.clear();b.fsQuad.render(R);inp=b.renderTargetsVertical[i]}
  const c=b.compositeMaterial;b.fsQuad.material=c;c.uniforms.bloomStrength.value=b.strength;c.uniforms.bloomRadius.value=b.radius;c.uniforms.bloomTintColors.value=b.bloomTintColors;
  R.setRenderTarget(b.renderTargetsHorizontal[0]);R.clear();b.fsQuad.render(R);
  R.setClearColor(b._oldClearColor,oa);R.autoClear=oc}
/* switch passes / MSAA for a rung (no shader recompiles: off means skipped and a neutral 1×1 texture) */
function g3pRung(e){
  const P=GQPP,rt=P.rt;let dirty=false;
  if(rt.samples!==e.msaa){rt.samples=e.msaa;dirty=true}
  if(e.ao&&!rt.depthTexture){rt.depthTexture=new THREE.DepthTexture(rt.width,rt.height);dirty=true;P.ao.setGBuffer(rt.depthTexture)}
  else if(!e.ao&&rt.depthTexture){rt.depthTexture.dispose();rt.depthTexture=null;dirty=true}
  if(dirty)rt.dispose();
  P.ao.enabled=!!e.ao;P.u.tAO.value=e.ao?P.ao.pdRenderTarget.texture:P.wht;
  P.bf.enabled=e.bloom>0;if(e.bloom>0&&P.bf.k!==e.bloom){P.bf.k=e.bloom;P.bf.setSize(P.bf.w,P.bf.h)}P.u.tBloom.value=e.bloom>0?P.bl.renderTargetsHorizontal[0].texture:P.blk;GQ.stage=''}
function g3pUniforms(){
  const env=G3.env,st=env?env.stage:'day',wk=env?env.wk:'dry',k=st+wk+(GQ.cur?GQ.i:'');if(GQ.stage===k)return;GQ.stage=k;
  const g=GQGR[st]||GQGR.day,u=GQPP.u,wet=wk!=='dry',e=GQ.cur||{};
  u.uWB.value.set(g.wb[0],g.wb[1],g.wb[2]);u.uCon.value=g.con*(wet?.75:1);u.uSat.value=1+(g.sat-1)*(wet?.4:1)-(wet?.04:0);u.uLift.value=g.lift;u.uVig.value=g.vig;
  u.uBloom.value=e.bloom>0?g.bs*(wet?.8:1):0;u.uAO.value=e.ao?.6:0;GQPP.bl.threshold=g.th+(wet?.04:0)}

/* ---------- hooks called from 08t-view ---------- */
function g3qInit(){const ok=g3pInit();GQ.P=null;g3qSet();return ok}
function g3qResize(){if(GQPP.ok)GQPP.comp.setSize(G3.w,G3.h)}
function g3qRender(){
  const R=G3.R;R.info.reset();if(g3qWant()!==GQ.want)g3qSet();   // another save (or Settings) changed the preset
  if(GQPP.ok&&GQ.cur){g3pUniforms();g3pLock(GQPP.out);const c=GQPP.comp;c.readBuffer=GQPP.rt;c.writeBuffer=c.renderTarget2;
    try{c.render(0);return}catch(e){console.warn('3D post-processing failed, drawing direct:',e&&e.message);GQPP.ok=false;GQPP.err='render: '+(e&&e.message);R.setRenderTarget(null)}}
  R.render(G3.scene,G3.cam)}
/* QA: what each pass of one frame costs (gl.finish() around every pass; under software WebGL read it as ratios) */
function g3qProfile(){if(!GQPP.ok||!GQ.cur)return null;const gl=G3.R.getContext(),c=GQPP.comp,out={},nm=['scene+shadows','gtao½+denoise','bloom','output+grade'],rs=c.passes.map(p=>p.render);
  c.passes.forEach((p,i)=>{p.render=function(){gl.finish();const t=performance.now();rs[i].apply(this,arguments);gl.finish();out[nm[i]]=+(performance.now()-t).toFixed(1)}});
  try{g3qRender()}finally{c.passes.forEach((p,i)=>{p.render=rs[i]})}return out}
/* compile every program for the target the scene really renders into (same tone mapping / colour-space keys) */
function g3qCompile(){const R=G3.R;try{if(GQPP.ok){R.setRenderTarget(GQPP.rt);R.compile(G3.scene,G3.cam);R.setRenderTarget(null)}else R.compile(G3.scene,G3.cam)}catch(e){R.setRenderTarget(null)}}
/* a new stadium: its textures get this preset's anisotropy before their first upload */
const GQTX=['map','emissiveMap','roughnessMap','metalnessMap','normalMap','bumpMap','aoMap','alphaMap','specularMap','clearcoatMap','clearcoatNormalMap','sheenColorMap','lightMap','displacementMap'];
function g3qAniso(root,an){if(!root)return;const seen=new Set();
  const fix=t=>{if(!t||!t.isTexture||t.isRenderTargetTexture||t.isDepthTexture||seen.has(t))return;seen.add(t);if(t.anisotropy!==an&&t.image){t.anisotropy=an;t.needsUpdate=true}};
  root.traverse(o=>{if(!o.material)return;for(const m of [].concat(o.material)){if(!m)continue;for(const k of GQTX)fix(m[k]);if(m.uniforms)for(const k in m.uniforms){const v=m.uniforms[k]&&m.uniforms[k].value;if(v&&v.isTexture)fix(v)}}})}
function g3qEnv(env){if(env&&GQ.P)g3qAniso(env.group,G3.aniso)}
/* sun shadow box fitted to the visible field: the camera frustum's footprint on the turf (clipped to the field and
   sidelines) in light space, half sizes rounded up to 2 yd steps with hysteresis, centre snapped to whole shadow
   texels (no crawl or shimmer while the camera pans) */
function g3qShadowFit(dx,dy,dz,rx,rz,ux,uy,uz){
  const c=G3.cam,sun=G3.sun;if(!c||!sun||dy<.05)return null;const F=GQ.fit,v=F.v||(F.v=new THREE.Vector3()),o=c.position,fw=typeof FW==='number'?FW:53.33;
  c.updateMatrixWorld();let poly=[];
  for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){v.set(sx,sy,.5).unproject(c).sub(o).normalize();const t=v.y<-1e-4?Math.min(400,-o.y/v.y):400;poly.push([o.x+v.x*t,o.z+v.z*t])}
  for(const [ax,lim,s] of [[0,-14,1],[0,134,-1],[1,-12,1],[1,fw+12,-1]]){const q=[];   // Sutherland-Hodgman against the field box
    for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a[ax]-lim)*s,db=(b[ax]-lim)*s;if(da>=0)q.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);q.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}}
    poly=q;if(!poly.length)break}
  let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;if(!poly.length)poly=[[G3.cs.x-30,G3.cs.z-30],[G3.cs.x+30,G3.cs.z+30]];
  for(const p of poly){const a=p[0]*rx+p[1]*rz,b=p[0]*ux+p[1]*uz;if(a<a0)a0=a;if(a>a1)a1=a;if(b<b0)b0=b;if(b>b1)b1=b}
  const map=sun.shadow.mapSize.x||2048,step=2,fitH=(h,old)=>{h=Math.max(10,Math.min(120,Math.ceil((h+3)/step)*step));return old&&old>=h&&old-h<=2*step?old:h};
  const ha=F.ha=fitH((a1-a0)/2,F.ha),hb=F.hb=fitH((b1-b0)/2,F.hb),qa=2*ha/map,qb=2*hb/map,ac=Math.round((a0+a1)/2/qa)*qa,bc=Math.round((b0+b1)/2/qb)*qb,k=-bc*uy/dy;
  const sc=sun.shadow.camera;if(sc.right!==ha||sc.top!==hb){sc.left=-ha;sc.right=ha;sc.bottom=-hb;sc.top=hb;sc.updateProjectionMatrix()}
  return [ac*rx+bc*ux+k*dx,bc*uy+k*dy,ac*rz+bc*uz+k*dz]}
/* the adaptive ladder: real frame intervals against the display's own refresh period */
function g3qAdapt(t0,skip){
  const A=GQ.ad||(GQ.ad={pt:0,base:16.7,ring:new Float32Array(300),n:0,t:0,since:0,probe:0,fr:0});
  const d=A.pt?t0-A.pt:0;A.pt=t0;if(skip||GQ.hold||GQ.L.length<2||!(d>0&&d<250)||document.hidden)return;
  A.base=d<A.base?A.base+(d-A.base)*.25:Math.min(34,A.base+.004);A.ring[A.n%300]=d;A.n++;A.since+=d;
  if(++A.fr%20)return;
  const stat=m=>{const n=Math.min(m,A.n);let miss=0,s=0;for(let j=1;j<=n;j++){const x=A.ring[(A.n-j)%300];s+=x;if(x>A.base*1.45)miss++}return [miss/Math.max(1,n),s/Math.max(1,n)]};
  const [m90,avg]=stat(90),i=GQ.i,now=t0;
  if(A.since>2500&&A.n>=60&&(m90>.1||avg>A.base*1.22)&&i<GQ.L.length-1){
    if(A.probe&&now<A.probe)GQ.fail[i]=Math.min(120000,(GQ.fail[i]||8000)*2);   // the rung we just climbed to failed: wait longer next time
    A.probe=0;A.since=0;A.n=0;g3qApply(i+1);return}
  if(i>0&&A.n>=300){const [m300]=stat(300),wait=GQ.fail[i-1]||8000;
    if(A.since>wait&&m300<.015&&(G3.cpu||0)<A.base*.6){A.probe=now+4000;A.since=0;A.n=0;g3qApply(i-1)}}}
function g3qStats(){const e=GQ.cur||{},P=GQ.P||{};
  return {q:g3qWant(),preset:P.id||'',rung:GQ.i+'/'+Math.max(0,GQ.L.length-1),px:G3.R?G3.R.getPixelRatio():0,msaa:GQPP.ok?e.msaa:0,shadow:e.shadow||0,soft:!!P.soft,
    bloom:GQPP.ok&&e.bloom>0?e.bloom:0,ao:!!(GQPP.ok&&e.ao),aniso:G3.aniso||0,det:typeof A3!=='undefined'?A3.det|0:0,post:GQPP.ok,
    passes:GQPP.ok?['scene'+(e.msaa?' msaa'+e.msaa:'')].concat(e.ao?['gtao½','denoise½']:[],e.bloom>0?['bloom '+(e.bloom===1?'½':'¼')+' ×12']:[],['output+grade']):['direct'],err:GQPP.err||''}}
/* the old 2D "Graphics quality" (High / Battery saver) row only affects the 2D view: hide it while 3D is on */
for(const e of SETTINGS_EXTRA)if(e.key==='gfxQ'&&!e.when)e.when=()=>!(typeof is3D==='function'&&is3D());
