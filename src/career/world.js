// The world simulation.
//
// The rest of the world does not stand still while the player is on tour.
// Every week the rated population of the player's region plays, the results
// move ratings through the same expectation based calculation the player
// uses, and everyone who does not play drifts back toward the middle of the
// scale on a half life.
//
// The population is rated separately in doubles and in singles, and both
// formats play. Only the ratings that have actually changed are stored: an
// athlete who has never played keeps their starting rating and the week it
// was set, so their current rating is that rating aged forward.

import {buildRegionSkills,buildAthlete,mixSeed} from './population.js?v=206';
import {seededRandom} from '../competition.js?v=206';
import {regressRating,simulateOutcome,rateMatch,RATING_BRACKETS,RATING_MIN,RATING_MAX,FORMATS} from './rating.js?v=206';

// Roughly how many matches the region's population plays in a week, split
// between the two formats.
export const WORLD_MATCHES_PER_WEEK=220;

const round3=value=>Math.round(value*1000)/1000;
const clampRating=value=>Math.max(RATING_MIN,Math.min(RATING_MAX,value));

// The current rating of every athlete in one format, with idle players
// drifted back toward the middle of the scale.
export function currentRatings(skills,ratings,week,format){
  const current=new Map();
  const table=ratings?.[format]??{};
  for(const athlete of skills){
    const stored=table[athlete.id];
    const base=stored?stored[0]:athlete.baseFormats[format];
    const lastPlayed=stored?stored[1]:athlete.lastPlayed;
    const matches=stored?stored[2]:0;
    // An athlete who has never played in this career keeps their generated
    // starting rating. Once they have a result, inactivity starts the drift.
    const rating=stored?regressRating(base,week-lastPlayed):base;
    current.set(athlete.id,{
      ...athlete,
      rating:clampRating(rating),
      lastPlayed,
      matches
    });
  }
  return current;
}

function playMatch(home,away,random,matchType='league'){
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
    matchType,
    weeksAgo:0
  });
  return {home:rated.players[0],away:rated.players[1],score:`${outcome.myPoints}-${outcome.opponentPoints}`};
}

// Advances the world by one week.
export function advanceWorld({seed,regionId,week,ratings}){
  const skills=buildRegionSkills(seed,regionId,week);
  const random=seededRandom(mixSeed(seed,`world:${regionId}:${week}`));
  const next={...(ratings??{})};
  for(const format of FORMATS)next[format]={...(next[format]??{})};
  let played=0;

  for(const format of FORMATS){
    const current=currentRatings(skills,next,week,format);
    // Pair neighbours in the standings, which is how leagues are seeded, so
    // matches are between players of similar standing.
    const pool=[...current.values()].sort((a,b)=>a.rating-b.rating);
    const count=Math.min(WORLD_MATCHES_PER_WEEK,Math.floor(pool.length/2));
    // Step across the whole table rather than taking the bottom of it, so
    // the strongest players are paired with each other too.
    const stride=Math.max(1,Math.floor((pool.length/2)/count));
    for(let index=0;index<count;index++){
      // Not every pairing plays every week.
      if(random()<0.35)continue;
      const offset=index*stride;
      if(format==='singles'){
        const home=pool[offset*2];
        const away=pool[offset*2+1];
        if(!home||!away)break;
        const result=playMatch(home,away,random);
        next[format][home.id]=[round3(result.home.rating),week,home.matches+1];
        next[format][away.id]=[round3(result.away.rating),week,away.matches+1];
      }else{
        const a=pool[offset*2];
        const b=pool[offset*2+1];
        const c=pool[offset*2+2];
        const d=pool[offset*2+3];
        if(!a||!b||!c||!d)break;
        const myTeam=[a,b];
        const theirTeam=[c,d];
        const outcome=simulateOutcome({
          mySkill:(a.skill+b.skill)/2,
          theirSkill:(c.skill+d.skill)/2,
          myRating:(a.rating+b.rating)/2,
          theirRating:(c.rating+d.rating)/2,
          random
        });
        const rated=rateMatch({
          players:[
            {id:a.id,rating:a.rating,team:'mine',matchesPlayed:a.matches},
            {id:b.id,rating:b.rating,team:'mine',matchesPlayed:b.matches},
            {id:c.id,rating:c.rating,team:'opponent',matchesPlayed:c.matches},
            {id:d.id,rating:d.rating,team:'opponent',matchesPlayed:d.matches}
          ],
          actualMyPoints:outcome.myPoints,
          actualOpponentPoints:outcome.opponentPoints,
          matchType:'league',
          weeksAgo:0
        });
        for(const player of rated.players){
          const source=player.team==='mine'?myTeam.find(entry=>entry.id===player.id):theirTeam.find(entry=>entry.id===player.id);
          next[format][player.id]=[round3(player.rating),week,source.matches+1];
        }
      }
      played++;
    }
  }
  return {ratings:next,matches:played};
}

// The amateur circuit.
//
// The lower levels do not stop when the player leaves them. Every week a few
// players earn a tour place from the Challenger board and a few lose one, so
// the pro board turns over and there is always somebody coming up behind a
// player who falls.
export const CIRCUIT_CHURN=3;
export function advanceCircuit(state){
  const circuit=state.circuit??{promoted:0,demoted:0,waves:0};
  const week=state.week;
  const wave=week%4===0;
  return {
    promoted:circuit.promoted+(wave?CIRCUIT_CHURN:0),
    demoted:circuit.demoted+(wave?CIRCUIT_CHURN:0),
    waves:circuit.waves+(wave?1:0)
  };
}

// The rated population of a region, as a flat list of athletes with their
// current rating in a format.
//
// This is the field a competition is drawn from. Only the best players are
// returned, because a tournament is fielded from the top of the rating list,
// and names are only built for the athletes that come back.
export function ratedPopulation({seed,regionId,ratings,week,format='doubles',gender=null,limit=80}){
  const skills=buildRegionSkills(seed,regionId,week);
  const current=currentRatings(skills,ratings,week,format);
  const pool=gender?[...current.values()].filter(athlete=>athlete.gender===gender):[...current.values()];
  const ranked=pool.sort((a,b)=>b.rating-a.rating).slice(0,limit);
  return ranked.map(athlete=>{
    const full=athlete.club?buildAthlete(seed,athlete.club,athlete.index):null;
    return {
      id:athlete.id,
      name:full?.name??athlete.id,
      skill:athlete.skill,
      rating:athlete.rating,
      clubId:athlete.clubId,
      cityId:athlete.cityId,
      matches:athlete.matches,
      // The identity the match engine needs to build a profile.
      archetypeId:full?.archetypeId??'avery',
      archetypeLabel:full?.archetypeLabel??'All-rounder',
      gender:full?.gender??'male',
      handedness:full?.handedness??'right',
      citizenship:full?.citizenship??null,
      age:full?.age??null
    };
  });
}

// The players a player would meet in a bracket, in a given format. Playing
// up means facing somebody a bracket stronger, which is exactly what makes
// it a gamble worth taking.
export function opponentsInBracket({seed,regionId,ratings,week,divisionId,format='doubles',count=1,random}){
  const skills=buildRegionSkills(seed,regionId,week);
  const current=currentRatings(skills,ratings,week,format);
  const division=RATING_BRACKETS.find(entry=>entry.id===divisionId);
  if(!division)return [];
  const all=[...current.values()];
  const inBracket=all.filter(athlete=>athlete.rating>=division.min&&athlete.rating<=division.max);
  // If nobody is in that bracket yet, take the closest player to it.
  const pool=inBracket.length?inBracket:all;
  if(!pool.length)return [];
  const roll=random??Math.random;
  const picked=[];
  const used=new Set();
  while(picked.length<count&&used.size<pool.length){
    const index=Math.floor(roll()*pool.length);
    if(used.has(index))continue;
    used.add(index);
    const chosen=pool[index];
    // Rebuild the drawn athlete in full so the player sees who they faced.
    const full=chosen.club?buildAthlete(seed,chosen.club,chosen.index):null;
    picked.push(full?{...full,rating:chosen.rating,matches:chosen.matches,skill:chosen.skill}:chosen);
  }
  return picked;
}
