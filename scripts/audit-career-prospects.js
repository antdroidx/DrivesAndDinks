import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createCareer,train,trainingSessionsLimit,trainingCost,attributeGrowth,canEnterEvent} from '../src/career/state.js';
import {advanceAgeYear,capAttributeForAge,noteSkillPeaks,noteTrainingMaintenance} from '../src/career/age.js';
import {simulateOutcome,rateMatch,formatSkill,skillForRating,divisionFor,RATING_MIN,RATING_MAX,FORMATS} from '../src/career/rating.js';
import {generateWeekEvents} from '../src/career/calendar.js';
import {pointsForFinish,addPoints,pointsInWindow,PRO_FLOOR_RATING} from '../src/career/tour.js';
import {recordResult,positions} from '../src/career/ranking.js';
import {contractOffer,signed,isContracted,isTourEvent,recordTourEvent,evaluateSeason,seasonDue} from '../src/career/contracts.js';
import {RATING_KEYS} from '../src/roster.js';

const args=process.argv.slice(2);
const option=name=>{
  const index=args.indexOf(name);
  return index>=0&&args[index+1]&&!args[index+1].startsWith('--')?args[index+1]:null;
};
const flag=name=>args.includes(name);
const cohorts=(option('--ages')??'15,20,30,40,50').split(',').map(Number);
const samples=Math.max(20,Math.min(2000,Number(option('--samples')??400)));
const years=Math.max(1,Math.min(30,Number(option('--years')??10)));
const output=resolve(option('--output')??'validation/career-prospects.json');
const includeLight=!flag('--committed-only');
const experience=option('--experience')??'competitive';
if(!['new','casual','athlete','racket','competitive'].includes(experience))throw new Error('Unknown experience: '+experience);
const legacyLongScores=flag('--legacy-long-scores');
const includeSamples=flag('--include-samples');
if(cohorts.some(age=>!Number.isFinite(age)||age<10||age>80))throw new Error('Ages must be between 10 and 80');

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round3=value=>Math.round(value*1000)/1000;
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const percentile=(values,p)=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];
};
const median=values=>percentile(values,.5);

function randomFor(seed){
  let value=(Number(seed)||1)>>>0;
  return ()=>{
    value+=0x6D2B79F5;
    let t=value;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

const POLICIES={
  committed:{
    id:'committed',
    description:'Trains up to the age cap every week and plays one strongest eligible event or division weekly, respecting one active league and two amateur tournaments per month.',
    trainingFrequency:1,
    eventFrequency:1,
    disciplines:'all'
  },
  light:{
    id:'light',
    description:'Trains once a fortnight and plays one doubles event a fortnight.',
    trainingFrequency:.5,
    eventFrequency:.5,
    disciplines:'doubles'
  }
};

function weakestFocus(state,random){
  const lowest=Math.min(...RATING_KEYS.map(key=>state.athlete.ratings[key]));
  const candidates=RATING_KEYS.filter(key=>state.athlete.ratings[key]===lowest);
  return candidates[Math.floor(random()*candidates.length)]??'control';
}

function applyTraining(state,random){
  const policy=state.__policy;
  let sessions=policy.trainingFrequency>=1?trainingSessionsLimit(state):(state.week%2===0?1:0);
  const reserve=24;
  while(sessions-- > 0){
    const cost=trainingCost(state);
    if(state.energy-cost<reserve)break;
    const result=train(state,weakestFocus(state,random));
    if(!result.ok)break;
    state=result.state;
  }
  return state;
}

function eventAcceptance(state,event,format){
  const tourTier=['open','cup','major','world'].includes(event.tier);
  if(tourTier&&event.eventId!=='mlp'){
    const rank=positions(state,state.week)[format];
    const directSlots=Math.max(1,event.drawSize-(event.qualifierSlots??0)-(event.wildCardSlots??2));
    const qualifierCut=directSlots+(event.qualifierFieldSize??0);
    if(rank===null&&event.qualifierFieldSize<=0)return false;
    if(rank!==null&&rank>qualifierCut)return false;
  }
  return true;
}

function chooseOptions(state,events,random,leagueActive=false){
  const candidates=events
    .filter(event=>event.eligible.ok&&event.options.length&&canEnterEvent(state,event))
    .filter(event=>!isContracted(state)||isTourEvent(event)||event.eventId==='mlp')
    .flatMap(event=>event.options
      .filter(option=>state.__policy.disciplines==='all'||option.format==='doubles')
      .filter(option=>eventAcceptance(state,event,option.format))
      .map(option=>({event,option})));
  const leagues=candidates.filter(entry=>entry.event.matchType==='league');
  const pool=leagueActive?candidates.filter(entry=>entry.event.matchType!=='league'):(leagues.length?leagues:candidates);
  pool.sort((a,b)=>(b.event.championPoints??0)-(a.event.championPoints??0)||a.event.energyCost-b.event.energyCost);
  if(!pool.length)return [];
  const best=pool[0].event;
  const selected=pool.filter(entry=>entry.event.id===best.id);
  selected.sort((a,b)=>{
    const order={doubles:0,mixed:1,singles:2};
    return (order[a.option.format]??3)-(order[b.option.format]??3);
  });
  return selected.slice(0,1);
}

function opponentRating(playerRating,divisionId,random){
  const division=divisionFor(playerRating);
  const target=divisionId&&divisionId!=='pro-league'
    ?(Number.parseFloat(divisionId)||division.level)
    :playerRating;
  const spread=divisionId==='5.0+'?.45:.28;
  return clamp(target+(random()-.5)*spread*2,RATING_MIN,7.8);
}

function scaledScore(base,target){
  const scale=Math.max(11,target)/11;
  let mine=Math.round(base.myPoints*scale);
  let theirs=Math.round(base.opponentPoints*scale);
  if(mine===theirs){
    if(base.myPoints>=base.opponentPoints)mine++;
    else theirs++;
  }
  if(Math.abs(mine-theirs)===1){
    if(mine>theirs)mine++;
    else theirs++;
  }
  return [mine,theirs];
}

function playRatedMatch(state,{event,option,random,matchNumber}){
  const format=option.format;
  const playerRating=state.athlete.formats[format];
  const playerSkill=formatSkill(state.athlete.ratings,format);
  const doubles=format!=='singles';
  const partnerRating=clamp(playerRating+(random()-.5)*.45,RATING_MIN,RATING_MAX);
  const opponentRatings=Array.from({length:doubles?2:1},()=>opponentRating(playerRating,option.divisionId,random));
  const opponentSkills=opponentRatings.map(rating=>skillForRating(rating)+(random()-.5)*7);
  const mine=doubles?(playerSkill+skillForRating(partnerRating))/2:playerSkill;
  const theirs=opponentSkills.reduce((sum,value)=>sum+value,0)/opponentSkills.length;
  const myTeamRating=doubles?(playerRating+partnerRating)/2:playerRating;
  const theirTeamRating=opponentRatings.reduce((sum,value)=>sum+value,0)/opponentRatings.length;
  const target=event.targetScore??11;
  const base=simulateOutcome({
    mySkill:mine,theirSkill:theirs,myRating:myTeamRating,theirRating:theirTeamRating,random
  });
  const [myPoints,theirPoints]=scaledScore(base,target);
  const ratedMyPoints=legacyLongScores?myPoints:myPoints*11/Math.max(11,target);
  const ratedTheirPoints=legacyLongScores?theirPoints:theirPoints*11/Math.max(11,target);
  const players=[
    {id:'player',rating:playerRating,team:'mine',matchesPlayed:state.athlete.record.matches},
    ...opponentRatings.map((rating,index)=>({id:'opponent-'+index,rating,team:'opponent',matchesPlayed:0}))
  ];
  if(doubles)players.splice(1,0,{id:'partner',rating:partnerRating,team:'mine',matchesPlayed:0});
  const rated=rateMatch({
    players,actualMyPoints:ratedMyPoints,actualOpponentPoints:ratedTheirPoints,
    matchType:event.matchType,weeksAgo:0
  });
  const player=rated.players.find(entry=>entry.id==='player');
  const won=myPoints>theirPoints;
  const ratings={...state.athlete.ratings};
  const growth=attributeGrowth({
    attributes:ratings,eventFocus:event.skillFocus,format,random
  });
  const maintenance=noteTrainingMaintenance(state.athlete,Object.keys(growth),.04);
  const growthAthlete={...state.athlete,maintenance};
  for(const key of Object.keys(growth)){
    ratings[key]=capAttributeForAge(growthAthlete,key,clamp(ratings[key]+growth[key],0,99));
  }
  const athlete={
    ...state.athlete,
    ratings,
    maintenance,
    peakRatings:noteSkillPeaks(state.athlete,ratings),
    formats:{...state.athlete.formats,[format]:round3(player.rating)},
    record:{
      ...state.athlete.record,
      matches:state.athlete.record.matches+1,
      wins:state.athlete.record.wins+(won?1:0),
      losses:state.athlete.record.losses+(won?0:1)
    }
  };
  return {state:{...state,athlete},won,myPoints,theirPoints};
}

function placeForEvent(event,wins,matches,lossIndex,random){
  const league=(event.shapes??[]).some(shape=>shape.includes('round-robin')||shape==='mlp-style');
  if(league){
    const winRate=matches?wins/matches:0;
    const noise=Math.floor(random()*3);
    return clamp(1+Math.floor((1-winRate)*(event.drawSize-1))+noise-1,1,event.drawSize);
  }
  const rounds=Math.max(1,Math.ceil(Math.log2(event.drawSize)));
  if(lossIndex===null)return 1;
  return Math.max(2,Math.min(event.drawSize,Math.pow(2,rounds-lossIndex)+1));
}

function playEvent(state,{event,option,random}){
  const league=(event.shapes??[]).some(shape=>shape.includes('round-robin')||shape==='mlp-style');
  const rounds=league?Math.max(3,event.drawSize-1):Math.max(1,Math.ceil(Math.log2(event.drawSize)));
  let wins=0,lossIndex=null,games=0;
  for(let match=0;match<rounds;match++){
    const seriesTarget=league?3:1;
    let seriesWins=0,seriesLosses=0;
    for(let game=0;game<seriesTarget;game++){
      const played=playRatedMatch(state,{event,option,random,matchNumber:games++});
      state=played.state;
      if(played.won)seriesWins++;else seriesLosses++;
      if(seriesWins===2||seriesLosses===2)break;
    }
    if(seriesWins>seriesLosses)wins++;
    else if(lossIndex===null)lossIndex=match;
    if(!league&&lossIndex!==null)break;
  }
  const place=placeForEvent(event,wins,rounds,lossIndex,random);
  const points=pointsForFinish(event.championPoints,place);
  const tier=event.tier??'challenger';
  state=recordResult(state,{
    week:state.week,eventId:event.eventId,format:option.format,tier,place,points
  });
  const history=addPoints(state.athlete.tourPointsHistory,state.week,points);
  state={
    ...state,
    athlete:{
      ...state.athlete,
      tourPointsHistory:history,
      tourPoints:pointsInWindow(history,state.week),
      mlpPointsHistory:state.athlete.mlpPointsHistory??[],
      mlpPoints:state.athlete.mlpPoints??0
    }
  };
  if(isContracted(state)&&isTourEvent(event))state=recordTourEvent(state,{eventId:event.eventId,week:state.week,format:option.format});
  const offer=contractOffer(state);
  if(offer&&!isContracted(state))state=signed(state,offer,state.week);
  state={
    ...state,
    eventEntries:[...(state.eventEntries??[]),{
      week:state.week,eventId:event.eventId,format:option.format,
      divisionId:option.divisionId,cost:event.energyCost,matchType:event.matchType,tier:event.tier
    }].slice(-64),
    lastEventWeek:event.matchType==='tournament'?state.week:state.lastEventWeek,
    lastClubWeek:event.matchType==='club'?state.week:state.lastClubWeek,
    lastLeagueWeek:event.matchType==='league'?state.week:state.lastLeagueWeek,
    tournament:{eventId:event.eventId,finished:true}
  };
  return {state,place,points,games,wins};
}

function firstWeek(previous,week,predicate){
  return previous??(predicate?week:null);
}

function simulateCareer({age,sample,policy}){
  const seed=1_000_000+age*10_000+sample*10+(policy.id==='light'?1:0);
  const random=randomFor(seed);
  let state=createCareer({
    name:`Age ${age} ${policy.id} ${sample}`,
    gender:sample%2?'female':'male',
    archetypeId:['avery','remy','morgan','jordan','selena'][sample%5],
    regionId:sample%2?'asia':'north-america',
    seed,
    age,
    height:sample%2?168:180,
    weight:sample%2?66:82,
    experience,
    trait:['none','quick_start','heavy_hands','soft_touch','student','big_serve','natural_athlete'][sample%7]
  });
  state.__policy=policy;
  const startRatings={...state.athlete.formats};
  const milestones={ratingFloor:null,tourPoints:null,national:null,contract:null,proEvent:null,finals:null};
  const playedEvents=new Set();
  let matches=0;
  let events=0;
  let training=0;
  let rejectedHighTier=0;
  let activeLeagueUntil=0;
  const horizon=years*52;

  for(let week=0;week<horizon;week++){
    state.week=week;
    state.energy=100;
    state.trainingWeek=week;
    state.trainingSessions=0;
    state.lastEventWeek=-1;
    state.lastClubWeek=-1;
    state.lastLeagueWeek=-1;
    state.lastTravelWeek=-1;
    state.tournament=null;
    if(week>0&&week%52===0){
      state={...state,athlete:advanceAgeYear(state.athlete,week).athlete};
      if(seasonDue(state,week-1)&&isContracted(state)){
        const reviewed=evaluateSeason(state);
        state=reviewed.state;
      }
    }
    const beforeSessions=state.stats.sessions;
    state=applyTraining(state,random);
    training+=state.stats.sessions-beforeSessions;

    const playThisWeek=random()<policy.eventFrequency;
    const leagueActive=week<activeLeagueUntil;
    if(playThisWeek){
      const eventsThisWeek=generateWeekEvents(state,week);
      const choices=chooseOptions(state,eventsThisWeek,random,leagueActive);
      for(const {event,option} of choices){
        if(state.energy<Math.ceil(event.energyCost*.2))break;
        const played=playEvent(state,{event,option,random});
        state=played.state;
        matches+=played.games;
        events++;
        playedEvents.add(event.eventId);
        if(event.matchType==='league')activeLeagueUntil=week+Math.max(1,event.duration||1);
        milestones.national=firstWeek(milestones.national,week,event.eventId==='national');
        milestones.proEvent=firstWeek(milestones.proEvent,week,['pro-league','mlp'].includes(event.eventId));
        milestones.finals=firstWeek(milestones.finals,week,event.eventId==='ppa-finals');
      }
      if(!choices.length&&eventsThisWeek.some(event=>['open','cup','major','world'].includes(event.tier)))rejectedHighTier++;
    }

    const best=Math.max(...FORMATS.map(format=>state.athlete.formats[format]));
    milestones.ratingFloor=firstWeek(milestones.ratingFloor,week,best>=PRO_FLOOR_RATING);
    milestones.tourPoints=firstWeek(milestones.tourPoints,week,state.athlete.tourPoints>0);
    milestones.contract=firstWeek(milestones.contract,week,isContracted(state));
  }

  const best=Math.max(...FORMATS.map(format=>state.athlete.formats[format]));
  const position=positions(state,state.week);
  return {
    age,policy:policy.id,seed,
    startRatings,
    finalRatings:{...state.athlete.formats},
    bestRating:round3(best),
    finalSkillAverage:round3(state.athlete.skillAverage),
    finalRank:position.overall,
    contract:state.contract,
    milestones,
    matches,events,training,rejectedHighTier,
    madeRatingPro:milestones.ratingFloor!==null,
    madeContract:isContracted(state)||milestones.contract!==null,
    playedProEvent:milestones.proEvent!==null,
    reachedFinals:milestones.finals!==null
  };
}

function summarize(rows){
  const count=rows.length;
  const rate=key=>rows.filter(row=>row[key]).length/count;
  const weeks=key=>rows.map(row=>row.milestones[key]).filter(value=>value!==null);
  const summaryRate=value=>{
    const z=1.96,z2=z*z,denominator=1+z2/count;
    const center=(value+z2/(2*count))/denominator;
    const half=z*Math.sqrt(value*(1-value)/count+z2/(4*count*count))/denominator;
    return {
      count:Math.round(value*count),
      trials:count,
      rate:value,
      ci95:[clamp(center-half,0,1),clamp(center+half,0,1)]
    };
  };
  return {
    ratingPro:summaryRate(rate('madeRatingPro')),
    contract:summaryRate(rate('madeContract')),
    proEvent:summaryRate(rate('playedProEvent')),
    finals:summaryRate(rate('reachedFinals')),
    medianWeeksTo:{
      ratingFloor:median(weeks('ratingFloor')),
      tourPoints:median(weeks('tourPoints')),
      national:median(weeks('national')),
      contract:median(weeks('contract')),
      proEvent:median(weeks('proEvent')),
      finals:median(weeks('finals'))
    },
    end:{
      bestRatingMean:round3(mean(rows.map(row=>row.bestRating))),
      bestRatingP10:round3(percentile(rows.map(row=>row.bestRating),.1)),
      bestRatingP50:round3(percentile(rows.map(row=>row.bestRating),.5)),
      bestRatingP90:round3(percentile(rows.map(row=>row.bestRating),.9)),
      worldRankMedian:median(rows.map(row=>row.finalRank)),
      matchesMean:round3(mean(rows.map(row=>row.matches))),
      eventsMean:round3(mean(rows.map(row=>row.events))),
      trainingSessionsMean:round3(mean(rows.map(row=>row.training)))
    }
  };
}

const started=Date.now();
const policies=includeLight?[POLICIES.committed,POLICIES.light]:[POLICIES.committed];
const results=[];
for(const policy of policies){
  for(const age of cohorts){
    const rows=[];
    for(let sample=0;sample<samples;sample++)rows.push(simulateCareer({age,sample,policy}));
    results.push({
      age,policy:policy.id,summary:summarize(rows),
      ...(includeSamples?{samples:rows}:{samplePreview:rows.slice(0,12)})
    });
  }
}

const report={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  methodology:{
    scope:'Statistical career prospect model using the branch creation, aging, training, rating, ranking and contract functions. Matches and event placements are batch-sampled from the same skill-gap model; this is not a human playtest and does not run full engine rallies.',
    ages:cohorts,
    samplesPerCohort:samples,
    years,
    horizonWeeks:years*52,
    experience,
    policies:policies.map(policy=>policy.description),
    ratingProDefinition:`First time any discipline rating reaches the ${PRO_FLOOR_RATING.toFixed(2)} tour floor.`,
    contractDefinition:'First automatic Futures contract offer under the current top-50/recommendation rules.',
    proEventDefinition:'First Pro League or MLP appearance.',
    rawSamplesIncluded:includeSamples,
    longScoreRating:legacyLongScores
      ?'Legacy audit mode: 15/21-point scores are rated raw against the 11-point expectation.'
      :'Current corrected mode: long scores are normalized to the 11-point rating scale.',
    caveats:[
      'The selected experience profile sets the provisional starting level; compare separate runs before generalizing across player backgrounds.',
      'The model assumes disciplined weekly training and event play for the committed cohort.',
      'CPU opponents are sampled around the entered division rather than replaying the entire regional world.',
      'Full engine rally quality and human input skill are separate variables not modeled here.'
    ]
  },
  summary:results.map(({age,policy,summary})=>({age,policy,summary})),
  results,
  runtimeMs:Date.now()-started
};

mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  output,
  runtimeMs:report.runtimeMs,
  summary:report.summary.map(row=>({
    age:row.age,policy:row.policy,
    ratingPro:row.summary.ratingPro.rate,
    contract:row.summary.contract.rate,
    proEvent:row.summary.proEvent.rate,
    medianWeeksToPro:row.summary.medianWeeksTo.proEvent,
    bestRatingP50:row.summary.end.bestRatingP50
  }))
},null,2));
