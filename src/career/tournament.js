// Tournaments.
//
// An event fields a tournament rather than a single match. The field is
// drawn from the rated population, gated by the division, and played one
// round at a time.
//
// The player's own matches are played on the real engine. Every other match
// is decided here. A tournament is a small state machine so that a career
// can stop between rounds, hand a match to the engine, and pick the same
// tournament up again when the result comes back.
//
// Six shapes are supported. A bracket and a double elimination knock people
// out; a round robin and a ladder play a fixed number of rounds; an open
// round robin and an open ladder give the player a new partner every round;
// and a team league plays sides of four.
//
// Every shape exposes the same four things: the match the player must play
// next, the rest of the round, how a player result advances the competition,
// and where the player finished.

import {ratedPopulation} from './world.js';
import {RATING_BRACKETS,formatSkill} from './rating.js';
import {seededRandom} from '../competition.js';
import {mixSeed} from './population.js';
import {pointsForFinish} from './tour.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const shuffle=(items,random)=>{
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
};

// The next power of two at or above a number.
export function bracketSize(teams){
  let size=2;
  while(size<(teams??0))size*=2;
  return size;
}

// The standard bracket order, so seed one and seed two can only meet in the
// final. Returns zero based seeds in slot order.
export function seedOrder(size){
  let order=[0];
  while(order.length<size){
    const next=[];
    const length=order.length*2;
    for(const seed of order)next.push(seed,length-1-seed);
    order=next;
  }
  return order;
}

// Where a player finishes when they lose in a given round of a bracket.
export function placeForLoss(round,size){
  const places=size/Math.pow(2,round+1);
  return Math.max(2,Math.floor(places)+1);
}

// A team is two players in a doubles draw and one in singles.
function makeTeam(members,id){
  return {
    id,
    name:members.map(member=>member.name).join(' & '),
    members:members.map(member=>({
      id:member.id,
      name:member.name,
      rating:member.rating,
      skill:member.skill,
      archetypeId:member.archetypeId,
      archetypeLabel:member.archetypeLabel,
      gender:member.gender,
      handedness:member.handedness,
      citizenship:member.citizenship,
      age:member.age
    })),
    // The team's rating is the combined rating, which is what a doubles bye
    // and a doubles seed are awarded on.
    rating:members.reduce((sum,member)=>sum+member.rating,0)/members.length,
    skill:members.reduce((sum,member)=>sum+(member.skill??0),0)/members.length
  };
}

// The rated players a division can field.
//
// A bracket is a rating band, so the field for a 3.5 bracket is the 3.5
// bracket even when the event is open. A thin band is filled by the nearest
// ratings above and below it.
function populationFor({state,event,option}){
  const division=RATING_BRACKETS.find(entry=>entry.id===option.divisionId);
  const all=ratedPopulation({
    seed:state.seed,
    regionId:state.regionId,
    ratings:state.worldRatings,
    week:state.week,
    format:option.format,
    limit:1000
  });
  if(!division)return all;
  const inBracket=all.filter(athlete=>athlete.rating>=division.min&&athlete.rating<=division.max);
  if(inBracket.length>=48)return inBracket;
  const distance=athlete=>athlete.rating<division.min?division.min-athlete.rating:athlete.rating>division.max?athlete.rating-division.max:0;
  return [...all].sort((a,b)=>distance(a)-distance(b)).slice(0,Math.max(48,inBracket.length));
}

// Builds the player, then fills the draw around them.
export function buildField({state,event,option,drawSize=16}){
  const random=seededRandom(mixSeed(state.seed,`tournament:${state.week}:${event.eventId}:${option.id}`));
  const singles=option.format==='singles';
  const teamLeague=(event?.shapes??[]).includes('mlp-style');
  const teamSize=singles?1:teamLeague?4:2;
  const need=Math.max(4,drawSize??event?.drawSize??16);
  const rating=state.athlete.formats[option.format];
  const skill=formatSkill(state.athlete.ratings,option.format);
  const player={id:state.athlete.id??'player',name:state.athlete.name,rating,skill,isPlayer:true,
    archetypeId:state.athlete.archetypeId,gender:state.athlete.gender,handedness:state.athlete.handedness};
  const pool=populationFor({state,event,option})
    .filter(athlete=>athlete.id!==player.id)
    .sort((a,b)=>b.rating-a.rating);
  const teams=[];
  if(singles){
    teams.push(makeTeam([player],'player'));
  }else{
    // The partner is the player's own level, which is how a player picks
    // one, rather than the strongest name in the draw.
    const partners=pool.slice(0,teamSize-1);
    for(const partner of partners)pool.splice(pool.indexOf(partner),1);
    if(partners.length<teamSize-1)return null;
    teams.push(makeTeam([player,...partners],'player'));
  }
  while(teams.length<need&&pool.length>=teamSize){
    const members=pool.splice(0,teamSize);
    teams.push(makeTeam(members,'t'+teams.length));
  }
  return {teams,players:[player,...pool]};
}

// A single elimination bracket, seeded by rating, with byes in the empty
// slots.
export function buildBracket(teams){
  const ranked=[...teams].sort((a,b)=>b.rating-a.rating);
  const size=bracketSize(ranked.length);
  const order=seedOrder(size);
  const slots=order.map(seed=>ranked[seed]??null);
  return {
    shape:'bracket',
    kind:'tournament-bracket',
    size,
    alive:slots,
    round:0,
    currentMatch:null,
    roundResults:[],
    finished:false,
    playerTeamId:'player',
    playerOut:false,
    playerPlace:null,
    champion:null
  };
}

// A round robin. Every team meets the others, arranged so a team plays one
// match a round.
export function buildRoundRobin(teams,random){
  const sides=shuffle(teams,random);
  const rotation=sides.length%2?[null,...sides]:[...sides];
  const rounds=[];
  for(let round=0;round<rotation.length-1;round++){
    const matches=[];
    for(let index=0;index<rotation.length/2;index++){
      const home=rotation[index];
      const away=rotation[rotation.length-1-index];
      if(home&&away)matches.push({home,away});
    }
    rounds.push(matches);
    rotation.splice(1,0,rotation.pop());
  }
  const records={};
  for(const team of teams)records[team.id]={wins:0,losses:0,points:0};
  return {
    shape:'round-robin',
    kind:'round-robin-league',
    rounds,
    round:0,
    currentMatch:null,
    roundResults:[],
    records,
    finished:false,
    playerTeamId:'player',
    playerOut:false,
    playerPlace:null,
    champion:null
  };
}

// Double elimination. Nobody is out until they have lost twice, and the draw
// is made again each round from whoever has a life left.
export function buildDoubleElimination(teams,random){
  const lives={};
  for(const team of teams)lives[team.id]=2;
  return {
    shape:'double-elimination',
    kind:'tournament-double-elimination',
    alive:teams.map(team=>team.id),
    lives,
    round:0,
    currentMatch:null,
    roundResults:[],
    finished:false,
    playerTeamId:'player',
    playerOut:false,
    playerPlace:null,
    champion:null,
    draw:shuffle(teams,random)
  };
}

// A ladder. Teams are ranked onto courts, and the winner of a court moves up
// while the loser moves down.
export function buildLadder(teams,random){
  const ranked=[...teams].sort((a,b)=>b.rating-a.rating);
  const order=[...ranked];
  const points={};
  for(const team of teams)points[team.id]=0;
  return {
    shape:'ladder',
    kind:'ladder-fixed',
    order,
    points,
    rounds:Math.max(4,Math.min(10,Math.ceil(ranked.length*0.75))),
    round:0,
    currentMatch:null,
    roundResults:[],
    finished:false,
    playerTeamId:'player',
    playerOut:false,
    playerPlace:null,
    champion:null
  };
}

// An open competition. The player is one of a pool, and every round they are
// drawn a new partner and two opponents.
export function buildOpen({players,random,kind}){
  const points={};
  for(const athlete of players)points[athlete.id]=0;
  return {
    shape:'open',
    kind:kind??'round-robin-open',
    players,
    points,
    rounds:Math.max(4,Math.min(10,players.length-1)),
    round:0,
    currentMatch:null,
    roundResults:[],
    finished:false,
    playerTeamId:'player',
    playerOut:false,
    playerPlace:null,
    champion:null
  };
}

// A team league. Sides play each other once or twice and the best record
// wins.
export function buildTeamLeague(teams,random){
  const built=buildRoundRobin(teams,random);
  return Object.assign(built,{shape:'mlp',kind:'mlp-style'});
}

// Chooses the shape an event runs this week.
export function pickShape(event,random){
  const shapes=(event?.shapes??[]).filter(Boolean);
  if(!shapes.length)return 'tournament-bracket';
  return shapes[Math.floor(random()*shapes.length)];
}

// Starts a tournament for an event entry.
export function startTournament({state,event,option}){
  const field=buildField({state,event,option,drawSize:event?.drawSize??16});
  if(!field||field.teams.length<2)return {ok:false,message:'Nobody else is fielding at this event.'};
  const random=seededRandom(mixSeed(state.seed,`format:${state.week}:${event.eventId}:${option.id}`));
  const drawSize=Math.max(2,event?.drawSize??16);
  const teams=field.teams.slice(0,drawSize);
  const kind=pickShape(event,random);
  let tournament;
  if(kind==='round-robin-open'||kind==='ladder-open')tournament=buildOpen({players:[{id:'player',name:state.athlete.name,rating:state.athlete.formats[option.format],skill:formatSkill(state.athlete.ratings,option.format),archetypeId:state.athlete.archetypeId,gender:state.athlete.gender,handedness:state.athlete.handedness},...field.players.slice(0,drawSize*2)],random,kind});
  else if(kind==='mlp-style')tournament=buildTeamLeague(teams,random);
  else if(kind==='tournament-double-elimination')tournament=buildDoubleElimination(teams,random);
  else if(kind==='ladder-fixed')tournament=buildLadder(teams,random);
  else if(kind==='round-robin-league')tournament=buildRoundRobin(teams,random);
  else tournament=buildBracket(teams);
  return {
    ok:true,
    tournament:Object.assign(tournament,{
      id:`${event.eventId}:${option.id}:${state.week}`,
      eventId:event.eventId,
      optionId:option.id,
      label:event.label,
      bracket:option.label,
      format:option.format,
      divisionId:option.divisionId,
      matchType:event.matchType,
      energyCost:event.energy,
      championPoints:event.championPoints??0,
      week:state.week,
      teams,
      // Only an open draw needs the player pool; a team draw carries
      // its teams and nothing else.
      players:tournament.shape==='open'?tournament.players:[]
    })
  };
}

// The simulated outcome of a match between two sides.
export function simulateMatch(home,away,random,points=11){
  const edge=clamp(.5+(home.skill-away.skill)/60,.28,.72);
  let mine=0,theirs=0;
  while(true){
    if(random()<edge)mine++;else theirs++;
    if((mine>=points||theirs>=points)&&Math.abs(mine-theirs)>=2)break;
  }
  return {homeMine:mine,homeTheirs:theirs,homeWon:mine>theirs,score:mine+'-'+theirs};
}

function teamById(tournament,id){
  return (tournament.teams??[]).find(team=>team.id===id)??null;
}

// The match the player must play this round, or null for a bye.
export function nextPlayerMatch(tournament){
  if(!tournament||tournament.finished||tournament.playerOut)return null;
  return tournament.currentMatch??null;
}

// Whether the player is sitting this round out with a bye. A bye only exists
// in a bracket, and only when the pairing has no opponent.
export function playerHasBye(tournament){
  if(!tournament||tournament.finished||tournament.playerOut)return false;
  if(tournament.shape!=='bracket')return false;
  const alive=tournament.alive??[];
  for(let index=0;index<alive.length;index+=2){
    const home=alive[index];
    const away=alive[index+1];
    if(home?.id===tournament.playerTeamId&&!away)return true;
    if(away?.id===tournament.playerTeamId&&!home)return true;
  }
  return false;
}

// Builds the pairings for the current round and sets the player's match.
export function startRound(tournament,random){
  if(tournament.finished)return;
  tournament._roundStarted=true;
  tournament.currentMatch=null;
  if(tournament.shape==='bracket'){
    const alive=tournament.alive;
    for(let index=0;index<alive.length;index+=2){
      const home=alive[index];
      const away=alive[index+1];
      if(home?.id===tournament.playerTeamId||away?.id===tournament.playerTeamId){
        if(home&&away)tournament.currentMatch={home,away,slot:index/2};
      }
    }
    return;
  }
  if(tournament.shape==='round-robin'||tournament.shape==='mlp'){
    const round=tournament.rounds[tournament.round]??[];
    tournament.currentMatch=round.find(match=>match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)??null;
    return;
  }
  if(tournament.shape==='double-elimination'){
    const aliveIds=tournament.alive;
    const pool=shuffle(aliveIds.map(id=>teamById(tournament,id)).filter(Boolean),random);
    const pairings=[];
    for(let index=0;index<pool.length;index+=2){
      const home=pool[index];
      const away=pool[index+1];
      if(!home)continue;
      if(!away){pairings.push({home,away:null});continue;}
      pairings.push({home,away});
    }
    tournament.pairings=pairings;
    tournament.currentMatch=pairings.find(match=>match.home.id===tournament.playerTeamId||match.away?.id===tournament.playerTeamId)??null;
    if(tournament.currentMatch&&!tournament.currentMatch.away)tournament.currentMatch=null;
    return;
  }
  if(tournament.shape==='ladder'){
    const order=tournament.order;
    const matches=[];
    for(let court=0;court+1<order.length;court+=2){
      const above=order[court];
      const below=order[court+1];
      if(above&&below)matches.push({home:above,away:below,court});
    }
    tournament.pairings=matches;
    tournament.currentMatch=matches.find(match=>match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)??null;
    return;
  }
  if(tournament.shape==='open'){
    const players=tournament.players.filter(athlete=>athlete.id!=='player');
    const pool=shuffle(players,random);
    const partner=pool[0];
    const opponents=pool.slice(1,3);
    if(!partner||opponents.length<2)return;
    const home={id:'player',name:'You & '+partner.name,members:[tournament.players[0],partner],rating:(tournament.players[0].rating+partner.rating)/2,skill:(tournament.players[0].skill+partner.skill)/2};
    const away={id:'opponents',name:opponents.map(athlete=>athlete.name).join(' & '),members:opponents,rating:opponents.reduce((sum,athlete)=>sum+athlete.rating,0)/2,skill:opponents.reduce((sum,athlete)=>sum+athlete.skill,0)/2};
    tournament.currentMatch={home,away,slot:0};
  }
}

// Plays every match in the current round except the player's.
export function simulateRestOfRound(tournament,random){
  const results=[];
  if(tournament.shape==='bracket'){
    const alive=tournament.alive;
    const winners=[];
    for(let index=0;index<alive.length;index+=2){
      const home=alive[index];
      const away=alive[index+1];
      if(!home&&!away){winners.push(null);continue;}
      if(!home){winners.push(away);continue;}
      if(!away){winners.push(home);continue;}
      if(home.id===tournament.playerTeamId||away.id===tournament.playerTeamId){winners.push(null);continue;}
      const outcome=simulateMatch(home,away,random);
      winners.push(outcome.homeWon?home:away);
      results.push({round:tournament.round,home:home.id,away:away.id,score:outcome.score,winner:outcome.homeWon?home.id:away.id});
    }
    tournament.pendingWinners=winners;
    return results;
  }
  if(tournament.shape==='round-robin'||tournament.shape==='mlp'){
    const round=tournament.rounds[tournament.round]??[];
    for(const match of round){
      if(match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)continue;
      const outcome=simulateMatch(match.home,match.away,random);
      const homeRecord=tournament.records[match.home.id];
      const awayRecord=tournament.records[match.away.id];
      if(outcome.homeWon){homeRecord.wins+=1;awayRecord.losses+=1;}else{awayRecord.wins+=1;homeRecord.losses+=1;}
      homeRecord.points+=outcome.homeMine;awayRecord.points+=outcome.homeTheirs;
      results.push({round:tournament.round,home:match.home.id,away:match.away.id,score:outcome.score,winner:outcome.homeWon?match.home.id:match.away.id});
    }
    return results;
  }
  if(tournament.shape==='double-elimination'){
    for(const match of tournament.pairings??[]){
      if(!match.away)continue;
      if(match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)continue;
      const outcome=simulateMatch(match.home,match.away,random);
      const loser=outcome.homeWon?match.away:match.home;
      tournament.lives[loser.id]-=1;
      results.push({round:tournament.round,home:match.home.id,away:match.away.id,score:outcome.score,winner:outcome.homeWon?match.home.id:match.away.id});
    }
    return results;
  }
  if(tournament.shape==='ladder'){
    for(const match of tournament.pairings??[]){
      if(match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)continue;
      const outcome=simulateMatch(match.home,match.away,random);
      const winner=outcome.homeWon?match.home:match.away;
      const loser=outcome.homeWon?match.away:match.home;
      tournament.points[winner.id]=(tournament.points[winner.id]??0)+1;
      applyLadderSwap(tournament.order,winner,loser);
      results.push({round:tournament.round,home:match.home.id,away:match.away.id,score:outcome.score,winner:winner.id});
    }
    return results;
  }
  return results;
}

// The winner climbs one rung and the loser drops one, by swapping with the
// neighbour on that side. Swapping keeps every team in the ranking.
function applyLadderSwap(order,winner,loser){
  const wi=order.findIndex(team=>team.id===winner.id);
  if(wi>0){const target=wi-1;[order[wi],order[target]]=[order[target],order[wi]];}
  const li=order.findIndex(team=>team.id===loser.id);
  if(li>=0&&li<order.length-1){const target=li+1;[order[li],order[target]]=[order[target],order[li]];}
}

// Records the player's own result and advances the tournament.
export function recordPlayerResult(tournament,{won,score}){
  const match=tournament.currentMatch;
  const bye=!match&&playerHasBye(tournament);
  if(!match&&!bye&&!tournament.playerOut)return {ok:false,message:'The player has no match in this round.'};
  const playerIsHome=match?match.home.id===tournament.playerTeamId:true;
  const opponent=match?(playerIsHome?match.away:match.home):{name:'a bye',rating:0};
  tournament.history=tournament.history??[];
  tournament.history.push({round:tournament.round,opponent:opponent.name,opponentRating:opponent.rating,won:bye?true:won,score:bye?'bye':score});
  if(bye)won=true;
  if(tournament.shape==='bracket'){
    const winners=tournament.pendingWinners??[];
    const nextAlive=[];
    const alive=tournament.alive;
    for(let index=0;index<alive.length;index+=2){
      const home=alive[index];
      const away=alive[index+1];
      if(home?.id===tournament.playerTeamId||away?.id===tournament.playerTeamId){
        nextAlive.push(won?(home?.id===tournament.playerTeamId?home:away):(home?.id===tournament.playerTeamId?away:home));
      }else nextAlive.push(winners[index/2]??null);
    }
    if(!won){tournament.playerOut=true;tournament.playerPlace=placeForLoss(tournament.round,tournament.size);}
    tournament.alive=nextAlive;
    tournament.round+=1;
    if(tournament.alive.filter(Boolean).length<=1){
      tournament.finished=true;
      tournament.champion=tournament.alive.find(Boolean)??null;
      if(won&&!tournament.playerOut)tournament.playerPlace=1;
    }
    tournament.currentMatch=null;
    return {ok:true,tournament};
  }
  if(tournament.shape==='round-robin'||tournament.shape==='mlp'){
    const record=tournament.records[tournament.playerTeamId];
    if(record){if(won){record.wins+=1;}else{record.losses+=1;}}
    tournament.round+=1;
    if(tournament.round>=tournament.rounds.length){
      tournament.finished=true;
      const standings=[...tournament.teams].sort((a,b)=>{
        const ra=tournament.records[a.id],rb=tournament.records[b.id];
        return rb.wins-ra.wins||rb.points-ra.points||b.rating-a.rating;
      });
      tournament.playerPlace=standings.findIndex(team=>team.id===tournament.playerTeamId)+1;
      tournament.champion=standings[0]??null;
    }
    tournament.currentMatch=null;
    return {ok:true,tournament};
  }
  if(tournament.shape==='double-elimination'){
    if(!won)tournament.lives[tournament.playerTeamId]-=1;
    else if(match){
      const opponentId=match.home.id===tournament.playerTeamId?match.away.id:match.home.id;
      tournament.lives[opponentId]-=1;
    }
    tournament.round+=1;
    tournament.alive=tournament.alive.filter(id=>tournament.lives[id]>0);
    if(tournament.lives[tournament.playerTeamId]<=0){
      tournament.playerOut=true;
      tournament.playerPlace=tournament.alive.length+1;
    }
    if(tournament.alive.length<=1){
      tournament.finished=true;
      tournament.champion=teamById(tournament,tournament.alive[0])??null;
      if(!tournament.playerOut)tournament.playerPlace=1;
    }
    tournament.currentMatch=null;
    return {ok:true,tournament};
  }
  if(tournament.shape==='ladder'){
    if(won)tournament.points[tournament.playerTeamId]=(tournament.points[tournament.playerTeamId]??0)+1;
    applyLadderSwap(tournament.order,won?match.home:match.away,won?match.away:match.home);
    tournament.round+=1;
    if(tournament.round>=tournament.rounds){
      tournament.finished=true;
      const standings=[...tournament.teams].sort((a,b)=>(tournament.points[b.id]??0)-(tournament.points[a.id]??0)||b.rating-a.rating);
      tournament.playerPlace=standings.findIndex(team=>team.id===tournament.playerTeamId)+1;
      tournament.champion=standings[0]??null;
    }
    tournament.currentMatch=null;
    return {ok:true,tournament};
  }
  if(tournament.shape==='open'){
    if(won)tournament.points.player=(tournament.points.player??0)+1;
    tournament.round+=1;
    if(tournament.round>=tournament.rounds){
      tournament.finished=true;
      const standings=[...tournament.players].sort((a,b)=>(tournament.points[b.id]??0)-(tournament.points[a.id]??0)||b.rating-a.rating);
      tournament.playerPlace=standings.findIndex(athlete=>athlete.id==='player')+1;
      tournament.champion=standings[0]??null;
    }
    tournament.currentMatch=null;
    return {ok:true,tournament};
  }
  return {ok:false,message:'Unknown competition shape.'};
}

// Whether the player's part in the tournament is over.
export function isPlayerDone(tournament){
  return Boolean(tournament?.finished||tournament?.playerOut);
}

// The points a finished tournament is worth to the player.
export function tournamentPoints(tournament){
  if(!tournament.finished||!tournament.playerPlace)return 0;
  return pointsForFinish(tournament.championPoints??0,tournament.playerPlace);
}

// A short summary for the screen.
export function tournamentSummary(tournament){
  if(!tournament)return null;
  const total=tournament.shape==='bracket'?Math.round(Math.log2(tournament.size)):(tournament.rounds?.length??1);
  return {
    label:tournament.label,
    bracket:tournament.bracket,
    format:tournament.format,
    shape:tournament.shape,
    round:Math.min((tournament.round??0)+1,Math.ceil(total||1)),
    rounds:Math.ceil(total||1),
    finished:tournament.finished,
    place:tournament.playerPlace,
    history:tournament.history
  };
}
