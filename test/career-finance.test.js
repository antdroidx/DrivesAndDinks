import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCareer,advanceWeek,canEnterEvent,eventBlockReason,currentEvents} from '../src/career/state.js';
import {startCareerMatch} from '../src/career/career-match.js';
import {
  chargeEventCosts,creditPrize,paySalary,eventFinancialCost,financeSummary,validateFinance
} from '../src/career/finance.js';
import {projectedEventMatches,projectEventLoad,weeklyActivityPlan} from '../src/career/planning.js';
import {migrateCareer,saveCareer,loadCareer,memoryStorage,CAREER_SAVE_VERSION} from '../src/career/save.js';
import {EVENT_BY_ID} from '../src/career/geography.js';

const career=(overrides={})=>createCareer({
  name:'Finance Tester',gender:'male',archetypeId:'avery',
  regionId:'north-america',cityId:'seattle',seed:4242,...overrides
});

test('event projections expose money, energy, recovery and match workload',()=>{
  const state=career();
  const localLeague=currentEvents(state).find(event=>event.eventId==='local-league');
  const load=projectEventLoad(state,localLeague,{recovery:66});
  assert.equal(load.energy,8);
  assert.equal(load.moneyCost,10);
  assert.equal(load.energyAfter,92);
  assert.equal(load.moneyAfter,240);
  assert.equal(load.projectedNextEnergy,100);
  assert.equal(load.matches.min,2);
  assert.equal(load.matches.max,3);
  assert.equal(load.matches.unit,'games');
  assert.match(load.matchLabel,/about 3/);
});

test('competition shapes produce bounded player match estimates',()=>{
  const bracket=projectedEventMatches(EVENT_BY_ID['world-championship']);
  assert.equal(bracket.min,2);
  assert.equal(bracket.max,8);
  const doubleElimination=projectedEventMatches(EVENT_BY_ID.international);
  assert.equal(doubleElimination.min,3);
  assert.ok(doubleElimination.max>=9);
  const clubLadder=projectedEventMatches(EVENT_BY_ID['club-night']);
  assert.equal(clubLadder.min,clubLadder.max);
  assert.ok(clubLadder.expected>=4);
});

test('entry and travel costs are charged once per event week',()=>{
  const state=career();
  const event=EVENT_BY_ID['city-open'];
  const projected=eventFinancialCost(state,event);
  assert.deepEqual({entry:projected.entry,travel:projected.travel,total:projected.total},{entry:25,travel:0,total:25});
  const charged=chargeEventCosts(state,event,'City Open');
  assert.ok(charged.ok,charged.message);
  assert.equal(charged.state.money,225);
  assert.equal(charged.state.finance.ledger.length,1);
  assert.equal(charged.state.finance.ledger[0].category,'entry');
  const second=chargeEventCosts({
    ...charged.state,
    eventEntries:[{week:0,eventId:'city-open',format:'doubles'}]
  },event,'City Open');
  assert.ok(second.ok);
  assert.equal(second.state.money,225);
  assert.equal(second.state.finance.ledger.length,1);
});

test('world events include travel and cannot be entered without the cash',()=>{
  const poor={...career(),money:5};
  const event=EVENT_BY_ID.international;
  const cost=eventFinancialCost(poor,event);
  assert.equal(cost.travel,350);
  assert.equal(canEnterEvent(poor,{...event,week:0,id:'w0-international',eventId:'international',energyCost:event.energy,options:[{}],eligible:{ok:true}}),false);
  assert.match(eventBlockReason(poor,{...event,energyCost:event.energy}),/entry and travel/);
  const current=currentEvents({...career({experience:'competitive',age:20}),week:8,athlete:{...career().athlete,formats:{singles:5.5,doubles:5.5,mixed:5.5},tourPoints:1000,tourPointsHistory:[{week:0,points:1000}]}}).find(entry=>entry.eventId==='international');
  if(current?.eligible?.ok){
    const started=startCareerMatch({...poor,athlete:current.ownRatings?poor.athlete:poor.athlete,athleteFormats:undefined},current.id,current.defaultOptionId);
    assert.equal(started.ok,false);
    assert.match(started.message,/entry and travel|energy/);
  }
});

test('salary and prizes stay in the dated ledger and match the balance',()=>{
  let state={...career(),contract:'futures'};
  const salary=paySalary(state,{week:1,contract:'futures'});
  assert.ok(salary.ok);
  assert.equal(salary.state.money,350);
  assert.equal(salary.state.finance.ledger[0].category,'salary');
  assert.equal(salary.state.finance.ledger[0].date,'2026-01-12');
  const prize=creditPrize(salary.state,{week:1,label:'Prize · City Open',amount:300,reference:'tournament:city-open'});
  assert.ok(prize.ok);
  assert.equal(prize.state.money,650);
  assert.equal(prize.state.finance.ledger.at(-1).category,'prize');
  assert.ok(validateFinance(prize.state).ok);
  const summary=financeSummary(prize.state);
  assert.equal(summary.balance,650);
  assert.equal(summary.income,400);
  assert.equal(summary.expenses,0);
});

test('a weekly contract salary appears when the calendar advances',()=>{
  const state={...career(),contract:'standard'};
  const advanced=advanceWeek(state).state;
  assert.equal(advanced.money,state.money+250);
  const entry=advanced.finance.ledger.at(-1);
  assert.equal(entry.category,'salary');
  assert.equal(entry.week,1);
});

test('schema v15 careers gain a valid finance ledger',()=>{
  const legacy=career();
  delete legacy.finance;
  const migrated=migrateCareer({version:15,state:legacy});
  assert.ok(migrated.ok,migrated.reason);
  assert.equal(migrated.version,CAREER_SAVE_VERSION);
  assert.deepEqual(migrated.state.finance.ledger,[]);
  assert.ok(validateFinance(migrated.state).ok);
  const storage=memoryStorage();
  assert.ok(saveCareer(migrated.state,storage).ok);
  assert.equal(loadCareer(storage).state.money,250);
});

test('career UI shows the planning contract and finance ledger',()=>{
  const main=readFileSync(new URL('../src/career/main.js',import.meta.url),'utf8');
  assert.match(main,/<h2>WEEK PLAN<\/h2>/);
  assert.match(main,/<h2>FINANCE<\/h2>/);
  assert.match(main,/After entry: \$\{load\.energyAfter\} energy/);
  assert.ok(main.includes('recovery:weeklyRecovery(career)'));
});
