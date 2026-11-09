// Age and physical decline.
//
// Age changes what a player can sustain. Young players carry a development
// factor below the adult baseline, the prime years run at full ability, and
// recovery and attainable skill decline after the peak.

import {FORMATS,ratingFromSkill} from './rating.js';

export const MIN_START_AGE=10;
export const MAX_START_AGE=80;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function normalizeStartAge(age,fallback=25){
  const value=Number(age);
  return Number.isFinite(value)?clamp(Math.round(value),MIN_START_AGE,MAX_START_AGE):fallback;
}

export function peakAgeFor(seed){
  return 25+(Math.abs(Math.trunc(Number(seed)||0))%16);
}

// Development below the adult baseline; decline follows the documented
// career curve after the physical peak.
export function ageSkillFactor(age){
  const value=Math.max(0,Number(age)||0);
  if(value<=10)return .55;
  if(value<=12)return .55+(value-10)*.04;
  if(value<=15)return .63+(value-12)*.06;
  if(value<=18)return .81+(value-15)*.05;
  if(value<=24)return .96+(value-18)*.0066666667;
  if(value<=40)return 1;
  if(value<=44)return .995-(value-41)*.008;
  if(value<=49)return .96-(value-45)*.01;
  if(value<=54)return .91-(value-50)*.01;
  if(value<=59)return .86-(value-55)*.01;
  if(value<=64)return .81-(value-60)*.012;
  if(value<=69)return .75-(value-65)*.014;
  if(value<=74)return .68-(value-70)*.016;
  if(value<=79)return .60-(value-75)*.018;
  // Eighty marks a pronounced late-life drop rather than a hard stop.
  return Math.max(.10,.42-(value-80)*.04);
}

export function recoveryAgeFactor(age){
  const value=Math.max(0,Number(age)||0);
  if(value<=40)return 1;
  if(value<=49)return .992-(value-41)*.008;
  if(value<=59)return .93-(value-50)*.009;
  if(value<=69)return .84-(value-60)*.01;
  if(value<=79)return .74-(value-70)*.012;
  return Math.max(.18,.48-(value-80)*.025);
}

export function ageCeiling(peak,age){
  return Math.max(2,Math.min(8,(Number(peak)||2)*ageSkillFactor(age)));
}

export function ratingCeilingFor(athlete){
  const ceilings={};
  for(const format of FORMATS){
    ceilings[format]=ageCeiling(athlete.peakFormats?.[format]??athlete.formats?.[format]??2,athlete.age);
  }
  return ceilings;
}

// Applies the personal best before the physical peak, then limits future
// growth to the age-adjusted ceiling once the player is past it.
export function capRatingForAge(athlete,format,nextRating){
  const peakFormats={...(athlete.peakFormats??athlete.formats??{})};
  const value=Number(nextRating)||2;
  const age=Number(athlete.age)||MIN_START_AGE;
  const peakAge=Math.max(40,Number(athlete.peakAge)||25);
  if(age<=peakAge)peakFormats[format]=Math.max(peakFormats[format]??2,value);
  const capped=age<=peakAge?value:Math.min(value,ageCeiling(peakFormats[format]??value,age));
  return {rating:capped,peakFormats};
}

export function noteSkillPeaks(athlete,ratings){
  const peakRatings={...(athlete.peakRatings??ratings??{})};
  for(const [key,value] of Object.entries(ratings??{}))peakRatings[key]=Math.max(peakRatings[key]??0,Number(value)||0);
  return peakRatings;
}

// Birthday update. Before the peak age this only changes the displayed age;
// after it, skills and format ratings are clamped to their new ceilings.
export function advanceAgeYear(athlete,week){
  if(week<=0||week%52!==0)return {athlete,aged:false,ageNote:''};
  const age=Number(athlete.age)+1;
  const next={...athlete,age};
  if(age<=Math.max(40,Number(athlete.peakAge??25)))return {athlete:next,aged:true,ageNote:`Age ${age}.`};
  const factor=ageSkillFactor(age);
  const peakRatings=athlete.peakRatings??athlete.ratings??{};
  const ratings={...athlete.ratings};
  for(const key of Object.keys(ratings))ratings[key]=clamp(Math.floor((peakRatings[key]??ratings[key])*factor),20,99);
  const formats={...athlete.formats};
  for(const format of FORMATS)formats[format]=ageCeiling(athlete.peakFormats?.[format]??formats[format],age);
  next.ratings=ratings;
  next.skillAverage=Object.values(ratings).reduce((sum,value)=>sum+value,0)/Math.max(1,Object.keys(ratings).length);
  next.formats=formats;
  return {athlete:next,aged:true,ageNote:`Age ${age}. Recovery and attainable skill have changed.`};
}

export function ageInYears(week){return (Number(week)||0)/52}

export {FORMATS,ratingFromSkill};