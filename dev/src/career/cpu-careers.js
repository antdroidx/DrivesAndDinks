// Persistent CPU careers and dynamic world state.
//
// The generated population remains reproducible from a seed. This module
// stores compact career deltas only for active and circuit competitors while
// background athletes progress deterministically from their stable identity.
// The result is a world that can age, improve, be invited to the pro tour,
// change tiers and retire without turning every save into a full database.

import {RATING_KEYS} from '../roster.js?v=204';
import {seededRandom} from '../competition.js?v=204';
import {
  buildRegionSkills,buildAthlete,buildAthleteSkill,buildClubIndex,mixSeed
} from './population.js?v=204';
import {RATING_MIN,RATING_MAX,FORMATS,formatSkill,ratingInFormat,simulateOutcome,updateRating} from './rating.js?v=204';
import {addPoints,pointsInWindow,PRO_FLOOR_RATING} from './tour.js?v=204';
import {
  CPU_DETAIL_TIERS,REGIONAL_TEMPLATES,regionalTemplate,activityCadence,
  trainingResponse,bestFormatRating,careerStage,proInviteStatus,retirementRisk,
  developmentProfileFor
} from './career-lifecycle.js?v=204';
import {capAttributeForAge,noteSkillPeaks,noteTrainingMaintenance,attributeAgeFactor} from './age.js?v=204';
import {emptyInjuries,normalizeInjuries,activeInjuries,createInjury,healInjuries} from './injuries.js?v=204';

export const CPU_WORLD_VERSION=1;
export const CPU_ACTIVE_LIMIT=160;
export const CPU_CIRCUIT_LIMIT=420;
export const CPU_HISTORY_LIMIT=80;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round3=value=>Math.round(value*1000)/1000;
const pick=(items,random)=>items[Math.min(items.length-1,Math.floor(random()*items.length))];

const ENTRANT_NAMES=['Ari Chen','Noah Park','Mina Torres','Luca Reed','Sana Patel','Theo Kim','Ivy Morgan','Mateo Silva','Rina Shah','Evan Brooks','Zoe Nguyen','Owen Price'];
const SKILL_CACHE=new Map();

function skillsForWeek(seed,regionId,week){
  const year=Math.max(0,Math.floor(week/52));
  const key=`${seed}:${regionId}:${year}`;
  let skills=SKILL_CACHE.get(key);
  if(!skills){
    skills=buildRegionSkills(seed,regionId,year*52);
    SKILL_CACHE.set(key,skills);
    if(SKILL_CACHE.size>8)SKILL_CACHE.delete(SKILL_CACHE.keys().next().value);
  }
  return skills;
}

export function emptyCpuWorld(){
  return {
    version:CPU_WORLD_VERSION,
    lastWeek:null,
    records:{},
    retired:[],
    entrants:[],
    stories:[],
    clubs:[],
    tournaments:[],
    limits:{active:CPU_ACTIVE_LIMIT,circuit:CPU_CIRCUIT_LIMIT},
    summary:{
      population:0,active:0,circuit:0,background:0,professionals:0,
      tourInvites:0,retired:0,entrants:0,averageAge:0,averageRating:0
    },
    circuit:{promoted:0,demoted:0,waves:0,retired:0,entrants:0,proInvites:0,injuries:0,recoveries:0}
  };
}

function ageBand(age){
  const value=Number(age)||0;
  if(value<20)return 'u20';
  if(value<30)return '20s';
  if(value<40)return '30s';
  if(value<50)return '40s';
  return '50+';
}

function compactRecord(record){
  return {
    id:record.id,
    name:record.name,
    gender:record.gender,
    regionId:record.regionId,
    cityId:record.cityId,
    clubId:record.clubId,
    detail:record.detail,
    startAge:record.startAge,
    age:record.age,
    development:record.development,
    peakRatings:record.peakRatings,
    maintenance:record.maintenance,
    ratings:record.ratings,
    formats:record.formats,
    potential:record.potential,
    matches:record.matches,
    wins:record.wins,
    events:record.events,
    tourPoints:record.tourPoints,
    tourPointsHistory:record.tourPointsHistory,
    contract:record.contract,
    proInviteWeek:record.proInviteWeek,
    proWeek:record.proWeek,
    fatigue:record.fatigue??0,
    form:record.form??0,
    injuries:normalizeInjuries(record.injuries),
    equipmentId:record.equipmentId??'allcourt-hybrid',
    sponsorId:record.sponsorId??null,
    teamId:record.teamId??null,
    retired:record.retired,
    retiredWeek:record.retiredWeek,
    lastActiveWeek:record.lastActiveWeek,
    lastTrainedWeek:record.lastTrainedWeek,
    lastMatchWeek:record.lastMatchWeek,
    lastEventWeek:record.lastEventWeek,
    stage:record.stage
  };
}

export function createCpuCareerRecord(skill,week=0,detail='background',regionId='north-america'){
  const development=skill.development??developmentProfileFor(mixSeed(skill.id,'cpu-development'),skill.startAge??skill.age??25);
  const peakRatings=skill.peakRatings??{...skill.ratings};
  const maintenance=skill.maintenance??Object.fromEntries(RATING_KEYS.map(key=>[key,0]));
  const ratings={...(skill.ratings??{})};
  const formats={...(skill.formats??Object.fromEntries(FORMATS.map(format=>[format,ratingInFormat(ratings,format)])))};
  const record={
    id:skill.id,
    name:skill.name??skill.id,
    gender:skill.gender??'male',
    regionId:skill.regionId??regionId,
    cityId:skill.cityId??null,
    clubId:skill.clubId??null,
    detail:CPU_DETAIL_TIERS[detail]?detail:'background',
    startAge:skill.startAge??skill.age??25,
    age:skill.age??skill.startAge??25,
    development,
    peakRatings,
    maintenance,
    ratings,
    formats,
    potential:skill.potential??Math.max(...Object.values(peakRatings)),
    matches:0,wins:0,events:0,
    tourPoints:0,tourPointsHistory:[],
    contract:'none',proInviteWeek:null,proWeek:null,
    fatigue:0,form:0,injuries:emptyInjuries(),
    equipmentId:'allcourt-hybrid',sponsorId:null,teamId:null,
    retired:false,retiredWeek:null,
    lastActiveWeek:week,lastTrainedWeek:null,lastMatchWeek:null,lastEventWeek:week,
    stage:'prospect'
  };
  record.stage=careerStage({rating:bestFormatRating(formats),contract:record.contract,tourPoints:0,proInviteWeek:null});
  return compactRecord(record);
}

function recordSkill(record){
  return {
    id:record.id,name:record.name,gender:record.gender,
    regionId:record.regionId,cityId:record.cityId,clubId:record.clubId,
    startAge:record.startAge,age:record.age,development:record.development,
    peakRatings:record.peakRatings,maintenance:record.maintenance,
    ratings:record.ratings,formats:record.formats,potential:record.potential
  };
}

function athleteForRecord(seed,record,week){
  const club=record.clubId?buildClubIndex(seed,record.regionId).find(entry=>entry.id===record.clubId):null;
  if(!club)return null;
  const index=Number(String(record.id).match(/-a(\d+)$/)?.[1]??0);
  return buildAthlete(seed,club,index,week,record.startAge);
}

function scoreForSelection(skill,random){
  return bestFormatRating(skill.formats)+(skill.potential??0)*.04+(random()-.5)*.18;
}

export function createCpuWorld(seed,regionId,week=0,{activeLimit=CPU_ACTIVE_LIMIT,circuitLimit=CPU_CIRCUIT_LIMIT}={}){
  const random=seededRandom(mixSeed(seed,`cpu-world:${regionId}:${week}`));
  const skills=skillsForWeek(seed,regionId,week);
  const ranked=skills.map(skill=>({skill,score:scoreForSelection(skill,random)})).sort((a,b)=>b.score-a.score).map(entry=>entry.skill);
  const active=ranked.slice(0,Math.max(0,activeLimit));
  const circuit=ranked.slice(active.length,active.length+Math.max(0,circuitLimit));
  const records={};
  for(const skill of active)records[skill.id]=createCpuCareerRecord(skill,week,'active',regionId);
  for(const skill of circuit)records[skill.id]=createCpuCareerRecord(skill,week,'circuit',regionId);
  const world=emptyCpuWorld();
  world.records=records;
  world.lastWeek=week;
  world.limits={active:Math.max(0,activeLimit),circuit:Math.max(0,circuitLimit)};
  world.summary=cpuSummary(world,skills,week);
  world.clubs=clubOutlook(seed,regionId,week,skills,regionalTemplate(regionId));
  world.tournaments=tournamentOutlook(seed,regionId,week,world.clubs,regionalTemplate(regionId));
  return world;
}

function currentRecordRating(record,format,stored,week){
  const base=record.formats?.[format]??RATING_MIN;
  if(!stored)return base;
  return clamp(Number(stored[0])||base,RATING_MIN,RATING_MAX);
}

function applyTraining(record,skill,week,cadence,template,random){
  const since=record.lastTrainedWeek??week-cadence.trainingEvery;
  if(week-since<cadence.trainingEvery)return record;
  const age=skill.age??record.age;
  const focus=RATING_KEYS.slice().sort((a,b)=>(record.ratings[a]??0)-(record.ratings[b]??0))[0]??'control';
  const response=trainingResponse(age,record.development);
  const gain=(age<20?.032:age<25?.025:.018)*response*cadence.trainingBoost*(template.training||1);
  const next={...record,ratings:{...record.ratings},maintenance:{...record.maintenance}};
  const factor=attributeAgeFactor(focus,age,record.development,next.maintenance[focus]??0);
  const ceiling=Math.floor((record.peakRatings?.[focus]??99)*factor);
  next.ratings[focus]=clamp(round3((next.ratings[focus]??0)+gain),0,ceiling);
  next.maintenance=noteTrainingMaintenance(next,[focus,'control'],.015*response);
  next.lastTrainedWeek=week;
  return next;
}

function eventPointsFor(record,format,week,random,template,detail){
  const rating=bestFormatRating(record.formats);
  const tier=rating>=PRO_FLOOR_RATING?'pro':rating>=4.2?'challenger':'local';
  const championPoints=tier==='pro'?800:tier==='challenger'?240:60;
  const wins=record.wins;
  const matches=Math.max(1,record.matches);
  const winRate=wins/matches;
  const place=clamp(1+Math.floor((1-winRate)*7+random()*2),1,8);
  const points=Math.round(championPoints*(place===1?1:place===2?.8:place<=4?.55:place<=8?.25:.08)*(template.proPoints||1)*(detail.pointsBoost||1));
  return {tier,place,points};
}

function cpuInjuryRisk(record,age){
  const detail=record.detail==='active'?1.2:record.detail==='circuit'?.65:.3;
  const fatigue=(record.fatigue??0)/100;
  const ageRisk=age>=45?1.45:age>=38?1.2:1;
  return clamp((.008+fatigue*.018)*detail*ageRisk,.001,.055);
}

function attachCpuInjury(record,week,random){
  const severity=random()<.012?'major':random()<.16?'moderate':'minor';
  const injury=createInjury({week,activity:'cpu-match',severity,random});
  const injuries=normalizeInjuries(record.injuries);
  return {
    ...record,
    injuries:{...injuries,active:[...injuries.active,injury].slice(-3),lastInjuryWeek:week}
  };
}

function applyMatch(record,skill,week,cadence,template,random){
  const since=record.lastMatchWeek??week-cadence.matchEvery;
  if(week-since<cadence.matchEvery)return record;
  const format=random()<.54?'doubles':random()<.6?'singles':'mixed';
  const rating=currentRecordRating(record,format,null,week);
  const skillValue=formatSkill(record.ratings,format);
  const opponentRating=clamp(rating+(random()-.5)*.55,RATING_MIN,RATING_MAX);
  const opponentSkill=clamp(skillValue+(random()-.5)*7,0,99);
  const outcome=simulateOutcome({mySkill:skillValue,theirSkill:opponentSkill,myRating:rating,theirRating:opponentRating,random});
  const update=updateRating({
    rating,
    opponentRatings:[opponentRating],
    actualMyPoints:outcome.myPoints,
    actualOpponentPoints:outcome.opponentPoints,
    matchType:'tournament',
    matchesPlayed:record.matches
  });
  const ageScale=skill.age<20?.28:skill.age<25?.2:skill.age<=32?.16:skill.age<=37?.14:.1;
  const maxDelta=skill.age<20?.055:.04;
  const ratingDelta=clamp((update.rating-rating)*ageScale,-maxDelta,maxDelta);
  const next={
    ...record,
    formats:{...record.formats,[format]:round3(clamp(rating+ratingDelta,RATING_MIN,RATING_MAX))},
    matches:record.matches+1,
    wins:record.wins+(outcome.myPoints>outcome.opponentPoints?1:0),
    fatigue:clamp((record.fatigue??0)+7+Math.round(random()*10),0,100),
    form:clamp((record.form??0)+(outcome.myPoints>outcome.opponentPoints?5:-4),-20,20),
    lastMatchWeek:week,
    lastActiveWeek:week
  };
  const eventCadence=record.detail==='active'?cadence.eventEvery:cadence.eventEvery;
  if(week-(record.lastEventWeek??week-eventCadence)>=eventCadence){
    const event=eventPointsFor(next,format,week,random,template,CPU_DETAIL_TIERS[record.detail]);
    const history=addPoints(next.tourPointsHistory,week,event.points);
    next.events=next.events+1;
    next.tourPointsHistory=history;
    next.tourPoints=pointsInWindow(history,week);
    next.lastEventWeek=week;
  }
  return random()<cpuInjuryRisk(next,skill.age??record.age)?attachCpuInjury(next,week,random):next;
}

export function advanceCpuCareer(record,skill,week,random,template=REGIONAL_TEMPLATES['north-america']){
  if(!record||record.retired)return record;
  const detail=CPU_DETAIL_TIERS[record.detail]??CPU_DETAIL_TIERS.background;
  const cadence=activityCadence(record.detail,template,skill.age??record.age);
  const healed=healInjuries({...record,week},week);
  let next={
    ...healed.state,age:skill.age??record.age,development:skill.development??record.development,
    ratings:{...record.ratings},formats:{...record.formats},maintenance:{...record.maintenance},
    fatigue:clamp((record.fatigue??0)-Math.max(4,Math.round(6+trainingResponse(skill.age??record.age,record.development)*6)),0,100),
    form:clamp((record.form??0)*.85,-20,20)
  };
  if(!activeInjuries(next).length){
    next=applyTraining(next,skill,week,cadence,template,random);
    next=applyMatch(next,skill,week,cadence,template,random);
  }
  const best=bestFormatRating(next.formats);
  const invite=proInviteStatus({rating:best,tourPoints:next.tourPoints,matches:next.matches,age:next.age,potential:next.potential,proInviteWeek:next.proInviteWeek});
  if(invite.invited&&next.proInviteWeek==null)next.proInviteWeek=week;
  if(next.proInviteWeek!=null&&next.contract==='none'&&next.tourPoints>=800)next.contract='futures';
  if(next.contract==='futures'&&next.tourPoints>=1800)next.contract='standard';
  if(next.contract==='standard'&&next.tourPoints>=3400)next.contract='gold';
  if(next.proInviteWeek!=null&&next.proWeek==null&&next.contract!=='none')next.proWeek=week;
  const risk=retirementRisk({age:next.age,rating:best,development:next.development,matches:next.matches});
  if(next.age>=52&&random()<risk){
    next.retired=true;
    next.retiredWeek=week;
  }
  next.stage=careerStage({rating:best,contract:next.contract,tourPoints:next.tourPoints,proInviteWeek:next.proInviteWeek,retired:next.retired});
  return compactRecord(next);
}

function makeEntrant(seed,regionId,week,index,template){
  const random=seededRandom(mixSeed(seed,`entrant:${regionId}:${week}:${index}`));
  const startAge=random()<.32?15+Math.floor(random()*7):18+Math.floor(random()*26);
  const skill={
    id:`entrant-${regionId}-${week}-${index}`,
    name:ENTRANT_NAMES[(week+index)%ENTRANT_NAMES.length],
    gender:random()<.5?'female':'male',
    regionId,
    cityId:null,clubId:null,
    startAge,age:startAge,
    development:developmentProfileFor(mixSeed(seed,`entrant-development:${week}:${index}`),startAge),
    ratings:Object.fromEntries(RATING_KEYS.map(key=>[key,Math.round(38+random()*18)])),
    peakRatings:Object.fromEntries(RATING_KEYS.map(key=>[key,Math.round(52+random()*28)])),
    maintenance:Object.fromEntries(RATING_KEYS.map(key=>[key,0])),
    formats:{singles:3.1+random()*.5,doubles:3.1+random()*.5,mixed:3.1+random()*.5},
    potential:Math.round(55+random()*25)
  };
  return createCpuCareerRecord(skill,week,random()<.55?'circuit':'active',regionId);
}

function clubOutlook(seed,regionId,week,skills,template){
  const clubs=buildClubIndex(seed,regionId);
  const byClub=new Map();
  for(const skill of skills){
    const entry=byClub.get(skill.clubId)??{count:0,rating:0};
    entry.count++;
    entry.rating+=bestFormatRating(skill.formats);
    byClub.set(skill.clubId,entry);
  }
  return clubs.map((club,index)=>{
    const entry=byClub.get(club.id)??{count:0,rating:0};
    const activity=entry.count?entry.rating/entry.count:3.5;
    const phase=(week+index)%52;
    const growth=clamp((activity-3.5)*.08+(template.growth-1)*.5+(phase<26?.08:-.04),-.25,.35);
    return {
      id:club.id,name:club.name,cityId:club.cityId,regionId,
      members:entry.count,averageRating:round3(activity),
      growth:round3(growth),capacity:Math.max(12,Math.round(club.memberCount*(1+growth))),
      tournaments:Math.max(1,Math.round((club.memberCount/18)*(1+growth))),
      phase:ageBand(Math.round(25+growth*10))
    };
  });
}

function tournamentOutlook(seed,regionId,week,clubs,template){
  const ranked=[...clubs].sort((a,b)=>(b.averageRating-a.averageRating)||(b.capacity-a.capacity));
  return ranked.slice(0,12).map((club,index)=>{
    const random=seededRandom(mixSeed(seed,`cpu-tournament:${regionId}:${club.id}:${Math.floor(week/4)}`));
    const tier=club.averageRating>=4.6?'open':club.averageRating>=4.15?'challenger':'local';
    const cadence=tier==='open'?12:tier==='challenger'?8:4;
    const slot=Math.floor(week/cadence)%4;
    return {
      id:`cpu-event:${regionId}:${club.id}:${slot}:${index}`,
      label:`${club.name} ${tier==='open'?'Open Circuit':tier==='challenger'?'Challenger':'Club Cup'}`,
      clubId:club.id,cityId:club.cityId,regionId,tier,
      fieldSize:tier==='open'?32:tier==='challenger'?16:8,
      startsWeek:week+2+Math.floor(random()*4),
      participation:round3(clamp(.45+(club.averageRating-3.5)*.12+(template.participation-1)*.08,.3,.95)),
      projectedEntries:Math.max(8,Math.round((tier==='open'?32:tier==='challenger'?16:8)*clamp(club.capacity/160,.45,1)))
    };
  });
}

function cpuSummary(world,skills,week){
  const records=Object.values(world.records);
  const ages=skills.map(skill=>skill.age??0);
  const ratings=skills.map(skill=>bestFormatRating(skill.formats));
  const invited=records.filter(record=>record.proInviteWeek!=null).length;
  const pros=records.filter(record=>record.contract&&record.contract!=='none').length;
  return {
    population:skills.length,
    active:records.filter(record=>record.detail==='active').length,
    circuit:records.filter(record=>record.detail==='circuit').length,
    background:Math.max(0,skills.length-records.length),
    professionals:pros,
    tourInvites:invited,
    injured:records.filter(record=>activeInjuries({...record,week}).length).length,
    retired:world.retired.length,
    entrants:world.entrants.length,
    averageAge:ages.length?round3(ages.reduce((sum,value)=>sum+value,0)/ages.length):0,
    averageRating:ratings.length?round3(ratings.reduce((sum,value)=>sum+value,0)/ratings.length):0
  };
}

export function advanceCpuWorld(cpuWorld,{seed,regionId,week,ratings={}}={}){
  const previous=cpuWorld&&cpuWorld.version===CPU_WORLD_VERSION?cpuWorld:emptyCpuWorld();
  const random=seededRandom(mixSeed(seed,`cpu-advance:${regionId}:${week}`));
  const skills=skillsForWeek(seed,regionId,week);
  const skillById=new Map(skills.map(skill=>[skill.id,skill]));
  const template=regionalTemplate(regionId);
  const records={...(previous.records??{})};
  const retired=[...(previous.retired??[])];
  const entrants=[...(previous.entrants??[])];
  const stories=[...(previous.stories??[])];
  const circuit={...(previous.circuit??{promoted:0,demoted:0,waves:0,retired:0,entrants:0,proInvites:0,injuries:0,recoveries:0})};

  for(const id of Object.keys(records)){
    const record=records[id];
    const beforeInjured=activeInjuries({...record,week}).length>0;
    const skill=skillById.get(id)??athleteForRecord(seed,record,week)??recordSkill(record);
    if(!skill){
      record.retired=true;
      record.retiredWeek=record.retiredWeek??week;
    }
    const before=record;
    const next=advanceCpuCareer(record,skill,week,random,template);
    const afterInjured=activeInjuries({...next,week}).length>0;
    if(!beforeInjured&&afterInjured){
      circuit.injuries=(circuit.injuries??0)+1;
      stories.push({week,type:'injury',id,name:next.name,age:next.age});
    }
    if(beforeInjured&&!afterInjured){
      circuit.recoveries=(circuit.recoveries??0)+1;
      stories.push({week,type:'recovery',id,name:next.name,age:next.age});
    }
    if(next.proInviteWeek!=null&&before.proInviteWeek==null){
      circuit.proInvites++;
      stories.push({week,type:'pro-invite',id,name:next.name,age:next.age});
    }
    if(next.retired&&!before.retired){
      circuit.retired++;
      retired.push({week,id,name:next.name,age:next.age,stage:next.stage});
      stories.push({week,type:'retirement',id,name:next.name,age:next.age});
    }
    records[id]=next;
  }

  const live=Object.values(records).filter(record=>!record.retired);
  if(week%13===0){
    const active=live.filter(record=>record.detail==='active').sort((a,b)=>bestFormatRating(b.formats)-bestFormatRating(a.formats));
    const circuitPlayers=live.filter(record=>record.detail==='circuit').sort((a,b)=>bestFormatRating(b.formats)-bestFormatRating(a.formats));
    for(const record of circuitPlayers.slice(0,3)){
      if(bestFormatRating(record.formats)>=4.45){
        records[record.id]={...record,detail:'active'};
        circuit.promoted++;
        stories.push({week,type:'promotion',id:record.id,name:record.name,age:record.age});
      }
    }
    for(const record of active.slice(-2)){
      if(record.age>48||bestFormatRating(record.formats)<3.75){
        records[record.id]={...record,detail:'circuit'};
        circuit.demoted++;
        stories.push({week,type:'demotion',id:record.id,name:record.name,age:record.age});
      }
    }
  }

  const targetActive=Math.max(0,Number(previous.limits?.active??CPU_ACTIVE_LIMIT));
  const targetCircuit=Math.max(0,Number(previous.limits?.circuit??CPU_CIRCUIT_LIMIT));
  const currentActive=Object.values(records).filter(record=>!record.retired&&record.detail==='active').length;
  const currentCircuit=Object.values(records).filter(record=>!record.retired&&record.detail==='circuit').length;
  let newEntrants=0;
  let liveCount=currentActive+currentCircuit;
  while(liveCount<targetActive+targetCircuit&&newEntrants<12){
    const entrant=makeEntrant(seed,regionId,week,newEntrants,template);
    records[entrant.id]=entrant;
    entrants.push({week,id:entrant.id,name:entrant.name,age:entrant.age,detail:entrant.detail});
    stories.push({week,type:'entrant',id:entrant.id,name:entrant.name,age:entrant.age});
    newEntrants++;
    liveCount++;
  }
  circuit.entrants+=newEntrants;

  const nextRatings={...ratings};
  for(const format of FORMATS)nextRatings[format]={...(nextRatings[format]??{})};
  for(const record of Object.values(records)){
    for(const format of FORMATS){
      if(Number.isFinite(record.formats?.[format]))nextRatings[format][record.id]=[round3(record.formats[format]),week,record.matches];
    }
  }

  const world={
    ...previous,
    version:CPU_WORLD_VERSION,
    lastWeek:week,
    records,
    retired:retired.slice(-CPU_HISTORY_LIMIT),
    entrants:entrants.slice(-CPU_HISTORY_LIMIT),
    stories:stories.slice(-CPU_HISTORY_LIMIT),
    clubs:clubOutlook(seed,regionId,week,skills,template),
    circuit,
    limits:{active:targetActive,circuit:targetCircuit},
    tournaments:[],
    summary:null
  };
  world.tournaments=tournamentOutlook(seed,regionId,week,world.clubs,template);
  world.summary=cpuSummary(world,skills,week);
  return {world,ratings:nextRatings,summary:world.summary,circuit:world.circuit,stories:world.stories.slice(-12)};
}

export function validateCpuWorld(value){
  if(!value||typeof value!=='object')return {ok:false,reason:'CPU world state is missing'};
  if(value.version!==CPU_WORLD_VERSION)return {ok:false,reason:'CPU world version is invalid'};
  if(!value.records||typeof value.records!=='object')return {ok:false,reason:'CPU career records are invalid'};
  for(const [id,record] of Object.entries(value.records)){
    if(!record||typeof record!=='object'||record.id!==id)return {ok:false,reason:'CPU career id is invalid'};
    if(!Number.isFinite(record.age)||record.age<10||record.age>120)return {ok:false,reason:'CPU career age is invalid'};
    if(!record.formats||typeof record.formats!=='object')return {ok:false,reason:'CPU career ratings are invalid'};
    for(const format of FORMATS){
      if(!Number.isFinite(record.formats[format])||record.formats[format]<RATING_MIN||record.formats[format]>RATING_MAX)return {ok:false,reason:'CPU career rating is invalid'};
    }
    if(record.tourPointsHistory!=null&&!Array.isArray(record.tourPointsHistory))return {ok:false,reason:'CPU tour history is invalid'};
  }
  if(!Array.isArray(value.retired)||!Array.isArray(value.entrants)||!Array.isArray(value.stories))return {ok:false,reason:'CPU world history is invalid'};
  if(!Array.isArray(value.clubs))return {ok:false,reason:'CPU club outlook is invalid'};
  if(value.tournaments!=null&&!Array.isArray(value.tournaments))return {ok:false,reason:'CPU tournament outlook is invalid'};
  return {ok:true};
}

export function cpuWorldSummary(cpuWorld){
  return cpuWorld?.summary??emptyCpuWorld().summary;
}

export {REGIONAL_TEMPLATES,CPU_DETAIL_TIERS};

export function cpuLeaders(world,{format='doubles',limit=25,regionId=null}={}){
  return Object.values(world?.records??{})
    .filter(record=>!record.retired&&(!regionId||record.regionId===regionId))
    .sort((a,b)=>(b.formats?.[format]??0)-(a.formats?.[format]??0)||a.name.localeCompare(b.name))
    .slice(0,Math.max(0,limit));
}

export function cpuPlayerPage(world,{
  query='',detail='',stage='',minAge=10,maxAge=100,page=0,pageSize=40
}={}){
  const needle=String(query??'').trim().toLowerCase();
  const filtered=Object.values(world?.records??{}).filter(record=>{
    if(record.retired)return false;
    if(needle&&!String(record.name??'').toLowerCase().includes(needle))return false;
    if(detail&&record.detail!==detail)return false;
    if(stage&&record.stage!==stage)return false;
    if(record.age<minAge||record.age>maxAge)return false;
    return true;
  }).sort((a,b)=>bestFormatRating(b.formats)-bestFormatRating(a.formats)||a.name.localeCompare(b.name));
  const size=Math.max(1,Math.min(100,Number(pageSize)||40));
  const pages=Math.max(1,Math.ceil(filtered.length/size));
  const current=clamp(Number(page)||0,0,pages-1);
  return {total:filtered.length,page:current,pages,items:filtered.slice(current*size,(current+1)*size)};
}

export function cpuTournamentOutlook(world,tier=null){
  return [...(world?.tournaments??[])].filter(event=>!tier||event.tier===tier).sort((a,b)=>a.startsWeek-b.startsWeek||b.projectedEntries-a.projectedEntries);
}