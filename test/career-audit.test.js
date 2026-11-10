import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCareer,canEnterEvent,eventBlockReason,advanceToNextEvent,currentEvents} from '../src/career/state.js';
import {validateCareer,saveCareer,loadCareer,memoryStorage} from '../src/career/save.js';
import {rateMatchReport,compactMatchReport} from '../src/career/match-record.js';
import {ratingFromSkill,formatSkill} from '../src/career/rating.js';
import {startTournament,startRound,recordPlayerResult,playerHasBye} from '../src/career/tournament.js';
import {seededRandom} from '../src/competition.js';
import {
  writePendingMatch,readPendingMatch,writeMatchResult,takeMatchResult,pendingMatchId,clearPendingMatch,clearMatchResult
} from '../src/career/handshake.js';

const career=(overrides={})=>createCareer({
  name:'Audit Tester',gender:'male',archetypeId:'avery',regionId:'north-america',
  cityId:'seattle',seed:4242,age:25,...overrides
});

test('creation skill matches the selected provisional rating',()=>{
  for(const experience of ['new','casual','athlete','racket','competitive']){
    const state=career({age:30,experience});
    const implied=ratingFromSkill(formatSkill(state.athlete.ratings,'doubles'));
    assert.ok(Math.abs(implied-state.athlete.formats.doubles)<.12,experience+' skill and rating should agree');
  }
});

test('a career beginning at eighty is valid and persists',()=>{
  const state=career({age:80});
  assert.ok(validateCareer(state).ok);
  const storage=memoryStorage();
  assert.ok(saveCareer(state,storage).ok);
  assert.equal(loadCareer(storage).state.athlete.startAge,80);
});

test('an amateur may enter only two distinct tournaments per month',()=>{
  const state=career();
  const tournament={eventId:'w4-city-open',matchType:'tournament',scope:'city'};
  const twoThisMonth={
    ...state,
    eventEntries:[
      {week:0,eventId:'w0-city-open',matchType:'tournament'},
      {week:2,eventId:'w2-regional-open',matchType:'tournament'}
    ]
  };
  assert.equal(canEnterEvent(twoThisMonth,tournament),false);
  assert.match(eventBlockReason(twoThisMonth,tournament),/2 events this month/);
  const later={...state,week:5,eventEntries:twoThisMonth.eventEntries};
  assert.equal(canEnterEvent(later,{...tournament,eventId:'w5-city-open'}),true,'the monthly allowance resets');
});

test('an active competition blocks a second event and next-event jump',()=>{
  const state=career();
  const event=currentEvents(state)[0];
  const active={...state,tournament:{eventId:event.eventId,finished:false,playerOut:false,inConsolation:false}};
  assert.equal(canEnterEvent(active,event),false);
  assert.match(eventBlockReason(active,event),/already in progress/);
  assert.equal(advanceToNextEvent(active).ok,false);
});

test('long match reports are compacted to a bounded evidence tail',()=>{
  const report={
    schemaVersion:1,complete:true,score:{points:[11,8],winner:0},
    players:Array.from({length:4},(_,id)=>({id,team:id<2?0:1,name:'P'+id,attributes:{drive:70},paddle:{power:1}})),
    stats:{rallies:200},tactics:{patternReads:4},playtest:{rallies:{count:200}},
    journal:{
      events:Array.from({length:1481},(_,sequence)=>({sequence,time:sequence/30,type:'hit',shot:'dink',playerId:sequence%4,quality:.9})),
      rallies:Array.from({length:512},(_,number)=>({number,shots:8,winner:number%2}))
    }
  };
  const compact=compactMatchReport(report);
  assert.equal(compact.journal.events.length,80);
  assert.equal(compact.journal.rallies.length,20);
  assert.ok(JSON.stringify(compact).length<JSON.stringify(report).length/8);
  assert.equal(compact.playtest.rallies.count,200);
});

test('rating performance is normalized for games longer than eleven points',()=>{
  const matchup={
    playerId:0,playerTeam:0,playerRating:4,partnerRating:4,
    opponentRatings:[4,4],opponentIds:['o1','o2'],partnerId:'p1',
    athleteIds:['player','p1','o1','o2']
  };
  const players=[
    {id:0,team:0},{id:1,team:0},{id:2,team:1},{id:3,team:1}
  ];
  const eleven=rateMatchReport({
    report:{score:{points:[11,9],winner:0},players},matchup,matchType:'tournament',targetScore:11
  });
  const long=rateMatchReport({
    report:{score:{points:[22,18],winner:0},players},matchup,matchType:'tournament',targetScore:22
  });
  assert.ok(Math.abs(long.performance-eleven.performance)<1e-9);
  assert.ok(Math.abs(long.delta-eleven.delta)<1e-9);
  assert.equal(long.myPoints,22);
  assert.equal(long.ratedMyPoints,11);
});

test('a qualifier winner replaces the qualifier opponent without duplicating a team',()=>{
  const state=career();
  const event={
    eventId:'audit-open',label:'Audit Open',shapes:['tournament-bracket'],drawSize:8,
    energy:10,championPoints:500,matchType:'tournament',gateBasis:'open',open:true,
    tier:'open',qualifierSlots:2,qualifierFieldSize:64,wildCardSlots:0
  };
  const option={id:'doubles:3.5',format:'doubles',divisionId:'3.5',label:'3.5'};
  const tournament=startTournament({state,event,option}).tournament;
  assert.equal(tournament.shape,'qualifier');
  const qualifierOpponent=tournament.qualifierMatch.away.id;
  startRound(tournament,seededRandom(31));
  recordPlayerResult(tournament,{won:true,score:'11-7'});
  const ids=tournament.teams.map(team=>team.id);
  assert.equal(new Set(ids).size,ids.length,'main draw teams must be unique');
  assert.equal(ids.filter(id=>id==='player').length,1);
  assert.ok(!ids.includes(qualifierOpponent),'qualifier opponent is replaced by the winner');
});

test('a double-elimination unpaired player is recognized as having a bye',()=>{
  const tournament={
    shape:'double-elimination',finished:false,playerOut:false,playerTeamId:'player',
    pairings:[{home:{id:'player'},away:null}]
  };
  assert.equal(playerHasBye(tournament),true);
});

test('stale match results are consumed and cannot score a later match',()=>{
  const previous=globalThis.localStorage;
  globalThis.localStorage=memoryStorage();
  try{
    const first={eventId:'week-1',optionId:'doubles:3.5',week:0,tournamentId:'a',round:0,matchup:{lineup:[{}]}};
    const second={eventId:'week-2',optionId:'doubles:3.5',week:1,tournamentId:'b',round:0,matchup:{lineup:[{}]}};
    assert.ok(writePendingMatch(first));
    const firstId=pendingMatchId(readPendingMatch());
    clearPendingMatch();
    assert.ok(writePendingMatch(second));
    const secondId=pendingMatchId(readPendingMatch());
    assert.notEqual(firstId,secondId);
    assert.ok(writeMatchResult({score:{points:[11,4],winner:0}},firstId));
    assert.equal(takeMatchResult(secondId),null,'a stale result must be discarded');
    assert.ok(writeMatchResult({score:{points:[11,6],winner:0}},secondId));
    assert.equal(takeMatchResult(secondId).score.points[0],11);
    assert.ok(writeMatchResult({score:{points:[11,2],winner:0}}));
    assert.equal(takeMatchResult(secondId),null,'legacy results without a match id are discarded');
  }finally{
    clearPendingMatch();clearMatchResult();globalThis.localStorage=previous;
  }
});

test('career UI source covers the audited entry and handoff safeguards',()=>{
  const careerMain=readFileSync(new URL('../src/career/main.js',import.meta.url),'utf8');
  const rootMain=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../career-mode/career.css',import.meta.url),'utf8');
  assert.match(css,/\[hidden\]\{display:none!important\}/);
  assert.match(careerMain,/Upcoming · advance the calendar to enter/);
  assert.match(careerMain,/data-action="resume-tournament"/);
  assert.ok(careerMain.includes('League night complete. Advance the calendar'));
  assert.match(careerMain,/Delete this career and start over/);
  assert.match(rootMain,/writeMatchResult\(game\.matchReport\(\),careerMatch\.matchId\)/);
});

test('the prospect harness uses finance and shortened career league cards',()=>{
  const audit=readFileSync(new URL('../scripts/audit-career-prospects.js',import.meta.url),'utf8');
  assert.match(audit,/chargeEventCosts/);
  assert.match(audit,/paySalary/);
  assert.match(audit,/creditPrize/);
  assert.match(audit,/event\.careerRounds/);
});
