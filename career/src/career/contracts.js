// Contracts.
//
// A contract is what makes the pro tour a stage rather than a prize. It is
// granted on the ranking, it carries obligations, it can be lost, and losing
// it does not end a career.
//
// The real tour's obligation is larger than the game's calendar can express:
// it asks for twenty-five events and two formats in each one. This game plays
// one division per event, so the obligation is twelve PPA events with at
// least three appearances in two different disciplines. It keeps the
// complete-player pressure while remaining attainable.

import {positions,challengerPoints} from './ranking.js?v=208';
import {PRO_FLOOR_RATING} from './tour.js?v=208';

export const SEASON_WEEKS=52;
export const CONTRACT_RANK=50;
export const PROMOTE_DISCIPLINE=25;
export const PROMOTE_OVERALL=30;
export const OBLIGATION_EVENTS=12;
export const OBLIGATION_FORMATS=3;
export const REQUIRED_DISCIPLINES=2;
export const INELIGIBLE_WEEKS=52;
export const REENTRY_EVENTS=8;
export const CHALLENGER_CONTRACT_POINTS=5000;
export const TOUR_TIERS=Object.freeze(['open','cup','major','world']);

const emptyFormats=()=>({singles:0,doubles:0,mixed:0});

export function isContracted(state){return (state?.contract??'none')!=='none'}
export function contractLevel(state){return state?.contract??'none'}
export function isIneligible(state,week=state?.week??0){
  return Number.isFinite(state?.ineligibleUntil)&&week<state.ineligibleUntil;
}

// Only PPA-style events count toward a tour contract. MLP has its own season
// and its own points, even when it appears in the same summer calendar.
export function isTourEvent(event){
  const eventId=event?.eventId??event?.id;
  return Boolean(event)&&eventId!=='mlp'&&eventId!=='mlp-amateur'&&TOUR_TIERS.includes(event.tier);
}

function contractFormats(state){
  return {...emptyFormats(),...(state?.contractFormats??{})};
}

export function obligationProgress(state){
  const formats=contractFormats(state);
  const events=Math.max(0,Number(state?.contractEvents)||0);
  const disciplines=Object.values(formats).filter(count=>count>=OBLIGATION_FORMATS).length;
  return {
    events,
    requiredEvents:OBLIGATION_EVENTS,
    formats,
    requiredPerDiscipline:OBLIGATION_FORMATS,
    disciplines,
    requiredDisciplines:REQUIRED_DISCIPLINES,
    met:events>=OBLIGATION_EVENTS&&disciplines>=REQUIRED_DISCIPLINES
  };
}

export function contractOffer(state){
  if(isContracted(state))return null;
  const week=state?.week??0;
  const rank=positions(state,week).overall;
  const ineligible=isIneligible(state,week);
  // A released player cannot walk straight back into a contract merely
  // because stale points still put them near the top of the board.
  if(ineligible){
    if(state?.contractRecommendation||(state?.reentryEvents??0)>=REENTRY_EVENTS)return 'futures';
    return null;
  }
  if(state?.contractRecommendation)return 'futures';
  const bestRating=Math.max(...Object.values(state?.athlete?.formats??{}).filter(value=>Number.isFinite(value)),0);
  if(bestRating<PRO_FLOOR_RATING)return null;
  if(rank!==null&&rank<=CONTRACT_RANK)return 'futures';
  if(challengerPoints(state?.rankingResults,week)>=CHALLENGER_CONTRACT_POINTS)return 'futures';
  return null;
}

export function signed(state,level='futures',week=state?.week??0){
  return {
    ...state,
    contract:level,
    contractSince:week,
    contractEvents:0,
    contractFormats:emptyFormats(),
    contractEventLog:[],
    ineligibleUntil:null,
    releasedAt:null,
    reentryEvents:0,
    reentryEventIds:[],
    contractRecommendation:null
  };
}

export function promote(state){
  if(contractLevel(state)==='futures'){
    const place=positions(state,state.week);
    const discipline=Math.min(...[place.doubles,place.mixed,place.singles].filter(value=>value!==null));
    const qualified=Number.isFinite(discipline)&&discipline<=PROMOTE_DISCIPLINE;
    if(qualified||(place.overall!==null&&place.overall<=PROMOTE_OVERALL))return signed(state,'standard',state.week);
  }
  if(contractLevel(state)==='standard'){
    const place=positions(state,state.week).overall;
    if(place!==null&&place<=PROMOTE_DISCIPLINE)return signed(state,'gold',state.week);
  }
  return state;
}

// Records one PPA event once while accumulating every division played in
// that event. This is what lets a multi-division entry satisfy the
// complete-player obligation without inflating the event count.
export function recordTourEvent(state,{eventId,week=state?.week??0,format='doubles'}={}){
  if(!isContracted(state)||!eventId)return state;
  const key=`${week}:${eventId}`;
  const log=state.contractEventLog??[];
  const index=log.findIndex(entry=>entry.key===key);
  const formats=contractFormats(state);
  if(index>=0){
    const current=log[index];
    const played=current.formats??(current.format?[current.format]:[]);
    if(played.includes(format))return state;
    if(Object.hasOwn(formats,format))formats[format]+=1;
    const nextLog=log.slice();
    nextLog[index]={...current,formats:[...played,format],format:undefined};
    return {...state,contractFormats:formats,contractEventLog:nextLog.slice(-32)};
  }
  if(Object.hasOwn(formats,format))formats[format]+=1;
  return {
    ...state,
    contractEvents:(state.contractEvents??0)+1,
    contractFormats:formats,
    contractEventLog:[...log,{key,week,eventId,formats:[format]}].slice(-32)
  };
}

// Smaller events give a released player a route back after eight starts
// within the ineligible period. Each event counts once.
export function recordReentryEvent(state,{eventId,week=state?.week??0}={}){
  if(isContracted(state)||!eventId||eventId==='mlp'||eventId==='mlp-amateur')return state;
  const key=`${week}:${eventId}`;
  const ids=state.reentryEventIds??[];
  if(ids.includes(key))return state;
  return {
    ...state,
    reentryEvents:(state.reentryEvents??0)+1,
    reentryEventIds:[...ids,key].slice(-24)
  };
}

export function markRecommendation(state,source='committee'){
  return {...state,contractRecommendation:source};
}

// A contract is reviewed on its anniversary. This avoids a player signing
// halfway through a calendar season and being judged on a partial record.
export function seasonDue(state,previousWeek=state?.week??0){
  if(!isContracted(state)||!Number.isFinite(state.contractSince))return false;
  const week=Number(state.week)||0;
  return week!==previousWeek&&week-state.contractSince>=SEASON_WEEKS;
}

export function evaluateSeason(state){
  if(!isContracted(state))return {state,released:false,promoted:false,demoted:false,level:contractLevel(state),reason:'no contract'};
  const level=contractLevel(state);
  const place=positions(state,state.week).overall;
  const progress=obligationProgress(state);
  const held=place!==null&&place<=CONTRACT_RANK&&progress.met;
  if(!held){
    const reason=place===null||place>CONTRACT_RANK
      ?'the board did not hold its place'
      :'the contract obligations were not met';
    return {
      state:{
        ...state,
        contract:'none',
        contractSince:null,
        contractEvents:0,
        contractFormats:emptyFormats(),
        contractEventLog:[],
        ineligibleUntil:state.week+INELIGIBLE_WEEKS,
        releasedAt:state.week,
        reentryEvents:0,
        reentryEventIds:[],
        contractRecommendation:null
      },
      released:true,
      promoted:false,
      demoted:false,
      level,
      reason
    };
  }

  let nextLevel=level;
  if(level==='gold')nextLevel=place<=PROMOTE_DISCIPLINE?'gold':'standard';
  else if(level==='standard')nextLevel=place<=PROMOTE_DISCIPLINE?'gold':'futures';
  else{
    const promoted=promote(state);
    nextLevel=contractLevel(promoted);
  }
  const promoted=nextLevel==='gold'&&level!=='gold'||nextLevel==='standard'&&level==='futures';
  const demoted=nextLevel==='standard'&&level==='gold'||nextLevel==='futures'&&level!=='futures';
  const renewed=signed(state,nextLevel,state.week);
  return {
    state:renewed,
    released:false,
    promoted,
    demoted,
    level:nextLevel,
    reason:promoted?'promoted':demoted?'demoted':'renewed'
  };
}