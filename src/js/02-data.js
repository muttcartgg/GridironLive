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

const POS_ORDER=['QB','RB','WR','TE','OL','DL','LB','CB','S','K'];
const POS_NAME={QB:'Quarterbacks',RB:'Running backs',WR:'Wide receivers',TE:'Tight ends',OL:'Offensive line',DL:'Defensive line',LB:'Linebackers',CB:'Cornerbacks',S:'Safeties',K:'Kicker'};
const POS_COUNTS={QB:3,RB:3,WR:5,TE:2,OL:7,DL:6,LB:4,CB:4,S:3,K:1};
const STARTERS={QB:1,RB:1,WR:3,TE:1,OL:5,DL:4,LB:2,CB:3,S:2,K:1};
const ROSTER_CAP=46;
const NUMS={QB:[1,19],RB:[20,39],WR:[1,19],TE:[80,89],OL:[50,79],DL:[90,99],LB:[40,59],CB:[20,39],S:[20,49],K:[1,49]};
const PATTR={QB:['thr','acc','spd','end'],RB:['spd','str','cat','end'],WR:['cat','spd','str','end'],TE:['cat','str','spd','end'],OL:['str','end','spd'],DL:['tkl','str','spd','end'],LB:['tkl','str','spd','end'],CB:['spd','tkl','cat','end'],S:['spd','tkl','cat','end'],K:['thr','acc']};
const ANAME={spd:'Speed',str:'Strength',cat:'Catching',thr:'Arm',acc:'Accuracy',tkl:'Tackling',end:'Stamina'};
const ASHORT={spd:'SPD',str:'STR',cat:'CTH',thr:'ARM',acc:'ACC',tkl:'TKL',end:'STA'};
const attrName=(pos,k)=>pos==='K'&&k==='thr'?'Leg':(pos==='CB'||pos==='S')&&k==='cat'?'Ball skills':ANAME[k];
const attrShort=(pos,k)=>pos==='K'&&k==='thr'?'LEG':(pos==='CB'||pos==='S')&&k==='cat'?'BSK':ASHORT[k];
const W8={QB:{thr:.4,acc:.35,spd:.1,end:.15},RB:{spd:.45,str:.25,cat:.1,end:.2},WR:{cat:.4,spd:.4,str:.1,end:.1},TE:{cat:.35,str:.35,spd:.2,end:.1},OL:{str:.6,end:.25,spd:.15},DL:{tkl:.3,str:.35,spd:.2,end:.15},LB:{tkl:.4,str:.2,spd:.3,end:.1},CB:{spd:.45,tkl:.2,cat:.2,end:.15},S:{spd:.35,tkl:.35,cat:.15,end:.15},K:{thr:.55,acc:.45}};
const BIAS={QB:{thr:.5,acc:.3},RB:{spd:.4,str:.2},WR:{spd:.4,cat:.3},TE:{str:.2},OL:{str:.6,spd:-.9},DL:{str:.4,spd:-.4},LB:{tkl:.3},CB:{spd:.5},S:{spd:.3,tkl:.2},K:{}};
const YR=['FR','SO','JR','SR'];
const ATTR_KEYS=['spd','str','cat','thr','acc','tkl','end'];
const newSS=()=>({gp:0,pa:0,pc:0,py:0,ptd:0,int:0,ra:0,ry:0,rtd:0,rec:0,recy:0,rectd:0,tkl:0,sck:0,dint:0,fgm:0,fga:0});

function genPlayer(pos,q,yr){
  const b=BIAS[pos]||{};const p={id:uid(),first:pick(FIRST),last:pick(LAST),pos,yr:yr||rint(1,4),num:0,tone:rint(0,3),cond:100,inj:0,injWhy:'',xp:rint(0,40),ss:newSS(),rs:false,redshirt:false,home:pick(PLACES)};
  for(const k of ATTR_KEYS)p[k]=clamp(Math.round(q+(b[k]||0)+R(-1.2,1.2)),1,5);
  return p;
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

/* ---------- coaching staff ---------- */
const OC_TRAITS={'Play Caller':'Receivers gain separation faster','QB Guru':'Quarterbacks earn 25% more XP','Talent Spotter':'Recruits arrive with +1 star in a key rating','Motivator':'Morale drops half as much after losses'};
const DC_TRAITS={'Physio':'Half as many injuries','Ball Hawk':'More takeaways on defense','Run Stopper':'Opponents score less often','Disciplinarian':'Fewer penalties and calmer dilemmas'};
function genStaff(kind,r){return {name:pick(FIRST)+' '+pick(LAST),r:r||clamp(Math.round(R(1,5.4)),1,5),trait:pick(Object.keys(kind==='oc'?OC_TRAITS:DC_TRAITS))}}
const staffCost=s=>s.r*4;
const hasTrait=(k,t)=>LG&&LG.staff&&LG.staff[k]&&LG.staff[k].trait===t;

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
  if(L.version!==1)return null;
  for(const t of L.teams){
    for(const p of t.roster){p.str=p.str||clamp(Math.round((p.spd+p.end)/2+R(-1,1)),1,5);p.acc=p.acc||clamp(Math.round(p.thr+R(-1,1)),1,5);p.tkl=p.tkl||clamp(Math.round(p.cat+R(-1,1)),1,5);
      Object.assign(p,{cond:100,inj:0,injWhy:'',xp:0,ss:newSS(),rs:false,redshirt:false,home:pick(PLACES)})}
    for(const pos of POS_ORDER){let have=t.roster.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){t.roster.push(genPlayer(pos,1.6+t.prestige*.5));have++}}
    assignNumbers(t);Object.assign(t,{div:'FBS',stadium:t.city+' Stadium',cap:(30+t.prestige*14)*1000,bowlWins:0,playoffApps:0,dco:null,cc:false});
  }
  const fresh=genLeague(L.name);
  Object.assign(fresh,{teams:L.teams,user:L.user,credits:L.credits||8,season:L.season,history:(L.history||[]).map(h=>({...h})),settings:{...fresh.settings,...(L.settings||{}),style:'modern'}});
  for(const t of fresh.teams){t.rival=null}
  for(let c=0;c<4;c+=2){const A=fresh.teams.filter(t=>t.conf===c),B=fresh.teams.filter(t=>t.conf===c+1);A.forEach((x,j)=>setRival(x,B[j],'The '+pick(TROPHY_A)+' '+pick(TROPHY_B)))}
  fresh.coach.name='Coach';fresh.coach.schools=[fresh.user];
  finishLeague(fresh);
  fresh.news.unshift({t:'Your dynasty was carried over to the new version. The current season restarts with the new college calendar.'});
  return fresh;
}

/* ---------- team packs ---------- */
function applyTeamPack(L,pack,opts){
  const list=Array.isArray(pack)?pack:pack&&pack.teams;if(!Array.isArray(list)||!list.length)throw new Error('not a pack');
  if(!Array.isArray(pack)&&Array.isArray(pack.conferences))pack.conferences.forEach((n,i)=>{if(L.confs[i])L.confs[i].name=String(n).slice(0,22)});
  const hex=/^#[0-9a-f]{6}$/i;
  list.slice(0,L.teams.length).forEach((e,i)=>{const t=L.teams[i];if(!t||!e)return;
    if(e.school)t.city=String(e.school).slice(0,24);if(e.mascot)t.name=String(e.mascot).slice(0,18);if(e.abbr)t.abbr=String(e.abbr).toUpperCase().slice(0,5);
    if(hex.test(e.primary||''))t.c1=e.primary;if(hex.test(e.secondary||''))t.c2=e.secondary;if(e.stadium)t.stadium=String(e.stadium).slice(0,34);
    const pr=parseInt(e.prestige);if(pr>=1&&pr<=5&&pr!==t.prestige){t.prestige=pr;t.q=1.1+pr*.62;
      if(opts&&opts.regen&&t.id!==L.user){t.roster=[];for(const pos of POS_ORDER)for(let k=0;k<POS_COUNTS[pos];k++)t.roster.push(genPlayer(pos,qOf(t)));assignNumbers(t)}}
    if(Array.isArray(e.roster)&&e.roster.length)t.roster=rosterFromPack(e.roster,t);
    t.dco=null;});
  invalidate();if(L.phase==='regular'&&L.week===0){resetRecords(L);buildSchedule(L)}updateRankings(L);
}
/* Roster entries: {name, pos, num?, yr? ('FR'..'SR' or 1-4), ovr? (1-5 stars), spd?, str?, cat?, thr?, acc?, tkl?, end?}
   Missing ratings are generated around the player's overall; open spots are filled with walk-ons. */
function rosterFromPack(list,t){
  const out=[];const posMap={OT:'OL',OG:'OL',IOL:'OL',C:'OL',G:'OL',T:'OL',DE:'DL',DT:'DL',EDGE:'DL',NT:'DL',OLB:'LB',ILB:'LB',MLB:'LB',DB:'CB',FS:'S',SS:'S',SAF:'S',PK:'K',P:'K',HB:'RB',FB:'RB',ATH:'WR'};
  for(const e of list.slice(0,ROSTER_CAP)){if(!e||!e.name)continue;let pos=String(e.pos||'').toUpperCase();pos=POS_ORDER.includes(pos)?pos:posMap[pos];if(!pos)continue;
    const q=parseFloat(e.ovr);const p=genPlayer(pos,q>=1&&q<=5?q:qOf(t));const nm=String(e.name).trim().split(/\s+/);p.first=nm.shift().slice(0,16);p.last=(nm.join(' ')||'').slice(0,20);
    const yr=typeof e.yr==='string'?['FR','SO','JR','SR'].indexOf(e.yr.toUpperCase().replace(/^RS\s*/,''))+1:parseInt(e.yr);if(yr>=1&&yr<=4)p.yr=yr;if(/^RS/i.test(String(e.yr||'')))p.rs=true;
    const n=parseInt(e.num);if(n>=0&&n<=99)p.num=n;for(const k of ATTR_KEYS){const v=parseInt(e[k]);if(v>=1&&v<=5)p[k]=v}out.push(p)}
  for(const pos of POS_ORDER){let have=out.filter(p=>p.pos===pos).length;while(have<POS_COUNTS[pos]){out.push(genPlayer(pos,qOf(t)-.5));have++}}
  assignNumbers({roster:out});return out;
}
