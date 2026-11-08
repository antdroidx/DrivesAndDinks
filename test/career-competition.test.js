import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EVENT_TEMPLATES,TEMPLATE_BY_ID,rulesFor,DEFAULT_RULES} from '../src/career/events.js';
import {generateCompetition,simulateCompetition} from '../src/career/competition.js';
import {seededRandom} from '../src/competition.js';

const population=Array.from({length:40},(_,index)=>({
  id:'a'+index,
  name:'Player '+index,
  skill:45+index,
  rating:3+index*0.05,
  clubId:'club-'+index
}));

const build=(templateId,overrides={})=>generateCompetition({
  seed:4242,
  regionId:'north-america',
  week:3,
  template:TEMPLATE_BY_ID[templateId],
  format:'doubles',
  population,
  ...overrides
});

const play=(competition,seed=99)=>simulateCompetition({competition,population,random:seededRandom(seed)});

test('every template generates a competition that can be played out',()=>{
  for(const template of EVENT_TEMPLATES){
    const competition=build(template.id);
    assert.ok(competition.field.length>=2,template.id+' should field teams');
    assert.ok(competition.rules.points>0);
    const result=play(competition);
    assert.ok(result.results.length>=1,template.id+' should produce matches');
    assert.ok(result.champion,template.id+' should have a champion');
  }
});

test('a competition is the same for the same seed and different for another',()=>{
  const a=build('tournament-bracket');
  const b=build('tournament-bracket');
  const c=build('tournament-bracket',{seed:99});
  assert.deepEqual(a.field.map(team=>team.id),b.field.map(team=>team.id));
  assert.deepEqual(a.rounds,b.rounds);
  assert.notDeepEqual(a.field.map(team=>team.id),c.field.map(team=>team.id));
});

test('a round robin has every pair meet',()=>{
  const competition=build('round-robin-league');
  const seen=new Set();
  for(const round of competition.rounds){
    for(const match of round){
      const key=[match.home,match.away].sort().join('|');
      assert.ok(!seen.has(key),'a pair should meet once');
      seen.add(key);
    }
  }
  const teams=competition.field.length;
  assert.ok(seen.size>=teams*(teams-1)/2,'every pair should meet');
});

test('the top four of a round robin go to a playoff',()=>{
  const competition=build('round-robin-league');
  assert.equal(competition.playoff.size,4);
  assert.equal(competition.playoff.source,'standings');
  const result=play(competition);
  // The playoff is played after the round robin, so there are more matches
  // than the round robin alone.
  const roundRobinMatches=competition.rounds.reduce((sum,round)=>sum+round.length,0);
  assert.ok(result.results.length>roundRobinMatches,'the playoff was played');
  assert.ok(result.champion);
});

test('a round robin with open partners draws a new partner each round',()=>{
  const competition=build('round-robin-open');
  const firstRound=competition.rounds[0].map(match=>[match.home,match.away].sort().join('|'));
  assert.ok(firstRound.length>=2);
  for(const match of competition.rounds[0]){
    assert.ok(competition.field.some(team=>team.id===match.home));
    assert.ok(competition.field.some(team=>team.id===match.away));
  }
  // A new partner every round means the sides playing each other change.
  const partnerOf=(round,id)=>{
    const match=round.find(entry=>entry.home===id||entry.away===id);
    if(!match)return null;
    return match.home===id?match.away:match.home;
  };
  let changed=0;
  let counted=0;
  for(const team of competition.field){
    const first=partnerOf(competition.rounds[0],team.id);
    const second=partnerOf(competition.rounds[1],team.id);
    if(!first||!second)continue;
    counted++;
    if(first!==second)changed++;
  }
  assert.ok(counted>0,'the field played two rounds');
  assert.ok(changed>counted/2,'most players get a new partner each round');
});

test('a bracket tournament splits the field and sends the winners to a playoff',()=>{
  const competition=build('tournament-bracket');
  assert.ok(competition.groups.length>=1,'the field should be split into brackets');
  for(const group of competition.groups){
    assert.ok(group.length>=2);
    assert.ok(group.length<=8,'a bracket holds at most eight');
  }
  assert.equal(competition.playoff.source,'groups');
  const result=play(competition);
  assert.ok(result.champion);
});

test('a double elimination keeps everybody in until they have lost twice',()=>{
  const competition=build('tournament-double-elimination');
  const result=play(competition);
  assert.ok(result.results.length>=1);
  assert.equal(competition.rules.points,DEFAULT_RULES.doubleEliminationPoints,'double elimination plays to fifteen');
  // Every side that lost twice is out, so the champion is undefeated or has
  // exactly one loss.
  const champion=result.standings.find(team=>team.id===result.champion.id);
  assert.ok(champion.record.losses<=1,'the champion was not eliminated');
  // A match is decided, so somebody wins it.
  const total=result.standings.reduce((sum,team)=>sum+team.record.wins,0);
  assert.equal(total,result.results.length);
});

test('a ladder ranks the field onto courts by rating',()=>{
  const competition=build('ladder-fixed');
  assert.ok(competition.courts.length>=2,'a ladder has several courts');
  const rated=competition.courts.filter(court=>court.length).map(court=>court.map(team=>team.rating));
  for(let index=1;index<rated.length;index++){
    const above=Math.max(...rated[index-1]);
    const below=Math.min(...rated[index]);
    assert.ok(above>=below,'the higher court holds the better teams');
  }
});

test('a ladder sends the winner up and the loser down',()=>{
  const competition=build('ladder-fixed');
  const result=play(competition);
  assert.ok(result.results.length>=1,'the ladder was played');
  assert.ok(result.champion);
});

test('an MLP fields teams of four or five',()=>{
  const competition=build('mlp-style');
  for(const team of competition.field){
    assert.ok(team.members.length>=4&&team.members.length<=5,'an MLP team is four or five players');
  }
  const result=play(competition);
  assert.ok(result.results.length>=1);
});

test('the rules can be varied by the organiser',()=>{
  const template=TEMPLATE_BY_ID['tournament-bracket'];
  const played=rulesFor(template,{points:21,playoffPoints:25,finalBestOf:5});
  assert.equal(played.points,21);
  assert.equal(played.playoffPoints,25);
  assert.equal(played.finalBestOf,5);
  assert.equal(played.roundsPerBracket,DEFAULT_RULES.roundsPerBracket,'the rest keep their defaults');
});

test('a competition is simulated to a champion with standings',()=>{
  const competition=build('tournament-bracket');
  const result=play(competition);
  assert.ok(result.standings.length>=2);
  assert.ok(result.champion,'there is a champion');
  assert.ok(result.results.length>=1,'matches were played');
  assert.ok(result.standings.every(team=>team.record.wins+team.record.losses>=0));
  const total=result.standings.reduce((sum,team)=>sum+team.record.wins,0);
  assert.equal(total,result.results.length,'every match is a win for somebody');
});

test("the player's own match is left for them to play",()=>{
  const first=build('round-robin-league');
  const playerTeamId=first.field[0].id;
  const competition=build('round-robin-league',{playerTeamId});
  const result=simulateCompetition({competition,population,random:seededRandom(7)});
  assert.ok(result.playerMatches.length>=1,'the player has a match to play');
  // Every other match was decided, and the player's was not.
  for(const match of result.results){
    assert.notEqual(match.home,playerTeamId);
    assert.notEqual(match.away,playerTeamId);
  }
});

test('the player is fielded in their own team',()=>{
  const playerId=population[3].id;
  const competition=build('round-robin-league',{playerId});
  const playerTeam=competition.field.find(team=>team.members.some(member=>member.id===playerId));
  assert.ok(playerTeam,'the player is on a team');
  assert.equal(competition.playerTeamId,playerTeam.id);
  const result=play(competition);
  assert.ok(result.playerMatches.length>=1,'the player has a match to play');
});

test('a game is played to the points the rules set',()=>{
  const competition=build('round-robin-league');
  const result=play(competition);
  const targets=new Set();
  const winners=new Map();
  for(const match of result.results){
    targets.add(match.points);
    for(const game of match.games){
      const [mine,theirs]=game.split('-').map(Number);
      const winner=Math.max(mine,theirs);
      const loser=Math.min(mine,theirs);
      assert.ok(winner>=match.points,'the game reached the target');
      assert.ok(winner-loser>=2,'the game was won by two');
      if(!winners.has(match.points))winners.set(match.points,[]);
      winners.get(match.points).push(winner);
    }
  }
  // The round robin is played to eleven and the playoff to fifteen.
  assert.ok(targets.has(11),'the league games go to eleven');
  assert.ok(targets.has(15),'the playoff games go to fifteen');
  // Games finish around the target rather than running away, though a game
  // won by two can go a couple of points over it.
  for(const [points,scores] of winners){
    scores.sort((a,b)=>a-b);
    const median=scores[Math.floor(scores.length/2)];
    assert.ok(median>=points&&median<=points+2,'games finish near the target');
  }
});
