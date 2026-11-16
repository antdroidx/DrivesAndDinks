import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer} from '../src/career/state.js';
import {
  startTournament,startRound,nextPlayerMatch,simulateRestOfRound,recordPlayerResult,
  matchRules,leagueRecords,simulateLeagueSeries,compareLeagueTeams,isPlayerDone,playerHasBye,tournamentPoints,bracketSize,seedOrder,placeForLoss,seedBands,divisionPopulation
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
    assert.ok(tournament.playerPlace>=1,kind+' records a placing');
    assert.ok(tournamentPoints(tournament)>=0,kind+' pays for its placing');
  }
});

test('a loss ends a knockout and keeps a league going',()=>{
  const bracket=startTournament({state,event:eventFor('tournament-bracket'),option}).tournament;
  startRound(bracket,seededRandom(5));
  simulateRestOfRound(bracket,seededRandom(5));
  recordPlayerResult(bracket,{won:false,score:'7-11'});
  assert.equal(bracket.playerPlace,5,'an eight team bracket pays fifth for a first round loss');
  assert.equal(bracket.inConsolation,true,'a knockout loss opens a secondary match');
  assert.equal(isPlayerDone(bracket),false,'the secondary match is still to play');
  startRound(bracket,seededRandom(5));
  assert.ok(nextPlayerMatch(bracket),'there is a consolation match');
  recordPlayerResult(bracket,{won:true,score:'11-9'});
  assert.ok(isPlayerDone(bracket),'the secondary match ends the event');

  const league=startTournament({state,event:eventFor('round-robin-league'),option}).tournament;
  startRound(league,seededRandom(5));
  simulateRestOfRound(league,seededRandom(5));
  recordPlayerResult(league,{won:false,score:'7-11'});
  assert.equal(isPlayerDone(league),false,'a league continues after a loss');
  assert.equal(league.series.opponentWins,1,'the best of three is one game down');
  assert.equal(league.records[league.playerTeamId].points,7);
  const opponent=league.series.home.id===league.playerTeamId?league.series.away:league.series.home;
  assert.equal(league.records[opponent.id].points,11);
  recordPlayerResult(league,{won:true,score:'11-5'});
  assert.equal(league.records[league.playerTeamId].points,18);
  assert.equal(league.records[opponent.id].points,16);
});

test('a player outside the main draw has to qualify',()=>{
  const event=Object.assign(eventFor('tournament-bracket'),{tier:'open',qualifierSlots:4,qualifierFieldSize:64,wildCardSlots:0});
  const random=seededRandom(31);

  const win=startTournament({state,event,option}).tournament;
  assert.equal(win.shape,'qualifier','the bottom of the draw qualifies');
  startRound(win,random);
  const match=nextPlayerMatch(win);
  assert.ok(match,'there is a qualifier match');
  recordPlayerResult(win,{won:true,score:'11-7'});
  assert.equal(win.qualified,true);
  assert.equal(win.stage,'main');
  assert.notEqual(win.shape,'qualifier','winning promotes into the main draw');
  startRound(win,random);
  assert.ok(nextPlayerMatch(win),'the main draw has a first match');

  const loss=startTournament({state,event,option}).tournament;
  startRound(loss,random);
  recordPlayerResult(loss,{won:false,score:'7-11'});
  assert.equal(isPlayerDone(loss),true,'losing the qualifier ends the event');
  assert.equal(loss.failedToQualify,true);
  assert.equal(tournamentPoints(loss),0,'a qualifier loss pays nothing');
});

test('local draws keep every opponent in the career city and preserve their full look',()=>{
  const event={...eventFor('round-robin-league'),scope:'city',drawSize:8};
  const started=startTournament({state,event,option});
  assert.ok(started.ok,started.message);
  assert.ok(started.tournament.teams.length>=4,'a local draw still needs a playable field');
  const athletes=started.tournament.teams.flatMap(team=>team.members).filter(member=>!member.isPlayer&&member.id!=='player');
  assert.ok(athletes.length>0);
  assert.ok(athletes.every(member=>member.cityId===state.cityId),'a city league must use players from that city');
  assert.ok(athletes.every(member=>member.appearance&&member.ratings&&member.formats),'the draw must retain complete CPU data');
});

test('gender doubles and singles field only the player gender',()=>{
  const event=eventFor('tournament-bracket');
  for(const format of ['doubles','singles']){
    const option={id:format+':5.0+',format,divisionId:'5.0+',label:'5.0+'};
    const started=startTournament({state:{...state,week:5},event:{...event,drawSize:32},option});
    assert.ok(started.ok,started.message);
    assert.equal(started.tournament.teams.length,32);
    for(const team of started.tournament.teams){
      assert.ok(team.members.every(member=>member.gender===state.athlete.gender),format+' crossed gender lines');
    }
  }
});

test('mixed doubles fields one man and one woman on every team',()=>{
  const option={id:'mixed:5.0+',format:'mixed',divisionId:'5.0+',label:'5.0+'};
  const started=startTournament({state:{...state,week:6},event:{...eventFor('tournament-bracket'),drawSize:32},option});
  assert.ok(started.ok,started.message);
  assert.equal(started.tournament.teams.length,32);
  for(const team of started.tournament.teams){
    assert.equal(team.members.length,2);
    assert.deepEqual(new Set(team.members.map(member=>member.gender)),new Set(['male','female']),team.name);
  }
});

test('a full sixty-four-team professional field can be filled',()=>{
  const option={id:'doubles:5.0+',format:'doubles',divisionId:'5.0+',label:'5.0+'};
  const started=startTournament({state:{...state,week:7},event:{...eventFor('tournament-bracket'),drawSize:64},option});
  assert.ok(started.ok,started.message);
  assert.equal(started.tournament.teams.length,64);
  assert.equal(new Set(started.tournament.teams.flatMap(team=>team.members.map(member=>member.id))).size,128);
});

test('a later event draws a different slice of the same division',()=>{
  const option={id:'doubles:5.0+',format:'doubles',divisionId:'5.0+',label:'5.0+'};
  const event={...eventFor('tournament-bracket'),drawSize:16};
  const first=startTournament({state:{...state,week:8},event,option}).tournament;
  const second=startTournament({state:{...state,week:9},event,option}).tournament;
  const firstIds=new Set(first.teams.flatMap(team=>team.members.map(member=>member.id)));
  const secondIds=new Set(second.teams.flatMap(team=>team.members.map(member=>member.id)));
  const overlap=[...firstIds].filter(id=>secondIds.has(id)).length;
  assert.ok(overlap<firstIds.size,'the next field should not repeat the entire draw');
  const pool=divisionPopulation({state,event,option:{...option,format:'doubles'},gender:state.athlete.gender});
  assert.ok(pool.length>=128,'a 64-team gender doubles field needs 128 eligible players');
});

test('seeds are drawn in bands, with the top two fixed',()=>{
  const teams=Array.from({length:16},(_,index)=>({id:'t'+index,rating:5-index*0.1}));
  const drawn=seedBands(teams,seededRandom(7));
  assert.equal(drawn[0].id,'t0','seed one holds');
  assert.equal(drawn[1].id,'t1','seed two holds');
  assert.deepEqual(new Set(drawn.slice(4,8).map(team=>team.id)),new Set(['t4','t5','t6','t7']),'five to eight form a band');
  assert.deepEqual(new Set(drawn.slice(8,12).map(team=>team.id)),new Set(['t8','t9','t10','t11']),'nine to twelve form a band');
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


test('CPU league wins include all games in a best of three to 15',()=>{
  for(let seed=1;seed<=20;seed++){
    const result=simulateLeagueSeries({skill:70},{skill:70},seededRandom(seed),15);
    assert.ok(result.games.length===2||result.games.length===3);
    assert.ok((result.homeWon?result.homeMine:result.homeTheirs)>=30);
    assert.equal(result.homeMine,result.games.reduce((sum,game)=>sum+game.homeMine,0));
  }
});

test('league standings break tied match wins by differential, not points scored',()=>{
  const teams=[{id:'a',rating:5},{id:'b',rating:3}];
  const records={a:{wins:2,points:70,pointsAgainst:69},b:{wins:2,points:60,pointsAgainst:40}};
  assert.deepEqual(teams.sort((a,b)=>compareLeagueTeams(records,a,b)).map(team=>team.id),['b','a']);
});

test('league CPU records count full series and balance scored and conceded points',()=>{
  const tournament=startTournament({state,event:{...eventFor('round-robin-league'),rules:{points:15}},option}).tournament;
  tournament.rules={...tournament.rules,points:15};
  startRound(tournament,seededRandom(9));
  simulateRestOfRound(tournament,seededRandom(9));
  const records=Object.values(tournament.records);
  assert.equal(records.reduce((sum,row)=>sum+row.points,0),records.reduce((sum,row)=>sum+row.pointsAgainst,0));
  for(const row of records.filter(row=>row.wins))assert.ok(row.points>=30);
});


test('legacy player league totals recover the full season and continue accumulating',()=>{
  const tournament=startTournament({state,event:eventFor('round-robin-league'),option}).tournament;
  startRound(tournament,seededRandom(12));
  tournament.playerStats={games:4,wins:4,losses:0,pointsFor:60,pointsAgainst:22};
  tournament.records[tournament.playerTeamId]={wins:2,losses:0,points:2,pointsAgainst:15};
  const restored=leagueRecords(tournament)[tournament.playerTeamId];
  assert.equal(restored.points,60);
  assert.equal(restored.pointsAgainst,22);
  assert.equal(restored.wins,2);
  recordPlayerResult(tournament,{won:true,score:'15-8'});
  assert.equal(tournament.records[tournament.playerTeamId].points,75);
  assert.equal(tournament.records[tournament.playerTeamId].pointsAgainst,30);
  assert.deepEqual(leagueRecords(tournament),tournament.records);
  recordPlayerResult(tournament,{won:false,score:'12-15'});
  assert.equal(tournament.records[tournament.playerTeamId].points,87);
  assert.equal(tournament.records[tournament.playerTeamId].pointsAgainst,45);
});


test('existing local league seasons use games to 11 while MLP keeps rally scoring to 21',()=>{
 assert.deepEqual(matchRules({eventId:'local-league',rules:{points:15,scoring:'side-out',winBy:2}}),{targetScore:11,scoring:'side-out',winBy:2});
 assert.equal(matchRules({eventId:'mlp-amateur',rules:{points:21,scoring:'rally'}}).targetScore,21);
});
