// Shared career lifecycle policy.
//
// The player and the generated world use the same age response, activity
// cadence, regional bias, professional invitation gates and retirement
// pressure. This module deliberately contains rules rather than storage.

import {RATING_KEYS} from '../roster.js?v=211';
import {RATING_MIN,RATING_MAX} from './rating.js?v=211';
import {PRO_FLOOR_RATING} from './tour.js?v=211';
import {
  attributeAgeFactor,recoveryAgeFactor,trainingSessionsForAge,
  createDevelopmentProfile,capAttributeForAge
} from './age.js?v=211';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round3=value=>Math.round(value*1000)/1000;

export const PRO_INVITE_RATING=4.45;
export const PRO_INVITE_POINTS=360;
export const PRO_INVITE_MATCHES=28;

export const CPU_DETAIL_TIERS=Object.freeze({
  active:{id:'active',label:'Active',trainingEvery:2,matchEvery:1,eventEvery:2,trainingBoost:1.12,pointsBoost:1.08},
  circuit:{id:'circuit',label:'Circuit',trainingEvery:3,matchEvery:2,eventEvery:4,trainingBoost:1,pointsBoost:1},
  background:{id:'background',label:'Background',trainingEvery:6,matchEvery:6,eventEvery:10,trainingBoost:.88,pointsBoost:.8}
});

export const REGIONAL_TEMPLATES=Object.freeze({
  'north-america':{
    id:'north-america',
    participation:.94,
    training:.96,
    matchRate:.96,
    doubles:1.08,
    singles:.98,
    mixed:1,
    growth:1,
    turnover:.9,
    proPoints:.96
  },
  asia:{
    id:'asia',
    participation:1.06,
    training:1.08,
    matchRate:1.05,
    doubles:1,
    singles:1.06,
    mixed:1.02,
    growth:1.08,
    turnover:1.08,
    proPoints:1.05
  }
});

export function regionalTemplate(regionId){
  return REGIONAL_TEMPLATES[regionId]??REGIONAL_TEMPLATES['north-america'];
}

export function developmentProfileFor(seed,startAge){
  return createDevelopmentProfile(seed,startAge);
}

// Young athletes learn faster, while veterans rely on maintenance and
// tactical adaptation. The factor is used for training response, not as a
// hard rating cap.
export function potentialForStartAge(startAge,potential){
  const age=Number(startAge)||25;
  const bonus=age<=16?12:age<=20?9:age<=24?5:age<=32?0:age<=37?-2:-5;
  return clamp(Math.round((Number(potential)||55)+bonus),20,99);
}

export function trainingResponse(age,development={}){
  const value=clamp(Number(age)||25,10,90);
  let base;
  if(value<=16)base=1.5;
  else if(value<=20)base=1.32;
  else if(value<=24)base=1.16;
  else if(value<=30)base=1;
  else if(value<=35)base=.9;
  else if(value<=40)base=.78;
  else if(value<=45)base=.66;
  else if(value<=50)base=.54;
  else if(value<=60)base=.38;
  else base=.24;
  const learning=clamp(Number(development.learningRate)||1,.8,1.2);
  return round3(base*(.82+learning*.18));
}

export function fatigueFactor(age,development={}){
  return round3(clamp(recoveryAgeFactor(age,development),.15,1));
}

export function trainingCapacity(age){
  return trainingSessionsForAge(age);
}

export function activityCadence(detailId,template=REGIONAL_TEMPLATES['north-america'],age=25){
  const detail=CPU_DETAIL_TIERS[detailId]??CPU_DETAIL_TIERS.background;
  const matchRate=clamp(template.matchRate||1,.8,1.2);
  return {
    trainingEvery:Math.max(1,Math.round(detail.trainingEvery/(template.training||1))),
    matchEvery:Math.max(1,Math.round(detail.matchEvery/matchRate)),
    eventEvery:Math.max(1,Math.round(detail.eventEvery/(template.participation||1))),
    trainingBoost:detail.trainingBoost*(template.training||1),
    pointsBoost:detail.pointsBoost*(template.proPoints||1)
  };
}

export function bestFormatRating(formats){
  return Math.max(RATING_MIN,...Object.values(formats??{}).filter(value=>Number.isFinite(value)));
}

export function careerStage({rating=0,contract='none',tourPoints=0,proInviteWeek=null,retired=false}={}){
  if(retired)return 'retired';
  if(contract&&contract!=='none')return 'professional';
  if(proInviteWeek!==null)return 'tour-invited';
  if(rating>=4.2||tourPoints>=90)return 'challenger';
  if(tourPoints>0||rating>=3.5)return 'amateur';
  return 'prospect';
}

export function proInviteStatus({rating=0,tourPoints=0,matches=0,age=25,potential=0,proInviteWeek=null}={}){
  if(proInviteWeek!==null)return {invited:true,week:proInviteWeek,reason:'already invited'};
  const youthPromise=age<=20&&potential>=58;
  const ageGate=youthPromise?.68:age<23?.9:age<=32?1:age<=37?1.08:1.55;
  const ratingBar=youthPromise?4.05:age<18?4.2:age<23?4.3:age<=32?PRO_INVITE_RATING:age<=37?4.5:4.8;
  const ratingReady=rating>=ratingBar;
  const pointsReady=tourPoints>=PRO_INVITE_POINTS*ageGate;
  const matchReady=matches>=PRO_INVITE_MATCHES*ageGate;
  const fastTrackBar=youthPromise?4.4:age>=38?5.1:age<23?4.7:PRO_FLOOR_RATING;
  const fastTrack=rating>=fastTrackBar&&tourPoints>=150*ageGate&&matches>=12*ageGate;
  const invited=fastTrack||(ratingReady&&pointsReady&&matchReady);
  return {
    invited,
    week:null,
    reason:invited
      ?(fastTrack?'rating fast track':'tour points and match experience')
      :ratingReady&&!pointsReady?'needs more tour points'
      :ratingReady&&!matchReady?'needs more match experience'
      :'below the tour invitation bar'
  };
}

export function retirementRisk({age=25,rating=3.5,development={},matches=0}={}){
  const value=Number(age)||25;
  if(value<50)return 0;
  const physical=clamp(1-(rating-2)/6,0,1);
  const late=clamp((value-50)/24,0,1);
  const experienceRelief=clamp(matches/250,0,.35);
  return round3(clamp(.015+late*.2+physical*.08-experienceRelief,0,.72));
}

export function ageAdjustedAttribute(athlete,key,value){
  return capAttributeForAge(athlete,key,value);
}

export function lifecycleSummary(record){
  const rating=bestFormatRating(record?.formats);
  return {
    stage:careerStage({...record,rating}),
    rating:round3(rating),
    age:Number(record?.age)||0,
    tourPoints:Number(record?.tourPoints)||0,
    matches:Number(record?.matches)||0,
    events:Number(record?.events)||0,
    proInviteWeek:record?.proInviteWeek??null,
    contract:record?.contract??'none',
    retired:Boolean(record?.retired)
  };
}
