// Career matchmaking.
//
// A career event is played by the real engine. This module turns the career
// athlete and the opponents drawn from the bracket into lineups the engine
// can play, and records the match so the result can be rated afterwards.

import {buildProfile} from '../roster.js?v=196';
import {opponentsInBracket} from './world.js?v=196';
import {mixSeed} from './population.js?v=196';
import {seededRandom} from '../competition.js?v=196';
import {equipmentSelection} from './equipment.js?v=196';

// The engine caps injected attributes so a profile can never run away with
// them. The career allows attributes up to 99, and the engine's ability
// curve is linear, so the cap sits at the top of the career's own range.
export const MAX_INJECTED_ATTRIBUTE=99;

const DEFAULT_PADDLE='balanced';
const DEFAULT_SHAPE='hybrid';

function selectionFor(athlete,paddle,shape){
  return {
    character:athlete.archetypeId,
    gender:athlete.gender,
    handedness:athlete.handedness,
    customName:athlete.name,
    paddle,
    paddleShape:shape,
    shirtColor:athlete.shirtColor??'green',
    paddleColor:athlete.paddleColor??'mint',
    highlightColor:athlete.highlightColor??'yellow',
    hairStyle:athlete.hairStyle??'design',
    hairColor:athlete.hairColor??'brown',
    skinColor:athlete.skinColor??'medium',
    headwear:athlete.headwear??'none',
    eyewear:athlete.eyewear??'none',
    outfit:athlete.outfit??'performance',
    court:athlete.court??'blue-gray'
  };
}

function identityFor(athlete){
  return {
    name:athlete.name,
    culture:athlete.culture??'white_american',
    skinColor:athlete.skinColor??'medium',
    hairColor:athlete.hairColor??'brown',
    shirtColor:athlete.shirtColor??'green',
    paddleColor:athlete.paddleColor??'mint',
    highlightColor:athlete.highlightColor??'yellow'
  };
}

// A career athlete carries attributes that have drifted away from their
// archetype, so the profile is built with those attributes injected rather
// than taken from the archetype.
export function careerProfile(athlete,{paddle=DEFAULT_PADDLE,shape=DEFAULT_SHAPE}={}){
  return buildProfile(selectionFor(athlete,paddle,shape),{
    attributes:athlete.ratings,
    identity:identityFor(athlete)
  });
}

// Draws the field for a career event and builds the lineup.
//
// The engine orders players as 0 and 1 on team one and 2 and 3 on team two,
// and in singles as 0 and 2.
export function buildCareerMatchup({state,event,option,opponents,partner}){
  const player=careerProfile(state.athlete,equipmentSelection(state));
  const doubles=option.format!=='singles';
  const fields=opponents.map(opponent=>careerProfile(opponent));
  const lineup=doubles
    ?[player,careerProfile(partner),fields[0],fields[1]]
    :[player,fields[0]];
  return {
    lineup,
    playerId:0,
    athleteIds:[
      'player',
      partner?.id??null,
      ...opponents.map(opponent=>opponent.id)
    ].slice(0,lineup.length),
    format:doubles?'doubles':'singles',
    playerRating:state.athlete.formats[option.format]??0,
    opponentRatings:opponents.map(opponent=>opponent.rating??0),
    opponentIds:opponents.map(opponent=>opponent.id),
    partnerId:partner?.id??null,
    partnerRating:partner?.rating??null
  };
}

// Pulls the field for a career event out of the rated population.
export function drawField({state,event,option}){
  const doubles=option.format!=='singles';
  const opponents=opponentsInBracket({
    seed:state.seed,
    regionId:state.regionId,
    ratings:state.worldRatings,
    week:state.week,
    divisionId:option.divisionId,
    format:option.format,
    count:doubles?2:1,
    random:seededRandom(mixSeed(state.seed,`field:${state.week}:${event.eventId}:${option.id}`))
  });
  const partner=doubles
    ?(opponentsInBracket({
      seed:state.seed,
      regionId:state.regionId,
      ratings:state.worldRatings,
      week:state.week,
      divisionId:option.divisionId,
      format:option.format,
      count:1,
      random:seededRandom(mixSeed(state.seed,`mate:${state.week}:${event.eventId}:${option.id}`))
    })[0]??null)
    :null;
  return {opponents,partner};
}
