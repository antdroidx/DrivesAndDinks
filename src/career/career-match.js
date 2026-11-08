// Career matches.
//
// A career event is played by the real engine. This module starts the match,
// hands the field to the engine, and scores the result back into the career.

import {currentEvents,canEnterEvent,eventBlockReason,attributeGrowth,pushHistory,pushLog,clamp} from './state.js';
import {buildCareerMatchup,drawField} from './matchmaking.js';
import {rateMatchReport,buildCareerRecord,pointsForResult,CAREER_RECORD_LIMIT} from './match-record.js';
import {sponsorsFor,prizeFor} from './standings.js';
import {entryEligibility} from './calendar.js';
import {EVENT_BY_ID} from './geography.js';
import {divisionFor,NEW_PLAYER_RATING,formatRating} from './rating.js';
import {addPoints,pointsInWindow,EVENT_POOL,POOL_TOUR,POOL_MLP} from './tour.js';
import {mixSeed} from './population.js';
import {seededRandom} from '../competition.js';

const signed=value=>(value>=0?'+':'')+value.toFixed(3);

// Starts a real match at a career event.
//
// The field is drawn from the rated population of the bracket the player
// entered, the lineup is built from the career athlete's own attributes, and
// the matchup is handed to the engine. The pending match is kept in the
// career so it survives the trip to the engine page and back.
export function startCareerMatch(state,eventId,optionId=null){
  const event=currentEvents(state).find(entry=>entry.id===eventId);
  if(!event)return {ok:false,state,message:'That event is not on the calendar this week.'};
  if(!canEnterEvent(state))return {ok:false,state,message:eventBlockReason(state)};
  const eligible=entryEligibility(state,EVENT_BY_ID[event.eventId]);
  if(!eligible.ok)return {ok:false,state,message:eligible.reason};
  const option=event.options.find(entry=>entry.id===(optionId??event.defaultOptionId));
  if(!option)return {ok:false,state,message:'That bracket is not running at this event.'};
  if(state.energy<event.energyCost){
    return {ok:false,state,message:'That event needs '+event.energyCost+' energy. You have '+state.energy+'.'};
  }
  const {opponents,partner}=drawField({state,event,option});
  const matchup=buildCareerMatchup({state,event,option,opponents,partner});
  const pending={
    eventId:event.eventId,
    optionId:option.id,
    format:option.format,
    divisionId:option.divisionId,
    bracket:option.label,
    matchType:event.matchType,
    energyCost:event.energyCost,
    week:state.week,
    matchup:Object.assign({},matchup,{
      opponentNames:opponents.map(opponent=>opponent.name),
      playerTeam:0
    })
  };
  return {
    ok:true,
    state:Object.assign({},state,{pendingMatch:pending}),
    pending,
    message:'Match ready.'
  };
}

// Scores a played match back into the career.
//
// The rating moves on the real result, the opponents move in the world
// rating state because they played, tour points and prize money are awarded
// for the result, and one attribute grows.
export function finishCareerMatch(state,report){
  const pending=state.pendingMatch;
  if(!pending)return {ok:false,state,message:'There is no match waiting to be scored.'};
  const event=EVENT_BY_ID[pending.eventId];
  const option={id:pending.optionId,format:pending.format,divisionId:pending.divisionId,label:pending.bracket};
  const outcome=rateMatchReport({report,matchup:pending.matchup,matchType:pending.matchType??event?.matchType});
  const formats=Object.assign({},state.athlete.formats);
  formats[pending.format]=outcome.playerRating;

  // The opponents played, so they move in the world rating state.
  const worldRatings=Object.assign({},state.worldRatings);
  for(const format of Object.keys(worldRatings))worldRatings[format]=Object.assign({},worldRatings[format]);
  const table=worldRatings[pending.format]=worldRatings[pending.format]??{};
  for(const player of outcome.ratings){
    if(player.id===pending.matchup.playerId)continue;
    // The engine reports lineup positions, so they are mapped back onto the
    // career athletes the field was drawn from.
    const athleteId=pending.matchup.athleteIds?.[player.id];
    if(!athleteId||athleteId==='player')continue;
    const previous=table[athleteId];
    table[athleteId]=[Math.round(player.rating*1000)/1000,state.week,(previous?.[2]??0)+1];
  }

  // Tour points for the result, and prize money for the purse.
  const ownDivision=divisionFor(state.athlete.formats[pending.format]??NEW_PLAYER_RATING);
  const earned=pointsForResult({
    eventId:pending.eventId,
    divisionId:pending.divisionId,
    ownDivisionId:ownDivision.id,
    won:outcome.won
  });
  // The MLP pays into its own pool. It is a separate activity and its
  // points never count towards the pro tour.
  const pool=EVENT_POOL[pending.eventId]??POOL_TOUR;
  const tourPointsHistory=pool===POOL_MLP?state.athlete.tourPointsHistory:addPoints(state.athlete.tourPointsHistory,state.week,earned);
  const mlpPointsHistory=pool===POOL_MLP?addPoints(state.athlete.mlpPointsHistory??[],state.week,earned):state.athlete.mlpPointsHistory??[];
  const prize=prizeFor({
    eventId:pending.eventId,
    won:outcome.won,
    format:pending.format,
    sponsors:sponsorsFor(state,pending.format)
  });
  const prizeText=prize?' Prize money '+prize.toLocaleString('en-US')+'.':'';

  // One attribute grows.
  const growth=attributeGrowth({
    attributes:state.athlete.ratings,
    eventFocus:event?.skillFocus,
    format:pending.format,
    random:seededRandom(mixSeed(state.seed,'growth:'+state.week+':'+pending.eventId+':'+pending.optionId))
  });
  const ratings=Object.assign({},state.athlete.ratings);
  for(const key of Object.keys(growth))ratings[key]=clamp(ratings[key]+growth[key],0,99);

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
    record:Object.assign({},state.athlete.record,{
      matches:state.athlete.record.matches+1,
      wins:state.athlete.record.wins+(outcome.won?1:0),
      losses:state.athlete.record.losses+(outcome.won?0:1)
    }),
    tourPoints:pointsInWindow(tourPointsHistory,state.week),
    tourPointsHistory,
    mlpPoints:pointsInWindow(mlpPointsHistory,state.week),
    mlpPointsHistory
  });
  const note=record.label+' · '+record.bracket+' '+pending.format+' bracket · '+record.score;
  const entered=[...new Set([...(state.entered??[]),pending.eventId])].slice(-16);
  const moved=pushHistory(pushLog(Object.assign({},state,{athlete}),note+'. Rating '+formatRating(outcome.playerRating)+' ('+signed(outcome.delta)+').'),note);
  return {
    ok:true,
    state:Object.assign({},moved,{
      athlete:Object.assign({},moved.athlete,{tourPoints:pointsInWindow(tourPointsHistory,state.week),tourPointsHistory,mlpPoints:pointsInWindow(mlpPointsHistory,state.week),mlpPointsHistory}),
      energy:state.energy-(pending.energyCost??0),
      lastActionWeek:state.week,
      lastEventWeek:state.week,
      entered,
      pendingMatch:null,
      worldRatings,
      money:state.money+prize,
      matches:[...state.matches,record].slice(-CAREER_RECORD_LIMIT),
      stats:Object.assign({},state.stats,{
        entries:state.stats.entries+1,
        matches:state.stats.matches+1
      })
    }),
    record,
    message:(outcome.won?'Won ':'Lost ')+record.score+' in the '+record.bracket+' '+pending.format+' bracket. Rating '+formatRating(outcome.playerRating)+' ('+signed(outcome.delta)+').'+prizeText
  };
}
