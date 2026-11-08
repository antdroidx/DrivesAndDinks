// The career rating system.
//
// A scale from 2.000 to 8.000 that measures current skill rather than
// rewarding wins. The scale, the band names and the three decimal places
// follow the conventions players already meet in published world rankings,
// but the system in the game is ours and is simply called a rating.
//
// The defining idea is that a rating moves on performance measured against
// an expectation, not on the scoreboard. An expected score is set from the
// ratings of everyone on the court, then compared with what actually
// happened. Win 11-8 when you were expected to win 11-3 and your rating
// falls; lose 9-11 against a much stronger opponent and your rating can
// rise. The system stays balanced because one side goes up while the other
// goes down.
//
// This module carries both halves: the scale, bands and formatting, and the
// calculation, so a career match can be rated this way.

// The top of the published world rankings was 7.047 in October 2026, so
// the elite end of the scale is a real place rather than a theoretical one.
export const RATING_ELITE=7;
export const RATING_MIN=2;
export const RATING_MAX=8;
export const RATING_TOP_SKILL=99;
export const RATING_PRECISION=3;

export const RATING_BANDS=Object.freeze([
  {id:'novice',min:2,max:2.999},
  {id:'intermediate',min:3,max:3.999},
  {id:'advanced',min:4,max:4.999},
  {id:'professional',min:5,max:8}
]);
export const RATING_LABELS=Object.freeze({
  novice:{label:'Novice',note:'Learning the game. Club nights and practice.'},
  intermediate:{label:'Intermediate',note:'Reliable rallies. Local league ready.'},
  advanced:{label:'Advanced',note:'Pressure the net. Regional and semi-pro ready.'},
  professional:{label:'Professional',note:'National and international level. Pro league ready.'}
});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function ratingBand(rating){
  const value=clamp(Number(rating)||RATING_MIN,RATING_MIN,RATING_MAX);
  const match=RATING_BANDS.find(band=>value<=band.max)??RATING_BANDS.at(-1);
  return RATING_LABELS[match.id];
}
export function ratingBandId(rating){return ratingBand(rating).label.toLowerCase().replace(/\s+/g,'-')}

export function formatRating(rating){
  const value=clamp(Number(rating)||RATING_MIN,RATING_MIN,RATING_MAX);
  return value.toFixed(RATING_PRECISION);
}

// The starting rating for a player who has been assessed but has not played
// rated matches yet. Career matches replace this with a results-driven
// rating; until then it is the honest prior.
export function ratingFromSkill(skillAverage){
  const skill=clamp(Number(skillAverage)||0,0,RATING_TOP_SKILL);
  return clamp(RATING_MIN+(skill-30)/(RATING_TOP_SKILL-30)*(RATING_ELITE-RATING_MIN),RATING_MIN,RATING_MAX);
}
export function skillForRating(rating){
  const target=clamp(Number(rating)||RATING_MIN,RATING_MIN,RATING_MAX);
  return 30+(target-RATING_MIN)/(RATING_ELITE-RATING_MIN)*(RATING_TOP_SKILL-30);
}

// ---- the population -------------------------------------------------------
//
// The rated world has a centre. A player who has never been rated starts
// near it, and the population settles around it, because every match moves
// one player up and another down and every player who stops playing drifts
// back toward it.
//
// The drift is a half life. A player who has not played for a year has
// moved halfway back to the middle, which is what makes the calendar
// matter: standing still costs you.
export const POPULATION_MEAN=3.5;
export const NEW_PLAYER_RATING=3.5;
export const RATING_HALF_LIFE_WEEKS=52;

export function regressRating(rating,weeksIdle){
  const idle=Math.max(0,Number(weeksIdle)||0);
  if(!idle)return rating;
  const halves=idle/RATING_HALF_LIFE_WEEKS;
  return POPULATION_MEAN+(rating-POPULATION_MEAN)*Math.pow(0.5,halves);
}

// How long a rating has been carried, in weeks, given the last time its
// holder played.
export function ratingAge(rating,lastPlayedWeek,currentWeek){
  return Math.max(0,(Number(currentWeek)||0)-(Number(lastPlayedWeek)||0));
}

// The outcome of a match.
//
// The expected score comes from the two ratings, because that is what the
// players would expect of each other. The actual score comes from their
// underlying skill, which may be ahead of or behind where their ratings
// say they are. The gap between the two is the performance the rating
// system measures.
export function simulateOutcome({mySkill,theirSkill,myRating,theirRating,random=Math.random}={}){
  const expected=expectedScore(myRating,theirRating);
  const skillGap=(Number(mySkill)||0)-(Number(theirSkill)||0);
  // A wide skill gap produces a wide margin, and luck adds the rest.
  const margin=clamp(skillGap*1.1+(random()*2-1)*6,-MAX_POINTS,MAX_POINTS);
  const total=17+random()*6;
  const myPoints=Math.round(clamp((total+margin)/2,0,MAX_POINTS));
  const opponentPoints=Math.round(clamp((total-margin)/2,0,MAX_POINTS));
  return {myPoints,opponentPoints,expected,skillGap,margin};
}

// ---- brackets ---------------------------------------------------------------
// Events do not gate entry on a rating. They run a bracket for each level
// of play, and a bracket is named by the top of its range: the 3.5 bracket
// holds players rated 3.500 to 3.999. A player signs up for a bracket and is
// placed in it.
export const RATING_BRACKETS=Object.freeze([
  {id:'2.0',label:'2.0',min:2,max:2.499,level:2},
  {id:'2.5',label:'2.5',min:2.5,max:2.999,level:2.5},
  {id:'3.0',label:'3.0',min:3,max:3.499,level:3},
  {id:'3.5',label:'3.5',min:3.5,max:3.999,level:3.5},
  {id:'4.0',label:'4.0',min:4,max:4.499,level:4},
  {id:'4.5',label:'4.5',min:4.5,max:4.999,level:4.5},
  {id:'5.0+',label:'5.0+',min:5,max:8,level:5}
]);

export function divisionFor(rating){
  const value=clamp(Number(rating)||RATING_MIN,RATING_MIN,RATING_MAX);
  return RATING_BRACKETS.find(division=>value>=division.min&&value<=division.max)??RATING_BRACKETS.at(-1);
}

// A player may enter their own bracket, one above it to play up, or one below
// it. Playing up is the fastest way to move a rating, because the bar to
// beat is lower; playing down risks a rating drop, because a narrow win is
// an underperformance.
export function availableDivisions(rating,allowedIds=null){
  const index=RATING_BRACKETS.findIndex(division=>division.id===divisionFor(rating).id);
  const from=Math.max(0,index-1);
  const to=Math.min(RATING_BRACKETS.length-1,index+1);
  const window=RATING_BRACKETS.slice(from,to+1);
  if(!allowedIds)return window;
  return window.filter(division=>allowedIds.includes(division.id));
}

// ---- the calculation ------------------------------------------------------

// Verified, organised play carries more weight than a self-posted game.
export const MATCH_TYPES=Object.freeze({
  tournament:{id:'tournament',label:'Tournament',weight:1},
  league:{id:'league',label:'League',weight:.85},
  club:{id:'club',label:'Club',weight:.7},
  recreational:{id:'recreational',label:'Recreational',weight:.5}
});

// A rating gap of one point is worth about this many match points of margin.
// A 4.5 narrowly beating a 3.0 is a comfortable expectation, which is why a
// narrow win there is underperformance.
export const MARGIN_PER_RATING=4.5;
// A match is expected to sit around 9-9 before the margin is applied.
export const BASE_POINTS=9;
export const MAX_POINTS=11;
// A single match moves a rating by at most this much, before weighting.
export const RATING_SCALE=.35;
// Recent matches matter more. A match from six months ago has less pull.
export const RECENCY_HALF_LIFE=26;
// Early results move a rating more because the history is thin.
export const VOLUME_SCALE=10;

export function teamStrength(ratings){
  const values=(ratings??[]).filter(value=>Number.isFinite(value));
  if(!values.length)return RATING_MIN;
  return values.reduce((sum,value)=>sum+value,0)/values.length;
}

// The score the system expects before a match. A 4.5 against a 3.0 is expected to
// be won comfortably; a 3.5 against a 4.0 is expected to be close.
export function expectedScore(rating,opponentRating){
  const gap=rating-opponentRating;
  const margin=clamp(gap*MARGIN_PER_RATING,-MAX_POINTS,MAX_POINTS);
  return {
    myPoints:clamp(BASE_POINTS+margin/2,0,MAX_POINTS),
    opponentPoints:clamp(BASE_POINTS-margin/2,0,MAX_POINTS),
    margin
  };
}

// How the actual result compared with the expectation. Positive is
// overperformance, which can raise a rating even in a loss.
export function matchPerformance({actualMyPoints,actualOpponentPoints,expectedMyPoints,expectedOpponentPoints}){
  const mine=(actualMyPoints??0)-expectedMyPoints;
  const theirs=(actualOpponentPoints??0)-expectedOpponentPoints;
  return (mine-theirs)/MAX_POINTS;
}

export function matchWeight(type){
  return (MATCH_TYPES[type]??MATCH_TYPES.club).weight;
}
export function recencyWeight(weeksAgo=0){
  return Math.exp(-Math.max(0,Number(weeksAgo)||0)/RECENCY_HALF_LIFE);
}
export function volumeDamping(matchesPlayed=0){
  return 1/Math.sqrt(1+Math.max(0,Number(matchesPlayed)||0)/VOLUME_SCALE);
}

// The rating change for one player in one match.
export function updateRating({
  rating,
  opponentRatings=[],
  teammateRatings=[],
  actualMyPoints,
  actualOpponentPoints,
  matchType='club',
  matchesPlayed=0,
  weeksAgo=0
}={}){
  const mine=teamStrength([rating,...teammateRatings]);
  const theirs=teamStrength(opponentRatings);
  const expected=expectedScore(mine,theirs);
  const performance=matchPerformance({actualMyPoints,actualOpponentPoints,expectedMyPoints:expected.myPoints,expectedOpponentPoints:expected.opponentPoints});
  const weight=matchWeight(matchType);
  const recency=recencyWeight(weeksAgo);
  const damping=volumeDamping(matchesPlayed);
  const delta=RATING_SCALE*performance*weight*recency*damping;
  return {
    rating:clamp(rating+delta,RATING_MIN,RATING_MAX),
    delta,
    performance,
    expected,
    weight,
    recency,
    damping
  };
}

// Rates a whole match for every player on court. The two teams move in
// opposite directions, which is what keeps the system balanced. Doubles
// teammates share the team change in proportion to their own ratings, since
// individual performance inside a team is not measured.
export function rateMatch({players,actualMyPoints,actualOpponentPoints,matchType='club',weeksAgo=0}={}){
  const list=players??[];
  const mine=list.filter(player=>player.team==='mine');
  const theirs=list.filter(player=>player.team==='opponent');
  if(!mine.length||!theirs.length)return {players:list,teamDelta:0,performance:0,expected:null};
  const myRatings=mine.map(player=>player.rating);
  const theirRatings=theirs.map(player=>player.rating);
  const expected=expectedScore(teamStrength(myRatings),teamStrength(theirRatings));
  const performance=matchPerformance({actualMyPoints,actualOpponentPoints,expectedMyPoints:expected.myPoints,expectedOpponentPoints:expected.opponentPoints});
  const weight=matchWeight(matchType);
  const recency=recencyWeight(weeksAgo);
  const damping=volumeDamping(Math.min(...mine.map(player=>player.matchesPlayed??0)));
  const teamDelta=RATING_SCALE*performance*weight*recency*damping;
  const share=(team,sign)=>{
    const total=team.reduce((sum,player)=>sum+player.rating,0)||1;
    return team.map(player=>({...player,rating:clamp(player.rating+sign*teamDelta*(player.rating/total),RATING_MIN,RATING_MAX),delta:sign*teamDelta*(player.rating/total)}));
  };
  return {players:[...share(mine,1),...share(theirs,-1)],teamDelta,performance,expected};
}

// Reliability reflects how confidently a match history supports the rating.
// It rises with the number of rated matches played.
export function reliability(matchesPlayed=0){
  const count=Math.max(0,Number(matchesPlayed)||0);
  const percent=Math.min(99,Math.round(100*(1-Math.exp(-count/12))));
  const label=percent<40?'Low':percent<70?'Medium':'High';
  return {percent,label,matches:count};
}
