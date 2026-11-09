import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Score,normalizeScoringRules} from '../src/core.js';
import {simulateMatch,matchRules} from '../src/career/tournament.js';
import {createCareer,currentEvents,joinClub} from '../src/career/state.js';
import {startCareerMatch} from '../src/career/career-match.js';
import {buildClubIndex} from '../src/career/population.js';
import {seededRandom} from '../src/competition.js';

const home={skill:60},away={skill:60};

function counter(seed){
  const random=seededRandom(seed);
  let calls=0;
  return {random:()=>{calls++;return random();},get calls(){return calls}};
}

test('side-out only scores for the serving side',()=>{
  const score=new Score('singles',{targetScore:11,scoring:'side-out'});
  // Team one starts receiving. Losing the first rally is a side out.
  score.point(1);
  assert.deepEqual(score.points,[0,0]);
  assert.equal(score.team,1);
  // Now serving, they score.
  score.point(1);
  assert.deepEqual(score.points,[0,1]);
});

test('rally scoring awards a point to whoever wins the rally',()=>{
  const score=new Score('doubles',{targetScore:15,scoring:'rally'});
  score.point(1);
  assert.deepEqual(score.points,[0,1]);
  score.point(0);
  assert.deepEqual(score.points,[1,1]);
});

test('a game to fifteen ends at fifteen, and a game to eleven at eleven',()=>{
  const fifteen=new Score('singles',{targetScore:15,scoring:'rally'});
  for(let point=0;point<15;point++)fifteen.point(0);
  assert.equal(fifteen.winner,0);
  const eleven=new Score('singles',{targetScore:11,scoring:'rally'});
  for(let point=0;point<11;point++)eleven.point(0);
  assert.equal(eleven.winner,0);
});

test('win by two holds at the higher target',()=>{
  const score=new Score('singles',{targetScore:15,scoring:'rally'});
  for(let point=0;point<14;point++){score.point(0);score.point(1);}
  assert.equal(score.winner,null);
  score.point(0);
  assert.equal(score.winner,null,'fifteen-fourteen is not a win');
  score.point(0);
  assert.equal(score.winner,0);
});

test('side-out needs more rallies than rally scoring to finish a game',()=>{
  const side= counter(3);
  const sideOut=simulateMatch(home,away,side.random,11,{scoring:'side-out',winBy:2});
  const rally=counter(3);
  const rallyScore=simulateMatch(home,away,rally.random,11,{scoring:'rally',winBy:2});
  assert.ok(sideOut.homeMine>=11||sideOut.homeTheirs>=11);
  assert.ok(rallyScore.homeMine>=11||rallyScore.homeTheirs>=11);
  assert.ok(side.calls>rally.calls,'only the serving side scores in side-out');
});

test('rules normalize to a usable game',()=>{
  assert.deepEqual(normalizeScoringRules(),{targetScore:11,winBy:2,scoring:'side-out'});
  assert.deepEqual(normalizeScoringRules({points:15,scoring:'rally'}),{targetScore:15,winBy:2,scoring:'rally'});
  assert.deepEqual(normalizeScoringRules({targetScore:0,winBy:0,scoring:'nonsense'}),{targetScore:11,winBy:2,scoring:'side-out'});
});

test('the last four of a bracket play to the playoff score',()=>{
  const tournament={shape:'bracket',size:8,round:0,rules:{points:11,playoffPoints:15,scoring:'side-out',winBy:2}};
  assert.equal(matchRules(tournament).targetScore,11,'the round of eight plays to eleven');
  tournament.round=1;
  assert.equal(matchRules(tournament).targetScore,15,'the semi finals play to fifteen');
});

test('a career match carries its scoring rules to the engine',()=>{
  let state=createCareer({name:'Scoring Test',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242});
  const clubs=buildClubIndex(state.seed,state.regionId);
  state=joinClub(state,clubs.find(club=>club.cityId===state.cityId).id).state;
  const event=currentEvents(state).find(entry=>entry.eligible.ok&&entry.options.length);
  const option=event.options.find(entry=>entry.isPlayer)??event.options[0];
  const started=startCareerMatch(state,event.id,option.id);
  assert.ok(started.ok,started.message);
  assert.ok(started.pending.rules,'the match carries rules');
  assert.equal(started.pending.rules.scoring,'side-out');
  assert.ok([11,15].includes(started.pending.rules.targetScore));
});
