// Competition structures.
//
// Each template is turned into a real competition here: the teams are drawn
// from the rated population, the rounds are arranged according to the shape
// of the template, and the schedule says who plays whom and when.
//
// A competition is generated, not authored. The same seed always produces
// the same competition, and a different career produces a different one.
//
// Some shapes cannot be arranged up front. Who reaches the playoff of a
// round robin depends on the results, who is still alive in a double
// elimination depends on the results, and where everybody sits on a ladder
// changes every round. Those are resolved as the competition is played, so
// the structure and the simulation live together.

import {seededRandom} from '../competition.js?v=203';
import {mixSeed} from './population.js?v=203';
import {rulesFor} from './events.js?v=203';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const shuffle=(items,random)=>{
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
};

// A team is a group of players. An open competition fields single players
// instead, each of whom is given a new partner every round.
function makeTeam(members,template){
  const id=template.teams==='random'
    ?members[0].id
    :'t:'+members.map(member=>member.id).sort().join('+');
  return {
    id,
    name:members.map(member=>member.name).join(' & '),
    members,
    rating:members.reduce((sum,member)=>sum+(member.rating??0),0)/members.length,
    skill:members.reduce((sum,member)=>sum+(member.skill??0),0)/members.length,
    record:{wins:0,losses:0,points:0}
  };
}

// Draw the field.
//
// The player, when there is one, is always fielded. Their team is built
// first so the competition has a place for them, and the rest of the field
// is drawn around it.
function drawField({population,template,random,playerId}){
  const everyone=population??[];
  const pool=shuffle(everyone.filter(athlete=>athlete.id!==playerId),random);
  const size=template.teamSize
    ?template.teamSize[random()<0.5?0:1]
    :(template.teams==='random'?1:2);
  const teams=[];

  // An open competition fields single players. They are given a new partner
  // every round, so a side is one person.
  if(template.teams==='random'){
    const limit=Math.min(template.maxTeams,pool.length+(playerId?1:0));
    const field=pool.slice(0,Math.max(0,limit-(playerId?1:0)));
    if(playerId){
      const player=everyone.find(athlete=>athlete.id===playerId);
      if(player)field.unshift(player);
    }
    for(const athlete of field)teams.push(makeTeam([athlete],template));
    return teams;
  }

  let cursor=0;
  if(playerId){
    const player=everyone.find(athlete=>athlete.id===playerId);
    if(player){
      teams.push(makeTeam([player,...pool.slice(0,size-1)],template));
      cursor=size-1;
    }
  }
  const limit=Math.min(template.maxTeams,Math.max(4,pool.length+teams.length));
  while(cursor<pool.length&&teams.length<limit){
    const members=pool.slice(cursor,cursor+size);
    if(members.length<size)break;
    cursor+=size;
    teams.push(makeTeam(members,template));
  }
  return teams;
}

// Every pair meets once. The rounds are arranged so a side plays one match
// per round.
function roundRobinRounds(teams,random,twice=false){
  const sides=shuffle(teams,random);
  const rotation=sides.length%2?[null,...sides]:[...sides];
  const rounds=[];
  for(let round=0;round<rotation.length-1;round++){
    const matches=[];
    for(let index=0;index<rotation.length/2;index++){
      const home=rotation[index];
      const away=rotation[rotation.length-1-index];
      if(home&&away)matches.push({home:home.id,away:away.id});
    }
    rounds.push(matches);
    rotation.splice(1,0,rotation.pop());
  }
  if(!twice)return rounds;
  // The second half of the season is the first half with the sides swapped.
  return [...rounds,...rounds.map(matches=>matches.map(match=>({home:match.away,away:match.home})))];
}

// Players are drawn a new partner every round.
function openRoundRobinRounds(players,random,roundCount){
  const rounds=[];
  let pool=shuffle(players,random);
  for(let round=0;round<roundCount;round++){
    const matches=[];
    for(let index=0;index+1<pool.length;index+=2){
      matches.push({home:pool[index].id,away:pool[index+1].id});
    }
    rounds.push(matches);
    pool=shuffle(pool,random);
  }
  return rounds;
}

// Brackets. The field is split into groups that each play a short round
// robin, and the group winners make the playoff.
function bracketGroups(teams,random,bracketSize){
  const seeded=shuffle(teams,random);
  const groups=[];
  for(let index=0;index<seeded.length;index+=bracketSize){
    const group=seeded.slice(index,index+bracketSize);
    if(group.length>=2)groups.push(group);
  }
  return groups;
}

// A ladder. Every side is ranked onto a court and plays the side below it.
function ladderCourts(teams,courtCount){
  const ranked=[...teams].sort((a,b)=>b.rating-a.rating);
  const courts=[];
  for(let index=0;index<ranked.length;index++){
    const court=Math.min(courtCount-1,Math.floor(index/Math.max(1,Math.ceil(ranked.length/courtCount))));
    (courts[court]??=[]).push(ranked[index]);
  }
  for(let court=0;court<courtCount;court++)courts[court]??=[];
  return courts;
}

// The single elimination playoff. The last four are best of three.
function playoffStructure(entrants,random){
  const seeded=shuffle(entrants,random);
  const rounds=[];
  let current=seeded;
  while(current.length>1){
    const matches=[];
    const next=[];
    for(let index=0;index<current.length;index+=2){
      const home=current[index];
      const away=current[index+1];
      if(!home)continue;
      if(!away){next.push(home);continue;}
      matches.push({home:home.id,away:away.id});
      next.push(home);
    }
    rounds.push(matches);
    current=next;
  }
  return rounds;
}

// Builds a competition from a template.
export function generateCompetition({
  seed,
  regionId,
  week,
  template,
  format,
  level='3.5',
  population,
  rules={},
  playerId=null,
  playerTeamId=null
}){
  const random=seededRandom(mixSeed(seed,'competition:'+template.id+':'+week+':'+level));
  const played=rulesFor(template,rules);
  const teams=drawField({population,template,random,playerId});
  const playerTeam=playerId
    ?teams.find(team=>team.members.some(member=>member.id===playerId))??null
    :null;

  let rounds=[];
  let groups=[];
  let courts=[];
  let playoff=null;
  let mode='round-robin';

  if(template.shape==='round-robin'){
    if(template.teams==='random'){
      const roundCount=Math.max(1,Math.min(teams.length-1,played.roundsPerBracket));
      rounds=openRoundRobinRounds(teams,random,roundCount);
      mode='open-round-robin';
    }else{
      rounds=roundRobinRounds(teams,random);
      mode='round-robin';
      if(template.playoffSize>=2&&teams.length>template.playoffSize){
        playoff={size:template.playoffSize,source:'standings'};
        mode='round-robin-playoff';
      }
    }
  }else if(template.shape==='bracket'){
    groups=bracketGroups(teams,random,template.bracketSize??8);
    for(const group of groups){
      const groupRounds=roundRobinRounds(group,random).slice(0,Math.max(1,Math.min(played.roundsPerBracket,group.length-1)));
      for(const round of groupRounds)rounds.push(round);
    }
    playoff={size:template.playoffSize??groups.length,source:'groups'};
    mode='bracket';
  }else if(template.shape==='double-elimination'){
    // The draw is made each round from whoever is still alive.
    mode='double-elimination';
  }else if(template.shape==='ladder'){
    courts=ladderCourts(teams,played.ladderCourts);
    mode='ladder';
  }else if(template.shape==='mlp'){
    const pairings=[];
    for(let index=0;index<teams.length;index+=2){
      const home=teams[index];
      const away=teams[index+1];
      if(home&&away)pairings.push({home,away});
    }
    // Each pairing plays doubles and singles, and the players rotate
    // through the line up so different combinations meet.
    for(let round=0;round<Math.max(2,played.roundsPerBracket);round++){
      const matches=[];
      for(const pairing of pairings){
        matches.push({
          home:pairing.home.id,away:pairing.away.id,court:'doubles',
          homeLineup:[round%2,(round+1)%2],awayLineup:[round%2,(round+1)%2]
        });
        matches.push({
          home:pairing.home.id,away:pairing.away.id,court:'singles',
          homeLineup:[(round+2)%4],awayLineup:[(round+2)%4]
        });
      }
      if(matches.length)rounds.push(matches);
    }
    mode='mlp';
  }

  return {
    id:template.id+'-w'+week,
    templateId:template.id,
    label:template.label,
    shape:template.shape,
    mode,
    week,
    format,
    level,
    rules:played,
    field:teams,
    rounds,
    playoff,
    groups,
    courts,
    playerTeamId:playerTeamId??playerTeam?.id??null,
    playerId
  };
}

// A game runs to the target points and is won by two.
function playGame(random,target,homeEdge){
  let mine=0,theirs=0;
  while(true){
    if(random()<homeEdge)mine++;else theirs++;
    if((mine>=target||theirs>=target)&&Math.abs(mine-theirs)>=2)break;
  }
  return {mine,theirs};
}

// A match is one game, or a best of three when the rules ask for it.
function playMatch({homeEdge,points,bestOf,random}){
  const games=[];
  let homeWins=0;
  let awayWins=0;
  const needed=bestOf===3?2:1;
  while(homeWins<needed&&awayWins<needed){
    const game=playGame(random,points,homeEdge);
    games.push(game);
    if(game.mine>game.theirs)homeWins++;else awayWins++;
  }
  const score=games.length===1
    ?games[0].mine+'-'+games[0].theirs
    :homeWins+'-'+awayWins;
  return {homeWins,awayWins,games,score,homeWon:homeWins>awayWins};
}

// Plays a competition out.
//
// Every match is resolved from the two sides' ratings and their underlying
// skill, exactly as a career match is. The player's own match is left for
// them to play, so the simulator marks it rather than deciding it.
export function simulateCompetition({competition,population,random}){
  const rules=competition.rules??{};
  const teams=new Map(competition.field.map(team=>[team.id,{...team,record:{wins:0,losses:0,points:0}}]));
  const results=[];
  const playerMatches=[];
  const byId=new Map((population??[]).map(athlete=>[athlete.id,athlete]));

  // The skill of the players actually on court. A match on the singles court
  // is one player, not the whole team.
  const lineupSkill=(team,match)=>{
    if(!match.homeLineup)return team.skill??0;
    const side=match.side;
    const indexes=side==='home'?match.homeLineup:match.awayLineup;
    const members=indexes.map(index=>team.members[index]).filter(Boolean);
    if(!members.length)return team.skill??0;
    return members.reduce((sum,member)=>sum+(member.skill??0),0)/members.length;
  };

  const play=(match,round,points,bestOf,stage='league')=>{
    const home=teams.get(match.home);
    const away=teams.get(match.away);
    if(!home||!away)return null;
    const involvesPlayer=match.home===competition.playerTeamId||match.away===competition.playerTeamId;
    if(involvesPlayer){
      playerMatches.push({round,match});
      return null;
    }
    const homeSkill=match.homeLineup?lineupSkill(home,{...match,side:'home'}):home.skill;
    const awaySkill=match.homeLineup?lineupSkill(away,{...match,side:'away'}):away.skill;
    const homeEdge=clamp(0.5+(homeSkill-awaySkill)/60,0.28,0.72);
    const outcome=playMatch({homeEdge,points,bestOf,random});
    home.record.wins+=outcome.homeWon?1:0;
    home.record.losses+=outcome.homeWon?0:1;
    away.record.wins+=outcome.homeWon?0:1;
    away.record.losses+=outcome.homeWon?1:0;
    const homePoints=outcome.games.reduce((sum,game)=>sum+game.mine,0);
    const awayPoints=outcome.games.reduce((sum,game)=>sum+game.theirs,0);
    home.record.points+=homePoints;
    away.record.points+=awayPoints;
    results.push({
      round,
      stage,
      points,
      bestOf,
      home:home.id,
      away:away.id,
      score:outcome.score,
      games:outcome.games.map(game=>game.mine+'-'+game.theirs),
      homeWon:outcome.homeWon
    });
    return {home,away,winner:outcome.homeWon?home:away,loser:outcome.homeWon?away:home};
  };

  const standingsNow=()=>[...teams.values()].sort(
    (a,b)=>b.record.wins-a.record.wins||b.record.points-a.record.points||b.rating-a.rating
  );

  if(competition.shape==='ladder'){
    // The courts are re-formed every round: the winners move up and the
    // losers move down, so the same two sides meet again.
    const courts=competition.courts.map(court=>court.map(team=>team.id));
    for(let round=0;round<(rules.ladderRounds??8);round++){
      const matches=[];
      for(let court=0;court<courts.length-1;court++){
        const here=courts[court]??[];
        const below=courts[court+1]??[];
        for(let index=0;index<Math.max(here.length,below.length);index++){
          const home=here[index];
          const away=below[index];
          if(home&&away)matches.push({home,away,court});
        }
      }
      const played=matches.map(match=>play(match,round,rules.points??15,1,'ladder')).filter(Boolean);
      for(const {winner,loser} of played){
        const from=courts.findIndex(court=>court.includes(winner.id));
        const to=courts.findIndex(court=>court.includes(loser.id));
        if(from<0||to<0)continue;
        const up=from>0?from-1:from;
        const down=to<courts.length-1?to+1:to;
        moveSide(courts,from,up,winner.id);
        moveSide(courts,to,down,loser.id);
      }
    }
  }else if(competition.shape==='double-elimination'){
    // Nobody goes out until they have lost twice, and the draw is made
    // again each round from whoever is still in.
    const lives=new Map(competition.field.map(team=>[team.id,2]));
    for(let round=0;round<(rules.roundsPerBracket??7)*2;round++){
      const alive=competition.field.filter(team=>lives.get(team.id)>0);
      if(alive.length<=1)break;
      const drawn=shuffle(alive,random);
      const matches=[];
      for(let index=0;index<drawn.length;index+=2){
        const home=drawn[index];
        const away=drawn[index+1];
        if(!home)continue;
        if(!away){lives.set(home.id,lives.get(home.id)-1);continue;}
        matches.push({home:home.id,away:away.id});
      }
      const bestOf=alive.length<=2?(rules.finalBestOf??3):1;
      const played=matches.map(match=>play(match,round,rules.points??15,bestOf,'double-elimination')).filter(Boolean);
      for(const {loser} of played)lives.set(loser.id,lives.get(loser.id)-1);
    }
  }else{
    // The qualifying rounds are arranged up front.
    for(const [round,matches] of competition.rounds.entries()){
      for(const match of matches)play(match,round,rules.points??11,1,'league');
    }
    // The playoff is seeded by what happened.
    if(competition.playoff){
      const entrants=playoffEntrants(competition,teams);
      const rounds=playoffStructure(entrants,random);
      for(const [index,matches] of rounds.entries()){
        const bestOf=entrants.length<=4?(rules.finalBestOf??3):1;
        for(const match of matches)play(match,competition.rounds.length+index,rules.playoffPoints??15,bestOf,'playoff');
      }
    }
  }

  const standings=standingsNow();
  const champion=standings[0]??null;
  const playerTeam=competition.playerTeamId?teams.get(competition.playerTeamId):null;
  const playerPlace=playerTeam?standings.findIndex(team=>team.id===playerTeam.id)+1:0;
  return {
    results,
    playerMatches,
    standings:standings.map(team=>({id:team.id,name:team.name,record:team.record})),
    champion,
    playerPlace,
    playerRecord:playerTeam?.record??null
  };
}

// Who reaches the playoff. A round robin sends its top four; a bracket
// tournament sends the winner of each bracket.
function playoffEntrants(competition,teams){
  if(competition.playoff?.source==='groups'){
    return competition.groups
      .map(group=>[...group].sort(
        (a,b)=>(teams.get(b.id)?.record.wins??0)-(teams.get(a.id)?.record.wins??0)
          ||(teams.get(b.id)?.record.points??0)-(teams.get(a.id)?.record.points??0)
      )[0])
      .filter(Boolean);
  }
  return [...teams.values()]
    .sort((a,b)=>b.record.wins-a.record.wins||b.record.points-a.record.points||b.rating-a.rating)
    .slice(0,competition.playoff?.size??4);
}

// Moves a side from one court to another.
function moveSide(courts,from,to,id){
  if(from===to||to<0||to>=courts.length)return;
  const source=courts[from];
  const index=source.indexOf(id);
  if(index<0)return;
  source.splice(index,1);
  courts[to].push(id);
}
