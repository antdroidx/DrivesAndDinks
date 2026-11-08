// The pro tour.
//
// The pro league works differently from a rating system. Its world ranking
// is a composite of tour points earned over the last 52 weeks, weighted
// 50 percent doubles, 35 percent mixed doubles and 15 percent singles, and
// the men's and women's boards are ranked separately.
//
// That is why a tour floor is not simply a rating cut. In the published
// rankings the men's board had 1471 players with its last place at 4.89 and
// the women's had 829 with its last place at 3.89, which is low enough to
// look wrong next to the men's floor. It is a points cut, and the rating
// only has to clear the bar.
//
// The game uses one symmetric floor for both boards, derived from the share
// of the world population the tour takes. This module carries both pieces:
// where a rating puts a player on their board, and how tour points are
// earned and aged out.

// The world has a modelled rated population on each board, and the tour is
// the top slice of it. The tour size is a share of that population rather
// than a fixed number, so the two boards stay in step.
export const WORLD_POPULATION=120000;
export const TOUR_SHARE=.01;
export const PRO_TOUR_SIZE=Math.round(WORLD_POPULATION*TOUR_SHARE);
// One pro floor for both boards. The real men's floor is 4.89 with a 1471
// player board and the real women's floor is 3.89 with 829, but that gap is
// an artefact of a points cut rather than a skill level, so the career uses
// a single, symmetric threshold.
export const PRO_FLOOR_RATING=4.95;

export const PRO_TOURS=Object.freeze({
  men:{id:'men',label:'Men',size:PRO_TOUR_SIZE,topRating:7.047,floorRating:PRO_FLOOR_RATING,slope:3.381627},
  women:{id:'women',label:'Women',size:PRO_TOUR_SIZE,topRating:6.999,floorRating:PRO_FLOOR_RATING,slope:3.460216}
});

export const TOUR_POINTS_WINDOW=52;

// Which pool an event pays into. The MLP is a separate activity, so what it
// pays never counts towards the pro tour.
export const POOL_TOUR='tour';
export const POOL_MLP='mlp';
export const EVENT_POOL=Object.freeze({
  'mlp':POOL_MLP,
  'mlp-amateur':POOL_TOUR
});

// Points a player earns for entering each event. The tour pays more than a
// local league, and playing up in a bracket is worth more than staying in
// their own, because beating stronger opposition is what the board rewards.
export const EVENT_POINTS=Object.freeze({
  'club-night':0,
  'local-league':10,
  'city-open':15,
  'regional-open':25,
  'semi-pro':40,
  'national':75,
  'international':110,
  'pro-league':150
});
export const PLAY_UP_MULTIPLIER=1.5;

export function tourFor(gender){return gender==='female'?PRO_TOURS.women:PRO_TOURS.men}

// Where a rating places a player on their board, counting from the top. The
// curve is fitted to the published anchors: one player at the top rating,
// and the whole board at the floor rating. A rating below the floor is not
// on the board at all.
// Where a rating sits in the world. Every rated player has a world rank,
// whether or not they are on the tour.
export function worldRank(rating,gender){
  const tour=tourFor(gender);
  const value=Number(rating)||0;
  return Math.max(1,Math.round(Math.exp(tour.slope*(tour.topRating-value))));
}

// The place on the tour, or null when the rating is below the tour floor.
export function tourRank(rating,gender){
  const tour=tourFor(gender);
  const value=Number(rating)||0;
  if(value<tour.floorRating)return null;
  const rank=Math.round(Math.exp(tour.slope*(tour.topRating-value)));
  return Math.max(1,Math.min(tour.size,rank));
}

export function onTheTour(rating,gender){return tourRank(rating,gender)!==null}

// The points a player earns from one event entry.
export function pointsForEntry(eventId,divisionId=null,ownDivisionId=null){
  const base=EVENT_POINTS[eventId]??0;
  if(!base)return 0;
  const playedUp=divisionId&&ownDivisionId&&divisionId!==ownDivisionId;
  return Math.round(base*(playedUp?PLAY_UP_MULTIPLIER:1));
}

// Tour points run on a rolling 52 week window, so points earned two years
// ago no longer count.
export function pointsInWindow(history,currentWeek){
  const cutoff=currentWeek-TOUR_POINTS_WINDOW;
  return (history??[]).filter(entry=>entry.week>cutoff).reduce((sum,entry)=>sum+entry.points,0);
}

export function addPoints(history,currentWeek,points){
  const kept=[...(history??[]),{week:currentWeek,points}].filter(entry=>entry.week>currentWeek-TOUR_POINTS_WINDOW);
  return kept.slice(-64);
}
