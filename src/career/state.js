// Career state and the actions a player can take.
//
// The state is the single source of truth for a career and is small enough
// to keep in local storage: it holds the seed, the player's own athlete and
// a running history. Every club and every other athlete is reproduced from
// the seed, so ids stay stable without storing the population.

import {CHARACTERS,NAME_CULTURES,RATING_KEYS,generateIdentity,skillAverage} from '../roster.js';
import {seededRandom} from '../competition.js';
import {REGIONS,regionById,allCities,cityById,duprRating,TIER_BY_ID} from './geography.js';
import {buildClubIndex,findClub,mixSeed} from './population.js';
import {generateWeekEvents,weekLabel,eligibilityFor} from './calendar.js';

export const STARTING_SKILL=40;
export const MAX_ENERGY=100;
export const WEEKLY_RECOVERY=35;
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

function buildPlayerAthlete({name,gender,archetypeId,regionId,seed}){
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
    culture:identity.culture,
    cultureLabel:NAME_CULTURES[identity.culture]?.label??identity.culture,
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
    dupr:duprRating(average),
    record:{value:1+average/15,confidence:0,matches:0,wins:0,losses:0}
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
    seed
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
    stats:{weeks:0,sessions:0,entries:0,moves:0},
    lastActionWeek:-1,
    log:[{week:0,text:`Career started in ${city.label}.`}]
  };
}

// ---- training curve -------------------------------------------------------
// Early gains are quick and later gains are slow, so a long career keeps
// something to chase without a flat rate grind.
export function trainingCost(state){
  return 20+Math.round(clamp(state.athlete.skillAverage-40,0,60)/12);
}
export function trainingGain(state,focus){
  const rating=state.athlete.ratings[focus]??50;
  return clamp(Math.round(1+2*(100-rating)/60),1,3);
}
export function canAct(state){return state.lastActionWeek!==state.week}

function withAthlete(state,ratings){
  const average=skillAverage(ratings);
  const athlete={...state.athlete,ratings,skillAverage:average,dupr:duprRating(average)};
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

export function attendEvent(state,eventId){
  const event=currentEvents(state).find(entry=>entry.id===eventId);
  if(!event)return {ok:false,state,message:'That event is not on the calendar this week.'};
  if(!canAct(state))return {ok:false,state,message:'You have already used this week. Advance the calendar to continue.'};
  const tier=TIER_BY_ID[event.tierId];
  const eligible=eligibilityFor(tier,state);
  if(!eligible.ok)return {ok:false,state,message:eligible.reason};
  if(state.energy<event.energyCost)return {ok:false,state,message:`That event needs ${event.energyCost} energy. You have ${state.energy}.`};
  const ratings={...state.athlete.ratings};
  const gain=event.kind==='practice'?2:1;
  ratings[event.skillFocus]=clamp(ratings[event.skillFocus]+gain,0,99);
  const next=withAthlete(state,ratings);
  const note=event.kind==='practice'?`Club practice at ${event.venue}.`:`Entered ${event.title}.`;
  const moved=pushHistory(pushLog(next,`${note} +${gain} ${event.skillFocus}.`),note);
  return {
    ok:true,
    state:{...moved,energy:state.energy-event.energyCost,lastActionWeek:state.week,stats:{...state.stats,entries:state.stats.entries+1}},
    message:event.kind==='practice'?`Practised at ${event.venue}. +${gain} ${event.skillFocus}.`:`Registered for ${event.title}. Match play arrives in the next milestone.`
  };
}

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
  const next=pushHistory({...state,week,energy,lastActionWeek:-1,stats:{...state.stats,weeks:state.stats.weeks+1}},`Week ${week+1} begins.`);
  return {ok:true,state:pushLog(next,`${weekLabel(week)}. Energy restored to ${energy}.`),message:`${weekLabel(week)}. Energy restored to ${energy}.`};
}

export function setTrainingFocus(state,focus){
  if(!RATING_KEYS.includes(focus))return {ok:false,state,message:`Unknown focus "${focus}"`};
  return {ok:true,state:{...state,trainingFocus:focus},message:`Training focus set to ${focus}.`};
}

