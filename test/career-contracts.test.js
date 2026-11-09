import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,currentEvents,canEnterEvent,eventEntryCost,formatsPlayed} from '../src/career/state.js';
import {startCareerMatch} from '../src/career/career-match.js';
import {
  signed,contractOffer,recordTourEvent,recordReentryEvent,markRecommendation,
  obligationProgress,evaluateSeason,isIneligible,isTourEvent,
  OBLIGATION_EVENTS,REENTRY_EVENTS,INELIGIBLE_WEEKS
} from '../src/career/contracts.js';
import {entryStatus,entryEligibility} from '../src/career/calendar.js';
import {pointsAtRank} from '../src/career/ranking.js';

const career=(week=0)=>createCareer({name:'Contract Tester',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242,week});

function ranked(state,rank){
  const points=pointsAtRank(rank);
  return {
    ...state,
    rankingResults:['doubles','mixed','singles'].map(format=>({week:state.week,eventId:'seed',format,tier:'major',place:1,points}))
  };
}

function meetObligation(state){
  let next=state;
  for(let index=0;index<OBLIGATION_EVENTS;index++){
    next=recordTourEvent(next,{
      eventId:'event-'+index,
      week:0,
      format:index<OBLIGATION_EVENTS/2?'doubles':'mixed'
    });
  }
  return next;
}

test('a tour contract tracks events and requires two disciplines',()=>{
  let state=signed(ranked(career(),40),'futures',0);
  state=meetObligation(state);
  const progress=obligationProgress(state);
  assert.equal(progress.events,OBLIGATION_EVENTS);
  assert.equal(progress.formats.doubles,6);
  assert.equal(progress.formats.mixed,6);
  assert.equal(progress.met,true);

  let oneDiscipline=signed(ranked(career(),40),'futures',0);
  for(let index=0;index<OBLIGATION_EVENTS;index++){
    oneDiscipline=recordTourEvent(oneDiscipline,{eventId:'d-'+index,week:0,format:'doubles'});
  }
  assert.equal(obligationProgress(oneDiscipline).disciplines,1);
  assert.equal(obligationProgress(oneDiscipline).met,false);
});

test('an event cannot count twice toward the obligation',()=>{
  let state=signed(ranked(career(),40),'futures',0);
  state=recordTourEvent(state,{eventId:'same-event',week:0,format:'doubles'});
  state=recordTourEvent(state,{eventId:'same-event',week:0,format:'mixed'});
  assert.equal(state.contractEvents,1);
  assert.equal(state.contractFormats.doubles,1);
  assert.equal(state.contractFormats.mixed,1);
  assert.deepEqual(state.contractEventLog[0].formats,['doubles','mixed']);
  state=recordTourEvent(state,{eventId:'same-event',week:0,format:'mixed'});
  assert.equal(state.contractFormats.mixed,1,'a repeated division does not count twice');
});

test('a failed review releases the player into a twelve-month re-entry period',()=>{
  const top=meetObligation(signed(ranked(career(),40),'futures',0));
  const missed=recordTourEvent(top,{eventId:'one-more',week:0,format:'singles'});
  const outside=ranked({...missed,week:52},60);
  const reviewed=evaluateSeason(outside);
  assert.equal(reviewed.released,true);
  assert.equal(reviewed.state.contract,'none');
  assert.equal(reviewed.state.ineligibleUntil,52+INELIGIBLE_WEEKS);
  assert.equal(isIneligible(reviewed.state,52),true);
});

test('a stale ranking cannot bypass the re-entry period',()=>{
  const released={...ranked(career(),1),contract:'none',ineligibleUntil:INELIGIBLE_WEEKS,reentryEvents:0,reentryEventIds:[],contractRecommendation:null};
  assert.equal(contractOffer(released),null);
  let working=released;
  for(let index=0;index<REENTRY_EVENTS;index++){
    working=recordReentryEvent(working,{eventId:'small-'+index,week:index});
  }
  assert.equal(working.reentryEvents,REENTRY_EVENTS);
  assert.equal(contractOffer(working),'futures');
  const signedAgain=signed(working,'futures',working.week);
  assert.equal(signedAgain.contract,'futures');
  assert.equal(signedAgain.ineligibleUntil,null);
});

test('one event can supply all three divisions without inflating the contract event count',()=>{
  let state=signed(ranked(career(),40),'futures',0);
  for(const format of ['singles','doubles','mixed']){
    state=recordTourEvent(state,{eventId:'triple',week:0,format});
  }
  assert.equal(state.contractEvents,1);
  assert.deepEqual(state.contractFormats,{singles:1,doubles:1,mixed:1});
  assert.deepEqual(state.contractEventLog[0].formats,['singles','doubles','mixed']);
});

test('after one division, another division at the same event remains playable',()=>{
  const state=career();
  const event={eventId:'city-open',formats:['singles','doubles','mixed'],energyCost:30,tier:'challenger',shapes:['tournament-bracket']};
  const afterDoubles={
    ...state,
    lastEventWeek:0,
    eventEntries:[{week:0,eventId:'city-open',format:'doubles',divisionId:'3.5'}],
    tournament:{eventId:'city-open',finished:true}
  };
  assert.deepEqual(formatsPlayed(afterDoubles,'city-open'),['doubles']);
  assert.equal(canEnterEvent(afterDoubles,event),true);
  assert.equal(eventEntryCost(afterDoubles,event),6,'only additional match load is charged');
  assert.equal(canEnterEvent({...afterDoubles,tournament:{eventId:'city-open',finished:false}},event),false);
  assert.equal(canEnterEvent({...afterDoubles,tournament:{eventId:'other-event',finished:true}},event),false);
});

test('a challenger win supplies the recommendation route back',()=>{
  const released={...career(),contract:'none',ineligibleUntil:52,contractRecommendation:null};
  assert.equal(contractOffer(markRecommendation(released,'challenger-win')),'futures');
});

test('Futures promotion is reviewed after twelve months',()=>{
  const top=meetObligation(signed(ranked(career(),25),'futures',0));
  const due={...top,week:52,rankingResults:top.rankingResults.map(result=>({...result,week:52}))};
  const reviewed=evaluateSeason(due);
  assert.equal(reviewed.released,false);
  assert.equal(reviewed.promoted,true);
  assert.equal(reviewed.state.contract,'standard');
});

test('Gold can be demoted to Standard at review',()=>{
  const state=meetObligation(signed(ranked(career(),40),'gold',0));
  const reviewed=evaluateSeason({...state,week:52,rankingResults:state.rankingResults.map(result=>({...result,week:52}))});
  assert.equal(reviewed.released,false);
  assert.equal(reviewed.demoted,true);
  assert.equal(reviewed.state.contract,'standard');
});

test('entry cuts use the division ranking rather than the Overall ranking',()=>{
  const state=career();
  const high=pointsAtRank(1);
  const low=pointsAtRank(40);
  state.rankingResults=[
    {week:0,eventId:'d',format:'doubles',tier:'major',place:1,points:high},
    {week:0,eventId:'m',format:'mixed',tier:'major',place:1,points:low},
    {week:0,eventId:'s',format:'singles',tier:'major',place:1,points:low}
  ];
  state.wildCards=0;
  const event={tier:'open',drawSize:32,qualifierSlots:4,qualifierFieldSize:64,wildCardSlots:2,shapes:['tournament-bracket']};
  assert.equal(entryStatus(state,event,{format:'doubles'}).via,'ranking');
  assert.equal(entryStatus(state,event,{format:'singles'}).via,'qualifier');
});

test('the release period blocks the biggest events and leaves the smaller route open',()=>{
  const state={...career(),contract:'none',ineligibleUntil:52};
  const major=entryEligibility(state,{tier:'major',scope:'world'});
  const challenger=entryEligibility(state,{tier:'challenger',scope:'area',brackets:[]});
  assert.equal(major.ok,false);
  assert.match(major.reason,/re-entry period/);
  assert.equal(challenger.ok,true);
});

test('MLP does not count toward the PPA obligation or re-entry route',()=>{
  assert.equal(isTourEvent({id:'mlp',tier:'major'}),false);
  assert.equal(isTourEvent({id:'pro-league',tier:'major'}),true);
  const released={...career(),contract:'none',ineligibleUntil:52,reentryEvents:0,reentryEventIds:[]};
  const afterMlp=recordReentryEvent(released,{eventId:'mlp',week:0});
  assert.equal(afterMlp.reentryEvents,0);
});

test('the summer MLP is playable as a weekly background-managed team league',()=>{
  const state=ranked({...career(),week:22},5);
  state.athlete={...state.athlete,formats:{singles:5.5,doubles:5.5,mixed:5.5},tourPoints:5000,tourPointsHistory:[{week:0,points:5000}]};
  const event=currentEvents(state).find(entry=>entry.eventId==='mlp');
  assert.ok(event,'the MLP should run during its summer window');
  assert.equal(event.eligible.ok,true,event.lockedReason);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  assert.ok(started.ok,started.message);
  assert.equal(started.state.tournament.shape,'mlp');
  assert.equal(started.state.tournament.nightMatches,1,'one team series pauses the league for the week');
  assert.equal(started.state.tournament.teams.length,8);
});