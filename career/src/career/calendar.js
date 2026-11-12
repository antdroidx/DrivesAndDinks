// Career calendar.
//
// Career time is counted in weeks from a fixed Monday so that every save
// reads the same date no matter when it was written. Each week generates the
// events running that week: club night nearby, then league and tournament
// events that open up as the career moves through the world.
//
// Events are not gated on a rating. They carry the brackets they field, and
// the player picks the bracket they enter.

import {COMPETITION_EVENTS,EVENT_BY_ID,PRO_LEAGUE_DIVISION,EVENT_SCOPE_LABELS} from './geography.js?v=219';
import {RATING_BRACKETS,availableDivisions,divisionFor,formatRating} from './rating.js?v=219';
import {tourFor,tourRank,pointsInWindow} from './tour.js?v=219';
import {mixSeed} from './population.js?v=219';
import {finalsQualified,positions} from './ranking.js?v=219';
import {isContracted,isIneligible} from './contracts.js?v=219';
import {seededRandom} from '../competition.js?v=219';
import {projectEventLoad} from './planning.js?v=219';

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

// How often each event comes around. Club night is weekly; the national and
// international rounds are rare by design, so the ladder stays worth
// climbing toward.
const CADENCE=Object.freeze({
  'club-night':{every:1,on:0},
  'local-league':{every:2,on:0},
  'city-open':{every:4,on:1},
  'regional-open':{every:6,on:2},
  'mlp-amateur':{every:8,on:3},
  'semi-pro':{every:9,on:4},
  'national':{every:12,on:6},
  'international':{every:16,on:8},
  'pro-league':{every:2,on:0},
  'mlp':{every:1,on:0},
  'world-championship':{every:52,on:13},
  'ppa-finals':{every:52,on:49}
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
// The brackets a player may enter.
//
// An open event has no rating gates: any bracket it runs is available, so a
// player who feels underrated can go and play better company, and a player
// who wants to grind can drop into a lower one. A gated event only takes
// players whose rating sits in the bracket, with one allowance: a bracket
// half a step above their own is always open to them.
export function enterableBrackets(state,event,format){
  if(!event.brackets.length)return [];
  if(event.open)return event.brackets.slice();
  const rating=state.athlete.formats?.[format]??0;
  const own=divisionFor(rating);
  return event.brackets.filter(id=>{
    const division=RATING_BRACKETS.find(entry=>entry.id===id);
    if(!division)return false;
    if(rating>=division.min&&rating<=division.max)return true;
    return division.level<=own.level+0.5;
  });
}

export function bracketsFor(state,event,format){
  // The pro league runs one open bracket rather than a ladder of them. Its
  // access rule is the world ranking, which is checked separately.
  if(!event.brackets.length)return {running:[{...PRO_LEAGUE_DIVISION,isPlayer:false}],enterable:[PRO_LEAGUE_DIVISION.id]};
  const rating=state.athlete.formats?.[format]??state.athlete.rating??0;
  const own=divisionFor(rating);
  const running=event.brackets
    .map(id=>RATING_BRACKETS.find(division=>division.id===id))
    .filter(Boolean)
    .map(division=>({...division,isPlayer:division.id===own.id}));
  const enterable=enterableBrackets(state,event,format);
  return {running,enterable};
}

// Every combination of format and bracket a player may enter at an event.
export function entryOptions(state,event){
  const options=[];
  for(const format of event.formats??['doubles']){
    const {running,enterable}=bracketsFor(state,event,format);
    for(const division of running){
      if(!enterable.includes(division.id))continue;
      options.push({
        id:`${format}:${division.id}`,
        format,
        divisionId:division.id,
        label:division.label,
        isPlayer:division.isPlayer
      });
    }
  }
  return options;
}

// Whether the board earns a place in the main draw, a wild card into it, or
// a place in the qualifier. The division ranking makes the cut; the Overall
// ranking is used only when no format is supplied.
export const MAIN_DRAW_LEVELS=Object.freeze(['open','cup','major','world']);

export function entryConfig(event){
  const drawSize=Math.max(2,Number(event?.drawSize)||16);
  const qualifierSlots=Math.max(0,Math.min(drawSize-1,Number(event?.qualifierSlots)||0));
  const defaultWildCards=event?.tier==='open'||event?.tier==='cup'||event?.tier==='major'||event?.tier==='world'?2:0;
  const wildCardSlots=Math.max(0,Math.min(drawSize-qualifierSlots-1,event?.wildCardSlots==null?defaultWildCards:Number(event.wildCardSlots)||0));
  return {
    drawSize,
    qualifierSlots,
    qualifierFieldSize:Math.max(0,Number(event?.qualifierFieldSize)||qualifierSlots*2),
    wildCardSlots,
    directSlots:Math.max(1,drawSize-qualifierSlots-wildCardSlots)
  };
}

export function entryStatus(state,event,{format='overall'}={}){
  const config=entryConfig(event);
  const league=(event?.shapes??[]).includes('mlp-style');
  if(league||!MAIN_DRAW_LEVELS.includes(event?.tier)){
    return {direct:true,via:'eligible',rank:null,...config};
  }
  const board=positions(state,state.week);
  const rank=format==='overall'?board.overall:board[format]??null;
  if(rank!==null&&rank<=config.directSlots){
    return {direct:true,via:'ranking',rank,...config};
  }
  if((state.wildCards??0)>0&&config.wildCardSlots>0){
    return {direct:true,via:'wild-card',rank,...config};
  }
  const qualifierCut=config.directSlots+config.qualifierFieldSize;
  if(config.qualifierFieldSize>0&&(rank===null||rank<=qualifierCut)){
    return {direct:false,via:'qualifier',rank,qualifierCut,...config};
  }
  return {direct:false,via:'declined',rank,qualifierCut,...config};
}

// Whether a player may enter an event at all. This is about access, not
// about skill: a club night needs a club, and the pro league needs a world
// ranking inside the top 250.
export function entryEligibility(state,event,enterable=null){
  // Once the tour signs you, the amateur ladder is not your job any more.
  if(isContracted(state)&&['local','challenger'].includes(event?.tier)){
    return {ok:false,reason:'A contracted pro competes on the tour, not in amateur events'};
  }
  if(isIneligible(state)&&['major','world'].includes(event?.tier)){
    return {ok:false,reason:'Released from the tour · the biggest events reopen after a twelve-month re-entry period'};
  }
  if(event.scope==='club'&&!state.clubId)return {ok:false,reason:'Join a club first'};
  // The tour standing is the more fundamental lock, so it is checked first.
  if(event.qualification==='finals'){
    const qualified=finalsQualified(state);
    if(!qualified)return {ok:false,reason:'The finals take the top eight of the Overall ranking'};
  }
  if(event.qualification==='pro-tour'){
    if(!isContracted(state))return {ok:false,reason:'Sign a tour contract before entering professional events'};
    const tour=tourFor(state.athlete.gender);
    const rating=bestFormatRating(state);
    const rank=tourRank(rating,state.athlete.gender);
    if(rank===null)return {ok:false,reason:tour.label+"'s tour needs a "+tour.floorRating.toFixed(2)+' rating · you are '+formatRating(rating)};
    if(!pointsInWindow(state.athlete.tourPointsHistory,state.week))return {ok:false,reason:'Earn tour points to hold a standing'};
  }
  // The rounds above the regional level are earned with tour points.
  if(event.qualificationPoints){
    const points=state.athlete.tourPoints??0;
    if(points<event.qualificationPoints){
      return {ok:false,reason:event.qualificationPoints+' tour points required · you have '+points};
    }
  }
  if(enterable&&!enterable.length){
    const running=event.brackets.map(id=>RATING_BRACKETS.find(division=>division.id===id)?.label??id).join(', ');
    return {ok:false,reason:running+' bracket only · you are '+formatRating(bestFormatRating(state))};
  }
  return {ok:true,reason:null};
}

// The player's strongest rating across the formats, which is the one the
// tour standing is measured on.
export function bestFormatRating(state){
  const formats=Object.values(state.athlete.formats??{});
  return formats.length?Math.max(...formats):0;
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
    // A seasonal event only runs inside its window. The pro tour and the MLP
    // run part of the year; amateur play does not.
    if(event.months&&!event.months.includes(weekDate(week).getUTCMonth()))continue;
    const formats=event.formats??['doubles'];
    const perFormat=formats.map(format=>({format,...bracketsFor(state,event,format)}));
    const enterable=perFormat.flatMap(entry=>entry.enterable);
    const eligible=entryEligibility(state,event,enterable);
    const options=[];
    for(const entry of perFormat){
      for(const division of entry.running){
        if(!entry.enterable.includes(division.id))continue;
        options.push({
          id:`${entry.format}:${division.id}`,
          format:entry.format,
          divisionId:division.id,
          label:division.label,
          isPlayer:division.isPlayer
        });
      }
    }
    const defaultOption=options.find(option=>option.isPlayer)??options[0]??null;
    const calendarEvent={
      id:`w${week}-${event.id}`,
      week,
      eventId:event.id,
      label:event.label,
      kind:'match',
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
      tier:event.tier??'local',
      drawSize:event.drawSize??16,
      gateBasis:event.gateBasis??'highest',
      championPoints:event.championPoints??0,
      difficulty:event.difficulty??'normal',
      qualifierSlots:event.qualifierSlots??0,
      qualifierFieldSize:event.qualifierFieldSize??(event.qualifierSlots??0)*2,
      wildCardSlots:event.wildCardSlots??(MAIN_DRAW_LEVELS.includes(event.tier??'local')?2:0),
      // A league card is one opponent. careerRounds bounds the player's
      // season rather than scheduling every team in the draw.
      nightMatches:event.nightMatches??0,
      careerRounds:event.careerRounds??0,
      // The shapes an event may run. Without this the calendar only ever
      // fielded a bracket.
      shapes:event.shapes??[],
      scoring:event.scoring??'side-out',
      targetScore:event.targetScore??11,
      playoffPoints:event.playoffPoints??15,
      winBy:event.winBy??2,
      dateLabel:weekShortLabel(week),
      formats,
      brackets:event.brackets.slice(),
      open:event.open??false,
      duration:event.duration??1,
      ownRatings:{...state.athlete.formats},
      divisions:perFormat.flatMap(entry=>entry.running),
      enterable,
      options,
      defaultOptionId:defaultOption?.id??null,
      qualification:event.qualification??null,
      tour:event.qualification==='pro-tour'?tourFor(state.athlete.gender):null,
      tourRank:event.qualification==='pro-tour'?tourRank(bestFormatRating(state),state.athlete.gender):null,
      eligible,
      lockedReason:eligible.reason??null
    };
    calendarEvent.planning=projectEventLoad(state,calendarEvent);
    events.push(calendarEvent);
  }
  return events.sort((a,b)=>COMPETITION_EVENTS.findIndex(entry=>entry.id===a.eventId)-COMPETITION_EVENTS.findIndex(entry=>entry.id===b.eventId));
}

// The calendar view lists the current week and a run of weeks ahead.
export function upcomingWeeks(state,count=8){
  const weeks=[];
  for(let offset=0;offset<count;offset++){
    const week=state.week+offset;
    weeks.push({week,label:weekLabel(week),short:weekShortLabel(week),isCurrent:offset===0});
  }
  return weeks;
}

export {RATING_BRACKETS,divisionFor,formatRating,EVENT_BY_ID};
