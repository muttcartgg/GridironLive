/* =========================================================
   04b · Season-long recruiting. Each season a prospect pool (~1,600 FBS-level + 450 FCS-level high-school seniors):
   247-style composite (0.70–1.00 → 2–5 stars), national / position / state ranks, a hometown in a real state, size,
   hidden true ratings and a development trait (so gems and busts exist), and nine weighted preferences.
   Every regular-season week each school banks interest points with its targets (CPU schools by prestige, need, success
   and fit; you by spending hours: scout, contact, pitch, offer, official visits to home games, or your staff does it).
   Prospects commit (and now and then decommit), most commits sign in the early signing period after Championship
   Week, the rest choose on National Signing Day; freshmen arrive at the new season with their true ratings.
   Stored in LG.recruit (prospects as short-key objects, created lazily so older saves pick it up mid-season).
   ========================================================= */
const RC_PREFS=[['pt','Playing time'],['ch','Championship contender'],['pro','Pro potential'],['nil','NIL'],['home','Proximity to home'],['aca','Academic prestige'],['stab','Coach stability'],['brand','Brand exposure'],['conf','Conference prestige']];
const RC_PW=[18,12,16,14,14,6,6,8,6];   /* how often each preference is a prospect's top priority */
const RC_DEV=['Normal','Impact','Star','Elite'],RC_DEVP={5:[.25,.35,.28,.12],4:[.45,.33,.17,.05],3:[.62,.27,.09,.02],2:[.76,.19,.045,.005]};
const RC_HRS={scout:5,contact:3,pitch:6},RC_VISITS=4;
/* states: code, share of national talent, centroid lat/lon, a few hometowns */
const RC_STATES=('TX 12 31.5 -99.3 Houston/Dallas/Austin/San Antonio/Katy/DeSoto/Duncanville/Allen/Fort Worth/Beaumont;FL 11 28.6 -82.4 Miami/Fort Lauderdale/Tampa/Jacksonville/Orlando/Bradenton/Tallahassee/Plantation;'+
 'GA 9 32.7 -83.4 Atlanta/Buford/Savannah/Macon/Valdosta/Marietta/Columbus/Rome;CA 8 36.8 -119.4 Los Angeles/Santa Ana/San Diego/Bellflower/Sacramento/Corona/Oakland/Mission Viejo;'+
 'AL 4 32.8 -86.8 Birmingham/Mobile/Montgomery/Hoover/Huntsville/Tuscaloosa;LA 4 31.1 -92.0 New Orleans/Baton Rouge/Shreveport/Lafayette/Monroe;OH 4 40.3 -82.8 Columbus/Cincinnati/Cleveland/Akron/Toledo/Massillon;'+
 'NC 3.2 35.6 -79.4 Charlotte/Raleigh/Greensboro/Durham/Wilmington;TN 3 35.9 -86.4 Nashville/Memphis/Knoxville/Chattanooga/Murfreesboro;PA 2.8 40.9 -77.8 Philadelphia/Pittsburgh/Harrisburg/Allentown/Erie;'+
 'VA 2.5 37.5 -78.9 Richmond/Virginia Beach/Norfolk/Chesapeake/Roanoke;MS 2.4 32.7 -89.7 Jackson/Hattiesburg/Meridian/Tupelo/Gulfport;MI 2.4 43.3 -84.5 Detroit/Grand Rapids/Lansing/Ann Arbor/Saginaw;'+
 'MD 2.2 39.0 -76.8 Baltimore/Silver Spring/Upper Marlboro/Annapolis;NJ 2.2 40.2 -74.7 Newark/Paterson/Trenton/Camden/Montclair;SC 2.2 33.9 -80.9 Columbia/Charleston/Greenville/Rock Hill/Spartanburg;'+
 'IL 2 40.0 -89.2 Chicago/Peoria/Rockford/Springfield/Naperville;AZ 1.6 34.2 -111.7 Phoenix/Chandler/Mesa/Tucson/Scottsdale;WA 1.3 47.4 -120.5 Seattle/Tacoma/Spokane/Kennewick;MO 1.3 38.4 -92.5 St. Louis/Kansas City/Springfield/Columbia;'+
 'OK 1.2 35.6 -97.5 Oklahoma City/Tulsa/Norman/Lawton;IN 1.1 39.9 -86.3 Indianapolis/Fort Wayne/Carmel/Evansville;KY 1 37.5 -85.3 Louisville/Lexington/Bowling Green;AR 1 34.9 -92.4 Little Rock/Fayetteville/Pine Bluff/Bentonville;'+
 'NY 1 42.9 -75.5 New York/Buffalo/Rochester/Syracuse;UT .9 39.3 -111.7 Salt Lake City/Provo/St. George/Ogden;NV .8 39.3 -116.6 Las Vegas/Henderson/Reno;CO .8 39.0 -105.5 Denver/Colorado Springs/Aurora;'+
 'OR .7 43.9 -120.6 Portland/Eugene/Salem;MN .7 46.3 -94.3 Minneapolis/St. Paul/Eden Prairie;WI .7 44.6 -89.9 Milwaukee/Madison/Green Bay;KS .6 38.5 -98.4 Wichita/Olathe/Topeka;IA .6 42.0 -93.5 Des Moines/Cedar Rapids/Iowa City;'+
 'NE .5 41.5 -99.8 Omaha/Lincoln;MA .5 42.3 -71.8 Boston/Worcester/Springfield;CT .4 41.6 -72.7 Hartford/New Haven/Bridgeport;DC .4 38.9 -77.0 Washington;HI .4 20.8 -156.3 Honolulu/Kapolei;NM .3 34.4 -106.1 Albuquerque/Las Cruces;'+
 'WV .3 38.6 -80.6 Charleston/Huntington/Morgantown;ID .25 44.4 -114.6 Boise/Meridian;DE .2 39.0 -75.5 Wilmington/Dover;MT .15 47.0 -109.6 Billings/Missoula;SD .15 44.4 -100.2 Sioux Falls/Rapid City;ND .15 47.5 -100.5 Fargo/Bismarck;'+
 'WY .1 43.0 -107.6 Cheyenne/Casper;NH .1 43.7 -71.6 Manchester/Nashua;ME .1 45.4 -69.2 Portland/Bangor;RI .1 41.7 -71.5 Providence/Warwick;VT .05 44.1 -72.7 Burlington;AK .05 61.4 -152.3 Anchorage')
 .split(';').map(s=>{const [st,w,la,lo,...c]=s.split(' ');return {st,w:+w,la:+la,lo:+lo,c:c.join(' ').split('/')}});
/* NCAA schools by state (other leagues get a state from the team id) */
const RC_TEAM_ST='AL:ALA AUB UAB USA TROY JVST AAMU ALST UNA SAM|AZ:ARIZ ASU NAU|AR:ARK ARST UCA UAPB|CA:UCLA USC CAL STAN FRES SDSU SJSU SAC CP UCD SDU|CO:COLO CSU AF UNCO|CT:UCON CCSU UNHV SHU YALE|DE:DEL DSU|'+
 'FL:UF FSU MIA UCF USF FAU FIU UWF BCU FAMU STET|GA:UGA GT GASO GAST KENN UWG MER|HI:HAW|ID:BOIS IDHO IDST|IL:ILL NW NIU ILST SIU EIU WIU CHST|IN:IU PUR ND BALL INST BUT VAL|IA:IOWA ISU UNI DRKE|KS:KU KSU|'+
 'KY:UK LOU WKU EKU MUR MORE|LA:LSU TUL ULL ULM LT MCN NICH NWST SELA GRAM SOU|ME:ME|MD:MD NAVY TOW MORG|MA:BC MASS HC STON HARV|MI:MICH MSU CMU EMU WMU|MN:MINN STMN|MS:MSST MISS USM ALCN JKST MVSU|MO:MIZ MOST SEMO LIN|'+
 'MT:MONT MTST|NE:NEB|NV:NEV UNLV|NH:UNH DART|NJ:RUTG MONM PRIN|NM:UNM NMSU|NY:SYR ARMY BUFF ALB STBK FOR COLG COR CLMB LIU MRST WAG|NC:DUKE UNC NCST WAKE CLT ECU APP CAMP ELON NCAT WCU GWEB DAV NCCU|ND:NDSU UND|'+
 'OH:OSU CIN AKR BGSU KENT M-OH OHIO TOL YSU DAY|OK:OU OKST TLSA|OR:ORE ORST PRST|PA:PSU PITT TEM BUCK LAF LEH NOVA PENN DUQ RMU MERC|RI:URI BRWN BRY|SC:SC CLEM CCU FUR CIT WOF CHSO PRES SCST|SD:USD SDST|'+
 'TN:TENN VAN MEM MTSU UTC ETSU TNTC TNST UTM APSU|TX:TEX TAMU BAY HOU TCU TTU SMU RICE UNT UTSA TXST UTEP SHSU ETAM HCU UIW LAM SFA RGV ACU TAR PV TXSO|UT:UTAH BYU USU WEB SUU UTU|'+
 'VA:UVA VT LIB JMU ODU HAMP RICH W&M VMI NORF|WA:UW WSU EWU|DC:GTWN HOW|WV:WVU MRSH|WI:WIS|WY:WYO';
const RC_ACA={A:'STAN ND DUKE NW VAN RICE CAL UCLA MICH UVA BRWN CLMB COR DART HARV PENN PRIN YALE GTWN W&M',B:'USC UNC GT WAKE BC TUL NAVY ARMY AF WIS ILL UF TEX UW MD PUR OSU BUCK COLG LAF LEH HC FOR RICH NOVA DAV FUR SMU MIA PSU UGA BYU PITT SYR RUTG MINN IOWA VT DAY SDU BUT'};
const rcR=(a,b)=>a+Math.random()*(b-a);
const rcW=(ws,r)=>{let s=0;for(const w of ws)s+=w;let x=(r==null?Math.random():r)*s;for(let i=0;i<ws.length;i++){x-=ws[i];if(x<0)return i}return ws.length-1};
const rcStars=c=>c>=9834?5:c>=8900?4:c>=8000?3:2;   /* c = composite × 10000 */
/* composite → expected attribute level on the 1–5 scale (the freshman a 4-star usually is) */
const rcLevel=c=>{c/=1e4;return c>=.9834?4.3+(c-.9834)/.0166*.3:c>=.89?3.5+(c-.89)/.0934*.8:c>=.8?2.2+(c-.8)/.09*1.3:1.2+(c-.7)/.1};
const RC_K={};const rcKeys=pos=>RC_K[pos]||(RC_K[pos]=[...new Set([...PATTR[pos],...Object.keys(W8[pos])])]);
const RC_PI={};POS_ORDER.forEach((p,i)=>RC_PI[p]=i);
const rcName=P=>FIRST[P.f%FIRST.length]+' '+LAST[P.l%LAST.length];
const rcHome=P=>{const S=RC_STATES[P.st];return S.c[P.ci%S.c.length]+', '+S.st};
const rcHt=h=>Math.floor(h/12)+'-'+(h%12);
const rcAuto=L=>!L.settings||L.settings.recAuto!==false;
const rcLive=L=>L.phase==='regular'&&L.week<(L.R||13);
const rcGrade=s=>s>=.9?'A+':s>=.8?'A':s>=.7?'B+':s>=.6?'B':s>=.5?'C+':s>=.4?'C':s>=.3?'D':'F';
const rcBudget=L=>{const s=L.staff||{},f=L.fac||{};return Math.round(30+3*(((s.oc&&s.oc.r)||2)+((s.dc&&s.dc.r)||2))+2*((f.stadium||1)+(f.training||1)+(f.rehab||1))+Math.round(coachMod(L.teams[L.user],'hrs')-1))};   /* Recruiter trait, Silver Tongue perk (04c) */

/* ---------- geography ---------- */
let RC_PX=null,RC_TS=null;
function rcProx(a,b){
  if(a===b)return 1;const n=RC_STATES.length;
  if(!RC_PX){RC_PX=new Float32Array(n*n);for(let i=0;i<n;i++)for(let j=0;j<n;j++){const A=RC_STATES[i],B=RC_STATES[j],dy=(A.la-B.la)*69,dx=(A.lo-B.lo)*69*Math.cos((A.la+B.la)/360*Math.PI);RC_PX[i*n+j]=i===j?1:clamp(.85-Math.hypot(dx,dy)/1400,0,.85)}}
  return RC_PX[a*n+b]}
function rcTeamSt(L,t){
  if(!RC_TS){RC_TS={};for(const g of RC_TEAM_ST.split('|')){const [st,ab]=g.split(':'),i=RC_STATES.findIndex(s=>s.st===st);for(const a of ab.split(' '))RC_TS[a]=i}}
  const i=L.kind==='ncaa'?RC_TS[t.abbr]:null;if(i!=null)return i;
  return rcW(RC_STATES.map(s=>s.w),((t.id+1)*2654435761>>>0)%100000/100000)}

/* ---------- team context (rebuilt once a week, not saved): recruiting power, what each school offers on the nine
   preferences, open spots by position, the returning starter a prospect would compete with, class size limit ---------- */
let RC_C=null;
function rcCtx(L,fresh){
  const key=L.season+':'+L.week+':'+L.phase+':'+L.user;if(!fresh&&RC_C&&RC_C.L===L&&RC_C.key===key)return RC_C;
  const TT=L.teams,n=TT.length,C={L,key,rp:new Float32Array(n),st:new Int16Array(n),s:[],np:[],dq:[],cap:new Int16Array(n)};
  const rk={};(L.rank||[]).slice(0,25).forEach((id,i)=>rk[id]=i+1);(L.rankF||[]).slice(0,25).forEach((id,i)=>rk[id]=i+1);
  const cp={};L.confs.forEach((c,i)=>{const ts=TT.filter(t=>t.conf===i);cp[i]=ts.length?sum(ts.map(t=>t.prestige))/ts.length:2});
  const aca={};for(const [g,v] of [['A',1],['B',.8]])for(const a of RC_ACA[g].split(' '))aca[a]=v;
  const u=L.user,h=L.history||[];let ten=0;for(let i=h.length-1;i>=0&&h[i].team===u;i--)ten++;
  for(const t of TT){const i=t.id,fcs=isFCS(t),f=fcs?.5:1,g=t.rec?t.rec.w+t.rec.l:0,wp=g?t.rec.w/g:.5,pr=(t.prestige-1)/4,r=rk[i]?(26-rk[i])/25:0,hs=((i+7)*2654435761>>>0)%1000/1000,cf=L.confs[t.conf]||{};
    C.rp[i]=clamp((.55*pr+.25*wp+.2*clamp((qOf(t)-1.5)/3.2,0,1))*(fcs?.45:1)*coachMod(t,'rec')+(L.champ===i?.05:0),0,1);
    C.st[i]=rcTeamSt(L,t);
    const nilT=clamp(.15+.6*pr+.25*clamp((t.cap||40000)/110000,0,1),0,1)*f;
    C.s[i]=[0,clamp(.45*pr+.35*wp*wp+.2*r+(L.champ===i?.1:0),0,1),clamp((.6*pr+.4*clamp((teamOvr(t)-2)/2.6,0,1)+.15*clamp((t.dp||0)/6,0,1))*f,0,1),
      i===u?clamp(.5*nilT+.5*nilPower(L),0,1):nilT,0,
      L.kind==='ncaa'?(aca[t.abbr]||(fcs?.45:.5)):.3+hs*.6,
      i===u?clamp(.7*(L.coach.security||50)/100+.3*Math.min(ten,6)/6,0,1):clamp(.45+.1*(t.prestige-3)+(hs-.5)*.4,.05,.95),
      clamp((.55*pr+.25*r+.2*clamp((t.cap||40000)/100000,0,1))*f,0,1),
      clamp((cf.ind?pr:(cp[t.conf]-1)/4)*(fcs?.6:1),0,1)];
    const by=POS_ORDER.map(()=>[]);for(const p of t.roster)if(p.yr<4||(p.redshirt&&p.ss.gp<=4&&!p.rs))by[RC_PI[p.pos]].push(ovr(p));
    C.np[i]=POS_ORDER.map((pos,k)=>Math.max(0,POS_COUNTS[pos]+(pos==='K'?0:1)-by[k].length));
    C.dq[i]=POS_ORDER.map((pos,k)=>{const a=by[k].sort((x,y)=>y-x);return a.length>=STARTERS[pos]?a[STARTERS[pos]-1]:1});
    C.cap[i]=clamp(POS_ORDER.reduce((s,pos,k)=>s+Math.max(0,POS_COUNTS[pos]-by[k].length),0)+6,12,25)}
  return RC_C=C}
/* how well school ti fits prospect P (0–1): his preference weights × what the school offers */
function rcScore(P,ti,C,k){
  if(k===0){const v=rcLevel(P.c)+.3,d=C.dq[ti][P.p];return clamp(.55+(v-d)*.5,.05,1)}
  if(k===4)return rcProx(P.st,C.st[ti]);return C.s[ti][k]}
function rcFit(P,ti,C){let a=0,b=0;for(let k=0;k<9;k++){const w=P.pr.charCodeAt(k)-48;a+=w*rcScore(P,ti,C,k);b+=w}return a/b}

/* ---------- the pool ---------- */
function rcGen(L){
  const nF=1600,nC=450,n5=rint(30,35),n4=rint(320,380),n2=150,n3=nF-n5-n4-n2,stW=RC_STATES.map(s=>s.w),pw=POS_ORDER.map(p=>POS_COUNTS[p]),pwK=POS_ORDER.map(p=>p==='K'?0:POS_COUNTS[p]);
  const comp=i=>i<n5?.9999-.0165*i/Math.max(1,n5-1):i<n5+n4?.9833-.0933*((i-n5)/n4)**.8:i<n5+n4+n3?.8899-.0899*((i-n5-n4)/n3)**.9:i<nF?.7999-.03*(i-nF+n2)/n2:.7969-.0969*(i-nF)/nC;
  const P=[];
  for(let i=0;i<nF+nC;i++){
    const c=Math.round(comp(i)*1e4),s=rcStars(c),pi=rcW(s>=4?pwK:pw),pos=POS_ORDER[pi],st=rcW(stW),tl=rcLevel(c)+gauss()*.45,z=SIZE[pos];
    const pr=Array.from({length:9},()=>rint(1,3)),top=rcW(RC_PW);let sec=rcW(RC_PW);if(sec===top)sec=(top+rint(1,8))%9;pr[top]=5;pr[sec]=Math.max(pr[sec],4);
    P.push({i,f:rint(0,FIRST.length-1),l:rint(0,LAST.length-1),p:pi,c,st,ci:rint(0,RC_STATES[st].c.length-1),h:Math.round(z[0]+gauss()*z[1]),w:Math.round(z[2]-6+gauss()*z[3]),
      a:rcKeys(pos).map(k=>Math.round(r1(tl+(BIAS[pos][k]||0)*.6+R(-.5,.5)+(k==='awr'?-.3:0))*10)),d:rcW(RC_DEVP[s]),pr:pr.join(''),
      dw:s===5?rint(4,16):s===4?rint(0,13):s===3?rint(0,11):rint(0,9),x:[],m:-1,s:0,cw:-1})}
  return P}
/* first suitors: schools whose recruiting power is near the prospect's level (a reach up, more reaching down), by fit,
   need at his position and distance from home; the best 4–7 recruit him */
function rcSuitors(L,R,C){
  const order=L.teams.map(t=>t.id).sort((a,b)=>C.rp[a]-C.rp[b]),rps=order.map(id=>C.rp[id]),N=order.length;
  const lb=v=>{let lo=0,hi=N;while(lo<hi){const m=(lo+hi)>>1;if(rps[m]<v)lo=m+1;else hi=m}return lo};
  for(const P of R.p){
    const d=clamp((P.c/1e4-.7)/.3,0,1),k=P.c>=9834?7:P.c>=8900?6:P.c>=8000?5:4;let a=lb(d-.22),b=lb(d+.4);
    while(b-a<k*2&&(a>0||b<N)){a=Math.max(0,a-3);b=Math.min(N,b+3)}
    const sc=new Map();for(let t=0;t<26;t++){const ti=order[a+Math.floor(Math.random()*(b-a))];if(!sc.has(ti))sc.set(ti,rcFit(P,ti,C)*.6+Math.min(1,C.np[ti][P.p]/2)*.35+rcProx(P.st,C.st[ti])*.45+Math.random()*.35)}
    P.x=[...sc.entries()].sort((x,y)=>y[1]-x[1]).slice(0,k).flatMap(([ti])=>[ti,rint(4,18)])}
}
/* the pool for this season's class; created lazily (older saves, a new dynasty), catching up on weeks already played */
function rcEnsure(L){
  if(!L||L.user==null||!L.teams)return null;let R=L.recruit;
  if(!R||R.season!==L.season){
    const t0=performance.now();
    R=L.recruit={v:1,season:L.season,p:rcGen(L),u:{},b:[],ut:L.user,wk:0,hrs:rcBudget(L),hw:0,log:[],nc:0,nd:0,ms:[],early:0,done:0};
    const C=rcCtx(L,true);rcSuitors(L,R,C);
    for(let s=0;s<5;s++)rcWeek(L,true,0);   /* summer: camps, unofficial visits, early commitments */
    R.b=rcStartBoard(L,R);
    const played=L.phase==='offseason'?(L.R||13)+1:Math.min(L.week,(L.R||13)+1);
    for(let w=0;w<Math.min(played,L.R||13);w++)rcWeek(L,true,w);
    if(played>(L.R||13))rcEarly(L,true);
    R.hrs=rcBudget(L);R.hw=L.week;R.gen=Math.round(performance.now()-t0);
  }
  if(R.ut!==L.user){R.u={};R.ut=L.user;R.b=rcStartBoard(L,R)}   /* new job */
  if(R.hw!==L.week&&rcLive(L)){R.hw=L.week;R.hrs=rcBudget(L)}
  return R}
/* the board starts with your 40 best chances (your share of his interest, then rating) */
const rcStartBoard=(L,R)=>R.p.filter(P=>rcIdx(P,L.user)>=0&&(P.s===0||P.m===L.user)).sort((a,b)=>(b.m===L.user)-(a.m===L.user)||rcShare(b,L.user)-rcShare(a,L.user)||b.c-a.c).slice(0,40).map(P=>P.i);
const rcIdx=(P,ti)=>{for(let j=0;j<P.x.length;j+=2)if(P.x[j]===ti)return j;return -1};
const rcPts=(P,ti)=>{const j=rcIdx(P,ti);return j<0?0:P.x[j+1]};
const rcOffered=(L,R,P,ti,auto)=>ti!==L.user||auto||!!(R.u[P.i]&&R.u[P.i].o);
function rcTop(P,n){let tot=0;for(let j=1;j<P.x.length;j+=2)tot+=P.x[j];const out=[];for(let j=0;j<P.x.length;j+=2)out.push([P.x[j],tot?Math.round(P.x[j+1]/tot*100):0]);return out.sort((a,b)=>b[1]-a[1]).slice(0,n)}
const rcShare=(P,ti)=>{let tot=0;for(let j=1;j<P.x.length;j+=2)tot+=P.x[j];return tot?Math.round(rcPts(P,ti)/tot*100):0};
/* puts the user on a prospect's list (replacing the least interested school when it's full) */
function rcJoin(L,P){if(rcIdx(P,L.user)>=0)return;if(P.x.length>=14){let lo=-1;for(let j=0;j<P.x.length;j+=2)if(P.x[j]!==P.m&&(lo<0||P.x[j+1]<P.x[lo+1]))lo=j;if(lo>=0)P.x.splice(lo,2)}P.x.push(L.user,0)}

/* ---------- one recruiting week for every school ---------- */
function rcWeek(L,silent,wk){
  const R=L.recruit,C=rcCtx(L,!silent),u=L.user,auto=rcAuto(L),n=L.teams.length,cnt=new Int16Array(n),cp=new Int16Array(n*10),ev=[],W=wk!=null?wk:L.week,t0=performance.now();
  for(const P of R.p)if(P.m>=0){cnt[P.m]++;cp[P.m*10+P.p]++}
  /* official visits to this week's home game: the result, a rivalry and the hype around the game move him */
  if(!silent){const wkx=L.weeks[W],g=wkx&&wkx.games.find(x=>x.h===u&&!x.neutral&&x.hs!=null);
    for(const id in R.u){const U=R.u[id];if(U.v!==W)continue;U.v=-1;const P=R.p[id];if(!P||P.s===2)continue;
      if(!g){U.vr=0;continue}const won=g.hs>g.as,opp=g.a,ork=rankOf(opp),urk=rankOf(u);
      const b=Math.round(18+(won?14+(g.hs-g.as>=14?8:0):-10)+(g.rival?8:0)+(ork?6:0)+(urk?5:0)+(g.slot==='Primetime'?4:0)+(W===L.hcWeek?3:0));
      rcJoin(L,P);P.x[rcIdx(P,u)+1]=Math.max(0,P.x[rcIdx(P,u)+1]+b);U.vd=1;U.vr=b;
      ev.push(`${rcName(P)} took his official visit (${won?'a win':'a loss'} vs ${T(opp).city}): ${b>=0?'+':''}${b} interest.`)}}
  /* staff auto-scouting of the top targets */
  if(auto&&!silent){rcStaffTargets(L,R,C);let k=0;for(const id of R.b){const P=R.p[id];if(!P||P.s===2)continue;const U=R.u[id]||(R.u[id]={});if((U.sc||0)<100){U.sc=Math.min(100,(U.sc||0)+25);if(++k>=5)break}}}
  for(const P of R.p){
    if(P.s===2)continue;const x=P.x;let tot=0,best=-1,bp=-1,sec=0;
    for(let j=0;j<x.length;j+=2){const ti=x[j];
      if((ti!==u||auto)&&(cnt[ti]<C.cap[ti]||P.m===ti)){const np=C.np[ti][P.p],e=(ti===u?1.05:.75+.15*Math.min(2,np))+(C.st[ti]===P.st?.15:0),sat=cp[ti*10+P.p]>np&&P.m!==ti?.3:1;
        const f=.2+rcFit(P,ti,C);x[j+1]+=Math.round(12*e*sat*f*f*rcR(.8,1.2))}
      const v=x[j+1];tot+=v;
      if((cnt[ti]<C.cap[ti]||P.m===ti)&&rcOffered(L,R,P,ti,auto)){if(v>bp){sec=Math.max(sec,bp);bp=v;best=ti}else if(v>sec)sec=v}}
    if(P.s===0&&x.length>6&&W>=P.dw-3&&Math.random()<.35){let lo=-1;for(let j=0;j<x.length;j+=2)if(lo<0||x[j+1]<x[lo+1])lo=j;   /* he trims his list as he gets close */
      if(x[lo]!==u||x[lo+1]<tot*.08){tot-=x[lo+1];if(x[lo]===best){best=-1;bp=-1}x.splice(lo,2)}}
    if(P.s===0){if(best<0)continue;const th=[0,0,50,62,80,100][rcStars(P.c)];
      if(bp>=th&&bp/tot>=.33&&bp-sec>=8&&Math.random()<(W>=P.dw?.35:.04)){P.s=1;P.m=best;P.cw=W;cnt[best]++;cp[best*10+P.p]++;R.nc++;
        if(!silent){if(best===u)ev.push(['c',P]);else if(rcIdx(P,u)>=0&&R.b.includes(P.i))ev.push(['l',P])}}}
    else{const mp=rcPts(P,P.m),flip=best>=0&&best!==P.m;
      if(Math.random()<(flip?(bp>mp*1.2+8?.12:.03):.004)){const old=P.m;P.s=0;P.m=-1;cnt[old]--;cp[old*10+P.p]--;const jo=rcIdx(P,old);if(jo>=0)x[jo+1]=Math.round(mp*.7);R.nd++;
        if(!silent&&(old===u||R.b.includes(P.i)))ev.push(['d',P,old])}}
  }
  R.wk=W+1;
  if(!silent){R.ms.push(Math.round((performance.now()-t0)*10)/10);if(R.ms.length>20)R.ms.shift();rcNews(L,R,ev,W)}
}
/* your staff keeps the board stocked: about two open targets per open spot in the class, near your level */
function rcStaffTargets(L,R,C){
  const u=L.user,mine=R.p.filter(P=>P.m===u).length,open=R.b.filter(i=>{const P=R.p[i];return P&&P.s===0&&rcIdx(P,u)>=0}).length,want=Math.min(4,(C.cap[u]-mine)*2-open);
  if(want<=0)return;const rp=C.rp[u],c=[];
  for(const P of R.p){if(P.s!==0||rcIdx(P,u)>=0)continue;const d=clamp((P.c/1e4-.7)/.3,0,1);if(d>rp+.22||d<rp-.4)continue;c.push([P,rcFit(P,u,C)+Math.min(1,C.np[u][P.p]/2)*.5+d*.5+Math.random()*.2])}
  c.sort((a,b)=>b[1]-a[1]).slice(0,want).forEach(([P])=>{rcJoin(L,P);if(!R.b.includes(P.i))R.b.push(P.i)})}
/* weekly summary: news line + the recruiting log */
function rcNews(L,R,ev,W){
  const u=L.user,mine=ev.filter(e=>e[0]==='c'),lost=ev.filter(e=>e[0]==='l'),dec=ev.filter(e=>e[0]==='d'),vis=ev.filter(e=>typeof e==='string'),cl=rcClass(L);
  const nm=P=>`${rcStars(P.c)}★ ${POS_ORDER[P.p]} ${rcName(P)}`,parts=[];
  if(mine.length)parts.push(mine.slice(0,2).map(e=>nm(e[1])).join(' and ')+(mine.length>2?` and ${mine.length-2} more`:'')+(mine.length>1?' commit to you':' commits to you'));
  for(const e of dec)parts.push(e[2]===u?`${nm(e[1])} decommits from you`:`${nm(e[1])} decommits from ${T(e[2]).city}`);
  if(lost.length)parts.push(lost.slice(0,2).map(e=>`${rcName(e[1])} picks ${T(e[1].m).city}`).join(', ')+(lost.length>2?` (+${lost.length-2})`:''));
  const wl=(L.weeks[W]&&L.weeks[W].label)||'Week '+(W+1);
  for(const v of vis)R.log.unshift({w:W,t:v});
  if(parts.length){const t=`Recruiting: ${parts.join('. ')}. Class: ${cl.n} commits, #${cl.rank}.`;R.log.unshift({w:W,t:wl+' · '+parts.join('. ')+'.'});L.news.unshift({t,good:mine.length>0})}
  R.log=R.log.slice(0,24)}
/* early signing period (after Championship Week): most commits sign */
function rcEarly(L,silent){
  const R=L.recruit;if(!R||R.early)return;R.early=1;let n=0,m=0;
  for(const P of R.p)if(P.s===1){if(Math.random()<.88){P.s=2;if(P.m===L.user)n++}else if(P.m===L.user)m++}
  if(!silent){const cl=rcClass(L);const t=`Early signing period: ${n} of your commits signed${m?`, ${m} still to sign`:''}. Your class ranks #${cl.rank}.`;L.news.unshift({t,good:true});R.log.unshift({w:L.week,t})}}
/* weekly hook from finishWeek */
function rcOnWeek(L,w){
  if(!L||L.user==null)return;
  if(w.kind==='reg'){const R=rcEnsure(L);if(R&&!R.done)rcWeek(L)}
  else if(w.kind==='post0'){const R=rcEnsure(L);if(R)rcEarly(L)}}

/* ---------- National Signing Day ---------- */
function rcSigningDay(L){
  const R=rcEnsure(L);if(!R||R.done)return;const C=rcCtx(L,true),u=L.user,auto=rcAuto(L),cnt=new Int16Array(L.teams.length);
  if(!R.early)rcEarly(L,true);
  for(const P of R.p)if(P.m>=0)cnt[P.m]++;
  for(const P of R.p.filter(P=>P.s<2).sort((a,b)=>b.c-a.c)){
    if(P.s===1){if(Math.random()<.94){P.s=2;continue}cnt[P.m]--;P.s=0;P.m=-1;R.nd++}
    const opts=[];for(let j=0;j<P.x.length;j+=2){const ti=P.x[j],v=P.x[j+1];if(v>0&&cnt[ti]<C.cap[ti]&&rcOffered(L,R,P,ti,auto))opts.push([ti,v])}
    const tot=sum(opts.map(o=>o[1]));if(!opts.length||(tot<20&&Math.random()<.5))continue;   /* prep school or JUCO */
    let r=Math.random()*sum(opts.map(o=>o[1]*o[1])),pk=opts[0][0];for(const [ti,v] of opts){r-=v*v;if(r<0){pk=ti;break}}
    P.s=2;P.m=pk;P.cw=99;cnt[pk]++}
  R.done=1;
  /* true ratings come out as they enroll: gems and busts against what your staff expected */
  const mine=R.p.filter(P=>P.s===2&&P.m===u),gb=mine.map(P=>{const tr=rcTrueOvr(P),ex=rcSeenOvr(P,(R.u[P.i]||{}).sc||0);return {i:P.i,tr,ex,d:tr-ex}});
  const cl=rcClass(L),cls=rcClasses(L);
  if(L.off)L.off.rsign={rank:cl.rank,pts:cl.pts,n:cl.n,stars:cl.stars,top:cls.filter(c=>isFCS(T(c.id))===isFCS(T(u))).slice(0,10).map(c=>({id:c.id,pts:Math.round(c.pts*10)/10,n:c.n,s5:c.stars[5],s4:c.stars[4]})),
    gems:gb.filter(g=>g.d>=4||R.p[g.i].d>=2&&g.d>=0).sort((a,b)=>b.d+R.p[b.i].d*3-a.d-R.p[a.i].d*3).slice(0,4),busts:gb.filter(g=>g.d<=-4).sort((a,b)=>a.d-b.d).slice(0,3)};
  (L.recHist||(L.recHist=[])).unshift({season:R.season+1,rank:cl.rank,pts:Math.round(cl.pts*10)/10,n:cl.n,stars:cl.stars,team:u});L.recHist=L.recHist.slice(0,12);
  L.news.unshift({t:`National Signing Day: your ${R.season+1} class has ${cl.n} signees and ranks #${cl.rank} (${cl.stars[5]} five-stars, ${cl.stars[4]} four-stars).`,good:true})}
/* 247-style team points: Σ (rating − 70) · e^(−((n−1)/14)²) over the class sorted by rating */
function rcClasses(L){
  const R=L.recruit,by=new Map();if(!R)return [];for(const P of R.p)if(P.m>=0){if(!by.has(P.m))by.set(P.m,[]);by.get(P.m).push(P)}
  const out=[];for(const [id,a] of by){a.sort((x,y)=>y.c-x.c);let s=0;const st={2:0,3:0,4:0,5:0};a.forEach((P,n)=>{s+=(P.c/100-70)*Math.exp(-((n/14)**2));st[rcStars(P.c)]++});out.push({id,pts:s,n:a.length,stars:st})}
  return out.sort((a,b)=>b.pts-a.pts)}
function rcClass(L,ti){
  ti=ti==null?L.user:ti;const all=rcClasses(L),div=isFCS(T(ti)),list=all.filter(c=>isFCS(T(c.id))===div),i=list.findIndex(c=>c.id===ti);
  return i>=0?{...list[i],rank:i+1}:{id:ti,pts:0,n:0,stars:{2:0,3:0,4:0,5:0},rank:list.length+1}}

/* ---------- ratings: true, public expectation, scouted estimate ---------- */
const rcGuess=(P,k)=>{const pos=POS_ORDER[P.p];return r1(rcLevel(P.c)+(BIAS[pos][k]||0)*.6+(k==='awr'?-.3:0))};
const rcTrue=(P,k)=>{const i=rcKeys(POS_ORDER[P.p]).indexOf(k);return i<0?rcGuess(P,k):P.a[i]/10};
const rcEst=(P,k,sc)=>lerp(rcGuess(P,k),rcTrue(P,k),clamp(sc/100,0,1));
const rcOvrOf=(P,f)=>{const w=W8[POS_ORDER[P.p]];let s=0;for(const k in w)s+=f(k)*w[k];return tOvr99(s)};
const rcTrueOvr=P=>rcOvrOf(P,k=>rcTrue(P,k));
const rcSeenOvr=(P,sc)=>rcOvrOf(P,k=>rcEst(P,k,sc));

/* ---------- arrival: signees join their rosters as freshmen at the new season (60-man limit, by position need) ---------- */
function rcArrive(L){
  const R=L.recruit;if(!R)return null;if(!R.done)rcSigningDay(L);
  const by=new Map(),u=L.user;let cut=0,joined=0;
  for(const P of R.p)if(P.s===2&&P.m>=0){if(!by.has(P.m))by.set(P.m,[]);by.get(P.m).push(P)}
  for(const [ti,list] of by){const t=L.teams[ti];if(!t)continue;
    const have={};for(const p of t.roster)have[p.pos]=(have[p.pos]||0)+1;
    list.sort((a,b)=>b.c-a.c);const seen=new Set(),add=P=>{const pos=POS_ORDER[P.p];seen.add(P);have[pos]=(have[pos]||0)+1;t.roster.push(rcPlayer(P))};
    for(const P of list)if(t.roster.length<ROSTER_CAP&&(have[POS_ORDER[P.p]]||0)<POS_COUNTS[POS_ORDER[P.p]])add(P);   /* needs first, best first */
    const short=()=>POS_ORDER.reduce((s,pos)=>s+Math.max(0,POS_COUNTS[pos]-(have[pos]||0)),0);   /* room kept for walk-ons at short positions */
    for(const P of list)if(!seen.has(P)&&t.roster.length+short()<ROSTER_CAP)add(P);
    if(ti===u){joined=seen.size;cut=list.length-seen.size}}
  if(joined)L.news.unshift({t:`${joined} freshmen enrolled${cut>0?`; ${cut} signees couldn't fit under the ${ROSTER_CAP}-man limit`:''}. True ratings are in.`,good:true});
  L.recruit=null;return {joined,cut}}
function rcPlayer(P){
  const pos=POS_ORDER[P.p],b=BIAS[pos]||{},tl=rcLevel(P.c),p={id:uid(),first:FIRST[P.f%FIRST.length],last:LAST[P.l%LAST.length],pos,yr:1,num:0,tone:rint(0,3),cond:100,inj:0,injWhy:'',xp:rint(0,30),ss:newSS(),rs:false,redshirt:false,home:rcHome(P),ht:P.h,wt:P.w,dev:P.d,stars:rcStars(P.c),isNew:true};
  for(const k of ATTR_KEYS)p[k]=r1(tl+(b[k]||0)+R(-1,1)+(k==='awr'?-.4:0));
  rcKeys(pos).forEach((k,i)=>p[k]=P.a[i]/10);return p}

/* ---------- your actions (hours) ---------- */
function rcAct(L,P,kind,arg){
  const R=L.recruit,u=L.user,U=R.u[P.i]||(R.u[P.i]={}),W=L.week,C=rcCtx(L),cost=RC_HRS[kind]||0;
  if(!rcLive(L)||P.s===2)return 'Recruiting is closed for him right now';
  if(cost&&rcAuto(L))return 'Switch off "Let my staff handle it" to spend hours yourself';
  if(cost&&R.hrs<cost)return 'Not enough hours left this week';
  const add=v=>{rcJoin(L,P);P.x[rcIdx(P,u)+1]+=Math.round(v)};
  if(kind==='scout'){if((U.sc||0)>=100||U.kw===W)return 'Already scouted this week';U.sc=Math.min(100,(U.sc||0)+(hasTrait('oc','Talent Spotter')?50:34));U.kw=W}
  else if(kind==='contact'){if(U.cw===W)return 'You already reached out this week';add((4+10*(.3+rcFit(P,u,C)))*rcR(.9,1.1));U.cw=W}
  else if(kind==='pitch'){if(U.pw===W)return 'One pitch a week';const w=P.pr.charCodeAt(arg)-48,s=rcScore(P,u,C,arg);add(24*(w/5)*(s+.2)*rcR(.9,1.1)*(arg===3?nilPitch(L,P):1));U.pw=W;U.pk=arg}   /* an NIL pitch spends budget (04c) */
  else if(kind==='offer'){if(U.o){U.o=0}else{U.o=1;if(!U.og){add(15);U.og=1}}}
  else if(kind==='visit'){if(arg==null){U.v=-1}else{if(U.vd)return 'He has already visited';const n=Object.values(R.u).filter(x=>x.v===arg).length;if(n>=RC_VISITS)return `${RC_VISITS} official visits per game`;rcJoin(L,P);U.v=arg}}
  if(cost)R.hrs-=cost;
  if(!R.b.includes(P.i))R.b.push(P.i);
  return null}
function rcBoard(L,P,onB){
  const R=L.recruit,u=L.user;
  if(onB){if(!R.b.includes(P.i))R.b.push(P.i);rcJoin(L,P);return}
  R.b=R.b.filter(i=>i!==P.i);if(P.m!==u){const j=rcIdx(P,u);if(j>=0)P.x.splice(j,2);const U=R.u[P.i];if(U){U.o=0;U.v=-1}}}
function rcSetAuto(L,on){
  L.settings.recAuto=!!on;const R=L.recruit;
  if(!on&&R)for(const id of R.b){const P=R.p[id];if(P&&rcIdx(P,L.user)>=0)(R.u[id]||(R.u[id]={})).o=1}}   /* your staff's offers stand */
/* national / position / state ranks (not saved) */
const RC_RK=new WeakMap();
function rcRanks(R){
  let r=RC_RK.get(R.p);if(r)return r;r={nat:new Int16Array(R.p.length),pos:new Int16Array(R.p.length),st:new Int16Array(R.p.length)};
  const ps={},ss={};R.p.slice().sort((a,b)=>b.c-a.c).forEach((P,i)=>{r.nat[P.i]=i+1;r.pos[P.i]=ps[P.p]=(ps[P.p]||0)+1;r.st[P.i]=ss[P.st]=(ss[P.st]||0)+1});
  RC_RK.set(R.p,r);return r}

/* ---------- Recruiting tab ---------- */
let RC_VIEW='board',RC_POS='All',RC_STAR=0,RC_STATE='All',RC_OPEN=false;
function rcStatus(L,R,P){
  const u=L.user,U=R.u[P.i]||{};
  if(P.s===2)return P.m===u?'<span class="tag ok">Signed</span>':`<span class="tag">Signed · ${esc(T(P.m).abbr)}</span>`;
  if(P.s===1)return P.m===u?'<span class="tag gold">Committed</span>':`<span class="tag hot">${esc(T(P.m).abbr)} commit</span>`;
  if(U.v!=null&&U.v>=0)return `<span class="tag blue">Visit wk ${U.v+1}</span>`;
  return rcIdx(P,u)>=0&&rcOffered(L,R,P,u,rcAuto(L))?'<span class="tag">Offered</span>':'<span class="tag">Open</span>'}
function rcRow(L,R,P){
  const pos=POS_ORDER[P.p],rk=rcRanks(R),sh=rcShare(P,L.user),top=rcTop(P,3);
  return `<button class="rrow rc-row" id="rcp-${P.i}"><span class="num">${pos}</span><span class="meta"><b>${esc(rcName(P))} ${starStr(rcStars(P.c))}</b><small>#${rk.nat[P.i]} · ${pos} #${rk.pos[P.i]} · ${esc(rcHome(P))} · ${rcHt(P.h)}, ${P.w}</small><span class="rc-top">${top.map(([ti,pc])=>`<span${ti===L.user?' class="me"':''}>${badge(T(ti),'sm')}${pc}%</span>`).join('')}</span></span><span class="rc-int"><b>${sh}%</b>${rcStatus(L,R,P)}</span></button>`}
function hubRecruit(){
  const L=LG,R=rcEnsure(L);if(!R)return `<div class="card"><div class="h2">Recruiting</div><p class="note">The next recruiting class opens when the new season starts.</p></div>`;
  const u=T(L.user),auto=rcAuto(L),live=rcLive(L),cl=rcClass(L),bud=rcBudget(L),cls=rcClasses(L);
  const phase=live?esc(weekLabel(L)):L.phase==='offseason'?(R.done?'Signing Day is done':'National Signing Day ahead'):R.early?'Early signing period is over':'Dead period';
  const head=`<div class="card rc-head"><div class="setrow"><div><div class="eyebrow">${R.season+1} class · ${phase}</div><div class="h2">Class #${cl.rank} · ${cl.n} commit${cl.n===1?'':'s'}</div></div>
    <div class="pills"><span class="pill gold">${auto?'Staff on it':`${live?R.hrs:0}/${bud} hrs`}</span><span class="pill">${cl.pts.toFixed(1)} pts</span></div></div>
    <div class="setrow"><span class="eyebrow">Let my staff handle it</span><div class="seg" id="rcAuto"><button data-v="1" aria-pressed="${auto}">On</button><button data-v="0" aria-pressed="${!auto}">Off</button></div></div>
    <p class="note">${auto?'Your staff calls, offers and hosts your targets every week. Switch it off to spend the hours yourself.':`${bud} h a week · Scout ${RC_HRS.scout} · Contact ${RC_HRS.contact} · Pitch ${RC_HRS.pitch} (each once a week per prospect). Offers and visits are free; only schools that offered can land him.`}</p>
    <div class="seg rc-tabs" id="rcView">${[['board','Board'],['search','Prospects'],['class','Class']].map(([k,l])=>`<button data-v="${k}" aria-pressed="${RC_VIEW===k}">${l}</button>`).join('')}</div></div>`;
  let body='';
  if(RC_VIEW==='board'){
    const ps=R.b.map(i=>R.p[i]).filter(Boolean),k=P=>P.m===L.user?0:P.s===0?1:2;
    ps.sort((a,b)=>k(a)-k(b)||rcShare(b,L.user)-rcShare(a,L.user)||b.c-a.c);
    body=`<div class="card"><div class="setrow"><div class="h2">Your board · ${ps.length}</div><span class="note">Tap a prospect for his profile</span></div><div class="list">${ps.slice(0,80).map(P=>rcRow(L,R,P)).join('')||'<p class="note">No targets yet. Find prospects under Prospects.</p>'}</div></div>`}
  else if(RC_VIEW==='search'){
    const sts=RC_STATES.map((s,i)=>i).filter(i=>R.p.some(P=>P.st===i));
    let ps=R.p.filter(P=>(RC_POS==='All'||POS_ORDER[P.p]===RC_POS)&&(!RC_STAR||rcStars(P.c)===RC_STAR)&&(RC_STATE==='All'||RC_STATES[P.st].st===RC_STATE)&&(!RC_OPEN||P.s===0));
    const n=ps.length;ps=ps.sort((a,b)=>b.c-a.c).slice(0,60);
    body=`<div class="card"><div class="chips" id="rcPos">${['All',...POS_ORDER].map(p=>`<button class="chipbtn" data-v="${p}" aria-pressed="${RC_POS===p}">${p}</button>`).join('')}</div>
      <div class="setrow"><div class="seg" id="rcStar">${[[0,'All'],[5,'5★'],[4,'4★'],[3,'3★'],[2,'2★']].map(([v,l])=>`<button data-v="${v}" aria-pressed="${RC_STAR===v}">${l}</button>`).join('')}</div>
      <div class="field-row rc-stsel"><label for="rcState">State</label><select id="rcState"><option value="All">All states</option>${sts.map(i=>`<option value="${RC_STATES[i].st}" ${RC_STATE===RC_STATES[i].st?'selected':''}>${RC_STATES[i].st}</option>`).join('')}</select></div>
      <div class="seg" id="rcOpen"><button data-v="0" aria-pressed="${!RC_OPEN}">Everyone</button><button data-v="1" aria-pressed="${RC_OPEN}">Uncommitted</button></div></div>
      <p class="note">${n} prospects match${n>60?' · showing the top 60':''}. Stars come from the composite rating; true ability is hidden until you scout.</p></div>
      <div class="card"><div class="list">${ps.map(P=>rcRow(L,R,P)).join('')||'<p class="note">Nobody matches those filters.</p>'}</div></div>`}
  else{
    const mine=R.p.filter(P=>P.m===L.user).sort((a,b)=>b.c-a.c),C=rcCtx(L),np=C.np[L.user],got={};for(const P of mine)got[P.p]=(got[P.p]||0)+1;
    const div=isFCS(u),top=cls.filter(c=>isFCS(T(c.id))===div).slice(0,25);
    body=`<div class="grid2"><div class="card"><div class="eyebrow">Your ${R.season+1} class</div><div class="kpis"><div><em>Rank</em><b>#${cl.rank}</b></div><div><em>Points</em><b>${cl.pts.toFixed(1)}</b></div><div><em>Commits</em><b>${cl.n}/${C.cap[L.user]}</b></div><div><em>5★ · 4★ · 3★</em><b>${cl.stars[5]} · ${cl.stars[4]} · ${cl.stars[3]}</b></div></div>
      <div class="list">${mine.map(P=>rcRow(L,R,P)).join('')||'<p class="note">No commitments yet.</p>'}</div></div>
      <div class="card"><div class="eyebrow">Needs by position</div><div class="list">${POS_ORDER.map((pos,k)=>{const need=np[k],g=got[k]||0;return `<div class="lrow"><span class="l"><span class="num">${pos}</span><span>${POS_NAME[pos]}</span></span><span>${g}/${need} <span class="tag ${g>=need?'ok':need-g>=2?'hot':''}">${g>=need?'Set':need-g+' open'}</span></span></div>`}).join('')}</div><p class="note">Open spots: returning players vs. a full depth chart. The roster holds ${ROSTER_CAP}; extra signees past that go elsewhere.</p></div></div>
      <div class="card"><div class="eyebrow">Team rankings · ${div?'FCS':'FBS'}</div><div class="tw"><table><thead><tr><th class="n">#</th><th>School</th><th class="n">Commits</th><th class="n">5★/4★</th><th class="n">Points</th></tr></thead><tbody>${top.map((c,i)=>`<tr class="${c.id===L.user?'me':''}"><td class="n">${i+1}</td><td>${tcell(T(c.id))}</td><td class="n">${c.n}</td><td class="n">${c.stars[5]}/${c.stars[4]}</td><td class="n">${c.pts.toFixed(1)}</td></tr>`).join('')}</tbody></table></div><p class="note">247-style points: every commit counts, the best ones most.</p></div>
      ${(L.recHist||[]).length?`<div class="card"><div class="eyebrow">Past classes</div><div class="list">${L.recHist.map(h=>`<div class="lrow"><span>${h.season} · ${esc(T(h.team).city)}</span><span>#${h.rank} · ${h.n} signees · ${h.stars[5]}/${h.stars[4]}/${h.stars[3]} (5★/4★/3★)</span></div>`).join('')}</div></div>`:''}`}
  return head+body+(R.log.length?`<div class="card"><div class="eyebrow">Recruiting log</div><div class="list">${R.log.slice(0,8).map(x=>`<div class="lrow"><span>${esc(x.t)}</span></div>`).join('')}</div></div>`:'')}
function bindRecruit(){
  if(TAB!=='recruit'&&TAB!=='home')return;const L=LG;if(!L)return;
  on('rcGo',()=>{showHub('recruit');$('#hubScroll').scrollTop=0});
  if(L.recruit)document.querySelectorAll('[id^="rcp-"]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-team]'))return;openProspect(+b.id.slice(4))});
  if(TAB!=='recruit'||!L.recruit)return;
  const seg=(id,f)=>{const e=document.getElementById(id);if(e)e.querySelectorAll('button').forEach(b=>b.onclick=()=>{f(b.dataset.v);rerender()})};
  seg('rcView',v=>RC_VIEW=v);seg('rcAuto',v=>{rcSetAuto(L,v==='1');saveNow()});seg('rcStar',v=>RC_STAR=+v);seg('rcOpen',v=>RC_OPEN=v==='1');
  document.querySelectorAll('#rcPos button').forEach(b=>b.onclick=()=>{RC_POS=b.dataset.v;rerender()});
  const s=$('#rcState');if(s)s.onchange=()=>{RC_STATE=s.value;rerender()}}
/* prospect sheet: bio, ranks, scouted ratings, what he wants, who's in it, and your actions */
function openProspect(i){
  const L=LG,R=L.recruit;if(!R||!R.p[i])return;const P=R.p[i],pos=POS_ORDER[P.p];
  const render=()=>{
    const C=rcCtx(L),U=R.u[i]||{},sc=U.sc||0,live=rcLive(L),auto=rcAuto(L),u=L.user,rk=rcRanks(R),st=rcStars(P.c),onB=R.b.includes(i),off=rcOffered(L,R,P,u,auto)&&rcIdx(P,u)>=0,W=L.week;
    const band=Math.round((1-sc/100)*11),ex=rcSeenOvr(P,sc);
    const attrs=PATTR[pos].map(k=>{const v=a99(rcEst(P,k,sc));return `<div class="rc-a"><span>${attrName(pos,k)}</span><b>${band?`${Math.max(25,v-band)}–${Math.min(99,v+band)}`:v}</b></div>`}).join('');
    const prefs=RC_PREFS.map((x,k)=>[k,P.pr.charCodeAt(k)-48]).sort((a,b)=>b[1]-a[1]);
    const pr=prefs.map(([k,w])=>{const s=rcScore(P,u,C,k);return `<div class="rc-pref"><span>${RC_PREFS[k][1]}${w>=5?' <span class="tag gold">Top</span>':''}</span><span class="rc-dots">${'<i class="on"></i>'.repeat(w)}${'<i></i>'.repeat(5-w)}</span><b class="${s>=.6?'res-w':s<.35?'res-l':''}">${rcGrade(s)}</b></div>`}).join('');
    const top=rcTop(P,6);
    const homeG=L.weeks.map((w,wi)=>({w,wi,g:w.kind==='reg'&&wi>W&&w.games.find(g=>g.h===u&&!g.neutral)})).filter(x=>x.g);
    const dis=c=>!live||P.s===2||(c&&(auto||R.hrs<c))?'disabled':'';
    const acts=P.s===2?`<p class="note">${P.m===u?'He has signed with you.':`He signed with ${esc(teamName(T(P.m)))}.`}</p>`:!live?`<p class="note">${L.phase==='offseason'?'Uncommitted prospects choose on National Signing Day.':'Recruiting actions open during the regular season.'}</p>`:`
      <div class="btns"><button class="btn sm ${off?'ghost':''}" id="rcOf" ${dis(0)}>${off?'Pull offer':'Offer scholarship'}</button><button class="btn sm ghost" id="rcSc" ${dis(RC_HRS.scout)||(sc>=100||U.kw===W?'disabled':'')}>Scout · ${RC_HRS.scout} h</button><button class="btn sm ghost" id="rcCo" ${dis(RC_HRS.contact)||(U.cw===W?'disabled':'')}>Contact · ${RC_HRS.contact} h</button></div>
      <div class="eyebrow">Pitch · ${RC_HRS.pitch} h</div><div class="btns">${prefs.slice(0,4).map(([k])=>`<button class="btn sm ghost" id="rcPi-${k}" ${dis(RC_HRS.pitch)||(U.pw===W?'disabled':'')}>${RC_PREFS[k][1]} · ${rcGrade(rcScore(P,u,C,k))}</button>`).join('')}</div>
      <div class="eyebrow">Official visit to a home game</div>${U.vd?`<p class="note">He visited (${U.vr>=0?'+':''}${U.vr||0} interest).</p>`:U.v>=0&&U.v!=null?`<div class="setrow"><span>Booked: ${esc(L.weeks[U.v].label)} vs ${esc(T(L.weeks[U.v].games.find(g=>g.h===u).a).city)}</span><button class="btn sm ghost" id="rcVx">Cancel</button></div>`:`<div class="btns">${homeG.slice(0,5).map(x=>`<button class="btn sm ghost" id="rcVi-${x.wi}">Wk ${x.wi+1} vs ${esc(T(x.g.a).abbr)}${x.g.rival?' ★':''}</button>`).join('')||'<span class="note">No home games left.</span>'}</div>`}
      <p class="note">${auto?'Your staff spends the hours while "Let my staff handle it" is on; you can still offer, book visits and manage the board. ':`${R.hrs} of ${rcBudget(L)} hours left this week. `}A win, a rivalry and a big game make visits count more.</p>`;
    openModal(`<div class="eyebrow">${POS_NAME[pos]} · Class of ${R.season+1} · ${esc(rcHome(P))}</div><div class="h2" style="font-size:24px">${esc(rcName(P))} ${starStr(st)}</div>
      <div class="tags"><span class="tag gold">#${rk.nat[i]} national</span><span class="tag">${pos} #${rk.pos[i]}</span><span class="tag">${RC_STATES[P.st].st} #${rk.st[i]}</span><span class="tag">${(P.c/1e4).toFixed(4)}</span>${rcStatus(L,R,P)}</div>
      <div class="kpis"><div><em>Height</em><b>${rcHt(P.h)}</b></div><div><em>Weight</em><b>${P.w}</b></div><div><em>Scouted</em><b>${sc}%</b></div><div><em>Projected OVR</em><b>${band?`~${ex}`:ex}</b></div><div><em>Dev trait</em><b>${sc>=100?RC_DEV[P.d]:'?'}</b></div><div><em>Your interest</em><b>${rcShare(P,u)}%</b></div></div>
      <div class="grid2 rc-sheet"><div><div class="eyebrow">${sc>=100?'Scouted ratings':sc?'Scouting estimates':'Public projection'}</div><div class="rc-attr">${attrs}</div>
        <div class="eyebrow" style="margin-top:12px">Top schools</div><div class="list">${top.map(([ti,pc])=>`<div class="lrow"><span class="l">${tcell(T(ti),T(ti).city)}</span><span class="rc-tm">${meterHTML(pc,ti===u?'var(--team)':'')}<b>${pc}%</b></span></div>`).join('')||'<p class="note">Nobody yet.</p>'}</div></div>
        <div><div class="eyebrow">What matters to him · your grade</div>${pr}</div></div>
      ${acts}
      <div class="btns cta"><button class="btn ghost" id="rcB">${onB?'Remove from board':'Add to board'}</button><button class="btn light" id="rcX">Done</button></div>`,true);
    const act=(id,k,a)=>on(id,()=>{const err=rcAct(L,P,k,a);if(err){toast(err);return}saveNow();render()});
    act('rcOf','offer');act('rcSc','scout');act('rcCo','contact');act('rcVx','visit',null);
    RC_PREFS.forEach((x,k)=>act('rcPi-'+k,'pitch',k));homeG.forEach(x=>act('rcVi-'+x.wi,'visit',x.wi));
    on('rcB',()=>{if(onB&&P.m===u&&P.s>0){toast('He is committed to you');return}rcBoard(L,P,!onB);saveNow();render()});
    on('rcX',()=>{closeModal();rerender()})};
  render()}
/* home tab card */
function rcHomeCard(){
  const L=LG;if(L.phase!=='regular')return '';const R=rcEnsure(L);if(!R)return '';const cl=rcClass(L),last=R.log[0];
  return `<div class="card rc-home"><div class="setrow"><div><div class="eyebrow">Recruiting · ${R.season+1} class${rcAuto(L)?' · staff on it':` · ${rcLive(L)?R.hrs:0} hrs left`}</div><div class="h2">Class #${cl.rank} · ${cl.n} commits <small class="note">${cl.stars[5]}×5★ ${cl.stars[4]}×4★ ${cl.stars[3]}×3★</small></div></div><button class="btn sm ghost" id="rcGo">Recruiting</button></div>${last?`<p class="note">${esc(last.t)}</p>`:''}</div>`}
/* offseason: class review (stage 'recruit') and National Signing Day (stage 'signing') */
function rcReviewHTML(prog){
  const L=LG,R=rcEnsure(L),u=L.user;if(!R)return prog;const cl=rcClass(L),mine=R.p.filter(P=>P.m===u).sort((a,b)=>b.c-a.c);
  const open=R.p.filter(P=>P.s===0&&rcIdx(P,u)>=0).sort((a,b)=>rcShare(b,u)-rcShare(a,u)||b.c-a.c).slice(0,10);
  return `${prog}<div class="card hero"><div class="eyebrow">${R.season+1} recruiting class · before National Signing Day</div><div class="h1">#${cl.rank}</div>
    <div class="tags"><span class="tag gold">${cl.n} commits</span><span class="tag">${cl.stars[5]} five-star</span><span class="tag">${cl.stars[4]} four-star</span><span class="tag">${cl.stars[3]} three-star</span><span class="tag">${cl.pts.toFixed(1)} pts</span></div>
    <p class="note">Signed in the early period or still committed. Commits who haven't signed can still flip; uncommitted prospects pick a school on Signing Day, most likely the one they're highest on.</p></div>
    <div class="grid2"><div class="card"><div class="eyebrow">Your class</div><div class="list">${mine.map(P=>rcRow(L,R,P)).join('')||'<p class="note">No commitments.</p>'}</div></div>
    <div class="card"><div class="eyebrow">Still deciding</div><div class="list">${open.map(P=>rcRow(L,R,P)).join('')||'<p class="note">No open targets left.</p>'}</div></div></div>
    <button class="btn wide" id="offNext">Go to National Signing Day</button>`}
function rcSigningHTML(prog){
  const L=LG,o=L.off,s=o.rsign,R=L.recruit,u=L.user;if(!s||!R)return `${prog}<div class="card"><p class="note">Signing Day is complete.</p></div><button class="btn wide" id="offNext">Start the ${L.season+1} season</button>`;
  const mine=R.p.filter(P=>P.s===2&&P.m===u).sort((a,b)=>b.c-a.c),gb=(g,cls)=>{const P=R.p[g.i];return `<div class="lrow"><span class="l"><span class="num">${POS_ORDER[P.p]}</span><span>${esc(rcName(P))} ${starStr(rcStars(P.c))}<br><small class="note">Expected ${g.ex} → ${g.tr} · ${RC_DEV[P.d]} dev</small></span></span><span class="tag ${cls}">${g.d>=0?'+':''}${g.d}</span></div>`};
  return `${prog}<div class="card hero"><div class="eyebrow">National Signing Day · ${R.season+1} class</div><div class="h1">Class #${s.rank}</div>
    <div class="tags"><span class="tag gold">${s.n} signees</span><span class="tag">${s.stars[5]} five-star</span><span class="tag">${s.stars[4]} four-star</span><span class="tag">${s.stars[3]} three-star</span><span class="tag">${s.pts.toFixed(1)} pts</span></div>
    <div class="list">${mine.map(P=>`<div class="lrow"><span class="l"><span class="num">${POS_ORDER[P.p]}</span><span>${esc(rcName(P))} ${starStr(rcStars(P.c))}<br><small class="note">${esc(rcHome(P))} · #${rcRanks(R).nat[P.i]} national</small></span></span><span><span class="ovr">${rcTrueOvr(P)}</span> <small class="note">${RC_DEV[P.d]}</small></span></div>`).join('')||'<p class="note">Nobody signed with you.</p>'}</div>
    <p class="note">True ratings are in as they enroll. Open roster spots are filled with walk-ons when the season starts.</p></div>
    <div class="grid2"><div class="card"><div class="eyebrow">Gems and busts</div><div class="list">${s.gems.map(g=>gb(g,'ok')).join('')}${s.busts.map(g=>gb(g,'hot')).join('')||''}${!s.gems.length&&!s.busts.length?'<p class="note">No surprises: everyone is about what your staff expected.</p>':''}</div><p class="note">Expected: what your scouting (or the public projection) said. Scout more to find gems before Signing Day.</p></div>
    <div class="card"><div class="eyebrow">Top classes</div><div class="list">${s.top.map((c,i)=>`<div class="lrow ${c.id===u?'me':''}"><span class="l"><span class="rank">${i+1}</span>${tcell(T(c.id),T(c.id).city)}</span><span class="note">${c.n} signed · ${c.s5}×5★ ${c.s4}×4★ · <b>${c.pts}</b></span></div>`).join('')}</div></div></div>
    <button class="btn wide" id="offNext">Start the ${L.season+1} season</button>`}
SETTINGS_EXTRA.push({card:'Recruiting',key:'recAuto',label:'Let my staff handle recruiting',opts:[[1,'On'],[0,'Off']],def:1,bool:true,after:v=>rcSetAuto(LG,v),note:'On: your staff recruits every week so simming never stalls. Off: spend the weekly hours yourself in the Recruiting tab.'});
