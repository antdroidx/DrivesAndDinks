import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RATING_KEYS} from '../src/roster.js';
import {seededRandom} from '../src/competition.js';
import {buildClubIndex,buildAthleteSkill,buildAthlete,buildRegionSkills} from '../src/career/population.js';
import {CPU_TRAJECTORY_STYLES,cpuTrajectoryStatus} from '../src/career/cpu-trajectory.js';
import {createCpuCareerRecord,advanceCpuCareer,createCpuWorld} from '../src/career/cpu-careers.js';
import {createCareer,advanceWeek} from '../src/career/state.js';
import {serializeCareer,migrateCareer} from '../src/career/save.js';
import {ratedPopulation,opponentsInBracket} from '../src/career/world.js';
import {careerProfile} from '../src/career/matchmaking.js';
import {partnerCandidates,choosePartner,resolvePartner} from '../src/career/club-life.js';

const SEED=4242;
const mean=ratings=>RATING_KEYS.reduce((sum,key)=>sum+ratings[key],0)/RATING_KEYS.length;
const club=buildClubIndex(SEED,'north-america')[0];

test('same-age CPU peers include improvers, stagnating players and early declines',()=>{
  const cohorts={};
  for(const entry of buildClubIndex(SEED,'north-america').slice(0,30)){
    for(let index=0;index<entry.memberCount;index++){
      const first=buildAthleteSkill(SEED,entry,index,0,25);
      const later=buildAthleteSkill(SEED,entry,index,520,25);
      (cohorts[first.trajectory.style]??=[]).push(mean(later.ratings)-mean(first.ratings));
    }
  }
  assert.deepEqual(Object.keys(cohorts).sort(),Object.keys(CPU_TRAJECTORY_STYLES).sort());
  assert.ok(cohorts.steady.filter(delta=>delta>.5).length>50);
  assert.ok(cohorts.plateau.filter(delta=>Math.abs(delta)<.3).length>100);
  assert.ok(cohorts.early.some(delta=>delta<-.5));
  assert.ok(Math.max(...cohorts.steady)-Math.min(...cohorts.steady)>1,'learning rates vary within a style');
});

test('late bloomers can remain unchanged before making progress later',()=>{
  let found=false;
  for(let index=0;index<club.memberCount;index++){
    const first=buildAthleteSkill(SEED,club,index,0,25);
    if(first.trajectory.style!=='late')continue;
    const early=buildAthleteSkill(SEED,club,index,52,25);
    const later=buildAthleteSkill(SEED,club,index,520,25);
    assert.deepEqual(early.ratings,first.ratings,'no automatic gains before the development window');
    assert.ok(mean(later.ratings)>mean(first.ratings)+.5);
    found=true;
  }
  assert.ok(found,'cohort contains late bloomers');
});

test('development phases and attribute specializations differ between CPU players',()=>{
  const phases=new Set(),focuses=new Set();
  for(let index=0;index<club.memberCount;index++){
    const skill=buildAthleteSkill(SEED,club,index,0,25);
    focuses.add(skill.trajectory.focus);
    for(let week=0;week<520;week+=52)phases.add(cpuTrajectoryStatus(skill.trajectory,week).phase);
  }
  assert.equal(phases.size,4);
  assert.ok(focuses.size>=8);
});

test('a long-running original population retains a substantial lower-ability group',()=>{
  for(const seed of [4242,7721]){
    const first=buildRegionSkills(seed,'north-america',0);
    const later=buildRegionSkills(seed,'north-america',1040);
    assert.ok(later.filter(player=>mean(player.ratings)<60).length/later.length>.35);
    assert.ok(later.filter(player=>mean(player.ratings)>=75).length>25,'advanced peers still exist');
    assert.ok(later.reduce((sum,player)=>sum+mean(player.ratings),0)/later.length<65,'no population-wide climb to elite');
    assert.deepEqual(later.map(player=>player.id),first.map(player=>player.id));
    assert.ok(later.every(player=>Object.values(player.ratings).every(value=>Number.isFinite(value)&&value>=25&&value<=99)));
  }
});

test('background trajectories are deterministic and cannot change a rating without results',()=>{
  const first=buildAthlete(SEED,club,0,0,25);
  const later=buildAthlete(SEED,club,0,520,25);
  assert.deepEqual(buildAthlete(SEED,club,0,520,25),later);
  assert.deepEqual(later.trajectory,first.trajectory);
  assert.deepEqual(later.formats,first.formats);
  assert.notDeepEqual(later.ratings,first.ratings);
});

test('tracked careers retain individualized development and receive physical decline',()=>{
  const first={...buildAthleteSkill(SEED,club,1,0,50),id:'older-cpu'};
  const later=buildAthleteSkill(SEED,club,1,520,50);
  const record=createCpuCareerRecord(first,0,'active');
  const next=advanceCpuCareer(record,later,520,seededRandom(9),undefined,{});
  assert.ok(next.ratings.agility<record.ratings.agility-3);
  assert.ok(next.ratings.power<record.ratings.power);
  assert.deepEqual(next.trajectory,record.trajectory);
  assert.equal(next.matches,0,'development alone never invents results');
  assert.deepEqual(next.formats,record.formats);
});

test('injury interrupts improvement without resetting a career to generated ability',()=>{
  const first={...buildAthleteSkill(SEED,club,0,0,25),id:'injured-cpu'};
  const later=buildAthleteSkill(SEED,club,0,26,25);
  const record=createCpuCareerRecord(first,0,'active');
  record.ratings.control+=3;
  record.injuries={active:[{id:'test-injury',type:'ankle',severity:'major',startWeek:0,endWeek:100,returnWeek:100,remainingWeeks:100}],history:[]};
  const next=advanceCpuCareer(record,later,26,seededRandom(9),undefined,{});
  assert.ok(next.ratings.control<=record.ratings.control);
  assert.ok(next.ratings.control>later.ratings.control,'previous training gains survive');
});

test('old CPU records adopt profiles without replacing established attributes or results',()=>{
  const skill={...buildAthleteSkill(SEED,club,0,52,25),id:'legacy-cpu'};
  const record=createCpuCareerRecord(skill,0,'active');
  delete record.trajectory;delete record.developmentBaseline;delete record.lastDevelopmentWeek;
  record.ratings.control=88;record.matches=30;record.wins=12;
  const next=advanceCpuCareer(record,skill,52,seededRandom(9),undefined,{});
  assert.ok(next.trajectory);
  assert.equal(next.ratings.control,88);
  assert.equal(next.matches,30);assert.equal(next.wins,12);
  assert.deepEqual(next.formats,record.formats);
});

test('world creation initializes all tracked CPU attributes rather than empty profiles',()=>{
  const world=createCpuWorld(SEED,'north-america',0,{activeLimit:4,circuitLimit:4});
  for(const record of Object.values(world.records)){
    assert.equal(Object.keys(record.ratings).length,RATING_KEYS.length);
    assert.ok(record.trajectory);
  }
});

test('current CPU attributes reach the match draw and the physics engine',()=>{
  const skill=buildRegionSkills(SEED,'north-america',52)[0];
  const override={...createCpuCareerRecord(skill,52,'active'),ratings:Object.fromEntries(RATING_KEYS.map(key=>[key,44]))};
  override.ratings.control=92;
  const skills={[skill.id]:override};
  const args={seed:SEED,regionId:'north-america',week:52,ratings:{doubles:{[skill.id]:[8,52,1]}},skillOverrides:skills};
  const athlete=ratedPopulation({...args,limit:1})[0];
  assert.equal(athlete.id,skill.id);
  assert.deepEqual(athlete.ratings,override.ratings);
  assert.equal(athlete.age,skill.age);
  assert.equal(careerProfile(athlete).ratings.control,92);
  const opponents=opponentsInBracket({...args,divisionId:'3.5',cityId:club.cityId,count:100,random:seededRandom(1)});
  assert.ok(opponents.every(player=>player.age===buildAthlete(SEED,buildClubIndex(SEED,'north-america').find(entry=>entry.id===player.clubId),Number(player.id.match(/-a(\d+)$/)[1]),52).age));
});

test('chosen CPU partners refresh their attributes and appearance in later weeks',()=>{
  const state=createCareer({name:'Partner trajectory',seed:SEED,regionId:'north-america',cityId:club.cityId});
  state.clubId=club.id;
  const candidate=partnerCandidates(state,'doubles')[0];
  const chosen=choosePartner(state,'doubles',candidate.id).state;
  const current=buildAthlete(SEED,club,Number(candidate.id.match(/-a(\d+)$/)[1]),520);
  const partner=resolvePartner({...chosen,week:520,cpuWorld:{records:{}}},'doubles');
  assert.deepEqual(partner.ratings,current.ratings);
  assert.deepEqual(partner.appearance,current.appearance);
  assert.equal(partner.age,current.age);
});

test('saving and loading preserves the next CPU development step exactly',()=>{
  let state=createCareer({name:'Trajectory save',seed:SEED,regionId:'north-america',cityId:'seattle'});
  state=advanceWeek(state).state;
  const loaded=migrateCareer(JSON.parse(serializeCareer(state)));
  assert.ok(loaded.ok,loaded.reason);
  assert.deepEqual(advanceWeek(loaded.state).state.cpuWorld,advanceWeek(state).state.cpuWorld);
});
