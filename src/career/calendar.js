// Career calendar.
//
// Career time is counted in weeks from a fixed Monday so that every save
// reads the same date no matter when it was written. Each week generates the
// events running that week: club practice nearby, then league and tournament
// events that open up as the career moves through the world.
//
// Events are not gated on a rating. They carry the brackets they field, and
// the player picks the bracket they enter.

import {COMPETITION_EVENTS,EVENT_BY_ID,PRO_LEAGUE_DIVISION,EVENT_SCOPE_LABELS} from './geography.js';
import {RATING_BRACKETS,availableDivisions,divisionFor,formatRating} from './rating.js';
import {tourFor,tourRank,pointsInWindow} from './tour.js';
import {mixSeed} from './population.js';
import {seededRandom} from '../competition.js';

// Monday, 5 January 2026. Career week 0 starts here.
export const CAREER_EPOCH_MS=Date.UTC(2026,0,5);
export const DAYS_PER_WEEK=7;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function weekDate(week){return new Date(CAREER_EPOCH_MS+week*DAYS_PER_WEEK*86400000)}
export function weekLabel(week){
  const date=weekDate(week);
  return `Week ${week+1} · ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
export function weekShortLabel(week){
  const date=weekDate(week);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
export function careerYear(week){return 2026+Math.floor(week/52)}
export function seasonLabel(week){return `Season ${careerYear(week)-2025}`}

// How often each event comes around. Practice is weekly; the national and
// international rounds are rare by design, so the ladder stays worth
// climbing toward.
const CADENCE=Object.freeze({
  'club-night':{every:1,on:0},
  'local-league':{every:2,on:0},
  'city-open':{every:4,on:1},
  'regional-open':{every:6,on:2},
  'semi-pro':{every:9,on:4},
  'national':{every:12,on:6},
  'international':{every:16,on:8},
  'pro-league':{every:20,on:10}
});

function eventTitle(event,state,club){
  if(event.scope==='club')return `${event.label} · ${club?.name??state.cityLabel}`;
  if(event.scope==='city')return `${event.label} · ${state.cityLabel}`;
  return event.label;
}
function eventVenue(event,state,club){
  if(event.scope==='club')return club?.name??state.cityLabel;
  if(event.scope==='city')return `${state.cityLabel} Courts`;
  if(event.scope==='area')return `${state.areaLabel} Open`;
  if(event.scope==='region')return `${state.regionLabel} Circuit`;
  if(event.scope==='nation')return 'National Venue';
  return 'International Venue';
}

// The brackets an event is running that a player of this rating may enter.
// A player may play up one bracket or down one bracket from their own.
export function bracketsFor(state,event){
  // The pro league runs one open bracket rather than a ladder of them. Its
  // access rule is the world ranking, which is checked separately.
  if(!event.brackets.length)return {running:[{...PRO_LEAGUE_DIVISION,isPlayer:false}],enterable:[PRO_LEAGUE_DIVISION.id]};
  const own=divisionFor(state.athlete.rating);
  const running=event.brackets
    .map(id=>RATING_BRACKETS.find(division=>division.id===id))
    .filter(Boolean)
    .map(division=>({...division,isPlayer:division.id===own.id}));
  const enterable=availableDivisions(state.athlete.rating,event.brackets).map(division=>division.id);
  return {running,enterable};
}

// Whether a player may enter an event at all. This is about access, not
// about skill: a club night needs a club, and the pro league needs a world
// ranking inside the top 250.
export function entryEligibility(state,event,enterable=null){
  if(event.scope==='club'&&!state.clubId)return {ok:false,reason:'Join a club first'};
  if(event.qualification==='pro-tour'){
    const tour=tourFor(state.athlete.gender);
    const rank=tourRank(state.athlete.rating,state.athlete.gender);
    if(rank===null)return {ok:false,reason:`${tour.label}'s tour needs a ${tour.floorRating.toFixed(2)} rating · you are ${formatRating(state.athlete.rating)}`};
    if(!pointsInWindow(state.athlete.tourPointsHistory,state.week))return {ok:false,reason:'Earn tour points to hold a standing'};
  }
  if(enterable&&!enterable.length){
    const running=event.brackets.map(id=>RATING_BRACKETS.find(division=>division.id===id)?.label??id).join(', ');
    return {ok:false,reason:`${running} bracket only · you are ${formatRating(state.athlete.rating)}`};
  }
  return {ok:true,reason:null};
}

// Builds the events for one week.
export function generateWeekEvents(state,week){
  const club=state.clubId?state.club:null;
  const events=[];
  for(const event of COMPETITION_EVENTS){
    const cadence=CADENCE[event.id];
    if(!cadence)continue;
    if(week%cadence.every!==cadence.on)continue;
    if(event.scope==='club'&&!club)continue;
    const {running,enterable}=bracketsFor(state,event);
    const eligible=entryEligibility(state,event,enterable);
    const own=divisionFor(state.athlete.rating);
    const defaultDivision=running.find(division=>enterable.includes(division.id))??null;
    events.push({
      id:`w${week}-${event.id}`,
      week,
      eventId:event.id,
      label:event.label,
      kind:event.id==='club-night'?'practice':'match',
      scope:event.scope,
      scopeLabel:EVENT_SCOPE_LABELS[event.scope],
      title:eventTitle(event,state,club),
      venue:eventVenue(event,state,club),
      regionId:state.regionId,
      areaId:state.areaId,
      cityId:state.cityId,
      clubId:event.scope==='club'?club?.id??null:null,
      energyCost:event.energy,
      skillFocus:event.skillFocus,
      matchType:event.matchType,
      dateLabel:weekShortLabel(week),
      divisions:running,
      enterable,
      defaultDivisionId:defaultDivision?.id??null,
      ownDivisionId:own.id,
      qualification:event.qualification??null,
      tour:event.qualification==='pro-tour'?tourFor(state.athlete.gender):null,
      tourRank:event.qualification==='pro-tour'?tourRank(state.athlete.rating,state.athlete.gender):null,
      eligible,
      lockedReason:eligible.reason??null
    });
  }
  return events.sort((a,b)=>COMPETITION_EVENTS.findIndex(entry=>entry.id===a.eventId)-COMPETITION_EVENTS.findIndex(entry=>entry.id===b.eventId));
}

// The calendar view lists the current week and a run of weeks ahead.
export function upcomingWeeks(state,count=8){
  const weeks=[];
  for(let offset=0;offset<count;offset++){
    const week=state.week+offset;
    weeks.push({week,label:weekLabel(week),short:weekShortLabel(week),season:seasonLabel(week),isCurrent:offset===0});
  }
  return weeks;
}

export {RATING_BRACKETS,divisionFor,formatRating,EVENT_BY_ID};
