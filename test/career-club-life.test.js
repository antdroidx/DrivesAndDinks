import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,joinClub} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {startTournament} from '../src/career/tournament.js';
import {
  CLUB_REPUTATION_REQUIREMENTS,clubAccess,requiredClubReputation,partnerCandidates,choosePartner,
  partnerGateStatus,awardClubReputation,buildCoachFeedback
} from '../src/career/club-life.js';
import {opponentLearningForMatchup,recordOpponentResult,opponentHistory} from '../src/career/opponents.js';

const career=(seed=4242)=>createCareer({name:'Club Tester',gender:'male',archetypeId:'remy',regionId:'north-america',cityId:'seattle',seed,age:25});
function recreationalClub(state,cityId=state.cityId){
  return buildClubIndex(state.seed,state.regionId).find(club=>club.cityId===cityId&&club.tier==='recreational');
}
function joined(seed=4242){
  const state=career(seed);
  const club=recreationalClub(state);
  return {state:joinClub(state,club.id).state,club};
}

test('club reputation gates competitive and elite clubs',()=>{
  const state=career();
  const clubs=buildClubIndex(state.seed,state.regionId);
  const recreational=clubs.find(club=>club.tier==='recreational');
  const competitive=clubs.find(club=>club.tier==='competitive');
  const elite=clubs.find(club=>club.tier==='elite');
  assert.equal(requiredClubReputation(recreational),CLUB_REPUTATION_REQUIREMENTS.recreational);
  assert.equal(clubAccess(state,recreational).ok,true);
  if(competitive){assert.equal(clubAccess(state,competitive).ok,false); assert.match(joinClub(state,competitive.id).message,/reputation/i);}
  if(elite)assert.equal(clubAccess(state,elite).ok,false);
  const {state:member}=joined();
  const rewarded=awardClubReputation(member,{type:'tournament',place:1});
  assert.equal(rewarded.clubReputation,6);
  const promoted={...rewarded,clubReputation:CLUB_REPUTATION_REQUIREMENTS.competitive};
  if(competitive)assert.equal(clubAccess(promoted,competitive).ok,true);
});

test('a joined club offers eligible persistent gender and mixed partners',()=>{
  const {state}=joined();
  const genderCandidates=partnerCandidates(state,'doubles');
  const mixedCandidates=partnerCandidates(state,'mixed');
  assert.ok(genderCandidates.length>0);
  assert.ok(mixedCandidates.length>0);
  assert.ok(genderCandidates.every(member=>member.gender===state.athlete.gender));
  assert.ok(mixedCandidates.every(member=>member.gender!==state.athlete.gender));
  const gender=choosePartner(state,'doubles',genderCandidates[0].id);
  const mixed=choosePartner(gender.state,'mixed',mixedCandidates[0].id);
  assert.ok(gender.ok,gender.message);
  assert.ok(mixed.ok,mixed.message);
  assert.equal(mixed.state.partners.doubles.id,genderCandidates[0].id);
  assert.equal(mixed.state.partners.mixed.id,mixedCandidates[0].id);
});

test('the selected partner appears in the event field',()=>{
  const {state}=joined();
  const candidate=partnerCandidates(state,'doubles')[0];
  const withPartner=choosePartner(state,'doubles',candidate.id).state;
  const option={id:'doubles:3.5',format:'doubles',divisionId:'3.5',label:'3.5'};
  const event={eventId:'club-test',label:'Club Test',shapes:['tournament-bracket'],drawSize:8,gateBasis:'highest',open:true,matchType:'tournament',energy:10,championPoints:100};
  const started=startTournament({state:withPartner,event,option});
  assert.ok(started.ok,started.message);
  const playerTeam=started.tournament.teams.find(team=>team.id==='player');
  assert.equal(playerTeam.members[1].id,candidate.id);
});

test('a selected partner can invalidate a highest-player rating gate',()=>{
  const {state}=joined();
  const option={id:'doubles:3.5',format:'doubles',divisionId:'3.5',label:'3.5'};
  const event={open:false,gateBasis:'highest',drawSize:16};
  const partner={...partnerCandidates(state,'doubles')[0],formats:{...partnerCandidates(state,'doubles')[0].formats,doubles:6}};
  const blocked=partnerGateStatus({...state,partners:{...state.partners,doubles:partner}},event,option);
  assert.equal(blocked.ok,false);
  assert.match(blocked.reason,/team gate/i);
});

test('opponent learning and head-to-head history persist by athlete id',()=>{
  const state=career();
  const matchup={opponentIds:['o1'],opponentNames:['Jordan Opponent'],athleteIds:['player','o1'],partnerId:null};
  const report={learning:[{playerId:1,samples:4,confidence:.4,expectedX:2.2,lobRate:.1,lobConfidence:.2}]};
  let next=recordOpponentResult(state,{matchup,report,won:true,week:3,eventId:'city-open',eventLabel:'City Open',format:'singles'});
  next=recordOpponentResult(next,{matchup,report,won:false,week:4,eventId:'city-open',eventLabel:'City Open',format:'singles'});
  assert.equal(next.opponents.o1.matches,2);
  assert.equal(next.opponents.o1.wins,1);
  assert.equal(next.opponents.o1.losses,1);
  assert.equal(next.opponents.o1.learning.samples,4);
  assert.equal(opponentLearningForMatchup(next,matchup)[0].playerId,1);
  assert.equal(opponentHistory(next)[0].name,'Jordan Opponent');
});

test('the coach points to a specific weak attribute',()=>{
  const state=career();
  state.athlete.ratings.dink=24;
  const feedback=buildCoachFeedback(state,{format:'doubles',won:false,eventFocus:'control'});
  assert.equal(feedback.attribute,'dink');
  assert.equal(feedback.value,24);
  assert.match(feedback.message,/Dink 24/);
});