import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {RATING_KEYS} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {buildClubIndex,buildAthleteSkill,buildRegionSkills} from '../src/career/population.js';
import {createCpuCareerRecord,advanceCpuCareer} from '../src/career/cpu-careers.js';
import {CPU_TRAJECTORY_STYLES} from '../src/career/cpu-trajectory.js';

const args=process.argv.slice(2);
const option=(name,fallback)=>args.find(value=>value.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const seeds=option('seeds','4242,7721').split(',').map(Number);
const years=option('years','0,1,3,5,10,20').split(',').map(Number);
if(seeds.some(value=>!Number.isInteger(value))||years.some(value=>!Number.isFinite(value)||value<0||value>50))throw new Error('Use integer seeds and years between 0 and 50.');
const output=resolve(option('output','validation/cpu-trajectories.json'));
const average=ratings=>RATING_KEYS.reduce((sum,key)=>sum+ratings[key],0)/RATING_KEYS.length;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length);
const round=value=>Math.round(value*1000)/1000;
const regions=['north-america','asia'];
const started=Date.now();

function summarize(values){
  const sorted=[...values].sort((a,b)=>a-b);
  return {mean:round(mean(values)),p10:round(sorted[Math.floor(sorted.length*.1)]??0),p50:round(sorted[Math.floor(sorted.length*.5)]??0),p90:round(sorted[Math.floor(sorted.length*.9)]??0),below60:values.filter(value=>value<60).length,atLeast80:values.filter(value=>value>=80).length};
}

const populations=seeds.map(seed=>{
  const initial=new Map(regions.flatMap(region=>buildRegionSkills(seed,region,0)).map(player=>[player.id,average(player.ratings)]));
  return {seed,snapshots:years.map(year=>{
    const players=regions.flatMap(region=>buildRegionSkills(seed,region,year*52));
    const groups={};
    for(const player of players){
      const group=groups[player.trajectory.style]??={count:0,gains:[],improving:0,stagnating:0,declining:0};
      const gain=average(player.ratings)-initial.get(player.id);
      group.count++;group.gains.push(gain);
      group.improving+=gain>.5;group.stagnating+=Math.abs(gain)<=.5;group.declining+=gain<-.5;
    }
    return {year,population:players.length,attributes:summarize(players.map(player=>average(player.ratings))),styles:Object.fromEntries(Object.entries(groups).map(([style,{gains,...group}])=>[style,{...group,meanGain:round(mean(gains))}]))};
  })};
});

// Control for age: all peers start with the same age, but keep their own
// club ability, ambition, learning, focus, seasonal phases and decline rate.
const ageCohorts=[18,25,40,55].map(age=>{
  const groups={};
  for(const club of buildClubIndex(seeds[0],'north-america').slice(0,40)){
    for(let index=0;index<club.memberCount;index++){
      const initial=buildAthleteSkill(seeds[0],club,index,0,age);
      const final=buildAthleteSkill(seeds[0],club,index,520,age);
      const group=groups[initial.trajectory.style]??={gains:[],count:0,improving:0,stagnating:0,declining:0};
      const gain=average(final.ratings)-average(initial.ratings);
      group.count++;group.gains.push(gain);group.improving+=gain>.5;group.stagnating+=Math.abs(gain)<=.5;group.declining+=gain<-.5;
    }
  }
  return {startAge:age,years:10,styles:Object.fromEntries(Object.entries(groups).map(([style,{gains,...group}])=>[style,{...group,meanGain:round(mean(gains))}]))};
});

const tracked=[];
const clubs=buildClubIndex(seeds[0],'north-america');
for(const detail of ['active','circuit','background']){
  const gains=[];
  for(let index=0;index<48;index++){
    const club=clubs[index%clubs.length],slot=index%club.memberCount;
    const initial={...buildAthleteSkill(seeds[0],club,slot,0,25),id:`${club.id}-a${slot}`};
    let record=createCpuCareerRecord(initial,0,detail);
    for(let week=1;week<=520;week++){
      const skill=buildAthleteSkill(seeds[0],club,slot,week,25);
      record=advanceCpuCareer(record,skill,week,seededRandom(week+index),undefined,{});
    }
    gains.push(average(record.ratings)-average(initial.ratings));
  }
  tracked.push({detail,count:gains.length,meanGain:round(mean(gains)),improving:gains.filter(value=>value>.5).length,stagnating:gains.filter(value=>Math.abs(value)<=.5).length,declining:gains.filter(value=>value<-.5).length});
}

const checks={
  fullWorld:populations.every(result=>result.snapshots.every(snapshot=>snapshot.population===10000)),
  allStyles:populations.every(result=>result.snapshots.every(snapshot=>Object.keys(snapshot.styles).length===Object.keys(CPU_TRAJECTORY_STYLES).length)),
  lowerAbilityPersists:populations.every(result=>result.snapshots.every(snapshot=>snapshot.attributes.below60/snapshot.population>.35)),
  sameAgeStagnation:ageCohorts.find(row=>row.startAge===25).styles.plateau.stagnating>100,
  sameAgeImprovement:ageCohorts.find(row=>row.startAge===25).styles.steady.improving>100,
  sameAgeDecline:ageCohorts.find(row=>row.startAge===25).styles.early.declining>10
};
const report={generatedAt:new Date().toISOString(),methodology:{scope:'CPU attribute trajectories and training integration; no physics matches or DUPR calibration.',seeds,years,regions,attributeMeasure:'Mean of the 14 raw engine attributes (not the displayed overall scale).',classification:'Improving/declining means a change greater than 0.5 raw attribute points; otherwise stagnating.',population:'The same original 10,000-player cohort at every snapshot, including aging athletes. Does not claim to measure replacement cohorts or retirement turnover.',tracked:'48 peers per detail tier starting at 25, advanced weekly for ten years with no matches or injuries; includes training.',balancePolicy:'Fictional game balance settings, not empirical athletic forecasts.'},checks,populations,ageCohorts,tracked,runtimeMs:Date.now()-started};
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,checks,runtimeMs:report.runtimeMs,populations:populations.map(row=>({seed:row.seed,snapshots:row.snapshots.map(({year,attributes})=>({year,...attributes}))})),tracked},null,2));
if(Object.values(checks).some(value=>!value))process.exitCode=1;
