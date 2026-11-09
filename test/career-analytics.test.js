import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,joinClub,currentEvents,advanceWeek} from '../src/career/state.js';
import {startCareerMatch,finishCareerMatch} from '../src/career/career-match.js';
import {buildClubIndex} from '../src/career/population.js';
import {
  emptyAnalytics,normalizeAnalytics,recordGame,recordEventResult,medalFor,analyticsSummary
} from '../src/career/analytics.js';

const career=()=>createCareer({name:'Analytics Tester',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242});
const withClub=(state)=>{
  const clubs=buildClubIndex(state.seed,state.regionId);
  return joinClub(state,clubs.find(club=>club.cityId===state.cityId).id).state;
};
const reportFor=(pending,points)=>{
  return {
    score:{points,winner:points[0]>points[1]?0:1},
    players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
  };
};

test('a new career starts with durable analytics and current rating anchors',()=>{
  const state=career();
  const analytics=normalizeAnalytics(state.analytics,state.athlete.formats);
  assert.equal(analytics.formats.doubles.played,0);
  assert.equal(analytics.byType.tournament.played,0);
  assert.equal(analytics.ratingStarts.doubles,state.athlete.formats.doubles);
  assert.equal(analytics.ratingPeaks.doubles,state.athlete.formats.doubles);
});

test('game totals split by format, competition type and doubles category',()=>{
  let state=career();
  state=recordGame(state,{week:0,eventId:'a',format:'doubles',eventType:'tournament',won:true,pointsFor:11,pointsAgainst:7,rating:3.6,delta:.1});
  state=recordGame(state,{week:1,eventId:'b',format:'mixed',eventType:'league',won:false,pointsFor:9,pointsAgainst:11,rating:3.4,delta:-.1});
  state=recordGame(state,{week:2,eventId:'c',format:'singles',eventType:'tournament',won:true,pointsFor:15,pointsAgainst:13,rating:3.7,delta:.2});
  const summary=analyticsSummary(state);
  assert.equal(summary.overall.played,3);
  assert.equal(summary.overall.wins,2);
  assert.equal(summary.overall.losses,1);
  assert.equal(summary.overall.pointsFor,35);
  assert.equal(summary.overall.pointsAgainst,31);
  assert.equal(summary.doublesAll.played,2);
  assert.equal(summary.formats.doubles.played,1);
  assert.equal(summary.formats.mixed.played,1);
  assert.equal(summary.formats.singles.played,1);
  assert.equal(summary.byType.tournament.played,2);
  assert.equal(summary.byType.league.played,1);
  assert.equal(summary.ratingPeaks.mixed,3.5,'a decline does not replace the peak');
});

test('event medals distinguish tournament semifinals from league third place',()=>{
  assert.equal(medalFor({type:'tournament',place:1,fieldSize:32}),'gold');
  assert.equal(medalFor({type:'tournament',place:2,fieldSize:32}),'silver');
  assert.equal(medalFor({type:'tournament',place:4,fieldSize:32}),'bronze');
  assert.equal(medalFor({type:'league',place:3,fieldSize:8}),'bronze');
  assert.equal(medalFor({type:'league',place:4,fieldSize:8}),null);
});

test('event history records placing, medals, scoring and payout once',()=>{
  let state=career();
  const result={
    key:'12:city-open:doubles:3.5',
    week:12,
    eventId:'city-open',
    optionId:'doubles:3.5',
    label:'City Open',
    type:'tournament',
    tier:'challenger',
    format:'doubles',
    place:1,
    fieldSize:16,
    games:4,
    wins:4,
    losses:0,
    pointsFor:44,
    pointsAgainst:31,
    prize:500,
    rankingPoints:250
  };
  state=recordEventResult(state,result);
  state=recordEventResult(state,result);
  assert.equal(state.eventHistory.length,1);
  assert.equal(state.eventHistory[0].medal,'gold');
  assert.equal(state.analytics.events.tournament.played,1);
  assert.equal(state.analytics.events.tournament.gold,1);
  assert.equal(state.analytics.events.tournament.titles,1);
  assert.equal(state.analytics.events.tournament.prize,500);
});

test('an engine game updates cumulative analytics and rating history',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const pending=started.pending;
  const scored=finishCareerMatch(started.state,reportFor(pending,[11,4]));
  assert.ok(scored.ok,scored.message);
  const summary=analyticsSummary(scored.state);
  assert.equal(summary.overall.played,1);
  assert.equal(summary.overall.wins,1);
  assert.equal(summary.overall.pointsFor,11);
  assert.equal(summary.overall.pointsAgainst,4);
  assert.equal(scored.state.ratingHistory.length,1);
  assert.equal(scored.state.ratingHistory[0].format,pending.format);
});

test('a completed league archives its final placing and series record',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  let current=startCareerMatch(state,event.id,event.defaultOptionId).state;
  let guard=0;
  while(guard++<50&&!current.tournament.finished){
    if(!current.pendingMatch){
      current=advanceWeek(current).state;
      current=startCareerMatch(current,current.tournament.eventId,current.tournament.optionId).state;
      continue;
    }
    const scored=finishCareerMatch(current,reportFor(current.pendingMatch,[11,5]));
    assert.ok(scored.ok,scored.message);
    current=scored.state;
  }
  assert.equal(current.eventHistory.length,1);
  const archived=current.eventHistory[0];
  assert.equal(archived.type,'league');
  assert.ok(archived.place>=1);
  assert.ok(archived.games>0);
  assert.equal(current.analytics.events.league.played,1);
});