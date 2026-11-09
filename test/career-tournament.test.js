import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer} from '../src/career/state.js';
import {
  startTournament,startRound,nextPlayerMatch,simulateRestOfRound,recordPlayerResult,
  isPlayerDone,playerHasBye,tournamentPoints,bracketSize,seedOrder,placeForLoss
} from '../src/career/tournament.js';
import {pointsForFinish} from '../src/career/tour.js';
import {seededRandom} from '../src/competition.js';

const state=createCareer({name:'Shape Tester',seed:7,regionId:'north-america'});
const option={id:'doubles:3.5',format:'doubles',divisionId:'3.5',label:'3.5'};
const eventFor=(shape)=>({
  eventId:'test-'+shape,label:'Test '+shape,shapes:[shape],drawSize:8,
  energy:10,championPoints:500,matchType:'tournament',gateBasis:'open',open:true
});

// Plays a tournament out, winning every match.
function playOut(tournament,random){
  startRound(tournament,random);
  let guard=0;
  while(!isPlayerDone(tournament)&&guard++<50){
    if(playerHasBye(tournament)){
      simulateRestOfRound(tournament,random);
      recordPlayerResult(tournament,{won:true,score:'bye'});
      if(!tournament.finished&&!tournament.playerOut)startRound(tournament,random);
      continue;
    }
    const match=nextPlayerMatch(tournament);
    if(!match)break;
    simulateRestOfRound(tournament,random);
    recordPlayerResult(tournament,{won:true,score:'11-7'});
    if(!tournament.finished&&!tournament.playerOut)startRound(tournament,random);
  }
  return tournament;
}

const SHAPES=Object.freeze([
  ['tournament-bracket','bracket'],
  ['round-robin-league','round-robin'],
  ['tournament-double-elimination','double-elimination'],
  ['ladder-fixed','ladder'],
  ['round-robin-open','open'],
  ['ladder-open','open'],
  ['mlp-style','mlp']
]);

test('every shape plays out to a placing',()=>{
  for(const [kind,shape] of SHAPES){
    const started=startTournament({state,event:eventFor(kind),option});
    assert.ok(started.ok,kind+': '+started.message);
    const tournament=playOut(started.tournament,seededRandom(31));
    assert.equal(tournament.shape,shape,kind+' runs as '+shape);
    assert.ok(isPlayerDone(tournament),kind+' finished');
    assert.equal(tournament.playerPlace,1,kind+' rewards a perfect run');
    assert.equal(tournamentPoints(tournament),500,kind+' pays the champion points');
  }
});

test('a loss ends a knockout and keeps a league going',()=>{
  const bracket=startTournament({state,event:eventFor('tournament-bracket'),option}).tournament;
  startRound(bracket,seededRandom(5));
  simulateRestOfRound(bracket,seededRandom(5));
  recordPlayerResult(bracket,{won:false,score:'7-11'});
  assert.ok(isPlayerDone(bracket),'losing a knockout ends the run');
  assert.equal(bracket.playerPlace,5,'an eight team bracket pays fifth for a first round loss');

  const league=startTournament({state,event:eventFor('round-robin-league'),option}).tournament;
  startRound(league,seededRandom(5));
  simulateRestOfRound(league,seededRandom(5));
  recordPlayerResult(league,{won:false,score:'7-11'});
  assert.equal(isPlayerDone(league),false,'a league continues after a loss');
  assert.ok(league.round>0,'the league moved on');
});

test('a bracket is sized to the next power of two and seeded strongest first',()=>{
  assert.equal(bracketSize(8),8);
  assert.equal(bracketSize(24),32);
  assert.equal(bracketSize(56),64);
  assert.deepEqual(seedOrder(8),[0,7,3,4,1,6,2,5]);
  assert.equal(placeForLoss(0,16),9);
  assert.equal(placeForLoss(1,16),5);
  assert.equal(placeForLoss(2,16),3);
  assert.equal(placeForLoss(3,16),2);
});

test('points follow the real tour proportions by place',()=>{
  assert.equal(pointsForFinish(2000,1),2000);
  assert.equal(pointsForFinish(2000,2),1600);
  assert.equal(pointsForFinish(2000,3),1200);
  assert.equal(pointsForFinish(2000,4),1200);
  assert.equal(pointsForFinish(2000,5),800);
  assert.equal(pointsForFinish(2000,9),400);
  assert.equal(pointsForFinish(0,1),0);
});

test('a double elimination gives a team a second life',()=>{
  const tournament=startTournament({state,event:eventFor('tournament-double-elimination'),option}).tournament;
  const random=seededRandom(11);
  startRound(tournament,random);
  simulateRestOfRound(tournament,random);
  recordPlayerResult(tournament,{won:false,score:'7-11'});
  assert.equal(isPlayerDone(tournament),false,'one loss is not elimination');
  assert.equal(tournament.lives[tournament.playerTeamId],1);
});

test('a ladder keeps every team in its ranking',()=>{
  const tournament=startTournament({state,event:eventFor('ladder-fixed'),option}).tournament;
  const ids=new Set(tournament.order.map(team=>team.id));
  assert.equal(ids.size,tournament.order.length,'no team is duplicated');
  assert.equal(tournament.order.length,tournament.teams.length,'every team is on the ladder');
});
