import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {buildClubIndex,buildAthleteSkill} from '../src/career/population.js';
import {
  createCpuCareerRecord,advanceCpuCareer
} from '../src/career/cpu-careers.js';
import {
  regionalTemplate,bestFormatRating,careerStage,proInviteStatus
} from '../src/career/career-lifecycle.js';

const args=process.argv.slice(2);
const option=name=>{
  const index=args.indexOf(name);
  return index>=0&&args[index+1]&&!args[index+1].startsWith('--')?args[index+1]:null;
};
const flag=name=>args.includes(name);
const ages=(option('--ages')??'15,20,25,30,35,40').split(',').map(Number);
const samples=Math.max(20,Math.min(2000,Number(option('--samples')??240)));
const years=Math.max(1,Math.min(30,Number(option('--years')??10)));
const output=resolve(option('--output')??'validation/cpu-careers.json');
const regionId=option('--region')??'north-america';
const includeSamples=flag('--include-samples');
if(ages.some(age=>!Number.isFinite(age)||age<10||age>80))throw new Error('Ages must be between 10 and 80');

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round3=value=>Math.round(value*1000)/1000;
const mean=values=>values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
const percentile=(values,p)=>{
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))];
};
const median=values=>percentile(values,.5);

const STAGE_ORDER={prospect:0,amateur:1,challenger:2,'tour-invited':3,professional:4,retired:4};

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

function snapshot(record,week){
  const rating=bestFormatRating(record.formats);
  const invite=proInviteStatus({
    rating,tourPoints:record.tourPoints,matches:record.matches,
    age:record.age,potential:record.potential,proInviteWeek:record.proInviteWeek
  });
  return {
    week,
    age:record.age,
    rating:round3(rating),
    stage:careerStage({
      rating,contract:record.contract,tourPoints:record.tourPoints,
      proInviteWeek:record.proInviteWeek,retired:record.retired
    }),
    contract:record.contract,
    tourPoints:record.tourPoints,
    matches:record.matches,
    events:record.events,
    wins:record.wins,
    proInviteWeek:record.proInviteWeek,
    proInviteNow:invite.invited,
    retired:record.retired
  };
}

function simulateCohort({age,sample,detail}){
  const seed=3_000_000+sample*13+(detail==='circuit'?7:0);
  const random=randomFor(seed);
  const clubs=buildClubIndex(seed,regionId);
  const club=clubs[(sample*7)%clubs.length];
  const index=sample%Math.max(1,club.memberCount);
  const initialSkill=buildAthleteSkill(seed,club,index,0,age);
  let record=createCpuCareerRecord(initialSkill,0,detail,regionId);
  const template=regionalTemplate(regionId);
  const milestones={proInvite:null,contract:null,professional:null,retired:null};
  const snapshots={};
  const horizon=years*52;
  for(let week=0;week<horizon;week++){
    const skill=buildAthleteSkill(seed,club,index,week,age);
    const before=record;
    record=advanceCpuCareer(record,skill,week,random,template);
    if(record.proInviteWeek!=null&&milestones.proInvite==null)milestones.proInvite=record.proInviteWeek;
    if(record.contract!=='none'&&milestones.contract==null)milestones.contract=week;
    if(record.proWeek!=null&&milestones.professional==null)milestones.professional=record.proWeek;
    if(record.retired&&milestones.retired==null)milestones.retired=week;
    for(const year of [1,3,5,10]){
      if(week===year*52-1)snapshots['year'+year]=snapshot(record,week+1);
    }
  }
  return {
    age,detail,seed,startRating:round3(bestFormatRating(initialSkill.formats)),
    final:snapshot(record,horizon),milestones,snapshots,
    matches:record.matches,events:record.events,wins:record.wins,
    proInviteWeek:record.proInviteWeek,contract:record.contract,
    retired:record.retired,retiredWeek:record.retiredWeek,
    madeProInvite:record.proInviteWeek!=null,
    reachedChallenger:record.tourPoints>=90||bestFormatRating(record.formats)>=4.2
  };
}

function summarize(rows){
  const count=rows.length;
  const rate=fn=>rows.filter(fn).length/count;
  const weeks=fn=>rows.map(fn).filter(value=>value!==null&&value!==undefined);
  const stages={};
  for(const year of [1,3,5,10]){
    stages['year'+year]=rows.reduce((acc,row)=>{
      const stage=row.snapshots['year'+year]?.stage??'unknown';
      acc[stage]=(acc[stage]??0)+1;
      return acc;
    },{});
  }
  return {
    proInvite:rate(row=>row.madeProInvite),
    contract:rate(row=>row.contract!=='none'),
    retired:rate(row=>row.retired),
    reachedChallenger:rate(row=>row.reachedChallenger),
    medianWeeksTo:{
      proInvite:median(weeks(row=>row.milestones.proInvite)),
      proInviteAll:median(rows.map(row=>row.milestones.proInvite??row.final.week+1)),
      contract:median(weeks(row=>row.milestones.contract)),
      professional:median(weeks(row=>row.milestones.professional))
    },
    p90WeeksTo:{
      proInvite:percentile(weeks(row=>row.milestones.proInvite),.9),
      contract:percentile(weeks(row=>row.milestones.contract),.9)
    },
    end:{
      ratingGainMean:round3(mean(rows.map(row=>row.final.rating-row.startRating))),
      ratingP50:round3(percentile(rows.map(row=>row.final.rating),.5)),
      matchesMean:round3(mean(rows.map(row=>row.matches))),
      eventsMean:round3(mean(rows.map(row=>row.events))),
      tourPointsP50:round3(percentile(rows.map(row=>row.final.tourPoints),.5)),
      ageP50:round3(percentile(rows.map(row=>row.final.age),.5))
    },
    stages
  };
}

const started=Date.now();
const results=[];
for(const detail of ['active','circuit']){
  for(const age of ages){
    const rows=[];
    for(let sample=0;sample<samples;sample++)rows.push(simulateCohort({age,sample,detail}));
    results.push({age,detail,summary:summarize(rows),...(includeSamples?{samples:rows}:{samplePreview:rows.slice(0,8)})});
  }
}

const report={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  methodology:{
    scope:'Phase 2 CPU career lifecycle model using shared age development, activity cadence, regional templates, professional invitation gates and retirement pressure.',
    ages,
    samplesPerCohort:samples,
    years,
    horizonWeeks:years*52,
    regionId,
    details:['active','circuit'],
    snapshots:[1,3,5,10],
    proInviteDefinition:'First week the shared tour invitation rule is satisfied: a rating fast track or the rating, tour-points and match-experience bar. All-career medians count never-invited careers at the week after the horizon.',
    contractDefinition:'First CPU contract level after a pro invitation and sufficient tour points.',
    stageOrder:['prospect','amateur','challenger','tour-invited','professional'],
    caveats:[
      'CPU matches use the same rating expectation and skill-gap calculation, not full engine rallies.',
      'Background athletes age deterministically but are summarized rather than individually stored.',
      'The model intentionally reports simulation evidence; human scorecards and physical-device measurements remain separate release gates.'
    ]
  },
  summary:results.map(({age,detail,summary})=>({age,detail,summary})),
  results,
  runtimeMs:Date.now()-started
};

mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  output,
  runtimeMs:report.runtimeMs,
  summary:report.summary.map(row=>({
    age:row.age,detail:row.detail,
    proInvite:row.summary.proInvite,
    medianWeeksToProInvite:row.summary.medianWeeksTo.proInvite,
    medianWeeksToProInviteAll:row.summary.medianWeeksTo.proInviteAll,
    ratingGainMean:row.summary.end.ratingGainMean,
    matchesMean:row.summary.end.matchesMean,
    stageYear10:row.summary.stages.year10
  }))
},null,2));
