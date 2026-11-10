// Retirement and the career epilogue.

import {analyticsSummary} from './analytics.js?v=208';
import {ageCeiling,ageSkillFactor} from './age.js?v=208';
import {PRO_FLOOR_RATING} from './tour.js?v=208';

const medalTotal=(events,name)=>Object.values(events??{}).reduce((sum,entry)=>sum+(entry?.[name]??0),0);

export function retirementAdvice(state){
  if(state.retired)return {recommended:false,message:'Career complete.'};
  const ceilings=Object.fromEntries(Object.entries(state.athlete.peakFormats??state.athlete.formats??{}).map(([format,peak])=>[format,ageCeiling(peak,state.athlete.age,state.athlete.development)]));
  const best=Math.max(...Object.values(ceilings));
  const pursuingPro=state.contract&&state.contract!=='none';
  const recommended=(pursuingPro&&best<PRO_FLOOR_RATING)||(state.athlete.age>=65&&best<3.5);
  return {
    recommended,
    ceilings,
    message:recommended
      ?`Age ${state.athlete.age} · estimated physical ceiling ${best.toFixed(2)}. Technique can still improve, but the level you are pursuing is moving out of reach. You can keep playing lower events or retire.`
      :`Age ${state.athlete.age} · estimated physical ceiling ${best.toFixed(2)}. Technique can still improve.`
  };
}

export function buildEpilogue(state,reason='voluntary'){
  const summary=analyticsSummary(state);
  const years=Math.max(0,(state.week??0)/52);
  return {
    name:state.athlete.name,
    reason,
    retiredWeek:state.week,
    startAge:state.athlete.startAge??state.athlete.age,
    endAge:state.athlete.age,
    seasons:Number(years.toFixed(1)),
    weeks:state.week??0,
    games:summary.overall.played,
    wins:summary.overall.wins,
    losses:summary.overall.losses,
    pointsFor:summary.overall.pointsFor,
    pointsAgainst:summary.overall.pointsAgainst,
    titles:Object.values(summary.events).reduce((sum,entry)=>sum+entry.titles,0),
    medals:{
      gold:medalTotal(summary.events,'gold'),
      silver:medalTotal(summary.events,'silver'),
      bronze:medalTotal(summary.events,'bronze')
    },
    earnings:Object.values(summary.events).reduce((sum,entry)=>sum+entry.prize,0),
    rankingPoints:Object.values(summary.events).reduce((sum,entry)=>sum+entry.rankingPoints,0),
    finalRatings:{...state.athlete.formats},
    peakRatings:{...summary.ratingPeaks}
  };
}

export function retire(state,reason='voluntary'){
  if(state.retired)return {ok:false,state,message:'This career has already ended.'};
  const epilogue=buildEpilogue(state,reason);
  const allTimeEntry={...epilogue,id:`career-${state.seed}`};
  const next={
    ...state,
    retired:true,
    retiredWeek:state.week,
    retirementReason:reason,
    retiredAge:state.athlete.age,
    epilogue,
    allTimeBoard:[...(state.allTimeBoard??[]),allTimeEntry].slice(-20),
    pendingMatch:null,
    tournament:state.tournament?.finished?state.tournament:null
  };
  return {ok:true,state:next,message:`Career complete after ${epilogue.games} rated games and ${epilogue.titles} titles.`};
}

export function allTimeBoard(state){
  return [...(state.allTimeBoard??[])].sort((a,b)=>b.titles-a.titles||b.wins-a.wins||b.peakRatings.singles-a.peakRatings.singles);
}

export {ageSkillFactor};