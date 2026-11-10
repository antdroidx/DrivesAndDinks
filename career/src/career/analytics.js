// Career analytics.
//
// Detailed match reports are intentionally bounded, but a career record is
// not. Every rated game updates cumulative totals by format and competition
// type, while every completed event adds a medal, placing and event record.

export const ANALYTICS_VERSION=1;
export const EVENT_HISTORY_LIMIT=600;
export const RATING_HISTORY_LIMIT=240;
export const FORMAT_IDS=Object.freeze(['singles','doubles','mixed']);
export const EVENT_TYPE_IDS=Object.freeze(['tournament','league','mlp','club']);

export function emptyRecord(){
  return {
    played:0,
    wins:0,
    losses:0,
    pointsFor:0,
    pointsAgainst:0,
    currentWinStreak:0,
    bestWinStreak:0
  };
}

export function emptyEventRecord(){
  return {
    played:0,
    gold:0,
    silver:0,
    bronze:0,
    titles:0,
    finals:0,
    seriesWins:0,
    seriesLosses:0,
    prize:0,
    rankingPoints:0
  };
}

function formatRecord(source={}){
  return {...emptyRecord(),...source};
}

function typeRecord(source={}){
  return {...emptyRecord(),...source};
}

function eventRecord(source={}){
  return {...emptyEventRecord(),...source};
}

export function emptyAnalytics(formats={}){
  const ratings={};
  for(const format of FORMAT_IDS)ratings[format]=Number(formats?.[format])||0;
  return {
    version:ANALYTICS_VERSION,
    formats:Object.fromEntries(FORMAT_IDS.map(format=>[format,emptyRecord()])),
    byType:Object.fromEntries(EVENT_TYPE_IDS.map(type=>[type,emptyRecord()])),
    events:Object.fromEntries(EVENT_TYPE_IDS.map(type=>[type,emptyEventRecord()])),
    ratingStarts:{...ratings},
    ratingPeaks:{...ratings}
  };
}

export function normalizeAnalytics(value,formats={}){
  const base=emptyAnalytics(formats);
  if(!value||typeof value!=='object')return base;
  return {
    ...base,
    ...value,
    version:ANALYTICS_VERSION,
    formats:Object.fromEntries(FORMAT_IDS.map(format=>[format,formatRecord(value.formats?.[format])])),
    byType:Object.fromEntries(EVENT_TYPE_IDS.map(type=>[type,typeRecord(value.byType?.[type])])),
    events:Object.fromEntries(EVENT_TYPE_IDS.map(type=>[type,eventRecord(value.events?.[type])])),
    ratingStarts:{...base.ratingStarts,...(value.ratingStarts??{})},
    ratingPeaks:{...base.ratingPeaks,...(value.ratingPeaks??{})}
  };
}

function updateRecord(record,won,pointsFor,pointsAgainst){
  record.played+=1;
  if(won){
    record.wins+=1;
    record.currentWinStreak+=1;
    record.bestWinStreak=Math.max(record.bestWinStreak??0,record.currentWinStreak);
  }else{
    record.losses+=1;
    record.currentWinStreak=0;
  }
  record.pointsFor+=Math.max(0,Number(pointsFor)||0);
  record.pointsAgainst+=Math.max(0,Number(pointsAgainst)||0);
}

export function eventTypeFor(event={},tournament={}){
  if(event.id==='mlp'||event.eventId==='mlp'||tournament.shape==='mlp')return 'mlp';
  if(event.matchType==='league'||tournament.matchType==='league')return 'league';
  if(event.matchType==='club'||event.tier==='local')return 'club';
  return 'tournament';
}

export function medalFor({type='tournament',place,fieldSize=0}={}){
  const finished=Number(place)||0;
  if(finished<1||fieldSize<4)return null;
  if(finished===1)return 'gold';
  if(finished===2)return 'silver';
  if(type==='league'&&finished===3)return 'bronze';
  if((type==='tournament'||type==='mlp')&&fieldSize>=8&&(finished===3||finished===4))return 'bronze';
  return null;
}

// Records one rated game. The caller has already computed the new rating.
export function recordGame(state,game){
  const format=FORMAT_IDS.includes(game.format)?game.format:'doubles';
  const type=EVENT_TYPE_IDS.includes(game.eventType)?game.eventType:eventTypeFor();
  const analytics=normalizeAnalytics(state.analytics,state.athlete?.formats);
  updateRecord(analytics.formats[format],Boolean(game.won),game.pointsFor,game.pointsAgainst);
  updateRecord(analytics.byType[type],Boolean(game.won),game.pointsFor,game.pointsAgainst);
  if(Number.isFinite(game.rating)){
    analytics.ratingPeaks[format]=Math.max(analytics.ratingPeaks[format]??0,game.rating);
  }
  const ratingEntry={
    week:Number(game.week)||0,
    eventId:game.eventId??null,
    format,
    eventType:type,
    rating:Number(game.rating)||0,
    delta:Number(game.delta)||0,
    won:Boolean(game.won),
    pointsFor:Number(game.pointsFor)||0,
    pointsAgainst:Number(game.pointsAgainst)||0
  };
  return {
    ...state,
    analytics,
    ratingHistory:[...(state.ratingHistory??[]),ratingEntry].slice(-RATING_HISTORY_LIMIT)
  };
}

// Records the event outcome after its last game. Game totals come from the
// tournament state, so a multi-division event contributes one record per
// division without losing the combined player experience.
export function recordEventResult(state,result){
  const type=EVENT_TYPE_IDS.includes(result.type)?result.type:'tournament';
  const key=result.key??`${result.week}:${result.eventId}:${result.optionId??''}:${result.format??''}`;
  const history=state.eventHistory??[];
  if(history.some(entry=>entry.key===key))return state;
  const analytics=normalizeAnalytics(state.analytics,state.athlete?.formats);
  const eventStats=analytics.events[type];
  const medal=result.medal??medalFor({type,place:result.place,fieldSize:result.fieldSize});
  eventStats.played+=1;
  if(medal)eventStats[medal]+=1;
  if(result.place===1)eventStats.titles+=1;
  if(result.place===1||result.place===2)eventStats.finals+=1;
  eventStats.seriesWins+=Math.max(0,Number(result.seriesWins)||0);
  eventStats.seriesLosses+=Math.max(0,Number(result.seriesLosses)||0);
  eventStats.prize+=Math.max(0,Number(result.prize)||0);
  eventStats.rankingPoints+=Math.max(0,Number(result.rankingPoints)||0);
  const entry={
    key,
    week:Number(result.week)||0,
    eventId:result.eventId??null,
    label:result.label??result.eventId??'Event',
    type,
    tier:result.tier??null,
    format:result.format??null,
    optionId:result.optionId??null,
    place:Number(result.place)||null,
    fieldSize:Number(result.fieldSize)||0,
    medal,
    games:Math.max(0,Number(result.games)||0),
    wins:Math.max(0,Number(result.wins)||0),
    losses:Math.max(0,Number(result.losses)||0),
    pointsFor:Math.max(0,Number(result.pointsFor)||0),
    pointsAgainst:Math.max(0,Number(result.pointsAgainst)||0),
    seriesWins:Math.max(0,Number(result.seriesWins)||0),
    seriesLosses:Math.max(0,Number(result.seriesLosses)||0),
    prize:Math.max(0,Number(result.prize)||0),
    rankingPoints:Math.max(0,Number(result.rankingPoints)||0)
  };
  return {...state,analytics,eventHistory:[...history,entry].slice(-EVENT_HISTORY_LIMIT)};
}

function mergeRecords(records){
  const total=emptyRecord();
  for(const record of records){
    if(!record)continue;
    total.played+=Number(record.played)||0;
    total.wins+=Number(record.wins)||0;
    total.losses+=Number(record.losses)||0;
    total.pointsFor+=Number(record.pointsFor)||0;
    total.pointsAgainst+=Number(record.pointsAgainst)||0;
    total.bestWinStreak=Math.max(total.bestWinStreak,Number(record.bestWinStreak)||0);
  }
  total.currentWinStreak=0;
  return total;
}

function decorateRecord(record={}){
  const value={...emptyRecord(),...record};
  const decided=value.wins+value.losses;
  const pointDifference=value.pointsFor-value.pointsAgainst;
  return {
    ...value,
    winRate:decided?value.wins/decided:0,
    pointDifference,
    averageFor:value.played?value.pointsFor/value.played:0,
    averageAgainst:value.played?value.pointsAgainst/value.played:0
  };
}

function currentStreak(history){
  let streak=0;
  for(let index=(history??[]).length-1;index>=0;index--){
    if(!history[index].won)break;
    streak+=1;
  }
  return streak;
}

export function analyticsSummary(state){
  const analytics=normalizeAnalytics(state.analytics,state.athlete?.formats);
  const formats=Object.fromEntries(FORMAT_IDS.map(format=>[format,decorateRecord(analytics.formats[format])]));
  const byType=Object.fromEntries(EVENT_TYPE_IDS.map(type=>[type,decorateRecord(analytics.byType[type])]));
  const doublesAll=decorateRecord(mergeRecords([analytics.formats.doubles,analytics.formats.mixed]));
  const overall=decorateRecord(mergeRecords(Object.values(analytics.formats)));
  return {
    analytics,
    overall,
    doublesAll,
    formats,
    byType,
    events:analytics.events,
    ratings:{...state.athlete?.formats},
    ratingStarts:analytics.ratingStarts,
    ratingPeaks:analytics.ratingPeaks,
    ratingHistory:state.ratingHistory??[],
    currentStreak:currentStreak(state.ratingHistory),
    eventHistory:state.eventHistory??[]
  };
}