// Career state and the actions a player can take.
//
// The state is the single source of truth for a career and is small enough
// to keep in local storage: it holds the seed, the player's own athlete and
// a running history. Every club and every other athlete is reproduced from
// the seed, so ids stay stable without storing the population.

import {CHARACTERS,RATING_KEYS,generateIdentity,skillAverage} from '../roster.js';
import {seededRandom} from '../competition.js';
import {REGIONS,regionById,allCities,cityById,cityByIdAnywhere,citizenshipFor,EVENT_BY_ID} from './geography.js';
import {pointsForEntry,addPoints,pointsInWindow} from './tour.js';
import {buildClubIndex,findClub,mixSeed} from './population.js';
import {generateWeekEvents,weekLabel,entryEligibility} from './calendar.js';
import {findRival} from './standings.js';
import {NEW_PLAYER_RATING,simulateOutcome,rateMatch,formatSkill,FORMATS,divisionFor} from './rating.js';
import {opponentsInBracket,advanceWorld} from './world.js';

// A career starts at a 3.500 rating, so the underlying skill starts where
// that rating sits rather than at the bottom of the scale.
export const STARTING_SKILL=51;
export const MAX_ENERGY=100;
// A week holds a number of actions rather than one: a player trains several
// nights a week and competes on top of that. Energy is the budget for the
// week, so the player decides how to spend it.
export const MAX_TRAINING_SESSIONS=4;
// Training costs more as the player competes at a higher level, because a
// stronger player trains harder and a harder session takes more out of the
// week. The same number of sessions costs an amateur a fifth of his budget
// and a pro a quarter of it.
export const TRAINING_BASE_COST=8;
export const TRAINING_COST_PER_LEVEL=4;
export const TRAINING_MAX_COST=28;
// Recovery scales the same way. A pro's week holds more work than an
// amateur's and takes it back faster.
export const RECOVERY_BASE=66;
export const RECOVERY_PER_LEVEL=6;
export const RECOVERY_MAX=96;
export const TRAVEL_COST=10;
// Crossing an ocean costs more than a domestic move.
export const INTERNATIONAL_TRAVEL_COST=20;
export const HISTORY_LIMIT=60;
export const LOG_LIMIT=14;

export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

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
    // A career starts without a rating in either format. The numbers are
    // provisional until the first rated match sets them.
    formats:Object.fromEntries(FORMATS.map(format=>[format,NEW_PLAYER_RATING])),
    record:{value:1+average/15,confidence:0,matches:0,wins:0,losses:0},
    tourPoints:0,
    tourPointsHistory:[],
    // The results the four rankings are built from.
    rankingResults:[]
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
  // The rival is the player nearest to you on the board when you start.
  const rival=findRival({
    seed,
    regionId,
    week:0,
    worldRatings:{},
    athlete:{gender:options.gender==='female'?'female':'male',formats:{singles:NEW_PLAYER_RATING,doubles:NEW_PLAYER_RATING,mixed:NEW_PLAYER_RATING}}
  },'doubles');
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
    money:250,
    rivalId:rival?.id??null,
    // Wild cards earned by winning a Challenger event.
    wildCards:0,
    entered:[],
    lastEntry:null,
    lastActionWeek:-1,
    lastEventWeek:-1,
    // A league match is a weeknight commitment, so it does not take the
    // tournament slot. It has its own.
    lastLeagueWeek:-1,
    trainingWeek:0,
    trainingSessions:0,
    log:[{week:0,text:`Career started in ${city.label}.`}]
  };
}

// ---- training curve -------------------------------------------------------
// Early gains are quick and later gains are slow, so a long career keeps
// something to chase without a flat rate grind.
// The rating the weekly load scales with: the player's best format.
export function careerRating(state){
  const formats=Object.values(state?.athlete?.formats??{}).filter(value=>Number.isFinite(value));
  return formats.length?Math.max(...formats):NEW_PLAYER_RATING;
}
export function trainingCost(state){
  if(!state)return TRAINING_BASE_COST;
  return clamp(Math.round(TRAINING_BASE_COST+(careerRating(state)-3)*TRAINING_COST_PER_LEVEL),TRAINING_BASE_COST,TRAINING_MAX_COST);
}
export function weeklyRecovery(state){
  if(!state)return RECOVERY_BASE;
  return clamp(Math.round(RECOVERY_BASE+(careerRating(state)-3)*RECOVERY_PER_LEVEL),RECOVERY_BASE,RECOVERY_MAX);
}
// Training moves an attribute by a single point. It is deliberately
// small: the rating belongs to playing, not to drilling.
export function trainingGain(){return 1}

// The attributes a format rewards.
const FORMAT_SIGNATURE=Object.freeze({
  doubles:['dink','drop','volley'],
  singles:['serve','agility','reach']
});

// Playing an event grows the attributes the player actually relies on: the
// skill the event rewards, what they are strongest at, and what the format
// asks for. One attribute moves, a little.
export function attributeGrowth({attributes,eventFocus,format,random=Math.random}){
  const candidates=[];
  const push=(key,weight)=>{
    if(!key||!RATING_KEYS.includes(key)||attributes[key]==null)return;
    candidates.push([key,weight]);
  };
  push(eventFocus,3);
  const strongest=RATING_KEYS
    .filter(key=>key!=='aggression')
    .sort((a,b)=>(attributes[b]??0)-(attributes[a]??0))
    .slice(0,2);
  for(const key of strongest)push(key,2);
  for(const key of FORMAT_SIGNATURE[format]??[])push(key,2);
  if(!candidates.length)return {};
  const total=candidates.reduce((sum,[,weight])=>sum+weight,0);
  let roll=random()*total;
  for(const [key,weight] of candidates){
    roll-=weight;
    if(roll<=0)return {[key]:1};
  }
  return {[candidates[0][0]]:1};
}
// Training sessions taken this week. Saves made before the counter existed
// simply have none.
export function trainingSessionsThisWeek(state){
  return state.trainingWeek===state.week?(state.trainingSessions??0):0;
}
export function canTrain(state){
  return trainingSessionsThisWeek(state)<MAX_TRAINING_SESSIONS&&state.energy>=trainingCost(state);
}
export function trainBlockReason(state){
  if(trainingSessionsThisWeek(state)>=MAX_TRAINING_SESSIONS){
    return `You have trained ${MAX_TRAINING_SESSIONS} times this week. Advance the calendar to train again.`;
  }
  const cost=trainingCost(state);
  if(state.energy<cost)return `Training needs ${cost} energy. You have ${state.energy}.`;
  return null;
}
// One event a week. A league that runs for a season is an event every week
// of it, and a tournament is one event.
export function isLeagueEvent(event){return event?.matchType==='league'}
export function canEnterEvent(state,event=null){
  const week=state.week;
  if(isLeagueEvent(event))return (state.lastLeagueWeek??-1)!==week;
  return (state.lastEventWeek??-1)!==week;
}
export function eventBlockReason(state,event=null){
  if(canEnterEvent(state,event))return null;
  return isLeagueEvent(event)
    ?'You have already played your league match this week.'
    :'You have already entered an event this week. Advance the calendar to compete again.';
}
export function canAct(state){return canTrain(state)||canEnterEvent(state)}

function withAthlete(state,ratings){
  const average=skillAverage(ratings);
  // The rating is not touched here. It moves on rated matches, and training
  // develops the athlete without moving the standing.
  const athlete={...state.athlete,ratings,skillAverage:average};
  return {...state,athlete};
}
export function pushHistory(state,note){
  const entry={week:state.week,label:weekLabel(state.week),note};
  const history=[...state.history,entry].slice(-HISTORY_LIMIT);
  return {...state,history};
}
export function pushLog(state,text){
  return {...state,log:[...state.log,{week:state.week,text}].slice(-LOG_LIMIT)};
}

export function train(state,focus){
  if(!RATING_KEYS.includes(focus))return {ok:false,state,message:`Unknown focus "${focus}"`};
  if(!canTrain(state))return {ok:false,state,message:trainBlockReason(state)};
  const cost=trainingCost(state);
  const gain=trainingGain(state,focus);
  const ratings={...state.athlete.ratings};
  ratings[focus]=clamp(ratings[focus]+gain,0,99);
  ratings.control=clamp(ratings.control+1,0,99);
  const next=withAthlete(state,ratings);
  const moved=pushHistory(pushLog(next,`Trained ${focus} — +${gain} ${focus}.`),`Trained ${focus}`);
  const sessions=trainingSessionsThisWeek(state)+1;
  return {ok:true,state:{...moved,energy:state.energy-cost,lastActionWeek:state.week,trainingWeek:state.week,trainingSessions:sessions,trainingFocus:focus,stats:{...state.stats,sessions:state.stats.sessions+1}},message:`Trained ${focus}. +${gain} ${focus}, +1 control. ${sessions}/${MAX_TRAINING_SESSIONS} sessions this week.`};
}

export function currentEvents(state){return generateWeekEvents(state,state.week)}

// Entering an event registers the player in a bracket. Which bracket they
// choose matters: playing up raises the bar for a good result, and playing
// down means a narrow win counts as an underperformance.
export function attendEvent(state,eventId,optionId=null){
  const event=currentEvents(state).find(entry=>entry.id===eventId);
  if(!event)return {ok:false,state,message:'That event is not on the calendar this week.'};
  if(!canEnterEvent(state))return {ok:false,state,message:eventBlockReason(state)};
  const eligible=entryEligibility(state,EVENT_BY_ID[event.eventId]);
  if(!eligible.ok)return {ok:false,state,message:eligible.reason};
  const option=event.options.find(entry=>entry.id===(optionId??event.defaultOptionId));
  if(!option)return {ok:false,state,message:'That bracket is not running at this event.'};
  const format=option.format;
  const division=option.divisionId;
  if(state.energy<event.energyCost){
    return {ok:false,state,message:'That event needs '+event.energyCost+' energy. You have '+state.energy+'.'};
  }

  // The match is played. The opponents come from the bracket and the format
  // the player entered, so playing up means facing somebody a bracket
  // stronger, and the rating moves on how the result compared with the
  // expectation rather than on the result itself.
  const opponentCount=format==='doubles'?2:1;
  const opponents=opponentsInBracket({
    seed:state.seed,
    regionId:state.regionId,
    ratings:state.worldRatings,
    week:state.week,
    divisionId:division,
    format,
    count:opponentCount,
    random:seededRandom(mixSeed(state.seed,'opponent:'+state.week+':'+event.eventId+':'+option.id))
  });
  const partner=format==='doubles'
    ?(opponentsInBracket({
      seed:state.seed,
      regionId:state.regionId,
      ratings:state.worldRatings,
      week:state.week,
      divisionId:division,
      format,
      count:1,
      random:seededRandom(mixSeed(state.seed,'partner:'+state.week+':'+event.eventId+':'+option.id))
    })[0]??null)
    :null;

  const myRating=state.athlete.formats[format]??NEW_PLAYER_RATING;
  const theirRating=opponents.length?opponents.reduce((sum,o)=>sum+o.rating,0)/opponents.length:myRating;
  const mySkill=formatSkill(state.athlete.ratings,format);
  const theirSkill=opponents.length?opponents.reduce((sum,o)=>sum+o.skill,0)/opponents.length:mySkill;
  const outcome=simulateOutcome({
    mySkill,
    theirSkill,
    myRating,
    theirRating,
    random:seededRandom(mixSeed(state.seed,'play:'+state.week+':'+event.eventId+':'+option.id))
  });

  const myTeam=[{id:'player',rating:myRating,team:'mine',matchesPlayed:state.athlete.record.matches}];
  if(partner)myTeam.push({id:partner.id??'partner',rating:partner.rating,team:'mine',matchesPlayed:partner.matches??0});
  const theirTeam=opponents.length
    ?opponents.map(opponent=>({id:opponent.id??'opponent',rating:opponent.rating,team:'opponent',matchesPlayed:opponent.matches??0}))
    :[{id:'opponent',rating:theirRating,team:'opponent',matchesPlayed:0}];
  const rated=rateMatch({
    players:myTeam.concat(theirTeam),
    actualMyPoints:outcome.myPoints,
    actualOpponentPoints:outcome.opponentPoints,
    matchType:event.matchType,
    weeksAgo:0
  });
  const newRating=rated.players[0].rating;
  const won=outcome.myPoints>outcome.opponentPoints;
  const delta=newRating-myRating;

  // Playing an event grows an attribute the player relies on.
  const growth=attributeGrowth({
    attributes:state.athlete.ratings,
    eventFocus:event.skillFocus,
    format,
    random:seededRandom(mixSeed(state.seed,'growth:'+state.week+':'+event.eventId+':'+option.id))
  });
  const ratings={...state.athlete.ratings};
  for(const key of Object.keys(growth))ratings[key]=clamp(ratings[key]+growth[key],0,99);

  const athlete={
    ...state.athlete,
    ratings,
    formats:Object.assign({},state.athlete.formats,{[format]:newRating}),
    record:{
      ...state.athlete.record,
      matches:state.athlete.record.matches+1,
      wins:state.athlete.record.wins+(won?1:0),
      losses:state.athlete.record.losses+(won?0:1)
    }
  };
  const next=Object.assign({},state,{athlete});
  const score=outcome.myPoints+'-'+outcome.opponentPoints;
  const faced=opponents.map(opponent=>opponent.name??'a local').join(' and ');
  const signed=(delta>=0?'+':'')+delta.toFixed(3);
  const note=event.title+' · '+option.label+' '+format+' bracket · '+score+' vs '+(faced||'a local');
  const moved=pushHistory(pushLog(next,note+'. Rating '+formatRating3(newRating)+' ('+signed+').'),note);
  const entered=[...new Set([...(state.entered??[]),event.eventId])].slice(-16);
  const ownDivision=divisionFor(state.athlete.formats[format]??NEW_PLAYER_RATING);
  const earned=pointsForEntry(event.eventId,division,ownDivision.id);
  const tourPointsHistory=addPoints(state.athlete.tourPointsHistory,state.week,earned);
  const matchRecord={
    week:state.week,
    eventId:event.eventId,
    format,
    bracket:option.label,
    score,
    opponent:faced||'a local',
    won,
    rating:newRating,
    delta:Number(delta.toFixed(3))
  };
  return {
    ok:true,
    state:Object.assign({},moved,{
      athlete:Object.assign({},moved.athlete,{tourPoints:pointsInWindow(tourPointsHistory,state.week),tourPointsHistory}),
      energy:state.energy-event.energyCost,
      lastActionWeek:state.week,
      lastEventWeek:state.week,
      entered,
      lastEntry:{week:state.week,eventId:event.eventId,format,divisionId:division,label:option.label},
      matches:[...state.matches,matchRecord].slice(-40),
      stats:Object.assign({},state.stats,{entries:state.stats.entries+1,matches:state.stats.matches+1})
    }),
    message:(won?'Won ':'Lost ')+score+' in the '+option.label+' '+format+' bracket. '+format.toUpperCase()+' rating '+formatRating3(newRating)+' ('+signed+').'
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
  const city=cityByIdAnywhere(cityId);
  if(!city)return {ok:false,state,message:'That city is not in the world.'};
  if(city.id===state.cityId)return {ok:false,state,message:`You are already in ${city.label}.`};
  const international=city.regionId!==state.regionId;
  const cost=international?INTERNATIONAL_TRAVEL_COST:TRAVEL_COST;
  if(state.energy<cost)return {ok:false,state,message:`Travelling needs ${cost} energy. You have ${state.energy}.`};
  const moved=pushHistory({
    ...state,
    energy:state.energy-cost,
    regionId:city.regionId,
    regionLabel:regionById(city.regionId).label,
    areaId:city.areaId,
    areaLabel:city.areaLabel,
    cityId:city.id,
    cityLabel:city.label,
    country:city.country,
    clubId:null,
    club:null,
    // The other region is a different population, so its ratings start fresh.
    worldRatings:{},
    stats:{...state.stats,moves:state.stats.moves+1}
  },`Moved to ${city.label}, ${city.country}.`);
  const next=pushLog(moved,`Moved to ${city.label}, ${city.country}. Club membership cleared.`);
  return {ok:true,state:next,message:international?`You moved to ${city.label}, ${city.country}.`:`You moved to ${city.label}.`};
}

// Skips the quiet weeks and stops on the next week with something the
// player can enter, so a career does not have to be clicked forward.
export function advanceToNextEvent(state,{maxWeeks=52}={}){
  let current=state;
  for(let index=0;index<maxWeeks;index++){
    current=advanceWeek(current).state;
    const events=generateWeekEvents(current,current.week).filter(event=>event.eligible.ok&&event.options.length);
    if(events.length){
      return {ok:true,state:current,events,message:`${weekLabel(current.week)}. ${events.length} event${events.length===1?'':'s'} available.`};
    }
  }
  return {ok:true,state:current,events:[],message:'No enterable event in the next year.'};
}

export function advanceWeek(state){
  const week=state.week+1;
  // What the player takes back next week. Spending more than this in a week
  // carries the rest into the next one as fatigue.
  const recovery=weeklyRecovery(state);
  const energy=clamp(state.energy+recovery,0,MAX_ENERGY);
  const world=advanceWorld({
    seed:state.seed,
    regionId:state.regionId,
    week,
    ratings:state.worldRatings
  });
  const moved=pushHistory({...state,week,energy,lastActionWeek:-1,lastEventWeek:-1,lastLeagueWeek:-1,trainingWeek:week,trainingSessions:0,worldRatings:world.ratings,stats:{...state.stats,weeks:state.stats.weeks+1}},`Week ${week+1} begins.`);
  const next=pushLog(moved,`${weekLabel(week)}. Energy restored to ${energy}.`);
  return {ok:true,state:next,message:`${weekLabel(week)}. Energy restored to ${energy}.`};
}

export function setTrainingFocus(state,focus){
  if(!RATING_KEYS.includes(focus))return {ok:false,state,message:`Unknown focus "${focus}"`};
  return {ok:true,state:{...state,trainingFocus:focus},message:`Training focus set to ${focus}.`};
}

