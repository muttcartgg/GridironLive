/* =========================================================
   02 · League data: schools, players, ratings, staff
   ========================================================= */
const PLACES=['Ashford','Blackwater','Brightwood','Caldera','Copperton','Crestview','Dunmore','Eastmarch','Fairhaven','Foxhollow','Glenrock','Harrowgate','Highmoor','Ironvale','Juniper Ridge','Kestrel Point','Lakeshire','Marrow Creek','Northgate','Oakhurst','Pinecrest','Quarry Hill','Red Mesa','Saltmarsh','Silverlake','Stonebridge','Thornfield','Valemont','Westbrook','Wildbrook','Yellowpine','Zephyr Bay'];
const MASCOTS=['Ravens','Wolves','Comets','Foxes','Stallions','Hornets','Owls','Pioneers','Bison','Falcons','Cyclones','Miners','Herons','Gators','Lynx','Rangers','Marlins','Coyotes','Phantoms','Kodiaks','Vipers','Monarchs','Sentinels','Mustangs','Badgers','Raptors','Thunderbirds','Pilots','Lumberjacks','Stingrays','Grizzlies','Jaguars'];
const C1=['#C8102E','#0057B8','#F2A900','#00843D','#6A1B9A','#FF6B00','#00A3AD','#8B0000','#1D428A','#B3A369','#E4002B','#007A33','#FFC72C','#4B2E83','#D50032','#00B5E2','#9E1B32','#FF8200','#005A43','#7BAFD4','#B9975B','#0C2340','#CE1141','#2D68C4','#F56600','#5E2750','#00338D','#A6192E','#18453B','#FDB927','#BA0C2F','#3A5DAE'];
const C2=['#FFFFFF','#111418','#C9A227','#0C2340','#9EA2A2'];
const CONFS=['Coastal','Heartland','Summit','Frontier'];
const FIRST=['Aiden','Marcus','Jalen','Tyler','Caleb','Devin','Luis','Mason','Trey','Isaiah','Cole','Darius','Ethan','Malik','Noah','Owen','Andre','Bryce','Cam','Dante','Elijah','Gavin','Hunter','Jace','Kendall','Logan','Miles','Nico','Parker','Quinn','Reid','Sam','Tre','Wyatt','Xavier','Zion','Brody','Colby','Jaylen','Rashad','Keon','Mateo','Desmond','Silas','Tobias','Amari','Bo','Carson','DeShawn','Emmett','Jamal','Kai','Luca','Omar','Roman','Tariq','Vince'];
const LAST=['Adams','Baker','Carter','Dawson','Ellis','Foster','Grant','Hayes','Irving','Jennings','Kerr','Lawson','Mercer','Nolan','Ortiz','Price','Quarles','Reyes','Sutton','Tate','Underwood','Vance','Walker','Young','Bishop','Coleman','Drake','Fletcher','Gaines','Holloway','Jefferson','Knox','McAllister','Pruitt','Rhodes','Shepherd','Thornton','Whitfield','Boone','Crawford','Okafor','Delgado','Brennan','Castillo','Mbeki','Abernathy','Beckett','Cruz','Dupree','Espinoza','Fairley','Goode','Hollis','Ivey','Kincaid','Landry','Moreau','Nakamura','Osei','Pettaway','Rivers','Stroud','Tillman','Vasquez','Wade'];
const TROPHY_A=['Golden','Iron','Copper','Silver','Bronze','Old','Brass','Granite','Cedar','Steel','Crimson','Lost'];
const TROPHY_B=['Lantern','Anvil','Compass','Spike','Canteen','Kettle','Saddle','Oar','Plow','Shovel','Horseshoe','Railroad Lamp','Mile Marker','Anchor','Pocket Watch','Wagon Wheel'];
const BOWLS=['Harbor Lights Bowl','Prairie Bowl','Evergreen Bowl','Desert Classic','Gulf Coast Bowl','Mountain Pass Bowl','Lakeshore Bowl','Canyon Bowl','Redwood Bowl','Riverboat Bowl','Copper State Bowl','Heartland Classic','Bayside Bowl','Magnolia Bowl','Frontier Bowl','Lone Pine Bowl','Cascade Bowl','Riverwalk Bowl','Palmetto Classic','Sunbelt Shores Bowl','Bluegrass Bowl','Crossroads Bowl','Iron Range Bowl','Painted Desert Bowl','Golden Isles Bowl','Big Sky Country Bowl','Prairie Wind Bowl','Gateway Bowl','Coastal Plains Bowl','Silver State Bowl','Ozark Bowl','Tidewater Bowl','Keystone Bowl','Delta Bowl','Pacific Rim Bowl','Hill Country Bowl','Northern Lights Bowl','Capitol City Bowl','Sunset Coast Bowl','Lakefront Bowl'];
const CFP_QF=['Sunrise Bowl','Golden Coast Bowl','Twin Rivers Bowl','Starlight Bowl'];
const CFP_SF=['Summit Bowl','Bluewater Bowl'];
/* NCAA leagues: the 2026–27 FBS bowl lineup in date order, [bowl, date, site, tie-in A, tie-in B, pick tier (1 first)];
   tie-ins are conference names ('/' = either). The New Year's Six bowls are all CFP games in the 12-team format. */
const BOWLS26=[['Salute to Veterans Bowl','Dec 15','Cramton Bowl, Montgomery, Ala.','Sun Belt','MAC',5],
 ['Frisco Football Classic','Dec 15','Ford Center at The Star, Frisco, Texas','American/Conference USA','MAC/Sun Belt',5],
 ['Boca Raton Bowl','Dec 18','Flagler Credit Union Stadium, Boca Raton, Fla.','American','Conference USA/MAC/Sun Belt',4],
 ['Gasparilla Bowl','Dec 18','Raymond James Stadium, Tampa, Fla.','American','ACC/SEC',4],
 ['Myrtle Beach Bowl','Dec 21','Brooks Stadium, Conway, S.C.','Sun Belt','American',5],
 ['Famous Idaho Potato Bowl','Dec 21','Albertsons Stadium, Boise, Idaho','Mountain West','MAC',5],
 ['Puerto Rico Bowl','Dec 22','Juan Ramón Loubriel Stadium, Bayamón, P.R.','Conference USA/MAC','American/Sun Belt',5],
 ['Cure Bowl','Dec 22','Acrisure Bounce House, Orlando, Fla.','Sun Belt','American/Conference USA',5],
 ['Independence Bowl','Dec 22','Independence Stadium, Shreveport, La.','Big 12/Pac-12','Conference USA',4],
 ['New Orleans Bowl','Dec 23','Caesars Superdome, New Orleans','Sun Belt','Conference USA',4],
 ['Armed Forces Bowl','Dec 23','Amon G. Carter Stadium, Fort Worth, Texas','Big 12','Mountain West',3],
 ['Poinsettia Bowl','Dec 23','Snapdragon Stadium, San Diego','Pac-12','Mountain West',4],
 ['Frisco Bowl','Dec 23','Ford Center at The Star, Frisco, Texas','American/Mountain West','Sun Belt/Conference USA',5],
 ['New Mexico Bowl','Dec 24','University Stadium, Albuquerque, N.M.','Mountain West','Conference USA/American',4],
 ['Hawaii Bowl','Dec 24','Clarence T.C. Ching Athletics Complex, Honolulu','Mountain West','American',4],
 ['Pinstripe Bowl','Dec 26','Yankee Stadium, Bronx, N.Y.','ACC','Big Ten',3],
 ['Fenway Bowl','Dec 26','Fenway Park, Boston','ACC','American',3],
 ["Duke's Mayo Bowl",'Dec 26','Bank of America Stadium, Charlotte','ACC','SEC',2],
 ['68 Ventures Bowl','Dec 26','Hancock Whitney Stadium, Mobile, Ala.','Sun Belt','MAC/Conference USA',5],
 ['Cactus Bowl','Dec 26','Mountain America Stadium, Tempe, Ariz.','Big 12','Big Ten',3],
 ['Military Bowl','Dec 28','Navy–Marine Corps Memorial Stadium, Annapolis, Md.','ACC','American',3],
 ['Holiday Bowl','Dec 28','Snapdragon Stadium, San Diego','ACC','Pac-12',2],
 ['Birmingham Bowl','Dec 29','Protective Stadium, Birmingham, Ala.','SEC','American',3],
 ['Pop-Tarts Bowl','Dec 29','Camping World Stadium, Orlando, Fla.','ACC','Big 12',1],
 ['Alamo Bowl','Dec 29','Alamodome, San Antonio','Big 12','Pac-12',1],
 ['Gator Bowl','Dec 30','EverBank Stadium, Jacksonville, Fla.','SEC','ACC',2],
 ['Music City Bowl','Dec 30','Nissan Stadium, Nashville','SEC','Big Ten',2],
 ['ReliaQuest Bowl','Dec 31','Raymond James Stadium, Tampa, Fla.','SEC','Big Ten',1],
 ['Sun Bowl','Dec 31','Sun Bowl Stadium, El Paso, Texas','ACC','Pac-12',2],
 ['Las Vegas Bowl','Dec 31','Allegiant Stadium, Las Vegas','Big Ten/SEC','Pac-12',2],
 ['Texas Bowl','Dec 31','NRG Stadium, Houston','SEC','Big 12',2],
 ['Citrus Bowl','Jan 2','Camping World Stadium, Orlando, Fla.','SEC','Big Ten',1],
 ['First Responder Bowl','Jan 2','Gerald J. Ford Stadium, Dallas','American','Conference USA/Big 12',4],
 ['Arizona Bowl','Jan 2','Casino Del Sol Stadium, Tucson, Ariz.','Mountain West','MAC',4],
 ['Liberty Bowl','Jan 2','Simmons Bank Liberty Stadium, Memphis, Tenn.','SEC','Big 12',2]];
/* 2026–27 CFP: first round on campus (seeds 5–8 host, Dec 18–19); quarterfinals at the Fiesta (Dec 30), Peach, Rose and Cotton
   (Jan 1); semifinals at the Orange (Jan 14) and Sugar (Jan 15); title game Jan 25, 2027 at Allegiant Stadium, Las Vegas.
   pref: which quarterfinal bowl a top-4 seed from that conference is placed in first. */
const CFP26={qf:[['Fiesta Bowl','Dec 30','State Farm Stadium, Glendale, Ariz.'],['Peach Bowl','Jan 1','Mercedes-Benz Stadium, Atlanta'],['Rose Bowl','Jan 1','Rose Bowl, Pasadena, Calif.'],['Cotton Bowl','Jan 1','AT&T Stadium, Arlington, Texas']],
  sf:[['Orange Bowl','Jan 14','Hard Rock Stadium, Miami Gardens, Fla.'],['Sugar Bowl','Jan 15','Caesars Superdome, New Orleans']],
  fin:['National Championship','Jan 25','Allegiant Stadium, Las Vegas'],
  pref:{'Big Ten':'Rose Cotton Fiesta Peach',SEC:'Peach Cotton Fiesta Rose','Big 12':'Cotton Fiesta Peach Rose',ACC:'Peach Cotton Fiesta Rose','Pac-12':'Rose Fiesta Cotton Peach'}};
/* 2026 FCS playoffs (24 teams, title game Jan 11 at FirstBank Stadium, Nashville) and the Celebration Bowl (MEAC vs SWAC) */
const FCS26={r1:'Nov 28',r2:'Dec 5',qf:'Dec 11–12',sf:'Dec 19',fin:['Jan 11','FirstBank Stadium, Nashville'],cel:['Dec 12','Mercedes-Benz Stadium, Atlanta']};

const POS_ORDER=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const POS_NAME={QB:'Quarterbacks',RB:'Running backs',WR:'Wide receivers',TE:'Tight ends',OL:'Offensive line',DL:'Defensive line',LB:'Linebackers',CB:'Cornerbacks',S:'Safeties',K:'Kickers & punters'};
/* v7 roster model: deeper rosters (51 base, 60 max) so real depth charts fit */
const POS_COUNTS={QB:3,RB:4,WR:6,TE:3,OL:10,DL:8,LB:6,CB:5,S:4,K:2};
const STARTERS={QB:1,RB:1,WR:3,TE:1,OL:5,DL:4,LB:2,CB:3,S:2,K:1};
const ROSTER_CAP=60;
const NUMS={QB:[1,19],RB:[1,39],WR:[1,19],TE:[80,89],OL:[50,79],DL:[90,99],LB:[1,59],CB:[1,39],S:[1,49],K:[1,49]};
/* ---------- v7 ratings ----------
   Every player has 14 attributes on a continuous 1.0–5.0 scale (one decimal). Code everywhere reads them directly
   (p.spd, p.awr, ...). The UI shows any attribute on the familiar 25–99 scale with a99(v) and overalls with ovr99(p).
   spd Speed · agi Agility (acceleration, cuts) · str Strength · awr Awareness (reads, vision, football IQ)
   thr Throw power (kick power for K) · acc Throw accuracy (kick accuracy for K) · cat Catching (ball skills for DBs)
   rte Route running · car Ball carrying (security, elusiveness, breaking tackles) · blk Blocking
   tkl Tackling · cov Coverage (man and zone) · shd Block shedding / pass rush · end Stamina */
const ATTR_KEYS=['spd','agi','str','awr','thr','acc','cat','rte','car','blk','tkl','cov','shd','end'];
const PATTR={QB:['thr','acc','awr','spd','agi','end'],RB:['spd','agi','car','str','cat','awr'],WR:['spd','cat','rte','agi','awr','str'],TE:['cat','blk','str','rte','spd','awr'],OL:['blk','str','awr','agi','end'],DL:['shd','str','tkl','spd','agi','awr'],LB:['tkl','awr','shd','cov','spd','str'],CB:['cov','spd','agi','cat','awr','tkl'],S:['cov','tkl','spd','awr','cat','agi'],K:['thr','acc']};
const ANAME={spd:'Speed',agi:'Agility',str:'Strength',awr:'Awareness',thr:'Throw power',acc:'Throw accuracy',cat:'Catching',rte:'Route running',car:'Ball carrying',blk:'Blocking',tkl:'Tackling',cov:'Coverage',shd:'Block shedding',end:'Stamina'};
const ASHORT={spd:'SPD',agi:'AGI',str:'STR',awr:'AWR',thr:'THP',acc:'THA',cat:'CTH',rte:'RTE',car:'CAR',blk:'BLK',tkl:'TAK',cov:'COV',shd:'BSH',end:'STA'};
const attrName=(pos,k)=>pos==='K'&&k==='thr'?'Kick power':pos==='K'&&k==='acc'?'Kick accuracy':(pos==='CB'||pos==='S')&&k==='cat'?'Ball skills':pos==='DL'&&k==='shd'?'Pass rush':ANAME[k];
const attrShort=(pos,k)=>pos==='K'&&k==='thr'?'KPW':pos==='K'&&k==='acc'?'KAC':(pos==='CB'||pos==='S')&&k==='cat'?'BSK':pos==='DL'&&k==='shd'?'PRS':ASHORT[k];
/* overall = weighted core attributes (weights sum to 1) */
const W8={QB:{thr:.25,acc:.35,awr:.25,spd:.05,agi:.05,end:.05},RB:{spd:.25,agi:.2,car:.2,str:.15,cat:.1,awr:.05,end:.05},WR:{spd:.25,cat:.25,rte:.25,agi:.1,awr:.05,str:.05,end:.05},TE:{cat:.2,blk:.25,str:.15,rte:.15,spd:.1,awr:.1,end:.05},OL:{blk:.45,str:.3,awr:.15,agi:.05,end:.05},DL:{shd:.35,str:.25,tkl:.15,spd:.1,agi:.05,awr:.05,end:.05},LB:{tkl:.3,awr:.2,shd:.15,cov:.15,spd:.1,str:.05,end:.05},CB:{cov:.33,spd:.27,agi:.12,cat:.1,awr:.1,tkl:.05,end:.03},S:{cov:.25,tkl:.2,spd:.2,awr:.2,cat:.1,agi:.05},K:{thr:.55,acc:.45}};
/* generation offsets from the team quality baseline: strengths up, off-position skills down */
const BIAS={QB:{thr:.5,acc:.3,awr:.2,tkl:-1.8,shd:-1.8,cov:-1.6,blk:-1.4,str:-.5,car:-.6,rte:-1.2},RB:{spd:.4,agi:.4,car:.3,str:.2,thr:-1.8,acc:-1.8,tkl:-1.2,cov:-1.2,shd:-1.4,blk:-.6,rte:-.4},WR:{spd:.4,cat:.3,rte:.3,agi:.3,thr:-1.8,acc:-1.8,tkl:-1.4,cov:-1,shd:-1.6,blk:-.8,str:-.3},TE:{blk:.1,str:.2,thr:-1.8,acc:-1.8,tkl:-1.2,cov:-1.4,shd:-1.2,agi:-.4,spd:-.3},OL:{str:.6,blk:.6,spd:-.9,agi:-.7,cat:-1.6,rte:-2,thr:-2,acc:-2,car:-1.6,cov:-2,tkl:-1,shd:-.6},DL:{str:.4,shd:.5,spd:-.4,agi:-.2,cat:-1.5,rte:-2,thr:-2,acc:-2,car:-1.5,cov:-1.5,blk:-.6},LB:{tkl:.3,awr:.1,shd:.1,thr:-2,acc:-2,rte:-1.6,car:-1.2,blk:-.8,cat:-.6},CB:{spd:.5,cov:.4,agi:.4,thr:-2,acc:-2,rte:-.8,car:-1,blk:-1.4,shd:-1.4,str:-.4},S:{spd:.3,tkl:.2,cov:.2,thr:-2,acc:-2,rte:-1.2,car:-1.2,blk:-1.2,shd:-1},K:{thr:.3,acc:.3,spd:-1,agi:-1,str:-1.2,cat:-1.5,rte:-2,car:-2,blk:-2,tkl:-1.8,cov:-2,shd:-2}};
/* typical size by position: [height inches, sd, weight lbs, sd] */
const SIZE={QB:[75,1.6,218,12],RB:[70.5,1.6,207,13],WR:[73,2.2,192,14],TE:[76.5,1.2,247,12],OL:[77,1.2,312,15],DL:[75.5,1.6,284,24],LB:[73.5,1.3,232,11],CB:[71.5,1.6,185,9],S:[72.5,1.4,200,9],K:[72.5,2,198,14]};
const YR=['FR','SO','JR','SR'];
const r1=v=>Math.round(clamp(v,1,5)*10)/10;
/* attribute value (1–5) on the 25–99 scale the UI shows */
const a99=v=>clamp(Math.round(25+Math.pow(clamp((v-1)/4,0,1),.85)*74),25,99);
const gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=Math.random();return u-3};
function sizeFor(p){const s=SIZE[p.pos]||SIZE.WR;p.ht=Math.round(s[0]+gauss()*s[1]);p.wt=Math.round(s[2]+gauss()*s[3]+(p.str-3)*6);return p}
/* fill in any missing v7 attributes from the older 7-attribute model (saves from v6 and team packs) */
function upgradeAttrs(p){
  if(!p||!p.pos)return p;const g=k=>typeof p[k]==='number'?p[k]:3,n=()=>R(-.5,.5),pos=p.pos;
  const d={agi:g('spd')+n(),awr:2.2+((p.yr||2)-1)*.35+(ovr0(p)-3)*.5+n(),rte:['WR','TE','RB'].includes(pos)?(g('cat')+g('spd'))/2+n():1.4+n(),car:['RB','WR','QB','TE'].includes(pos)?(g('str')+g('spd'))/2+n():1.6+n(),
    blk:pos==='OL'?g('str')+n():pos==='TE'?g('str')-.2+n():pos==='RB'?g('str')-.8+n():1.6+n(),cov:pos==='CB'||pos==='S'?(g('spd')+g('cat'))/2+.2+n():pos==='LB'?(g('spd')+g('tkl'))/2-.3+n():1.4+n(),
    shd:pos==='DL'?(g('str')+g('tkl'))/2+.2+n():pos==='LB'?(g('str')+g('tkl'))/2-.2+n():1.6+n()};
  for(const k of ATTR_KEYS){if(typeof p[k]!=='number')p[k]=d[k]!=null?d[k]:2;p[k]=r1(p[k])}
  if(!p.ht||!p.wt)sizeFor(p);return p;
}
const ovr0=p=>{const w={QB:{thr:.4,acc:.35,spd:.1,end:.15},RB:{spd:.45,str:.25,cat:.1,end:.2},WR:{cat:.4,spd:.4,str:.1,end:.1},TE:{cat:.35,str:.35,spd:.2,end:.1},OL:{str:.6,end:.25,spd:.15},DL:{tkl:.3,str:.35,spd:.2,end:.15},LB:{tkl:.4,str:.2,spd:.3,end:.1},CB:{spd:.45,tkl:.2,cat:.2,end:.15},S:{spd:.35,tkl:.35,cat:.15,end:.15},K:{thr:.55,acc:.45}}[p.pos]||{};let s=0;for(const k in w)s+=(typeof p[k]==='number'?p[k]:3)*w[k];return s};
const newSS=()=>({gp:0,pa:0,pc:0,py:0,ptd:0,int:0,ra:0,ry:0,rtd:0,rec:0,recy:0,rectd:0,tkl:0,sck:0,dint:0,fgm:0,fga:0});

function genPlayer(pos,q,yr){
  const b=BIAS[pos]||{};const p={id:uid(),first:pick(FIRST),last:pick(LAST),pos,yr:yr||rint(1,4),num:0,tone:rint(0,3),cond:100,inj:0,injWhy:'',xp:rint(0,40),ss:newSS(),rs:false,redshirt:false,home:pick(PLACES)};
  for(const k of ATTR_KEYS)p[k]=r1(q+(b[k]||0)+R(-1.2,1.2)+(k==='awr'?(p.yr-2.5)*.25:0));
  return sizeFor(p);
}
function assignNumbers(team){
  const used=new Set(team.roster.filter(p=>p.num).map(p=>p.num));
  for(const p of team.roster){if(p.num)continue;const [a,b]=NUMS[p.pos];let n=0;for(let t=0;t<50;t++){const c=rint(a,b);if(!used.has(c)){n=c;break}}p.num=n||rint(a,b);used.add(p.num)}
}
const ovr=p=>{let s=0;const w=W8[p.pos];for(const k in w)s+=p[k]*w[k];return s};
/* 40–99 overall shown everywhere in the UI; a tiny per-player offset breaks ties between identical star sets */
const o99=v=>45+Math.pow(clamp((v-1)/4,0,1),.9)*52;
const ovr99=p=>clamp(Math.round(o99(ovr(p))+(((p.id||0)*7919)%5-2)*.6+(p.fine||0)),40,99);
const tOvr99=v=>clamp(Math.round(o99(v)),40,99);
const ovrTag=p=>`<span class="ovr ${ovr99(p)>=88?'elite':ovr99(p)>=78?'good':''}">${ovr99(p)}</span>`;
function depth(t,pos){
  const list=t.roster.filter(p=>p.pos===pos);
  const ord=(t.dco&&t.dco[pos])||[];
  const key=p=>{const i=ord.indexOf(p.id);return i<0?1000-ovr(p):i};
  const ok=p=>p.inj<=0&&!p.redshirt;
  return list.filter(ok).sort((a,b)=>key(a)-key(b)).concat(list.filter(p=>!ok(p)).sort((a,b)=>ovr(b)-ovr(a)));
}
const starters=(t,pos)=>depth(t,pos).slice(0,STARTERS[pos]);
function unitOvr(t,list){let s=0,n=0;for(const pos of list)for(const p of starters(t,pos)){s+=ovr(p);n++}return n?s/n:3}
const offOvr=t=>unitOvr(t,['QB','RB','WR','TE','OL']);
const defOvr=t=>unitOvr(t,['DL','LB','CB','S']);
let OVR_CACHE=new WeakMap();const invalidate=()=>{OVR_CACHE=new WeakMap()};
const teamOvr=t=>{let v=OVR_CACHE.get(t);if(v===undefined){v=(offOvr(t)*1.05+defOvr(t)*.95)/2;OVR_CACHE.set(t,v)}return v};
const teamName=t=>`${t.city} ${t.name}`;
const fullName=p=>`${p.first} ${p.last}`;
const yrStr=p=>(p.rs?'RS ':'')+YR[clamp(p.yr,1,4)-1];

/* ---------- coaching staff: coaches, signature traits, coachMod() and careers live in 04c-career.js ----------
   the old OC/DC traits map onto the new ones (OLD_TRAIT), so hasTrait('dc','Ball Hawk') still answers for Turnover Specialist */
function genStaff(kind,r){return genCoach(kind,r||R(1,5.4),r?{r}:null)}
const staffCost=s=>s.r*4;
const hasTrait=(k,t)=>{const s=LG&&LG.staff&&LG.staff[k];return !!s&&(s.trait===t||!!(s.traits&&s.traits.includes(OLD_TRAIT[t]||t)))};

/* ---------- league generation ---------- */
const qOf=t=>t.q||(1.1+t.prestige*.62);
const isFCS=t=>!!(t&&t.div==='FCS');
function genTeam(i,place,mascot,c1,prestige,conf,opt){
  opt=opt||{};const suf=opt.exact?'':pick(['State','Tech','','','State','University']);
  const c2s=C2.filter(c=>Math.abs(lum(c)-lum(c1))>.3);
  const t={id:i,city:opt.exact?place:place+(suf&&suf!=='University'?' '+suf:''),name:mascot,abbr:opt.abbr||'',c1,c2:opt.c2||pick(c2s.length?c2s:['#FFFFFF']),conf,div:opt.div||'FBS',prestige,q:opt.q||null,roster:[],rec:null,
    rival:null,trophy:'',stadium:opt.stadium||place+' '+pick(['Memorial Stadium','Field','Coliseum','Stadium','Bowl']),cap:Math.round((opt.div==='FCS'?8:28)+prestige*(opt.div==='FCS'?5:14)+R(-4,8))*1000,
    titles:0,ccTitles:0,bowlWins:0,playoffApps:0,dco:null,cc:false};
  const q=opt.q||1.1+prestige*.62;
  for(const pos of POS_ORDER)for(let k=0;k<POS_COUNTS[pos];k++)t.roster.push(genPlayer(pos,q));
  assignNumbers(t);return t;
}
function baseLeague(name,teams,confs){
  return {version:VERSION,name:name||'My Dynasty',season:2026,week:0,phase:'regular',user:null,teams,confs,weeks:[],R:13,rank:[],rankF:[],credits:8,nil:400,history:[],
    settings:{qlen:180,diff:1,muted:false,style:'modern'},
    coach:{name:'Coach',w:0,l:0,seasons:0,natties:0,confs:0,bowls:0,playoffs:0,schools:[],security:70,coy:0},
    staff:{oc:genStaff('oc',2),dc:genStaff('dc',2)},pool:{oc:[],dc:[]},fac:{stadium:1,training:1,rehab:1},fan:60,morale:70,regime:'normal',focus:'balanced',captains:[],
    event:null,news:[],records:{},awards:[],heisman:null,potw:null,off:null,live:null,lastWeek:null,ts:newTeamStats(),cfp:null,fcsp:null,hcWeek:3,champ:null,champF:null,kind:'original'};
}
function finishLeague(L){refreshStaffPool(L);resetRecords(L);invalidate();buildSchedule(L);updateRankings(L);return L}
function genLeague(name){
  const places=shuffle(PLACES.slice()),masc=shuffle(MASCOTS.slice()),cols=shuffle(C1.slice());
  const prest=shuffle([5,5,4,4,4,4,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1]);
  const abbrs=new Set();
  const teams=places.map((pl,i)=>{
    const t=genTeam(i,pl,masc[i],cols[i],prest[i],Math.floor(i/8),{q:1.6+prest[i]*.55});
    const letters=pl.replace(/[^A-Za-z]/g,'').toUpperCase();
    let ab=letters.slice(0,3);if(abbrs.has(ab))ab=letters[0]+letters.slice(-2);if(abbrs.has(ab))ab=letters.slice(0,2)+letters.slice(-1);if(abbrs.has(ab))ab=letters.slice(0,4);abbrs.add(ab);t.abbr=ab;
    return t;
  });
  const L=baseLeague(name,teams,CONFS.map(n=>({name:n,div:'FBS',cg:7,ccg:true,auto:true})));
  const ids=c=>shuffle(teams.filter(t=>t.conf===c).map(t=>t.id)),used=new Set();
  for(const [a,b] of [[0,1],[2,3]]){const A=ids(a),B=ids(b);for(let j=0;j<8;j++){const x=teams[A[j]],y=teams[B[j]];let tn;do{tn='The '+pick(TROPHY_A)+' '+pick(TROPHY_B)}while(used.has(tn));used.add(tn);setRival(x,y,tn)}}
  return finishLeague(L);
}
function setRival(x,y,trophy){x.rival=y.id;y.rival=x.id;x.trophy=y.trophy=trophy;x.holder=y.holder=pick([x.id,y.id])}
const newTeamStats=()=>({g:0,pf:0,pa:0,py:0,ry:0,thirdA:0,thirdC:0,rzA:0,rzTD:0,to:0,pen:0});
function refreshStaffPool(L){L.pool={oc:[genStaff('oc'),genStaff('oc')],dc:[genStaff('dc'),genStaff('dc')]}}
function resetRecords(L){for(const t of L.teams){t.rec={w:0,l:0,cw:0,cl:0,pf:0,pa:0};t.cc=false;for(const p of t.roster)p.ss=newSS()}L.ts=newTeamStats()}
const confName=(c,L)=>{L=L||LG||(typeof SETUP!=='undefined'&&SETUP&&SETUP.L);const k=L&&L.confs&&L.confs[c];return k?k.name:CONFS[c]||'Conference'};
const confOf=(t,L)=>((L||LG).confs[t.conf]||{});

/* ---------- save migration ---------- */
function migrate(L){
  if(!L||!L.teams)return null;
  if(L.version===VERSION)return L;
  if(L.version===3){
    /* v6 → v7: 14 continuous ratings, sizes, deeper rosters */
    const up=p=>{upgradeAttrs(p);return p};
    for(const t of L.teams){t.roster.forEach(up);for(const pos of POS_ORDER){let have=t.roster.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]&&t.roster.length<ROSTER_CAP){t.roster.push(genPlayer(pos,qOf(t)-.6,rint(1,2)));have++}}assignNumbers(t)}
    if(L.off)['portal','recruits'].forEach(k=>{if(Array.isArray(L.off[k]))L.off[k].forEach(up)});
    L.version=VERSION;invalidate();(L.news||(L.news=[])).unshift({t:'Gridiron Live 7: every player now has 14 detailed ratings, and depth charts are deeper.'});
    return L;
  }
  if(L.version!==1)return null;
  for(const t of L.teams){
    for(const p of t.roster){p.str=p.str||clamp(Math.round((p.spd+p.end)/2+R(-1,1)),1,5);p.acc=p.acc||clamp(Math.round(p.thr+R(-1,1)),1,5);p.tkl=p.tkl||clamp(Math.round(p.cat+R(-1,1)),1,5);
      Object.assign(p,{cond:100,inj:0,injWhy:'',xp:0,ss:newSS(),rs:false,redshirt:false,home:pick(PLACES)})}
    for(const pos of POS_ORDER){let have=t.roster.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){t.roster.push(genPlayer(pos,1.6+t.prestige*.5));have++}}
    assignNumbers(t);Object.assign(t,{div:'FBS',stadium:t.city+' Stadium',cap:(30+t.prestige*14)*1000,bowlWins:0,playoffApps:0,dco:null,cc:false});
  }
  const fresh=genLeague(L.name);
  Object.assign(fresh,{teams:L.teams,user:L.user,credits:L.credits||8,season:L.season,history:(L.history||[]).map(h=>({...h})),settings:{...fresh.settings,...(L.settings||{}),style:'modern'}});
  for(const t of fresh.teams){t.rival=null;t.roster.forEach(upgradeAttrs)}
  for(let c=0;c<4;c+=2){const A=fresh.teams.filter(t=>t.conf===c),B=fresh.teams.filter(t=>t.conf===c+1);A.forEach((x,j)=>setRival(x,B[j],'The '+pick(TROPHY_A)+' '+pick(TROPHY_B)))}
  fresh.coach.name='Coach';fresh.coach.schools=[fresh.user];
  finishLeague(fresh);
  fresh.news.unshift({t:'Your dynasty was carried over to the new version. The current season restarts with the new college calendar.'});
  return fresh;
}

/* team packs (applyTeamPack, rosterFromPack) live in 02c-packs.js */
