import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,advanceWeek} from '../src/career/state.js';
import {buildAthlete,buildAthleteSkill,buildClubIndex,buildRegionSkills} from '../src/career/population.js';
import {
  createCpuWorld,advanceCpuWorld,createCpuCareerRecord,advanceCpuCareer,validateCpuWorld
} from '../src/career/cpu-careers.js';
import {
  proInviteStatus,regionalTemplate,trainingResponse,careerStage
} from '../src/career/career-lifecycle.js';
import {migrateCareer,serializeCareer,CAREER_SAVE_VERSION} from '../src/career/save.js';

const SEED=4242;

test('generated athletes age and develop deterministically across career weeks',()=>{
  const club=buildClubIndex(SEED,'north-america')[0];
  const young=buildAthlete(SEED,club,0,0,15);
  const years=buildAthlete(SEED,club,0,520,15);
  assert.equal(young.startAge,15);
  assert.equal(young.age,15);
  assert.equal(years.age,25);
  assert.notEqual(young.ratings.agility,years.ratings.agility);
  assert.deepEqual(buildAthlete(SEED,club,0,520,15),years);
});

test('the CPU world has active, circuit and background simulation tiers',()=>{
  const world=createCpuWorld(SEED,'north-america',0);
  assert.equal(world.summary.population,5680);
  assert.equal(world.summary.active,160);
  assert.equal(world.summary.circuit,420);
  assert.equal(world.summary.background,5100);
  assert.ok(world.summary.averageAge>30,'the generated world contains adult careers');
  assert.ok(validateCpuWorld(world).ok);
});

test('CPU careers accumulate matches, age, stages and world turnover',()=>{
  const initial=createCpuWorld(SEED,'north-america',0);
  const advanced=advanceCpuWorld(initial,{seed:SEED,regionId:'north-america',week:52,ratings:{}});
  const records=Object.values(advanced.world.records);
  assert.ok(records.some(record=>record.matches>0),'active and circuit athletes play');
  assert.ok(records.some(record=>record.events>0),'CPU careers enter events');
  assert.ok(records.some(record=>record.age>record.startAge),'ages advance');
  assert.ok(advanced.world.entrants.length>0||advanced.world.retired.length>0,'the world turns over');
  assert.ok(advanced.world.clubs.length>0);
  assert.ok(advanced.world.summary.population===5680);
});

test('a promising teenager can reach pro scouting before an older starter',()=>{
  const profile={rating:4.5,tourPoints:450,matches:45};
  const teenager=proInviteStatus({...profile,age:15,potential:75});
  const veteran=proInviteStatus({...profile,age:40,potential:55});
  assert.equal(teenager.invited,true);
  assert.equal(veteran.invited,false);
  const club=buildClubIndex(SEED,'north-america')[0];
  assert.ok(buildAthleteSkill(SEED,club,0,0,15).potential>buildAthleteSkill(SEED,club,0,0,40).potential);
});

test('regional templates and age gates create different career paths',()=>{
  const northAmerica=regionalTemplate('north-america');
  const asia=regionalTemplate('asia');
  assert.ok(asia.training>northAmerica.training);
  assert.ok(asia.participation>northAmerica.participation);
  const same={rating:4.8,tourPoints:500,matches:50};
  assert.equal(proInviteStatus({...same,age:30}).invited,true);
  assert.equal(proInviteStatus({...same,age:15}).invited,true);
  assert.equal(proInviteStatus({...same,age:40}).invited,false);
  assert.ok(trainingResponse(15)>trainingResponse(40));
});

test('schema v16 careers gain CPU world state without losing their career',()=>{
  const state=createCareer({name:'CPU Save',seed:SEED,regionId:'north-america',cityId:'seattle',age:25});
  delete state.cpuWorld;
  const migrated=migrateCareer({version:16,state});
  assert.ok(migrated.ok,migrated.reason);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
  assert.ok(validateCpuWorld(migrated.state.cpuWorld).ok);
  assert.equal(migrated.state.athlete.name,'CPU Save');
});

test('weekly advancement persists CPU world deltas alongside the player',()=>{
  const state=createCareer({name:'CPU Week',seed:SEED,regionId:'north-america',cityId:'seattle',age:25});
  const advanced=advanceWeek(state).state;
  assert.ok(Object.keys(advanced.cpuWorld.records).length>0);
  assert.equal(advanced.cpuWorld.lastWeek,1);
  assert.ok(advanced.circuit);
});
