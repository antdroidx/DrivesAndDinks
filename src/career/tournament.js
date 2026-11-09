// Tournaments.
//
// An event fields a tournament rather than a single match. The field is
// drawn from the rated population, gated by the division, seeded, and played
// one round at a time.
//
// The player's own matches are played on the real engine. Every other match
// is decided here. A tournament is a small state machine so that a career
// can stop between rounds, hand a match to the engine, and pick the same
// tournament up again when the result comes back.

import {ratedPopulation} from './world.js';
import {RATING_BRACKETS,formatSkill,divisionFor,gateRating} from './rating.js';
import {seededRandom} from '../competition.js';
import {mixSeed} from './population.js';
import {pointsForFinish} from './tour.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const shuffle=(items,random)=>{
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
};

// The next power of two at or above a number. A bracket is always that size,
// and the empty places are the byes.
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

// A team is two players in a doubles draw and one in singles. An open draw
// fields single players who are paired again every round.
function makeTeam(members,id){
  const team={
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
    rating:members.reduce((sum,member)=>sum+member.rating,0)/members.length,
    skill:members.reduce((sum,member)=>sum+(member.skill??0),0)/members.length
  };
  return team;
}

// The rated players a division can field.
//
// A bracket is a rating band, so the field for a 3.5 bracket is the 3.5
// bracket even when the event is open. Open means any bracket may be
// entered; it does not mean every rating plays in the same draw. A thin
// band is filled by the nearest ratings above and below it.
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

// Builds the player's own team, then fills the draw around it.
export function buildField({state,event,option,drawSize=16}){
  const random=seededRandom(mixSeed(state.seed,`tournament:${state.week}:${event.eventId}:${option.id}`));
  const singles=option.format==='singles';
  const teamSize=singles?1:2;
  const need=Math.max(4,drawSize??event?.drawSize??16);
  const rating=state.athlete.formats[option.format];
  const skill=formatSkill(state.athlete.ratings,option.format);
  const player={id:state.athlete.id??'player',name:state.athlete.name,rating,skill,isPlayer:true};
  // The field is the strongest players the division can field, not a random
  // sample of the region. Teams are made from neighbours in that ordering
  // so a draw is a band of similar players.
  const pool=populationFor({state,event,option})
    .filter(athlete=>athlete.id!==player.id)
    .sort((a,b)=>b.rating-a.rating);
  const teams=[];
  // The player always fields, so their team is built first and seeded.
  if(singles){
    teams.push(makeTeam([player],'player'));
  }else{
    // The partner is the player's own level, which is how a player picks
    // one, rather than the strongest name in the draw.
    let partnerIndex=0;
    let bestGap=Infinity;
    for(let index=0;index<pool.length;index++){
      const gap=Math.abs(pool[index].rating-rating);
      if(gap<bestGap){bestGap=gap;partnerIndex=index;}
    }
    const partner=pool.splice(partnerIndex,1)[0];
    if(!partner)return null;
    teams.push(makeTeam([player,partner],'player'));
  }
  while(teams.length<need&&pool.length>=teamSize){
    const members=pool.splice(0,teamSize);
    teams.push(makeTeam(members,'t'+teams.length));
  }
  return teams;
}

// A single elimination bracket, seeded by rating, with byes in the empty
// slots. The strongest team is seed one.
export function buildBracket(teams){
  const ranked=[...teams].sort((a,b)=>b.rating-a.rating);
  const size=bracketSize(ranked.length);
  const order=seedOrder(size);
  const slots=order.map(seed=>ranked[seed]??null);
  return {
    shape:'bracket',
    size,
    alive:slots,
    round:0,
    history:[],
    finished:false,
    playerTeamId:teams.find(team=>team.id==='player')?.id??null,
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
  const records=new Map(teams.map(team=>[team.id,{wins:0,losses:0,points:0}]));
  return {
    shape:'round-robin',
    size:teams.length,
    rounds,
    round:0,
    history:[],
    records,
    finished:false,
    playerTeamId:'player',
    playerOut:false,
    playerPlace:null,
    champion:null
  };
}

// Starts a tournament for an event entry.
export function startTournament({state,event,option}){
  const teams=buildField({state,event,option,drawSize:event?.drawSize??16});
  if(!teams||teams.length<2)return {ok:false,message:'Nobody else is fielding at this event.'};
  const random=seededRandom(mixSeed(state.seed,`format:${state.week}:${event.eventId}:${option.id}`));
  const league=option.format==='singles'?false:event?.matchType==='league';
  const tournament=league
    ?buildRoundRobin(teams.slice(0,Math.min(teams.length,event?.drawSize??16)),random)
    :buildBracket(teams.slice(0,Math.min(teams.length,event?.drawSize??16)));
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
      teams:teams.slice(0,Math.min(teams.length,event?.drawSize??16))
    })
  };
}

// Whether the player's part in the tournament is over.
export function isPlayerDone(tournament){
  return Boolean(tournament?.finished||tournament?.playerOut);
}

// The match the player must play next, or null when their round is done.
export function nextPlayerMatch(tournament){
  if(tournament.finished||tournament.playerOut)return null;
  if(tournament.shape==='bracket'){
    const alive=tournament.alive;
    for(let index=0;index+1<alive.length;index+=2){
      const home=alive[index];
      const away=alive[index+1];
      if(home?.id===tournament.playerTeamId||away?.id===tournament.playerTeamId){
        if(!home||!away)return null;
        return {home,away,round:tournament.round,slot:index/2};
      }
    }
    return null;
  }
  const round=tournament.rounds[tournament.round];
  if(!round)return null;
  return round.find(match=>match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)??null;
}

// Whether the player has a bye in the current round.
export function playerHasBye(tournament){
  if(tournament.shape!=='bracket')return false;
  const alive=tournament.alive;
  for(let index=0;index+1<alive.length;index+=2){
    const home=alive[index];
    const away=alive[index+1];
    if(home?.id===tournament.playerTeamId)return !away;
    if(away?.id===tournament.playerTeamId)return !home;
  }
  return false;
}

// The simulated outcome of a match between two teams.
export function simulateMatch(home,away,random,points=11){
  const edge=clamp(.5+(home.skill-away.skill)/60,.28,.72);
  let mine=0,theirs=0;
  while(true){
    if(random()<edge)mine++;else theirs++;
    if((mine>=points||theirs>=points)&&Math.abs(mine-theirs)>=2)break;
  }
  return {homeMine:mine,homeTheirs:theirs,homeWon:mine>theirs,score:mine+'-'+theirs};
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
      if(home.id===tournament.playerTeamId||away.id===tournament.playerTeamId){
        winners.push(null);
        continue;
      }
      const outcome=simulateMatch(home,away,random);
      winners.push(outcome.homeWon?home:away);
      results.push({round:tournament.round,home:home.id,away:away.id,score:outcome.score,winner:outcome.homeWon?home.id:away.id});
    }
    tournament.pendingWinners=winners;
    return results;
  }
  const round=tournament.rounds[tournament.round]??[];
  for(const match of round){
    if(match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)continue;
    const outcome=simulateMatch(match.home,match.away,random);
    const record=match.home.record??tournament.records.get(match.home.id);
    const other=match.away.record??tournament.records.get(match.away.id);
    const winner=outcome.homeWon?record:other;
    const loser=outcome.homeWon?other:record;
    winner.wins+=1;loser.losses+=1;
    winner.points+=outcome.homeMine;loser.points+=outcome.homeTheirs;
    results.push({round:tournament.round,home:match.home.id,away:match.away.id,score:outcome.score,winner:outcome.homeWon?match.home.id:match.away.id});
  }
  return results;
}

// Records the player's own result and advances the tournament.
export function recordPlayerResult(tournament,{won,score}){
  const match=nextPlayerMatch(tournament);
  if(!match)return {ok:false,message:'The player has no match in this round.'};
  const playerIsHome=match.home.id===tournament.playerTeamId;
  const opponent=playerIsHome?match.away:match.home;
  tournament.history.push({
    round:tournament.round,
    opponent:opponent.name,
    opponentRating:opponent.rating,
    won,
    score
  });
  if(tournament.shape==='bracket'){
    const winners=tournament.pendingWinners??[];
    const winners2=[];
    const alive=tournament.alive;
    for(let index=0;index<alive.length;index+=2){
      const home=alive[index];
      const away=alive[index+1];
      if(home?.id===tournament.playerTeamId||away?.id===tournament.playerTeamId){
        winners2.push(won?(home?.id===tournament.playerTeamId?home:away):(home?.id===tournament.playerTeamId?away:home));
      }else{
        winners2.push(winners[index/2]??null);
      }
    }
    if(!won){
      tournament.playerOut=true;
      tournament.playerPlace=placeForLoss(tournament.round,tournament.size);
    }
    tournament.alive=winners2;
    tournament.round+=1;
    if(tournament.alive.filter(Boolean).length<=1){
      tournament.finished=true;
      tournament.champion=tournament.alive.find(Boolean)??null;
      if(won&&!tournament.playerOut)tournament.playerPlace=1;
    }
    return {ok:true,tournament};
  }
  const record=tournament.records.get(tournament.playerTeamId);
  if(record){record.wins+=won?1:0;record.losses+=won?0:1;}
  tournament.round+=1;
  if(tournament.round>=tournament.rounds.length){
    tournament.finished=true;
    const standings=[...tournament.teams].sort((a,b)=>{
      const ra=tournament.records.get(a.id),rb=tournament.records.get(b.id);
      return rb.wins-ra.wins||rb.points-ra.points||b.rating-a.rating;
    });
    tournament.playerPlace=standings.findIndex(team=>team.id===tournament.playerTeamId)+1;
    tournament.champion=standings[0]??null;
  }
  return {ok:true,tournament};
}

// The points a finished tournament is worth to the player.
export function tournamentPoints(tournament){
  if(!tournament.finished||!tournament.playerPlace)return 0;
  return pointsForFinish(tournament.championPoints??0,tournament.playerPlace);
}

// A short summary for the screen.
export function tournamentSummary(tournament){
  if(!tournament)return null;
  const total=tournament.shape==='bracket'?Math.log2(tournament.size):tournament.rounds.length;
  return {
    label:tournament.label,
    bracket:tournament.bracket,
    format:tournament.format,
    round:Math.min(tournament.round+1,Math.ceil(total||1)),
    rounds:Math.ceil(total||1),
    finished:tournament.finished,
    place:tournament.playerPlace,
    history:tournament.history
  };
}
