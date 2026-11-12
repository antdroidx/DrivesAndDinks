import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,currentEvents,joinClub} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {startCareerMatch,finishCareerMatch,quickSimCareerMatch} from '../src/career/career-match.js';
import {rateMatchReport} from '../src/career/match-record.js';
import {serializeCareer,migrateCareer} from '../src/career/save.js';
import {inboxMessages} from '../src/career/inbox.js';

function startLeague(){
  let state=createCareer({name:'Rating continuity',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:4242});
  const club=buildClubIndex(state.seed,state.regionId).find(entry=>entry.cityId===state.cityId);
  state=joinClub(state,club.id).state;
  const event=currentEvents(state).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  assert.ok(started.ok,started.message);
  return started.state;
}

function reportFor(pending,score=[6,15]){
  const singles=pending.format==='singles';
  return {score:{points:score,winner:score[0]>score[1]?0:1},players:pending.matchup.lineup.map((profile,index)=>({id:singles&&index===1?2:index,team:index<(singles?1:2)?0:1,name:profile.name}))};
}

test('every game in a league series uses the previous game CPU ratings and match counts',()=>{
  let state=startLeague();
  const firstMatchup=structuredClone(state.pendingMatch.matchup);
  const first=finishCareerMatch(state,reportFor(state.pendingMatch));
  assert.ok(first.ok,first.message);
  state=first.state;
  assert.ok(state.pendingMatch,'game two is ready');
  const matchup=state.pendingMatch.matchup,table=state.worldRatings[state.pendingMatch.format];
  for(let index=0;index<matchup.opponentIds.length;index++){
    assert.equal(matchup.opponentRatings[index],table[matchup.opponentIds[index]][0]);
    assert.equal(matchup.opponentMatches[index],table[matchup.opponentIds[index]][2]);
    assert.notEqual(matchup.opponentRatings[index],firstMatchup.opponentRatings[index]);
  }
  assert.equal(matchup.partnerRating,table[matchup.partnerId][0]);
  assert.equal(matchup.partnerMatches,table[matchup.partnerId][2]);
  assert.equal(matchup.teamRating,matchup.opponentRatings.reduce((sum,value)=>sum+value,0)/matchup.opponentRatings.length);
  const expected=rateMatchReport({report:reportFor(state.pendingMatch),matchup,matchType:state.pendingMatch.matchType,targetScore:state.pendingMatch.rules.targetScore});
  const second=finishCareerMatch(state,reportFor(state.pendingMatch));
  assert.ok(second.ok,second.message);
  for(const change of second.record.changes.filter(entry=>entry.id!==0)){
    const id=matchup.athleteIds[change.id];
    assert.equal(change.previousRating,table[id][0]);
    assert.equal(change.matchesPlayed,table[id][2]);
    assert.equal(second.state.worldRatings[state.pendingMatch.format][id][2],table[id][2]+1);
    assert.equal(change.rating,expected.changes.find(entry=>entry.id===change.id).rating);
    const inbox=inboxMessages(second.state,{category:'match'});
    assert.ok(inbox.some(message=>message.body.includes(`${change.name} ${change.previousRating.toFixed(3)} → ${change.rating.toFixed(3)}`)));
  }
});

test('an older saved league match with stale snapshots is refreshed when resumed or scored',()=>{
  const started=startLeague();
  const staleMatchup=structuredClone(started.pendingMatch.matchup);
  const first=finishCareerMatch(started,reportFor(started.pendingMatch));
  const state=first.state;
  state.pendingMatch={...state.pendingMatch,matchup:{...state.pendingMatch.matchup,partnerRating:staleMatchup.partnerRating,partnerMatches:staleMatchup.partnerMatches,opponentRatings:staleMatchup.opponentRatings,opponentMatches:staleMatchup.opponentMatches}};
  const loaded=migrateCareer(JSON.parse(serializeCareer(state)));
  assert.ok(loaded.ok,loaded.reason);
  const resumed=startCareerMatch(structuredClone(loaded.state),state.tournament.eventId,state.tournament.optionId);
  assert.ok(resumed.ok,resumed.message);
  assert.equal(resumed.pending.matchup.partnerRating,state.worldRatings[state.pendingMatch.format][staleMatchup.partnerId][0]);
  const scored=finishCareerMatch(loaded.state,reportFor(loaded.state.pendingMatch));
  assert.ok(scored.ok,scored.message);
  for(const change of scored.record.changes.filter(entry=>entry.id!==0)){
    const id=loaded.state.pendingMatch.matchup.athleteIds[change.id];
    assert.equal(change.previousRating,state.worldRatings[state.pendingMatch.format][id][0]);
  }
});

test('quick simulation carries each CPU rating forward between games',()=>{
  const started=startLeague();
  const simulated=quickSimCareerMatch(started);
  assert.ok(simulated.ok,simulated.message);
  for(let index=1;index<simulated.state.matches.length;index++){
    const previous=simulated.state.matches[index-1];
    const current=simulated.state.matches[index];
    for(const change of current.changes.filter(entry=>entry.id!==0)){
      const prior=previous.changes.find(entry=>entry.name===change.name);
      assert.ok(prior);
      assert.equal(change.previousRating,Math.round(prior.rating*1000)/1000);
      assert.equal(change.matchesPlayed,prior.matchesPlayed+1);
    }
  }
});

test('singles results persist the CPU rating for the engine opponent slot',()=>{
  const state=startLeague();
  const original=state.pendingMatch;
  const opponentId=original.matchup.opponentIds[0];
  state.pendingMatch={...original,format:'singles',matchup:{...original.matchup,format:'singles',lineup:[original.matchup.lineup[0],original.matchup.lineup[2]],athleteIds:['player',opponentId],partnerId:null,partnerRating:null,opponentIds:[opponentId],opponentRatings:[3.7],opponentMatches:[4]}};
  state.worldRatings.singles={...state.worldRatings.singles,[opponentId]:[3.9,state.week,5]};
  const scored=finishCareerMatch(state,reportFor(state.pendingMatch));
  assert.ok(scored.ok,scored.message);
  const change=scored.record.changes.find(entry=>entry.id===2);
  assert.equal(change.previousRating,3.9);
  assert.deepEqual(scored.state.worldRatings.singles[opponentId],[Math.round(change.rating*1000)/1000,state.week,6]);
});
