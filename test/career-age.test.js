import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,advanceWeek,canAct,canEnterEvent,currentEvents,weeklyRecovery} from '../src/career/state.js';
import {
  MIN_START_AGE,MAX_START_AGE,ageSkillFactor,recoveryAgeFactor,ageCeiling,capRatingForAge,advanceAgeYear,ratingCeilingFor
} from '../src/career/age.js';
import {retire,retirementAdvice,allTimeBoard} from '../src/career/retirement.js';
import {recordGame} from '../src/career/analytics.js';

const career=(overrides={})=>createCareer({name:'Age Tester',gender:'female',archetypeId:'quinn',regionId:'north-america',cityId:'seattle',seed:4242,...overrides});

test('starting age is selectable from ten through eighty',()=>{
  const child=career({age:10});
  const adult=career({age:30});
  const capped=career({age:99});
  assert.equal(child.athlete.age,10);
  assert.equal(child.athlete.startAge,10);
  assert.equal(adult.athlete.age,30);
  assert.equal(capped.athlete.age,MAX_START_AGE);
  assert.equal(MAX_START_AGE,80);
  assert.ok(child.athlete.formats.doubles<adult.athlete.formats.doubles,'a child starts below the adult baseline');
  assert.ok(Object.values(child.athlete.ratings).some(value=>value<adult.athlete.ratings.drive));
  assert.equal(MIN_START_AGE,10);
});

test('the age curve develops, plateaus and declines',()=>{
  assert.ok(ageSkillFactor(10)<ageSkillFactor(15));
  assert.ok(ageSkillFactor(15)<ageSkillFactor(20));
  assert.equal(ageSkillFactor(25),1);
  assert.equal(ageSkillFactor(40),1);
  assert.ok(ageSkillFactor(41)<1);
  assert.ok(ageSkillFactor(55)<ageSkillFactor(45));
  assert.equal(recoveryAgeFactor(25),1);
  assert.equal(recoveryAgeFactor(40),1);
  assert.ok(recoveryAgeFactor(41)<1);
  assert.ok(recoveryAgeFactor(60)<recoveryAgeFactor(41));
});

test('recovery declines with age without making a week unusable',()=>{
  const young=career({age:24});
  const veteran=career({age:55});
  young.athlete.formats={singles:5.5,doubles:5.5,mixed:5.5};
  veteran.athlete.formats={singles:5.5,doubles:5.5,mixed:5.5};
  assert.ok(weeklyRecovery(veteran)<weeklyRecovery(young));
  assert.ok(weeklyRecovery(veteran)>=10);
});

test('elite players retain realistic ratings through their fifties and sixties',()=>{
  assert.ok(ageCeiling(6.5,55)>=5.4,'a 6.5 peak should retain at least 5.4 at 55');
  assert.ok(ageCeiling(6.0,55)>=5.0,'a 6.0 peak should retain 5.0 at 55');
  assert.ok(ageCeiling(6.5,60)>=5.0,'a 6.5 peak should remain above 5.0 at 60');
  assert.ok(ageCeiling(6.5,65)>=4.6,'a 6.5 peak should retain useful elite ability at 65');
  assert.ok(ageCeiling(7.0,55)>=6.0,'a 7.0 peak should remain elite at 55');
  assert.ok(ageCeiling(8.0,60)>=6.4,'the theoretical top should remain elite at 60');
  assert.ok(ageSkillFactor(79)>ageSkillFactor(80),'eighty begins a pronounced decline');
  assert.ok(ageCeiling(6.5,80)<3,'an elite ceiling drops sharply at eighty');
  assert.ok(recoveryAgeFactor(80)<recoveryAgeFactor(79));
});

test('a rating can fall below the age-adjusted peak but cannot rise above it',()=>{
  const athlete={
    ...career({age:50}).athlete,
    age:50,
    peakAge:27,
    formats:{singles:4.5,doubles:4.5,mixed:4.5},
    peakFormats:{singles:6.5,doubles:6.5,mixed:6.5}
  };
  const ceilings=ratingCeilingFor(athlete);
  const capped=capRatingForAge(athlete,'doubles',7);
  assert.ok(ceilings.doubles<6.5);
  assert.equal(capped.rating,ceilings.doubles);
  const lower=capRatingForAge(athlete,'doubles',3.1);
  assert.equal(lower.rating,3.1,'the player may fall below the ceiling');
});

test('a birthday advances age and applies the new ceiling',()=>{
  const state=career({age:44});
  const athlete={...state.athlete,peakAge:27,peakFormats:{singles:6,doubles:6,mixed:6},peakRatings:state.athlete.ratings};
  const next=advanceAgeYear(athlete,52);
  assert.equal(next.aged,true);
  assert.equal(next.athlete.age,45);
  assert.ok(next.ageNote.length>0);
  assert.ok(next.athlete.formats.doubles<=ratingCeilingFor(next.athlete).doubles);
});

test('a retirement recommendation appears when the ceiling leaves the pursued level',()=>{
  const state=career({age:60});
  const veteran={
    ...state,
    contract:'gold',
    athlete:{
      ...state.athlete,
      age:60,
      peakAge:27,
      peakFormats:{singles:5.3,doubles:5.2,mixed:5.1}
    }
  };
  const advice=retirementAdvice(veteran);
  assert.equal(advice.recommended,true);
  assert.match(advice.message,/retire/i);
});

test('voluntary retirement freezes the career and creates the final artifact',()=>{
  let state=career({age:35});
  state=recordGame(state,{week:4,eventId:'city-open',format:'doubles',eventType:'tournament',won:true,pointsFor:11,pointsAgainst:7,rating:3.6,delta:.1});
  const ended=retire(state,'voluntary');
  assert.ok(ended.ok);
  assert.equal(ended.state.retired,true);
  assert.equal(ended.state.epilogue.endAge,35);
  assert.equal(ended.state.epilogue.games,1);
  assert.equal(ended.state.allTimeBoard.length,1);
  assert.equal(canAct(ended.state),false);
  assert.equal(canEnterEvent(ended.state),false);
  assert.deepEqual(currentEvents(ended.state),[]);
  assert.equal(advanceWeek(ended.state).ok,false);
  const second=retire(ended.state);
  assert.equal(second.ok,false);
  assert.match(second.message,/already ended/);
});

test('the all-time board ranks completed careers by titles and wins',()=>{
  const state=career({age:40});
  const board=allTimeBoard({allTimeBoard:[
    {name:'A',titles:1,wins:20,peakRatings:{singles:4}},
    {name:'B',titles:2,wins:10,peakRatings:{singles:3}},
    {name:'C',titles:1,wins:30,peakRatings:{singles:5}}
  ]});
  assert.deepEqual(board.map(entry=>entry.name),['B','C','A']);
});