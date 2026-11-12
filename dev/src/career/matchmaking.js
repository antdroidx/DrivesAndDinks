// Career matchmaking.
//
// A career event is played by the real engine. This module turns the career
// athlete and the opponents drawn from the bracket into lineups the engine
// can play, and records the match so the result can be rated afterwards.

import {buildProfile,applyPhysique} from '../roster.js?v=219';
import {opponentsInBracket} from './world.js?v=219';
import {mixSeed} from './population.js?v=219';
import {seededRandom} from '../competition.js?v=219';
import {equipmentSelection} from './equipment.js?v=219';

// The engine caps injected attributes so a profile can never run away with
// them. The career allows attributes up to 99, and the engine's ability
// curve is linear, so the cap sits at the top of the career's own range.
export const MAX_INJECTED_ATTRIBUTE=99;

const DEFAULT_PADDLE='balanced';
const DEFAULT_SHAPE='hybrid-flat';

function selectionFor(athlete,paddle,shape,color,headwear){
  const look=athlete.appearance??{};
  return {
    character:athlete.archetypeId,
    gender:athlete.gender,
    handedness:look.handedness??athlete.handedness,
    customName:athlete.name,
    paddle:look.paddleFamily??paddle,
    paddleShape:look.paddleShape??shape,
    shirtColor:look.shirtColor??athlete.shirtColor??'green',
    paddleColor:color??look.paddleColor??athlete.paddleColor??'mint',
    highlightColor:look.highlightColor??athlete.highlightColor??'yellow',
    hairStyle:look.hairStyle??athlete.hairStyle??'design',
    hairColor:look.hairColor??athlete.hairColor??'brown',
    skinColor:look.skinColor??athlete.skinColor??'medium',
    headwear:headwear?.headwear??look.headwear??athlete.headwear??'none',
    headwearColor:headwear?.color??look.headwearColor??athlete.headwearColor??look.highlightColor??'yellow',
    eyewear:look.eyewear??athlete.eyewear??'none',
    outfit:look.outfit??athlete.outfit??'performance',
    court:look.court??athlete.court??'blue-gray'
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
export function careerProfile(athlete,{paddle=DEFAULT_PADDLE,shape=DEFAULT_SHAPE,color=null,headwear=null,item=null}={}){
  const profile=buildProfile(selectionFor(athlete,paddle,shape,color,headwear),{
    attributes:athlete.ratings,
    identity:identityFor(athlete)
  });
  const height=Number(athlete.height)||profile.appearance.height||177;
  const bmi=Number(athlete.weight)/(Math.pow(height/100,2)||1);
  const build=Number.isFinite(bmi)?Math.max(.12,Math.min(.9,.5225+(bmi-24)/25)):profile.appearance.build;
  const rendered=applyPhysique(profile,{...profile.appearance,...athlete.appearance,paddleColor:color??profile.appearance.paddleColor,headwear:headwear?.headwear??profile.appearance.headwear,headwearColor:headwear?.color??profile.appearance.headwearColor,height,build});
  rendered.paddle.equipmentName=item?.label??rendered.paddle.equipmentName??'';
  rendered.paddle.color=color??rendered.appearance.paddleColor;
  const thickness=Number(item?.thickness)===14?14:Number(item?.thickness)===16?16:Number(athlete.appearance?.paddleThickness)===14?14:16;
  rendered.paddle.thickness=thickness;
  rendered.paddle.power*=thickness===14?1.03:.985;
  rendered.paddle.control*=thickness===14?.98:1.03;
  rendered.paddle.ratingModifiers={...rendered.paddle.ratingModifiers,power:(rendered.paddle.ratingModifiers?.power??0)+(thickness===14?2:-1),control:(rendered.paddle.ratingModifiers?.control??0)+(thickness===14?-1:2)};
  return rendered;
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
    partnerRating:partner?.rating??null,
    playerMatches:state.athlete.record?.matches??0,
    partnerMatches:partner?.matches??0,
    opponentMatches:opponents.map(opponent=>opponent.matches??0)
  };
}

// Pulls the field for a career event out of the rated population.
export function drawField({state,event,option}){
  const doubles=option.format!=='singles';
  const cityId=['club','city'].includes(event.scope)?state.cityId:null;
  const areaId=event.scope==='area'?state.areaId:null;
  const opponents=opponentsInBracket({
    seed:state.seed,
    regionId:state.regionId,
    ratings:state.worldRatings,
    skillOverrides:state.cpuWorld?.records,
    week:state.week,
    divisionId:option.divisionId,
    format:option.format,
    count:doubles?2:1,
    cityId,
    areaId,
    random:seededRandom(mixSeed(state.seed,`field:${state.week}:${event.eventId}:${option.id}`))
  });
  const partner=doubles
    ?(opponentsInBracket({
      seed:state.seed,
      regionId:state.regionId,
      ratings:state.worldRatings,
      skillOverrides:state.cpuWorld?.records,
      week:state.week,
      divisionId:option.divisionId,
      format:option.format,
      count:1,
      cityId,
      areaId,
      random:seededRandom(mixSeed(state.seed,`mate:${state.week}:${event.eventId}:${option.id}`))
    })[0]??null)
    :null;
  return {opponents,partner};
}
