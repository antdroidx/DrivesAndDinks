// Career match records.
//
// A career match produces the engine's own match report, which is already a
// versioned record of the score, the players, the statistics and the rally
// journal. The career keeps that report against the event it came from, and
// rates it the way every other match is rated: on the difference between
// what was expected and what actually happened.

import {rateMatch,expectedScore,matchPerformance,teamStrength,MAX_POINTS} from './rating.js?v=200';
import {EVENT_POINTS,PLAY_UP_MULTIPLIER,pointsInWindow,addPoints,EVENT_POOL,POOL_TOUR} from './tour.js?v=200';

export const CAREER_RECORD_LIMIT=60;

// Tour points for a played match. Winning is worth more than losing, and
// playing up a bracket is worth more than staying in your own, because the
// board rewards beating stronger opposition.
export function pointsForResult({eventId,divisionId,ownDivisionId,won}){
  const base=EVENT_POINTS[eventId]??0;
  if(!base)return 0;
  const playedUp=divisionId&&ownDivisionId&&divisionId!==ownDivisionId;
  const result=won?1:0.4;
  return Math.round(base*result*(playedUp?PLAY_UP_MULTIPLIER:1));
}

const compactPlayer=player=>({
  id:player.id,team:player.team,name:player.name,handedness:player.handedness,
  archetype:player.archetype,attributes:player.attributes,physique:player.physique,paddle:player.paddle
});

const compactEvent=event=>({
  sequence:event.sequence,time:event.time,type:event.type,shot:event.shot,stroke:event.stroke,
  playerId:event.playerId,quality:event.quality,reason:event.reason,winner:event.winner,shots:event.shots,
  position:event.position,placement:event.placement,mechanics:event.mechanics,transition:event.transition,
  distance:event.distance,movement:event.movement,netMargin:event.netMargin
});

// Full engine reports can approach 400 KB each. Career saves keep the durable
// summary and a bounded evidence tail so a long career remains restorable.
export function compactMatchReport(report={}){
  const journal=report.journal??{};
  return {
    schemaVersion:report.schemaVersion,build:report.build,seed:report.seed,format:report.format,
    mode:report.mode,difficulty:report.difficulty,elapsed:report.elapsed,complete:report.complete,
    score:report.score,players:(report.players??[]).map(compactPlayer),stats:report.stats,tactics:report.tactics,
    playtest:report.playtest,learning:report.learning,practice:report.practice,
    sideSwitched:report.sideSwitched,sideSwitchThreshold:report.sideSwitchThreshold,
    stacking:report.stacking?{config:report.stacking.config,summary:report.stacking.summary}:null,
    journal:{
      droppedEvents:journal.droppedEvents??0,droppedRallies:journal.droppedRallies??0,
      events:(journal.events??[]).slice(-80).map(compactEvent),
      rallies:(journal.rallies??[]).slice(-20)
    }
  };
}

// Rates a played match and returns the new rating for every player on court.
export function rateMatchReport({report,matchup,matchType='league',targetScore=11}){
  // The engine reports teams as numbers, so they are mapped onto the two
  // sides the rating calculation works with.
  const myTeam=matchup.playerTeam??0;
  const points=report.score?.points??[0,0];
  const ratings=new Map();
  for(const player of report.players??[]){
    const athleteId=matchup.athleteIds?.[player.id];
    if(!athleteId||athleteId==='player')ratings.set(player.id,matchup.playerRating);
    else{
      const index=matchup.opponentIds?.indexOf(athleteId)??-1;
      if(index>=0)ratings.set(player.id,matchup.opponentRatings[index]);
      else if(athleteId===matchup.partnerId)ratings.set(player.id,matchup.partnerRating??matchup.playerRating);
      else ratings.set(player.id,matchup.playerRating);
    }
  }
  const players=(report.players??[]).map(player=>({
    id:player.id,
    rating:ratings.get(player.id)??matchup.playerRating,
    team:player.team===myTeam?'mine':'opponent',
    matchesPlayed:0
  }));
  const myPoints=points[myTeam]??0;
  const theirPoints=points[1-myTeam]??0;
  const scoreScale=MAX_POINTS/Math.max(MAX_POINTS,Number(targetScore)||MAX_POINTS);
  const ratedMyPoints=myPoints*scoreScale;
  const ratedTheirPoints=theirPoints*scoreScale;
  const rated=rateMatch({
    players,
    actualMyPoints:ratedMyPoints,
    actualOpponentPoints:ratedTheirPoints,
    matchType,
    weeksAgo:0
  });
  const player=rated.players.find(entry=>entry.id===matchup.playerId);
  const myRatings=players.filter(entry=>entry.team==='mine').map(entry=>entry.rating);
  const theirRatings=players.filter(entry=>entry.team==='opponent').map(entry=>entry.rating);
  const expected=expectedScore(teamStrength(myRatings),teamStrength(theirRatings));
  return {
    ratings:rated.players,
    playerRating:player?.rating??matchup.playerRating,
    delta:(player?.rating??matchup.playerRating)-matchup.playerRating,
    myPoints,
    theirPoints,
    ratedMyPoints,
    ratedTheirPoints,
    won:myPoints>theirPoints,
    expected,
    performance:matchPerformance({
      actualMyPoints:ratedMyPoints,
      actualOpponentPoints:ratedTheirPoints,
      expectedMyPoints:expected.myPoints,
      expectedOpponentPoints:expected.opponentPoints
    })
  };
}

// The career record kept against the event the match came from.
export function buildCareerRecord({report,matchup,event,option,outcome,week}){
  return {
    id:event.id+'-w'+week,
    week,
    eventId:event.id,
    label:event.label,
    format:option.format,
    bracket:option.label,
    score:outcome.myPoints+'-'+outcome.theirPoints,
    won:outcome.won,
    rating:outcome.playerRating,
    delta:Number(outcome.delta.toFixed(3)),
    opponent:matchup.opponentNames?.[0]??'a local',
    opponents:matchup.opponentNames??[],
    report:compactMatchReport(report)
  };
}

export function summarizeCareerForm(matches,limit=10){
  const recent=matches.slice(-limit);
  if(!recent.length)return {played:0,wins:0,losses:0,streak:0,form:''};
  let wins=0;
  for(const match of recent)if(match.won)wins++;
  let streak=0;
  for(let index=recent.length-1;index>=0;index--){
    if(recent[index].won)streak++;
    else break;
  }
  return {
    played:recent.length,
    wins,
    losses:recent.length-wins,
    streak,
    form:recent.map(match=>match.won?'W':'L').join('')
  };
}
