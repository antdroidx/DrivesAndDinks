// Career matches.
//
// A career event is a tournament. Entering one fields a draw, and the player
// plays their own path through it on the real engine while the rest of the
// field is simulated. This module owns the bridge: it turns a tournament
// match into an engine lineup, and it scores the engine's report back into
// the tournament and the career.

import {currentEvents,canEnterEvent,eventBlockReason,isLeagueEvent,isTravelEvent,attributeGrowth,pushHistory,pushLog,clamp,formatsPlayed,eventEntryCost} from './state.js';
import {careerProfile} from './matchmaking.js';
import {rateMatchReport,buildCareerRecord,CAREER_RECORD_LIMIT} from './match-record.js';
import {sponsorsFor,prizeFor} from './standings.js';
import {entryEligibility,entryStatus} from './calendar.js';
import {EVENT_BY_ID} from './geography.js';
import {divisionFor,NEW_PLAYER_RATING,formatRating} from './rating.js';
import {addPoints,pointsInWindow,EVENT_POOL,POOL_TOUR,POOL_MLP,pointsForFinish} from './tour.js';
import {recordResult} from './ranking.js';
import {contractOffer,signed as signContract,isTourEvent,recordTourEvent,recordReentryEvent,markRecommendation} from './contracts.js';
import {recordGame,recordEventResult,eventTypeFor} from './analytics.js';
import {capRatingForAge,capAttributeForAge,noteSkillPeaks,noteTrainingMaintenance} from './age.js';
import {mixSeed} from './population.js';
import {seededRandom} from '../competition.js';
import {startTournament,startRound,nextPlayerMatch,simulateRestOfRound,recordPlayerResult,isPlayerDone,playerHasBye,tournamentPoints,tournamentSummary,matchRules} from './tournament.js';

const signed=value=>(value>=0?'+':'')+value.toFixed(3);

// The share of the purse a finish is worth.
const PRIZE_FACTORS=Object.freeze([1,.6,.35,.15]);

function prizeFactor(place){
  if(!place)return 0;
  if(place<=1)return PRIZE_FACTORS[0];
  if(place===2)return PRIZE_FACTORS[1];
  if(place<=4)return PRIZE_FACTORS[2];
  if(place<=8)return PRIZE_FACTORS[3];
  return 0;
}

// Turns one tournament match into a lineup the engine can play.
function matchupFor({state,tournament,match}){
  const playerTeam=tournament.teams.find(team=>team.id===tournament.playerTeamId);
  if(!playerTeam)return null;
  const opponentTeam=match.home.id===playerTeam.id?match.away:match.home;
  if(!opponentTeam)return null;
  const doubles=tournament.format!=='singles';
  const player=careerProfile(state.athlete);
  if(doubles){
    const partner=careerProfile(playerTeam.members[1]??playerTeam.members[0]);
    const opponents=opponentTeam.members.slice(0,2).map(member=>careerProfile(member));
    while(opponents.length<2)opponents.push(careerProfile(opponentTeam.members[0]));
    return {
      lineup:[player,partner,opponents[0],opponents[1]],
      playerId:0,
      athleteIds:['player',playerTeam.members[1]?.id??null,opponentTeam.members[0]?.id??null,opponentTeam.members[1]?.id??null],
      format:'doubles',
      playerRating:state.athlete.formats[tournament.format]??0,
      opponentRatings:opponents.map((_,index)=>opponentTeam.members[index]?.rating??opponentTeam.rating),
      opponentIds:opponentTeam.members.map(member=>member.id),
      opponentNames:opponentTeam.members.map(member=>member.name),
      partnerId:playerTeam.members[1]?.id??null,
      partnerRating:playerTeam.members[1]?.rating??null,
      team:opponentTeam.name,
      teamRating:opponentTeam.rating
    };
  }
  const opponent=careerProfile(opponentTeam.members[0]);
  return {
    lineup:[player,opponent],
    playerId:0,
    athleteIds:['player',opponentTeam.members[0]?.id??null],
    format:'singles',
    playerRating:state.athlete.formats[tournament.format]??0,
    opponentRatings:[opponentTeam.rating],
    opponentIds:opponentTeam.members.map(member=>member.id),
    opponentNames:opponentTeam.members.map(member=>member.name),
    partnerId:null,
    partnerRating:null,
    team:opponentTeam.name,
    teamRating:opponentTeam.rating
  };
}

// Builds the pending match for whatever round the tournament is on, or null
// when the player has nothing to play.
function pendingFor({state,tournament}){
  if(!tournament||isPlayerDone(tournament))return null;
  const match=nextPlayerMatch(tournament);
  if(!match)return null;
  const matchup=matchupFor({state,tournament,match});
  if(!matchup)return null;
  return {
    eventId:tournament.eventId,
    optionId:tournament.optionId,
    format:tournament.format,
    divisionId:tournament.divisionId,
    bracket:tournament.bracket,
    matchType:tournament.matchType,
    energyCost:0,
    week:tournament.week,
    round:tournament.round,
    tournamentId:tournament.id,
    rules:matchRules(tournament),
    difficulty:tournament.difficulty??'normal',
    learning:state.opponentLearning??null,
    matchup 
  };
}

// Starts a career event.
//
// The field is drawn, seeded and gated, and the first match of the player's
// path is handed to the engine. An event already in progress resumes at the
// next round instead of fielding a new draw.
export function startCareerMatch(state,eventId,optionId=null){
  if(state.tournament&&!isPlayerDone(state.tournament)&&state.tournament.eventId===eventId){
    if(playerHasBye(state.tournament)){
      // A bye is not a match. Advance through it and try the next round.
      recordPlayerResult(state.tournament,{won:true,score:'bye'});
      return startCareerMatch(state,eventId,optionId);
    }
    const pending=pendingFor({state,tournament:state.tournament});
    if(!pending){
      state.tournament=simulateAndAdvance(state,state.tournament);
      return startCareerMatch(state,eventId,optionId);
    }
    return {ok:true,state:Object.assign({},state,{pendingMatch:pending}),pending,message:'Match ready.',resumed:true};
  }

  const event=currentEvents(state).find(entry=>entry.id===eventId);
  if(!event)return {ok:false,state,message:'That event is not on the calendar this week.'};
  if(!canEnterEvent(state,event))return {ok:false,state,message:eventBlockReason(state,event)};
  const eligible=entryEligibility(state,EVENT_BY_ID[event.eventId]);
  if(!eligible.ok)return {ok:false,state,message:eligible.reason};
  const option=event.options.find(entry=>entry.id===(optionId??event.defaultOptionId));
  if(!option)return {ok:false,state,message:'That bracket is not running at this event.'};
  if(formatsPlayed(state,event.eventId).includes(option.format)){
    return {ok:false,state,message:'You have already played '+option.format+' at this event.'};
  }
  const entry=entryStatus(state,event,{format:option.format});
  if(entry.via==='declined'){
    return {ok:false,state,message:'Outside the direct cut and the qualifier field for this event.'};
  }
  const energyCost=eventEntryCost(state,event);
  if(state.energy<energyCost){
    return {ok:false,state,message:'That division needs '+energyCost+' energy. You have '+state.energy+'.'};
  }

  const started=startTournament({state,event,option});
  if(!started.ok)return {ok:false,state,message:started.message};
  const tournament=started.tournament;
  startRound(tournament,seededRandom(mixSeed(state.seed,'start:'+state.week+':'+event.eventId)));
  let next=Object.assign({},state,{
    wildCards:entry.via==='wild-card'?Math.max(0,(state.wildCards??0)-1):(state.wildCards??0),
    tournament,
    energy:state.energy-energyCost,
    eventEntries:[...(state.eventEntries??[]),{week:state.week,eventId:event.eventId,format:option.format,divisionId:option.divisionId,cost:energyCost}].slice(-32),
    lastActionWeek:state.week,
    lastEventWeek:isLeagueEvent(event)?state.lastEventWeek:state.week,
    lastLeagueWeek:isLeagueEvent(event)?state.week:state.lastLeagueWeek,
    lastTravelWeek:isTravelEvent(event)?state.week:state.lastTravelWeek,
    stats:Object.assign({},state.stats,{entries:(state.stats.entries??0)+1})
  });
  // A bye in the first round is stepped over straight away.
  let guard=0;
  while(playerHasBye(tournament)&&guard++<8){
    const byeRandom=seededRandom(mixSeed(state.seed,'bye:'+state.week+':'+event.eventId+':'+tournament.round));
    simulateRestOfRound(tournament,byeRandom);
    recordPlayerResult(tournament,{won:true,score:'bye'});
    if(!tournament.finished)startRound(tournament,byeRandom);
  }
  const pending=pendingFor({state:next,tournament});
  if(!pending){
    next=finishTournament(next,tournament,{reason:'no-match'});
    return {ok:true,state:next,message:'The tournament is over.'};
  }
  next=Object.assign({},next,{pendingMatch:pending});
  return {ok:true,state:next,pending,message:'Tournament started. '+next.tournament.teams.length+' teams in the draw.'};
}

function simulateAndAdvance(state,tournament){
  const random=seededRandom(mixSeed(state.seed,`round:${state.week}:${tournament.eventId}:${tournament.round}`));
  simulateRestOfRound(tournament,random);
  return tournament;
}

// Scores a played match back into the career.
export function finishCareerMatch(state,report){
  const pending=state.pendingMatch;
  if(!pending)return {ok:false,state,message:'There is no match waiting to be scored.'};
  const event=EVENT_BY_ID[pending.eventId];
  const option={id:pending.optionId,format:pending.format,divisionId:pending.divisionId,label:pending.bracket};
  const ratedOutcome=rateMatchReport({report,matchup:pending.matchup,matchType:pending.matchType??event?.matchType});
  const ageAdjusted=capRatingForAge(state.athlete,pending.format,ratedOutcome.playerRating);
  const outcome={...ratedOutcome,playerRating:ageAdjusted.rating,delta:ageAdjusted.rating-pending.matchup.playerRating};
  const formats=Object.assign({},state.athlete.formats);
  formats[pending.format]=outcome.playerRating;

  // The opponents played, so they move in the world rating state.
  const worldRatings=Object.assign({},state.worldRatings);
  for(const format of Object.keys(worldRatings))worldRatings[format]=Object.assign({},worldRatings[format]);
  const table=worldRatings[pending.format]=worldRatings[pending.format]??{};
  for(const player of outcome.ratings){
    if(player.id===pending.matchup.playerId)continue;
    const athleteId=pending.matchup.athleteIds?.[player.id];
    if(!athleteId||athleteId==='player')continue;
    const previous=table[athleteId];
    table[athleteId]=[Math.round(player.rating*1000)/1000,state.week,(previous?.[2]??0)+1];
  }

  // One attribute grows for every match played.
  const growth=attributeGrowth({
    attributes:state.athlete.ratings,
    eventFocus:event?.skillFocus,
    format:pending.format,
    random:seededRandom(mixSeed(state.seed,'growth:'+state.week+':'+pending.eventId+':'+pending.optionId))
  });
  const maintenance=noteTrainingMaintenance(state.athlete,Object.keys(growth),.04);
  const growthAthlete={...state.athlete,maintenance};
  const ratings=Object.assign({},state.athlete.ratings);
  for(const key of Object.keys(growth))ratings[key]=capAttributeForAge(growthAthlete,key,clamp(ratings[key]+growth[key],0,99));
  const peakRatings=noteSkillPeaks(state.athlete,ratings);

  const record=buildCareerRecord({
    report,
    matchup:pending.matchup,
    event:event??{id:pending.eventId,label:pending.bracket},
    option,
    outcome,
    week:state.week
  });
  const athlete=Object.assign({},state.athlete,{
    ratings,
    formats,
    peakRatings,
    maintenance,
    peakFormats:ageAdjusted.peakFormats,
    record:Object.assign({},state.athlete.record,{
      matches:state.athlete.record.matches+1,
      wins:state.athlete.record.wins+(outcome.won?1:0),
      losses:state.athlete.record.losses+(outcome.won?0:1)
    })
  });
  let next=Object.assign({},state,{
    athlete,
    pendingMatch:null,
    // What the engine learned about these opponents carries into the next
    // career match.
    opponentLearning:report.learning??state.opponentLearning??null,
    worldRatings,
    matches:[...state.matches,record].slice(-CAREER_RECORD_LIMIT),
    stats:Object.assign({},state.stats,{matches:(state.stats.matches??0)+1})
  });

  next=recordGame(next,{
    week:state.week,
    eventId:pending.eventId,
    format:pending.format,
    eventType:eventTypeFor(event??{},state.tournament??{}),
    won:outcome.won,
    pointsFor:outcome.myPoints,
    pointsAgainst:outcome.theirPoints,
    rating:outcome.playerRating,
    delta:outcome.delta
  });
  // Record the result in the tournament and play the rest of the round.
  const tournament=next.tournament;
  if(tournament){
    const roundRandom=seededRandom(mixSeed(state.seed,`round:${state.week}:${tournament.eventId}:${tournament.round}`+':rest'));
    simulateRestOfRound(tournament,roundRandom);
    recordPlayerResult(tournament,{won:outcome.won,score:record.score});
    // Open the next round, stepping over any bye the player has.
    let byeGuard=0;
    while(!tournament.finished&&!tournament.playerOut){
      startRound(tournament,roundRandom);
      if(!playerHasBye(tournament))break;
      simulateRestOfRound(tournament,roundRandom);
      recordPlayerResult(tournament,{won:true,score:'bye'});
      if(byeGuard++>8)break;
    }
    next=Object.assign({},next,{tournament});
    // A league night pauses the season until the week advances.
    if(tournament.nightComplete&&!tournament.finished){
      return {
        ok:true,
        state:next,
        record,
        message:(outcome.won?'Won ':'Lost ')+record.score+'. League night complete — advance the week for the next night.'
      };
    }
  }

  const note=record.label+' · '+record.bracket+' '+pending.format+' bracket · '+record.score;
  next=pushHistory(pushLog(next,note+'. Rating '+formatRating(outcome.playerRating)+' ('+signed(outcome.delta)+').'),note);

  if(tournament&&!isPlayerDone(tournament)){
    const pendingNext=pendingFor({state:next,tournament});
    if(pendingNext)next=Object.assign({},next,{pendingMatch:pendingNext});
    return {
      ok:true,
      state:next,
      record,
      message:(outcome.won?'Won ':'Lost ')+record.score+'. '+(pendingNext?'Next round ready.':'Tournament continuing.')
    };
  }

  const finished=finishTournament(next,tournament,{reason:'done'});
  return {ok:true,state:finished,record,message:(outcome.won?'Won ':'Lost ')+record.score+'. '+finished.tournament?.placeText};
}

// Closes a tournament: awards the points and the prize the finish is worth,
// and records the placing.
function finishTournament(state,tournament){
  if(!tournament)return state;
  const place=tournament.playerPlace??null;
  const earned=tournamentPoints(tournament);
  const pool=EVENT_POOL[tournament.eventId]??POOL_TOUR;
  const tourPointsHistory=pool===POOL_MLP?state.athlete.tourPointsHistory:addPoints(state.athlete.tourPointsHistory,state.week,earned);
  const mlpPointsHistory=pool===POOL_MLP?addPoints(state.athlete.mlpPointsHistory??[],state.week,earned):state.athlete.mlpPointsHistory??[];
  const basePrize=prizeFor({eventId:tournament.eventId,won:true,format:tournament.format,sponsors:sponsorsFor(state,tournament.format)});
  const prize=Math.round(basePrize*prizeFactor(place));
  const placeText=place?(place===1?'Champion':place===2?'Runner-up':place<=4?'Semifinalist':place<=8?'Quarterfinalist':'Round of '+(tournament.size/2||16))+' · place '+(place??'—'):tournament.failedToQualify?'Did not qualify':'Tournament complete';
  const entered=[...new Set([...(state.entered??[]),tournament.eventId])].slice(-16);
  const athlete=Object.assign({},state.athlete,{
    tourPoints:pointsInWindow(tourPointsHistory,state.week),
    tourPointsHistory,
    mlpPoints:pointsInWindow(mlpPointsHistory,state.week),
    mlpPointsHistory
  });
  const closed=Object.assign({},tournament,{finished:true,placeText,points:earned});
  // The ranking is built from results, not from the board.
  // Winning a Challenger earns a wild card into a bigger main draw.
  const tournamentEvent=EVENT_BY_ID[tournament.eventId];
  const wonChallenger=place===1&&tournamentEvent?.tier==='challenger';
  let ranked=recordResult(wonChallenger?{...state,wildCards:(state.wildCards??0)+1}:state,{
    week:state.week,
    eventId:tournament.eventId,
    format:tournament.format,
    tier:tournamentEvent?.tier??'challenger',
    place,
    points:earned
  });
  if(wonChallenger)ranked=markRecommendation(ranked,'challenger-win');
  ranked=isTourEvent(tournamentEvent)
    ?recordTourEvent(ranked,{eventId:tournament.eventId,week:state.week,format:tournament.format})
    :recordReentryEvent(ranked,{eventId:tournament.eventId,week:state.week});
  const summary=tournament.label+': '+placeText
    +(earned?' · '+earned+' points':'')
    +(prize?' · $'+prize.toLocaleString('en-US'):'')+'.';
  const offered=contractOffer(ranked);
  const withContract=offered?signContract(ranked,offered,state.week):ranked;
  const type=eventTypeFor(tournamentEvent??{},tournament);
  const series=tournament.records?.[tournament.playerTeamId]??null;
  const playerStats=tournament.playerStats??{games:0,wins:0,losses:0,pointsFor:0,pointsAgainst:0};
  const eventLogged=recordEventResult(withContract,{
    key:`${state.week}:${tournament.eventId}:${tournament.optionId}:${tournament.format}`,
    week:state.week,
    eventId:tournament.eventId,
    optionId:tournament.optionId,
    label:tournament.label,
    type,
    tier:tournamentEvent?.tier??null,
    format:tournament.format,
    place,
    fieldSize:tournament.teams?.length??tournament.size??0,
    games:playerStats.games,
    wins:playerStats.wins,
    losses:playerStats.losses,
    pointsFor:playerStats.pointsFor,
    pointsAgainst:playerStats.pointsAgainst,
    seriesWins:series?.wins??0,
    seriesLosses:series?.losses??0,
    prize,
    rankingPoints:earned
  });
  const next=pushLog(pushHistory(Object.assign({},eventLogged,{
    athlete,
    money:state.money+prize,
    entered,
    tournament:Object.assign({},closed,{
      teams:closed.shape==='mlp'?closed.teams??[]:closed.teams?.slice(0,2)??[],
      records:closed.shape==='mlp'?closed.records??{}:undefined,
      history:closed.history?.slice(-8)??[]
    })
  }),summary),summary);
  return next;
}

export {tournamentSummary};
