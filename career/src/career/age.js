// Age, development and physical decline.
//
// A player has a deterministic development profile. Technical and tactical
// skills can improve at every age; movement peaks earlier, power holds longer,
// and training capacity falls independently. Format ratings remain
// results-driven and are not hard-capped by age.

import {FORMATS} from './rating.js?v=211';
import {RATING_KEYS} from '../roster.js?v=211';

export const MIN_START_AGE=10;
export const MAX_START_AGE=80;
export const PHYSICAL_ATTRIBUTES=Object.freeze(['agility','power']);
export const ADAPTIVE_ATTRIBUTES=Object.freeze(['courtIQ','aggression']);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function normalizeStartAge(age,fallback=25){
  const value=Number(age);
  return Number.isFinite(value)?clamp(Math.round(value),MIN_START_AGE,MAX_START_AGE):fallback;
}

// Players who start young normally peak from 25-35. Late starters can peak
// later as technique catches up, though the delayed peak is capped at 45.
export function peakAgeFor(seed,startAge=18){
  const natural=25+(Math.abs(Math.trunc(Number(seed)||0))%11);
  const started=Number(startAge)||18;
  return clamp(Math.max(natural,started+8),natural,45);
}

export function createDevelopmentProfile(seed,startAge=18){
  const value=Math.abs(Math.trunc(Number(seed)||0));
  return {
    peakAge:peakAgeFor(value,startAge),
    learningRate:.92+(value%9)*.02,
    agilityDeclineRate:.85+(value%31)*.01,
    powerDeclineStart:50+(value%6),
    recoveryResilience:.90+(value%21)*.01
  };
}

export function developmentAgeFactor(age){
  const value=Math.max(0,Number(age)||0);
  if(value<=10)return .55;
  if(value<=12)return .55+(value-10)*.04;
  if(value<=15)return .63+(value-12)*.06;
  if(value<=18)return .81+(value-15)*.05;
  if(value<=24)return .96+(value-18)*.0066666667;
  return 1;
}

// Movement begins its normal decline after 35. A player profile adjusts how
// quickly that decline is felt.
export function agilityAgeFactor(age,profile={}){
  const value=Math.max(0,Number(age)||0);
  const development=developmentAgeFactor(value);
  if(value<=35)return development;
  let base;
  if(value<=40)base=.99-(value-36)*.01;
  else if(value<=45)base=.94-(value-41)*.015;
  else if(value<=50)base=.87-(value-46)*.02;
  else if(value<=55)base=.78-(value-51)*.022;
  else if(value<=60)base=.68-(value-56)*.024;
  else if(value<=65)base=.57-(value-61)*.026;
  else if(value<=70)base=.45-(value-66)*.028;
  else if(value<=75)base=.32-(value-71)*.03;
  else if(value<=79)base=.19-(value-76)*.03;
  else base=Math.max(.08,.09-(value-80)*.02);
  const rate=profile.agilityDeclineRate??1;
  return Math.max(.08,1-(1-base)*rate);
}

// Power holds through age 49. Individual players keep it for different
// amounts of time into their fifties.
export function powerAgeFactor(age,profile={}){
  const value=Math.max(0,Number(age)||0);
  const development=developmentAgeFactor(value);
  const declineStart=Math.max(50,Number(profile.powerDeclineStart)||50);
  if(value<declineStart)return development;
  const over=value-declineStart;
  const rate=profile.powerDeclineRate??1;
  return Math.max(.20,1-over*.018*rate);
}

export function technicalAgeFactor(key,age,maintenance=0){
  if(ADAPTIVE_ATTRIBUTES.includes(key))return 1;
  const value=Math.max(0,Number(age)||0);
  let base=1;
  if(value<=55)base=1;
  else if(value<=60)base=.99-(value-56)*.006;
  else if(value<=65)base=.96-(value-61)*.012;
  else if(value<=70)base=.90-(value-66)*.016;
  else if(value<=75)base=.82-(value-71)*.018;
  else if(value<=79)base=.73-(value-76)*.02;
  else base=Math.max(.10,.63-(value-80)*.03);
  const maintained=Math.min(1,Math.max(0,Number(maintenance)||0));
  return 1-(1-base)*(1-maintained*.75);
}

function maintainedDecline(base,maintenance,effect){
  const maintained=Math.min(1,Math.max(0,Number(maintenance)||0));
  return 1-(1-base)*(1-maintained*effect);
}

export function attributeAgeFactor(key,age,profile={},maintenance=0){
  if(age<25){
    const development=developmentAgeFactor(age);
    const learning=profile.learningRate??1;
    return Math.min(1,development*(.96+learning*.04));
  }
  if(key==='agility')return maintainedDecline(agilityAgeFactor(age,profile),maintenance,.55);
  if(key==='power')return maintainedDecline(powerAgeFactor(age,profile),maintenance,.55);
  return technicalAgeFactor(key,age,maintenance);
}

// Soft physical-performance estimate used for retirement advice. It is not a
// hard cap on the results-driven format rating.
export function ageSkillFactor(age,profile={}){
  const development=developmentAgeFactor(age);
  return development*(agilityAgeFactor(age,profile)*.60+powerAgeFactor(age,profile)*.40);
}

export function recoveryAgeFactor(age,profile={}){
  const value=Math.max(0,Number(age)||0);
  let base;
  if(value<=29)base=1;
  else if(value<=39)base=.995-(value-30)*.005;
  else if(value<=49)base=.945-(value-40)*.008;
  else if(value<=59)base=.865-(value-50)*.009;
  else if(value<=69)base=.775-(value-60)*.01;
  else if(value<=79)base=.675-(value-70)*.012;
  else base=Math.max(.18,.45-(value-80)*.025);
  return Math.min(1,base*(profile.recoveryResilience??1));
}

export function trainingSessionsForAge(age){
  const value=Number(age)||25;
  if(value<=35)return 4;
  if(value<=45)return 3;
  if(value<=60)return 2;
  return 1;
}

export function ageCeiling(peak,age,profile={}){
  return Math.max(2,Math.min(8,(Number(peak)||2)*ageSkillFactor(age,profile)));
}

export function ratingCeilingFor(athlete){
  const ceilings={};
  for(const format of FORMATS){
    ceilings[format]=ageCeiling(athlete.peakFormats?.[format]??athlete.formats?.[format]??2,athlete.age,athlete.development);
  }
  return ceilings;
}

// Rating improvements are never blocked by age. Physical attributes feed the
// match engine, so aging affects performance indirectly.
export function capRatingForAge(athlete,format,nextRating){
  const peakFormats={...(athlete.peakFormats??athlete.formats??{})};
  const value=Number(nextRating)||2;
  peakFormats[format]=Math.max(peakFormats[format]??2,value);
  return {rating:value,peakFormats};
}

export function capAttributeForAge(athlete,key,value){
  const next=Number(value)||0;
  const age=Number(athlete.age)||25;
  if(age<25)return next;
  const maintenance=athlete.maintenance?.[key]??0;
  const factor=attributeAgeFactor(key,age,athlete.development,maintenance);
  if(factor>=1)return next;
  const peak=athlete.peakRatings?.[key]??next;
  return Math.min(next,Math.floor(peak*factor));
}

export function noteTrainingMaintenance(athlete,keys,amount=.06){
  const maintenance={...(athlete.maintenance??{})};
  for(const key of keys){
    if(RATING_KEYS.includes(key))maintenance[key]=Math.min(1,(maintenance[key]??0)+amount);
  }
  return maintenance;
}

export function noteSkillPeaks(athlete,ratings){
  const peakRatings={...(athlete.peakRatings??ratings??{})};
  for(const [key,value] of Object.entries(ratings??{}))peakRatings[key]=Math.max(peakRatings[key]??0,Number(value)||0);
  return peakRatings;
}

// Birthday update. Only movement and power are clamped. Technical skills may
// continue to improve through training at any age.
export function advanceAgeYear(athlete,week){
  if(week<=0||week%52!==0)return {athlete,aged:false,ageNote:''};
  const age=Number(athlete.age)+1;
  const profile=athlete.development??createDevelopmentProfile(athlete.id??0,athlete.startAge??age);
  const next={...athlete,age,development:profile};
  const peakRatings=athlete.peakRatings??athlete.ratings??{};
  const maintenance=Object.fromEntries(RATING_KEYS.map(key=>[key,Math.max(0,(athlete.maintenance?.[key]??0)-.08)]));
  next.maintenance=maintenance;
  const ratings={...athlete.ratings};
  for(const key of RATING_KEYS){
    if(ratings[key]==null)continue;
    const ceiling=clamp(Math.floor((peakRatings[key]??ratings[key])*attributeAgeFactor(key,age,profile,maintenance[key])),0,99);
    ratings[key]=Math.min(ratings[key],ceiling);
  }
  next.ratings=ratings;
  next.skillAverage=Object.values(ratings).reduce((sum,value)=>sum+value,0)/Math.max(1,Object.keys(ratings).length);
  const changed=RATING_KEYS.filter(key=>ratings[key]!==athlete.ratings?.[key]);
  return {athlete:next,aged:true,ageNote:`Age ${age}.${changed.length?' '+changed.join(' and ')+' changed with age.':''}`};
}

export function ageInYears(week){return (Number(week)||0)/52}

export {FORMATS,RATING_KEYS};