// The world simulation.
//
// The rest of the world does not stand still while the player is on tour.
// Every week the rated population of the player's region plays, the results
// move ratings through the same expectation based calculation the player
// uses, and everyone who does not play drifts back toward the middle of the
// scale on a half life.
//
// Only the ratings that have actually changed are stored. An athlete who
// has never played keeps their starting rating and the week it was set, so
// their current rating is simply that rating aged forward.

import {buildRegionSkills,buildAthlete,mixSeed} from './population.js';
import {seededRandom} from '../competition.js';
import {regressRating,simulateOutcome,rateMatch,RATING_BRACKETS,RATING_MIN,RATING_MAX} from './rating.js';

// Roughly how many matches the region's population plays in a week.
export const WORLD_MATCHES_PER_WEEK=140;

const round3=value=>Math.round(value*1000)/1000;
const clampRating=value=>Math.max(RATING_MIN,Math.min(RATING_MAX,value));

// The current rating of every athlete in the region, with idle players
// drifted back toward the middle of the scale.
export function currentRatings(skills,ratings,week){
  const current=new Map();
  for(const athlete of skills){
    const stored=ratings?.[athlete.id];
    const base=stored?stored[0]:athlete.baseRating;
    const lastPlayed=stored?stored[1]:athlete.lastPlayed;
    const matches=stored?stored[2]:0;
    current.set(athlete.id,{
      ...athlete,
      rating:clampRating(regressRating(base,week-lastPlayed)),
      lastPlayed,
      matches
    });
  }
  return current;
}

// Advances the world by one week.
export function advanceWorld({seed,regionId,week,ratings}){
  const skills=buildRegionSkills(seed,regionId);
  const current=currentRatings(skills,ratings,week);
  const random=seededRandom(mixSeed(seed,`world:${regionId}:${week}`));
  // Pair neighbours in the standings, which is how leagues are seeded, so
  // matches are between players of similar standing.
  const pool=[...current.values()].sort((a,b)=>a.rating-b.rating);
  const next={...(ratings??{})};
  let played=0;
  const count=Math.min(WORLD_MATCHES_PER_WEEK,Math.floor(pool.length/2));
  for(let index=0;index<count;index++){
    const home=pool[index*2];
    const away=pool[index*2+1];
    if(!home||!away)break;
    // Not every pairing plays every week.
    if(random()<0.35)continue;
    const outcome=simulateOutcome({
      mySkill:home.skill,
      theirSkill:away.skill,
      myRating:home.rating,
      theirRating:away.rating,
      random
    });
    const rated=rateMatch({
      players:[
        {id:home.id,rating:home.rating,team:'mine',matchesPlayed:home.matches},
        {id:away.id,rating:away.rating,team:'opponent',matchesPlayed:away.matches}
      ],
      actualMyPoints:outcome.myPoints,
      actualOpponentPoints:outcome.opponentPoints,
      matchType:'league',
      weeksAgo:0
    });
    next[home.id]=[round3(rated.players[0].rating),week,home.matches+1];
    next[away.id]=[round3(rated.players[1].rating),week,away.matches+1];
    played++;
  }
  return {ratings:next,matches:played};
}

// The player of a given bracket the player would meet. Playing up means
// facing someone a bracket stronger, which is exactly what makes it a
// gamble worth taking.
export function opponentInBracket({seed,regionId,ratings,week,divisionId,random}){
  const skills=buildRegionSkills(seed,regionId);
  const current=currentRatings(skills,ratings,week);
  const division=RATING_BRACKETS.find(entry=>entry.id===divisionId);
  if(!division)return null;
  const all=[...current.values()];
  const inBracket=all.filter(athlete=>athlete.rating>=division.min&&athlete.rating<=division.max);
  // If nobody is in that bracket yet, take the closest player to it.
  const pool=inBracket.length?inBracket:all;
  if(!pool.length)return null;
  const roll=random??Math.random;
  const chosen=pool[Math.floor(roll()*pool.length)];
  // Rebuild the drawn athlete in full so the player sees who they faced.
  const full=chosen.club?buildAthlete(seed,chosen.club,chosen.index):null;
  return full?{...full,rating:chosen.rating,matches:chosen.matches,skill:chosen.skill}:chosen;
}
