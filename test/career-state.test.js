import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createCareer,train,attendEvent,joinClub,leaveClub,moveToCity,advanceWeek,
  currentEvents,canAct,trainingCost,trainingGain,MAX_ENERGY,WEEKLY_RECOVERY,STARTING_SKILL
} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {skillAverage} from '../src/roster.js';
import {validateCareer} from '../src/career/save.js';
import {COMPETITION_TIERS,TIER_BY_ID} from '../src/career/geography.js';

const SEED=4242;
const career=(overrides={})=>createCareer({name:'Test Player',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:SEED,...overrides});

test('a new career starts in the chosen city with a valid state',()=>{
  const state=career();
  assert.equal(state.cityId,'seattle');
  assert.equal(state.cityLabel,'Seattle');
  assert.equal(state.week,0);
  assert.equal(state.energy,MAX_ENERGY);
  assert.equal(state.clubId,null);
  assert.equal(state.athlete.name,'Test Player');
  assert.equal(state.athlete.skillAverage,skillAverage(state.athlete.ratings));
  assert.ok(validateCareer(state).ok);
});

test('a new career starts below the first match tier',()=>{
  const state=career();
  assert.ok(state.athlete.dupr<TIER_BY_ID['local-league'].minRating,'a beginner should not start in a league');
  assert.ok(state.athlete.skillAverage<=STARTING_SKILL+8);
});

test('the starting city is deterministic for a seed and differs between regions',()=>{
  const a=createCareer({name:'A',regionId:'asia',seed:SEED});
  const b=createCareer({name:'A',regionId:'asia',seed:SEED});
  assert.equal(a.cityId,b.cityId);
  assert.ok(a.cityLabel!=='Seattle');
  assert.equal(cityIsInRegion(a,'asia'),true);
});
function cityIsInRegion(state,regionId){return state.regionId===regionId}

test('the archetype sets the starting shape of the ratings',()=>{
  const control=career({archetypeId:'quinn'});
  const banger=career({archetypeId:'jordan'});
  assert.ok(control.athlete.ratings.dink>banger.athlete.ratings.dink);
  assert.ok(banger.athlete.ratings.drive>control.athlete.ratings.drive);
});

test('training costs energy, raises the focused rating and takes the week',()=>{
  const state=career();
  const cost=trainingCost(state);
  const result=train(state,'dink');
  assert.ok(result.ok);
  assert.equal(result.state.energy,state.energy-cost);
  assert.ok(result.state.athlete.ratings.dink>state.athlete.ratings.dink);
  assert.ok(result.state.athlete.ratings.control>state.athlete.ratings.control);
  assert.ok(result.state.athlete.dupr>=state.athlete.dupr);
  assert.equal(canAct(result.state),false);
});

test('only one action is allowed per week',()=>{
  const state=train(career(),'serve').state;
  const second=train(state,'serve');
  assert.equal(second.ok,false);
  assert.match(second.message,/already used this week/);
  assert.equal(second.state.week,state.week);
});

test('training is refused when there is not enough energy',()=>{
  let state=career();
  state={...state,energy:1};
  const result=train(state,'serve');
  assert.equal(result.ok,false);
  assert.match(result.message,/energy/);
});

test('later gains are slower than early gains',()=>{
  const early=career();
  const late=career();
  late.athlete={...late.athlete,ratings:{...late.athlete.ratings,dink:92}};
  assert.ok(trainingGain(early,'dink')>trainingGain(late,'dink'));
});

test('advancing a week moves time forward and restores energy',()=>{
  const trained=train(career(),'drive').state;
  const result=advanceWeek(trained);
  assert.ok(result.ok);
  assert.equal(result.state.week,1);
  assert.equal(result.state.energy,Math.min(MAX_ENERGY,trained.energy+WEEKLY_RECOVERY));
  assert.equal(canAct(result.state),true);
  assert.ok(result.state.history.length>trained.history.length);
});

test('joining a club records the club and moves the player to its city',()=>{
  const state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  const elsewhere=clubs.find(club=>club.cityId!=='seattle');
  const result=joinClub(state,elsewhere.id);
  assert.ok(result.ok,result.message);
  assert.equal(result.state.clubId,elsewhere.id);
  assert.equal(result.state.cityId,elsewhere.cityId);
  assert.equal(result.state.areaId,elsewhere.areaId);
});

test('a player can join a club in their own city without paying travel',()=>{
  const state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  const local=clubs.find(club=>club.cityId==='seattle');
  const result=joinClub(state,local.id);
  assert.ok(result.ok);
  assert.equal(result.state.energy,state.energy);
  assert.equal(result.state.clubId,local.id);
});

test('leaving a club clears the membership',()=>{
  const state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  const joined=joinClub(state,clubs[0].id).state;
  const left=leaveClub(joined);
  assert.ok(left.ok);
  assert.equal(left.state.clubId,null);
});

test('moving to another city costs energy and leaves the club',()=>{
  const state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  const joined=joinClub(state,clubs.find(club=>club.cityId==='seattle').id).state;
  const moved=moveToCity(joined,'denver');
  assert.ok(moved.ok,moved.message);
  assert.equal(moved.state.cityId,'denver');
  assert.equal(moved.state.clubId,null);
  assert.ok(moved.state.energy<joined.energy);
});

test('club night appears on the calendar once the player has a club',()=>{
  const state=career();
  assert.ok(!currentEvents(state).some(event=>event.tierId==='club-night'));
  const clubs=buildClubIndex(SEED,'north-america');
  const joined=joinClub(state,clubs.find(club=>club.cityId==='seattle').id).state;
  const events=currentEvents(joined);
  assert.ok(events.some(event=>event.tierId==='club-night'));
  assert.ok(events.every(event=>event.week===joined.week));
});

test('events above the player rating are locked with a reason',()=>{
  const state=career();
  const events=currentEvents(state);
  const locked=events.filter(event=>!event.eligible.ok);
  for(const event of locked)assert.ok(event.lockedReason,'a locked event must explain itself');
  const open=events.filter(event=>event.eligible.ok);
  for(const event of open)assert.ok(state.athlete.dupr>=event.minRating);
});

test('the ladder unlocks as the career rating climbs',()=>{
  let state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  state=joinClub(state,clubs.find(club=>club.cityId==='seattle').id).state;
  const cityOpen=TIER_BY_ID['city-open'];
  assert.ok(state.athlete.dupr<cityOpen.minRating,'a beginner cannot enter the city open');
  state={...state,athlete:{...state.athlete,dupr:cityOpen.minRating+0.5}};
  const open=currentEvents(state).filter(event=>event.tierId==='city-open');
  if(open.length)assert.ok(open[0].eligible.ok);
});

test('attending an event costs energy and improves the focused rating',()=>{
  const state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  const joined=joinClub(state,clubs.find(club=>club.cityId==='seattle').id).state;
  const event=currentEvents(joined).find(entry=>entry.eligible.ok);
  const result=attendEvent(joined,event.id);
  assert.ok(result.ok,result.message);
  assert.equal(result.state.energy,joined.energy-event.energyCost);
  assert.ok(result.state.athlete.ratings[event.skillFocus]>joined.athlete.ratings[event.skillFocus]);
  assert.equal(canAct(result.state),false);
});

test('every ladder tier is reachable through the calendar over a year',()=>{
  const state=career();
  const clubs=buildClubIndex(SEED,'north-america');
  const joined=joinClub(state,clubs.find(club=>club.cityId==='seattle').id).state;
  const seen=new Set();
  for(let week=0;week<52;week++){
    for(const event of currentEvents({...joined,week}))seen.add(event.tierId);
  }
  for(const tier of COMPETITION_TIERS)assert.ok(seen.has(tier.id),`${tier.id} never appeared`);
});

test('a career keeps a bounded history and log',()=>{
  let state=career();
  for(let index=0;index<80;index++)state=advanceWeek(state).state;
  assert.ok(state.history.length<=60);
  assert.ok(state.log.length<=14);
  assert.equal(state.stats.weeks,80);
});
