// Career calendar.
//
// Career time is counted in weeks from a fixed Monday so that every save
// reads the same date no matter when it was written. Each week generates the
// events the player could enter: club practice nearby, then league and
// tournament events that open up as the career rating climbs.

import {COMPETITION_TIERS,TIER_BY_ID,duprRating,formatDupr} from './geography.js';
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

// How often each tier of the ladder comes around, and which week of the cycle
// it lands on. Practice is weekly; the national and international rounds are
// rare by design, so the ladder stays worth climbing toward.
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

function tierTitle(tier,scopeLabel){
  if(tier.id==='club-night')return `Club Night · ${scopeLabel}`;
  if(tier.scope==='city')return `${tier.label} · ${scopeLabel}`;
  return tier.label;
}

function tierVenue(tier,state,club){
  if(tier.scope==='club')return club?.name??state.cityLabel;
  if(tier.scope==='city')return `${state.cityLabel} Courts`;
  if(tier.scope==='area')return `${state.areaLabel} Open`;
  if(tier.scope==='region')return `${state.regionLabel} Circuit`;
  if(tier.scope==='nation')return 'National Venue';
  return 'International Venue';
}

// Builds the events for one week. The player rating decides what is open;
// everything else stays visible but locked, so the ladder is legible from
// the first week of a career.
export function generateWeekEvents(state,week){
  const random=seededRandom(mixSeed(state.seed,`week:${week}`));
  const club=state.clubId?state.club:null;
  const events=[];
  for(const tier of COMPETITION_TIERS){
    const cadence=CADENCE[tier.id];
    if(!cadence)continue;
    if(week%cadence.every!==cadence.on)continue;
    if(tier.scope==='club'&&!club)continue;
    const scopeLabel=tier.scope==='club'?club.name:state.cityLabel;
    const eligible=eligibilityFor(tier,state);

    events.push({
      id:`w${week}-${tier.id}`,
      week,
      tierId:tier.id,
      tierLabel:tier.label,
      kind:tier.kind,
      scope:tier.scope,
      title:tierTitle(tier,scopeLabel),
      venue:tierVenue(tier,state,club),
      regionId:state.regionId,
      areaId:state.areaId,
      cityId:state.cityId,
      clubId:tier.scope==='club'?club?.id??null:null,
      minRating:tier.minRating,
      energyCost:tier.energy,
      skillFocus:tier.skillFocus,
      dateLabel:weekShortLabel(week),
      eligible,
      lockedReason:eligible.reason??null
    });
  }
  return events.sort((a,b)=>a.minRating-b.minRating);
}


export function eligibilityFor(tier,state){
  if(tier.scope==='club'&&!state.clubId)return {ok:false,reason:'Join a club first'};
  if(state.athlete.dupr<tier.minRating)return {ok:false,reason:`Needs DUPR ${formatDupr(tier.minRating)}`};
  if(state.energy<tier.energy)return {ok:false,reason:`Needs ${tier.energy} energy`};
  return {ok:true,reason:null};
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


export {duprRating,TIER_BY_ID};


