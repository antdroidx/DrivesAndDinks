import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,train,canTrain,trainBlockReason,canEnterEvent,eventBlockReason,advanceWeek,currentEvents} from '../src/career/state.js';
import {startCareerMatch,quickSimCareerMatch,matchSimulationPolicy} from '../src/career/career-match.js';
import {readFileSync} from 'node:fs';
import {createInjury,addInjury,currentInjury,healInjuries} from '../src/career/injuries.js';
import {purchaseEquipment,equipPaddle,equipmentSelection} from '../src/career/equipment.js';
import {careerProfile} from '../src/career/matchmaking.js';
import {createCpuCareerRecord,advanceCpuCareer} from '../src/career/cpu-careers.js';
import {buildRegionSkills} from '../src/career/population.js';
import {migrateCareer,CAREER_SAVE_VERSION} from '../src/career/save.js';

const career=()=>createCareer({name:'Phase One',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242,age:30});

test('an injury blocks training and events, lowers recovery, then heals on its return week',()=>{
  const base=career();
  const injury=createInjury({week:0,activity:'match',severity:'moderate',areaId:'knee',random:()=>.5});
  const injured=addInjury(base,injury).state;
  assert.equal(currentInjury(injured).id,injury.id);
  assert.equal(canTrain(injured),false);
  assert.match(trainBlockReason(injured),/Recovering from moderate injury/);
  assert.equal(canEnterEvent(injured,{eventId:'city-open',matchType:'tournament'}),false);
  assert.match(eventBlockReason(injured,{eventId:'city-open',matchType:'tournament'}),/Available week/);
  let current=injured;
  while(current.week<injury.returnWeek)current=advanceWeek(current).state;
  assert.equal(currentInjury(current),null);
  assert.equal(current.injuries.history.length,1);
});

test('coached training charges the coaching fee and produces a larger focused gain',()=>{
  const base=career();
  const standard=train(base,'drive').state;
  const coached=train(base,'drive',{coached:true}).state;
  assert.equal(coached.money,base.money-40);
  assert.equal(coached.finance.ledger.at(-1).category,'coaching');
  assert.equal(coached.athlete.ratings.drive-standard.athlete.ratings.drive,1);
  assert.equal(coached.coachingHistory.length,1);
});

test('purchasing and equipping a paddle charges once and changes the engine profile',()=>{
  const base=career();
  const purchased=purchaseEquipment(base,'ignite-elongated');
  assert.ok(purchased.ok,purchased.message);
  assert.equal(purchased.state.money,base.money-190);
  assert.equal(purchased.state.finance.ledger.at(-1).category,'equipment');
  const equipped=equipPaddle(purchased.state,'ignite-elongated').state;
  const profile=careerProfile(equipped.athlete,equipmentSelection(equipped));
  assert.equal(profile.paddle.id,'power');
  assert.equal(profile.paddle.shapeId,'elongated-aero');
  assert.equal(purchaseEquipment(equipped,'ignite-elongated').ok,false,'a paddle cannot be bought twice');
});

test('CPU careers carry fatigue, form, injuries and equipment through advancement',()=>{
  const skill=buildRegionSkills(4242,'north-america',0)[0];
  const record=createCpuCareerRecord(skill,0,'active','north-america');
  assert.equal(record.equipmentId,'allcourt-hybrid');
  const injury=createInjury({week:0,activity:'cpu-match',severity:'minor',areaId:'ankle',random:()=>.5});
  const injured={...record,injuries:{...record.injuries,active:[injury],lastInjuryWeek:0},fatigue:40,form:8};
  const paused=advanceCpuCareer(injured,skill,Math.max(1,injury.returnWeek-1),()=>.9);
  assert.equal(paused.matches,record.matches,'the injured CPU does not play');
  assert.ok(paused.fatigue<40);
  const returned=advanceCpuCareer(paused,skill,injury.returnWeek,()=>.1);
  assert.equal(currentInjury({...returned,week:injury.returnWeek}),null);
  assert.ok(returned.form<=8);
});

test('schema v17 careers gain injuries, coaching and equipment',()=>{
  const legacy=career();
  delete legacy.injuries;
  delete legacy.equipment;
  delete legacy.coachingEnabled;
  delete legacy.coachingHistory;
  const migrated=migrateCareer({version:17,state:legacy});
  assert.ok(migrated.ok,migrated.reason);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
  assert.deepEqual(migrated.state.injuries.active,[]);
  assert.equal(migrated.state.equipment.equipped,'allcourt-hybrid');
  assert.equal(migrated.state.coachingEnabled,false);
});
test('decisive professional rounds stay manual while routine rounds allow quick sim',()=>{
  assert.equal(matchSimulationPolicy({eventId:'local-league',bracket:'3.5',round:0},{rounds:[{},{}]}).allowed,true);
  const final= matchSimulationPolicy({eventId:'pro-league',bracket:'Pro League Open',round:4},{size:32});
  assert.equal(final.allowed,false);
  assert.match(final.reason,/manual play/);
});

test('a finished match leaves a durable result summary with next opponent and injury state',()=>{
  const base=career();
  const event=currentEvents(base).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  const started=startCareerMatch(base,event.id,event.defaultOptionId);
  assert.ok(started.ok,started.message);
  const simulated=quickSimCareerMatch(started.state);
  assert.ok(simulated.ok,simulated.message);
  const result=simulated.state.lastMatchResult;
  assert.equal(result.eventId,'local-league');
  assert.ok(['WIN','LOSS'].includes(result.won?'WIN':'LOSS'));
  assert.ok(result.tournamentStatus.length>0);
});

test('the Phase One UI exposes injury, coaching and equipment controls',async()=>{
  const source=readFileSync(new URL('../src/career/main.js',import.meta.url),'utf8');
  assert.match(source,/data-action="buy-equipment"/);
  assert.match(source,/data-action="equip"/);
  assert.match(source,/coached-training/);
  assert.match(source,/PATH TO PRO/);
  assert.match(source,/LAST MATCH/);
});