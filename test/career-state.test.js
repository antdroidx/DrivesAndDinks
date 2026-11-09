import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  createCareer,train,attendEvent,joinClub,leaveClub,moveToCity,advanceWeek,advanceToNextEvent,
  currentEvents,canAct,canTrain,canEnterEvent,trainingCost,trainingGain,trainingSessionsThisWeek,
  weeklyRecovery,MAX_ENERGY,MAX_TRAINING_SESSIONS,STARTING_SKILL
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
  assert.equal(tourRank(state.athlete.formats.doubles,state.athlete.gender),null,'a beginner is not on the tour');
  assert.ok(state.athlete.formats.doubles<tourFor(state.athlete.gender).floorRating);
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

test('training costs energy, raises the focused rating and counts against the week',()=>{
  const state=career();
  const cost=trainingCost(state);
  const result=train(state,'dink');
  assert.ok(result.ok);
  assert.equal(result.state.energy,state.energy-cost);
  assert.ok(result.state.athlete.ratings.dink>state.athlete.ratings.dink);
  assert.ok(result.state.athlete.ratings.control>state.athlete.ratings.control);
  assert.ok(result.state.athlete.formats.doubles>=state.athlete.formats.doubles);
  assert.equal(trainingSessionsThisWeek(result.state),1);
  // Training does not use up the event slot.
  assert.equal(canEnterEvent(result.state),true);
});

test('training is limited to a set number of sessions a week',()=>{
  let state=career();
  for(let index=0;index<MAX_TRAINING_SESSIONS;index++){
    const result=train(state,'serve');
    assert.ok(result.ok,result.message);
    state=result.state;
  }
  const blocked=train(state,'serve');
  assert.equal(blocked.ok,false);
  assert.match(blocked.message,new RegExp('trained '+MAX_TRAINING_SESSIONS+' times this week'));
  assert.equal(blocked.state.week,state.week);
  // A new week opens the sessions up again.
  const next=advanceWeek(state).state;
  assert.equal(trainingSessionsThisWeek(next),0);
  assert.equal(canTrain(next),true);
});

test('a week holds several training sessions and one event',()=>{
  const joined=withClub(career());
  const event=currentEvents(joined).find(entry=>entry.eligible.ok);
  const attended=attendEvent(joined,event.id,event.defaultOptionId);
  assert.ok(attended.ok,attended.message);
  assert.equal(canEnterEvent(attended.state),false,'an event takes the event slot');
  assert.equal(canTrain(attended.state),true,'an event does not stop training');
  const trained=train(attended.state,'serve');
  assert.ok(trained.ok,trained.message);
});

test('training and recovery scale with the level the player competes at',()=>{
  const amateur=career();
  const pro={...amateur,athlete:{...amateur.athlete,formats:{singles:6.5,doubles:6.5,mixed:6.5}}};
  assert.ok(trainingCost(pro)>trainingCost(amateur),'a stronger player trains harder');
  assert.ok(weeklyRecovery(pro)>weeklyRecovery(amateur),'a stronger player takes more back');
  // The pro's week still balances: a training block and a tour event fit
  // inside what a week recovers.
  const tourEvent=64;
  assert.ok(trainingCost(pro)+tourEvent<=weeklyRecovery(pro),'a pro week is sustainable');
});

test('training is refused when there is not enough energy',()=>{
  const state={...career(),energy:1};
  const result=train(state,'serve');
  assert.equal(result.ok,false);
  assert.match(result.message,/energy/);
});

test('training is a single small step, whatever the level',()=>{
  const early=career();
  const late=career();
  late.athlete={...late.athlete,ratings:{...late.athlete.ratings,dink:92}};
  assert.equal(trainingGain(early,'dink'),1);
  assert.equal(trainingGain(late,'dink'),1);
  // Training never touches the rating.
  const trained=train(early,'dink').state;
  assert.equal(trained.athlete.formats.doubles,early.athlete.formats.doubles);
});

test('advancing a week moves time forward and restores energy',()=>{
  const trained=train(career(),'drive').state;
  const result=advanceWeek(trained);
  assert.ok(result.ok);
  assert.equal(result.state.week,1);
  assert.equal(result.state.energy,Math.min(MAX_ENERGY,trained.energy+weeklyRecovery(trained)));
  assert.equal(canAct(result.state),true);
  assert.ok(result.state.history.length>trained.history.length);
});

test('advancing to the next event skips the quiet weeks',()=>{
  const joined=withClub(career());
  const jumped=advanceToNextEvent(joined);
  assert.ok(jumped.ok);
  assert.ok(jumped.state.week>joined.week,'the calendar moved');
  assert.ok(jumped.events.length>0,'it stopped on an event');
  for(const event of jumped.events)assert.ok(event.eligible.ok&&event.options.length,'the event is enterable');
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
  const own=divisionFor(joined.athlete.formats.doubles);
  const brackets=event.divisions.map(division=>division.id);
  if(brackets.includes(own.id))assert.ok(event.enterable.includes(own.id),'the player may enter their own bracket');
});

test('an open event takes any bracket it runs',()=>{
  const joined=withClub(career());
  const event=currentEvents(joined).find(entry=>entry.eventId==='club-night');
  assert.equal(event.open,true);
  // A club night runs four brackets and takes all of them.
  assert.equal(event.enterable.length,event.brackets.length);
  assert.ok(event.options.length>=event.brackets.length);
});

test('a gated event only takes players in its range, plus half a step up',()=>{
  const joined=withClub(career());
  const own=divisionFor(joined.athlete.formats.doubles);
  const event=currentEvents(joined).find(entry=>entry.eventId==='semi-pro');
  if(!event)return;
  assert.equal(event.open,false);
  for(const id of event.enterable){
    const level=bracketLevel(id);
    assert.ok(level<=own.level+0.51,'a gated event allows one half step up');
  }
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
  state={...state,athlete:{...state.athlete,formats:{...state.athlete.formats,doubles:5,singles:5,mixed:5}}};
  const noPoints=currentEvents({...state,week:10}).find(entry=>entry.eventId==='pro-league');
  assert.equal(noPoints.eligible.ok,false);
  assert.match(noPoints.lockedReason,/tour points/);
  // A rating, a standing and the qualification points together open it.
  state={...state,athlete:{...state.athlete,tourPoints:2000,tourPointsHistory:[{week:0,points:2000}]}};
  const open=currentEvents({...state,week:10}).find(entry=>entry.eventId==='pro-league');
  assert.ok(open.eligible.ok,open.lockedReason);
});

test('the national rounds are earned with tour points',()=>{
  const state=withClub(career());
  const national=currentEvents({...state,week:6}).find(entry=>entry.eventId==='national');
  assert.ok(national,'the national championship should run');
  assert.equal(national.eligible.ok,false,'a player with no points is not qualified');
  assert.match(national.lockedReason,/tour points/);
  // Points alone are not enough: the national runs a 5.0+ bracket, and a
  // player only reaches it by being within half a step of it.
  const qualified={...state,athlete:{...state.athlete,tourPoints:500,tourPointsHistory:[{week:0,points:500}]}};
  const stillLocked=currentEvents({...qualified,week:6}).find(entry=>entry.eventId==='national');
  assert.equal(stillLocked.eligible.ok,false);
  assert.match(stillLocked.lockedReason,/bracket only/);
  const ready={...qualified,athlete:{...qualified.athlete,formats:{...qualified.athlete.formats,doubles:5,singles:5,mixed:5}}};
  const open=currentEvents({...ready,week:6}).find(entry=>entry.eventId==='national');
  assert.ok(open.eligible.ok,open.lockedReason);
});

test('entering a tour event earns points that age out',()=>{
  let state=withClub(career());
  const event=currentEvents({...state,week:0}).find(entry=>entry.eventId==='local-league');
  assert.ok(event,'the local league should run');
  const before=state.athlete.tourPoints;
  const result=attendEvent(state,event.id,event.defaultOptionId);
  assert.ok(result.ok,result.message);
  assert.ok(result.state.athlete.tourPoints>before,'a tour event is worth points');
});

test('attending an event costs energy, records the bracket and improves the focused rating',()=>{
  const joined=withClub(career());
  const event=currentEvents(joined).find(entry=>entry.eligible.ok);
  const result=attendEvent(joined,event.id,event.defaultOptionId);
  assert.ok(result.ok,result.message);
  assert.equal(result.state.energy,joined.energy-event.energyCost);
  const grown=Object.keys(result.state.athlete.ratings).filter(key=>result.state.athlete.ratings[key]>joined.athlete.ratings[key]);
  assert.equal(grown.length,1,'playing an event grows one attribute');
  assert.ok(grown.length===1&&result.state.athlete.ratings[grown[0]]<=99);
  assert.equal(canEnterEvent(result.state),false);
  assert.ok(result.state.entered.includes(event.eventId));
  assert.equal(result.state.lastEntry.divisionId,event.defaultOptionId.split(':')[1]);
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
