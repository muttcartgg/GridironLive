/* =========================================================
   05w · Win probability (v7)
   A standard point-spread model (the same idea broadcast and analytics models use):
     expected final margin = current margin + expected points of the current possession
                             + pregame spread × share of the game still to play
     uncertainty           = 15.5 points × √(share of the game left), plus the spread of one possession
     win probability       = Φ(expected margin / uncertainty)
   College football's final margins land about 15.5 points from the spread (one standard deviation).
   ========================================================= */
const WP_SD=15.5,WP_HOME=2.7;
/* standard normal CDF (Abramowitz–Stegun 7.1.26, max error ~1e-7) */
function normCdf(z){const t=1/(1+.3275911*Math.abs(z)/Math.SQRT2),y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z/2);return z>=0?(1+y)/2:(1-y)/2}
/* expected points for the team with the ball, `ytg` yards from the end zone, on `down` and `dist` (college values) */
function expPoints(ytg,down,dist){
  ytg=clamp(ytg,1,99);down=down||1;dist=dist||10;
  let ep=6.15-.072*ytg;                                     /* own 1 ≈ -0.9 · midfield ≈ 2.6 · opp 10 ≈ 5.4 */
  if(down===2)ep-=.35+.03*Math.max(0,dist-7);
  else if(down===3)ep-=.85+.06*Math.max(0,dist-4);
  else if(down===4){const fgRange=ytg<=35;ep=fgRange?Math.min(ep,2.4+(35-ytg)*.02)-(dist>3?.3:0):ep-1.7-.08*dist}
  if(down<=2&&dist<10)ep+=.04*(10-dist);
  return clamp(ep,-2.5,6.6);
}
/* points team a is expected to win by against team b. site: 1 = a at home, 0 = neutral, -1 = a on the road */
function pointSpread(a,b,site){
  if(!a||!b)return 0;
  const r=t=>tOvr99(teamOvr(t))+(t.div==='FCS'?-5:0);
  return (r(a)-r(b))*1.05+(site||0)*WP_HOME;
}
/* pregame win probability for team a */
function winProbPre(a,b,site){return clamp(normCdf(pointSpread(a,b,site)/WP_SD),.005,.995)}
/* live win probability for the user's team (S.home), from the current game state */
function winProbState(){
  if(!S.home||!S.away)return .5;
  const m=S.score[0]-S.score[1];
  const site=S.userHome?1:S.neutral?0:-1,spread=pointSpread(S.home,S.away,site);
  if(S.phase==='over')return m>0?1:m<0?0:.5;
  const userBall=S.poss==='home',sgn=userBall?1:-1;
  /* expected points of the current situation, from the user's point of view */
  let ep=0;
  if(S.phase==='pat')ep=(S.conv?.9:.98)*sgn;                 /* try after a touchdown */
  else if(S.phase==='kick'&&typeof kick!=='undefined'&&kick)ep=(kick.kind==='xp'?.98:3*clamp(1.12-kick.dist/58,.05,.97))*sgn;
  else if(['presnap','live','dead'].includes(S.phase))ep=expPoints(110-S.los,S.down,S.firstDownX-S.los)*sgn;
  if(S.ot){
    /* overtime: each side gets the ball at the 25; tied games go on */
    const edge=spread*.08;return clamp(normCdf((m+ep*.9+edge)/7.5),.02,.98);
  }
  const left=Math.max(0,(4-S.q)*S.qlen+S.clock),tl=clamp(left/(4*S.qlen),0,1);
  if(tl<=0&&!['presnap','live','dead','pat','kick'].includes(S.phase))return m>0?1:m<0?0:.5;
  /* late in a half the trailing team's timeouts matter a little */
  const toEdge=tl<.12?(S.to[0]-S.to[1])*.4:0;
  const mean=m+ep+spread*tl+toEdge;
  const sd=Math.sqrt(WP_SD*WP_SD*tl+(ep!==0?3.2*3.2:1.2*1.2));
  /* leading with the ball and little enough time to kneel it out */
  if(userBall&&m>0&&S.phase==='presnap'&&left<=Math.max(0,(5-S.down))*24&&S.to[1]===0)return .999;
  if(!userBall&&m<0&&S.phase==='presnap'&&left<=Math.max(0,(5-S.down))*24&&S.to[0]===0)return .001;
  return clamp(normCdf(mean/sd),.002,.998);
}
