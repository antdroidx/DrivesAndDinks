// Career matches.
//
// A career event is a tournament. Entering one fields a draw, and the player
// plays their own path through it on the real engine while the rest of the
// field is simulated. This module owns the bridge: it turns a tournament
// match into an engine lineup, and it scores the engine's report back into
// the tournament and the career.

import {currentEvents,canEnterEvent,eventBlockReason,isLeagueEvent,isClubEvent,isTravelEvent,attributeGrowth,pushHistory,pushLog,clamp,formatsPlayed,eventEntryCost,advanceWeek} from './state.js?v=210';
import {careerProfile} from './matchmaking.js?v=210';
import {rateMatchReport,buildCareerRecord,CAREER_RECORD_LIMIT} from './match-record.js?v=210';
import {sponsorsFor,prizeFor} from './standings.js?v=210';
import {entryEligibility,entryStatus} from './calendar.js?v=210';
import {EVENT_BY_ID} from './geography.js?v=210';
import {divisionFor,NEW_PLAYER_RATING,formatRating} from './rating.js?v=210';
import {addPoints,pointsInWindow,EVENT_POOL,POOL_TOUR,POOL_MLP,pointsForFinish} from './tour.js?v=210';
import {recordResult,challengerPoints} from './ranking.js?v=210';
import {contractOffer,signed as signContract,isTourEvent,recordTourEvent,recordReentryEvent,markRecommendation,CHALLENGER_CONTRACT_POINTS} from './contracts.js?v=210';
import {recordGame,recordEventResult,eventTypeFor} from './analytics.js?v=210';
import {capRatingForAge,capAttributeForAge,noteSkillPeaks,noteTrainingMaintenance} from './age.js?v=210';
import {partnerGateStatus,awardClubReputation,buildCoachFeedback} from './club-life.js?v=210';
import {opponentLearningForMatchup,recordOpponentResult} from './opponents.js?v=210';
import {equipmentSelection} from './equipment.js?v=210';
import {mixSeed} from './population.js?v=210';
import {chargeEventCosts,creditPrize} from './finance.js?v=210';
import {rollInjury} from './injuries.js?v=210';
import {syncInbox} from './inbox.js?v=210';
import {seededRandom} from '../competition.js?v=210';
import {startTournament,startRound,nextPlayerMatch,simulateRestOfRound,simulateMatch,recordPlayerResult,isPlayerDone,playerHasBye,tournamentPoints,tournamentSummary,matchRules} from './tournament.js?v=210';

const signed=value=>(value>=0?'+':'')+value.toFixed(3);
export function matchSimulationPolicy(pending,tournament=null){
  const event=EVENT_BY_ID[pending?.eventId];
  const tier=event?.tier??'local';
  const decisiveTier=['cup','major','world'].includes(tier);
  const bracketRounds=tournament?.size?Math.ceil(Math.log2(tournament.size)):null;
  const finalRound=bracketRounds!=null&&Number(pending?.round)>=bracketRounds-1;
  const leagueFinal=tournament?.rounds?.length&&Number(pending?.round)>=tournament.rounds.length-1;
  const important=decisiveTier&&(finalRound||leagueFinal);
  return important
    ?{allowed:false,label:'Decisive professional round',reason:`${pending.bracket??'This'} final rounds are reserved for manual play.`}
    :{allowed:true,label:'Quick simulation available',reason:null};
}

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
  const player=careerProfile(state.athlete,equipmentSelection(state));
  if(doubles){
    const partner=careerProfile(playerTeam.members[1]??playerTeam.members[0]);
    const opponents=opponentTeam.members.slice(0,2).map(member=>careerProfile(member));
    while(opponents.length<2)opponents.push(careerProfile(opponentTeam.members[0]));
    return {
      lineup:[player,partner,opponents[0],opponents[1]],
      playerId:0,
      playerTeamName:playerTeam.name,
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
    playerTeamName:playerTeam.name,
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
    eventLabel:EVENT_BY_ID[tournament.eventId]?.label??tournament.label,
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
    difficulty:['easy','normal','hard'].includes(state.settings?.difficulty)?state.settings.difficulty:(tournament.difficulty??'normal'),
    learning:opponentLearningForMatchup(state,matchup)??state.opponentLearning??null,
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
  const partnerGate=partnerGateStatus(state,event,option);
  if(!partnerGate.ok)return {ok:false,state,message:partnerGate.reason};
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
  const charged=chargeEventCosts(state,event,event.label);
  if(!charged.ok)return {ok:false,state,message:charged.message};
  const paid=charged.state;
  const tournament=started.tournament;
  startRound(tournament,seededRandom(mixSeed(state.seed,'start:'+state.week+':'+event.eventId)));
  let next=Object.assign({},paid,{
    wildCards:entry.via==='wild-card'?Math.max(0,(state.wildCards??0)-1):(state.wildCards??0),
    tournament,
    energy:paid.energy-energyCost,
    eventEntries:[...(state.eventEntries??[]),{week:state.week,eventId:event.eventId,format:option.format,divisionId:option.divisionId,cost:energyCost,matchType:event.matchType,tier:event.tier}].slice(-64),
    lastActionWeek:state.week,
    lastEventWeek:isClubEvent(event)||isLeagueEvent(event)?state.lastEventWeek:state.week,
    lastClubWeek:isClubEvent(event)?state.week:state.lastClubWeek,
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

function quickReportFor({pending,tournament,random}){
  const match=tournament?.currentMatch;
  if(!match)return null;
  const rules=pending.rules??matchRules(tournament);
  const outcome=simulateMatch(match.home,match.away,random,rules.targetScore,rules);
  const playerIsHome=match.home.id===tournament.playerTeamId;
  const myPoints=playerIsHome?outcome.homeMine:outcome.homeTheirs;
  const theirPoints=playerIsHome?outcome.homeTheirs:outcome.homeMine;
  return {
    mode:'career-quick-sim',format:pending.matchup.format,complete:true,
    seed:Math.round(random()*2147483647),
    score:{points:[myPoints,theirPoints],winner:myPoints>theirPoints?0:1},
    players:pending.matchup.lineup.map((profile,index)=>({
      id:index,team:index<(pending.matchup.lineup.length===2?1:2)?0:1,name:profile.name
    }))
  };
}

// Plays the selected player path statistically while preserving the same
// rating, world-rating, record, finance, and tournament transitions as an
// engine result. A league quick-sim completes the current best-of-three so a
// single action never leaves a half-finished card.
export function quickSimCareerMatch(state,{finishSeries=true,force=false}={}){
  if(!state?.pendingMatch)return {ok:false,state,message:'There is no match waiting to be simulated.'};
  const first=state.pendingMatch;
  const policy=matchSimulationPolicy(first,state.tournament);
  if(!policy.allowed&&!force)return {ok:false,state,message:policy.reason};
  let current=state;
  let last=null;
  let games=0;
  while(current.pendingMatch&&games<5){
    const pending=current.pendingMatch;
    const tournament=current.tournament;
    const random=seededRandom(mixSeed(state.seed,`quick:${state.week}:${pending.tournamentId}:${pending.round}:${games}:${pending.matchup.team}`));
    const report=quickReportFor({pending,tournament,random});
    if(!report)return {ok:false,state:current,message:'The next simulated match is unavailable.'};
    const scored=finishCareerMatch(current,report);
    if(!scored.ok)return scored;
    current=scored.state;
    last=scored;
    games+=1;
    if(!finishSeries||first.matchType!=='league')break;
    if(!current.pendingMatch||current.pendingMatch.round!==first.round||current.tournament?.nightComplete)break;
  }
  const tail=last?.record?` Last score ${last.record.score}.` : '';
  return {ok:true,state:current,record:last?.record,games,message:`Quick-sim complete: ${games} game${games===1?'':'s'}.${tail}`};
}

// Simulates the player's remaining path through the active competition. For
// a league, quiet week advances happen automatically between cards.
export function simulateCompetitionToEnd(state,{maxMatches=40,maxWeeks=52}={}){
  if(!state?.tournament)return {ok:false,state,message:'There is no active competition to simulate.'};
  const eventId=state.tournament.eventId;
  const optionId=state.tournament.optionId;
  const eventLabel=state.tournament.label;
  let current=state;
  let games=0;
  let weeks=0;
  for(let guard=0;guard<maxMatches+maxWeeks;guard++){
    const tournament=current.tournament;
    if(!tournament)break;
    if(isPlayerDone(tournament)){
      return {ok:true,state:current,games,weeks,partial:false,message:`${eventLabel} complete.${tournament.placeText?' '+tournament.placeText+'.':''}`};
    }
    if(current.pendingMatch){
      if(games>=maxMatches)break;
      const policy=matchSimulationPolicy(current.pendingMatch,current.tournament);
      if(!policy.allowed)return {ok:true,state:current,games,weeks,partial:true,manualRequired:true,message:`${policy.reason} Play this match to continue.`};
      const simulated=quickSimCareerMatch(current);
      if(!simulated.ok)return simulated;
      current=simulated.state;
      games+=simulated.games;
      continue;
    }
    if(tournament.nightComplete){
      if(weeks>=maxWeeks)break;
      current=advanceWeek(current).state;
      weeks+=1;
    }
    const resumed=startCareerMatch(current,eventId,optionId);
    if(!resumed.ok)return resumed;
    current=resumed.state;
  }
  const done=current.tournament&&isPlayerDone(current.tournament);
  return {
    ok:true,state:current,games,weeks,partial:!done,
    message:done
      ?`${eventLabel} complete.${current.tournament.placeText?' '+current.tournament.placeText+'.':''}`
      :`Quick simulation paused after ${games} games and ${weeks} week${weeks===1?'':'s'}.`
  };
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
  const ratedOutcome=rateMatchReport({report,matchup:pending.matchup,matchType:pending.matchType??event?.matchType,targetScore:pending.rules?.targetScore});
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
    coachFeedback:buildCoachFeedback(state,{format:pending.format,won:outcome.won,eventFocus:event?.skillFocus}),
    worldRatings,
    matches:[...state.matches,record].slice(-CAREER_RECORD_LIMIT),
    stats:Object.assign({},state.stats,{matches:(state.stats.matches??0)+1})
  });

  next=recordOpponentResult(next,{matchup:pending.matchup,report,won:outcome.won,week:state.week,eventId:pending.eventId,eventLabel:event?.label??pending.bracket,format:pending.format});

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
  const injuryRoll=rollInjury(next,{
    activity:'match',
    random:seededRandom(mixSeed(state.seed,`match-injury:${state.week}:${pending.eventId}:${pending.round}:${record.score}`))
  });
  next=injuryRoll.state;
  const lastMatchResult={
    week:state.week,eventId:pending.eventId,label:event?.label??pending.eventId,
    bracket:pending.bracket,format:pending.format,score:record.score,won:outcome.won,
    rating:outcome.playerRating,delta:Number(outcome.delta.toFixed(3)),
    injury:injuryRoll.injury?{severity:injuryRoll.injury.severityLabel,area:injuryRoll.injury.areaLabel,returnLabel:injuryRoll.injury.returnLabel}:null,
    nextOpponent:null,tournamentStatus:'In progress'
  };
  next={...next,lastMatchResult};
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
      next={...next,lastMatchResult:{...next.lastMatchResult,tournamentStatus:'League card complete; next card next week.'}};
      return {
        ok:true,
        state:syncInbox(next),
        record,
        message:(outcome.won?'Won ':'Lost ')+record.score+'. League night complete — advance the week for the next night.'
      };
    }
  }

  const injuryNote=injuryRoll.injury?` Injury: ${injuryRoll.injury.severityLabel.toLowerCase()} (${injuryRoll.injury.areaLabel}); available ${injuryRoll.injury.returnLabel}.`:'';
  const note=record.label+' · '+record.bracket+' '+pending.format+' bracket · '+record.score;
  next=pushHistory(pushLog(next,note+'. Rating '+formatRating(outcome.playerRating)+' ('+signed(outcome.delta)+').'+injuryNote),note);

  if(tournament&&!isPlayerDone(tournament)){
    const pendingNext=pendingFor({state:next,tournament});
    if(pendingNext)next=Object.assign({},next,{pendingMatch:pendingNext});
    next={...next,lastMatchResult:{...next.lastMatchResult,nextOpponent:pendingNext?.matchup?.team??null,tournamentStatus:pendingNext?'Next round ready':'Competition continuing'}};
    return {
      ok:true,
      state:syncInbox(next),
      record,
      message:(outcome.won?'Won ':'Lost ')+record.score+'. '+(pendingNext?'Next round ready.':'Tournament continuing.')
    };
  }

  const finished=finishTournament(next,tournament,{reason:'done'});
  const withResult={...finished,lastMatchResult:{...finished.lastMatchResult,tournamentStatus:finished.tournament?.placeText??'Competition complete'}};
  return {ok:true,state:syncInbox(withResult),record,message:(outcome.won?'Won ':'Lost ')+record.score+'. '+finished.tournament?.placeText};
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
  if(wonChallenger&&challengerPoints(ranked.rankingResults,ranked.week)>=CHALLENGER_CONTRACT_POINTS){
    ranked=markRecommendation(ranked,'challenger-season');
  }
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
  const reputationState=awardClubReputation(withContract,{type,place});
  const eventLogged=recordEventResult(reputationState,{
    key:`${state.week}:${tournament.eventId}:${tournament.optionId}:${tournament.format}`,
    week:state.week,
    eventId:tournament.eventId,
    eventLabel:EVENT_BY_ID[tournament.eventId]?.label??tournament.label,
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
  const prizeLedger=creditPrize(eventLogged,{
    week:state.week,
    label:'Prize · '+tournament.label,
    amount:prize,
    reference:'tournament:'+tournament.id
  });
  const financiallyClosed=prizeLedger.ok?prizeLedger.state:eventLogged;
  const next=pushLog(pushHistory(Object.assign({},financiallyClosed,{
    athlete,
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
