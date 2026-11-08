import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createCareer,train,attendEvent,joinClub,leaveClub,moveToCity,advanceWeek,
  currentEvents,canAct,trainingCost,trainingGain,MAX_ENERGY,WEEKLY_RECOVERY,STARTING_SKILL
} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {skillAverage} from '../src/roster.js';
import {validateCareer} from '../src/career/save.js';
import {EVENT_BY_ID} from '../src/career/geography.js';
import {divisionFor} from '../src/career/rating.js';
import {tourRank,tourFor} from '../src/career/tour.js';

const SEED=4242;
const career=(overrides={})=>createCareer({name:'Test Player',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:SEED,...overrides});
const withClub=(state)=>{
  const clubs=buildClubIndex(state.seed,state.regionId);
  const club=clubs.find(entry=>entry.cityId===state.cityId)??clubs[0];
  return joinClub(state,club.id).state;
};

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

test('a new career starts well outside the pro league',()=>{
  const state=career();
  assert.equal(tourRank(state.athlete.rating,state.athlete.gender),null,'a beginner is not on the tour');
  assert.ok(state.athlete.rating<tourFor(state.athlete.gender).floorRating);
});

test('the starting city is deterministic for a seed and differs between regions',()=>{
  const a=createCareer({name:'A',regionId:'asia',seed:SEED});
  const b=createCareer({name:'A',regionId:'asia',seed:SEED});
  assert.equal(a.cityId,b.cityId);
  assert.notEqual(a.cityId,'seattle');
  assert.equal(a.regionId,'asia');
});

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
  assert.ok(result.state.athlete.rating>=state.athlete.rating);
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
  const state={...career(),energy:1};
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
  const joined=withClub(career());
  const left=leaveClub(joined);
  assert.ok(left.ok);
  assert.equal(left.state.clubId,null);
});

test('moving to another city costs energy and leaves the club',()=>{
  const joined=withClub(career());
  const moved=moveToCity(joined,'denver');
  assert.ok(moved.ok,moved.message);
  assert.equal(moved.state.cityId,'denver');
  assert.equal(moved.state.clubId,null);
  assert.ok(moved.state.energy<joined.energy);
});

test('club night appears on the calendar once the player has a club',()=>{
  const state=career();
  assert.ok(!currentEvents(state).some(event=>event.eventId==='club-night'));
  const joined=withClub(state);
  const events=currentEvents(joined);
  assert.ok(events.some(event=>event.eventId==='club-night'));
  assert.ok(events.every(event=>event.week===joined.week));
});

test('an event is entered by choosing a bracket, not by clearing a rating gate',()=>{
  const joined=withClub(career());
  const event=currentEvents(joined).find(entry=>entry.eligible.ok);
  assert.ok(event.divisions.length>0,'an event runs brackets');
  assert.ok(event.enterable.length>0,'at least one bracket is open to the player');
  const own=divisionFor(joined.athlete.rating);
  const brackets=event.divisions.map(division=>division.id);
  if(brackets.includes(own.id))assert.ok(event.enterable.includes(own.id),'the player may enter their own bracket');
});

test('a player may play up one bracket or down one bracket, but no further',()=>{
  const joined=withClub(career());
  const own=divisionFor(joined.athlete.rating);
  const event=currentEvents(joined).find(entry=>entry.eventId==='club-night');
  assert.ok(event.enterable.length<=3,'at most own, one up and one down');
  for(const id of event.enterable)assert.ok(Math.abs(bracketLevel(id)-own.level)<=1.01);
});

function bracketLevel(id){return Number(id.replace('+',''))}

test('an event the player cannot enter says why',()=>{
  const joined=withClub(career());
  for(const event of currentEvents(joined)){
    if(event.eligible.ok)continue;
    assert.ok(event.lockedReason,'a locked event must explain itself');
  }
});

test('the pro league is locked until the player holds a tour standing',()=>{
  let state=withClub(career());
  const proEvent=currentEvents({...state,week:10}).find(entry=>entry.eventId==='pro-league');
  assert.ok(proEvent,'the pro league should appear on the calendar');
  assert.equal(proEvent.eligible.ok,false,'a beginner cannot enter the tour');
  assert.match(proEvent.lockedReason,/rating/);
  // A rating that clears the board floor is not enough on its own.
  state={...state,athlete:{...state.athlete,rating:5}};
  const noPoints=currentEvents({...state,week:10}).find(entry=>entry.eventId==='pro-league');
  assert.equal(noPoints.eligible.ok,false);
  assert.match(noPoints.lockedReason,/tour points/);
  // A rating and a tour standing together open it.
  state={...state,athlete:{...state.athlete,tourPoints:100,tourPointsHistory:[{week:0,points:100}]}};
  const open=currentEvents({...state,week:10}).find(entry=>entry.eventId==='pro-league');
  assert.ok(open.eligible.ok,open.lockedReason);
});

test('entering a tour event earns points that age out',()=>{
  let state=withClub(career());
  const event=currentEvents({...state,week:0}).find(entry=>entry.eventId==='local-league');
  assert.ok(event,'the local league should run');
  const before=state.athlete.tourPoints;
  const result=attendEvent(state,event.id,event.defaultDivisionId);
  assert.ok(result.ok,result.message);
  assert.ok(result.state.athlete.tourPoints>before,'a tour event is worth points');
});

test('attending an event costs energy, records the bracket and improves the focused rating',()=>{
  const joined=withClub(career());
  const event=currentEvents(joined).find(entry=>entry.eligible.ok);
  const result=attendEvent(joined,event.id,event.defaultDivisionId);
  assert.ok(result.ok,result.message);
  assert.equal(result.state.energy,joined.energy-event.energyCost);
  assert.ok(result.state.athlete.ratings[event.skillFocus]>joined.athlete.ratings[event.skillFocus]);
  assert.equal(canAct(result.state),false);
  assert.ok(result.state.entered.includes(event.eventId));
  assert.equal(result.state.lastEntry.divisionId,event.defaultDivisionId);
});

test('a bracket that is not running cannot be entered',()=>{
  const joined=withClub(career());
  const event=currentEvents(joined).find(entry=>entry.eligible.ok);
  const result=attendEvent(joined,event.id,'not-a-bracket');
  assert.equal(result.ok,false);
  assert.match(result.message,/not running/);
});

test('every event on the ladder appears across a year',()=>{
  const joined=withClub(career());
  const seen=new Set();
  for(let week=0;week<52;week++){
    for(const event of currentEvents({...joined,week}))seen.add(event.eventId);
  }
  for(const event of Object.values(EVENT_BY_ID))assert.ok(seen.has(event.id),`${event.id} never appeared`);
});

test('a career keeps a bounded history and log',()=>{
  let state=career();
  for(let index=0;index<80;index++)state=advanceWeek(state).state;
  assert.ok(state.history.length<=60);
  assert.ok(state.log.length<=14);
  assert.equal(state.stats.weeks,80);
});
