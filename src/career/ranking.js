// The ranking.
//
// A player holds four rankings. The discipline rankings are the best
// fourteen results in that discipline over a trailing fifty-two weeks, and
// the four biggest events always count whatever the result. The Overall
// ranking is a weighted composite of the three, because a complete player is
// one who shows up everywhere.
//
// A rating measures skill. A ranking measures results. The world board is
// placed on the ranking, and the rating is what the matches are simulated
// from.

export const RANKING_WINDOW=52;
export const RANKING_BEST=14;
export const RANKING_FORMATS=Object.freeze(['singles','doubles','mixed']);
export const FORMAT_WEIGHTS=Object.freeze({doubles:0.5,mixed:0.35,singles:0.15});
// The World Championship and the three Majors count whatever the result.
export const MANDATORY_TIERS=Object.freeze(['world','major']);

export const PRO_BOARD_SIZE=1200;
// The modelled points of the strongest player, and how fast the board decays.
export const TOP_POINTS=12000;
export const DECAY_RANK=260;

const inWindow=(result,week)=>Number.isFinite(result?.week)&&result.week<=week&&week-result.week<RANKING_WINDOW;

// The best results in one discipline.
export function formatPoints(results,format,week){
  const valid=(results??[]).filter(result=>result.format===format&&inWindow(result,week));
  const mandatory=valid.filter(result=>MANDATORY_TIERS.includes(result.tier));
  const best=valid
    .filter(result=>!MANDATORY_TIERS.includes(result.tier))
    .sort((a,b)=>b.points-a.points)
    .slice(0,Math.max(0,RANKING_BEST-mandatory.length));
  return [...mandatory,...best].reduce((sum,result)=>sum+(Number(result.points)||0),0);
}

// The composite. A discipline with no results contributes nothing, so a
// player who only plays doubles is ranked on doubles alone.
export function overallPoints(results,week){
  return RANKING_FORMATS.reduce((sum,format)=>sum+formatPoints(results,format,week)*(FORMAT_WEIGHTS[format]??0),0);
}

export function rankings(state,week=state?.week??0){
  const results=state?.rankingResults??[];
  const doubles=formatPoints(results,'doubles',week);
  const mixed=formatPoints(results,'mixed',week);
  const singles=formatPoints(results,'singles',week);
  return {overall:overallPoints(results,week),doubles,mixed,singles};
}

// Where a points total sits on the board. The board decays exponentially, so
// the top of the tour is compressed and the tail is long.
export function rankForPoints(points,size=PRO_BOARD_SIZE){
  const value=Number(points)||0;
  if(value<=0)return null;
  const rank=Math.floor(1+DECAY_RANK*Math.log2(TOP_POINTS/Math.max(1,value)));
  return Math.max(1,Math.min(size,rank));
}

export function pointsAtRank(rank){
  const place=Math.max(1,Math.round(Number(rank)||1));
  return Math.round(TOP_POINTS*Math.pow(0.5,(place-1)/DECAY_RANK));
}

// The player's place on each board, or null when they have no points.
export function positions(state,week=state?.week??0){
  const points=rankings(state,week);
  return {
    points,
    overall:rankForPoints(points.overall),
    doubles:rankForPoints(points.doubles),
    mixed:rankForPoints(points.mixed),
    singles:rankForPoints(points.singles)
  };
}

// Adds one result to the history. This is what the tour records when a
// tournament ends.
export function recordResult(state,result){
  const entry={
    week:result.week??state.week,
    eventId:result.eventId??null,
    format:result.format??'doubles',
    tier:result.tier??'challenger',
    place:result.place??null,
    points:Math.max(0,Math.round(Number(result.points)||0))
  };
  const history=[...(state.rankingResults??[]),entry]
    .filter(item=>state.week-item.week<=RANKING_WINDOW*2)
    .slice(-120);
  return {...state,rankingResults:history};
}

// The Challenger circuit has its own board: the best sixteen Challenger
// results over the same window. Tour points never count towards it.
export const CHALLENGER_BEST=16;
export function challengerPoints(results,week){
  return (results??[])
    .filter(result=>result.tier==='challenger'&&inWindow(result,week))
    .sort((a,b)=>b.points-a.points)
    .slice(0,CHALLENGER_BEST)
    .reduce((sum,result)=>sum+(Number(result.points)||0),0);
}

// Whether a player has earned a place in the season finals.
export function finalsQualified(state,week=state?.week??0){
  const place=rankForPoints(rankings(state,week).overall);
  return place!==null&&place<=8;
}

// The composite label for the screen.
export function rankingSummary(state,week=state?.week??0){
  const position=positions(state,week);
  return {
    ...position,
    points:{...position.points,overall:Math.round(position.points.overall)},
    challenger:challengerPoints(state?.rankingResults,week),
    challengerRank:rankForPoints(challengerPoints(state?.rankingResults,week)),
    finals:finalsQualified(state,week)
  };
}
