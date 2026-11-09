// Contracts.
//
// A contract is what makes the pro tour a stage rather than a prize. It is
// granted on the ranking, it carries obligations, it can be lost, and losing
// it does not end a career.
//
// It also changes what a week looks like. A contracted pro does not enter
// amateur leagues and local opens any more; the tour is the job.

import {positions} from './ranking.js';

export const SEASON_WEEKS=52;
export const CONTRACT_RANK=50;
export const PROMOTE_DISCIPLINE=25;
export const OBLIGATION_EVENTS=25;

export function isContracted(state){return (state?.contract??'none')!=='none'}
export function contractLevel(state){return state?.contract??'none'}

// The level a player has earned. Futures is where a signing starts.
export function contractOffer(state){
  if(isContracted(state))return null;
  const place=positions(state,state?.week??0).overall;
  if(place!==null&&place<=CONTRACT_RANK)return 'futures';
  return null;
}

export function signed(state,level='futures',week=state?.week??0){
  return {...state,contract:level,contractSince:week,contractEvents:0};
}

// Futures to Standard needs a place in a discipline board. Gold is reserved
// for a sustained run at the top of the Overall board.
export function promote(state){
  if(contractLevel(state)==='futures'){
    const place=positions(state,state.week);
    const discipline=Math.min(...[place.doubles,place.mixed,place.singles].filter(value=>value!==null));
    if(Number.isFinite(discipline)&&discipline<=PROMOTE_DISCIPLINE)return signed(state,'standard',state.week);
  }
  if(contractLevel(state)==='standard'){
    const place=positions(state,state.week).overall;
    if(place!==null&&place<=25)return signed(state,'gold',state.week);
  }
  return state;
}

export function seasonDue(state,previousWeek){
  const week=Number(state?.week)||0;
  return week>0&&week%SEASON_WEEKS===0&&week!==previousWeek;
}

// At the season boundary the tour keeps you, moves you up, or lets you go.
export function evaluateSeason(state){
  if(!isContracted(state))return {state,released:false,level:contractLevel(state),reason:'no contract'};
  const level=contractLevel(state);
  const place=positions(state,state.week).overall;
  const held=place!==null&&place<=CONTRACT_RANK;
  if(!held){
    return {
      state:{...state,contract:'none',contractEvents:0,contractSince:null},
      released:true,
      level,
      reason:'the board did not hold its place'
    };
  }
  const promoted=promote(state);
  return {state:promoted,released:false,level:contractLevel(promoted),reason:'renewed'};
}
