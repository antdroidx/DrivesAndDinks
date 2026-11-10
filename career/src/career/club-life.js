// Club life: partners, reputation and coaching.

import {RATING_KEYS,RATING_LABELS} from '../roster.js?v=214';
import {buildClubIndex,buildClubRoster} from './population.js?v=214';
import {gateRating,RATING_BRACKETS,divisionFor} from './rating.js?v=214';

export const CLUB_REPUTATION_REQUIREMENTS=Object.freeze({recreational:0,competitive:25,elite:60});

export function requiredClubReputation(club){
  return CLUB_REPUTATION_REQUIREMENTS[club?.tier]??0;
}

export function clubAccess(state,club){
  const current=state.clubReputation??0;
  const required=requiredClubReputation(club);
  return {ok:current>=required,current,required,short:Math.max(0,required-current)};
}

export function currentClub(state){
  if(!state.clubId)return null;
  return buildClubIndex(state.seed,state.regionId).find(club=>club.id===state.clubId)??state.club??null;
}

export function partnerGenderAllowed(playerGender,partnerGender,format){
  if(format==='mixed')return playerGender!==partnerGender;
  if(format==='doubles')return playerGender===partnerGender;
  return false;
}

export function partnerSnapshot(member){
  return {
    id:member.id,
    name:member.name,
    gender:member.gender,
    handedness:member.handedness,
    archetypeId:member.archetypeId,
    archetypeLabel:member.archetypeLabel,
    citizenship:member.citizenship,
    age:member.age,
    clubId:member.clubId,
    ratings:{...member.ratings},
    formats:{...member.formats},
    skillAverage:member.skillAverage,
    shirtColor:member.shirtColor,
    hairColor:member.hairColor,
    skinColor:member.skinColor
  };
}

export function clubRosterForState(state){
  const club=currentClub(state);
  return club?buildClubRoster(state.seed,club):[];
}

export function partnerCandidates(state,format){
  const club=currentClub(state);
  if(!club)return [];
  return buildClubRoster(state.seed,club)
    .filter(member=>partnerGenderAllowed(state.athlete.gender,member.gender,format))
    .sort((a,b)=>(b.formats[format]??0)-(a.formats[format]??0));
}

export function resolvePartner(state,format){
  const stored=state.partners?.[format];
  if(!stored||stored.clubId!==state.clubId)return null;
  if(!partnerGenderAllowed(state.athlete.gender,stored.gender,format))return null;
  return stored;
}

export function choosePartner(state,format,athleteId){
  if(!['doubles','mixed'].includes(format))return {ok:false,state,message:'That format does not use a partner.'};
  if(!state.clubId)return {ok:false,state,message:'Join a club before choosing a partner.'};
  const member=clubRosterForState(state).find(athlete=>athlete.id===athleteId);
  if(!member)return {ok:false,state,message:'That player is not on your club roster.'};
  if(!partnerGenderAllowed(state.athlete.gender,member.gender,format)){
    return {ok:false,state,message:format==='mixed'?'Mixed doubles needs a partner of another gender.':'Gender doubles needs a partner of the same gender.'};
  }
  return {
    ok:true,
    state:{...state,partners:{...(state.partners??{}),[format]:partnerSnapshot(member)}},
    message:`${member.name} is now your ${format==='mixed'?'mixed doubles':'gender doubles'} partner.`
  };
}

export function clearPartners(state){
  return {...state,partners:{doubles:null,mixed:null}};
}

export function partnerGateStatus(state,event,option){
  if(option.format==='singles'||event?.open)return {ok:true,reason:null};
  const partner=resolvePartner(state,option.format);
  if(!partner)return {ok:true,reason:null};
  const division=RATING_BRACKETS.find(entry=>entry.id===option.divisionId);
  if(!division)return {ok:true,reason:null};
  const playerRating=state.athlete.formats[option.format];
  const partnerRating=partner.formats?.[option.format];
  const teamRating=gateRating([playerRating,partnerRating],event.gateBasis??'highest');
  const teamDivision=divisionFor(teamRating);
  const ownDivision=divisionFor(playerRating);
  const allowed=teamDivision.level<=ownDivision.level+.5;
  return allowed
    ?{ok:true,teamRating,partner,reason:null}
    :{ok:false,teamRating,partner,reason:`Your partner raises the team gate to ${teamRating.toFixed(2)}. Choose a lower-rated partner or a higher bracket.`};
}

export function awardClubReputation(state,{type='tournament',place=null}={}){
  if(!state.clubId)return state;
  const base=type==='club'?2:type==='mlp'?2:1;
  const finish=place===1?5:place===2?3:place&&place<=4?2:0;
  return {...state,clubReputation:(state.clubReputation??0)+base+finish};
}

export function buildCoachFeedback(state,{format='doubles',won=null,eventFocus=null}={}){
  const keys=RATING_KEYS.filter(key=>key!=='aggression');
  const target=keys.reduce((best,key)=>(state.athlete.ratings[key]??0)<(state.athlete.ratings[best]??0)?key:best,keys[0]);
  const value=state.athlete.ratings[target]??0;
  const focus=format==='singles'?'singles rallies and movement':'doubles positioning and transition';
  return {
    week:state.week,
    attribute:target,
    label:RATING_LABELS[target]??target,
    value,
    message:`Coach focus: ${RATING_LABELS[target]??target} ${value}. Train it to improve ${focus}.`,
    context:{format,won,eventFocus}
  };
}

export function currentCoachFeedback(state){
  return state.coachFeedback??buildCoachFeedback(state);
}