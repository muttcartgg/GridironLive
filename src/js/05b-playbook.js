/* =========================================================
   05b · Playbook: formations, routes, 110 plays, situational AI play-calling
   Offense always attacks +x. Route waypoints are [forward, inward] in yards
   (inward = toward the middle of the field from the player's side).
   Play tags read by the engine (05 / 05g): run.read (zone read: QB reads the unblocked backside end),
   run.midline (read the playside 3-technique), run.inv (power read: keep inside / give outside),
   run.triple (dive key, then the pitch key), run.option (speed option pitch), run.rpo (QB reads the
   overhang defender: hand off, or pull and throw to run.rpo[0]), run.pull (pulling linemen), pa, screen,
   flea, dbl (lateral, then that player throws), hail. v = what the concept beats (coach's picks + CPU):
   m man · 3 single-high zone · 2 Cover 2 · 4 quarters · b pressure · l light box · h short yardage
   ========================================================= */
const ROUTES={
  go:{w:[[30,0]]},fade:{w:[[28,-3]]},slant:{w:[[2.5,0],[16,9]]},out:{w:[[9,0],[9.5,-11]]},qout:{w:[[5,0],[5.5,-9]]},deepout:{w:[[15,0],[15.5,-12]]},
  dig:{w:[[12,0],[12.5,16]]},cross:{w:[[10,0],[12,20]]},deepcross:{w:[[16,0],[18,26]]},shallow:{w:[[2,2],[3.5,24]]},drag:{w:[[2,3],[5,24]]},
  post:{w:[[11,0],[28,10]]},corner:{w:[[11,0],[24,-10]]},sail:{w:[[9,0],[17,-8]]},postcorner:{w:[[10,0],[15,4],[26,-8]]},outup:{w:[[6,0],[6.5,-3],[30,-4]]},
  curl:{w:[[12,0],[10,1.5]],stop:true},comeback:{w:[[15,0],[12.5,-3.5]],stop:true},hitch:{w:[[6,0],[5,.5]],stop:true},stick:{w:[[6,0],[6,2]],stop:true},spot:{w:[[6,1],[6.5,2.5]],stop:true},
  seam:{w:[[26,1]]},whip:{w:[[5,3],[5.5,-7]]},flat:{w:[[1,-2.5],[3,-10]]},check:{w:[[1.5,-3.5],[3,-5]],stop:true},wheel:{w:[[2,-6],[6,-9],[28,-9]]},swing:{w:[[-1,-4],[2,-11]]},
  bubble:{w:[[-1.5,-3],[0,-8]],stop:true},screen:{w:[[-2,-4],[-1.5,-8]],stop:true},tunnel:{w:[[-1,4],[0,9]],stop:true},
  glance:{w:[[5,0],[17,5]]},skinny:{w:[[8,0],[24,3.5]]},snag:{w:[[5,1.5],[5.5,3.5]],stop:true},arrow:{w:[[1.5,-2],[4,-9]]},angle:{w:[[1,-3],[3.5,-3.5],[6,3]]},
  leak:{w:[[1,-1.5],[3,-6],[16,-12]]},pop:{w:[[5,0],[14,1]]},flag:{w:[[6,0],[15,-7]]},sit:{w:[[8,0],[7.5,.5]],stop:true},slip:{w:[[-1,3],[0,8]],stop:true},
  mscreen:{w:[[1.5,1],[3,1.5]],stop:true},tescreen:{w:[[.5,-2],[0,-6]],stop:true},dblback:{w:[[-1.5,-2],[-2.5,-3]],stop:true}
};
/* x = yards behind the line (negative), y = yards from the ball (negative = top side before mirroring).
   roles: who lines up at H/Y/X/Z/QB/R when it is not the usual 11-personnel WR/TE/RB; g = formation family (filter chips) */
const FORMS={
  'Gun Doubles':{QB:[-5,0],R:[-5.2,-1.7],X:[-.7,-19],H:[-1.3,-9.5],Y:[-.9,3.6],Z:[-.7,19],g:'Shotgun',pers:'11'},
  'Gun Trips':{QB:[-5,0],R:[-5.2,-1.7],X:[-.7,-19],H:[-1.3,9],Y:[-1.3,13.5],Z:[-.7,19],g:'Trips',pers:'11'},
  'Gun Bunch':{QB:[-5,0],R:[-5.2,-1.7],X:[-.7,-19],H:[-2.4,9.4],Y:[-1.2,8.2],Z:[-1.3,10.8],g:'Bunch',pers:'11'},
  'Gun Empty':{QB:[-5,0],R:[-1.3,6.5],X:[-.7,-19],H:[-1.3,-9.5],Y:[-1.3,13],Z:[-.7,19],g:'Empty',pers:'10'},
  'Pistol':{QB:[-4,0],R:[-6.8,0],X:[-.7,-19],H:[-1.3,-9.5],Y:[-.9,3.6],Z:[-.7,19],g:'Pistol',pers:'11'},
  'Pistol Ace':{QB:[-4,0],R:[-6.8,0],X:[-.7,-19],H:[-.9,-3.6],Y:[-.9,3.6],Z:[-.7,19],roles:{H:'TE'},g:'Pistol',pers:'12'},
  'Singleback':{QB:[-1.3,0],R:[-6.5,0],X:[-.7,-19],H:[-1.3,-9.5],Y:[-.9,3.6],Z:[-.7,19],g:'Singleback',pers:'11'},
  'Singleback Ace':{QB:[-1.3,0],R:[-6.5,0],X:[-.7,-19],H:[-.9,-3.6],Y:[-.9,3.6],Z:[-.7,19],roles:{H:'TE'},g:'Singleback',pers:'12'},
  'I-Form':{QB:[-1.3,0],R:[-7,0],X:[-.7,-19],H:[-4,0],Y:[-.9,3.6],Z:[-.7,19],roles:{H:'RB'},g:'I-Form',pers:'21'},
  'Flexbone':{QB:[-1.3,0],R:[-4.6,0],X:[-.7,-15],H:[-1.6,-4.8],Y:[-1.6,4.8],Z:[-.7,15],roles:{Y:'RB'},g:'Flexbone',pers:'30'},
  'Wildcat':{QB:[-5,0],R:[-1.3,-9.5],X:[-.7,-19],H:[-4.6,1.8],Y:[-.9,3.6],Z:[-.7,19],roles:{QB:'RB',R:'WR',H:'RB'},g:'Wildcat',pers:'21'},
  'Jumbo':{QB:[-1.3,0],R:[-7,0],X:[-.9,-3.6],H:[-4,0],Y:[-.9,3.6],Z:[-1.7,4.9],roles:{X:'TE',H:'RB',Z:'TE'},g:'Jumbo',pers:'23'}
};
const PL=(name,cat,form,r,extra)=>Object.assign({name,cat,form,r},extra||{});
const RN=(name,form,run,r,extra)=>PL(name,'run',form,r||{},Object.assign({run},extra||{}));
const B='block';
const PLAYBOOK=[
  /* ---- dropback & quick game ---- */
  PL('Four Verticals','pass','Gun Doubles',{X:'go',H:'seam',Y:'seam',Z:'go',R:'check'},{v:'3m'}),
  PL('Mesh','pass','Gun Doubles',{X:'post',H:'shallow',Y:'drag',Z:'dig',R:'swing'},{v:'mb'}),
  PL('Smash','pass','Gun Doubles',{X:'hitch',H:'corner',Y:'corner',Z:'hitch',R:'flat'},{v:'2'}),
  PL('Flood','pass','Gun Trips',{X:'dig',H:'out',Y:'flat',Z:'go',R:'check'},{v:'3'}),
  PL('Y-Cross','pass','Gun Trips',{X:'post',H:'flat',Y:'deepcross',Z:'go',R:'check'},{v:'3m'}),
  PL('Slants','pass','Gun Doubles',{X:'slant',H:'slant',Y:'seam',Z:'slant',R:'flat'},{v:'mb2'}),
  PL('Stick','pass','Gun Trips',{X:'go',H:'stick',Y:'flat',Z:'stick',R:'check'},{v:'3z'}),
  PL('Curl Flat','pass','Gun Doubles',{X:'curl',H:'flat',Y:'curl',Z:'curl',R:'flat'},{v:'3'}),
  PL('Dagger','pass','Gun Doubles',{X:'dig',H:'seam',Y:'drag',Z:'go',R:'check'},{v:'43'}),
  PL('Post Wheel','pass','Gun Doubles',{X:'post',H:'fade',Y:'seam',Z:'post',R:'wheel'},{v:'3m'}),
  PL('Drive','pass','Singleback',{X:'dig',H:'shallow',Y:'seam',Z:'go',R:'flat'},{v:'m3'}),
  PL('Levels','pass','Gun Trips',{X:'go',H:'cross',Y:'shallow',Z:'dig',R:'check'},{v:'4z'}),
  PL('Spacing','pass','Gun Empty',{X:'hitch',H:'spot',Y:'spot',Z:'hitch',R:'spot'},{v:'zb'}),
  PL('Hitch Seam','pass','Gun Doubles',{X:'hitch',H:'seam',Y:'seam',Z:'hitch',R:'check'},{v:'3'}),
  PL('Comebacks','pass','Singleback',{X:'comeback',H:'out',Y:'curl',Z:'comeback',R:'flat'},{v:'3',two:1}),
  PL('Out & Up','pass','Gun Doubles',{X:'outup',H:'out',Y:'seam',Z:'outup',R:'check'},{v:'m2'}),
  PL('Corner Post','pass','Gun Doubles',{X:'postcorner',H:'post',Y:'corner',Z:'post',R:'flat'},{v:'4'}),
  PL('Deep Outs','pass','Singleback',{X:'deepout',H:'curl',Y:'out',Z:'deepout',R:'flat'},{v:'3',two:1}),
  PL('Shallow Cross','pass','Gun Trips',{X:'go',H:'shallow',Y:'dig',Z:'post',R:'swing'},{v:'m'}),
  PL('Whip','pass','Gun Trips',{X:'go',H:'whip',Y:'seam',Z:'out',R:'check'},{v:'m'}),
  PL('Fades','pass','Gun Empty',{X:'fade',H:'seam',Y:'seam',Z:'fade',R:'fade'},{v:'m'}),
  PL('Quick Outs','pass','Gun Doubles',{X:'qout',H:'qout',Y:'seam',Z:'qout',R:'check'},{v:'3b',two:1}),
  PL('Sail','pass','Gun Trips',{X:'go',H:'sail',Y:'flat',Z:'go',R:'check'},{v:'3',two:1}),
  PL('Spot','pass','Gun Trips',{X:'go',H:'spot',Y:'flat',Z:'corner',R:'check'},{v:'2z'}),
  PL('Slant Flat','pass','Gun Doubles',{X:'slant',H:'arrow',Y:'arrow',Z:'slant',R:'check'},{v:'2b'}),
  PL('Snag','pass','Gun Bunch',{X:'go',H:'snag',Y:'arrow',Z:'corner',R:'check'},{v:'3z'}),
  PL('Bunch Stick','pass','Gun Bunch',{X:'slant',H:'stick',Y:'arrow',Z:'go',R:'check'},{v:'zb'}),
  PL('Bunch Cross','pass','Gun Bunch',{X:'post',H:'shallow',Y:'cross',Z:'out',R:'swing'},{v:'m'}),
  PL('Empty Mesh','pass','Gun Empty',{X:'go',H:'shallow',Y:'drag',Z:'dig',R:'out'},{v:'mb'}),
  PL('Empty Stick','pass','Gun Empty',{X:'slant',H:'stick',Y:'arrow',Z:'go',R:'stick'},{v:'zb'}),
  PL('Mills','pass','Gun Doubles',{X:'go',H:'post',Y:'drag',Z:'dig',R:'check'},{v:'43'}),
  PL('Texas','pass','Singleback',{X:'go',H:'curl',Y:'out',Z:'post',R:'angle'},{v:'m'}),
  PL('Trips Verts','pass','Gun Trips',{X:'go',H:'seam',Y:'seam',Z:'go',R:'check'},{v:'3'}),
  PL('Trips Outs','pass','Gun Trips',{X:'out',H:'qout',Y:'out',Z:'comeback',R:'check'},{v:'3',two:1}),
  PL('Empty Outs','pass','Gun Empty',{X:'out',H:'qout',Y:'seam',Z:'out',R:'qout'},{v:'3b',two:1}),
  PL('Sticks Sit','pass','Gun Doubles',{X:'sit',H:'sit',Y:'arrow',Z:'sit',R:'check'},{v:'z'}),
  PL('Hail Mary','pass','Gun Empty',{X:'go',H:'go',Y:'go',Z:'go',R:'go'},{hail:true}),
  /* ---- play-action ---- */
  PL('PA Boot','pass','Singleback',{X:'go',H:'cross',Y:'flat',Z:'dig',R:'flat'},{pa:true,v:'3m'}),
  PL('PA Deep Shot','pass','I-Form',{X:'post',H:B,Y:'seam',Z:'go',R:B},{pa:true,v:'3'}),
  PL('PA Crossers','pass','Pistol',{X:'deepcross',H:'shallow',Y:'seam',Z:'post',R:'check'},{pa:true,v:'m3'}),
  PL('PA Post','pass','I-Form',{X:'post',H:'leak',Y:'dig',Z:'go',R:B},{pa:true,v:'3'}),
  PL('Yankee','pass','I-Form',{X:'deepcross',H:B,Y:B,Z:'post',R:B},{pa:true,v:'34'}),
  PL('PA Sail','pass','Pistol',{X:'go',H:'sail',Y:'arrow',Z:'cross',R:'flat'},{pa:true,v:'3'}),
  PL('PA Seams','pass','Pistol Ace',{X:'go',H:'seam',Y:'seam',Z:'post',R:'check'},{pa:true,v:'3'}),
  PL('PA Leak','pass','I-Form',{X:'post',H:'leak',Y:'drag',Z:'go',R:B},{pa:true,v:'m'}),
  PL('Gun PA Dagger','pass','Gun Doubles',{X:'dig',H:'seam',Y:'drag',Z:'go',R:'check'},{pa:true,v:'4'}),
  PL('Flexbone PA','pass','Flexbone',{X:'post',H:'wheel',Y:'seam',Z:'go',R:B},{pa:true,v:'m3'}),
  /* ---- screens ---- */
  PL('RB Screen','pass','Gun Doubles',{X:'go',H:'go',Y:B,Z:'go',R:'screen'},{screen:'R',v:'b'}),
  PL('Bubble Screen','pass','Gun Trips',{X:B,H:'bubble',Y:B,Z:B,R:B},{screen:'H',v:'bl'}),
  PL('Tunnel Screen','pass','Gun Doubles',{X:'go',H:B,Y:B,Z:'tunnel',R:B},{screen:'Z',v:'b'}),
  PL('RB Slip Screen','pass','Pistol',{X:'go',H:'go',Y:'seam',Z:'go',R:'slip'},{screen:'R',v:'b'}),
  PL('TE Screen','pass','Singleback',{X:'go',H:'go',Y:'tescreen',Z:'go',R:B},{screen:'Y',v:'b'}),
  PL('Jailbreak','pass','Gun Trips',{X:'go',H:B,Y:B,Z:'tunnel',R:B},{screen:'Z',v:'b'}),
  PL('Middle Screen','pass','Gun Doubles',{X:'go',H:'go',Y:'seam',Z:'go',R:'mscreen'},{screen:'R',v:'b'}),
  /* ---- runs ---- */
  RN('Inside Zone','Gun Doubles',{carrier:'R',gap:1.6},null,{v:'l'}),
  RN('Outside Zone','Singleback',{carrier:'R',gap:5.5},null,{v:'l'}),
  RN('Power','I-Form',{carrier:'R',gap:3.3,lead:'H',pull:1},null,{v:'h'}),
  RN('Counter','Singleback',{carrier:'R',gap:-3.3,counter:true,pull:1},null,{v:'lh'}),
  RN('Dive','I-Form',{carrier:'R',gap:.6,quick:true,lead:'H'},null,{v:'h'}),
  RN('HB Draw','Gun Doubles',{carrier:'R',gap:1.4,delay:.6},null,{v:'bl'}),
  RN('Toss','Singleback',{carrier:'R',gap:8,toss:true},null,{v:'l'}),
  RN('Stretch','Pistol',{carrier:'R',gap:6.5},null,{v:'l'}),
  RN('Jet Sweep','Gun Doubles',{carrier:'H',gap:-11,jet:true},null,{v:'mb'}),
  RN('QB Draw','Gun Empty',{carrier:'QB',gap:0,delay:.5},null,{v:'m'}),
  RN('QB Power','Gun Doubles',{carrier:'QB',gap:2.4,lead:'R',pull:1},null,{v:'hl'}),
  RN('Trap','Singleback',{carrier:'R',gap:0,trap:true},null,{v:'b'}),
  RN('Iso','I-Form',{carrier:'R',gap:1.1,lead:'H'},null,{v:'h'}),
  RN('Duo','Singleback Ace',{carrier:'R',gap:1.2,duo:true},null,{v:'hl'}),
  RN('Pistol Zone','Pistol',{carrier:'R',gap:1.6},null,{v:'l'}),
  RN('Pistol Power','Pistol Ace',{carrier:'R',gap:3.3,pull:1,lead:'H'},null,{v:'h'}),
  RN('Counter GT','Gun Doubles',{carrier:'R',gap:-3.3,counter:true,pull:2},null,{v:'lb'}),
  RN('Split Zone','Pistol Ace',{carrier:'R',gap:1.4,lead:'H'},null,{v:'l'}),
  RN('Zone Weak','I-Form',{carrier:'R',gap:-1.6,lead:'H'},null,{v:'l'}),
  RN('Power Ace','Singleback Ace',{carrier:'R',gap:3.3,pull:1,lead:'H'},null,{v:'h'}),
  RN('Gun Outside Zone','Gun Trips',{carrier:'R',gap:5.5},null,{v:'l'}),
  RN('Toss Crack','I-Form',{carrier:'R',gap:8,toss:true,lead:'H'},null,{v:'l'}),
  RN('Pin & Pull','Singleback Ace',{carrier:'R',gap:7,pull:2},null,{v:'l'}),
  RN('Counter Trey','I-Form',{carrier:'R',gap:-3.3,counter:true,lead:'H',pull:1},null,{v:'h'}),
  RN('Wham','Singleback Ace',{carrier:'R',gap:.3,trap:true,lead:'H'},null,{v:'b'}),
  RN('Trips Draw','Gun Trips',{carrier:'R',gap:1.2,delay:.6},null,{v:'b'}),
  RN('QB Counter','Gun Doubles',{carrier:'QB',gap:-3,counter:true,pull:2},null,{v:'l'}),
  RN('Flexbone Dive','Flexbone',{carrier:'R',gap:.8,quick:true},null,{v:'h'}),
  RN('Flexbone Trap','Flexbone',{carrier:'R',gap:0,trap:true},null,{v:'b'}),
  RN('Rocket Toss','Flexbone',{carrier:'H',gap:-10,jet:true},null,{v:'m'}),
  /* ---- RPO & option ---- */
  RN('Read Option','Pistol',{carrier:'R',gap:1.6,read:true},null,{v:'ml'}),
  RN('Zone Read','Gun Doubles',{carrier:'R',gap:1.6,read:true},null,{v:'ml'}),
  RN('Midline','Flexbone',{carrier:'R',gap:.5,read:true,midline:true},null,{v:'hm'}),
  RN('Power Read','Gun Doubles',{carrier:'R',gap:8,read:true,inv:true,pull:1},null,{v:'m'}),
  RN('Speed Option','Gun Doubles',{carrier:'QB',gap:7,option:true},null,{v:'m'}),
  RN('Pistol Speed Option','Pistol',{carrier:'QB',gap:7,option:true},null,{v:'m'}),
  RN('Triple Option','I-Form',{carrier:'H',gap:1.2,triple:'R'},null,{v:'mh'}),
  RN('Flexbone Triple','Flexbone',{carrier:'R',gap:1.4,triple:'Y'},null,{v:'mh'}),
  RN('RPO Glance','Gun Doubles',{carrier:'R',gap:1.6,rpo:['X']},{X:'glance'},{v:'3l'}),
  RN('RPO Bubble','Gun Trips',{carrier:'R',gap:-1.6,rpo:['H']},{H:'bubble'},{v:'lz'}),
  RN('RPO Stick','Gun Trips',{carrier:'R',gap:-1.6,rpo:['H','Y']},{H:'stick',Y:'arrow'},{v:'z'}),
  RN('RPO Slant','Gun Doubles',{carrier:'R',gap:1.6,rpo:['Z']},{Z:'slant'},{v:'3b'}),
  RN('RPO Pop','Pistol Ace',{carrier:'R',gap:1.2,rpo:['Y']},{Y:'pop'},{v:'3h'}),
  RN('RPO Hitch','Gun Doubles',{carrier:'R',gap:3.3,pull:1,rpo:['X']},{X:'hitch'},{v:'z'}),
  /* ---- trick plays (fakes stay in Special) ---- */
  PL('Flea Flicker','pass','Singleback',{X:'post',H:'go',Y:'seam',Z:'go',R:B},{flea:true,v:'3'}),
  RN('Reverse','Singleback',{carrier:'Z',gap:-9,reverse:true},null,{v:'b'}),
  RN('End Around','Gun Doubles',{carrier:'X',gap:-9,reverse:true},null,{v:'b'}),
  PL('Double Pass','pass','Gun Trips',{X:'go',H:'dblback',Y:'seam',Z:'post',R:B},{dbl:'H',v:'3'}),
  PL('HB Pass','pass','I-Form',{X:'post',H:B,Y:'seam',Z:'go',R:'swing'},{dbl:'R',v:'3'}),
  /* ---- goal line & short yardage ---- */
  RN('QB Sneak','Singleback',{carrier:'QB',gap:0,quick:true,sneak:true},null,{v:'h'}),
  RN('Jumbo Dive','Jumbo',{carrier:'R',gap:.6,quick:true,lead:'H'},null,{v:'h',goal:1}),
  RN('Jumbo Power','Jumbo',{carrier:'R',gap:3.3,lead:'H',pull:1},null,{v:'h',goal:1}),
  RN('Jumbo Sneak','Jumbo',{carrier:'QB',gap:0,quick:true,sneak:true},null,{v:'h',goal:1}),
  RN('Jumbo Toss','Jumbo',{carrier:'R',gap:8,toss:true,lead:'H'},null,{v:'l',goal:1}),
  PL('Goal Line PA','pass','Jumbo',{X:'leak',H:'arrow',Y:'arrow',Z:'flag',R:B},{pa:true,v:'h',goal:1}),
  PL('Goal Line Fade','pass','Gun Doubles',{X:'fade',H:'slant',Y:'arrow',Z:'fade',R:'check'},{v:'m',goal:1}),
  RN('Wildcat Power','Wildcat',{carrier:'QB',gap:3,lead:'H',pull:1},null,{v:'h',goal:1}),
  RN('Wildcat Jet','Wildcat',{carrier:'R',gap:-10,jet:true},null,{v:'m',goal:1})
];
/* UI tab of a play */
const tabOf=p=>p.goal||p.run&&p.run.sneak?'goal':p.flea||p.dbl||p.run&&p.run.reverse?'trick':p.screen?'screen':p.pa?'pa':p.run&&(p.run.rpo||p.run.read||p.run.option||p.run.triple)?'rpo':p.cat;
/* derived: deepest route (yards), sideline routes, quick game */
const SIDE_R=new Set(['out','qout','deepout','comeback','corner','sail','fade','flat','wheel','outup','flag','arrow']);
PLAYBOOK.forEach((p,i)=>{p.id=i;p.tab=tabOf(p);let dp=0,sd=0;for(const k in p.r){const rt=ROUTES[p.r[k]];if(!rt)continue;const m=Math.max(...rt.w.map(w=>w[0]));dp=Math.max(dp,rt.stop?m:Math.max(m,22));if(SIDE_R.has(p.r[k]))sd++}
  p.depth=dp;p.side=sd;p.quick=p.cat==='pass'&&dp<=8&&!p.pa;p.v=p.v||''});
const playByName=n=>PLAYBOOK.find(p=>p.name===n);
/* defensive calls (05d assignCoverage / alignDefense). shell = safeties shown pre-snap ('1' single-high, '2' two-high;
   05d sometimes disguises it and rotates at the snap), press = corners may press. 'blitz' is Cover 0 (old saves keep it). */
const COVS={
  blitz:{n:'Cover 0',d:'All-out man blitz, no deep help',shell:'1',press:1},
  man:{n:'Cover 1',d:'Man under, one deep safety, a robber',shell:'1',press:1},
  spy:{n:'Cover 1 Spy',d:'Man, one deep, a linebacker shadows the QB',shell:'1',press:1},
  '2man':{n:'2-Man',d:'Trail man under two deep halves',shell:'2',press:1},
  cover2:{n:'Cover 2',d:'Two deep halves, corners squat the flats',shell:'2'},
  tampa2:{n:'Tampa 2',d:'Cover 2, the Mike runs the deep middle',shell:'2'},
  cover3:{n:'Cover 3',d:'Three deep thirds, four underneath',shell:'1'},
  cover4:{n:'Quarters',d:'Four deep, pattern-match the verticals',shell:'2'},
  cover6:{n:'Cover 6',d:'Quarters to the field, Cover 2 to the boundary',shell:'2'},
  firezone:{n:'Fire Zone',d:'Five-man pressure, three deep, three under',shell:'1'},
  agap:{n:'A-Gap Mug',d:'Linebackers in the A gaps, Cover 1 behind',shell:'1',press:1},
  cblitz:{n:'Nickel Blitz',d:'Slot corner off the edge, Cover 1 behind',shell:'1',press:1},
  prevent:{n:'Prevent',d:'Everyone deep; give up the short stuff',shell:'2'}
};
const DEF_CALLS=Object.entries(COVS).map(([k,c])=>[k,c.n,c.d]);
/* coverage family for the beats-letters: m man · 3 single-high zone · 2 Cover 2 · 4 quarters · b pressure */
const COV_FAM={blitz:'mb',man:'m',spy:'m','2man':'m',cover2:'2',tampa2:'2',cover3:'3',cover4:'4',cover6:'4',firezone:'3b',agap:'mb',cblitz:'mb',prevent:'4'};
/* defensive fronts: the same 11 slots, re-staffed (05 setupFormation). sub[key] = [role, depth list, depth index] */
const FRONTS={
  nickel:{n:'Nickel',d:'4-2-5 · default vs spread'},
  '43':{n:'4-3',d:'Base · three linebackers',sub:{CB2:['LB','LB',2]}},
  '34':{n:'3-4',d:'Odd front · stand-up edges',sub:{DL3:['LB','LB',2],CB2:['LB','LB',3]},odd:1},
  '335':{n:'3-3-5',d:'Odd stack · speed & pressure',sub:{DL3:['LB','LB',2]},odd:1},
  dime:{n:'Dime',d:'Six DBs · 3rd & long',sub:{LB1:['CB','CB',3]}},
  goal:{n:'Goal Line',d:'Heavy · stop the run',sub:{CB2:['DL','DL',4],S1:['LB','LB',2]}}
};

/* team schemes (real where known) shape AI play-calling and simulated stats */
const SCHEME_OVR={ARMY:'Option',NAVY:'Option',AF:'Option',KENN:'Option',TTU:'Air Raid',WSU:'Air Raid',UNT:'Air Raid',ORST:'Power',WIS:'Power',IOWA:'Pro',STAN:'Pro',MICH:'Power',ALA:'Pro',UGA:'Pro',OSU:'Spread',ORE:'Spread',MISS:'Air Raid',UTAH:'Power',KSU:'Power',NDSU:'Power',SDST:'Power',MTST:'Option',BYU:'Pro',IU:'Spread',TEX:'Spread',LSU:'Pro',TAMU:'Spread',ND:'Pro',MIA:'Spread',COLO:'Spread',CLEM:'Spread',PSU:'Pro',USC:'Air Raid',OKST:'Air Raid',HOU:'Air Raid',WKU:'Air Raid',UGS:'Option',GASO:'Option',ODU:'Spread',JMU:'Spread'};
function schemeOf(t){if(!t.scheme)t.scheme=SCHEME_OVR[t.abbr]||pick(['Spread','Spread','Pro','Power','Air Raid']);return t.scheme}
/* team identity from the roster (cached per game day): pass vs run talent, QB legs, scheme */
const IDC=new WeakMap();
function identityOf(t){
  let v=IDC.get(t);if(v&&v.w===(LG&&LG.week))return v;
  const av=(pos,n,f)=>{const l=starters(t,pos).slice(0,n);return l.length?sum(l.map(f))/l.length:3};
  const qb=starters(t,'QB')[0]||{thr:3,acc:3,awr:3,spd:3},pass=(qb.thr+qb.acc+qb.awr)/3*.5+av('WR',3,p=>(p.rte+p.cat+p.spd)/3)*.35+av('OL',5,p=>p.blk)*.15,
    run=av('RB',1,p=>(p.car+p.spd+p.agi)/3)*.45+av('OL',5,p=>(p.str+p.blk)/2)*.4+av('TE',1,p=>p.blk)*.15,sc=schemeOf(t);
  const base={'Air Raid':.64,'Spread':.55,'Pro':.5,'Power':.42,'Option':.2}[sc]||.5;
  v={w:LG&&LG.week,sc,pass:clamp(base+(pass-run)*.08,.12,.75),legs:clamp((qb.spd-3)*.5,0,1),opt:sc==='Option'};IDC.set(t,v);return v;
}
/* rate a play for a situation: coach's picks (user) and the CPU offense share it. Returns [score, reason] */
function rateCall(p,sit,team,cov){
  const tg=sit.toGo,dn=sit.down,run=p.cat==='run',id=identityOf(team),fam=COV_FAM[cov]||'3',L=S.los;let s=1,why='';
  if(p.hail)return [sit.lastPlay&&L>=55?50:0,'Last play · throw it up'];
  if(p.run&&p.run.sneak&&tg>1)return [0,''];
  if(p.goal&&L<88&&!(tg<=1))return [0,''];
  if(p.dbl||p.flea||p.run&&p.run.reverse)s*=.35;
  /* down & distance */
  if(tg<=1){if(run&&(/h/.test(p.v)||p.run.sneak))s*=2.6,why='Short yardage · power it';else if(!run)s*=.55}
  else if(tg<=3){if(run)s*=1.5;if(p.quick)s*=1.35}
  else if(tg>=8){if(run)s*=p.run.delay?.9:.45;else if(p.depth>=tg+1||p.screen)s*=1.35;else s*=.5}
  if(dn===3&&!run&&!p.screen&&p.depth<tg)s*=.35;
  if(dn===1&&run)s*=1.15;
  /* field position */
  if(sit.redzone){if(p.depth>16&&!/m/.test(p.v))s*=.5;if(L>=103&&p.goal)s*=2.2,why=why||'Goal line · heavy set';if(['Goal Line Fade','Slants','Snag','Smash','Stick','Bunch Stick'].includes(p.name))s*=1.8}
  else if(p.goal)s*=.15;
  if(L<20&&(p.pa||p.depth>20))s*=.6;
  /* clock & score */
  if(sit.twoMin){if(run&&!p.run.delay)s*=.25;if(p.two)s*=2.6,why='Two-minute · get out of bounds';if(p.screen)s*=.6}
  if(sit.leadingLate){if(run)s*=2.2,why=why||'Bleed the clock · stay in bounds';else s*=p.quick?.7:.45}
  /* what the defense shows: concept beats coverage */
  const hc=[...fam].find(c=>p.v.includes(c));if(hc){s*=1.55;if(!why)why=`vs ${(COVS[cov]||COVS.cover3).n} · ${{m:'beats man',3:'attacks the thirds',2:'beats Cover 2',4:'beats quarters',b:'beats the blitz'}[hc]}`}
  if(run&&p.v.includes('l')&&(fam==='2'||fam==='4')){s*=1.35;if(!why)why='Two-high shell · light box, run it'}
  if(fam.includes('b')&&(p.screen||p.quick||run&&p.run.delay)){s*=1.4;why=why||'Pressure look · get it out fast'}
  /* identity */
  if(id.opt&&run&&(p.run.read||p.run.triple||p.run.option||p.form==='Flexbone'))s*=4;
  if(id.opt&&!run)s*=.7;
  if(run&&p.run.carrier==='QB'&&!p.run.sneak)s*=.55+id.legs*1.1;
  if(run&&p.run.read)s*=.7+id.legs*.7;
  if(id.sc==='Air Raid'&&!run&&p.form.startsWith('Gun'))s*=1.3;
  if(id.sc==='Power'&&(p.form==='I-Form'||p.form.includes('Ace')))s*=1.4;
  if(id.sc==='Spread'&&(p.form.startsWith('Gun')||p.form==='Pistol'||p.run&&p.run.rpo))s*=1.3;
  if(id.sc==='Pro'&&(p.pa||p.form==='Singleback'||p.form==='I-Form'))s*=1.3;
  if(!why)why=run?(dn===1?'Stay on schedule':'Keep them honest'):p.quick?'Quick rhythm throw':p.depth>=20?'Take a shot':'Move the sticks';
  return [s,why];
}
/* CPU offense: blends rateCall with the team's run/pass identity, game script and self-scouting (no repeats, mixed tendencies) */
function aiPickPlay(team,sit){
  const id=identityOf(team),cov=sit.cov||'cover3',hist=sit.hist||[];
  let pPass=id.pass;if(sit.toGo>=8)pPass+=.2;if(sit.toGo<=2)pPass-=.25;if(sit.down===3&&sit.toGo>=4)pPass+=.15;if(sit.twoMin)pPass+=.32;if(sit.leadingLate)pPass-=.35;
  if(sit.margin<=-17&&S.q>=3)pPass+=.15;if(sit.margin>=17&&S.q>=3)pPass-=.15;
  /* self-scout: a tendency the defense can read gets broken */
  const recent=hist.slice(-6);if(recent.length>=4){const pr=recent.filter(h=>h.p).length/recent.length;if(pr>.8)pPass-=.15;else if(pr<.2)pPass+=.15}
  const pass=Math.random()<clamp(pPass,.04,.96),pool=[];
  for(const p of PLAYBOOK){if((p.cat==='pass')!==pass&&!(p.screen&&!pass&&Math.random()<.12))continue;if(p.hail&&!sit.lastPlay)continue;
    let [w]=rateCall(p,sit,team,cov);if(w<=0)continue;
    const n=recent.filter(h=>h.id===p.id).length;if(n)w*=Math.pow(.3,n);
    pool.push([p,Math.pow(w,1.3)])}
  if(!pool.length)return playByName(pass?'Curl Flat':'Inside Zone');
  let r=Math.random()*sum(pool.map(x=>x[1]));for(const [p,w] of pool){if((r-=w)<=0)return p}return pool[0][0];
}
/* situational CPU coverage: 2-man / quarters on 3rd & long, Cover 0 near the goal line, pressure on short yardage,
   deep zones late with a lead, a spy vs a mobile QB; each team leans man or zone (stable per team) */
function covWeights(team,sit){
  sit=sit||{};const tg=sit.toGo!=null?sit.toGo:10,dn=sit.down||1,oi=offIdx(),lead=S.score[1-oi]-S.score[oi],late=S.q>=4&&S.clock<S.qlen*.3&&!S.ot;
  if(team.manLean==null)team.manLean=Math.random();const ml=team.manLean;
  const w={blitz:.6,man:2+ml*2,spy:0,'2man':.8+ml,cover2:1.6,tampa2:1,cover3:3-ml,cover4:1.4,cover6:1.1,firezone:1.2,agap:.6,cblitz:.7,prevent:0};
  if(dn>=3&&tg>=7){w['2man']+=3;w.cover4+=2.5;w.cover6+=1;w.firezone+=.8;w.blitz*=.4;w.cover2*=.7}
  else if(dn===2&&tg>=8){w.cover4+=1;w['2man']+=.8}
  if(tg<=3){w.blitz+=1.2;w.agap+=1.4;w.man+=1.2;w.cblitz+=.6;w.cover4*=.5}
  if(S.los>=100){w.blitz+=3;w.man+=1.5;w.agap+=.8;w.cover4*=.4;w.cover2*=.5;w.tampa2*=.3}
  else if(S.los>=88){w.man+=1;w.cover2+=.6;w.firezone+=.6}
  if(late&&lead>0&&lead<=16){w.prevent=S.clock<S.qlen*.12?4:0;w.cover4+=2;w.cover3+=1.5;w.cover2+=1;w.blitz=0;w.agap*=.2;w.cblitz*=.2;w.firezone*=.4}
  if(late&&lead<0){w.blitz+=1;w.agap+=.8;w.cblitz+=.8;w.firezone+=.8}
  if(sit.lastPlay){w.prevent=10;w.blitz=0}
  if(Q&&Q.pl.spd>=3.7)w.spy=1.2+(Q.pl.spd-3.7)*2;
  /* tendencies: the CPU defense adjusts to what the user's offense keeps doing */
  const h=(S.uHist||[]).slice(-10);if(uOff()&&h.length>=5){const pr=h.filter(x=>x.p).length/h.length;if(pr>.65){w['2man']+=1;w.cover4+=1;w.cover6+=.6;w.firezone+=.5}else if(pr<.35){w.cover3+=1.2;w.man+=1;w.agap+=.5;w.cover4*=.7}}
  return w;
}
function aiPickCoverage(team,sit){const w=covWeights(team,sit);let r=Math.random()*sum(Object.values(w));for(const k in w){if((r-=w[k])<=0)return k}return 'cover3'}
/* front by offensive personnel, down & distance and the team's even/odd lean */
function aiPickFront(team,sit,pc){
  sit=sit||{};const f=FORMS[(pc&&pc.form)||'Gun Doubles']||{},pers=f.pers||'11',tg=sit.toGo!=null?sit.toGo:10;
  if(team.oddLean==null)team.oddLean=Math.random()<.35?1:0;const odd=team.oddLean;
  if(S.los>=104&&(pers==='23'||pers==='21'||pers==='22'||tg<=1)||pers==='23')return 'goal';
  if((sit.down>=3&&tg>=8)||sit.twoMin)return Math.random()<.6?'dime':'nickel';
  if(pers==='21'||pers==='12'||pers==='30')return odd?'34':'43';
  if(pers==='10')return Math.random()<.5?'dime':'nickel';
  if(tg<=2)return odd?'34':'43';
  return odd&&Math.random()<.45?'335':'nickel';
}

/* tiny play diagram for the playbook grid */
function playSVG(p){
  const f=FORMS[p.form],X0=48,sx=1.8,sy=.82,Y=y=>28+y*sy,Xp=x=>X0+x*sx;let s=`<svg viewBox="0 0 100 56" aria-hidden="true"><line x1="${X0}" y1="3" x2="${X0}" y2="53" stroke="rgba(77,163,255,.7)" stroke-width="1"/>`;
  for(const dy of [-2.2,-1.1,0,1.1,2.2])s+=`<rect x="${Xp(-.7)-1.6}" y="${Y(dy)-1.6}" width="3.2" height="3.2" fill="#9aa4b2"/>`;
  const rp=p.run&&p.run.rpo||[];
  const draw=(k,pos)=>{const [x,y]=pos;const px=Xp(x),py=Y(y);s+=`<circle cx="${px}" cy="${py}" r="2.2" fill="${k==='QB'?'#fff':'var(--team)'}"/>`;
    const rt=p.r&&p.r[k];if(rt&&ROUTES[rt]){const inD=y<0?1:y>0?-1:1;let pts=[[px,py]];for(const [a,b] of ROUTES[rt].w){pts.push([Xp(x+a),Y(clamp(y+b*inD,-26,26))])}
      if(!ROUTES[rt].stop){const a=pts[pts.length-2],z=pts[pts.length-1],dx=z[0]-a[0],dy=z[1]-a[1],d=hyp(dx,dy)||1;pts.push([z[0]+dx/d*6,z[1]+dy/d*6])}
      s+=`<polyline points="${pts.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${p.screen===k||p.dbl===k?'#FFD23F':'#fff'}" stroke-width="1.4" stroke-linejoin="round" opacity=".9"${rp.includes(k)?' stroke-dasharray="2.5 1.6"':''}/>`}
    if(p.run&&p.run.carrier===k){const g=p.run.gap;s+=`<path d="M${px},${py} L${Xp(2)},${Y(g)} L${Xp(9)},${Y(g)}" fill="none" stroke="#FFD23F" stroke-width="1.6"/>`}
    if(p.run&&(p.run.read||p.run.triple||p.run.option)&&k==='QB'){const g=p.run.read?(p.run.inv?2:-p.run.gap*1.8-3):p.run.gap+3;s+=`<path d="M${px},${py} L${Xp(1)},${Y(g)} L${Xp(7)},${Y(g)}" fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 1.6" opacity=".85"/>`}};
  for(const k of ['X','H','Y','Z','R','QB'])draw(k,f[k]);
  return s+'</svg>';
}
