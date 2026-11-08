// Career state and the actions a player can take.
//
// The state is the single source of truth for a career and is small enough
// to keep in local storage: it holds the seed, the player's own athlete and
// a running history. Every club and every other athlete is reproduced from
// the seed, so ids stay stable without storing the population.

import {CHARACTERS,RATING_KEYS,generateIdentity,skillAverage} from '../roster.js';
import {seededRandom} from '../competition.js';
import {REGIONS,regionById,allCities,cityById,citizenshipFor,EVENT_BY_ID} from './geography.js';
import {pointsForEntry,addPoints,pointsInWindow} from './tour.js';
import {buildClubIndex,findClub,mixSeed} from './population.js';
import {generateWeekEvents,weekLabel,entryEligibility} from './calendar.js';
import {NEW_PLAYER_RATING,simulateOutcome,rateMatch} from './rating.js';
import {opponentInBracket,advanceWorld} from './world.js';

// A career starts at a 3.500 rating, so the underlying skill starts where
// that rating sits rather than at the bottom of the scale.
export const STARTING_SKILL=51;
export const MAX_ENERGY=100;
export const WEEKLY_RECOVERY=35;
// Solo training costs a fraction of a rated match. The calendar should make
// a player choose to compete rather than to grind.
export const TRAINING_COST=8;
export const TRAVEL_COST=10;
export const HISTORY_LIMIT=60;
export const LOG_LIMIT=14;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function startingCityId(regionId,seed){
  const major=allCities(regionId).filter(city=>city.tier==='major');
  const pool=major.length?major:allCities(regionId);
  const random=seededRandom(mixSeed(seed,`start-city:${regionId}`));
  return pool[Math.floor(random()*pool.length)].id;
}

function buildPlayerAthlete({name,gender,archetypeId,regionId,seed,city}){
  const archetype=CHARACTERS.find(character=>character.id===archetypeId)??CHARACTERS[0];
  const random=seededRandom(mixSeed(seed,`player:${regionId}:${archetype.id}`));
  const identity=generateIdentity({gender,random});
  const resolvedName=String(name??'').trim()||identity.name;
  const shift=STARTING_SKILL-70;
  const ratings={};
  for(const key of RATING_KEYS){
    const base=archetype.ratings[key]??70;
    ratings[key]=clamp(Math.round(base+shift+(random()-.5)*5),20,99);
  }
  const average=skillAverage(ratings);
  return {
    id:`player-${seed}`,
    name:resolvedName,
    citizenship:citizenshipFor(regionId,{country:city?.country},random),
    skinColor:identity.skinColor,
    hairColor:identity.hairColor,
    shirtColor:identity.shirtColor,
    gender:gender==='female'?'female':'male',
    age:18+Math.floor(random()*12),
    handedness:random()<.13?'left':'right',
    archetypeId:archetype.id,
    archetypeLabel:archetype.style,
    ratings,
    skillAverage:average,
    // A career starts without a rating. The number is provisional until the
    // first rated match sets it.
    rating:NEW_PLAYER_RATING,
    record:{value:1+average/15,confidence:0,matches:0,wins:0,losses:0},
    tourPoints:0,
    tourPointsHistory:[]
  };
}

export function createCareer(options={}){
  const regionId=REGIONS.some(region=>region.id===options.regionId)?options.regionId:REGIONS[0].id;
  const seed=Number.isFinite(options.seed)?options.seed:(Date.now()%2147483647);
  const requestedCity=options.cityId?cityById(regionId,options.cityId):null;
  const cityId=requestedCity?.id??startingCityId(regionId,seed);
  const city=cityById(regionId,cityId);
  const athlete=buildPlayerAthlete({
    name:options.name,
    gender:options.gender,
    archetypeId:options.archetypeId,
    regionId,
    seed,
    city
  });
  return {
    seed,
    createdAt:new Date().toISOString(),
    regionId,
    regionLabel:regionById(regionId).label,
    areaId:city.areaId,
    areaLabel:city.areaLabel,
    cityId:city.id,
    cityLabel:city.label,
    country:city.country,
    clubId:null,
    club:null,
    week:0,
    energy:MAX_ENERGY,
    trainingFocus:'drive',
    athlete,
    history:[],
    stats:{weeks:0,sessions:0,entries:0,moves:0,matches:0},
    worldRatings:{},
    matches:[],
    entered:[],
    lastEntry:null,
    lastActionWeek:-1,
    log:[{week:0,text:`Career started in ${city.label}.`}]
  };
}

// ---- training curve -------------------------------------------------------
// Early gains are quick and later gains are slow, so a long career keeps
// something to chase without a flat rate grind.
export function trainingCost(){return TRAINING_COST}
export function trainingGain(state,focus){
  const rating=state.athlete.ratings[focus]??50;
  return clamp(Math.round(1+2*(100-rating)/60),1,3);
}
export function canAct(state){return state.lastActionWeek!==state.week}

function withAthlete(state,ratings){
  const average=skillAverage(ratings);
  // The rating is not touched here. It moves on rated matches, and training
  // develops the athlete without moving the standing.
  const athlete={...state.athlete,ratings,skillAverage:average};
  return {...state,athlete};
}
function pushHistory(state,note){
  const entry={week:state.week,label:weekLabel(state.week),note};
  const history=[...state.history,entry].slice(-HISTORY_LIMIT);
  return {...state,history};
}
function pushLog(state,text){
  return {...state,log:[...state.log,{week:state.week,text}].slice(-LOG_LIMIT)};
}

export function train(state,focus){
  if(!RATING_KEYS.includes(focus))return {ok:false,state,message:`Unknown focus "${focus}"`};
  if(!canAct(state))return {ok:false,state,message:'You have already used this week. Advance the calendar to continue.'};
  const cost=trainingCost(state);
  if(state.energy<cost)return {ok:false,state,message:`Training needs ${cost} energy. You have ${state.energy}.`};
  const gain=trainingGain(state,focus);
  const ratings={...state.athlete.ratings};
  ratings[focus]=clamp(ratings[focus]+gain,0,99);
  ratings.control=clamp(ratings.control+1,0,99);
  const next=withAthlete(state,ratings);
  const moved=pushHistory(pushLog(next,`Practised ${focus} — +${gain} ${focus}.`),`Practised ${focus}`);
  return {ok:true,state:{...moved,energy:state.energy-cost,lastActionWeek:state.week,trainingFocus:focus,stats:{...state.stats,sessions:state.stats.sessions+1}},message:`Practised ${focus}. +${gain} ${focus}, +1 control.`};
}

export function currentEvents(state){return generateWeekEvents(state,state.week)}

// Entering an event registers the player in a bracket. Which bracket they
// choose matters: playing up raises the bar for a good result, and playing
// down means a narrow win counts as an underperformance.
export function attendEvent(state,eventId,divisionId=null){
  const event=currentEvents(state).find(entry=>entry.id===eventId);
  if(!event)return {ok:false,state,message:'That event is not on the calendar this week.'};
  if(!canAct(state))return {ok:false,state,message:'You have already used this week. Advance the calendar to continue.'};
  const eligible=entryEligibility(state,EVENT_BY_ID[event.eventId]);
  if(!eligible.ok)return {ok:false,state,message:eligible.reason};
  const division=event.divisions.find(entry=>entry.id===(divisionId??event.defaultDivisionId));
  if(!division)return {ok:false,state,message:'That bracket is not running at this event.'};
  if(state.energy<event.energyCost)return {ok:false,state,message:`That event needs ${event.energyCost} energy. You have ${state.energy}.`};
  const ratings={...state.athlete.ratings};
  const gain=event.kind==='practice'?2:1;
  ratings[event.skillFocus]=clamp(ratings[event.skillFocus]+gain,0,99);

  // The match is played. The opponent comes from the bracket the player
  // entered, so playing up means facing somebody a bracket stronger, and
  // the rating moves on how the result compared with the expectation.
  const opponent=opponentInBracket({
    seed:state.seed,
    regionId:state.regionId,
    ratings:state.worldRatings,
    week:state.week,
    divisionId:division.id,
    random:seededRandom(mixSeed(state.seed,`opponent:${state.week}:${event.eventId}:${division.id}`))
  });
  const myRating=state.athlete.rating;
  const theirRating=opponent?.rating??myRating;
  const outcome=simulateOutcome({
    mySkill:state.athlete.skillAverage,
    theirSkill:opponent?.skill??state.athlete.skillAverage,
    myRating,
    theirRating,
    random:seededRandom(mixSeed(state.seed,`play:${state.week}:${event.eventId}:${division.id}`))
  });
  const rated=rateMatch({
    players:[
      {id:'player',rating:myRating,team:'mine',matchesPlayed:state.athlete.record.matches},
      {id:opponent?.id??'opponent',rating:theirRating,team:'opponent',matchesPlayed:opponent?.matches??0}
    ],
    actualMyPoints:outcome.myPoints,
    actualOpponentPoints:outcome.opponentPoints,
    matchType:event.matchType,
    weeksAgo:0
  });
  const newRating=rated.players[0].rating;
  const won=outcome.myPoints>outcome.opponentPoints;
  const delta=newRating-myRating;

  const athlete={
    ...state.athlete,
    ratings,
    rating:newRating,
    record:{
      ...state.athlete.record,
      matches:state.athlete.record.matches+1,
      wins:state.athlete.record.wins+(won?1:0),
      losses:state.athlete.record.losses+(won?0:1)
    }
  };
  const next={...state,athlete};
  const score=`${outcome.myPoints}-${outcome.opponentPoints}`;
  const note=`${event.title} · ${division.label} bracket · ${score} vs ${opponent?.name??'a local'}`;
  const moved=pushHistory(pushLog(next,`${note}. Rating ${formatRating3(newRating)} (${delta>=0?'+':''}${delta.toFixed(3)}).`),note);
  const entered=[...new Set([...(state.entered??[]),event.eventId])].slice(-16);
  const earned=pointsForEntry(event.eventId,division.id,event.ownDivisionId);
  const tourPointsHistory=addPoints(state.athlete.tourPointsHistory,state.week,earned);
  const matchRecord={
    week:state.week,
    eventId:event.eventId,
    bracket:division.label,
    score,
    opponent:opponent?.name??'a local',
    won,
    rating:newRating,
    delta:Number(delta.toFixed(3))
  };
  return {
    ok:true,
    state:{
      ...moved,
      athlete:{...moved.athlete,tourPoints:pointsInWindow(tourPointsHistory,state.week),tourPointsHistory},
      energy:state.energy-event.energyCost,
      lastActionWeek:state.week,
      entered,
      lastEntry:{week:state.week,eventId:event.eventId,divisionId:division.id,label:division.label},
      matches:[...state.matches,matchRecord].slice(-40),
      stats:{...state.stats,entries:state.stats.entries+1,matches:state.stats.matches+1}
    },
    message:`${won?'Won':'Lost'} ${score} in the ${division.label} bracket. Rating ${formatRating3(newRating)} (${delta>=0?'+':''}${delta.toFixed(3)}).`
  };
}

const formatRating3=value=>Math.round((Number(value)||0)*1000)/1000;

export function joinClub(state,clubId){
  const clubs=buildClubIndex(state.seed,state.regionId);
  const club=findClub(clubs,clubId);
  if(!club)return {ok:false,state,message:'That club is not in this region.'};
  if(state.energy<TRAVEL_COST&&club.cityId!==state.cityId)return {ok:false,state,message:`Travelling to ${club.cityLabel} needs ${TRAVEL_COST} energy.`};
  const city=cityById(state.regionId,club.cityId);
  const moved=club.cityId!==state.cityId
    ?{...state,energy:state.energy-TRAVEL_COST,cityId:city.id,cityLabel:city.label,areaId:city.areaId,areaLabel:city.areaLabel,country:city.country,stats:{...state.stats,moves:state.stats.moves+1}}
    :state;
  const next=pushLog(pushHistory({...moved,clubId:club.id,club:{id:club.id,name:club.name,cityId:club.cityId,cityLabel:club.cityLabel,tierLabel:club.tierLabel,surface:club.surface}},'Joined a club.'),`Joined ${club.name}.`);
  return {ok:true,state:next,message:`You joined ${club.name} in ${club.cityLabel}.`};
}

export function leaveClub(state){
  if(!state.clubId)return {ok:false,state,message:'You are not in a club.'};
  const name=state.club?.name??'the club';
  const next=pushLog(pushHistory({...state,clubId:null,club:null},'Left a club.'),`Left ${name}.`);
  return {ok:true,state:next,message:`You left ${name}.`};
}

export function moveToCity(state,cityId){
  const city=cityById(state.regionId,cityId);
  if(!city)return {ok:false,state,message:'That city is not in your region.'};
  if(city.id===state.cityId)return {ok:false,state,message:`You are already in ${city.label}.`};
  if(state.energy<TRAVEL_COST)return {ok:false,state,message:`Travelling needs ${TRAVEL_COST} energy. You have ${state.energy}.`};
  const next=pushLog(pushHistory({...state,energy:state.energy-TRAVEL_COST,cityId:city.id,cityLabel:city.label,areaId:city.areaId,areaLabel:city.areaLabel,country:city.country,clubId:null,club:null,stats:{...state.stats,moves:state.stats.moves+1}},`Moved to ${city.label}.`),`Moved to ${city.label}. Club membership cleared.`);
  return {ok:true,state:next,message:`You moved to ${city.label}.`};
}

export function advanceWeek(state){
  const week=state.week+1;
  const energy=clamp(state.energy+WEEKLY_RECOVERY,0,MAX_ENERGY);
  const world=advanceWorld({
    seed:state.seed,
    regionId:state.regionId,
    week,
    ratings:state.worldRatings
  });
  const moved=pushHistory({...state,week,energy,lastActionWeek:-1,worldRatings:world.ratings,stats:{...state.stats,weeks:state.stats.weeks+1}},`Week ${week+1} begins.`);
  const next=pushLog(moved,`${weekLabel(week)}. Energy restored to ${energy}.`);
  return {ok:true,state:next,message:`${weekLabel(week)}. Energy restored to ${energy}.`};
}

export function setTrainingFocus(state,focus){
  if(!RATING_KEYS.includes(focus))return {ok:false,state,message:`Unknown focus "${focus}"`};
  return {ok:true,state:{...state,trainingFocus:focus},message:`Training focus set to ${focus}.`};
}

