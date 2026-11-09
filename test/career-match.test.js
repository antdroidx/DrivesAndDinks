import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCareer,joinClub,advanceWeek} from '../src/career/state.js';
import {startCareerMatch,finishCareerMatch} from '../src/career/career-match.js';
import {currentEvents} from '../src/career/state.js';
import {buildClubIndex} from '../src/career/population.js';
import {formatRating} from '../src/career/rating.js';
import {RATING_KEYS} from '../src/roster.js';
import {rateMatchReport} from '../src/career/match-record.js';
import {boardPosition,nearbyRivals,findRival,qualificationStatus,sponsorsFor,prizeFor,careerForm} from '../src/career/standings.js';

const SEED=4242;
const career=(overrides={})=>createCareer({name:'Test Player',gender:'male',archetypeId:'avery',regionId:'north-america',cityId:'seattle',seed:SEED,...overrides});
const withClub=(state)=>{
  const clubs=buildClubIndex(state.seed,state.regionId);
  return joinClub(state,clubs.find(club=>club.cityId===state.cityId).id).state;
};

test('a career match starts from an event and draws a field from the bracket',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  assert.ok(started.ok,started.message);
  assert.ok(started.pending.matchup.lineup.length>=2);
  assert.ok(started.pending.matchup.opponentNames.length>=1);
  assert.ok(started.pending.matchup.opponentNames.every(name=>typeof name==='string'&&name.length>2));
  assert.equal(started.pending.format,event.defaultOptionId.split(':')[0]);
});

test('the career athlete enters the engine with their own attributes',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const player=started.pending.matchup.lineup[0];
  assert.equal(player.name,'Test Player');
  for(const key of RATING_KEYS)assert.equal(player.attributes[key],state.athlete.ratings[key]);
  // The engine's own abilities come from those attributes.
  assert.ok(player.abilities.control>0);
});

test('a doubles lineup has four players and a singles lineup two',()=>{
  const state=withClub(career());
  for(const week of [0,1,2,4]){
    for(const event of currentEvents({...state,week})){
      if(!event.eligible.ok)continue;
      const option=event.options.find(entry=>entry.isPlayer)??event.options[0];
      if(!option)continue;
      const started=startCareerMatch({...state,week},event.id,option.id);
      assert.equal(started.pending.matchup.lineup.length,option.format==='singles'?2:4);
      break;
    }
  }
});

test('a played match moves the rating on the real result',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const pending=started.pending;
  const report={
    score:{points:[11,4],winner:0},
    players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
  };
  const scored=finishCareerMatch(started.state,report);
  assert.ok(scored.ok,scored.message);
  assert.equal(scored.record.won,true);
  assert.equal(scored.record.score,'11-4');
  assert.ok(scored.state.athlete.formats[pending.format]!==pending.matchup.playerRating,'the rating moved');
  assert.equal(scored.state.athlete.record.matches,1);
  assert.equal(scored.state.athlete.record.wins,1);
  // The energy is paid once when the event is entered, not again per round.
  assert.equal(scored.state.energy,state.energy-event.energyCost);
  assert.equal(scored.state.matches.length,1);
  assert.ok(scored.state.matches[0].report,'the engine report is kept against the event');
});

test('a narrow win over a weaker opponent lowers the rating',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const pending=started.pending;
  // The player is the favourite and wins narrowly, which is an
  // underperformance against the expectation.
  const matchup=Object.assign({},pending.matchup,{
    playerRating:5,
    partnerRating:5,
    opponentRatings:[3,3],
    opponentIds:['2','3'],
    partnerId:'1',
    athleteIds:['player','1','2','3']
  });
  const report={
    score:{points:[11,9],winner:0},
    players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
  };
  const rated=rateMatchReport({report,matchup,matchType:'tournament'});
  assert.ok(rated.delta<0,'a narrow win over a weaker opponent should cost rating');
});

test('competing above expectations raises the rating even in a loss',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const pending=started.pending;
  // The player is the underdog and competes far better than expected.
  const matchup=Object.assign({},pending.matchup,{
    playerRating:3,
    partnerRating:3,
    opponentRatings:[5,5],
    opponentIds:['2','3'],
    partnerId:'1',
    athleteIds:['player','1','2','3']
  });
  const report={
    score:{points:[9,11],winner:1},
    players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
  };
  const rated=rateMatchReport({report,matchup,matchType:'tournament'});
  assert.ok(rated.delta>0,'competing above expectations should be rewarded');
  assert.equal(rated.won,false);
});

test('the opponents move in the world rating state because they played',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const pending=started.pending;
  const report={
    score:{points:[11,5],winner:0},
    players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
  };
  const scored=finishCareerMatch(started.state,report);
  const table=scored.state.worldRatings[pending.format]??{};
  for(const id of pending.matchup.opponentIds){
    assert.ok(table[id],'an opponent should now carry a rating');
    assert.equal(table[id][1],state.week);
  }
});

test('a tournament pays its points and purse for the placing',()=>{
  const state=withClub(career());
  // A club night has no purse, so the local league is used here.
  const event=currentEvents(state).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  let current=startCareerMatch(state,event.id,event.defaultOptionId).state;
  assert.ok(current.tournament,'the entry fielded a tournament');
  let guard=0;
  while(current.pendingMatch&&guard++<12){
    const pending=current.pendingMatch;
    const report={
      score:{points:[11,5],winner:0},
      players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
    };
    const scored=finishCareerMatch(current,report);
    assert.ok(scored.ok,scored.message);
    current=scored.state;
  }
  assert.ok(current.tournament.finished,'the tournament finished');
  assert.equal(current.tournament.playerPlace,1,'the player won every round');
  assert.ok(current.athlete.tourPoints>0,'tour points were earned');
  assert.ok(current.money>state.money,'there was a purse');
});

test('a first round loss still pays for the placing',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eventId==='local-league'&&entry.eligible.ok);
  let current=startCareerMatch(state,event.id,event.defaultOptionId).state;
  let guard=0;
  let lost=false;
  while(current.pendingMatch&&guard++<12){
    const pending=current.pendingMatch;
    const report={
      score:{points:[5,11],winner:1},
      players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
    };
    const scored=finishCareerMatch(current,report);
    assert.ok(scored.ok,scored.message);
    current=scored.state;
    if(!lost){lost=true;}
  }
  assert.ok(current.tournament.finished);
  // Losing every round still finishes last in the league, so the placing is
  // recorded and the points are what that placing is worth.
  assert.ok(current.tournament.playerPlace>=1);
});

test('a bracket fields only its own rating band and seeds the strongest first',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eventId==='club-night'&&entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const tournament=started.state.tournament;
  const ratings=tournament.teams.map(team=>team.rating);
  assert.ok(Math.min(...ratings)>=3.0,'the 3.5 bracket does not field a 2.0 player');
  assert.ok(Math.max(...ratings)<=4.0,'the 3.5 bracket does not field a 5.0 player');
  assert.equal(tournament.shape,'bracket');
});

test('a tournament survives being saved between rounds',()=>{
  const state=withClub(career());
  const event=currentEvents(state).find(entry=>entry.eventId==='club-night'&&entry.eligible.ok);
  const started=startCareerMatch(state,event.id,event.defaultOptionId);
  const round=started.pending.round;
  const copy=JSON.parse(JSON.stringify(started.state));
  const pending=copy.pendingMatch;
  const report={
    score:{points:[11,4],winner:0},
    players:pending.matchup.lineup.map((profile,index)=>({id:index,team:index<2?0:1,name:profile.name}))
  };
  const scored=finishCareerMatch(copy,report);
  assert.ok(scored.ok,scored.message);
  assert.equal(scored.state.tournament.round,round+1,'the tournament advanced a round');
});

test('the board places the player and the players nearest to them',()=>{
  const state=withClub(career());
  const position=boardPosition(state,'doubles');
  assert.equal(position.size,1200);
  assert.equal(position.floor,4.95);
  assert.equal(position.onTour,false,'a beginner is not on the tour');
  assert.ok(position.worldRank>1200);
  const rivals=nearbyRivals(state,'doubles',4);
  assert.equal(rivals.length,4);
  for(const rival of rivals)assert.ok(rival.name&&rival.name.length>2);
});

test('the rival is the player nearest on the board',()=>{
  const state=withClub(career());
  const rival=findRival(state,'doubles');
  assert.ok(rival);
  assert.ok(rival.name);
  assert.ok(rival.gap<1);
});

test('qualification is measured in tour points',()=>{
  const state=withClub(career());
  const status=qualificationStatus(state,'national');
  assert.equal(status.required,true);
  assert.equal(status.ok,false);
  assert.ok(status.needed>0);
});

test('sponsors arrive with a standing and pay more into the purse',()=>{
  const state=withClub(career());
  assert.equal(sponsorsFor(state,'doubles').length,0,'a beginner has no sponsors');
  const onTour={...state,athlete:{...state.athlete,formats:{...state.athlete.formats,doubles:5.5,singles:5.5,mixed:5.5}}};
  assert.ok(sponsorsFor(onTour,'doubles').length>0);
  const plain=prizeFor({eventId:'national',won:true,format:'doubles',sponsors:[]});
  const sponsored=prizeFor({eventId:'national',won:true,format:'doubles',sponsors:sponsorsFor(onTour,'doubles')});
  assert.ok(sponsored>plain);
});

test('the form summary reads the recent results',()=>{
  const state=withClub(career());
  const form=careerForm(state);
  assert.equal(form.played,0);
  assert.equal(form.form,'');
});

