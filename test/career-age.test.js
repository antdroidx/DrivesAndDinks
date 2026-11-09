import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,advanceWeek,canAct,canEnterEvent,currentEvents,weeklyRecovery} from '../src/career/state.js';
import {
  MIN_START_AGE,MAX_START_AGE,developmentAgeFactor,agilityAgeFactor,powerAgeFactor,attributeAgeFactor,
  ageSkillFactor,recoveryAgeFactor,trainingSessionsForAge,trainingSessionsForAge as sessionCap,
  createDevelopmentProfile,capAttributeForAge,capRatingForAge,advanceAgeYear,ratingCeilingFor
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

test('development and physical decline affect different attributes',()=>{
  assert.ok(developmentAgeFactor(10)<developmentAgeFactor(15));
  assert.ok(developmentAgeFactor(15)<developmentAgeFactor(20));
  assert.equal(developmentAgeFactor(25),1);
  assert.equal(agilityAgeFactor(35),1);
  assert.ok(agilityAgeFactor(36)<1);
  assert.ok(agilityAgeFactor(50)<agilityAgeFactor(36));
  assert.ok(agilityAgeFactor(80)<agilityAgeFactor(50));
  assert.equal(powerAgeFactor(49),1);
  assert.equal(powerAgeFactor(50),1);
  assert.ok(powerAgeFactor(51)<1);
  assert.ok(powerAgeFactor(55)>.85,'hard hitters keep most of their power into the fifties');
  assert.ok(attributeAgeFactor('dink',80)<1,'technical touch can soften late in a career');
  assert.equal(attributeAgeFactor('courtIQ',80),1,'court IQ remains an adaptation tool');
  assert.ok(attributeAgeFactor('dink',80,{},1)>attributeAgeFactor('dink',80,{},0),'training maintains technical touch');
  assert.equal(recoveryAgeFactor(25),1);
  assert.ok(recoveryAgeFactor(40)<1);
  assert.ok(recoveryAgeFactor(60)<recoveryAgeFactor(40));
});

test('normal and late-starting careers have different peak windows',()=>{
  const early=createDevelopmentProfile(4242,12).peakAge;
  const late=createDevelopmentProfile(4242,30).peakAge;
  const veryLate=createDevelopmentProfile(4242,50).peakAge;
  assert.ok(early>=25&&early<=35,'a young starter normally peaks from 25-35');
  assert.ok(late>=38,'a late starter can reach a later technical peak');
  assert.equal(veryLate,45,'late development is still limited by age');
});

test('training capacity declines independently from technique growth',()=>{
  assert.equal(trainingSessionsForAge(30),4);
  assert.equal(trainingSessionsForAge(40),3);
  assert.equal(trainingSessionsForAge(50),2);
  assert.equal(trainingSessionsForAge(65),1);
  const technical=career({age:70}).athlete;
  technical.peakRatings={...technical.peakRatings,dink:95};
  const declining=capAttributeForAge(technical,'dink',95);
  const maintained=capAttributeForAge({...technical,maintenance:{...technical.maintenance,dink:1}},'dink',95);
  assert.ok(maintained>declining,'training can sustain a technical attribute through decline');
});

test('recovery declines with age without making a week unusable',()=>{
  const young=career({age:24});
  const veteran=career({age:55});
  young.athlete.formats={singles:5.5,doubles:5.5,mixed:5.5};
  veteran.athlete.formats={singles:5.5,doubles:5.5,mixed:5.5};
  assert.ok(weeklyRecovery(veteran)<weeklyRecovery(young));
  assert.ok(weeklyRecovery(veteran)>=10);
});

test('elite physical ceilings preserve realistic performance through age',()=>{
  assert.ok(ageSkillFactor(55)>.7,'a typical elite player retains useful physical performance at 55');
  assert.ok(ageSkillFactor(60)<ageSkillFactor(55));
  assert.ok(ageSkillFactor(80)<.35,'eighty begins a pronounced physical drop');
  assert.ok(recoveryAgeFactor(80)<recoveryAgeFactor(79));
});

test('an older player can still improve ratings and technical skills',()=>{
  const athlete=career({age:60}).athlete;
  const raised=capRatingForAge(athlete,'doubles',7.2);
  assert.equal(raised.rating,7.2,'format ratings are not hard-capped by age');
  assert.equal(raised.peakFormats.doubles,7.2);
  assert.ok(ratingCeilingFor(athlete).doubles<8,'the physical estimate is advisory, not a hard rating cap');
  const noMaintenance=capAttributeForAge({...athlete,peakRatings:{...athlete.peakRatings,dink:95}},'dink',95);
  const withMaintenance=capAttributeForAge({...athlete,peakRatings:{...athlete.peakRatings,dink:95},maintenance:{...athlete.maintenance,dink:1}},'dink',95);
  assert.ok(noMaintenance<95,'technical skill naturally softens in late career');
  assert.ok(withMaintenance>noMaintenance,'training slows the technical decline');
  assert.ok(capAttributeForAge(athlete,'agility',95)<95,'movement training reaches a lower ceiling');
});

test('birthdays reduce movement and later power without erasing technique',()=>{
  const base=career({age:50}).athlete;
  const athlete={
    ...base,
    age:50,
    peakRatings:{...base.ratings,agility:95,power:95,dink:95},
    ratings:{...base.ratings,agility:90,power:94,dink:90},
    peakFormats:{singles:5,doubles:5,mixed:5},
    formats:{singles:5,doubles:5,mixed:5}
  };
  const next=advanceAgeYear(athlete,52);
  assert.equal(next.aged,true);
  assert.equal(next.athlete.age,51);
  assert.ok(next.athlete.ratings.agility<90);
  assert.ok(next.athlete.ratings.power<94);
  assert.equal(next.athlete.ratings.dink,90,'shot quality does not decline automatically');
  assert.equal(next.athlete.formats.doubles,5,'the physical estimate does not cap the result rating');
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