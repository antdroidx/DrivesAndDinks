// Activity planning.
//
// The calendar shows the cost of an event before the player commits to it.
// Energy and money stay separate, and the match estimate is based on the
// competition shape rather than a hidden future result.

import {eventFinancialCost,moneyBalance} from './finance.js?v=210';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=value=>Math.round(value);

export function eventEntryCost(state,event){
  const previous=(state?.eventEntries??[]).filter(entry=>
    entry.week===state?.week&&entry.eventId===event?.eventId
  ).length;
  const base=Number(event?.energyCost??event?.energy)||0;
  if(!previous)return base;
  return Math.max(4,Math.ceil(base*.2));
}

function projectedShapeMatches(event){
  const drawSize=Math.max(2,Number(event?.drawSize)||16);
  const shape=event?.shapes?.[0]??'tournament-bracket';
  const qualifier=Number(event?.qualifierSlots)>0?1:0;
  if(Number(event?.nightMatches)>0&&(shape==='round-robin-league'||shape==='mlp-style')){
    const series=Math.max(1,Number(event.nightMatches));
    return {min:series*2,max:series*3,expected:round(series*2.5),unit:'games',series};
  }
  if(shape==='tournament-bracket'){
    const rounds=Math.ceil(Math.log2(drawSize));
    const consolation=drawSize>=8?1:0;
    const min=1+qualifier;
    const max=rounds+qualifier+consolation;
    return {min,max,expected:round((min+max)/2),unit:'matches'};
  }
  if(shape==='tournament-double-elimination'){
    const rounds=Math.ceil(Math.log2(drawSize));
    const min=2+qualifier;
    const max=Math.max(min,rounds*2-1+qualifier);
    return {min,max,expected:round((min+max)/2),unit:'matches'};
  }
  if(shape==='round-robin-league'||shape==='mlp-style'){
    const series=Math.max(1,Math.min(15,drawSize-1));
    return {min:series*2,max:series*3,expected:round(series*2.5),unit:'games',series};
  }
  if(shape==='ladder-open'||shape==='ladder-fixed'){
    const rounds=clamp(Math.ceil(drawSize*.75),4,10);
    return {min:rounds,max:rounds,expected:rounds,unit:'matches'};
  }
  const rounds=clamp(Math.max(4,drawSize-1),4,10);
  return {min:rounds,max:rounds,expected:rounds,unit:'matches'};
}

export function projectedEventMatches(event){
  return projectedShapeMatches(event);
}

export function matchLoadLabel(load){
  if(!load)return 'match load unavailable';
  if(load.min===load.max)return `${load.expected} ${load.unit}`;
  return `${load.min}-${load.max} ${load.unit} · about ${load.expected}`;
}

export function projectEventLoad(state,event,{recovery=0}={}){
  const energy=eventEntryCost(state,event);
  const finance=eventFinancialCost(state,event);
  const matches=projectedEventMatches(event);
  const energyAfter=Math.max(0,(Number(state?.energy)||0)-energy);
  const moneyAfter=moneyBalance(state)-finance.total;
  return {
    energy,
    energyAfter,
    projectedNextEnergy:clamp(energyAfter+(Number(recovery)||0),0,100),
    recovery:Math.max(0,Number(recovery)||0),
    entryFee:finance.entry,
    travelCost:finance.travel,
    moneyCost:finance.total,
    moneyAfter,
    affordable:moneyAfter>=0,
    matches,
    matchLabel:matchLoadLabel(matches)
  };
}

export function weeklyActivityPlan(state,events=[],{trainingCost=0,recovery=0,trainingRemaining=0}={}){
  const available=events.filter(event=>event?.eligible?.ok&&event?.options?.length);
  const loads=available.map(event=>projectEventLoad(state,event,{recovery}));
  const cheapest=loads.reduce((best,load)=>!best||load.moneyCost<best.moneyCost?load:best,null);
  const lightest=loads.reduce((best,load)=>!best||load.energy<best.energy?load:best,null);
  return {
    energy:Math.max(0,Number(state?.energy)||0),
    energySpent:Math.max(0,100-(Number(state?.energy)||0)),
    money:moneyBalance(state),
    recovery:Math.max(0,Number(recovery)||0),
    trainingCost:Math.max(0,Number(trainingCost)||0),
    trainingRemaining:Math.max(0,Number(trainingRemaining)||0),
    eventOptions:loads.length,
    cheapest,
    lightest
  };
}
