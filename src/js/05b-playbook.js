/* =========================================================
   05b · Playbook: formations, routes, 50 plays, AI play-calling
   Offense always attacks +x. Route waypoints are [forward, inward] in yards
   (inward = toward the middle of the field from the player's side).
   ========================================================= */
const ROUTES={
  go:{w:[[30,0]]},fade:{w:[[28,-3]]},slant:{w:[[2.5,0],[16,9]]},out:{w:[[9,0],[9.5,-11]]},qout:{w:[[5,0],[5.5,-9]]},deepout:{w:[[15,0],[15.5,-12]]},
  dig:{w:[[12,0],[12.5,16]]},cross:{w:[[10,0],[12,20]]},deepcross:{w:[[16,0],[18,26]]},shallow:{w:[[2,2],[3.5,24]]},drag:{w:[[2,3],[5,24]]},
  post:{w:[[11,0],[28,10]]},corner:{w:[[11,0],[24,-10]]},sail:{w:[[9,0],[17,-8]]},postcorner:{w:[[10,0],[15,4],[26,-8]]},outup:{w:[[6,0],[6.5,-3],[30,-4]]},
  curl:{w:[[12,0],[10,1.5]],stop:true},comeback:{w:[[15,0],[12.5,-3.5]],stop:true},hitch:{w:[[6,0],[5,.5]],stop:true},stick:{w:[[6,0],[6,2]],stop:true},spot:{w:[[6,1],[6.5,2.5]],stop:true},
  seam:{w:[[26,1]]},whip:{w:[[5,3],[5.5,-7]]},flat:{w:[[1,-2.5],[3,-10]]},check:{w:[[1.5,-3.5],[3,-5]],stop:true},wheel:{w:[[2,-6],[6,-9],[28,-9]]},swing:{w:[[-1,-4],[2,-11]]},
  bubble:{w:[[-1.5,-3],[0,-8]],stop:true},screen:{w:[[-2,-4],[-1.5,-8]],stop:true},tunnel:{w:[[-1,4],[0,9]],stop:true}
};
/* x = yards behind the line (negative), y = yards from the ball (negative = top side before mirroring) */
const FORMS={
  'Gun Doubles':{QB:[-5,0],R:[-5.2,-1.7],X:[-.7,-19],H:[-1.3,-9.5],Y:[-.9,3.6],Z:[-.7,19]},
  'Gun Trips':{QB:[-5,0],R:[-5.2,-1.7],X:[-.7,-19],H:[-1.3,9],Y:[-1.3,13.5],Z:[-.7,19]},
  'Gun Empty':{QB:[-5,0],R:[-1.3,6.5],X:[-.7,-19],H:[-1.3,-9.5],Y:[-1.3,13],Z:[-.7,19]},
  'Singleback':{QB:[-1.3,0],R:[-6.5,0],X:[-.7,-19],H:[-1.3,-9.5],Y:[-.9,3.6],Z:[-.7,19]},
  'I-Form':{QB:[-1.3,0],R:[-7,0],X:[-.7,-19],H:[-4,0],Y:[-.9,3.6],Z:[-.7,19]},
  'Pistol':{QB:[-4,0],R:[-6.8,0],X:[-.7,-19],H:[-1.3,-9.5],Y:[-.9,3.6],Z:[-.7,19]}
};
const PL=(name,cat,form,r,extra)=>Object.assign({name,cat,form,r},extra||{});
const RN=(name,form,run,r,extra)=>PL(name,'run',form,r||{},Object.assign({run},extra||{}));
const PLAYBOOK=[
  PL('Four Verticals','pass','Gun Doubles',{X:'go',H:'seam',Y:'seam',Z:'go',R:'check'}),
  PL('Mesh','pass','Gun Doubles',{X:'post',H:'shallow',Y:'drag',Z:'dig',R:'swing'}),
  PL('Smash','pass','Gun Doubles',{X:'hitch',H:'corner',Y:'corner',Z:'hitch',R:'flat'}),
  PL('Flood','pass','Gun Trips',{X:'dig',H:'out',Y:'flat',Z:'go',R:'check'}),
  PL('Y-Cross','pass','Gun Trips',{X:'post',H:'flat',Y:'deepcross',Z:'go',R:'check'}),
  PL('Slants','pass','Gun Doubles',{X:'slant',H:'slant',Y:'seam',Z:'slant',R:'flat'}),
  PL('Stick','pass','Gun Trips',{X:'go',H:'stick',Y:'flat',Z:'stick',R:'check'}),
  PL('Curl Flat','pass','Gun Doubles',{X:'curl',H:'flat',Y:'curl',Z:'curl',R:'flat'}),
  PL('Dagger','pass','Gun Doubles',{X:'dig',H:'seam',Y:'drag',Z:'go',R:'check'}),
  PL('Post Wheel','pass','Gun Doubles',{X:'post',H:'fade',Y:'seam',Z:'post',R:'wheel'}),
  PL('Drive','pass','Singleback',{X:'dig',H:'shallow',Y:'seam',Z:'go',R:'flat'}),
  PL('Levels','pass','Gun Trips',{X:'go',H:'cross',Y:'shallow',Z:'dig',R:'check'}),
  PL('Spacing','pass','Gun Empty',{X:'hitch',H:'spot',Y:'spot',Z:'hitch',R:'spot'}),
  PL('Hitch Seam','pass','Gun Doubles',{X:'hitch',H:'seam',Y:'seam',Z:'hitch',R:'check'}),
  PL('Comebacks','pass','Singleback',{X:'comeback',H:'out',Y:'curl',Z:'comeback',R:'flat'}),
  PL('Out & Up','pass','Gun Doubles',{X:'outup',H:'out',Y:'seam',Z:'outup',R:'check'}),
  PL('Corner Post','pass','Gun Doubles',{X:'postcorner',H:'post',Y:'corner',Z:'post',R:'flat'}),
  PL('Deep Outs','pass','Singleback',{X:'deepout',H:'curl',Y:'out',Z:'deepout',R:'flat'}),
  PL('Shallow Cross','pass','Gun Trips',{X:'go',H:'shallow',Y:'dig',Z:'post',R:'swing'}),
  PL('Whip','pass','Gun Trips',{X:'go',H:'whip',Y:'seam',Z:'out',R:'check'}),
  PL('Fades','pass','Gun Empty',{X:'fade',H:'seam',Y:'seam',Z:'fade',R:'fade'}),
  PL('Quick Outs','pass','Gun Doubles',{X:'qout',H:'qout',Y:'seam',Z:'qout',R:'check'}),
  PL('Sail','pass','Gun Trips',{X:'go',H:'sail',Y:'flat',Z:'go',R:'check'}),
  PL('Spot','pass','Gun Trips',{X:'go',H:'spot',Y:'flat',Z:'corner',R:'check'}),
  PL('RB Screen','pass','Gun Doubles',{X:'go',H:'go',Y:'block',Z:'go',R:'screen'},{screen:'R'}),
  PL('Bubble Screen','pass','Gun Trips',{X:'block',H:'bubble',Y:'block',Z:'block',R:'block'},{screen:'H'}),
  PL('Tunnel Screen','pass','Gun Doubles',{X:'go',H:'block',Y:'block',Z:'tunnel',R:'block'},{screen:'Z'}),
  PL('PA Boot','pass','Singleback',{X:'go',H:'cross',Y:'flat',Z:'dig',R:'flat'},{pa:true}),
  PL('PA Deep Shot','pass','I-Form',{X:'post',H:'block',Y:'seam',Z:'go',R:'block'},{pa:true}),
  PL('PA Crossers','pass','Pistol',{X:'deepcross',H:'shallow',Y:'seam',Z:'post',R:'check'},{pa:true}),
  PL('Flea Flicker','pass','Singleback',{X:'post',H:'go',Y:'seam',Z:'go',R:'block'},{flea:true}),
  PL('Hail Mary','pass','Gun Empty',{X:'go',H:'go',Y:'go',Z:'go',R:'go'},{hail:true}),
  RN('Inside Zone','Gun Doubles',{carrier:'R',gap:1.6}),
  RN('Outside Zone','Singleback',{carrier:'R',gap:5.5}),
  RN('Power','I-Form',{carrier:'R',gap:3.3,lead:'H'}),
  RN('Counter','Singleback',{carrier:'R',gap:-3.3,counter:true}),
  RN('Dive','I-Form',{carrier:'R',gap:.6,quick:true,lead:'H'}),
  RN('HB Draw','Gun Doubles',{carrier:'R',gap:1.4,delay:.6}),
  RN('Toss','Singleback',{carrier:'R',gap:8,toss:true}),
  RN('Stretch','Pistol',{carrier:'R',gap:6.5}),
  RN('Jet Sweep','Gun Doubles',{carrier:'H',gap:-11,jet:true}),
  RN('Reverse','Singleback',{carrier:'Z',gap:-9,reverse:true}),
  RN('QB Draw','Gun Empty',{carrier:'QB',gap:0,delay:.5}),
  RN('QB Power','Gun Doubles',{carrier:'QB',gap:2.4,lead:'R'}),
  RN('Read Option','Pistol',{carrier:'R',gap:1.6,read:true}),
  RN('Speed Option','Gun Doubles',{carrier:'QB',gap:7,option:true}),
  RN('Triple Option','I-Form',{carrier:'QB',gap:6,option:true,lead:'H'}),
  RN('Trap','Singleback',{carrier:'R',gap:0,trap:true}),
  RN('Iso','I-Form',{carrier:'R',gap:1.1,lead:'H'}),
  RN('QB Sneak','Singleback',{carrier:'QB',gap:0,quick:true,sneak:true})
];
PLAYBOOK.forEach((p,i)=>p.id=i);
const playByName=n=>PLAYBOOK.find(p=>p.name===n);
const DEF_CALLS=[['man','Cover 1','Man coverage, one deep safety'],['cover2','Cover 2','Two deep halves, corners sit in the flats'],['cover3','Cover 3','Three deep thirds, four underneath'],['cover4','Quarters','Four deep, take away the long ball'],['blitz','Blitz','Send the linebackers'],['prevent','Prevent','Everyone deep; give up the short stuff']];

/* team schemes (real where known) shape AI play-calling and simulated stats */
const SCHEME_OVR={ARMY:'Option',NAVY:'Option',AF:'Option',KENN:'Option',TTU:'Air Raid',WSU:'Air Raid',UNT:'Air Raid',ORST:'Power',WIS:'Power',IOWA:'Pro',STAN:'Pro',MICH:'Power',ALA:'Pro',UGA:'Pro',OSU:'Spread',ORE:'Spread',MISS:'Air Raid',UTAH:'Power',KSU:'Power',NDSU:'Power',SDST:'Power',MTST:'Option',BYU:'Pro',IU:'Spread',TEX:'Spread',LSU:'Pro',TAMU:'Spread',ND:'Pro',MIA:'Spread',COLO:'Spread',CLEM:'Spread',PSU:'Pro',USC:'Air Raid',OKST:'Air Raid',HOU:'Air Raid',WKU:'Air Raid',UGS:'Option',GASO:'Option',ODU:'Spread',JMU:'Spread'};
function schemeOf(t){if(!t.scheme)t.scheme=SCHEME_OVR[t.abbr]||pick(['Spread','Spread','Pro','Power','Air Raid']);return t.scheme}
function aiPickPlay(team,sit){
  const sc=schemeOf(team),pool=[];
  const passW={'Air Raid':.68,'Spread':.55,'Pro':.48,'Power':.36,'Option':.18}[sc]||.5;
  let pPass=passW;if(sit.toGo>=8)pPass+=.18;if(sit.toGo<=2)pPass-=.25;if(sit.trailingLate)pPass+=.3;if(sit.leadingLate)pPass-=.3;
  const pass=Math.random()<clamp(pPass,.05,.95);
  for(const p of PLAYBOOK){if((p.cat==='pass')!==pass)continue;if(p.hail&&!sit.lastPlay)continue;if(p.run&&p.run.sneak&&sit.toGo>1)continue;
    let w=1;
    if(sc==='Option'&&p.run&&(p.run.option||p.run.read||p.name==='Dive'||p.name==='Iso'))w=5;
    if(sc==='Air Raid'&&['Mesh','Four Verticals','Y-Cross','Stick','Shallow Cross','Spacing'].includes(p.name))w=4;
    if(sc==='Power'&&p.form==='I-Form')w=3;
    if(sc==='Spread'&&(p.form.startsWith('Gun')||p.name==='Read Option'))w=2.5;
    if(sc==='Pro'&&(p.pa||p.form==='Singleback'))w=2.5;
    if(p.flea||p.run&&p.run.reverse)w=.25;
    if(sit.toGo>=10&&p.screen)w*=1.5;if(sit.redzone&&['Fades','Slants','Corner Post','Smash'].includes(p.name))w*=2;
    pool.push([p,w])}
  let r=Math.random()*sum(pool.map(x=>x[1]));for(const [p,w] of pool){if((r-=w)<=0)return p}return pool[0][0];
}
function aiPickCoverage(team,sit){
  const sc=schemeOf(team);const opts=[['man',3],['cover2',2],['cover3',3],['cover4',2],['blitz',sit&&sit.toGo<=3?3:1.6],['prevent',sit&&sit.prevent?6:0]];
  let r=Math.random()*sum(opts.map(o=>o[1]));for(const [k,w] of opts){if((r-=w)<=0)return k}return 'cover3';
}

/* tiny play diagram for the playbook grid */
function playSVG(p){
  const f=FORMS[p.form],X0=48,sx=1.8,sy=.82,Y=y=>28+y*sy,Xp=x=>X0+x*sx;let s=`<svg viewBox="0 0 100 56" aria-hidden="true"><line x1="${X0}" y1="3" x2="${X0}" y2="53" stroke="rgba(77,163,255,.7)" stroke-width="1"/>`;
  for(const dy of [-2.2,-1.1,0,1.1,2.2])s+=`<rect x="${Xp(-.7)-1.6}" y="${Y(dy)-1.6}" width="3.2" height="3.2" fill="#9aa4b2"/>`;
  const draw=(k,pos)=>{const [x,y]=pos;const px=Xp(x),py=Y(y);s+=`<circle cx="${px}" cy="${py}" r="2.2" fill="${k==='QB'?'#fff':'var(--team)'}"/>`;
    const rt=p.r&&p.r[k];if(rt&&ROUTES[rt]){const inD=y<0?1:y>0?-1:1;let pts=[[px,py]];let cx=x,cy=y;for(const [a,b] of ROUTES[rt].w){pts.push([Xp(x+a),Y(clamp(y+b*inD,-26,26))])}
      if(!ROUTES[rt].stop){const a=pts[pts.length-2],z=pts[pts.length-1],dx=z[0]-a[0],dy=z[1]-a[1],d=hyp(dx,dy)||1;pts.push([z[0]+dx/d*6,z[1]+dy/d*6])}
      s+=`<polyline points="${pts.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${p.screen===k?'#FFD23F':'#fff'}" stroke-width="1.4" stroke-linejoin="round" opacity=".9"/>`}
    if(p.run&&p.run.carrier===k){const g=p.run.gap;s+=`<path d="M${px},${py} L${Xp(2)},${Y(g)} L${Xp(9)},${Y(g)}" fill="none" stroke="#FFD23F" stroke-width="1.6"/>`}};
  for(const k of ['X','H','Y','Z','R','QB'])draw(k,f[k]);
  return s+'</svg>';
}
