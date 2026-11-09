import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,currentEvents,joinClub} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {startCareerMatch,quickSimCareerMatch,simulateCompetitionToEnd} from '../src/career/career-match.js';

const career=()=>createCareer({name:'Quick Sim Tester',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242});
const withClub=state=>{
  const clubs=buildClubIndex(state.seed,state.regionId);
  return joinClub(state,clubs.find(club=>club.cityId===state.cityId).id).state;
};
const startLeague=()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  assert.ok(event,'the local league should be available');
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  assert.ok(started.ok,started.message);
  return started.state;
};

test('a league season is shortened to one opponent per card',()=>{
  const state=startLeague();
  assert.equal(state.tournament.nightMatches,1);
  assert.equal(state.tournament.rounds.length,3,'the local league should expose three career cards');
  assert.ok(state.pendingMatch,'the first card has a player match');
});

test('quick sim resolves the current league series through the normal career path',()=>{
  const started=startLeague();
  const simulated=quickSimCareerMatch(started);
  assert.ok(simulated.ok,simulated.message);
  assert.ok(simulated.games>=2&&simulated.games<=3,'a best-of-three should finish in two or three games');
  assert.equal(simulated.state.matches.length,simulated.games);
  assert.ok(simulated.state.matches.every(match=>match.report?.mode==='career-quick-sim'));
  assert.equal(simulated.state.athlete.record.matches,simulated.games);
  assert.equal(simulated.state.tournament.round,1,'the league advances one card');
  assert.equal(simulated.state.tournament.nightComplete,true,'the next card waits for a new week');
  assert.equal(simulated.state.pendingMatch,null);
});

test('simulate to end advances league weeks and closes the event',()=>{
  const started=startLeague();
  const simulated=simulateCompetitionToEnd(started);
  assert.ok(simulated.ok,simulated.message);
  assert.equal(simulated.partial,false);
  assert.equal(simulated.weeks,2,'three cards require two calendar advances');
  assert.ok(simulated.games>=6&&simulated.games<=9);
  assert.equal(simulated.state.week,started.week+2);
  assert.equal(simulated.state.matches.length,simulated.games);
  assert.equal(simulated.state.tournament.finished,true);
  assert.ok(simulated.state.tournament.playerPlace>=1);
  assert.equal(simulated.state.eventHistory.length,1);
  assert.equal(simulated.state.eventHistory[0].type,'league');
});

test('quick sim is deterministic for the same pending state',()=>{
  const started=startLeague();
  const left=quickSimCareerMatch(JSON.parse(JSON.stringify(started)));
  const right=quickSimCareerMatch(JSON.parse(JSON.stringify(started)));
  assert.deepEqual(left.state.matches.map(match=>[match.score,match.rating]),right.state.matches.map(match=>[match.score,match.rating]));
  assert.deepEqual(left.state.athlete.formats,right.state.athlete.formats);
});

test('the career UI exposes manual, quick, and full-competition actions',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/career/main.js',import.meta.url),'utf8');
  assert.match(source,/data-action="quick-sim"/);
  assert.match(source,/data-action="sim-competition"/);
  assert.match(source,/data-action="quick-attend"/);
  assert.match(source,/simulateCompetitionToEnd/);
});