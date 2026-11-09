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
import {entryStatus} from './calendar.js';
import {resolvePartner} from './club-life.js';

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

// Seeds are placed in bands. The top two are fixed, and each later band is
// drawn at random within itself, which is how a real draw is made: two
// equally ranked players can land in either half.
export const SEED_BANDS=Object.freeze([[0,2],[2,4],[4,8],[8,12],[12,16],[16,24],[24,32],[32,64]]);

export function seedBands(teams,random=Math.random,{fixTop=true}={}){
  const ranked=[...teams].sort((a,b)=>b.rating-a.rating);
  const out=[];
  for(const [start,end] of SEED_BANDS){
    const slice=ranked.slice(start,end);
    if(!slice.length)break;
    const first=out.length;
    out.push(...shuffle(slice,random));
    if(fixTop&&first===0&&out.length>=2){
      // One and two hold their places; the rest of the band does not.
      const fixed=slice.sort((a,b)=>b.rating-a.rating);
      out[0]=fixed[0];
      out[1]=fixed[1];
    }
  }
  return out;
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
// Doubles uses players of the entrant's gender. Mixed doubles uses one man
// and one woman on every team. A thin rating band borrows from the nearest
// ratings, but gender never falls back to a different division's pool.
export function divisionPopulation({state,event,option,gender=null}){
  const division=RATING_BRACKETS.find(entry=>entry.id===option.divisionId);
  const all=ratedPopulation({
    seed:state.seed,
    regionId:state.regionId,
    ratings:state.worldRatings,
    week:state.week,
    format:option.format,
    gender,
    limit:2000
  }).filter(athlete=>athlete.id!==(state.athlete.id??'player'));
  const gendered=gender?all.filter(athlete=>athlete.gender===gender):all;
  const pool=gendered.length?gendered:all;
  if(!division)return pool;
  const inBracket=pool.filter(athlete=>athlete.rating>=division.min&&athlete.rating<=division.max);
  const source=inBracket.length?inBracket:pool;
  const distance=athlete=>athlete.rating<division.min?division.min-athlete.rating:athlete.rating>division.max?athlete.rating-division.max:0;
  return [...source].sort((a,b)=>distance(a)-distance(b));
}

// A varied order around the target rating. The small seeded jitter stops the
// same strongest names from filling every draw while preserving the bracket's
// competitive level.
function variedOrder(pool,target,random){
  return pool
    .map(athlete=>({athlete,score:Math.abs(athlete.rating-target)+random()*.9}))
    .sort((a,b)=>a.score-b.score)
    .map(entry=>entry.athlete);
}

function takePlayers(queue,count){return queue.splice(0,count)}

// Builds the player, then fills the draw around them.
export function buildField({state,event,option,drawSize=16}){
  const random=seededRandom(mixSeed(state.seed,`tournament:${state.week}:${event.eventId}:${option.id}`));
  const format=option.format;
  const singles=format==='singles';
  const mixed=format==='mixed';
  const teamLeague=(event?.shapes??[]).includes('mlp-style');
  const need=Math.max(4,drawSize??event?.drawSize??16);
  const target=state.athlete.formats[format]??4;
  const playerGender=state.athlete.gender==='female'?'female':'male';
  const oppositeGender=playerGender==='female'?'male':'female';
  const player={id:state.athlete.id??'player',name:state.athlete.name,rating:target,skill:formatSkill(state.athlete.ratings,format),isPlayer:true,
    archetypeId:state.athlete.archetypeId,gender:playerGender,handedness:state.athlete.handedness};
  const storedPartner=singles||teamLeague?null:resolvePartner(state,format);
  const selectedPartner=storedPartner?{...storedPartner,skill:formatSkill(storedPartner.ratings??{},format)}:null;
  const samePool=divisionPopulation({state,event,option,gender:playerGender})
    .filter(athlete=>athlete.id!==selectedPartner?.id);
  const oppositePool=divisionPopulation({state,event,option,gender:oppositeGender})
    .filter(athlete=>athlete.id!==selectedPartner?.id);
  const teams=[];

  if(singles){
    const queue=variedOrder(samePool,target,random);
    if(queue.length<need-1)return null;
    teams.push(makeTeam([player],'player'));
    for(const athlete of takePlayers(queue,need-1))teams.push(makeTeam([athlete],'t'+teams.length));
  }else if(mixed){
    const partner=selectedPartner??((takePlayers(variedOrder(oppositePool,target,random),1)[0])??null);
    if(!partner)return null;
    teams.push(makeTeam([player,partner],'player'));
    const men=variedOrder(playerGender==='male'?samePool:oppositePool,target,random)
      .filter(athlete=>athlete.id!==(playerGender==='male'?player.id:partner.id));
    const women=variedOrder(playerGender==='female'?samePool:oppositePool,target,random)
      .filter(athlete=>athlete.id!==(playerGender==='female'?player.id:partner.id));
    if(Math.min(men.length,women.length)<need-1)return null;
    while(teams.length<need){
      const man=takePlayers(men,1)[0];
      const woman=takePlayers(women,1)[0];
      teams.push(makeTeam([man,woman],'t'+teams.length));
    }
  }else if(teamLeague){
    const sameCount=1;
    const oppositeCount=2;
    const teammates=[];
    const same=variedOrder(samePool,target,random);
    const opposite=variedOrder(oppositePool,target,random);
    teammates.push(...takePlayers(same,sameCount),...takePlayers(opposite,oppositeCount));
    if(teammates.length<3)return null;
    teams.push(makeTeam([player,...teammates],'player'));
    if(Math.min(same.length,opposite.length/2)<need-1)return null;
    while(teams.length<need){
      const members=[...takePlayers(same,2),...takePlayers(opposite,2)];
      teams.push(makeTeam(members,'t'+teams.length));
    }
  }else{
    const partner=selectedPartner??(takePlayers(variedOrder(samePool,target,random),1)[0]??null);
    if(!partner)return null;
    teams.push(makeTeam([player,partner],'player'));
    const queue=variedOrder(samePool,target,random).filter(athlete=>athlete.id!==partner.id);
    if(queue.length<(need-1)*2)return null;
    while(teams.length<need){
      const members=takePlayers(queue,2);
      teams.push(makeTeam(members,'t'+teams.length));
    }
  }

  const players=[];
  const seen=new Set();
  for(const team of teams){
    for(const member of team.members){
      if(member.id===player.id||seen.has(member.id))continue;
      seen.add(member.id);
      players.push(member);
    }
  }
  return {teams,players};
}
// A single elimination bracket, seeded by rating, with byes in the empty
// slots.
export function buildBracket(teams,random=Math.random){
  const ranked=seedBands(teams,random);
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
export function pickShape(event){
  const shapes=(event?.shapes??[]).filter(Boolean);
  return shapes[0]??'tournament-bracket';
}

// Starts a tournament for an event entry.
export function startTournament({state,event,option}){
  const entry=entryStatus(state,event,{format:option.format});
  if(entry.via==='declined'){
    return {ok:false,message:'Outside the direct cut and the qualifier field for this event.'};
  }
  const field=buildField({state,event,option,drawSize:event?.drawSize??16});
  if(!field||field.teams.length<2)return {ok:false,message:'Nobody else is fielding at this event.'};
  const random=seededRandom(mixSeed(state.seed,`format:${state.week}:${event.eventId}:${option.id}`));
  const drawSize=Math.max(2,event?.drawSize??16);
  const teams=field.teams.slice(0,drawSize);
  const kind=pickShape(event,random);
  const playerAthlete={id:'player',name:state.athlete.name,rating:state.athlete.formats[option.format],skill:formatSkill(state.athlete.ratings,option.format),archetypeId:state.athlete.archetypeId,gender:state.athlete.gender,handedness:state.athlete.handedness};
  let tournament=buildByKind(kind,teams,field.players,random);
  if(kind==='mlp-style'){
    const nicknames=['Aces','Breakers','Drivers','Momentum','Rally','Sentinels','Stingers','Volley'];
    for(let index=0;index<teams.length;index++){
      teams[index].name=state.cityLabel+' '+nicknames[index%nicknames.length];
    }
    const playerTeam=teams.find(team=>team.id===tournament.playerTeamId);
    tournament.teams=teams;
    tournament.teamLeague={
      managedInBackground:true,
      teamName:playerTeam?.name??state.cityLabel+' Aces',
      roster:playerTeam?.members?.map(member=>member.name)??[]
    };
  }
  // The board decides whether the player is accepted directly, or has to
  // qualify. One qualifier match gets them into the draw in place of the
  // team they beat.
  const qualifierSlots=Math.max(0,Math.min(drawSize-1,event?.qualifierSlots??0));
  if(!entry.direct&&entry.via==='qualifier'&&qualifierSlots>0&&teams.length>qualifierSlots){
    const ranked=[...teams].sort((a,b)=>b.rating-a.rating);
    const cut=Math.max(1,Math.min(ranked.length-1,entry.directSlots??ranked.length-qualifierSlots));
    const playerIndex=ranked.findIndex(team=>team.id==='player');
    if(playerIndex>=cut){
      const opponent=ranked[cut-1]??ranked[0];
      const playerTeam=ranked[playerIndex];
      const mainTeams=ranked.filter(team=>team.id!==playerTeam.id&&team.id!==opponent.id);
      mainTeams.push(playerTeam);
      const main=buildByKind(kind,mainTeams,field.players,random);
      main.teams=mainTeams;
      tournament=Object.assign({},main,{shape:'qualifier',mainShape:main.shape,main,teams:mainTeams,currentMatch:{home:playerTeam,away:opponent},qualifierMatch:{home:playerTeam,away:opponent},stage:'qualifier',round:0,history:[]});
    }
  }
  // A league night plays its two or three matches and the rest of the season
  // is simulated. A tournament plays all of its rounds.
  const nightMatches=Number(event?.nightMatches)||0;
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
      difficulty:event.difficulty??'normal',
      entry:Object.assign({},entry),
      qualifierSlots:event.qualifierSlots??0,
      qualifierFieldSize:event.qualifierFieldSize??0,
      wildCardSlots:event.wildCardSlots??0,
      nightMatches,
      nightComplete:false,
      rules:{
        points:event.targetScore??11,
        playoffPoints:event.playoffPoints??15,
        scoring:event.scoring??'side-out',
        winBy:event.winBy??2
      },
      week:state.week,
      teams,
      // Only an open draw needs the player pool; a team draw carries
      // its teams and nothing else.
      players:tournament.shape==='open'?[playerAthlete,...field.players]:[]
    })
  };
}

// The rules a given round is played under. The last four of a bracket play
// to the playoff score rather than the league score.
export function matchRules(tournament){
  const rules=tournament?.rules??{};
  const base=rules.points??11;
  const playoff=rules.playoffPoints??15;
  const late=tournament?.shape==='bracket'&&tournament.size/Math.pow(2,tournament.round??0)<=4;
  return {targetScore:late?playoff:base,scoring:rules.scoring??'side-out',winBy:rules.winBy??2};
}

// Builds the tournament for a shape.
function buildByKind(kind,teams,players,random){
  if(kind==='round-robin-open'||kind==='ladder-open')return buildOpen({players,random,kind});
  if(kind==='mlp-style')return buildTeamLeague(teams,random);
  if(kind==='tournament-double-elimination')return buildDoubleElimination(teams,random);
  if(kind==='ladder-fixed')return buildLadder(teams,random);
  if(kind==='round-robin-league')return buildRoundRobin(teams,random);
  return buildBracket(teams,random);
}

// The simulated outcome of a match between two sides.
//
// Side-out only scores for the serving side and hands the serve over on a
// lost rally. Rally scoring awards a point to whoever wins the rally.
export function simulateMatch(home,away,random,points=11,rules={}){
  const edge=clamp(.5+(home.skill-away.skill)/60,.28,.72);
  const winBy=Math.max(1,rules.winBy??2);
  let mine=0,theirs=0;
  if(rules.scoring==='rally'){
    while(true){
      if(random()<edge)mine++;else theirs++;
      if((mine>=points||theirs>=points)&&Math.abs(mine-theirs)>=winBy)break;
    }
    return {homeMine:mine,homeTheirs:theirs,homeWon:mine>theirs,score:mine+'-'+theirs};
  }
  let serving=0;
  while(true){
    const homeWins=random()<edge;
    if(serving===0){
      if(homeWins){mine++;if(mine>=points&&mine-theirs>=winBy)break;}
      else serving=1;
    }else{
      if(!homeWins){theirs++;if(theirs>=points&&theirs-mine>=winBy)break;}
      else serving=0;
    }
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

// Whether the player is sitting this round out with a bye in a bracket or
// double-elimination round.
export function playerHasBye(tournament){
  if(!tournament||tournament.finished||tournament.playerOut)return false;
  if(tournament.shape==='double-elimination'){
    return (tournament.pairings??[]).some(match=>!match.away&&match.home?.id===tournament.playerTeamId);
  }
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
  if(tournament.shape==='qualifier'){
    tournament.currentMatch=tournament.qualifierMatch??null;
    return;
  }
  if(tournament.inConsolation){
    tournament.currentMatch=tournament.consolationMatch??null;
    return;
  }
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
    const match=round.find(entry=>entry.home.id===tournament.playerTeamId||entry.away.id===tournament.playerTeamId)??null;
    // Each opponent is a best of three. Every game still counts for the
    // rating, but only the series is a league win.
    if(match&&!tournament.series){
      tournament.series={home:match.home,away:match.away,playerWins:0,opponentWins:0};
    }
    tournament.currentMatch=tournament.series?{home:tournament.series.home,away:tournament.series.away}:match;
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
  const rules=matchRules(tournament);
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
      const outcome=simulateMatch(home,away,random,rules.targetScore,rules);
      winners.push(outcome.homeWon?home:away);
      results.push({round:tournament.round,home:home.id,away:away.id,score:outcome.score,winner:outcome.homeWon?home.id:away.id});
    }
    tournament.pendingWinners=winners;
    return results;
  }
  if(tournament.shape==='round-robin'||tournament.shape==='mlp'){
    // A round is played once. The player's best of three takes several games,
    // but the rest of the league only plays that round once, so the tables
    // stay level.
    if(tournament.simulatedRound===tournament.round)return results;
    tournament.simulatedRound=tournament.round;
    const round=tournament.rounds[tournament.round]??[];
    for(const match of round){
      if(match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)continue;
      const outcome=simulateMatch(match.home,match.away,random,rules.targetScore,rules);
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
      const outcome=simulateMatch(match.home,match.away,random,rules.targetScore,rules);
      const loser=outcome.homeWon?match.away:match.home;
      tournament.lives[loser.id]-=1;
      results.push({round:tournament.round,home:match.home.id,away:match.away.id,score:outcome.score,winner:outcome.homeWon?match.home.id:match.away.id});
    }
    return results;
  }
  if(tournament.shape==='ladder'){
    for(const match of tournament.pairings??[]){
      if(match.home.id===tournament.playerTeamId||match.away.id===tournament.playerTeamId)continue;
      const outcome=simulateMatch(match.home,match.away,random,rules.targetScore,rules);
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
  if(!bye&&match){
    const [pointsFor=0,pointsAgainst=0]=String(score??'').split('-').map(value=>Number(value)||0);
    const stats=tournament.playerStats??{games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0};
    stats.games+=1;
    if(won)stats.wins+=1;else stats.losses+=1;
    stats.pointsFor+=pointsFor;
    stats.pointsAgainst+=pointsAgainst;
    tournament.playerStats=stats;
  }
  if(tournament.inConsolation){
    tournament.inConsolation=false;
    tournament.consolationDone=true;
    tournament.playerOut=true;
    tournament.finished=true;
    tournament.currentMatch=null;
    return {ok:true,tournament};
  }
  if(tournament.shape==='qualifier'){
    if(!won){
      tournament.playerOut=true;
      tournament.finished=true;
      tournament.failedToQualify=true;
      tournament.currentMatch=null;
      return {ok:true,tournament};
    }
    const history=tournament.history;
    const main=tournament.main;
    Object.assign(tournament,main,{history,teams:main.teams??tournament.teams,qualified:true,stage:'main',currentMatch:null});
    return {ok:true,tournament};
  }
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
    if(!won){
      tournament.playerPlace=placeForLoss(tournament.round,tournament.size);
      // A first round loss drops the player into a secondary bracket for one
      // more match, rather than ending the event on the spot.
      if(tournament.round===0&&tournament.size>=8&&!tournament.consolationUsed){
        const playerTeam=tournament.teams.find(team=>team.id===tournament.playerTeamId);
        const opponent=tournament.teams.find(team=>team.id!==tournament.playerTeamId);
        if(playerTeam&&opponent){
          tournament.consolationUsed=true;
          tournament.inConsolation=true;
          tournament.consolationMatch={home:playerTeam,away:opponent,slot:0,consolation:true};
        }else tournament.playerOut=true;
      }else tournament.playerOut=true;
    }
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
    const series=tournament.series;
    if(series){
      if(won)series.playerWins+=1;else series.opponentWins+=1;
      const decided=series.playerWins>=2||series.opponentWins>=2;
      if(!decided){
        // The next game is played against the same opponent.
        tournament.currentMatch={home:series.home,away:series.away,game:true};
        return {ok:true,tournament};
      }
      const playerWonSeries=series.playerWins>series.opponentWins;
      const record=tournament.records[tournament.playerTeamId];
      if(record){
        if(playerWonSeries)record.wins+=1;
        else record.losses+=1;
      }
      // The opponent plays the same series and takes the other side of it.
      const opponentId=series.home.id===tournament.playerTeamId?series.away.id:series.home.id;
      const opponentRecord=tournament.records[opponentId];
      if(opponentRecord){
        if(playerWonSeries)opponentRecord.losses+=1;
        else opponentRecord.wins+=1;
      }
      tournament.series=null;
    }
    tournament.round+=1;
    const nightMatches=Number(tournament.nightMatches)||0;
    if(nightMatches>0&&tournament.round<tournament.rounds.length&&tournament.round%nightMatches===0){
      tournament.nightComplete=true;
    }
    if(tournament.round>=tournament.rounds.length){
      tournament.finished=true;
      tournament.nightComplete=false;
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
  if(!tournament)return true;
  if(tournament.inConsolation)return false;
  return Boolean(tournament.finished||tournament.playerOut);
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
